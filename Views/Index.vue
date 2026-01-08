<template>
  <div class="proyectos-layout" :class="{ 'dark-mode': isDarkMode }">
    <!-- Fondo animado -->
    <div class="animated-background"></div>
    
    <!-- Contenedor principal -->
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
            GESTIÓN DE PROYECTOS
          </h1>
        </div>
        <div class="header-right">
          <label class="theme-switch">
            <input type="checkbox" v-model="isDarkMode">
            <span class="slider"></span>
          </label>
        </div>
      </header>

      <main class="module-content">
        <!-- Tab Navigation -->
        <div class="tab-navigation">
          <button 
            @click="activeTab = 'list'" 
            :class="{ active: activeTab === 'list' }"
            class="tab-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Proyectos
          </button>
          <button 
            @click="activeTab = 'detail'" 
            v-if="selectedProject"
            :class="{ active: activeTab === 'detail' }"
            class="tab-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ selectedProject?.name }}
          </button>
        </div>

        <!-- Statistics Cards -->
        <div v-if="activeTab === 'list'" class="stats-grid">
          <div class="stat-card stat-disponible">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="stat-content">
              <h3>DISPONIBLE TOTAL</h3>
              <p class="stat-number">S/ {{ formatNumber(stats.total_remaining) }}</p>
              <p class="stat-amount">Presupuesto restante</p>
            </div>
          </div>

          <div class="stat-card stat-gastado">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div class="stat-content">
              <h3>TOTAL GASTADO</h3>
              <p class="stat-number">S/ {{ formatNumber(stats.total_spent) }}</p>
              <p class="stat-amount">En todos los proyectos</p>
            </div>
          </div>

          <div class="stat-card stat-proyectos">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="stat-content">
              <h3>PROYECTOS ACTIVOS</h3>
              <p class="stat-number">{{ stats.active_projects }}</p>
              <p class="stat-amount">En seguimiento</p>
            </div>
          </div>
        </div>

        <!-- Botón de acción -->
        <div v-if="activeTab === 'list'" class="actions-container">
          <button @click="openCreateModal" class="btn-nuevo-proyecto">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proyecto
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <span>Cargando proyectos...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="activeTab === 'list' && projects.length === 0" class="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No hay proyectos</h3>
          <p>Comienza creando tu primer proyecto</p>
          <button @click="openCreateModal" class="btn-nuevo-proyecto">
            Crear Primer Proyecto
          </button>
        </div>

        <!-- Projects Grid -->
        <div v-else-if="activeTab === 'list'" class="projects-grid">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            @click="selectProject(project)"
          >
            <div class="project-header-card">
              <div class="project-title-section">
                <h3>{{ project.name }}</h3>
                <p class="project-date">{{ formatDate(project.created_at) }}</p>
              </div>
              <div class="project-status-badge" :class="'status-' + project.status_label">
                {{ getStatusText(project.status_label) }}
              </div>
            </div>

            <div class="project-metrics">
              <div class="metric-item">
                <span class="metric-label">Adjudicado</span>
                <span class="metric-value">S/ {{ formatNumber(project.total_amount) }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Disponible</span>
                <span class="metric-value">S/ {{ formatNumber(project.available_amount) }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Gastado</span>
                <span class="metric-value">S/ {{ formatNumber(project.spent) }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Restante</span>
                <span class="metric-value">S/ {{ formatNumber(project.remaining) }}</span>
              </div>
            </div>

            <div class="progress-section">
              <div class="progress-header">
                <span class="progress-label">Uso del Presupuesto</span>
                <span class="progress-percent" :class="'text-' + project.status_label">
                  {{ parseFloat(project.usage_percent || 0).toFixed(1) }}%
                </span>
              </div>
              <div class="progress-bar-container">
                <div 
                  class="progress-bar-fill" 
                  :class="'bg-' + project.status_label"
                  :style="{ width: Math.min(project.usage_percent || 0, 100) + '%' }"
                ></div>
              </div>
            </div>

            <div class="card-actions">
              <button @click.stop="selectProject(project)" class="btn-ver-detalles">
                Ver Detalles
              </button>
              <button @click.stop="confirmDelete(project)" class="btn-eliminar">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Project Detail View -->
        <div v-if="activeTab === 'detail' && selectedProject" class="project-detail">
          <div class="detail-header">
            <button @click="activeTab = 'list'; selectedProject = null" class="btn-back-small">
              ← Volver a lista
            </button>
            <h2>{{ selectedProject.name }}</h2>
            <span class="project-status-badge" :class="'status-' + (detailData.summary?.status_label || 'good')">
              {{ getStatusText(detailData.summary?.status_label) }}
            </span>
          </div>

          <!-- Project Summary Cards -->
          <div class="detail-stats-grid">
            <div class="detail-stat-card">
              <h4>Presupuesto Total</h4>
              <p class="detail-stat-value">S/ {{ formatNumber(selectedProject.total_amount) }}</p>
            </div>
            <div class="detail-stat-card">
              <h4>Disponible (88%)</h4>
              <p class="detail-stat-value">S/ {{ formatNumber(selectedProject.available_amount) }}</p>
            </div>
            <div class="detail-stat-card">
              <h4>Gastado</h4>
              <p class="detail-stat-value text-warning">S/ {{ formatNumber(detailData.summary?.spent || 0) }}</p>
            </div>
            <div class="detail-stat-card">
              <h4>Restante</h4>
              <p class="detail-stat-value text-success">S/ {{ formatNumber(detailData.summary?.remaining || 0) }}</p>
            </div>
          </div>

          <!-- Add Order Section -->
          <div class="add-order-section">
            <h3>Registrar Nuevo Gasto / Orden</h3>
            
            <!-- Type Tabs -->
            <div class="order-type-tabs">
              <button 
                @click="orderForm.type = 'service'" 
                :class="{ active: orderForm.type === 'service' }"
                class="type-tab"
              >
                🔧 Gasto por Servicio
              </button>
              <button 
                @click="orderForm.type = 'material'" 
                :class="{ active: orderForm.type === 'material' }"
                class="type-tab"
              >
                📦 Orden de Materiales
              </button>
            </div>

            <!-- Service Form -->
            <form v-if="orderForm.type === 'service'" @submit.prevent="createOrder" class="order-form">
              <div class="form-row">
                <input 
                  v-model="orderForm.description" 
                  type="text" 
                  placeholder="Descripción (ej: Servicio de Taxi)"
                  required
                  class="input-field"
                />
                <input 
                  v-model.number="orderForm.amount" 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  placeholder="Monto (S/)"
                  required
                  class="input-field amount"
                />
                <button type="submit" :disabled="creatingOrder" class="btn-add-order service">
                  <span v-if="creatingOrder">Guardando...</span>
                  <span v-else>+ Registrar Gasto</span>
                </button>
              </div>
            </form>

            <!-- Material Form -->
            <form v-else @submit.prevent="createOrder" class="order-form material-form">
              <div class="form-group">
                <input 
                  v-model="orderForm.description" 
                  type="text" 
                  placeholder="Descripción de la orden (ej: Materiales de construcción)"
                  required
                  class="input-field"
                />
              </div>
              
              <div class="materials-input">
                <label>Materiales a comprar:</label>
                <div class="material-add-row">
                  <input 
                    v-model="newMaterial" 
                    type="text" 
                    placeholder="Agregar material..."
                    @keyup.enter.prevent="addMaterial"
                    class="input-field"
                  />
                  <button type="button" @click="addMaterial" class="btn-add-material">+</button>
                </div>
                
                <ul v-if="orderForm.materials.length" class="materials-list-input">
                  <li v-for="(mat, idx) in orderForm.materials" :key="idx">
                    <span>{{ mat }}</span>
                    <button type="button" @click="removeMaterial(idx)" class="btn-remove-material">×</button>
                  </li>
                </ul>
                <p v-else class="materials-hint">Agregue los materiales que necesita comprar</p>
              </div>

              <button type="submit" :disabled="creatingOrder || orderForm.materials.length === 0" class="btn-add-order material">
                <span v-if="creatingOrder">Enviando...</span>
                <span v-else>📤 Enviar para Aprobación</span>
              </button>
              <p class="order-hint">* La orden se enviará a Compras para asignar precio y aprobar</p>
            </form>
          </div>

          <!-- Orders List -->
          <div class="orders-section">
            <h3>Órdenes y Gastos ({{ detailData.orders?.length || 0 }})</h3>
            
            <div v-if="detailData.orders?.length === 0" class="empty-orders">
              <p>No hay órdenes registradas en este proyecto</p>
            </div>

            <div v-else class="orders-table">
              <table>
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
                  <tr v-for="order in detailData.orders" :key="order.id" :class="'row-' + order.status">
                    <td>{{ formatDate(order.created_at) }}</td>
                    <td>
                      <span class="type-badge" :class="order.type">
                        {{ order.type === 'service' ? '🔧 Servicio' : '📦 Materiales' }}
                      </span>
                    </td>
                    <td>
                      {{ order.description }}
                      <ul v-if="order.materials?.length" class="materials-inline">
                        <li v-for="(mat, idx) in order.materials" :key="idx">{{ mat }}</li>
                      </ul>
                    </td>
                    <td>
                      <span class="status-badge" :class="order.status">
                        {{ order.status === 'approved' ? '✓ Aprobado' : order.status === 'pending' ? '🕐 Pendiente' : '✗ Rechazado' }}
                      </span>
                    </td>
                    <td class="amount-cell">
                      <div v-if="order.status === 'approved'" class="amount-approved-wrap">
                        <span class="currency-badge" :class="order.currency || 'PEN'">{{ order.currency || 'PEN' }}</span>
                        <span>{{ order.currency === 'USD' ? '$' : 'S/' }} {{ formatNumber(order.amount) }}</span>
                        <div v-if="order.currency === 'USD' && order.exchange_rate" class="exchange-info-small">
                          <span>T.C: {{ parseFloat(order.exchange_rate).toFixed(4) }}</span>
                          <span>= S/ {{ formatNumber(order.amount_pen) }}</span>
                        </div>
                      </div>
                      <span v-else-if="order.status === 'pending'" class="pending-amount">Por asignar</span>
                      <span v-else class="rejected-amount">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <!-- Create Project Modal -->
      <Teleport to="body">
        <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Crear Nuevo Proyecto</h2>
              <button @click="closeCreateModal" class="btn-close">×</button>
            </div>
            
            <form @submit.prevent="createProject" class="modal-form">
              <div class="form-group">
                <label>Nombre del Proyecto</label>
                <input 
                  v-model="form.name" 
                  type="text" 
                  required 
                  placeholder="Ej: Construcción Edificio A"
                  class="input-field"
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Monto Adjudicado (S/)</label>
                  <input 
                    v-model.number="form.amount" 
                    @input="updatePreview"
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    required
                    placeholder="0.00"
                    class="input-field"
                  />
                </div>
                <div class="form-group">
                  <label>Umbral de Alerta (%)</label>
                  <input 
                    v-model.number="form.threshold" 
                    type="number" 
                    min="0" 
                    max="100" 
                    required
                    class="input-field"
                  />
                </div>
              </div>

              <div class="checkbox-group">
                <input 
                  v-model="form.includeIgv" 
                  @change="updatePreview"
                  type="checkbox" 
                  id="includeIgv"
                />
                <label for="includeIgv">Incluir IGV (18%)</label>
              </div>

              <!-- Preview -->
              <div class="preview-section">
                <h4>Cálculo Automático</h4>
                <div class="preview-grid">
                  <div class="preview-item">
                    <span class="preview-label">Monto Total</span>
                    <span class="preview-value">S/ {{ formatNumber(preview.total) }}</span>
                  </div>
                  <div class="preview-item warning">
                    <span class="preview-label">Retención (12%)</span>
                    <span class="preview-value">S/ {{ formatNumber(preview.retained) }}</span>
                  </div>
                  <div class="preview-item success">
                    <span class="preview-label">Disponible (88%)</span>
                    <span class="preview-value">S/ {{ formatNumber(preview.available) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="errorMessage" class="error-message">
                {{ errorMessage }}
              </div>

              <div class="modal-footer">
                <button type="button" @click="closeCreateModal" class="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" :disabled="saving" class="btn-submit">
                  {{ saving ? 'Creando...' : 'Crear Proyecto' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- Toast Notification -->
      <Teleport to="body">
        <div v-if="toast.show" class="toast" :class="toast.type">
          <span>{{ toast.message }}</span>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

// State
const isDarkMode = ref(false);
const activeTab = ref('list');
const loading = ref(false);
const saving = ref(false);
const creatingOrder = ref(false);
const showCreateModal = ref(false);
const errorMessage = ref('');
const projects = ref([]);
const selectedProject = ref(null);
const detailData = ref({ orders: [], summary: {} });
const toast = ref({ show: false, message: '', type: 'success' });
const newMaterial = ref('');

const stats = ref({
  total_projects: 0,
  active_projects: 0,
  total_budget: 0,
  total_spent: 0,
  total_remaining: 0
});

const form = ref({
  name: '',
  amount: 0,
  includeIgv: false,
  threshold: 75
});

const preview = ref({
  total: 0,
  retained: 0,
  available: 0
});

const orderForm = ref({
  type: 'service',
  description: '',
  amount: 0,
  materials: []
});

// Get module name dynamically
const getModuleName = () => {
  const path = window.location.pathname;
  const match = path.match(/^\/([^\/]+)/);
  return match ? match[1] : 'proyectos_krsft';
};

const apiBase = computed(() => `/api/${getModuleName()}`);

// Get CSRF token from meta tag
const getCsrfToken = () => {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
};

// Helper for fetch with CSRF
const fetchWithCsrf = (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-CSRF-TOKEN': getCsrfToken(),
    ...options.headers
  };
  return fetch(url, { ...options, headers });
};

// Methods
const goBack = () => {
  window.location.href = '/';
};

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type };
  setTimeout(() => toast.value.show = false, 4000);
};

const formatNumber = (num) => {
  return parseFloat(num || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusText = (status) => {
  const texts = { good: 'Normal', warning: 'Precaución', critical: 'Crítico' };
  return texts[status] || 'Normal';
};

const updatePreview = () => {
  const IGV_RATE = 0.18;
  const RETENTION_RATE = 0.12;
  const AVAILABLE_RATE = 0.88;
  
  const base = form.value.amount || 0;
  const total = form.value.includeIgv ? base * (1 + IGV_RATE) : base;
  
  preview.value.total = total;
  preview.value.retained = total * RETENTION_RATE;
  preview.value.available = total * AVAILABLE_RATE;
};

const loadProjects = async () => {
  try {
    loading.value = true;
    const res = await fetch(`${apiBase.value}/list`);
    const data = await res.json();
    if (data.success) {
      projects.value = data.projects || [];
    }
  } catch (e) {
    console.error('Error loading projects:', e);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const res = await fetch(`${apiBase.value}/stats`);
    const data = await res.json();
    if (data.success) {
      stats.value = data.stats;
    }
  } catch (e) {
    console.error('Error loading stats:', e);
  }
};

const selectProject = async (project) => {
  selectedProject.value = project;
  activeTab.value = 'detail';
  await loadProjectDetail(project.id);
};

const loadProjectDetail = async (id) => {
  try {
    const res = await fetch(`${apiBase.value}/${id}`);
    const data = await res.json();
    if (data.success) {
      detailData.value = {
        orders: data.orders || [],
        summary: data.summary || {}
      };
    }
  } catch (e) {
    console.error('Error loading project detail:', e);
  }
};

const openCreateModal = () => {
  form.value = { name: '', amount: 0, includeIgv: false, threshold: 75 };
  preview.value = { total: 0, retained: 0, available: 0 };
  errorMessage.value = '';
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
};

const createProject = async () => {
  if (!form.value.name.trim()) {
    errorMessage.value = 'El nombre es requerido';
    return;
  }
  if (form.value.amount <= 0) {
    errorMessage.value = 'El monto debe ser mayor a 0';
    return;
  }

  try {
    saving.value = true;
    errorMessage.value = '';

    const res = await fetchWithCsrf(`${apiBase.value}/create`, {
      method: 'POST',
      body: JSON.stringify(form.value)
    });

    const data = await res.json();

    if (data.success) {
      showToast('Proyecto creado exitosamente', 'success');
      closeCreateModal();
      await loadProjects();
      await loadStats();
    } else {
      errorMessage.value = data.message || 'Error al crear proyecto';
    }
  } catch (e) {
    errorMessage.value = 'Error de conexión';
    console.error(e);
  } finally {
    saving.value = false;
  }
};

// Material helpers
const addMaterial = () => {
  const mat = newMaterial.value.trim();
  if (mat && !orderForm.value.materials.includes(mat)) {
    orderForm.value.materials.push(mat);
    newMaterial.value = '';
  }
};

const removeMaterial = (idx) => {
  orderForm.value.materials.splice(idx, 1);
};

// Create order (service or material)
const createOrder = async () => {
  if (!orderForm.value.description.trim()) {
    showToast('Ingrese una descripción', 'error');
    return;
  }

  if (orderForm.value.type === 'service' && orderForm.value.amount <= 0) {
    showToast('Ingrese un monto válido', 'error');
    return;
  }

  if (orderForm.value.type === 'material' && orderForm.value.materials.length === 0) {
    showToast('Agregue al menos un material', 'error');
    return;
  }

  try {
    creatingOrder.value = true;

    const payload = {
      type: orderForm.value.type,
      description: orderForm.value.description
    };

    if (orderForm.value.type === 'service') {
      payload.amount = orderForm.value.amount;
    } else {
      payload.materials = orderForm.value.materials;
    }

    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}/order`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      const msg = orderForm.value.type === 'service' 
        ? 'Gasto por servicio registrado' 
        : 'Orden enviada para aprobación';
      showToast(msg, 'success');
      
      // Reset form
      orderForm.value = { type: 'service', description: '', amount: 0, materials: [] };
      
      await loadProjectDetail(selectedProject.value.id);
      await loadStats();
      await loadProjects();
    } else {
      showToast(data.message || 'Error al crear orden', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    creatingOrder.value = false;
  }
};

const confirmDelete = async (project) => {
  if (!confirm(`¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await fetchWithCsrf(`${apiBase.value}/${project.id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      showToast('Proyecto eliminado', 'success');
      await loadProjects();
      await loadStats();
    } else {
      showToast(data.message || 'Error', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
};

// Lifecycle
onMounted(() => {
  loadProjects();
  loadStats();
});
</script>

<style scoped>
/* Layout */
.proyectos-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: #fff;
}

.dark-mode {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.animated-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 80%, rgba(235, 160, 89, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.proyectos-container {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.title-icon {
  width: 32px;
  height: 32px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-back svg {
  width: 20px;
  height: 20px;
}

/* Theme Switch */
.theme-switch {
  position: relative;
  width: 60px;
  height: 30px;
}

.theme-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 30px;
  transition: 0.4s;
}

.slider:before {
  content: "";
  position: absolute;
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background: #fff;
  border-radius: 50%;
  transition: 0.4s;
}

.theme-switch input:checked + .slider:before {
  transform: translateX(30px);
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover, .tab-btn.active {
  background: rgba(235, 160, 89, 0.3);
}

.tab-btn svg {
  width: 20px;
  height: 20px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background: rgba(235, 160, 89, 0.2);
  border-radius: 12px;
}

.stat-icon svg {
  width: 28px;
  height: 28px;
  color: #eba059;
}

.stat-content h3 {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 4px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
}

.stat-amount {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0 0 0;
}

/* Actions */
.actions-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.btn-nuevo-proyecto {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #eba059 0%, #d97706 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(235, 160, 89, 0.3);
}

.btn-nuevo-proyecto:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(235, 160, 89, 0.4);
}

.btn-nuevo-proyecto svg {
  width: 20px;
  height: 20px;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #eba059;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 1.25rem;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 20px 0;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.project-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border-color: rgba(235, 160, 89, 0.3);
}

.project-header-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.project-title-section h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.project-date {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.project-status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-good { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.status-critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.project-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.metric-item {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.metric-value {
  font-size: 1rem;
  font-weight: 600;
}

/* Progress */
.progress-section {
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.progress-percent {
  font-weight: 600;
}

.text-good { color: #10b981; }
.text-warning { color: #f59e0b; }
.text-critical { color: #ef4444; }

.progress-bar-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bg-good { background: #10b981; }
.bg-warning { background: #f59e0b; }
.bg-critical { background: #ef4444; }

.card-actions {
  display: flex;
  gap: 10px;
}

.btn-ver-detalles {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #eba059 0%, #d97706 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-ver-detalles:hover {
  opacity: 0.9;
}

.btn-eliminar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(239, 68, 68, 0.2);
  border: none;
  border-radius: 10px;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-eliminar:hover {
  background: rgba(239, 68, 68, 0.3);
}

.btn-eliminar svg {
  width: 20px;
  height: 20px;
}

/* Project Detail */
.project-detail {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 30px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.detail-header h2 {
  flex: 1;
  font-size: 1.5rem;
  margin: 0;
}

.btn-back-small {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.detail-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.detail-stat-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 16px;
  text-align: center;
}

.detail-stat-card h4 {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 8px 0;
}

.detail-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.text-warning { color: #f59e0b; }
.text-success { color: #10b981; }

/* Add Order Section */
.add-order-section {
  background: rgba(255, 255, 255, 0.1);
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 30px;
}

.add-order-section h3 {
  font-size: 1rem;
  margin: 0 0 16px 0;
}

.order-type-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.type-tab {
  flex: 1;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
  font-weight: 500;
}

.type-tab:hover {
  background: rgba(255, 255, 255, 0.15);
}

.type-tab.active {
  background: rgba(235, 160, 89, 0.2);
  border-color: #eba059;
  color: #eba059;
}

.order-form .form-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.order-form .form-group {
  margin-bottom: 16px;
}

.input-field {
  flex: 1;
  min-width: 150px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #fff;
  font-size: 0.95rem;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input-field.amount {
  max-width: 150px;
}

.materials-input {
  margin-bottom: 20px;
}

.materials-input label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.8);
}

.material-add-row {
  display: flex;
  gap: 10px;
}

.btn-add-material {
  padding: 12px 20px;
  background: rgba(59, 130, 246, 0.3);
  border: none;
  border-radius: 10px;
  color: #60a5fa;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-add-material:hover {
  background: rgba(59, 130, 246, 0.4);
}

.materials-list-input {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.materials-list-input li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  font-size: 0.9rem;
}

.btn-remove-material {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 1.2rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.materials-hint {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 10px;
}

.btn-add-order {
  padding: 14px 28px;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-add-order.service {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.btn-add-order.material {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  width: 100%;
}

.btn-add-order:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.order-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 10px;
  text-align: center;
}

/* Orders Section */
.orders-section h3 {
  font-size: 1rem;
  margin: 0 0 16px 0;
}

.empty-orders {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.6);
}

.orders-table {
  overflow-x: auto;
}

.orders-table table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th,
.orders-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.orders-table th {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
}

.orders-table td {
  font-size: 0.95rem;
}

.orders-table tr.row-pending {
  background: rgba(245, 158, 11, 0.05);
}

.orders-table tr.row-rejected {
  opacity: 0.5;
}

.type-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-badge.service { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
.type-badge.material { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.approved { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-badge.pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.status-badge.rejected { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.materials-inline {
  list-style: none;
  padding: 4px 0 0 0;
  margin: 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.materials-inline li::before {
  content: "• ";
}

.amount-cell {
  font-weight: 600;
}

.amount-approved-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.currency-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  margin-right: 6px;
}

.currency-badge.PEN { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.currency-badge.USD { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }

.exchange-info-small {
  display: flex;
  gap: 6px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}

.pending-amount {
  color: #f59e0b;
  font-style: italic;
}

.rejected-amount {
  color: #ef4444;
}

.btn-delete-expense svg {
  width: 18px;
  height: 18px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  border-radius: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  font-size: 1.25rem;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.7;
}

.btn-close:hover {
  opacity: 1;
}

.modal-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.8);
}

.modal-form .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.checkbox-group input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-group label {
  cursor: pointer;
}

/* Preview */
.preview-section {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 20px;
}

.preview-section h4 {
  font-size: 0.9rem;
  margin: 0 0 16px 0;
  color: rgba(255, 255, 255, 0.7);
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.preview-item {
  text-align: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.preview-item.warning {
  background: rgba(245, 158, 11, 0.1);
}

.preview-item.success {
  background: rgba(16, 185, 129, 0.1);
}

.preview-label {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.preview-value {
  font-size: 1rem;
  font-weight: 600;
}

.error-message {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 20px;
  text-align: center;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.btn-submit {
  padding: 12px 24px;
  background: linear-gradient(135deg, #eba059 0%, #d97706 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 16px 24px;
  border-radius: 12px;
  color: #fff;
  font-weight: 500;
  z-index: 1001;
  animation: slideIn 0.3s ease;
}

.toast.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.toast.error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-form .form-row {
    grid-template-columns: 1fr;
  }
  
  .preview-grid {
    grid-template-columns: 1fr;
  }
  
  .expense-form .form-row {
    flex-direction: column;
  }
  
  .input-field.amount,
  .input-field.category {
    max-width: none;
  }
}
</style>
