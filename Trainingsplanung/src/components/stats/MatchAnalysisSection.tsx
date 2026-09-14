import React, { useState, useMemo } from 'react';
import type { Player, TrainingGroup, PlayerMatchPlaytime, MatchType } from '../../types';
import { MATCH_TYPES } from '../../types';
import { 
  Timer, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Trophy, 
  Activity, 
  PieChart, 
  Calendar 
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface MatchAnalysisSectionProps {
  player: Player;
  group: TrainingGroup;
  matchPlaytimes: PlayerMatchPlaytime[];
}

export interface MatchPlayerBreakdown {
  match: PlayerMatchPlaytime;
  matchDuration: number;
  playedMins: number;
  benchMins: number;
  outOfSquadMins: number;
  statusType: 'FULL_PLAY' | 'PARTIAL_PLAY_AND_BENCH' | 'FULL_BENCH' | 'OUT_OF_SQUAD';
  grade?: number;
}

export const MatchAnalysisSection: React.FC<MatchAnalysisSectionProps> = ({
  player,
  group,
  matchPlaytimes
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [matchStatsTypeFilter, setMatchStatsTypeFilter] = useState<'ALL' | MatchType>('ALL');
  const [hoveredMatchIdx, setHoveredMatchIdx] = useState<number | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Relevant matches: matches belonging to this training group OR where this player has playtime/bench/grade data
  const relevantMatches = useMemo(() => {
    return matchPlaytimes.filter(m => {
      const isGroupMatch = m.groupId === group.id || (m as any).trainingGroupId === group.id;
      const hasMinutes = (m.playerMinutes?.[player.id] ?? 0) > 0;
      const onBench = Boolean(m.playerBenchStatus?.[player.id]);
      const hasGrade = m.playerGrades?.[player.id] !== undefined;
      return isGroupMatch || hasMinutes || onBench || hasGrade;
    });
  }, [matchPlaytimes, group.id, player.id]);

  // Filtered by selected match type (Meisterschaft, Pokal, etc.)
  const filteredMatches = useMemo(() => {
    let list = [...relevantMatches];
    if (matchStatsTypeFilter !== 'ALL') {
      list = list.filter(m => m.matchType === matchStatsTypeFilter);
    }
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return list;
  }, [relevantMatches, matchStatsTypeFilter]);

  // Precise breakdown for each match: Einsatzminuten, Bankspielzeit, Nicht im Kader
  const matchBreakdowns = useMemo<MatchPlayerBreakdown[]>(() => {
    return filteredMatches.map(m => {
      const playedMins = Math.max(0, m.playerMinutes?.[player.id] ?? 0);
      const isExplicitBench = Boolean(m.playerBenchStatus?.[player.id]);
      const matchDuration = Math.max(90, playedMins);
      const grade = m.playerGrades?.[player.id];

      let benchMins = 0;
      let outOfSquadMins = 0;
      let statusType: MatchPlayerBreakdown['statusType'] = 'OUT_OF_SQUAD';

      if (playedMins >= matchDuration) {
        benchMins = 0;
        outOfSquadMins = 0;
        statusType = 'FULL_PLAY';
      } else if (playedMins > 0) {
        // Player played part of the match -> the rest of this match is spent on the bench!
        benchMins = Math.max(0, matchDuration - playedMins);
        outOfSquadMins = 0;
        statusType = 'PARTIAL_PLAY_AND_BENCH';
      } else if (isExplicitBench) {
        // Player was Ersatz-Torwart (bench standby) for the entire match
        benchMins = matchDuration;
        outOfSquadMins = 0;
        statusType = 'FULL_BENCH';
      } else {
        // 0 minutes and not on bench -> not in matchday squad
        benchMins = 0;
        outOfSquadMins = matchDuration;
        statusType = 'OUT_OF_SQUAD';
      }

      return {
        match: m,
        matchDuration,
        playedMins,
        benchMins,
        outOfSquadMins,
        statusType,
        grade
      };
    });
  }, [filteredMatches, player.id]);

  // Total active played minutes
  const totalPlayedMins = useMemo(() => {
    return matchBreakdowns.reduce((sum, b) => sum + b.playedMins, 0);
  }, [matchBreakdowns]);

  // Total bench minutes (including partial match bench times + full match standby)
  const totalBenchMins = useMemo(() => {
    return matchBreakdowns.reduce((sum, b) => sum + b.benchMins, 0);
  }, [matchBreakdowns]);

  // Total minutes out of squad
  const totalOutOfSquadMins = useMemo(() => {
    return matchBreakdowns.reduce((sum, b) => sum + b.outOfSquadMins, 0);
  }, [matchBreakdowns]);

  // Total potential match playtime across all documented matches (90 mins per match)
  const totalPossibleMins = useMemo(() => {
    return matchBreakdowns.reduce((sum, b) => sum + b.matchDuration, 0);
  }, [matchBreakdowns]);

  const playtimePercentage = totalPossibleMins > 0 ? (totalPlayedMins / totalPossibleMins) * 100 : 0;
  const benchPercentage = totalPossibleMins > 0 ? (totalBenchMins / totalPossibleMins) * 100 : 0;
  const outOfSquadPercentage = totalPossibleMins > 0 ? (totalOutOfSquadMins / totalPossibleMins) * 100 : 0;

  const inSquadMatchesCount = useMemo(() => {
    return matchBreakdowns.filter(b => b.statusType !== 'OUT_OF_SQUAD').length;
  }, [matchBreakdowns]);

  const gradedMatches = useMemo(() => {
    return matchBreakdowns.filter(b => b.grade !== undefined);
  }, [matchBreakdowns]);

  const avgGrade = useMemo(() => {
    if (gradedMatches.length === 0) return null;
    const sum = gradedMatches.reduce((s, b) => s + (b.grade || 0), 0);
    return (sum / gradedMatches.length).toFixed(1);
  }, [gradedMatches]);

  const getMatchGradeBadge = (grade: number) => {
    switch (grade) {
      case 1:
        return { label: 'Note 1 (Sehr gut)', style: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
      case 2:
        return { label: 'Note 2 (Gut)', style: 'bg-teal-950 text-teal-300 border-teal-700' };
      case 3:
        return { label: 'Note 3 (Befriedigend)', style: 'bg-sky-950 text-sky-300 border-sky-700' };
      case 4:
        return { label: 'Note 4 (Ausreichend)', style: 'bg-amber-950 text-amber-300 border-amber-700' };
      case 5:
        return { label: 'Note 5 (Mangelhaft)', style: 'bg-orange-950 text-orange-300 border-orange-700' };
      case 6:
        return { label: 'Note 6 (Ungenügend)', style: 'bg-rose-950 text-rose-300 border-rose-700' };
      default:
        return { label: `Note ${grade}`, style: 'bg-slate-900 text-slate-300 border-slate-700' };
    }
  };

  // Modern Donut Chart calculation for Playtime
  const donutSlices = useMemo(() => {
    if (totalPossibleMins === 0) {
      return [{
        key: 'none',
        label: 'Keine Spiele',
        value: 0,
        percentage: 100,
        color: '#334155',
        pathData: ''
      }];
    }

    const segments = [
      {
        key: 'played',
        label: 'Einsatzminuten',
        value: totalPlayedMins,
        percentage: playtimePercentage,
        color: '#10b981' // Emerald
      },
      {
        key: 'bench',
        label: 'Bankspielzeit',
        value: totalBenchMins,
        percentage: benchPercentage,
        color: '#f59e0b' // Amber
      },
      {
        key: 'out',
        label: 'Nicht im Kader',
        value: totalOutOfSquadMins,
        percentage: outOfSquadPercentage,
        color: '#475569' // Slate
      }
    ].filter(s => s.percentage > 0.05);

    const center = 130;
    const radius = 100;
    const innerRadius = 68;
    let currentAngle = -Math.PI / 2;

    if (segments.length === 1) {
      const seg = segments[0];
      const pathData = `M ${center - radius} ${center} A ${radius} ${radius} 0 1 0 ${center + radius} ${center} A ${radius} ${radius} 0 1 0 ${center - radius} ${center} M ${center - innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center + innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center - innerRadius} ${center} Z`;
      return [{ ...seg, pathData }];
    }

    return segments.map(seg => {
      const sliceAngle = (seg.percentage / 100) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

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
  }, [totalPossibleMins, totalPlayedMins, totalBenchMins, totalOutOfSquadMins, playtimePercentage, benchPercentage, outOfSquadPercentage]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all">
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/50 transition select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex-shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span>Spielzeiten</span>
            </h4>
            <p className="text-xs text-slate-400">
              Einsatzminuten, Bankspielzeiten, Kreisdiagramm & Notenverlauf (1–6)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-xl font-bold bg-teal-950/80 text-teal-300 border border-teal-800 font-mono">
            {totalPlayedMins}' Min. / {filteredMatches.length} Spiele
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 border-t border-slate-800/80 space-y-6 animate-in fade-in duration-200">
          {/* FILTER ROW */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-slate-300">Wettkampftyp:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', ...MATCH_TYPES] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMatchStatsTypeFilter(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5",
                    matchStatsTypeFilter === type
                      ? "bg-teal-600 border-teal-500 text-white shadow-md shadow-teal-950"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                  )}
                >
                  {type === 'Pokalspiel' && <Trophy className="w-3 h-3" />}
                  <span>{type === 'ALL' ? 'Alle Spieltypen' : type}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
              <Timer className="w-8 h-8 mx-auto text-slate-600" />
              <div className="text-sm font-bold text-slate-300">Keine Spiele für diesen Torhüter gefunden</div>
              <p className="text-xs text-slate-500">Erfasse Spielzeiten im Orga-Bereich unter „Spielzeiten / Einsätze“.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPIS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Einsatzminuten</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">{totalPlayedMins}'</div>
                  <p className="text-[11px] text-slate-500">
                    {totalPossibleMins > 0 ? `${playtimePercentage.toFixed(0)} % der Spielzeit` : '–'}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Bankspielzeit</span>
                  <div className="text-2xl font-black text-amber-400 font-mono">{totalBenchMins}'</div>
                  <p className="text-[11px] text-slate-500">
                    {benchPercentage.toFixed(0)} % ({inSquadMatchesCount}x im Kader)
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    {totalOutOfSquadMins > 0 ? 'Nicht im Kader' : 'Gesamt möglich'}
                  </span>
                  <div className="text-2xl font-black text-white font-mono">
                    {totalOutOfSquadMins > 0 ? `${totalOutOfSquadMins}'` : `${totalPossibleMins}'`}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {totalOutOfSquadMins > 0 
                      ? `${outOfSquadPercentage.toFixed(0)} % Ausfall/Pause`
                      : `${filteredMatches.length} Spiele (100% im Kader)`}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Notenschnitt</span>
                  <div className="text-2xl font-black text-teal-400 font-mono">
                    {avgGrade ? `Note ${avgGrade}` : '–'}
                  </div>
                  <p className="text-[11px] text-slate-500">{gradedMatches.length} bewertete Einsätze</p>
                </div>
              </div>

              {/* MODERNE SPIELZEIT-VERTEILUNG: KREISDIAGRAMM (DONUT) & LEGENDE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* KREISDIAGRAMM */}
                <div className="lg:col-span-5 bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-inner flex flex-col justify-between">
                  <div className="border-b border-slate-800/80 pb-3 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Kreisdiagramm
                      </span>
                      <h5 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-emerald-400" />
                        <span>Spielzeit-Verteilung & Quote</span>
                      </h5>
                    </div>
                    <p className="text-xs text-slate-400">
                      Verhältnis von aktiver Einsatzzeit, Bankzeit und Nicht im Kader.
                    </p>
                  </div>

                  <div className="py-4 flex flex-col items-center justify-center relative">
                    <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center">
                      <svg viewBox="0 0 260 260" className="w-full h-full">
                        {donutSlices.map(slice => {
                          const isHovered = hoveredSlice === slice.key;
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
                              onMouseEnter={() => setHoveredSlice(slice.key)}
                              onMouseLeave={() => setHoveredSlice(null)}
                            />
                          );
                        })}
                      </svg>

                      {/* CENTER LABEL */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                        {hoveredSlice ? (
                          <>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
                              {donutSlices.find(s => s.key === hoveredSlice)?.label}
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-white">
                              {(donutSlices.find(s => s.key === hoveredSlice)?.percentage || 0).toFixed(0)} %
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">
                              {donutSlices.find(s => s.key === hoveredSlice)?.value}' Minuten
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Einsatzquote
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                              {playtimePercentage.toFixed(0)} %
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {totalPlayedMins}' / {totalPossibleMins}' Min.
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* LEGENDE */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
                      <div
                        onMouseEnter={() => setHoveredSlice('played')}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] cursor-pointer"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-300 font-bold">Einsatz:</span>
                        <span className="text-emerald-400 font-mono font-black">{totalPlayedMins}' ({playtimePercentage.toFixed(0)}%)</span>
                      </div>

                      {totalBenchMins > 0 && (
                        <div
                          onMouseEnter={() => setHoveredSlice('bench')}
                          onMouseLeave={() => setHoveredSlice(null)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] cursor-pointer"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="text-slate-300 font-bold">Bank:</span>
                          <span className="text-amber-400 font-mono font-black">{totalBenchMins}' ({benchPercentage.toFixed(0)}%)</span>
                        </div>
                      )}

                      {totalOutOfSquadMins > 0 && (
                        <div
                          onMouseEnter={() => setHoveredSlice('out')}
                          onMouseLeave={() => setHoveredSlice(null)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] cursor-pointer"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                          <span className="text-slate-300 font-bold">Nicht im Kader:</span>
                          <span className="text-slate-400 font-mono font-black">{totalOutOfSquadMins}' ({outOfSquadPercentage.toFixed(0)}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* NOTENVERLAUF & DETAILS */}
                <div className="lg:col-span-7 bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-inner flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40">
                          Leistungsverlauf
                        </span>
                        <h5 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                          <Activity className="w-4 h-4 text-teal-400" />
                          <span>Notenverlauf der Einsätze</span>
                        </h5>
                      </div>
                      <p className="text-xs text-slate-400">
                        Entwicklung der Spieltagsnoten (1 = Sehr gut bis 6 = Ungenügend).
                      </p>
                    </div>

                    {avgGrade && (
                      <div className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-teal-300">
                        Ø {avgGrade}
                      </div>
                    )}
                  </div>

                  {gradedMatches.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                      Noch keine bewerteten Spiele mit Schulnoten hinterlegt.
                    </div>
                  ) : (
                    /* LINE CHART SVG */
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                      {(() => {
                        const svgHeight = 180;
                        const pointGap = 54;
                        const leftPad = 35;
                        const rightPad = 30;
                        const topPad = 25;
                        const bottomPad = 35;
                        const plotHeight = svgHeight - topPad - bottomPad;
                        const svgWidth = Math.max(leftPad + (gradedMatches.length - 1) * pointGap + rightPad, 420);

                        const points = gradedMatches.map((b, idx) => {
                          const grade = b.grade || 3;
                          const x = leftPad + idx * pointGap;
                          const y = topPad + ((grade - 1) / 5) * plotHeight;
                          return { x, y, grade, match: b.match };
                        });

                        const pathD = points.length > 1
                          ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
                          : '';

                        return (
                          <div style={{ minWidth: svgWidth }} className="relative">
                            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ height: `${svgHeight}px` }}>
                              {/* Horizontal guide lines for grades 1 to 6 */}
                              {[1, 2, 3, 4, 5, 6].map(g => {
                                const y = topPad + ((g - 1) / 5) * plotHeight;
                                return (
                                  <g key={g}>
                                    <line
                                      x1={leftPad}
                                      y1={y}
                                      x2={svgWidth - rightPad}
                                      y2={y}
                                      stroke="#334155"
                                      strokeWidth="1"
                                      strokeDasharray="2,2"
                                      opacity="0.35"
                                    />
                                    <text
                                      x={leftPad - 8}
                                      y={y + 3.5}
                                      fill="#64748b"
                                      fontSize="9.5"
                                      fontWeight="bold"
                                      textAnchor="end"
                                      fontFamily="monospace"
                                    >
                                      {g}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Line connecting points */}
                              {pathD && (
                                <path
                                  d={pathD}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* Data points */}
                              {points.map((p, idx) => {
                                const isHovered = hoveredMatchIdx === idx;
                                return (
                                  <g
                                    key={idx}
                                    onMouseEnter={() => setHoveredMatchIdx(idx)}
                                    onMouseLeave={() => setHoveredMatchIdx(null)}
                                    className="cursor-pointer"
                                  >
                                    <circle
                                      cx={p.x}
                                      cy={p.y}
                                      r={isHovered ? 6.5 : 4.5}
                                      fill="#10b981"
                                      stroke="#022c22"
                                      strokeWidth="2"
                                      className="transition-all"
                                    />
                                    <text
                                      x={p.x}
                                      y={p.y - 8}
                                      fill="#34d399"
                                      fontSize="10"
                                      fontWeight="900"
                                      textAnchor="middle"
                                      fontFamily="monospace"
                                    >
                                      {p.grade}
                                    </text>
                                    <text
                                      x={p.x}
                                      y={svgHeight - 10}
                                      fill="#94a3b8"
                                      fontSize="8.5"
                                      textAnchor="middle"
                                      className="font-mono"
                                    >
                                      {p.match.date.substring(5)}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* MATCH CARDS LIST */}
              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span>Spielberichte & Einsätze ({matchBreakdowns.length})</span>
                </span>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {matchBreakdowns.map(b => {
                    const gradeBadge = b.grade !== undefined ? getMatchGradeBadge(b.grade) : null;

                    return (
                      <div key={b.match.id} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs hover:border-slate-700 transition">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white font-mono">{b.match.date}</span>
                            <span className="text-slate-400">vs. <strong>{b.match.opponent || 'Gegner'}</strong></span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-300">
                              {b.match.matchType || 'Meisterschaft'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {gradeBadge && (
                              <span className={cn("px-2 py-0.5 rounded text-[10.5px] font-bold border", gradeBadge.style)}>
                                {gradeBadge.label}
                              </span>
                            )}
                            
                            {b.statusType === 'FULL_PLAY' && (
                              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {b.playedMins}' Spielzeit
                              </span>
                            )}

                            {b.statusType === 'PARTIAL_PLAY_AND_BENCH' && (
                              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {b.playedMins}' Spielzeit • {b.benchMins}' Bank
                              </span>
                            )}

                            {b.statusType === 'FULL_BENCH' && (
                              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                {b.benchMins}' Bank (Ersatz-TW)
                              </span>
                            )}

                            {b.statusType === 'OUT_OF_SQUAD' && (
                              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
                                Nicht im Kader
                              </span>
                            )}
                          </div>
                        </div>

                        {b.match.notes && (
                          <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                            {b.match.notes}
                          </p>
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
  );
};
