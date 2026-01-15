<template>
  <div class="proyectos-layout">
    <!-- Animated Background -->
    <div class="proyectos-bg"></div>

    <!-- Main Container -->
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
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            {{ isSupervisor ? 'MIS PROYECTOS ASIGNADOS' : 'GESTIÓN DE PROYECTOS' }}
          </h1>
        </div>
        <div class="header-right">
          <div v-if="isSupervisor" class="role-badge supervisor">SUPERVISOR</div>
          <button @click="toggleDarkMode" class="theme-toggle" title="Cambiar tema">
            <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        </div>
      </header>

      <main class="module-content">
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
          <div v-for="project in projects" :key="project.id" class="project-card" :style="{ borderLeftColor: getProjectColor(project.id) }" @click="selectProject(project)">
            <h3 :style="{ color: getProjectColor(project.id) }">{{ project.name }}</h3>
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
              <div class="progress-fill" :class="getStatusLabel(project)" :style="{ width: Math.min(parseFloat(project.usage_percent) || 0, 100) + '%' }"></div>
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
            <button @click="selectedProject = null; projectWorkers = []; projectOrders = []" class="btn-back-detail" :style="{ background: getProjectColor(selectedProject.id) }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M5 12L12 19M5 12L12 5"/>
              </svg>
              Volver
            </button>
            <h2 :style="{ color: getProjectColor(selectedProject.id) }">{{ selectedProject.name }}</h2>
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
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Trabajadores del Proyecto
            </h3>
            
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
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Solicitar Materiales
            </h3>
            
            <form @submit.prevent="createOrder" class="order-form">
              <div class="form-group">
                <label>Material a solicitar</label>
                <div class="material-add-row">
                  <input v-model="newMaterial" type="text" placeholder="Nombre del material..." class="input-field" />
                  <input v-model.number="newMaterialQty" type="number" min="1" placeholder="Cantidad" class="input-field qty-input" />
                  <button type="button" @click="addMaterial" :disabled="!newMaterial || !newMaterialQty" class="btn-add">+</button>
                </div>
              </div>

              <ul v-if="orderForm.materials.length" class="materials-list">
                <li v-for="(mat, idx) in orderForm.materials" :key="idx">
                  <span>{{ mat.name }} - <strong>{{ mat.qty }}</strong> unidades</span>
                  <button type="button" @click="orderForm.materials.splice(idx, 1)" class="btn-remove">×</button>
                </li>
              </ul>
              <p v-else class="hint">Agregue los materiales que necesita</p>

              <button type="submit" :disabled="savingOrder || orderForm.materials.length === 0" class="btn-submit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2"/>
                </svg>
                {{ savingOrder ? 'Enviando...' : 'Enviar a Aprobación' }}
              </button>
            </form>
          </div>

          <!-- Orders List -->
          <div class="section-box">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Órdenes y Gastos ({{ projectOrders.length }})
            </h3>
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
                <tr v-for="order in projectOrders" :key="order.id" :class="getOrderRowClass(order)">
                  <td>{{ formatDate(order.created_at) }}</td>
                  <td>
                    <span class="order-type-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path v-if="order.type === 'service'" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        <g v-else>
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </g>
                      </svg>
                      {{ order.type === 'service' ? 'Servicio' : 'Material' }}
                    </span>
                  </td>
                  <td>{{ order.description }}</td>
                  <td>
                    <span class="order-status" :class="getOrderStatusClass(order)">
                      {{ getOrderStatusText(order) }}
                    </span>
                  </td>
                  <td>{{ order.amount ? getCurrencySymbol(order.currency) + ' ' + formatNumber(order.total_with_igv || order.amount) : 'Por cotizar' }}</td>
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
import './proyectos_theme.css';
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
const newMaterialQty = ref(1);
const selectedWorkerId = ref('');

const isSupervisor = computed(() => props.isSupervisor);

// Project color palette for random assignment
const projectColors = [
  '#0AA4A4', // Teal
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Green
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

// Get consistent color for project based on ID
const getProjectColor = (projectId) => {
  const index = projectId % projectColors.length;
  return projectColors[index];
};

const stats = ref({ total_projects: 0, active_projects: 0, total_budget: 0, total_spent: 0, total_remaining: 0 });

const form = ref({ name: '', currency: 'PEN', amount: 0, threshold: 75, igv_enabled: true, igv_rate: 18, supervisor_id: '' });
const editForm = ref({ name: '', spending_threshold: 75, supervisor_id: null });
const orderForm = ref({ materials: [] });

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

// Dark mode toggle
const toggleDarkMode = () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
};

const initDarkMode = () => {
  const savedMode = localStorage.getItem('darkMode');
  if (savedMode === 'true' || document.body.classList.contains('dark-mode')) {
    document.body.classList.add('dark-mode');
  }
};

// Order status helpers (gray=pending, yellow=approved, red=rejected, green=paid)
const getOrderStatusClass = (order) => {
  if (order.status === 'rejected') return 'status-rejected';
  if (order.status === 'pending') return 'status-pending';
  if (order.status === 'approved' && order.payment_confirmed) return 'status-paid';
  if (order.status === 'approved') return 'status-approved';
  return 'status-pending';
};

const getOrderStatusText = (order) => {
  if (order.status === 'rejected') return '✗ Rechazado';
  if (order.status === 'pending') return '🕐 Pendiente';
  if (order.status === 'approved' && order.payment_confirmed) return '✓ Pagado';
  if (order.status === 'approved') return '💳 Aprobado';
  return '🕐 Pendiente';
};

const getOrderRowClass = (order) => {
  return 'order-row-' + getOrderStatusClass(order).replace('status-', '');
};

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
  const qty = newMaterialQty.value || 1;
  if (m && qty > 0) {
    // Check if material already exists
    const exists = orderForm.value.materials.find(mat => mat.name === m);
    if (!exists) {
      orderForm.value.materials.push({ name: m, qty: qty });
      newMaterial.value = '';
      newMaterialQty.value = 1;
    }
  }
};

const createOrder = async () => {
  if (!selectedProject.value || orderForm.value.materials.length === 0) return;
  savingOrder.value = true;
  try {
    // Create description from materials list
    const description = orderForm.value.materials.map(m => `${m.name} (${m.qty})`).join(', ');
    
    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}/order`, {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'material', 
        description: description, 
        materials: orderForm.value.materials 
      })
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
  initDarkMode();
  loadProjects();
  loadStats();
  loadSupervisors();
  if (props.isSupervisor) loadAllWorkers();
});
</script>
