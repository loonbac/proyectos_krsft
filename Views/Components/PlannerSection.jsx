import { memo, useState, useMemo, useEffect } from 'react';
import {
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  PlayIcon,
  XMarkIcon,
  ChartBarIcon,
  ChartPieIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import { PlannerCalendar, GanttChart, GlobalProgressPie, StatsSummary, STAGE_COLORS } from './PlannerCalendar';

// ── Color options (kept for future use) ───────────────────────────────────────
// const COLOR_OPTIONS = [
//   { key: 'blue',    hex: '#3b82f6' },
//   { key: 'green',   hex: '#10b981' },
//   { key: 'yellow',  hex: '#f59e0b' },
//   { key: 'red',     hex: '#ef4444' },
//   { key: 'purple',  hex: '#a855f7' },
//   { key: 'cyan',    hex: '#06b6d4' },
//   { key: 'orange',  hex: '#f97316' },
//   { key: 'pink',    hex: '#ec4899' },
//   { key: 'gray',    hex: '#6b7280' },
// ];

// const COLOR_CLASSES = {
//   blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200' },
//   green:   { bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-200' },
//   yellow:  { bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-200' },
//   red:     { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200' },
//   purple:  { bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-200' },
//   cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-cyan-200' },
//   orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200' },
//   pink:    { bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-pink-200' },
//   gray:    { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-200' },
// };

// ── Date helpers (Local Timezone Fix) ──────────────────────────────────────────
function parseDateLocal(val) {
  if (!val) return new Date();
  if (typeof val === 'string') {
    if (val.includes('T')) return new Date(val);
    const [y, m, d] = val.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }
  return new Date(val);
}

function toLocalISOString(date) {
  const d = parseDateLocal(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const d = parseDateLocal(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const s = parseDateLocal(start);
  const e = parseDateLocal(end);
  s.setHours(0,0,0,0);
  e.setHours(0,0,0,0);
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

function formatDate(date) {
  if (!date) return '';
  return parseDateLocal(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(date) {
  if (!date) return '';
  return parseDateLocal(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

function PlannerSection({ project, initialPlanner, initialStages, onSavePlanner, onAddStage, onUpdateStage, onRemoveStage }) {
  const todayStr = toLocalISOString(new Date());

  // State - hydrate from props if available
  const [startDate, setStartDate] = useState(initialPlanner?.start_date || todayStr);
  const [endDate, setEndDate] = useState(initialPlanner?.end_date || toLocalISOString(addDays(new Date(), 30)));
  const [stages, setStages] = useState(initialStages || []);
  const [planningStarted, setPlanningStarted] = useState(initialPlanner?.planning_started || false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formError, setFormError] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'gantt' | 'tracking'
  const [trackingModal, setTrackingModal] = useState({ open: false, taskId: null, taskName: '', currentVal: 0 });

  // Notify parent of planner changes
  // We removed the global useEffect that notified on every change to prevent infinite loops and spamming the API.
  // We will now call the appropriate callback explicitly when an action occurs.

  // Derived
  const totalDays = daysBetween(startDate, endDate);
  const formStageDays = (formStartDate && formEndDate && parseDateLocal(formEndDate) >= parseDateLocal(formStartDate))
    ? daysBetween(formStartDate, formEndDate)
    : 0;
  const usedDays = stages.reduce((acc, stage) => acc + (stage.dias || 0), 0);
  const remainingDays = totalDays - usedDays;

  // Actions
  const handleStartPlanning = () => {
    setPlanningStarted(true);
    // Initialize form start date to project start date
    setFormStartDate(startDate);
    
    // Save planner config to database
    if (onSavePlanner) {
      onSavePlanner({
        start_date: startDate,
        end_date: endDate,
        planning_started: true,
      });
    }
  };

  const handleAddStage = () => {
    setFormError('');

    if (!formName.trim()) {
      setFormError('Ingresa un nombre para la tarea');
      return;
    }
    if (!formStartDate || !formEndDate) {
      setFormError('Selecciona la fecha de inicio y fin');
      return;
    }

    const startD = parseDateLocal(formStartDate);
    const endD = parseDateLocal(formEndDate);
    const projectStart = parseDateLocal(startDate);
    const projectEnd = parseDateLocal(endDate);

    if (endD < startD) {
      setFormError('La fecha de fin no puede ser anterior al inicio');
      return;
    }
    if (startD < projectStart || endD > projectEnd) {
      setFormError('Las fechas de la tarea deben estar dentro del rango del proyecto');
      return;
    }
    if (formStageDays > remainingDays) {
      setFormError(`No puedes exceder los días solicitados. Quedan ${remainingDays} días.`);
      return;
    }

    if (!planningStarted) {
      setPlanningStarted(true);
      if (onSavePlanner) {
        onSavePlanner({
          start_date: startDate,
          end_date: endDate,
          planning_started: true,
        });
      }
    }

    setStages(prev => [...prev, {
      id: Date.now(),
      nombre: formName.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
      dias: daysBetween(formStartDate, formEndDate),
      porcentaje: 0,
      tracking: {}, // Object mapping date strings to percentages { '2026-04-25': 100 }
    }]);

    // Notify parent for backend persistence
    if (onAddStage) {
      onAddStage({
        nombre: formName.trim(),
        startDate: formStartDate,
        endDate: formEndDate,
        dias: daysBetween(formStartDate, formEndDate),
        porcentaje: 0,
        tracking: {},
        colorIndex: stages.length % 10,
      });
    }

    // Reset form for next task
    setFormName('');
    // Proponer como inicio el día siguiente del último fin
    const nextStart = toLocalISOString(addDays(formEndDate, 1));
    if (parseDateLocal(nextStart) <= projectEnd) {
      setFormStartDate(nextStart);
    }
    setFormEndDate('');
  };

  const handleRemoveStage = (id) => {
    const stageToRemove = stages.find(s => s.id === id);
    setStages(prev => prev.filter(s => s.id !== id));

    // Notify parent for backend persistence
    if (onRemoveStage && stageToRemove) {
      onRemoveStage(stageToRemove.id);
    }
  };

  const handleOpenTrackingModal = (taskId, taskName, currentVal, dateStr) => {
    setTrackingModal({ open: true, taskId, taskName, currentVal: currentVal || 0, dateStr });
  };

  const handleSaveTaskPercentage = (taskId, percentage) => {
    const dateStr = trackingModal.dateStr;
    setStages(prev => prev.map(task => {
      if (task.id === taskId) {
        const newTracking = { ...(task.tracking || {}) };
        if (dateStr) {
          newTracking[dateStr] = percentage;
        }

        // Calculate global percentage as the average of all days
        const start = parseDateLocal(task.startDate);
        const end = parseDateLocal(task.endDate);
        let currentTotalDays = 0;
        let sumPercentages = 0;
        
        let curr = new Date(start);
        while (curr <= end) {
          currentTotalDays++;
          const dStr = toLocalISOString(curr);
          sumPercentages += (newTracking[dStr] || 0);
          curr.setDate(curr.getDate() + 1);
        }
        const newGlobalPorcentaje = currentTotalDays > 0 ? Math.round(sumPercentages / currentTotalDays) : 0;

        // Notify parent to save to backend
        if (onUpdateStage) {
          onUpdateStage(task.id, {
            nombre: task.nombre,
            dias: task.dias,
            startDate: task.startDate,
            endDate: task.endDate,
            colorIndex: task.colorIndex,
            tracking: newTracking,
            porcentaje: newGlobalPorcentaje,
          });
        }

        return { ...task, tracking: newTracking, porcentaje: newGlobalPorcentaje };
      }
      return task;
    }));
    setTrackingModal({ open: false, taskId: null, taskName: '', currentVal: 0, dateStr: null });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-3 bg-gray-50/50">
        <h3 className="flex items-center gap-2 text-[11.11px] font-bold uppercase tracking-wider text-gray-900">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CalendarIcon className="size-[14.2px] text-primary" />
          </span>
          Planificador de Proyecto
        </h3>
      </div>

      <div className="p-6 space-y-6">
        
        <div className="rounded-xl border border-gray-200 bg-gray-100 p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 items-start">
          
          {/* Left Column: Project Dates */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                Fecha de Inicio
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-[#35938d]" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 h-10 pl-10 pr-3 text-sm focus:border-[#35938d] focus:ring-4 focus:ring-[#35938d]/10 bg-white transition-all outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                Fecha de Fin
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-[#35938d]" />
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 h-10 pl-10 pr-3 text-sm focus:border-[#35938d] focus:ring-4 focus:ring-[#35938d]/10 bg-white transition-all outline-none"
                />
              </div>
            </div>
            {/* Total Days Row */}
            <div className="flex items-center gap-2 mt-1">
              <div className="px-4 py-2 rounded-full bg-[#35938d] text-white flex items-center gap-2 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Total:</span>
                <span className="text-sm font-black">{totalDays} días</span>
              </div>
            </div>
          </div>

          {/* Right Column: New Task */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-700">Nombre</label>
              <div className="relative">
                <DocumentTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-[#35938d]" />
                <input
                  type="text"
                  value={formName}
                  onChange={e => { setFormName(e.target.value); setFormError(''); }}
                  placeholder="Nombre de la tarea"
                  className="w-full rounded-lg border border-gray-300 h-10 pl-10 pr-3 text-sm focus:border-[#35938d] focus:ring-4 focus:ring-[#35938d]/10 bg-white transition-all outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700">Inicia el</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-[#35938d]" />
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => { setFormStartDate(e.target.value); setFormError(''); }}
                    className="w-full rounded-lg border border-gray-300 h-10 pl-10 pr-3 text-sm focus:border-[#35938d] focus:ring-4 focus:ring-[#35938d]/10 bg-white transition-all outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700">Finaliza el</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-[#35938d]" />
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={e => { setFormEndDate(e.target.value); setFormError(''); }}
                    className="w-full rounded-lg border border-gray-300 h-10 pl-10 pr-3 text-sm focus:border-[#35938d] focus:ring-4 focus:ring-[#35938d]/10 bg-white transition-all outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={handleAddStage}
                className="w-full rounded-lg bg-[#35938d] hover:bg-[#2c7a75] text-white font-bold text-[12px] h-11 uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <PlusIcon className="size-4" strokeWidth={2.5} /> Agregar Tarea
              </button>
            </div>
            {formError && (
              <span className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-100 rounded-md px-3 py-2 text-center mt-[-4px]">
                {formError}
              </span>
            )}
          </div>
        </div>

        {/* Stage Summary Cards */}
        {planningStarted && stages.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Detalle por Tareas
              </h4>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                <span className="text-gray-400">
                  <span className="text-blue-600 mr-1">{stages.length}</span>
                  Tareas programadas
                </span>
                <span className="text-gray-200">|</span>
                <span className="text-gray-400">
                  <span className={remainingDays > 0 ? "text-emerald-600 mr-1" : remainingDays < 0 ? "text-red-500 mr-1" : "text-gray-500 mr-1"}>
                    {remainingDays}
                  </span>
                  Días sobrantes
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {stages.map((stage, index) => {
                const stageStart = parseDateLocal(stage.startDate);
                const stageEnd = parseDateLocal(stage.endDate);
                const color = STAGE_COLORS[index % STAGE_COLORS.length];

                return (
                  <div
                    key={stage.id}
                    className="rounded-xl border p-3 shadow-sm bg-white relative overflow-hidden flex flex-col"
                    style={{ borderColor: color.border }}
                  >
                    {/* Thin left accent bar */}
                    <div className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl" style={{ backgroundColor: color.bg }} />

                    <div className="flex justify-between items-start ml-2 mb-2">
                      <h5 className="text-xs font-bold text-gray-800 pr-1 truncate">{stage.nombre}</h5>
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(stage.id)}
                        className="text-gray-300 hover:text-red-400 p-0.5 -mt-0.5 -mr-0.5 rounded transition-colors flex-shrink-0"
                        title="Eliminar tarea"
                      >
                        <TrashIcon className="size-3" />
                      </button>
                    </div>

                    <div className="mt-auto ml-2 space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-500">
                        <span className="truncate">{formatDateShort(stageStart)}</span>
                        <span className="text-gray-300 mx-0.5">→</span>
                        <span className="truncate">{formatDateShort(stageEnd)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-gray-100 pt-1">
                         <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: color.text }}>Duración</span>
                         <div className="flex items-baseline gap-0.5">
                            <span className="text-sm font-black" style={{ color: color.text }}>{stage.dias}</span>
                            <span className="text-[9px] font-bold uppercase" style={{ color: color.text }}>días</span>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

            {/* View Selection Tabs */}
            {planningStarted && stages.length > 0 && (
              <div className="mt-8 flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-px">
                  <div className="flex gap-8">
                    <button
                      onClick={() => setViewMode('calendar')}
                      className={`pb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all relative ${
                        viewMode === 'calendar' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <CalendarIcon className="size-4" />
                      Calendario
                      {viewMode === 'calendar' && (
                        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setViewMode('gantt')}
                      className={`pb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all relative ${
                        viewMode === 'gantt' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <ChartBarIcon className="size-4" />
                      Gráfico de Gantt
                      {viewMode === 'gantt' && (
                        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setViewMode('tracking')}
                      className={`pb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all relative ${
                        viewMode === 'tracking' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <ChartPieIcon className="size-4" />
                      Análisis Global
                      {viewMode === 'tracking' && (
                        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-full" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Conditional Rendering of Views */}
                {viewMode === 'calendar' ? (
                  <PlannerCalendar
                    stages={stages}
                    startDate={startDate}
                    totalDays={totalDays}
                    today={new Date()}
                    onOpenTracking={handleOpenTrackingModal}
                  />
                ) : viewMode === 'gantt' ? (
                  <GanttChart
                    stages={stages}
                    startDate={startDate}
                    totalDays={totalDays}
                  />
                ) : (
                  <div className="space-y-8">
                    <GlobalProgressPie stages={stages} />
                  </div>
                )}
              </div>
            )}
      {/* Tracking Modal */}
      {trackingModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Modal Header (Matching Reference) */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="bg-primary-50 p-2 rounded-lg">
                <PlayIcon className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Avance Diario</h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Info Box (Matching Reference) */}
              <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-xl">
                <p className="text-sm text-blue-600 leading-relaxed">
                  Ingresa el porcentaje de avance para la tarea <span className="font-bold">"{trackingModal.taskName}"</span> en el día <span className="font-bold">{trackingModal.dateStr ? trackingModal.dateStr.split('T')[0] : ''}</span>.
                </p>
              </div>

              {/* Input Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Porcentaje de Avance (%)
                </label>
                <div className="relative group">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    autoFocus
                    value={trackingModal.currentVal === 0 ? '' : trackingModal.currentVal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 3) {
                        setTrackingModal({ ...trackingModal, currentVal: val === '' ? 0 : parseInt(val, 10) });
                      }
                    }}
                    className={`w-full rounded-xl border ${trackingModal.currentVal > 100 ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'} py-3.5 px-5 text-lg font-black text-gray-800 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none`}
                    placeholder="0"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <span className={`text-xl font-black ${trackingModal.currentVal > 100 ? 'text-red-300' : 'text-gray-300'}`}>%</span>
                  </div>
                </div>
                {trackingModal.currentVal > 100 && (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-1 animate-pulse">
                    El porcentaje no puede ser mayor a 100%
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer (Matching Reference) */}
            <div className="p-5 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
              <button 
                onClick={() => setTrackingModal({ ...trackingModal, open: false })}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-[11px] font-black uppercase hover:bg-red-700 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={() => setTrackingModal({ ...trackingModal, currentVal: 100 })}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-[11px] font-black uppercase hover:bg-emerald-700 transition-all active:scale-95"
              >
                Completada
              </button>
              <button 
                disabled={trackingModal.currentVal > 100}
                onClick={() => handleSaveTaskPercentage(trackingModal.taskId, trackingModal.currentVal)}
                className={`px-4 py-2 rounded-lg ${trackingModal.currentVal > 100 ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary-700'} text-white text-[11px] font-black uppercase transition-all active:scale-95`}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}} />
    </section>
  );
}

export default memo(PlannerSection);
