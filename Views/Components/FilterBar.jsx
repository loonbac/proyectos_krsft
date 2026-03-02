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
    all: 'bg-teal-500 text-white',
    warning: 'bg-amber-500 text-white',
    critical: 'bg-red-500 text-white',
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-gray-200 bg-white px-4 py-3 shadow-sm">
      {statusFilters.map(f => (
        <button
          key={f.value}
          onClick={() => onStatusChange(f.value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            statusFilter === f.value
              ? (activeClasses[f.value] ?? 'bg-primary text-white')
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {f.label}
          <span className={`rounded-full px-1.5 text-xs ${statusFilter === f.value ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>
            {f.count}
          </span>
        </button>
      ))}

      <div className="ml-auto flex items-center gap-2 text-sm">
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearDates}
            className="border border-red-500/30 bg-red-500/10 text-red-600/80 hover:bg-red-500/20 hover:text-red-600"
          >
            Limpiar
          </Button>
        )}
        <span className="text-gray-500">Desde:</span>
        <input
          ref={dateFromInputRef}
          type="text"
          readOnly
          placeholder="dd/mm/yyyy"
          value={dateFromDisplay}
          onClick={onOpenDateFrom}
          className="w-28 cursor-pointer rounded border border-gray-300 px-2 py-1 text-sm shadow-sm"
        />
        <span className="text-gray-500">Hasta:</span>
        <input
          ref={dateToInputRef}
          type="text"
          readOnly
          placeholder="dd/mm/yyyy"
          value={dateToDisplay}
          onClick={onOpenDateTo}
          className="w-28 cursor-pointer rounded border border-gray-300 px-2 py-1 text-sm shadow-sm"
        />
      </div>
    </div>
  );
}

export default memo(FilterBar);
