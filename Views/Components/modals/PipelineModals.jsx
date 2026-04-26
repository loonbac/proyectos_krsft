/**
 * PipelineModals — Modales del pipeline de pre-proyecto.
 * Incluye: CreateProyectoModal, CommunicationModal, VisitModal, BudgetModal,
 *          NegotiationModal, TeamModal.
 */
import { useState, useEffect, memo, useCallback, useRef } from 'react';
import {
  PlusIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
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
import { getCurrencySymbol, API_BASE } from '../../utils';

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
      size="xl"
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
          <div
            className="grid grid-cols-1 gap-1.5 rounded-md border border-gray-200 p-2 sm:grid-cols-2"
            style={{ maxHeight: '260px', overflowY: 'auto' }}
          >
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
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${selected ? 'border-primary/30 bg-primary/10 text-primary/80' : 'border-transparent text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className={`inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${selected ? 'bg-primary' : 'bg-gray-300'}`}>
                      {selected ? <CheckIcon className="size-3" /> : w.nombre_completo?.charAt(0)?.toUpperCase()}
                    </span>
                    <span className="truncate">{w.nombre_completo}</span>
                    <span className="ml-auto truncate text-[11px] text-gray-400">{w.cargo}</span>
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
      showCloseButton={false}
      title="Registrar Comunicación"
      titleIcon={<PhoneIcon className="size-5 text-blue-600" />}
      footer={
        <>
          <Button variant="danger" size="sm" onClick={onClose} className="rounded-lg">Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving || !form.resumen.trim()} loading={saving} className="rounded-lg px-5">Registrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select 
          label="Tipo de comunicación" 
          required 
          value={form.tipo} 
          onChange={e => setForm({ ...form, tipo: e.target.value })}
          options={[
            { value: 'llamada', label: 'Llamada telefónica' },
            { value: 'email', label: 'Email' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'presencial', label: 'Presencial' },
            { value: 'otro', label: 'Otro' },
          ]}
          className="text-[13px]"
        />
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Resumen <span className="text-red-500">*</span>
          </label>
          <textarea 
            rows={3} 
            value={form.resumen} 
            onChange={e => setForm({ ...form, resumen: e.target.value })} 
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800 shadow-sm transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder-gray-400" 
            placeholder="Describe la comunicación..." 
          />
        </div>
        <Input 
          label="Nombre del contacto" 
          value={form.contacto_nombre} 
          onChange={e => setForm({ ...form, contacto_nombre: e.target.value.replace(/[^A-Za-z\u00C0-\u00FF\s]/g, '') })} 
          placeholder="¿Con quién hablaste?" 
          className="text-[13px]"
        />
        <label className="flex items-center gap-2 text-[13px] text-gray-700">
          <input 
            type="checkbox" 
            checked={form.contacto_exitoso} 
            onChange={e => setForm({ ...form, contacto_exitoso: e.target.checked })} 
            className="rounded border-gray-300 text-primary focus:ring-primary" 
          />
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
  const [fechaStr, setFechaStr] = useState('');
  const [fields, setFields] = useState({ direccion: '', observaciones: '', asignado_a: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!fechaStr) return;
    setSaving(true);
    const ok = await onSubmit(leadId, {
      fecha_programada: fechaStr,
      ...fields,
    });
    setSaving(false);
    if (ok) {
      setFechaStr('');
      setFields({ direccion: '', observaciones: '', asignado_a: '' });
      onClose();
    }
  }, [fechaStr, fields, leadId, onSubmit, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton={false}
      title="Programar Visita"
      titleIcon={<MapPinIcon className="size-5 text-indigo-600" />}
      footer={
        <>
          <Button variant="danger" size="sm" onClick={onClose} className="rounded-lg">Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving || !fechaStr} loading={saving} className="rounded-lg px-5">Programar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Fecha y hora programada <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={fechaStr}
            onChange={(e) => setFechaStr(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800 shadow-sm transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
          />
        </div>
        
        <Input 
          label="Dirección" 
          value={fields.direccion} 
          onChange={e => setFields(f => ({ ...f, direccion: e.target.value }))} 
          placeholder="Dirección de la visita"
          className="text-[13px]"
        />
        
        <Select 
          label="Asignar a" 
          value={fields.asignado_a} 
          onChange={e => setFields(f => ({ ...f, asignado_a: e.target.value }))}
          options={workers.map(w => ({ value: w.trabajador_id ?? w.id, label: `${w.nombre_completo} — ${w.cargo}` }))}
          placeholder="Seleccionar responsable..."
          className="text-[13px]"
        />
        
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Observaciones</label>
          <textarea 
            rows={2} 
            value={fields.observaciones} 
            onChange={e => setFields(f => ({ ...f, observaciones: e.target.value }))} 
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800 shadow-sm transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder-gray-400" 
            placeholder="Notas sobre la visita..." 
          />
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
      showCloseButton={false}
      title="Crear Presupuesto"
      titleIcon={<CurrencyDollarIcon className="size-5 text-amber-600" />}
      footer={
        <>
          <Button variant="danger" size="sm" onClick={onClose} className="rounded-lg">Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving || montoBase <= 0} loading={saving} className="rounded-lg px-5">Crear Presupuesto</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input 
          label={`Monto base (${getCurrencySymbol(currency)})`} 
          required 
          inputMode="decimal" 
          value={form.monto_base} 
          onChange={e => setForm({ ...form, monto_base: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') })} 
          placeholder="0.00" 
          className="text-[13px]"
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[13px] text-gray-700">
            <input 
              type="checkbox" 
              checked={form.igv_incluido} 
              onChange={e => setForm({ ...form, igv_incluido: e.target.checked })} 
              className="rounded border-gray-300 text-primary focus:ring-primary" 
            />
            Incluir IGV
          </label>
          {form.igv_incluido && (
            <div className="flex items-center gap-1 text-[13px]">
              <span className="text-gray-500">Tasa:</span>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={form.igv_rate} 
                onChange={e => { const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0)); setForm({ ...form, igv_rate: v }); }} 
                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-[13px] shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
              />
              <span className="text-gray-500">%</span>
            </div>
          )}
        </div>
        {montoBase > 0 && (
          <div className="rounded-lg bg-amber-50/50 border border-amber-200/50 p-3 text-[13px]">
            <span className="text-amber-700">Monto total: </span>
            <span className="font-mono font-bold text-amber-900">{getCurrencySymbol(currency)} {montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Detalle / Alcance</label>
          <textarea 
            rows={3} 
            value={form.detalle} 
            onChange={e => setForm({ ...form, detalle: e.target.value })} 
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800 shadow-sm transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder-gray-400" 
            placeholder="Descripción del alcance del presupuesto..." 
          />
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
      showCloseButton={false}
      title="Registrar Negociación"
      titleIcon={<ChatBubbleLeftRightIcon className="size-5 text-cyan-600" />}
      footer={
        <>
          <Button variant="danger" size="sm" onClick={onClose} className="rounded-lg">Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving || !form.nota.trim()} loading={saving} className="rounded-lg px-5">Registrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select 
          label="Tipo de registro" 
          required 
          value={form.tipo} 
          onChange={e => setForm({ ...form, tipo: e.target.value })}
          options={[
            { value: 'observacion', label: 'Observación' },
            { value: 'contraoferta', label: 'Contraoferta del cliente' },
            { value: 'acuerdo', label: 'Acuerdo parcial' },
            { value: 'rechazo', label: 'Rechazo / Objeción' },
            { value: 'otro', label: 'Otro' },
          ]}
          className="text-[13px]"
        />
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Nota / Detalle <span className="text-red-500">*</span></label>
          <textarea 
            rows={3} 
            value={form.nota} 
            onChange={e => setForm({ ...form, nota: e.target.value })} 
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800 shadow-sm transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder-gray-400" 
            placeholder="Detalles de la negociación..." 
          />
        </div>
        {(form.tipo === 'contraoferta' || form.tipo === 'acuerdo') && (
          <Input 
            label={`Monto propuesto (${getCurrencySymbol(currency)})`} 
            inputMode="decimal" 
            value={form.monto_propuesto} 
            onChange={e => setForm({ ...form, monto_propuesto: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') })} 
            placeholder="0.00" 
            className="text-[13px]"
          />
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
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${selected ? 'bg-primary/10 text-primary/80 ring-1 ring-primary/30' : 'hover:bg-gray-50 text-gray-700'}`}
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
  open, onClose, lead, cecos, workers = [], saving, onCreate,
}) {
  const [form, setForm] = useState({
    abbreviation: '',
    ceco_id: '',
    supervisor_id: '',
    supervisor_pdr_id: '',
  });
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboRef = useRef(null);

  // PDR combobox state
  const [pdrSearch, setPdrSearch] = useState('');
  const [pdrDropdownOpen, setPdrDropdownOpen] = useState(false);
  const pdrComboRef = useRef(null);

  // Enroll states
  const [enrollMode, setEnrollMode] = useState('new'); // 'new' | 'existing'
  const [validCecos, setValidCecos] = useState([]);
  const [loadingCecos, setLoadingCecos] = useState(false);
  const [cecosError, setCecosError] = useState(null);
  const [selectedExistingCecoId, setSelectedExistingCecoId] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ abbreviation: '', ceco_id: '', supervisor_id: '', supervisor_pdr_id: '' });
      setSearch('');
      setDropdownOpen(false);
      setPdrSearch('');
      setPdrDropdownOpen(false);
      setEnrollMode('new');
      setValidCecos([]);
      setCecosError(null);
      setSelectedExistingCecoId('');
      setLoadingCecos(false);
      // Fetch valid CECOs if lead has cliente_empresa
      if (lead?.cliente_empresa?.trim()) {
        fetchValidCecos(lead.id);
      }
    }
  }, [open]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (pdrComboRef.current && !pdrComboRef.current.contains(e.target)) {
        setPdrDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch valid CECOs for existing enrollment
  const fetchValidCecos = useCallback(async (leadId) => {
    setLoadingCecos(true);
    setCecosError(null);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(`${API_BASE}/pipeline/${leadId}/valid-cecos`, {
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': token,
        },
      });
      const data = await res.json();
      if (data.success) {
        setValidCecos(data.data || []);
      } else {
        setCecosError(data.message || 'Error al cargar CECOs válidos');
        setValidCecos([]);
      }
    } catch {
      setCecosError('Error de red al buscar CECOs');
      setValidCecos([]);
    } finally {
      setLoadingCecos(false);
    }
  }, []);

  const selectedWorker = workers.find(w => w.id === form.supervisor_id) || null;
  const selectedPdrWorker = workers.find(w => w.id === form.supervisor_pdr_id) || null;

  const filteredWorkers = search.trim()
    ? workers.filter(w => {
        const q = search.toLowerCase();
        return (w.nombre_completo || '').toLowerCase().includes(q)
          || (w.cargo || '').toLowerCase().includes(q);
      })
    : workers;

  const filteredPdrWorkers = pdrSearch.trim()
    ? workers.filter(w => {
        const q = pdrSearch.toLowerCase();
        return (w.nombre_completo || '').toLowerCase().includes(q)
          || (w.cargo || '').toLowerCase().includes(q);
      })
    : workers;

  const handleSelectWorker = (worker) => {
    setForm(f => ({ ...f, supervisor_id: worker.id }));
    setSearch('');
    setDropdownOpen(false);
  };

  const handleClearWorker = () => {
    setForm(f => ({ ...f, supervisor_id: '' }));
    setSearch('');
  };

  const handleSelectPdrWorker = (worker) => {
    setForm(f => ({ ...f, supervisor_pdr_id: worker.id }));
    setPdrSearch('');
    setPdrDropdownOpen(false);
  };

  const handleClearPdrWorker = () => {
    setForm(f => ({ ...f, supervisor_pdr_id: '' }));
    setPdrSearch('');
  };

  const handleCreate = () => {
    if (!form.abbreviation.trim()) {
      alert('La abreviatura es requerida');
      return;
    }
    if (enrollMode === 'new') {
      if (!form.ceco_id) {
        alert('Debes seleccionar un CECO');
        return;
      }
    } else {
      if (!selectedExistingCecoId) {
        alert('Debes seleccionar un CECO existente');
        return;
      }
    }
    if (!form.supervisor_id) {
      alert('Debes seleccionar un supervisor');
      return;
    }
    // Build payload based on enroll mode
    if (enrollMode === 'existing') {
      const { ceco_id, ...formWithoutCeco } = form;
      onCreate(lead.id, { ...formWithoutCeco, enroll_existing_ceco_id: selectedExistingCecoId });
    } else {
      onCreate(lead.id, form);
    }
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
            disabled={saving || !form.abbreviation.trim() || (enrollMode === 'new' ? !form.ceco_id : !selectedExistingCecoId) || !form.supervisor_id}
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

        {/* Supervisor del proyecto - combobox con búsqueda */}
        <div ref={comboRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supervisor <span className="text-red-500">*</span>
          </label>

          {selectedWorker ? (
            <div className="flex items-center justify-between rounded-md border border-primary bg-primary/5 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-gray-900">{selectedWorker.nombre_completo}</span>
                {selectedWorker.cargo && (
                  <span className="ml-2 text-gray-500">— {selectedWorker.cargo}</span>
                )}
              </span>
              <button type="button" onClick={handleClearWorker} className="ml-2 text-gray-400 hover:text-red-500">
                <XMarkIcon className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Buscar trabajador por nombre o cargo..."
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>
          )}

          {dropdownOpen && !selectedWorker && (
            <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {filteredWorkers.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
              ) : (
                filteredWorkers.map(w => (
                  <li
                    key={w.id}
                    onClick={() => handleSelectWorker(w)}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-primary/10"
                  >
                    <span className="font-medium text-gray-900">{w.nombre_completo}</span>
                    {w.cargo && <span className="text-xs text-gray-500">{w.cargo}</span>}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Supervisor PDR - combobox con búsqueda (opcional) */}
        <div ref={pdrComboRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supervisor PDR
          </label>

          {selectedPdrWorker ? (
            <div className="flex items-center justify-between rounded-md border border-primary bg-primary/5 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-gray-900">{selectedPdrWorker.nombre_completo}</span>
                {selectedPdrWorker.cargo && (
                  <span className="ml-2 text-gray-500">— {selectedPdrWorker.cargo}</span>
                )}
              </span>
              <button type="button" onClick={handleClearPdrWorker} className="ml-2 text-gray-400 hover:text-red-500">
                <XMarkIcon className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={pdrSearch}
                onChange={e => { setPdrSearch(e.target.value); setPdrDropdownOpen(true); }}
                onFocus={() => setPdrDropdownOpen(true)}
                placeholder="Buscar trabajador por nombre o cargo..."
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>
          )}

          {pdrDropdownOpen && !selectedPdrWorker && (
            <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {filteredPdrWorkers.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
              ) : (
                filteredPdrWorkers.map(w => (
                  <li
                    key={w.id}
                    onClick={() => handleSelectPdrWorker(w)}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-primary/10"
                  >
                    <span className="font-medium text-gray-900">{w.nombre_completo}</span>
                    {w.cargo && <span className="text-xs text-gray-500">{w.cargo}</span>}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Enroll mode toggle + Existing CECO selector — only if validCecos available */}
        {validCecos.length > 0 && (
          <div>
            {/* Toggle buttons */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tipo de enrolamiento
              </label>
              <div className="inline-flex rounded-sm border border-gray-200">
                <button
                  type="button"
                  onClick={() => setEnrollMode('new')}
                  className={`rounded-s-sm px-3 py-1.5 text-sm font-medium transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    enrollMode === 'new'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Crear CECO Nuevo
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollMode('existing')}
                  className={`-ms-px rounded-e-sm border-l border-gray-200 px-3 py-1.5 text-sm font-medium transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    enrollMode === 'existing'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Usar CECO Existente
                </button>
              </div>
            </div>

            {/* Existing CECO dropdown */}
            {enrollMode === 'existing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CECO Existente <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedExistingCecoId}
                  onChange={e => setSelectedExistingCecoId(parseInt(e.target.value) || '')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary"
                >
                  <option value="">Selecciona un CECO...</option>
                  {validCecos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} – {c.nombre}{c.razon_social ? ` (${c.razon_social})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Loading CECOs */}
        {loadingCecos && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            <span>Buscando CECOs disponibles...</span>
          </div>
        )}

        {/* CECOs error */}
        {cecosError && (
          <div className="rounded-sm bg-red-50 p-3 text-sm text-red-700">
            <p>{cecosError}</p>
          </div>
        )}

        {/* Empty state — no valid CECOs for this company */}
        {!loadingCecos && !cecosError && validCecos.length === 0 && lead?.cliente_empresa?.trim() && (
          <p className="text-sm text-gray-500 italic">
            No se encontraron CECOs válidos para esta empresa. Se creará un CECO nuevo automáticamente.
          </p>
        )}

        {/* CECO - select con jerarquía (solo modo 'new' y si no hay selección automática) */}
        {enrollMode === 'new' && (
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
        )}
      </div>
    </Modal>
  );
});