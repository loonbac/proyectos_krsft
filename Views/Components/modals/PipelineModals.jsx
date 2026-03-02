/**
 * PipelineModals — Modales del pipeline de pre-proyecto.
 * Incluye: CreateLeadModal, CommunicationModal, VisitModal, BudgetModal,
 *          NegotiationModal, TeamModal.
 */
import { useState, useEffect, memo, useCallback } from 'react';
import {
  PlusIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { getCurrencySymbol } from '../../utils';

// ── CreateLeadModal ─────────────────────────────────────────────────────

export const CreateLeadModal = memo(function CreateLeadModal({
  open, onClose, form, onFormChange, workers, saving, onCreate,
}) {
  const toggleWorker = (id) => {
    const ids = form.team_ids || [];
    onFormChange({
      ...form,
      team_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id],
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo Lead — Pipeline"
      titleIcon={<PlusIcon className="size-5 text-primary" />}
      size="lg"
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onCreate} disabled={saving} loading={saving}>
            {saving ? 'Creando...' : 'Crear Lead'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre del Proyecto" required value={form.nombre_proyecto} onChange={e => onFormChange({ ...form, nombre_proyecto: e.target.value })} placeholder="Ej: Construcción Edificio Central" />
          <Input label="Cliente (nombre)" required value={form.cliente_nombre} onChange={e => onFormChange({ ...form, cliente_nombre: e.target.value })} placeholder="Nombre del cliente" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Teléfono" value={form.cliente_telefono} onChange={e => onFormChange({ ...form, cliente_telefono: e.target.value })} placeholder="999 999 999" />
          <Input label="Email" type="email" value={form.cliente_email} onChange={e => onFormChange({ ...form, cliente_email: e.target.value })} placeholder="cliente@empresa.com" />
          <Input label="Empresa" value={form.cliente_empresa} onChange={e => onFormChange({ ...form, cliente_empresa: e.target.value })} placeholder="Empresa S.A.C." />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">Moneda</span>
            <div className="flex gap-2">
              {['PEN', 'USD'].map(c => (
                <button key={c} type="button" onClick={() => onFormChange({ ...form, moneda: c })}
                  className={`flex-1 rounded border px-3 py-2 text-sm font-medium transition-colors ${form.moneda === c ? 'border-primary bg-primary-50 text-primary-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  {c === 'PEN' ? 'S/ Soles' : '$ Dólares'}
                </button>
              ))}
            </div>
          </div>
          <Input label={`Presupuesto estimado (${getCurrencySymbol(form.moneda)})`} type="number" min="0" step="0.01" value={form.presupuesto_estimado || ''} onChange={e => onFormChange({ ...form, presupuesto_estimado: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
          <Input label="Ubicación" value={form.ubicacion} onChange={e => onFormChange({ ...form, ubicacion: e.target.value })} placeholder="Dirección o distrito" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea rows={2} value={form.descripcion} onChange={e => onFormChange({ ...form, descripcion: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary" placeholder="Descripción breve del proyecto..." />
        </div>
        {/* Team selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipo asignado <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-gray-400">(mínimo 2 personas)</span>
          </label>
          {(form.team_ids || []).length < 2 && (
            <p className="mb-2 text-xs text-red-500">Selecciona al menos 2 personas</p>
          )}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
            {workers.map((w) => {
              const selected = (form.team_ids || []).includes(w.id);
              return (
                <button key={w.id} type="button" onClick={() => toggleWorker(w.id)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${selected ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-300' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <span className={`inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${selected ? 'bg-primary' : 'bg-gray-300'}`}>
                    {selected ? <CheckIcon className="size-3" /> : w.nombre_completo?.charAt(0)?.toUpperCase()}
                  </span>
                  <span className="truncate">{w.nombre_completo}</span>
                  <span className="text-[10px] text-gray-400 truncate ml-auto">{w.cargo}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
});

// ── CommunicationModal ──────────────────────────────────────────────────

export const CommunicationModal = memo(function CommunicationModal({
  open, onClose, onSubmit, leadId,
}) {
  const [form, setForm] = useState({
    tipo: 'llamada', resumen: '', contacto_exitoso: false, contacto_nombre: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!form.resumen.trim()) return;
    setSaving(true);
    const ok = await onSubmit(leadId, form);
    setSaving(false);
    if (ok) {
      setForm({ tipo: 'llamada', resumen: '', contacto_exitoso: false, contacto_nombre: '' });
      onClose();
    }
  }, [form, leadId, onSubmit, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar Comunicación"
      titleIcon={<PhoneIcon className="size-5 text-blue-500" />}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !form.resumen.trim()} loading={saving}>Registrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Tipo de comunicación" required value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
          options={[
            { value: 'llamada', label: 'Llamada telefónica' },
            { value: 'email', label: 'Email' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'presencial', label: 'Presencial' },
            { value: 'otro', label: 'Otro' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resumen <span className="text-red-500">*</span></label>
          <textarea rows={3} value={form.resumen} onChange={e => setForm({ ...form, resumen: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary" placeholder="Describe la comunicación..." />
        </div>
        <Input label="Nombre del contacto" value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} placeholder="¿Con quién hablaste?" />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.contacto_exitoso} onChange={e => setForm({ ...form, contacto_exitoso: e.target.checked })} className="rounded border-gray-300 text-primary" />
          Comunicación exitosa (se logró contactar al encargado)
        </label>
      </div>
    </Modal>
  );
});

// ── VisitModal ───────────────────────────────────────────────────────────

export const VisitModal = memo(function VisitModal({
  open, onClose, onSubmit, leadId, workers,
}) {
  const [form, setForm] = useState({
    fecha_programada: '', direccion: '', observaciones: '', asignado_a: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!form.fecha_programada) return;
    setSaving(true);
    const ok = await onSubmit(leadId, form);
    setSaving(false);
    if (ok) {
      setForm({ fecha_programada: '', direccion: '', observaciones: '', asignado_a: '' });
      onClose();
    }
  }, [form, leadId, onSubmit, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Programar Visita"
      titleIcon={<MapPinIcon className="size-5 text-purple-500" />}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !form.fecha_programada} loading={saving}>Programar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Fecha y hora programada" required type="datetime-local" value={form.fecha_programada} onChange={e => setForm({ ...form, fecha_programada: e.target.value })} />
        <Input label="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección de la visita" />
        <Select label="Asignar a" value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}
          options={workers.map(w => ({ value: w.id, label: `${w.nombre_completo} — ${w.cargo}` }))}
          placeholder="Seleccionar responsable..."
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea rows={2} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary" placeholder="Notas sobre la visita..." />
        </div>
      </div>
    </Modal>
  );
});

// ── BudgetModal ──────────────────────────────────────────────────────────

export const BudgetModal = memo(function BudgetModal({
  open, onClose, onSubmit, leadId, currency,
}) {
  const [form, setForm] = useState({
    monto_base: '', igv_incluido: true, igv_rate: 18, detalle: '',
  });
  const [saving, setSaving] = useState(false);

  const montoBase = parseFloat(form.monto_base) || 0;
  const montoTotal = form.igv_incluido ? montoBase * (1 + form.igv_rate / 100) : montoBase;

  const handleSubmit = useCallback(async () => {
    if (montoBase <= 0) return;
    setSaving(true);
    const ok = await onSubmit(leadId, form);
    setSaving(false);
    if (ok) {
      setForm({ monto_base: '', igv_incluido: true, igv_rate: 18, detalle: '' });
      onClose();
    }
  }, [form, montoBase, leadId, onSubmit, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear Presupuesto"
      titleIcon={<CurrencyDollarIcon className="size-5 text-amber-500" />}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || montoBase <= 0} loading={saving}>Crear Presupuesto</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={`Monto base (${getCurrencySymbol(currency)})`} required type="number" min="0.01" step="0.01" value={form.monto_base} onChange={e => setForm({ ...form, monto_base: e.target.value })} placeholder="0.00" />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.igv_incluido} onChange={e => setForm({ ...form, igv_incluido: e.target.checked })} className="rounded border-gray-300 text-primary" />
            Incluir IGV
          </label>
          {form.igv_incluido && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-gray-500">Tasa:</span>
              <input type="number" min="0" max="100" value={form.igv_rate} onChange={e => setForm({ ...form, igv_rate: parseInt(e.target.value) || 18 })} className="w-16 rounded border border-gray-300 px-2 py-1 text-sm shadow-sm" />
              <span className="text-gray-500">%</span>
            </div>
          )}
        </div>
        {montoBase > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
            <span className="text-amber-700">Monto total: </span>
            <span className="font-mono font-bold text-amber-900">{getCurrencySymbol(currency)} {montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Detalle / Alcance</label>
          <textarea rows={3} value={form.detalle} onChange={e => setForm({ ...form, detalle: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary" placeholder="Descripción del alcance del presupuesto..." />
        </div>
      </div>
    </Modal>
  );
});

// ── NegotiationModal ─────────────────────────────────────────────────────

export const NegotiationModal = memo(function NegotiationModal({
  open, onClose, onSubmit, leadId, currency,
}) {
  const [form, setForm] = useState({
    tipo: 'observacion', nota: '', monto_propuesto: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!form.nota.trim()) return;
    setSaving(true);
    const ok = await onSubmit(leadId, form);
    setSaving(false);
    if (ok) {
      setForm({ tipo: 'observacion', nota: '', monto_propuesto: '' });
      onClose();
    }
  }, [form, leadId, onSubmit, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar Negociación"
      titleIcon={<ChatBubbleLeftRightIcon className="size-5 text-cyan-500" />}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !form.nota.trim()} loading={saving}>Registrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Tipo de registro" required value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
          options={[
            { value: 'observacion', label: 'Observación' },
            { value: 'contraoferta', label: 'Contraoferta del cliente' },
            { value: 'acuerdo', label: 'Acuerdo parcial' },
            { value: 'rechazo', label: 'Rechazo / Objeción' },
            { value: 'otro', label: 'Otro' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota <span className="text-red-500">*</span></label>
          <textarea rows={3} value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary" placeholder="Detalles de la negociación..." />
        </div>
        {(form.tipo === 'contraoferta' || form.tipo === 'acuerdo') && (
          <Input label={`Monto propuesto (${getCurrencySymbol(currency)})`} type="number" min="0" step="0.01" value={form.monto_propuesto} onChange={e => setForm({ ...form, monto_propuesto: e.target.value })} placeholder="0.00" />
        )}
      </div>
    </Modal>
  );
});

// ── TeamModal ────────────────────────────────────────────────────────────

export const TeamModal = memo(function TeamModal({
  open, onClose, onSubmit, leadId, workers, currentTeamIds,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Sync selectedIds when modal opens
  useEffect(() => {
    if (open) {
      setSelectedIds(currentTeamIds || []);
    }
  }, [open, currentTeamIds]);

  const toggleWorker = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = useCallback(async () => {
    if (selectedIds.length < 2) return;
    setSaving(true);
    await onSubmit(leadId, selectedIds);
    setSaving(false);
    onClose();
  }, [selectedIds, leadId, onSubmit, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Equipo"
      titleIcon={<UserGroupIcon className="size-5 text-primary" />}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || selectedIds.length < 2} loading={saving}>
            Guardar Equipo
          </Button>
        </>
      }
    >
      <div>
        <p className="mb-3 text-sm text-gray-600">
          Selecciona al menos 2 personas para el equipo.
          <span className="ml-2 font-semibold text-primary">{selectedIds.length} seleccionados</span>
        </p>
        {selectedIds.length < 2 && (
          <p className="mb-2 text-xs text-red-500">Se requieren al menos 2 personas</p>
        )}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
          {workers.map((w) => {
            const selected = selectedIds.includes(w.id);
            return (
              <button key={w.id} type="button" onClick={() => toggleWorker(w.id)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${selected ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-300' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <span className={`inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${selected ? 'bg-primary' : 'bg-gray-300'}`}>
                  {selected ? <CheckIcon className="size-3" /> : w.nombre_completo?.charAt(0)?.toUpperCase()}
                </span>
                <span className="truncate">{w.nombre_completo}</span>
                <span className="text-[10px] text-gray-400 truncate ml-auto">{w.cargo}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
});
