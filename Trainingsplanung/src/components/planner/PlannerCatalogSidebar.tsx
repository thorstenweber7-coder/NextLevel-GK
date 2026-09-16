import React, { useState } from 'react';
import type { 
  Exercise, 
  PlannerCatalogTab, 
  AgeGroup 
} from '../../types';
import { 
  PLANNER_CATALOG_TABS, 
  CATEGORY_COLORS, 
  AGE_GROUPS, 
  ALL_MATERIALS, 
  FOCUS_SCHWERPUNKT_OPTIONS, 
  SITUATIVE_SCHWERPUNKTE, 
  WARMUP_HAUPTSCHWERPUNKTE, 
  SKILL_DEFINITIONS,
  METHODISCHE_REIHE_LABELS,
  PERIODIZATION_TOPICS,
  ATHLETISCHER_ENTWICKLUNGSREIZ_OPTIONS
} from '../../types';
import { 
  Filter, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Star, 
  User, 
  Globe, 
  Eye, 
  GripVertical, 
  Clock, 
  Users, 
  Package
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PlannerCatalogSidebarProps {
  availableKeepers: number;
  onOpenEditorForNew?: () => void;
  // Catalog tab & search
  activeCatalogTab: PlannerCatalogTab;
  setActiveCatalogTab: (tab: PlannerCatalogTab) => void;
  catalogSearch: string;
  setCatalogSearch: (search: string) => void;
  // Scope filter
  scopeFilter: 'ALL' | 'MINE' | 'CLUB' | 'PUBLISHED' | 'FAVORITES';
  setScopeFilter: (scope: 'ALL' | 'MINE' | 'CLUB' | 'PUBLISHED' | 'FAVORITES') => void;
  // Dynamic filters
  filterAgeGroup: AgeGroup | 'ALL';
  setFilterAgeGroup: (ag: AgeGroup | 'ALL') => void;
  filterWarmUpHauptschwerpunkt: string;
  setFilterWarmUpHauptschwerpunkt: (val: string) => void;
  filterWarmUpAthletisch: string;
  setFilterWarmUpAthletisch: (val: string) => void;
  filterWarmUpKognitiv: string;
  setFilterWarmUpKognitiv: (val: string) => void;
  filterWarmUpKoordinativ: string;
  setFilterWarmUpKoordinativ: (val: string) => void;
  filterWarmUpVisuell: string;
  setFilterWarmUpVisuell: (val: string) => void;
  filterAnalytischTechnik: string;
  setFilterAnalytischTechnik: (val: string) => void;
  filterAthletischerEntwicklungsreiz?: string;
  setFilterAthletischerEntwicklungsreiz?: (val: string) => void;
  subFocusFilter: string;
  setSubFocusFilter: (val: string) => void;
  filterMaterial: string;
  setFilterMaterial: (val: string) => void;
  onResetCatalogFilters: () => void;
  isFilterActive: boolean;
  activeSpecificFilterCount: number;
  // Exercises data
  allExercises: Exercise[];
  filteredExercises: Exercise[];
  // User info
  userId?: string;
  clubId?: string | null;
  clubName?: string | null;
  favoriteExerciseIds: string[];
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  // Actions
  onPreviewExercise: (ex: Exercise) => void;
  onAddExerciseToActivePhase: (exerciseId: string) => void;
  onDragStart: (e: React.DragEvent, exerciseId: string) => void;
  onDragEnd: () => void;
}

export const PlannerCatalogSidebar: React.FC<PlannerCatalogSidebarProps> = ({
  availableKeepers,
  onOpenEditorForNew,
  activeCatalogTab,
  setActiveCatalogTab,
  catalogSearch,
  setCatalogSearch,
  scopeFilter,
  setScopeFilter,
  filterAgeGroup,
  setFilterAgeGroup,
  filterWarmUpHauptschwerpunkt,
  setFilterWarmUpHauptschwerpunkt,
  filterWarmUpAthletisch,
  setFilterWarmUpAthletisch,
  filterWarmUpKognitiv,
  setFilterWarmUpKognitiv,
  filterWarmUpKoordinativ,
  setFilterWarmUpKoordinativ,
  filterWarmUpVisuell,
  setFilterWarmUpVisuell,
  filterAnalytischTechnik,
  setFilterAnalytischTechnik,
  filterAthletischerEntwicklungsreiz = 'ALL',
  setFilterAthletischerEntwicklungsreiz,
  subFocusFilter,
  setSubFocusFilter,
  filterMaterial,
  setFilterMaterial,
  onResetCatalogFilters,
  isFilterActive,
  activeSpecificFilterCount,
  allExercises,
  filteredExercises,
  userId,
  clubId,
  clubName,
  favoriteExerciseIds,
  onToggleFavorite,
  onPreviewExercise,
  onAddExerciseToActivePhase,
  onDragStart,
  onDragEnd
}) => {
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [expandedDetailsMap, setExpandedDetailsMap] = useState<Record<string, boolean>>({});
  const toggleDetails = (id: string) => {
    setExpandedDetailsMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-400" />
              <span>Übungskatalog</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-950 text-sky-400 border border-sky-800">
              Passend für {availableKeepers} TW
            </span>
          </div>
        </div>

        {onOpenEditorForNew && (
          <button
            type="button"
            onClick={onOpenEditorForNew}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Neue Übung</span>
          </button>
        )}
      </div>

      {/* Leiste der Trainingsphasen */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {PLANNER_CATALOG_TABS.map(tab => {
          const isSelected = activeCatalogTab === tab;
          const color = CATEGORY_COLORS[tab as keyof typeof CATEGORY_COLORS] || { border: 'border-slate-700', bg: 'bg-slate-800', text: 'text-slate-300', badge: 'bg-slate-800 text-slate-300' };

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveCatalogTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                isSelected
                  ? cn("text-white shadow-md ring-1 ring-white/20", color.badge)
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
              )}
            >
              <span>{tab === 'ALLE' ? 'Alle Übungen' : tab}</span>
            </button>
          );
        })}
      </div>

      {/* 1. DYNAMISCHE FILTERZEILE (Kompakt / Schmal, standardmäßig zugeklappt) */}
      <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden transition-all shadow-sm">
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsFilterExpanded(prev => !prev)}
            className="flex items-center gap-2 text-left group hover:opacity-90 transition cursor-pointer"
          >
            <div className={cn(
              "p-1.5 rounded-lg border transition flex items-center justify-center",
              isFilterExpanded || activeSpecificFilterCount > 0
                ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
                : "bg-slate-900 text-slate-400 border-slate-800 group-hover:border-slate-700"
            )}>
              <Filter className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider group-hover:text-emerald-400 transition">
                Filter
              </span>
              {activeSpecificFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeSpecificFilterCount} aktiv
                </span>
              )}
              {isFilterExpanded ? (
                <ChevronUp className="w-4 h-4 text-emerald-400 transition" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition" />
              )}
            </div>
          </button>

          {isFilterActive && (
            <button
              type="button"
              onClick={onResetCatalogFilters}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1 cursor-pointer"
            >
              <span>Filter zurücksetzen</span>
            </button>
          )}
        </div>

        {/* AUFGEKLAPPTE FILTER (Freitext, Altersstufe, Thema, Material & Phasendetails) */}
        {isFilterExpanded && (
          <div className="p-3.5 pt-3 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
            {/* 1. Allgemeine Filterleiste (Suche, Altersstufe, Thema/Technik, Material) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Freitext-Suche */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">Freitext-Suche</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Übung suchen..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Altersstufen-Filter */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">Altersstufe</label>
                <select
                  value={filterAgeGroup}
                  onChange={e => setFilterAgeGroup(e.target.value as AgeGroup | 'ALL')}
                  className={cn(
                    "w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none transition font-semibold",
                    filterAgeGroup !== 'ALL'
                      ? "border-purple-500 text-purple-200 bg-purple-950/40 font-bold"
                      : "border-slate-800 text-slate-300 focus:border-emerald-500"
                  )}
                >
                  <option value="ALL">Alle Altersstufen</option>
                  {AGE_GROUPS.map(ag => (
                    <option key={ag} value={ag}>
                      {ag === 'immer' ? 'immer (ab jedem Alter)' : `ab ${ag}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thema / Torwarttechnik / Entwicklungsreiz */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">
                  {activeCatalogTab === 'Analytisch' ? 'Torwarttechnik' : activeCatalogTab === 'Torwart-Athletik' ? 'Thema / Reiz' : 'Thema'}
                </label>
                {activeCatalogTab === 'Analytisch' ? (
                  <select
                    value={filterAnalytischTechnik}
                    onChange={e => setFilterAnalytischTechnik(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none transition font-semibold truncate",
                      filterAnalytischTechnik.trim()
                        ? "border-purple-500 text-purple-200 bg-purple-950/40 font-bold"
                        : "border-slate-800 text-slate-300 focus:border-purple-500"
                    )}
                  >
                    <option value="">Alle Torwarttechniken</option>
                    {Array.from(new Set(SKILL_DEFINITIONS.Technik.map(t => t.group || 'Allgemein'))).map(groupName => (
                      <optgroup key={groupName} label={groupName} className="bg-slate-900 text-purple-300 font-bold">
                        {SKILL_DEFINITIONS.Technik.filter(t => (t.group || 'Allgemein') === groupName).map(t => (
                          <option key={t.id} value={t.name} className="bg-slate-950 text-slate-100 font-normal">
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : activeCatalogTab === 'Torwart-Athletik' && setFilterAthletischerEntwicklungsreiz ? (
                  <select
                    value={filterAthletischerEntwicklungsreiz}
                    onChange={e => setFilterAthletischerEntwicklungsreiz(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none transition font-semibold truncate",
                      filterAthletischerEntwicklungsreiz !== 'ALL' && filterAthletischerEntwicklungsreiz !== ''
                        ? "border-blue-500 text-blue-200 bg-blue-950/40 font-bold"
                        : "border-slate-800 text-slate-300 focus:border-blue-500"
                    )}
                  >
                    <option value="ALL">Alle Entwicklungsreize</option>
                    {ATHLETISCHER_ENTWICKLUNGSREIZ_OPTIONS.map(reiz => (
                      <option key={reiz} value={reiz} className="bg-slate-950 text-slate-100">
                        {reiz}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={subFocusFilter}
                    onChange={e => setSubFocusFilter(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none transition font-semibold truncate",
                      subFocusFilter !== 'ALL' && subFocusFilter !== ''
                        ? "border-sky-500 text-sky-200 bg-sky-950/40 font-bold"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Alle Themen</option>
                    {PERIODIZATION_TOPICS.map(topic => (
                      <option key={topic.id} value={topic.label} className="bg-slate-950 text-slate-100">
                        {topic.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Material-Filter */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">Material</label>
                <select
                  value={filterMaterial}
                  onChange={e => setFilterMaterial(e.target.value)}
                  className={cn(
                    "w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none transition font-medium",
                    filterMaterial !== 'ALL'
                      ? "border-emerald-500 text-emerald-300 bg-emerald-950/30 font-bold"
                      : "border-slate-800 text-slate-300 focus:border-emerald-500"
                  )}
                >
                  <option value="ALL">Alle Materialien</option>
                  {ALL_MATERIALS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* WarmUp Filters */}
            {activeCatalogTab === 'WarmUp' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 truncate">Hauptschwerpunkt</label>
                  <select
                    value={filterWarmUpHauptschwerpunkt}
                    onChange={e => setFilterWarmUpHauptschwerpunkt(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition font-medium",
                      filterWarmUpHauptschwerpunkt !== 'ALL'
                        ? "border-amber-500 text-amber-300 bg-amber-950/30"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Alle Hauptschwerpunkte</option>
                    {WARMUP_HAUPTSCHWERPUNKTE.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 truncate">Athletisches Element</label>
                  <select
                    value={filterWarmUpAthletisch}
                    onChange={e => setFilterWarmUpAthletisch(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition font-medium",
                      filterWarmUpAthletisch !== 'ALL'
                        ? "border-amber-500 text-amber-300 bg-amber-950/30"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Athletik: Alle</option>
                    {FOCUS_SCHWERPUNKT_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 truncate">Kognitives Element</label>
                  <select
                    value={filterWarmUpKognitiv}
                    onChange={e => setFilterWarmUpKognitiv(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition font-medium",
                      filterWarmUpKognitiv !== 'ALL'
                        ? "border-amber-500 text-amber-300 bg-amber-950/30"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Kognitiv: Alle</option>
                    <option value="enthalten">enthalten</option>
                    <option value="nicht enthalten">nicht enthalten</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 truncate">Koordinatives Element</label>
                  <select
                    value={filterWarmUpKoordinativ}
                    onChange={e => setFilterWarmUpKoordinativ(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition font-medium",
                      filterWarmUpKoordinativ !== 'ALL'
                        ? "border-amber-500 text-amber-300 bg-amber-950/30"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Koordinativ: Alle</option>
                    <option value="enthalten">enthalten</option>
                    <option value="nicht enthalten">nicht enthalten</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 truncate">Visuelles Element</label>
                  <select
                    value={filterWarmUpVisuell}
                    onChange={e => setFilterWarmUpVisuell(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition font-medium",
                      filterWarmUpVisuell !== 'ALL'
                        ? "border-amber-500 text-amber-300 bg-amber-950/30"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Visuell: Alle</option>
                    <option value="enthalten">enthalten</option>
                    <option value="nicht enthalten">nicht enthalten</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 truncate">Material</label>
                  <select
                    value={filterMaterial}
                    onChange={e => setFilterMaterial(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition font-medium",
                      filterMaterial !== 'ALL'
                        ? "border-emerald-500 text-emerald-300 bg-emerald-950/30"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Alle Materialien</option>
                    {ALL_MATERIALS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Analytisch Filters */}
            {activeCatalogTab === 'Analytisch' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Torwarttechnik (Filter)</label>
                  <select
                    value={filterAnalytischTechnik}
                    onChange={e => setFilterAnalytischTechnik(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-3 py-1.5 text-xs focus:outline-none transition font-semibold",
                      filterAnalytischTechnik.trim()
                        ? "border-purple-500 text-purple-300 bg-purple-950/30 font-bold"
                        : "border-slate-800 text-slate-200 focus:border-purple-500"
                    )}
                  >
                    <option value="">Alle Torwarttechniken</option>
                    {Array.from(new Set(SKILL_DEFINITIONS.Technik.map(t => t.group || 'Allgemein'))).map(groupName => (
                      <optgroup key={groupName} label={groupName} className="bg-slate-900 text-purple-300 font-bold">
                        {SKILL_DEFINITIONS.Technik.filter(t => (t.group || 'Allgemein') === groupName).map(t => (
                          <option key={t.id} value={t.name} className="bg-slate-950 text-slate-100 font-normal">
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Material</label>
                  <select
                    value={filterMaterial}
                    onChange={e => setFilterMaterial(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-3 py-1.5 text-xs focus:outline-none transition font-medium",
                      filterMaterial !== 'ALL'
                        ? "border-emerald-500 text-emerald-300 bg-emerald-950/30 font-bold"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Alle Materialien</option>
                    {ALL_MATERIALS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Situativ / Athletik / Integrativ / Wettkämpfe */}
            {(activeCatalogTab === 'Situativ' || activeCatalogTab === 'Torwart-Athletik' || activeCatalogTab === 'Integrativ' || activeCatalogTab === 'Wettkämpfe') && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => setSubFocusFilter('ALL')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer",
                        subFocusFilter === 'ALL'
                          ? "bg-slate-800 text-white border-slate-700 font-bold"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      Alle Schwerpunkte
                    </button>

                    {activeCatalogTab === 'Torwart-Athletik' &&
                      FOCUS_SCHWERPUNKT_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSubFocusFilter(opt)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer",
                            subFocusFilter === opt
                              ? "bg-blue-600 text-white border-blue-500 font-bold shadow"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                          )}
                        >
                          {opt}
                        </button>
                      ))}

                    {(activeCatalogTab === 'Situativ' || activeCatalogTab === 'Integrativ' || activeCatalogTab === 'Wettkämpfe') &&
                      SITUATIVE_SCHWERPUNKTE.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSubFocusFilter(opt)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer",
                            subFocusFilter === opt
                              ? activeCatalogTab === 'Situativ'
                                ? "bg-emerald-600 text-white border-emerald-500 font-bold shadow"
                                : activeCatalogTab === 'Integrativ'
                                ? "bg-cyan-600 text-white border-cyan-500 font-bold shadow"
                                : "bg-rose-600 text-white border-rose-500 font-bold shadow"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                  </div>

                  <div className="w-full sm:w-52">
                    <select
                      value={filterMaterial}
                      onChange={e => setFilterMaterial(e.target.value)}
                      className={cn(
                        "w-full bg-slate-900 border rounded-lg px-2.5 py-1 text-xs focus:outline-none transition font-medium",
                        filterMaterial !== 'ALL'
                          ? "border-emerald-500 text-emerald-300 bg-emerald-950/30 font-bold"
                          : "border-slate-800 text-slate-300 focus:border-emerald-500"
                      )}
                    >
                      <option value="ALL">Alle Materialien filtern</option>
                      {ALL_MATERIALS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Entwicklungsreiz Buttons for Torwart-Athletik */}
                {activeCatalogTab === 'Torwart-Athletik' && setFilterAthletischerEntwicklungsreiz && (
                  <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">
                      Entwicklungsreiz:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilterAthletischerEntwicklungsreiz('ALL')}
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-[11px] font-semibold transition border cursor-pointer",
                        filterAthletischerEntwicklungsreiz === 'ALL'
                          ? "bg-slate-800 text-white border-slate-700 font-bold"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      Alle Reize
                    </button>
                    {ATHLETISCHER_ENTWICKLUNGSREIZ_OPTIONS.map(reiz => (
                      <button
                        key={reiz}
                        type="button"
                        onClick={() => setFilterAthletischerEntwicklungsreiz(reiz)}
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[11px] font-semibold transition border cursor-pointer",
                          filterAthletischerEntwicklungsreiz === reiz
                            ? "bg-blue-600 text-white border-blue-500 font-bold shadow"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                        )}
                      >
                        {reiz}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CoolDown & ALLE */}
            {(activeCatalogTab === 'CoolDown' || activeCatalogTab === 'ALLE') && (
              <div className="flex justify-end">
                <div className="w-full sm:w-56">
                  <select
                    value={filterMaterial}
                    onChange={e => setFilterMaterial(e.target.value)}
                    className={cn(
                      "w-full bg-slate-900 border rounded-lg px-2.5 py-1 text-xs focus:outline-none transition font-medium",
                      filterMaterial !== 'ALL'
                        ? "border-emerald-500 text-emerald-300 bg-emerald-950/30 font-bold"
                        : "border-slate-800 text-slate-300 focus:border-emerald-500"
                    )}
                  >
                    <option value="ALL">Alle Materialien filtern</option>
                    {ALL_MATERIALS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Sichtbarkeits-Filter (Quelle) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-xs">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 pl-1">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Quelle:</span>
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setScopeFilter('ALL')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer",
              scopeFilter === 'ALL'
                ? "bg-emerald-600 text-white border-emerald-500 shadow"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
            )}
          >
            Alle ({activeCatalogTab === 'ALLE' ? allExercises.length : allExercises.filter(e => e.category === activeCatalogTab).length})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('FAVORITES')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition border flex items-center gap-1 cursor-pointer",
              scopeFilter === 'FAVORITES'
                ? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", scopeFilter === 'FAVORITES' ? "fill-slate-950 text-slate-950" : "text-amber-400 fill-amber-400/30")} />
            <span>Favoriten ({allExercises.filter(e => (activeCatalogTab === 'ALLE' || e.category === activeCatalogTab) && e.id && favoriteExerciseIds.includes(e.id)).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('MINE')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition border flex items-center gap-1 cursor-pointer",
              scopeFilter === 'MINE'
                ? "bg-sky-600 text-white border-sky-500 shadow"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
            )}
          >
            <User className="w-3 h-3" />
            <span>Nur meine ({allExercises.filter(e => (activeCatalogTab === 'ALLE' || e.category === activeCatalogTab) && Boolean(userId && e.ownerId === userId)).length})</span>
          </button>
          {clubId && (
            <button
              type="button"
              onClick={() => setScopeFilter('CLUB')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition border flex items-center gap-1 cursor-pointer",
                scopeFilter === 'CLUB'
                  ? "bg-sky-600 text-white border-sky-500 shadow"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Globe className="w-3 h-3 text-sky-400" />
              <span>{clubName || 'Unser Verein'} ({allExercises.filter(e => (activeCatalogTab === 'ALLE' || e.category === activeCatalogTab) && e.clubId === clubId).length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setScopeFilter('PUBLISHED')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition border flex items-center gap-1 cursor-pointer",
              scopeFilter === 'PUBLISHED'
                ? "bg-purple-600 text-white border-purple-500 shadow"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Globe className="w-3 h-3" />
            <span>Nur Akademie ({allExercises.filter(e => (activeCatalogTab === 'ALLE' || e.category === activeCatalogTab) && e.isPublished).length})</span>
          </button>
        </div>
      </div>

      {/* 3. Exercise Cards List */}
      <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
        {filteredExercises.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center gap-2 text-slate-500">
            <Package className="w-8 h-8 text-slate-600" />
            <p className="text-xs font-bold text-slate-400">
              Keine Übungen in &quot;{activeCatalogTab === 'ALLE' ? 'Allen Übungen' : activeCatalogTab}&quot; für die aktuellen Filterkriterien ({availableKeepers} TW) gefunden.
            </p>
            <p className="text-[11px] text-slate-600">
              Passe die Filter oben an oder erstelle eine neue Übung.
            </p>
          </div>
        ) : (
          filteredExercises.map(exercise => {
            const isFav = exercise.id ? favoriteExerciseIds.includes(exercise.id) : false;
            const categoryConfig = CATEGORY_COLORS[exercise.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.WarmUp;
            const isExpanded = exercise.id ? Boolean(expandedDetailsMap[exercise.id]) : false;

            const hasOtherAspects = Boolean(
              (exercise.materials && exercise.materials.length > 0) ||
              exercise.technik ||
              exercise.technikprinzipien ||
              (exercise.methodischeReiheStufen && Object.values(exercise.methodischeReiheStufen).some(Boolean)) ||
              exercise.taktikprinzipien ||
              exercise.siegbedingung ||
              (exercise.atSchwerpunkt && exercise.atSchwerpunkt !== 'unspezifisch') ||
              exercise.athletikSchwerpunkt ||
              (exercise.kognition && exercise.kognition !== 'nicht enthalten') ||
              (exercise.koordinativesElement && exercise.koordinativesElement !== 'nicht enthalten') ||
              (exercise.visuellesElement && exercise.visuellesElement !== 'nicht enthalten') ||
              (exercise.warmUpSchwerpunkte && exercise.warmUpSchwerpunkte.length > 0) ||
              (exercise.situativeSchwerpunkte && exercise.situativeSchwerpunkte.length > 0)
            );

            return (
              <div
                key={exercise.id}
                draggable={true}
                onDragStart={(e) => exercise.id && onDragStart(e, exercise.id)}
                onDragEnd={onDragEnd}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-sm hover:shadow-md group space-y-3"
              >
                {/* Header row with Title, Badges, and Action Buttons */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Drag Handle */}
                    <div 
                      title="Übung per Drag & Drop in eine Trainingsphase links ziehen"
                      className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-900 transition flex-shrink-0 mt-0.5"
                    >
                      <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-emerald-400" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Title & Favorite */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 
                          onClick={() => onPreviewExercise(exercise)}
                          className="text-xs sm:text-sm font-extrabold text-white truncate hover:text-emerald-400 cursor-pointer"
                          title={exercise.title}
                        >
                          {exercise.title}
                        </h4>

                        <button
                          type="button"
                          onClick={(e) => exercise.id && onToggleFavorite(exercise.id, e)}
                          className="p-0.5 rounded text-slate-500 hover:text-amber-400 transition flex-shrink-0 cursor-pointer"
                          title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                        >
                          <Star className={cn("w-3.5 h-3.5", isFav ? "text-amber-400 fill-amber-400" : "text-slate-600 hover:text-amber-400")} />
                        </button>
                      </div>

                      {/* Badges Ribbon */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <span className={cn("px-2 py-0.5 rounded-md font-extrabold border", categoryConfig.badge)}>
                          {exercise.category}
                        </span>

                        <span className="px-2 py-0.5 rounded-md font-bold bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>{exercise.durationMinutes || 15} Min.</span>
                        </span>

                        <span className="px-2 py-0.5 rounded-md font-bold bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1">
                          <Users className="w-3 h-3 text-sky-400" />
                          <span>{exercise.minKeepers || 1}-{exercise.maxKeepers || 8} TW</span>
                        </span>

                        {exercise.minAgeGroup && exercise.minAgeGroup !== 'immer' && (
                          <span className="px-1.5 py-0.5 rounded-md font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            ab {exercise.minAgeGroup}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Preview & Add */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onPreviewExercise(exercise)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
                      title="Vollansicht der Übung öffnen"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => exercise.id && onAddExerciseToActivePhase(exercise.id)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition shadow cursor-pointer active:scale-95"
                      title="In die aktuell geöffnete Phase ablegen"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Hinzufügen</span>
                    </button>
                  </div>
                </div>

                {/* Content Row: 50% Graphic (Left) & 50% Ablauf & Coaching (Right) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start pt-1">
                  {/* Left Column (50% Width): Tactical Graphic */}
                  <div className="w-full">
                    {(exercise.imageUrl || exercise.imageBase64) ? (
                      <div 
                        onClick={() => onPreviewExercise(exercise)}
                        className="w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center cursor-pointer group/img relative hover:border-emerald-500/60 transition shadow-lg p-1.5"
                        title="Klicken für Vollansicht"
                      >
                        <img
                          src={exercise.imageUrl || exercise.imageBase64}
                          alt={exercise.title}
                          className="w-full h-full object-contain group-hover/img:scale-105 transition duration-300"
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={() => onPreviewExercise(exercise)}
                        className="w-full aspect-[4/3] bg-slate-900/40 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 gap-1.5 cursor-pointer hover:border-slate-700 transition"
                        title="Keine Grafik vorhanden"
                      >
                        <Package className="w-8 h-8 text-slate-600" />
                        <span className="text-xs font-medium">Keine Grafik</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column (50% Width): Ablauf & Coaching-Punkte */}
                  <div className="min-w-0 space-y-2.5 text-xs">
                    {exercise.ablauf && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Ablauf:
                        </span>
                        <p className="text-slate-200 text-[11px] whitespace-pre-line leading-relaxed font-sans">
                          {exercise.ablauf}
                        </p>
                      </div>
                    )}

                    {exercise.coachingPoints && (
                      <div className="bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-900/50 space-y-1">
                        <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                          Coaching-Punkte:
                        </span>
                        <p className="text-emerald-200 text-[11px] whitespace-pre-line leading-relaxed">
                          {exercise.coachingPoints}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Section for other aspects */}
                {hasOtherAspects && (
                  <div className="border-t border-slate-800/80 pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => exercise.id && toggleDetails(exercise.id)}
                      className="w-full flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-[11px] font-bold text-slate-400 hover:text-emerald-400 transition cursor-pointer select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>Weitere Aspekte & Details</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {isExpanded ? '(ausblenden)' : '(einblenden)'}
                        </span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-3 text-xs animate-in fade-in duration-150">
                        {/* Benötigte Materialien */}
                        {exercise.materials && exercise.materials.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                              Benötigte Materialien:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {exercise.materials.map(m => (
                                <span key={m} className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-800">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* WarmUp Elemente */}
                        {exercise.category === 'WarmUp' && (
                          <div className="space-y-2">
                            {exercise.warmUpSchwerpunkte && exercise.warmUpSchwerpunkte.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block">Hauptschwerpunkte:</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {exercise.warmUpSchwerpunkte.map(sp => (
                                    <span key={sp} className="bg-amber-950/40 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                      {sp}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                              {exercise.atSchwerpunkt && exercise.atSchwerpunkt !== 'unspezifisch' && (
                                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                                  <span className="text-[9.5px] text-slate-400 block font-semibold">Athletik:</span>
                                  <span className="text-amber-300 font-bold">{exercise.atSchwerpunkt}</span>
                                </div>
                              )}
                              {exercise.kognition && exercise.kognition !== 'nicht enthalten' && (
                                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                                  <span className="text-[9.5px] text-slate-400 block font-semibold">Kognition:</span>
                                  <span className="text-purple-300 font-bold">{exercise.kognition}</span>
                                </div>
                              )}
                              {exercise.koordinativesElement && exercise.koordinativesElement !== 'nicht enthalten' && (
                                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                                  <span className="text-[9.5px] text-slate-400 block font-semibold">Koordination:</span>
                                  <span className="text-cyan-300 font-bold">{exercise.koordinativesElement}</span>
                                </div>
                              )}
                              {exercise.visuellesElement && exercise.visuellesElement !== 'nicht enthalten' && (
                                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                                  <span className="text-[9.5px] text-slate-400 block font-semibold">Visuell:</span>
                                  <span className="text-emerald-300 font-bold">{exercise.visuellesElement}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Torwart-Athletik Schwerpunkt & Reiz */}
                        {exercise.category === 'Torwart-Athletik' && (exercise.athletikSchwerpunkt || exercise.athletischerEntwicklungsreiz) && (
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                              Athletik-Schwerpunkt:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {exercise.athletikSchwerpunkt && (
                                <span className="inline-block bg-blue-950/50 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded text-[11px] font-bold">
                                  {exercise.athletikSchwerpunkt}
                                </span>
                              )}
                              {exercise.athletischerEntwicklungsreiz && (
                                <span className="inline-block bg-sky-950/60 text-sky-300 border border-sky-800/60 px-2 py-0.5 rounded text-[11px] font-bold">
                                  Reiz: {exercise.athletischerEntwicklungsreiz}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Analytisch: Technik & Methodische Reihe & Technikprinzipien */}
                        {exercise.category === 'Analytisch' && (
                          <div className="space-y-2">
                            {exercise.technik && (
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                                  Technikschwerpunkt:
                                </span>
                                <span className="text-slate-200 text-[11px] font-bold">{exercise.technik}</span>
                              </div>
                            )}
                            {exercise.methodischeReiheStufen && Object.values(exercise.methodischeReiheStufen).some(Boolean) && (
                              <div className="bg-purple-950/25 p-2.5 rounded-xl border border-purple-900/40 space-y-1.5">
                                <span className="text-[10px] font-extrabold uppercase text-purple-400 tracking-wider block">
                                  Methodische Reihe:
                                </span>
                                <div className="space-y-1">
                                  {(Object.keys(METHODISCHE_REIHE_LABELS) as (keyof typeof METHODISCHE_REIHE_LABELS)[]).map(k => {
                                    const desc = exercise.methodischeReiheStufen?.[k];
                                    if (!desc) return null;
                                    return (
                                      <div key={k} className="bg-slate-950 p-2 rounded border border-purple-900/30 text-[10.5px]">
                                        <span className="font-bold text-purple-300 block">{METHODISCHE_REIHE_LABELS[k]}:</span>
                                        <span className="text-slate-200">{desc}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {exercise.technikprinzipien && (
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                                  Technikprinzipien:
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">{exercise.technikprinzipien}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Situativ / Integrativ: Situative Schwerpunkte & Taktikprinzipien */}
                        {(exercise.category === 'Situativ' || exercise.category === 'Integrativ') && (
                          <div className="space-y-2">
                            {exercise.situativeSchwerpunkte && exercise.situativeSchwerpunkte.length > 0 && (
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                                  Situative Schwerpunkte:
                                </span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {exercise.situativeSchwerpunkte.map(sp => (
                                    <span key={sp} className="bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                      {sp}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {exercise.taktikprinzipien && (
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                                  Taktikprinzipien:
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">{exercise.taktikprinzipien}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Wettkämpfe: Siegbedingung */}
                        {exercise.category === 'Wettkämpfe' && (
                          <div className="space-y-2">
                            {exercise.siegbedingung && (
                              <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-900/50 space-y-0.5">
                                <span className="text-[10px] font-extrabold uppercase text-rose-400 tracking-wider block">
                                  Siegbedingung:
                                </span>
                                <p className="text-rose-200 text-[11px] font-semibold">{exercise.siegbedingung}</p>
                              </div>
                            )}
                            {exercise.taktikprinzipien && (
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                                  Taktikprinzipien:
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">{exercise.taktikprinzipien}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
