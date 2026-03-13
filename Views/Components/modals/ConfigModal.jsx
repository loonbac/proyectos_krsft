import { createPortal } from 'react-dom';
import {
  XMarkIcon,
  Cog6ToothIcon,
  PencilIcon,
  UserGroupIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

/**
 * ConfigModal – Modal flotante de configuración del proyecto.
 * Combina: Editar Proyecto + Gestión de Trabajadores.
 */
export default function ConfigModal({
  open,
  onClose,
  // Edit project props
  editForm,
  onEditChange,
  supervisors,
  saving,
  onSave,
  onDelete,
  onFinalize,
  canFinalize = false,
  onCancelFinalization,
  canCancelFinalization = false,
  // Workers props
  projectWorkers,
  availableWorkersFiltered,
  selectedWorkerId,
  onWorkerChange,
  onAdd,
  onRemove,
  // Visibility flags
  showEditSection = true,
  showWorkersSection = true,
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg bg-white shadow-2xl border-2 border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Cog6ToothIcon className="size-5 text-primary" />
            Configuración del Proyecto
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* ── Sección: Editar Proyecto ── */}
          {showEditSection && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                <PencilIcon className="size-4 text-primary" />
                Editar Proyecto
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nombre"
                  value={editForm?.name || ''}
                  onChange={e => onEditChange({ ...editForm, name: e.target.value })}
                />
                <Input
                  label="Umbral (%)"
                  type="number"
                  min="1"
                  max="100"
                  value={editForm?.spending_threshold || 75}
                  onChange={e => onEditChange({ ...editForm, spending_threshold: parseInt(e.target.value) || 75 })}
                />
              </div>
              <div className="mt-4">
                <Select
                  label="Supervisor"
                  value={editForm?.supervisor_id || ''}
                  onChange={e => onEditChange({ ...editForm, supervisor_id: e.target.value || null })}
                  options={(supervisors || []).map(s => ({ value: s.id, label: `${s.name} — ${s.cargo}` }))}
                  placeholder="Sin supervisor"
                />
              </div>
              <div className="mt-4">
                <Select
                  label="Supervisor PDR"
                  value={editForm?.supervisor_pdr_id || ''}
                  onChange={e => onEditChange({ ...editForm, supervisor_pdr_id: e.target.value || null })}
                  options={(supervisors || []).map(s => ({ value: s.id, label: `${s.name} — ${s.cargo}` }))}
                  placeholder="Sin supervisor PDR"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="primary" onClick={onSave} disabled={saving} loading={saving}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                {canFinalize && (
                  <Button variant="primary" onClick={onFinalize}>Finalizar Proyecto</Button>
                )}
                {canCancelFinalization && (
                  <Button variant="warning" onClick={onCancelFinalization} className="gap-1.5">
                    <ArrowUturnLeftIcon className="size-4" />
                    Cancelar Finalización
                  </Button>
                )}
                <Button variant="danger" onClick={onDelete}>Eliminar Proyecto</Button>
              </div>
            </section>
          )}

          {/* ── Sección: Trabajadores ── */}
          {showWorkersSection && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                <UserGroupIcon className="size-4 text-primary" />
                Trabajadores del Proyecto
              </h3>
              <div className="flex gap-2 mb-4">
                <select
                  className="flex-1 rounded border border-gray-300 px-15 py-2 text-sm shadow-sm"
                  value={selectedWorkerId}
                  onChange={e => onWorkerChange(e.target.value)}
                >
                  <option value="">Seleccionar trabajador...</option>
                  {(availableWorkersFiltered || []).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <Button variant="primary" size="sm" onClick={onAdd} disabled={!selectedWorkerId}>
                  Agregar
                </Button>
              </div>
              {(projectWorkers || []).length > 0 ? (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {projectWorkers.map(w => (
                    <li key={w.id} className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-gray-700">{w.name}</span>
                      <button
                        onClick={() => onRemove(w.id)}
                        className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <XMarkIcon className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Sin trabajadores asignados</p>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
