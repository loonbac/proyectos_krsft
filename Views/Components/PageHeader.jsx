import { memo } from 'react';
import { ArrowLeftIcon, FolderIcon, UserIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Badge from './ui/Badge';

/**
 * PageHeader – List-view header for Proyectos module (amber accent).
 */
function PageHeader({ isSupervisor, onBack, onNewProject, children }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <ArrowLeftIcon className="size-4" />
          Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-white">
            <FolderIcon className="size-6" />
          </span>
          {isSupervisor ? 'MIS PROYECTOS ASIGNADOS' : 'GESTIÓN DE PROYECTOS'}
        </h1>
        {isSupervisor && (
          <Badge variant="primary" className="gap-1">
            <UserIcon className="size-3.5" />
            SUPERVISOR
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {!isSupervisor && (
          <Button variant="primary" onClick={onNewProject} className="gap-2">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Nuevo Proyecto
          </Button>
        )}
      </div>
    </header>
  );
}

export default memo(PageHeader);
