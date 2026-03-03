/**
 * @file usePipelineData — Hook de lógica del Pipeline de Pre-Proyecto.
 * Gestiona estado, fetching y CRUD para proyectos del pipeline.
 * Acceso restringido a Sub-Gerente, Jefe de Proyectos y Admin.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { API_BASE, getCsrfToken, fetchWithCsrf } from '../utils';


const PIPELINE_API = `${API_BASE}/pipeline`;
const POLL_MS = 5000;

const STAGE_ORDER = [
  'ingresado', 'contactado', 'visitado',
  'presupuestado', 'negociacion',
  'cerrado_ganado', 'cerrado_perdido',
];

const STAGE_LABELS = {
  ingresado: 'Ingresado',
  contactado: 'Contactado',
  visitado: 'Visitado',
  presupuestado: 'Presupuestado',
  negociacion: 'Negociación',
  cerrado_ganado: 'Cerrado Ganado',
  cerrado_perdido: 'Cerrado Perdido',
};

const INITIAL_FORM = {
  nombre_proyecto: '',
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_email: '',
  cliente_empresa: '',
  descripcion: '',
  presupuesto_estimado: 0,
  moneda: 'PEN',
  ubicacion: '',
  team_ids: [],
};

export { STAGE_ORDER, STAGE_LABELS };

export default function usePipelineData({ showToast, enabled = true, onProjectCreated }) {
  // ── State ──────────────────────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState({});
  const [pipelineStats, setPipelineStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadDetail, setLeadDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // Data
  const [cecos, setCecos] = useState([]);
  const [leadForProject, setLeadForProject] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);

  const isMounted = useRef(true);
  const showToastRef = useRef(showToast);
  const selectedLeadRef = useRef(selectedLead);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    selectedLeadRef.current = selectedLead;
  }, [selectedLead]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Fetch helpers ──────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(PIPELINE_API, {
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success && isMounted.current) {
        setLeads(data.leads || []);
        setCounts(data.counts || {});
      }
    } catch { /* silencio en polling */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${PIPELINE_API}/stats`, {
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success && isMounted.current) {
        setPipelineStats(data);
      }
    } catch { /* silencio */ }
  }, []);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch(`${PIPELINE_API}/workers`, {
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success && isMounted.current) {
        setWorkers(data.workers || []);
      }
    } catch { /* silencio */ }
  }, []);

  const fetchCecos = useCallback(async () => {
    try {
      const res = await fetch(`${PIPELINE_API}/cecos/list`, {
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success && isMounted.current) {
        // Usar estructura jerárquica para mostrar en dropdown
        setCecos(data.hierarchical || []);
      }
    } catch { /* silencio */ }
  }, []);

  const fetchLeadDetail = useCallback(async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${PIPELINE_API}/${id}`, {
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      const data = await res.json();
      if (data.success && isMounted.current) {
        setLeadDetail(data.lead);
      }
    } catch {
      showToastRef.current('Error al cargar detalle del proyecto', 'error');
    } finally {
      if (isMounted.current) setLoadingDetail(false);
    }
  }, []);

  // ── Initial + Polling ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    Promise.all([fetchLeads(), fetchStats(), fetchWorkers(), fetchCecos()])
      .finally(() => { if (isMounted.current) setLoading(false); });
  }, [enabled, fetchLeads, fetchStats, fetchWorkers, fetchCecos]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      fetchLeads();
      fetchStats();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, fetchLeads, fetchStats]);

  // ── Reload detail when selectedLead changes ────────────────────────
  useEffect(() => {
    if (selectedLead) {
      fetchLeadDetail(selectedLead.id);
    } else {
      setLeadDetail(null);
    }
  }, [selectedLead, fetchLeadDetail]);

  // ── Derived ────────────────────────────────────────────────────────

  /** Proyectos agrupados por etapa */
  const leadsByStage = useMemo(() => {
    const grouped = {};
    STAGE_ORDER.forEach((s) => { grouped[s] = []; });
    (leads || []).forEach((lead) => {
      if (grouped[lead.etapa]) grouped[lead.etapa].push(lead);
    });
    return grouped;
  }, [leads]);

  // ── CRUD Actions ───────────────────────────────────────────────────

  const createLead = useCallback(async () => {
    if (!createForm.nombre_proyecto || !createForm.cliente_nombre) {
      showToastRef.current('Nombre de proyecto y cliente son requeridos', 'error');
      return;
    }
    if ((createForm.team_ids || []).length < 2) {
      showToastRef.current('Debes asignar al menos 2 personas al equipo', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithCsrf(PIPELINE_API, {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Proyecto creado correctamente', 'success');
        setShowCreateModal(false);
        setCreateForm({ ...INITIAL_FORM });
        fetchLeads();
        fetchStats();
      } else {
        showToastRef.current(data.message || 'Error al crear proyecto', 'error');
      }
    } catch {
      showToastRef.current('Error de red al crear proyecto', 'error');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  }, [createForm, fetchLeads, fetchStats]);

  const updateLead = useCallback(async (id, updates) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Proyecto actualizado', 'success');
        fetchLeads();
        if (selectedLeadRef.current?.id === id) fetchLeadDetail(id);
      } else {
        showToastRef.current(data.message || 'Error al actualizar', 'error');
      }
    } catch {
      showToastRef.current('Error de red', 'error');
    }
  }, [fetchLeads, fetchLeadDetail]);

  const deleteLead = useCallback(async (id) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Proyecto eliminado', 'success');
        if (selectedLeadRef.current?.id === id) setSelectedLead(null);
        fetchLeads();
        fetchStats();
      } else {
        showToastRef.current(data.message || 'Error al eliminar', 'error');
      }
    } catch {
      showToastRef.current('Error de red', 'error');
    }
  }, [fetchLeads, fetchStats]);

  // ── Stage change ───────────────────────────────────────────────────

  const changeStage = useCallback(async (id, etapa, motivo = '') => {
    // Si es cerrado_ganado, abrir modal en lugar de crear automáticamente
    if (etapa === 'cerrado_ganado') {
      setLeadForProject(selectedLeadRef.current);
      setShowCreateProjectModal(true);
      return;
    }

    // Para otras etapas, cambio normal
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${id}/stage`, {
        method: 'POST',
        body: JSON.stringify({ etapa, motivo }),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current(data.message, 'success');
        fetchLeads();
        fetchStats();
        if (selectedLeadRef.current?.id === id) fetchLeadDetail(id);
      } else {
        showToastRef.current(data.message || 'Error al cambiar etapa', 'error');
      }
    } catch {
      showToastRef.current('Error de red', 'error');
    }
  }, [fetchLeads, fetchStats, fetchLeadDetail]);

  // ── Team ───────────────────────────────────────────────────────────

  const updateTeam = useCallback(async (id, teamIds) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${id}/team`, {
        method: 'PUT',
        body: JSON.stringify({ team_ids: teamIds }),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Equipo actualizado', 'success');
        fetchLeads();
        if (selectedLeadRef.current?.id === id) fetchLeadDetail(id);
      } else {
        showToastRef.current(data.message || 'Error al actualizar equipo', 'error');
      }
    } catch {
      showToastRef.current('Error de red', 'error');
    }
  }, [fetchLeads, fetchLeadDetail]);

  // ── Communication ──────────────────────────────────────────────────

  const addCommunication = useCallback(async (id, formData) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${id}/communications`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Comunicación registrada', 'success');
        if (selectedLeadRef.current?.id === id) fetchLeadDetail(id);
        return true;
      } else {
        showToastRef.current(data.message || 'Error al registrar comunicación', 'error');
        return false;
      }
    } catch {
      showToastRef.current('Error de red', 'error');
      return false;
    }
  }, [fetchLeadDetail]);

  // ── Visits ─────────────────────────────────────────────────────────

  const addVisit = useCallback(async (id, formData) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${id}/visits`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Visita programada', 'success');
        if (selectedLeadRef.current?.id === id) fetchLeadDetail(id);
        return true;
      } else {
        showToastRef.current(data.message || 'Error al programar visita', 'error');
        return false;
      }
    } catch {
      showToastRef.current('Error de red', 'error');
      return false;
    }
  }, [fetchLeadDetail]);

  const completeVisit = useCallback(async (visitId, observaciones = '') => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/visits/${visitId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ observaciones }),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Visita completada', 'success');
        if (selectedLeadRef.current) fetchLeadDetail(selectedLeadRef.current.id);
        return true;
      } else {
        showToastRef.current(data.message || 'Error al completar visita', 'error');
        return false;
      }
    } catch {
      showToastRef.current('Error de red', 'error');
      return false;
    }
  }, [fetchLeadDetail]);

  // ── Budgets ────────────────────────────────────────────────────────

  const addBudget = useCallback(async (id, formData) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${id}/budgets`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current(data.message, 'success');
        if (selectedLeadRef.current?.id === id) fetchLeadDetail(id);
        return true;
      } else {
        showToastRef.current(data.message || 'Error al crear presupuesto', 'error');
        return false;
      }
    } catch {
      showToastRef.current('Error de red', 'error');
      return false;
    }
  }, [fetchLeadDetail]);

  const updateBudgetStatus = useCallback(async (budgetId, estado) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/budgets/${budgetId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Estado de presupuesto actualizado', 'success');
        if (selectedLeadRef.current) fetchLeadDetail(selectedLeadRef.current.id);
        return true;
      } else {
        showToastRef.current(data.message || 'Error al actualizar presupuesto', 'error');
        return false;
      }
    } catch {
      showToastRef.current('Error de red', 'error');
      return false;
    }
  }, [fetchLeadDetail]);

  // ── Negotiations ───────────────────────────────────────────────────

  const addNegotiation = useCallback(async (id, formData) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${id}/negotiations`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current('Registro de negociación agregado', 'success');
        if (selectedLeadRef.current?.id === id) fetchLeadDetail(id);
        return true;
      } else {
        showToastRef.current(data.message || 'Error', 'error');
        return false;
      }
    } catch {
      showToastRef.current('Error de red', 'error');
      return false;
    }
  }, [fetchLeadDetail]);

  // ── Create project from lead ───────────────────────────────────────

  const createProjectFromLeadModal = useCallback(async (leadId, formData) => {
    try {
      const res = await fetchWithCsrf(`${PIPELINE_API}/${leadId}/create-project`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToastRef.current(data.message, 'success');
        setShowCreateProjectModal(false);
        setLeadForProject(null);
        fetchLeads();
        fetchStats();
        if (selectedLeadRef.current?.id === leadId) fetchLeadDetail(leadId);
        // Reload projects list when a project is created from lead
        if (onProjectCreated) onProjectCreated();
        return true;
      } else {
        showToastRef.current(data.message || 'Error al crear proyecto', 'error');
        return false;
      }
    } catch {
      showToastRef.current('Error de red', 'error');
      return false;
    }
  }, [fetchLeads, fetchStats, fetchLeadDetail, onProjectCreated]);

  // ── Return ─────────────────────────────────────────────────────────
  return {
    // Data
    leads, counts, pipelineStats, loading, workers, cecos,
    selectedLead, setSelectedLead,
    leadDetail, loadingDetail, leadForProject, setLeadForProject,
    leadsByStage,
    // Modals
    showCreateModal, setShowCreateModal,
    showStageModal, setShowStageModal,
    showCommunicationModal, setShowCommunicationModal,
    showVisitModal, setShowVisitModal,
    showBudgetModal, setShowBudgetModal,
    showNegotiationModal, setShowNegotiationModal,
    showTeamModal, setShowTeamModal,
    showCreateProjectModal, setShowCreateProjectModal,
    // Forms
    createForm, setCreateForm, saving,
    // Actions
    createLead, updateLead, deleteLead,
    changeStage, updateTeam,
    addCommunication, addVisit, completeVisit,
    addBudget, updateBudgetStatus,
    addNegotiation, createProjectFromLeadModal,
    fetchLeads, fetchStats,
    // Constants
    STAGE_ORDER, STAGE_LABELS,
  };
}
