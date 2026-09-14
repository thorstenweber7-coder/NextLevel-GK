import React, { useState, useMemo } from 'react';
import { 
  X, 
  Star, 
  Clock, 
  Layers, 
  ArrowRight, 
  Search,
  BookOpen,
  Sparkles
} from 'lucide-react';
import type { Exercise, ExerciseCategory } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import { cn } from '../../utils/cn';

export interface ExerciseTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (exercise: Exercise) => void;
  allExercises: Exercise[];
  favoriteExerciseIds: string[];
  currentUserId?: string;
}

const TEMPLATE_CATEGORY_TABS: Array<{ key: 'ALLE' | ExerciseCategory; label: string }> = [
  { key: 'ALLE', label: 'Alle Phasen' },
  { key: 'WarmUp', label: 'Warm-Up' },
  { key: 'Torwart-Athletik', label: 'Torwart-Athletik' },
  { key: 'Analytisch', label: 'Analytisch' },
  { key: 'Situativ', label: 'Situativ' },
  { key: 'Integrativ', label: 'Integrativ' },
  { key: 'Wettkämpfe', label: 'Wettkämpfe' }
];

export const ExerciseTemplatesModal: React.FC<ExerciseTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  allExercises,
  favoriteExerciseIds,
  currentUserId
}) => {
  const [mainTab, setMainTab] = useState<'favorites' | 'recent'>('favorites');
  const [categoryFilter, setCategoryFilter] = useState<'ALLE' | ExerciseCategory>('ALLE');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Favorites Exercises
  const favoriteExercises = useMemo(() => {
    return allExercises.filter(ex => ex.id && favoriteExerciseIds.includes(ex.id));
  }, [allExercises, favoriteExerciseIds]);

  // 2. Recent 5 Created Exercises (prioritizing user's own exercises, otherwise all available)
  const recentExercises = useMemo(() => {
    // Filter to active exercises (not archived)
    const valid = allExercises.filter(ex => !ex.isArchived);
    
    // Check if user has created exercises
    const userCreated = currentUserId ? valid.filter(ex => ex.ownerId === currentUserId) : [];
    const pool = userCreated.length > 0 ? userCreated : valid;
    
    return [...pool]
      .sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
  }, [allExercises, currentUserId]);

  // 3. Active List based on Main Tab
  const activePool = mainTab === 'favorites' ? favoriteExercises : recentExercises;

  // 4. Apply Category Filter and Search
  const filteredList = useMemo(() => {
    let list = activePool;

    // Filter by Category Tab
    if (categoryFilter !== 'ALLE') {
      list = list.filter(ex => ex.category === categoryFilter);
    }

    // Filter by Search Query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(ex => ex.title.toLowerCase().includes(q));
    }

    // For "Letzte 5 erstellten Übungen", limit to 5
    if (mainTab === 'recent') {
      list = list.slice(0, 5);
    }

    return list;
  }, [activePool, categoryFilter, searchQuery, mainTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-950/50">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Übungsvorlagen</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Wähle eine bestehende Übung als Vorlage, um im Editor eine neue Übung zu erstellen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main 2 Tabs: Favoriten & Letzte 5 erstellten Übungen */}
        <div className="bg-slate-950/90 px-4 pt-3 pb-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMainTab('favorites');
                setSearchQuery('');
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 border cursor-pointer select-none",
                mainTab === 'favorites'
                  ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow-md shadow-amber-950/50"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              )}
            >
              <Star className={cn("w-3.5 h-3.5", mainTab === 'favorites' ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
              <span>Favoriten</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300">
                {favoriteExercises.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMainTab('recent');
                setSearchQuery('');
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 border cursor-pointer select-none",
                mainTab === 'recent'
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/50"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              )}
            >
              <Clock className={cn("w-3.5 h-3.5", mainTab === 'recent' ? "text-emerald-400" : "text-slate-500")} />
              <span>Letzte 5 erstellten Übungen</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Übung suchen..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>
        </div>

        {/* Trainingsphase Filter Tabs (Über Reiter) */}
        <div className="bg-slate-950/60 px-4 py-2.5 border-b border-slate-800/60 overflow-x-auto no-scrollbar scrollbar-thin">
          <div className="flex items-center gap-1.5 min-w-max">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" />
              <span>Phase:</span>
            </span>
            {TEMPLATE_CATEGORY_TABS.map(tab => {
              const isActive = categoryFilter === tab.key;
              const catColor = tab.key !== 'ALLE' ? CATEGORY_COLORS[tab.key] : null;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategoryFilter(tab.key)}
                  className={cn(
                    "px-3 py-1.2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer select-none",
                    isActive
                      ? tab.key === 'ALLE'
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-sm"
                        : cn(catColor?.badge, "shadow-sm")
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercises List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 divide-y divide-slate-800/60">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto border border-slate-700/60">
                {mainTab === 'favorites' ? <Star className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <p className="text-sm font-bold text-slate-300">
                {mainTab === 'favorites'
                  ? 'Keine Favoriten in dieser Trainingsphase gefunden.'
                  : 'Keine kürzlich erstellten Übungen in dieser Trainingsphase gefunden.'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {mainTab === 'favorites'
                  ? 'Markiere Übungen im Katalog mit dem Stern-Symbol als Favorit, um sie hier schnell als Vorlage zu nutzen.'
                  : 'Erstelle Übungen im Editor, um sie hier als Vorlage wiederzuverwenden.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredList.map((exercise) => {
                const catColor = CATEGORY_COLORS[exercise.category] || CATEGORY_COLORS.WarmUp;

                return (
                  <div
                    key={exercise.id || Math.random().toString()}
                    className="p-3 sm:p-3.5 bg-slate-950/70 hover:bg-slate-850 border border-slate-800/90 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-4 transition group shadow-sm"
                  >
                    {/* Left: Trainingsphase Badge + Übungstitel ONLY */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={cn(
                        "text-[11px] px-2.5 py-1 rounded-lg font-black border uppercase tracking-wider flex-shrink-0 shadow-sm",
                        catColor.badge
                      )}>
                        {exercise.category}
                      </span>
                      <h4 
                        className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition truncate"
                        title={exercise.title}
                      >
                        {exercise.title}
                      </h4>
                    </div>

                    {/* Right Action Button: In den Editor laden */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTemplate(exercise);
                        onClose();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs transition flex items-center gap-1.5 flex-shrink-0 shadow-md shadow-emerald-950/40 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                      <span>In den Editor laden</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-950 stroke-[2.5] hidden sm:inline" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            💡 Beim Laden wird der Inhalt als Vorlage übernommen. Die Original-Übung bleibt unverändert.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
