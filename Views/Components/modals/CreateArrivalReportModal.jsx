import { memo, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatNumber, getCurrencySymbol, getOrderQuantity } from '../../utils';

/**
 * CreateArrivalReportModal – Supervisor selects non-arrived paid orders to report as missing.
 * @param {{ open: boolean, onClose: () => void, purchasedNotArrivedOrders: Array, currency: string, onSubmit: (orderIds: number[], notas: string) => Promise<void> }} props
 */
function CreateArrivalReportModal({ open, onClose, purchasedNotArrivedOrders, currency, onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [notas, setNotas] = useState('');
  const [processing, setProcessing] = useState(false);

  const toggleOrder = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === purchasedNotArrivedOrders.length) {
      setSelected([]);
    } else {
      setSelected(purchasedNotArrivedOrders.map(o => o.id));
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setProcessing(true);
    try {
      await onSubmit(selected, notas);
      setSelected([]);
      setNotas('');
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setSelected([]);
      setNotas('');
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} size="lg" title="Reportar Materiales Faltantes" titleIcon={ExclamationTriangleIcon}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Selecciona los materiales que figuran como comprados pero que aún no te han llegado.
          Este reporte será enviado al área de Inventario.
        </p>

        {purchasedNotArrivedOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No hay materiales pendientes de llegada</p>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-lg border border-gray-200">
            <table className="w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selected.length === purchasedNotArrivedOrders.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Material</th>
                  <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Cantidad</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchasedNotArrivedOrders.map(order => (
                  <tr
                    key={order.id}
                    className={`cursor-pointer transition-colors ${selected.includes(order.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => toggleOrder(order.id)}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.includes(order.id)}
                        onChange={() => {}}
                        className="rounded border-gray-300 pointer-events-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-700">{order.description || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-700">{getOrderQuantity(order)}</td>
                    <td className="px-3 py-2 text-gray-700">{order.material_type || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {order.amount != null ? `${getCurrencySymbol(currency)} ${formatNumber(order.amount)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales (opcional)</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Describe la situación o agrega contexto..."
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm"
          />
        </div>
      </div>

      <footer className="mt-6 flex gap-3 justify-end">
        <Button variant="secondary" onClick={handleClose} disabled={processing}>Cancelar</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={selected.length === 0 || processing} loading={processing}>
          {processing ? 'Enviando...' : `Enviar Reporte (${selected.length})`}
        </Button>
      </footer>
    </Modal>
  );
}

export default memo(CreateArrivalReportModal);
