import { memo } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PieChart } from '@mui/x-charts/PieChart';

// ── Stage colors for calendar (using hex to avoid Tailwind purge issues) ──────
const STAGE_COLORS = [
  { bg: '#bfdbfe', text: '#1e3a8a', border: '#60a5fa', light: '#eff6ff' },
  { bg: '#bbf7d0', text: '#14532d', border: '#4ade80', light: '#f0fdf4' },
  { bg: '#fef08a', text: '#713f12', border: '#facc15', light: '#fefce8' },
  { bg: '#e9d5ff', text: '#581c87', border: '#c084fc', light: '#faf5ff' },
  { bg: '#fbcfe8', text: '#831843', border: '#f472b6', light: '#fdf2f8' },
  { bg: '#fed7aa', text: '#7c2d12', border: '#fb923c', light: '#fff7ed' },
  { bg: '#a7f3d0', text: '#064e3b', border: '#34d399', light: '#ecfdf5' },
  { bg: '#fecaca', text: '#7f1d1d', border: '#f87171', light: '#fef2f2' },
  { bg: '#a5f3fc', text: '#164e63', border: '#22d3ee', light: '#ecfeff' },
  { bg: '#e5e7eb', text: '#1f2937', border: '#9ca3af', light: '#f9fafb' },
];

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

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

function getStartOfDay(d) {
  const date = parseDateLocal(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const d = parseDateLocal(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateShort(date) {
  if (!date) return '';
  return parseDateLocal(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

// ── PlannerCalendar Component ────────────────────────────────────────────────
function PlannerCalendar({ stages, startDate, totalDays, today, onOpenTracking }) {
  if (!startDate || !stages.length || totalDays <= 0) return null;

  const start = getStartOfDay(startDate);
  const end = addDays(start, totalDays - 1);
  const todayStart = getStartOfDay(today || new Date());

  // Generate months to display
  const months = [];
  let currentMonthDate = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonthDate = new Date(end.getFullYear(), end.getMonth(), 1);

  while (currentMonthDate <= endMonthDate) {
    months.push(new Date(currentMonthDate));
    currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
  }

  const getStagesForDate = (date) => {
    if (date < start || date > end) return [];
    const matched = [];
    for (let idx = 0; idx < stages.length; idx++) {
      const stage = stages[idx];
      const stageStart = getStartOfDay(stage.startDate);
      const stageEnd = getStartOfDay(stage.endDate);
      if (date >= stageStart && date <= stageEnd) {
        const dayOfStage = Math.round((date - stageStart) / (1000 * 60 * 60 * 24)) + 1;
        matched.push({ stage, color: STAGE_COLORS[idx % STAGE_COLORS.length], dayOfStage });
      }
    }
    return matched;
  };

  const toLocalISOString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 w-full min-w-[600px] overflow-hidden mt-6">
      <div className="bg-gray-50/50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Calendario del Proyecto
        </h4>
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          {totalDays} días en total
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-gray-50">
        {months.map((monthDate, mIdx) => {
          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          
          // 0 = Sunday, 1 = Monday ... 6 = Saturday
          let firstDayOfWeek = new Date(year, month, 1).getDay(); 
          // Adjust to Monday = 0, Sunday = 6
          const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

          const days = [];
          for (let i = 0; i < startOffset; i++) {
            days.push(null);
          }
          for (let d = 1; d <= daysInMonth; d++) {
            days.push(new Date(year, month, d));
          }

          const monthName = monthDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

          return (
            <div key={mIdx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-white px-5 py-3 text-center font-bold text-gray-800 capitalize border-b border-gray-200 text-lg">
                {monthName}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }} className="border-b border-gray-200 bg-gray-50">
                {WEEKDAYS.map((day, idx) => (
                  <div key={idx} className="text-center text-xs font-bold text-gray-500 py-2 border-r border-gray-200 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }} className="bg-gray-200 gap-px overflow-x-auto min-w-[600px]">
                {days.map((date, idx) => {
                  if (!date) {
                    return <div key={`empty-${idx}`} className="bg-gray-50 min-h-[100px]" />;
                  }

                  const stageInfos = getStagesForDate(date);
                  const isToday = date.getTime() === todayStart.getTime();
                  
                  return (
                    <div 
                      key={idx} 
                      className="min-h-[100px] p-2 flex flex-col relative bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white shadow-sm' : (stageInfos.length > 0 ? 'text-gray-900' : 'text-gray-400')}`}>
                          {date.getDate()}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1 mt-auto">
                        {stageInfos.map((stageInfo, sIdx) => {
                          const dailyPercentage = stageInfo.stage.tracking?.[toLocalISOString(date)] || 0;
                          return (
                            <button 
                              key={sIdx}
                              type="button"
                              onClick={() => onOpenTracking && onOpenTracking(stageInfo.stage.id, stageInfo.stage.nombre, dailyPercentage, toLocalISOString(date))}
                              className="text-[11px] px-2 py-1 rounded-md w-full truncate border font-semibold flex flex-col shadow-sm transition-shadow hover:shadow-md active:scale-95 text-left"
                              style={{ 
                                backgroundColor: stageInfo.color.light, 
                                color: stageInfo.color.text,
                                borderColor: stageInfo.color.border
                              }}
                              title={`${stageInfo.stage.nombre} - Avance: ${dailyPercentage}% - Click para reportar`}
                            >
                              <span className="truncate">{stageInfo.stage.nombre}</span>
                              <div className="w-full bg-white/50 h-0.5 rounded-full mt-0.5 overflow-hidden">
                                <div className="h-full bg-current opacity-40 transition-all" style={{ width: `${dailyPercentage}%` }} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                );
                })}
              </div>
            </div>
            );
        })}
      </div>
    </div>
  );
}

function GanttChart({ stages, startDate, totalDays }) {
  if (!startDate || !stages.length || totalDays <= 0) return null;

  const start = getStartOfDay(startDate);
  
  // Calculate relative positions
  const getRelativePosition = (dateStr) => {
    const date = getStartOfDay(dateStr);
    const diff = Math.round((date - start) / (1000 * 60 * 60 * 24));
    return (diff / totalDays) * 100;
  };

  const getWidth = (startStr, endStr) => {
    const days = Math.round((getStartOfDay(endStr) - getStartOfDay(startStr)) / (1000 * 60 * 60 * 24)) + 1;
    return (days / totalDays) * 100;
  };

  // Generate timeline markers (days or weeks depending on duration)
  const markers = [];
  const markerStep = totalDays > 60 ? 7 : (totalDays > 30 ? 2 : 1);
  for (let i = 0; i < totalDays; i += markerStep) {
    markers.push({
      offset: (i / totalDays) * 100,
      label: formatDateShort(addDays(start, i)),
      isWeek: markerStep === 7
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mt-2">
      {/* Header Info */}
      <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Cronograma de Actividades
        </h4>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200" />
            <span>Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-primary/20 border border-primary/30" />
            <span>Tarea</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] p-6">
          <div className="relative">
            {/* Timeline Header */}
            <div className="flex mb-8 border-b border-gray-100 pb-2">
              <div className="w-48 shrink-0 text-[10px] font-bold uppercase text-gray-400">Tarea</div>
              <div className="flex-1 relative h-6">
                {markers.map((m, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 flex flex-col items-center" 
                    style={{ left: `${m.offset}%` }}
                  >
                    <div className="h-2 w-px bg-gray-200 mb-1" />
                    <span className="text-[9px] font-medium text-gray-400 whitespace-nowrap">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stages Rows */}
            <div className="space-y-4 relative">
              {/* Vertical Grid Lines */}
              <div className="absolute top-0 bottom-0 left-48 right-0 flex pointer-events-none">
                {markers.map((m, i) => (
                  <div 
                    key={i} 
                    className="h-full w-px bg-gray-50" 
                    style={{ position: 'absolute', left: `${m.offset}%` }} 
                  />
                ))}
              </div>

              {stages.map((stage, idx) => {
                const color = STAGE_COLORS[idx % STAGE_COLORS.length];
                const left = getRelativePosition(stage.startDate);
                const width = getWidth(stage.startDate, stage.endDate);

                return (
                  <div key={stage.id} className="flex items-center group">
                    {/* Stage Label */}
                    <div className="w-48 shrink-0 pr-4">
                      <div className="text-[11px] font-bold text-gray-700 truncate" title={stage.nombre}>
                        {stage.nombre}
                      </div>
                      <div className="text-[9px] font-medium text-gray-400">
                        {stage.dias} días
                      </div>
                    </div>

                    {/* Bar Container */}
                    <div className="flex-1 relative h-8 flex items-center">
                      <div 
                        className="absolute h-6 rounded-sm border shadow-sm flex items-center px-3 transition-all group-hover:shadow-md"
                        style={{ 
                          left: `${left}%`, 
                          width: `${width}%`,
                          backgroundColor: color.light,
                          borderColor: color.border,
                          color: color.text
                        }}
                      >
                        <div className="w-full truncate text-[10px] font-bold">
                          {stage.nombre}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Day Indicator (if within range) */}
            {/* Logic for current day vertical line could be added here */}
          </div>
        </div>
      </div>

      {/* Footer / Legend */}
      <div className="bg-gray-50/30 border-t border-gray-100 px-6 py-3 flex items-center justify-between text-[10px] text-gray-400">
        <span>Inicio: {formatDateShort(start)}</span>
        <span className="font-medium italic text-gray-300 uppercase tracking-[2px]">Gantt Técnico</span>
        <span>Fin: {formatDateShort(addDays(start, totalDays - 1))}</span>
      </div>
    </div>
  );
}

// TrackingMatrix was removed as per user request to streamline daily tracking via Calendar clicks.
// ── StatsSummary Component ────────────────────────────────────────────────────
function StatsSummary({ stages, totalDays }) {
  if (!stages.length) return null;

  const totalStageDays = stages.reduce((acc, s) => acc + (s.dias || 0), 0);
  const globalPercentage = stages.length > 0 
    ? Math.round(stages.reduce((acc, s) => acc + (s.porcentaje || 0), 0) / stages.length)
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mt-6">
      <h4 className="mb-4 text-sm font-bold tracking-wide text-gray-800">
        Resumen de Tiempos y Avance
      </h4>

      <div className="space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 border border-gray-100">
          <span className="text-sm text-gray-600 font-medium">Total de días del proyecto</span>
          <span className="text-sm font-bold text-gray-900">{totalDays}</span>
        </div>

        {/* Task breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {stages.map((stage, idx) => {
            const color = STAGE_COLORS[idx % STAGE_COLORS.length];
            return (
              <div key={stage.id} className="flex flex-col rounded-lg bg-white p-4 border shadow-sm" style={{ borderColor: color.border }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color.bg }} />
                    <span className="text-sm font-bold text-gray-700 truncate max-w-[120px]">{stage.nombre}</span>
                  </div>
                  <span className="text-xs font-black" style={{ color: color.text }}>{stage.porcentaje || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${stage.porcentaje || 0}%` }} />
                </div>
                <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase">{stage.dias} días programados</div>
              </div>
            );
          })}
        </div>

        {/* Used vs Total & Percentage */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex-1 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 border border-emerald-100">
            <span className="text-sm text-emerald-700 font-medium">Días asignados</span>
            <span className="text-sm font-bold text-emerald-800">{totalStageDays} / {totalDays}</span>
          </div>
          <div className="flex-1 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 border border-blue-100">
            <span className="text-sm text-blue-700 font-medium">Avance Global</span>
            <span className="text-sm font-bold text-blue-800">{globalPercentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}


function GlobalProgressPie({ stages }) {
  if (!stages.length) return null;

  const pieParams = {
    height: 180,
    width: 180,
    margin: { right: 0, left: 0, top: 0, bottom: 0 },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h4 className="mb-6 text-sm font-bold tracking-wide text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" />
        Análisis Global por Tarea
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 justify-items-center">
        {stages.map((stage, idx) => {
          const color = STAGE_COLORS[idx % STAGE_COLORS.length];
          const porcentaje = Number(stage.porcentaje || 0);
          const restante = Math.max(0, 100 - porcentaje);
          
          const data = [
            { id: 0, value: porcentaje, label: 'Avance', color: color.border || '#0AA4A4' },
            { id: 1, value: restante, label: 'Pendiente', color: '#f3f4f6' }
          ];

          return (
            <Box key={stage.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 200 }}>
              <div className="w-full text-center mb-4">
                <Typography variant="subtitle2" sx={{ fontWeight: '800', color: '#374151', fontSize: '11px', textTransform: 'uppercase', px: 1 }} className="truncate" title={stage.nombre}>
                  {stage.nombre}
                </Typography>
                <Typography variant="h6" sx={{ color: color.text || '#0AA4A4', fontWeight: '900', fontSize: '18px', lineHeight: 1 }}>
                  {porcentaje}%
                </Typography>
              </div>
              <div className="flex items-center justify-center h-[180px] w-[180px]">
                <PieChart
                  series={[{ 
                    data, 
                    innerRadius: 55,
                    outerRadius: 80,
                    paddingAngle: 3,
                    cornerRadius: 6,
                  }]}
                  {...pieParams}
                  slotProps={{
                    legend: { hidden: true }
                  }}
                />
              </div>
            </Box>
          );
        })}
      </div>
    </div>
  );
}

export { PlannerCalendar, GanttChart, GlobalProgressPie, StatsSummary, STAGE_COLORS };