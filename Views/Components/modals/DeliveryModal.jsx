import { memo } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

/**
 * DeliveryModal – Confirm order delivery.
 */
function DeliveryModal({ open, onClose, order, notes, onNotesChange, confirming, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar Entrega"
      titleIcon={<CheckCircleIcon className="size-5 text-primary" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onConfirm} disabled={confirming} loading={confirming}>
            {confirming ? 'Confirmando...' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-700">¿Confirmar la entrega de: <strong>{order?.description}</strong>?</p>
      <Input label="Notas (opcional)" value={notes} onChange={e => onNotesChange(e.target.value)} placeholder="Notas de entrega..." className="mt-4" />
    </Modal>
  );
}

export default memo(DeliveryModal);
