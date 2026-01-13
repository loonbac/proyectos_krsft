<template>
  <div class="proyectos-layout">
    <div class="proyectos-container">
      <!-- Header -->
      <header class="module-header">
        <div class="header-left">
          <button @click="goBack" class="btn-back">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Volver
          </button>
          <h1>
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {{ isSupervisor ? 'MIS PROYECTOS ASIGNADOS' : 'GESTIÓN DE PROYECTOS' }}
          </h1>
        </div>
        <div v-if="isSupervisor" class="role-badge supervisor">SUPERVISOR</div>
      </header>

      <main>
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <h3>{{ isSupervisor ? 'PROYECTOS ASIGNADOS' : 'PROYECTOS ACTIVOS' }}</h3>
            <p class="stat-number">{{ stats.active_projects }}</p>
          </div>
          <div class="stat-card">
            <h3>PRESUPUESTO TOTAL</h3>
            <p class="stat-number">S/ {{ formatNumber(stats.total_budget) }}</p>
          </div>
          <div class="stat-card">
            <h3>DISPONIBLE</h3>
            <p class="stat-number">S/ {{ formatNumber(stats.total_remaining) }}</p>
          </div>
        </div>

        <!-- Actions (only for managers, not supervisors) -->
        <div v-if="!isSupervisor && !selectedProject" class="actions-container">
          <button @click="openCreateModal" class="btn-nuevo">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proyecto
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading"><p>Cargando proyectos...</p></div>

        <!-- Empty State -->
        <div v-else-if="projects.length === 0 && !selectedProject" class="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>{{ isSupervisor ? 'No tienes proyectos asignados' : 'No hay proyectos' }}</h3>
          <p>{{ isSupervisor ? 'Espera a que te asignen un proyecto' : 'Crea tu primer proyecto' }}</p>
        </div>

        <!-- Projects Grid -->
        <div v-else-if="!selectedProject" class="projects-grid">
          <div v-for="project in projects" :key="project.id" class="project-card" @click="selectProject(project)">
            <h3>{{ project.name }}</h3>
            <p class="project-meta">
              <span class="currency-badge">{{ project.currency || 'PEN' }}</span>
              Supervisor: {{ project.supervisor_name || 'No asignado' }}
            </p>
            
            <div class="project-amounts">
              <div class="amount-item">
                <div class="amount-label">Adjudicado</div>
                <div class="amount-value">{{ getCurrencySymbol(project.currency) }} {{ formatNumber(project.total_amount) }}</div>
              </div>
              <div class="amount-item">
                <div class="amount-label">Disponible</div>
                <div class="amount-value">{{ getCurrencySymbol(project.currency) }} {{ formatNumber(project.remaining) }}</div>
              </div>
            </div>

            <div class="progress-bar">
              <div class="progress-fill" :class="project.status_label" :style="{ width: Math.min(parseFloat(project.usage_percent) || 0, 100) + '%' }"></div>
            </div>
            <small>{{ parseFloat(project.usage_percent || 0).toFixed(1) }}% utilizado</small>

            <div class="project-footer">
              <span>Creado por: {{ project.creator_name || 'Desconocido' }}</span>
            </div>
          </div>
        </div>

        <!-- Project Detail View -->
        <div v-if="selectedProject" class="project-detail">
          <div class="detail-header">
            <button @click="selectedProject = null; projectWorkers = []; projectOrders = []" class="btn-back-small">← Volver</button>
            <h2>{{ selectedProject.name }}</h2>
            <span class="status-badge" :class="getStatusLabel(selectedProject)">{{ getStatusText(getStatusLabel(selectedProject)) }}</span>
          </div>

          <div class="detail-grid">
            <div class="detail-card">
              <h4>Moneda</h4>
              <p>{{ selectedProject.currency || 'PEN' }}</p>
            </div>
            <div class="detail-card">
              <h4>Monto Adjudicado</h4>
              <p>{{ getCurrencySymbol(selectedProject.currency) }} {{ formatNumber(selectedProject.total_amount) }}</p>
            </div>
            <div class="detail-card">
              <h4>Disponible</h4>
              <p>{{ getCurrencySymbol(selectedProject.currency) }} {{ formatNumber(projectSummary.remaining || selectedProject.available_amount) }}</p>
            </div>
            <div class="detail-card">
              <h4>Gastado</h4>
              <p>{{ getCurrencySymbol(selectedProject.currency) }} {{ formatNumber(projectSummary.spent || 0) }}</p>
            </div>
            <div class="detail-card">
              <h4>Supervisor</h4>
              <p>{{ selectedProject.supervisor_name || 'No asignado' }}</p>
            </div>
            <div class="detail-card">
              <h4>Órdenes Pendientes</h4>
              <p>{{ projectSummary.pending_orders || 0 }}</p>
            </div>
          </div>

          <!-- SUPERVISOR SECTION: Add Workers -->
          <div v-if="isSupervisor" class="section-box">
            <h3>👷 Trabajadores del Proyecto</h3>
            
            <div class="add-worker-row">
              <select v-model="selectedWorkerId" class="select-field">
                <option value="">Seleccionar trabajador...</option>
                <option v-for="w in availableWorkersFiltered" :key="w.id" :value="w.id">
                  {{ w.nombre_completo }} ({{ w.cargo }})
                </option>
              </select>
              <button @click="addWorkerToProject" :disabled="!selectedWorkerId" class="btn-add">+ Agregar</button>
            </div>

            <div v-if="projectWorkers.length === 0" class="empty-list">
              <p>No hay trabajadores asignados</p>
            </div>
            <ul v-else class="workers-list">
              <li v-for="w in projectWorkers" :key="w.id">
                <span>{{ w.nombre_completo }} - {{ w.cargo }}</span>
                <button @click="removeWorkerFromProject(w.id)" class="btn-remove">×</button>
              </li>
            </ul>
          </div>

          <!-- SUPERVISOR SECTION: Purchase Orders -->
          <div v-if="isSupervisor" class="section-box">
            <h3>📦 Enviar Orden de Compra (Proforma)</h3>
            
            <form @submit.prevent="createOrder" class="order-form">
              <div class="form-group">
                <label>Descripción</label>
                <input v-model="orderForm.description" type="text" required placeholder="Ej: Materiales para etapa 1" class="input-field" />
              </div>
              
              <div class="form-group">
                <label>Materiales a solicitar</label>
                <div class="material-add-row">
                  <input v-model="newMaterial" type="text" placeholder="Agregar material..." @keyup.enter.prevent="addMaterial" class="input-field" />
                  <button type="button" @click="addMaterial" class="btn-add">+</button>
                </div>
                <ul v-if="orderForm.materials.length" class="materials-list">
                  <li v-for="(mat, idx) in orderForm.materials" :key="idx">
                    {{ mat }}
                    <button type="button" @click="orderForm.materials.splice(idx, 1)" class="btn-remove">×</button>
                  </li>
                </ul>
                <p v-else class="hint">Agregue los materiales que necesita</p>
              </div>

              <button type="submit" :disabled="savingOrder || orderForm.materials.length === 0" class="btn-submit">
                {{ savingOrder ? 'Enviando...' : '📤 Enviar a Compras' }}
              </button>
              <p class="hint">* La orden será revisada y cotizada por el área de Compras</p>
            </form>
          </div>

          <!-- Orders List -->
          <div class="section-box">
            <h3>📋 Órdenes y Gastos ({{ projectOrders.length }})</h3>
            <div v-if="projectOrders.length === 0" class="empty-list"><p>No hay órdenes</p></div>
            <table v-else class="orders-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in projectOrders" :key="order.id">
                  <td>{{ formatDate(order.created_at) }}</td>
                  <td>{{ order.type === 'service' ? '🔧 Servicio' : '📦 Material' }}</td>
                  <td>{{ order.description }}</td>
                  <td>
                    <span class="order-status" :class="order.status">
                      {{ order.status === 'approved' ? '✓ Aprobado' : order.status === 'pending' ? '🕐 Pendiente' : '✗ Rechazado' }}
                    </span>
                  </td>
                  <td>{{ order.amount ? getCurrencySymbol(order.currency) + ' ' + formatNumber(order.amount) : 'Por cotizar' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Edit Section (only for managers) -->
          <div v-if="!isSupervisor" class="edit-section">
            <h3>Editar Proyecto</h3>
            <form @submit.prevent="updateProject">
              <div class="form-group">
                <label>Nombre</label>
                <input v-model="editForm.name" type="text" class="input-field" required />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Umbral (%)</label>
                  <input v-model.number="editForm.spending_threshold" type="number" min="0" max="100" class="input-field" />
                </div>
                <div class="form-group">
                  <label>Supervisor</label>
                  <select v-model="editForm.supervisor_id" class="select-field">
                    <option v-for="sup in supervisors" :key="sup.id" :value="sup.id">{{ sup.nombre_completo }}</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" @click="confirmDeleteProject" class="btn-delete">Eliminar</button>
                <button type="submit" :disabled="saving" class="btn-submit">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <!-- Create Modal (managers only) -->
      <Teleport to="body">
        <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Crear Nuevo Proyecto</h2>
              <button @click="closeCreateModal" class="btn-close">×</button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="createProject">
                <div class="form-group">
                  <label>Nombre del Proyecto</label>
                  <input v-model="form.name" type="text" required placeholder="Ej: Construcción Edificio A" class="input-field" />
                </div>
                <div class="form-group">
                  <label>Moneda</label>
                  <div class="currency-switch">
                    <div class="currency-option" :class="{ active: form.currency === 'PEN' }" @click="form.currency = 'PEN'">S/ Soles</div>
                    <div class="currency-option" :class="{ active: form.currency === 'USD' }" @click="form.currency = 'USD'">$ Dólares</div>
                  </div>
                </div>
                <div class="form-group">
                  <label>Monto Adjudicado</label>
                  <input v-model.number="form.amount" type="number" step="0.01" min="0.01" required class="input-field" />
                </div>
                <div class="form-group">
                  <label>Umbral de Alerta (%)</label>
                  <input v-model.number="form.threshold" type="number" min="0" max="100" class="input-field" />
                </div>
                <div class="form-group">
                  <div class="igv-row">
                    <div class="checkbox-group">
                      <input type="checkbox" id="igv" v-model="form.igv_enabled" />
                      <label for="igv">Incluir IGV</label>
                    </div>
                    <div v-if="form.igv_enabled">
                      <input v-model.number="form.igv_rate" type="number" step="0.01" class="input-field igv-input" /> %
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label>Supervisor *</label>
                  <select v-model="form.supervisor_id" required class="select-field">
                    <option value="">Selecciona...</option>
                    <option v-for="sup in supervisors" :key="sup.id" :value="sup.id">{{ sup.nombre_completo }}</option>
                  </select>
                </div>
                <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
                <div class="modal-footer">
                  <button type="button" @click="closeCreateModal" class="btn-cancel">Cancelar</button>
                  <button type="submit" :disabled="saving || !form.supervisor_id" class="btn-submit">{{ saving ? 'Creando...' : 'Crear' }}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Toast -->
      <Teleport to="body">
        <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import './proyectos.css';

// Props from Inertia
const props = defineProps({
  userRole: { type: String, default: 'user' },
  isSupervisor: { type: Boolean, default: false },
  trabajadorId: { type: Number, default: null }
});

// State
const loading = ref(false);
const saving = ref(false);
const savingOrder = ref(false);
const showCreateModal = ref(false);
const errorMessage = ref('');
const projects = ref([]);
const selectedProject = ref(null);
const supervisors = ref([]);
const allWorkers = ref([]);
const projectWorkers = ref([]);
const projectOrders = ref([]);
const projectSummary = ref({});
const toast = ref({ show: false, message: '', type: 'success' });
const newMaterial = ref('');
const selectedWorkerId = ref('');

const isSupervisor = computed(() => props.isSupervisor);

const stats = ref({ total_projects: 0, active_projects: 0, total_budget: 0, total_spent: 0, total_remaining: 0 });

const form = ref({ name: '', currency: 'PEN', amount: 0, threshold: 75, igv_enabled: true, igv_rate: 18, supervisor_id: '' });
const editForm = ref({ name: '', spending_threshold: 75, supervisor_id: null });
const orderForm = ref({ description: '', materials: [] });

// API
const getModuleName = () => {
  const path = window.location.pathname;
  const match = path.match(/^\/([^\/]+)/);
  return match ? match[1] : 'proyectoskrsft';
};

const apiBase = computed(() => `/api/${getModuleName()}`);
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

const fetchWithCsrf = (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': getCsrfToken(), ...options.headers };
  return fetch(url, { ...options, headers });
};

// Helpers
const goBack = () => window.location.href = '/';
const showToast = (message, type = 'success') => { toast.value = { show: true, message, type }; setTimeout(() => toast.value.show = false, 4000); };
const formatNumber = (num) => parseFloat(num || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '';
const getCurrencySymbol = (c) => c === 'USD' ? '$' : 'S/';
const getStatusLabel = (p) => { const u = parseFloat(p.usage_percent) || 0; if (u >= 90) return 'critical'; if (u >= (p.spending_threshold || 75)) return 'warning'; return 'good'; };
const getStatusText = (s) => ({ good: 'Normal', warning: 'Precaución', critical: 'Crítico' }[s] || 'Normal');

const availableWorkersFiltered = computed(() => {
  const assignedIds = projectWorkers.value.map(w => w.id);
  return allWorkers.value.filter(w => !assignedIds.includes(w.id));
});

// Load data
const loadProjects = async () => {
  loading.value = true;
  try {
    const res = await fetch(`${apiBase.value}/list`);
    const data = await res.json();
    if (data.success) projects.value = data.projects || [];
  } catch (e) { console.error(e); }
  loading.value = false;
};

const loadStats = async () => {
  try {
    const res = await fetch(`${apiBase.value}/stats`);
    const data = await res.json();
    if (data.success) stats.value = data.stats;
  } catch (e) { console.error(e); }
};

const loadSupervisors = async () => {
  try {
    const res = await fetch(`${apiBase.value}/supervisors`);
    const data = await res.json();
    if (data.success) supervisors.value = data.supervisors || [];
  } catch (e) { console.error(e); }
};

const loadAllWorkers = async () => {
  try {
    const res = await fetch(`${apiBase.value}/workers`);
    const data = await res.json();
    if (data.success) allWorkers.value = data.workers || [];
  } catch (e) { console.error(e); }
};

const selectProject = async (project) => {
  try {
    const res = await fetch(`${apiBase.value}/${project.id}`);
    const data = await res.json();
    if (data.success) {
      selectedProject.value = data.project;
      projectWorkers.value = data.workers || [];
      projectOrders.value = data.orders || [];
      projectSummary.value = data.summary || {};
      editForm.value = { name: data.project.name, spending_threshold: data.project.spending_threshold, supervisor_id: data.project.supervisor_id };
    }
  } catch (e) { console.error(e); }
};

// Workers
const addWorkerToProject = async () => {
  if (!selectedWorkerId.value || !selectedProject.value) return;
  try {
    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}/workers`, {
      method: 'POST', body: JSON.stringify({ trabajador_id: selectedWorkerId.value })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Trabajador agregado', 'success');
      selectedWorkerId.value = '';
      await selectProject({ id: selectedProject.value.id });
    } else {
      showToast(data.message || 'Error', 'error');
    }
  } catch (e) { showToast('Error', 'error'); }
};

const removeWorkerFromProject = async (trabajadorId) => {
  if (!selectedProject.value) return;
  try {
    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}/workers/${trabajadorId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Trabajador removido', 'success');
      await selectProject({ id: selectedProject.value.id });
    }
  } catch (e) { showToast('Error', 'error'); }
};

// Orders
const addMaterial = () => {
  const m = newMaterial.value.trim();
  if (m && !orderForm.value.materials.includes(m)) {
    orderForm.value.materials.push(m);
    newMaterial.value = '';
  }
};

const createOrder = async () => {
  if (!selectedProject.value || !orderForm.value.description || orderForm.value.materials.length === 0) return;
  savingOrder.value = true;
  try {
    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}/order`, {
      method: 'POST',
      body: JSON.stringify({ type: 'material', description: orderForm.value.description, materials: orderForm.value.materials })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Orden enviada a Compras', 'success');
      orderForm.value = { description: '', materials: [] };
      await selectProject({ id: selectedProject.value.id });
    } else {
      showToast(data.message || 'Error', 'error');
    }
  } catch (e) { showToast('Error', 'error'); }
  savingOrder.value = false;
};

// Create/Update/Delete (managers only)
const openCreateModal = () => { form.value = { name: '', currency: 'PEN', amount: 0, threshold: 75, igv_enabled: true, igv_rate: 18, supervisor_id: '' }; errorMessage.value = ''; showCreateModal.value = true; loadSupervisors(); };
const closeCreateModal = () => { showCreateModal.value = false; };

const createProject = async () => {
  if (!form.value.name || form.value.amount <= 0 || !form.value.supervisor_id) { errorMessage.value = 'Complete todos los campos'; return; }
  saving.value = true;
  try {
    const res = await fetchWithCsrf(`${apiBase.value}/create`, { method: 'POST', body: JSON.stringify(form.value) });
    const data = await res.json();
    if (data.success) { showToast('Proyecto creado', 'success'); closeCreateModal(); await loadProjects(); await loadStats(); }
    else { errorMessage.value = data.message || 'Error'; }
  } catch (e) { errorMessage.value = 'Error'; }
  saving.value = false;
};

const updateProject = async () => {
  if (!selectedProject.value) return;
  saving.value = true;
  try {
    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}`, { method: 'PUT', body: JSON.stringify(editForm.value) });
    const data = await res.json();
    if (data.success) { showToast('Actualizado', 'success'); await loadProjects(); await selectProject({ id: selectedProject.value.id }); }
    else { showToast(data.message || 'Error', 'error'); }
  } catch (e) { showToast('Error', 'error'); }
  saving.value = false;
};

const confirmDeleteProject = async () => {
  if (!selectedProject.value || !confirm(`¿Eliminar "${selectedProject.value.name}"?`)) return;
  try {
    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('Eliminado', 'success'); selectedProject.value = null; await loadProjects(); await loadStats(); }
  } catch (e) { showToast('Error', 'error'); }
};

onMounted(() => {
  loadProjects();
  loadStats();
  loadSupervisors();
  if (props.isSupervisor) loadAllWorkers();
});
</script>
