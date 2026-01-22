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
     * Determine user role and supervisor status
     */
    protected function getUserRoleInfo(): array
    {
        $user = auth()->user();
        
        if (!$user) {
            return ['role' => 'guest', 'isSupervisor' => false, 'trabajadorId' => null];
        }

        // Admin always has full access
        if ($user->role === 'admin') {
            return ['role' => 'admin', 'isSupervisor' => false, 'trabajadorId' => $user->trabajador_id];
        }

        // Check if user has linked trabajador with cargo
        if ($user->trabajador_id && DB::getSchemaBuilder()->hasTable('trabajadores')) {
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
            if (!DB::getSchemaBuilder()->hasTable('trabajadores')) {
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
            return response()->json(['success' => false, 'supervisors' => [], 'message' => $e->getMessage()]);
        }
    }

    /**
     * Get all workers (for supervisor to assign to project)
     */
    public function getAllWorkers()
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('trabajadores')) {
                return response()->json(['success' => false, 'workers' => []]);
            }

            $workers = DB::table('trabajadores')
                ->where('estado', 'LIKE', '%activo%')
                ->orderBy('nombre_completo')
                ->get(['id', 'nombre_completo', 'cargo', 'dni']);

            return response()->json(['success' => true, 'workers' => $workers]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'workers' => [], 'message' => $e->getMessage()]);
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
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
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
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Create purchase order (for supervisors to send to Compras)
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

        try {
            $orderData = [
                'project_id' => $id,
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
                $request->validate(['amount' => 'required|numeric|min:0.01']);
                $orderData['amount'] = floatval($request->amount);
                $orderData['status'] = 'approved';
                $orderData['approved_by'] = auth()->id();
                $orderData['approved_at'] = now();
            } else {
                $materials = $request->input('materials', []);
                if (empty($materials)) {
                    return response()->json(['success' => false, 'message' => 'Agregue materiales'], 400);
                }
                $orderData['materials'] = json_encode($materials);
                $orderData['status'] = 'pending';
            }

            $orderId = DB::table('purchase_orders')->insertGetId($orderData);

            return response()->json([
                'success' => true,
                'message' => $request->type === 'service' 
                    ? 'Gasto registrado' 
                    : 'Orden enviada a Compras para aprobación',
                'order_id' => $orderId
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
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
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
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
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::table('project_workers')->where('project_id', $id)->delete();
            DB::table($this->expensesTable)->where('project_id', $id)->delete();
            DB::table('purchase_orders')->where('project_id', $id)->delete();
            DB::table($this->projectsTable)->where('id', $id)->delete();

            return response()->json(['success' => true, 'message' => 'Proyecto eliminado']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
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
        $activeProjects = $query->where('status', 'active')->count();

        return response()->json([
            'success' => true,
            'stats' => [
                'total_projects' => $totalProjects,
                'active_projects' => $activeProjects,
                'total_budget' => $totalBudget,
                'total_spent' => 0,
                'total_remaining' => $totalBudget
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
        $xlsxPath = $modulePath . '/Assets/Templates/Plantilla_Materiales.xlsx';
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
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">CANT</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">UND</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">DESCRIPCION</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">DIAMETRO</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">SERIE</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">MATERIAL</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">NORMA_DE_FAB</Data></Cell>
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

            $imported = 0;
            $errors = [];

            foreach ($rows as $index => $columns) {
                // Skip if not enough columns
                if (count($columns) < 3) {
                    $errors[] = "Fila " . ($index + 2) . ": formato inválido";
                    continue;
                }

                // Excel columns: ITEM(0), CANT(1), UND(2), DESCRIPCION(3), DIAMETRO(4), SERIE(5), MATERIAL(6), NORMA(7)
                // Skip ITEM column (index 0) as it's auto-generated
                $qty = intval($columns[1] ?? 1);
                $unit = trim($columns[2] ?? 'UND');
                $description = trim($columns[3] ?? '');
                $diameter = trim($columns[4] ?? '');
                $series = trim($columns[5] ?? '');
                $materialType = trim($columns[6] ?? '');
                $manufacturingStandard = trim($columns[7] ?? '');

                if (empty($description)) {
                    $errors[] = "Fila " . ($index + 2) . ": descripción vacía";
                    continue;
                }

                // Create order
                $orderData = [
                    'project_id' => $id,
                    'type' => 'material',
                    'description' => $description,
                    'materials' => json_encode([['name' => $description, 'qty' => $qty]]),
                    'unit' => $unit,
                    'diameter' => $diameter ?: null,
                    'series' => $series ?: null,
                    'material_type' => $materialType ?: null,
                    'manufacturing_standard' => $manufacturingStandard ?: null,
                    'currency' => $project->currency ?? 'PEN',
                    'status' => 'pending',
                    'created_by' => auth()->id(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                DB::table('purchase_orders')->insert($orderData);
                $imported++;
            }

            return response()->json([
                'success' => true,
                'message' => $imported . ' materiales importados',
                'imported' => $imported,
                'errors' => $errors
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
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
        preg_match_all('/<row[^>]*>(.*?)<\/row>/su', $sheetXml, $rowMatches);
        
        if (!empty($rowMatches[1])) {
            // Skip header row (first row)
            $dataRows = array_slice($rowMatches[1], 1);
            
            foreach ($dataRows as $rowXml) {
                // Build row with proper column positions (A-H = 0-7)
                $currentRow = array_fill(0, 8, '');
                
                // Extract each cell element separately
                preg_match_all('/<c\s+([^>]*)>(.*?)<\/c>|<c\s+([^\/]*)\/>/su', $rowXml, $cellMatches, PREG_SET_ORDER);
                
                foreach ($cellMatches as $cellMatch) {
                    // Get attributes string (from either format)
                    $attrs = !empty($cellMatch[1]) ? $cellMatch[1] : ($cellMatch[3] ?? '');
                    $cellContent = $cellMatch[2] ?? '';
                    
                    // Extract cell reference (r="A2")
                    if (!preg_match('/r="([A-Z]+)\d+"/i', $attrs, $refMatch)) {
                        continue;
                    }
                    $colLetter = $refMatch[1];
                    $colIndex = ord(strtoupper($colLetter)) - ord('A');
                    
                    if ($colIndex < 0 || $colIndex > 7) continue;
                    
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
                
                // Only add non-empty rows
                if (array_filter($currentRow)) {
                    $rows[] = $currentRow;
                }
            }
        }
        
        return $rows;
    }
}
