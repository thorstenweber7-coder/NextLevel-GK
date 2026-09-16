import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Users,
  CalendarDays
} from 'lucide-react';
import type { 
  TrainingPlan, 
  TrainingGroup, 
  MesoPlan, 
  MesoDayItem, 
  MicroPlan,
  MicroDayPlan,
  BuildingBlockType
} from '../../types';
import { BUILDING_BLOCK_CONFIGS } from '../../types';
import { cn } from '../../utils/cn';

interface CalendarTrainingOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPlans: TrainingPlan[];
  trainingGroups: TrainingGroup[];
  mesoPlans: MesoPlan[];
  microPlans?: MicroPlan[];
  currentPlannerDate?: string;
  currentPlannerGroupId?: string;
  onSelectDate?: (dateStr: string) => void;
  onSelectPlan?: (planId: string) => void;
  onNavigateToOrga?: (subTab?: 'periodization' | 'structure' | 'groups' | 'dataEntry' | 'stats' | 'absences' | 'playtimes' | 'macro' | 'meso' | 'micro') => void;
}

// Helper: Calculate ISO Week Number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Helper: Format Date to YYYY-MM-DD
function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const WEEKDAY_NAMES_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAY_NAMES_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

interface DayCalendarInfo {
  date: Date;
  dateStr: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPlannerDate: boolean;
  isoWeek: number;
  status: 'tw_training' | 'matchday' | 'team_only' | 'free';
  statusLabel: string;
  topic: string;
  subDetails?: string;
  intensity?: string;
  savedPlan?: TrainingPlan;
  mesoDay?: MesoDayItem;
  microDay?: MicroDayPlan;
  mesoPlanName?: string;
}

interface WeekCalendarInfo {
  isoWeek: number;
  year: number;
  days: DayCalendarInfo[];
  startDateStr: string;
  endDateStr: string;
}

export const CalendarTrainingOverviewModal: React.FC<CalendarTrainingOverviewModalProps> = ({
  isOpen,
  onClose,
  savedPlans = [],
  trainingGroups = [],
  mesoPlans = [],
  microPlans = [],
  currentPlannerDate,
  currentPlannerGroupId,
  onSelectDate,
  onSelectPlan,
  onNavigateToOrga
}) => {
  // Sorted groups (oldest first)
  const sortedGroups = useMemo(() => {
    return [...trainingGroups].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [trainingGroups]);

  // Selected Group Filter in Calendar
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    return currentPlannerGroupId || sortedGroups[0]?.id || 'ALL';
  });

  // Base Date for Navigation (defaults to today or planner date)
  const [baseDate, setBaseDate] = useState<Date>(() => {
    if (currentPlannerDate) {
      const d = new Date(currentPlannerDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // Expanded weeks state (Key: `${year}-W${isoWeek}`)
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const toggleWeekExpand = (weekKey: string) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekKey]: !prev[weekKey]
    }));
  };

  // Navigate months
  const handlePrevMonth = () => {
    setBaseDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setBaseDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleResetToToday = () => {
    setBaseDate(new Date());
  };

  // Two target months: Previous Month & Current/Base Month
  const targetMonths = useMemo(() => {
    const curYear = baseDate.getFullYear();
    const curMonth = baseDate.getMonth();

    const prevDate = new Date(curYear, curMonth - 1, 1);
    const activeDate = new Date(curYear, curMonth, 1);

    return [
      { year: prevDate.getFullYear(), month: prevDate.getMonth() },
      { year: activeDate.getFullYear(), month: activeDate.getMonth() }
    ];
  }, [baseDate]);

  // Filter plans and meso plans by selected group
  const activeSelectedGroup = useMemo(() => {
    if (selectedGroupId === 'ALL') return null;
    return sortedGroups.find(g => g.id === selectedGroupId) || null;
  }, [sortedGroups, selectedGroupId]);

  const filteredSavedPlans = useMemo(() => {
    if (selectedGroupId === 'ALL' || !activeSelectedGroup) return savedPlans;
    return savedPlans.filter(p => {
      const planGroupId = (p as any).groupId || (p as any).trainingGroupId;
      if (planGroupId) return planGroupId === selectedGroupId;
      if (p.targetGroup && activeSelectedGroup.name) {
        return p.targetGroup.trim().toLowerCase() === activeSelectedGroup.name.trim().toLowerCase();
      }
      return false;
    });
  }, [savedPlans, selectedGroupId, activeSelectedGroup]);

  const filteredMesoPlans = useMemo(() => {
    if (selectedGroupId === 'ALL' || !activeSelectedGroup) return mesoPlans;
    return mesoPlans.filter(m => m.groupId === selectedGroupId || !m.groupId);
  }, [mesoPlans, selectedGroupId, activeSelectedGroup]);

  const filteredMicroPlans = useMemo(() => {
    if (selectedGroupId === 'ALL' || !activeSelectedGroup) return microPlans;
    return microPlans.filter(m => m.groupId === selectedGroupId || !m.groupId);
  }, [microPlans, selectedGroupId, activeSelectedGroup]);

  // Quick lookup maps
  const plansByDate = useMemo(() => {
    const map = new Map<string, TrainingPlan>();
    filteredSavedPlans.forEach(p => {
      if (p.date) {
        map.set(p.date.substring(0, 10), p);
      }
    });
    return map;
  }, [filteredSavedPlans]);

  // Build Day Calendar Info for a specific date
  const buildDayInfo = (d: Date, isCurrentMonth: boolean): DayCalendarInfo => {
    const dateStr = formatDateYMD(d);
    const todayStr = formatDateYMD(new Date());
    const isToday = dateStr === todayStr;
    const isPlannerDate = Boolean(currentPlannerDate && dateStr === currentPlannerDate.substring(0, 10));
    const isoWeek = getISOWeek(d);

    // 1. Check saved plans
    const savedPlan = plansByDate.get(dateStr);

    // 2. Check Meso / Micro plans
    let mesoDay: MesoDayItem | undefined;
    let matchedMeso: MesoPlan | undefined;

    for (const meso of filteredMesoPlans) {
      for (const week of meso.weeks || []) {
        const found = (week.days || []).find(day => day.date === dateStr);
        if (found) {
          mesoDay = found;
          matchedMeso = meso;
          break;
        }
      }
      if (mesoDay) break;
    }

    let microDay: MicroDayPlan | undefined;
    for (const micro of filteredMicroPlans) {
      const found = (micro.days || []).find(day => day.date === dateStr);
      if (found) {
        microDay = found;
        break;
      }
    }

    // Determine status & topic
    let status: 'tw_training' | 'matchday' | 'team_only' | 'free' = 'free';
    let statusLabel = 'Frei';
    let topic = '';
    let subDetails = '';
    let intensity = '';

    const morningSlot: BuildingBlockType | undefined = (mesoDay?.slots?.morning as BuildingBlockType) || microDay?.morningBlock;
    const afternoonSlot: BuildingBlockType | undefined = (mesoDay?.slots?.afternoon as BuildingBlockType) || microDay?.afternoonBlock;

    const isMatchday = morningSlot === 'matchday' || afternoonSlot === 'matchday';
    const isTwSlot = morningSlot === 'tw_only' || morningSlot === 'tw_and_team' || afternoonSlot === 'tw_only' || afternoonSlot === 'tw_and_team';
    const isTeamSlot = morningSlot === 'team_only' || afternoonSlot === 'team_only';

    const microTopic = mesoDay?.morningTopic || mesoDay?.afternoonTopic || (microDay?.twSessionTopic as string) || '';
    const microIntensity = mesoDay?.morningTwIntensity || mesoDay?.afternoonTwIntensity || microDay?.twSessionIntensity || '';
    const microNotes = microDay?.notes || mesoDay?.athleticMicrodosing || mesoDay?.morningOpponentInfo || mesoDay?.afternoonOpponentInfo || '';

    if (savedPlan) {
      status = 'tw_training';
      statusLabel = 'TW-Training';
      topic = savedPlan.title || microTopic || 'Torwarttraining';
      intensity = microIntensity ? String(microIntensity) : '';
      subDetails = (savedPlan as any).customTitle || (savedPlan as any).importantNotes || microNotes;
    } else if (isMatchday) {
      status = 'matchday';
      statusLabel = 'Spieltag';
      topic = microTopic || 'Spieltag';
      intensity = microIntensity ? String(microIntensity) : '';
      subDetails = microNotes;
    } else if (isTwSlot || (microTopic && microTopic.trim() !== 'offen' && microTopic.trim() !== 'Frei')) {
      status = 'tw_training';
      statusLabel = 'TW-Training';
      topic = microTopic || 'TW-Training';
      intensity = microIntensity ? String(microIntensity) : '';
      subDetails = microNotes;
    } else if (isTeamSlot) {
      status = 'team_only';
      statusLabel = 'Nur Team';
      topic = mesoDay?.morningTeamFocus || mesoDay?.afternoonTeamFocus || 'Mannschaftstraining';
      subDetails = microNotes;
    } else {
      status = 'free';
      statusLabel = 'Frei';
      topic = 'Frei';
    }

    return {
      date: d,
      dateStr,
      dayOfMonth: d.getDate(),
      isCurrentMonth,
      isToday,
      isPlannerDate,
      isoWeek,
      status,
      statusLabel,
      topic,
      subDetails,
      intensity: intensity ? String(intensity) : undefined,
      savedPlan,
      mesoDay,
      microDay,
      mesoPlanName: matchedMeso?.name
    };
  };

  // Generate Month Weeks for a given year & month
  const getMonthWeeks = (year: number, month: number): WeekCalendarInfo[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday is 0, Sunday is 6
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    // Start calendar grid from Monday of the first week
    const startDate = new Date(year, month, 1 - startDayOfWeek);

    const weeks: WeekCalendarInfo[] = [];
    let currentWeekDays: DayCalendarInfo[] = [];
    let cur = new Date(startDate);

    // Generate full weeks until past the last day of the month
    while (cur <= lastDay || currentWeekDays.length > 0) {
      const isCurrentMonth = cur.getMonth() === month;
      const dayInfo = buildDayInfo(new Date(cur), isCurrentMonth);
      currentWeekDays.push(dayInfo);

      if (currentWeekDays.length === 7) {
        const weekIso = currentWeekDays[0].isoWeek;
        const weekYear = currentWeekDays[0].date.getFullYear();
        weeks.push({
          isoWeek: weekIso,
          year: weekYear,
          days: currentWeekDays,
          startDateStr: currentWeekDays[0].dateStr,
          endDateStr: currentWeekDays[6].dateStr
        });
        currentWeekDays = [];
      }

      cur.setDate(cur.getDate() + 1);
      if (cur.getMonth() !== month && cur.getDay() === 1 && weeks.length >= 4) {
        break;
      }
    }

    return weeks;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>Monatsübersicht (Kalender)</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  2-Monats-Ansicht
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Trainingsstatus, Themen und aufklappbare Mikroplanungs-Wochen
              </p>
            </div>
          </div>

          {/* Controls: Group Selector & Month Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Group Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">Alle Trainingsgruppen</option>
                {sortedGroups.map(g => (
                  <option key={g.id} value={g.id} className="bg-slate-900 text-slate-200">
                    {g.name} {g.ageCategory ? `(${g.ageCategory})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                title="Einen Monat zurück"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetToToday}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Heute
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                title="Einen Monat vor"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition cursor-pointer border border-slate-700/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-500 font-semibold">Legende:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="text-slate-300 font-medium">TW-Training</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span className="text-slate-300 font-medium">Spieltag</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50" />
              <span className="text-slate-300 font-medium">Nur Team</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span className="text-slate-400 font-medium">Frei</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full border border-amber-400 bg-amber-400/30" />
              Aktiver Planer-Tag
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full border border-emerald-400 bg-emerald-400/30" />
              Heute
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {targetMonths.map(({ year, month }, mIdx) => {
              const monthWeeks = getMonthWeeks(year, month);
              const monthTitle = `${MONTH_NAMES[month]} ${year}`;

              return (
                <div 
                  key={`${year}-${month}`}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-3"
                >
                  {/* Month Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>{monthTitle}</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">
                      {mIdx === 0 ? 'Vormonat' : 'Aktueller Monat'}
                    </span>
                  </div>

                  {/* Calendar Table Grid */}
                  <div className="space-y-2">
                    {/* Weekday Header (Mo - So) */}
                    <div className="grid grid-cols-8 gap-1.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1">
                      <div className="text-amber-400/80">KW</div>
                      {WEEKDAY_NAMES_SHORT.map(wd => (
                        <div key={wd}>{wd}</div>
                      ))}
                    </div>

                    {/* Weeks Rows */}
                    {monthWeeks.map((week) => {
                      const weekKey = `${week.year}-W${week.isoWeek}`;
                      const isExpanded = Boolean(expandedWeeks[weekKey]);

                      // Find matching micro plan or meso week for this calendar week
                      const matchingMesoWeek = filteredMesoPlans.flatMap(m => m.weeks || []).find(w => {
                        const dates = (w.days || []).map(d => d.date);
                        return dates.includes(week.startDateStr) || dates.includes(week.endDateStr);
                      });

                      const matchingMicroPlan = filteredMicroPlans.find(m => {
                        return m.startDate <= week.endDateStr && m.endDate >= week.startDateStr;
                      });

                      const hasMicroplanningData = Boolean(matchingMesoWeek || matchingMicroPlan);

                      return (
                        <div key={weekKey} className="space-y-1.5">
                          {/* Week Row */}
                          <div className="grid grid-cols-8 gap-1.5">
                            {/* KW Button (Accordion Toggle) */}
                            <button
                              type="button"
                              onClick={() => toggleWeekExpand(weekKey)}
                              className={cn(
                                "flex flex-col items-center justify-center rounded-xl p-1 text-[10px] font-black border transition-all cursor-pointer group shadow-sm",
                                isExpanded
                                  ? "bg-amber-500 text-slate-950 border-amber-400"
                                  : hasMicroplanningData
                                  ? "bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/30"
                                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-slate-800"
                              )}
                              title={`Mikroplanungs-Details für KW ${week.isoWeek} auf-/zuklappen`}
                            >
                              <span>KW {week.isoWeek}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 mt-0.5" />
                              ) : (
                                <ChevronDown className="w-3 h-3 mt-0.5 opacity-70 group-hover:opacity-100" />
                              )}
                            </button>

                            {/* 7 Days of the Week */}
                            {week.days.map((day) => {
                              const isFree = day.status === 'free';
                              const isTw = day.status === 'tw_training';
                              const isMatch = day.status === 'matchday';
                              const isTeam = day.status === 'team_only';

                              return (
                                <div
                                  key={day.dateStr}
                                  onClick={() => {
                                    if (onSelectDate) {
                                      onSelectDate(day.dateStr);
                                      onClose();
                                    }
                                  }}
                                  className={cn(
                                    "flex flex-col justify-between p-1.5 rounded-xl border text-left min-h-[64px] transition-all cursor-pointer group relative",
                                    !day.isCurrentMonth && "opacity-35 hover:opacity-80 bg-slate-950/40 border-slate-900",
                                    day.isCurrentMonth && isTw && "bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/50",
                                    day.isCurrentMonth && isMatch && "bg-amber-950/30 border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/50",
                                    day.isCurrentMonth && isTeam && "bg-sky-950/30 border-sky-500/40 hover:border-sky-400 hover:bg-sky-950/50",
                                    day.isCurrentMonth && isFree && "bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900",
                                    day.isToday && "ring-1 ring-emerald-400 shadow-sm",
                                    day.isPlannerDate && "ring-2 ring-amber-400 shadow-md"
                                  )}
                                  title={`Datum: ${day.dateStr} | Status: ${day.statusLabel} | Thema: ${day.topic || 'Keines'} (Klicken, um diesen Tag im Planer zu öffnen)`}
                                >
                                  {/* Day Number & Status Dot */}
                                  <div className="flex items-center justify-between gap-0.5">
                                    <span className={cn(
                                      "text-[10px] font-black",
                                      day.isToday ? "text-emerald-400 underline font-extrabold" : "text-slate-300"
                                    )}>
                                      {day.dayOfMonth}
                                    </span>
                                    
                                    {/* Status Badge Tag */}
                                    <span className={cn(
                                      "text-[8px] font-black px-1 py-0.2 rounded leading-tight",
                                      isTw && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                                      isMatch && "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                                      isTeam && "bg-sky-500/20 text-sky-300 border border-sky-500/30",
                                      isFree && "bg-slate-800 text-slate-400"
                                    )}>
                                      {isTw ? 'TW' : isMatch ? 'Spiel' : isTeam ? 'Team' : 'Frei'}
                                    </span>
                                  </div>

                                  {/* Training Topic */}
                                  <div className="mt-1">
                                    <p className={cn(
                                      "text-[9px] font-bold line-clamp-2 leading-tight",
                                      isTw ? "text-emerald-200" : isMatch ? "text-amber-200" : isTeam ? "text-sky-200" : "text-slate-500"
                                    )}>
                                      {isFree ? '-' : (day.topic || day.statusLabel)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* EXPANDED WEEK DRAWER (Mikroplanungs-Details) */}
                          {isExpanded && (
                            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xl animate-fadeIn">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500 text-slate-950">
                                    KW {week.isoWeek}
                                  </span>
                                  <span className="text-xs font-extrabold text-slate-200">
                                    Mikroplanung ({week.startDateStr} – {week.endDateStr})
                                  </span>
                                </div>

                                {onNavigateToOrga && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onNavigateToOrga('micro');
                                      onClose();
                                    }}
                                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer underline"
                                  >
                                    <span>In Orga &gt; Mikroplanung bearbeiten</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {/* 7 Days Microplanning Breakdown */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                {week.days.map((d, dIdx) => {
                                  const mesoDay = d.mesoDay;
                                  const microDay = d.microDay;

                                  const morningSlot = (mesoDay?.slots?.morning as BuildingBlockType) || microDay?.morningBlock || 'free';
                                  const afternoonSlot = (mesoDay?.slots?.afternoon as BuildingBlockType) || microDay?.afternoonBlock || 'free';
                                  const morningCfg = BUILDING_BLOCK_CONFIGS[morningSlot] || BUILDING_BLOCK_CONFIGS.free;
                                  const afternoonCfg = BUILDING_BLOCK_CONFIGS[afternoonSlot] || BUILDING_BLOCK_CONFIGS.free;

                                  const twIntensity = mesoDay?.morningTwIntensity || mesoDay?.afternoonTwIntensity || microDay?.twSessionIntensity;
                                  const twTopic = mesoDay?.morningTopic || mesoDay?.afternoonTopic || (microDay?.twSessionTopic as string);
                                  const microdosing = mesoDay?.athleticMicrodosing || '';
                                  const teamFocus = mesoDay?.morningTeamFocus || mesoDay?.afternoonTeamFocus || '';
                                  const notes = microDay?.notes || mesoDay?.morningOpponentInfo || mesoDay?.afternoonOpponentInfo || '';

                                  return (
                                    <div 
                                      key={d.dateStr}
                                      className={cn(
                                        "bg-slate-950/80 border rounded-xl p-2.5 space-y-2 text-xs flex flex-col justify-between",
                                        d.status === 'tw_training' ? "border-emerald-500/40" : "border-slate-800"
                                      )}
                                    >
                                      {/* Header: Day & Date */}
                                      <div className="border-b border-slate-800/80 pb-1 flex items-center justify-between">
                                        <span className="font-extrabold text-slate-200">
                                          {WEEKDAY_NAMES_FULL[dIdx] || WEEKDAY_NAMES_SHORT[dIdx]}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {d.dayOfMonth}.{d.date.getMonth() + 1}.
                                        </span>
                                      </div>

                                      {/* Slots Info */}
                                      <div className="space-y-1 text-[10px]">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-slate-400">VM:</span>
                                          <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-bold", morningCfg.bgClass, morningCfg.textClass)}>
                                            {morningCfg.shortLabel}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-slate-400">NM:</span>
                                          <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-bold", afternoonCfg.bgClass, afternoonCfg.textClass)}>
                                            {afternoonCfg.shortLabel}
                                          </span>
                                        </div>
                                      </div>

                                      {/* TW Topic & Intensity */}
                                      <div className="space-y-1 text-[10px] pt-1 border-t border-slate-800/60">
                                        {twTopic && (
                                          <div>
                                            <span className="text-slate-400 font-bold block">TW-Thema:</span>
                                            <span className="text-emerald-300 font-extrabold line-clamp-2">
                                              {twTopic}
                                            </span>
                                          </div>
                                        )}

                                        {twIntensity && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-slate-400">Intensität:</span>
                                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black text-[9px]">
                                              {twIntensity}
                                            </span>
                                          </div>
                                        )}

                                        {microdosing && (
                                          <div>
                                            <span className="text-slate-400 font-bold block">Athletik/Reiz:</span>
                                            <span className="text-blue-300 text-[9px]">
                                              {microdosing}
                                            </span>
                                          </div>
                                        )}

                                        {teamFocus && (
                                          <div>
                                            <span className="text-slate-400 font-bold block">Team-Fokus:</span>
                                            <span className="text-sky-300 text-[9px]">
                                              {teamFocus}
                                            </span>
                                          </div>
                                        )}

                                        {notes && (
                                          <div>
                                            <span className="text-slate-400 font-bold block">Notizen:</span>
                                            <span className="text-slate-300 text-[9px] italic line-clamp-2">
                                              {notes}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Planer Button Action */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (d.savedPlan && onSelectPlan) {
                                            onSelectPlan(d.savedPlan.id!);
                                            onClose();
                                          } else if (onSelectDate) {
                                            onSelectDate(d.dateStr);
                                            onClose();
                                          }
                                        }}
                                        className="w-full mt-1 py-1 rounded-lg text-[9px] font-black bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Calendar className="w-2.5 h-2.5" />
                                        <span>{d.savedPlan ? 'Plan öffnen' : 'Tag planen'}</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Tipp: Klicke auf einen beliebigen Tag oder auf <span className="text-amber-400 font-bold">„KW xx“</span>, um Details der Mikroplanung einzusehen oder einen Plan zu erstellen.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
