import { memo } from 'react';
import {
  ArrowLeftIcon,
  CalendarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import {
  getCurrencySymbol, getProjectColor, getProjectDaysAlive,
} from '../utils';

/**
 * DetailHeader – Header bar for the project detail view.
 */
function DetailHeader({ project, onBack, onOpenConfig }) {
  const currencyColor = project.currency === 'USD' ? 'bg-red-500' : 'bg-indigo-500';

  return (
    <header className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">

        {/* LEFT: back + name + meta */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm" onClick={onBack} className="gap-1.5 shrink-0">
            <ArrowLeftIcon className="size-4" />
            Volver
          </Button>

          <div className="hidden h-6 w-px bg-gray-200 sm:block" />

          {/* Project name as colored badge */}
          <span
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-bold text-white"
            style={{ background: getProjectColor(project.id) }}
          >
            {project.name}
          </span>

          <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white ${currencyColor}`}>
            {getCurrencySymbol(project.currency)} {project.currency}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
            <CalendarIcon className="size-3.5" />
            {getProjectDaysAlive(project)} días
          </span>
        </div>

        {/* RIGHT: config button */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            title="Configuración del proyecto"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <Cog6ToothIcon className="size-4" />
            Configurar
          </button>
        )}
      </div>
    </header>
  );
}

export default memo(DetailHeader);
