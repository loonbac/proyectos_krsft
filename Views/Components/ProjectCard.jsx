import { memo } from 'react';
import Badge from './ui/Badge';
import {
  formatNumber, formatDate, getCurrencySymbol, getProjectColor,
  getStatusLabel, getStatusText, getStatusBadgeVariant,
  getProjectStateClass, getProjectStateLabel,
} from '../utils';

/**
 * ProjectCard – Single project card in the grid view.
 */
function ProjectCard({ project, onSelect }) {
  const sl = getStatusLabel(project);
  const spentAmount = project.spent ?? project.spent_amount ?? 0;
  const budgetedAmount = project.budgeted ?? project.budgeted_amount ?? 0;
  const availableAmount = project.available_amount ?? project.remaining ?? 0;
  const projectColor = getProjectColor(project.id);
  const stateClass = getProjectStateClass(project);
  const isPendingRecount = stateClass === 'pending-recount';
  const isCompleted = stateClass === 'completed';
  const stateVariant = isPendingRecount ? 'amber' : isCompleted ? 'blue' : 'emerald';
  const baseAvailable = parseFloat(project.available_amount || 0);
  const usage = Math.min(
    100,
    baseAvailable > 0
      ? (parseFloat(budgetedAmount || 0) / baseAvailable) * 100
      : (parseFloat(project.usage_percent) || 0),
  );

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: projectColor, borderWidth: '2.2px', borderStyle: 'solid' }}
      onClick={() => onSelect(project)}
    >
      {/* Card body */}
      <div className="p-5">
        {/* ── Row 1: Project name + health badge ── */}
        <div className="flex items-start justify-between gap-4">
          <span
            className="inline-flex max-w-[72%] items-center rounded-full px-3 py-1 text-sm font-bold leading-tight text-white"
            style={{ backgroundColor: projectColor }}
            title={project.name}
          >
            <span className="truncate">{project.name}</span>
          </span>
          <Badge variant={getStatusBadgeVariant(sl)} className="shrink-0 mt-0.5">{getStatusText(sl)}</Badge>
        </div>

        {/* ── Row 2: State badge ── */}
        <div className="mt-2">
          <Badge variant={stateVariant} dot className="text-xs">
            {getProjectStateLabel(project)}
          </Badge>
        </div>

        {/* ── Row 3: Date + currency chip ── */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <span>{formatDate(project.created_at)}</span>
          <span>·</span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ color: projectColor, background: `${projectColor}18` }}
          >
            {project.currency}
          </span>
        </div>

        {/* ── Divider ── */}
        <div className="mt-1 mb-1 border-t border-gray-100" />

        {/* ── Financial metrics ── */}
        <dl className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <dt className="text-xs text-gray-500">Presupuesto</dt>
            <dd className="text-sm font-semibold text-gray-900">{getCurrencySymbol(project.currency)} {formatNumber(project.total_amount)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-xs text-gray-500">Gastado</dt>
            <dd className="text-sm font-semibold text-amber-600">{getCurrencySymbol(project.currency)} {formatNumber(spentAmount)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-xs text-gray-500">Presupuestado</dt>
            <dd className="text-sm font-semibold text-blue-600">{getCurrencySymbol(project.currency)} {formatNumber(budgetedAmount)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-xs text-gray-500">Disponible</dt>
            <dd className="text-sm font-semibold text-emerald-600">{getCurrencySymbol(project.currency)} {formatNumber(availableAmount)}</dd>
          </div>
        </dl>

        {/* ── Progress bar ── */}
        <div className="mt-2">
          <div className="h-2 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usage >= 90 ? 'bg-red-500' : usage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              style={{ width: `${usage}%`, minWidth: usage > 0 ? '8px' : '0px' }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">Uso del presupuesto</span>
            <span className={`text-[10px] font-semibold ${usage >= 90 ? 'text-red-500' : usage >= 75 ? 'text-amber-500' : 'text-emerald-600'
              }`}>{usage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(ProjectCard);

