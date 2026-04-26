import { memo } from 'react';
import Button from './ui/Button';

/**
 * FilterBar – Status pills + date-range pickers for list view.
 */
function FilterBar({
  statusFilters,
  statusFilter,
  onStatusChange,
  dateFromDisplay,
  dateToDisplay,
  dateFromInputRef,
  dateToInputRef,
  onOpenDateFrom,
  onOpenDateTo,
  dateFrom,
  dateTo,
  onClearDates,
}) {
  const activeClasses = {
    all: 'bg-teal-600 text-white shadow-sm',
    warning: 'bg-amber-500 text-white shadow-sm',
    critical: 'bg-red-500 text-white shadow-sm',
  };
  const inactiveClass = 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50';

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => onStatusChange(f.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === f.value
                  ? (activeClasses[f.value] ?? 'bg-teal-600 text-white shadow-sm')
                  : inactiveClass
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                statusFilter === f.value ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearDates}
              className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            >
              Limpiar
            </Button>
          )}
          <span className="text-xs text-gray-500">Desde:</span>
          <input
            ref={dateFromInputRef}
            type="text"
            readOnly
            placeholder="dd/mm/yyyy"
            value={dateFromDisplay}
            onClick={onOpenDateFrom}
            className="w-28 cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <span className="text-xs text-gray-500">Hasta:</span>
          <input
            ref={dateToInputRef}
            type="text"
            readOnly
            placeholder="dd/mm/yyyy"
            value={dateToDisplay}
            onClick={onOpenDateTo}
            className="w-28 cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(FilterBar);
