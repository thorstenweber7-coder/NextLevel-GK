import React, { useState, useMemo } from 'react';
import type { TrainingPlan, Exercise } from '../../types';
import { SKILL_DEFINITIONS } from '../../types';
import {
  Sparkles,
  BarChart3,
  Layers,
  Flame,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Award,
  Filter,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { TECHNIQUE_GROUP_CONFIG } from './statsConfig';

interface TechniqueBarChartProps {
  filteredPlans: TrainingPlan[];
  exerciseMap: Map<string, Exercise>;
}

export const TechniqueBarChart: React.FC<TechniqueBarChartProps> = ({
  filteredPlans,
  exerciseMap
}) => {
  const [openQuestion2, setOpenQuestion2] = useState<boolean>(false);
  const [selectedTechGroup, setSelectedTechGroup] = useState<string>('all');
  const [techDisplayMode, setTechDisplayMode] = useState<'all' | 'trainedOnly'>('trainedOnly');
  const [techSortOrder, setTechSortOrder] = useState<'frequency' | 'catalog'>('frequency');
  const [hoveredTechName, setHoveredTechName] = useState<string | null>(null);

  // 30 Standard Catalog Techniques from SKILL_DEFINITIONS (Technik)
  const techniqueStats = useMemo(() => {
    const techDefs = SKILL_DEFINITIONS.Technik || [];
    const allItems: {
      id: string;
      name: string;
      group: string;
      groupConfig: any;
      count: number;
      percentage: number;
      catalogIndex: number;
    }[] = [];

    const countMap: Record<string, number> = {};
    let totalAnalyticDrills = 0;

    // Pre-seed all 30 skills with 0 count
    techDefs.forEach((def, cIdx) => {
      const gConfig = TECHNIQUE_GROUP_CONFIG[def.group || ''] || TECHNIQUE_GROUP_CONFIG['Grundstellungen'];
      countMap[def.name] = 0;
      allItems.push({
        id: def.id,
        name: def.name,
        group: def.group || 'Sonstige',
        groupConfig: gConfig,
        count: 0,
        percentage: 0,
        catalogIndex: cIdx
      });
    });

    // Count occurrences in Phase "Analytisch" across filtered plans
    filteredPlans.forEach(plan => {
      const planPhases = plan.phaseExercises || plan.phases || {};
      const customExercises = plan.customPlanExercises || {};

      Object.entries(planPhases).forEach(([phaseId, exIds]) => {
        const isAnalyticPhase = phaseId.toLowerCase().includes('analytisch') || phaseId.toLowerCase().includes('technik');
        (exIds || []).forEach(exId => {
          const exercise = customExercises[exId] || exerciseMap.get(exId);
          if (!exercise) return;

          const isAnalyticCategory = exercise.category === 'Analytisch';
          if (isAnalyticPhase || isAnalyticCategory) {
            totalAnalyticDrills += 1;
            const focus = (exercise.technik || '').trim();
            if (focus && countMap[focus] !== undefined) {
              countMap[focus] += 1;
            } else if (focus) {
              const matched = allItems.find(i => i.name.toLowerCase() === focus.toLowerCase());
              if (matched) {
                countMap[matched.name] += 1;
              }
            }
          }
        });
      });
    });

    // Populate counts and calculate percentages
    allItems.forEach(item => {
      item.count = countMap[item.name] || 0;
      item.percentage = totalAnalyticDrills > 0 ? (item.count / totalAnalyticDrills) * 100 : 0;
    });

    const trainedCount = allItems.filter(i => i.count > 0).length;
    const maxCount = Math.max(...allItems.map(i => i.count), 1);
    const sortedByCount = [...allItems].sort((a, b) => b.count - a.count);
    const topTechnique = sortedByCount.find(i => i.count > 0) || null;

    // Group Aggregations
    const groupAggregates: Record<string, { count: number; totalTechniques: number; trainedTechniques: number; config: any }> = {};
    Object.entries(TECHNIQUE_GROUP_CONFIG).forEach(([gKey, conf]) => {
      const groupItems = allItems.filter(i => i.group === gKey);
      const gCount = groupItems.reduce((sum, item) => sum + item.count, 0);
      const gTrained = groupItems.filter(item => item.count > 0).length;
      groupAggregates[gKey] = {
        count: gCount,
        totalTechniques: groupItems.length,
        trainedTechniques: gTrained,
        config: conf
      };
    });

    const topGroupEntry = Object.entries(groupAggregates).sort((a, b) => b[1].count - a[1].count)[0];
    const topGroup = topGroupEntry && topGroupEntry[1].count > 0 ? { name: topGroupEntry[0], ...topGroupEntry[1] } : null;

    return {
      items: allItems,
      totalAnalyticDrills,
      trainedCount,
      maxCount,
      sortedByCount,
      topTechnique,
      groupAggregates,
      topGroup
    };
  }, [filteredPlans, exerciseMap]);

  // Filtered and Sorted Technique List for Column Chart & Matrix
  const displayedTechniques = useMemo(() => {
    let list = [...techniqueStats.items];

    if (selectedTechGroup !== 'all') {
      list = list.filter(item => item.group === selectedTechGroup);
    }

    if (techDisplayMode === 'trainedOnly') {
      list = list.filter(item => item.count > 0);
    }

    if (techSortOrder === 'frequency') {
      list.sort((a, b) => b.count - a.count);
    } else {
      list.sort((a, b) => a.catalogIndex - b.catalogIndex);
    }

    return list;
  }, [techniqueStats, selectedTechGroup, techDisplayMode, techSortOrder]);

  return (
    <div className="space-y-6">
      {/* QUESTION 2 BANNER */}
      <div
        onClick={() => setOpenQuestion2(prev => !prev)}
        className={cn(
          "relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/90 via-slate-900 to-slate-950 border-2 p-5 sm:p-7 shadow-2xl cursor-pointer select-none transition-all group",
          openQuestion2
            ? "border-purple-500/60 shadow-purple-950/40"
            : "border-slate-800 hover:border-purple-500/50 hover:scale-[1.003]"
        )}
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-500/30 to-purple-600/10 text-purple-300 border border-purple-500/50 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-7 h-7 sm:w-8 h-8" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Frage 2 von 4
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Isolierte Technikschulung • Phase Analytisch</span>
                </div>
              </div>

              <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug tracking-tight group-hover:text-purple-200 transition-colors">
                „Wie häufig trainiere ich welche Technik isoliert?“
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
              {openQuestion2 ? 'Einklappen' : 'Ausklappen'}
            </span>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-slate-300 group-hover:text-white group-hover:border-purple-500/60 transition-all shadow-md">
              {openQuestion2 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION 2 CONTENT */}
      {openQuestion2 && (
        <div className="space-y-6 animate-fadeIn">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase tracking-wider text-[10.5px]">Isolierte Drills</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {techniqueStats.totalAnalyticDrills}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                in Phase „Analytisch“
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase tracking-wider text-[10.5px]">Technik-Abdeckung</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {techniqueStats.trainedCount} <span className="text-xs font-bold text-slate-400">/ 30</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {((techniqueStats.trainedCount / 30) * 100).toFixed(0)} % aller Katalog-Techniken
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase tracking-wider text-[10.5px]">Top-Torwarttechnik</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-purple-300 truncate" title={techniqueStats.topTechnique?.name || '–'}>
                {techniqueStats.topTechnique ? techniqueStats.topTechnique.name : '–'}
              </div>
              <div className="text-[11px] text-purple-400 font-bold font-mono">
                {techniqueStats.topTechnique ? `${techniqueStats.topTechnique.count}x trainiert (${techniqueStats.topTechnique.percentage.toFixed(1)} %)` : 'Noch keine Daten'}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase tracking-wider text-[10.5px]">Führende Gruppe</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 truncate">
                {techniqueStats.topGroup ? techniqueStats.topGroup.name : '–'}
              </div>
              <div className="text-[11px] text-slate-400 font-bold">
                {techniqueStats.topGroup ? `${techniqueStats.topGroup.count} Drills (${techniqueStats.topGroup.trainedTechniques}/${techniqueStats.topGroup.totalTechniques} Techniken)` : 'Noch keine Daten'}
              </div>
            </div>
          </div>

          {/* FILTER & VIEW CONTROLS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <Filter className="w-4 h-4 text-purple-400" />
                <span>Filter für Säulendiagramm & Technik-Matrix</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTechDisplayMode('all')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer",
                      techDisplayMode === 'all'
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Alle 30 Techniken
                  </button>
                  <button
                    type="button"
                    onClick={() => setTechDisplayMode('trainedOnly')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer",
                      techDisplayMode === 'trainedOnly'
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Nur trainierte ({techniqueStats.trainedCount})
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTechSortOrder('frequency')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer",
                      techSortOrder === 'frequency'
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Nach Häufigkeit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTechSortOrder('catalog')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer",
                      techSortOrder === 'catalog'
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Katalog-Reihenfolge</span>
                  </button>
                </div>
              </div>
            </div>

            {/* GROUP PILLS */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedTechGroup('all')}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold text-[11px] transition border cursor-pointer",
                  selectedTechGroup === 'all'
                    ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                )}
              >
                Alle 6 Gruppen ({techniqueStats.items.length})
              </button>

              {Object.entries(TECHNIQUE_GROUP_CONFIG).map(([gKey, conf]) => {
                const isSelected = selectedTechGroup === gKey;
                const gData = techniqueStats.groupAggregates[gKey];
                const count = gData ? gData.count : 0;

                return (
                  <button
                    key={gKey}
                    type="button"
                    onClick={() => setSelectedTechGroup(gKey)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-bold text-[11px] transition border cursor-pointer flex items-center gap-1.5",
                      isSelected
                        ? "bg-slate-800 text-white border-purple-500 shadow-sm"
                        : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-slate-300"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.hex }} />
                    <span>{conf.label}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-800">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SÄULENDIAGRAMM (BAR CHART) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h4 className="font-extrabold text-white text-sm sm:text-base">
                  Säulendiagramm: Verteilung der isolierten Torwarttechniken
                </h4>
                <p className="text-xs text-slate-400">
                  Häufigkeit der durchgeführten Techniken in der methodisch-analytischen Trainingsphase.
                </p>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {displayedTechniques.length} Techniken in der Ansicht
              </div>
            </div>

            {displayedTechniques.length === 0 ? (
              <div className="p-10 text-center space-y-2 bg-slate-950 rounded-2xl border border-slate-800">
                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="font-bold text-white text-sm">Keine Techniken für diese Filterauswahl gefunden</div>
                <div className="text-xs text-slate-400">Wähle „Alle 30 Techniken“ oder setze den Gruppenfilter zurück.</div>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4 pt-2 -mx-2 px-2 custom-scrollbar">
                {(() => {
                  const chartHeight = 230;
                  const barWidth = 26;
                  const gap = 16;
                  const leftPadding = 45;
                  const rightPadding = 30;
                  const bottomPadding = 95;
                  const topPadding = 35;
                  const totalPlotHeight = chartHeight - topPadding - bottomPadding;
                  const totalWidth = Math.max(leftPadding + displayedTechniques.length * (barWidth + gap) + rightPadding, 720);

                  const maxCount = techniqueStats.maxCount;
                  const yLevels = [
                    { label: `${maxCount}`, y: topPadding },
                    { label: `${Math.round(maxCount * 0.75)}`, y: topPadding + totalPlotHeight * 0.25 },
                    { label: `${Math.round(maxCount * 0.5)}`, y: topPadding + totalPlotHeight * 0.5 },
                    { label: `${Math.round(maxCount * 0.25)}`, y: topPadding + totalPlotHeight * 0.75 },
                    { label: '0', y: topPadding + totalPlotHeight }
                  ];

                  return (
                    <div style={{ minWidth: totalWidth }} className="relative">
                      <svg
                        viewBox={`0 0 ${totalWidth} ${chartHeight}`}
                        className="w-full"
                        style={{ height: `${chartHeight}px` }}
                      >
                        {yLevels.map((lvl, idx) => (
                          <g key={idx}>
                            <line
                              x1={leftPadding}
                              y1={lvl.y}
                              x2={totalWidth - rightPadding}
                              y2={lvl.y}
                              stroke="#334155"
                              strokeWidth="1"
                              strokeDasharray={idx === yLevels.length - 1 ? undefined : "3,3"}
                              opacity={idx === yLevels.length - 1 ? 0.8 : 0.35}
                            />
                            <text
                              x={leftPadding - 8}
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

                        {displayedTechniques.map((item, idx) => {
                          const x = leftPadding + idx * (barWidth + gap);
                          const barHeight = maxCount > 0 ? (item.count / maxCount) * totalPlotHeight : 0;
                          const y = topPadding + totalPlotHeight - barHeight;
                          const isHovered = hoveredTechName === item.name;
                          const effectiveColor = item.groupConfig.hex;

                          return (
                            <g
                              key={item.id || item.name}
                              className="cursor-pointer transition-all duration-200"
                              onMouseEnter={() => setHoveredTechName(item.name)}
                              onMouseLeave={() => setHoveredTechName(null)}
                            >
                              {isHovered && (
                                <rect
                                  x={x - 5}
                                  y={topPadding - 10}
                                  width={barWidth + 10}
                                  height={totalPlotHeight + 20}
                                  fill="white"
                                  opacity="0.05"
                                  rx="8"
                                />
                              )}

                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={Math.max(barHeight, item.count > 0 ? 3 : 1)}
                                fill={item.count > 0 ? effectiveColor : "#334155"}
                                opacity={item.count > 0 ? (isHovered ? 1 : 0.88) : 0.4}
                                rx="4"
                              />

                              {item.count > 0 && (
                                <text
                                  x={x + barWidth / 2}
                                  y={y - 6}
                                  fill={effectiveColor}
                                  fontSize="10"
                                  fontWeight="900"
                                  textAnchor="middle"
                                  fontFamily="monospace"
                                >
                                  {item.count}
                                </text>
                              )}

                              <g transform={`translate(${x + barWidth / 2}, ${topPadding + totalPlotHeight + 12}) rotate(-45)`}>
                                <text
                                  x="0"
                                  y="0"
                                  fill={isHovered ? "#f8fafc" : "#94a3b8"}
                                  fontSize="9.5"
                                  fontWeight={isHovered ? "bold" : "normal"}
                                  textAnchor="end"
                                >
                                  {item.name}
                                </text>
                              </g>
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
      )}
    </div>
  );
};
