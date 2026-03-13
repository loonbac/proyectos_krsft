import { memo } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';

function WorkersSection({ projectWorkers, readOnly = false }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className="inline-flex items-center justify-center rounded-full bg-blue-50 p-1.5">
            <UserGroupIcon className="size-4 text-blue-600" />
          </span>
          Trabajadores Administrativos
        </h3>
        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-blue-700">
          <p className="text-xs font-medium whitespace-nowrap">{projectWorkers.length}</p>
        </span>
      </div>

      {projectWorkers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">#</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nombre</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cargo</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">DNI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projectWorkers.map((w, i) => (
                <tr key={w.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="whitespace-nowrap px-5 py-2.5 text-xs text-gray-400">{i + 1}</td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-sm font-medium text-gray-800">{w.name}</td>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    {w.cargo
                      ? <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">{w.cargo}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-xs text-gray-500 font-mono">{w.dni || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <span className="inline-flex items-center justify-center rounded-full bg-gray-100 p-3">
            <UserGroupIcon className="size-6 text-gray-400" />
          </span>
          <p className="mt-3 text-sm text-gray-400">Sin trabajadores asignados</p>
          <p className="text-xs text-gray-300 mt-1">Se asignan desde el pipeline</p>
        </div>
      )}
    </section>
  );
}

export default memo(WorkersSection);
