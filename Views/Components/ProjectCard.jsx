import { memo } from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import {
  formatNumber, formatDate, getCurrencySymbol, getProjectColor,
  getStatusLabel, getStatusText, getStatusBadgeVariant,
  getProjectStateClass,
} from '../utils';

/**
 * ProjectCard – Single project card in the grid view.
 */
function ProjectCard({ project, onSelect }) {
  const sl = getStatusLabel(project);
  const usage = Math.min(100, parseFloat(project.usage_percent) || 0);
  const isCompleted = getProjectStateClass(project) === 'completed';
  const spentAmount = project.spent ?? project.spent_amount ?? 0;
  const availableAmount = project.remaining ?? project.available_amount ?? 0;
  const projectColor = getProjectColor(project.id);

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-shadow hover:shadow-md"
      style={{ borderColor: projectColor }}
      onClick={() => onSelect(project)}
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`flex-shrink-0 inline-flex size-8 items-center justify-center rounded-full text-white ${isCompleted ? 'bg-blue-500' : 'bg-primary'}`}>
              {isCompleted ? <CheckCircleIcon className="size-5" /> : <ClockIcon className="size-5" />}
            </span>
            <h3 className="font-semibold text-gray-900 line-clamp-2">{project.name}</h3>
          </div>
          <Badge variant={getStatusBadgeVariant(sl)}>{getStatusText(sl)}</Badge>
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
              className={`h-full rounded-full transition-all ${
                usage >= 90 ? 'bg-red-500' : usage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
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
