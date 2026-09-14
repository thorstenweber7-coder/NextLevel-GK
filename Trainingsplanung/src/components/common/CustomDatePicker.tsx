import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CustomDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  className?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}

export const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export const GERMAN_WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function formatDateToGerman(val?: string): string {
  if (!val) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}.${m}.${y}`;
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
    return val;
  }
  const hasSuffixB = val.includes(' (B)');
  const cleanVal = val.replace(' (B)', '').trim();
  const parts = cleanVal.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    const formatted = `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    return hasSuffixB ? `${formatted} (B)` : formatted;
  }
  return val;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  className,
  minDate,
  maxDate,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date
  const parsedValue = useMemo(() => {
    if (!value) return new Date();
    const cleanVal = value.replace(' (B)', '').trim();
    const [y, m, d] = cleanVal.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(() => parsedValue.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => parsedValue.getMonth());

  // Keep viewing month in sync when value changes externally
  useEffect(() => {
    if (value) {
      const cleanVal = value.replace(' (B)', '').trim();
      const [y, m, d] = cleanVal.split('-').map(Number);
      if (y && m && d) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear(prev => prev - 1);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear(prev => prev + 1);
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const newDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;
    onChange(newDateStr);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setViewYear(y);
    setViewMonth(today.getMonth());
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    // Days in current month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // First day of current month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    // Convert to Monday-start (0 = Mon, ..., 6 = Sun)
    const startOffset = (firstDayIndex + 6) % 7;

    // Days in previous month
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      dateStr: string;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    const todayStr = new Date().toISOString().substring(0, 10);

    // Leading days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDay = prevMonthDays - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
      days.push({
        day: prevDay,
        isCurrentMonth: false,
        dateStr: dStr,
        isSelected: dStr === value || `${dStr} (B)` === value,
        isToday: dStr === todayStr,
        isDisabled: true
      });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let isDisabled = false;
      if (minDate && dStr < minDate) isDisabled = true;
      if (maxDate && dStr > maxDate) isDisabled = true;

      days.push({
        day,
        isCurrentMonth: true,
        dateStr: dStr,
        isSelected: dStr === value || `${dStr} (B)` === value,
        isToday: dStr === todayStr,
        isDisabled
      });
    }

    // Trailing days to fill standard 35 or 42 grid slots
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        isCurrentMonth: false,
        dateStr: dStr,
        isSelected: dStr === value || `${dStr} (B)` === value,
        isToday: dStr === todayStr,
        isDisabled: true
      });
    }

    return days;
  }, [viewYear, viewMonth, value, minDate, maxDate]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Date Display Input Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "w-full bg-slate-950 border rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:outline-none transition font-mono font-medium cursor-pointer text-left flex items-center justify-between shadow-sm select-none relative",
          isOpen ? "border-emerald-500 ring-1 ring-emerald-500/50" : "border-slate-800 hover:border-slate-700",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span>{formatDateToGerman(value)}</span>
        <CalendarIcon className={cn("w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 transition", isOpen ? "text-emerald-400" : "text-slate-400")} />
      </button>

      {/* Floating Custom Calendar Popover */}
      {isOpen && (
        <div 
          className="absolute z-50 left-0 top-full mt-1.5 w-72 bg-slate-900 border border-slate-700/90 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-slate-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with Navigation */}
          <div className="flex items-center justify-between gap-1 pb-2.5 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevYear}
                title="Vorheriges Jahr"
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Vorheriger Monat"
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="font-extrabold text-xs text-white tracking-wide">
              {GERMAN_MONTHS[viewMonth]} {viewYear}
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleNextMonth}
                title="Nächster Monat"
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                title="Nächstes Jahr"
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {GERMAN_WEEKDAYS.map(wd => (
              <span key={wd} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider py-0.5">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="h-8 flex items-center justify-center text-[11px] font-medium text-slate-600 select-none"
                  >
                    {item.day}
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => handleSelectDay(item.day)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-semibold transition flex items-center justify-center relative cursor-pointer select-none",
                    item.isSelected
                      ? "bg-emerald-600 text-white font-black shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400"
                      : item.isToday
                      ? "bg-slate-800 text-emerald-400 font-bold border border-emerald-500/40 hover:bg-slate-700"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    item.isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent text-slate-600"
                  )}
                >
                  <span>{item.day}</span>
                  {item.isToday && !item.isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: ONLY "Heute" button — NO "Löschen" button */}
          <div className="pt-2.5 mt-2.5 border-t border-slate-800 flex items-center justify-center">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 hover:border-emerald-600/60 text-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <CalendarIcon className="w-3 h-3 text-emerald-400" />
              <span>Heute auswählen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
