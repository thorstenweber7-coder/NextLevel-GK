import React, { useState, useMemo } from 'react';
import type { PlayerAbsence, TrainingPlan, AbsenceReason, Player, Exercise } from '../../types';
import { PERIODIZATION_TOPICS, SKILL_DEFINITIONS } from '../../types';
import {
  Activity,
  HeartPulse,
  Calendar,
  Clock,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
  Award,
  Sparkles,
  Target,
  CheckCircle2,
  ArrowUpDown,
  Info
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { 
  REASON_COLORS, 
  getAbsenceReasonColor, 
  TECHNIQUE_GROUP_CONFIG, 
  getThemeColor 
} from './statsConfig';

interface AttendanceStatsSectionProps {
  player: Player;
  playerGroupPlans: TrainingPlan[];
  filteredAbsences: PlayerAbsence[];
  attendedPlansCount: number;
  exerciseMap?: Map<string, Exercise>;
  exercises?: Exercise[];
}

function getAbsenceDurationDays(abs: PlayerAbsence): number {
  if (!abs.startDate) return 1;
  if (!abs.endDate || abs.endDate === abs.startDate) return 1;
  const start = new Date(abs.startDate).getTime();
  const end = new Date(abs.endDate).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 1;
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
}

export interface PlottedInjury {
  id: string;
  bodyPart: string;
  count: number;
  totalDays: number;
  avgDays: number;
  maxDays: number;
  minDays: number;
  lastDate?: string;
  firstDate?: string;
  notes: string[];
  rawEntries: PlayerAbsence[];
}

export const AttendanceStatsSection: React.FC<AttendanceStatsSectionProps> = ({
  player: _player,
  playerGroupPlans,
  filteredAbsences,
  attendedPlansCount,
  exerciseMap,
  exercises = []
}) => {
  const [metricMode, setMetricMode] = useState<'count' | 'days'>('days');
  const [hoveredReason, setHoveredReason] = useState<string | null>(null);
  const [isDiagramExpanded, setIsDiagramExpanded] = useState<boolean>(false);
  const [isAbsencesExpanded, setIsAbsencesExpanded] = useState<boolean>(false);
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);

  // Karte: Teilnahme an Inhalten (Standardmäßig zugeklappt)
  const [isContentAttendanceExpanded, setIsContentAttendanceExpanded] = useState<boolean>(false);

  // Steuerung Diagramm 1: Taktische Themen
  const [themeFilterMode, setThemeFilterMode] = useState<'trainedOnly' | 'all'>('trainedOnly');
  const [themeSortOrder, setThemeSortOrder] = useState<'frequency' | 'catalog'>('frequency');

  // Steuerung Diagramm 2: Torwarttechniken (Analytisch)
  const [selectedTechGroup, setSelectedTechGroup] = useState<string>('all');
  const [techFilterMode, setTechFilterMode] = useState<'trainedOnly' | 'all'>('trainedOnly');
  const [techSortOrder, setTechSortOrder] = useState<'frequency' | 'catalog'>('frequency');

  const totalPlans = playerGroupPlans.length;
  const attendancePercentage = totalPlans > 0 ? (attendedPlansCount / totalPlans) * 100 : 100;

  const normalizeDateStr = (dStr?: string) => {
    if (!dStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return '';
    }
  };

  const absenceDatesSet = useMemo(() => {
    const set = new Set<string>();
    filteredAbsences.forEach(a => {
      if (!a.startDate) return;
      const startNorm = normalizeDateStr(a.startDate);
      const endNorm = normalizeDateStr(a.endDate || a.startDate);
      if (!startNorm) return;
      const cur = new Date(startNorm);
      const end = new Date(endNorm || startNorm);
      if (isNaN(cur.getTime()) || isNaN(end.getTime())) return;
      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        set.add(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return set;
  }, [filteredAbsences]);

  const isPlayerAttendedPlan = (plan: TrainingPlan) => {
    const pDateStr = normalizeDateStr(plan.date);
    if (!pDateStr) return true;
    return !absenceDatesSet.has(pDateStr);
  };

  const effectiveExerciseMap = useMemo(() => {
    if (exerciseMap) return exerciseMap;
    return new Map((exercises || []).map(e => [e.id, e]));
  }, [exerciseMap, exercises]);

  // DIAGRAMM 1: Aggregation Taktische Themen (Themenschwerpunkte)
  const themeAttendanceStats = useMemo(() => {
    const definedTopics = PERIODIZATION_TOPICS;
    const themeMap: Record<string, {
      id: string;
      label: string;
      color: string;
      totalPossible: number;
      attendedCount: number;
      missedCount: number;
      catalogIndex: number;
    }> = {};

    definedTopics.forEach((t, idx) => {
      themeMap[t.id] = {
        id: t.id,
        label: t.label,
        color: t.color || getThemeColor(t.label, idx).hex,
        totalPossible: 0,
        attendedCount: 0,
        missedCount: 0,
        catalogIndex: idx
      };
    });

    let nextCustomIdx = definedTopics.length;

    playerGroupPlans.forEach(plan => {
      const rawTitle = (plan.title || plan.planTitle || '').trim();
      if (!rawTitle || rawTitle.toLowerCase() === 'offen') return;

      const matchedDef = definedTopics.find(
        t => t.id.toLowerCase() === rawTitle.toLowerCase() || t.label.toLowerCase() === rawTitle.toLowerCase()
      );

      const themeKey = matchedDef ? matchedDef.id : rawTitle;

      if (!themeMap[themeKey]) {
        themeMap[themeKey] = {
          id: themeKey,
          label: rawTitle,
          color: getThemeColor(rawTitle, nextCustomIdx).hex,
          totalPossible: 0,
          attendedCount: 0,
          missedCount: 0,
          catalogIndex: nextCustomIdx++
        };
      }

      themeMap[themeKey].totalPossible += 1;
      if (isPlayerAttendedPlan(plan)) {
        themeMap[themeKey].attendedCount += 1;
      } else {
        themeMap[themeKey].missedCount += 1;
      }
    });

    const allItems = Object.values(themeMap).map(item => {
      const percentage = item.totalPossible > 0 ? (item.attendedCount / item.totalPossible) * 100 : 0;
      return {
        ...item,
        percentage
      };
    });

    const trainedTopicsCount = allItems.filter(i => i.totalPossible > 0).length;
    const attendedTopicsCount = allItems.filter(i => i.attendedCount > 0).length;
    const maxPossible = Math.max(...allItems.map(i => i.totalPossible), 1);
    const maxAttended = Math.max(...allItems.map(i => i.attendedCount), 1);
    const topTheme = [...allItems].sort((a, b) => b.attendedCount - a.attendedCount).find(i => i.attendedCount > 0) || null;

    return {
      items: allItems,
      trainedTopicsCount,
      attendedTopicsCount,
      maxPossible,
      maxAttended,
      topTheme
    };
  }, [playerGroupPlans, absenceDatesSet]);

  // DIAGRAMM 2: Aggregation Torwarttechniken im analytischen Teil
  const techniqueAttendanceStats = useMemo(() => {
    const techDefs = SKILL_DEFINITIONS.Technik || [];
    const techMap: Record<string, {
      id: string;
      name: string;
      group: string;
      groupConfig: any;
      totalPossible: number;
      attendedCount: number;
      missedCount: number;
      catalogIndex: number;
    }> = {};

    techDefs.forEach((def, idx) => {
      const gConfig = TECHNIQUE_GROUP_CONFIG[def.group || ''] || TECHNIQUE_GROUP_CONFIG['Grundstellungen'];
      techMap[def.name] = {
        id: def.id,
        name: def.name,
        group: def.group || 'Sonstige',
        groupConfig: gConfig,
        totalPossible: 0,
        attendedCount: 0,
        missedCount: 0,
        catalogIndex: idx
      };
    });

    playerGroupPlans.forEach(plan => {
      const planPhases = plan.phaseExercises || plan.phases || {};
      const customExercises = plan.customPlanExercises || {};
      const planTechsInAnalytic = new Set<string>();

      Object.entries(planPhases).forEach(([phaseId, exIds]) => {
        const isAnalyticPhase = phaseId.toLowerCase().includes('analytisch') || phaseId.toLowerCase().includes('technik');
        (exIds || []).forEach(exId => {
          const exercise = customExercises[exId] || effectiveExerciseMap.get(exId);
          if (!exercise) return;

          const isAnalyticCategory = exercise.category === 'Analytisch';
          if (isAnalyticPhase || isAnalyticCategory) {
            const focus = (exercise.technik || '').trim();
            if (focus && techMap[focus]) {
              planTechsInAnalytic.add(focus);
            } else if (focus) {
              const matched = techDefs.find(t => t.name.toLowerCase() === focus.toLowerCase());
              if (matched && techMap[matched.name]) {
                planTechsInAnalytic.add(matched.name);
              }
            }
          }
        });
      });

      const isAttended = isPlayerAttendedPlan(plan);

      planTechsInAnalytic.forEach(techName => {
        if (techMap[techName]) {
          techMap[techName].totalPossible += 1;
          if (isAttended) {
            techMap[techName].attendedCount += 1;
          } else {
            techMap[techName].missedCount += 1;
          }
        }
      });
    });

    const allItems = Object.values(techMap).map(item => {
      const percentage = item.totalPossible > 0 ? (item.attendedCount / item.totalPossible) * 100 : 0;
      return {
        ...item,
        percentage
      };
    });

    const trainedCount = allItems.filter(i => i.totalPossible > 0).length;
    const attendedCount = allItems.filter(i => i.attendedCount > 0).length;
    const maxPossible = Math.max(...allItems.map(i => i.totalPossible), 1);
    const maxAttended = Math.max(...allItems.map(i => i.attendedCount), 1);
    const topTechnique = [...allItems].sort((a, b) => b.attendedCount - a.attendedCount).find(i => i.attendedCount > 0) || null;

    return {
      items: allItems,
      trainedCount,
      attendedCount,
      maxPossible,
      maxAttended,
      topTechnique
    };
  }, [playerGroupPlans, effectiveExerciseMap, absenceDatesSet]);

  const displayedThemes = useMemo(() => {
    let list = [...themeAttendanceStats.items];
    if (themeFilterMode === 'trainedOnly') {
      list = list.filter(item => item.totalPossible > 0);
    }
    if (themeSortOrder === 'frequency') {
      list.sort((a, b) => b.attendedCount - a.attendedCount || b.totalPossible - a.totalPossible);
    } else {
      list.sort((a, b) => a.catalogIndex - b.catalogIndex);
    }
    return list;
  }, [themeAttendanceStats, themeFilterMode, themeSortOrder]);

  const displayedTechniques = useMemo(() => {
    let list = [...techniqueAttendanceStats.items];
    if (selectedTechGroup !== 'all') {
      list = list.filter(item => item.group === selectedTechGroup);
    }
    if (techFilterMode === 'trainedOnly') {
      list = list.filter(item => item.totalPossible > 0);
    }
    if (techSortOrder === 'frequency') {
      list.sort((a, b) => b.attendedCount - a.attendedCount || b.totalPossible - a.totalPossible);
    } else {
      list.sort((a, b) => a.catalogIndex - b.catalogIndex);
    }
    return list;
  }, [techniqueAttendanceStats, selectedTechGroup, techFilterMode, techSortOrder]);

  const totalAbsenceDays = useMemo(() => {
    return filteredAbsences.reduce((sum, a) => sum + getAbsenceDurationDays(a), 0);
  }, [filteredAbsences]);

  // Actual documented medical injuries only (reason === 'Verletzung')
  const actualInjuries = useMemo(() => {
    return filteredAbsences.filter(a => a.reason === 'Verletzung');
  }, [filteredAbsences]);

  const totalInjuryDays = useMemo(() => {
    return actualInjuries.reduce((sum, a) => sum + getAbsenceDurationDays(a), 0);
  }, [actualInjuries]);

  // Breakdown by standard AbsenceReason for Kreis- & Balkendiagramm
  const reasonStats = useMemo(() => {
    const allReasons: AbsenceReason[] = [
      'Krankheit',
      'Verletzung',
      'Schule',
      'Belastungssteuerung',
      'Privat',
      'Sonstiges'
    ];

    const map: Record<AbsenceReason, { count: number; days: number }> = {
      Krankheit: { count: 0, days: 0 },
      Verletzung: { count: 0, days: 0 },
      Schule: { count: 0, days: 0 },
      Belastungssteuerung: { count: 0, days: 0 },
      Privat: { count: 0, days: 0 },
      Sonstiges: { count: 0, days: 0 }
    };

    filteredAbsences.forEach(abs => {
      const r = abs.reason || 'Sonstiges';
      const days = getAbsenceDurationDays(abs);
      if (map[r]) {
        map[r].count += 1;
        map[r].days += days;
      } else {
        map['Sonstiges'].count += 1;
        map['Sonstiges'].days += days;
      }
    });

    return allReasons.map(r => ({
      reason: r,
      count: map[r].count,
      days: map[r].days,
      config: REASON_COLORS[r] || { bg: 'bg-slate-900', text: 'text-slate-400', hex: '#64748b' }
    }));
  }, [filteredAbsences]);

  // Plotted Injuries calculation (Grouped by body part or distinct injury pattern)
  const plottedInjuries = useMemo<PlottedInjury[]>(() => {
    const groupMap: Record<string, {
      bodyPart: string;
      count: number;
      totalDays: number;
      maxDays: number;
      minDays: number;
      lastDate?: string;
      firstDate?: string;
      notes: string[];
      rawEntries: PlayerAbsence[];
    }> = {};

    actualInjuries.forEach(abs => {
      const bPart = abs.injuredBodyPart?.trim() || 'Verletzung (Allgemein)';
      const key = bPart.toLowerCase();
      const days = getAbsenceDurationDays(abs);

      if (!groupMap[key]) {
        groupMap[key] = {
          bodyPart: bPart,
          count: 0,
          totalDays: 0,
          maxDays: 0,
          minDays: 999999,
          lastDate: abs.startDate,
          firstDate: abs.startDate,
          notes: [],
          rawEntries: []
        };
      }

      groupMap[key].count += 1;
      groupMap[key].totalDays += days;
      groupMap[key].maxDays = Math.max(groupMap[key].maxDays, days);
      groupMap[key].minDays = Math.min(groupMap[key].minDays, days);
      groupMap[key].rawEntries.push(abs);
      if (abs.note && abs.note.trim()) {
        groupMap[key].notes.push(abs.note.trim());
      }
      if (abs.startDate) {
        if (!groupMap[key].lastDate || abs.startDate > groupMap[key].lastDate!) {
          groupMap[key].lastDate = abs.startDate;
        }
        if (!groupMap[key].firstDate || abs.startDate < groupMap[key].firstDate!) {
          groupMap[key].firstDate = abs.startDate;
        }
      }
    });

    return Object.entries(groupMap).map(([id, grp]) => {
      const avgDays = grp.count > 0 ? grp.totalDays / grp.count : 0;
      return {
        id,
        bodyPart: grp.bodyPart,
        count: grp.count,
        totalDays: grp.totalDays,
        avgDays,
        maxDays: grp.maxDays,
        minDays: grp.minDays === 999999 ? 1 : grp.minDays,
        lastDate: grp.lastDate,
        firstDate: grp.firstDate,
        notes: grp.notes,
        rawEntries: grp.rawEntries
      };
    }).sort((a, b) => b.totalDays - a.totalDays || b.count - a.count);
  }, [actualInjuries]);

  // Selected injury item for deep inspection
  const selectedInjury = useMemo(() => {
    if (!selectedInjuryId) return null;
    return plottedInjuries.find(i => i.id === selectedInjuryId) || null;
  }, [plottedInjuries, selectedInjuryId]);

  // Donut slices calculation for attendance
  const donutSlices = useMemo(() => {
    const activeReasons = reasonStats.filter(r => r.count > 0);
    const totalSlicesCount = attendedPlansCount + filteredAbsences.length;

    if (totalSlicesCount === 0) {
      return [{
        key: 'attended',
        label: 'Keine Einheiten',
        percentage: 100,
        color: '#334155',
        value: 0,
        pathData: ''
      }];
    }

    const segments: Array<{
      key: string;
      label: string;
      value: number;
      percentage: number;
      color: string;
    }> = [];

    // Attended portion
    if (attendedPlansCount > 0) {
      segments.push({
        key: 'attended',
        label: 'Anwesend',
        value: attendedPlansCount,
        percentage: (attendedPlansCount / totalSlicesCount) * 100,
        color: '#10b981'
      });
    }

    // Reason portions
    activeReasons.forEach(r => {
      segments.push({
        key: r.reason,
        label: r.reason,
        value: r.count,
        percentage: (r.count / totalSlicesCount) * 100,
        color: r.config.hex
      });
    });

    const center = 130;
    const radius = 100;
    const innerRadius = 66;
    let currentAngle = -Math.PI / 2;

    return segments.map(seg => {
      const sliceAngle = (seg.percentage / 100) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      if (seg.percentage >= 99.99) {
        const pathData = `M ${center - radius} ${center} A ${radius} ${radius} 0 1 0 ${center + radius} ${center} A ${radius} ${radius} 0 1 0 ${center - radius} ${center} M ${center - innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center + innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center - innerRadius} ${center} Z`;
        return { ...seg, pathData };
      }

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const ix1 = center + innerRadius * Math.cos(endAngle);
      const iy1 = center + innerRadius * Math.sin(endAngle);
      const ix2 = center + innerRadius * Math.cos(startAngle);
      const iy2 = center + innerRadius * Math.sin(startAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

      return { ...seg, pathData };
    });
  }, [attendedPlansCount, filteredAbsences, reasonStats]);

  return (
    <div className="space-y-6 pt-2">
      {/* 4 TOP KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-[10px]">
            Geplante Einheiten
          </span>
          <div className="text-2xl font-black text-white font-mono">{totalPlans}</div>
          <span className="text-[11px] text-slate-500">Gruppe gesamt</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-[10px]">
            Teilgenommen
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{attendedPlansCount}</div>
          <span className="text-[11px] text-slate-500">
            {totalPlans > 0 ? `${attendancePercentage.toFixed(0)} % Quote` : '100 %'}
          </span>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-[10px]">
            Ausfälle (Gesamt)
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {totalAbsenceDays} <span className="text-xs font-bold text-slate-400">Tage ({filteredAbsences.length}x)</span>
          </div>
          <span className="text-[11px] text-slate-500">Alle Fehltage</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-[10px]">
            Tatsächliche Verletzungen
          </span>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {totalInjuryDays} <span className="text-xs font-bold text-slate-400">Tage ({actualInjuries.length}x)</span>
          </div>
          <span className="text-[11px] text-slate-500">Medizinische Fehltage</span>
        </div>
      </div>

      {/* SECTION 1: KREISDIAGRAMM (ANWESENHEIT) & BALKENDIAGRAMM (FEHLZEITENGRÜNDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* KREISDIAGRAMM (DONUT CHART) */}
        <div className="lg:col-span-5 bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-inner flex flex-col justify-between">
          <div className="border-b border-slate-800/80 pb-3 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Kreisdiagramm
              </span>
              <h5 className="text-sm sm:text-base font-extrabold text-white">
                Trainingsanwesenheit & Quote
              </h5>
            </div>
            <p className="text-xs text-slate-400">
              Verhältnis von absolvierten Einheiten zu dokumentierten Ausfallursachen.
            </p>
          </div>

          <div className="py-4 flex flex-col items-center justify-center relative">
            <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center">
              <svg viewBox="0 0 260 260" className="w-full h-full">
                {donutSlices.map(slice => {
                  const isHovered = hoveredReason === slice.key;
                  return (
                    <path
                      key={slice.key}
                      d={slice.pathData}
                      fill={slice.color}
                      className={cn(
                        "transition-all duration-200 cursor-pointer",
                        isHovered ? "opacity-100 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] scale-[1.02]" : "opacity-90 hover:opacity-100"
                      )}
                      style={{ transformOrigin: '130px 130px' }}
                      onMouseEnter={() => setHoveredReason(slice.key)}
                      onMouseLeave={() => setHoveredReason(null)}
                    />
                  );
                })}
              </svg>

              {/* CENTER LABEL */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {hoveredReason ? (
                  <>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
                      {hoveredReason}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {(donutSlices.find(s => s.key === hoveredReason)?.percentage || 0).toFixed(0)} %
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      {donutSlices.find(s => s.key === hoveredReason)?.value} {hoveredReason === 'attended' ? 'Einheiten' : 'Vorfälle'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Quote
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {attendancePercentage.toFixed(0)} %
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {attendedPlansCount} / {totalPlans} Einheiten
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* LEGENDE */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
              <div
                onMouseEnter={() => setHoveredReason('attended')}
                onMouseLeave={() => setHoveredReason(null)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300 font-bold">Anwesend:</span>
                <span className="text-emerald-400 font-mono font-black">{attendedPlansCount}</span>
              </div>

              {reasonStats.filter(r => r.count > 0).map(r => (
                <div
                  key={r.reason}
                  onMouseEnter={() => setHoveredReason(r.reason)}
                  onMouseLeave={() => setHoveredReason(null)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.config.hex }} />
                  <span className="text-slate-300 font-bold">{r.reason}:</span>
                  <span className="text-white font-mono font-black">{r.count}x</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BALKENDIAGRAMM (FEHLZEITENGRÜNDE) */}
        <div className="lg:col-span-7 bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-inner flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Balkendiagramm
                </span>
                <h5 className="text-sm sm:text-base font-extrabold text-white">
                  Fehlzeiten nach Gründen (X-Achse)
                </h5>
              </div>
              <p className="text-xs text-slate-400">
                Verteilung aller erfassten Abwesenheiten auf die 6 Standard-Ausfallursachen.
              </p>
            </div>

            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setMetricMode('days')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px]",
                  metricMode === 'days' ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Ausfalltage
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('count')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px]",
                  metricMode === 'count' ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Häufigkeit (x)
              </button>
            </div>
          </div>

          {/* SVG SÄULENDIAGRAMM */}
          {(() => {
            const chartHeight = 220;
            const topPadding = 25;
            const bottomPadding = 45;
            const leftPadding = 35;
            const rightPadding = 20;
            const plotHeight = chartHeight - topPadding - bottomPadding;
            const totalWidth = 520;

            const values = reasonStats.map(r => (metricMode === 'days' ? r.days : r.count));
            const maxValue = Math.max(...values, 4);

            const barWidth = 42;
            const totalBarsWidth = reasonStats.length * barWidth;
            const totalGaps = reasonStats.length + 1;
            const gap = (totalWidth - leftPadding - rightPadding - totalBarsWidth) / totalGaps;

            const yLevels = [
              { label: `${maxValue}`, y: topPadding },
              { label: `${Math.round(maxValue * 0.5)}`, y: topPadding + plotHeight * 0.5 },
              { label: '0', y: topPadding + plotHeight }
            ];

            return (
              <div className="overflow-x-auto custom-scrollbar">
                <div style={{ minWidth: totalWidth }} className="relative">
                  <svg viewBox={`0 0 ${totalWidth} ${chartHeight}`} className="w-full" style={{ height: `${chartHeight}px` }}>
                    {/* Gridlines */}
                    {yLevels.map((lvl, idx) => (
                      <g key={idx}>
                        <line
                          x1={leftPadding}
                          y1={lvl.y}
                          x2={totalWidth - rightPadding}
                          y2={lvl.y}
                          stroke="#334155"
                          strokeWidth="1"
                          strokeDasharray={idx === yLevels.length - 1 ? undefined : '3,3'}
                          opacity={idx === yLevels.length - 1 ? 0.8 : 0.35}
                        />
                        <text
                          x={leftPadding - 6}
                          y={lvl.y + 4}
                          fill="#64748b"
                          fontSize="9.5"
                          fontWeight="bold"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {lvl.label}
                        </text>
                      </g>
                    ))}

                    {/* Bars */}
                    {reasonStats.map((item, idx) => {
                      const val = metricMode === 'days' ? item.days : item.count;
                      const x = leftPadding + gap + idx * (barWidth + gap);
                      const barH = maxValue > 0 ? (val / maxValue) * plotHeight : 0;
                      const y = topPadding + plotHeight - barH;
                      const isHovered = hoveredReason === item.reason;

                      return (
                        <g
                          key={item.reason}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredReason(item.reason)}
                          onMouseLeave={() => setHoveredReason(null)}
                        >
                          {isHovered && (
                            <rect
                              x={x - 4}
                              y={topPadding - 6}
                              width={barWidth + 8}
                              height={plotHeight + 12}
                              fill="white"
                              opacity="0.05"
                              rx="6"
                            />
                          )}

                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={Math.max(barH, val > 0 ? 4 : 2)}
                            fill={val > 0 ? item.config.hex : '#334155'}
                            opacity={val > 0 ? (isHovered ? 1 : 0.85) : 0.3}
                            rx="5"
                          />

                          {/* Value above bar */}
                          {val > 0 && (
                            <text
                              x={x + barWidth / 2}
                              y={y - 5}
                              fill={item.config.hex}
                              fontSize="11"
                              fontWeight="900"
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
                              {val} {metricMode === 'days' ? 'd' : 'x'}
                            </text>
                          )}

                          {/* X-Axis Label */}
                          <text
                            x={x + barWidth / 2}
                            y={topPadding + plotHeight + 18}
                            fill={isHovered ? '#ffffff' : '#94a3b8'}
                            fontSize="10"
                            fontWeight={isHovered ? 'bold' : '600'}
                            textAnchor="middle"
                          >
                            {item.reason === 'Belastungssteuerung' ? 'Belastung' : item.reason}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* SECTION 2: AUSFALL-HÄUFIGKEITSDIAGRAMM (AUFKLAPPBAR / STANDARDMÄSSIG ZUGEKLAPPT) */}
      <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-xl overflow-hidden transition-all">
        {/* KLAPPBARER HEADER */}
        <div
          onClick={() => setIsDiagramExpanded(prev => !prev)}
          className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/60 transition select-none"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Verletzungsdiagnostik
                </span>
                <h5 className="text-base sm:text-lg font-black text-white">
                  Ausfall-Häufigkeitsdiagramm
                </h5>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Einordnung der tatsächlichen Verletzungen nach Ausfalldauer (X-Achse in Tagen) und Häufigkeit (Y-Achse)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400">
              {actualInjuries.length} {actualInjuries.length === 1 ? 'Verletzung' : 'Verletzungen'} ({totalInjuryDays} Fehltage)
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
              {isDiagramExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* AUFGEKLAPPTER BEREICH */}
        {isDiagramExpanded && (
          <div className="p-5 sm:p-7 pt-0 border-t border-slate-800/80 space-y-6 animate-fadeIn">
            {plottedInjuries.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2 mt-4">
                <ShieldCheck className="w-9 h-9 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-emerald-300">Keine Verletzungen dokumentiert</div>
                <div className="text-xs text-slate-400 max-w-md mx-auto">
                  Für diesen Torhüter wurden im System aktuell keine Ausfälle mit der Ursache „Verletzung“ erfasst.
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-4">
                {/* INTERAKTIVES 2D-KOORDINATENDIAGRAMM (SVG PLOT) */}
                <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-4 sm:p-6 space-y-4">
                  {/* ACHSEN-LEGENDE */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-bold px-2 gap-2">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <Activity className="w-4 h-4" />
                      <span>↑ Y-Achse: Häufigkeit (Anzahl Vorfälle)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <span>X-Achse: Ausfalldauer (Tage) →</span>
                      <Clock className="w-4 h-4" />
                    </span>
                  </div>

                  {(() => {
                    const chartWidth = 580;
                    const chartHeight = 300;
                    const topPadding = 30;
                    const bottomPadding = 45;
                    const leftPadding = 45;
                    const rightPadding = 35;
                    const plotWidth = chartWidth - leftPadding - rightPadding;
                    const plotHeight = chartHeight - topPadding - bottomPadding;

                    const maxDaysInData = Math.max(...plottedInjuries.map(i => i.totalDays), 10);
                    const maxX = Math.max(14, Math.ceil((maxDaysInData + 3) / 7) * 7);

                    const maxCountInData = Math.max(...plottedInjuries.map(i => i.count), 2);
                    const maxY = Math.max(3, maxCountInData + 1);

                    // X-Ticks
                    const xTickCount = 5;
                    const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
                      const val = Math.round((i / xTickCount) * maxX);
                      const xPos = leftPadding + (val / maxX) * plotWidth;
                      return { val, xPos };
                    });

                    // Y-Ticks
                    const yTicks = Array.from({ length: maxY + 1 }, (_, i) => {
                      const val = i;
                      const yPos = topPadding + plotHeight - (val / maxY) * plotHeight;
                      return { val, yPos };
                    });

                    return (
                      <div className="overflow-x-auto custom-scrollbar">
                        <div style={{ minWidth: chartWidth }} className="relative">
                          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ height: `${chartHeight}px` }}>
                            <defs>
                              <linearGradient id="bubbleGlow" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#be123c" stopOpacity="0.8" />
                              </linearGradient>
                            </defs>

                            {/* Hintergrund Gitterlinien (Y-Gridlines) */}
                            {yTicks.map(t => (
                              <g key={`y-${t.val}`}>
                                <line
                                  x1={leftPadding}
                                  y1={t.yPos}
                                  x2={chartWidth - rightPadding}
                                  y2={t.yPos}
                                  stroke="#334155"
                                  strokeWidth="1"
                                  strokeDasharray={t.val === 0 ? undefined : '3,3'}
                                  opacity={t.val === 0 ? 0.8 : 0.35}
                                />
                                <text
                                  x={leftPadding - 8}
                                  y={t.yPos + 4}
                                  fill="#64748b"
                                  fontSize="10"
                                  fontWeight="bold"
                                  textAnchor="end"
                                  fontFamily="monospace"
                                >
                                  {t.val}x
                                </text>
                              </g>
                            ))}

                            {/* X-Gridlines */}
                            {xTicks.map(t => (
                              <g key={`x-${t.val}`}>
                                <line
                                  x1={t.xPos}
                                  y1={topPadding}
                                  x2={t.xPos}
                                  y2={topPadding + plotHeight}
                                  stroke="#334155"
                                  strokeWidth="1"
                                  strokeDasharray={t.val === 0 ? undefined : '3,3'}
                                  opacity={t.val === 0 ? 0.8 : 0.25}
                                />
                                <text
                                  x={t.xPos}
                                  y={topPadding + plotHeight + 18}
                                  fill="#94a3b8"
                                  fontSize="10"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  fontFamily="monospace"
                                >
                                  {t.val}d
                                </text>
                              </g>
                            ))}

                            {/* Plottete Verletzungspunkte (Bubbles) */}
                            {plottedInjuries.map(item => {
                              const x = leftPadding + (item.totalDays / maxX) * plotWidth;
                              const y = topPadding + plotHeight - (item.count / maxY) * plotHeight;
                              const isSelected = selectedInjuryId === item.id;
                              const radius = Math.max(14, Math.min(24, 12 + item.count * 3 + (item.totalDays / maxX) * 8));

                              // Color by severity
                              const fillColor = item.totalDays > 14 ? '#e11d48' : item.totalDays > 7 ? '#f43f5e' : '#fb7185';

                              return (
                                <g
                                  key={item.id}
                                  className="cursor-pointer transition-all"
                                  onClick={() => setSelectedInjuryId(isSelected ? null : item.id)}
                                >
                                  {/* Pulsing ring if selected or severe */}
                                  {isSelected && (
                                    <circle
                                      cx={x}
                                      cy={y}
                                      r={radius + 7}
                                      fill="none"
                                      stroke="#f43f5e"
                                      strokeWidth="2.5"
                                      strokeDasharray="4,4"
                                      className="animate-spin"
                                      style={{ transformOrigin: `${x}px ${y}px`, animationDuration: '6s' }}
                                    />
                                  )}

                                  {/* Shadow ring */}
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r={radius + 2}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    opacity={isSelected ? 0.6 : 0.15}
                                  />

                                  {/* Main Bubble */}
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r={radius}
                                    fill={fillColor}
                                    filter={isSelected ? "drop-shadow(0 0 10px rgba(244,63,94,0.7))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"}
                                    opacity={isSelected ? 1 : 0.9}
                                  />

                                  {/* Icon / Value inside Bubble */}
                                  <text
                                    x={x}
                                    y={y + 4}
                                    fill="#ffffff"
                                    fontSize="11"
                                    fontWeight="900"
                                    textAnchor="middle"
                                    fontFamily="monospace"
                                    pointerEvents="none"
                                  >
                                    {item.count}x
                                  </text>

                                  {/* Text Tag above / beside point */}
                                  <g pointerEvents="none">
                                    <rect
                                      x={x - 45}
                                      y={y - radius - 19}
                                      width={90}
                                      height={16}
                                      rx={4}
                                      fill="#0f172a"
                                      stroke={isSelected ? "#f43f5e" : "#334155"}
                                      strokeWidth={1}
                                      opacity={0.92}
                                    />
                                    <text
                                      x={x}
                                      y={y - radius - 7}
                                      fill={isSelected ? "#ffffff" : "#cbd5e1"}
                                      fontSize="9.5"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      {item.bodyPart.length > 12 ? `${item.bodyPart.slice(0, 10)}..` : item.bodyPart} ({item.totalDays}d)
                                    </text>
                                  </g>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* DETAIL-AUFSCHLÜSSELUNG DER VERLETZUNGEN */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Dokumentierte Verletzungen ({plottedInjuries.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Klicke auf eine Verletzung im Diagramm oder in der Liste für Details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {plottedInjuries.map(item => {
                      const isSelected = selectedInjuryId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedInjuryId(isSelected ? null : item.id)}
                          className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-2.5",
                            isSelected
                              ? "bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-950/50 scale-[1.02]"
                              : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                <Stethoscope className="w-4 h-4" />
                              </span>
                              <span className="font-black text-white text-xs sm:text-sm">
                                {item.bodyPart}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {item.count}x aufgetreten
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2 text-slate-400">
                            <span>Gesamt: <strong className="text-rose-400 font-bold">{item.totalDays} Tage</strong></span>
                            <span>Ø <strong className="text-teal-400 font-bold">{item.avgDays.toFixed(0)} Tage / Vorfall</strong></span>
                          </div>

                          {item.notes.length > 0 && (
                            <div className="text-[11px] text-slate-300 italic line-clamp-2 pt-1 border-t border-slate-800/40">
                              „{item.notes[0]}“
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* EXPANDED DETAIL INSPECTION FOR SELECTED INJURY */}
                {selectedInjury && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-rose-500/50 space-y-3 animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-white">
                            Detailansicht: {selectedInjury.bodyPart}
                          </h4>
                          <span className="text-xs text-slate-400">
                            {selectedInjury.count} Vorfälle | {selectedInjury.totalDays} Fehltage insgesamt
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedInjuryId(null)}
                        className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                      >
                        Schließen
                      </button>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Dokumentierte Vorfälle:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedInjury.rawEntries.map((entry, idx) => {
                          const days = getAbsenceDurationDays(entry);
                          return (
                            <div key={entry.id || idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                                  <span>
                                    {entry.startDate ? new Date(entry.startDate).toLocaleDateString('de-DE') : '–'}
                                    {entry.endDate && entry.endDate !== entry.startDate ? ` – ${new Date(entry.endDate).toLocaleDateString('de-DE')}` : ''}
                                  </span>
                                </span>
                                <span className="px-2 py-0.5 rounded font-mono font-black text-[10.5px] bg-rose-950 text-rose-300 border border-rose-500/30">
                                  {days} {days === 1 ? 'Tag' : 'Tage'}
                                </span>
                              </div>
                              {entry.note ? (
                                <p className="text-slate-300 text-[11px] italic bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                                  „{entry.note}“
                                </p>
                              ) : (
                                <p className="text-slate-500 text-[11px]">Keine Notiz hinterlegt</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2.5: TEILNAHME AN INHALTEN (KLAPPBAR, STANDARDMÄSSIG ZUGEKLAPPT) */}
      <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-xl overflow-hidden transition-all">
        <div
          onClick={() => setIsContentAttendanceExpanded(prev => !prev)}
          className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/60 transition select-none"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Inhalte &amp; Schwerpunkte
                </span>
                <h5 className="text-base sm:text-lg font-black text-white">
                  Teilnahme an Inhalten
                </h5>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Detaillierte Trainingshäufigkeit des Torhüters nach taktischen Themen &amp; Torwarttechniken im analytischen Teil
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2">
              <span className="text-indigo-400">{themeAttendanceStats.attendedTopicsCount}</span>
              <span className="text-slate-500">Themen</span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-400">{techniqueAttendanceStats.attendedCount}</span>
              <span className="text-slate-500">Techniken</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
              {isContentAttendanceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {isContentAttendanceExpanded && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-800/80 space-y-8 animate-fadeIn">
            {/* Quick KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    Taktische Themen
                  </span>
                  <span className="font-mono text-indigo-400">
                    {themeAttendanceStats.items.filter(i => i.totalPossible > 0).length} angeboten
                  </span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {themeAttendanceStats.attendedTopicsCount} <span className="text-xs text-slate-400 font-normal">trainiert</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Top-Thema: <span className="text-slate-200 font-bold">{themeAttendanceStats.topTheme ? themeAttendanceStats.topTheme.label : '–'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Techniken (Analytisch)
                  </span>
                  <span className="font-mono text-purple-400">
                    {techniqueAttendanceStats.trainedCount} angeboten
                  </span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {techniqueAttendanceStats.attendedCount} <span className="text-xs text-slate-400 font-normal">von 30 trainiert</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Meisttrainiert: <span className="text-slate-200 font-bold">{techniqueAttendanceStats.topTechnique ? techniqueAttendanceStats.topTechnique.name : '–'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Trainingsquote
                  </span>
                  <span className="font-mono text-emerald-400">
                    {totalPlans} Einheiten
                  </span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {attendancePercentage.toFixed(0)} % <span className="text-xs text-slate-400 font-normal">Anwesenheit</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  <span className="text-emerald-300 font-bold">{attendedPlansCount}</span> von <span className="text-slate-200 font-bold">{totalPlans}</span> wahrgenommen
                </div>
              </div>
            </div>

            {/* Legende */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Legende zur Diagrammauswertung:</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-400 border border-emerald-400/40" />
                  <span className="text-slate-300">Teilnahme des Spielers (Trainingseinheiten abzüglich Fehlzeiten)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-slate-800 border-r-2 border-amber-400" />
                  <span className="text-slate-300">Maximal mögliche Einheiten (alle Einheiten der Gruppe im Planer)</span>
                </div>
              </div>
            </div>

            {/* DIAGRAMM 1: TAKTISCHE THEMEN */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
                <div>
                  <h6 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-400" />
                    <span>1. Taktische Themen (Themenschwerpunkte)</span>
                  </h6>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Häufigkeit der Teilnahme an Trainingseinheiten nach Thema (z.B. 1vs1, Ferndistanz)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter Mode */}
                  <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setThemeFilterMode('trainedOnly')}
                      className={cn(
                        "px-3 py-1 rounded-lg font-bold transition",
                        themeFilterMode === 'trainedOnly'
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      Nur trainierte ({themeAttendanceStats.trainedTopicsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeFilterMode('all')}
                      className={cn(
                        "px-3 py-1 rounded-lg font-bold transition",
                        themeFilterMode === 'all'
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      Alle Themen ({themeAttendanceStats.items.length})
                    </button>
                  </div>

                  {/* Sort Order */}
                  <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setThemeSortOrder('frequency')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1",
                        themeSortOrder === 'frequency'
                          ? "bg-slate-800 text-indigo-300"
                          : "text-slate-400 hover:text-white"
                      )}
                      title="Nach Teilnahmehäufigkeit sortieren"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Häufigkeit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeSortOrder('catalog')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold transition",
                        themeSortOrder === 'catalog'
                          ? "bg-slate-800 text-indigo-300"
                          : "text-slate-400 hover:text-white"
                      )}
                      title="Katalog-Reihenfolge"
                    >
                      Katalog
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Horizontal Bars */}
              {displayedThemes.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 text-xs text-slate-400">
                  Keine Themen für diesen Filter gefunden.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedThemes.map(tItem => {
                    const maxScale = Math.max(...displayedThemes.map(i => i.totalPossible), 1);
                    const totalWidthPct = (tItem.totalPossible / maxScale) * 100;
                    const attendedWidthPct = (tItem.attendedCount / maxScale) * 100;
                    const themeColorObj = getThemeColor(tItem.label);

                    return (
                      <div
                        key={tItem.id}
                        className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-2"
                      >
                        {/* Title & Stats Line */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: tItem.color || themeColorObj.hex }}
                            />
                            <span className="font-extrabold text-white text-sm truncate">
                              {tItem.label}
                            </span>
                            {tItem.totalPossible > 0 && (
                              <span className="text-[11px] font-mono text-slate-400">
                                ({tItem.attendedCount} von {tItem.totalPossible} Einheiten)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs">
                            {tItem.missedCount > 0 && (
                              <span className="text-rose-400 text-[11px] font-bold">
                                –{tItem.missedCount} {tItem.missedCount === 1 ? 'Einheit' : 'Einheiten'} verpasst
                              </span>
                            )}
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg font-black text-[11px] border",
                                tItem.totalPossible === 0
                                  ? "bg-slate-950 text-slate-500 border-slate-800"
                                  : tItem.percentage >= 80
                                  ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                  : tItem.percentage >= 50
                                  ? "bg-amber-950 text-amber-300 border-amber-500/40"
                                  : "bg-rose-950 text-rose-300 border-rose-500/40"
                              )}
                            >
                              {tItem.totalPossible > 0 ? `${tItem.percentage.toFixed(0)} % Quote` : 'Nicht angeboten'}
                            </span>
                          </div>
                        </div>

                        {/* Horizontal Bar Chart Track */}
                        <div className="relative w-full h-7 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                          {tItem.totalPossible > 0 ? (
                            <>
                              {/* Background Bar: Max Offered Sessions */}
                              <div
                                style={{ width: `${totalWidthPct}%` }}
                                className="absolute inset-y-0 left-0 bg-slate-800/80 border-r-2 border-amber-400/90 transition-all duration-300"
                                title={`Maximal möglich: ${tItem.totalPossible} Einheiten`}
                              />

                              {/* Foreground Bar: Attended Sessions */}
                              <div
                                style={{
                                  width: `${attendedWidthPct}%`,
                                  backgroundColor: tItem.color || themeColorObj.hex
                                }}
                                className="absolute inset-y-0 left-0 opacity-90 rounded-l-xl transition-all duration-500 shadow-sm"
                                title={`Teilgenommen: ${tItem.attendedCount} Einheiten`}
                              />

                              {/* Inline Info on Track */}
                              <div className="absolute inset-0 px-3 flex items-center justify-between text-[11px] font-mono pointer-events-none font-bold">
                                <span className="text-white drop-shadow-sm">
                                  {tItem.attendedCount}x teilgenommen
                                </span>
                                <span className="text-amber-200 drop-shadow-sm">
                                  Max: {tItem.totalPossible}x
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[10.5px] font-mono text-slate-600 italic">
                              Bisher keine Einheit mit diesem Thema im Planer
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DIAGRAMM 2: TORWARTTECHNIKEN (ANALYTISCH) */}
            <div className="space-y-4 pt-4 border-t border-slate-800/70">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h6 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>2. Torwarttechniken (im analytischen Teil)</span>
                    </h6>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Häufigkeit der Teilnahme an Einheiten mit isolierter &amp; kombinierter Technikschulung (Phase „Analytisch“)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filter Mode */}
                    <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setTechFilterMode('trainedOnly')}
                        className={cn(
                          "px-3 py-1 rounded-lg font-bold transition",
                          techFilterMode === 'trainedOnly'
                            ? "bg-purple-600 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        Nur trainierte ({techniqueAttendanceStats.trainedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechFilterMode('all')}
                        className={cn(
                          "px-3 py-1 rounded-lg font-bold transition",
                          techFilterMode === 'all'
                            ? "bg-purple-600 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        Alle 30 Techniken
                      </button>
                    </div>

                    {/* Sort Order */}
                    <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setTechSortOrder('frequency')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1",
                          techSortOrder === 'frequency'
                            ? "bg-slate-800 text-purple-300"
                            : "text-slate-400 hover:text-white"
                        )}
                        title="Nach Teilnahmehäufigkeit sortieren"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        <span>Häufigkeit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechSortOrder('catalog')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-bold transition",
                          techSortOrder === 'catalog'
                            ? "bg-slate-800 text-purple-300"
                            : "text-slate-400 hover:text-white"
                        )}
                        title="Katalog-Reihenfolge"
                      >
                        Katalog
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTechGroup('all')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition",
                      selectedTechGroup === 'all'
                        ? "bg-purple-600 text-white shadow"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    )}
                  >
                    Alle Gruppen
                  </button>
                  {Object.entries(TECHNIQUE_GROUP_CONFIG).map(([gKey, conf]) => (
                    <button
                      key={gKey}
                      type="button"
                      onClick={() => setSelectedTechGroup(gKey)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition border",
                        selectedTechGroup === gKey
                          ? `${conf.bg} ${conf.text} ${conf.border} font-black ring-1 ring-white/20`
                          : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                      )}
                    >
                      {conf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Technique Horizontal Bars */}
              {displayedTechniques.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 text-xs text-slate-400">
                  Keine Torwarttechniken für diese Filtereinstellungen gefunden.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedTechniques.map(tech => {
                    const maxScale = Math.max(...displayedTechniques.map(i => i.totalPossible), 1);
                    const totalWidthPct = (tech.totalPossible / maxScale) * 100;
                    const attendedWidthPct = (tech.attendedCount / maxScale) * 100;
                    const gConf = tech.groupConfig || TECHNIQUE_GROUP_CONFIG['Grundstellungen'];

                    return (
                      <div
                        key={tech.id}
                        className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-2"
                      >
                        {/* Title & Stats Line */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider shrink-0", gConf.badge)}>
                              {gConf.label}
                            </span>
                            <span className="font-extrabold text-white text-sm truncate">
                              {tech.name}
                            </span>
                            {tech.totalPossible > 0 && (
                              <span className="text-[11px] font-mono text-slate-400">
                                ({tech.attendedCount} von {tech.totalPossible} Einheiten)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs">
                            {tech.missedCount > 0 && (
                              <span className="text-rose-400 text-[11px] font-bold">
                                –{tech.missedCount} {tech.missedCount === 1 ? 'Einheit' : 'Einheiten'} verpasst
                              </span>
                            )}
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg font-black text-[11px] border",
                                tech.totalPossible === 0
                                  ? "bg-slate-950 text-slate-500 border-slate-800"
                                  : tech.percentage >= 80
                                  ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                  : tech.percentage >= 50
                                  ? "bg-amber-950 text-amber-300 border-amber-500/40"
                                  : "bg-rose-950 text-rose-300 border-rose-500/40"
                              )}
                            >
                              {tech.totalPossible > 0 ? `${tech.percentage.toFixed(0)} % Quote` : 'Nicht angeboten'}
                            </span>
                          </div>
                        </div>

                        {/* Horizontal Bar Chart Track */}
                        <div className="relative w-full h-7 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                          {tech.totalPossible > 0 ? (
                            <>
                              {/* Background Bar: Max Offered Sessions */}
                              <div
                                style={{ width: `${totalWidthPct}%` }}
                                className="absolute inset-y-0 left-0 bg-slate-800/80 border-r-2 border-amber-400/90 transition-all duration-300"
                                title={`Maximal möglich in Phase Analytisch: ${tech.totalPossible} Einheiten`}
                              />

                              {/* Foreground Bar: Attended Sessions */}
                              <div
                                style={{
                                  width: `${attendedWidthPct}%`,
                                  backgroundColor: gConf.hex || '#a855f7'
                                }}
                                className="absolute inset-y-0 left-0 opacity-90 rounded-l-xl transition-all duration-500 shadow-sm"
                                title={`Teilgenommen: ${tech.attendedCount} Einheiten`}
                              />

                              {/* Inline Info on Track */}
                              <div className="absolute inset-0 px-3 flex items-center justify-between text-[11px] font-mono pointer-events-none font-bold">
                                <span className="text-white drop-shadow-sm">
                                  {tech.attendedCount}x teilgenommen
                                </span>
                                <span className="text-amber-200 drop-shadow-sm">
                                  Max: {tech.totalPossible}x
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[10.5px] font-mono text-slate-600 italic">
                              Bisher in keiner analytischen Phase trainiert
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: CHRONOLOGISCHE TABELLE ALLER DOKUMENTIERTEN FEHLZEITEN & VERLETZUNGEN (KLAPPBAR, STANDARDMÄSSIG ZUGEKLAPPT) */}
      {filteredAbsences.length > 0 && (
        <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-xl overflow-hidden transition-all">
          <div
            onClick={() => setIsAbsencesExpanded(prev => !prev)}
            className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/60 transition select-none"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Chronologie
                  </span>
                  <h5 className="text-base sm:text-lg font-black text-white">
                    Dokumentierte Fehlzeiten & Verletzungen
                  </h5>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Auflistung aller erfassten Abwesenheitstage, Krankheiten und Verletzungen
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                {filteredAbsences.length} Einträge ({totalAbsenceDays} Fehltage)
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                {isAbsencesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {isAbsencesExpanded && (
            <div className="p-5 sm:p-6 pt-0 border-t border-slate-800/80 animate-fadeIn">
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 pt-4">
                {filteredAbsences.map(abs => {
                  const rColor = getAbsenceReasonColor(abs.reason as AbsenceReason);
                  const days = getAbsenceDurationDays(abs);
                  const isInj = abs.reason === 'Verletzung';
                  return (
                    <div
                      key={abs.id}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn("px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border flex items-center gap-1.5", rColor.bg, rColor.text)}>
                          {isInj && <HeartPulse className="w-3 h-3 text-rose-400" />}
                          <span>{abs.reason}</span>
                        </span>
                        {abs.injuredBodyPart && (
                          <span className="text-slate-200 font-bold bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-800">
                            {abs.injuredBodyPart}
                          </span>
                        )}
                        {abs.note && (
                          <span className="text-slate-400 text-[11px] truncate max-w-xs sm:max-w-md italic">
                            „{abs.note}“
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-mono text-slate-400 text-[11px]">
                        <span className="text-amber-400/90 font-bold">{days} {days === 1 ? 'Tag' : 'Tage'}</span>
                        <span>
                          {abs.startDate ? new Date(abs.startDate).toLocaleDateString('de-DE') : '–'} – {abs.endDate ? new Date(abs.endDate).toLocaleDateString('de-DE') : 'offen'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
