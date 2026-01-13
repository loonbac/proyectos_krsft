<?php

namespace Modulos_ERP\ProyectosKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProyectoController extends Controller
{
    protected $projectsTable = 'projects';
    protected $expensesTable = 'project_expenses';

    // Constantes de cálculo
    const RETENTION_RATE = 0.12;
    const AVAILABLE_RATE = 0.88;

    public function index()
    {
        $moduleName = basename(dirname(__DIR__));
        return Inertia::render("{$moduleName}/Index");
    }

    /**
     * Get supervisors (trabajadores with cargo 'Supervisor')
     */
    public function getSupervisors()
    {
        try {
            // Check if trabajadores table exists
            if (!DB::getSchemaBuilder()->hasTable('trabajadores')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tabla de trabajadores no existe',
                    'supervisors' => []
                ]);
            }

            $supervisors = DB::table('trabajadores')
                ->where('estado', 'LIKE', '%activo%')
                ->where(function($query) {
                    $query->where('cargo', 'LIKE', '%supervisor%')
                          ->orWhere('cargo', 'LIKE', '%Supervisor%')
                          ->orWhere('cargo', 'LIKE', '%SUPERVISOR%');
                })
                ->orderBy('nombre_completo')
                ->get(['id', 'nombre_completo', 'cargo', 'dni', 'email']);

            return response()->json([
                'success' => true,
                'supervisors' => $supervisors
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'supervisors' => []
            ]);
        }
    }

    public function list(Request $request)
    {
        $projects = DB::table($this->projectsTable)
            ->select([
                'projects.id',
                'projects.name',
                'projects.currency',
                'projects.base_amount',
                'projects.total_amount',
                'projects.retained_amount',
                'projects.available_amount',
                'projects.spending_threshold',
                'projects.igv_enabled',
                'projects.igv_rate',
                'projects.supervisor_id',
                'projects.status',
                'projects.user_id',
                'projects.created_at',
                'projects.updated_at',
                'trabajadores.nombre_completo as supervisor_name',
                DB::raw("COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN purchase_orders.amount ELSE 0 END), 0) as spent"),
                DB::raw("(projects.available_amount - COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN purchase_orders.amount ELSE 0 END), 0)) as remaining"),
                DB::raw("CASE WHEN projects.available_amount > 0 THEN (COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN purchase_orders.amount ELSE 0 END), 0) / projects.available_amount * 100) ELSE 0 END as usage_percent"),
                DB::raw("SUM(CASE WHEN purchase_orders.status = 'pending' THEN 1 ELSE 0 END) as pending_orders")
            ])
            ->leftJoin('purchase_orders', 'projects.id', '=', 'purchase_orders.project_id')
            ->leftJoin('trabajadores', 'projects.supervisor_id', '=', 'trabajadores.id')
            ->groupBy([
                'projects.id', 'projects.name', 'projects.currency', 'projects.base_amount', 
                'projects.total_amount', 'projects.retained_amount',
                'projects.available_amount', 'projects.spending_threshold',
                'projects.igv_enabled', 'projects.igv_rate', 'projects.supervisor_id',
                'projects.status', 'projects.user_id', 
                'projects.created_at', 'projects.updated_at',
                'trabajadores.nombre_completo'
            ])
            ->orderBy('projects.created_at', 'desc')
            ->get();

        // Agregar estado visual
        $projects = $projects->map(function ($project) {
            $usagePercent = floatval($project->usage_percent ?? 0);
            $threshold = $project->spending_threshold ?? 75;
            
            if ($usagePercent >= 90) {
                $project->status_label = 'critical';
            } elseif ($usagePercent >= $threshold) {
                $project->status_label = 'warning';
            } else {
                $project->status_label = 'good';
            }
            
            return $project;
        });

        return response()->json([
            'success' => true,
            'projects' => $projects,
            'total' => $projects->count()
        ]);
    }

    public function show($id)
    {
        $project = DB::table($this->projectsTable)
            ->leftJoin('trabajadores', 'projects.supervisor_id', '=', 'trabajadores.id')
            ->select('projects.*', 'trabajadores.nombre_completo as supervisor_name')
            ->where('projects.id', $id)
            ->first();

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        // Obtener órdenes de compra del proyecto
        $orders = DB::table('purchase_orders')
            ->where('project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                $order->materials = $order->materials ? json_decode($order->materials, true) : [];
                return $order;
            });

        // Calcular totales solo de órdenes aprobadas
        $approvedOrders = $orders->where('status', 'approved');
        $spent = $approvedOrders->sum('amount');
        $remaining = $project->available_amount - $spent;
        $usagePercent = $project->available_amount > 0 
            ? ($spent / $project->available_amount * 100) 
            : 0;

        $pendingCount = $orders->where('status', 'pending')->count();

        return response()->json([
            'success' => true,
            'project' => $project,
            'orders' => $orders,
            'summary' => [
                'spent' => $spent,
                'remaining' => $remaining,
                'usage_percent' => $usagePercent,
                'total_orders' => $orders->count(),
                'pending_orders' => $pendingCount
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'supervisor_id' => 'required|integer|exists:trabajadores,id',
        ]);

        try {
            $name = trim($request->name);
            $baseAmount = floatval($request->amount);
            $currency = $request->input('currency', 'PEN');
            $igvEnabled = $request->boolean('igv_enabled', true);
            $igvRate = floatval($request->input('igv_rate', 18.00));
            $spendingThreshold = intval($request->input('threshold', 75));
            $supervisorId = intval($request->supervisor_id);

            // Calcular montos
            $totalAmount = $igvEnabled ? $baseAmount * (1 + ($igvRate / 100)) : $baseAmount;
            $retainedAmount = $totalAmount * self::RETENTION_RATE;
            $availableAmount = $totalAmount * self::AVAILABLE_RATE;

            $id = DB::table($this->projectsTable)->insertGetId([
                'name' => $name,
                'currency' => $currency,
                'base_amount' => $baseAmount,
                'total_amount' => $totalAmount,
                'retained_amount' => $retainedAmount,
                'available_amount' => $availableAmount,
                'spending_threshold' => $spendingThreshold,
                'igv_enabled' => $igvEnabled,
                'igv_rate' => $igvRate,
                'supervisor_id' => $supervisorId,
                'user_id' => auth()->id(),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Proyecto creado exitosamente',
                'project_id' => $id
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        try {
            $data = ['updated_at' => now()];
            
            if ($request->has('name')) {
                $data['name'] = trim($request->name);
            }
            
            if ($request->has('currency')) {
                $data['currency'] = $request->currency;
            }
            
            if ($request->has('spending_threshold')) {
                $data['spending_threshold'] = intval($request->spending_threshold);
            }
            
            if ($request->has('igv_enabled')) {
                $data['igv_enabled'] = $request->boolean('igv_enabled');
            }
            
            if ($request->has('igv_rate')) {
                $data['igv_rate'] = floatval($request->igv_rate);
            }
            
            if ($request->has('supervisor_id')) {
                $data['supervisor_id'] = intval($request->supervisor_id);
            }
            
            if ($request->has('status')) {
                $data['status'] = $request->status;
            }

            // Recalcular montos si se cambia amount o igv
            if ($request->has('amount')) {
                $baseAmount = floatval($request->amount);
                $igvEnabled = $request->has('igv_enabled') ? $request->boolean('igv_enabled') : $project->igv_enabled;
                $igvRate = $request->has('igv_rate') ? floatval($request->igv_rate) : $project->igv_rate;
                
                $totalAmount = $igvEnabled ? $baseAmount * (1 + ($igvRate / 100)) : $baseAmount;
                $data['base_amount'] = $baseAmount;
                $data['total_amount'] = $totalAmount;
                $data['retained_amount'] = $totalAmount * self::RETENTION_RATE;
                $data['available_amount'] = $totalAmount * self::AVAILABLE_RATE;
            }

            DB::table($this->projectsTable)->where('id', $id)->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Proyecto actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        try {
            DB::table($this->expensesTable)->where('project_id', $id)->delete();
            DB::table('purchase_orders')->where('project_id', $id)->delete();
            DB::table($this->projectsTable)->where('id', $id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Proyecto eliminado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function stats()
    {
        $totalProjects = DB::table($this->projectsTable)->count();
        $totalBudget = DB::table($this->projectsTable)->sum('available_amount');
        $totalSpent = DB::table($this->expensesTable)->sum('amount');
        $activeProjects = DB::table($this->projectsTable)->where('status', 'active')->count();

        return response()->json([
            'success' => true,
            'stats' => [
                'total_projects' => $totalProjects,
                'active_projects' => $activeProjects,
                'total_budget' => $totalBudget,
                'total_spent' => $totalSpent,
                'total_remaining' => $totalBudget - $totalSpent
            ]
        ]);
    }
}

