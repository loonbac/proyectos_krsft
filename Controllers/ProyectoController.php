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
                DB::raw('COALESCE(SUM(project_expenses.amount), 0) as spent'),
                DB::raw('(projects.available_amount - COALESCE(SUM(project_expenses.amount), 0)) as remaining'),
                DB::raw('CASE WHEN projects.available_amount > 0 THEN (COALESCE(SUM(project_expenses.amount), 0) / projects.available_amount * 100) ELSE 0 END as usage_percent'),
                DB::raw('COUNT(project_expenses.id) as expense_count')
            ])
            ->leftJoin('project_expenses', 'projects.id', '=', 'project_expenses.project_id')
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

        // Obtener gastos del proyecto
        $expenses = DB::table($this->expensesTable)
            ->where('project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Calcular totales
        $spent = $expenses->sum('amount');
        $remaining = $project->available_amount - $spent;
        $usagePercent = $project->available_amount > 0 
            ? ($spent / $project->available_amount * 100) 
            : 0;

        return response()->json([
            'success' => true,
            'project' => $project,
            'expenses' => $expenses,
            'summary' => [
                'spent' => $spent,
                'remaining' => $remaining,
                'usage_percent' => $usagePercent,
                'expense_count' => $expenses->count()
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

    // Gastos

    public function addExpense(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
        ]);

        try {
            $expenseId = DB::table($this->expensesTable)->insertGetId([
                'project_id' => $id,
                'description' => trim($request->description),
                'amount' => floatval($request->amount),
                'category' => $request->input('category', 'General'),
                'notes' => $request->input('notes'),
                'user_id' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Gasto registrado exitosamente',
                'expense_id' => $expenseId
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
