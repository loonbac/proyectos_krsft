import { memo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * RejectModal – Custom modal to reject a material or service instead of native prompt()
 */
function RejectModal({
    open,
    onClose,
    title = 'Rechazar item',
    notes,
    onNotesChange,
    processing,
    onConfirm,
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="md"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={onConfirm} disabled={processing} loading={processing}>
                        {processing ? 'Rechazando...' : 'Rechazar'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    ¿Por qué se rechaza este material/servicio? (opcional)
                </p>
                <textarea
                    autoFocus
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    className="w-full resize-none rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    rows={3}
                    placeholder="Escriba aquí sus observaciones..."
                    disabled={processing}
                />
            </div>
        </Modal>
    );
}

export default memo(RejectModal);
