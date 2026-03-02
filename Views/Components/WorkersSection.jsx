import { memo } from 'react';
import { UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

/**
 * WorkersSection – Workers list + add worker (detail view, supervisor only).
 */
function WorkersSection({
  projectWorkers,
  availableWorkersFiltered,
  selectedWorkerId,
  onWorkerChange,
  onAdd,
  onRemove,
}) {
  return (
    <section className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
        <UserGroupIcon className="size-5 text-primary" />
        Trabajadores
      </h3>
      <div className="flex gap-2 mb-4">
        <select
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm shadow-sm"
          value={selectedWorkerId}
          onChange={e => onWorkerChange(e.target.value)}
        >
          <option value="">Seleccionar trabajador...</option>
          {availableWorkersFiltered.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <Button variant="primary" size="sm" onClick={onAdd} disabled={!selectedWorkerId}>Agregar</Button>
      </div>
      {projectWorkers.length > 0 ? (
        <ul className="divide-y divide-gray-100">
          {projectWorkers.map(w => (
            <li key={w.id} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">{w.name}</span>
              <button onClick={() => onRemove(w.id)} className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600">
                <XMarkIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Sin trabajadores asignados</p>
      )}
    </section>
  );
}

export default memo(WorkersSection);
