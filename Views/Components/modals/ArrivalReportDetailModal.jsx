import { memo, useState } from 'react';
import { DocumentMagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { getOrderQuantity } from '../../utils';

const STATUS_BADGE = {
  pendiente:  { variant: 'amber',   label: 'Pendiente' },
  respondido: { variant: 'blue',    label: 'Respondido' },
  resuelto:   { variant: 'emerald', label: 'Resuelto' },
};

/**
 * ArrivalReportDetailModal – View arrival report detail, see Inventario response, resolve.
 * @param {{ open: boolean, onClose: () => void, report: object|null, onResolve: (reportId: number) => Promise<void> }} props
 */
function ArrivalReportDetailModal({ open, onClose, report, onResolve }) {
  const [processing, setProcessing] = useState(false);

  if (!report) return null;

  const st = STATUS_BADGE[report.status] || STATUS_BADGE.pendiente;
  const items = report.items || [];

  const handleResolve = async () => {
    setProcessing(true);
    try {
      await onResolve(report.id);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Reporte #${report.id}`} titleIcon={DocumentMagnifyingGlassIcon}>
      <div className="space-y-5">
        {/* Header info */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={st.variant}>{st.label}</Badge>
          <span className="text-gray-500">
            Creado: {new Date(report.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {report.reported_by_name && (
            <span className="text-gray-500">por <span className="font-medium text-gray-700">{report.reported_by_name}</span></span>
          )}
        </div>

        {/* Supervisor notes */}
        {report.notas_supervisor && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase text-gray-500 mb-1">Notas del supervisor</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.notas_supervisor}</p>
          </div>
        )}

        {/* Items table */}
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 mb-2">Materiales reportados ({items.length})</p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Material</th>
                  <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Cantidad</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Unidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">{item.description || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-700">{item.quantity ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{item.material_type || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{item.unit || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventario response */}
        {report.status === 'respondido' || report.status === 'resuelto' ? (
          <div className={`rounded-lg p-4 ${report.status === 'resuelto' ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'}`}>
            <p className="text-xs font-medium uppercase text-gray-500 mb-1">
              Respuesta de Inventario
              {report.respondido_por_name && (
                <span className="normal-case ml-1">— {report.respondido_por_name}</span>
              )}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.respuesta || '—'}</p>
            {report.respondido_at && (
              <p className="text-xs text-gray-400 mt-2">
                {new Date(report.respondido_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
            <p className="text-sm text-amber-700">Esperando respuesta de Inventario...</p>
          </div>
        )}
      </div>

      <footer className="mt-6 flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        {report.status === 'respondido' && (
          <Button variant="success" onClick={handleResolve} disabled={processing} loading={processing}>
            <CheckCircleIcon className="size-4 -ml-0.5" />
            {processing ? 'Resolviendo...' : 'Marcar como Resuelto'}
          </Button>
        )}
      </footer>
    </Modal>
  );
}

export default memo(ArrivalReportDetailModal);
