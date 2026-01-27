<template>
  <div class="proyectos-layout">
    <!-- Animated Background -->
    <div class="proyectos-bg"></div>

    <!-- Main Container -->
    <div class="proyectos-container">
      <!-- Header -->
      <header class="module-header">
        <!-- Normal header when no project selected -->
        <div v-if="!selectedProject" class="header-left">
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
        
        <!-- Project detail header when project selected -->
        <div v-else class="header-left project-detail-header">
          <button @click="selectedProject = null; projectWorkers = []; projectOrders = []" class="btn-back-projects">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M5 12L12 19M5 12L12 5"/>
            </svg>
          </button>
          <span class="project-name-pill" :style="{ background: getProjectColor(selectedProject.id) }">
            {{ selectedProject.name }}
          </span>
          <span class="currency-pill">{{ selectedProject.currency || 'PEN' }}</span>
          <span class="status-badge" :class="getStatusLabel(selectedProject)">{{ getStatusText(getStatusLabel(selectedProject)) }}</span>
        </div>
        
        <div class="header-right">
          <div v-if="isSupervisor && !selectedProject" class="role-badge supervisor">SUPERVISOR</div>
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
        <!-- Actions (only for managers, not supervisors) - Hide if empty state (button moves there) -->
        <div v-if="!isSupervisor && !selectedProject && projects.length > 0" class="actions-container">
          <button @click="openCreateModal" class="btn-nuevo">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proyecto
          </button>
        </div>

        <!-- Filter Bar -->
        <div v-if="projects.length > 0 && !selectedProject" class="filter-bar">
          <div class="filter-group">
            <button 
              v-for="filter in statusFilters" 
              :key="filter.value"
              :class="['filter-btn', { active: statusFilter === filter.value }]"
              @click="statusFilter = filter.value"
            >
              <svg v-if="filter.icon" :viewBox="filter.viewBox || '0 0 24 24'" fill="none" stroke="currentColor" stroke-width="2">
                <path v-if="filter.icon === 'all'" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                <path v-if="filter.icon === 'good'" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                <path v-if="filter.icon === 'warning'" stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                <path v-if="filter.icon === 'critical'" stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ filter.label }}
              <span v-if="filter.count !== undefined" class="filter-count">{{ filter.count }}</span>
            </button>
          </div>
          
          <div class="filter-dates">
            <div class="date-input-group">
              <label>Desde:</label>
              <input type="date" v-model="dateFrom" class="date-input" />
            </div>
            <div class="date-input-group">
              <label>Hasta:</label>
              <input type="date" v-model="dateTo" class="date-input" />
            </div>
            <button v-if="dateFrom || dateTo" @click="clearDateFilters" class="btn-clear-dates">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
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
          
          <button v-if="!isSupervisor" @click="openCreateModal" class="btn-nuevo" style="margin-top: 24px;">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proyecto
          </button>
        </div>

        <!-- Projects Grid -->
        <div v-else-if="!selectedProject" class="projects-grid">
          <div v-for="project in filteredProjects" :key="project.id" class="project-card" :style="{ borderLeftColor: getProjectColor(project.id) }" @click="selectProject(project)">
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

          <!-- Consolidated Stats with Chart -->
          <div class="project-stats-panel">
            <!-- Left: Stats List -->
            <div class="stats-list">
              <div class="stat-row">
                <span class="stat-label">Monto Adjudicado</span>
                <span class="stat-value primary">{{ getCurrencySymbol(selectedProject.currency) }} {{ formatNumber(selectedProject.total_amount) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Disponible</span>
                <span class="stat-value success">{{ getCurrencySymbol(selectedProject.currency) }} {{ formatNumber(projectSummary.remaining || selectedProject.available_amount) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Gastado</span>
                <span class="stat-value warning">{{ getCurrencySymbol(selectedProject.currency) }} {{ formatNumber(projectSummary.spent || 0) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Órdenes Pendientes</span>
                <span class="stat-value">{{ projectSummary.pending_orders || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Supervisor</span>
                <span class="stat-value muted">{{ selectedProject.supervisor_name || 'No asignado' }}</span>
              </div>
            </div>
            
            <!-- Right: Donut Chart -->
            <div class="expense-chart">
              <svg viewBox="0 0 120 120" class="donut-chart">
                <!-- Background circle -->
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--proyectos-border)" stroke-width="12"/>
                <!-- Spent arc -->
                <circle 
                  cx="60" cy="60" r="50" 
                  fill="none" 
                  stroke="var(--proyectos-warning)" 
                  stroke-width="12"
                  stroke-linecap="round"
                  :stroke-dasharray="getChartArc"
                  stroke-dashoffset="0"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div class="chart-center">
                <span class="chart-percent">{{ getUsagePercent }}%</span>
                <span class="chart-label">Usado</span>
              </div>
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
              <button @click="addWorkerToProject" :disabled="!selectedWorkerId" class="btn-add-icon" title="Agregar trabajador">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
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

          <!-- SUPERVISOR SECTION: Add Expenses -->
          <div v-if="isSupervisor" class="section-box">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              AGREGAR MATERIAL
            </h3>
            
            <form @submit.prevent="createOrder" class="material-form">
              <!-- Row 1: Item, Cantidad, Unidad, Descripción -->
              <div class="material-form-row">
                <div class="form-group form-group-xs">
                  <label>ITEM</label>
                  <input v-model.number="materialForm.item_number" type="number" min="1" class="input-field" :placeholder="nextItemNumber" title="Número de item (dejar vacío para auto-asignar)" />
                </div>
                <div class="form-group form-group-sm">
                  <label>CANT</label>
                  <input v-model.number="materialForm.qty" type="number" min="1" class="input-field" placeholder="1" />
                </div>
                <div class="form-group form-group-sm">
                  <label>UND</label>
                  <input v-model="materialForm.unit" type="text" class="input-field" placeholder="UND" />
                </div>
                <div class="form-group form-group-lg">
                  <label>DESCRIPCIÓN *</label>
                  <input v-model="materialForm.description" type="text" class="input-field" placeholder="Ej: BRIDA ANILLO - SLIP ON RAISED FACE" />
                </div>
              </div>
              
              <!-- Row 2: Diámetro, Serie, Material, Norma -->
              <div class="material-form-row">
                <div class="form-group form-group-md">
                  <label>DIÁMETRO</label>
                  <input v-model="materialForm.diameter" type="text" class="input-field" placeholder="Ej: Φ1/2 INCH" />
                </div>
                <div class="form-group form-group-md">
                  <label>SERIE</label>
                  <input v-model="materialForm.series" type="text" class="input-field" placeholder="Ej: CLASE 150" />
                </div>
                <div class="form-group form-group-md">
                  <label>MATERIAL</label>
                  <input v-model="materialForm.material_type" type="text" class="input-field" placeholder="Ej: ACERO INOXIDABLE" />
                </div>
              </div>
              
              <div class="material-form-actions">
                <div class="actions-left">
                  <button type="submit" :disabled="savingOrder || !materialForm.description || !materialForm.qty" class="btn-add-material">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {{ savingOrder ? 'Agregando...' : 'Agregar Material' }}
                  </button>
                  <p class="hint">Cada material se envía individualmente para aprobación en Compras</p>
                </div>
                <div class="actions-right">
                  <button type="button" @click="downloadTemplate" class="btn-download-template">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Descargar Plantilla
                  </button>
                  <label class="btn-import-excel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {{ importingFile ? 'Importando...' : 'Importar Excel' }}
                    <input type="file" @change="importExcel" accept=".csv,.xlsx,.xls" hidden :disabled="importingFile" />
                  </label>
                </div>
              </div>
            </form>
          </div>

          <!-- Orders List Grouped by File -->
          <div class="section-box orders-section">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Lista de Materiales ({{ projectOrders.length }})
            </h3>
            <div v-if="projectOrders.length === 0" class="empty-list"><p>No hay materiales registrados</p></div>
            
            <!-- Grouped by file sections -->
            <div v-else class="file-groups-container">
              <div v-for="group in ordersGroupedByFile" :key="group.filename || '__manual__'" class="file-group">
                <!-- File group header (collapsible) -->
                <div 
                  class="file-group-header" 
                  :class="{ expanded: expandedFiles[group.filename || '__manual__'], 'all-paid': group.allPaid }"
                  @click="toggleFileSection(group.filename)"
                >
                  <div class="file-header-left">
                    <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="file-name">{{ group.filename || 'Órdenes Manuales' }}</span>
                  </div>
                  <div class="file-header-right">
                    <span class="file-count">{{ group.orders.length }} items</span>
                    <span v-if="group.allDelivered" class="file-status-badge delivered">
                      ✓ Entregado
                    </span>
                    <span v-else class="file-status-badge" :class="{ 'complete': group.allPaid }">
                      {{ group.paidCount }}/{{ group.totalCount }} pagados
                    </span>
                    <button 
                      v-if="group.allPaid && !group.allDelivered && isSupervisor" 
                      class="btn-confirm-all"
                      @click.stop="confirmFileDelivery(group)"
                    >
                      ✓ Confirmar Entrega
                    </button>
                  </div>
                </div>
                
                <!-- File group content (orders table) -->
                <div v-show="expandedFiles[group.filename || '__manual__']" class="file-group-content">
                  <div class="table-scroll-container">
                    <table class="materials-table">
                      <thead>
                        <tr>
                          <th class="col-item">ITEM</th>
                          <th class="col-cant">CANT</th>
                          <th class="col-und">UND</th>
                          <th class="col-desc">DESCRIPCIÓN</th>
                          <th class="col-diam">DIÁMETRO</th>
                          <th class="col-serie">SERIE</th>
                          <th class="col-mat">MATERIAL</th>
                          <th class="col-estado">ESTADO</th>
                          <th class="col-monto">MONTO</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="order in group.orders" :key="order.id" :class="getOrderRowClass(order)">
                          <td class="col-item">{{ order.item_number || '-' }}</td>
                          <td class="col-cant">{{ getOrderQuantity(order) }}</td>
                          <td class="col-und">{{ order.unit || 'UND' }}</td>
                          <td class="col-desc">{{ order.description }}</td>
                          <td class="col-diam">{{ order.diameter || '-' }}</td>
                          <td class="col-serie">{{ order.series || '-' }}</td>
                          <td class="col-mat">{{ order.material_type || '-' }}</td>
                          <td class="col-estado">
                            <span class="order-status" :class="getOrderStatusClass(order)">
                              <!-- Pending icon (clock) - En Espera -->
                              <svg v-if="order.status === 'pending'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              <!-- Approved icon (progress) - En Progreso -->
                              <svg v-else-if="order.status === 'approved' && !order.payment_confirmed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <!-- Paid icon (check circle) - Aprobado -->
                              <svg v-else-if="order.payment_confirmed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                              <!-- Rejected icon (x) -->
                              <svg v-else-if="order.status === 'rejected'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                              </svg>
                              {{ getOrderStatusLabel(order) }}
                            </span>
                          </td>
                          <td class="col-monto">{{ order.amount ? getCurrencySymbol(order.currency) + ' ' + formatNumber(order.total_with_igv || order.amount) : 'Por cotizar' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
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

      <!-- Delivery Confirmation Modal -->
      <Teleport to="body">
        <div v-if="showDeliveryModal" class="modal-overlay" @click.self="closeDeliveryModal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Confirmar Entrega</h2>
              <button @click="closeDeliveryModal" class="btn-close">×</button>
            </div>
            <div class="modal-body">
              <p v-if="selectedOrderForDelivery">
                ¿Confirmar que el item <strong>#{{ selectedOrderForDelivery.item_number }} - {{ selectedOrderForDelivery.description }}</strong> ha sido entregado en obra?
              </p>
              
              <div class="form-group margin-top">
                <label>Notas de Entrega (Opcional)</label>
                <textarea v-model="deliveryNotes" class="input-field" rows="3" placeholder="Ej: Recibido por Juan Pérez, Guía de Remisión 001-123"></textarea>
              </div>

              <div class="modal-actions">
                <button @click="closeDeliveryModal" class="btn-cancel">Cancelar</button>
                <button @click="confirmDeliveryOrder" :disabled="confirmingDelivery" class="btn-confirm">
                  {{ confirmingDelivery ? 'Confirmando...' : 'Confirmar Entrega' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

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
const expandedFiles = ref({}); // Track expanded file sections
const toast = ref({ show: false, message: '', type: 'success' });
const newMaterial = ref('');
const newMaterialQty = ref(1);
const newExpenseDesc = ref('');
const newExpenseQty = ref(1);
const selectedWorkerId = ref('');

// Material specification form
const materialForm = ref({
  item_number: null,
  qty: 1,
  unit: 'UND',
  description: '',
  diameter: '',
  series: '',
  material_type: ''
});

// Import state
const importingFile = ref(false);

// Paid Orders & Delivery State
const paidOrders = ref([]);
const loadingPaidOrders = ref(false);
const showDeliveryModal = ref(false);
const selectedOrderForDelivery = ref(null);
const deliveryNotes = ref('');
const confirmingDelivery = ref(false);

// Filter state
const statusFilter = ref('all');
const dateFrom = ref('');
const dateTo = ref('');

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

// Chart computed properties
const getUsagePercent = computed(() => {
  if (!selectedProject.value) return 0;
  const usage = parseFloat(selectedProject.value.usage_percent) || 0;
  return Math.min(100, Math.round(usage));
});

const getChartArc = computed(() => {
  const percent = getUsagePercent.value;
  const circumference = 2 * Math.PI * 50; // r=50
  const arcLength = (percent / 100) * circumference;
  return `${arcLength} ${circumference}`;
});

// Compute next item number for the selected project
const nextItemNumber = computed(() => {
  if (!projectOrders.value || projectOrders.value.length === 0) return 1;
  const maxItem = Math.max(...projectOrders.value.map(o => o.item_number || 0));
  return maxItem + 1;
});

// Group orders by source_filename for collapsible sections
const ordersGroupedByFile = computed(() => {
  const groups = {};
  const manualOrders = [];
  
  projectOrders.value.forEach(order => {
    if (order.source_filename) {
      if (!groups[order.source_filename]) {
        groups[order.source_filename] = {
          filename: order.source_filename,
          orders: [],
          imported_at: order.imported_at,
          allPaid: true,
          allDelivered: true,
          paidCount: 0,
          deliveredCount: 0,
          totalCount: 0
        };
      }
      groups[order.source_filename].orders.push(order);
      groups[order.source_filename].totalCount++;
      if (order.payment_confirmed) {
        groups[order.source_filename].paidCount++;
      } else {
        groups[order.source_filename].allPaid = false;
      }
      if (order.delivery_confirmed) {
        groups[order.source_filename].deliveredCount++;
      } else {
        groups[order.source_filename].allDelivered = false;
      }
    } else {
      manualOrders.push(order);
    }
  });
  
  // Convert to array sorted by import date
  const result = Object.values(groups).sort((a, b) => 
    new Date(b.imported_at) - new Date(a.imported_at)
  );
  
  // Add manual orders group at the end if exists
  if (manualOrders.length > 0) {
    result.push({
      filename: null,
      orders: manualOrders,
      imported_at: null,
      allPaid: manualOrders.every(o => o.payment_confirmed),
      allDelivered: manualOrders.every(o => o.delivery_confirmed),
      paidCount: manualOrders.filter(o => o.payment_confirmed).length,
      deliveredCount: manualOrders.filter(o => o.delivery_confirmed).length,
      totalCount: manualOrders.length
    });
  }
  
  return result;
});

// Toggle file section
const toggleFileSection = (filename) => {
  expandedFiles.value[filename || '__manual__'] = !expandedFiles.value[filename || '__manual__'];
};

// Confirm delivery for all orders in a file group
const confirmFileDelivery = async (group) => {
  if (!confirm(`¿Marcar todos los ${group.orders.length} items de "${group.filename || 'Órdenes Manuales'}" como entregados?`)) return;
  
  try {
    const orderIds = group.orders.map(o => o.id);
    const response = await fetchWithCsrf(`${apiBase.value}/confirm-file-delivery`, {
      method: 'POST',
      body: JSON.stringify({ order_ids: orderIds })
    });
    const data = await response.json();
    if (data.success) {
      showToast(`${data.updated || orderIds.length} items marcados como entregados`);
      // Refresh project to update order statuses
      if (selectedProject.value) {
        await selectProject(selectedProject.value.id);
      }
    } else {
      showToast(data.message || 'Error al confirmar entrega', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
};

// Filter computed properties
const statusFilters = computed(() => {
  const counts = { all: projects.value.length, good: 0, warning: 0, critical: 0 };
  projects.value.forEach(p => {
    const label = getStatusLabel(p);
    if (counts[label] !== undefined) counts[label]++;
  });
  return [
    { value: 'all', label: 'Todos', icon: 'all', count: counts.all },
    { value: 'good', label: 'Activos', icon: 'good', count: counts.good },
    { value: 'warning', label: 'Alerta', icon: 'warning', count: counts.warning },
    { value: 'critical', label: 'Críticos', icon: 'critical', count: counts.critical }
  ];
});

const filteredProjects = computed(() => {
  return projects.value.filter(project => {
    // Status filter
    if (statusFilter.value !== 'all') {
      const projectStatus = getStatusLabel(project);
      if (projectStatus !== statusFilter.value) return false;
    }
    
    // Date range filter
    if (dateFrom.value || dateTo.value) {
      const createdAt = new Date(project.created_at);
      if (dateFrom.value && createdAt < new Date(dateFrom.value)) return false;
      if (dateTo.value && createdAt > new Date(dateTo.value + 'T23:59:59')) return false;
    }
    
    return true;
  });
});

const clearDateFilters = () => {
  dateFrom.value = '';
  dateTo.value = '';
};

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
  if (order.status === 'rejected') return 'Rechazado';
  if (order.status === 'pending') return 'Pendiente';
  if (order.status === 'approved' && order.payment_confirmed) return 'Pagado';
  if (order.status === 'approved') return 'Aprobado';
  return 'Pendiente';
};

const getOrderStatusLabel = (order) => {
  if (order.status === 'rejected') return 'Rechazado';
  if (order.status === 'pending') return 'En Espera';
  if (order.status === 'approved' && order.payment_confirmed) return 'Aprobado';
  if (order.status === 'approved') return 'En Progreso';
  return 'En Espera';
};

const getOrderRowClass = (order) => {
  return 'order-row-' + getOrderStatusClass(order).replace('status-', '');
};

// Extract quantity from materials array or description
const getOrderQuantity = (order) => {
  // Try to get from materials array first
  if (order.materials && Array.isArray(order.materials) && order.materials.length > 0) {
    const totalQty = order.materials.reduce((sum, mat) => {
      if (typeof mat === 'object' && mat.qty) return sum + parseInt(mat.qty);
      return sum;
    }, 0);
    if (totalQty > 0) return totalQty;
  }
  // Try to extract from description (format: "Name (qty)")
  const match = order.description?.match(/\((\d+)\)/);
  if (match) return parseInt(match[1]);
  // Fallback
  return order.quantity || 1;
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
      
      // Load paid orders if supervisor
      if (isSupervisor.value) {
        loadPaidOrders();
      }
    }
  } catch (e) { console.error(e); }
};

const loadPaidOrders = async () => {
  if (!selectedProject.value) return;
  loadingPaidOrders.value = true;
  try {
    const res = await fetch(`${apiBase.value}/${selectedProject.value.id}/paid-orders`);
    const data = await res.json();
    if (data.success) {
      paidOrders.value = data.orders;
    }
  } catch (e) { console.error(e); }
  loadingPaidOrders.value = false;
};

// Delivery Confirmation
const openDeliveryModal = (order) => {
  selectedOrderForDelivery.value = order;
  deliveryNotes.value = '';
  showDeliveryModal.value = true;
};

const closeDeliveryModal = () => {
  showDeliveryModal.value = false;
  selectedOrderForDelivery.value = null;
  deliveryNotes.value = '';
};

const confirmDeliveryOrder = async () => {
  if (!selectedOrderForDelivery.value) return;
  confirmingDelivery.value = true;
  try {
    const res = await fetchWithCsrf(`${apiBase.value}/orders/${selectedOrderForDelivery.value.id}/confirm-delivery`, {
      method: 'POST',
      body: JSON.stringify({ notes: deliveryNotes.value })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Entrega confirmada', 'success');
      closeDeliveryModal();
      loadPaidOrders(); // Refresh list
    } else {
      showToast(data.message || 'Error', 'error');
    }
  } catch (e) { showToast('Error al confirmar', 'error'); }
  confirmingDelivery.value = false;
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

// Orders - Material specification (sent to backend with all fields)
const createOrder = async () => {
  if (!selectedProject.value || !materialForm.value.description || !materialForm.value.qty) return;
  savingOrder.value = true;
  try {
    // Send material with all specification fields
    const materials = [{ 
      name: materialForm.value.description.trim(), 
      qty: materialForm.value.qty 
    }];
    const description = materialForm.value.description.trim();
    
    const res = await fetchWithCsrf(`${apiBase.value}/${selectedProject.value.id}/order`, {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'material', 
        description: description,
        materials: materials,
        unit: materialForm.value.unit,
        diameter: materialForm.value.diameter || null,
        series: materialForm.value.series || null,
        material_type: materialForm.value.material_type || null,
        item_number: materialForm.value.item_number || null
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Material enviado a aprobación', 'success');
      // Reset form
      materialForm.value = {
        item_number: null,
        qty: 1,
        unit: 'UND',
        description: '',
        diameter: '',
        series: '',
        material_type: ''
      };
      await selectProject({ id: selectedProject.value.id });
    } else {
      showToast(data.message || 'Error', 'error');
    }
  } catch (e) { showToast('Error', 'error'); }
  savingOrder.value = false;
};

// Download Excel template
const downloadTemplate = () => {
  window.location.href = `${apiBase.value}/material-template`;
};

// Import materials from Excel
const importExcel = async (event) => {
  const file = event.target.files[0];
  if (!file || !selectedProject.value) return;

  importingFile.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${apiBase.value}/${selectedProject.value.id}/import-materials`, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': getCsrfToken() },
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      await selectProject({ id: selectedProject.value.id });
      if (data.errors?.length > 0) {
        console.warn('Import errors:', data.errors);
      }
    } else {
      showToast(data.message || 'Error al importar', 'error');
    }
  } catch (e) {
    showToast('Error al importar archivo', 'error');
  }
  importingFile.value = false;
  // Reset file input
  event.target.value = '';
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
