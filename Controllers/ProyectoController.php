<?php

namespace Modulos_ERP\ProyectosKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ProyectoController extends Controller
{
    protected $projectsTable = 'projects';
    protected $expensesTable = 'project_expenses';

    private static ?bool $trabajadoresTableExists = null;

    const RETENTION_RATE = 0.12;
    const AVAILABLE_RATE = 0.88;

    public function index()
    {
        $moduleName = basename(dirname(__DIR__));
        $userInfo = $this->getUserRoleInfo();
        
        return Inertia::render("{$moduleName}/Index", [
            'userRole' => $userInfo['role'],
            'isSupervisor' => $userInfo['isSupervisor'],
            'trabajadorId' => $userInfo['trabajadorId']
        ]);
    }

    /**
     * Cache the hasTable check to avoid repeated schema queries per request
     */
    protected function hasTrabajadoresTable(): bool
    {
        if (self::$trabajadoresTableExists === null) {
            self::$trabajadoresTableExists = DB::getSchemaBuilder()->hasTable('trabajadores');
        }
        return self::$trabajadoresTableExists;
    }

    /**
     * Determine user role and supervisor status
     * Supports role simulation for admins via ?simulate_role parameter
     */
    protected function getUserRoleInfo(): array
    {
        $user = auth()->user();
        
        if (!$user) {
            return ['role' => 'guest', 'isSupervisor' => false, 'trabajadorId' => null];
        }

        // === SIMULACIÓN DE ROL (solo para admins) ===
        if ($user->role === 'admin' && request()->has('simulate_role')) {
            $simulatedRole = request()->input('simulate_role');
            
            if ($simulatedRole === 'supervisor') {
                // Buscar un trabajador con cargo supervisor
                $supervisor = DB::table('trabajadores')
                    ->whereRaw('LOWER(cargo) LIKE ?', ['%supervisor%'])
                    ->where('estado', 'LIKE', '%activo%')
                    ->first();
                
                return [
                    'role' => 'supervisor', 
                    'isSupervisor' => true, 
                    'trabajadorId' => $supervisor ? $supervisor->id : $user->trabajador_id
                ];
            }
            
            // admin - vista normal de jefe/manager
            return ['role' => 'admin', 'isSupervisor' => false, 'trabajadorId' => $user->trabajador_id];
        }

        // Admin always has full access (sin simulación)
        if ($user->role === 'admin') {
            return ['role' => 'admin', 'isSupervisor' => false, 'trabajadorId' => $user->trabajador_id];
        }

        // Check if user has linked trabajador with cargo
        if ($user->trabajador_id && $this->hasTrabajadoresTable()) {
            $trabajador = DB::table('trabajadores')->find($user->trabajador_id);
            
            if ($trabajador) {
                $cargo = mb_strtolower(trim($trabajador->cargo ?? ''), 'UTF-8');
                
                // Check for supervisor cargo
                if (str_contains($cargo, 'supervisor')) {
                    return ['role' => 'supervisor', 'isSupervisor' => true, 'trabajadorId' => $user->trabajador_id];
                }
                
                // Check for sub-gerente or jefe de proyectos
                if (str_contains($cargo, 'sub-gerente') || str_contains($cargo, 'subgerente') || 
                    str_contains($cargo, 'jefe de proyectos') || str_contains($cargo, 'gerente')) {
                    return ['role' => 'manager', 'isSupervisor' => false, 'trabajadorId' => $user->trabajador_id];
                }
            }
        }

        return ['role' => 'user', 'isSupervisor' => false, 'trabajadorId' => $user->trabajador_id ?? null];
    }

    /**
     * Get supervisors (trabajadores with cargo 'Supervisor')
     */
    public function getSupervisors()
    {
        try {
            if (!$this->hasTrabajadoresTable()) {
                return response()->json(['success' => false, 'supervisors' => []]);
            }

            $supervisors = DB::table('trabajadores')
                ->where('estado', 'LIKE', '%activo%')
                ->where(function($query) {
                    $query->where('cargo', 'LIKE', '%supervisor%')
                          ->orWhere('cargo', 'LIKE', '%Supervisor%');
                })
                ->orderBy('nombre_completo')
                ->get(['id', 'nombre_completo', 'cargo', 'dni', 'email']);

            return response()->json(['success' => true, 'supervisors' => $supervisors]);
        } catch (\Exception $e) {
            Log::error('Error en getSupervisors', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'supervisors' => [], 'message' => 'Error interno']);
        }
    }

    /**
     * Get all workers (for supervisor to assign to project)
     */
    public function getAllWorkers()
    {
        try {
            if (!$this->hasTrabajadoresTable()) {
                return response()->json(['success' => false, 'workers' => []]);
            }

            $workers = DB::table('trabajadores')
                ->where('estado', 'LIKE', '%activo%')
                ->orderBy('nombre_completo')
                ->get(['id', 'nombre_completo', 'cargo', 'dni']);

            return response()->json(['success' => true, 'workers' => $workers]);
        } catch (\Exception $e) {
            Log::error('Error en getAllWorkers', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'workers' => [], 'message' => 'Error interno']);
        }
    }

    public function list(Request $request)
    {
        $userInfo = $this->getUserRoleInfo();
        
        $query = DB::table($this->projectsTable)
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
                'users.name as creator_name',
                DB::raw("COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN COALESCE(purchase_orders.amount_pen, purchase_orders.amount) ELSE 0 END), 0) as spent"),
                DB::raw("(projects.available_amount - COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN COALESCE(purchase_orders.amount_pen, purchase_orders.amount) ELSE 0 END), 0)) as remaining"),
                DB::raw("CASE WHEN projects.available_amount > 0 THEN (COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN COALESCE(purchase_orders.amount_pen, purchase_orders.amount) ELSE 0 END), 0) / projects.available_amount * 100) ELSE 0 END as usage_percent"),
                DB::raw("SUM(CASE WHEN purchase_orders.status = 'pending' THEN 1 ELSE 0 END) as pending_orders")
            ])
            ->leftJoin('purchase_orders', 'projects.id', '=', 'purchase_orders.project_id')
            ->leftJoin('trabajadores', 'projects.supervisor_id', '=', 'trabajadores.id')
            ->leftJoin('users', 'projects.user_id', '=', 'users.id');

        // If supervisor, only show their assigned projects
        if ($userInfo['isSupervisor'] && $userInfo['trabajadorId']) {
            $query->where('projects.supervisor_id', $userInfo['trabajadorId']);
        }

        $projects = $query->groupBy([
                'projects.id', 'projects.name', 'projects.currency', 'projects.base_amount', 
                'projects.total_amount', 'projects.retained_amount',
                'projects.available_amount', 'projects.spending_threshold',
                'projects.igv_enabled', 'projects.igv_rate', 'projects.supervisor_id',
                'projects.status', 'projects.user_id', 
                'projects.created_at', 'projects.updated_at',
                'trabajadores.nombre_completo', 'users.name'
            ])
            ->orderBy('projects.created_at', 'desc')
            ->get();

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
            'total' => $projects->count(),
            'userRole' => $userInfo['role'],
            'isSupervisor' => $userInfo['isSupervisor']
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

        // Get purchase orders
        $orders = DB::table('purchase_orders')
            ->where('project_id', $id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                $order->materials = $order->materials ? json_decode($order->materials, true) : [];
                return $order;
            });

        // Get assigned workers
        $workers = DB::table('project_workers')
            ->join('trabajadores', 'project_workers.trabajador_id', '=', 'trabajadores.id')
            ->where('project_workers.project_id', $id)
            ->select('trabajadores.id', 'trabajadores.nombre_completo', 'trabajadores.cargo', 'trabajadores.dni')
            ->get();

        $approvedOrders = $orders->where('status', 'approved');
        // Use amount_pen if available (for USD converted to PEN), otherwise use amount
        $spent = $approvedOrders->sum(function ($order) {
            return floatval($order->amount_pen ?? $order->amount ?? 0);
        });
        $remaining = $project->available_amount - $spent;
        $usagePercent = $project->available_amount > 0 
            ? ($spent / $project->available_amount * 100) 
            : 0;

        // Add usage_percent to project object
        $project->usage_percent = $usagePercent;

        return response()->json([
            'success' => true,
            'project' => $project,
            'orders' => $orders,
            'workers' => $workers,
            'summary' => [
                'spent' => $spent,
                'remaining' => $remaining,
                'usage_percent' => $usagePercent,
                'total_orders' => $orders->count(),
                'pending_orders' => $orders->where('status', 'pending')->count()
            ]
        ]);
    }

    /**
     * Add worker to project
     */
    public function addWorker(Request $request, $projectId)
    {
        $request->validate(['trabajador_id' => 'required|integer']);

        try {
            // Check if already assigned
            $exists = DB::table('project_workers')
                ->where('project_id', $projectId)
                ->where('trabajador_id', $request->trabajador_id)
                ->exists();

            if ($exists) {
                return response()->json(['success' => false, 'message' => 'Trabajador ya asignado']);
            }

            DB::table('project_workers')->insert([
                'project_id' => $projectId,
                'trabajador_id' => $request->trabajador_id,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json(['success' => true, 'message' => 'Trabajador agregado']);
        } catch (\Exception $e) {
            Log::error('Error en addWorker', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al agregar trabajador'], 500);
        }
    }

    /**
     * Remove worker from project
     */
    public function removeWorker($projectId, $trabajadorId)
    {
        try {
            DB::table('project_workers')
                ->where('project_id', $projectId)
                ->where('trabajador_id', $trabajadorId)
                ->delete();

            return response()->json(['success' => true, 'message' => 'Trabajador removido']);
        } catch (\Exception $e) {
            Log::error('Error en removeWorker', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al remover trabajador'], 500);
        }
    }

    /**
     * Get the next available item number for a project
     */
    protected function getNextItemNumber($projectId): int
    {
        $maxItem = DB::table('purchase_orders')
            ->where('project_id', $projectId)
            ->max('item_number');
        
        return ($maxItem ?? 0) + 1;
    }

    /**
     * Check if an item number already exists in a project
     */
    protected function itemNumberExists($projectId, $itemNumber, $excludeOrderId = null): bool
    {
        $query = DB::table('purchase_orders')
            ->where('project_id', $projectId)
            ->where('item_number', $itemNumber);
        
        if ($excludeOrderId) {
            $query->where('id', '!=', $excludeOrderId);
        }
        
        return $query->exists();
    }

    /**
     * Create purchase order (for supervisors to create material list)
     * Los materiales se crean en estado 'draft' y requieren aprobación del jefe de proyectos
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
            'item_number' => 'nullable|integer|min:1',
        ]);

        try {
            // Determine item number: use provided value or auto-generate
            $itemNumber = $request->input('item_number');
            
            if ($itemNumber) {
                // User provided item number - validate it's not duplicate
                if ($this->itemNumberExists($id, $itemNumber)) {
                    return response()->json([
                        'success' => false, 
                        'message' => "El número de item {$itemNumber} ya existe en este proyecto. Por favor use otro número."
                    ], 400);
                }
            } else {
                // Auto-generate next item number
                $itemNumber = $this->getNextItemNumber($id);
            }

            $orderData = [
                'project_id' => $id,
                'item_number' => $itemNumber,
                'type' => $request->type,
                'description' => trim($request->description),
                'currency' => $project->currency ?? 'PEN',
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
                // Material specification fields
                'unit' => $request->input('unit'),
                'diameter' => $request->input('diameter'),
                'series' => $request->input('series'),
                'material_type' => $request->input('material_type'),
                'manufacturing_standard' => $request->input('manufacturing_standard'),
            ];

            if ($request->type === 'service') {
                // Services are auto-approved and go directly
                $request->validate(['amount' => 'required|numeric|min:0.01']);
                $orderData['amount'] = floatval($request->amount);
                $orderData['status'] = 'approved';
                $orderData['approved_by'] = auth()->id();
                $orderData['approved_at'] = now();
            } else {
                // Materials created by supervisor start as 'draft'
                // They need manager approval before going to Compras module
                $materials = $request->input('materials', []);
                if (empty($materials)) {
                    return response()->json(['success' => false, 'message' => 'Agregue materiales'], 400);
                }
                $orderData['materials'] = json_encode($materials);
                $orderData['status'] = 'draft';
                $orderData['supervisor_approved'] = true;
                $orderData['supervisor_approved_by'] = auth()->id();
                $orderData['supervisor_approved_at'] = now();
                $orderData['manager_approved'] = false;
            }

            $orderId = DB::table('purchase_orders')->insertGetId($orderData);

            return response()->json([
                'success' => true,
                'message' => $request->type === 'service' 
                    ? 'Gasto registrado' 
                    : 'Material agregado. Pendiente de aprobación del Jefe de Proyectos.',
                'order_id' => $orderId
            ]);
        } catch (\Exception $e) {
            Log::error('Error en createMaterialOrder', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al crear orden'], 500);
        }
    }

    /**
     * Approve material order (Manager approves supervisor's list)
     * Changes status from 'draft' to 'pending' and sends to Compras module
     */
    public function approveMaterialOrder(Request $request, $orderId)
    {
        $order = DB::table('purchase_orders')->find($orderId);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Orden no encontrada'], 404);
        }

        if ($order->status !== 'draft') {
            return response()->json(['success' => false, 'message' => 'Solo se pueden aprobar órdenes en borrador'], 400);
        }

        // Check user is manager (Jefe de Proyectos)
        $userInfo = $this->getUserRoleInfo();
        if ($userInfo['role'] !== 'manager' && $userInfo['role'] !== 'admin') {
            return response()->json(['success' => false, 'message' => 'No tiene permisos para aprobar materiales'], 403);
        }

        try {
            DB::table('purchase_orders')
                ->where('id', $orderId)
                ->update([
                    'status' => 'pending',
                    'manager_approved' => true,
                    'manager_approved_by' => auth()->id(),
                    'manager_approved_at' => now(),
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Material aprobado y enviado al módulo de Compras'
            ]);
        } catch (\Exception $e) {
            Log::error('Error en approveMaterialOrder', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al aprobar material'], 500);
        }
    }

    /**
     * Reject material order (Manager rejects supervisor's list)
     */
    public function rejectMaterialOrder(Request $request, $orderId)
    {
        $order = DB::table('purchase_orders')->find($orderId);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Orden no encontrada'], 404);
        }

        if ($order->status !== 'draft') {
            return response()->json(['success' => false, 'message' => 'Solo se pueden rechazar órdenes en borrador'], 400);
        }

        // Check user is manager (Jefe de Proyectos)
        $userInfo = $this->getUserRoleInfo();
        if ($userInfo['role'] !== 'manager' && $userInfo['role'] !== 'admin') {
            return response()->json(['success' => false, 'message' => 'No tiene permisos para rechazar materiales'], 403);
        }

        try {
            $notes = $request->input('notes', 'Rechazado por el Jefe de Proyectos');
            
            DB::table('purchase_orders')
                ->where('id', $orderId)
                ->update([
                    'status' => 'rejected',
                    'manager_approved' => false,
                    'notes' => $notes,
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Material rechazado'
            ]);
        } catch (\Exception $e) {
            Log::error('Error en rejectMaterialOrder', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al rechazar material'], 500);
        }
    }

    /**
     * Get paid orders for a project that are pending delivery
     */
    public function getPaidOrders($id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $orders = DB::table('purchase_orders')
            ->where('project_id', $id)
            ->where('payment_confirmed', true)
            ->where(function($query) {
                $query->where('delivery_confirmed', false)
                      ->orWhereNull('delivery_confirmed');
            })
            ->orderBy('payment_confirmed_at', 'desc')
            ->get()
            ->map(function ($order) {
                $order->materials = $order->materials ? json_decode($order->materials, true) : [];
                return $order;
            });

        return response()->json([
            'success' => true,
            'orders' => $orders,
            'total' => $orders->count()
        ]);
    }

    /**
     * Confirm delivery of a paid order
     */
    public function confirmDelivery(Request $request, $orderId)
    {
        $order = DB::table('purchase_orders')->find($orderId);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Orden no encontrada'], 404);
        }

        if (!$order->payment_confirmed) {
            return response()->json(['success' => false, 'message' => 'Esta orden no ha sido pagada'], 400);
        }

        if ($order->delivery_confirmed) {
            return response()->json(['success' => false, 'message' => 'Esta orden ya fue marcada como entregada'], 400);
        }

        try {
            DB::table('purchase_orders')
                ->where('id', $orderId)
                ->update([
                    'delivery_confirmed' => true,
                    'delivery_confirmed_at' => now(),
                    'delivery_confirmed_by' => auth()->id(),
                    'delivery_notes' => $request->input('notes', ''),
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Entrega confirmada exitosamente'
            ]);
        } catch (\Exception $e) {
            Log::error('Error en confirmDelivery', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error interno al confirmar entrega'
            ], 500);
        }
    }

    /**
     * Confirm delivery of multiple orders (batch)
     */
    public function confirmFileDelivery(Request $request)
    {
        $request->validate([
            'order_ids' => 'required|array',
            'order_ids.*' => 'integer'
        ]);

        try {
            $updated = DB::table('purchase_orders')
                ->whereIn('id', $request->order_ids)
                ->where('payment_confirmed', true)
                ->update([
                    'delivery_confirmed' => true,
                    'delivery_confirmed_at' => now(),
                    'delivery_confirmed_by' => auth()->id(),
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => $updated . ' órdenes marcadas como entregadas',
                'updated' => $updated
            ]);
        } catch (\Exception $e) {
            Log::error('Error en confirmFileDelivery', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error interno al confirmar entregas'
            ], 500);
        }
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

            return response()->json(['success' => true, 'message' => 'Proyecto creado', 'project_id' => $id]);
        } catch (\Exception $e) {
            Log::error('Error en store proyecto', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al crear proyecto'], 500);
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
            
            if ($request->has('name')) $data['name'] = trim($request->name);
            if ($request->has('currency')) $data['currency'] = $request->currency;
            if ($request->has('spending_threshold')) $data['spending_threshold'] = intval($request->spending_threshold);
            if ($request->has('igv_enabled')) $data['igv_enabled'] = $request->boolean('igv_enabled');
            if ($request->has('igv_rate')) $data['igv_rate'] = floatval($request->igv_rate);
            if ($request->has('supervisor_id')) $data['supervisor_id'] = intval($request->supervisor_id);
            if ($request->has('status')) $data['status'] = $request->status;

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

            return response()->json(['success' => true, 'message' => 'Proyecto actualizado']);
        } catch (\Exception $e) {
            Log::error('Error en update proyecto', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al actualizar proyecto'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::transaction(function () use ($id) {
                DB::table('project_workers')->where('project_id', $id)->delete();
                DB::table($this->expensesTable)->where('project_id', $id)->delete();
                DB::table('purchase_orders')->where('project_id', $id)->delete();
                DB::table($this->projectsTable)->where('id', $id)->delete();
            });

            return response()->json(['success' => true, 'message' => 'Proyecto eliminado']);
        } catch (\Exception $e) {
            Log::error('Error en destroy proyecto', ['error' => $e->getMessage(), 'id' => $id]);
            return response()->json(['success' => false, 'message' => 'Error interno al eliminar proyecto'], 500);
        }
    }

    public function stats()
    {
        $userInfo = $this->getUserRoleInfo();
        
        $query = DB::table($this->projectsTable);
        
        if ($userInfo['isSupervisor'] && $userInfo['trabajadorId']) {
            $query->where('supervisor_id', $userInfo['trabajadorId']);
        }

        $totalProjects = $query->count();
        $totalBudget = $query->sum('available_amount');
        $activeProjects = (clone $query)->where('status', 'active')->count();
        
        // Calcular gasto total real de órdenes aprobadas
        $projectIds = (clone $query)->pluck('id');
        $totalSpent = DB::table('purchase_orders')
            ->whereIn('project_id', $projectIds)
            ->where('status', 'approved')
            ->sum(DB::raw('COALESCE(amount_pen, amount, 0)'));

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

    /**
     * Download Excel template for material import
     * Serves file from Assets/Templates/
     */
    public function downloadMaterialTemplate()
    {
        $modulePath = dirname(__DIR__);
        
        // Check for xlsx first (more common), then xls
        $xlsxPath = $modulePath . '/Assets/Templates/Plantilla_Materiales_v3.xlsx';
        $xlsPath = $modulePath . '/Assets/Templates/plantilla_materiales.xls';
        
        if (file_exists($xlsxPath)) {
            return response()->download($xlsxPath, 'Plantilla_Materiales.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
        }
        
        if (file_exists($xlsPath)) {
            return response()->download($xlsPath, 'plantilla_materiales.xls', [
                'Content-Type' => 'application/vnd.ms-excel',
            ]);
        }
        
        // Fallback: generate default template
        $headers = [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => 'attachment; filename="plantilla_materiales.xls"',
            'Cache-Control' => 'max-age=0',
        ];

        $xml = '<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Size="11"/>
   <Interior ss:Color="#0AA4A4" ss:Pattern="Solid"/>
   <Font ss:Color="#FFFFFF"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Materiales">
  <Table>
   <Column ss:Width="60"/>
   <Column ss:Width="50"/>
   <Column ss:Width="300"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="150"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">CANT</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">UND</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">DESCRIPCION</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">DIAMETRO</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">SERIE</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">MATERIAL</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>';

        return response($xml, 200, $headers);
    }

    /**
     * Import materials from XLS/CSV file
     */
    public function importMaterials(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls,xml|max:5120'
        ]);

        try {
            $file = $request->file('file');
            $content = file_get_contents($file->getRealPath());
            $extension = strtolower($file->getClientOriginalExtension());
            $sourceFilename = $file->getClientOriginalName(); // Save original filename
            
            // Check for duplicate filename
            $existingFile = DB::table('purchase_orders')
                ->where('project_id', $id)
                ->where('source_filename', $sourceFilename)
                ->first();
            
            if ($existingFile && $request->input('check_duplicate') === 'true') {
                return response()->json([
                    'duplicate' => true,
                    'originalFilename' => $sourceFilename,
                    'existingId' => $existingFile->id
                ]);
            }
            
            // Handle rename duplicate
            if ($existingFile && $request->input('rename_duplicate') === 'true') {
                $baseName = pathinfo($sourceFilename, PATHINFO_FILENAME);
                $extension_file = pathinfo($sourceFilename, PATHINFO_EXTENSION);
                $sourceFilename = $baseName . ' (2).' . $extension_file;
            }
            
            $rows = [];
            
            // Check file type and parse accordingly
            if ($extension === 'xlsx') {
                // Parse modern XLSX (ZIP-based) format
                $rows = $this->parseXlsx($file->getRealPath());
            } elseif ($extension === 'xls' || strpos($content, 'schemas-microsoft-com:office:spreadsheet') !== false) {
                // Parse XML Spreadsheet format (old XLS)
                $rows = $this->parseXmlSpreadsheet($content);
            } else {
                // Parse as CSV
                $rows = $this->parseCsv($content);
            }

            // If check_duplicate=true and no confirmed_import=true, return preview
            if ($request->input('check_duplicate') === 'true' && $request->input('confirmed_import') !== 'true') {
                // Return preview data
                $previewItems = [];
                foreach ($rows as $index => $columns) {
                    if (count($columns) < 3) continue;
                    
                    $previewItems[] = [
                        'quantity' => intval($columns[0] ?? 1),
                        'unit' => trim($columns[1] ?? 'UND'),
                        'description' => trim($columns[2] ?? ''),
                        'diameter' => trim($columns[3] ?? ''),
                        'series' => trim($columns[4] ?? ''),
                        'material_type' => trim($columns[5] ?? '')
                    ];
                }

                return response()->json([
                    'preview' => ['items' => $previewItems],
                    'filename' => $sourceFilename
                ]);
            }

            $imported = 0;
            $errors = [];

            // New simplified format (no ID column): CANT(0), UND(1), DESCRIPCION(2), DIAMETRO(3), SERIE(4), MATERIAL(5)
            // IDs are always auto-generated
            foreach ($rows as $index => $columns) {
                // Skip if not enough columns
                if (count($columns) < 3) {
                    $errors[] = "Fila " . ($index + 2) . ": formato inválido";
                    continue;
                }

                $qty = intval($columns[0] ?? 1);
                $unit = trim($columns[1] ?? 'UND');
                $description = trim($columns[2] ?? '');
                $diameter = trim($columns[3] ?? '');
                $series = trim($columns[4] ?? '');
                $materialType = trim($columns[5] ?? '');

                if (empty($description)) {
                    $errors[] = "Fila " . ($index + 2) . ": descripción vacía";
                    continue;
                }

                // Always auto-generate item number
                $itemNumber = $this->getNextItemNumber($id);

                // Create order with source filename
                $orderData = [
                    'project_id' => $id,
                    'item_number' => $itemNumber,
                    'type' => 'material',
                    'description' => $description,
                    'materials' => json_encode([['name' => $description, 'qty' => $qty]]),
                    'unit' => $unit,
                    'diameter' => $diameter ?: null,
                    'series' => $series ?: null,
                    'material_type' => $materialType ?: null,
                    'source_filename' => $sourceFilename,
                    'imported_at' => now(),
                    'currency' => $project->currency ?? 'PEN',
                    'status' => 'draft',
                    'supervisor_approved' => true,
                    'supervisor_approved_by' => auth()->id(),
                    'supervisor_approved_at' => now(),
                    'manager_approved' => false,
                    'created_by' => auth()->id(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                DB::table('purchase_orders')->insert($orderData);
                $imported++;
            }

            $message = $imported . ' materiales importados desde ' . $sourceFilename;

            return response()->json([
                'success' => true,
                'message' => $message,
                'imported' => $imported,
                'errors' => $errors
            ]);
        } catch (\Exception $e) {
            Log::error('Error en importBudget', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al importar presupuesto'], 500);
        }
    }

    /**
     * Parse XML Spreadsheet format (Excel 2003 XML)
     */
    private function parseXmlSpreadsheet($content)
    {
        $rows = [];
        
        // Extract all Row elements after the header
        preg_match_all('/<Row>(.*?)<\/Row>/s', $content, $rowMatches);
        
        if (!empty($rowMatches[1])) {
            // Skip first row (header)
            $dataRows = array_slice($rowMatches[1], 1);
            
            foreach ($dataRows as $rowXml) {
                // Extract cell data
                preg_match_all('/<Data[^>]*>([^<]*)<\/Data>/s', $rowXml, $cellMatches);
                
                if (!empty($cellMatches[1])) {
                    $rows[] = $cellMatches[1];
                }
            }
        }
        
        return $rows;
    }

    /**
     * Parse CSV content
     */
    private function parseCsv($content)
    {
        $rows = [];
        
        // Remove BOM if present
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        
        $lines = preg_split('/\r\n|\r|\n/', $content);
        
        // Skip header row (index 0)
        for ($i = 1; $i < count($lines); $i++) {
            $line = trim($lines[$i]);
            if (empty($line)) continue;
            
            // Try semicolon first, then comma
            $columns = str_getcsv($line, ';');
            if (count($columns) === 1) {
                $columns = str_getcsv($line, ',');
            }
            
            $rows[] = $columns;
        }
        
        return $rows;
    }

    /**
     * Parse XLSX format (ZIP-based Excel 2007+)
     */
    private function parseXlsx($filePath)
    {
        $rows = [];
        
        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new \Exception('No se pudo abrir el archivo XLSX');
        }
        
        // Read sharedStrings.xml for string values
        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml) {
            $sharedStringsXml = mb_convert_encoding($sharedStringsXml, 'UTF-8', 'UTF-8');
            preg_match_all('/<t[^>]*>([^<]*)<\/t>/u', $sharedStringsXml, $stringMatches);
            if (!empty($stringMatches[1])) {
                $sharedStrings = array_map(function($s) {
                    return html_entity_decode($s, ENT_QUOTES | ENT_XML1, 'UTF-8');
                }, $stringMatches[1]);
            }
        }
        
        // Read sheet1.xml for data
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if (!$sheetXml) {
            $zip->close();
            throw new \Exception('No se encontró la hoja de datos');
        }
        
        $zip->close();
        
        $sheetXml = mb_convert_encoding($sheetXml, 'UTF-8', 'UTF-8');
        
        // Extract rows
        preg_match_all('/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/su', $sheetXml, $rowMatches, PREG_SET_ORDER);
        
        if (!empty($rowMatches)) {
            foreach ($rowMatches as $rowMatch) {
                $rowNum = intval($rowMatch[1]);
                $rowXml = $rowMatch[2];
                
                // Skip header row (row 1)
                if ($rowNum === 1) {
                    continue;
                }
                
                // Build row with proper column positions (A-J = 0-9, support up to 10 columns)
                $currentRow = array_fill(0, 10, '');
                
                // Extract each cell - match cells with or without values
                preg_match_all('/<c\s+r="([A-Z]+)\d+"([^>]*)(?:>(.*?)<\/c>|\/>)/su', $rowXml, $cellMatches, PREG_SET_ORDER);
                
                foreach ($cellMatches as $cellMatch) {
                    $colLetter = $cellMatch[1];
                    $attrs = $cellMatch[2] ?? '';
                    $cellContent = $cellMatch[3] ?? '';
                    
                    // Convert column letter to index (A=0, B=1, etc.)
                    $colIndex = 0;
                    $len = strlen($colLetter);
                    for ($i = 0; $i < $len; $i++) {
                        $colIndex = $colIndex * 26 + (ord($colLetter[$i]) - ord('A') + 1);
                    }
                    $colIndex--; // Make 0-based
                    
                    if ($colIndex < 0 || $colIndex > 9) continue;
                    
                    // Check if it's a shared string (t="s")
                    $isSharedString = preg_match('/t="s"/i', $attrs);
                    
                    // Get the value from <v>...</v>
                    $cellValue = '';
                    if (preg_match('/<v>([^<]*)<\/v>/', $cellContent, $valueMatch)) {
                        $cellValue = $valueMatch[1];
                    }
                    
                    // Apply shared string lookup if needed
                    if ($isSharedString && $cellValue !== '' && isset($sharedStrings[(int)$cellValue])) {
                        $currentRow[$colIndex] = $sharedStrings[(int)$cellValue];
                    } else {
                        $currentRow[$colIndex] = $cellValue;
                    }
                }
                
                // Only add rows that have at least some data in relevant columns (A-G)
                $hasData = false;
                for ($i = 0; $i <= 6; $i++) {
                    if (!empty(trim($currentRow[$i]))) {
                        $hasData = true;
                        break;
                    }
                }
                
                if ($hasData) {
                    $rows[] = $currentRow;
                }
            }
        }
        
        return $rows;
    }
}
