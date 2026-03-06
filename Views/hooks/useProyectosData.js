/**
 * useProyectosData – All state, derived data & callbacks for the Proyectos module.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Spanish } from 'flatpickr/dist/l10n/es.js';

import {
  POLLING_MS, API_BASE, DEFAULT_MATERIAL_FORM, DEFAULT_SERVICE_FORM, DEFAULT_CREATE_FORM,
  arraysEqual, saveToCache, loadFromCache, fetchWithCsrf, getCsrfToken,
  formatIso, formatDisplayFromIso, getStatusLabel, getProjectStateClass,
  canFinalizeProject,
} from '../utils';

flatpickr.localize(Spanish);

let didInit = false;

export default function useProyectosData({ isSupervisor }) {
  /* -------- STATE -------- */
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

  const [materialForm, setMaterialForm] = useState({ ...DEFAULT_MATERIAL_FORM });
  const [serviceForm, setServiceForm] = useState({ ...DEFAULT_SERVICE_FORM });
  const [savingService, setSavingService] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [importingFile, setImportingFile] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreviewItems, setImportPreviewItems] = useState([]);
  const pendingImportFile = useRef(null);

  const [paidOrders, setPaidOrders] = useState([]);
  const [loadingPaidOrders, setLoadingPaidOrders] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateFromDisplay, setDateFromDisplay] = useState('');
  const [dateToDisplay, setDateToDisplay] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmActionLabel, setConfirmActionLabel] = useState('Confirmar');
  const [confirmActionVariant, setConfirmActionVariant] = useState('');
  const [confirmProcessing, setConfirmProcessing] = useState(false);
  const confirmActionRef = useRef(null);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [orderToReject, setOrderToReject] = useState(null);
  const [rejectingOrder, setRejectingOrder] = useState(false);
  const [rejectType, setRejectType] = useState('material'); // 'material' or 'service'

  // Completion Modal State (sobras de materiales)
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showCompletionApprovalModal, setShowCompletionApprovalModal] = useState(false);
  const [completionMaterials, setCompletionMaterials] = useState([]);
  const [completionRequest, setCompletionRequest] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);

  const [editForm, setEditForm] = useState({ name: '', spending_threshold: 75, supervisor_id: null });
  const [form, setForm] = useState({ ...DEFAULT_CREATE_FORM });
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const dateFromInputRef = useRef(null);
  const dateToInputRef = useRef(null);
  const dateFromPickerRef = useRef(null);
  const dateToPickerRef = useRef(null);
  const pollingRef = useRef(null);
  const selectedProjectRef = useRef(null);

  useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);

  /* -------- DERIVED -------- */
  const statusFilters = useMemo(() => {
    const counts = { all: projects.length, warning: 0, critical: 0 };
    projects.forEach(p => { const l = getStatusLabel(p); if (l === 'warning') counts.warning++; if (l === 'critical') counts.critical++; });
    return [
      { value: 'all', label: 'TODOS', count: counts.all },
      { value: 'warning', label: 'ALERTA', count: counts.warning },
      { value: 'critical', label: 'CRÍTICO', count: counts.critical },
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
    // Only include material orders (not services) in this section
    projectOrders.filter(o => (o.type || 'material') !== 'service').forEach(o => {
      if (o.source_filename) {
        if (!groups[o.source_filename]) {
          groups[o.source_filename] = {
            filename: o.source_filename, orders: [], imported_at: o.imported_at,
            allPaid: true, allDelivered: true, paidCount: 0, deliveredCount: 0, totalCount: 0,
          };
        }
        const g = groups[o.source_filename]; g.orders.push(o); g.totalCount++;
        if (o.payment_confirmed) g.paidCount++; else g.allPaid = false;
        if (o.delivery_confirmed) g.deliveredCount++; else g.allDelivered = false;
      } else { manual.push(o); }
    });
    const result = Object.values(groups).sort((a, b) => new Date(a.imported_at) - new Date(b.imported_at));
    const output = [];
    if (manual.length > 0) {
      let mp = 0, md = 0;
      for (const o of manual) { if (o.payment_confirmed) mp++; if (o.delivery_confirmed) md++; }
      output.push({
        filename: null, orders: manual, imported_at: null,
        allPaid: mp === manual.length, allDelivered: md === manual.length,
        paidCount: mp, deliveredCount: md, totalCount: manual.length,
      });
    }
    return [...output, ...result];
  }, [projectOrders]);

  const usagePercent = selectedProject
    ? Math.min(100, parseFloat(selectedProject.usage_percent || 0)).toFixed(1)
    : 0;

  const pieSegments = useMemo(() => {
    if (!selectedProject) return { retainedAngle: 0, spentAngle: 0, availableAngle: 360 };
    const total = parseFloat(selectedProject.total_amount || 0);
    if (total === 0) return { retainedAngle: 0, spentAngle: 0, availableAngle: 360 };
    const retained = parseFloat(selectedProject.retained_amount || 0);
    const spent = parseFloat(projectSummary.spent || 0);
    const avail = parseFloat(projectSummary.remaining || selectedProject.available_amount || 0);
    return {
      retainedAngle: (retained / total) * 360,
      spentAngle: (spent / total) * 360,
      availableAngle: (avail / total) * 360,
    };
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

  // Separate orders by type
  const materialOrders = useMemo(() => projectOrders.filter(o => (o.type || 'material') !== 'service'), [projectOrders]);
  const serviceOrders = useMemo(() => projectOrders.filter(o => o.type === 'service'), [projectOrders]);

  // Service item numbers continue from the last material or service item
  const nextServiceItemNumber = useMemo(() => {
    const maxAll = projectOrders.length === 0 ? 0 : Math.max(...projectOrders.map(o => o.item_number || 0));
    return maxAll + 1;
  }, [projectOrders]);

  // Service selection helpers
  const isServiceSelected = useCallback((id) => selectedServices.includes(id), [selectedServices]);
  const toggleServiceSelection = useCallback((order) => {
    if (!order || order.status !== 'draft') return;
    setSelectedServices(prev => prev.includes(order.id) ? prev.filter(i => i !== order.id) : [...prev, order.id]);
  }, []);
  const getSelectedServiceCount = useCallback(() => selectedServices.length, [selectedServices]);

  const availableWorkersFiltered = useMemo(() => {
    const assigned = new Set(projectWorkers.map(w => w.id));
    return allWorkers.filter(w => !assigned.has(w.id));
  }, [allWorkers, projectWorkers]);

  /* -------- TOAST -------- */
  const showToastMsg = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  /* -------- FLATPICKR -------- */
  const initDatePickers = useCallback(() => {
    if (dateFromPickerRef.current) { dateFromPickerRef.current.destroy(); dateFromPickerRef.current = null; }
    if (dateToPickerRef.current) { dateToPickerRef.current.destroy(); dateToPickerRef.current = null; }
    const common = { dateFormat: 'Y-m-d', allowInput: false, disableMobile: true, locale: 'es', clickOpens: true, monthSelectorType: 'static', appendTo: document.body };
    if (dateFromInputRef.current) {
      dateFromPickerRef.current = flatpickr(dateFromInputRef.current, { ...common, onChange: (sel) => { const iso = sel[0] ? formatIso(sel[0]) : ''; setDateFrom(iso); setDateFromDisplay(formatDisplayFromIso(iso)); } });
    }
    if (dateToInputRef.current) {
      dateToPickerRef.current = flatpickr(dateToInputRef.current, { ...common, onChange: (sel) => { const iso = sel[0] ? formatIso(sel[0]) : ''; setDateTo(iso); setDateToDisplay(formatDisplayFromIso(iso)); } });
    }
  }, []);

  const destroyDatePickers = useCallback(() => {
    if (dateFromPickerRef.current) { dateFromPickerRef.current.destroy(); dateFromPickerRef.current = null; }
    if (dateToPickerRef.current) { dateToPickerRef.current.destroy(); dateToPickerRef.current = null; }
  }, []);

  const openDateFromPicker = useCallback(() => {
    if (!dateFromPickerRef.current) initDatePickers();
    if (dateFromPickerRef.current) dateFromPickerRef.current.open();
  }, [initDatePickers]);

  const openDateToPicker = useCallback(() => {
    if (!dateToPickerRef.current) initDatePickers();
    if (dateToPickerRef.current) dateToPickerRef.current.open();
  }, [initDatePickers]);

  const clearDateFilters = useCallback(() => {
    setDateFrom(''); setDateTo(''); setDateFromDisplay(''); setDateToDisplay('');
    if (dateFromPickerRef.current) dateFromPickerRef.current.clear();
    if (dateToPickerRef.current) dateToPickerRef.current.clear();
  }, []);

  useEffect(() => {
    if (selectedProject) { destroyDatePickers(); return; }
    const t = setTimeout(() => initDatePickers(), 50);
    return () => clearTimeout(t);
  }, [selectedProject, initDatePickers, destroyDatePickers]);

  /* -------- DATA LOADING -------- */
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
      if (data.success) { setStats(prev => { if (JSON.stringify(prev) === JSON.stringify(data.stats)) return prev; saveToCache('stats', data.stats); return data.stats; }); }
    } catch (e) { console.error(e); }
  }, []);

  const loadSupervisors = useCallback(async () => {
    try { const res = await fetch(`${API_BASE}/supervisors`); const data = await res.json(); if (data.success) setSupervisors(data.supervisors || []); } catch { }
  }, []);

  const loadAllWorkers = useCallback(async () => {
    try { const res = await fetch(`${API_BASE}/workers`); const data = await res.json(); if (data.success) setAllWorkers(data.workers || []); } catch { }
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
        // Fetch secondary data in parallel (non-blocking)
        if (data.project.status === 'active' || data.project.status === 'pendiente_recuento') {
          const promises = [
            fetch(`${API_BASE}/${id}/completion-request`).then(r => r.json()).then(d => setCompletionRequest(d.success ? d.request : null)).catch(() => setCompletionRequest(null)),
          ];
          if (data.project.status === 'pendiente_recuento') {
            promises.push(
              fetch(`${API_BASE}/${id}/completion-materials`).then(r => r.json()).then(d => setCompletionMaterials(d.success ? d.materials || [] : [])).catch(() => setCompletionMaterials([]))
            );
          }
          Promise.all(promises);
        } else {
          setCompletionRequest(null);
        }
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
    } catch { }
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
        // Refresh completion request and materials for pendiente_recuento projects
        if (np.status === 'pendiente_recuento' || np.status === 'active') {
          try {
            const crRes = await fetch(`${API_BASE}/${np.id}/completion-request`);
            const crData = await crRes.json();
            setCompletionRequest(prev => {
              const next = crData.success ? crData.request : null;
              return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
            });
          } catch { /* no-op */ }
          if (np.status === 'pendiente_recuento') {
            try {
              const cmRes = await fetch(`${API_BASE}/${np.id}/completion-materials`);
              const cmData = await cmRes.json();
              setCompletionMaterials(prev => {
                const next = cmData.success ? cmData.materials || [] : [];
                return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
              });
            } catch { /* no-op */ }
          }
        }
      }
    } catch { }
  }, [isSupervisor, loadPaidOrders]);

  /* -------- ACTIONS -------- */
  const goBack = useCallback(() => { window.location.href = '/'; }, []);

  const toggleFileSection = useCallback((filename) => {
    const key = filename || '__manual__';
    setExpandedFiles(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const openConfirmModal = useCallback(({ title, message, actionLabel = 'Confirmar', variant = '', onConfirm }) => {
    setConfirmTitle(title); setConfirmMessage(message);
    setConfirmActionLabel(actionLabel); setConfirmActionVariant(variant);
    confirmActionRef.current = onConfirm; setConfirmProcessing(false); setShowConfirmModal(true);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setShowConfirmModal(false); setConfirmProcessing(false); confirmActionRef.current = null; setConfirmActionVariant('');
  }, []);

  const finalizeProjectAction = useCallback(async (project) => {
    if (!project || !canFinalizeProject(project) || updatingProjectState) return;
    setUpdatingProjectState(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${project.id}/finalize`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToastMsg(data.message || 'Proyecto finalizado y materiales liberados');
        await loadProjects();
        if (selectedProjectRef.current?.id === project.id) await selectProject(project.id);
      } else {
        showToastMsg(data.message || 'Error al finalizar proyecto', 'error');
      }
    } catch { showToastMsg('Error de conexión', 'error'); }
    setUpdatingProjectState(false);
  }, [updatingProjectState, loadProjects, selectProject, showToastMsg]);

  // ── Completion with sobras ───
  const fetchCompletionMaterials = useCallback(async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/${projectId}/completion-materials`);
      const data = await res.json();
      if (data.success) return data.materials || [];
    } catch { /* no-op */ }
    return [];
  }, []);

  const fetchCompletionRequest = useCallback(async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/${projectId}/completion-request`);
      const data = await res.json();
      if (data.success) return data.request;
    } catch { /* no-op */ }
    return null;
  }, []);

  const requestCompletion = useCallback(async (projectId, materials) => {
    setCompletionLoading(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${projectId}/request-completion`, {
        method: 'POST',
        body: JSON.stringify({ materials }),
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg(data.message || 'Recuento de sobrantes enviado');
        // Refresh to show pending status
        if (selectedProjectRef.current?.id === projectId) await selectProject(projectId);
      } else {
        showToastMsg(data.message || 'Error al enviar recuento', 'error');
      }
    } catch { showToastMsg('Error de conexión', 'error'); }
    setCompletionLoading(false);
  }, [showToastMsg, selectProject]);

  const approveCompletion = useCallback(async (projectId, requestId) => {
    setCompletionLoading(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${projectId}/approve-completion`, {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId, action: 'approve' }),
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg(data.message || 'Proyecto finalizado y materiales actualizados');
        setShowCompletionApprovalModal(false);
        setCompletionRequest(null);
        await loadProjects();
        if (selectedProjectRef.current?.id === projectId) await selectProject(projectId);
      } else {
        showToastMsg(data.message || 'Error al aprobar', 'error');
      }
    } catch { showToastMsg('Error de conexión', 'error'); }
    setCompletionLoading(false);
  }, [showToastMsg, loadProjects, selectProject]);

  const rejectCompletion = useCallback(async (projectId, requestId, notes) => {
    setCompletionLoading(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${projectId}/approve-completion`, {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId, action: 'reject', rejection_notes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg(data.message || 'Solicitud rechazada');
        setShowCompletionApprovalModal(false);
        setCompletionRequest(null);
      } else {
        showToastMsg(data.message || 'Error al rechazar', 'error');
      }
    } catch { showToastMsg('Error de conexión', 'error'); }
    setCompletionLoading(false);
  }, [showToastMsg]);

  const handleProjectStateClick = useCallback(async (project) => {
    if (!project) return;

    const status = (project.status || '').toLowerCase();

    if (isSupervisor) {
      // Supervisor: si el proyecto está en pendiente_recuento,
      // el panel RecuentoSobrantesPanel ya está visible, no hay acción click.
      if (status === 'pendiente_recuento') {
        showToastMsg('Usa el panel de recuento de sobrantes para enviar las cantidades', 'warning');
        return;
      }
      // Supervisor no puede finalizar desde aquí
      return;
    }

    // Manager/Admin:
    if (status === 'active') {
      // Finalizar proyecto → cambiar a pendiente_recuento
      openConfirmModal({
        title: 'Finalizar Proyecto',
        message: '¿Estás seguro de finalizar este proyecto? El supervisor deberá hacer un recuento de los materiales sobrantes antes de completar el cierre.',
        actionLabel: 'Finalizar',
        variant: 'success',
        onConfirm: async () => {
          await finalizeProjectAction(project);
          closeConfirmModal();
        }
      });
    } else if (status === 'pendiente_recuento') {
      // Check if there's a pending completion request to approve
      const existingReq = await fetchCompletionRequest(project.id);
      setCompletionRequest(existingReq);

      if (existingReq && existingReq.status === 'pending') {
        setShowCompletionApprovalModal(true);
      } else {
        showToastMsg('El supervisor aún no ha enviado el recuento de sobrantes', 'warning');
      }
    }
  }, [isSupervisor, fetchCompletionRequest, openConfirmModal, finalizeProjectAction, closeConfirmModal, showToastMsg]);

  const runConfirmAction = useCallback(async () => {
    if (!confirmActionRef.current || confirmProcessing) return;
    setConfirmProcessing(true);
    try { await confirmActionRef.current(); } finally { closeConfirmModal(); }
  }, [confirmProcessing, closeConfirmModal]);

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

  const createOrder = useCallback(async () => {
    if (!selectedProjectRef.current || !materialForm.material_type || !materialForm.qty) return;
    setSavingOrder(true);
    try {
      const mats = [{ name: materialForm.material_type.trim(), qty: materialForm.qty }];
      const res = await fetchWithCsrf(`${API_BASE}/${selectedProjectRef.current.id}/order`, {
        method: 'POST', body: JSON.stringify({
          type: 'material',
          description: materialForm.description.trim() || materialForm.material_type.trim(),
          materials: mats,
          material_type: materialForm.material_type.trim(),
          diameter: materialForm.diameter || null,
          series: materialForm.series || null,
          notes: materialForm.notes || null,
        })
      });
      const data = await res.json();
      if (data.success) { showToastMsg('Material enviado a aprobación'); setMaterialForm({ ...DEFAULT_MATERIAL_FORM }); await selectProject(selectedProjectRef.current.id); }
      else showToastMsg(data.message || 'Error', 'error');
    } catch { showToastMsg('Error', 'error'); }
    setSavingOrder(false);
  }, [materialForm, selectProject, showToastMsg]);

  const createService = useCallback(async () => {
    if (!selectedProjectRef.current || !serviceForm.description.trim() || !serviceForm.location.trim()) return;
    setSavingService(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/${selectedProjectRef.current.id}/order`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'service',
          description: serviceForm.description.trim(),
          unit: serviceForm.time_unit,
          time_value: serviceForm.time_value,
          location: serviceForm.location.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Servicio enviado a aprobación');
        setServiceForm({ ...DEFAULT_SERVICE_FORM });
        setSelectedServices([]);
        await selectProject(selectedProjectRef.current.id);
      } else showToastMsg(data.message || 'Error', 'error');
    } catch { showToastMsg('Error', 'error'); }
    setSavingService(false);
  }, [serviceForm, selectProject, showToastMsg]);

  const approveService = useCallback((orderId) => {
    openConfirmModal({
      title: 'Aprobar servicio', message: '¿Aprobar este servicio y enviarlo al módulo de Compras?', actionLabel: 'Aprobar', variant: 'success',
      onConfirm: async () => {
        try {
          const res = await fetchWithCsrf(`${API_BASE}/orders/${orderId}/approve`, { method: 'POST' });
          const data = await res.json();
          if (data.success) { showToastMsg(data.message || 'Servicio aprobado'); await selectProject(selectedProjectRef.current.id); }
          else showToastMsg(data.message || 'Error al aprobar servicio', 'error');
        } catch { showToastMsg('Error de conexión', 'error'); }
      }
    });
  }, [openConfirmModal, selectProject, showToastMsg]);

  const approveServicesBulk = useCallback((orderIds, titleLabel) => {
    if (!orderIds?.length) return;
    openConfirmModal({
      title: titleLabel, message: `¿Aprobar ${orderIds.length} servicios y enviarlos al módulo de Compras?`, actionLabel: 'Aprobar', variant: 'success',
      onConfirm: async () => {
        const results = await Promise.allSettled(
          orderIds.map(id => fetchWithCsrf(`${API_BASE}/orders/${id}/approve`, { method: 'POST' }).then(r => r.json()))
        );
        let ok = 0; const errors = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.success) ok++;
          else { const msg = r.status === 'fulfilled' ? r.value.message : 'Error de conexión'; if (!errors.includes(msg)) errors.push(msg); }
        }
        if (ok) { showToastMsg(`${ok} servicios aprobados`); setSelectedServices([]); await selectProject(selectedProjectRef.current.id); }
        if (errors.length) showToastMsg(errors.join('. '), 'error');
      }
    });
  }, [openConfirmModal, selectProject, showToastMsg]);

  const rejectService = useCallback((orderId) => {
    setOrderToReject(orderId);
    setRejectType('servicio');
    setRejectNotes('');
    setShowRejectModal(true);
  }, []);

  const approveMaterial = useCallback((orderId) => {
    openConfirmModal({
      title: 'Aprobar material', message: '¿Aprobar este material y enviarlo al módulo de Compras?', actionLabel: 'Aprobar', variant: 'success',
      onConfirm: async () => {
        try {
          const res = await fetchWithCsrf(`${API_BASE}/orders/${orderId}/approve`, { method: 'POST' });
          const data = await res.json();
          if (data.success) { showToastMsg(data.message || 'Material aprobado'); await selectProject(selectedProjectRef.current.id); }
          else showToastMsg(data.message || 'Error al aprobar material', 'error');
        } catch (e) { showToastMsg('Error de conexión al aprobar material', 'error'); console.error('approveMaterial error:', e); }
      }
    });
  }, [openConfirmModal, selectProject, showToastMsg]);

  const approveMaterialsBulk = useCallback((orderIds, titleLabel) => {
    if (!orderIds?.length) return;
    openConfirmModal({
      title: titleLabel, message: `¿Aprobar ${orderIds.length} items y enviarlos al módulo de Compras?`, actionLabel: 'Aprobar', variant: 'success',
      onConfirm: async () => {
        const results = await Promise.allSettled(
          orderIds.map(id => fetchWithCsrf(`${API_BASE}/orders/${id}/approve`, { method: 'POST' }).then(r => r.json()))
        );
        let ok = 0;
        const errors = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.success) ok++;
          else {
            const msg = r.status === 'fulfilled' ? r.value.message : 'Error de conexión';
            if (!errors.includes(msg)) errors.push(msg);
          }
        }
        if (ok) { showToastMsg(`${ok} items aprobados`); await selectProject(selectedProjectRef.current.id); }
        if (errors.length) showToastMsg(errors.join('. '), 'error');
      }
    });
  }, [openConfirmModal, selectProject, showToastMsg]);

  const getGroupKey = (g) => g?.filename || '__manual__';
  const getGroupDraftOrders = (g) => (g?.orders || []).filter(o => o.status === 'draft');
  const getSelectedIds = useCallback((g) => selectedOrders[getGroupKey(g)] || [], [selectedOrders]);
  const getSelectedCount = useCallback((g) => getSelectedIds(g).length, [getSelectedIds]);

  const isOrderSelected = useCallback((g, orderId) => (selectedOrders[getGroupKey(g)] || []).includes(orderId), [selectedOrders]);
  const toggleOrderSelection = useCallback((g, order) => {
    if (!order || order.status !== 'draft') return;
    const key = getGroupKey(g);
    setSelectedOrders(prev => {
      const current = new Set(prev[key] || []);
      if (current.has(order.id)) current.delete(order.id); else current.add(order.id);
      return { ...prev, [key]: Array.from(current) };
    });
  }, []);
  const clearGroupSelection = useCallback((g) => { const key = getGroupKey(g); setSelectedOrders(prev => { const next = { ...prev }; delete next[key]; return next; }); }, []);
  const approveAllInGroup = useCallback((g) => { approveMaterialsBulk(getGroupDraftOrders(g).map(o => o.id), 'Aprobar toda la lista'); clearGroupSelection(g); }, [approveMaterialsBulk, clearGroupSelection]);
  const approveSelectedInGroup = useCallback((g) => { const ids = getSelectedIds(g); if (!ids.length) return; approveMaterialsBulk(ids, 'Aprobar seleccionados'); clearGroupSelection(g); }, [approveMaterialsBulk, getSelectedIds, clearGroupSelection]);

  const rejectMaterial = useCallback((orderId) => {
    setOrderToReject(orderId);
    setRejectType('material');
    setRejectNotes('');
    setShowRejectModal(true);
  }, []);

  const confirmRejectOrder = useCallback(async () => {
    if (!orderToReject) return;
    setRejectingOrder(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/orders/${orderToReject}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes: rejectNotes.trim() || 'Rechazado por el Jefe de Proyectos' })
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg(data.message || `${rejectType === 'servicio' ? 'Servicio rechazado' : 'Material rechazado'}`);
        setShowRejectModal(false);
        await selectProject(selectedProjectRef.current.id);
      } else {
        showToastMsg(data.message || 'Error', 'error');
      }
    } catch { showToastMsg('Error al rechazar', 'error'); }
    setRejectingOrder(false);
  }, [orderToReject, rejectNotes, rejectType, selectProject, showToastMsg]);

  const downloadTemplate = useCallback(() => { window.location.href = `${API_BASE}/material-template`; }, []);

  const importExcel = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedProjectRef.current) return;
    setImportingFile(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('check_duplicate', 'true');
      const res = await fetch(`${API_BASE}/${selectedProjectRef.current.id}/import-materials`, { method: 'POST', headers: { 'X-CSRF-TOKEN': getCsrfToken() }, body: fd });
      const data = await res.json();
      if (data.duplicate) { setDuplicateData({ originalFilename: data.originalFilename, proposedFilename: data.proposedFilename, existingId: data.existingId, file, skipDuplicate: false }); setShowDuplicateModal(true); }
      else if (data.preview) { setImportPreviewItems(data.preview.items.map((it, i) => ({ number: i + 1, quantity: it.quantity || 1, unit: it.unit || 'UND', description: it.description || '', diameter: it.diameter || '', series: it.series || '', material_type: it.material_type || '' }))); pendingImportFile.current = file; setShowImportPreview(true); }
      else if (data.success) { showToastMsg(data.message); await selectProject(selectedProjectRef.current.id); }
      else showToastMsg(data.message || 'Error al procesar archivo', 'error');
    } catch (err) { showToastMsg('Error al importar: ' + err.message, 'error'); }
    setImportingFile(false); e.target.value = '';
  }, [selectProject, showToastMsg]);

  const confirmImport = useCallback(async () => {
    if (!pendingImportFile.current || !selectedProjectRef.current) return;
    setImportingFile(true);
    try {
      const fd = new FormData(); fd.append('file', pendingImportFile.current); fd.append('confirmed_import', 'true');
      // If the file was renamed during duplicate flow, tell the backend
      if (pendingImportFile.renamedFilename) {
        fd.append('rename_duplicate', 'true');
        fd.append('proposed_filename', pendingImportFile.renamedFilename);
      }
      const res = await fetch(`${API_BASE}/${selectedProjectRef.current.id}/import-materials`, { method: 'POST', headers: { 'X-CSRF-TOKEN': getCsrfToken() }, body: fd });
      const data = await res.json();
      if (data.success) { setShowImportPreview(false); showToastMsg(data.message); await selectProject(selectedProjectRef.current.id); }
      else if (data.duplicate) { setDuplicateData({ originalFilename: data.originalFilename, proposedFilename: data.proposedFilename, existingId: data.existingId, file: pendingImportFile.current }); setShowImportPreview(false); setShowDuplicateModal(true); }
      else showToastMsg(data.message || 'Error al importar', 'error');
    } catch { showToastMsg('Error al importar archivo', 'error'); }
    setImportingFile(false); pendingImportFile.current = null;
  }, [selectProject, showToastMsg]);

  const confirmDuplicateUpload = useCallback(async (renameFile = false) => {
    if (!duplicateData) return;
    setImportingFile(true);
    try {
      const fd = new FormData(); fd.append('file', duplicateData.file);
      if (renameFile) {
        fd.append('rename_duplicate', 'true');
        fd.append('proposed_filename', duplicateData.proposedFilename || '');
        fd.append('check_duplicate', 'true');
      }
      const res = await fetch(`${API_BASE}/${selectedProjectRef.current.id}/import-materials`, { method: 'POST', headers: { 'X-CSRF-TOKEN': getCsrfToken() }, body: fd });
      const data = await res.json();
      if (data.preview) {
        // Show preview with the renamed file before final import
        setImportPreviewItems(data.preview.items.map((it, i) => ({ number: i + 1, quantity: it.quantity || 1, unit: it.unit || 'UND', description: it.description || '', diameter: it.diameter || '', series: it.series || '', material_type: it.material_type || '' })));
        pendingImportFile.current = duplicateData.file;
        // Store the renamed filename so confirmImport uses it
        pendingImportFile.renamedFilename = data.filename || duplicateData.proposedFilename;
        setShowDuplicateModal(false); setDuplicateData(null); setShowImportPreview(true);
      } else if (data.success) { showToastMsg(data.message); await selectProject(selectedProjectRef.current.id); setShowDuplicateModal(false); setDuplicateData(null); }
      else showToastMsg(data.message || 'Error al importar', 'error');
    } catch { showToastMsg('Error al importar archivo', 'error'); }
    setImportingFile(false);
  }, [duplicateData, selectProject, showToastMsg]);

  const openCreateModal = useCallback(() => {
    setForm({ ...DEFAULT_CREATE_FORM });
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

  /* -------- LIFECYCLE -------- */
  useEffect(() => {
    if (didInit) return;
    didInit = true;
    loadProjects(); loadStats(); loadSupervisors();
    if (isSupervisor) loadAllWorkers();
    pollingRef.current = setInterval(() => { loadProjects(); loadStats(); refreshSelectedProject(); }, POLLING_MS);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); destroyDatePickers(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedProject && isSupervisor) loadPaidOrders(selectedProject.id);
  }, [selectedProject, isSupervisor, loadPaidOrders]);

  /* -------- RETURN -------- */
  return {
    // State
    projects, stats, loading, selectedProject, setSelectedProject,
    projectWorkers, projectOrders, projectSummary, supervisors,
    saving, savingOrder, toast, setToast,
    statusFilter, setStatusFilter, dateFrom, dateTo,
    dateFromDisplay, dateToDisplay,
    materialForm, setMaterialForm, importingFile,
    serviceForm, setServiceForm, savingService,
    selectedServices,
    expandedFiles, selectedOrders,
    editForm, setEditForm, form, setForm, errorMessage,
    selectedWorkerId, setSelectedWorkerId,
    updatingProjectState,
    // Delivery
    showDeliveryModal, selectedOrderForDelivery, deliveryNotes, setDeliveryNotes, confirmingDelivery,
    // Modals
    showCreateModal, setShowCreateModal,
    showConfirmModal, confirmTitle, confirmMessage, confirmActionLabel, confirmActionVariant, confirmProcessing,
    showImportPreview, setShowImportPreview, importPreviewItems,
    showDuplicateModal, setShowDuplicateModal, duplicateData,
    showRejectModal, setShowRejectModal, rejectNotes, setRejectNotes, rejectingOrder, rejectType,
    // Derived
    statusFilters, filteredProjects, ordersGroupedByFile,
    serviceOrders,
    usagePercent, pieSegments, getPieSegmentPath, spentColor,
    nextItemNumber, nextServiceItemNumber, availableWorkersFiltered,
    // Actions
    goBack, selectProject, handleProjectStateClick,
    toggleFileSection, openCreateModal, createProject, updateProject,
    confirmDeleteProject,
    openDeliveryModal, closeDeliveryModal, confirmDeliveryOrder,
    addWorkerToProject, removeWorkerFromProject,
    createOrder, createService, downloadTemplate, importExcel,
    approveMaterial, rejectMaterial,
    approveAllInGroup, approveSelectedInGroup,
    isOrderSelected, toggleOrderSelection, getSelectedCount,
    getGroupKey, getGroupDraftOrders,
    confirmFileDelivery,
    // Service actions
    approveService, rejectService, approveServicesBulk,
    isServiceSelected, toggleServiceSelection, getSelectedServiceCount,
    closeConfirmModal, runConfirmAction,
    confirmImport, confirmDuplicateUpload,
    confirmRejectOrder,
    // Completion (sobras)
    showCompletionModal, setShowCompletionModal, completionMaterials, completionLoading,
    showCompletionApprovalModal, setShowCompletionApprovalModal, completionRequest,
    requestCompletion, approveCompletion, rejectCompletion,
    fetchCompletionRequest, setCompletionRequest,
    // Refs (for flatpickr)
    dateFromInputRef, dateToInputRef,
    openDateFromPicker, openDateToPicker, clearDateFilters,
  };
}
