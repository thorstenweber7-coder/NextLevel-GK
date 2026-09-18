import React, { useState, useMemo } from 'react';
import type { Player, TrainingGroup, TrainingPlan, PlayerMatchPlaytime, PlayerAbsence } from '../../types';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Zap,
  TrendingUp,
  Clock,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import {
  calculatePlayerSeasonWorkload,
  WORKLOAD_STATUS_CONFIG,
  type PlayerSeasonWorkload
} from '../../utils/workloadCalculator';
import { cn } from '../../utils/cn';

interface PlayerWorkloadSeasonSectionProps {
  player: Player;
  group?: TrainingGroup;
  savedPlans?: TrainingPlan[];
  matchPlaytimes?: PlayerMatchPlaytime[];
  absences?: PlayerAbsence[];
}

export const PlayerWorkloadSeasonSection: React.FC<PlayerWorkloadSeasonSectionProps> = ({
  player,
  group: _group,
  savedPlans = [],
  matchPlaytimes = [],
  absences = []
}) => {
  // Standardmäßig zugeklappt (collapsed by default)
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Available seasons extraction
  const availableSeasons = useMemo(() => {
    const yearsSet = new Set<number>();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const defaultStartYear = currentMonth >= 6 ? currentYear : currentYear - 1;
    yearsSet.add(defaultStartYear);

    savedPlans.forEach(p => {
      const d = p.date || p.planDate;
      if (d) {
        const year = parseInt(d.split('- ')[0], 10);
        const month = parseInt(d.split('- ')[1], 10);
        if (!isNaN(year) && !isNaN(month)) {
          const sYear = month >= 7 ? year : year - 1;
          yearsSet.add(sYear);
        }
      }
    });

    matchPlaytimes.forEach(m => {
      if (m.date) {
        const year = parseInt(m.date.split('- ')[0], 10);
        const month = parseInt(m.date.split('- ')[1], 10);
        if (!isNaN(year) && !isNaN(month)) {
          const sYear = month >= 7 ? year : year - 1;
          yearsSet.add(sYear);
        }
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [savedPlans, matchPlaytimes]);

  const [selectedSeasonStartYear, setSelectedSeasonStartYear] = useState<number>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return currentMonth >= 6 ? currentYear : currentYear - 1;
  });

  // Toggle for metric: 'avgDaily' (Ø Täglicher Belastungswert der Woche - requested) vs 'totalWeekly'
  const [metricMode, setMetricMode] = useState<'avgDaily' | 'totalWeekly'>('avgDaily');
  const [hoveredWeekIdx, setHoveredWeekIdx] = useState<number | null>(null);
  const [showMethodology, setShowMethodology] = useState<boolean>(false);

  // Calculate full season workload
  const seasonData: PlayerSeasonWorkload = useMemo(() => {
    return calculatePlayerSeasonWorkload(player, savedPlans, matchPlaytimes, selectedSeasonStartYear, absences);
  }, [player, savedPlans, matchPlaytimes, selectedSeasonStartYear, absences]);

  const MONTH_NAMES = [
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni'
  ];

  // SVG Chart Geometry
  const chartWidth = 1040;
  const chartHeight = 310;
  const padLeft = 55;
  const padRight = 55;
  const padTop = 30;
  const padBottom = 45;
  const plotWidth = chartWidth - padLeft - padRight; // 930px
  const plotHeight = chartHeight - padTop - padBottom; // 235px

  const colWidth = plotWidth / 52; // ~17.88px
  const barWidth = Math.max(7, colWidth - 5); // ~12.88px
  const monthWidth = plotWidth / 12; // 77.5px

  // Dynamic Y Scale for Load
  const maxLoadVal = useMemo(() => {
    if (metricMode === 'avgDaily') {
      const peak = seasonData.seasonPeakDailyAvgLoad;
      if (peak <= 0) return 400;
      return Math.ceil((peak * 1.25) / 50) * 50;
    } else {
      const peak = seasonData.seasonPeakWeeklyLoad;
      if (peak <= 0) return 2500;
      return Math.ceil((peak * 1.25) / 500) * 500;
    }
  }, [seasonData, metricMode]);

  const maxAcwrVal = 2.5;

  const getYLoad = (val: number): number => {
    const clamped = Math.max(0, Math.min(val, maxLoadVal));
    return padTop + plotHeight * (1 - clamped / maxLoadVal);
  };

  const getYAcwr = (val: number): number => {
    const clamped = Math.max(0, Math.min(val, maxAcwrVal));
    return padTop + plotHeight * (1 - clamped / maxAcwrVal);
  };

  const sweetSpotTop = getYAcwr(1.3);
  const sweetSpotBottom = getYAcwr(0.8);
  const sweetSpotHeight = sweetSpotBottom - sweetSpotTop;
  const dangerLineY = getYAcwr(1.5);

  const getXCenter = (i: number): number => {
    return padLeft + i * colWidth + colWidth / 2;
  };

  // Active weeks with polyline points for ACWR
  const activeWeeks = useMemo(() => seasonData.weeks.filter(w => !w.isFuture), [seasonData]);
  
  const acwrLinePoints = useMemo(() => {
    if (activeWeeks.length < 2) return '';
    return activeWeeks
      .map(w => {
        const x = getXCenter(w.weekIndex);
        const y = getYAcwr(w.acwr);
        return `${x},${y}`;
      })
      .join(' ');
  }, [activeWeeks]);

  const currentStatusConfig = WORKLOAD_STATUS_CONFIG[seasonData.currentStatus] || WORKLOAD_STATUS_CONFIG.optimal;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all">
      {/* ------------------------------------------------------------- */}
      {/* CARD HEADER: COLLAPSIBLE TOGGLE                                */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/50 transition select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span>Belastung</span>
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Saison {seasonData.seasonLabel}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Belastungskurve der bisherigen Saison (Juli bis Juni) • Wöchentliche Durchschnittswerte & ACWR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Active Status Badge in Header */}
          <div className={cn("hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border", currentStatusConfig.badge)}>
            <div className={cn("w-2 h-2 rounded-full", currentStatusConfig.dotColor)} />
            <span>ACWR: {seasonData.currentAcwr.toFixed(2)} ({currentStatusConfig.label})</span>
          </div>

          <button
            type="button"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            aria-label={isOpen ? "Zuklappen" : "Aufklappen"}
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CARD CONTENT: ONLY VISIBLE WHEN OPEN                          */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div className="p-5 sm:p-6 pt-0 space-y-6 border-t border-slate-800/80 animate-in fade-in duration-200">
          {/* 1. TOP KPI SUMMARY STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            {/* KPI 1: Current ACWR */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold">Aktueller ACWR-Index</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {seasonData.currentAcwr.toFixed(2)}
                </span>
                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", currentStatusConfig.badge)}>
                  {currentStatusConfig.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                {currentStatusConfig.recommendation}
              </p>
            </div>

            {/* KPI 2: Ø Daily Load in Season */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold">Ø Tagesbelastung (Saison)</span>
                <BarChart3 className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-1">
                <div className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
                  {seasonData.seasonAvgDailyLoad.toLocaleString("de-DE")}{" "}
                  <span className="text-xs font-semibold text-slate-400">A.U./Tag</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Ø {seasonData.seasonAvgWeeklyLoad.toLocaleString("de-DE")} A.U. pro Woche
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Basierend auf {seasonData.documentedWeeksCount} aktiven Wochen
              </div>
            </div>

            {/* KPI 3: Peak Load */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold">Saison-Spitzenwert</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-1">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  {seasonData.seasonPeakDailyAvgLoad.toLocaleString("de-DE")}{" "}
                  <span className="text-xs font-semibold text-slate-400">A.U./Tag</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Peak-Woche: {seasonData.seasonPeakWeeklyLoad.toLocaleString("de-DE")} A.U.
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Höchste dokumentierte Belastung
              </div>
            </div>

            {/* KPI 4: Total Minutes & Sessions */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold">Saison-Einsatzzeit</span>
                <Clock className="w-4 h-4 text-teal-400" />
              </div>
              <div className="mt-1">
                <div className="text-2xl sm:text-3xl font-black text-teal-400 font-mono">
                  {seasonData.totalSeasonMinutes.toLocaleString("de-DE")}{" "}
                  <span className="text-xs font-semibold text-slate-400">Min.</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {seasonData.totalSeasonSessions} Trainings • {seasonData.totalSeasonMatches} Spiele
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Dokumentierte Spiel- & Trainingszeit
              </div>
            </div>
          </div>

          {/* 2. DIAGRAM CONTAINER */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4">
            {/* Header & Controls within Diagram */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    Belastungsverlauf & ACWR-Entwicklung
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium">
                    {player.firstName} {player.lastName}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Balken: {metricMode === "avgDaily" ? "Ø Täglicher Belastungswert der 7-Tage-Woche (A.U./Tag)" : "Wöchentliche Gesamtarbeitslast (A.U.)"} • Linie: ACWR (0.8–1.3 Sweet Spot) • X-Achse: Juli bis Juni
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Selector Toggle */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMetricMode("avgDaily")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                      metricMode === "avgDaily"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    Ø Tag (A.U.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricMode("totalWeekly")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                      metricMode === "totalWeekly"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    ∑ Woche (A.U.)
                  </button>
                </div>

                {/* Season Selector Dropdown */}
                {availableSeasons.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={selectedSeasonStartYear}
                      onChange={e => setSelectedSeasonStartYear(Number(e.target.value))}
                      className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
                    >
                      {availableSeasons.map(yr => (
                        <option key={yr} value={yr} className="bg-slate-900 text-white">
                          Saison {yr}/{yr + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* SVG Dual-Axis Chart */}
            <div className="relative overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[750px] select-none"
              >
                <defs>
                  {/* Bar Gradients */}
                  <linearGradient id="seasonBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="seasonBarGradientHover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.75" />
                  </linearGradient>
                  <linearGradient id="seasonSweetSpotGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.06" />
                  </linearGradient>
                </defs>

                {/* 12 MONTH SECTORS & VERTICAL DIVIDERS */}
                {MONTH_NAMES.map((monthName, mIdx) => {
                  const mLeft = padLeft + mIdx * monthWidth;
                  const mCenter = mLeft + monthWidth / 2;
                  const isEven = mIdx % 2 === 0;

                  return (
                    <g key={`month-${mIdx}`}>
                      {/* Background tint for alternating months */}
                      <rect
                        x={mLeft}
                        y={padTop}
                        width={monthWidth}
                        height={plotHeight}
                        fill={isEven ? "rgba(255, 255, 255, 0.015)" : "transparent"}
                      />

                      {/* Divider line between months (except first) */}
                      {mIdx > 0 && (
                        <line
                          x1={mLeft}
                          y1={padTop}
                          x2={mLeft}
                          y2={padTop + plotHeight}
                          stroke="#334155"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          strokeOpacity="0.5"
                        />
                      )}

                      {/* Month Label at Bottom X-Axis */}
                      <text
                        x={mCenter}
                        y={chartHeight - 14}
                        textAnchor="middle"
                        fontSize="10.5"
                        fill="#cbd5e1"
                        fontWeight="600"
                      >
                        {monthName}
                      </text>
                    </g>
                  );
                })}

                {/* Left Y-Axis Horizontal Grid Lines (Belastung) */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = padTop + plotHeight * (1 - pct);
                  const val = Math.round(maxLoadVal * pct);
                  return (
                    <g key={`grid-${i}`}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="3 3"
                        strokeOpacity="0.35"
                      />
                      {/* Left Y-Axis Label */}
                      <text
                        x={padLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="9"
                        fill="#94a3b8"
                        fontWeight="500"
                        fontFamily="ui-monospace, monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Right Y-Axis Labels (ACWR) */}
                {[0, 0.8, 1.3, 1.5, 2.0, 2.5].map((val, i) => {
                  const y = getYAcwr(val);
                  return (
                    <text
                      key={`acwr-label-${i}`}
                      x={chartWidth - padRight + 8}
                      y={y + 3.5}
                      textAnchor="start"
                      fontSize="9"
                      fill={val === 1.5 ? "#f43f5e" : val === 0.8 || val === 1.3 ? "#10b981" : "#94a3b8"}
                      fontWeight={val === 1.5 || val === 0.8 || val === 1.3 ? "bold" : "normal"}
                      fontFamily="ui-monospace, monospace"
                    >
                      {val.toFixed(1)}
                    </text>
                  );
                })}

                {/* Sweet Spot Corridor Rect (0.8 - 1.3) */}
                <rect
                  x={padLeft}
                  y={sweetSpotTop}
                  width={plotWidth}
                  height={sweetSpotHeight}
                  fill="url(#seasonSweetSpotGradient)"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.35"
                />
                <text
                  x={padLeft + 8}
                  y={sweetSpotTop + 12}
                  fontSize="8.5"
                  fill="#34d399"
                  fontWeight="bold"
                  opacity="0.85"
                >
                  SWEET SPOT (0.8 – 1.3)
                </text>

                {/* Danger Line (1.5) */}
                <line
                  x1={padLeft}
                  y1={dangerLineY}
                  x2={chartWidth - padRight}
                  y2={dangerLineY}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeOpacity="0.8"
                />
                <text
                  x={chartWidth - padRight - 8}
                  y={dangerLineY - 5}
                  textAnchor="end"
                  fontSize="8.5"
                  fill="#f43f5e"
                  fontWeight="bold"
                >
                  GEFAHRENSCHWELLE (≥ 1.5)
                </text>

                {/* 52 WEEK BARS */}
                {seasonData.weeks.map((w, i) => {
                  const xCenter = getXCenter(i);
                  const x = xCenter - barWidth / 2;
                  const displayValue = metricMode === "avgDaily" ? w.avgDailyLoad : w.totalLoad;
                  const y = getYLoad(displayValue);
                  const height = Math.max(displayValue > 0 ? 3 : 0, padTop + plotHeight - y);
                  const isHovered = hoveredWeekIdx === i;

                  return (
                    <g
                      key={`bar-${i}`}
                      onMouseEnter={() => setHoveredWeekIdx(i)}
                      onMouseLeave={() => setHoveredWeekIdx(null)}
                      className="cursor-pointer"
                    >
                      {/* Interactive Column Hitbox */}
                      <rect
                        x={padLeft + i * colWidth}
                        y={padTop}
                        width={colWidth}
                        height={plotHeight}
                        fill={isHovered ? "rgba(255, 255, 255, 0.05)" : "transparent"}
                      />

                      {/* Actual Load Bar */}
                      {displayValue > 0 && (
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="3"
                          ry="3"
                          fill={isHovered ? "url(#seasonBarGradientHover)" : "url(#seasonBarGradient)"}
                          stroke={isHovered ? "#34d399" : w.isCurrentWeek ? "#38bdf8" : "#059669"}
                          strokeWidth={isHovered ? "1.5" : w.isCurrentWeek ? "1.5" : "0.75"}
                          className="transition-all duration-150"
                        />
                      )}

                      {/* Future week faint slot indicator */}
                      {w.isFuture && (
                        <rect
                          x={x}
                          y={padTop + plotHeight - 4}
                          width={barWidth}
                          height="4"
                          rx="1"
                          ry="1"
                          fill="#334155"
                          opacity="0.3"
                        />
                      )}

                      {/* Value label on top of bar if hovered */}
                      {displayValue > 0 && isHovered && (
                        <text
                          x={xCenter}
                          y={y - 4}
                          textAnchor="middle"
                          fontSize="8.5"
                          fill="#ffffff"
                          fontWeight="bold"
                          fontFamily="ui-monospace, monospace"
                        >
                          {displayValue}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* ACWR TREND LINE (Past/Active Weeks Only) */}
                {acwrLinePoints && (
                  <polyline
                    points={acwrLinePoints}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-md"
                  />
                )}

                {/* ACWR DATA POINTS & DOTS */}
                {activeWeeks.map(w => {
                  const cx = getXCenter(w.weekIndex);
                  const cy = getYAcwr(w.acwr);
                  const isHovered = hoveredWeekIdx === w.weekIndex;
                  const dotColor = WORKLOAD_STATUS_CONFIG[w.status]?.hex || "#10b981";

                  return (
                    <g
                      key={`dot-${w.weekIndex}`}
                      onMouseEnter={() => setHoveredWeekIdx(w.weekIndex)}
                      onMouseLeave={() => setHoveredWeekIdx(null)}
                      className="cursor-pointer"
                    >
                      {/* Pulse circle on danger spike */}
                      {w.status === "danger" && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="8"
                          fill="#f43f5e"
                          opacity="0.35"
                          className="animate-ping origin-center"
                        />
                      )}

                      {/* Dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered ? "5.5" : w.isCurrentWeek ? "4.5" : "3.5"}
                        fill={dotColor}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />

                      {/* Badge above point if hovered */}
                      {isHovered && (
                        <text
                          x={cx}
                          y={cy - 8}
                          textAnchor="middle"
                          fontSize="8.5"
                          fill={dotColor}
                          fontWeight="bold"
                          fontFamily="ui-monospace, monospace"
                        >
                          {w.acwr.toFixed(2)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Box */}
            {hoveredWeekIdx !== null && seasonData.weeks[hoveredWeekIdx] && (
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-150 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Woche {seasonData.weeks[hoveredWeekIdx].weekNumber} ({new Date(seasonData.weeks[hoveredWeekIdx].weekStart).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – {new Date(seasonData.weeks[hoveredWeekIdx].weekEnd).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}) • {seasonData.weeks[hoveredWeekIdx].monthLabel}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      WORKLOAD_STATUS_CONFIG[seasonData.weeks[hoveredWeekIdx].status]?.badge
                    )}>
                      {WORKLOAD_STATUS_CONFIG[seasonData.weeks[hoveredWeekIdx].status]?.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {seasonData.weeks[hoveredWeekIdx].sessionCount} Trainingseinheiten {seasonData.weeks[hoveredWeekIdx].matchCount > 0 ? `• ⚽ ${seasonData.weeks[hoveredWeekIdx].matchCount} Spiel(e)` : ""} • {seasonData.weeks[hoveredWeekIdx].totalMinutes} Gesamtminuten
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ø Belastung / Tag:</span>
                    <span className="font-bold text-sky-400 text-sm">
                      {seasonData.weeks[hoveredWeekIdx].avgDailyLoad.toLocaleString("de-DE")} A.U./Tag
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Wochen-Gesamtlast:</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {seasonData.weeks[hoveredWeekIdx].totalLoad.toLocaleString("de-DE")} A.U.
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ACWR-Index:</span>
                    <span className={cn(
                      "font-bold text-sm",
                      WORKLOAD_STATUS_CONFIG[seasonData.weeks[hoveredWeekIdx].status]?.text
                    )}>
                      {seasonData.weeks[hoveredWeekIdx].acwr.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Diagram Legend */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-600/90 border border-emerald-500" />
                  <span>{metricMode === "avgDaily" ? "Ø Tagesbelastung (linke Achse, A.U./Tag)" : "Wochenlast ∑ sRPE (linke Achse, A.U.)"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400 -ml-2" />
                  <span>ACWR-Linie (rechte Achse)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500/20 border border-dashed border-emerald-500/50" />
                  <span>Sweet Spot (0.8–1.3)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-rose-500 border-t border-dashed border-rose-500" />
                  <span className="text-rose-400 font-semibold">Gefahrenschwelle (≥ 1.5)</span>
                </div>
              </div>

              {/* Toggle Info / Methodology */}
              <button
                type="button"
                onClick={() => setShowMethodology(prev => !prev)}
                className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition cursor-pointer text-xs font-semibold"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showMethodology ? "Methodik verbergen" : "Wie wird das berechnet?"}</span>
              </button>
            </div>
          </div>

          {/* 3. SCIENTIFIC METHODOLOGY ACCORDION (OPTIONAL COLLAPSIBLE) */}
          {showMethodology && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 text-xs text-slate-300 animate-in fade-in duration-200">
              <h5 className="font-bold text-white flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Sportwissenschaftliche Belastungssteuerung (sRPE & ACWR)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-400 leading-relaxed">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="font-bold text-sky-400 block mb-1">1. Session-RPE (sRPE)</span>
                  sRPE = Dauer in Minuten × empfundene Belastung (Borg-Skala 1–10). Ermittelt aus den Nachbereitungen im Trainingsplaner sowie Pflichtspielen (Standard RPE 8.0).
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="font-bold text-emerald-400 block mb-1">2. Ø Wöchentliche Belastung</span>
                  Der wöchentliche Durchschnittswert gibt die durchschnittliche Tagesbelastung (Gesamtlast ÷ 7) bzw. Wochengesamtarbeitslast an, um Trainingszyklen und Mesozyklen zu vergleichen.
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="font-bold text-amber-400 block mb-1">3. ACWR (Akut : Chronisch)</span>
                  Verhältnis der aktuellen 7-Tage-Last zur chronischen 28-Tage-Fitnessbasis nach Dr. Tim Gabbett. Ein Wert von 0.8–1.3 sichert optimale Leistungsentwicklung bei minimalem Verletzungsrisiko.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
