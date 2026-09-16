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
  initialDurationSeconds: _initialDurationSeconds,
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
  return (
    <div className={cn(
      "rounded-3xl border shadow-xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all duration-300",
      sunMode 
        ? "bg-amber-100 border-amber-300 text-slate-900 shadow-amber-200/50" 
        : "bg-slate-900 border-slate-800 text-white shadow-black/80"
    )}>
      {/* 1. TOP STATUS & QUICK CONTROLS */}
      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
        {/* Phase & Exercise Index Badge */}
        <div className="flex items-center gap-2">
          {currentItem ? (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow">
              <Layers className="w-3.5 h-3.5" />
              <span>{currentItem.phaseName} ({currentItem.exerciseIndexInPhase + 1}/{currentItem.totalExercisesInPhase})</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold text-xs flex items-center gap-1.5 shadow">
              <Layers className="w-3.5 h-3.5" />
              <span>Vorbereitung</span>
            </span>
          )}
          <span className="text-xs text-slate-400 font-semibold">
            {currentIndex === 0 ? `Startseite • ${totalExercises} Übungen` : `Übung ${currentIndex} von ${totalExercises}`}
          </span>
        </div>

        {/* Quick Toggles: Sun Mode, Audio, Apple Watch, Wet Screen Lock */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={onToggleSunMode}
            className={cn(
              "p-1.5 rounded-xl text-xs font-bold transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer",
              sunMode ? "bg-amber-400 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            )}
            title={sunMode ? "Sonnenmodus aktiv (High Contrast)" : "Standard Dunkelmodus"}
          >
            {sunMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className={cn(
              "p-1.5 rounded-xl text-xs font-bold transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer",
              soundEnabled ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-500 hover:text-white"
            )}
            title={soundEnabled ? "Akustische Signale aktiv" : "Stummschalten"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onToggleWatchNotification}
            className={cn(
              "p-1.5 rounded-xl text-xs font-bold transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer",
              watchNotificationEnabled ? "bg-purple-600 text-white shadow" : "text-slate-500 hover:text-white"
            )}
            title={watchNotificationEnabled ? "Smartwatch-Vibration aktiv" : "Smartwatch-Benachrichtigung inaktiv"}
          >
            <Watch className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleWetScreenLock}
            className={cn(
              "p-1.5 rounded-xl text-xs font-bold transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer",
              isWetScreenLocked ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-500 hover:text-white"
            )}
            title={isWetScreenLocked ? "Regenschutz aktiv (Touch-Sperre)" : "Regenschutz aktivieren"}
          >
            <CloudRain className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. COMPACT DIGITAL TIMER & PLAY/PAUSE */}
      <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 gap-3 shadow-inner">
        <div className="flex items-center gap-3">
          <span className={cn(
            "font-mono font-black text-3xl sm:text-4xl tracking-tight leading-none transition-all",
            timeLeft <= 10 
              ? "text-rose-500 animate-pulse" 
              : sunMode ? "text-slate-950" : "text-white"
          )}>
            {formatTimeMMSS(timeLeft)}
          </span>

          <span className={cn(
            "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border",
            timerRunning
              ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
              : "bg-slate-900 text-slate-400 border-slate-800"
          )}>
            {timerRunning ? 'Läuft' : 'Pause'}
          </span>
        </div>

        {/* Primary Start / Pause Button */}
        <button
          type="button"
          onClick={onToggleTimer}
          disabled={isWetScreenLocked}
          className={cn(
            "px-4 py-2 min-h-[42px] rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer flex-shrink-0",
            timerRunning
              ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/60"
              : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/60"
          )}
        >
          {timerRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          <span>{timerRunning ? 'PAUSE' : 'START'}</span>
        </button>
      </div>

      {/* 3. TIME ADJUSTMENT BUTTONS (+1 / -1 / +5 Min & Reset) */}
      {!isWetScreenLocked && (
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => onAdjustTimerSeconds(-60)}
            className="flex-1 py-1.5 min-h-[38px] bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            title="1 Minute abziehen"
          >
            <Minus className="w-3 h-3" />
            <span>1 Min</span>
          </button>

          <button
            type="button"
            onClick={() => onAdjustTimerSeconds(60)}
            className="flex-1 py-1.5 min-h-[38px] bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            title="1 Minute hinzufügen"
          >
            <Plus className="w-3 h-3" />
            <span>1 Min</span>
          </button>

          <button
            type="button"
            onClick={() => onAdjustTimerSeconds(300)}
            className="flex-1 py-1.5 min-h-[38px] bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
            title="5 Minuten hinzufügen"
          >
            <Plus className="w-3 h-3" />
            <span>5 Min</span>
          </button>

          <button
            type="button"
            onClick={onResetTimer}
            className="p-1.5 min-h-[38px] min-w-[38px] bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 flex items-center justify-center active:scale-95 transition cursor-pointer flex-shrink-0"
            title="Timer auf Sollzeit zurücksetzen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. EXERCISE NAVIGATION (Vorherige / Nächste) */}
      {!isWetScreenLocked && (
        <div className="w-full grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-3 py-2.5 min-h-[44px] bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-800 active:scale-95 transition shadow cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-emerald-400" />
            <span>{currentIndex === 1 ? 'Zur Vorbereitung' : 'Vorherige'}</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= totalExercises}
            className="px-3 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 active:scale-95 transition cursor-pointer"
          >
            <span>{currentIndex === 0 ? '1. Übung starten' : currentIndex >= totalExercises ? 'Training beenden' : 'Nächste Übung'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. WET SCREEN LOCK OVERLAY & LONG-PRESS UNLOCK */}
      {isWetScreenLocked && (
        <div className="w-full bg-cyan-950/80 border-2 border-cyan-400 rounded-2xl p-4 text-center space-y-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 text-cyan-300 font-extrabold text-xs">
            <Lock className="w-4 h-4 text-cyan-300 animate-bounce" />
            <span>Regenschutz aktiv (Touch-Sperre)</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Halte den Button 1,5 Sek. gedrückt zum Entsperren.
          </p>

          <div className="relative overflow-hidden rounded-xl">
            <button
              type="button"
              onMouseDown={onStartUnlockHold}
              onMouseUp={onCancelUnlockHold}
              onMouseLeave={onCancelUnlockHold}
              onTouchStart={onStartUnlockHold}
              onTouchEnd={onCancelUnlockHold}
              className="relative w-full py-3 min-h-[48px] rounded-xl bg-cyan-600 active:bg-cyan-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl select-none cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Gedrückt halten</span>
            </button>
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
