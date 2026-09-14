import React, { useState, useMemo } from 'react';
import type { 
  TrainingPlan, 
  TrainingGroup, 
  PlayerAbsence, 
  PlayerEvaluation, 
  Exercise, 
  PlayerMatchPlaytime, 
  PlayerFeedbackTalk 
} from '../types';
import { 
  PieChart, 
  Users 
} from 'lucide-react';
import { TrainerThemeStats } from './stats/TrainerThemeStats';
import { TechniqueBarChart } from './stats/TechniqueBarChart';
import { TacticsRadarCard } from './stats/TacticsRadarCard';
import { MaterialHeatmap } from './stats/MaterialHeatmap';
import { PlayerDiagnosticsCard } from './stats/PlayerDiagnosticsCard';
import { generateTrainerStatsPDF } from '../utils/trainerStatsPdfExport';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export interface OrgaStatsViewProps {
  savedPlans: TrainingPlan[];
  exercises: Exercise[];
  groups: TrainingGroup[];
  absences?: PlayerAbsence[];
  evaluations?: PlayerEvaluation[];
  matchPlaytimes?: PlayerMatchPlaytime[];
  feedbackTalks?: PlayerFeedbackTalk[];
  onNavigateToPlanner?: (planId?: string) => void;
}

export const OrgaStatsView: React.FC<OrgaStatsViewProps> = ({
  savedPlans,
  exercises,
  groups,
  absences = [],
  evaluations = [],
  matchPlaytimes = [],
  feedbackTalks = [],
  onNavigateToPlanner: _onNavigateToPlanner
}) => {
  const { user } = useAuth();
  const [statsTab, setStatsTab] = useState<'trainer' | 'player'>('trainer');

  // Global Trainer Filters
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '90days' | 'thisYear'>('all');
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>('all');
  const [isExportingTrainerStats, setIsExportingTrainerStats] = useState<boolean>(false);

  // Available Target Groups
  const availableTargetGroups = useMemo(() => {
    const set = new Set<string>();
    savedPlans.forEach(p => {
      if (p.targetGroup && p.targetGroup.trim()) {
        set.add(p.targetGroup.trim());
      }
    });
    return Array.from(set).sort();
  }, [savedPlans]);

  // Map of all exercises
  const exerciseMap = useMemo(() => {
    return new Map(exercises.map(e => [e.id || '', e]));
  }, [exercises]);

  // Filtered Plans by time & target group
  const filteredPlans = useMemo(() => {
    return savedPlans.filter(p => {
      if (targetGroupFilter !== 'all' && p.targetGroup !== targetGroupFilter) {
        return false;
      }
      if (timeFilter !== 'all' && p.date) {
        const pDate = new Date(p.date).getTime();
        const now = Date.now();
        if (timeFilter === '30days' && now - pDate > 30 * 86400000) return false;
        if (timeFilter === '90days' && now - pDate > 90 * 86400000) return false;
        if (timeFilter === 'thisYear') {
          const planYear = new Date(p.date).getFullYear();
          const curYear = new Date().getFullYear();
          if (planYear !== curYear) return false;
        }
      }
      return true;
    });
  }, [savedPlans, timeFilter, targetGroupFilter]);

  const handleExportTrainerStatsPDF = async () => {
    setIsExportingTrainerStats(true);
    try {
      await generateTrainerStatsPDF({
        plans: filteredPlans,
        exercises,
        groups,
        absences,
        timeFilter,
        targetGroupFilter,
        trainerName: user?.displayName || 'Torwarttrainer'
      });
    } catch (err) {
      console.error('Error generating trainer stats PDF:', err);
    } finally {
      setIsExportingTrainerStats(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 2 MAIN STATS TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {/* Button 1: Trainerbezogene Auswertung */}
          <button
            type="button"
            onClick={() => setStatsTab('trainer')}
            className={cn(
              "py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer",
              statsTab === 'trainer'
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-950/60 shadow-lg scale-[1.01]"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-slate-800/60"
            )}
          >
            <PieChart className="w-4 h-4 text-white/90" />
            <span>Trainerbezogene Auswertung</span>
          </button>

          {/* Button 2: Spielerbezogene Diagnostik */}
          <button
            type="button"
            onClick={() => setStatsTab('player')}
            className={cn(
              "py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer",
              statsTab === 'player'
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-950/60 shadow-lg scale-[1.01]"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-slate-800/60"
            )}
          >
            <Users className="w-4 h-4 text-white/90" />
            <span>Spielerbezogene Auswertung</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: TRAINERBEZOGENE AUSWERTUNG (DIE 4 KERNFRAGEN)                */}
      {/* =================================================================== */}
      {statsTab === 'trainer' && (
        <div className="space-y-6">
          {/* TRAINER FILTER BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                {/* Zeitraum-Filter */}
                <div className="lg:col-span-4 space-y-1.5">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block">
                    Zeitraum
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 min-h-[44px]">
                    <button
                      type="button"
                      onClick={() => setTimeFilter('all')}
                      className={cn(
                        "py-2 px-2 rounded-xl font-bold text-center transition cursor-pointer text-xs",
                        timeFilter === 'all'
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      Gesamt
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeFilter('30days')}
                      className={cn(
                        "py-2 px-2 rounded-xl font-bold text-center transition cursor-pointer text-xs",
                        timeFilter === '30days'
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      30 Tage
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeFilter('90days')}
                      className={cn(
                        "py-2 px-2 rounded-xl font-bold text-center transition cursor-pointer text-xs",
                        timeFilter === '90days'
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      90 Tage
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeFilter('thisYear')}
                      className={cn(
                        "py-2 px-2 rounded-xl font-bold text-center transition cursor-pointer text-xs",
                        timeFilter === 'thisYear'
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      Dieses Jahr
                    </button>
                  </div>
                </div>

                {/* Zielgruppen-Filter als Reiter (Tabs) mit Gefilterte Pläne rechts daneben */}
                <div className="lg:col-span-8 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block">
                      Trainingsgruppe / Zielgruppe
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 min-h-[44px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTargetGroupFilter('all')}
                        className={cn(
                          "py-2 px-3 rounded-xl font-bold text-center transition cursor-pointer text-xs flex items-center gap-1.5",
                          targetGroupFilter === 'all'
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        )}
                      >
                        <span>Alle Zielgruppen</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/30 font-mono font-black">
                          {savedPlans.length}
                        </span>
                      </button>
                      {availableTargetGroups.map(tg => {
                        const count = savedPlans.filter(p => p.targetGroup === tg).length;
                        const isActive = targetGroupFilter === tg;
                        return (
                          <button
                            key={tg}
                            type="button"
                            onClick={() => setTargetGroupFilter(tg)}
                            className={cn(
                              "py-2 px-3 rounded-xl font-bold text-center transition cursor-pointer text-xs flex items-center gap-1.5",
                              isActive
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                            )}
                          >
                            <span>{tg}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/30 font-mono font-black">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 ml-auto flex-shrink-0">
                      <span>Gefilterte Pläne:</span>
                      <strong className="text-emerald-400">{filteredPlans.length}</strong>
                      <span className="text-slate-600">/</span>
                      <span>{savedPlans.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FRAGE 1: THEMENVERTEILUNG */}
          <TrainerThemeStats
            filteredPlans={filteredPlans}
            groups={groups}
            absences={absences}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            targetGroupFilter={targetGroupFilter}
            setTargetGroupFilter={setTargetGroupFilter}
            availableTargetGroups={availableTargetGroups}
            isExportingTrainerStats={isExportingTrainerStats}
            onExportTrainerStatsPDF={handleExportTrainerStatsPDF}
          />

          {/* FRAGE 2: 30-TECHNIKEN-MATRIX */}
          <TechniqueBarChart
            filteredPlans={filteredPlans}
            exerciseMap={exerciseMap}
          />

          {/* FRAGE 3: TRAININGSPHASEN & BELASTUNGSMUSTER */}
          <TacticsRadarCard
            filteredPlans={filteredPlans}
            exerciseMap={exerciseMap}
          />

          {/* FRAGE 4: MATERIALEINSATZ & HEATMAP */}
          <MaterialHeatmap
            filteredPlans={filteredPlans}
            exerciseMap={exerciseMap}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: TORWART-DIAGNOSTIK (SPIELERBEZOGENE AUSWERTUNG)              */}
      {/* =================================================================== */}
      {statsTab === 'player' && (
        <div className="space-y-6">
          <PlayerDiagnosticsCard
            groups={groups}
            absences={absences}
            evaluations={evaluations}
            feedbackTalks={feedbackTalks}
            savedPlans={savedPlans}
            exercises={exercises}
            matchPlaytimes={matchPlaytimes}
          />
        </div>
      )}
    </div>
  );
};
