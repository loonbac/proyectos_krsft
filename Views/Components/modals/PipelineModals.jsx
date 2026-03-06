/**
 * PipelineModals — Modales del pipeline de pre-proyecto.
 * Incluye: CreateProyectoModal, CommunicationModal, VisitModal, BudgetModal,
 *          NegotiationModal, TeamModal.
 */
import { useState, useEffect, memo, useCallback } from 'react';
import {
  PlusIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { getCurrencySymbol } from '../../utils';

// ── Datos geográficos Perú ───────────────────────────────────────────────
const PERU_UBIGEO = {
  'Amazonas': ['Bagua', 'Bagua Grande', 'Chachapoyas', 'Condorcanqui', 'Luya', 'Rodríguez de Mendoza', 'Utcubamba'],
  'Áncash': ['Caraz', 'Carhuaz', 'Chimbote', 'Huaraz', 'Huari', 'Nuevo Chimbote', 'Recuay', 'Yungay'],
  'Apurímac': ['Abancay', 'Andahuaylaas', 'Aymaraes', 'Cotabambas', 'Chincheros', 'Grau'],
  'Arequipa': ['Arequipa', 'Camaná', 'Caravelí', 'Castilla', 'Caylloma', 'Condesuyos', 'Islay', 'La Unión'],
  'Ayacucho': ['Ayacucho', 'Cangallo', 'Huamanga', 'Huanta', 'La Mar', 'Lucanas', 'Parinacochas', 'Sucre', 'Víctor Fajardo'],
  'Cajamarca': ['Cajabamba', 'Cajamarca', 'Celendín', 'Chota', 'Contumazá', 'Cutervo', 'Hualgayoc', 'Jaén', 'San Marcos', 'San Miguel', 'Santa Cruz'],
  'Callao': ['Bellavista', 'Callao', 'Carmen de la Legua Reynoso', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla'],
  'Cusco': ['Acomayo', 'Anta', 'Calca', 'Canas', 'Canchis', 'Chumbivilcas', 'Cusco', 'Espinar', 'La Convención', 'Paruro', 'Paucartambo', 'Quispicanchis', 'Urubamba'],
  'Huancavelica': ['Acobamba', 'Angaraes', 'Castrovirreyna', 'Churcampa', 'Huancavelica', 'Huaytará', 'Tayacaja'],
  'Huánuco': ['Ambo', 'Dos de Mayo', 'Huacaybamba', 'Huamalíes', 'Huánuco', 'Lauricocha', 'Leoncio Prado', 'Marañón', 'Pachitea', 'Puerto Inca', 'Yarowilca'],
  'Ica': ['Chincha', 'Ica', 'Nasca', 'Palpa', 'Pisco'],
  'Junín': ['Chanchamayo', 'Chupaca', 'Concepción', 'Huancayo', 'Jauja', 'Junín', 'Satipo', 'Tarma', 'Yauli'],
  'La Libertad': ['Ascope', 'Bolívar', 'Chepén', 'Gran Chimú', 'Julcán', 'Otuzco', 'Pacasmayo', 'Pataz', 'Sánchez Carrión', 'Santiago de Chuco', 'Trujillo', 'Virú'],
  'Lambayeque': ['Chiclayo', 'Ferreñafe', 'Lambayeque'],
  'Lima': ['Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lima', 'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac', 'Pucusana', 'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'],
  'Loreto': ['Alto Amazonas', 'Datem del Marañón', 'Iquitos', 'Loreto', 'Mariscal Ramón Castilla', 'Maynas', 'Putumayo', 'Requena', 'Ucayali'],
  'Madre de Dios': ['Manu', 'Puerto Maldonado', 'Tahuamanu', 'Tambopata'],
  'Moquegua': ['General Sánchez Cerro', 'Ilo', 'Mariscal Nieto', 'Moquegua'],
  'Pasco': ['Daniel Alcides Carrión', 'Oxapampa', 'Pasco'],
  'Piura': ['Ayabaca', 'Huancabamba', 'Morropón', 'Paita', 'Piura', 'Sechura', 'Sullana', 'Talara'],
  'Puno': ['Azángaro', 'Carabaya', 'Chucuito', 'El Collao', 'Huancané', 'Lampa', 'Melgar', 'Moho', 'Puno', 'San Antonio de Putina', 'San Román', 'Sandia', 'Yunguyo'],
  'San Martín': ['Bellavista', 'El Dorado', 'Huallaga', 'Lamas', 'Mariscal Cáceres', 'Moyobamba', 'Picota', 'Rioja', 'San Martín', 'Tarapoto', 'Tocache'],
  'Tacna': ['Candarave', 'Jorge Basadre', 'Tacna', 'Tarata'],
  'Tumbes': ['Contralmirante Villar', 'Tumbes', 'Zarumilla'],
  'Ucayali': ['Atalaya', 'Coronel Portillo', 'Padre Abad', 'Pucallpa', 'Purús'],
};

// ── CreateLeadModal ─────────────────────────────────────────────────────

export const CreateLeadModal = memo(function CreateLeadModal({
  open, onClose, form, onFormChange, workers, saving, onCreate,
}) {
  const [departamento, setDepartamento] = useState('');
  const [distrito, setDistrito] = useState('');
  const [workerSearch, setWorkerSearch] = useState('');
  const departamentos = Object.keys(PERU_UBIGEO).sort();
  const distritos = departamento ? PERU_UBIGEO[departamento] : [];

  // Sync ubicacion into form whenever dept/distrito changes
  useEffect(() => {
    const parts = ['Perú', departamento, distrito].filter(Boolean);
    onFormChange({ ...form, ubicacion: parts.join(' — ') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departamento, distrito]);

  // Reset geo when modal closes
  useEffect(() => {
    if (!open) { setDepartamento(''); setDistrito(''); setWorkerSearch(''); }
  }, [open]);

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
      title="Nuevo Proyecto — Pipeline"
      titleIcon={<PlusIcon className="size-5 text-primary" />}
      size="lg"
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onCreate} disabled={saving} loading={saving}>
            {saving ? 'Creando...' : 'Crear Proyecto'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Fila 1: Nombre del Proyecto | Cliente */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre del Proyecto" required value={form.nombre_proyecto} onChange={e => onFormChange({ ...form, nombre_proyecto: e.target.value })} placeholder="Ej: Construcción Edificio Central" />
          <Input label="Cliente (nombre)" required value={form.cliente_nombre} onChange={e => onFormChange({ ...form, cliente_nombre: e.target.value.replace(/[^A-Za-z\u00C0-\u00FF\s]/g, '') })} placeholder="Nombre del cliente" />
        </div>
        {/* Fila 2: Teléfono | Email | Empresa | Cargo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Teléfono" value={form.cliente_telefono} onChange={e => onFormChange({ ...form, cliente_telefono: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="999 999 999" inputMode="numeric" maxLength={9} />
          <Input label="Email" type="email" value={form.cliente_email} onChange={e => onFormChange({ ...form, cliente_email: e.target.value })} placeholder="cliente@empresa.com" />
          <Input label="Empresa" value={form.cliente_empresa} onChange={e => onFormChange({ ...form, cliente_empresa: e.target.value })} placeholder="Empresa S.A.C." />
          <Input label="Cargo del cliente" value={form.cargo_cliente || ''} onChange={e => onFormChange({ ...form, cargo_cliente: e.target.value })} placeholder="Ej: Gerente de obras" />
        </div>
        {/* Fila 3: Ubicación (Departamento, Distrito) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Departamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              value={departamento}
              onChange={e => { setDepartamento(e.target.value); setDistrito(''); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="">Selecciona departamento...</option>
              {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {/* Distrito */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distrito / Provincia</label>
            <select
              value={distrito}
              onChange={e => setDistrito(e.target.value)}
              disabled={!departamento}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Selecciona distrito...</option>
              {distritos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        {/* Tipo de negocio */}
        <Input label="Tipo de negocio" value={form.tipo_negocio || ''} onChange={e => onFormChange({ ...form, tipo_negocio: e.target.value })} placeholder="Ej: Construcción civil, Minería, Inmobiliaria..." />
        {/* Descripción */}
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
          {/* Search bar */}
          <div className="relative mb-1.5">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7 7 0 1 0 6.65 6.65a7 7 0 0 0 9.9 9.9Z" /></svg>
            <input
              type="text"
              placeholder="Buscar por nombre o cargo…"
              value={workerSearch}
              onChange={e => setWorkerSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-1.5 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
            {workers
              .filter(w => {
                const q = workerSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  (w.nombre_completo || '').toLowerCase().includes(q) ||
                  (w.cargo || '').toLowerCase().includes(q)
                );
              })
              .map((w) => {
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
              })
            }
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
        <Input label="Nombre del contacto" value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value.replace(/[^A-Za-z\u00C0-\u00FF\s]/g, '') })} placeholder="¿Con quién hablaste?" />
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
  const [datetime, setDatetime] = useState(null);
  const [fields, setFields] = useState({ direccion: '', observaciones: '', asignado_a: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!datetime?.isValid()) return;
    setSaving(true);
    const ok = await onSubmit(leadId, {
      fecha_programada: datetime.format('YYYY-MM-DDTHH:mm'),
      ...fields,
    });
    setSaving(false);
    if (ok) {
      setDatetime(null);
      setFields({ direccion: '', observaciones: '', asignado_a: '' });
      onClose();
    }
  }, [datetime, fields, leadId, onSubmit, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Programar Visita"
      titleIcon={<MapPinIcon className="size-5 text-purple-500" />}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !datetime?.isValid()} loading={saving}>Programar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <DateTimePicker
            label="Fecha y hora programada"
            value={datetime}
            onChange={(newValue) => setDatetime(newValue)}
            views={['year', 'month', 'day', 'hours', 'minutes']}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                required: true,
              },
            }}
            sx={{
              width: '100%',
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0AA4A4' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#0AA4A4' },
              '& .MuiPickersDay-root.Mui-selected': {
                backgroundColor: '#0AA4A4',
                '&:hover': { backgroundColor: '#08C6B6' },
              },
              '& .MuiClock-pin, & .MuiClockPointer-root': { backgroundColor: '#0AA4A4' },
              '& .MuiClockPointer-thumb': { borderColor: '#0AA4A4' },
              '& .MuiMultiSectionDigitalClockSection-item.Mui-selected': {
                backgroundColor: '#0AA4A4',
              },
            }}
          />
        </LocalizationProvider>
        <Input label="Dirección" value={fields.direccion} onChange={e => setFields(f => ({ ...f, direccion: e.target.value }))} placeholder="Dirección de la visita" />
        <Select label="Asignar a" value={fields.asignado_a} onChange={e => setFields(f => ({ ...f, asignado_a: e.target.value }))}
          options={workers.map(w => ({ value: w.trabajador_id ?? w.id, label: `${w.nombre_completo} — ${w.cargo}` }))}
          placeholder="Seleccionar responsable..."
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea rows={2} value={fields.observaciones} onChange={e => setFields(f => ({ ...f, observaciones: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary" placeholder="Notas sobre la visita..." />
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
        <Input label={`Monto base (${getCurrencySymbol(currency)})`} required inputMode="decimal" value={form.monto_base} onChange={e => setForm({ ...form, monto_base: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') })} placeholder="0.00" />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.igv_incluido} onChange={e => setForm({ ...form, igv_incluido: e.target.checked })} className="rounded border-gray-300 text-primary" />
            Incluir IGV
          </label>
          {form.igv_incluido && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-gray-500">Tasa:</span>
              <input type="number" min="0" max="100" value={form.igv_rate} onChange={e => { const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0)); setForm({ ...form, igv_rate: v }); }} className="w-16 rounded border border-gray-300 px-2 py-1 text-sm shadow-sm" />
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
          <Input label={`Monto propuesto (${getCurrencySymbol(currency)})`} inputMode="decimal" value={form.monto_propuesto} onChange={e => setForm({ ...form, monto_propuesto: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') })} placeholder="0.00" />
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
// ── CreateProjectFromLeadModal ─────────────────────────────────────────

export const CreateProjectFromLeadModal = memo(function CreateProjectFromLeadModal({
  open, onClose, lead, cecos, supervisors = [], saving, onCreate,
}) {
  const [form, setForm] = useState({
    abbreviation: '',
    ceco_id: '',
    supervisor_id: '',
  });

  useEffect(() => {
    if (open) {
      setForm({ abbreviation: '', ceco_id: '', supervisor_id: '' });
    }
  }, [open]);

  const handleCreate = () => {
    if (!form.abbreviation.trim()) {
      alert('La abreviatura es requerida');
      return;
    }
    if (!form.ceco_id) {
      alert('Debes seleccionar un CECO');
      return;
    }
    if (!form.supervisor_id) {
      alert('Debes seleccionar un supervisor');
      return;
    }
    onCreate(lead.id, form);
  };

  if (!lead) return null;

  const budget = lead.budgets?.find(b => b.estado === 'aceptado');
  const totalAmount = budget?.monto_total || lead.presupuesto_estimado;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear Proyecto desde Pre-Proyecto"
      titleIcon={<CurrencyDollarIcon className="size-5 text-primary" />}
      size="lg"
      footer={
        <>
          <Button variant="danger" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={saving || !form.abbreviation.trim() || !form.ceco_id || !form.supervisor_id}
            loading={saving}
          >
            {saving ? 'Creando...' : 'Proyecto a ejecutar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Nombre del proyecto - readonly */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Proyecto
          </label>
          <input
            type="text"
            value={lead.nombre_proyecto || ''}
            disabled
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
          />
        </div>

        {/* Presupuesto - readonly */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Presupuesto que se le otorga
          </label>
          <input
            type="text"
            value={`${getCurrencySymbol(lead.moneda || 'PEN')} ${totalAmount.toLocaleString('es-PE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            disabled
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900"
          />
        </div>

        {/* Abreviatura - editable */}
        <Input
          label="Abreviatura del nombre del proyecto"
          required
          placeholder=""
          value={form.abbreviation}
          onChange={e => setForm({ ...form, abbreviation: e.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, '') })}
          maxLength={50}
        />

        {/* Supervisor del proyecto - select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supervisor del Proyecto <span className="text-red-500">*</span>
          </label>
          <select
            value={form.supervisor_id || ''}
            onChange={e => setForm({ ...form, supervisor_id: parseInt(e.target.value) || '' })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary"
          >
            <option value="">Selecciona un supervisor...</option>
            {(supervisors || []).map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* CECO - select con jerarquía */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Columna de CECO dependiente <span className="text-red-500">*</span>
          </label>
          <select
            value={form.ceco_id || ''}
            onChange={e => setForm({ ...form, ceco_id: parseInt(e.target.value) || '' })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary"
          >
            <option value="">Selecciona un CECO...</option>
            {(cecos || []).map(ceco => (
              <option
                key={ceco.id}
                value={ceco.id}
              >
                {ceco.codigo} – {ceco.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
});