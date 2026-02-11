import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

/* Core ERP base styles */
import '../../../resources/css/Bytewave-theme.css';
import '../../../resources/css/modules-layout.css';
import '../../../resources/css/modules-modal.css';

/* Module-specific styles */
import './proyectos-variables.css';
import './proyectos-layout.css';
import './proyectos-filters.css';
import './proyectos-grid.css';
import './proyectos-detail.css';
import './proyectos-form.css';
import './proyectos-buttons.css';
import './proyectos-table.css';
import './proyectos-modal.css';

/* ============================================
   CONSTANTS & HELPERS (module-level)
   ============================================ */
const POLLING_MS = 3000;
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = `proyectos_${CACHE_VERSION}_`;

const PROJECT_COLORS = [
  '#0AA4A4','#3b82f6','#8b5cf6','#ec4899','#f59e0b',
  '#10b981','#ef4444','#06b6d4','#6366f1','#84cc16',
];

const arraysEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

const saveToCache = (key, data) => {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() })); }
  catch {}
};

const loadFromCache = (key) => {
  try {
    const c = localStorage.getItem(CACHE_PREFIX + key);
    if (c) return JSON.parse(c).data;
  } catch {}
  return null;
};

const getModuleName = () => {
  const m = window.location.pathname.match(/^\/([^/]+)/);
  return m ? m[1] : 'proyectoskrsft';
};

const formatNumber = (n) => parseFloat(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '';
const getCurrencySymbol = (c) => c === 'USD' ? '$' : 'S/';
const getProjectColor = (id) => PROJECT_COLORS[id % PROJECT_COLORS.length];

const getStatusLabel = (p) => {
  const u = parseFloat(p.usage_percent) || 0;
  if (u >= 90) return 'critical';
  if (u >= (p.spending_threshold || 75)) return 'warning';
  return 'good';
};
const getStatusText = (s) => ({ good: 'Normal', warning: 'ALERTA', critical: 'CRÍTICO' }[s] || 'Normal');

const getProjectStateClass = (p) => ((p?.status || '').toLowerCase() === 'completed' ? 'completed' : 'in-progress');
const getProjectStateLabel = (p) => (getProjectStateClass(p) === 'completed' ? 'FINALIZADO' : 'EN PROGRESO');

const getProjectDaysAlive = (p) => {
  if (!p?.created_at) return 0;
  const d = new Date(p.created_at);
  if (isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};

const canFinalizeProject = (p) => getProjectStateClass(p) !== 'completed';

// Order helpers
const getOrderStatusClass = (o) => {
  if (o.status === 'rejected') return 'status-rejected';
  if (o.status === 'draft') return 'status-draft';
  if (o.status === 'pending') return 'status-pending';
  if (o.status === 'approved' && o.payment_confirmed) return 'status-paid';
  if (o.status === 'approved') return 'status-approved';
  return 'status-pending';
};

const getOrderStatusText = (o) => {
  if (o.status === 'rejected') return 'Rechazado';
  if (o.status === 'draft') return 'Borrador';
  if (o.status === 'pending') return 'Pendiente';
  if (o.status === 'approved' && o.payment_confirmed) return 'Pagado';
  if (o.status === 'approved') return 'Aprobado';
  return 'Pendiente';
};

const getOrderStatusLabel = (o) => {
  if (o.status === 'rejected') return 'Rechazado';
  if (o.status === 'draft') return 'Pend. Aprobación Jefe';
  if (o.status === 'pending') return 'En Compras';
  if (o.status === 'approved' && o.payment_confirmed) return 'Aprobado';
  if (o.status === 'approved') return 'Aprobado';
  return 'En Espera';
};

const getOrderQuantity = (o) => {
  if (o.materials && Array.isArray(o.materials) && o.materials.length > 0) {
    const t = o.materials.reduce((s, m) => (typeof m === 'object' && m.qty ? s + parseInt(m.qty) : s), 0);
    if (t > 0) return t;
  }
  const match = o.description?.match(/\((\d+)\)/);
  if (match) return parseInt(match[1]);
  return o.quantity || 1;
};

// Flatpickr CDN loader
const ensureFlatpickr = () => new Promise((resolve, reject) => {
  const loadLocale = () => new Promise((res2, rej2) => {
    const locId = 'flatpickr-locale-es-proyectos';
    if (window.flatpickr?.l10ns?.es) return res2();
    if (document.getElementById(locId)) {
      const el = document.getElementById(locId);
      el.addEventListener('load', res2); el.addEventListener('error', rej2); return;
    }
    const s = document.createElement('script');
    s.id = locId; s.src = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/es.js'; s.async = true;
    s.onload = res2; s.onerror = rej2; document.body.appendChild(s);
  });

  if (window.flatpickr) return loadLocale().then(() => resolve(window.flatpickr)).catch(reject);

  if (!document.getElementById('flatpickr-css-proyectos')) {
    const lk = document.createElement('link');
    lk.id = 'flatpickr-css-proyectos'; lk.rel = 'stylesheet';
    lk.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
    document.head.appendChild(lk);
  }

  const sid = 'flatpickr-js-proyectos';
  if (document.getElementById(sid)) {
    const el = document.getElementById(sid);
    el.addEventListener('load', () => resolve(window.flatpickr)); el.addEventListener('error', reject); return;
  }

  const sc = document.createElement('script');
  sc.id = sid; sc.src = 'https://cdn.jsdelivr.net/npm/flatpickr'; sc.async = true;
  sc.onload = () => loadLocale().then(() => resolve(window.flatpickr)).catch(reject);
  sc.onerror = reject; document.body.appendChild(sc);
});

const formatIso = (d) => {
  if (!d) return '';
  return `${d.getFullYear()}-${`${d.getMonth()+1}`.padStart(2,'0')}-${`${d.getDate()}`.padStart(2,'0')}`;
};

const formatDisplayFromIso = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${`${d.getDate()}`.padStart(2,'0')}/${`${d.getMonth()+1}`.padStart(2,'0')}/${d.getFullYear()}`;
};

// CSRF
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

const fetchWithCsrf = (url, opts = {}) => {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken(), ...opts.headers };
  return fetch(url, { ...opts, headers });
};

const API_BASE = `/api/${getModuleName()}`;

let didInit = false;

/* ============================================
   COMPONENT
   ============================================ */
export default function ProyectosIndex({ userRole, isSupervisor: isSupervisorProp, trabajadorId }) {

  /* ---------- STATE ---------- */
  const [projects, setProjects] = useState(() => loadFromCache('projects') || []);
  const [stats, setStats] = useState(() => loadFromCache('stats') || { total_projects: 0, active_projects: 0, total_budget: 0, total_spent: 0, total_remaining: 0 });
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectWorkers, setProjectWorkers] = useState([]);
  const [projectOrders, setProjectOrders] = useState([]);
  const [projectSummary, setProjectSummary] = useState({});
  const [supervisors, setSupervisors] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedOrders, setSelectedOrders] = useState({});
  const [expandedFiles, setExpandedFiles] = useState({});
  const [updatingProjectState, setUpdatingProjectState] = useState(false);

  // Material form
  const [materialForm, setMaterialForm] = useState({ item_number: null, qty: 1, unit: '', description: '', diameter: '', series: '', material_type: '' });

  // Import
  const [importingFile, setImportingFile] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreviewItems, setImportPreviewItems] = useState([]);
  const pendingImportFile = useRef(null);

  // Paid orders / Delivery
  const [paidOrders, setPaidOrders] = useState([]);
  const [loadingPaidOrders, setLoadingPaidOrders] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateFromDisplay, setDateFromDisplay] = useState('');
  const [dateToDisplay, setDateToDisplay] = useState('');

  // Confirm modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmActionLabel, setConfirmActionLabel] = useState('Confirmar');
  const [confirmActionVariant, setConfirmActionVariant] = useState('');
  const [confirmProcessing, setConfirmProcessing] = useState(false);
  const confirmActionRef = useRef(null);

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', spending_threshold: 75, supervisor_id: null });
  const [form, setForm] = useState({ name: '', currency: 'PEN', amount: 0, threshold: 75, igv_enabled: true, igv_rate: 18, supervisor_id: '' });

  // Refs
  const dateFromInputRef = useRef(null);
  const dateToInputRef = useRef(null);
  const dateFromPickerRef = useRef(null);
  const dateToPickerRef = useRef(null);
  const pollingRef = useRef(null);
  const selectedProjectRef = useRef(null);

  // Keep ref in sync for polling closure
  useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);

  /* ---------- DERIVED VALUES ---------- */
  const isSupervisor = isSupervisorProp;

  const statusFilters = useMemo(() => {
    const counts = { all: projects.length, warning: 0, critical: 0 };
    projects.forEach(p => {
      const l = getStatusLabel(p);
      if (l === 'warning') counts.warning++;
      if (l === 'critical') counts.critical++;
    });
    return [
      { value: 'all', label: 'TODOS', icon: 'all', count: counts.all },
      { value: 'warning', label: 'ALERTA', icon: 'warning', count: counts.warning },
      { value: 'critical', label: 'CRÍTICO', icon: 'critical', count: counts.critical },
    ];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter !== 'all' && getStatusLabel(p) !== statusFilter) return false;
      if (dateFrom || dateTo) {
        const c = new Date(p.created_at);
        if (dateFrom && c < new Date(dateFrom)) return false;
        if (dateTo && c > new Date(dateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [projects, statusFilter, dateFrom, dateTo]);

  const ordersGroupedByFile = useMemo(() => {
    const groups = {};
    const manual = [];
    projectOrders.forEach(o => {
      if (o.source_filename) {
        if (!groups[o.source_filename]) {
          groups[o.source_filename] = { filename: o.source_filename, orders: [], imported_at: o.imported_at, allPaid: true, allDelivered: true, paidCount: 0, deliveredCount: 0, totalCount: 0 };
        }
        const g = groups[o.source_filename];
        g.orders.push(o); g.totalCount++;
        if (o.payment_confirmed) g.paidCount++; else g.allPaid = false;
        if (o.delivery_confirmed) g.deliveredCount++; else g.allDelivered = false;
      } else {
        manual.push(o);
      }
    });
    const result = Object.values(groups).sort((a, b) => new Date(b.imported_at) - new Date(a.imported_at));
    if (manual.length > 0) {
      let manualPaid = 0, manualDelivered = 0;
      for (const o of manual) {
        if (o.payment_confirmed) manualPaid++;
        if (o.delivery_confirmed) manualDelivered++;
      }
      result.push({
        filename: null, orders: manual, imported_at: null,
        allPaid: manualPaid === manual.length,
        allDelivered: manualDelivered === manual.length,
        paidCount: manualPaid,
        deliveredCount: manualDelivered,
        totalCount: manual.length,
      });
    }
    return result;
  }, [projectOrders]);

  // Pie chart
  const usagePercent = selectedProject ? Math.min(100, parseFloat(selectedProject.usage_percent || 0)).toFixed(1) : 0;

  const pieSegments = useMemo(() => {
    if (!selectedProject) return { retainedAngle: 0, spentAngle: 0, availableAngle: 360 };
    const total = parseFloat(selectedProject.total_amount || 0);
    if (total === 0) return { retainedAngle: 0, spentAngle: 0, availableAngle: 360 };
    const retained = parseFloat(selectedProject.retained_amount || 0);
    const spent = parseFloat(projectSummary.spent || 0);
    const avail = parseFloat(projectSummary.remaining || selectedProject.available_amount || 0);
    return { retainedAngle: (retained / total) * 360, spentAngle: (spent / total) * 360, availableAngle: (avail / total) * 360 };
  }, [selectedProject, projectSummary]);

  const getPieSegmentPath = useCallback((segment) => {
    const segs = pieSegments;
    const r = 45, cx = 60, cy = 60;
    let start = 0, angle = 0;
    if (segment === 'retained') { angle = segs.retainedAngle; }
    else if (segment === 'spent') { start = segs.retainedAngle; angle = segs.spentAngle; }
    else { start = segs.retainedAngle + segs.spentAngle; angle = segs.availableAngle; }
    const sRad = (start - 90) * Math.PI / 180;
    const eRad = (start + angle - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(sRad), y1 = cy + r * Math.sin(sRad);
    const x2 = cx + r * Math.cos(eRad), y2 = cy + r * Math.sin(eRad);
    const large = angle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }, [pieSegments]);

  const spentColor = selectedProject
    ? (parseFloat(usagePercent) >= (selectedProject.spending_threshold || 75) ? '#ef4444' : '#f59e0b')
    : '#f59e0b';

  const nextItemNumber = projectOrders.length === 0 ? 1 : Math.max(...projectOrders.map(o => o.item_number || 0)) + 1;

  const availableWorkersFiltered = useMemo(() => {
    const assigned = new Set(projectWorkers.map(w => w.id));
    return allWorkers.filter(w => !assigned.has(w.id));
  }, [allWorkers, projectWorkers]);

  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  /* ---------- TOAST ---------- */
  const showToastMsg = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  /* ---------- DARK MODE ---------- */
  const toggleDarkMode = useCallback(() => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  }, []);

  /* ---------- FLATPICKR ---------- */
  const initDatePickers = useCallback(async () => {
    try {
      if (dateFromPickerRef.current) { dateFromPickerRef.current.destroy(); dateFromPickerRef.current = null; }
      if (dateToPickerRef.current) { dateToPickerRef.current.destroy(); dateToPickerRef.current = null; }
      const fp = await ensureFlatpickr();
      const common = { dateFormat: 'Y-m-d', allowInput: false, disableMobile: true, locale: fp?.l10ns?.es || 'es', clickOpens: true, monthSelectorType: 'static', appendTo: document.body };
      if (dateFromInputRef.current) {
        dateFromPickerRef.current = fp(dateFromInputRef.current, { ...common, onChange: (sel) => { const iso = sel[0] ? formatIso(sel[0]) : ''; setDateFrom(iso); setDateFromDisplay(formatDisplayFromIso(iso)); } });
      }
      if (dateToInputRef.current) {
        dateToPickerRef.current = fp(dateToInputRef.current, { ...common, onChange: (sel) => { const iso = sel[0] ? formatIso(sel[0]) : ''; setDateTo(iso); setDateToDisplay(formatDisplayFromIso(iso)); } });
      }
    } catch (e) { console.error('Flatpickr load error', e); }
  }, []);

  const destroyDatePickers = useCallback(() => {
    if (dateFromPickerRef.current) { dateFromPickerRef.current.destroy(); dateFromPickerRef.current = null; }
    if (dateToPickerRef.current) { dateToPickerRef.current.destroy(); dateToPickerRef.current = null; }
  }, []);

  const openDateFromPicker = useCallback(async () => {
    if (!dateFromPickerRef.current) await initDatePickers();
    if (dateFromPickerRef.current) dateFromPickerRef.current.open();
  }, [initDatePickers]);

  const openDateToPicker = useCallback(async () => {
    if (!dateToPickerRef.current) await initDatePickers();
    if (dateToPickerRef.current) dateToPickerRef.current.open();
  }, [initDatePickers]);

  const clearDateFilters = useCallback(() => {
    setDateFrom(''); setDateTo(''); setDateFromDisplay(''); setDateToDisplay('');
    if (dateFromPickerRef.current) dateFromPickerRef.current.clear();
    if (dateToPickerRef.current) dateToPickerRef.current.clear();
  }, []);

  // Init/destroy pickers on project selection change
  useEffect(() => {
    if (selectedProject) { destroyDatePickers(); return; }
    const t = setTimeout(() => initDatePickers(), 50);
    return () => clearTimeout(t);
  }, [selectedProject, initDatePickers, destroyDatePickers]);

  /* ---------- DATA LOADING ---------- */
  const loadProjects = useCallback(async (showLoad = false) => {
    if (showLoad) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/list`);
      const data = await res.json();
      if (data.success) {
        const np = data.projects || [];
        setProjects(prev => { if (arraysEqual(prev, np)) return prev; saveToCache('projects', np); return np; });
      }
    } catch (e) { console.error(e); }
    if (showLoad) setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(prev => { if (JSON.stringify(prev) === JSON.stringify(data.stats)) return prev; saveToCache('stats', data.stats); return data.stats; });
      }
    } catch (e) { console.error(e); }
  }, []);

  const loadSupervisors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/supervisors`);
      const data = await res.json();
      if (data.success) setSupervisors(data.supervisors || []);
    } catch {}
  }, []);

  const loadAllWorkers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/workers`);
      const data = await res.json();
      if (data.success) setAllWorkers(data.workers || []);
    } catch {}
  }, []);

  const selectProject = useCallback(async (project) => {
    try {
      const id = typeof project === 'object' ? project.id : project;
      const res = await fetch(`${API_BASE}/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedProject(data.project);
        setProjectWorkers(data.workers || []);
        setProjectOrders(data.orders || []);
        setProjectSummary(data.summary || {});
        setEditForm({ name: data.project.name, spending_threshold: data.project.spending_threshold, supervisor_id: data.project.supervisor_id });
      }
    } catch (e) { console.error(e); }
  }, []);

  const loadPaidOrders = useCallback(async (projId) => {
    const pid = projId || selectedProjectRef.current?.id;
    if (!pid) return;
    setLoadingPaidOrders(true);
    try {
      const res = await fetch(`${API_BASE}/${pid}/paid-orders`);
      const data = await res.json();
      if (data.success) { setPaidOrders(prev => arraysEqual(prev, data.orders) ? prev : data.orders); }
    } catch {}
    setLoadingPaidOrders(false);
  }, []);

  const refreshSelectedProject = useCallback(async () => {
    const proj = selectedProjectRef.current;
    if (!proj) return;
    try {
      const res = await fetch(`${API_BASE}/${proj.id}`);
      const data = await res.json();
      if (data.success) {
        const np = data.project, nw = data.workers || [], no = data.orders || [], ns = data.summary || {};
        setSelectedProject(prev => JSON.stringify(prev) === JSON.stringify(np) ? prev : np);
        setProjectWorkers(prev => arraysEqual(prev, nw) ? prev : nw);
        setProjectOrders(prev => arraysEqual(prev, no) ? prev : no);
        setProjectSummary(prev => JSON.stringify(prev) === JSON.stringify(ns) ? prev : ns);
        if (np) setEditForm({ name: np.name, spending_threshold: np.spending_threshold, supervisor_id: np.supervisor_id });
        if (isSupervisor) loadPaidOrders(np.id);
      }
    } catch {}
  }, [isSupervisor, loadPaidOrders]);

  /* ---------- ACTIONS ---------- */
  const goBack = useCallback(() => { window.location.href = '/'; }, []);

  const handleProjectStateClick = useCallback(async (project) => {
    if (!project || !canFinalizeProject(project) || updatingProjectState) return;
    setUpdatingProjectState(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${project.id}`, { method: 'PUT', body: JSON.stringify({ status: 'completed' }) });
      const data = await res.json();
      if (data.success) { showToastMsg('Proyecto finalizado'); await loadProjects(); if (selectedProjectRef.current?.id === project.id) await selectProject(project.id); }
      else showToastMsg(data.message || 'Error al actualizar estado', 'error');
    } catch { showToastMsg('Error de conexión', 'error'); }
    setUpdatingProjectState(false);
  }, [updatingProjectState, loadProjects, selectProject, showToastMsg]);

  // Toggle file section
  const toggleFileSection = useCallback((filename) => {
    const key = filename || '__manual__';
    setExpandedFiles(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Confirm modal
  const openConfirmModal = useCallback(({ title, message, actionLabel = 'Confirmar', variant = '', onConfirm }) => {
    setConfirmTitle(title); setConfirmMessage(message);
    setConfirmActionLabel(actionLabel); setConfirmActionVariant(variant);
    confirmActionRef.current = onConfirm; setConfirmProcessing(false); setShowConfirmModal(true);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setShowConfirmModal(false); setConfirmProcessing(false); confirmActionRef.current = null; setConfirmActionVariant('');
  }, []);

  const runConfirmAction = useCallback(async () => {
    if (!confirmActionRef.current || confirmProcessing) return;
    setConfirmProcessing(true);
    try { await confirmActionRef.current(); } finally { closeConfirmModal(); }
  }, [confirmProcessing, closeConfirmModal]);

  // File delivery
  const confirmFileDelivery = useCallback((group) => {
    openConfirmModal({
      title: 'Confirmar entrega',
      message: `¿Marcar todos los ${group.orders.length} items de "${group.filename || 'Órdenes Manuales'}" como entregados?`,
      actionLabel: 'Confirmar', variant: 'primary',
      onConfirm: async () => {
        try {
          const ids = group.orders.map(o => o.id);
          const res = await fetchWithCsrf(`${API_BASE}/confirm-file-delivery`, { method: 'POST', body: JSON.stringify({ order_ids: ids }) });
          const data = await res.json();
          if (data.success) { showToastMsg(`${data.updated || ids.length} items marcados como entregados`); if (selectedProjectRef.current) await selectProject(selectedProjectRef.current.id); }
          else showToastMsg(data.message || 'Error', 'error');
        } catch { showToastMsg('Error de conexión', 'error'); }
      }
    });
  }, [openConfirmModal, showToastMsg, selectProject]);

  // Delivery modal
  const openDeliveryModal = useCallback((order) => { setSelectedOrderForDelivery(order); setDeliveryNotes(''); setShowDeliveryModal(true); }, []);
  const closeDeliveryModal = useCallback(() => { setShowDeliveryModal(false); setSelectedOrderForDelivery(null); setDeliveryNotes(''); }, []);

  const confirmDeliveryOrder = useCallback(async () => {
    if (!selectedOrderForDelivery) return;
    setConfirmingDelivery(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/orders/${selectedOrderForDelivery.id}/confirm-delivery`, { method: 'POST', body: JSON.stringify({ notes: deliveryNotes }) });
      const data = await res.json();
      if (data.success) { showToastMsg('Entrega confirmada'); closeDeliveryModal(); loadPaidOrders(); }
      else showToastMsg(data.message || 'Error', 'error');
    } catch { showToastMsg('Error al confirmar', 'error'); }
    setConfirmingDelivery(false);
  }, [selectedOrderForDelivery, deliveryNotes, showToastMsg, closeDeliveryModal, loadPaidOrders]);

  // Workers
  const addWorkerToProject = useCallback(async () => {
    if (!selectedWorkerId || !selectedProjectRef.current) return;
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${selectedProjectRef.current.id}/workers`, { method: 'POST', body: JSON.stringify({ trabajador_id: selectedWorkerId }) });
      const data = await res.json();
      if (data.success) { showToastMsg('Trabajador agregado'); setSelectedWorkerId(''); await selectProject(selectedProjectRef.current.id); }
      else showToastMsg(data.message || 'Error', 'error');
    } catch { showToastMsg('Error', 'error'); }
  }, [selectedWorkerId, selectProject, showToastMsg]);

  const removeWorkerFromProject = useCallback(async (trabajadorId) => {
    if (!selectedProjectRef.current) return;
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${selectedProjectRef.current.id}/workers/${trabajadorId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToastMsg('Trabajador removido'); await selectProject(selectedProjectRef.current.id); }
    } catch { showToastMsg('Error', 'error'); }
  }, [selectProject, showToastMsg]);

  // Orders
  const createOrder = useCallback(async () => {
    if (!selectedProjectRef.current || !materialForm.description || !materialForm.qty) return;
    setSavingOrder(true);
    try {
      const mats = [{ name: materialForm.description.trim(), qty: materialForm.qty }];
      const res = await fetchWithCsrf(`${API_BASE}/${selectedProjectRef.current.id}/order`, {
        method: 'POST', body: JSON.stringify({ type: 'material', description: materialForm.description.trim(), materials: mats, unit: materialForm.unit, diameter: materialForm.diameter || null, series: materialForm.series || null, material_type: materialForm.material_type || null, item_number: materialForm.item_number || null })
      });
      const data = await res.json();
      if (data.success) { showToastMsg('Material enviado a aprobación'); setMaterialForm({ item_number: null, qty: 1, unit: '', description: '', diameter: '', series: '', material_type: '' }); await selectProject(selectedProjectRef.current.id); }
      else showToastMsg(data.message || 'Error', 'error');
    } catch { showToastMsg('Error', 'error'); }
    setSavingOrder(false);
  }, [materialForm, selectProject, showToastMsg]);

  // Approve / Reject
  const approveMaterial = useCallback((orderId) => {
    openConfirmModal({
      title: 'Aprobar material', message: '¿Aprobar este material y enviarlo al módulo de Compras?', actionLabel: 'Aprobar', variant: 'success',
      onConfirm: async () => {
        try {
          const res = await fetchWithCsrf(`${API_BASE}/orders/${orderId}/approve`, { method: 'POST' });
          const data = await res.json();
          if (data.success) { showToastMsg(data.message || 'Material aprobado'); await selectProject(selectedProjectRef.current.id); }
          else showToastMsg(data.message || 'Error', 'error');
        } catch { showToastMsg('Error al aprobar', 'error'); }
      }
    });
  }, [openConfirmModal, selectProject, showToastMsg]);

  const approveMaterialsBulk = useCallback((orderIds, titleLabel) => {
    if (!orderIds?.length) return;
    openConfirmModal({
      title: titleLabel, message: `¿Aprobar ${orderIds.length} items y enviarlos al módulo de Compras?`, actionLabel: 'Aprobar', variant: 'success',
      onConfirm: async () => {
        const results = await Promise.allSettled(
          orderIds.map(id =>
            fetchWithCsrf(`${API_BASE}/orders/${id}/approve`, { method: 'POST' }).then(r => r.json())
          )
        );
        let ok = 0, fail = 0;
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.success) ok++; else fail++;
        }
        if (ok) { showToastMsg(`${ok} items aprobados`); await selectProject(selectedProjectRef.current.id); }
        if (fail) showToastMsg(`${fail} items no pudieron aprobarse`, 'error');
      }
    });
  }, [openConfirmModal, selectProject, showToastMsg]);

  // Group helpers
  const getGroupKey = (g) => g?.filename || '__manual__';
  const getGroupDraftOrders = (g) => (g?.orders || []).filter(o => o.status === 'draft');
  const getSelectedIds = useCallback((g) => selectedOrders[getGroupKey(g)] || [], [selectedOrders]);
  const getSelectedCount = useCallback((g) => getSelectedIds(g).length, [getSelectedIds]);

  const isOrderSelected = useCallback((g, orderId) => {
    const ids = selectedOrders[getGroupKey(g)] || [];
    return ids.includes(orderId);
  }, [selectedOrders]);

  const toggleOrderSelection = useCallback((g, order) => {
    if (!order || order.status !== 'draft') return;
    const key = getGroupKey(g);
    setSelectedOrders(prev => {
      const current = new Set(prev[key] || []);
      if (current.has(order.id)) current.delete(order.id); else current.add(order.id);
      return { ...prev, [key]: Array.from(current) };
    });
  }, []);

  const clearGroupSelection = useCallback((g) => {
    const key = getGroupKey(g);
    setSelectedOrders(prev => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  const approveAllInGroup = useCallback((g) => { approveMaterialsBulk(getGroupDraftOrders(g).map(o => o.id), 'Aprobar toda la lista'); clearGroupSelection(g); }, [approveMaterialsBulk, clearGroupSelection]);
  const approveSelectedInGroup = useCallback((g) => { const ids = getSelectedIds(g); if (!ids.length) return; approveMaterialsBulk(ids, 'Aprobar seleccionados'); clearGroupSelection(g); }, [approveMaterialsBulk, getSelectedIds, clearGroupSelection]);

  const rejectMaterial = useCallback(async (orderId) => {
    const notes = prompt('¿Por qué se rechaza este material? (opcional)');
    if (notes === null) return;
    try {
      const res = await fetchWithCsrf(`${API_BASE}/orders/${orderId}/reject`, { method: 'POST', body: JSON.stringify({ notes: notes || 'Rechazado por el Jefe de Proyectos' }) });
      const data = await res.json();
      if (data.success) { showToastMsg(data.message || 'Material rechazado'); await selectProject(selectedProjectRef.current.id); }
      else showToastMsg(data.message || 'Error', 'error');
    } catch { showToastMsg('Error al rechazar', 'error'); }
  }, [selectProject, showToastMsg]);

  // Import / Export
  const downloadTemplate = useCallback(() => { window.location.href = `${API_BASE}/material-template`; }, []);

  const importExcel = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedProjectRef.current) return;
    setImportingFile(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('check_duplicate', 'true');
      const res = await fetch(`${API_BASE}/${selectedProjectRef.current.id}/import-materials`, { method: 'POST', headers: { 'X-CSRF-TOKEN': getCsrfToken() }, body: fd });
      const data = await res.json();
      if (data.duplicate) {
        setDuplicateData({ originalFilename: data.originalFilename, existingId: data.existingId, file, skipDuplicate: false });
        setShowDuplicateModal(true);
      } else if (data.preview) {
        setImportPreviewItems(data.preview.items.map((it, i) => ({ number: i + 1, quantity: it.quantity || 1, unit: it.unit || 'UND', description: it.description || '', diameter: it.diameter || '', series: it.series || '', material_type: it.material_type || '' })));
        pendingImportFile.current = file;
        setShowImportPreview(true);
      } else if (data.success) { showToastMsg(data.message); await selectProject(selectedProjectRef.current.id); }
      else showToastMsg(data.message || 'Error al procesar archivo', 'error');
    } catch (err) { showToastMsg('Error al importar: ' + err.message, 'error'); }
    setImportingFile(false);
    e.target.value = '';
  }, [selectProject, showToastMsg]);

  const confirmImport = useCallback(async () => {
    if (!pendingImportFile.current || !selectedProjectRef.current) return;
    setImportingFile(true);
    try {
      const fd = new FormData(); fd.append('file', pendingImportFile.current); fd.append('confirmed_import', 'true');
      const res = await fetch(`${API_BASE}/${selectedProjectRef.current.id}/import-materials`, { method: 'POST', headers: { 'X-CSRF-TOKEN': getCsrfToken() }, body: fd });
      const data = await res.json();
      if (data.success) { setShowImportPreview(false); showToastMsg(data.message); await selectProject(selectedProjectRef.current.id); }
      else if (data.duplicate) { setDuplicateData({ originalFilename: data.originalFilename, existingId: data.existingId, file: pendingImportFile.current }); setShowImportPreview(false); setShowDuplicateModal(true); }
      else showToastMsg(data.message || 'Error al importar', 'error');
    } catch { showToastMsg('Error al importar archivo', 'error'); }
    setImportingFile(false); pendingImportFile.current = null;
  }, [selectProject, showToastMsg]);

  const confirmDuplicateUpload = useCallback(async (renameFile = false) => {
    if (!duplicateData) return;
    setImportingFile(true);
    try {
      const fd = new FormData(); fd.append('file', duplicateData.file); fd.append('rename_duplicate', renameFile.toString());
      const res = await fetch(`${API_BASE}/${selectedProjectRef.current.id}/import-materials`, { method: 'POST', headers: { 'X-CSRF-TOKEN': getCsrfToken() }, body: fd });
      const data = await res.json();
      if (data.success) { showToastMsg(data.message); await selectProject(selectedProjectRef.current.id); }
      else showToastMsg(data.message || 'Error al importar', 'error');
    } catch { showToastMsg('Error al importar archivo', 'error'); }
    setImportingFile(false); setShowDuplicateModal(false); setDuplicateData(null);
  }, [duplicateData, selectProject, showToastMsg]);

  // Project CRUD
  const openCreateModal = useCallback(() => {
    setForm({ name: '', currency: 'PEN', amount: 0, threshold: 75, igv_enabled: true, igv_rate: 18, supervisor_id: '' });
    setErrorMessage(''); setShowCreateModal(true); loadSupervisors();
  }, [loadSupervisors]);

  const createProject = useCallback(async () => {
    if (!form.name || form.amount <= 0 || !form.supervisor_id) { setErrorMessage('Complete todos los campos'); return; }
    setSaving(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/create`, { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { showToastMsg('Proyecto creado'); setShowCreateModal(false); await Promise.all([loadProjects(), loadStats()]); }
      else setErrorMessage(data.message || 'Error');
    } catch { setErrorMessage('Error'); }
    setSaving(false);
  }, [form, loadProjects, loadStats, showToastMsg]);

  const updateProject = useCallback(async () => {
    if (!selectedProjectRef.current) return;
    setSaving(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${selectedProjectRef.current.id}`, { method: 'PUT', body: JSON.stringify(editForm) });
      const data = await res.json();
      if (data.success) { showToastMsg('Actualizado'); await loadProjects(); await selectProject(selectedProjectRef.current.id); }
      else showToastMsg(data.message || 'Error', 'error');
    } catch { showToastMsg('Error', 'error'); }
    setSaving(false);
  }, [editForm, loadProjects, selectProject, showToastMsg]);

  const confirmDeleteProject = useCallback(() => {
    if (!selectedProjectRef.current) return;
    openConfirmModal({
      title: 'Eliminar proyecto', message: `¿Eliminar "${selectedProjectRef.current.name}"?`, actionLabel: 'Eliminar', variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetchWithCsrf(`${API_BASE}/${selectedProjectRef.current.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { showToastMsg('Eliminado'); setSelectedProject(null); await Promise.all([loadProjects(), loadStats()]); }
        } catch { showToastMsg('Error', 'error'); }
      }
    });
  }, [openConfirmModal, loadProjects, loadStats, showToastMsg]);

  /* ---------- LIFECYCLE ---------- */
  useEffect(() => {
    if (didInit) return;
    didInit = true;

    // Dark mode init
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true' || document.body.classList.contains('dark-mode')) document.body.classList.add('dark-mode');

    // Background fetch
    loadProjects();
    loadStats();
    loadSupervisors();
    if (isSupervisor) loadAllWorkers();

    // Polling
    pollingRef.current = setInterval(() => {
      loadProjects(); loadStats(); refreshSelectedProject();
    }, POLLING_MS);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); destroyDatePickers(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load paid orders when selecting project as supervisor
  useEffect(() => {
    if (selectedProject && isSupervisor) loadPaidOrders(selectedProject.id);
  }, [selectedProject, isSupervisor, loadPaidOrders]);

  /* ============================================
     JSX RENDER
     ============================================ */
  return (
    <div className="proyectos-layout">
      <div className="proyectos-bg" />
      <div className="proyectos-container">

        {/* -------- PROJECT DETAIL VIEW -------- */}
        {selectedProject ? (
          <div className="project-detail">
            {/* Detail Header */}
            <div className="project-detail-header">
              <div className="header-left-section">
                <button className="btn-back-projects" onClick={() => setSelectedProject(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
                <span className="project-name-pill" style={{ background: getProjectColor(selectedProject.id) }}>
                  {selectedProject.name}
                </span>
                <span className="currency-pill">{getCurrencySymbol(selectedProject.currency)} {selectedProject.currency}</span>
                <span
                  className={`project-state-pill ${getProjectStateClass(selectedProject)}${canFinalizeProject(selectedProject) ? ' clickable' : ''}`}
                  onClick={() => canFinalizeProject(selectedProject) && handleProjectStateClick(selectedProject)}
                  title={canFinalizeProject(selectedProject) ? 'Click para finalizar proyecto' : ''}
                >
                  {getProjectStateClass(selectedProject) === 'completed' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  )}
                  {getProjectStateLabel(selectedProject)}
                </span>
                <span className="project-age-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {getProjectDaysAlive(selectedProject)} días
                </span>
              </div>
              <div className="header-right">
                <button className="theme-toggle" onClick={toggleDarkMode}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                </button>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="project-stats-panel">
              <div className="stats-list">
                <div className="stat-row">
                  <span className="stat-label">Monto Adjudicado</span>
                  <span className="stat-value primary">{getCurrencySymbol(selectedProject.currency)} {formatNumber(selectedProject.total_amount)}</span>
                </div>
                <div className="stat-row retained-row">
                  <span className="stat-label">Retenido</span>
                  <span className="stat-value muted">{getCurrencySymbol(selectedProject.currency)} {formatNumber(selectedProject.retained_amount)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Real Disponible</span>
                  <span className="stat-value success">{getCurrencySymbol(selectedProject.currency)} {formatNumber(parseFloat(selectedProject.total_amount || 0) - parseFloat(selectedProject.retained_amount || 0))}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Gastado</span>
                  <span className="stat-value warning">{getCurrencySymbol(selectedProject.currency)} {formatNumber(projectSummary.spent)}</span>
                </div>
                <div className="stat-row available-row">
                  <span className="stat-label">Disponible Actual</span>
                  <span className="stat-value info">{getCurrencySymbol(selectedProject.currency)} {formatNumber(projectSummary.remaining || selectedProject.available_amount)}</span>
                </div>
                <div className="stat-row threshold-row">
                  <span className="stat-label">Umbral ({selectedProject.spending_threshold || 75}%)</span>
                  <span className="stat-value threshold">{usagePercent}% usado</span>
                  <span className="threshold-amount">{getCurrencySymbol(selectedProject.currency)} {formatNumber((parseFloat(selectedProject.total_amount || 0) * (selectedProject.spending_threshold || 75)) / 100)}</span>
                </div>
              </div>
              <div className="expense-chart">
                <svg className="pie-chart" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="45" fill="#e2e8f0" />
                  {pieSegments.retainedAngle > 0 && <path d={getPieSegmentPath('retained')} fill="#94a3b8" />}
                  {pieSegments.spentAngle > 0 && <path d={getPieSegmentPath('spent')} fill={spentColor} />}
                  {pieSegments.availableAngle > 0 && <path d={getPieSegmentPath('available')} fill="#3b82f6" />}
                  <circle cx="60" cy="60" r="25" fill="var(--proyectos-bg-card)" />
                  <text x="60" y="58" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--proyectos-text-dark)">{usagePercent}%</text>
                  <text x="60" y="70" textAnchor="middle" fontSize="5" fill="var(--proyectos-text-gray)">USADO</text>
                </svg>
              </div>
            </div>

            {/* Detail Grid */}
            <div className="detail-grid">
              {/* LEFT COLUMN: Workers + Material Form */}
              <div>
                {/* Supervisor Workers Section */}
                {isSupervisor && (
                  <div className="section-box">
                    <h3>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      Trabajadores
                    </h3>
                    <div className="add-worker-row">
                      <select className="select-field" value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)}>
                        <option value="">Seleccionar trabajador...</option>
                        {availableWorkersFiltered.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                      <button className="btn-add" onClick={addWorkerToProject} disabled={!selectedWorkerId}>Agregar</button>
                    </div>
                    {projectWorkers.length > 0 ? (
                      <ul className="workers-list">
                        {projectWorkers.map(w => (
                          <li key={w.id}>
                            <span>{w.name}</span>
                            <button className="btn-remove" onClick={() => removeWorkerFromProject(w.id)}>×</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="empty-list">Sin trabajadores asignados</div>
                    )}
                  </div>
                )}

                {/* Material Specification Form */}
                {isSupervisor && (
                  <div className="section-box">
                    <h3>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                      Especificación de Material
                    </h3>
                    <div className="material-form">
                      <div className="material-form-row">
                        <div className="form-group-sm">
                          <label>Item</label>
                          <input className="input-field" type="number" placeholder={nextItemNumber} value={materialForm.item_number || ''} onChange={e => setMaterialForm(p => ({ ...p, item_number: e.target.value ? parseInt(e.target.value) : null }))} />
                        </div>
                        <div className="form-group-sm">
                          <label>Cant.</label>
                          <input className="input-field" type="number" min="1" value={materialForm.qty} onChange={e => setMaterialForm(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} />
                        </div>
                        <div className="form-group-md">
                          <label>Unidad</label>
                          <select className="select-field" value={materialForm.unit} onChange={e => setMaterialForm(p => ({ ...p, unit: e.target.value }))}>
                            <option value="">Seleccionar</option>
                            <option value="UND">UND</option>
                            <option value="M">M</option>
                            <option value="KG">KG</option>
                            <option value="GL">GL</option>
                            <option value="PZA">PZA</option>
                            <option value="JGO">JGO</option>
                            <option value="PAR">PAR</option>
                            <option value="ROLLO">ROLLO</option>
                          </select>
                        </div>
                        <div className="form-group-lg">
                          <label>Descripción</label>
                          <input className="input-field" type="text" placeholder="Descripción del material..." value={materialForm.description} onChange={e => setMaterialForm(p => ({ ...p, description: e.target.value }))} />
                        </div>
                      </div>
                      <div className="material-form-row">
                        <div className="form-group-md">
                          <label>Diámetro</label>
                          <input className="input-field" type="text" placeholder="Ej: 1/2&quot;" value={materialForm.diameter} onChange={e => setMaterialForm(p => ({ ...p, diameter: e.target.value }))} />
                        </div>
                        <div className="form-group-md">
                          <label>Serie</label>
                          <input className="input-field" type="text" placeholder="Ej: SCH-40" value={materialForm.series} onChange={e => setMaterialForm(p => ({ ...p, series: e.target.value }))} />
                        </div>
                        <div className="form-group-md">
                          <label>Material</label>
                          <input className="input-field" type="text" placeholder="Ej: A-106 Gr.B" value={materialForm.material_type} onChange={e => setMaterialForm(p => ({ ...p, material_type: e.target.value }))} />
                        </div>
                      </div>
                      <div className="material-form-actions">
                        <div className="actions-left">
                          <button className="btn-add-material" onClick={createOrder} disabled={savingOrder || !materialForm.description || !materialForm.qty}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            {savingOrder ? 'Enviando...' : 'Agregar Material'}
                          </button>
                        </div>
                        <div className="actions-right">
                          <button className="btn-download-template" onClick={downloadTemplate}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Plantilla
                          </button>
                          <label className="btn-import-excel">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            {importingFile ? 'Importando...' : 'Importar Excel'}
                            <input type="file" accept=".xlsx,.xls" onChange={importExcel} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Orders grouped by file */}
              <div className="orders-section">
                <div className="section-box">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    Materiales / Órdenes
                  </h3>

                  {ordersGroupedByFile.length === 0 ? (
                    <div className="empty-list">No hay órdenes aún</div>
                  ) : (
                    <div className="file-groups-container">
                      {ordersGroupedByFile.map((group, gi) => {
                        const gKey = getGroupKey(group);
                        const isExpanded = expandedFiles[gKey];
                        const draftOrders = getGroupDraftOrders(group);
                        const selectedCount = getSelectedCount(group);
                        return (
                          <div className="file-group" key={gKey}>
                            <div
                              className={`file-group-header${isExpanded ? ' expanded' : ''}${group.allPaid ? ' all-paid' : ''}`}
                              onClick={() => toggleFileSection(group.filename)}
                            >
                              <div className="file-header-left">
                                <svg className="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                                <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                <span className="file-name">{group.filename || 'Órdenes Manuales'}</span>
                              </div>
                              <div className="file-header-right">
                                {!isSupervisor && draftOrders.length > 0 && (
                                  <div className="file-header-actions" onClick={e => e.stopPropagation()}>
                                    {selectedCount > 0 && (
                                      <button className="btn-bulk-approve outline" onClick={() => approveSelectedInGroup(group)}>
                                        Aprobar {selectedCount}
                                      </button>
                                    )}
                                    <button className="btn-bulk-approve" onClick={() => approveAllInGroup(group)}>
                                      Aprobar Todo ({draftOrders.length})
                                    </button>
                                  </div>
                                )}
                                {group.allPaid && !group.allDelivered && isSupervisor && (
                                  <button className="btn-confirm-all" onClick={e => { e.stopPropagation(); confirmFileDelivery(group); }}>
                                    ✓ Confirmar Entrega
                                  </button>
                                )}
                                <span className="file-count">{group.totalCount} items</span>
                                <span className={`file-status-badge${group.allDelivered ? ' delivered' : group.allPaid ? ' complete' : ''}`}>
                                  {group.allDelivered ? 'Entregado' : group.allPaid ? 'Pagado' : `${group.paidCount}/${group.totalCount}`}
                                </span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="file-group-content">
                                <div className="table-scroll-container">
                                  <table className="materials-table">
                                    <thead>
                                      <tr>
                                        {!isSupervisor && <th className="col-select">
                                          <label className="select-checkbox">
                                            <input type="checkbox" disabled />
                                            <span className="checkmark" />
                                          </label>
                                        </th>}
                                        <th className="col-item">ITEM</th>
                                        <th className="col-cant">CANT.</th>
                                        <th className="col-und">UND</th>
                                        <th className="col-desc">DESCRIPCIÓN</th>
                                        <th className="col-diam">DIÁMETRO</th>
                                        <th className="col-serie">SERIE</th>
                                        <th className="col-mat">MATERIAL</th>
                                        <th className="col-estado">ESTADO</th>
                                        <th className="col-monto">MONTO</th>
                                        {!isSupervisor && <th className="col-actions">ACCIONES</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.orders.map(order => (
                                        <tr key={order.id} className={`row-${getOrderStatusClass(order).replace('status-', '')}`}>
                                          {!isSupervisor && (
                                            <td className="col-select">
                                              <label className="select-checkbox">
                                                <input type="checkbox" checked={isOrderSelected(group, order.id)} onChange={() => toggleOrderSelection(group, order)} disabled={order.status !== 'draft'} />
                                                <span className="checkmark" />
                                              </label>
                                            </td>
                                          )}
                                          <td className="col-item">{order.item_number || '-'}</td>
                                          <td className="col-cant">{getOrderQuantity(order)}</td>
                                          <td className="col-und">{order.unit || 'UND'}</td>
                                          <td className="col-desc">{order.description}</td>
                                          <td className="col-diam">{order.diameter || '-'}</td>
                                          <td className="col-serie">{order.series || '-'}</td>
                                          <td className="col-mat">{order.material_type || '-'}</td>
                                          <td className="col-estado">
                                            {order.amount === null && order.status === 'pending' ? (
                                              <span className="order-status status-unquoted">Por cotizar</span>
                                            ) : (
                                              <span className={`order-status ${getOrderStatusClass(order)}`}>
                                                {getOrderStatusLabel(order)}
                                              </span>
                                            )}
                                          </td>
                                          <td className="col-monto">
                                            {order.amount != null ? `${getCurrencySymbol(selectedProject.currency)} ${formatNumber(order.amount)}` : '-'}
                                          </td>
                                          {!isSupervisor && (
                                            <td className="col-actions">
                                              {order.status === 'draft' ? (
                                                <div className="action-buttons">
                                                  <button className="btn-approve" onClick={() => approveMaterial(order.id)} title="Aprobar y enviar a Compras">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                                  </button>
                                                  <button className="btn-reject" onClick={() => rejectMaterial(order.id)} title="Rechazar material">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                  </button>
                                                </div>
                                              ) : (
                                                <span className="no-actions">—</span>
                                              )}
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Section (non-supervisors: Sub-Gerente, Jefe de Proyectos) */}
            {!isSupervisor && (
              <div className="edit-section">
                <h3>Editar Proyecto</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input className="input-field" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Umbral (%)</label>
                    <input className="input-field" type="number" min="1" max="100" value={editForm.spending_threshold} onChange={e => setEditForm(p => ({ ...p, spending_threshold: parseInt(e.target.value) || 75 }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Supervisor</label>
                  <select className="select-field" value={editForm.supervisor_id || ''} onChange={e => setEditForm(p => ({ ...p, supervisor_id: e.target.value || null }))}>
                    <option value="">Sin supervisor</option>
                    {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button className="btn-submit" onClick={updateProject} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
                  <button className="btn-secondary" onClick={confirmDeleteProject}>Eliminar Proyecto</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* -------- PROJECTS LIST VIEW -------- */
          <>
            {/* Header */}
            <div className="module-header">
              <div className="header-left">
                <button className="btn-back" onClick={goBack}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
                <div className="title-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                </div>
                <h1>{isSupervisor ? 'MIS PROYECTOS ASIGNADOS' : 'GESTIÓN DE PROYECTOS'}</h1>
                {isSupervisor && (
                  <span className="role-badge supervisor">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    SUPERVISOR
                  </span>
                )}
              </div>
              <div className="header-right">
                <button className="theme-toggle" onClick={toggleDarkMode}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                </button>
                {!isSupervisor && (
                  <button className="btn-nuevo" onClick={openCreateModal}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Nuevo Proyecto
                  </button>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              {[
                { label: 'Total', value: stats.total_projects, bg: '#f59e0b', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg> },
                { label: 'Activos', value: stats.active_projects, bg: '#10b981', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
                { label: 'Presupuesto', value: `S/ ${formatNumber(stats.total_budget)}`, bg: '#3b82f6', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
                { label: 'Gastado', value: `S/ ${formatNumber(stats.total_spent)}`, bg: '#8b5cf6', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
              ].map((s, i) => (
                <div className="stat-card" key={i}>
                  <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                  <div className="stat-info">
                    <h3>{s.value}</h3>
                    <span>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
              {statusFilters.map(f => (
                <button key={f.value} className={`filter-btn${statusFilter === f.value ? ' active' : ''}`} onClick={() => setStatusFilter(f.value)}>
                  {f.label}
                  <span className="filter-count">{f.count}</span>
                </button>
              ))}
              <div className="filter-dates">
                <span className="date-label">Desde:</span>
                <div className="date-input-group">
                  <input ref={dateFromInputRef} type="text" readOnly placeholder="dd/mm/yyyy" value={dateFromDisplay} onClick={openDateFromPicker} />
                </div>
                <span className="date-label">Hasta:</span>
                <div className="date-input-group">
                  <input ref={dateToInputRef} type="text" readOnly placeholder="dd/mm/yyyy" value={dateToDisplay} onClick={openDateToPicker} />
                </div>
                {(dateFrom || dateTo) && (
                  <button className="btn-date-clear" onClick={clearDateFilters}>Limpiar</button>
                )}
              </div>
            </div>

            {/* Loading / Empty / Grid */}
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Cargando proyectos...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3>{isSupervisor ? 'No tienes proyectos asignados' : 'No hay proyectos'}</h3>
                <p>{isSupervisor ? 'Espera a que te asignen un proyecto' : 'No hay proyectos que coincidan con los filtros.'}</p>
                {!isSupervisor && (
                  <button className="btn-nuevo" onClick={openCreateModal} style={{ marginTop: '24px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Nuevo Proyecto
                  </button>
                )}
              </div>
            ) : (
              <div className="projects-grid">
                {filteredProjects.map(p => {
                  const sl = getStatusLabel(p);
                  return (
                    <div className="project-card" key={p.id} onClick={() => selectProject(p)}>
                      <div className="state-icon-container">
                        <div className={`state-icon ${getProjectStateClass(p)}`}>
                          {getProjectStateClass(p) === 'completed' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          )}
                        </div>
                      </div>
                      <h3>{p.name}</h3>
                      <p>{formatDate(p.created_at)} · {getStatusText(sl)}</p>
                      <span className="currency-badge">{p.currency}</span>
                      <div className="project-amounts">
                        <div className="amount-item">
                          <span className="label">Presupuesto</span>
                          <span className="value">{getCurrencySymbol(p.currency)} {formatNumber(p.total_amount)}</span>
                        </div>
                        <div className="amount-item">
                          <span className="label">Gastado</span>
                          <span className="value warning">{getCurrencySymbol(p.currency)} {formatNumber(p.spent_amount)}</span>
                        </div>
                        <div className="amount-item">
                          <span className="label">Disponible</span>
                          <span className="value success">{getCurrencySymbol(p.currency)} {formatNumber(p.available_amount)}</span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(100, parseFloat(p.usage_percent) || 0)}%` }} />
                      </div>
                      <small>{parseFloat(p.usage_percent || 0).toFixed(1)}% utilizado</small>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================================
         MODALS (portals)
         ============================================ */}

      {/* Delivery Modal */}
      {showDeliveryModal && createPortal(
        <div className="modal-overlay" onClick={closeDeliveryModal}>
          <div className="modal-content modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <svg className="modal-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                Confirmar Entrega
              </h2>
              <button className="btn-close" onClick={closeDeliveryModal}>×</button>
            </div>
            <div className="modal-body">
              <p>¿Confirmar la entrega de: <strong>{selectedOrderForDelivery?.description}</strong>?</p>
              <div className="form-group">
                <label>Notas (opcional)</label>
                <input className="input-field" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} placeholder="Notas de entrega..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDeliveryModal}>Cancelar</button>
              <button className="btn-submit" onClick={confirmDeliveryOrder} disabled={confirmingDelivery}>{confirmingDelivery ? 'Confirmando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Project Modal */}
      {showCreateModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <svg className="modal-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Nuevo Proyecto
              </h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {errorMessage && <div className="error">{errorMessage}</div>}
              <div className="form-group">
                <label>Nombre del Proyecto</label>
                <input className="input-field" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del proyecto" />
              </div>
              <div className="form-group">
                <label>Moneda</label>
                <div className="currency-switch">
                  {['PEN', 'USD'].map(c => (
                    <div key={c} className={`currency-option${form.currency === c ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, currency: c }))}>
                      {c === 'PEN' ? 'S/ Soles' : '$ Dólares'}
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Monto ({getCurrencySymbol(form.currency)})</label>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="form-group">
                  <label>Umbral Alerta (%)</label>
                  <input className="input-field" type="number" min="1" max="100" value={form.threshold} onChange={e => setForm(p => ({ ...p, threshold: parseInt(e.target.value) || 75 }))} />
                </div>
              </div>
              <div className="form-group">
                <label>IGV</label>
                <div className="igv-row">
                  <div className="checkbox-group">
                    <input type="checkbox" checked={form.igv_enabled} onChange={e => setForm(p => ({ ...p, igv_enabled: e.target.checked }))} />
                    <span>Incluir IGV</span>
                  </div>
                  {form.igv_enabled && (
                    <>
                      <span>Tasa:</span>
                      <input className="input-field igv-input" type="number" min="0" max="100" value={form.igv_rate} onChange={e => setForm(p => ({ ...p, igv_rate: parseInt(e.target.value) || 18 }))} />
                      <span>%</span>
                    </>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Supervisor</label>
                <select className="select-field" value={form.supervisor_id} onChange={e => setForm(p => ({ ...p, supervisor_id: e.target.value }))}>
                  <option value="">Seleccionar supervisor...</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancelar</button>
              <button className="btn-submit" onClick={createProject} disabled={saving}>{saving ? 'Creando...' : 'Crear Proyecto'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Modal */}
      {showConfirmModal && createPortal(
        <div className="modal-overlay" onClick={closeConfirmModal}>
          <div className="modal-content modal-md modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{confirmTitle}</h2>
            </div>
            <div className="modal-body">
              <p>{confirmMessage}</p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={closeConfirmModal}>Cancelar</button>
                <button className={`btn-confirm ${confirmActionVariant}`} onClick={runConfirmAction} disabled={confirmProcessing}>
                  {confirmProcessing ? 'Procesando...' : confirmActionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Import Preview Modal */}
      {showImportPreview && createPortal(
        <div className="modal-overlay" onClick={() => setShowImportPreview(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header import-modal-header">
              <h2 className="import-modal-title">Vista Previa de Importación</h2>
            </div>
            <div className="modal-body">
              <p className="import-preview-text">{importPreviewItems.length} materiales encontrados:</p>
              <div className="import-items-list">
                {importPreviewItems.map((it, i) => (
                  <div className="import-item-row" key={i}>
                    <div className="item-header">
                      <span className="item-number">{it.number}</span>
                      <span className="item-desc">{it.description}</span>
                    </div>
                    <div className="item-details">
                      <span className="detail">Cant: {it.quantity}</span>
                      <span className="detail">Und: {it.unit}</span>
                      {it.diameter && <span className="detail">Diám: {it.diameter}</span>}
                      {it.series && <span className="detail">Serie: {it.series}</span>}
                      {it.material_type && <span className="detail">Mat: {it.material_type}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer import-modal-footer">
              <button className="btn-cancel" onClick={() => setShowImportPreview(false)}>Cancelar</button>
              <button className="btn-submit" onClick={confirmImport} disabled={importingFile}>{importingFile ? 'Importando...' : 'Confirmar Importación'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Duplicate File Modal */}
      {showDuplicateModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowDuplicateModal(false)}>
          <div className="modal-content modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header duplicate-modal-header">
              <h2 className="duplicate-modal-title">Archivo Duplicado</h2>
            </div>
            <div className="modal-body duplicate-modal-body">
              <p className="duplicate-modal-text">El archivo <strong>"{duplicateData?.originalFilename}"</strong> ya fue importado anteriormente.</p>
              <p className="duplicate-modal-hint">Puede renombrarlo automáticamente o cancelar.</p>
            </div>
            <div className="modal-footer duplicate-modal-footer">
              <button className="btn-cancel" onClick={() => setShowDuplicateModal(false)}>Cancelar</button>
              <button className="btn-submit" onClick={() => confirmDuplicateUpload(true)} disabled={importingFile}>
                {importingFile ? 'Importando...' : 'Renombrar e Importar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
