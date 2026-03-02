import { memo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * ConfirmModal – Generic confirmation dialog.
 */
function ConfirmModal({
  open,
  onClose,
  title,
  message,
  actionLabel,
  actionVariant,
  processing,
  onConfirm,
}) {
  const resolvedVariant = actionVariant === 'danger' ? 'danger' : actionVariant === 'success' ? 'primary' : 'primary';
  const cancelVariant = actionVariant === 'success' ? 'danger' : 'secondary';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant={cancelVariant} onClick={onClose}>Cancelar</Button>
          <Button variant={resolvedVariant} onClick={onConfirm} disabled={processing} loading={processing}>
            {processing ? 'Procesando...' : actionLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-700">{message}</p>
    </Modal>
  );
}

export default memo(ConfirmModal);
