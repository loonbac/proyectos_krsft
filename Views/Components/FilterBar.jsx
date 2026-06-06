import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const isoFromDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const dateFromIso = (iso) => {
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

function CalendarPopover({ label, value, displayValue, onChange, placeholder = 'dd/mm/yyyy' }) {
  const selectedDate = dateFromIso(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [viewDate]);

  const goMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDay = (day) => {
    onChange(isoFromDate(day));
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <span className="text-xs text-gray-500">{label}:</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="ml-2 inline-flex h-9 min-w-[118px] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-700 shadow-sm transition-all hover:border-teal-300 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
      >
        <span className={displayValue ? 'text-gray-800' : 'text-gray-400'}>{displayValue || placeholder}</span>
        <CalendarDaysIcon className="size-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[316px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl shadow-slate-900/12">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-100"
              aria-label="Mes anterior"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <div className="text-sm font-semibold text-gray-900">
              {MONTHS[viewDate.getMonth()]} <span className="font-medium text-gray-500">{viewDate.getFullYear()}</span>
            </div>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-100"
              aria-label="Mes siguiente"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1 text-[11px] font-semibold text-gray-500">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const iso = isoFromDate(day);
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = value === iso;
              const isToday = iso === isoFromDate(new Date());

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={[
                    'inline-flex h-9 items-center justify-center rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-100',
                    isSelected
                      ? 'bg-teal-600 font-semibold text-white shadow-sm hover:bg-teal-700'
                      : isCurrentMonth
                        ? 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                        : 'text-gray-300 hover:bg-gray-50',
                    isToday && !isSelected ? 'ring-1 ring-teal-300' : '',
                  ].join(' ')}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * FilterBar – Status pills + date-range pickers for list view.
 */
function FilterBar({
  statusFilters,
  statusFilter,
  onStatusChange,
  dateFromDisplay,
  dateToDisplay,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
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
          <CalendarPopover
            label="Desde"
            value={dateFrom}
            displayValue={dateFromDisplay}
            onChange={onDateFromChange}
          />
          <CalendarPopover
            label="Hasta"
            value={dateTo}
            displayValue={dateToDisplay}
            onChange={onDateToChange}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(FilterBar);
