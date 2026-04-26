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
 */
function ArrivalReportsSection({ arrivalReports, purchasedNotArrivedOrders, onOpenCreate, onOpenDetail }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 bg-gray-50/50">
        <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-900">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardDocumentListIcon className="size-[15.54px] text-primary" />
          </span>
          Reportes de Llegada de Materiales
        </h3>
        {purchasedNotArrivedOrders.length > 0 && (
          <Button variant="primary" size="sm" onClick={onOpenCreate} className="gap-1.5 h-8 text-[11px] px-4 rounded-lg">
            <PlusIcon className="size-3.5" />
            Reportar Faltantes
          </Button>
        )}
      </div>

      {arrivalReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-50">
            <ClipboardDocumentListIcon className="size-6 text-gray-300" />
          </span>
          <p className="mt-3 text-sm text-gray-400">No hay reportes de llegada</p>
        </div>
      ) : (
        <div className="overflow-x-auto px-5 py-4">
          <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
            <thead className="ltr:text-left rtl:text-right">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 font-medium text-gray-900">ID</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium text-gray-900">Fecha</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium text-gray-900">Notas</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium text-gray-900 text-center">Items</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium text-gray-900 text-center">Estado</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium text-gray-900 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {arrivalReports.map(report => {
                const st = STATUS_BADGE[report.status] || STATUS_BADGE.pendiente;
                return (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500 font-mono text-xs">#{report.id}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-700">
                      {new Date(report.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-gray-700 max-w-xs truncate">{report.notas_supervisor || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-center font-medium text-gray-900">{report.items_count ?? report.items?.length ?? '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-center">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(report)}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700"
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
