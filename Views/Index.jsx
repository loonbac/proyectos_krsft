import { useState, useCallback } from 'react';
import {
  FolderIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  DocumentTextIcon,
  PlusIcon,
  FunnelIcon,
  RocketLaunchIcon,
  ArrowLeftIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

import useProyectosData from './hooks/useProyectosData';
import usePipelineData from './hooks/usePipelineData';
import { formatNumber, canFinalizeProject } from './utils';

import StatsCard from './Components/ui/StatsCard';
import Button from './Components/ui/Button';
import Badge from './Components/ui/Badge';
import Toast from './Components/ui/Toast';

import ProjectCard from './Components/ProjectCard';
import FilterBar from './Components/FilterBar';
import DetailHeader from './Components/DetailHeader';
import StatsPanel from './Components/StatsPanel';
import MaterialForm from './Components/MaterialForm';
import ServiceForm from './Components/ServiceForm';
import OrdersSection from './Components/OrdersSection';
import ServicesSection from './Components/ServicesSection';

import PipelineBoard from './Components/PipelineBoard';
import PipelineDetail from './Components/PipelineDetail';
import {
  CreateLeadModal,
  CommunicationModal,
  VisitModal,
  BudgetModal,
  NegotiationModal,
  TeamModal,
} from './Components/modals/PipelineModals';

import DeliveryModal from './Components/modals/DeliveryModal';
import CreateProjectModal from './Components/modals/CreateProjectModal';
import ConfirmModal from './Components/modals/ConfirmModal';
import ImportPreviewModal from './Components/modals/ImportPreviewModal';
import DuplicateFileModal from './Components/modals/DuplicateFileModal';
import ConfigModal from './Components/modals/ConfigModal';

/* ============================================
   ORCHESTRATOR — Proyectos Module
   Pipeline (Pre-Proyecto) = vista principal
   Proyectos Iniciados = vista secundaria
   ============================================ */
export default function ProyectosIndex({ userRole, isSupervisor: isSupervisorProp, trabajadorId }) {
  const isSupervisor = isSupervisorProp;
  const canSeePipeline = !isSupervisor;
  const d = useProyectosData({ isSupervisor });

  // Pipeline hook — siempre se invoca (regla de hooks), enabled controla fetching
  const showToastFn = useCallback((msg, type) => d.setToast({ show: true, message: msg, type }), [d.setToast]);
  const pipe = usePipelineData({ showToast: showToastFn, enabled: canSeePipeline });

  // Navigation: 'pipeline' | 'projects' | 'project-detail' | 'lead-detail'
  const [activeTab, setActiveTab] = useState(isSupervisor ? 'projects' : 'pipeline');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // ── Tab switching helpers ──
  const goToPipeline = () => { setActiveTab('pipeline'); pipe.setSelectedLead(null); };
  const goToProjects = () => { setActiveTab('projects'); d.setSelectedProject(null); };
  const selectProject = (p) => { d.selectProject(p); setActiveTab('project-detail'); };
  const backFromDetail = () => { d.setSelectedProject(null); setActiveTab('projects'); };
  const selectLead = (lead) => { pipe.setSelectedLead(lead); setActiveTab('lead-detail'); };
  const backFromLead = () => { pipe.setSelectedLead(null); setActiveTab('pipeline'); };

  // ── Render view ──
  const renderView = () => {
    // ─── Lead Detail ───
    if (activeTab === 'lead-detail' && canSeePipeline) {
      return (
        <PipelineDetail
          lead={pipe.leadDetail}
          loadingDetail={pipe.loadingDetail}
          onBack={backFromLead}
          onDelete={pipe.deleteLead}
          onChangeStage={pipe.changeStage}
          onOpenTeamModal={() => pipe.setShowTeamModal(true)}
          onOpenCommunicationModal={() => pipe.setShowCommunicationModal(true)}
          onOpenVisitModal={() => pipe.setShowVisitModal(true)}
          onCompleteVisit={pipe.completeVisit}
          onOpenBudgetModal={() => pipe.setShowBudgetModal(true)}
          onUpdateBudgetStatus={pipe.updateBudgetStatus}
          onOpenNegotiationModal={() => pipe.setShowNegotiationModal(true)}
        />
      );
    }

    // ─── Project Detail ───
    if (activeTab === 'project-detail' && d.selectedProject) {
      return (
        <div className="space-y-6">
          <DetailHeader
            project={d.selectedProject}
            onBack={backFromDetail}
            onStateClick={d.handleProjectStateClick}
            onOpenConfig={() => setShowConfigModal(true)}
          />
          <StatsPanel
            project={d.selectedProject}
            projectSummary={d.projectSummary}
            usagePercent={d.usagePercent}
            spentColor={d.spentColor}
            onStateClick={d.handleProjectStateClick}
            ordersGroupedByFile={d.ordersGroupedByFile}
          />
          {isSupervisor && (
            <MaterialForm
              materialForm={d.materialForm}
              onFormChange={d.setMaterialForm}
              nextItemNumber={d.nextItemNumber}
              savingOrder={d.savingOrder}
              onCreateOrder={d.createOrder}
              importingFile={d.importingFile}
              onDownloadTemplate={d.downloadTemplate}
              onImportExcel={d.importExcel}
            />
          )}
          <OrdersSection
            ordersGroupedByFile={d.ordersGroupedByFile}
            expandedFiles={d.expandedFiles}
            selectedProject={d.selectedProject}
            isSupervisor={isSupervisor}
            onToggleFile={d.toggleFileSection}
            onApproveAll={d.approveAllInGroup}
            onApproveSelected={d.approveSelectedInGroup}
            onConfirmFileDelivery={d.confirmFileDelivery}
            onApproveMaterial={d.approveMaterial}
            onRejectMaterial={d.rejectMaterial}
            isOrderSelected={d.isOrderSelected}
            toggleOrderSelection={d.toggleOrderSelection}
            getSelectedCount={d.getSelectedCount}
            getGroupKey={d.getGroupKey}
            getGroupDraftOrders={d.getGroupDraftOrders}
          />
          {isSupervisor && (
            <ServiceForm
              serviceForm={d.serviceForm}
              onFormChange={d.setServiceForm}
              savingService={d.savingService}
              onCreateService={d.createService}
            />
          )}
          <ServicesSection
            serviceOrders={d.serviceOrders}
            selectedServices={d.selectedServices}
            isSupervisor={isSupervisor}
            onApproveAll={() => d.approveServicesBulk(d.serviceOrders.filter(o => o.status === 'draft').map(o => o.id), 'Aprobar todos los servicios')}
            onApproveSelected={() => d.approveServicesBulk(d.selectedServices, 'Aprobar servicios seleccionados')}
            onApproveService={d.approveService}
            onRejectService={d.rejectService}
            isServiceSelected={d.isServiceSelected}
            toggleServiceSelection={d.toggleServiceSelection}
            getSelectedServiceCount={d.getSelectedServiceCount}
          />
        </div>
      );
    }

    // ─── Pipeline Board (default for non-supervisor) ───
    if (activeTab === 'pipeline' && canSeePipeline) {
      return (
        <PipelineBoard
          leadsByStage={pipe.leadsByStage}
          counts={pipe.counts}
          pipelineStats={pipe.pipelineStats}
          loading={pipe.loading}
          onSelectLead={selectLead}
          onNewLead={() => pipe.setShowCreateModal(true)}
        />
      );
    }

    // ─── Projects List ───
    return (
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total" value={d.stats.total_projects} icon={<FolderIcon className="size-8" />} iconBg="bg-amber-100" iconColor="text-amber-600" />
          <StatsCard title="Activos" value={d.stats.active_projects} icon={<ChartBarIcon className="size-8" />} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
          <StatsCard title="Presupuesto" value={`S/ ${formatNumber(d.stats.total_budget)}`} icon={<CurrencyDollarIcon className="size-8" />} iconBg="bg-blue-100" iconColor="text-blue-600" />
          <StatsCard title="Gastado" value={`S/ ${formatNumber(d.stats.total_spent)}`} icon={<CreditCardIcon className="size-8" />} iconBg="bg-purple-100" iconColor="text-purple-600" />
        </section>

        <FilterBar
          statusFilters={d.statusFilters}
          statusFilter={d.statusFilter}
          onStatusChange={d.setStatusFilter}
          dateFromDisplay={d.dateFromDisplay}
          dateToDisplay={d.dateToDisplay}
          dateFromInputRef={d.dateFromInputRef}
          dateToInputRef={d.dateToInputRef}
          onOpenDateFrom={d.openDateFromPicker}
          onOpenDateTo={d.openDateToPicker}
          dateFrom={d.dateFrom}
          dateTo={d.dateTo}
          onClearDates={d.clearDateFilters}
        />

        {d.loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="size-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 text-sm text-gray-500">Cargando proyectos...</p>
          </div>
        ) : d.filteredProjects.length === 0 ? (
          <div className="rounded-lg border-2 border-gray-200 bg-white p-12 text-center shadow-sm">
            <DocumentTextIcon className="mx-auto size-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {isSupervisor ? 'No tienes proyectos asignados' : 'No hay proyectos iniciados'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {isSupervisor
                ? 'Espera a que te asignen un proyecto'
                : 'Los proyectos se crean automáticamente cuando un lead del pipeline se cierra como ganado.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.filteredProjects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={selectProject} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-12 py-4">
        {/* ── Page Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="primary" size="md" onClick={d.goBack} className="gap-2">
              <ArrowLeftIcon className="size-4" />
              Volver
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FolderIcon className="size-8 text-primary" />
              {isSupervisor ? 'MIS PROYECTOS ASIGNADOS' : 'GESTIÓN DE PROYECTOS'}
            </h1>
            {isSupervisor && (
              <Badge variant="primary" className="gap-1">
                <UserIcon className="size-3.5" />
                SUPERVISOR
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          {(activeTab === 'projects' && !isSupervisor) && (
            <Button variant="primary" onClick={d.openCreateModal} className="gap-2">
              <PlusIcon className="size-4" />
              Nuevo Proyecto
            </Button>
          )}
        </header>

        {/* ── HyperUI Tabs (solo no-supervisor, solo en vistas de lista) ── */}
        {canSeePipeline && (activeTab === 'pipeline' || activeTab === 'projects') && (
          <div className="border-b border-gray-200 mb-6">
            <div role="tablist" className="flex gap-1">
              <button
                role="tab"
                aria-selected={activeTab === 'pipeline'}
                onClick={goToPipeline}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'pipeline'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FunnelIcon className="size-4" />
                Pre-Proyectos
                {(pipe.counts && Object.values(pipe.counts).reduce((a, b) => a + b, 0) > 0) && (
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {Object.values(pipe.counts).reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'projects'}
                onClick={goToProjects}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'projects'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <RocketLaunchIcon className="size-4" />
                Proyectos Iniciados
                {d.stats.active_projects > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {d.stats.active_projects}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── View content ── */}
        {renderView()}
      </div>

      {/* ======== PROJECT MODALS ======== */}
      <DeliveryModal
        open={d.showDeliveryModal}
        onClose={d.closeDeliveryModal}
        order={d.selectedOrderForDelivery}
        notes={d.deliveryNotes}
        onNotesChange={d.setDeliveryNotes}
        confirming={d.confirmingDelivery}
        onConfirm={d.confirmDeliveryOrder}
      />
      <CreateProjectModal
        open={d.showCreateModal}
        onClose={() => d.setShowCreateModal(false)}
        form={d.form}
        onFormChange={d.setForm}
        supervisors={d.supervisors}
        saving={d.saving}
        errorMessage={d.errorMessage}
        onCreate={d.createProject}
      />
      <ConfirmModal
        open={d.showConfirmModal}
        onClose={d.closeConfirmModal}
        title={d.confirmTitle}
        message={d.confirmMessage}
        actionLabel={d.confirmActionLabel}
        actionVariant={d.confirmActionVariant}
        processing={d.confirmProcessing}
        onConfirm={d.runConfirmAction}
      />
      <ImportPreviewModal
        open={d.showImportPreview}
        onClose={() => d.setShowImportPreview(false)}
        items={d.importPreviewItems}
        importing={d.importingFile}
        onConfirm={d.confirmImport}
      />
      <DuplicateFileModal
        open={d.showDuplicateModal}
        onClose={() => d.setShowDuplicateModal(false)}
        duplicateData={d.duplicateData}
        importing={d.importingFile}
        onConfirmRename={d.confirmDuplicateUpload}
      />
      <ConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        editForm={d.editForm}
        onEditChange={d.setEditForm}
        supervisors={d.supervisors}
        saving={d.saving}
        onSave={() => { d.updateProject(); setShowConfigModal(false); }}
        onDelete={() => { setShowConfigModal(false); d.confirmDeleteProject(); }}
        onFinalize={() => { setShowConfigModal(false); d.handleProjectStateClick(d.selectedProject); }}
        canFinalize={d.selectedProject ? canFinalizeProject(d.selectedProject) : false}
        projectWorkers={d.projectWorkers}
        availableWorkersFiltered={d.availableWorkersFiltered}
        selectedWorkerId={d.selectedWorkerId}
        onWorkerChange={d.setSelectedWorkerId}
        onAdd={d.addWorkerToProject}
        onRemove={d.removeWorkerFromProject}
        showEditSection={!isSupervisor}
        showWorkersSection={isSupervisor}
      />

      {/* ======== PIPELINE MODALS ======== */}
      {canSeePipeline && (
        <>
          <CreateLeadModal
            open={pipe.showCreateModal}
            onClose={() => pipe.setShowCreateModal(false)}
            form={pipe.createForm}
            onFormChange={pipe.setCreateForm}
            workers={pipe.workers}
            saving={pipe.saving}
            onCreate={pipe.createLead}
          />
          <CommunicationModal
            open={pipe.showCommunicationModal}
            onClose={() => pipe.setShowCommunicationModal(false)}
            leadId={pipe.selectedLead?.id}
            onSubmit={pipe.addCommunication}
          />
          <VisitModal
            open={pipe.showVisitModal}
            onClose={() => pipe.setShowVisitModal(false)}
            leadId={pipe.selectedLead?.id}
            workers={pipe.workers}
            onSubmit={pipe.addVisit}
          />
          <BudgetModal
            open={pipe.showBudgetModal}
            onClose={() => pipe.setShowBudgetModal(false)}
            leadId={pipe.selectedLead?.id}
            currency={pipe.leadDetail?.moneda || 'PEN'}
            onSubmit={pipe.addBudget}
          />
          <NegotiationModal
            open={pipe.showNegotiationModal}
            onClose={() => pipe.setShowNegotiationModal(false)}
            leadId={pipe.selectedLead?.id}
            currency={pipe.leadDetail?.moneda || 'PEN'}
            onSubmit={pipe.addNegotiation}
          />
          <TeamModal
            open={pipe.showTeamModal}
            onClose={() => pipe.setShowTeamModal(false)}
            leadId={pipe.selectedLead?.id}
            workers={pipe.workers}
            currentTeamIds={(pipe.leadDetail?.team || []).map(t => t.trabajador_id)}
            onSubmit={pipe.updateTeam}
          />
        </>
      )}

      <Toast show={d.toast.show} message={d.toast.message} type={d.toast.type} onHide={() => d.setToast(p => ({ ...p, show: false }))} />
    </div>
  );
}
