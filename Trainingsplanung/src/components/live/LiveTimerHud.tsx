import React from 'react';
import type { Exercise } from '../../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Minus, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Watch, 
  Lock, 
  Unlock, 
  CloudRain,
  Layers
} from 'lucide-react';
import { cn } from '../../utils/cn';

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

export interface LiveTimerHudProps {
  currentItem: FlattenedExerciseItem | null;
  currentIndex: number;
  totalExercises: number;
  timeLeft: number;
  initialDurationSeconds: number;
  timerRunning: boolean;
  soundEnabled: boolean;
  sunMode: boolean;
  watchNotificationEnabled: boolean;
  isWetScreenLocked: boolean;
  unlockProgress: number;
  onToggleTimer: () => void;
  onAdjustTimerSeconds: (delta: number) => void;
  onResetTimer: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleSound: () => void;
  onToggleSunMode: () => void;
  onToggleWatchNotification: () => void;
  onToggleWetScreenLock: () => void;
  onStartUnlockHold: (e: React.TouchEvent | React.MouseEvent) => void;
  onCancelUnlockHold: () => void;
}

function formatTimeMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const LiveTimerHud: React.FC<LiveTimerHudProps> = ({
  currentItem,
  currentIndex,
  totalExercises,
  timeLeft,
  initialDurationSeconds,
  timerRunning,
  soundEnabled,
  sunMode,
  watchNotificationEnabled,
  isWetScreenLocked,
  unlockProgress,
  onToggleTimer,
  onAdjustTimerSeconds,
  onResetTimer,
  onPrev,
  onNext,
  onToggleSound,
  onToggleSunMode,
  onToggleWatchNotification,
  onToggleWetScreenLock,
  onStartUnlockHold,
  onCancelUnlockHold
}) => {
  // Timer circular progress percentage (Circumference for r=53 in 120x120 is 333)
  const CIRCUMFERENCE = 333;
  const progressFraction = initialDurationSeconds > 0 
    ? Math.max(0, Math.min(1, timeLeft / initialDurationSeconds)) 
    : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressFraction);

  return (
    <div className={cn(
      "rounded-3xl border shadow-2xl p-4 sm:p-6 flex flex-col items-center gap-5 transition-all duration-300",
      sunMode 
        ? "bg-amber-100 border-amber-300 text-slate-900 shadow-amber-200/50" 
        : "bg-slate-950 border-slate-800 text-white shadow-black/80"
    )}>
      {/* 1. TOP STATUS & QUICK CONTROLS */}
      <div className="w-full flex items-center justify-between gap-3 flex-wrap">
        {/* Phase & Exercise Index Badge */}
        <div className="flex items-center gap-2">
          {currentItem && (
            <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow">
              <Layers className="w-3.5 h-3.5" />
              <span>{currentItem.phaseName} ({currentItem.exerciseIndexInPhase + 1}/{currentItem.totalExercisesInPhase})</span>
            </span>
          )}
          <span className="text-xs text-slate-400 font-semibold">
            Übung {currentIndex + 1} von {totalExercises}
          </span>
        </div>

        {/* Quick Toggles: Sun Mode, Audio, Apple Watch, Wet Screen Lock */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={onToggleSunMode}
            className={cn(
              "p-2 rounded-xl text-xs font-bold transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer",
              sunMode ? "bg-amber-400 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            )}
            title={sunMode ? "Sonnenmodus aktiv (High Contrast)" : "Standard Dunkelmodus"}
          >
            {sunMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className={cn(
              "p-2 rounded-xl text-xs font-bold transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer",
              soundEnabled ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-500 hover:text-white"
            )}
            title={soundEnabled ? "Akustische Signale aktiv" : "Stummschalten"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleWatchNotification}
            className={cn(
              "p-2 rounded-xl text-xs font-bold transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer",
              watchNotificationEnabled ? "bg-purple-600 text-white shadow" : "text-slate-500 hover:text-white"
            )}
            title={watchNotificationEnabled ? "Smartwatch-Vibration aktiv" : "Smartwatch-Benachrichtigung inaktiv"}
          >
            <Watch className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleWetScreenLock}
            className={cn(
              "p-2 rounded-xl text-xs font-bold transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer",
              isWetScreenLocked ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-500 hover:text-white"
            )}
            title={isWetScreenLocked ? "Regenschutz aktiv (Touch-Sperre)" : "Regenschutz aktivieren"}
          >
            <CloudRain className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CIRCULAR TIMER DISPLAY & TIME REMAINING */}
      <div className="relative flex flex-col items-center justify-center my-2">
        <svg viewBox="0 0 120 120" className="w-56 h-56 sm:w-64 sm:h-64 transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="53"
            className="stroke-slate-800"
            strokeWidth="5"
            fill="transparent"
          />
          <circle
            cx="60"
            cy="60"
            r="53"
            className={cn(
              "transition-all duration-300",
              timeLeft <= 10 ? "stroke-rose-500" : timeLeft <= 60 ? "stroke-amber-400" : "stroke-emerald-400"
            )}
            strokeWidth="5.5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Big Central Time & Controls */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <span className={cn(
            "font-mono font-black text-3xl sm:text-4xl tracking-tight transition-all",
            timeLeft <= 10 
              ? "text-rose-500 animate-pulse" 
              : sunMode ? "text-slate-950" : "text-white"
          )}>
            {formatTimeMMSS(timeLeft)}
          </span>

          <span className="text-[10px] font-bold text-slate-400 mt-0.5">
            {timerRunning ? 'Läuft...' : 'Pausiert'}
          </span>

          <button
            type="button"
            onClick={onToggleTimer}
            disabled={isWetScreenLocked}
            className={cn(
              "mt-2 px-4 py-1.5 min-h-[40px] rounded-full font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xl active:scale-95 transition-all cursor-pointer",
              timerRunning
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/60"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/60"
            )}
          >
            {timerRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            <span>{timerRunning ? 'PAUSE' : 'START'}</span>
          </button>
        </div>
      </div>

      {/* 3. TIME ADJUSTMENT BUTTONS (+1 / -1 / +5 Min & Reset) */}
      {!isWetScreenLocked && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdjustTimerSeconds(-60)}
            className="px-3 py-2 min-h-[48px] min-w-[48px] bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            title="1 Minute abziehen"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>1 Min</span>
          </button>

          <button
            type="button"
            onClick={() => onAdjustTimerSeconds(60)}
            className="px-3 py-2 min-h-[48px] min-w-[48px] bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            title="1 Minute hinzufügen"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>1 Min</span>
          </button>

          <button
            type="button"
            onClick={() => onAdjustTimerSeconds(300)}
            className="px-3 py-2 min-h-[48px] min-w-[48px] bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            title="5 Minuten hinzufügen"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>5 Min</span>
          </button>

          <button
            type="button"
            onClick={onResetTimer}
            className="p-2 min-h-[48px] min-w-[48px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 flex items-center justify-center active:scale-95 transition cursor-pointer"
            title="Timer auf Phasen-Sollzeit zurücksetzen"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. EXERCISE NAVIGATION (Vorherige / Nächste) */}
      {!isWetScreenLocked && (
        <div className="w-full grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-4 py-3 min-h-[52px] bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 active:scale-95 transition shadow cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-emerald-400" />
            <span>Vorherige Übung</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= totalExercises - 1}
            className="px-4 py-3 min-h-[52px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 transition cursor-pointer"
          >
            <span>Nächste Übung</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 5. WET SCREEN LOCK OVERLAY & LONG-PRESS UNLOCK */}
      {isWetScreenLocked && (
        <div className="w-full bg-cyan-950/80 border-2 border-cyan-400 rounded-3xl p-5 text-center space-y-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 text-cyan-300 font-extrabold text-sm">
            <Lock className="w-5 h-5 text-cyan-300 animate-bounce" />
            <span>Regenschutz aktiv (Touch-Sperre)</span>
          </div>
          <p className="text-xs text-slate-300">
            Halte den Button 1,5 Sekunden gedrückt, um den Bildschirm zu entsperren.
          </p>

          <div className="relative overflow-hidden rounded-2xl">
            <button
              type="button"
              onMouseDown={onStartUnlockHold}
              onMouseUp={onCancelUnlockHold}
              onMouseLeave={onCancelUnlockHold}
              onTouchStart={onStartUnlockHold}
              onTouchEnd={onCancelUnlockHold}
              className="relative w-full py-4 min-h-[56px] rounded-2xl bg-cyan-600 active:bg-cyan-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl select-none cursor-pointer"
            >
              <Unlock className="w-5 h-5" />
              <span>Gedrückt halten zum Entsperren</span>
            </button>
            {/* Progress fill bar */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-cyan-300/40 pointer-events-none transition-all duration-75"
              style={{ width: `${unlockProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
