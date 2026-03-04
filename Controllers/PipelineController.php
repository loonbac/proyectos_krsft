<?php

namespace Modulos_ERP\ProyectosKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modulos_ERP\CecosKrsft\Services\CecoHierarchyService;

/**
 * PipelineController — Gestión del pipeline de pre-proyecto.
 * 
 * Etapas: ingresado → contactado → visitado → presupuestado → negociacion → cerrado_ganado/cerrado_perdido
 * Acceso: Sub-Gerente, Jefe de Proyectos, Admin
 */
class PipelineController extends Controller
{
    protected string $pipelineTable = 'project_pipeline';
    protected string $teamTable = 'pipeline_team';
    protected string $communicationsTable = 'pipeline_communications';
    protected string $visitsTable = 'pipeline_visits';
    protected string $budgetsTable = 'pipeline_budgets';
    protected string $negotiationsTable = 'pipeline_negotiations';
    protected string $historyTable = 'pipeline_stage_history';

    /**
     * Orden lógico de las etapas del pipeline.
     */
    const STAGE_ORDER = [
        'ingresado', 'contactado', 'visitado',
        'presupuestado', 'negociacion',
        'cerrado_ganado', 'cerrado_perdido',
    ];

    const STAGE_LABELS = [
        'ingresado'       => 'Ingresado',
        'contactado'      => 'Contactado',
        'visitado'        => 'Visitado',
        'presupuestado'   => 'Presupuestado',
        'negociacion'     => 'Negociación',
        'cerrado_ganado'  => 'Cerrado Ganado',
        'cerrado_perdido' => 'Cerrado Perdido',
    ];

    // ── Verificación de acceso ──────────────────────────────────────────

    /**
     * Solo Sub-Gerente, Jefe de Proyectos y Admin pueden acceder al pipeline.
     */
    protected function checkPipelineAccess(): bool
    {
        $user = auth()->user();
        if (!$user) return false;
        if ($user->isAdmin()) return true;

        if ($user->trabajador_id && DB::getSchemaBuilder()->hasTable('trabajadores')) {
            $trabajador = DB::table('trabajadores')->find($user->trabajador_id);
            if ($trabajador) {
                $cargo = mb_strtolower(trim($trabajador->cargo ?? ''), 'UTF-8');
                return str_contains($cargo, 'sub-gerente')
                    || str_contains($cargo, 'subgerente')
                    || str_contains($cargo, 'jefe de proyectos')
                    || str_contains($cargo, 'gerente');
            }
        }

        return false;
    }

    protected function denyAccess()
    {
        return response()->json([
            'success' => false,
            'message' => 'No tienes permiso para acceder al pipeline de pre-proyectos.',
        ], 403);
    }

    // ── CRUD Pipeline ───────────────────────────────────────────────────

    /**
     * Listar todos los leads del pipeline con conteos y equipo.
     */
    public function index()
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $leads = DB::table($this->pipelineTable)
            ->select([
                'project_pipeline.*',
                'users.name as creator_name',
            ])
            ->leftJoin('users', 'project_pipeline.created_by', '=', 'users.id')
            ->orderByDesc('project_pipeline.updated_at')
            ->get();

        // Enriquecer con equipo
        $allTeam = DB::table($this->teamTable)
            ->join('trabajadores', 'pipeline_team.trabajador_id', '=', 'trabajadores.id')
            ->select('pipeline_team.*', 'trabajadores.nombre_completo', 'trabajadores.cargo')
            ->get()
            ->groupBy('pipeline_id');

        $leads = $leads->map(function ($lead) use ($allTeam) {
            $lead->team = ($allTeam[$lead->id] ?? collect())->values()->toArray();
            return $lead;
        });

        // Conteos por etapa
        $counts = DB::table($this->pipelineTable)
            ->selectRaw('etapa, COUNT(*) as total')
            ->groupBy('etapa')
            ->pluck('total', 'etapa')
            ->toArray();

        return response()->json([
            'success' => true,
            'leads' => $leads,
            'counts' => $counts,
            'stages' => self::STAGE_LABELS,
        ]);
    }

    /**
     * Crear un nuevo lead en el pipeline (etapa: ingresado).
     * Requiere asignar mínimo 2 personas del equipo.
     */
    public function store(Request $request)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $request->validate([
            'nombre_proyecto'     => 'required|string|max:255',
            'cliente_nombre'      => 'required|string|max:255',
            'cliente_telefono'    => 'nullable|string|max:50',
            'cliente_email'       => 'nullable|email|max:255',
            'cliente_empresa'     => 'nullable|string|max:255',
            'descripcion'         => 'nullable|string|max:2000',
            'presupuesto_estimado' => 'nullable|numeric|min:0',
            'moneda'              => 'nullable|in:PEN,USD',
            'ubicacion'           => 'nullable|string|max:500',
            'team_ids'            => 'required|array|min:2',
            'team_ids.*'          => 'integer',
        ], [
            'team_ids.required' => 'Debes asignar al menos 2 personas al equipo.',
            'team_ids.min'      => 'Debes asignar al menos 2 personas al equipo.',
        ]);

        try {
            DB::beginTransaction();

            $pipelineId = DB::table($this->pipelineTable)->insertGetId([
                'nombre_proyecto'      => trim($request->nombre_proyecto),
                'cliente_nombre'       => trim($request->cliente_nombre),
                'cliente_telefono'     => $request->cliente_telefono,
                'cliente_email'        => $request->cliente_email,
                'cliente_empresa'      => $request->cliente_empresa,
                'descripcion'          => $request->descripcion,
                'presupuesto_estimado' => floatval($request->presupuesto_estimado ?? 0),
                'moneda'               => $request->moneda ?? 'PEN',
                'ubicacion'            => $request->ubicacion,
                'etapa'                => 'ingresado',
                'created_by'           => auth()->id(),
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);

            // Insertar equipo
            $teamData = collect($request->team_ids)->unique()->map(fn($tid) => [
                'pipeline_id'   => $pipelineId,
                'trabajador_id' => $tid,
                'rol'           => 'responsable',
                'created_at'    => now(),
                'updated_at'    => now(),
            ])->toArray();

            DB::table($this->teamTable)->insert($teamData);

            // Historial
            DB::table($this->historyTable)->insert([
                'pipeline_id'    => $pipelineId,
                'etapa_anterior' => '',
                'etapa_nueva'    => 'ingresado',
                'motivo'         => 'Lead creado',
                'cambiado_por'   => auth()->id(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            DB::commit();

            return response()->json(['success' => true, 'message' => 'Lead creado correctamente', 'id' => $pipelineId]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creando lead pipeline', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error al crear el lead'], 500);
        }
    }

    /**
     * Detalle completo de un lead con todas sus relaciones.
     */
    public function show($id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)
            ->leftJoin('users', 'project_pipeline.created_by', '=', 'users.id')
            ->select('project_pipeline.*', 'users.name as creator_name')
            ->where('project_pipeline.id', $id)
            ->first();

        if (!$lead) {
            return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);
        }

        $lead->team = DB::table($this->teamTable)
            ->join('trabajadores', 'pipeline_team.trabajador_id', '=', 'trabajadores.id')
            ->where('pipeline_id', $id)
            ->select('pipeline_team.*', 'trabajadores.nombre_completo', 'trabajadores.cargo')
            ->get()->toArray();

        $lead->communications = DB::table($this->communicationsTable)
            ->leftJoin('users', 'pipeline_communications.realizado_por', '=', 'users.id')
            ->where('pipeline_id', $id)
            ->select('pipeline_communications.*', 'users.name as realizado_por_nombre')
            ->orderByDesc('fecha_comunicacion')
            ->get()->toArray();

        $lead->visits = DB::table($this->visitsTable)
            ->leftJoin('trabajadores', 'pipeline_visits.asignado_a', '=', 'trabajadores.id')
            ->where('pipeline_id', $id)
            ->select('pipeline_visits.*', 'trabajadores.nombre_completo as asignado_nombre')
            ->orderByDesc('fecha_programada')
            ->get()->toArray();

        $lead->budgets = DB::table($this->budgetsTable)
            ->leftJoin('users', 'pipeline_budgets.creado_por', '=', 'users.id')
            ->where('pipeline_id', $id)
            ->select('pipeline_budgets.*', 'users.name as creado_por_nombre')
            ->orderByDesc('version')
            ->get()->toArray();

        $lead->negotiations = DB::table($this->negotiationsTable)
            ->leftJoin('users', 'pipeline_negotiations.registrado_por', '=', 'users.id')
            ->where('pipeline_id', $id)
            ->select('pipeline_negotiations.*', 'users.name as registrado_por_nombre')
            ->orderByDesc('pipeline_negotiations.created_at')
            ->get()->toArray();

        $lead->history = DB::table($this->historyTable)
            ->leftJoin('users', 'pipeline_stage_history.cambiado_por', '=', 'users.id')
            ->where('pipeline_id', $id)
            ->select('pipeline_stage_history.*', 'users.name as cambiado_por_nombre')
            ->orderByDesc('pipeline_stage_history.created_at')
            ->get()->toArray();

        return response()->json(['success' => true, 'lead' => $lead]);
    }

    /**
     * Actualizar datos básicos de un lead.
     */
    public function update(Request $request, $id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        $request->validate([
            'nombre_proyecto'      => 'sometimes|string|max:255',
            'cliente_nombre'       => 'sometimes|string|max:255',
            'cliente_telefono'     => 'nullable|string|max:50',
            'cliente_email'        => 'nullable|email|max:255',
            'cliente_empresa'      => 'nullable|string|max:255',
            'descripcion'          => 'nullable|string|max:2000',
            'presupuesto_estimado' => 'nullable|numeric|min:0',
            'moneda'               => 'nullable|in:PEN,USD',
            'ubicacion'            => 'nullable|string|max:500',
            'notas'                => 'nullable|string|max:2000',
        ]);

        DB::table($this->pipelineTable)->where('id', $id)->update(array_merge(
            $request->only([
                'nombre_proyecto', 'cliente_nombre', 'cliente_telefono',
                'cliente_email', 'cliente_empresa', 'descripcion',
                'presupuesto_estimado', 'moneda', 'ubicacion', 'notas',
            ]),
            ['updated_at' => now()]
        ));

        return response()->json(['success' => true, 'message' => 'Lead actualizado']);
    }

    /**
     * Eliminar un lead (solo si no está cerrado_ganado con proyecto vinculado).
     */
    public function destroy($id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        if ($lead->etapa === 'cerrado_ganado' && $lead->project_id) {
            return response()->json(['success' => false, 'message' => 'No se puede eliminar un lead con proyecto vinculado'], 422);
        }

        DB::table($this->pipelineTable)->where('id', $id)->delete();

        return response()->json(['success' => true, 'message' => 'Lead eliminado']);
    }

    // ── Cambio de Etapa ─────────────────────────────────────────────────

    /**
     * Avanzar o cambiar la etapa de un lead con validaciones por etapa.
     */
    public function changeStage(Request $request, $id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        $request->validate([
            'etapa'  => 'required|in:ingresado,contactado,visitado,presupuestado,negociacion,cerrado_ganado,cerrado_perdido',
            'motivo' => 'nullable|string|max:500',
        ]);

        $newStage = $request->etapa;
        $oldStage = $lead->etapa;

        if ($oldStage === $newStage) {
            return response()->json(['success' => false, 'message' => 'El lead ya está en esa etapa'], 422);
        }

        // Validaciones por transición
        $error = $this->validateTransition($lead, $oldStage, $newStage);
        if ($error) {
            return response()->json(['success' => false, 'message' => $error], 422);
        }

        DB::beginTransaction();
        try {
            // Si se cierra como ganado, crear automáticamente el proyecto
            $projectId = null;
            if ($newStage === 'cerrado_ganado') {
                $projectId = $this->createProjectFromLead($lead);
            }

            $updateData = [
                'etapa'      => $newStage,
                'updated_at' => now(),
            ];
            if ($projectId) {
                $updateData['project_id'] = $projectId;
            }

            DB::table($this->pipelineTable)->where('id', $id)->update($updateData);

            DB::table($this->historyTable)->insert([
                'pipeline_id'    => $id,
                'etapa_anterior' => $oldStage,
                'etapa_nueva'    => $newStage,
                'motivo'         => $request->motivo ?? "Cambio de {$oldStage} a {$newStage}",
                'cambiado_por'   => auth()->id(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            DB::commit();

            $msg = 'Etapa actualizada a: ' . self::STAGE_LABELS[$newStage];
            if ($projectId) {
                $msg .= '. Se creó automáticamente el proyecto #' . $projectId;
            }

            return response()->json(['success' => true, 'message' => $msg, 'project_id' => $projectId]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error cambiando etapa pipeline', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error al cambiar la etapa'], 500);
        }
    }

    /**
     * Crear proyecto desde lead (llamado desde modal con abreviatura y CECO)
     */
    public function createProjectFromLeadModal(Request $request, $id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        if ($lead->etapa === 'cerrado_ganado') {
            return response()->json(['success' => false, 'message' => 'Este lead ya ha sido convertido a proyecto'], 422);
        }

        // Validar que tenga presupuesto aceptado
        $acceptedBudget = DB::table($this->budgetsTable)
            ->where('pipeline_id', $lead->id)
            ->where('estado', 'aceptado')
            ->orderByDesc('version')
            ->first();

        if (!$acceptedBudget) {
            return response()->json(['success' => false, 'message' => 'Debe tener un presupuesto aceptado para crear el proyecto'], 422);
        }

        $request->validate([
            'abbreviation'  => 'required|string|max:50',
            'ceco_id'       => 'required|integer|exists:cecos,id',
            'supervisor_id' => 'required|integer|exists:trabajadores,id',
        ]);

        DB::beginTransaction();
        try {
            // Obtener el CECO padre seleccionado
            $parentCeco = DB::table('cecos')->find($request->ceco_id);
            if (!$parentCeco || $parentCeco->nivel != 0 || $parentCeco->parent_id !== null) {
                throw new \Exception('El CECO seleccionado debe ser un CECO padre válido');
            }

            // Crear el proyecto con el supervisor seleccionado
            $projectId = $this->createProjectFromLead($lead, $request->input('supervisor_id'));

            // Crear CECO automático usando la abreviatura del proyecto como nombre
            /** @var CecoHierarchyService $cecoHierarchyService */
            $cecoHierarchyService = app(CecoHierarchyService::class);
            $cecoResult = $cecoHierarchyService->createWithSubcuentas([
                'nombre' => $request->abbreviation, // Usar abreviatura como nombre
                'razon_social' => $lead->cliente_empresa ?? null,
                'descripcion' => $lead->descripcion ?? null,
                'tipo_cliente' => $parentCeco->codigo, // Usar código del CECO padre
                'estado' => true,
            ], auth()->id());

            $createdCecoId = $cecoResult['cliente']->id;
            $createdCecoCode = $cecoResult['codigo_generado'] ?? null;

            // Actualizar proyecto con abreviatura y ceco_id
            DB::table('projects')
                ->where('id', $projectId)
                ->update([
                    'abbreviation' => $request->abbreviation,
                    'ceco_id'      => $createdCecoId,
                    'updated_at'   => now(),
                ]);

            // Actualizar lead a cerrado_ganado
            DB::table($this->pipelineTable)
                ->where('id', $id)
                ->update([
                    'etapa'      => 'cerrado_ganado',
                    'project_id' => $projectId,
                    'updated_at' => now(),
                ]);

            // Registrar cambio en historial
            DB::table($this->historyTable)->insert([
                'pipeline_id'    => $id,
                'etapa_anterior' => $lead->etapa,
                'etapa_nueva'    => 'cerrado_ganado',
                'motivo'         => "Convertido a proyecto #{$projectId}: {$request->abbreviation}" . ($createdCecoCode ? " | CECO {$createdCecoCode}" : ''),
                'cambiado_por'   => auth()->id(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            DB::commit();

            return response()->json([
                'success'    => true,
                'message'    => 'Proyecto creado exitosamente con CECO automático',
                'project_id' => $projectId,
                'ceco_id'    => $createdCecoId,
                'ceco_code'  => $createdCecoCode,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creando proyecto desde lead', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error al crear el proyecto'], 500);
        }
    }

    /**
     * Validar que la transición sea permitida.
     */
    protected function validateTransition($lead, string $from, string $to): ?string
    {
        // No se puede cambiar desde cerrado
        if (in_array($from, ['cerrado_ganado', 'cerrado_perdido'])) {
            return 'No se puede cambiar la etapa de un lead cerrado.';
        }

        // Para pasar a contactado, debe tener al menos 1 comunicación exitosa
        if ($to === 'contactado') {
            $hasContact = DB::table($this->communicationsTable)
                ->where('pipeline_id', $lead->id)
                ->where('contacto_exitoso', true)
                ->exists();
            if (!$hasContact) {
                return 'Debe registrar al menos una comunicación exitosa antes de pasar a Contactado.';
            }
        }

        // Para pasar a visitado, debe tener al menos 1 visita completada
        if ($to === 'visitado') {
            $hasVisit = DB::table($this->visitsTable)
                ->where('pipeline_id', $lead->id)
                ->where('estado', 'completada')
                ->exists();
            if (!$hasVisit) {
                return 'Debe completar al menos una visita antes de pasar a Visitado.';
            }
        }

        // Para pasar a presupuestado, debe tener al menos 1 presupuesto enviado
        if ($to === 'presupuestado') {
            $hasBudget = DB::table($this->budgetsTable)
                ->where('pipeline_id', $lead->id)
                ->whereIn('estado', ['enviado', 'aceptado'])
                ->exists();
            if (!$hasBudget) {
                return 'Debe crear y enviar al menos un presupuesto antes de pasar a Presupuestado.';
            }
        }

        // Para pasar a negociación, debe estar presupuestado
        if ($to === 'negociacion') {
            $currentIdx = array_search($from, self::STAGE_ORDER);
            $targetIdx = array_search('presupuestado', self::STAGE_ORDER);
            if ($currentIdx < $targetIdx) {
                return 'Debe pasar por la etapa de Presupuestado antes de iniciar Negociación.';
            }
        }

        // Para cerrar ganado, debe tener presupuesto aceptado
        if ($to === 'cerrado_ganado') {
            $accepted = DB::table($this->budgetsTable)
                ->where('pipeline_id', $lead->id)
                ->where('estado', 'aceptado')
                ->exists();
            if (!$accepted) {
                return 'Debe tener un presupuesto aceptado para cerrar como ganado.';
            }
        }

        return null;
    }

    /**
     * Crear proyecto automáticamente desde un lead ganado.
     * Usa el presupuesto aceptado como base del monto del proyecto.
     */
    protected function createProjectFromLead(object $lead, ?int $supervisorId = null): int
    {
        $retentionRate = 0.12;
        $availableRate = 0.88;

        // Obtener el presupuesto aceptado (el más reciente)
        $budget = DB::table($this->budgetsTable)
            ->where('pipeline_id', $lead->id)
            ->where('estado', 'aceptado')
            ->orderByDesc('version')
            ->first();

        $baseAmount = $budget ? (float)$budget->monto_base : (float)$lead->presupuesto_estimado;
        $igvEnabled = $budget ? (bool)$budget->igv_incluido : true;
        $igvRate    = $budget ? (float)$budget->igv_rate : 18.0;
        $totalAmount = $budget ? (float)$budget->monto_total : ($igvEnabled ? $baseAmount * (1 + $igvRate / 100) : $baseAmount);

        $retainedAmount = $totalAmount * $retentionRate;
        $availableAmount = $totalAmount * $availableRate;

        // Si no se pasa supervisor, usar el primer miembro del equipo
        if (!$supervisorId) {
            $firstTeamMember = DB::table($this->teamTable)
                ->where('pipeline_id', $lead->id)
                ->first();
            $supervisorId = $firstTeamMember ? $firstTeamMember->trabajador_id : null;
        }

        $projectId = DB::table('projects')->insertGetId([
            'name'               => $lead->nombre_proyecto,
            'currency'           => $lead->moneda ?? 'PEN',
            'base_amount'        => $baseAmount,
            'total_amount'       => $totalAmount,
            'retained_amount'    => $retainedAmount,
            'available_amount'   => $availableAmount,
            'spending_threshold' => 75,
            'igv_enabled'        => $igvEnabled,
            'igv_rate'           => $igvRate,
            'supervisor_id'      => $supervisorId,
            'user_id'            => auth()->id(),
            'status'             => 'active',
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        // Asignar todo el equipo del pipeline como trabajadores del proyecto
        $teamMembers = DB::table($this->teamTable)
            ->where('pipeline_id', $lead->id)
            ->get();

        foreach ($teamMembers as $member) {
            DB::table('project_workers')->insertOrIgnore([
                'project_id'    => $projectId,
                'trabajador_id' => $member->trabajador_id,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        return $projectId;
    }

    // ── Auto-advance helper ──────────────────────────────────────────────

    /**
     * Intentar avance automático de etapa basado en acciones.
     * Solo avanza si el lead está en la etapa esperada (expectedStage).
     */
    protected function tryAutoAdvance(int $pipelineId, string $expectedStage, string $targetStage): ?array
    {
        $lead = DB::table($this->pipelineTable)->find($pipelineId);
        if (!$lead || $lead->etapa !== $expectedStage) {
            return null;
        }

        DB::table($this->pipelineTable)->where('id', $pipelineId)->update([
            'etapa'      => $targetStage,
            'updated_at' => now(),
        ]);

        DB::table($this->historyTable)->insert([
            'pipeline_id'    => $pipelineId,
            'etapa_anterior' => $expectedStage,
            'etapa_nueva'    => $targetStage,
            'motivo'         => 'Avance automático: ' . self::STAGE_LABELS[$expectedStage] . ' → ' . self::STAGE_LABELS[$targetStage],
            'cambiado_por'   => auth()->id(),
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        return [
            'from'  => $expectedStage,
            'to'    => $targetStage,
            'label' => self::STAGE_LABELS[$targetStage],
        ];
    }

    // ── Equipo ──────────────────────────────────────────────────────────

    public function updateTeam(Request $request, $id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        $request->validate([
            'team_ids'   => 'required|array|min:2',
            'team_ids.*' => 'integer',
        ], ['team_ids.min' => 'Se requieren al menos 2 personas en el equipo.']);

        DB::table($this->teamTable)->where('pipeline_id', $id)->delete();

        $teamData = collect($request->team_ids)->unique()->map(fn($tid) => [
            'pipeline_id'   => $id,
            'trabajador_id' => $tid,
            'rol'           => 'responsable',
            'created_at'    => now(),
            'updated_at'    => now(),
        ])->toArray();

        DB::table($this->teamTable)->insert($teamData);

        return response()->json(['success' => true, 'message' => 'Equipo actualizado']);
    }

    // ── Comunicaciones ──────────────────────────────────────────────────

    public function addCommunication(Request $request, $id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        $request->validate([
            'tipo'              => 'required|in:llamada,email,whatsapp,presencial,otro',
            'resumen'           => 'required|string|max:2000',
            'contacto_exitoso'  => 'required|boolean',
            'contacto_nombre'   => 'nullable|string|max:255',
            'fecha_comunicacion' => 'nullable|date',
        ]);

        DB::table($this->communicationsTable)->insert([
            'pipeline_id'        => $id,
            'tipo'               => $request->tipo,
            'resumen'            => trim($request->resumen),
            'contacto_exitoso'   => $request->boolean('contacto_exitoso'),
            'contacto_nombre'    => $request->contacto_nombre,
            'realizado_por'      => auth()->id(),
            'fecha_comunicacion' => $request->fecha_comunicacion ?? now(),
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        // Auto-avance: comunicación exitosa → ingresado a contactado
        $stageChanged = null;
        if ($request->boolean('contacto_exitoso')) {
            $stageChanged = $this->tryAutoAdvance((int) $id, 'ingresado', 'contactado');
        }

        $msg = 'Comunicación registrada';
        if ($stageChanged) {
            $msg .= '. Etapa avanzada automáticamente a ' . $stageChanged['label'];
        }

        return response()->json([
            'success'       => true,
            'message'       => $msg,
            'stage_changed' => $stageChanged,
        ]);
    }

    // ── Visitas ─────────────────────────────────────────────────────────

    public function addVisit(Request $request, $id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        $request->validate([
            'fecha_programada' => 'required|date',
            'direccion'        => 'nullable|string|max:500',
            'observaciones'    => 'nullable|string|max:2000',
            'asignado_a'       => 'nullable|integer',
        ]);

        DB::table($this->visitsTable)->insert([
            'pipeline_id'      => $id,
            'fecha_programada' => $request->fecha_programada,
            'direccion'        => $request->direccion,
            'observaciones'    => $request->observaciones,
            'asignado_a'       => $request->asignado_a,
            'estado'           => 'programada',
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Visita programada']);
    }

    public function completeVisit(Request $request, $visitId)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $visit = DB::table($this->visitsTable)->find($visitId);
        if (!$visit) return response()->json(['success' => false, 'message' => 'Visita no encontrada'], 404);

        $request->validate([
            'observaciones' => 'nullable|string|max:2000',
        ]);

        DB::table($this->visitsTable)->where('id', $visitId)->update([
            'estado'          => 'completada',
            'fecha_realizada' => now(),
            'observaciones'   => $request->observaciones ?? $visit->observaciones,
            'updated_at'      => now(),
        ]);

        // Auto-avance: visita completada → contactado a visitado
        $stageChanged = $this->tryAutoAdvance((int) $visit->pipeline_id, 'contactado', 'visitado');

        $msg = 'Visita completada';
        if ($stageChanged) {
            $msg .= '. Etapa avanzada automáticamente a ' . $stageChanged['label'];
        }

        return response()->json([
            'success'       => true,
            'message'       => $msg,
            'stage_changed' => $stageChanged,
        ]);
    }

    // ── Presupuestos ────────────────────────────────────────────────────

    public function addBudget(Request $request, $id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        $request->validate([
            'monto_base'   => 'required|numeric|min:0.01',
            'igv_incluido' => 'nullable|boolean',
            'igv_rate'     => 'nullable|numeric|min:0|max:100',
            'detalle'      => 'nullable|string|max:5000',
            'partidas'     => 'nullable|array',
        ]);

        $igvIncluded = $request->boolean('igv_incluido', true);
        $igvRate = floatval($request->igv_rate ?? 18.00);
        $montoBase = floatval($request->monto_base);
        $montoTotal = $igvIncluded ? $montoBase * (1 + $igvRate / 100) : $montoBase;

        $maxVersion = DB::table($this->budgetsTable)
            ->where('pipeline_id', $id)
            ->max('version') ?? 0;

        DB::table($this->budgetsTable)->insert([
            'pipeline_id'  => $id,
            'version'      => $maxVersion + 1,
            'monto_base'   => $montoBase,
            'igv_incluido' => $igvIncluded,
            'igv_rate'     => $igvRate,
            'monto_total'  => $montoTotal,
            'detalle'      => $request->detalle,
            'partidas'     => $request->partidas ? json_encode($request->partidas) : null,
            'estado'       => 'borrador',
            'creado_por'   => auth()->id(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['success' => true, 'message' => "Presupuesto v" . ($maxVersion + 1) . " creado"]);
    }

    public function updateBudgetStatus(Request $request, $budgetId)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $budget = DB::table($this->budgetsTable)->find($budgetId);
        if (!$budget) return response()->json(['success' => false, 'message' => 'Presupuesto no encontrado'], 404);

        $request->validate([
            'estado' => 'required|in:borrador,enviado,aceptado,rechazado',
        ]);

        $updates = [
            'estado'     => $request->estado,
            'updated_at' => now(),
        ];

        if ($request->estado === 'enviado') {
            $updates['enviado_at'] = now();
        }

        DB::table($this->budgetsTable)->where('id', $budgetId)->update($updates);

        // Auto-avance: presupuesto enviado → visitado a presupuestado
        $stageChanged = null;
        if ($request->estado === 'enviado') {
            $stageChanged = $this->tryAutoAdvance((int) $budget->pipeline_id, 'visitado', 'presupuestado');
        }

        $msg = 'Estado de presupuesto actualizado';
        if ($stageChanged) {
            $msg .= '. Etapa avanzada automáticamente a ' . $stageChanged['label'];
        }

        return response()->json([
            'success'       => true,
            'message'       => $msg,
            'stage_changed' => $stageChanged,
        ]);
    }

    // ── Negociaciones ───────────────────────────────────────────────────

    public function addNegotiation(Request $request, $id)
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $lead = DB::table($this->pipelineTable)->find($id);
        if (!$lead) return response()->json(['success' => false, 'message' => 'Lead no encontrado'], 404);

        $request->validate([
            'nota'            => 'required|string|max:2000',
            'tipo'            => 'required|in:observacion,contraoferta,acuerdo,rechazo,otro',
            'monto_propuesto' => 'nullable|numeric|min:0',
        ]);

        DB::table($this->negotiationsTable)->insert([
            'pipeline_id'     => $id,
            'nota'            => trim($request->nota),
            'tipo'            => $request->tipo,
            'monto_propuesto' => $request->monto_propuesto,
            'registrado_por'  => auth()->id(),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // Auto-avance: negociación registrada → presupuestado a negociación
        $stageChanged = $this->tryAutoAdvance((int) $id, 'presupuestado', 'negociacion');

        $msg = 'Registro de negociación agregado';
        if ($stageChanged) {
            $msg .= '. Etapa avanzada automáticamente a ' . $stageChanged['label'];
        }

        return response()->json([
            'success'       => true,
            'message'       => $msg,
            'stage_changed' => $stageChanged,
        ]);
    }

    // ── Workers listing (para selección de equipo) ──────────────────────

    public function getWorkers()
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        if (!DB::getSchemaBuilder()->hasTable('trabajadores')) {
            return response()->json(['success' => true, 'workers' => []]);
        }

        $workers = DB::table('trabajadores')
            ->select('id', 'nombre_completo', 'cargo', 'estado')
            ->whereRaw("LOWER(estado) LIKE '%activo%'")
            ->orderBy('nombre_completo')
            ->get();

        return response()->json(['success' => true, 'workers' => $workers]);
    }

    /**
     * Obtener CECOs disponibles para asignación a proyectos (con estructura jerárquica)
     */
    public function getCecos()
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('cecos')) {
                return response()->json([
                    'success' => true, 
                    'cecos' => [], 
                    'hierarchical' => []
                ]);
            }

            // Obtener todos los CECOs padres (nivel 0, sin parent_id, sin tipo_subcuenta)
            $cecos = DB::table('cecos')
                ->select('id', 'codigo', 'nombre', 'razon_social')
                ->where('nivel', 0)
                ->whereNull('parent_id')
                ->whereNull('tipo_subcuenta')
                ->orderBy('codigo')
                ->get()
                ->map(function($ceco) {
                    return [
                        'id' => $ceco->id,
                        'codigo' => $ceco->codigo,
                        'nombre' => $ceco->nombre,
                        'razon_social' => $ceco->razon_social,
                        'nivel' => 0,
                    ];
                })
                ->toArray();

            return response()->json([
                'success' => true, 
                'cecos' => array_values($cecos),
                'hierarchical' => array_values($cecos),
            ]);
        } catch (\Exception $e) {
            Log::error('Error en getCecos', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false, 
                'cecos' => [], 
                'hierarchical' => [], 
                'message' => 'Error interno'
            ]);
        }
    }

    /**
     * Construir árbol de CECOs recursivamente
     */
    private function buildCecoTree($ceco, $allCecos, $level = 0)
    {
        $children = $allCecos->filter(fn($c) => $c->parent_id === $ceco->id)->values();
        
        return [
            'id' => $ceco->id,
            'codigo' => $ceco->codigo,
            'nombre' => $ceco->nombre,
            'razon_social' => $ceco->razon_social,
            'nivel' => $level,
            'children' => $children->map(fn($child) => $this->buildCecoTree($child, $allCecos, $level + 1))->toArray(),
        ];
    }

    // ── Estadísticas del pipeline ───────────────────────────────────────

    public function stats()
    {
        if (!$this->checkPipelineAccess()) return $this->denyAccess();

        $counts = DB::table($this->pipelineTable)
            ->selectRaw('etapa, COUNT(*) as total')
            ->groupBy('etapa')
            ->pluck('total', 'etapa')
            ->toArray();

        $totalEstimated = DB::table($this->pipelineTable)
            ->whereNotIn('etapa', ['cerrado_perdido'])
            ->sum('presupuesto_estimado');

        $wonAmount = DB::table($this->pipelineTable)
            ->where('etapa', 'cerrado_ganado')
            ->sum('presupuesto_estimado');

        $totalLeads = array_sum($counts);
        $activeLeads = $totalLeads - ($counts['cerrado_ganado'] ?? 0) - ($counts['cerrado_perdido'] ?? 0);

        return response()->json([
            'success' => true,
            'counts' => $counts,
            'total_leads' => $totalLeads,
            'active_leads' => $activeLeads,
            'total_estimated' => $totalEstimated,
            'won_amount' => $wonAmount,
            'conversion_rate' => $totalLeads > 0
                ? round(($counts['cerrado_ganado'] ?? 0) / $totalLeads * 100, 1)
                : 0,
        ]);
    }
}
