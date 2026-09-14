import React, { useState } from 'react';
import type { 
  AthleticTestMetrics, 
  BiologicalMaturityMetrics, 
  Player 
} from '../types';
import { evaluateAllAthleticTests } from '../utils/athleticNormEvaluation';
import { 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Scale, 
  Sparkles, 
  Info, 
  Award,
  History
} from 'lucide-react';
import { cn } from '../utils/cn';

interface AthleticEvaluationMatrixCardProps {
  player: Player;
  athleticMetrics?: AthleticTestMetrics;
  biologicalMetrics?: BiologicalMaturityMetrics;
  savedTimestamp?: number | null;
}

const SCALE_LEVELS = [
  { level: 1.0, isPrimary: true, label: '1' },
  { level: 1.5, isPrimary: false, label: '1.5' },
  { level: 2.0, isPrimary: true, label: '2' },
  { level: 2.5, isPrimary: false, label: '2.5' },
  { level: 3.0, isPrimary: true, label: '3' },
  { level: 3.5, isPrimary: false, label: '3.5' },
  { level: 4.0, isPrimary: true, label: '4' },
  { level: 4.5, isPrimary: false, label: '4.5' },
  { level: 5.0, isPrimary: true, label: '5' },
];

function getLevelBadgeStyle(score: number) {
  if (score >= 5.0) return { bg: 'bg-purple-950 text-purple-300 border-purple-600', label: 'Elite / Benchmark' };
  if (score >= 4.0) return { bg: 'bg-sky-950 text-sky-300 border-sky-600', label: 'Gute NLZ-Leistung' };
  if (score >= 3.0) return { bg: 'bg-emerald-950 text-emerald-300 border-emerald-600', label: 'NLZ-Durchschnitt (Sollwert)' };
  if (score >= 2.0) return { bg: 'bg-amber-950 text-amber-300 border-amber-600', label: 'Basis-Entwicklungsbereich' };
  if (score > 0) return { bg: 'bg-rose-950 text-rose-300 border-rose-600', label: 'Förderbedarf' };
  return { bg: 'bg-slate-900 text-slate-500 border-slate-800', label: 'Unbewertet' };
}

export const AthleticEvaluationMatrixCard: React.FC<AthleticEvaluationMatrixCardProps> = ({
  player,
  athleticMetrics,
  biologicalMetrics,
  savedTimestamp
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hoveredItemLevel, setHoveredItemLevel] = useState<{ itemId: string; level: number } | null>(null);

  const evaluationResult = evaluateAllAthleticTests(
    athleticMetrics,
    biologicalMetrics,
    player.birthYear
  );

  const { items, phvInfo, overallScore } = evaluationResult;
  const phvStage = phvInfo.stage;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all">
      
      {/* ========================================================================= */}
      {/* ACCORDION HEADER (Click to toggle)                                        */}
      {/* ========================================================================= */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/50 transition select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-teal-400 border border-teal-500/30 flex-shrink-0 shadow-inner">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-extrabold text-white">
                Standardisierte 5-Stufen Bewertungsmatrix
              </h4>
              {savedTimestamp ? (
                <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 font-mono inline-flex items-center gap-1.5 shadow-sm">
                  <History className="w-3 h-3 text-emerald-400" />
                  <span>Letzter gespeicherter Stand: {new Date(savedTimestamp).toLocaleDateString('de-DE')}, {new Date(savedTimestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-mono inline-flex items-center gap-1">
                  <span>Noch keine gespeicherten Daten</span>
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-mono hidden md:inline-flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-slate-500" />
                <span>Schreibgeschützt</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-300 font-semibold">
                {savedTimestamp ? 'Bewertungsmatrix der letzten gespeicherten Daten' : 'Bewertungsmatrix der aktuellen Eingabedaten'}
              </span>
              <span>• Eingeordnet nach:</span>
              <strong className={cn(
                "px-2 py-0.2 rounded text-[10.5px] font-mono font-bold border",
                phvStage === 'Pre-PHV' ? "bg-sky-950 text-sky-300 border-sky-700" :
                phvStage === 'Circa-PHV' ? "bg-amber-950 text-amber-300 border-amber-700" :
                "bg-purple-950 text-purple-300 border-purple-700"
              )}>
                {phvStage}
                {phvInfo.offsetYears !== undefined && ` • Offset: ${phvInfo.offsetYears > 0 ? '+' : ''}${phvInfo.offsetYears} J.`}
              </strong>
              {biologicalMetrics?.measurementDate && (
                <span className="text-[11px] text-teal-300/90 font-mono">
                  (Bio-Stand: {biologicalMetrics.measurementDate.includes('-') ? biologicalMetrics.measurementDate.split('-').reverse().join('.') : biologicalMetrics.measurementDate})
                </span>
              )}
              <span>({items.filter(i => i.score > 0).length} von 10 Tests ausgewertet)</span>
            </p>
          </div>
        </div>

        {/* Right side KPIs & Toggle Icon */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs px-3 py-1.5 rounded-xl font-bold font-mono border shadow-sm flex items-center gap-1.5",
              overallScore 
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-700"
                : "bg-slate-950 text-slate-500 border-slate-800"
            )}>
              <Award className="w-3.5 h-3.5" />
              <span>{overallScore ? `Ø ${overallScore} / 5.0` : 'Keine Messwerte'}</span>
            </span>
          </div>

          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACCORDION BODY (Expanded Content)                                         */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="p-5 sm:p-6 pt-0 border-t border-slate-800/80 space-y-5 animate-in fade-in duration-200">
          
          {/* Scientific Info Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 mt-4 text-xs">
            <div className="flex items-center gap-2 text-teal-400 font-extrabold text-xs">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span>Automatische Normwert-Klassifizierung nach NLZ-Standard</span>
            </div>
            <p className="text-slate-300 text-[11.5px] leading-relaxed">
              Die 9-Stufen-Bewertung (1,0 bis 5,0) wird vollautomatisch aus den oben erfassten <strong>10 Messwerten der 7 Athletiktests</strong> sowie dem biologischen Reifegrad (<strong>{phvStage}</strong>) anhand der offiziellen NextLevel Goalkeeping Normwerttabellen berechnet. Eine manuelle Veränderung durch Nutzer ist gesperrt, um eine objektive, wissenschaftlich valide Einstufung zu garantieren.
            </p>
          </div>

          {/* 10 Test Parameter Cards */}
          <div className="space-y-4">
            {items.map((item) => {
              const badge = getLevelBadgeStyle(item.score);

              return (
                <div 
                  key={item.id} 
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition space-y-3 shadow-sm"
                >
                  {/* Item Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {item.testNumber}.
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        {item.name}
                      </span>
                      <span className="text-[10.5px] text-slate-400 font-medium hidden md:inline">
                        • {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Measured Value Pill */}
                      <span className={cn(
                        "text-[11px] font-mono px-2.5 py-0.5 rounded-lg border",
                        item.measuredNumericValue > 0 
                          ? "bg-slate-900 text-teal-300 border-slate-700 font-bold"
                          : "bg-slate-900/60 text-slate-500 border-slate-800"
                      )}>
                        Messwert: <strong>{item.measuredValueDisplay}</strong>
                      </span>

                      {/* Stufen-Badge */}
                      {item.score > 0 ? (
                        <span className={cn("px-2.5 py-0.5 rounded-lg text-xs border font-black", badge.bg)}>
                          Stufe {item.score} / 5.0
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          nicht erfasst
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 5 Primary + 4 Intermediate Step Buttons (Read-Only / Locked) */}
                  <div className="flex items-center w-full gap-1 sm:gap-1.5 pt-1">
                    {SCALE_LEVELS.map((lvl, lIdx) => {
                      const isSelected = item.score === lvl.level;
                      const isPrimary = lvl.isPrimary;
                      const isHovered = hoveredItemLevel?.itemId === item.id && hoveredItemLevel?.level === lvl.level;
                      const cutoffValStr = item.normCutoffs[lIdx] || '–';

                      return (
                        <div
                          key={lvl.level}
                          className={cn(
                            "relative flex items-center justify-center",
                            isPrimary ? "flex-[2]" : "flex-1"
                          )}
                          onMouseEnter={() => setHoveredItemLevel({ itemId: item.id, level: lvl.level })}
                          onMouseLeave={() => setHoveredItemLevel(null)}
                        >
                          {/* Hover Tooltip showing Normwert Threshold */}
                          {isHovered && (
                            <div className={cn(
                              "absolute bottom-full mb-2.5 w-56 max-w-[85vw] bg-slate-900/95 backdrop-blur-md border border-slate-700 text-slate-100 p-2.5 rounded-xl shadow-2xl z-50 pointer-events-none text-left animate-in fade-in zoom-in-95 duration-150",
                              lvl.level <= 1.5 ? "left-0" : lvl.level >= 4.5 ? "right-0" : "left-1/2 -translate-x-1/2"
                            )}>
                              <div className="flex items-center justify-between gap-1 font-bold text-[10.5px] text-teal-400 mb-1 border-b border-slate-800 pb-1">
                                <span>Stufe {lvl.level} ({phvStage})</span>
                                {lvl.level === 3.0 && <span className="text-emerald-400 text-[10px]">★ NLZ-Sollwert</span>}
                                {lvl.level === 5.0 && <span className="text-purple-400 text-[10px]">★ Elite</span>}
                              </div>
                              <p className="text-[11px] text-slate-200 leading-snug">
                                Richtwert: <strong>{cutoffValStr}</strong>
                              </p>
                              {/* Arrow */}
                              <div className={cn(
                                "absolute top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-700",
                                lvl.level <= 1.5 ? "left-4" : lvl.level >= 4.5 ? "right-4" : "left-1/2 -translate-x-1/2"
                              )} />
                            </div>
                          )}

                          {/* Button Display */}
                          <div
                            className={cn(
                              "w-full flex items-center justify-center font-black rounded-xl select-none transition-all cursor-default",
                              isPrimary ? "py-2 sm:py-2.5 text-xs sm:text-sm" : "py-1.5 sm:py-2 text-[10px] sm:text-xs",
                              isSelected
                                ? (
                                    lvl.level >= 4.5 ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-lg shadow-purple-950/60 ring-2 ring-purple-400/80 scale-105 z-10" :
                                    lvl.level >= 3.5 ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/80 scale-105 z-10" :
                                    lvl.level >= 2.5 ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-950/60 ring-2 ring-amber-400/80 scale-105 z-10" :
                                    "bg-gradient-to-r from-rose-600 to-rose-700 text-white font-black shadow-lg shadow-rose-950/60 ring-2 ring-rose-400/80 scale-105 z-10"
                                  )
                                : isPrimary
                                  ? "bg-slate-900 border border-slate-800 text-slate-500 opacity-60"
                                  : "bg-slate-900/40 border border-slate-850 text-slate-600 opacity-40 text-[9px]"
                            )}
                          >
                            <span>{lvl.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Benchmark Comparison Line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400 pt-1 border-t border-slate-900">
                    <span className="flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">NLZ-Sollwert (3,0):</span> {item.targetBaseline}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-purple-400 font-bold">Elite Benchmark (5,0):</span> {item.eliteBenchmark}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Card Info */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Info className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>
                Die errechneten Scores fließen automatisch in das Athletik-Profil und den Torwart-Entwicklungsbericht ein.
              </span>
            </div>
            <div className="flex items-center gap-2 font-bold text-emerald-400 font-mono">
              <span>Gesamt-Athletikscore: {overallScore ? `${overallScore} / 5.0` : '–'}</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
