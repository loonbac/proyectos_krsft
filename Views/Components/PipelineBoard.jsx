/**
 * PipelineBoard — Vista Kanban del pipeline de pre-proyecto.
 * Muestra proyectos agrupados por etapa con estadísticas y acciones rápidas.
 */
import { memo, useMemo, useState } from 'react';
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
  ChevronDownIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import StatsCard from './ui/StatsCard';
import { formatNumber, formatDate, getCurrencySymbol } from '../utils';

// ── Configuración visual por etapa ──────────────────────────────────────

const STAGE_CONFIG = {
  ingresado:      { color: 'bg-slate-500',   accentColor: '#64748b', lightBg: 'bg-slate-50',   borderColor: '#cbd5e1', badge: 'gray',    icon: PlusIcon },
  contactado:     { color: 'bg-blue-500',    accentColor: '#3b82f6', lightBg: 'bg-blue-50',    borderColor: '#bfdbfe', badge: 'blue',    icon: PhoneIcon },
  visitado:       { color: 'bg-indigo-500',  accentColor: '#6366f1', lightBg: 'bg-indigo-50',  borderColor: '#c7d2fe', badge: 'blue',    icon: MapPinIcon },
  presupuestado:  { color: 'bg-amber-500',   accentColor: '#f59e0b', lightBg: 'bg-amber-50',   borderColor: '#fde68a', badge: 'amber',   icon: CurrencyDollarIcon },
  negociacion:    { color: 'bg-cyan-500',    accentColor: '#06b6d4', lightBg: 'bg-cyan-50',    borderColor: '#a5f3fc', badge: 'cyan',    icon: ChatBubbleLeftRightIcon },
  cerrado_ganado: { color: 'bg-emerald-500', accentColor: '#10b981', lightBg: 'bg-emerald-50', borderColor: '#a7f3d0', badge: 'emerald', icon: CheckCircleIcon },
  cerrado_perdido:{ color: 'bg-red-500',     accentColor: '#ef4444', lightBg: 'bg-red-50',     borderColor: '#fecaca', badge: 'red',     icon: XCircleIcon },
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
  { label: 'Fase Inicial', stages: ['ingresado', 'contactado', 'visitado'], color: 'text-blue-700', bg: 'bg-blue-50', borderColor: '#bfdbfe' },
  { label: 'Propuesta', stages: ['presupuestado'], color: 'text-amber-700', bg: 'bg-amber-50', borderColor: '#fde68a' },
  { label: 'Negociación', stages: ['negociacion'], color: 'text-cyan-700', bg: 'bg-cyan-50', borderColor: '#a5f3fc' },
  { label: 'Resultado', stages: ['cerrado_ganado', 'cerrado_perdido'], color: 'text-gray-700', bg: 'bg-gray-50', borderColor: '#e5e7eb' },
];

// ── Proyecto Card ───────────────────────────────────────────────────────

function LeadCard({ lead, onSelect }) {
  const config = STAGE_CONFIG[lead.etapa] || STAGE_CONFIG.ingresado;

  return (
    <div
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ borderLeftColor: config.accentColor, borderLeftWidth: '4px' }}
      onClick={() => onSelect(lead)}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{lead.nombre_proyecto}</h4>
        <ChevronRightIcon className="size-4 shrink-0 text-gray-400 mt-0.5" />
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <BuildingOfficeIcon className="size-3.5 shrink-0 text-gray-400" />
        <span className="text-xs font-medium text-gray-700 truncate">{lead.cliente_nombre}</span>
      </div>

      {lead.cliente_empresa && (
        <p className="mt-0.5 text-[11px] text-gray-400 truncate">{lead.cliente_empresa}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        {lead.presupuesto_estimado > 0 ? (
          <span className="font-mono text-xs font-bold text-gray-800">
            {getCurrencySymbol(lead.moneda)} {formatNumber(lead.presupuesto_estimado)}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">Sin presupuesto</span>
        )}

        {lead.team && lead.team.length > 0 && (
          <div className="flex items-center gap-1">
            <UserGroupIcon className="size-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-500">{lead.team.length}</span>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-gray-400">{formatDate(lead.created_at)}</p>
    </div>
  );
}

// ── Stage Column ────────────────────────────────────────────────────────

function StageColumn({ stage, leads, onSelectLead }) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.ingresado;
  const Icon = config.icon;
  const [search, setSearch] = useState('');
  const isBudgetedStage = stage === 'presupuestado';
  const visibleLeads = useMemo(() => {
    if (!isBudgetedStage) return leads;

    const term = search.trim().toLowerCase();
    if (!term) return leads;

    return leads.filter((lead) => {
      const haystack = [
        lead.nombre_proyecto,
        lead.cliente_nombre,
        lead.cliente_empresa,
        lead.moneda,
        lead.presupuesto_estimado,
        formatNumber(lead.presupuesto_estimado || 0),
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [isBudgetedStage, leads, search]);

  return (
    <div className={clsx('flex flex-col rounded-lg border', config.lightBg)} style={{ borderColor: config.borderColor }}>
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={clsx('inline-flex size-6 items-center justify-center rounded-full text-white', config.color)}>
            <Icon className="size-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
            {STAGE_LABELS[stage]}
          </span>
        </div>
        <Badge variant={config.badge} className="text-[10px]">{visibleLeads.length}</Badge>
      </div>
      {isBudgetedStage && (
        <div className="border-b border-amber-100 px-3 py-2.5">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar presupuestados..."
              className="w-full rounded border border-amber-200 bg-white py-2 pl-9 pr-10 text-sm shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                aria-label="Limpiar búsqueda"
              >
                <XMarkIcon className="size-4" />
              </button>
            )}
          </label>
          {search.trim() && (
            <p className="mt-1 text-[11px] text-amber-700">
              {visibleLeads.length} de {leads.length} presupuestado{leads.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
      <div className="flex-1 space-y-3 p-3 overflow-y-auto max-h-[50vh]">
        {visibleLeads.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">
            {search.trim() ? 'Sin resultados' : 'Sin proyectos'}
          </p>
        ) : (
          visibleLeads.map((lead) => (
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
        title="Proyectos Activos"
        value={stats.active_leads ?? 0}
        icon={<UserGroupIcon className="size-8" />}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
      />
      <StatsCard
        title="Total Proyectos"
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
  // All phases collapsed by default
  const [collapsed, setCollapsed] = useState(
    Object.fromEntries(PHASES.map((p) => [p.label, true])),
  );

  const togglePhase = (label) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="size-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando proyectos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pipeline de Pre-Proyecto</h2>
          <p className="text-sm text-gray-500">Gestión de proyectos en evaluación antes del inicio formal</p>
        </div>
        <Button variant="primary" size="md" onClick={onNewLead} className="gap-2 text-sm">
          <PlusIcon className="size-5" />
          INICIAR PROYECTO
        </Button>
      </div>

      {/* Stats */}
      <PipelineStats stats={pipelineStats} />

      {/* Board by Phases */}
      {PHASES.map((phase) => {
        const isCollapsed = !!collapsed[phase.label];
        const totalLeads = phase.stages.reduce(
          (sum, stage) => sum + (leadsByStage[stage]?.length ?? 0),
          0,
        );

        return (
          <div key={phase.label} className="space-y-2">
            {/* Phase header — clickable toggle */}
            <button
              type="button"
              onClick={() => togglePhase(phase.label)}
              className={clsx(
                'flex w-full items-center justify-between rounded-md px-3 py-1.5 border transition-all duration-150',
                phase.bg,
                'hover:brightness-95 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0',
              )}
              style={{ borderColor: phase.borderColor }}
            >
              <div className="flex items-center gap-2">
                <ChevronDownIcon
                  className={clsx(
                    'size-4 transition-transform duration-200',
                    phase.color,
                    isCollapsed ? '-rotate-90' : 'rotate-0',
                  )}
                />
                <span className={clsx('text-xs font-bold uppercase tracking-wider', phase.color)}>
                  {phase.label}
                </span>
              </div>
              {isCollapsed && totalLeads > 0 && (
                <span className={clsx('text-xs font-semibold rounded-full px-2 py-0.5 bg-white/60', phase.color)}>
                  {totalLeads} proyecto{totalLeads !== 1 ? 's' : ''}
                </span>
              )}
            </button>

            {/* Phase content — collapsible */}
            {!isCollapsed && (
              <div
                className={clsx(
                  'grid gap-3',
                  phase.stages.length === 1
                    ? 'grid-cols-1'
                    : phase.stages.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-3',
                )}
              >
                {phase.stages.map((stage) => (
                  <StageColumn
                    key={stage}
                    stage={stage}
                    leads={leadsByStage[stage] || []}
                    onSelectLead={onSelectLead}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PipelineBoard);
