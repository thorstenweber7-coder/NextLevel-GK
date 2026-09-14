import React, { useState, useMemo } from 'react';
import type { TrainingPlan, Exercise } from '../../types';
import { ALL_MATERIALS } from '../../types';
import { 
  Boxes, 
  Sparkles, 
  ChevronUp, 
  ChevronDown, 
  BarChart3, 
  Award, 
  Flame, 
  Layers, 
  AlertCircle,
  Grid3X3,
  Search,
  ArrowUpDown,
  Filter,
  Info
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { getMaterialConfig, getThemeColor } from './statsConfig';

interface MaterialHeatmapProps {
  filteredPlans: TrainingPlan[];
  exerciseMap: Map<string, Exercise>;
}

export const MaterialHeatmap: React.FC<MaterialHeatmapProps> = ({
  filteredPlans,
  exerciseMap
}) => {
  // Default to collapsed as requested by user
  const [openQuestion4, setOpenQuestion4] = useState<boolean>(false);
  const [openBarChart, setOpenBarChart] = useState<boolean>(false);
  const [openMatrix, setOpenMatrix] = useState<boolean>(false);
  const [materialChartMetric, setMaterialChartMetric] = useState<'quote' | 'absolute'>('quote');
  const [materialSortOrder, setMaterialSortOrder] = useState<'value' | 'alphabetical'>('value');
  const [materialFilterChip, setMaterialFilterChip] = useState<'all' | 'used' | 'top5' | 'unused'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredMaterialName, setHoveredMaterialName] = useState<string | null>(null);
  const [inspectedMaterial, setInspectedMaterial] = useState<string | null>(null);

  // Matrix Interactive states
  const [hoveredMatrixCell, setHoveredMatrixCell] = useState<{ theme: string; material: string } | null>(null);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ theme: string; material: string } | null>(null);
  const [hoveredThemeRow, setHoveredThemeRow] = useState<string | null>(null);
  const [hoveredMaterialCol, setHoveredMaterialCol] = useState<string | null>(null);

  // Aggregated Material Stats & Heatmap Matrix
  const materialStats = useMemo(() => {
    const totalPlans = filteredPlans.length;
    const materialPlanCount: Record<string, number> = {};
    const materialExerciseCount: Record<string, number> = {};
    const themeMaterialMatrix: Record<string, Record<string, number>> = {};
    const themeExerciseTotalCount: Record<string, number> = {};
    const materialThemeBreakdown: Record<string, Record<string, number>> = {};
    const allThemesSet = new Set<string>();

    ALL_MATERIALS.forEach(m => {
      materialPlanCount[m] = 0;
      materialExerciseCount[m] = 0;
      materialThemeBreakdown[m] = {};
    });

    filteredPlans.forEach(plan => {
      const theme = (plan.title || plan.planTitle || 'Sonstiges').trim();
      allThemesSet.add(theme);
      if (!themeMaterialMatrix[theme]) {
        themeMaterialMatrix[theme] = {};
        ALL_MATERIALS.forEach(m => { themeMaterialMatrix[theme][m] = 0; });
        themeExerciseTotalCount[theme] = 0;
      }

      const planUsedMaterials = new Set<string>();
      const planPhases = plan.phaseExercises || plan.phases || {};
      const customExercises = plan.customPlanExercises || {};

      Object.values(planPhases).forEach(exIds => {
        (exIds || []).forEach(exId => {
          const exercise = customExercises[exId] || exerciseMap.get(exId);
          if (!exercise) return;
          themeExerciseTotalCount[theme] = (themeExerciseTotalCount[theme] || 0) + 1;

          if (!exercise.materials) return;

          exercise.materials.forEach(mat => {
            const trimmedMat = mat.trim();
            if (materialPlanCount[trimmedMat] !== undefined) {
              planUsedMaterials.add(trimmedMat);
              materialExerciseCount[trimmedMat] += 1;
              themeMaterialMatrix[theme][trimmedMat] = (themeMaterialMatrix[theme][trimmedMat] || 0) + 1;
              materialThemeBreakdown[trimmedMat][theme] = (materialThemeBreakdown[trimmedMat][theme] || 0) + 1;
            }
          });
        });
      });

      planUsedMaterials.forEach(mat => {
        materialPlanCount[mat] += 1;
      });
    });

    const items = ALL_MATERIALS.map(name => {
      const planCount = materialPlanCount[name] || 0;
      const exerciseCount = materialExerciseCount[name] || 0;
      const quotePct = totalPlans > 0 ? (planCount / totalPlans) * 100 : 0;
      const config = getMaterialConfig(name);
      const themeUsage = materialThemeBreakdown[name] || {};

      return {
        name,
        planCount,
        exerciseCount,
        quotePct,
        config,
        themeUsage
      };
    });

    const usedMaterialsCount = items.filter(i => i.planCount > 0).length;
    const unusedMaterialsCount = items.length - usedMaterialsCount;
    const topMaterial = [...items].sort((a, b) => b.quotePct - a.quotePct).find(i => i.planCount > 0) || null;

    let maxComboCount = 0;
    let topCombo = { theme: '', material: '', count: 0 };
    Object.entries(themeMaterialMatrix).forEach(([th, mats]) => {
      Object.entries(mats).forEach(([m, count]) => {
        if (count > maxComboCount) {
          maxComboCount = count;
          topCombo = { theme: th, material: m, count };
        }
      });
    });

    const activeThemes = Array.from(allThemesSet).sort();

    // Column totals across all themes
    const materialColumnTotals: Record<string, number> = {};
    ALL_MATERIALS.forEach(m => {
      materialColumnTotals[m] = activeThemes.reduce((sum, th) => sum + (themeMaterialMatrix[th]?.[m] || 0), 0);
    });

    return {
      items,
      totalPlans,
      usedMaterialsCount,
      unusedMaterialsCount,
      topMaterial,
      topCombo,
      themeMaterialMatrix,
      themeExerciseTotalCount,
      materialColumnTotals,
      activeThemes,
      maxComboCount
    };
  }, [filteredPlans, exerciseMap]);

  // Filter and sort items for the horizontal bar chart
  const displayedBarItems = useMemo(() => {
    let list = [...materialStats.items];

    // Filter chip
    if (materialFilterChip === 'used') {
      list = list.filter(i => i.planCount > 0);
    } else if (materialFilterChip === 'unused') {
      list = list.filter(i => i.planCount === 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }

    // Sort order
    if (materialSortOrder === 'value') {
      list.sort((a, b) => {
        return materialChartMetric === 'quote' 
          ? b.quotePct - a.quotePct 
          : b.exerciseCount - a.exerciseCount;
      });
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }

    if (materialFilterChip === 'top5') {
      list = list.slice(0, 5);
    }

    return list;
  }, [materialStats.items, materialFilterChip, searchQuery, materialSortOrder, materialChartMetric]);

  return (
    <div className="space-y-6">
      {/* QUESTION 4 BANNER */}
      <div
        onClick={() => setOpenQuestion4(prev => !prev)}
        className={cn(
          "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border-2 p-5 sm:p-7 shadow-2xl cursor-pointer select-none transition-all group",
          openQuestion4
            ? "border-emerald-500/60 shadow-emerald-950/40"
            : "border-slate-800 hover:border-emerald-500/50 hover:scale-[1.003]"
        )}
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/10 text-emerald-300 border border-emerald-500/50 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
              <Boxes className="w-7 h-7 sm:w-8 h-8" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Frage 4 von 4
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Equipment-Tracking • Nutzungsquote & Methodik-Matrix</span>
                </div>
              </div>

              <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug tracking-tight group-hover:text-emerald-200 transition-colors">
                „Welche Materialien nutze ich und wofür?“
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
              {openQuestion4 ? 'Einklappen' : 'Ausklappen'}
            </span>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-slate-300 group-hover:text-white group-hover:border-emerald-500/60 transition-all shadow-md">
              {openQuestion4 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION 4 CONTENT */}
      {openQuestion4 && (
        <div className="space-y-6 animate-fadeIn">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase tracking-wider text-[10.5px]">Meistgenutztes Tool</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-300 truncate">
                {materialStats.topMaterial ? materialStats.topMaterial.name : '–'}
              </div>
              <div className="text-[11px] text-slate-400 font-bold">
                {materialStats.topMaterial ? `In ${materialStats.topMaterial.quotePct.toFixed(0)} % aller Einheiten im Einsatz` : 'Noch keine Daten'}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase tracking-wider text-[10.5px]">Material-Vielfalt</span>
                <Boxes className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
                {materialStats.usedMaterialsCount} <span className="text-xs font-bold text-slate-400">/ {materialStats.items.length}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                verschiedene Tools aktiv genutzt
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase tracking-wider text-[10.5px]">Top-Kombination</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 truncate" title={`${materialStats.topCombo.material} × ${materialStats.topCombo.theme}`}>
                {materialStats.topCombo.count > 0 ? `${materialStats.topCombo.material} × ${materialStats.topCombo.theme}` : '–'}
              </div>
              <div className="text-[11px] text-amber-400 font-bold font-mono">
                {materialStats.topCombo.count > 0 ? `${materialStats.topCombo.count}x gemeinsam eingesetzt` : 'Noch keine Daten'}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="uppercase tracking-wider text-[10.5px]">Gesamteinsätze</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {materialStats.items.reduce((sum, i) => sum + i.exerciseCount, 0)}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                in allen Übungen dokumentiert
              </div>
            </div>
          </div>

          {/* 1. INTERAKTIVES HORIZONTALES BALKENDIAGRAMM */}
          <div className={cn(
            "bg-slate-900 border rounded-3xl transition-all shadow-xl overflow-hidden",
            openBarChart ? "border-slate-800" : "border-slate-800/80 hover:border-emerald-500/40"
          )}>
            {/* CARD HEADER (Clickable to toggle) */}
            <div
              onClick={() => setOpenBarChart(prev => !prev)}
              className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none group"
            >
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Horizontales Balkendiagramm: Rangliste nach Nutzungsquote</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Interaktive Übersicht über Häufigkeit, Nutzungsanteil und thematische Schwerpunkte pro Equipment.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
                <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                  {openBarChart ? 'Einklappen' : 'Ausklappen'}
                </span>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-white group-hover:border-emerald-500/50 transition-all">
                  {openBarChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* EXPANDED CONTENT */}
            {openBarChart && (
              <div className="p-5 sm:p-7 pt-0 border-t border-slate-800/80 space-y-5 animate-fadeIn">
                {/* CONTROLS ROW */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Ansichtsoptionen & Metriken
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* METRIC TOGGLE */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMaterialChartMetric('quote')}
                        className={cn(
                          "px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer",
                          materialChartMetric === 'quote'
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        Nutzungsquote (% aller TE)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialChartMetric('absolute')}
                        className={cn(
                          "px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer",
                          materialChartMetric === 'absolute'
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        Absolute Einsätze (Übungen)
                      </button>
                    </div>

                    {/* SORT TOGGLE */}
                    <button
                      type="button"
                      onClick={() => setMaterialSortOrder(prev => prev === 'value' ? 'alphabetical' : 'value')}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl font-bold text-[11px] text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                      title="Sortierung umschalten"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{materialSortOrder === 'value' ? 'Nach Häufigkeit' : 'Alphabetisch'}</span>
                    </button>
                  </div>
                </div>

                {/* FILTER CHIPS & SEARCH */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                      <Filter className="w-3 h-3 text-emerald-400" />
                      <span>Filter:</span>
                    </span>
                    {[
                      { id: 'all', label: 'Alle', count: materialStats.items.length },
                      { id: 'used', label: 'Genutzt', count: materialStats.usedMaterialsCount },
                      { id: 'top5', label: 'Top 5', count: 5 },
                      { id: 'unused', label: 'Ungenutzt', count: materialStats.unusedMaterialsCount }
                    ].map(chip => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setMaterialFilterChip(chip.id as any)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5",
                          materialFilterChip === chip.id
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <span>{chip.label}</span>
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-black/30 font-mono">
                          {chip.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* SEARCH INPUT */}
                  <div className="relative min-w-[200px] flex-grow sm:flex-grow-0">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Material suchen..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {materialStats.totalPlans === 0 ? (
                  <div className="p-10 text-center space-y-2 bg-slate-950 rounded-2xl border border-slate-800">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="font-bold text-white text-sm">Keine Einheiten vorhanden</div>
                    <div className="text-xs text-slate-400">Erstelle Einheiten mit Materialien, um Auswertungen zu sehen.</div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayedBarItems.map(item => {
                      const isHovered = hoveredMaterialName === item.name;
                      const isInspected = inspectedMaterial === item.name;
                      const maxExerciseVal = Math.max(...materialStats.items.map(i => i.exerciseCount), 1);
                      const widthPct = materialChartMetric === 'quote' 
                        ? item.quotePct 
                        : (item.exerciseCount / maxExerciseVal) * 100;

                      const topThemesForMat = Object.entries(item.themeUsage)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3);

                      return (
                        <div
                          key={item.name}
                          onMouseEnter={() => setHoveredMaterialName(item.name)}
                          onMouseLeave={() => setHoveredMaterialName(null)}
                          onClick={() => setInspectedMaterial(prev => prev === item.name ? null : item.name)}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-2",
                            isInspected
                              ? "bg-slate-850/90 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400"
                              : isHovered
                              ? "bg-slate-850/80 border-emerald-500/60 shadow-md shadow-slate-950 scale-[1.006]"
                              : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
                          )}
                        >
                          <div className="flex items-center justify-between text-xs gap-3">
                            <div className="flex items-center gap-2.5 font-extrabold text-slate-200 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: item.config.hex }}
                              />
                              <span className="truncate">{item.name}</span>
                              {item.planCount > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                                  {item.planCount} TE
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 font-mono font-bold flex-shrink-0">
                              <span className="text-slate-400 text-[11px]">
                                {item.exerciseCount} Übungen
                              </span>
                              <span className="text-emerald-400 text-xs font-black min-w-[56px] text-right">
                                {materialChartMetric === 'quote' ? `${item.quotePct.toFixed(1)} %` : `${item.exerciseCount}x`}
                              </span>
                            </div>
                          </div>

                          {/* MODERN INTERACTIVE PROGRESS BAR */}
                          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800/80 relative">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out relative"
                              style={{
                                width: `${Math.max(widthPct, item.planCount > 0 ? 3 : 0)}%`,
                                backgroundColor: item.config.hex,
                                boxShadow: isHovered || isInspected ? `0 0 10px ${item.config.hex}` : 'none'
                              }}
                            />
                          </div>

                          {/* EXPANDED INLINE INSPECTOR ON CLICK */}
                          {isInspected && (
                            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
                              <div className="flex items-center gap-2 text-slate-300">
                                <Info className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="font-bold text-[11px]">Top-Einsatzgebiete:</span>
                                {topThemesForMat.length === 0 ? (
                                  <span className="text-slate-500 text-[11px]">Noch keine thematischen Einsätze</span>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {topThemesForMat.map(([th, cnt]) => (
                                      <span key={th} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10.5px] font-mono text-cyan-300">
                                        {th}: <strong>{cnt}x</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 italic">
                                Klicke erneut zum Schließen
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. MODERNISIERTE METHODIK-MATRIX: MATERIALIEN × THEMEN-HEATMAP */}
          {materialStats.activeThemes.length > 0 && (
            <div className={cn(
              "bg-slate-900 border rounded-3xl transition-all shadow-xl overflow-hidden",
              openMatrix ? "border-slate-800" : "border-slate-800/80 hover:border-cyan-500/40"
            )}>
              {/* MATRIX HEADER (Clickable to toggle) */}
              <div
                onClick={() => setOpenMatrix(prev => !prev)}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none group"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Methodik-Matrix
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 group-hover:text-cyan-300 transition-colors">
                      <Grid3X3 className="w-4 h-4 text-cyan-400" />
                      <span>2. Methodik-Matrix: Material × Themenschwerpunkt</span>
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Kreuzanalyse zwischen Trainingsschwerpunkten und genutztem Equipment. Klicke oder fahre über ein Feld für Details.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                    {openMatrix ? 'Einklappen' : 'Ausklappen'}
                  </span>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-white group-hover:border-cyan-500/50 transition-all">
                    {openMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* EXPANDED CONTENT */}
              {openMatrix && (
                <div className="p-5 sm:p-7 pt-0 border-t border-slate-800/80 space-y-5 animate-fadeIn">
                  {/* MATRIX LEGEND ROW */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-b border-slate-800 pb-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Matrix-Legende
                    </span>
                    <div className="flex items-center gap-2 text-xs bg-slate-950/80 px-3.5 py-1.5 rounded-2xl border border-slate-800 flex-shrink-0">
                      <span className="text-[10.5px] font-bold text-slate-400 mr-1">Intensität:</span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-md bg-slate-900/60 border border-slate-800 inline-block" />
                          <span className="text-slate-500">0</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-md bg-emerald-950/80 border border-emerald-800/60 inline-block" />
                          <span className="text-emerald-400">1–2</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-md bg-emerald-600/40 border border-emerald-500/70 inline-block" />
                          <span className="text-emerald-300">3–5</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 inline-block shadow-sm shadow-emerald-500/40" />
                          <span className="text-teal-200 font-bold">6+</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MODERN MATRIX GRID */}
                  <div className="overflow-x-auto custom-scrollbar pb-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 shadow-inner">
                    <table className="w-full text-xs text-left border-collapse min-w-[760px]">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/80">
                          <th className="py-3 px-4 font-black text-slate-300 uppercase tracking-wider text-[11px] sticky left-0 bg-slate-900 z-20 shadow-md">
                            Themenschwerpunkt
                          </th>
                          {ALL_MATERIALS.map(m => {
                            const mConfig = getMaterialConfig(m);
                            const isColActive = hoveredMaterialCol === m || hoveredMatrixCell?.material === m;
                            return (
                              <th
                                key={m}
                                onMouseEnter={() => setHoveredMaterialCol(m)}
                                onMouseLeave={() => setHoveredMaterialCol(null)}
                                className={cn(
                                  "py-3 px-2 text-center font-bold text-[10.5px] whitespace-nowrap transition cursor-pointer border-l border-slate-800/40",
                                  isColActive ? "bg-slate-800/80 text-white" : "text-slate-400 hover:text-slate-200"
                                )}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ backgroundColor: mConfig.hex }}
                                  />
                                  <span className="truncate max-w-[70px]">{m}</span>
                                </div>
                              </th>
                            );
                          })}
                          <th className="py-3 px-3 text-center font-black text-slate-300 uppercase text-[10px] bg-slate-900/90 border-l border-slate-800">
                            Σ Thema
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialStats.activeThemes.map((th, rIdx) => {
                          const themeColor = getThemeColor(th, rIdx);
                          const isRowActive = hoveredThemeRow === th || hoveredMatrixCell?.theme === th;
                          const rowTotal = ALL_MATERIALS.reduce((sum, m) => sum + (materialStats.themeMaterialMatrix[th]?.[m] || 0), 0);

                          return (
                            <tr
                              key={th}
                              onMouseEnter={() => setHoveredThemeRow(th)}
                              onMouseLeave={() => setHoveredThemeRow(null)}
                              className={cn(
                                "border-b border-slate-800/50 transition-colors",
                                isRowActive ? "bg-slate-855/90" : "hover:bg-slate-900/60"
                              )}
                            >
                              {/* THEME ROW HEADER */}
                              <td className="py-3 px-4 font-bold text-slate-200 sticky left-0 bg-slate-950 z-10 border-r border-slate-800/60 shadow-md">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: themeColor.hex }}
                                  />
                                  <span className="truncate max-w-[170px] font-extrabold" title={th}>
                                    {th}
                                  </span>
                                </div>
                              </td>

                              {/* CELLS */}
                              {ALL_MATERIALS.map(m => {
                                const count = materialStats.themeMaterialMatrix[th]?.[m] || 0;
                                const isCellHovered = hoveredMatrixCell?.theme === th && hoveredMatrixCell?.material === m;
                                const isSelected = selectedHeatmapCell?.theme === th && selectedHeatmapCell?.material === m;
                                const isColHovered = hoveredMaterialCol === m;

                                return (
                                  <td
                                    key={m}
                                    onMouseEnter={() => setHoveredMatrixCell({ theme: th, material: m })}
                                    onMouseLeave={() => setHoveredMatrixCell(null)}
                                    onClick={() => setSelectedHeatmapCell(count > 0 ? { theme: th, material: m } : null)}
                                    className={cn(
                                      "py-2 px-1 text-center transition-all cursor-pointer border-l border-slate-800/30",
                                      isColHovered ? "bg-slate-850/40" : ""
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "mx-auto w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-[11px] transition-all duration-200",
                                        count === 0 && "bg-slate-900/30 text-slate-700 hover:text-slate-400 hover:bg-slate-900",
                                        count >= 1 && count <= 2 && "bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 hover:scale-110 shadow-sm",
                                        count >= 3 && count <= 5 && "bg-emerald-600/30 text-emerald-200 border border-emerald-500/70 font-black hover:scale-110 shadow-md shadow-emerald-950",
                                        count >= 6 && "bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/40 ring-1 ring-emerald-300 hover:scale-115",
                                        isCellHovered && "ring-2 ring-cyan-400 z-20 scale-115 shadow-xl",
                                        isSelected && "ring-2 ring-white z-20 scale-115"
                                      )}
                                    >
                                      {count > 0 ? count : '·'}
                                    </div>
                                  </td>
                                );
                              })}

                              {/* ROW TOTAL */}
                              <td className="py-2 px-3 text-center font-mono font-black text-slate-300 bg-slate-950/80 border-l border-slate-800 text-xs">
                                {rowTotal}
                              </td>
                            </tr>
                          );
                        })}

                        {/* COLUMN TOTALS ROW (BOTTOM) */}
                        <tr className="bg-slate-900/90 font-bold border-t-2 border-slate-800">
                          <td className="py-3 px-4 font-black text-slate-300 uppercase text-[10.5px] sticky left-0 bg-slate-900 z-10">
                            Σ Material
                          </td>
                          {ALL_MATERIALS.map(m => {
                            const totalForMat = materialStats.materialColumnTotals[m] || 0;
                            return (
                              <td key={m} className="py-2.5 px-1 text-center font-mono font-black text-xs text-emerald-400 border-l border-slate-800/50">
                                {totalForMat}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-center font-mono font-black text-xs text-white bg-slate-900 border-l border-slate-800">
                            {Object.values(materialStats.materialColumnTotals).reduce((a, b) => a + b, 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* LIVE FLOATING INSPECTION BANNER (PLACED UNDER THE TABLE) */}
                  {(hoveredMatrixCell || selectedHeatmapCell) && (() => {
                    const active = selectedHeatmapCell || hoveredMatrixCell;
                    if (!active) return null;
                    const count = materialStats.themeMaterialMatrix[active.theme]?.[active.material] || 0;
                    const themeTotalEx = materialStats.themeExerciseTotalCount[active.theme] || 0;
                    const pctOfTheme = themeTotalEx > 0 ? ((count / themeTotalEx) * 100).toFixed(0) : '0';

                    return (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-fadeIn">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            <Grid3X3 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-white flex items-center gap-2">
                              <span className="text-cyan-300">{active.material}</span>
                              <span className="text-slate-500">×</span>
                              <span className="text-emerald-300">{active.theme}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {count > 0 
                                ? `${count}-mal eingesetzt in diesem Schwerpunkt (${pctOfTheme} % aller Übungen zum Thema)`
                                : 'Bislang nicht für dieses Thema eingesetzt'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 font-mono font-black text-xs">
                            {count} Einsätze
                          </span>
                          {selectedHeatmapCell && (
                            <button
                              type="button"
                              onClick={() => setSelectedHeatmapCell(null)}
                              className="text-[11px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                            >
                              Zurücksetzen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
