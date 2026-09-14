import React, { useState, useMemo } from 'react';
import { 
  X, 
  Trophy, 
  Search, 
  Filter, 
  Eye, 
  Layers, 
  Award, 
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { Exercise, ExerciseCategory, TrainingPlan } from '../types';
import { CATEGORY_COLORS } from '../types';
import { cn } from '../utils/cn';

interface ExerciseUsageRankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  savedPlans: TrainingPlan[];
  onPreviewExercise?: (exercise: Exercise) => void;
}

export const computeExerciseUsageCounts = (savedPlans: TrainingPlan[]): Record<string, number> => {
  const counts: Record<string, number> = {};

  savedPlans.forEach(plan => {
    const exerciseIdsInPlan: string[] = [];

    if (plan.phaseExercises) {
      Object.values(plan.phaseExercises).forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(id => {
            if (id && typeof id === 'string') {
              exerciseIdsInPlan.push(id);
            }
          });
        }
      });
    }

    if (plan.phases) {
      Object.values(plan.phases).forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(id => {
            if (id && typeof id === 'string') {
              exerciseIdsInPlan.push(id);
            }
          });
        }
      });
    }

    if (plan.customPlanExercises) {
      Object.keys(plan.customPlanExercises).forEach(id => {
        if (id && !exerciseIdsInPlan.includes(id)) {
          exerciseIdsInPlan.push(id);
        }
      });
    }

    // Count each exercise used in this training session
    const uniqueIds = Array.from(new Set(exerciseIdsInPlan));
    uniqueIds.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });
  });

  return counts;
};

export const ExerciseUsageRankingModal: React.FC<ExerciseUsageRankingModalProps> = ({
  isOpen,
  onClose,
  exercises,
  savedPlans,
  onPreviewExercise
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Calculate usage counts from training plan history
  const usageCounts = useMemo(() => {
    return computeExerciseUsageCounts(savedPlans);
  }, [savedPlans]);

  // 2. Total executions across all plans
  const totalExecutions = useMemo(() => {
    return Object.values(usageCounts).reduce((sum, count) => sum + count, 0);
  }, [usageCounts]);

  // 3. Ranked exercises: ONLY exercises with count > 0, sorted descending
  const allRankedExercises = useMemo(() => {
    return exercises
      .map(ex => {
        const count = (ex.id ? usageCounts[ex.id] : 0) || 0;
        return { exercise: ex, count };
      })
      .filter(item => item.count > 0) // WICHTIG: Nur Übungen, die in der Historie auftauchen!
      .sort((a, b) => b.count - a.count); // Rangfolge: Höchste zuerst
  }, [exercises, usageCounts]);

  // Filtered ranking based on user filters (Trainingsphase & Search)
  const filteredRankedExercises = useMemo(() => {
    return allRankedExercises.filter(({ exercise: ex }) => {
      // 1. Category Filter
      if (selectedCategory !== 'ALL' && ex.category !== selectedCategory) {
        return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          ex.title.toLowerCase().includes(q) ||
          ex.category.toLowerCase().includes(q) ||
          (ex.technik && ex.technik.toLowerCase().includes(q)) ||
          (ex.situativeSchwerpunkte && ex.situativeSchwerpunkte.some(s => s.toLowerCase().includes(q)));
        if (!matches) return false;
      }

      return true;
    });
  }, [allRankedExercises, selectedCategory, searchQuery]);

  const maxCount = allRankedExercises[0]?.count || 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Glow Header Accent */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-500 flex-shrink-0" />

        {/* Modal Header */}
        <div className="p-5 pb-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xl shadow-inner flex-shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Wie häufig wurde welche Übung durchgeführt?
                </h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hidden sm:inline-block">
                  Rangfolge Historie
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Rangliste aller in den bisherigen Trainingseinheiten eingesetzten Übungen (sortiert nach Häufigkeit).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar & Summary Metrics */}
        <div className="p-4 sm:p-5 bg-slate-950/70 border-b border-slate-800 space-y-3.5 flex-shrink-0">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Einsätze Gesamt</span>
                <span className="text-base font-extrabold text-white">{totalExecutions}x</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Genutzte Übungen</span>
                <span className="text-base font-extrabold text-white">
                  {allRankedExercises.length} <span className="text-xs text-slate-500 font-normal">von {exercises.length}</span>
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm col-span-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Meistgenutzte Übung (Platz 1)</span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-300 truncate block">
                  {allRankedExercises[0] ? `${allRankedExercises[0].exercise.title} (${allRankedExercises[0].count}x)` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Row: Phase, Schwerpunkt, Suche */}
          {/* Filter Row: Phase & Suche */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Phase / Kategorie Filter */}
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-400" />
                <span>Filter: Trainingsphase</span>
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="ALL">Alle Trainingsphasen ({allRankedExercises.length})</option>
                <option value="WarmUp">WarmUp</option>
                <option value="Analytisch">Analytisch</option>
                <option value="Torwart-Athletik">Torwart-Athletik</option>
                <option value="Situativ">Situativ</option>
                <option value="Wettkämpfe">Wettkämpfe</option>
                <option value="Integrativ">Integrativ</option>
                <option value="CoolDown">CoolDown</option>
              </select>
            </div>

            {/* Suche */}
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Search className="w-3 h-3 text-amber-400" />
                <span>Suche</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Übung suchen..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ranked Exercises List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredRankedExercises.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-950/40 rounded-3xl border border-slate-800/80">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-200">Keine Übungen in der Rangfolge</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {allRankedExercises.length === 0
                  ? "Bislang wurden noch keine Trainingseinheiten mit Übungen abgespeichert. Sobald du Übungen in Trainingsplänen durchführst, werden sie hier automatisch in der Rangfolge gelistet."
                  : "Keine durchgeführte Übung entspricht den aktuell gewählten Filtern."}
              </p>
            </div>
          ) : (
            filteredRankedExercises.map(({ exercise: ex, count }, idx) => {
              const rank = idx + 1;
              const percentOfMax = Math.round((count / maxCount) * 100);
              const percentOfTotal = totalExecutions > 0 ? Math.round((count / totalExecutions) * 100) : 0;
              const catColor = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.WarmUp;

              return (
                <div
                  key={ex.id || idx}
                  className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  {/* Left: Rank Badge + Thumbnail + Title/Badges */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0 flex items-center justify-center">
                      {rank === 1 ? (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg shadow-amber-950/80 border border-amber-300" title="Platz 1 — Meistgenutzt">
                          🥇 1
                        </div>
                      ) : rank === 2 ? (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg border border-slate-100" title="Platz 2">
                          🥈 2
                        </div>
                      ) : rank === 3 ? (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-black text-sm flex items-center justify-center shadow-lg border border-amber-600" title="Platz 3">
                          🥉 3
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-extrabold text-xs flex items-center justify-center">
                          #{rank}
                        </div>
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div 
                      onClick={() => onPreviewExercise?.(ex)}
                      className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0 cursor-pointer hover:border-slate-600 transition flex items-center justify-center shadow-inner"
                      title="Klicken für Großansicht"
                    >
                      {(ex.imageUrl || ex.imageBase64) ? (
                        <img
                          src={ex.imageUrl || ex.imageBase64}
                          alt={ex.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Layers className="w-5 h-5 text-slate-600" />
                      )}
                    </div>

                    {/* Exercise Info */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 
                          onClick={() => onPreviewExercise?.(ex)}
                          className="font-extrabold text-sm sm:text-base text-white hover:text-emerald-400 transition cursor-pointer truncate"
                          title={ex.title}
                        >
                          {ex.title}
                        </h4>

                        <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-bold border flex items-center gap-1", catColor.badge)}>
                          {ex.category}
                        </span>
                      </div>

                      {/* Schwerpunkt tags */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        {ex.technik && (
                          <span className="bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 font-semibold truncate max-w-[140px]">
                            {ex.technik}
                          </span>
                        )}
                        {ex.atSchwerpunkt && (
                          <span className="bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60 font-semibold">
                            {ex.atSchwerpunkt}
                          </span>
                        )}
                        {ex.athletikSchwerpunkt && (
                          <span className="bg-blue-950/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/60 font-semibold">
                            {ex.athletikSchwerpunkt}
                          </span>
                        )}
                        {ex.situativeSchwerpunkte && ex.situativeSchwerpunkte.map(s => (
                          <span key={s} className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Usage Count & Visual Progress Bar */}
                  <div className="flex items-center gap-4 flex-shrink-0 pl-12 sm:pl-0">
                    <div className="w-32 sm:w-44 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-white flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>{count}x durchgeführt</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">{percentOfTotal}%</span>
                      </div>

                      {/* Progress bar relative to rank #1 */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(6, percentOfMax)}%` }}
                        />
                      </div>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => onPreviewExercise?.(ex)}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shadow-sm"
                      title="Vorschau & Details anzeigen"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 flex-shrink-0 text-xs text-slate-400">
          <span>
            Zeige <strong className="text-white">{filteredRankedExercises.length}</strong> von <strong className="text-white">{allRankedExercises.length}</strong> genutzten Übungen
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
