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
  const currencyColor = project.currency === 'USD' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <header className="border-b border-gray-100 pb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Contenedor Izquierdo: Botón Volver + Datos */}
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="md" onClick={onBack} className="gap-2">
            <ArrowLeftIcon className="size-4" />
            Volver
          </Button>

          {/* Separador vertical opcional */}
          <div className="hidden h-8 w-[1px] bg-gray-200 md:block" />

          {/* Nombre del Proyecto */}
          <span className="inline-block rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: getProjectColor(project.id) }}>
            {project.name}
          </span>

          {/* Moneda */}
          <span className={`inline-block rounded-full px-4 py-2 text-sm font-semibold text-white ${currencyColor}`}>
            {getCurrencySymbol(project.currency)} {project.currency}
          </span>

          {/* Edad */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            <CalendarIcon className="size-4" />
            {getProjectDaysAlive(project)} días
          </span>
        </div>

        {/* Lado Derecho: Botón de configuración */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            title="Configuración del proyecto"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
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
