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
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0 bg-gray-50/50">
          <h2 className="flex items-center gap-3 text-lg font-bold text-gray-900">
            <span className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
              <Cog6ToothIcon className="size-5 text-primary" />
            </span>
            Configuración del Proyecto
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">

          {/* ── Sección: Editar Proyecto ── */}
          {showEditSection && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
                <PencilIcon className="size-3.5 text-primary" />
                Editar Proyecto
              </h3>
              
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label="Nombre"
                  placeholder="Nombre del proyecto"
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Select
                  label="Supervisor"
                  value={editForm?.supervisor_id || ''}
                  onChange={e => onEditChange({ ...editForm, supervisor_id: e.target.value || null })}
                  options={(supervisors || []).map(s => ({ value: s.id, label: `${s.name} — ${s.cargo}` }))}
                  placeholder="Sin supervisor"
                />
                <Select
                  label="Supervisor PDR"
                  value={editForm?.supervisor_pdr_id || ''}
                  onChange={e => onEditChange({ ...editForm, supervisor_pdr_id: e.target.value || null })}
                  options={(supervisors || []).map(s => ({ value: s.id, label: `${s.name} — ${s.cargo}` }))}
                  placeholder="Sin supervisor PDR"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="primary" onClick={onSave} disabled={saving} loading={saving} className="h-[38px] px-6">
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                {canFinalize && (
                  <Button variant="primary" onClick={onFinalize} className="h-[38px] px-6">Finalizar Proyecto</Button>
                )}
                {canCancelFinalization && (
                  <Button variant="warning" onClick={onCancelFinalization} className="h-[38px] px-6 gap-1.5">
                    <ArrowUturnLeftIcon className="size-4" />
                    Cancelar Finalización
                  </Button>
                )}
                <Button variant="danger" onClick={onDelete} className="h-[38px] px-6">Eliminar Proyecto</Button>
              </div>
            </section>
          )}

          {/* ── Sección: Trabajadores ── */}
          {showWorkersSection && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
                <UserGroupIcon className="size-3.5 text-primary" />
                Trabajadores del Proyecto
              </h3>

              <div className="flex items-end gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Seleccionar trabajador</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedWorkerId}
                    onChange={e => onWorkerChange(e.target.value)}
                  >
                    <option value="">Seleccionar trabajador...</option>
                    {(availableWorkersFiltered || []).map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <Button variant="primary" onClick={onAdd} disabled={!selectedWorkerId} className="h-[38px] px-6">
                  Agregar
                </Button>
              </div>

              {(projectWorkers || []).length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {projectWorkers.map(w => (
                    <div key={w.id} className="group flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 transition-all hover:border-primary/20 hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-gray-50 text-[10px] font-bold text-gray-400 group-hover:bg-primary/10 group-hover:text-primary">
                          {w.name?.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{w.name}</span>
                      </div>
                      <button
                        onClick={() => onRemove(w.id)}
                        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Quitar"
                      >
                        <XMarkIcon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-8 text-center">
                  <UserGroupIcon className="size-8 text-gray-200" />
                  <p className="mt-2 text-sm text-gray-400">Sin trabajadores asignados</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-100 px-8 py-4 shrink-0 bg-gray-50/30">
          <Button variant="danger" onClick={onClose} className="px-8">Cancelar</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
