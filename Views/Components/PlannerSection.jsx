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
  UserIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
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

function WorkerMultiSelect({ selectedWorkers, projectWorkers, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedList = useMemo(() => {
    if (!selectedWorkers) return [];
    return selectedWorkers.split(',').map(w => w.trim()).filter(Boolean);
  }, [selectedWorkers]);

  const handleToggle = (workerName) => {
    let newList;
    if (selectedList.includes(workerName)) {
      newList = selectedList.filter(w => w !== workerName);
    } else {
      newList = [...selectedList, workerName];
    }
    onChange(newList.join(', '));
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.worker-select-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative worker-select-container w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded border border-gray-300 h-9 px-3 text-left text-xs bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none flex items-center justify-between transition-all"
      >
        <span className="truncate text-gray-700 font-medium">
          {selectedList.length > 0 ? selectedList.join(', ') : 'Seleccionar trabajadores...'}
        </span>
        <svg className={`size-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {projectWorkers.length === 0 ? (
            <div className="py-2 text-center text-xs text-gray-400">
              No hay trabajadores asignados al proyecto
            </div>
          ) : (
            projectWorkers.map(w => {
              const name = w.nombre_completo || w.name;
              const isChecked = selectedList.includes(name);
              return (
                <label
                  key={w.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-xs transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(name)}
                    className="rounded border-gray-300 text-primary focus:ring-primary size-3.5"
                  />
                  <span className="text-gray-700 select-none truncate font-medium">{name}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function PlannerSection({ project, initialPlanner, initialStages, encargados = [], projectWorkers = [], onSavePlanner, onAddStage, onUpdateStage, onRemoveStage, onToggleSubtask, onUploadEvidence }) {
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
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formSubtasks, setFormSubtasks] = useState([]);
  const [formError, setFormError] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'gantt' | 'tracking'
  const [editTaskModal, setEditTaskModal] = useState({ open: false, stage: null, subtasks: [], workerId: '' });
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [progressPanel, setProgressPanel] = useState({ open: false, stage: null });
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // Keep progressPanel.stage in sync with stages[] (captures real IDs after async backend response)
  useEffect(() => {
    if (!progressPanel.open || !progressPanel.stage) return;
    // Try to find by ID first, then by name (for cases where tempId was replaced)
    const fresh = stages.find(s => s.id === progressPanel.stage.id)
      || stages.find(s => s.nombre === progressPanel.stage.nombre);
    if (fresh && fresh !== progressPanel.stage) {
      setProgressPanel(prev => ({ ...prev, stage: fresh }));
    }
  }, [stages, progressPanel.open]);

  // Sync local stages state with parent initialStages prop
  useEffect(() => {
    setStages(initialStages || []);
  }, [initialStages]);

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

  const handleAddStage = async () => {
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

    const validSubtasks = formSubtasks.filter(st => st.name.trim() !== '').map(st => ({ ...st, name: st.name.trim() }));

    // Insert with a temp ID first so the card appears immediately
    const tempId = `new_${Date.now()}`;
    setStages(prev => [...prev, {
      id: tempId,
      nombre: formName.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
      dias: daysBetween(formStartDate, formEndDate),
      porcentaje: 0,
      worker_id: formWorkerId || null,
      subtasks: validSubtasks,
      tracking: {},
    }]);

    // Reset form immediately for better UX
    setFormName('');
    const nextStart = toLocalISOString(addDays(formEndDate, 1));
    if (parseDateLocal(nextStart) <= projectEnd) {
      setFormStartDate(nextStart);
    }
    setFormEndDate('');
    setFormWorkerId('');
    setFormSubtasks([]);
    setShowAddTaskModal(false);

    // Persist to backend and replace temp entry with real IDs
    if (onAddStage) {
      const result = await onAddStage({
        name: formName.trim(),
        start_date: formStartDate,
        end_date: formEndDate,
        days: daysBetween(formStartDate, formEndDate),
        porcentaje: 0,
        worker_id: formWorkerId || null,
        subtasks: validSubtasks,
        tracking: {},
        colorIndex: stages.length % 10,
      });
      // Replace the temp stage entry with real backend data (includes real subtask IDs)
      if (result?.success && result?.data) {
        const real = result.data;
        setStages(prev => prev.map(s => s.id === tempId ? {
          id: real.id,
          nombre: real.name,
          startDate: real.start_date || null,
          endDate: real.end_date || null,
          dias: real.days,
          porcentaje: real.porcentaje || 0,
          worker_id: real.worker_id,
          subtasks: real.subtasks || [],
          tracking: typeof real.tracking === 'string' ? JSON.parse(real.tracking) : (real.tracking || {}),
          sortOrder: real.sort_order,
          colorIndex: real.color_index,
        } : s));
      }
    }
  };

  const handleRemoveStage = (id) => {
    const stageToRemove = stages.find(s => s.id === id);
    setStages(prev => prev.filter(s => s.id !== id));

    // Notify parent for backend persistence
    if (onRemoveStage && stageToRemove) {
      onRemoveStage(stageToRemove.id);
    }
  };

  const handleOpenEditModal = (taskId) => {
    const stage = stages.find(s => s.id === taskId);
    if (stage) {
      setEditTaskModal({ 
        open: true, 
        stage, 
        subtasks: stage.subtasks ? JSON.parse(JSON.stringify(stage.subtasks)) : [],
        workerId: stage.worker_id || ''
      });
    }
  };

  const handleAddSubtask = () => {
    setEditTaskModal(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, { id: 'new_' + Date.now(), name: '', status: 'pending' }]
    }));
  };

  const handleUpdateSubtask = (idx, field, value) => {
    setEditTaskModal(prev => {
      const newSubtasks = [...prev.subtasks];
      newSubtasks[idx][field] = value;
      return { ...prev, subtasks: newSubtasks };
    });
  };

  const handleRemoveSubtask = (idx) => {
    setEditTaskModal(prev => {
      const newSubtasks = [...prev.subtasks];
      newSubtasks.splice(idx, 1);
      return { ...prev, subtasks: newSubtasks };
    });
  };

  const handleSaveEditStage = () => {
    const { stage, subtasks, workerId } = editTaskModal;
    
    // Filtrar subtareas vacías
    const filteredSubtasks = subtasks.filter(st => st.name.trim() !== '');
    
    // El porcentaje lo calcula el backend, pero podemos hacer un cálculo optimista aquí
    const total = filteredSubtasks.length;
    const completadas = filteredSubtasks.filter(st => st.status === 'completed').length;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    setStages(prev => prev.map(t => {
      if (t.id === stage.id) {
        return { ...t, worker_id: workerId, subtasks: filteredSubtasks, porcentaje };
      }
      return t;
    }));

    if (onUpdateStage) {
      onUpdateStage(stage.id, {
        ...stage,
        worker_id: workerId,
        subtasks: filteredSubtasks,
        porcentaje
      });
    }

    setEditTaskModal({ open: false, stage: null, subtasks: [], workerId: '' });
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
        
        <div className="rounded-xl border border-gray-200 bg-gray-100 p-6 flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
            <div className="flex-1 max-w-[200px]">
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
            <div className="flex-1 max-w-[200px]">
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
            <div className="flex items-center gap-2 sm:mt-5">
              <div className="px-4 py-2 rounded-full bg-[#35938d] text-white flex items-center gap-2 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Total:</span>
                <span className="text-sm font-black">{totalDays} días</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Summary Cards */}
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between border-b border-gray-100 pb-2 gap-2">
            <div className="flex items-center gap-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Detalle por Tareas
              </h4>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(true)}
                className="rounded bg-[#35938d] hover:bg-[#2c7a75] text-white font-bold text-[10px] px-3 py-1.5 uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <PlusIcon className="size-3" strokeWidth={2.5} /> Agregar Tareas
              </button>
            </div>
            {stages.length > 0 && (
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
            )}
          </div>
          
          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
              <CalendarIcon className="size-10 text-gray-400 mb-3" />
              <h5 className="text-sm font-bold text-gray-700">Aún no hay tareas programadas</h5>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Comienza agregando la primera tarea a este proyecto para llevar un control del tiempo y los entregables.
              </p>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(true)}
                className="mt-4 rounded-lg bg-[#35938d] hover:bg-[#2c7a75] text-white font-bold text-xs px-4 py-2 uppercase tracking-wide flex items-center gap-2 transition-all"
              >
                <PlusIcon className="size-4" strokeWidth={2} /> Agregar Primera Tarea
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {stages.map((stage, index) => {
                const stageStart = parseDateLocal(stage.startDate);
                const stageEnd = parseDateLocal(stage.endDate);
                const color = STAGE_COLORS[index % STAGE_COLORS.length];
                const isDelayed = stageEnd < parseDateLocal(todayStr) && (stage.porcentaje || 0) < 100;
                const pct = stage.porcentaje || 0;

                return (
                  <div
                    key={stage.id}
                    onClick={() => setProgressPanel({ open: true, stage })}
                    className="rounded-xl border bg-white shadow-sm relative overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
                    style={{ borderColor: color.border }}
                  >
                    {/* Accent bar */}
                    <div className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl" style={{ backgroundColor: color.bg }} />

                    {/* Header */}
                    <div className="pl-4 pr-2 pt-3 pb-1 flex items-start gap-1">
                      <h5 className="flex-1 text-xs font-bold text-gray-800 leading-tight" title={stage.nombre}>
                        {stage.nombre}
                      </h5>
                      {isDelayed && (
                        <ExclamationTriangleIcon className="size-4 text-red-500 flex-shrink-0 mt-px" strokeWidth={2} title="Tarea Atrasada" />
                      )}
                    </div>

                    {/* Progress bar + % */}
                    <div className="px-4 pb-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold uppercase text-gray-400">Progreso</span>
                        <span className="text-[10px] font-black" style={{ color: pct === 100 ? '#10b981' : color.text }}>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : color.bg }}
                        />
                      </div>
                    </div>

                    {/* Dates & duration */}
                    <div className="px-4 pb-2 mt-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 mb-1">
                        <span>{formatDateShort(stageStart)}</span>
                        <span className="text-gray-300">→</span>
                        <span>{formatDateShort(stageEnd)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: color.text }}>Duración</span>
                          <span className="text-[10px] font-black" style={{ color: color.text }}>{stage.dias} días</span>
                        </div>
                        {isDelayed && (
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wide text-red-500">Retraso</span>
                            <span className="text-[10px] font-black text-red-500">
                              {Math.floor((parseDateLocal(todayStr) - stageEnd) / (1000 * 60 * 60 * 24))} días
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtask preview */}
                    {stage.subtasks && stage.subtasks.length > 0 && (
                      <div className="px-4 pb-2 border-t border-gray-100 pt-2">
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Subtareas ({stage.subtasks.length})</p>
                        <ul className="space-y-0.5">
                          {stage.subtasks.slice(0, 3).map(st => (
                            <li key={st.id} className="text-[10px] text-gray-600 flex items-center gap-1 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                st.status === 'completed' ? 'bg-emerald-400' : st.status === 'in_progress' ? 'bg-blue-400' : 'bg-gray-300'
                              }`} />
                              <span className="truncate">{st.name}</span>
                            </li>
                          ))}
                          {stage.subtasks.length > 3 && (
                            <li className="text-[9px] text-gray-400">+{stage.subtasks.length - 3} más...</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Action pills — stop propagation so they don't open panel */}
                    <div className="px-3 pb-3 pt-1 flex gap-1.5 mt-auto" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(stage.id)}
                        className="flex-1 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide rounded-md py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <PencilSquareIcon className="size-3" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(stage.id)}
                        className="flex-1 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide rounded-md py-1 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <TrashIcon className="size-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
                    onOpenTracking={(id) => handleOpenEditModal(id)}
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
      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-lg overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <PlusIcon className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Agregar Nueva Tarea</h3>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
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
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700">Encargado (Opcional)</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-[#35938d]" />
                  <select
                    value={formWorkerId}
                    onChange={e => setFormWorkerId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 h-10 pl-10 pr-3 text-sm focus:border-[#35938d] focus:ring-4 focus:ring-[#35938d]/10 bg-white transition-all outline-none"
                  >
                    <option value="">Sin Asignar</option>
                    {encargados.map(enc => (
                      <option key={enc.id} value={enc.id}>{enc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-gray-700">Subtareas (Opcional)</label>
                  <button 
                    type="button"
                    onClick={() => setFormSubtasks(prev => [...prev, { name: '', status: 'pending' }])}
                    className="text-[10px] font-bold uppercase text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {formSubtasks.map((st, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 flex items-start gap-3 shadow-sm relative space-y-3 flex-col">
                      <div className="w-full flex justify-between items-center border-b border-gray-200/60 pb-1.5">
                        <span className="text-[10px] font-black text-[#35938d] tracking-widest uppercase">Subtarea #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setFormSubtasks(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex-shrink-0"
                          title="Eliminar Subtarea"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                      
                      <div className="w-full space-y-3">
                        {/* Campo Nombre */}
                        <div className="w-full">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <DocumentTextIcon className="size-3.5 text-[#35938d]" />
                            Nombre de Subtarea
                          </label>
                          <input
                            type="text"
                            value={st.name}
                            onChange={e => {
                              const newSt = [...formSubtasks];
                              newSt[idx].name = e.target.value;
                              setFormSubtasks(newSt);
                            }}
                            placeholder="Ej. Realizar cimentación..."
                            className="w-full rounded-lg border border-gray-300 h-9 px-3 text-xs outline-none focus:border-[#35938d] focus:ring-1 focus:ring-[#35938d] transition-all bg-white hover:border-gray-400"
                          />
                        </div>

                        {/* Campo Descripción */}
                        <div className="w-full">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <svg className="size-3.5 text-[#35938d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                            Descripción / Entregable
                          </label>
                          <input
                            type="text"
                            value={st.description || ''}
                            onChange={e => {
                              const newSt = [...formSubtasks];
                              newSt[idx].description = e.target.value;
                              setFormSubtasks(newSt);
                            }}
                            placeholder="Ej. Detalle de los entregables esperados..."
                            className="w-full rounded-lg border border-gray-300 h-9 px-3 text-xs outline-none focus:border-[#35938d] focus:ring-1 focus:ring-[#35938d] transition-all bg-white hover:border-gray-400"
                          />
                        </div>

                        {/* Campo Encargados */}
                        <div className="w-full">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <svg className="size-3.5 text-[#35938d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Encargados Asignados
                          </label>
                          <WorkerMultiSelect
                            selectedWorkers={st.workers || ''}
                            projectWorkers={projectWorkers}
                            onChange={value => {
                              const newSt = [...formSubtasks];
                              newSt[idx].workers = value;
                              setFormSubtasks(newSt);
                            }}
                          />
                          {projectWorkers.length === 0 && (
                            <input
                              type="text"
                              value={st.workers || ''}
                              onChange={e => {
                                const newSt = [...formSubtasks];
                                newSt[idx].workers = e.target.value;
                                setFormSubtasks(newSt);
                              }}
                              placeholder="Encargados (sin trabajadores adjuntos)"
                              className="w-full rounded-lg border border-gray-300 h-9 px-3 text-xs outline-none focus:border-[#35938d] focus:ring-1 focus:ring-[#35938d] transition-all bg-white hover:border-gray-400 mt-2"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {formError && (
                <div className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-100 rounded-md px-3 py-2 text-center">
                  {formError}
                </div>
              )}
            </div>

            <div className="p-5 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => {
                  setFormError('');
                  setShowAddTaskModal(false);
                }}
                className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-200 text-[11px] font-black uppercase transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleAddStage}
                className="px-4 py-2 rounded-lg bg-[#35938d] hover:bg-[#2c7a75] text-white text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2"
              >
                <PlusIcon className="size-4" strokeWidth={2.5} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task / Subtasks Modal */}
      {editTaskModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-lg overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="bg-primary-50 p-2 rounded-lg">
                <PencilSquareIcon className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Detalles de Tarea</h3>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700">Encargado</label>
                <select
                  value={editTaskModal.workerId}
                  onChange={e => setEditTaskModal(prev => ({ ...prev, workerId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 h-10 px-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                >
                  <option value="">Sin Asignar</option>
                  {encargados.map(enc => (
                    <option key={enc.id} value={enc.id}>{enc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <label className="text-[11px] font-bold text-gray-700">Subtareas</label>
                  <button 
                    onClick={handleAddSubtask}
                    className="text-[10px] font-bold uppercase text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded"
                  >
                    + Agregar
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editTaskModal.subtasks.map((st, idx) => (
                    <div key={st.id || idx} className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 flex items-start gap-3 shadow-sm relative space-y-3 flex-col">
                      <div className="w-full flex justify-between items-center border-b border-gray-200/60 pb-1.5">
                        <span className="text-[10px] font-black text-[#35938d] tracking-widest uppercase">Subtarea #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(idx)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex-shrink-0"
                          title="Eliminar Subtarea"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>

                      <div className="w-full space-y-3">
                        {/* Campo Nombre */}
                        <div className="w-full">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <DocumentTextIcon className="size-3.5 text-[#35938d]" />
                            Nombre de Subtarea
                          </label>
                          <input 
                            type="text" 
                            value={st.name}
                            onChange={e => handleUpdateSubtask(idx, 'name', e.target.value)}
                            placeholder="Ej. Realizar cimentación..."
                            className="w-full rounded-lg border border-gray-300 h-9 px-3 text-xs outline-none focus:border-[#35938d] focus:ring-1 focus:ring-[#35938d] transition-all bg-white hover:border-gray-400"
                          />
                        </div>

                        {/* Campo Descripción */}
                        <div className="w-full">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <svg className="size-3.5 text-[#35938d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                            Descripción / Entregable
                          </label>
                          <input 
                            type="text" 
                            value={st.description || ''}
                            onChange={e => handleUpdateSubtask(idx, 'description', e.target.value)}
                            placeholder="Ej. Detalle de los entregables esperados..."
                            className="w-full rounded-lg border border-gray-300 h-9 px-3 text-xs outline-none focus:border-[#35938d] focus:ring-1 focus:ring-[#35938d] transition-all bg-white hover:border-gray-400"
                          />
                        </div>

                        {/* Campo Encargados */}
                        <div className="w-full">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <svg className="size-3.5 text-[#35938d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Encargados Asignados
                          </label>
                          <WorkerMultiSelect
                            selectedWorkers={st.workers || ''}
                            projectWorkers={projectWorkers}
                            onChange={value => handleUpdateSubtask(idx, 'workers', value)}
                          />
                          {projectWorkers.length === 0 && (
                            <input 
                              type="text" 
                              value={st.workers || ''}
                              onChange={e => handleUpdateSubtask(idx, 'workers', e.target.value)}
                              placeholder="Encargados (sin trabajadores adjuntos)"
                              className="w-full rounded-lg border border-gray-300 h-9 px-3 text-xs outline-none focus:border-[#35938d] focus:ring-1 focus:ring-[#35938d] transition-all bg-white hover:border-gray-400 mt-2"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {editTaskModal.subtasks.length === 0 && (
                    <div className="text-center py-4 text-xs text-gray-400">No hay subtareas definidas. El porcentaje se mantendrá en 0% si no hay subtareas.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
              <button 
                onClick={() => setEditTaskModal({ open: false, stage: null, subtasks: [], workerId: '' })}
                className="px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 text-[11px] font-black uppercase transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEditStage}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-[#2c7a75] text-white text-[11px] font-black uppercase transition-all"
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

      {/* ── Stage Progress Panel ── */}
      {progressPanel.open && progressPanel.stage && (() => {
        // Always read from the live stages[] array to get real backend IDs
        const ps = progressPanel.stage;
        const colorIdx = stages.findIndex(s => s.id === ps.id || s.nombre === ps.nombre);
        const color = STAGE_COLORS[Math.max(colorIdx, 0) % STAGE_COLORS.length];
        const subtasks = ps.subtasks || [];
        const completed = subtasks.filter(st => st.status === 'completed').length;
        const pct = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : (ps.porcentaje || 0);
        const API_BASE = '/api/proyectoskrsft';
        // Detect if subtasks have real IDs yet
        const hasRealIds = subtasks.every(st => st.id && !String(st.id).startsWith('new_'));

        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setProgressPanel({ open: false, stage: null })}
            />
            {/* Drawer */}
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-gray-100" style={{ borderLeft: `4px solid ${color.bg}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Progreso de Tarea</p>
                  <h3 className="text-base font-black text-gray-900 truncate">{ps.nombre}</h3>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                    <span>{formatDate(ps.startDate)} → {formatDate(ps.endDate)}</span>
                    <span>·</span>
                    <span>{ps.dias} días</span>
                  </div>
                </div>
                <button
                  onClick={() => setProgressPanel({ open: false, stage: null })}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <XMarkIcon className="size-5" />
                </button>
              </div>

              {/* Progress summary */}
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{completed} / {subtasks.length} subtareas completadas</span>
                  <span className="text-lg font-black" style={{ color: pct === 100 ? '#10b981' : color.text }}>{pct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : color.bg }}
                  />
                </div>
              </div>

              {/* Subtask list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {!hasRealIds && subtasks.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-bold flex items-center gap-2">
                    <svg className="size-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                    Sincronizando con el servidor... Cierra y vuelve a abrir el panel.
                  </div>
                )}
                {subtasks.length === 0 && (
                  <div className="text-center py-10 text-sm text-gray-400">Esta tarea no tiene subtareas definidas</div>
                )}
                {subtasks.map((st, idx) => {
                  const isCompleted = st.status === 'completed';
                  const evidenceUrl = st.evidence_path
                    ? `${API_BASE}/${project?.id}/planner/stages/${ps.id}/subtasks/${st.id}/evidence`
                    : null;

                  return (
                    <div
                      key={st.id}
                      className={`rounded-xl border p-3 transition-all ${isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => {
                            // Guard: block temp/missing IDs — real DB IDs are always positive integers
                            if (!st.id || String(st.id) === 'undefined' || String(st.id).startsWith('new_')) return;
                            if (!hasRealIds) return; // still syncing with backend
                            const newStatus = isCompleted ? 'pending' : 'completed';
                            onToggleSubtask && onToggleSubtask(ps.id, st.id, newStatus);
                            
                            // Update local stages state optimistically
                            setStages(prev => prev.map(s => {
                              if (s.id !== ps.id) return s;
                              const updatedSubtasks = (s.subtasks || []).map(sub =>
                                sub.id === st.id ? { ...sub, status: newStatus } : sub
                              );
                              const completed = updatedSubtasks.filter(x => x.status === 'completed').length;
                              const pct = updatedSubtasks.length > 0 ? Math.round((completed / updatedSubtasks.length) * 100) : 0;
                              return { ...s, subtasks: updatedSubtasks, porcentaje: pct };
                            }));

                            setProgressPanel(prev => ({
                              ...prev,
                              stage: {
                                ...prev.stage,
                                subtasks: (prev.stage.subtasks || []).map(s =>
                                  s.id === st.id ? { ...s, status: newStatus } : s
                                )
                              }
                            }));
                          }}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {isCompleted && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${isCompleted ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>
                            {st.name}
                          </p>
                          {st.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{st.description}</p>
                          )}
                          {st.workers && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              <span className="font-bold">Encargados:</span> {st.workers}
                            </p>
                          )}

                          {/* Evidence */}
                          <div className="mt-2">
                            {evidenceUrl ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={evidenceUrl}
                                  alt="Evidencia"
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer"
                                  onClick={() => setPreviewImageUrl(evidenceUrl)}
                                />
                                <label className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold">
                                  Cambiar foto
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const result = await onUploadEvidence?.(ps.id, st.id, file);
                                        if (result?.success) {
                                          setProgressPanel(prev => ({
                                            ...prev,
                                            stage: {
                                              ...prev.stage,
                                              subtasks: (prev.stage.subtasks || []).map(s =>
                                                s.id === st.id ? { ...s, evidence_path: result.data.evidence_path } : s
                                              )
                                            }
                                          }));
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                                isCompleted
                                  ? 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                  : 'border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100'
                              }`}>
                                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Agregar foto de evidencia
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const result = await onUploadEvidence?.(ps.id, st.id, file);
                                      if (result?.success) {
                                        setProgressPanel(prev => ({
                                          ...prev,
                                          stage: {
                                            ...prev.stage,
                                            subtasks: (prev.stage.subtasks || []).map(s =>
                                              s.id === st.id ? { ...s, evidence_path: result.data.evidence_path } : s
                                            )
                                          }
                                        }));
                                      }
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setPreviewImageUrl(null)} />
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center z-10 animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all outline-none"
              title="Cerrar Visualización"
            >
              <XMarkIcon className="size-6" />
            </button>
            {/* Image */}
            <img
              src={previewImageUrl}
              alt="Visualización de Evidencia"
              className="rounded-xl shadow-2xl max-w-full max-h-[85vh] object-contain border border-white/10"
            />
            {/* Download Button */}
            <a
              href={previewImageUrl}
              download
              className="mt-4 px-4 py-2 bg-[#35938d] hover:bg-[#2c7a75] text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar Imagen
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(PlannerSection);
