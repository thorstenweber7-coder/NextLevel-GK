import React, { useState, useMemo } from 'react';
import type { TrainingPlan, Exercise } from '../../types';
import { 
  BarChart3, 
  Sparkles, 
  ChevronUp, 
  ChevronDown, 
  AlertCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { TRAINING_PHASE_CONFIG } from './statsConfig';

interface TacticsRadarCardProps {
  filteredPlans: TrainingPlan[];
  exerciseMap: Map<string, Exercise>;
}

function formatDurationHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}

export const TacticsRadarCard: React.FC<TacticsRadarCardProps> = ({
  filteredPlans,
  exerciseMap
}) => {
  const [openQuestion3, setOpenQuestion3] = useState<boolean>(false);
  const [hoveredPhaseKey, setHoveredPhaseKey] = useState<string | null>(null);

  // Aggregated Phase Metrics (Gestapeltes Balkendiagramm)
  const phaseStats = useMemo(() => {
    const phaseKeys = ['WarmUp', 'Analytisch', 'Situativ', 'Integrativ', 'CoolDown'] as const;
    const totals: Record<string, { minutes: number; count: number }> = {
      WarmUp: { minutes: 0, count: 0 },
      Analytisch: { minutes: 0, count: 0 },
      Situativ: { minutes: 0, count: 0 },
      Integrativ: { minutes: 0, count: 0 },
      CoolDown: { minutes: 0, count: 0 }
    };

    let overallTotalMinutes = 0;

    filteredPlans.forEach(plan => {
      const planPhases = plan.phaseExercises || plan.phases || {};
      const customExercises = plan.customPlanExercises || {};
      let planTotalMin = 0;

      Object.entries(planPhases).forEach(([phaseId, exIds]) => {
        (exIds || []).forEach(exId => {
          const exercise = customExercises[exId] || exerciseMap.get(exId);
          if (!exercise) return;

          const duration = exercise.durationMinutes || 15;
          let category = exercise.category;

          if (!category) {
            const lowPhase = phaseId.toLowerCase();
            if (lowPhase.includes('warmup') || lowPhase.includes('warm-up') || lowPhase.includes('aufwärmen')) category = 'WarmUp';
            else if (lowPhase.includes('analytisch') || lowPhase.includes('technik')) category = 'Analytisch';
            else if (lowPhase.includes('situativ') || lowPhase.includes('taktik')) category = 'Situativ';
            else if (lowPhase.includes('integrativ') || lowPhase.includes('spielform')) category = 'Integrativ';
            else if (lowPhase.includes('cooldown') || lowPhase.includes('cool-down') || lowPhase.includes('abschluss')) category = 'CoolDown';
            else category = 'Analytisch';
          }

          if (totals[category]) {
            totals[category].minutes += duration;
            totals[category].count += 1;
            planTotalMin += duration;
            overallTotalMinutes += duration;
          } else {
            totals['Situativ'].minutes += duration;
            totals['Situativ'].count += 1;
            planTotalMin += duration;
            overallTotalMinutes += duration;
          }
        });
      });

      if (planTotalMin === 0) {
        const fallbackTotal = Number(plan.totalMinutes || plan.totalDuration || 90);
        const standardWeights = { WarmUp: 15 / 90, Analytisch: 20 / 90, Situativ: 25 / 90, Integrativ: 20 / 90, CoolDown: 10 / 90 };
        phaseKeys.forEach(k => {
          const alloc = Math.round(fallbackTotal * standardWeights[k]);
          totals[k].minutes += alloc;
          totals[k].count += 1;
        });
        overallTotalMinutes += fallbackTotal;
      }
    });

    const totalPlans = filteredPlans.length;
    const items = phaseKeys.map(k => {
      const conf = TRAINING_PHASE_CONFIG[k];
      const data = totals[k];
      const percentage = overallTotalMinutes > 0 ? (data.minutes / overallTotalMinutes) * 100 : 0;
      const avgMinutesPerSession = totalPlans > 0 ? data.minutes / totalPlans : 0;

      return {
        key: k,
        config: conf,
        totalMinutes: data.minutes,
        count: data.count,
        percentage,
        avgMinutesPerSession
      };
    });

    return {
      items,
      overallTotalMinutes,
      totalPlans
    };
  }, [filteredPlans, exerciseMap]);

  return (
    <div className="space-y-6">
      {/* QUESTION 3 BANNER */}
      <div
        onClick={() => setOpenQuestion3(prev => !prev)}
        className={cn(
          "relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-950/90 via-slate-900 to-slate-950 border-2 p-5 sm:p-7 shadow-2xl cursor-pointer select-none transition-all group",
          openQuestion3
            ? "border-cyan-500/60 shadow-cyan-950/40"
            : "border-slate-800 hover:border-cyan-500/50 hover:scale-[1.003]"
        )}
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-teal-500/10 text-cyan-300 border border-cyan-500/50 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-7 h-7 sm:w-8 h-8" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Frage 3 von 4
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Trainingsstruktur • Phasen-Verteilung</span>
                </div>
              </div>

              <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug tracking-tight group-hover:text-cyan-200 transition-colors">
                „Welchen Anteil hat welche Trainingsphase an der Gesamttrainingszeit meines Trainings?“
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
              {openQuestion3 ? 'Einklappen' : 'Ausklappen'}
            </span>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-slate-300 group-hover:text-white group-hover:border-cyan-500/60 transition-all shadow-md">
              {openQuestion3 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION 3 CONTENT */}
      {openQuestion3 && (
        <div className="space-y-6 animate-fadeIn">
          {/* PHASE METRICS KPI GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {phaseStats.items.map(item => (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredPhaseKey(item.key)}
                onMouseLeave={() => setHoveredPhaseKey(null)}
                className={cn(
                  "bg-slate-900/90 border rounded-3xl p-4 shadow-lg space-y-1.5 transition-all cursor-pointer",
                  hoveredPhaseKey === item.key
                    ? "border-cyan-500/60 bg-slate-850 shadow-cyan-950/30 scale-[1.02]"
                    : "border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-lg border", item.config.badge)}>
                    {item.config.name}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.config.hex }} />
                </div>

                <div className="text-xl sm:text-2xl font-black font-mono pt-0.5" style={{ color: item.config.hex }}>
                  {item.percentage.toFixed(1)} %
                </div>

                <div className="text-[11px] text-slate-300 font-bold flex items-center justify-between border-t border-slate-800/80 pt-1">
                  <span className="text-slate-500 font-normal">Ø pro Einheit:</span>
                  <span className="font-mono text-white">{item.avgMinutesPerSession.toFixed(0)} Min.</span>
                </div>

                <div className="text-[10px] text-slate-500 truncate" title={item.config.description}>
                  {formatDurationHM(item.totalMinutes)} gesamt
                </div>
              </div>
            ))}
          </div>

          {/* MAIN VISUALIZATION: GESTAPELTES BALKENDIAGRAMM */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Gestapeltes Balkendiagramm: Gesamttrainingszeit (100 %)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Visualisierung der relativen Zeitverteilung aller 5 Trainingsphasen
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 font-sans mr-1.5 font-bold">Gesamtdauer:</span>
                  <strong className="text-emerald-400">{formatDurationHM(phaseStats.overallTotalMinutes)}</strong>
                </div>
                <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 font-sans mr-1.5 font-bold">Einheiten:</span>
                  <strong className="text-white">{phaseStats.totalPlans}</strong>
                </div>
              </div>
            </div>

            {phaseStats.totalPlans === 0 ? (
              <div className="p-10 text-center space-y-2 bg-slate-950 rounded-2xl border border-slate-800">
                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="font-bold text-white text-sm">Keine Trainingseinheiten für diese Filterauswahl vorhanden</div>
                <div className="text-xs text-slate-400">Erstelle und archiviere Trainingseinheiten im Trainingsplaner, um Phasen-Auswertungen zu sehen.</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. DER GROSSE GESTAPELTE MASTER-BALKEN (100% BREITE) */}
                <div className="space-y-2">
                  <div className="w-full h-14 sm:h-16 bg-slate-950 rounded-2xl p-1.5 border border-slate-800 shadow-inner flex overflow-hidden gap-1">
                    {phaseStats.items.map(item => {
                      const isHovered = hoveredPhaseKey === item.key;
                      const hasWidth = item.percentage > 0;
                      if (!hasWidth && phaseStats.overallTotalMinutes > 0) return null;

                      return (
                        <div
                          key={item.key}
                          onMouseEnter={() => setHoveredPhaseKey(item.key)}
                          onMouseLeave={() => setHoveredPhaseKey(null)}
                          style={{
                            width: `${Math.max(item.percentage, 2)}%`,
                            backgroundColor: item.config.hex
                          }}
                          className={cn(
                            "h-full rounded-xl transition-all duration-300 flex flex-col items-center justify-center text-center px-1 cursor-pointer select-none relative overflow-hidden group",
                            isHovered
                              ? "brightness-125 scale-y-105 shadow-lg z-10"
                              : "opacity-95 hover:opacity-100"
                          )}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/20 pointer-events-none" />

                          {item.percentage >= 10 && (
                            <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-md truncate max-w-full z-10">
                              {item.config.shortName}
                            </span>
                          )}
                          <span className="text-[9px] sm:text-[11px] font-black text-white/95 font-mono drop-shadow-md z-10">
                            {item.percentage.toFixed(1)} %
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-mono px-1">
                    <span>0 %</span>
                    <span>25 %</span>
                    <span>50 %</span>
                    <span>75 %</span>
                    <span>100 % der Gesamttrainingszeit</span>
                  </div>
                </div>

                {/* 2. DETAILLIERTE PHASEN-AUFSCHLÜSSELUNG */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {phaseStats.items.map(item => {
                    const isHovered = hoveredPhaseKey === item.key;

                    return (
                      <div
                        key={item.key}
                        onMouseEnter={() => setHoveredPhaseKey(item.key)}
                        onMouseLeave={() => setHoveredPhaseKey(null)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer",
                          isHovered
                            ? "bg-slate-850 border-cyan-500/60 shadow-md shadow-slate-950"
                            : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-md border", item.config.badge)}>
                              {item.config.name}
                            </span>
                            <span className="text-xs font-mono font-black text-white">
                              {item.percentage.toFixed(1)} %
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 pt-1 leading-snug">
                            {item.config.description}
                          </p>
                        </div>

                        <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500">Gesamtdauer:</span>
                          <span className="text-emerald-400 font-bold">{formatDurationHM(item.totalMinutes)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
