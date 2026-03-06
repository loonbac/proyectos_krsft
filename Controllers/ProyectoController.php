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

        // Detectar admin usando hasRole (compara por slug, no por display name)
        $isAdmin = $user->isAdmin();

        // === SIMULACIÓN DE ROL (solo para admins) ===
        if ($isAdmin && request()->has('simulate_role')) {
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
        if ($isAdmin) {
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
                ->join('users', 'trabajadores.id', '=', 'users.trabajador_id')
                ->where('trabajadores.estado', 'LIKE', '%activo%')
                ->whereRaw('LOWER(trabajadores.cargo) LIKE ?', ['%supervisor%'])
                ->orderBy('trabajadores.nombre_completo')
                ->get([
                    'trabajadores.id',
                    'trabajadores.nombre_completo as name',
                    'trabajadores.cargo',
                    'trabajadores.dni',
                    'users.email',
                ]);

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
                DB::raw("
                    COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN
                        CASE
                            WHEN projects.currency = 'USD' AND COALESCE(purchase_orders.exchange_rate, 0) > 0
                                THEN COALESCE(purchase_orders.total_with_igv, purchase_orders.amount_pen, purchase_orders.amount) / purchase_orders.exchange_rate
                            ELSE COALESCE(purchase_orders.total_with_igv, purchase_orders.amount_pen, purchase_orders.amount)
                        END
                    ELSE 0 END), 0) as spent
                "),
                DB::raw("
                    projects.available_amount - COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN
                        CASE
                            WHEN projects.currency = 'USD' AND COALESCE(purchase_orders.exchange_rate, 0) > 0
                                THEN COALESCE(purchase_orders.total_with_igv, purchase_orders.amount_pen, purchase_orders.amount) / purchase_orders.exchange_rate
                            ELSE COALESCE(purchase_orders.total_with_igv, purchase_orders.amount_pen, purchase_orders.amount)
                        END
                    ELSE 0 END), 0) as remaining
                "),
                DB::raw("
                    CASE WHEN projects.available_amount > 0 THEN
                        COALESCE(SUM(CASE WHEN purchase_orders.status = 'approved' THEN
                            CASE
                                WHEN projects.currency = 'USD' AND COALESCE(purchase_orders.exchange_rate, 0) > 0
                                    THEN COALESCE(purchase_orders.total_with_igv, purchase_orders.amount_pen, purchase_orders.amount) / purchase_orders.exchange_rate
                                ELSE COALESCE(purchase_orders.total_with_igv, purchase_orders.amount_pen, purchase_orders.amount)
                            END
                        ELSE 0 END), 0) / projects.available_amount * 100
                    ELSE 0 END as usage_percent
                "),
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
            ->leftJoin('cecos', 'projects.ceco_id', '=', 'cecos.id')
            ->select(
                'projects.*', 
                'trabajadores.nombre_completo as supervisor_name',
                'cecos.codigo as ceco_codigo',
                'cecos.nombre as ceco_nombre'
            )
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

                // Para órdenes de inventario: usar costo real de la reserva
                if ($order->source_type === 'inventory' && floatval($order->amount ?? 0) == 0) {
                    $reservation = DB::table('inventory_reservations')
                        ->where('purchase_order_id', $order->id)
                        ->where('status', 'active')
                        ->first();

                    if ($reservation) {
                        $order->amount = floatval($reservation->total_cost);
                        $order->amount_pen = $reservation->currency === 'USD' && $order->exchange_rate > 0
                            ? round($reservation->total_cost * $order->exchange_rate, 2)
                            : floatval($reservation->total_cost);
                    }
                }

                return $order;
            });

        // Get assigned workers
        $workers = DB::table('project_workers')
            ->join('trabajadores', 'project_workers.trabajador_id', '=', 'trabajadores.id')
            ->where('project_workers.project_id', $id)
            ->select('trabajadores.id', 'trabajadores.nombre_completo', 'trabajadores.cargo', 'trabajadores.dni')
            ->get();

        $approvedOrders = $orders->where('status', 'approved');
        // Calcular gasto en la moneda del proyecto (incluye IGV cuando aplica)
        $projectCurrency = $project->currency ?? 'PEN';
        $spent = $approvedOrders->sum(function ($order) use ($projectCurrency) {
            // total_with_igv siempre está en PEN e incluye IGV
            $totalPen = floatval($order->total_with_igv ?? $order->amount_pen ?? $order->amount ?? 0);

            if ($projectCurrency === 'USD') {
                $rate = floatval($order->exchange_rate ?? 0);
                return $rate > 0 ? $totalPen / $rate : 0;
            }
            return $totalPen;
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

        if ($project->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'No se pueden crear órdenes en un proyecto que no está activo'], 400);
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
                // Services follow same draft→approve→compras flow as materials
                $orderData['status'] = 'draft';
                $orderData['supervisor_approved'] = true;
                $orderData['supervisor_approved_by'] = auth()->id();
                $orderData['supervisor_approved_at'] = now();
                $orderData['manager_approved'] = false;
                // Store service-specific data: time_value as a single-item materials array, location in notes
                $orderData['materials'] = json_encode([['name' => trim($request->description), 'qty' => intval($request->input('time_value', 1))]]);
                $orderData['notes'] = $request->input('location', '');
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
            return response()->json([
                'success' => false,
                'message' => "Orden #{$orderId} no encontrada",
                'error_code' => 'ORDER_NOT_FOUND'
            ], 404);
        }

        if ($order->status !== 'draft') {
            $statusLabels = ['pending' => 'pendiente', 'approved' => 'aprobada', 'rejected' => 'rechazada'];
            $label = $statusLabels[$order->status] ?? $order->status;
            return response()->json([
                'success' => false,
                'message' => "No se puede aprobar: la orden #{$orderId} ya está {$label}",
                'error_code' => 'INVALID_STATUS',
                'current_status' => $order->status
            ], 400);
        }

        // Check user is manager (Jefe de Proyectos) or admin
        $userInfo = $this->getUserRoleInfo();
        if ($userInfo['role'] !== 'manager' && $userInfo['role'] !== 'admin') {
            Log::warning('Intento de aprobación sin permisos', [
                'user_id' => auth()->id(),
                'resolved_role' => $userInfo['role'],
                'order_id' => $orderId
            ]);
            return response()->json([
                'success' => false,
                'message' => "No tiene permisos para aprobar materiales (rol actual: {$userInfo['role']})",
                'error_code' => 'FORBIDDEN'
            ], 403);
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
            Log::error('Error en approveMaterialOrder', [
                'order_id' => $orderId,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error interno al aprobar material: ' . $e->getMessage(),
                'error_code' => 'INTERNAL_ERROR'
            ], 500);
        }
    }

    /**
     * Reject material order (Manager rejects supervisor's list)
     */
    public function rejectMaterialOrder(Request $request, $orderId)
    {
        $order = DB::table('purchase_orders')->find($orderId);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => "Orden #{$orderId} no encontrada",
                'error_code' => 'ORDER_NOT_FOUND'
            ], 404);
        }

        if ($order->status !== 'draft') {
            $statusLabels = ['pending' => 'pendiente', 'approved' => 'aprobada', 'rejected' => 'rechazada'];
            $label = $statusLabels[$order->status] ?? $order->status;
            return response()->json([
                'success' => false,
                'message' => "No se puede rechazar: la orden #{$orderId} ya está {$label}",
                'error_code' => 'INVALID_STATUS',
                'current_status' => $order->status
            ], 400);
        }

        // Check user is manager (Jefe de Proyectos) or admin
        $userInfo = $this->getUserRoleInfo();
        if ($userInfo['role'] !== 'manager' && $userInfo['role'] !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => "No tiene permisos para rechazar materiales (rol actual: {$userInfo['role']})",
                'error_code' => 'FORBIDDEN'
            ], 403);
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
            Log::error('Error en rejectMaterialOrder', [
                'order_id' => $orderId,
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error interno al rechazar material: ' . $e->getMessage(),
                'error_code' => 'INTERNAL_ERROR'
            ], 500);
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
                // Obtener el proyecto para acceder a su CECO
                $project = DB::table($this->projectsTable)->find($id);

                // Eliminar preproyectos (project_pipeline) asociados - esto eliminará también todas sus relaciones en cascada
                // (communications, visits, budgets, etc. gracias a cascadeOnDelete)
                DB::table('project_pipeline')->where('project_id', $id)->delete();

                // Eliminar el CECO asociado si existe (incluyendo CECOs hijos)
                if ($project && $project->ceco_id) {
                    // Función recursiva para eliminar CECOs y sus hijos
                    $this->deleteCecoAndChildren($project->ceco_id);
                }

                // ── Liberar reservas de inventario del proyecto ───
                if (DB::getSchemaBuilder()->hasTable('inventory_reservations')) {
                    $activeReservations = DB::table('inventory_reservations')
                        ->where('project_id', $id)
                        ->where('status', 'active')
                        ->get();

                    foreach ($activeReservations as $res) {
                        // Devolver stock reservado al inventario
                        DB::table('inventario_productos')
                            ->where('id', $res->inventory_item_id)
                            ->update([
                                'cantidad_reservada' => DB::raw("GREATEST(cantidad_reservada - {$res->quantity_reserved}, 0)"),
                                'updated_at'         => now(),
                            ]);
                    }

                    // Eliminar todas las reservas del proyecto
                    DB::table('inventory_reservations')
                        ->where('project_id', $id)
                        ->delete();
                }

                // ── Liberar items de inventario creados para el proyecto ───
                if (DB::getSchemaBuilder()->hasTable('inventario_productos')) {
                    DB::table('inventario_productos')
                        ->where('project_id', $id)
                        ->update([
                            'project_id'      => null,
                            'nombre_proyecto'  => null,
                            'apartado'         => false,
                            'updated_at'       => now(),
                        ]);
                }

                // Eliminar datos relacionados del proyecto
                DB::table('project_workers')->where('project_id', $id)->delete();
                DB::table($this->expensesTable)->where('project_id', $id)->delete();
                DB::table('purchase_orders')->where('project_id', $id)->delete();
                DB::table('project_completion_requests')->where('project_id', $id)->delete();
                DB::table($this->projectsTable)->where('id', $id)->delete();
            });

            return response()->json(['success' => true, 'message' => 'Proyecto, preproyectos y datos asociados eliminados correctamente']);
        } catch (\Exception $e) {
            Log::error('Error en destroy proyecto', ['error' => $e->getMessage(), 'id' => $id]);
            return response()->json(['success' => false, 'message' => 'Error interno al eliminar proyecto'], 500);
        }
    }

    /**
     * Elimina un CECO y todos sus hijos recursivamente
     */
    private function deleteCecoAndChildren($cecoId)
    {
        // Obtener todos los CECOs hijos
        $children = DB::table('cecos')->where('parent_id', $cecoId)->pluck('id');
        
        // Eliminar recursivamente los hijos
        foreach ($children as $childId) {
            $this->deleteCecoAndChildren($childId);
        }
        
        // Eliminar el CECO actual
        DB::table('cecos')->where('id', $cecoId)->delete();
    }

    /**
     * Finalizar proyecto: cambia el estado a 'pendiente_recuento'
     * para que el supervisor haga el recuento de sobrantes.
     * POST /api/proyectoskrsft/{id}/finalize
     */
    public function finalizeProject(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        if ($project->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'Solo se pueden finalizar proyectos activos'], 400);
        }

        // Verificar permisos (solo manager o admin)
        $userInfo = $this->getUserRoleInfo();
        if (!in_array($userInfo['role'], ['manager', 'admin'])) {
            return response()->json(['success' => false, 'message' => 'No tiene permisos para finalizar proyectos'], 403);
        }

        try {
            DB::table($this->projectsTable)
                ->where('id', $id)
                ->update([
                    'status'     => 'pendiente_recuento',
                    'updated_at' => now(),
                ]);

            // Auditoría
            try {
                app(\App\Services\AuditService::class)->logModelChange(
                    'project.finalized_pending_recount',
                    'Project',
                    (int) $id,
                    ['status' => 'active'],
                    ['status' => 'pendiente_recuento', 'finalized_by' => auth()->id()]
                );
            } catch (\Exception $e) {
                Log::warning('Error registrando auditoría de finalización', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Proyecto finalizado. El supervisor procederá con el recuento de sobrantes.',
            ]);
        } catch (\Exception $e) {
            Log::error('Error en finalizeProject', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error interno al finalizar proyecto'], 500);
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
        
        // Serve the official EJE materials template (XLSX)
        $xlsxPath = $modulePath . '/Assets/Templates/FORMATO DE REQUERIMIENTOS MATERIALES O EQUIPOS - EXCEL.xlsx';

        if (file_exists($xlsxPath)) {
            return response()->download($xlsxPath, 'Plantilla_Materiales_EJE.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

        if ($project->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'No se pueden importar materiales en un proyecto que no está activo'], 400);
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

            // Compute next available sequential name when duplicate detected
            $proposedFilename = $sourceFilename;
            if ($existingFile) {
                $proposedFilename = $this->getNextAvailableFilename($id, $sourceFilename);
            }

            // Handle rename duplicate FIRST — must run before the check_duplicate
            // early-return so that when both flags arrive together the rename is
            // applied and the flow continues to the preview/import stage.
            if ($existingFile && $request->input('rename_duplicate') === 'true') {
                // If the frontend sent the proposed name, validate it; otherwise recompute
                $sourceFilename = $request->input('proposed_filename', $proposedFilename);
                // Safety: ensure the proposed name is also unique (race condition guard)
                if (DB::table('purchase_orders')->where('project_id', $id)->where('source_filename', $sourceFilename)->exists()) {
                    $sourceFilename = $this->getNextAvailableFilename($id, $file->getClientOriginalName());
                }
                // Clear $existingFile so the duplicate check below does NOT fire
                $existingFile = null;
            }

            // Pure duplicate detection (only when NOT already handling a rename)
            if ($existingFile && $request->input('check_duplicate') === 'true') {
                return response()->json([
                    'duplicate' => true,
                    'originalFilename' => $sourceFilename,
                    'proposedFilename' => $proposedFilename,
                    'existingId' => $existingFile->id
                ]);
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
            // Columns: A(0)=ITEM(skip/auto), B(1)=CANTIDAD, C(2)=TIPO DE MATERIAL,
            //           D(3)=ESPECIFICACION TECNICA, E(4)=MEDIDA, F(5)=TIPO DE CONEXIÓN, G(6)=OBSERVACIONES
                $previewItems = [];
                foreach ($rows as $index => $columns) {
                    // Need at least TIPO DE MATERIAL (C, index 2) or ESPECIFICACION TECNICA (D, index 3)
                    $materialType = trim($columns[2] ?? '');
                    $spec = trim($columns[3] ?? '');
                    // A row is valid if either TIPO DE MATERIAL or ESPECIFICACION TECNICA is filled
                    if (empty($materialType) && empty($spec)) continue;

                    $previewItems[] = [
                        'quantity'      => intval($columns[1] ?? 1),
                        'material_type' => $materialType,
                        // Keep spec separate — do NOT fall back to materialType to avoid duplication
                        'description'   => $spec,
                        'diameter'      => trim($columns[4] ?? ''),
                        'series'        => trim($columns[5] ?? ''),
                        'notes'         => trim($columns[6] ?? '')
                    ];
                }

                return response()->json([
                    'preview' => ['items' => $previewItems],
                    'filename' => $sourceFilename
                ]);
            }

            $imported = 0;
            $errors = [];

            // Column layout (new EJE template, data from row 9):
            // A(0)=ITEM (ignored – auto-assigned), B(1)=CANTIDAD, C(2)=TIPO DE MATERIAL,
            // D(3)=ESPECIFICACION TECNICA, E(4)=MEDIDA, F(5)=TIPO DE CONEXIÓN, G(6)=OBSERVACIONES
            foreach ($rows as $index => $columns) {
                $qty          = intval($columns[1] ?? 1);
                $materialType = trim($columns[2] ?? '');
                $description  = trim($columns[3] ?? '');
                $diameter     = trim($columns[4] ?? '');
                $series       = trim($columns[5] ?? '');
                $notes        = trim($columns[6] ?? '');

                // A row is valid if TIPO DE MATERIAL (C) or ESPECIFICACION TECNICA (D) has content
                if (empty($materialType) && empty($description)) {
                    // Completely empty data row – skip silently
                    continue;
                }

                // If ESPECIFICACION TECNICA is empty, keep it empty — do NOT duplicate TIPO DE MATERIAL
                // (frontend will show '-' for empty fields)

                // Always auto-generate item number
                $itemNumber = $this->getNextItemNumber($id);

                $orderData = [
                    'project_id'             => $id,
                    'item_number'            => $itemNumber,
                    'type'                   => 'material',
                    'description'            => $description,
                    'materials'              => json_encode([['name' => $description, 'qty' => $qty]]),
                    'unit'                   => 'und',
                    'diameter'               => $diameter ?: null,
                    'series'                 => $series   ?: null,
                    'material_type'          => $materialType ?: null,
                    'notes'                  => $notes    ?: null,
                    'source_filename'        => $sourceFilename,
                    'imported_at'            => now(),
                    'currency'               => $project->currency ?? 'PEN',
                    'status'                 => 'draft',
                    'supervisor_approved'    => true,
                    'supervisor_approved_by' => auth()->id(),
                    'supervisor_approved_at' => now(),
                    'manager_approved'       => false,
                    'created_by'             => auth()->id(),
                    'created_at'             => now(),
                    'updated_at'             => now(),
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
     * Compute the next available filename for a project when a duplicate is detected.
     * E.g. "lista.xlsx" → "lista (2).xlsx" → "lista (3).xlsx" etc.
     */
    private function getNextAvailableFilename(int $projectId, string $originalFilename): string
    {
        $baseName  = pathinfo($originalFilename, PATHINFO_FILENAME);
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);

        // Strip any existing trailing " (N)" to normalise the base for counting
        $cleanBase = preg_replace('/\s*\(\d+\)$/', '', $baseName);

        // Fetch all source_filenames in this project that share the same base
        $existing = DB::table('purchase_orders')
            ->where('project_id', $projectId)
            ->where('source_filename', 'LIKE', $cleanBase . '%')
            ->distinct()
            ->pluck('source_filename')
            ->toArray();

        // Start at (2) and increment until free
        $counter = 2;
        do {
            $candidate = $cleanBase . ' (' . $counter . ')' . ($extension ? '.' . $extension : '');
            $counter++;
        } while (in_array($candidate, $existing, true));

        return $candidate;
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
            // Skip first 9 rows (header area); data starts at row 10
            $dataRows = array_slice($rowMatches[1], 9);
            
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
        
        // Skip header rows (rows 1-9); data starts at row 10
        for ($i = 9; $i < count($lines); $i++) {
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
                
                // Skip header rows (rows 1-9); data starts at row 10
                if ($rowNum <= 9) {
                    continue;
                }
                
                // Build row with proper column positions (A-J = 0-9, support up to 10 columns)
                $currentRow = array_fill(0, 10, '');
                
                // Extract each cell - match cells with or without values
                // Use a flexible regex that doesn't assume attribute order
                preg_match_all('/<c\s([^>]*?)(?:>(.*?)<\/c>|\/>)/su', $rowXml, $cellMatches, PREG_SET_ORDER);
                
                foreach ($cellMatches as $cellMatch) {
                    $allAttrs = $cellMatch[1] ?? '';
                    $cellContent = $cellMatch[2] ?? '';
                    
                    // Extract column letter from r="XX" attribute (anywhere in attrs)
                    if (!preg_match('/r="([A-Z]+)\d+"/', $allAttrs, $refMatch)) {
                        continue; // skip cells without a reference
                    }
                    $colLetter = $refMatch[1];
                    
                    // Convert column letter to index (A=0, B=1, etc.)
                    $colIndex = 0;
                    $len = strlen($colLetter);
                    for ($i = 0; $i < $len; $i++) {
                        $colIndex = $colIndex * 26 + (ord($colLetter[$i]) - ord('A') + 1);
                    }
                    $colIndex--; // Make 0-based
                    
                    if ($colIndex < 0 || $colIndex > 9) continue;
                    
                    // Check if it's a shared string (t="s")
                    $isSharedString = preg_match('/t="s"/i', $allAttrs);
                    
                    // Get the value from <v>...</v>
                    $cellValue = '';
                    if (preg_match('/<v>([^<]*)<\/v>/', $cellContent, $valueMatch)) {
                        $cellValue = $valueMatch[1];
                    }
                    
                    // Skip cells without an actual <v> value (empty styled cells)
                    if ($cellValue === '') {
                        continue;
                    }
                    
                    // Apply shared string lookup if needed
                    if ($isSharedString && isset($sharedStrings[(int)$cellValue])) {
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

    // ====================================================================
    //  COMPLETAR PROYECTO CON GESTIÓN DE SOBRAS DE MATERIALES
    // ====================================================================

    /**
     * Obtener materiales vinculados al proyecto para el modal de finalización.
     * GET /api/proyectoskrsft/{id}/completion-materials
     */
    public function getCompletionMaterials(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);
        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $userInfo = $this->getUserRoleInfo();
        if ($userInfo['isSupervisor'] && $project->supervisor_id != $userInfo['trabajadorId']) {
            return response()->json(['success' => false, 'message' => 'No tiene acceso a este proyecto'], 403);
        }

        // 1. Materiales comprados directamente para el proyecto (apartados)
        $rawMaterials = DB::table('inventario_productos')
            ->where('project_id', $id)
            ->where(function ($q) {
                $q->where('apartado', true)
                  ->orWhere('estado_flujo', 'apartado');
            })
            ->select('id', 'nombre', 'descripcion', 'cantidad', 'cantidad_reservada', 'unidad',
                     'diameter', 'series', 'material_type', 'categoria',
                     'precio', 'precio_unitario', 'moneda', 'batch_id')
            ->orderBy('id')
            ->get();

        // Enriquecimiento posicional por lote
        $batchIds = $rawMaterials->pluck('batch_id')->filter()->unique()->values()->toArray();
        $poByBatch = [];
        if (!empty($batchIds)) {
            $poByBatch = DB::table('purchase_orders')
                ->whereIn('batch_id', $batchIds)
                ->where('project_id', $id)
                ->select('id', 'batch_id', 'material_type', 'description')
                ->orderBy('id')
                ->get()
                ->groupBy('batch_id')
                ->map(fn($rows) => $rows->values());
        }

        $batchCounters = [];

        $materials = $rawMaterials->map(function ($m) use ($poByBatch, &$batchCounters) {
            $materialType = $m->material_type;
            $nombre       = $m->nombre;
            $descripcion  = $m->descripcion;

            if ((!$materialType || !$nombre || !$descripcion) && !empty($m->batch_id)) {
                $pos = $poByBatch[$m->batch_id] ?? collect();
                $idx = $batchCounters[$m->batch_id] ?? 0;
                $batchCounters[$m->batch_id] = $idx + 1;
                $po = $pos[$idx] ?? null;
                if ($po) {
                    if (!$materialType && !empty($po->material_type)) {
                        $materialType = $po->material_type;
                    }
                    if ((!$nombre || $nombre === 'Material sin tipo') && !empty($po->material_type)) {
                        $nombre = $po->material_type;
                    }
                    if (!$descripcion && !empty($po->description)) {
                        $descripcion = $po->description;
                    }
                }
            }

            return (object) [
                'producto_id'       => $m->id,
                'nombre'            => $nombre,
                'descripcion'       => $descripcion,
                'cantidad_original' => (int) $m->cantidad,
                'cantidad_reservada'=> (int) ($m->cantidad_reservada ?? 0),
                'unidad'            => $m->unidad,
                'diameter'          => $m->diameter,
                'series'            => $m->series,
                'material_type'     => $materialType,
                'categoria'         => $m->categoria,
                'precio'            => (float) $m->precio,
                'precio_unitario'   => (float) ($m->precio_unitario ?: ($m->cantidad > 0 ? $m->precio / $m->cantidad : 0)),
                'moneda'            => $m->moneda,
                'source'            => 'project',
            ];
        });

        // 2. Materiales tomados de inventario general (reservas activas)
        $reservations = DB::table('inventory_reservations')
            ->where('inventory_reservations.project_id', $id)
            ->where('inventory_reservations.status', 'active')
            ->join('inventario_productos', 'inventario_productos.id', '=', 'inventory_reservations.inventory_item_id')
            ->select(
                'inventario_productos.id',
                'inventario_productos.nombre',
                'inventario_productos.descripcion',
                'inventario_productos.unidad',
                'inventario_productos.diameter',
                'inventario_productos.series',
                'inventario_productos.material_type',
                'inventario_productos.categoria',
                'inventario_productos.precio_unitario',
                'inventario_productos.moneda',
                'inventory_reservations.id as reservation_id',
                'inventory_reservations.quantity_reserved',
                'inventory_reservations.unit_price_at_reservation',
                'inventory_reservations.purchase_order_id'
            )
            ->orderBy('inventory_reservations.id')
            ->get();

        foreach ($reservations as $r) {
            // Enriquecer nombre/descripcion desde purchase_order si falta
            $materialType = $r->material_type;
            $nombre       = $r->nombre;
            $descripcion  = $r->descripcion;
            if ($r->purchase_order_id) {
                $po = DB::table('purchase_orders')->find($r->purchase_order_id);
                if ($po) {
                    if (!$materialType && !empty($po->material_type)) $materialType = $po->material_type;
                    if ((!$nombre || $nombre === 'Material sin tipo') && !empty($po->material_type)) $nombre = $po->material_type;
                    if (!$descripcion && !empty($po->description)) $descripcion = $po->description;
                }
            }

            $materials->push((object) [
                'producto_id'       => $r->id,
                'nombre'            => $nombre,
                'descripcion'       => $descripcion,
                'cantidad_original' => (int) $r->quantity_reserved,
                'cantidad_reservada'=> (int) $r->quantity_reserved,
                'unidad'            => $r->unidad,
                'diameter'          => $r->diameter,
                'series'            => $r->series,
                'material_type'     => $materialType,
                'categoria'         => $r->categoria,
                'precio'            => (float) ($r->unit_price_at_reservation * $r->quantity_reserved),
                'precio_unitario'   => (float) $r->unit_price_at_reservation,
                'moneda'            => $r->moneda,
                'source'            => 'inventory',
                'reservation_id'    => $r->reservation_id,
            ]);
        }

        return response()->json([
            'success'   => true,
            'materials' => $materials->values(),
        ]);
    }

    /**
     * Obtener la solicitud de finalización activa para un proyecto.
     * GET /api/proyectoskrsft/{id}/completion-request
     */
    public function getCompletionRequest(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);
        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $req = DB::table('project_completion_requests')
            ->where('project_id', $id)
            ->whereIn('status', ['pending', 'rejected'])
            ->orderByDesc('created_at')
            ->first();

        if (!$req) {
            return response()->json(['success' => true, 'request' => null]);
        }

        $requestedBy = DB::table('users')->find($req->requested_by);

        // Enriquecer materials_data con datos de purchase_orders (pueden faltar si se guardó antes del fix)
        $materialsData = json_decode($req->materials_data, true) ?: [];

        // Pre-cargar items de inventario y POs agrupadas por batch_id (matching posicional)
        $productoIds = array_column($materialsData, 'producto_id');
        $items = DB::table('inventario_productos')->whereIn('id', $productoIds)->get()->keyBy('id');

        $batchIds = $items->pluck('batch_id')->filter()->unique()->values()->toArray();
        $poByBatch = [];
        if (!empty($batchIds)) {
            $poByBatch = DB::table('purchase_orders')
                ->whereIn('batch_id', $batchIds)
                ->where('project_id', $id)
                ->select('id', 'batch_id', 'material_type', 'description')
                ->orderBy('id')
                ->get()
                ->groupBy('batch_id')
                ->map(fn($rows) => $rows->values());
        }

        $batchCounters = [];

        foreach ($materialsData as &$mat) {
            $item = $items[$mat['producto_id']] ?? null;

            // === Siempre hacer matching posicional por lote ===
            // El dato almacenado puede estar desactualizado (bug antiguo con ->first()).
            // Siempre re-enriquecemos desde la BD para garantizar datos correctos.
            $po = null;
            if ($item && !empty($item->batch_id)) {
                $pos = $poByBatch[$item->batch_id] ?? collect();
                $idx = $batchCounters[$item->batch_id] ?? 0;
                $batchCounters[$item->batch_id] = $idx + 1;
                $po = $pos[$idx] ?? null;
            }

            // Siempre re-derivar material_type, nombre y descripcion desde la BD,
            // ignorando los valores almacenados (pueden estar corruptos por el bug antiguo de ->first()).
            // Se construye desde cero: item > PO posicional. Si ambas fuentes están vacías,
            // el campo queda vacío (borrando el valor incorrecto guardado).
            $derivedType  = '';
            $derivedNombre = '';
            $derivedDesc   = '';

            // Fuente 1: inventario_productos
            // nombre = Tipo de Material, descripcion = Especificación Técnica
            if ($item) {
                if (!empty($item->material_type)) $derivedType = $item->material_type;
                elseif (!empty($item->nombre) && $item->nombre !== 'Material sin tipo') $derivedType = $item->nombre;
                if (!empty($item->descripcion))   $derivedDesc   = $item->descripcion;
                if (!empty($item->descripcion)) {
                    $derivedNombre = $item->descripcion;
                } elseif (!empty($item->nombre) && $item->nombre !== 'Material sin tipo') {
                    $derivedNombre = $item->nombre;
                }
            }

            // Fuente 2: purchase_order posicional (tiene prioridad sobre el item para material_type,
            // y rellena nombre/desc solo si el item no los tenía).
            if ($po) {
                if (!empty($po->material_type)) $derivedType = $po->material_type;
                if (empty($derivedNombre) && !empty($po->description)) $derivedNombre = $po->description;
                if (empty($derivedDesc)   && !empty($po->description)) $derivedDesc   = $po->description;
            }

            // Asignar siempre (pisa valores almacenados, incluyendo los incorrectos)
            if ($derivedType  !== '') $mat['material_type'] = $derivedType;
            $mat['nombre']    = $derivedNombre;   // vacío si ninguna fuente lo tiene
            if ($derivedDesc  !== '') $mat['descripcion'] = $derivedDesc;

            // Prioridad 3: si sigue faltando, intentar con la reserva (materiales de inventario general)
            if (empty($mat['material_type']) || empty($mat['nombre'])) {
                $source = $mat['source'] ?? 'project';
                $reservationId = $mat['reservation_id'] ?? null;
                $fallbackPo = null;

                if ($source === 'inventory' && $reservationId) {
                    $reservation = DB::table('inventory_reservations')->find($reservationId);
                    if ($reservation && $reservation->purchase_order_id) {
                        $fallbackPo = DB::table('purchase_orders')->find($reservation->purchase_order_id);
                    }
                }
                if (!$fallbackPo && $item) {
                    $fallbackPo = DB::table('purchase_orders')
                        ->where('inventory_item_id', $item->id)
                        ->where('project_id', $id)
                        ->first();
                }
                if ($fallbackPo) {
                    if (empty($mat['material_type']) && !empty($fallbackPo->material_type)) {
                        $mat['material_type'] = $fallbackPo->material_type;
                    }
                    if (empty($mat['nombre']) && !empty($fallbackPo->description)) {
                        $mat['nombre'] = $fallbackPo->description;
                    }
                    if (empty($mat['descripcion']) && !empty($fallbackPo->description)) {
                        $mat['descripcion'] = $fallbackPo->description;
                    }
                }
            }
        }
        unset($mat);

        return response()->json([
            'success' => true,
            'request' => [
                'id'               => $req->id,
                'status'           => $req->status,
                'materials_data'   => $materialsData,
                'rejection_notes'  => $req->rejection_notes,
                'requested_by_name'=> $requestedBy ? $requestedBy->name : 'Usuario',
                'created_at'       => $req->created_at,
            ],
        ]);
    }

    /**
     * Supervisor envía el recuento de sobrantes para un proyecto finalizado.
     * POST /api/proyectoskrsft/{id}/request-completion
     */
    public function requestCompletion(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);
        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }
        if ($project->status !== 'pendiente_recuento') {
            return response()->json(['success' => false, 'message' => 'El proyecto debe estar en estado "Recuento Pendiente" para enviar sobrantes'], 400);
        }

        $userInfo = $this->getUserRoleInfo();
        if (!$userInfo['isSupervisor'] || $project->supervisor_id != $userInfo['trabajadorId']) {
            return response()->json(['success' => false, 'message' => 'Solo el supervisor asignado puede enviar el recuento de sobrantes'], 403);
        }

        // Verificar que no exista solicitud pendiente
        $existing = DB::table('project_completion_requests')
            ->where('project_id', $id)
            ->where('status', 'pending')
            ->exists();
        if ($existing) {
            return response()->json(['success' => false, 'message' => 'Ya existe un recuento pendiente de aprobación'], 400);
        }

        $request->validate([
            'materials'               => 'required|array',
            'materials.*.producto_id' => 'required|integer',
            'materials.*.cantidad_sobrante' => 'required|integer|min:0',
        ]);

        $materialsInput = $request->input('materials');
        $materialsData = [];

        foreach ($materialsInput as $mat) {
            $item = DB::table('inventario_productos')->find($mat['producto_id']);
            if (!$item) {
                return response()->json([
                    'success' => false,
                    'message' => "Material #{$mat['producto_id']} no encontrado",
                ], 422);
            }

            $source = $mat['source'] ?? 'project';
            $reservationId = $mat['reservation_id'] ?? null;
            $reservation = null;

            // Validar pertenencia según source
            if ($source === 'inventory') {
                // Material de inventario: validar que exista reserva activa para este proyecto
                $reservation = DB::table('inventory_reservations')
                    ->where('inventory_item_id', $item->id)
                    ->where('project_id', $id)
                    ->where('status', 'active')
                    ->when($reservationId, fn($q) => $q->where('id', $reservationId))
                    ->first();
                if (!$reservation) {
                    return response()->json([
                        'success' => false,
                        'message' => "Material \"{$item->nombre}\" no tiene reserva activa en este proyecto",
                    ], 422);
                }
                $cantidadOriginal = (int) $reservation->quantity_reserved;
                $reservationId = $reservation->id;
            } else {
                // Material del proyecto: validar project_id
                if ($item->project_id != $id) {
                    return response()->json([
                        'success' => false,
                        'message' => "Material #{$mat['producto_id']} no pertenece a este proyecto",
                    ], 422);
                }
                $cantidadOriginal = (int) $item->cantidad;
            }

            $cantidadSobrante = (int) $mat['cantidad_sobrante'];

            if ($cantidadSobrante > $cantidadOriginal) {
                return response()->json([
                    'success' => false,
                    'message' => "La cantidad sobrante de \"{$item->nombre}\" ({$cantidadSobrante}) no puede exceder la cantidad original ({$cantidadOriginal})",
                ], 422);
            }

            // ── Enriquecer nombre y material_type desde purchase_orders ──
            $materialType = $item->material_type;
            $descripcion  = $item->descripcion;
            $nombre       = $item->nombre;

            $enrichPo = null;
            if ($source === 'inventory' && $reservation && $reservation->purchase_order_id) {
                $enrichPo = DB::table('purchase_orders')->find($reservation->purchase_order_id);
            }
            if (!$enrichPo && !empty($item->purchase_order_id)) {
                $enrichPo = DB::table('purchase_orders')->find($item->purchase_order_id);
            }
            if (!$enrichPo) {
                $enrichPo = DB::table('purchase_orders')
                    ->where('inventory_item_id', $item->id)
                    ->where('project_id', $id)
                    ->first();
            }
            if (!$enrichPo && !empty($item->batch_id)) {
                $enrichPo = DB::table('purchase_orders')
                    ->where('batch_id', $item->batch_id)
                    ->where('project_id', $id)
                    ->first();
            }
            if ($enrichPo) {
                if (empty($materialType) && !empty($enrichPo->material_type)) {
                    $materialType = $enrichPo->material_type;
                }
                if ((empty($nombre) || $nombre === 'Material sin tipo') && !empty($enrichPo->material_type)) {
                    $nombre = $enrichPo->material_type;
                }
                if (empty($descripcion) && !empty($enrichPo->description)) {
                    $descripcion = $enrichPo->description;
                }
            }

            $materialsData[] = [
                'producto_id'       => $item->id,
                'nombre'            => $nombre,
                'material_type'     => $materialType,
                'descripcion'       => $descripcion,
                'diameter'          => $item->diameter,
                'series'            => $item->series,
                'unidad'            => $item->unidad,
                'cantidad_original' => $cantidadOriginal,
                'cantidad_usada'    => $cantidadOriginal - $cantidadSobrante,
                'cantidad_sobra'    => $cantidadSobrante,
                'source'            => $source,
                'reservation_id'    => $reservationId,
            ];
        }

        DB::table('project_completion_requests')->insert([
            'project_id'     => $id,
            'requested_by'   => auth()->id(),
            'status'         => 'pending',
            'materials_data' => json_encode($materialsData),
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Recuento de sobrantes enviado. Esperando aprobación del jefe de proyectos.',
        ]);
    }

    /**
     * Manager/Admin aprueba o rechaza la solicitud de finalización con sobras.
     * POST /api/proyectoskrsft/{id}/approve-completion
     */
    public function approveCompletion(Request $request, $id)
    {
        $project = DB::table($this->projectsTable)->find($id);
        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Proyecto no encontrado'], 404);
        }

        $userInfo = $this->getUserRoleInfo();
        if (!in_array($userInfo['role'], ['manager', 'admin'])) {
            return response()->json(['success' => false, 'message' => 'No tiene permisos para aprobar finalizaciones'], 403);
        }

        $request->validate([
            'request_id'       => 'required|integer',
            'action'           => 'required|in:approve,reject',
            'rejection_notes'  => 'required_if:action,reject|nullable|string|max:1000',
        ]);

        $completionReq = DB::table('project_completion_requests')->find($request->input('request_id'));
        if (!$completionReq || $completionReq->project_id != $id || $completionReq->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Solicitud no válida o ya procesada'], 400);
        }

        $action = $request->input('action');

        if ($action === 'reject') {
            DB::table('project_completion_requests')
                ->where('id', $completionReq->id)
                ->update([
                    'status'          => 'rejected',
                    'approved_by'     => auth()->id(),
                    'rejection_notes' => $request->input('rejection_notes'),
                    'updated_at'      => now(),
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Solicitud rechazada. El supervisor podrá enviar una nueva solicitud.',
            ]);
        }

        // === APROBAR: ejecutar split de sobras e inventario ===
        return DB::transaction(function () use ($completionReq, $id, $project) {
            $materialsData  = json_decode($completionReq->materials_data, true);
            $materialsConSobras = 0;
            $totalSobra     = 0;
            $newItemIds     = [];
            $auditDetails   = [];
            $processedReservationIds = [];

            foreach ($materialsData as $mat) {
                $item = DB::table('inventario_productos')->find($mat['producto_id']);
                if (!$item) continue;

                $cantidadSobra   = (int) $mat['cantidad_sobra'];
                $cantidadOriginal = (int) $mat['cantidad_original'];
                $source          = $mat['source'] ?? 'project';

                // ── Materiales de INVENTARIO (vía reserva) ───
                if ($source === 'inventory') {
                    $reservationId = $mat['reservation_id'] ?? null;
                    $cantidadConsumida = $cantidadOriginal - $cantidadSobra;

                    // Reducir cantidad (lo consumido se fue) y liberar reserva
                    // NOTA: precio/amount se recalculan en un UPDATE separado porque
                    // MySQL evalúa SET de izquierda a derecha, y si precio referencia
                    // cantidad en el mismo UPDATE, usa el valor ya reducido (doble resta).
                    DB::table('inventario_productos')
                        ->where('id', $item->id)
                        ->update([
                            'cantidad'           => DB::raw("GREATEST(cantidad - {$cantidadConsumida}, 0)"),
                            'cantidad_reservada' => DB::raw("GREATEST(cantidad_reservada - {$cantidadOriginal}, 0)"),
                            'updated_at'         => now(),
                        ]);

                    // Recalcular totales basados en la cantidad ya actualizada
                    DB::table('inventario_productos')
                        ->where('id', $item->id)
                        ->update([
                            'precio' => DB::raw("ROUND(precio_unitario * cantidad, 2)"),
                            'amount' => DB::raw("ROUND(precio_unitario * cantidad, 2)"),
                        ]);

                    // Actualizar amount_pen proporcionalmente
                    $freshItem = DB::table('inventario_productos')->find($item->id);
                    if ($freshItem->moneda === 'USD' && $freshItem->amount_pen && $freshItem->amount > 0) {
                        $ratio = $freshItem->amount_pen / $freshItem->amount;
                        DB::table('inventario_productos')
                            ->where('id', $item->id)
                            ->update([
                                'amount_pen' => DB::raw("ROUND(amount * {$ratio}, 2)"),
                            ]);
                    }

                    // Limpiar enlace inventory_item_id de las órdenes de compra
                    // para que el proyecto ya no aparezca en "Uso por Proyecto" del inventario
                    DB::table('purchase_orders')
                        ->where('inventory_item_id', $item->id)
                        ->where('project_id', $id)
                        ->update([
                            'inventory_item_id' => null,
                            'updated_at'        => now(),
                        ]);

                    // Marcar reserva como consumida
                    if ($reservationId) {
                        $processedReservationIds[] = $reservationId;
                        DB::table('inventory_reservations')
                            ->where('id', $reservationId)
                            ->update([
                                'status'      => 'consumed',
                                'released_by' => auth()->id(),
                                'released_at' => now(),
                                'notes'       => $cantidadSobra > 0
                                    ? "Consumido: {$cantidadConsumida}, sobra devuelta: {$cantidadSobra}"
                                    : "Consumido completamente: {$cantidadOriginal}",
                                'updated_at'  => now(),
                            ]);
                    }

                    if ($cantidadSobra > 0) {
                        $materialsConSobras++;
                        $totalSobra += $cantidadSobra;
                    }

                    $auditDetails[] = [
                        'producto_id'       => $mat['producto_id'],
                        'nombre'            => $mat['nombre'],
                        'source'            => 'inventory',
                        'reservation_id'    => $reservationId,
                        'cantidad_original' => $cantidadOriginal,
                        'cantidad_usada'    => $cantidadConsumida,
                        'cantidad_sobra'    => $cantidadSobra,
                    ];
                    continue;
                }

                // ── Materiales del PROYECTO (comprados para el proyecto) ───
                if ($cantidadSobra > 0) {
                    $cantidadUsada = (int) $mat['cantidad_usada'];
                    $unitPrice = $item->precio_unitario ?: ($item->cantidad > 0 ? $item->precio / $item->cantidad : 0);

                    // Eliminar el original (consumido en el proyecto)
                    DB::table('inventario_productos')
                        ->where('id', $item->id)
                        ->delete();

                    // Crear nuevo item con la sobra (disponible, sin proyecto)
                    $newSku = 'INV-' . md5($item->sku . '-sobra-' . $id . '-' . microtime(true));
                    $newAmount    = round($unitPrice * $cantidadSobra, 2);
                    $newAmountPen = ($item->moneda === 'USD' && $item->amount_pen && $item->amount)
                        ? round(($item->amount_pen / max($item->amount, 1)) * $newAmount, 2)
                        : $newAmount;
                    $newId = DB::table('inventario_productos')->insertGetId([
                        'nombre'           => $item->material_type ?: $item->nombre,
                        'descripcion'      => $item->descripcion,
                        'sku'              => $newSku,
                        'cantidad'         => $cantidadSobra,
                        'cantidad_reservada'=> 0,
                        'precio'           => round($unitPrice * $cantidadSobra, 2),
                        'precio_unitario'  => round($unitPrice, 2),
                        'categoria'        => $item->categoria,
                        'unidad'           => $item->unidad,
                        'moneda'           => $item->moneda,
                        'estado'           => 'activo',
                        'estado_flujo'     => 'disponible',
                        'ubicacion'        => null,
                        'estado_ubicacion' => 'pendiente',
                        'project_id'       => null,
                        'nombre_proyecto'  => null,
                        'apartado'         => false,
                        'batch_id'         => $item->batch_id,
                        'diameter'         => $item->diameter,
                        'series'           => $item->series,
                        'material_type'    => $item->material_type,
                        'amount'           => $newAmount,
                        'amount_pen'       => $newAmountPen,
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ]);

                    $newItemIds[]  = $newId;
                    $materialsConSobras++;
                    $totalSobra += $cantidadSobra;

                    $auditDetails[] = [
                        'producto_id'       => $mat['producto_id'],
                        'nombre'            => $mat['nombre'],
                        'source'            => 'project',
                        'cantidad_original' => $cantidadOriginal,
                        'cantidad_usada'    => $cantidadUsada,
                        'cantidad_sobra'    => $cantidadSobra,
                        'nuevo_item_id'     => $newId,
                    ];
                } else {
                    // Sin sobra: todo fue consumido, eliminar del inventario
                    DB::table('inventario_productos')
                        ->where('id', $item->id)
                        ->delete();

                    $auditDetails[] = [
                        'producto_id'       => $mat['producto_id'],
                        'nombre'            => $mat['nombre'],
                        'source'            => 'project',
                        'cantidad_original' => $cantidadOriginal,
                        'cantidad_usada'    => $cantidadOriginal,
                        'cantidad_sobra'    => 0,
                    ];
                }
            }

            // Liberar reservas activas restantes (no procesadas individualmente)
            $remainingReservations = DB::table('inventory_reservations')
                ->where('project_id', $id)
                ->where('status', 'active')
                ->whereNotIn('id', $processedReservationIds)
                ->get();

            foreach ($remainingReservations as $res) {
                DB::table('inventario_productos')
                    ->where('id', $res->inventory_item_id)
                    ->update([
                        'cantidad_reservada' => DB::raw("GREATEST(cantidad_reservada - {$res->quantity_reserved}, 0)"),
                        'updated_at'         => now(),
                    ]);
            }

            if ($remainingReservations->isNotEmpty()) {
                DB::table('inventory_reservations')
                    ->whereIn('id', $remainingReservations->pluck('id'))
                    ->update([
                        'status'      => 'released',
                        'released_by' => auth()->id(),
                        'released_at' => now(),
                        'notes'       => 'Liberado al completar proyecto con gestión de sobras',
                        'updated_at'  => now(),
                    ]);
            }

            // Actualizar warehouse_status de purchase_orders
            DB::table('purchase_orders')
                ->where('project_id', $id)
                ->where('warehouse_status', 'apartado')
                ->update([
                    'warehouse_status' => 'disponible',
                    'updated_at'       => now(),
                ]);

            // Marcar proyecto como completado
            DB::table($this->projectsTable)
                ->where('id', $id)
                ->update([
                    'status'     => 'completed',
                    'updated_at' => now(),
                ]);

            // Actualizar solicitud
            DB::table('project_completion_requests')
                ->where('id', $completionReq->id)
                ->update([
                    'status'       => 'approved',
                    'approved_by'  => auth()->id(),
                    'completed_at' => now(),
                    'updated_at'   => now(),
                ]);

            // Auditoría
            try {
                app(\App\Services\AuditService::class)->logModelChange(
                    'project.completed_with_sobras',
                    'Project',
                    (int) $id,
                    ['project_name' => $project->name, 'status' => 'active'],
                    [
                        'status'               => 'completed',
                        'materials_con_sobras'  => $materialsConSobras,
                        'total_sobra_devuelta'  => $totalSobra,
                        'nuevos_items_ids'      => $newItemIds,
                        'detalle_materiales'    => $auditDetails,
                        'approved_by'           => auth()->id(),
                    ]
                );
            } catch (\Exception $e) {
                Log::warning('Error registrando auditoría de sobras', ['error' => $e->getMessage()]);
            }

            $releasedCount = count($materialsData);
            $message = "Proyecto finalizado. {$releasedCount} materiales procesados.";
            if ($materialsConSobras > 0) {
                $message .= " {$materialsConSobras} con sobras devueltas al inventario ({$totalSobra} unidades).";
            }

            return response()->json([
                'success'              => true,
                'message'              => $message,
                'released_count'       => $releasedCount,
                'materials_con_sobras' => $materialsConSobras,
                'total_sobra_devuelta' => $totalSobra,
            ]);
        });
    }
}
