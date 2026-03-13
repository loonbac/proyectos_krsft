import { memo } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

/**
 * EditProjectSection – Edit project form (non-supervisor only, detail view).
 */
function EditProjectSection({
  editForm,
  onEditChange,
  supervisors,
  saving,
  onSave,
  onDelete,
}) {
  return (
    <section className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
        <PencilIcon className="size-5 text-primary" />
        Editar Proyecto
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nombre" value={editForm.name} onChange={e => onEditChange({ ...editForm, name: e.target.value })} />
        <Input label="Umbral (%)" type="number" min="1" max="100" value={editForm.spending_threshold} onChange={e => onEditChange({ ...editForm, spending_threshold: parseInt(e.target.value) || 75 })} />
      </div>
      <div className="mt-4">
        <Select
          label="Supervisor"
          value={editForm.supervisor_id || ''}
          onChange={e => onEditChange({ ...editForm, supervisor_id: e.target.value || null })}
          options={supervisors.map(s => ({ value: s.id, label: `${s.name} — ${s.cargo}` }))}
          placeholder="Sin supervisor"
        />
      </div>
      <div className="mt-4">
        <Select
          label="Supervisor PDR"
          value={editForm.supervisor_pdr_id || ''}
          onChange={e => onEditChange({ ...editForm, supervisor_pdr_id: e.target.value || null })}
          options={supervisors.map(s => ({ value: s.id, label: `${s.name} — ${s.cargo}` }))}
          placeholder="Sin supervisor PDR"
        />
      </div>
      <div className="mt-4 flex gap-3">
        <Button variant="primary" onClick={onSave} disabled={saving} loading={saving}>
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
        <Button variant="danger" onClick={onDelete}>Eliminar Proyecto</Button>
      </div>
    </section>
  );
}

export default memo(EditProjectSection);
