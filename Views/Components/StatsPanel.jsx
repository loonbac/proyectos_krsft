import { memo, useMemo } from 'react';
import { CheckCircleIcon, ClockIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { PieChart, pieClasses } from '@mui/x-charts/PieChart';
import { useDrawingArea } from '@mui/x-charts/hooks';
import { styled } from '@mui/material/styles';
import Badge from './ui/Badge';
import {
  formatNumber, getCurrencySymbol, getProjectStateClass,
  getProjectStateLabel, canFinalizeProject, getProjectColor,
} from '../utils';

const StyledText = styled('text')(() => ({
  fill: '#1e293b',
  textAnchor: 'middle',
  dominantBaseline: 'central',
  fontSize: 13,
  fontWeight: 700,
}));

const StyledSubText = styled('text')(() => ({
  fill: '#64748b',
  textAnchor: 'middle',
  dominantBaseline: 'central',
  fontSize: 9,
}));

function PieCenterLabel({ percent }) {
  const { width, height, left, top } = useDrawingArea();
  const cx = left + width / 2;
  const cy = top + height / 2;
  return (
    <>
      <StyledText x={cx} y={cy - 8}>{percent}%</StyledText>
      <StyledSubText x={cx} y={cy + 9}>PRESUP.</StyledSubText>
    </>
  );
}

const FILE_COLORS = [
  '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
];

/**
 * StatsPanel – Financial stats rows + MUI pie chart (detail view).
 */
function StatsPanel({
  project, projectSummary, usagePercent, spentColor, onStateClick, ordersGroupedByFile, completionRequest,
}) {
  const cur = getCurrencySymbol(project.currency);
  const stateClass = getProjectStateClass(project);
  const isCompleted = stateClass === 'completed';
  const isPendingRecount = stateClass === 'pending-recount';
  const total = parseFloat(project.total_amount || 0);
  const availableBase = parseFloat(project.available_amount || 0);
  const projectColor = getProjectColor(project.id);

  const budgetedAmount = useMemo(() => {
    if (!ordersGroupedByFile || ordersGroupedByFile.length === 0) return 0;

    const projectCurrency = project.currency ?? 'PEN';

    return ordersGroupedByFile.reduce((groupAcc, group) => {
      const orders = group?.orders || [];
      const groupTotal = orders.reduce((acc, order) => {
        if (order.status !== 'pending') return acc;

        const totalPen = parseFloat(order.total_with_igv ?? order.amount_pen ?? order.amount ?? 0);
        if (projectCurrency === 'USD') {
          const rate = parseFloat(order.exchange_rate ?? 0);
          return acc + (rate > 0 ? totalPen / rate : 0);
        }
        return acc + totalPen;
      }, 0);

      return groupAcc + groupTotal;
    }, 0);
  }, [ordersGroupedByFile, project.currency]);

  const budgetUsagePercent = availableBase > 0
    ? Math.min(100, (budgetedAmount / availableBase) * 100)
    : 0;

  const spentWithinBudgetPercent = budgetedAmount > 0
    ? Math.min(100, (parseFloat(projectSummary.spent || 0) / budgetedAmount) * 100)
    : 0;

  const rows = [
    { label: 'Monto Adjudicado', value: formatNumber(project.total_amount), isCurrency: true, valueClass: 'text-amber-600' },
    { label: 'Retenido',         value: formatNumber(project.retained_amount), isCurrency: true, valueClass: 'text-slate-400' },
    { label: 'Real Disponible', value: formatNumber(parseFloat(project.total_amount || 0) - parseFloat(project.retained_amount || 0)), isCurrency: true, valueClass: 'text-emerald-600' },
    { label: 'Gastado',         value: formatNumber(projectSummary.spent), isCurrency: true, valueClass: 'text-amber-500' },
    { label: 'Presupuestado',   value: formatNumber(budgetedAmount), isCurrency: true, valueClass: 'text-blue-600' },
    { label: 'Disponible Actual', value: formatNumber(projectSummary.remaining || project.available_amount), isCurrency: true, valueClass: 'text-blue-600' },
    ...(project.ceco_codigo ? [{ 
      label: 'CECOs', 
      value: `${project.abbreviation || project.ceco_nombre} – ${project.ceco_codigo}`, 
      isCurrency: false,
      isPill: true,
      pillColor: projectColor
    }] : []),
  ];

  const pieData = useMemo(() => {
    const t = total || 1;
    const spent = parseFloat(projectSummary.spent || 0);
    const retained = parseFloat(project.retained_amount || 0);
    const available = parseFloat(projectSummary.remaining || project.available_amount || 0);
    return [
      { id: 'gastado',    label: 'Gastado',    value: spent,     percentage: (spent    / t) * 100, color: spentColor },
      { id: 'disponible', label: 'Disponible', value: available, percentage: (available / t) * 100, color: '#3b82f6' },
      { id: 'retenido',   label: 'Retenido',   value: retained,  percentage: (retained  / t) * 100, color: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [project, projectSummary, spentColor, total]);

  // Anillo exterior: gasto por archivo/grupo (solo órdenes con amount > 0)
  const outerRingData = useMemo(() => {
    if (!ordersGroupedByFile || ordersGroupedByFile.length === 0) return [];
    const groups = ordersGroupedByFile
      .map((g, i) => {
        const groupTotal = (g.orders || []).reduce((acc, o) => {
          const base = parseFloat(o.amount || 0);
          const igv = o.igv_enabled ? base * (parseFloat(o.igv_rate ?? 18) / 100) : 0;
          return acc + base + igv;
        }, 0);
        return {
          id: `file-${i}`,
          label: g.filename ? g.filename.replace(/\.xlsx?$/i, '') : 'Manual',
          value: groupTotal,
          color: FILE_COLORS[i % FILE_COLORS.length],
        };
      })
      .filter(g => g.value > 0)
      .sort((a, b) => b.value - a.value);
    return groups;
  }, [ordersGroupedByFile]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Left: stat rows */}
      <article className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Título con icono de hoja de papel */}
        <div className="mb-2 flex items-center gap-2 border-b border-gray-100 pb-3">
          <span className="rounded-full bg-gray-100 p-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg></span>
          <h3 className="text-xs font-bold tracking-wide text-gray-900">DATOS DEL PROYECTO</h3>
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-gray-500">{row.label}</span>
              {row.isPill ? (
                <span 
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: row.pillColor }}
                >
                  {row.value}
                </span>
              ) : (
                <span className={`text-sm font-bold ${row.valueClass || 'text-gray-900'}`}>
                  {row.isCurrency !== false ? cur + ' ' : ''}{row.value}
                </span>
              )}
            </div>
          ))}

          {/* ESTADO DEL PROYECTO */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-semibold text-gray-500 uppercase">Estado del Proyecto</span>
            <button
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isCompleted
? 'bg-blue-100 text-blue-700'
                    : isPendingRecount
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary/20 text-primary/80 hover:bg-primary/30 cursor-pointer'
              }`}
              onClick={() => canFinalizeProject(project) && onStateClick(project)}
              title={
                canFinalizeProject(project)
                  ? 'Click para finalizar proyecto'
                  : isPendingRecount
                    ? 'Recuento de sobrantes pendiente'
                    : ''
              }
              disabled={!canFinalizeProject(project)}
            >
              {isCompleted
                ? <CheckCircleIcon className="size-4" />
                : isPendingRecount
                  ? <ClipboardDocumentListIcon className="size-4" />
                  : <ClockIcon className="size-4" />
              }
              {getProjectStateLabel(project)}
            </button>
          </div>

          {/* Completion request indicator */}
          {completionRequest && completionRequest.status === 'pending' && (
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <span className="text-sm text-gray-500">Recuento de sobrantes</span>
              <Badge variant="amber" dot>
                Pendiente de aprobación
              </Badge>
            </div>
          )}
          {completionRequest && completionRequest.status === 'rejected' && (
            <div className="space-y-1 border-b border-gray-50 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Recuento de sobrantes</span>
                <Badge variant="red" dot>
                  Rechazado
                </Badge>
              </div>
              {completionRequest.rejection_notes && (
                <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                  Motivo: {completionRequest.rejection_notes}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-gray-700">Umbral ({project.spending_threshold || 75}%)</span>
            <div className="text-right">
              <span className="text-sm font-bold text-gray-900">{budgetUsagePercent.toFixed(1)}% presupuestado</span>
              <span className="ml-2 text-xs text-gray-400">
                {cur} {formatNumber((parseFloat(project.total_amount || 0) * (project.spending_threshold || 75)) / 100)}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50/80 px-3 py-2.5">
            <div className="text-xs font-semibold text-gray-600">Presupuestado vs Disponible</div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${budgetUsagePercent}%`, minWidth: budgetUsagePercent > 0 ? '8px' : '0px' }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{cur} {formatNumber(budgetedAmount)} presupuestado</span>
              <span>{cur} {formatNumber(availableBase)} base disponible</span>
            </div>

            <div className="mt-2 text-xs font-semibold text-gray-600">Gastado dentro de Presupuestado</div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${spentWithinBudgetPercent}%`, minWidth: spentWithinBudgetPercent > 0 ? '8px' : '0px' }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{cur} {formatNumber(projectSummary.spent || 0)} pagado</span>
              <span>Falta cubrir: {cur} {formatNumber(Math.max(budgetedAmount - parseFloat(projectSummary.spent || 0), 0))}</span>
            </div>
          </div>
        </div>
      </article>

      {/* Right: MUI Pie chart */}
      <article className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <PieChart
          series={[
            {
              innerRadius: 52,
              outerRadius: outerRingData.length > 0 ? 82 : 90,
              data: pieData,
              arcLabel: (item) => `${item.percentage.toFixed(1)}%`,
              arcLabelMinAngle: 25,
              valueFormatter: ({ value }) => `${cur} ${formatNumber(value)}`,
              highlightScope: { fade: 'global', highlight: 'item' },
              highlighted: { additionalRadius: 4 },
              cornerRadius: 3,
            },
            ...(outerRingData.length > 0 ? [{
              innerRadius: 86,
              outerRadius: 106,
              data: outerRingData,
              valueFormatter: (params, context) => {
                const item = outerRingData[context?.dataIndex ?? 0];
                return `${item ? item.label + ' — ' : ''}${cur} ${formatNumber(params.value)}`;
              },
              highlightScope: { fade: 'global', highlight: 'item' },
              highlighted: { additionalRadius: 3 },
              cornerRadius: 3,
            }] : []),
          ]}
          sx={{
            [`& .${pieClasses.arcLabel}`]: {
              fontSize: '10px',
              fontWeight: '600',
              fill: 'white',
            },
            [`& .${pieClasses.arc}`]: {
              opacity: 0.49,
              transition: 'opacity 0.2s ease',
            },
            // Note: highlighted/faded opacity is hardcoded in MUI x-charts v9
            // (faded uses opacity:0.3, highlighted uses brightness(120%) filter)
          }}
          width={240}
          height={240}
          hideLegend
          margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <PieCenterLabel percent={budgetUsagePercent.toFixed(1)} />
        </PieChart>
        <div className="flex flex-col gap-1.5 text-xs w-full">
          {pieData.map(d => (
            <div key={d.id} className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.label}</span>
              <span className="ml-auto font-semibold text-gray-700">{cur} {formatNumber(d.value)}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

export default memo(StatsPanel);
