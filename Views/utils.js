/**
 * Proyectos module – Constants & helpers (self-contained).
 */
import { formatDate as _fmtDate, getLocalDateString as _getLocalDateString } from '@/services/DateTimeService';

/* ============================================
   CONSTANTS
   ============================================ */
export const POLLING_MS = 3000;
export const CACHE_VERSION = 'v1';
export const CACHE_PREFIX = `proyectos_${CACHE_VERSION}_`;

export const PROJECT_COLORS = [
  '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#6366f1', '#84cc16',
];

export const DEFAULT_MATERIAL_FORM = {
  qty: 1, material_type: '', description: '',
  diameter: '', series: '', notes: '',
};

export const DEFAULT_SERVICE_FORM = {
  description: '', time_value: 1, time_unit: 'Día(s)', location: '',
};

export const DEFAULT_CREATE_FORM = {
  name: '', currency: 'PEN', amount: 0,
  threshold: 75, igv_enabled: true, igv_rate: 18, supervisor_id: '',
};

export const UNIT_OPTIONS = ['UND', 'M', 'KG', 'GL', 'PZA', 'JGO', 'PAR', 'ROLLO'];

/* ============================================
   GENERIC HELPERS
   ============================================ */
export const arraysEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

export const saveToCache = (key, data) => {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() })); } catch { }
};

export const loadFromCache = (key) => {
  try { const c = localStorage.getItem(CACHE_PREFIX + key); if (c) return JSON.parse(c).data; } catch { } return null;
};

export const getModuleName = () => {
  const m = window.location.pathname.match(/^\/([^/]+)/);
  return m ? m[1] : 'proyectoskrsft';
};

export const API_BASE = `/api/${getModuleName()}`;

export const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.content || '';

export const fetchWithCsrf = (url, opts = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': getCsrfToken(),
    ...opts.headers,
  };
  return fetch(url, { ...opts, headers });
};

/* ============================================
   FORMAT HELPERS
   ============================================ */
export const formatNumber = (n) =>
  parseFloat(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (d) => d ? _fmtDate(d, 'short') : '';

export const getCurrencySymbol = (c) => (c === 'USD' ? '$' : 'S/');

export const getProjectColor = (id) => PROJECT_COLORS[id % PROJECT_COLORS.length];

export const formatIso = (d) => {
  if (!d) return '';
  return _fmtDate(d, 'iso');
};

export const formatDisplayFromIso = (iso) => {
  if (!iso) return '';
  return _fmtDate(iso, 'full');
};

export const getLocalDateString = () => _getLocalDateString();

/* ============================================
   STATUS HELPERS
   ============================================ */
export const getStatusLabel = (p) => {
  const u = parseFloat(p.usage_percent) || 0;
  if (u >= 90) return 'critical';
  if (u >= (p.spending_threshold || 75)) return 'warning';
  return 'good';
};

export const getStatusText = (s) =>
  ({ good: 'Normal', warning: 'ALERTA', critical: 'CRÍTICO' }[s] || 'Normal');

export const getStatusBadgeVariant = (s) =>
  ({ good: 'emerald', warning: 'amber', critical: 'red' }[s] || 'gray');

export const getProjectStateClass = (p) => {
  const s = (p?.status || '').toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'pendiente_recuento') return 'pending-recount';
  return 'in-progress';
};

export const getProjectStateLabel = (p) => {
  const cls = getProjectStateClass(p);
  if (cls === 'completed') return 'FINALIZADO';
  if (cls === 'pending-recount') return 'RECUENTO PENDIENTE';
  return 'EN PROGRESO';
};

export const getProjectDaysAlive = (p) => {
  if (!p?.created_at) return 0;
  const d = new Date(p.created_at);
  if (isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};

export const canFinalizeProject = (p) => getProjectStateClass(p) === 'in-progress';

/* ============================================
   ORDER HELPERS
   ============================================ */
export const getOrderBadgeVariant = (o) => {
  if (o.delivery_confirmed) return 'emerald';
  if (o.status === 'rejected') return 'red';
  if (o.status === 'draft') return 'amber';
  if (o.status === 'pending') return 'amber';
  if (o.status === 'approved' && o.payment_confirmed) return 'blue';
  if (o.status === 'approved') return 'emerald';
  return 'gray';
};

export const getOrderStatusText = (o) => {
  if (o.status === 'rejected') return 'Rechazado';
  if (o.status === 'draft') return 'Borrador';
  if (o.status === 'pending') return 'Pendiente';
  if (o.status === 'approved' && o.payment_confirmed) return 'Pagado';
  if (o.status === 'approved') return 'Aprobado';
  return 'Pendiente';
};

export const getOrderStatusLabel = (o) => {
  if (o.delivery_confirmed) return 'Entregado';
  if (o.status === 'rejected') return 'Rechazado';
  if (o.status === 'draft') return 'Pend. Aprobación Jefe';
  if (o.status === 'pending') return 'En Compras';
  if (o.status === 'approved' && o.payment_confirmed) return 'Aprobado';
  if (o.status === 'approved') return 'Aprobado';
  return 'En Espera';
};

/** Monto efectivo de una orden (incluye IGV si aplica) en su moneda original */
export const getOrderEffectiveAmount = (o) => {
  const base = parseFloat(o.amount || 0);
  if (!o.igv_enabled) return base;
  const rate = parseFloat(o.igv_rate ?? 18);
  return base + base * (rate / 100);
};

export const getOrderQuantity = (o) => {
  if (o.materials && Array.isArray(o.materials) && o.materials.length > 0) {
    const t = o.materials.reduce((s, m) => (typeof m === 'object' && m.qty ? s + parseInt(m.qty) : s), 0);
    if (t > 0) return t;
  }
  const match = o.description?.match(/\((\d+)\)/);
  if (match) return parseInt(match[1]);
  return o.quantity || 1;
};
