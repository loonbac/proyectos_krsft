/**
 * PipelineBoard — Vista Kanban del pipeline de pre-proyecto.
 * Muestra leads agrupados por etapa con estadísticas y acciones rápidas.
 */
import { memo } from 'react';
import clsx from 'clsx';
import {
  PlusIcon,
  UserGroupIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import StatsCard from './ui/StatsCard';
import { formatNumber, formatDate, getCurrencySymbol } from '../utils';

// ── Configuración visual por etapa ──────────────────────────────────────

const STAGE_CONFIG = {
  ingresado:       { color: 'bg-slate-500',   lightBg: 'bg-slate-50',   border: 'border-slate-200',  badge: 'gray',    icon: PlusIcon },
  contactado:      { color: 'bg-blue-500',    lightBg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'blue',    icon: PhoneIcon },
  visitado:        { color: 'bg-purple-500',  lightBg: 'bg-purple-50',  border: 'border-purple-200', badge: 'purple',  icon: MapPinIcon },
  presupuestado:   { color: 'bg-amber-500',   lightBg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'amber',   icon: CurrencyDollarIcon },
  negociacion:     { color: 'bg-cyan-500',    lightBg: 'bg-cyan-50',    border: 'border-cyan-200',   badge: 'cyan',    icon: ChatBubbleLeftRightIcon },
  cerrado_ganado:  { color: 'bg-emerald-500', lightBg: 'bg-emerald-50', border: 'border-emerald-200',badge: 'emerald', icon: CheckCircleIcon },
  cerrado_perdido: { color: 'bg-red-500',     lightBg: 'bg-red-50',     border: 'border-red-200',    badge: 'red',     icon: XCircleIcon },
};

const STAGE_LABELS = {
  ingresado: 'Ingresado',
  contactado: 'Contactado',
  visitado: 'Visitado',
  presupuestado: 'Presupuestado',
  negociacion: 'Negociación',
  cerrado_ganado: 'Cerrado Ganado',
  cerrado_perdido: 'Cerrado Perdido',
};

// Fases consolidadas
const PHASES = [
  { label: 'Fase Inicial', stages: ['ingresado', 'contactado', 'visitado'], color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { label: 'Propuesta', stages: ['presupuestado'], color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { label: 'Negociación', stages: ['negociacion'], color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { label: 'Resultado', stages: ['cerrado_ganado', 'cerrado_perdido'], color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
];

// ── Lead Card ───────────────────────────────────────────────────────────

function LeadCard({ lead, onSelect }) {
  const config = STAGE_CONFIG[lead.etapa] || STAGE_CONFIG.ingresado;

  return (
    <div
      className={clsx(
        'cursor-pointer rounded-lg border-2 bg-white p-3 shadow-sm transition-all hover:shadow-md',
        config.border,
      )}
      onClick={() => onSelect(lead)}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{lead.nombre_proyecto}</h4>
        <ChevronRightIcon className="size-4 shrink-0 text-gray-400" />
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <BuildingOfficeIcon className="size-3.5 text-gray-400" />
        <span className="text-xs text-gray-600 truncate">{lead.cliente_nombre}</span>
      </div>

      {lead.cliente_empresa && (
        <p className="mt-0.5 text-[10px] text-gray-400 truncate">{lead.cliente_empresa}</p>
      )}

      <div className="mt-2 flex items-center justify-between">
        {lead.presupuesto_estimado > 0 ? (
          <span className="font-mono text-xs font-semibold text-gray-700">
            {getCurrencySymbol(lead.moneda)} {formatNumber(lead.presupuesto_estimado)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">Sin presupuesto</span>
        )}

        {lead.team && lead.team.length > 0 && (
          <div className="flex items-center gap-1">
            <UserGroupIcon className="size-3.5 text-gray-400" />
            <span className="text-[10px] text-gray-500">{lead.team.length}</span>
          </div>
        )}
      </div>

      <p className="mt-1.5 text-[10px] text-gray-400">{formatDate(lead.created_at)}</p>
    </div>
  );
}

// ── Stage Column ────────────────────────────────────────────────────────

function StageColumn({ stage, leads, onSelectLead }) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.ingresado;
  const Icon = config.icon;

  return (
    <div className={clsx('flex flex-col rounded-lg border', config.border, config.lightBg)}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200/50">
        <div className="flex items-center gap-2">
          <span className={clsx('inline-flex size-6 items-center justify-center rounded-full text-white', config.color)}>
            <Icon className="size-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
            {STAGE_LABELS[stage]}
          </span>
        </div>
        <Badge variant={config.badge} className="text-[10px]">{leads.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 p-2 overflow-y-auto max-h-[50vh]">
        {leads.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">Sin leads</p>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Pipeline Stats ──────────────────────────────────────────────────────

function PipelineStats({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatsCard
        title="Leads Activos"
        value={stats.active_leads ?? 0}
        icon={<UserGroupIcon className="size-8" />}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
      />
      <StatsCard
        title="Total Leads"
        value={stats.total_leads ?? 0}
        icon={<PlusIcon className="size-8" />}
        iconBg="bg-gray-100"
        iconColor="text-gray-600"
      />
      <StatsCard
        title="Estimado"
        value={`S/ ${formatNumber(stats.total_estimated ?? 0)}`}
        icon={<CurrencyDollarIcon className="size-8" />}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
      />
      <StatsCard
        title="Tasa Conv."
        value={`${stats.conversion_rate ?? 0}%`}
        icon={<CheckCircleIcon className="size-8" />}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
      />
    </div>
  );
}

// ── Main Board ──────────────────────────────────────────────────────────

/**
 * @param {{
 *   leadsByStage: Object,
 *   counts: Object,
 *   pipelineStats: Object,
 *   loading: boolean,
 *   onSelectLead: Function,
 *   onNewLead: Function,
 * }} props
 */
function PipelineBoard({ leadsByStage, counts, pipelineStats, loading, onSelectLead, onNewLead }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="size-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pipeline de Pre-Proyecto</h2>
          <p className="text-sm text-gray-500">Gestión de leads y oportunidades antes del inicio formal del proyecto</p>
        </div>
        <Button variant="primary" size="sm" onClick={onNewLead} className="gap-1.5">
          <PlusIcon className="size-4" />
          Nuevo Lead
        </Button>
      </div>

      {/* Stats */}
      <PipelineStats stats={pipelineStats} />

      {/* Board by Phases */}
      {PHASES.map((phase) => (
        <div key={phase.label} className="space-y-2">
          <div className={clsx('flex items-center gap-2 rounded-md px-3 py-1.5', phase.bg, phase.border, 'border')}>
            <span className={clsx('text-xs font-bold uppercase tracking-wider', phase.color)}>{phase.label}</span>
          </div>
          <div className={clsx(
            'grid gap-3',
            phase.stages.length === 1 ? 'grid-cols-1' :
            phase.stages.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
            'grid-cols-1 sm:grid-cols-3'
          )}>
            {phase.stages.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                leads={leadsByStage[stage] || []}
                onSelectLead={onSelectLead}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(PipelineBoard);
