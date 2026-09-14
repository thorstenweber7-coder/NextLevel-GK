import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { TrainingPlan, Exercise, TrainingStructure, TrainingGroup, CompetitionRound } from '../types';
import { VideoEmbedPlayer } from './VideoEmbedPlayer';
import { 
  X, 
  Clock, 
  Users, 
  Sparkles, 
  Package, 
  Trophy,
  Maximize2,
  Info
} from 'lucide-react';
import { cn } from '../utils/cn';
import { LiveTimerHud } from './live/LiveTimerHud';
import { LiveCompetitionBoard } from './live/LiveCompetitionBoard';
import { useLiveSessionPersistence } from '../hooks/useLiveSessionPersistence';

interface LiveSessionModalProps {
  plan: TrainingPlan;
  exerciseMap: Map<string, Exercise>;
  structures: TrainingStructure[];
  groups?: TrainingGroup[];
  onClose: () => void;
  onPlanUpdated?: (updatedPlan: TrainingPlan) => void;
}

interface FlattenedExerciseItem {
  exercise: Exercise;
  phaseId: string;
  phaseName: string;
  phaseDuration: number;
  phaseIndex: number;
  totalPhases: number;
  exerciseIndexInPhase: number;
  totalExercisesInPhase: number;
  globalIndex: number;
}

const COMPETITION_PRESETS = [
  '⚡ Torschussduell',
  '🥊 1-gegen-1 Turnier',
  '🎯 Reaktions-Challenge',
  '👑 11m-König',
  '🧤 Flankenduell',
  '💥 Fang- & Trefferquote',
  '🏃 Schnelligkeits-Parcours',
  '🎮 Freier Wettkampf'
];

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({
  plan,
  exerciseMap,
  structures,
  groups = [],
  onClose,
  onPlanUpdated: _onPlanUpdated
}) => {
  // Active View Tab: 'timer' (Exercise timer & details) or 'competition' (Scoreboard)
  const [activeViewTab, setActiveViewTab] = useState<'timer' | 'competition'>('timer');
  const [sunMode, setSunMode] = useState<boolean>(false);
  const [showTacticZoom, setShowTacticZoom] = useState<boolean>(false);
  const [isWetScreenLocked, setIsWetScreenLocked] = useState<boolean>(false);

  // 1. Structure & Flattened Exercises List
  const activeStructure = useMemo(() => {
    return structures.find(s => s.id === plan.structureId) || structures[0];
  }, [plan, structures]);

  const flattenedExercises: FlattenedExerciseItem[] = useMemo(() => {
    const phaseMap = plan.phaseExercises || plan.phases || {};
    const items: FlattenedExerciseItem[] = [];
    const phases = activeStructure?.phases || [];

    let globalCount = 0;
    phases.forEach((phase, pIdx) => {
      const exIds = phaseMap[phase.id] || [];
      exIds.forEach((id, eIdx) => {
        const ex = exerciseMap.get(id) || plan.customPlanExercises?.[id];
        if (ex) {
          items.push({
            exercise: ex,
            phaseId: phase.id,
            phaseName: phase.name,
            phaseDuration: phase.defaultDurationMinutes || ex.durationMinutes || 15,
            phaseIndex: pIdx,
            totalPhases: phases.length,
            exerciseIndexInPhase: eIdx,
            totalExercisesInPhase: exIds.length,
            globalIndex: globalCount++
          });
        }
      });
    });

    return items;
  }, [plan, exerciseMap, activeStructure]);

  // Unique materials across all exercises in this training plan
  const allUniqueMaterials = useMemo(() => {
    const set = new Set<string>();
    flattenedExercises.forEach(item => {
      if (Array.isArray(item.exercise.materials)) {
        item.exercise.materials.forEach(m => {
          if (m && typeof m === 'string' && m.trim()) {
            set.add(m.trim());
          }
        });
      }
    });
    return Array.from(set);
  }, [flattenedExercises]);

  // Important info / notes (same as top of PDF export: video analysis & importantNotes/notes)
  const importantInfoParts = useMemo(() => {
    const parts: string[] = [];
    if (plan.hasVideoAnalysis) {
      const vText = plan.videoAnalysisNotes && plan.videoAnalysisNotes.trim()
        ? `Videoanalyse: ${plan.videoAnalysisNotes.trim()}`
        : 'Videoanalyse: Für diese Trainingseinheit angesetzt';
      parts.push(vText);
    }
    if (plan.importantNotes && plan.importantNotes.trim()) {
      parts.push(plan.importantNotes.trim());
    } else if ((plan as any).notes && (plan as any).notes.trim()) {
      parts.push((plan as any).notes.trim());
    }
    return parts;
  }, [plan]);

  // Current Exercise Index & Timer State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentItem = flattenedExercises[currentIndex] || null;

  const initialDurationSeconds = (currentItem?.exercise.durationMinutes || currentItem?.phaseDuration || 15) * 60;
  const [timeLeft, setTimeLeft] = useState<number>(initialDurationSeconds);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [watchNotificationEnabled, setWatchNotificationEnabled] = useState<boolean>(false);

  // Audio Context & iOS WebAudio Unlock Reference
  const audioContextRef = useRef<AudioContext | null>(null);

  const unlockAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }, []);

  // Unlock audio on initial user interaction inside live modal
  useEffect(() => {
    const handleFirstGesture = () => {
      unlockAudioContext();
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
    };
    window.addEventListener('touchstart', handleFirstGesture, { once: true });
    window.addEventListener('click', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
    };
  }, [unlockAudioContext]);

  // Sound generator (chime / beep) for Phase Completion
  const playAlarmSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      unlockAudioContext();
      const ctx = audioContextRef.current;
      if (!ctx) return;

      // Three upbeat chimes (Schlusspfiff / Phasenende)
      [0, 0.18, 0.36].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i === 2 ? 880 : 587.33, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, [soundEnabled, unlockAudioContext]);

  // Target end time ref for accurate delta timer without drift
  const targetEndTimeRef = useRef<number | null>(null);

  // Update timer duration when changing active exercise
  useEffect(() => {
    if (currentItem) {
      const secs = (currentItem.exercise.durationMinutes || currentItem.phaseDuration || 15) * 60;
      setTimeLeft(secs);
      setTimerRunning(false);
      targetEndTimeRef.current = null;
    }
  }, [currentIndex]);

  // Competition & Debrief State
  const [competitionRounds, setCompetitionRounds] = useState<CompetitionRound[]>(() => {
    if (plan.competitionRounds && plan.competitionRounds.length > 0) {
      return plan.competitionRounds;
    }
    return [{
      id: `round_${Date.now()}`,
      title: plan.competitionTitle || 'Runde 1: Torwart-Wettkampf',
      scores: plan.keeperCompetitionScores || {},
      createdAt: Date.now()
    }];
  });
  const [selectedRoundId, setSelectedRoundId] = useState<string>(() => competitionRounds[0]?.id || 'round_1');

  // 2. LIVE SESSION PERSISTENCE & RESTORE PROMPT
  const {
    hasDraft,
    existingDraft,
    saveSessionDraft,
    clearSessionDraft
  } = useLiveSessionPersistence(plan.id);

  const [showRestoreDraftPrompt, setShowRestoreDraftPrompt] = useState<boolean>(false);

  useEffect(() => {
    if (hasDraft && existingDraft) {
      setShowRestoreDraftPrompt(true);
    }
  }, [hasDraft, existingDraft]);

  const handleRestoreDraft = () => {
    if (!existingDraft) return;
    setCurrentIndex(existingDraft.currentIndex ?? 0);
    setTimeLeft(existingDraft.timeLeft ?? initialDurationSeconds);
    if (existingDraft.competitionRounds?.length) {
      setCompetitionRounds(existingDraft.competitionRounds);
      setSelectedRoundId(existingDraft.competitionRounds[0]?.id || 'round_1');
    }
    setShowRestoreDraftPrompt(false);
  };

  const handleDeclineDraft = () => {
    clearSessionDraft();
    setShowRestoreDraftPrompt(false);
  };

  // Auto-save live draft debounced
  useEffect(() => {
    saveSessionDraft({
      currentIndex,
      timeLeft,
      competitionRounds
    });
  }, [currentIndex, timeLeft, competitionRounds, saveSessionDraft]);

  // Keepers list for selected group
  const matchedGroup = useMemo(() => {
    return groups.find(g => g.id === plan.groupId || g.name === plan.targetGroup) || groups[0];
  }, [groups, plan.groupId, plan.targetGroup]);

  const groupKeepers = useMemo(() => {
    return matchedGroup?.players || [];
  }, [matchedGroup]);

  // Timer Tick Interval (Timestamp-Delta avoids throttling drift)
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + timeLeft * 1000;
      }

      interval = setInterval(() => {
        if (targetEndTimeRef.current !== null) {
          const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
            setTimerRunning(false);
            targetEndTimeRef.current = null;
            playAlarmSound();
          }
        }
      }, 250);
    } else {
      targetEndTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [timerRunning, playAlarmSound, timeLeft]);

  // Wet Screen Lock Long-Press Logic
  const [unlockProgress, setUnlockProgress] = useState<number>(0);
  const unlockRafRef = useRef<any>(null);
  const unlockStartTimeRef = useRef<number | null>(null);

  const startUnlockHold = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    unlockStartTimeRef.current = performance.now();
    const durationMs = 1500;

    const tick = (now: number) => {
      if (!unlockStartTimeRef.current) return;
      const elapsed = now - unlockStartTimeRef.current;
      const progress = Math.min(100, (elapsed / durationMs) * 100);
      setUnlockProgress(progress);

      if (progress >= 100) {
        setIsWetScreenLocked(false);
        setUnlockProgress(0);
        unlockStartTimeRef.current = null;
        return;
      }
      unlockRafRef.current = requestAnimationFrame(tick);
    };
    unlockRafRef.current = requestAnimationFrame(tick);
  };

  const cancelUnlockHold = () => {
    unlockStartTimeRef.current = null;
    if (unlockRafRef.current) {
      cancelAnimationFrame(unlockRafRef.current);
      unlockRafRef.current = null;
    }
    setUnlockProgress(0);
  };

  // Timer Controls Handlers
  const handleToggleTimer = () => {
    unlockAudioContext();
    if (!timerRunning) {
      targetEndTimeRef.current = Date.now() + Math.max(0, timeLeft) * 1000;
      setTimerRunning(true);
    } else {
      targetEndTimeRef.current = null;
      setTimerRunning(false);
    }
  };

  const handleAdjustTimerSeconds = (deltaSeconds: number) => {
    setTimeLeft(prev => {
      const next = Math.max(0, prev + deltaSeconds);
      if (timerRunning) {
        targetEndTimeRef.current = Date.now() + next * 1000;
      }
      return next;
    });
  };

  const handleResetTimer = () => {
    setTimeLeft(initialDurationSeconds);
    setTimerRunning(false);
    targetEndTimeRef.current = null;
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < flattenedExercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Competition Board Handlers
  const handleAddRound = (title?: string) => {
    const roundNumber = competitionRounds.length + 1;
    const newRound: CompetitionRound = {
      id: `round_${Date.now()}`,
      title: title || `Runde ${roundNumber}: Torwart-Wettkampf`,
      scores: {},
      createdAt: Date.now()
    };
    setCompetitionRounds(prev => [...prev, newRound]);
    setSelectedRoundId(newRound.id);
  };

  const handleDeleteRound = (roundId: string) => {
    if (competitionRounds.length <= 1) {
      if (window.confirm('Diese Runde zurücksetzen?')) {
        setCompetitionRounds([{
          id: `round_${Date.now()}`,
          title: 'Runde 1: Torwart-Wettkampf',
          scores: {},
          createdAt: Date.now()
        }]);
        setSelectedRoundId('total');
      }
      return;
    }
    const filtered = competitionRounds.filter(r => r.id !== roundId);
    setCompetitionRounds(filtered);
    setSelectedRoundId(filtered[0]?.id || 'total');
  };

  const handleResetRoundScores = (roundId: string) => {
    setCompetitionRounds(prev => prev.map(r => {
      if (r.id === roundId) return { ...r, scores: {} };
      return r;
    }));
  };

  const handleAdjustScore = (roundId: string, keeperId: string, delta: number) => {
    setCompetitionRounds(prev => prev.map(r => {
      if (r.id === roundId) {
        const currentScore = r.scores?.[keeperId] || 0;
        const nextScore = Math.max(0, currentScore + delta);
        return {
          ...r,
          scores: {
            ...r.scores,
            [keeperId]: nextScore
          }
        };
      }
      return r;
    }));
  };



  return (
    <div className={cn(
      "fixed inset-0 z-50 overflow-y-auto font-sans flex flex-col justify-between select-none transition-colors duration-200",
      sunMode ? "bg-white text-slate-900" : "bg-slate-950 text-slate-100"
    )}>
      {/* 1. TOP HEADER & VIEW TAB SWITCHER */}
      <div className={cn(
        "p-4 sm:p-5 flex items-center justify-between border-b gap-3 sticky top-0 z-40 backdrop-blur-md",
        sunMode ? "bg-slate-100/90 border-slate-300" : "bg-slate-900/90 border-slate-800"
      )}>
        {/* Left Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black truncate">{plan.title || 'Torwart-Training'}</h2>
            <p className="text-xs text-slate-400 truncate">
              {matchedGroup?.name || plan.targetGroup} • {plan.date}
            </p>
          </div>
        </div>

        {/* Center Tabs: Timer vs. Wettkampf */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveViewTab('timer')}
            className={cn(
              "px-4 py-2 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2",
              activeViewTab === 'timer'
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>Übungs-Timer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('competition')}
            className={cn(
              "px-4 py-2 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2",
              activeViewTab === 'competition'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-950"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Trophy className="w-4 h-4" />
            <span>Wettkampf</span>
          </button>
        </div>

        {/* Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2.5 min-h-[48px] min-w-[48px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
          title="Live-Modus schließen"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. DRAFT RESTORATION TOAST DIALOG */}
      {showRestoreDraftPrompt && existingDraft && (
        <div className="mx-4 mt-4 p-4 rounded-3xl bg-indigo-950/90 border border-indigo-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 text-xs">
            <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-white block">Laufende Trainingseinheit fortsetzen?</span>
              <span className="text-indigo-200/80">
                Es wurde ein Sitzungsstand für Form {existingDraft.currentIndex + 1} ({Math.round(existingDraft.timeLeft / 60)} Min.) gefunden.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDeclineDraft}
              className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs text-indigo-300 hover:text-white bg-slate-900 border border-slate-800 transition"
            >
              Neu starten
            </button>
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition"
            >
              Fortsetzen
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT AREA */}
      <div className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
        {activeViewTab === 'timer' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Timer HUD, Gesamtmaterial & Wichtige Infos (col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
                <LiveTimerHud
                  currentItem={currentItem}
                  currentIndex={currentIndex}
                  totalExercises={flattenedExercises.length}
                  timeLeft={timeLeft}
                  initialDurationSeconds={initialDurationSeconds}
                  timerRunning={timerRunning}
                  soundEnabled={soundEnabled}
                  sunMode={sunMode}
                  watchNotificationEnabled={watchNotificationEnabled}
                  isWetScreenLocked={isWetScreenLocked}
                  unlockProgress={unlockProgress}
                  onToggleTimer={handleToggleTimer}
                  onAdjustTimerSeconds={handleAdjustTimerSeconds}
                  onResetTimer={handleResetTimer}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onToggleSound={() => setSoundEnabled(prev => !prev)}
                  onToggleSunMode={() => setSunMode(prev => !prev)}
                  onToggleWatchNotification={() => setWatchNotificationEnabled(prev => !prev)}
                  onToggleWetScreenLock={() => setIsWetScreenLocked(prev => !prev)}
                  onStartUnlockHold={startUnlockHold}
                  onCancelUnlockHold={cancelUnlockHold}
                />
              </div>

              {/* Benötigtes Gesamtmaterial */}
              <div className={cn(
                "rounded-3xl p-5 shadow-xl border transition-colors",
                sunMode ? "bg-amber-50 border-amber-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-100"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    "p-1.5 rounded-xl flex items-center justify-center",
                    sunMode ? "bg-amber-200 text-amber-900" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  )}>
                    <Package className="w-4 h-4" />
                  </div>
                  <h4 className={cn("text-xs sm:text-sm font-extrabold uppercase tracking-wider", sunMode ? "text-slate-900" : "text-white")}>
                    Benötigtes Gesamtmaterial ({allUniqueMaterials.length})
                  </h4>
                </div>

                {allUniqueMaterials.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allUniqueMaterials.map(mat => (
                      <span
                        key={mat}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition",
                          sunMode 
                            ? "bg-white border-amber-300 text-slate-900 shadow-sm" 
                            : "bg-slate-950 border-slate-800 text-slate-200 shadow-inner"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <span>{mat}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={cn("text-xs italic", sunMode ? "text-slate-600" : "text-slate-500")}>
                    Keine spezifischen Trainingsmaterialien erforderlich.
                  </p>
                )}
              </div>

              {/* Wichtiges zum Training (Wichtige Infos) */}
              <div className={cn(
                "rounded-3xl p-5 shadow-xl border transition-colors",
                sunMode ? "bg-emerald-50 border-emerald-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-100"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    "p-1.5 rounded-xl flex items-center justify-center",
                    sunMode ? "bg-emerald-200 text-emerald-900" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  )}>
                    <Info className="w-4 h-4" />
                  </div>
                  <h4 className={cn("text-xs sm:text-sm font-extrabold uppercase tracking-wider", sunMode ? "text-slate-900" : "text-white")}>
                    Wichtiges zum Training
                  </h4>
                </div>

                {importantInfoParts.length > 0 ? (
                  <div className="space-y-2.5">
                    {importantInfoParts.map((info, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-2xl border text-xs leading-relaxed whitespace-pre-line font-medium",
                          sunMode
                            ? "bg-white border-emerald-200 text-slate-900 shadow-sm"
                            : "bg-slate-950/80 border-slate-800 text-slate-200 shadow-inner"
                        )}
                      >
                        {info}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={cn("text-xs italic", sunMode ? "text-slate-600" : "text-slate-500")}>
                    Keine besonderen organisatorischen Hinweise hinterlegt.
                  </p>
                )}
              </div>
            </div>

            {/* Right: Exercise Details, Taktik-Visuals, Quick Debrief (col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              {currentItem ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                  {/* Exercise Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                        {currentItem.phaseName} • {currentItem.exercise.category}
                      </span>
                      <h3 className="text-lg sm:text-xl font-extrabold text-white truncate">
                        {currentItem.exercise.title}
                      </h3>
                    </div>

                    {(currentItem.exercise.imageUrl || currentItem.exercise.imageBase64) && (
                      <button
                        type="button"
                        onClick={() => setShowTacticZoom(true)}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold flex-shrink-0"
                        title="Taktikbild im Vollbild öffnen"
                      >
                        <Maximize2 className="w-4 h-4 text-emerald-400" />
                        <span>Vollbild</span>
                      </button>
                    )}
                  </div>

                  {/* Prominent Large Tactic Graphic (Min. 4x larger for clear pitch recognition) */}
                  {(currentItem.exercise.imageUrl || currentItem.exercise.imageBase64) && (
                    <div 
                      onClick={() => setShowTacticZoom(true)}
                      className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden group cursor-pointer flex items-center justify-center p-2 shadow-inner"
                      title="Klicken für Vollbild-Ansicht"
                    >
                      <img
                        src={currentItem.exercise.imageUrl || currentItem.exercise.imageBase64}
                        alt={currentItem.exercise.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg group-hover:bg-emerald-600 transition">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white" />
                        <span>Vollbild</span>
                      </div>
                    </div>
                  )}

                  {/* Video Embed Player */}
                  {currentItem.exercise.videoUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-800">
                      <VideoEmbedPlayer url={currentItem.exercise.videoUrl} title={currentItem.exercise.title} />
                    </div>
                  )}

                  {/* Übungs-Details: Ablauf, Technikprinzipien, Taktikprinzipien, Coachingpunkte, Siegbedingung */}
                  <div className="space-y-4 text-xs">
                    {/* Ablauf */}
                    {currentItem.exercise.ablauf && currentItem.exercise.ablauf.trim() && (
                      <div className="space-y-1 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                        <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[11px] block">
                          Ablauf:
                        </span>
                        <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                          {currentItem.exercise.ablauf}
                        </p>
                      </div>
                    )}

                    {/* Technikprinzipien */}
                    {((currentItem.exercise.technikprinzipien && currentItem.exercise.technikprinzipien.trim()) || (currentItem.exercise.technik && currentItem.exercise.technik.trim())) && (
                      <div className="space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-purple-900/40">
                        <span className="font-extrabold text-purple-400 uppercase tracking-wider text-[11px] block">
                          Technikprinzipien:
                        </span>
                        {currentItem.exercise.technik && currentItem.exercise.technikprinzipien && !currentItem.exercise.technikprinzipien.toLowerCase().includes(currentItem.exercise.technik.toLowerCase()) && (
                          <div className="text-xs font-semibold text-purple-300 mb-1">
                            Schwerpunkt: {currentItem.exercise.technik}
                          </div>
                        )}
                        {currentItem.exercise.technikprinzipien ? (
                          <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                            {currentItem.exercise.technikprinzipien}
                          </p>
                        ) : (
                          <p className="text-purple-300 font-semibold text-xs leading-relaxed">
                            {currentItem.exercise.technik}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Taktikprinzipien */}
                    {currentItem.exercise.taktikprinzipien && currentItem.exercise.taktikprinzipien.trim() && (
                      <div className="space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-sky-900/40">
                        <span className="font-extrabold text-sky-400 uppercase tracking-wider text-[11px] block">
                          Taktikprinzipien:
                        </span>
                        <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                          {currentItem.exercise.taktikprinzipien}
                        </p>
                      </div>
                    )}

                    {/* Coaching-Punkte */}
                    {currentItem.exercise.coachingPoints && currentItem.exercise.coachingPoints.trim() && (
                      <div className="space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-emerald-900/40">
                        <span className="font-extrabold text-emerald-400 uppercase tracking-wider text-[11px] block">
                          Coaching-Punkte:
                        </span>
                        <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                          {currentItem.exercise.coachingPoints}
                        </p>
                      </div>
                    )}

                    {/* Siegbedingung (für Wettkämpfe) */}
                    {currentItem.exercise.siegbedingung && currentItem.exercise.siegbedingung.trim() && (
                      <div className="space-y-1.5 bg-slate-950 p-4 rounded-2xl border border-rose-900/40">
                        <span className="font-extrabold text-rose-400 uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-rose-400" />
                          <span>Siegbedingung / Wettkampf-Regel:</span>
                        </span>
                        <p className="text-rose-200 font-semibold text-xs leading-relaxed">
                          {currentItem.exercise.siegbedingung}
                        </p>
                      </div>
                    )}

                    {/* Materials & Keepers */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {currentItem.exercise.materials && currentItem.exercise.materials.map(mat => (
                        <span key={mat} className="px-2.5 py-1 rounded-xl bg-slate-950 text-slate-400 border border-slate-800 text-[11px] font-bold flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-400" />
                          <span>{mat}</span>
                        </span>
                      ))}
                      <span className="px-2.5 py-1 rounded-xl bg-slate-950 text-sky-400 border border-slate-800 text-[11px] font-bold flex items-center gap-1">
                        <Users className="w-3 h-3 text-sky-400" />
                        <span>{currentItem.exercise.minKeepers || 1}-{currentItem.exercise.maxKeepers || 4} TW</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-xs">
                  Keine Übung zugewiesen.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Competition Board Tab */
          <LiveCompetitionBoard
            competitionRounds={competitionRounds}
            selectedRoundId={selectedRoundId}
            setSelectedRoundId={setSelectedRoundId}
            onAddRound={handleAddRound}
            onDeleteRound={handleDeleteRound}
            onResetRoundScores={handleResetRoundScores}
            onAdjustScore={handleAdjustScore}
            groupKeepers={groupKeepers}
            competitionPresets={COMPETITION_PRESETS}
          />
        )}
      </div>

      {/* 4. FULLSCREEN TACTIC IMAGE ZOOM OVERLAY */}
      {showTacticZoom && (currentItem?.exercise.imageUrl || currentItem?.exercise.imageBase64) && (
        <div
          onClick={() => setShowTacticZoom(false)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowTacticZoom(false)}
              className="absolute -top-12 right-0 p-2.5 rounded-2xl bg-slate-800 text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={currentItem.exercise.imageUrl || currentItem.exercise.imageBase64}
              alt={currentItem.exercise.title}
              className="w-full h-auto max-h-[85vh] object-contain rounded-3xl border border-slate-800 shadow-2xl"
            />
            <div className="mt-3 text-center text-xs font-bold text-white bg-slate-900/90 px-4 py-2 rounded-2xl border border-slate-800">
              {currentItem.exercise.title} • {currentItem.phaseName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
