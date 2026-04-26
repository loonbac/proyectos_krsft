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
    <Modal open={open} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center py-6">
        <div className={`mx-auto mb-6 flex size-16 items-center justify-center rounded-full ${cfg.iconBg} relative`}>
          <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${cfg.iconBg}`} />
          <div className={`flex size-12 items-center justify-center rounded-full border-2 border-white shadow-sm bg-white`}>
            <Icon className={`size-8 ${cfg.iconColor}`} />
          </div>
        </div>

        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{title}</h2>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed px-2">
          {message}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button 
            variant={cfg.cancelBtn} 
            onClick={onClose} 
            disabled={processing} 
            className="h-11 text-sm font-bold shadow-sm active:scale-95 transition-all"
          >
            Cancelar
          </Button>
          <Button 
            variant={cfg.btn === 'primary' ? 'success' : cfg.btn} 
            onClick={onConfirm} 
            disabled={processing} 
            loading={processing} 
            className="h-11 text-sm font-bold shadow-sm active:scale-95 transition-all"
          >
            {processing ? 'Procesando...' : actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default memo(ConfirmModal);
