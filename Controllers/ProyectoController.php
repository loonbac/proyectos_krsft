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
    const IGV_RATE = 0.18;
    const RETENTION_RATE = 0.12;
    const AVAILABLE_RATE = 0.88;

    public function index()
    {
        $moduleName = basename(dirname(__DIR__));
        return Inertia::render("{$moduleName}/Index");
    }

    public function list(Request $request)
    {
        // Usar purchase_orders (solo aprobadas) para calcular gastos
        $projects = DB::table($this->projectsTable)
            ->select([
                'projects.id',
                'projects.name',
                'projects.base_amount',
                'projects.total_amount',
                'projects.retained_amount',
                'projects.available_amount',
                'projects.spending_threshold',
                'projects.status',
                'projects.user_id',
                'projects.created_at',
                'projects.updated_at',
                DB::raw("COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN purchase_orders.amount ELSE 0 END), 0) as spent"),
                DB::raw("(projects.available_amount - COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN purchase_orders.amount ELSE 0 END), 0)) as remaining"),
                DB::raw("CASE WHEN projects.available_amount > 0 THEN (COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN purchase_orders.amount ELSE 0 END), 0) / projects.available_amount * 100) ELSE 0 END as usage_percent"),
                DB::raw("SUM(CASE WHEN purchase_orders.status = 'pending' THEN 1 ELSE 0 END) as pending_orders")
            ])
            ->leftJoin('purchase_orders', 'projects.id', '=', 'purchase_orders.project_id')
            ->groupBy([
                'projects.id', 'projects.name', 'projects.base_amount', 
                'projects.total_amount', 'projects.retained_amount',
                'projects.available_amount', 'projects.spending_threshold',
                'projects.status', 'projects.user_id', 
                'projects.created_at', 'projects.updated_at'
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
        $project = DB::table($this->projectsTable)->find($id);

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
        ]);

        try {
            $name = trim($request->name);
            $baseAmount = floatval($request->amount);
            $includeIgv = $request->input('includeIgv', false);
            $spendingThreshold = intval($request->input('threshold', 75));

            // Calcular montos
            $totalAmount = $includeIgv ? $baseAmount * (1 + self::IGV_RATE) : $baseAmount;
            $retainedAmount = $totalAmount * self::RETENTION_RATE;
            $availableAmount = $totalAmount * self::AVAILABLE_RATE;

            $id = DB::table($this->projectsTable)->insertGetId([
                'name' => $name,
                'base_amount' => $baseAmount,
                'total_amount' => $totalAmount,
                'retained_amount' => $retainedAmount,
                'available_amount' => $availableAmount,
                'spending_threshold' => $spendingThreshold,
                'user_id' => auth()->id(),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Proyecto creado exitosamente',
                'project_id' => $id,
                'project' => [
                    'name' => $name,
                    'base_amount' => $baseAmount,
                    'total_amount' => $totalAmount,
                    'retained_amount' => $retainedAmount,
                    'available_amount' => $availableAmount,
                    'spending_threshold' => $spendingThreshold
                ]
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
            $data = [];
            
            if ($request->has('name')) {
                $data['name'] = trim($request->name);
            }
            
            if ($request->has('spending_threshold')) {
                $data['spending_threshold'] = intval($request->spending_threshold);
            }
            
            if ($request->has('status')) {
                $data['status'] = $request->status;
            }
            
            $data['updated_at'] = now();

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
            // Eliminar gastos primero
            DB::table($this->expensesTable)->where('project_id', $id)->delete();
            // Eliminar proyecto
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

    // Órdenes de Compra / Gastos

    /**
     * Crear orden de compra (servicio o material)
     * - Servicios: se aprueban automáticamente
     * - Materiales: quedan pendientes para aprobación en Compras
     */
    public function createPurchaseOrder(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $request->validate([
            'description' => 'required|string|max:255',
            'type' => 'required|in:service,material',
        ]);

        $type = $request->type;
        $description = trim($request->description);
        
        try {
            $orderData = [
                'project_id' => $id,
                'type' => $type,
                'description' => $description,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if ($type === 'service') {
                // Servicio: requiere monto, se aprueba automáticamente
                $request->validate(['amount' => 'required|numeric|min:0.01']);
                
                $orderData['amount'] = floatval($request->amount);
                $orderData['status'] = 'approved';
                $orderData['approved_by'] = auth()->id();
                $orderData['approved_at'] = now();
            } else {
                // Material: lista de items, queda pendiente
                $materials = $request->input('materials', []);
                if (empty($materials)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Debe agregar al menos un material'
                    ], 400);
                }
                
                $orderData['materials'] = json_encode($materials);
                $orderData['status'] = 'pending';
                $orderData['amount'] = null;
            }

            $orderId = DB::table('purchase_orders')->insertGetId($orderData);

            return response()->json([
                'success' => true,
                'message' => $type === 'service' 
                    ? 'Gasto por servicio registrado' 
                    : 'Orden de compra creada (pendiente de aprobación)',
                'order_id' => $orderId,
                'status' => $orderData['status']
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getExpenses($id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $expenses = DB::table($this->expensesTable)
            ->where('project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'expenses' => $expenses,
            'total' => $expenses->sum('amount')
        ]);
    }

    public function deleteExpense($projectId, $expenseId)
    {
        $expense = DB::table($this->expensesTable)
            ->where('id', $expenseId)
            ->where('project_id', $projectId)
            ->first();

        if (!$expense) {
            return response()->json(['success' => false, 'message' => 'Gasto no encontrado'], 404);
        }

        try {
            DB::table($this->expensesTable)->where('id', $expenseId)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Gasto eliminado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateThreshold(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $threshold = intval($request->input('threshold', 75));
        
        if ($threshold < 0 || $threshold > 100) {
            return response()->json([
                'success' => false, 
                'message' => 'El umbral debe estar entre 0 y 100'
            ], 400);
        }

        try {
            DB::table($this->projectsTable)
                ->where('id', $id)
                ->update([
                    'spending_threshold' => $threshold,
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Umbral actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }
}
