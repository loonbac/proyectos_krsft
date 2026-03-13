import { memo } from 'react';
import { ClipboardDocumentListIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';

const STATUS_BADGE = {
  pendiente:  { variant: 'amber',   label: 'Pendiente' },
  respondido: { variant: 'blue',    label: 'Respondido' },
  resuelto:   { variant: 'emerald', label: 'Resuelto' },
};

/**
 * ArrivalReportsSection – Lists material-arrival reports for the selected project.
 * @param {{ arrivalReports: Array, purchasedNotArrivedOrders: Array, onOpenCreate: () => void, onOpenDetail: (report) => void }} props
 */
function ArrivalReportsSection({ arrivalReports, purchasedNotArrivedOrders, onOpenCreate, onOpenDetail }) {
  return (
    <section className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ClipboardDocumentListIcon className="size-5 text-primary" />
          Reportes de Llegada de Materiales
        </h3>
        {purchasedNotArrivedOrders.length > 0 && (
          <Button variant="primary" size="sm" onClick={onOpenCreate}>
            <PlusIcon className="size-4 -ml-0.5" />
            Reportar Faltantes
          </Button>
        )}
      </div>

      {arrivalReports.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No hay reportes de llegada</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Notas</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Items</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Estado</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {arrivalReports.map(report => {
                const st = STATUS_BADGE[report.status] || STATUS_BADGE.pendiente;
                return (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 text-gray-700">#{report.id}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {new Date(report.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{report.notas_supervisor || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-700">{report.items_count ?? report.items?.length ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(report)}
                        className="inline-flex items-center justify-center rounded-lg bg-purple-600 p-1.5 text-white hover:bg-purple-700 transition-colors"
                        title="Ver detalle"
                      >
                        <EyeIcon className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default memo(ArrivalReportsSection);
