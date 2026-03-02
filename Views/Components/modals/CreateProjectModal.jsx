import { memo } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { getCurrencySymbol } from '../../utils';

/**
 * CreateProjectModal – New project creation form.
 */
function CreateProjectModal({
  open,
  onClose,
  form,
  onFormChange,
  supervisors,
  saving,
  errorMessage,
  onCreate,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo Proyecto"
      titleIcon={<PlusIcon className="size-5 text-primary" />}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onCreate} disabled={saving} loading={saving}>
            {saving ? 'Creando...' : 'Crear Proyecto'}
          </Button>
        </>
      }
    >
      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
      )}
      <div className="space-y-4">
        <Input label="Nombre del Proyecto" required value={form.name} onChange={e => onFormChange({ ...form, name: e.target.value })} placeholder="Nombre del proyecto" />
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Moneda</span>
          <div className="flex gap-2">
            {['PEN', 'USD'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => onFormChange({ ...form, currency: c })}
                className={`flex-1 rounded border px-3 py-2 text-sm font-medium transition-colors ${
                  form.currency === c
                    ? 'border-primary bg-primary-50 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {c === 'PEN' ? 'S/ Soles' : '$ Dólares'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={`Monto (${getCurrencySymbol(form.currency)})`} required type="number" min="0" step="0.01" placeholder="0" value={form.amount === 0 ? '' : form.amount} onChange={e => onFormChange({ ...form, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })} />
          <Input label="Umbral Alerta (%)" type="number" min="1" max="100" value={form.threshold} onChange={e => onFormChange({ ...form, threshold: parseInt(e.target.value) || 75 })} />
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">IGV</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.igv_enabled} onChange={e => onFormChange({ ...form, igv_enabled: e.target.checked })} className="rounded border-gray-300" />
              Incluir IGV
            </label>
            {form.igv_enabled && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-gray-500">Tasa:</span>
                <input type="number" min="0" max="100" value={form.igv_rate} onChange={e => onFormChange({ ...form, igv_rate: parseInt(e.target.value) || 18 })} className="w-16 rounded border border-gray-300 px-2 py-1 text-sm shadow-sm" />
                <span className="text-gray-500">%</span>
              </div>
            )}
          </div>
        </div>
        <Select
          label="Supervisor"
          required
          value={form.supervisor_id}
          onChange={e => onFormChange({ ...form, supervisor_id: e.target.value })}
          options={supervisors.map(s => ({ value: s.id, label: `${s.name} — ${s.cargo}` }))}
          placeholder="Seleccionar supervisor..."
        />
      </div>
    </Modal>
  );
}

export default memo(CreateProjectModal);
