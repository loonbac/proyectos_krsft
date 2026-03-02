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
        <Button variant="primary" size="md" onClick={onBack} className="gap-2">
          <ArrowLeftIcon className="size-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FolderIcon className="size-8 text-primary" />
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
