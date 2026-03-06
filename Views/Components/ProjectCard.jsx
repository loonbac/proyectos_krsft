import { memo } from 'react';
import Badge from './ui/Badge';
import {
  formatNumber, formatDate, getCurrencySymbol, getProjectColor,
  getStatusLabel, getStatusText, getStatusBadgeVariant,
  getProjectStateClass, getProjectStateLabel,
} from '../utils';

// Status → border color (matches badge color)
const STATUS_BORDER_COLOR = {
  good: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  critical: '#ef4444', // red-500
};

/**
 * ProjectCard – Single project card in the grid view.
 */
function ProjectCard({ project, onSelect }) {
  const sl = getStatusLabel(project);
  const usage = Math.min(100, parseFloat(project.usage_percent) || 0);
  const spentAmount = project.spent ?? project.spent_amount ?? 0;
  const availableAmount = project.remaining ?? project.available_amount ?? 0;
  const projectColor = getProjectColor(project.id);
  const borderColor = STATUS_BORDER_COLOR[sl] ?? STATUS_BORDER_COLOR.good;
  const stateClass = getProjectStateClass(project);
  const isPendingRecount = stateClass === 'pending-recount';
  const isCompleted = stateClass === 'completed';
  const stateVariant = isPendingRecount ? 'amber' : isCompleted ? 'blue' : 'emerald';

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
      style={{ border: `3px solid ${projectColor}` }}
      onClick={() => onSelect(project)}
    >
      <div className="p-5">
        {/* Header: name pill + status badge */}
        <div className="flex items-center justify-between gap-2">
          {/* Project name as pill */}
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white truncate max-w-[65%]"
            style={{ backgroundColor: projectColor }}
            title={project.name}
          >
            {project.name}
          </span>
          <Badge variant={getStatusBadgeVariant(sl)}>{getStatusText(sl)}</Badge>
        </div>

        <div className="mt-1.5">
          <Badge variant={stateVariant} dot>
            {getProjectStateLabel(project)}
          </Badge>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          {formatDate(project.created_at)} · <Badge variant="amber" className="ml-1">{project.currency}</Badge>
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Presupuesto</span>
            <span className="font-medium text-gray-900">{getCurrencySymbol(project.currency)} {formatNumber(project.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Gastado</span>
            <span className="font-medium text-amber-600">{getCurrencySymbol(project.currency)} {formatNumber(spentAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Disponible</span>
            <span className="font-medium text-emerald-600">{getCurrencySymbol(project.currency)} {formatNumber(availableAmount)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${usage >= 90 ? 'bg-red-500' : usage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              style={{ width: `${usage}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs text-gray-400">{usage.toFixed(1)}% utilizado</p>
        </div>
      </div>
    </article>
  );
}

export default memo(ProjectCard);

