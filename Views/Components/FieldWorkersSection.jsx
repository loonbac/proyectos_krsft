import { memo } from 'react';
import { WrenchScrewdriverIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

function FieldWorkersSection({
  projectFieldWorkers,
  availableFieldWorkersFiltered,
  selectedFieldWorkerId,
  onWorkerChange,
  onAdd,
  onRemove,
}) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className="inline-flex items-center justify-center rounded-full bg-amber-50 p-1.5">
            <WrenchScrewdriverIcon className="size-4 text-amber-600" />
          </span>
          Trabajadores de Campo
        </h3>
        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-700">
          <p className="text-xs font-medium whitespace-nowrap">{projectFieldWorkers.length}</p>
        </span>
      </div>

      {/* Agregar trabajador */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 bg-gray-50/40">
        <select
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          value={selectedFieldWorkerId}
          onChange={e => onWorkerChange(e.target.value)}
        >
          <option value="">Seleccionar trabajador...</option>
          {availableFieldWorkersFiltered.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <Button variant="primary" size="sm" onClick={onAdd} disabled={!selectedFieldWorkerId} className="gap-1.5 shrink-0">
          <PlusIcon className="size-4" />
          Agregar
        </Button>
      </div>

      {projectFieldWorkers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">#</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nombre</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cargo</th>
                <th className="px-5 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projectFieldWorkers.map((w, i) => (
                <tr key={w.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="whitespace-nowrap px-5 py-2.5 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-5 py-2.5 text-sm font-medium text-gray-800 max-w-[260px] break-words">{w.name}</td>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    {w.cargo
                      ? <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{w.cargo}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-center">
                    <button
                      onClick={() => onRemove(w.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                      title="Eliminar"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <span className="inline-flex items-center justify-center rounded-full bg-gray-100 p-3">
            <WrenchScrewdriverIcon className="size-6 text-gray-400" />
          </span>
          <p className="mt-3 text-sm text-gray-400">Sin trabajadores de campo asignados</p>
          <p className="text-xs text-gray-300 mt-1">Agrega trabajadores con el selector</p>
        </div>
      )}
    </section>
  );
}

export default memo(FieldWorkersSection);
