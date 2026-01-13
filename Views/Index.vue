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
            GESTIÓN DE PROYECTOS
          </h1>
        </div>
      </header>

      <main>
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <h3>PROYECTOS ACTIVOS</h3>
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

        <!-- Actions -->
        <div class="actions-container">
          <button @click="openCreateModal" class="btn-nuevo">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proyecto
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading">
          <p>Cargando proyectos...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="projects.length === 0 && !selectedProject" class="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No hay proyectos</h3>
          <p>Crea tu primer proyecto</p>
        </div>

        <!-- Projects Grid -->
        <div v-else-if="!selectedProject" class="projects-grid">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            @click="selectProject(project)"
          >
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
              <div 
                class="progress-fill"
                :class="project.status_label"
                :style="{ width: Math.min(parseFloat(project.usage_percent) || 0, 100) + '%' }"
              ></div>
            </div>
            <small>{{ parseFloat(project.usage_percent || 0).toFixed(1) }}% utilizado</small>
          </div>
        </div>

        <!-- Project Detail View -->
        <div v-if="selectedProject" class="project-detail">
          <div class="detail-header">
            <button @click="selectedProject = null" class="btn-back-small">← Volver</button>
            <h2>{{ selectedProject.name }}</h2>
            <span class="status-badge" :class="getStatusLabel(selectedProject)">
              {{ getStatusText(getStatusLabel(selectedProject)) }}
            </span>
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
              <h4>Disponible (88%)</h4>
              <p>{{ getCurrencySymbol(selectedProject.currency) }} {{ formatNumber(selectedProject.available_amount) }}</p>
            </div>
            <div class="detail-card">
              <h4>Umbral de Alerta</h4>
              <p>{{ selectedProject.spending_threshold }}%</p>
            </div>
            <div class="detail-card">
              <h4>IGV</h4>
              <p>{{ selectedProject.igv_enabled ? selectedProject.igv_rate + '%' : 'Deshabilitado' }}</p>
            </div>
            <div class="detail-card">
              <h4>Supervisor</h4>
              <p>{{ selectedProject.supervisor_name || 'No asignado' }}</p>
            </div>
          </div>

          <!-- Edit Section -->
          <div class="edit-section">
            <h3>Editar Proyecto</h3>
            <form @submit.prevent="updateProject">
              <div class="form-group">
                <label>Nombre</label>
                <input v-model="editForm.name" type="text" class="input-field" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Umbral de Alerta (%)</label>
                  <input v-model.number="editForm.spending_threshold" type="number" min="0" max="100" class="input-field" />
                </div>
                <div class="form-group">
                  <label>Supervisor</label>
                  <select v-model="editForm.supervisor_id" class="select-field">
                    <option v-for="sup in supervisors" :key="sup.id" :value="sup.id">
                      {{ sup.nombre_completo }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" @click="confirmDeleteProject" class="btn-delete">Eliminar</button>
                <button type="submit" :disabled="saving" class="btn-submit">
                  {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <!-- Create Modal -->
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
                    <div 
                      class="currency-option" 
                      :class="{ active: form.currency === 'PEN' }"
                      @click="form.currency = 'PEN'"
                    >
                      S/ Soles
                    </div>
                    <div 
                      class="currency-option" 
                      :class="{ active: form.currency === 'USD' }"
                      @click="form.currency = 'USD'"
                    >
                      $ Dólares
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label>Monto Adjudicado</label>
                  <input v-model.number="form.amount" type="number" step="0.01" min="0.01" required placeholder="0.00" class="input-field" />
                </div>

                <div class="form-group">
                  <label>Umbral de Alerta (%)</label>
                  <input v-model.number="form.threshold" type="number" min="0" max="100" class="input-field" />
                  <small>Se alertará cuando el gasto supere este porcentaje</small>
                </div>

                <div class="form-group">
                  <div class="igv-row">
                    <div class="checkbox-group">
                      <input type="checkbox" id="igv_enabled" v-model="form.igv_enabled" />
                      <label for="igv_enabled">Incluir IGV</label>
                    </div>
                    <div v-if="form.igv_enabled">
                      <input v-model.number="form.igv_rate" type="number" step="0.01" min="0" max="100" class="input-field igv-input" /> %
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label>Supervisor del Proyecto *</label>
                  <select v-model="form.supervisor_id" required class="select-field">
                    <option value="">Selecciona un supervisor</option>
                    <option v-for="sup in supervisors" :key="sup.id" :value="sup.id">
                      {{ sup.nombre_completo }} ({{ sup.cargo }})
                    </option>
                  </select>
                  <small v-if="supervisors.length === 0">No hay supervisores disponibles. Agrega trabajadores con cargo "Supervisor".</small>
                </div>

                <p v-if="errorMessage" style="color: #ef4444;">{{ errorMessage }}</p>

                <div class="modal-footer">
                  <button type="button" @click="closeCreateModal" class="btn-cancel">Cancelar</button>
                  <button type="submit" :disabled="saving || !form.supervisor_id" class="btn-submit">
                    {{ saving ? 'Creando...' : 'Crear Proyecto' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Toast -->
      <Teleport to="body">
        <div v-if="toast.show" class="toast" :class="toast.type">
          {{ toast.message }}
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import './proyectos.css';

// State
const loading = ref(false);
const saving = ref(false);
const showCreateModal = ref(false);
const errorMessage = ref('');
const projects = ref([]);
const selectedProject = ref(null);
const supervisors = ref([]);
const toast = ref({ show: false, message: '', type: 'success' });

const stats = ref({
  total_projects: 0,
  active_projects: 0,
  total_budget: 0,
  total_spent: 0,
  total_remaining: 0
});

const form = ref({
  name: '',
  currency: 'PEN',
  amount: 0,
  threshold: 75,
  igv_enabled: true,
  igv_rate: 18,
  supervisor_id: ''
});

const editForm = ref({
  name: '',
  spending_threshold: 75,
  supervisor_id: null
});

// API Base
const getModuleName = () => {
  const path = window.location.pathname;
  const match = path.match(/^\/([^\/]+)/);
  return match ? match[1] : 'proyectoskrsft';
};

const apiBase = computed(() => `/api/${getModuleName()}`);

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

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
const goBack = () => window.location.href = '/';

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type };
  setTimeout(() => toast.value.show = false, 4000);
};

const formatNumber = (num) => parseFloat(num || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getCurrencySymbol = (currency) => currency === 'USD' ? '$' : 'S/';

const getStatusLabel = (project) => {
  const usage = project.usage_percent || 0;
  const threshold = project.spending_threshold || 75;
  if (usage >= 90) return 'critical';
  if (usage >= threshold) return 'warning';
  return 'good';
};

const getStatusText = (status) => ({ good: 'Normal', warning: 'Precaución', critical: 'Crítico' }[status] || 'Normal');

const loadProjects = async () => {
  try {
    loading.value = true;
    const res = await fetch(`${apiBase.value}/list`);
    const data = await res.json();
    if (data.success) projects.value = data.projects || [];
  } catch (e) {
    console.error('Error:', e);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const res = await fetch(`${apiBase.value}/stats`);
    const data = await res.json();
    if (data.success) stats.value = data.stats;
  } catch (e) {
    console.error('Error:', e);
  }
};

const loadSupervisors = async () => {
  try {
    const res = await fetch(`${apiBase.value}/supervisors`);
    const data = await res.json();
    if (data.success) supervisors.value = data.supervisors || [];
  } catch (e) {
    console.error('Error:', e);
  }
};

const selectProject = async (project) => {
  try {
    const res = await fetch(`${apiBase.value}/${project.id}`);
    const data = await res.json();
    if (data.success) {
      selectedProject.value = data.project;
      editForm.value = {
        name: data.project.name,
        spending_threshold: data.project.spending_threshold,
        supervisor_id: data.project.supervisor_id
      };
    }
  } catch (e) {
    console.error('Error:', e);
  }
};

const openCreateModal = () => {
  form.value = { name: '', currency: 'PEN', amount: 0, threshold: 75, igv_enabled: true, igv_rate: 18, supervisor_id: '' };
  errorMessage.value = '';
  showCreateModal.value = true;
  loadSupervisors();
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
  if (!form.value.supervisor_id) {
    errorMessage.value = 'Debes seleccionar un supervisor';
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
  } finally {
    saving.value = false;
  }
};

const updateProject = async () => {
  if (!selectedProject.value) return;

  try {
    saving.value = true;

    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}`, {
      method: 'PUT',
      body: JSON.stringify(editForm.value)
    });

    const data = await res.json();

    if (data.success) {
      showToast('Proyecto actualizado', 'success');
      await loadProjects();
      await selectProject({ id: selectedProject.value.id });
    } else {
      showToast(data.message || 'Error', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    saving.value = false;
  }
};

const confirmDeleteProject = async () => {
  if (!selectedProject.value) return;
  if (!confirm(`¿Eliminar proyecto "${selectedProject.value.name}"?`)) return;

  try {
    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      showToast('Proyecto eliminado', 'success');
      selectedProject.value = null;
      await loadProjects();
      await loadStats();
    } else {
      showToast(data.message || 'Error', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
};

onMounted(() => {
  loadProjects();
  loadStats();
  loadSupervisors();
});
</script>
