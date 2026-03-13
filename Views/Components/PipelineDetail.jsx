/**
 * PipelineDetail — Vista detallada de un lead del pipeline.
 * Muestra todas las secciones de gestión por etapa con herramientas para cada fase.
 */
import { memo, useState } from 'react';
import clsx from 'clsx';
import { ProgressIndicator, ProgressStep } from '@carbon/react';
import '@carbon/styles/css/styles.css';
import './PipelineDetailProgress.css';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ClockIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import LeadFilesSection from './LeadFilesSection';
import { CreateProjectFromLeadModal } from './modals/PipelineModals';
import { formatNumber, formatDate, getCurrencySymbol } from '../utils';

// ── Stage config ────────────────────────────────────────────────────────

const STAGE_LABELS = {
  ingresado: 'Ingresado', contactado: 'Contactado', visitado: 'Visitado',
  presupuestado: 'Presupuestado', negociacion: 'Negociación',
  cerrado_ganado: 'Cerrado Ganado', cerrado_perdido: 'Cerrado Perdido',
};

const STAGE_ORDER = ['ingresado', 'contactado', 'visitado', 'presupuestado', 'negociacion', 'cerrado_ganado', 'cerrado_perdido'];

const STAGE_BADGE = {
  ingresado: 'gray', contactado: 'blue', visitado: 'purple',
  presupuestado: 'amber', negociacion: 'cyan',
  cerrado_ganado: 'emerald', cerrado_perdido: 'red',
};

const COMM_TYPE_LABEL = {
  llamada: 'Llamada', email: 'Email', whatsapp: 'WhatsApp', presencial: 'Presencial', otro: 'Otro',
};
const COMM_TYPE_ICON = {
  llamada: PhoneIcon, email: EnvelopeIcon, whatsapp: ChatBubbleLeftRightIcon,
  presencial: UserGroupIcon, otro: DocumentTextIcon,
};

const VISIT_STATUS_BADGE = { programada: 'blue', completada: 'emerald', cancelada: 'red', reprogramada: 'amber' };
const VISIT_STATUS_LABEL = { programada: 'Programada', completada: 'Completada', cancelada: 'Cancelada', reprogramada: 'Reprogramada' };

const BUDGET_STATUS_BADGE = { borrador: 'gray', enviado: 'blue', aceptado: 'emerald', rechazado: 'red' };
const BUDGET_STATUS_LABEL = { borrador: 'Borrador', enviado: 'Enviado', aceptado: 'Aceptado', rechazado: 'Rechazado' };

const NEG_TYPE_LABEL = { observacion: 'Observación', contraoferta: 'Contraoferta', acuerdo: 'Acuerdo', rechazo: 'Rechazo', otro: 'Otro' };
const NEG_TYPE_BADGE = { observacion: 'gray', contraoferta: 'amber', acuerdo: 'emerald', rechazo: 'red', otro: 'blue' };

const STAGE_PROGRESS_META = {
  ingresado: {
    icon: PlusIcon,
    iconClass: 'text-slate-600',
  },
  contactado: {
    icon: PhoneIcon,
    iconClass: 'text-blue-600',
  },
  visitado: {
    icon: MapPinIcon,
    iconClass: 'text-purple-600',
  },
  presupuestado: {
    icon: CurrencyDollarIcon,
    iconClass: 'text-amber-600',
  },
  negociacion: {
    icon: ChatBubbleLeftRightIcon,
    iconClass: 'text-cyan-600',
  },
  cerrado_ganado: {
    icon: CheckCircleIcon,
    iconClass: 'text-emerald-600',
  },
};

// ── Stage Progress Bar ──────────────────────────────────────────────────

function StageProgressBar({ currentStage }) {
  const mainStages = STAGE_ORDER.filter(s => s !== 'cerrado_perdido');
  const isLost = currentStage === 'cerrado_perdido';
  const currentIdx = isLost ? 0 : Math.max(mainStages.indexOf(currentStage), 0);

  return (
    <div className="w-full rounded-xl border border-primary-100 bg-white px-4 py-4 shadow-sm">
      <ProgressIndicator currentIndex={currentIdx} spaceEqually className="pipeline-progress-indicator">
        {mainStages.map((stage, idx) => {
          const meta = STAGE_PROGRESS_META[stage];
          const Icon = meta.icon;

          return (
            <ProgressStep
              key={stage}
              complete={!isLost && idx < currentIdx}
              current={!isLost && idx === currentIdx}
              invalid={isLost && idx === mainStages.length - 1}
              label={(
                <span className="pipeline-step-label">
                  <Icon className={clsx('pipeline-step-icon size-3.5', meta.iconClass)} />
                  <span className="pipeline-step-label-text">{STAGE_LABELS[stage]}</span>
                </span>
              )}
              secondaryLabel={isLost && idx === mainStages.length - 1 ? STAGE_LABELS.cerrado_perdido : undefined}
              description={`Etapa ${idx + 1}: ${STAGE_LABELS[stage]}`}
            />
          );
        })}
      </ProgressIndicator>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────

function Section({ title, icon: Icon, badge, children, actions }) {
  return (
    <div className="rounded-lg border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-gray-500" />}
          <h3 className="text-sm font-bold text-gray-700">{title}</h3>
          {badge}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

/**
 * @param {{
 *   lead: Object,
 *   loadingDetail: boolean,
 *   onBack: Function,
 *   onDelete: Function,
 *   onChangeStage: Function,
 *   onOpenTeamModal: Function,
 *   onOpenCommunicationModal: Function,
 *   onOpenVisitModal: Function,
 *   onCompleteVisit: Function,
 *   onOpenBudgetModal: Function,
 *   onUpdateBudgetStatus: Function,
 *   onOpenNegotiationModal: Function,
 *   onUploadFiles: Function,
 *   onDeleteFile: Function,
 *   getFileDownloadUrl: Function,
 *   cecos: Array,
 *   workers: Array,
 *   showCreateProjectModal: boolean,
 *   setShowCreateProjectModal: Function,
 *   onCreateProjectFromLead: Function,
 *   savingProject: boolean,
 * }} props
 */
function PipelineDetail({
  lead,
  loadingDetail,
  onBack,
  onDelete,
  onChangeStage,
  onOpenTeamModal,
  onOpenCommunicationModal,
  onOpenVisitModal,
  onCompleteVisit,
  onOpenBudgetModal,
  onUpdateBudgetStatus,
  onOpenNegotiationModal,
  onUploadFiles,
  onDeleteFile,
  getFileDownloadUrl,
  cecos = [],
  workers = [],
  showCreateProjectModal = false,
  setShowCreateProjectModal = () => { },
  onCreateProjectFromLead = () => { },
  savingProject = false,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const isClosed = lead?.etapa === 'cerrado_ganado' || lead?.etapa === 'cerrado_perdido';

  // ── Lógica progresiva por etapas ──
  // Cada sección se desbloquea cuando se alcanza su etapa y permanece disponible en etapas posteriores.
  const stageIdx = STAGE_ORDER.indexOf(lead?.etapa ?? 'ingresado');
  const canRegisterCommunication = !isClosed && stageIdx >= STAGE_ORDER.indexOf('ingresado');
  const canScheduleVisit = !isClosed && stageIdx >= STAGE_ORDER.indexOf('contactado');
  const canCreateBudget = !isClosed && stageIdx >= STAGE_ORDER.indexOf('visitado');
  const canRegisterNegotiation = !isClosed && stageIdx >= STAGE_ORDER.indexOf('presupuestado');

  if (loadingDetail || !lead) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="size-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando detalle...</p>
      </div>
    );
  }

  // Determine next stage for quick advance
  const canClose = lead.etapa === 'negociacion' || lead.etapa === 'presupuestado';

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <ArrowLeftIcon className="size-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{lead.nombre_proyecto}</h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><BuildingOfficeIcon className="size-4" />{lead.cliente_nombre}</span>
              {lead.cliente_empresa && <span className="text-gray-400">· {lead.cliente_empresa}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STAGE_BADGE[lead.etapa]} className="text-sm px-3 py-1">
            {STAGE_LABELS[lead.etapa]}
          </Badge>
          {canClose && (
            <>
              <Button variant="success" size="sm" onClick={() => onChangeStage(lead.id, 'cerrado_ganado')} className="gap-1">
                <CheckCircleIcon className="size-3.5" />
                Cerrar Ganado
              </Button>
              <Button variant="danger" size="sm" onClick={() => onChangeStage(lead.id, 'cerrado_perdido')} className="gap-1">
                <XCircleIcon className="size-3.5" />
                Cerrar Perdido
              </Button>
            </>
          )}
          {!isClosed && (
            <button
              onClick={() => onDelete(lead.id)}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Eliminar lead"
            >
              <TrashIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Stage Progress ── */}
      <div className="overflow-x-auto pb-1">
        <StageProgressBar currentStage={lead.etapa} />
      </div>

      {/* ── Info general ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border-2 border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Información del Lead</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Cliente</dt><dd className="font-medium text-gray-900">{lead.cliente_nombre}</dd></div>
            {lead.cliente_empresa && <div className="flex justify-between"><dt className="text-gray-500">Empresa</dt><dd className="font-medium text-gray-900">{lead.cliente_empresa}</dd></div>}
            {lead.cliente_telefono && <div className="flex justify-between"><dt className="text-gray-500">Teléfono</dt><dd className="font-medium text-gray-900">{lead.cliente_telefono}</dd></div>}
            {lead.cliente_email && <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="font-medium text-gray-900">{lead.cliente_email}</dd></div>}
            {lead.ubicacion && <div className="flex justify-between"><dt className="text-gray-500">Ubicación</dt><dd className="font-medium text-gray-900">{lead.ubicacion}</dd></div>}
            <div className="flex justify-between"><dt className="text-gray-500">Presupuesto est.</dt><dd className="font-mono font-semibold text-gray-900">{getCurrencySymbol(lead.moneda)} {formatNumber(lead.presupuesto_estimado)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Creado</dt><dd className="text-gray-700">{formatDate(lead.created_at)}</dd></div>
            {lead.creator_name && <div className="flex justify-between"><dt className="text-gray-500">Iniciado por</dt><dd className="font-medium text-gray-900">{lead.creator_name}</dd></div>}
          </dl>
          {lead.descripcion && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Descripción:</p>
              <p className="text-sm text-gray-700">{lead.descripcion}</p>
            </div>
          )}
        </div>

        {/* Equipo */}
        <Section
          title="Equipo Asignado"
          icon={UserGroupIcon}
          badge={<Badge variant="blue" className="text-[10px]">{(lead.team || []).length} personas</Badge>}
          actions={!isClosed && (
            <Button variant="secondary" size="sm" onClick={onOpenTeamModal} className="gap-1 text-xs">
              <PencilSquareIcon className="size-3" />
              Editar
            </Button>
          )}
        >
          {(lead.team || []).length === 0 ? (
            <p className="text-sm text-gray-400">Sin equipo asignado</p>
          ) : (
            <div className="space-y-2">
              {lead.team.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                    {(member.nombre_completo || '?').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.nombre_completo}</p>
                    <p className="text-[10px] text-gray-500">{member.cargo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ── Archivos Adjuntos ── */}
      <LeadFilesSection
        files={lead.files || []}
        isClosed={isClosed}
        onUpload={(files, category) => onUploadFiles(lead.id, files, category)}
        onDelete={onDeleteFile}
        getDownloadUrl={getFileDownloadUrl}
      />

      {/* ── Comunicaciones ── */}
      <Section
        title="Registro de Comunicaciones"
        icon={PhoneIcon}
        badge={<Badge variant="blue" className="text-[10px]">{(lead.communications || []).length}</Badge>}
        actions={canRegisterCommunication && (
          <Button variant="primary" size="sm" onClick={onOpenCommunicationModal} className="gap-1 text-xs">
            <PlusIcon className="size-3" />
            Registrar
          </Button>
        )}
      >
        {(lead.communications || []).length === 0 ? (
          <p className="text-sm text-gray-400">Sin comunicaciones registradas</p>
        ) : (
          <div className="space-y-2">
            {lead.communications.map((comm) => {
              const Icon = COMM_TYPE_ICON[comm.tipo] || DocumentTextIcon;
              return (
                <div key={comm.id} className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <span className={clsx(
                    'mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-white',
                    comm.contacto_exitoso ? 'bg-emerald-500' : 'bg-gray-400',
                  )}>
                    <Icon className="size-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">{COMM_TYPE_LABEL[comm.tipo]}</span>
                      <Badge variant={comm.contacto_exitoso ? 'emerald' : 'red'} className="text-[10px]">
                        {comm.contacto_exitoso ? 'Exitoso' : 'No contactado'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-700">{comm.resumen}</p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
                      {comm.contacto_nombre && <span>Contacto: {comm.contacto_nombre}</span>}
                      {comm.realizado_por_nombre && <span>Por: {comm.realizado_por_nombre}</span>}
                      {comm.fecha_comunicacion && (
                        <span className="flex items-center gap-0.5"><ClockIcon className="size-2.5" />{formatDate(comm.fecha_comunicacion)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Visitas ── */}
      <Section
        title="Programación de Visitas"
        icon={MapPinIcon}
        badge={<Badge variant="purple" className="text-[10px]">{(lead.visits || []).length}</Badge>}
        actions={canScheduleVisit && (
          <Button variant="primary" size="sm" onClick={onOpenVisitModal} className="gap-1 text-xs">
            <PlusIcon className="size-3" />
            Programar
          </Button>
        )}
      >
        {(lead.visits || []).length === 0 ? (
          <p className="text-sm text-gray-400">Sin visitas programadas</p>
        ) : (
          <div className="space-y-2">
            {lead.visits.map((visit) => (
              <div key={visit.id} className="flex items-start justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <CalendarDaysIcon className="size-3.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">{formatDate(visit.fecha_programada)}</span>
                      <Badge variant={VISIT_STATUS_BADGE[visit.estado]} className="text-[10px]">
                        {VISIT_STATUS_LABEL[visit.estado]}
                      </Badge>
                    </div>
                    {visit.direccion && <p className="mt-0.5 text-xs text-gray-600">{visit.direccion}</p>}
                    {visit.asignado_nombre && <p className="text-[10px] text-gray-400">Asignado a: {visit.asignado_nombre}</p>}
                    {visit.observaciones && <p className="mt-1 text-xs text-gray-500 italic">{visit.observaciones}</p>}
                    {visit.fecha_realizada && <p className="text-[10px] text-emerald-600">Realizada: {formatDate(visit.fecha_realizada)}</p>}
                  </div>
                </div>
                {visit.estado === 'programada' && !isClosed && (
                  <Button variant="success" size="sm" onClick={() => onCompleteVisit(visit.id)} className="text-xs shrink-0">
                    Completar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Presupuestos ── */}
      <Section
        title="Presupuestos"
        icon={CurrencyDollarIcon}
        badge={<Badge variant="amber" className="text-[10px]">{(lead.budgets || []).length}</Badge>}
        actions={canCreateBudget && (
          <Button variant="primary" size="sm" onClick={onOpenBudgetModal} className="gap-1 text-xs">
            <PlusIcon className="size-3" />
            Crear Presupuesto
          </Button>
        )}
      >
        {(lead.budgets || []).length === 0 ? (
          <p className="text-sm text-gray-400">Sin presupuestos generados</p>
        ) : (
          <div className="space-y-2">
            {lead.budgets.map((budget) => (
              <div key={budget.id} className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-900">v{budget.version}</span>
                    <Badge variant={BUDGET_STATUS_BADGE[budget.estado]} className="text-[10px]">
                      {BUDGET_STATUS_LABEL[budget.estado]}
                    </Badge>
                  </div>
                  <span className="font-mono text-sm font-semibold text-gray-800">
                    {getCurrencySymbol(lead.moneda)} {formatNumber(budget.monto_total)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
                  <span>Base: {getCurrencySymbol(lead.moneda)} {formatNumber(budget.monto_base)}</span>
                  {budget.igv_incluido ? <span>IGV {budget.igv_rate}%</span> : <span>Sin IGV</span>}
                  {budget.creado_por_nombre && <span>Por: {budget.creado_por_nombre}</span>}
                  <span>{formatDate(budget.created_at)}</span>
                </div>
                {budget.detalle && <p className="mt-1.5 text-xs text-gray-600">{budget.detalle}</p>}
                {/* Actions */}
                {!isClosed && budget.estado !== 'aceptado' && (
                  <div className="mt-2 flex items-center gap-2">
                    {budget.estado === 'borrador' && (
                      <Button variant="primary" size="sm" onClick={() => onUpdateBudgetStatus(budget.id, 'enviado')} className="text-[10px]">
                        Marcar Enviado
                      </Button>
                    )}
                    {budget.estado === 'enviado' && (
                      <>
                        <Button variant="success" size="sm" onClick={() => onUpdateBudgetStatus(budget.id, 'aceptado')} className="text-[10px]">
                          Aceptado
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => onUpdateBudgetStatus(budget.id, 'rechazado')} className="text-[10px]">
                          Rechazado
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Negociaciones ── */}
      <Section
        title="Seguimiento de Negociación"
        icon={ChatBubbleLeftRightIcon}
        badge={<Badge variant="cyan" className="text-[10px]">{(lead.negotiations || []).length}</Badge>}
        actions={canRegisterNegotiation && (
          <Button variant="primary" size="sm" onClick={onOpenNegotiationModal} className="gap-1 text-xs">
            <PlusIcon className="size-3" />
            Registrar
          </Button>
        )}
      >
        {(lead.negotiations || []).length === 0 ? (
          <p className="text-sm text-gray-400">Sin registros de negociación</p>
        ) : (
          <div className="space-y-2">
            {lead.negotiations.map((neg) => (
              <div key={neg.id} className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5">
                <Badge variant={NEG_TYPE_BADGE[neg.tipo]} className="text-[10px] shrink-0 mt-0.5">
                  {NEG_TYPE_LABEL[neg.tipo]}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{neg.nota}</p>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
                    {neg.monto_propuesto > 0 && (
                      <span className="font-mono font-semibold text-amber-700">
                        {getCurrencySymbol(lead.moneda)} {formatNumber(neg.monto_propuesto)}
                      </span>
                    )}
                    {neg.registrado_por_nombre && <span>Por: {neg.registrado_por_nombre}</span>}
                    <span>{formatDate(neg.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Historial ── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClockIcon className="size-4 text-gray-500" />
            <span className="text-sm font-bold text-gray-700">Historial de Etapas</span>
            <Badge variant="gray" className="text-[10px]">{(lead.history || []).length}</Badge>
          </div>
          <ChevronRightIcon className={clsx('size-4 text-gray-400 transition-transform', showHistory && 'rotate-90')} />
        </button>
        {showHistory && (
          <div className="border-t border-gray-100 p-4">
            {(lead.history || []).length === 0 ? (
              <p className="text-sm text-gray-400">Sin historial</p>
            ) : (
              <div className="space-y-2">
                {lead.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400 shrink-0 w-24">{formatDate(h.created_at)}</span>
                    <Badge variant={STAGE_BADGE[h.etapa_anterior] || 'gray'} className="text-[10px]">{STAGE_LABELS[h.etapa_anterior] || '—'}</Badge>
                    <ChevronRightIcon className="size-3 text-gray-400" />
                    <Badge variant={STAGE_BADGE[h.etapa_nueva]} className="text-[10px]">{STAGE_LABELS[h.etapa_nueva]}</Badge>
                    {h.motivo && <span className="text-gray-500 truncate">— {h.motivo}</span>}
                    {h.cambiado_por_nombre && <span className="text-gray-400">por {h.cambiado_por_nombre}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Resultado (si cerrado) ── */}
      {isClosed && (
        <div className={clsx(
          'rounded-lg border-2 p-6 text-center',
          lead.etapa === 'cerrado_ganado' ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50',
        )}>
          {lead.etapa === 'cerrado_ganado' ? (
            <>
              <CheckCircleIcon className="mx-auto size-12 text-emerald-500" />
              <h3 className="mt-2 text-lg font-bold text-emerald-800">Proyecto Ganado</h3>
              <p className="mt-1 text-sm text-emerald-600">Este lead fue adjudicado exitosamente.</p>
            </>
          ) : (
            <>
              <XCircleIcon className="mx-auto size-12 text-red-500" />
              <h3 className="mt-2 text-lg font-bold text-red-800">Proyecto Perdido</h3>
              <p className="mt-1 text-sm text-red-600">Este lead no fue adjudicado.</p>
            </>
          )}
        </div>
      )}

      {/* ── Create Project Modal ── */}
      <CreateProjectFromLeadModal
        open={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        lead={lead}
        cecos={cecos}
        workers={workers}
        saving={savingProject}
        onCreate={onCreateProjectFromLead}
      />
    </div>
  );
}

export default memo(PipelineDetail);
