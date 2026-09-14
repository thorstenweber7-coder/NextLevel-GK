import React, { useState, useMemo } from 'react';
import type { TrainingPlan, TrainingGroup, PlayerAbsence } from '../../types';
import { 
  Filter, 
  FileDown, 
  Loader2, 
  Target, 
  Sparkles, 
  ChevronUp, 
  ChevronDown, 
  Calendar, 
  Clock, 
  Award, 
  Users, 
  PieChart,
  HelpCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { getThemeColor, calculateAverageKeeperAttendance } from './statsConfig';

interface TrainerThemeStatsProps {
  filteredPlans: TrainingPlan[];
  groups?: TrainingGroup[];
  absences?: PlayerAbsence[];
  timeFilter: 'all' | '30days' | '90days' | 'thisYear';
  setTimeFilter: (val: 'all' | '30days' | '90days' | 'thisYear') => void;
  targetGroupFilter: string;
  setTargetGroupFilter: (val: string) => void;
  availableTargetGroups: string[];
  isExportingTrainerStats: boolean;
  onExportTrainerStatsPDF: () => void;
}

function formatDurationHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}

export const TrainerThemeStats: React.FC<TrainerThemeStatsProps> = ({
  filteredPlans,
  groups = [],
  absences = [],
  timeFilter,
  setTimeFilter,
  targetGroupFilter,
  setTargetGroupFilter,
  availableTargetGroups,
  isExportingTrainerStats,
  onExportTrainerStatsPDF
}) => {
  const [openQuestion1, setOpenQuestion1] = useState<boolean>(false);
  const [chartMetric, setChartMetric] = useState<'minutes' | 'count'>('minutes');
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);

  // Aggregated Theme Metrics
  const themeStats = useMemo(() => {
    const themeMap: Record<string, { count: number; minutes: number }> = {};
    let totalMinutes = 0;
    const totalPlans = filteredPlans.length;

    filteredPlans.forEach(plan => {
      const theme = (plan.title || plan.planTitle || 'Sonstiges').trim();
      const duration = Number(plan.totalMinutes || plan.totalDuration || 60) || 60;

      if (!themeMap[theme]) {
        themeMap[theme] = { count: 0, minutes: 0 };
      }
      themeMap[theme].count += 1;
      themeMap[theme].minutes += duration;
      totalMinutes += duration;
    });

    const entries = Object.entries(themeMap).map(([theme, data], idx) => {
      const minPercentage = totalMinutes > 0 ? (data.minutes / totalMinutes) * 100 : 0;
      const countPercentage = totalPlans > 0 ? (data.count / totalPlans) * 100 : 0;
      const color = getThemeColor(theme, idx);

      return {
        theme,
        count: data.count,
        minutes: data.minutes,
        minPercentage,
        countPercentage,
        color
      };
    });

    // Sort descending by selected metric
    entries.sort((a, b) => {
      return chartMetric === 'minutes' 
        ? b.minutes - a.minutes 
        : b.count - a.count;
    });

    const avgKeepers = calculateAverageKeeperAttendance(filteredPlans, groups, absences);
    const topTheme = entries[0] || null;

    return {
      entries,
      totalMinutes,
      totalPlans,
      avgKeepers,
      topTheme
    };
  }, [filteredPlans, chartMetric, groups, absences]);

  // Generate SVG Donut Path Slices
  const donutSlices = useMemo(() => {
    const { entries, totalMinutes, totalPlans } = themeStats;
    const totalValue = chartMetric === 'minutes' ? totalMinutes : totalPlans;

    if (totalValue === 0 || entries.length === 0) return [];

    let currentAngle = -Math.PI / 2; // Start top
    const radius = 100;
    const innerRadius = 60;
    const cx = 130;
    const cy = 130;

    return entries.map(entry => {
      const value = chartMetric === 'minutes' ? entry.minutes : entry.count;
      const fraction = value / totalValue;
      const angle = fraction * 2 * Math.PI;

      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      const ix1 = cx + innerRadius * Math.cos(startAngle);
      const iy1 = cy + innerRadius * Math.sin(startAngle);
      const ix2 = cx + innerRadius * Math.cos(endAngle);
      const iy2 = cy + innerRadius * Math.sin(endAngle);

      const largeArcFlag = angle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
        'Z'
      ].join(' ');

      return {
        theme: entry.theme,
        pathData,
        color: entry.color.hex,
        percentage: chartMetric === 'minutes' ? entry.minPercentage : entry.countPercentage,
        value,
        count: entry.count,
        minutes: entry.minutes
      };
    });
  }, [themeStats, chartMetric]);

  return (
    <div className="space-y-6">
      {/* GLOBAL FILTER TOOLBAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>Auswertungs-Filter</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Gesamter Zeitraum</option>
            <option value="30days">Letzte 30 Tage</option>
            <option value="90days">Letzte 90 Tage</option>
            <option value="thisYear">Aktuelles Jahr</option>
          </select>

          {availableTargetGroups.length > 0 && (
            <select
              value={targetGroupFilter}
              onChange={e => setTargetGroupFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Alle Zielgruppen</option>
              {availableTargetGroups.map(tg => (
                <option key={tg} value={tg}>{tg}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            disabled={isExportingTrainerStats || filteredPlans.length === 0}
            onClick={onExportTrainerStatsPDF}
            className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition shadow-md shadow-emerald-950/60 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/30 cursor-pointer"
            title="Alle Informationen der Trainer-Auswertung als PDF-Dokument herunterladen"
          >
            {isExportingTrainerStats ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-emerald-100" />
            )}
            <span>Trainerbezogene Auswertung exportieren</span>
          </button>
        </div>
      </div>

      {/* QUESTION 1 BANNER & CONTENT */}
      <div className="space-y-6">
        <div
          onClick={() => setOpenQuestion1(prev => !prev)}
          className={cn(
            "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border-2 p-5 sm:p-7 shadow-2xl cursor-pointer select-none transition-all group",
            openQuestion1
              ? "border-emerald-500/60 shadow-emerald-950/40"
              : "border-slate-800 hover:border-emerald-500/50 hover:scale-[1.003]"
          )}
        >
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 text-emerald-300 border border-emerald-500/50 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
                <Target className="w-7 h-7 sm:w-8 h-8" />
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Frage 1 von 4
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Themenanalyse & Trainingsfokus</span>
                  </div>
                </div>

                <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug tracking-tight group-hover:text-emerald-200 transition-colors">
                  „Wie teilt sich meine gesamte Torwart-Trainingszeit prozentual auf die einzelnen Hauptthemen auf?“
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
              <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                {openQuestion1 ? 'Einklappen' : 'Ausklappen'}
              </span>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-slate-300 group-hover:text-white group-hover:border-emerald-500/60 transition-all shadow-md">
                {openQuestion1 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </div>
        </div>

        {openQuestion1 && (
          <div className="space-y-6 animate-fadeIn">
            {/* KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span className="uppercase tracking-wider text-[10.5px]">Einheiten Gesamt</span>
                  <Calendar className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {themeStats.totalPlans}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Gespeicherte Trainingspläne
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span className="uppercase tracking-wider text-[10.5px]">Trainingszeit</span>
                  <Clock className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-sky-300">
                  {formatDurationHM(themeStats.totalMinutes)}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {themeStats.totalMinutes.toLocaleString('de-DE')} Netto-Minuten
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span className="uppercase tracking-wider text-[10.5px]">Top-Schwerpunkt</span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-base sm:text-lg font-black text-amber-300 truncate">
                  {themeStats.topTheme ? themeStats.topTheme.theme : '–'}
                </div>
                <div className="text-[11px] text-slate-500 font-medium truncate">
                  {themeStats.topTheme 
                    ? `${themeStats.topTheme.minPercentage.toFixed(1)}% der Trainingszeit (${themeStats.topTheme.count}x)`
                    : 'Noch keine Daten'}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span className="uppercase tracking-wider text-[10.5px]">Schnitt Torhüter</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-300">
                  {themeStats.avgKeepers} <span className="text-xs font-bold text-slate-400">TW</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Durchschn. pro Trainingseinheit
                </div>
              </div>
            </div>

            {/* METRIC SWITCHER & CHARTS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <span>Berechnungsgrundlage für Kreisdiagramm</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setChartMetric('minutes')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer",
                    chartMetric === 'minutes'
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Nach Trainingsminuten (Netto-Zeit)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('count')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer",
                    chartMetric === 'count'
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Nach Anzahl der Einheiten
                </button>
              </div>
            </div>

            {/* DONUT CHART & THEME LIST */}
            {themeStats.entries.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-2">
                <HelpCircle className="w-10 h-10 mx-auto text-slate-600" />
                <div className="text-sm font-bold text-slate-400">Keine Trainingsdaten im gewählten Zeitraum</div>
                <div className="text-xs">Erstelle oder filtere andere Zeiträume, um Auswertungen zu sehen.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* DONUT SVG */}
                <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center relative">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                    <svg viewBox="0 0 260 260" className="w-full h-full transform transition-transform duration-300">
                      {donutSlices.map(slice => {
                        const isHovered = hoveredTheme === slice.theme;
                        return (
                          <path
                            key={slice.theme}
                            d={slice.pathData}
                            fill={slice.color}
                            className={cn(
                              "transition-all duration-200 cursor-pointer",
                              isHovered ? "opacity-100 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] scale-[1.02]" : "opacity-90 hover:opacity-100"
                            )}
                            style={{ transformOrigin: '130px 130px' }}
                            onMouseEnter={() => setHoveredTheme(slice.theme)}
                            onMouseLeave={() => setHoveredTheme(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* CENTER LABEL */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                      {hoveredTheme ? (
                        <>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
                            {hoveredTheme}
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-white">
                            {(donutSlices.find(s => s.theme === hoveredTheme)?.percentage || 0).toFixed(1)}%
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            {chartMetric === 'minutes'
                              ? `${donutSlices.find(s => s.theme === hoveredTheme)?.minutes} Min.`
                              : `${donutSlices.find(s => s.theme === hoveredTheme)?.count}x`}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Gesamt
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-white">
                            {chartMetric === 'minutes' ? formatDurationHM(themeStats.totalMinutes) : `${themeStats.totalPlans} Pläne`}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {themeStats.entries.length} Themen
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 text-center mt-3 font-medium">
                    Fahre mit der Maus über ein Tortenstück für Details.
                  </div>
                </div>

                {/* THEME TABLE */}
                <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <span>Themenschwerpunkt</span>
                    <span>{chartMetric === 'minutes' ? 'Dauer & Anteil' : 'Einheiten & Anteil'}</span>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {themeStats.entries.map((item, idx) => {
                      const isHovered = hoveredTheme === item.theme;
                      const pct = chartMetric === 'minutes' ? item.minPercentage : item.countPercentage;

                      return (
                        <div
                          key={item.theme}
                          onMouseEnter={() => setHoveredTheme(item.theme)}
                          onMouseLeave={() => setHoveredTheme(null)}
                          className={cn(
                            "p-3 rounded-2xl border transition-all flex flex-col gap-1.5 cursor-pointer",
                            isHovered
                              ? "bg-slate-850 border-emerald-500/60 shadow-md shadow-slate-950"
                              : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
                          )}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color.hex }}
                              />
                              <span className="font-extrabold text-slate-200 truncate" title={item.theme}>
                                {idx + 1}. {item.theme}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 font-mono font-bold text-xs flex-shrink-0">
                              <span className="text-slate-400">
                                {chartMetric === 'minutes' ? `${item.minutes} Min. (${item.count}x)` : `${item.count}x (${item.minutes} Min.)`}
                              </span>
                              <span className="text-emerald-400 w-12 text-right">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: item.color.hex
                              }}
                            />
                          </div>
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
    </div>
  );
};
