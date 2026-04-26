import { memo } from 'react';
import { UserGroupIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

function WorkersSection({
  projectWorkers,
  availableWorkersFiltered,
  selectedWorkerId,
  onWorkerChange,
  onAdd,
  onRemove,
  readOnly = false
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 bg-gray-50/50 rounded-t-xl">
        <h3 className="flex items-center gap-2 text-[11.11px] font-bold uppercase tracking-wider text-gray-900">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <UserGroupIcon className="size-[14.2px] text-primary" />
          </span>
          Trabajadores Administrativos
        </h3>
        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary whitespace-nowrap min-w-[20px]">
          {projectWorkers.length}
        </span>
      </div>

      {/* Agregar trabajador — encima de la tabla */}
      {!readOnly && (
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/40 px-6 py-3.5">
          <select
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 h-10 text-[12px] shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary hover:border-gray-400"
            value={selectedWorkerId}
            onChange={e => onWorkerChange(e.target.value)}
          >
            <option value="">Seleccionar trabajador...</option>
            {(availableWorkersFiltered || []).map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            onClick={onAdd}
            disabled={!selectedWorkerId}
            className="gap-2 shrink-0 h-10 text-[11px] px-6 rounded-lg font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusIcon className="size-4" />
            Agregar
          </Button>
        </div>
      )}

      {/* Tabla de trabajadores */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/60">
              <th className="w-12 px-5 py-2 text-left text-[10.9px] font-bold uppercase tracking-wider text-gray-500">#</th>
              <th className="px-5 py-2 text-left text-[10.9px] font-bold uppercase tracking-wider text-gray-500">Nombre</th>
              <th className="w-40 px-5 py-2 text-left text-[10.9px] font-bold uppercase tracking-wider text-gray-500">Cargo</th>
              {!readOnly && <th className="w-20 px-5 py-2 text-center text-[10.9px] font-bold uppercase tracking-wider text-gray-500">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projectWorkers.length > 0 && projectWorkers.map((w, i) => (
              <tr key={w.id} className="transition-colors hover:bg-gray-50/50">
                <td className="whitespace-nowrap px-5 py-2 text-[9.68px] text-gray-400 font-mono">{i + 1}</td>
                <td className="px-5 py-2 text-[11.29px] font-medium text-gray-800 truncate" title={w.name}>{w.name}</td>
                <td className="whitespace-nowrap px-5 py-2">
                  {w.cargo
                    ? <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[9.68px] font-medium text-blue-700">{w.cargo}</span>
                    : <span className="text-[9.68px] text-gray-300">—</span>
                  }
                </td>
                {!readOnly && (
                  <td className="whitespace-nowrap px-5 py-2 text-center">
                    <button
                      onClick={() => onRemove(w.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                      title="Eliminar"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default memo(WorkersSection);
