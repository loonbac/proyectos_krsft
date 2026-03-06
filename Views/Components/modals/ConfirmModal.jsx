import { memo } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const VARIANT_CONFIG = {
  danger:  { icon: ExclamationTriangleIcon,  iconBg: 'bg-red-100',   iconColor: 'text-red-600',   btn: 'danger',  cancelBtn: 'secondary' },
  success: { icon: CheckCircleIcon,          iconBg: 'bg-green-100', iconColor: 'text-green-600', btn: 'primary', cancelBtn: 'danger' },
  default: { icon: QuestionMarkCircleIcon,   iconBg: 'bg-blue-100',  iconColor: 'text-blue-600',  btn: 'primary', cancelBtn: 'secondary' },
};

/**
 * ConfirmModal – Generic confirmation dialog (HyperUI style).
 */
function ConfirmModal({
  open,
  onClose,
  title,
  message,
  actionLabel = 'Confirmar',
  actionVariant = 'danger',
  processing = false,
  onConfirm,
}) {
  const cfg = VARIANT_CONFIG[actionVariant] || VARIANT_CONFIG.default;
  const Icon = cfg.icon;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center py-4">
        <div className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${cfg.iconBg}`}>
          <Icon className={`size-7 ${cfg.iconColor}`} />
        </div>

        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-pretty text-gray-500 leading-relaxed">{message}</p>

        <footer className="mt-6 flex gap-3">
          <Button variant={cfg.cancelBtn} onClick={onClose} disabled={processing} className="flex-1">
            Cancelar
          </Button>
          <Button variant={cfg.btn} onClick={onConfirm} disabled={processing} loading={processing} className="flex-1">
            {processing ? 'Procesando...' : actionLabel}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

export default memo(ConfirmModal);
