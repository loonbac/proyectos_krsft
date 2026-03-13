import { memo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * ImportPreviewModal – Preview of imported materials before confirming.
 */
function ImportPreviewModal({
  open,
  onClose,
  items,
  importing,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vista Previa de Importación"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onConfirm} disabled={importing} loading={importing}>
            {importing ? 'Importando...' : 'Confirmar Importación'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-gray-500">{items.length} materiales encontrados:</p>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{it.number}</span>
              <span className="text-sm font-medium text-gray-900">{it.material_type || 'Sin tipo'}</span>
            </div>
            {it.description && <p className="mt-0.5 ml-8 text-xs text-gray-500">{it.description}</p>}
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 ml-8">
              <span>Cant: {it.quantity}</span>
              {it.diameter && <span>Medida: {it.diameter}</span>}
              {it.series && <span>Conexión: {it.series}</span>}
              {it.notes && <span>Obs: {it.notes}</span>}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default memo(ImportPreviewModal);
