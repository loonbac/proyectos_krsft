import { memo, useMemo } from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { PieChart, pieArcLabelClasses, pieArcClasses } from '@mui/x-charts/PieChart';
import { useDrawingArea } from '@mui/x-charts/hooks';
import { styled } from '@mui/material/styles';
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
      <StyledSubText x={cx} y={cy + 9}>USADO</StyledSubText>
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
  project, projectSummary, usagePercent, spentColor, onStateClick, ordersGroupedByFile,
}) {
  const cur = getCurrencySymbol(project.currency);
  const isCompleted = getProjectStateClass(project) === 'completed';
  const total = parseFloat(project.total_amount || 0);
  const projectColor = getProjectColor(project.id);

  const rows = [
    { label: 'Monto Adjudicado', value: formatNumber(project.total_amount), color: 'text-amber-600', isCurrency: true },
    { label: 'Retenido', value: formatNumber(project.retained_amount), color: 'text-gray-400', isCurrency: true },
    { label: 'Real Disponible', value: formatNumber(parseFloat(project.total_amount || 0) - parseFloat(project.retained_amount || 0)), color: 'text-emerald-600', isCurrency: true },
    { label: 'Gastado', value: formatNumber(projectSummary.spent), color: 'text-amber-500', isCurrency: true },
    { label: 'Disponible Actual', value: formatNumber(projectSummary.remaining || project.available_amount), color: 'text-blue-600', isCurrency: true },
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
        const groupTotal = (g.orders || []).reduce((acc, o) => acc + parseFloat(o.amount || 0), 0);
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: stat rows */}
      <div className="lg:col-span-2 rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
        {/* Título con icono de hoja de papel */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h3 className="text-sm font-bold tracking-wide text-gray-700 uppercase">Datos del Proyecto</h3>
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
              <span className="text-sm text-gray-500">{row.label}</span>
              {row.isPill ? (
                <span 
                  className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold text-white"
                  style={{ 
                    backgroundColor: row.pillColor
                  }}
                >
                  {row.value}
                </span>
              ) : (
                <span className={`text-sm font-semibold ${row.color}`}>
                  {row.isCurrency !== false ? cur + ' ' : ''}{row.value}
                </span>
              )}
            </div>
          ))}

          {/* ESTADO DEL PROYECTO */}
          <div className="flex items-center justify-between border-b border-gray-50 pb-2">
            <span className="text-sm font-semibold text-gray-500 uppercase">Estado del Proyecto</span>
            <button
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isCompleted
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200 cursor-pointer'
              }`}
              onClick={() => canFinalizeProject(project) && onStateClick(project)}
              title={canFinalizeProject(project) ? 'Click para finalizar proyecto' : ''}
              disabled={!canFinalizeProject(project)}
            >
              {isCompleted ? <CheckCircleIcon className="size-4" /> : <ClockIcon className="size-4" />}
              {getProjectStateLabel(project)}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-gray-700">Umbral ({project.spending_threshold || 75}%)</span>
            <div className="text-right">
              <span className="text-sm font-bold text-gray-900">{usagePercent}% usado</span>
              <span className="ml-2 text-xs text-gray-400">
                {cur} {formatNumber((parseFloat(project.total_amount || 0) * (project.spending_threshold || 75)) / 100)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: MUI Pie chart */}
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm gap-2">
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
            [`& .${pieArcLabelClasses.root}`]: {
              fontSize: '10px',
              fontWeight: '600',
              fill: 'white',
            },
            [`& .${pieArcClasses.root}`]: {
              opacity: 0.49,
              transition: 'opacity 0.2s ease',
            },
            [`& .${pieArcClasses.highlighted}`]: {
              opacity: 1,
            },
            [`& .${pieArcClasses.faded}`]: {
              opacity: 0.15,
            },
          }}
          width={240}
          height={240}
          hideLegend
          margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <PieCenterLabel percent={usagePercent} />
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
      </div>
    </div>
  );
}

export default memo(StatsPanel);
