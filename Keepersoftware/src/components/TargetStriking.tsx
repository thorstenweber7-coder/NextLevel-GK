import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Timer, Brain, Trophy, Target, Zap, 
  RotateCcw, CheckCircle2, XCircle, AlertCircle, Volume2, VolumeX, Sparkles,
  ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserProfile } from '../types';

interface TargetStrikingProps {
  userProfile: UserProfile;
  onBack: () => void;
  onTrainingComplete?: () => void;
}

type GameState = 'idle' | 'countdown' | 'playing' | 'finished';
type Direction = 'up' | 'down' | 'left' | 'right';

interface ReactionAttempt {
  round: number;
  timeMs: number;
  correct: boolean;
  targetPos: { row: number; col: number };
  direction: Direction;
}

export default function TargetStriking({ userProfile, onBack, onTrainingComplete }: TargetStrikingProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [round, setRound] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Stimulus State
  const [activeCell, setActiveCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [activeDirection, setActiveDirection] = useState<Direction>('up');
  const [startTime, setStartTime] = useState<number>(0);

  // Stats and Logs
  const [attempts, setAttempts] = useState<ReactionAttempt[]>([]);
  const [flashedButton, setFlashedButton] = useState<{ dir: Direction; status: 'correct' | 'incorrect' } | null>(null);
  const [lastReactionTime, setLastReactionTime] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const feedbackTimeoutRef = useRef<any>(null);

  // Clean up Web Audio Context and pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play synthetic feedback sound
  const playSound = (type: 'correct' | 'incorrect' | 'tick' | 'complete') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'correct') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'incorrect') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'tick') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'complete') {
        // Simple success melody
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
          }, idx * 100);
        });
      }
    } catch (e) {
      console.warn('Web Audio API issue:', e);
    }
  };

  // Start countdown phase
  const startNewGame = () => {
    setAttempts([]);
    setRound(1);
    setLastReactionTime(null);
    setFlashedButton(null);
    setCountdown(3);
    setGameState('countdown');
  };

  // Countdown timer loop
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown === 0) {
      setGameState('playing');
      generateNextStimulus(1);
      return;
    }

    playSound('tick');
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, gameState]);

  // Keyboard support for desktop athletes
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleDirectionInput('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDirectionInput('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDirectionInput('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleDirectionInput('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeDirection, activeCell, round, attempts, startTime]);

  // Generate next stimulus randomly inside 4x4 matrix
  const generateNextStimulus = (currentRound: number) => {
    const randomRow = Math.floor(Math.random() * 4);
    const randomCol = Math.floor(Math.random() * 4);
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];

    setActiveCell({ row: randomRow, col: randomCol });
    setActiveDirection(randomDir);
    setStartTime(performance.now());
  };

  // Evaluate user direction input (via touch/click/keyboard)
  const handleDirectionInput = (direction: Direction) => {
    if (gameState !== 'playing') return;

    const endTime = performance.now();
    const rawTime = Math.round(endTime - startTime);
    const isCorrect = direction === activeDirection;
    const finalTime = isCorrect ? rawTime : rawTime + 500; // 500ms penalty for error

    if (isCorrect) {
      playSound('correct');
      setFlashedButton({ dir: direction, status: 'correct' });
    } else {
      playSound('incorrect');
      setFlashedButton({ dir: direction, status: 'incorrect' });
    }

    // Auto-clear feedback flash state
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFlashedButton(null);
    }, 150);

    // Save attempt log
    const attempt: ReactionAttempt = {
      round,
      timeMs: finalTime,
      correct: isCorrect,
      targetPos: { ...activeCell },
      direction: activeDirection
    };

    setLastReactionTime(finalTime);
    const updatedAttempts = [...attempts, attempt];
    setAttempts(updatedAttempts);

    if (round >= 20) {
      // Game over, complete session
      playSound('complete');
      setGameState('finished');
      if (onTrainingComplete) {
        onTrainingComplete();
      }
    } else {
      setRound(prev => prev + 1);
      generateNextStimulus(round + 1);
    }
  };

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // Compute session metrics
  const correctCount = attempts.filter(a => a.correct).length;
  const accuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;
  const avgReactionTime = attempts.length > 0 
    ? Math.round(attempts.reduce((acc, curr) => acc + curr.timeMs, 0) / attempts.length)
    : 0;

  // Render Arrow symbols based on Direction
  const getArrowIcon = (dir: Direction) => {
    const arrowClass = "w-5 h-5 sm:w-8 sm:h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]";
    switch (dir) {
      case 'up': return <ArrowUp className={arrowClass} />;
      case 'down': return <ArrowDown className={arrowClass} />;
      case 'left': return <ArrowLeftIcon className={arrowClass} />;
      case 'right': return <ArrowRight className={arrowClass} />;
    }
  };

  // Format chart data for finished screen
  const chartData = attempts.map(att => ({
    round: att.round,
    speed: att.timeMs,
    Fehler: att.correct ? 0 : 500
  }));

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück</span>
        </button>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            soundEnabled 
              ? 'bg-slate-900 border-slate-800 text-amber-500 hover:text-amber-400' 
              : 'bg-slate-900/40 border-slate-950 text-slate-600'
          }`}
          title={soundEnabled ? 'Ton stummschalten' : 'Ton einschalten'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* GAME VIEW MANAGER */}
      {gameState === 'idle' && (
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
            <Target className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono">
              Target Striking
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Dieses kognitive Neuroathletiktraining schult deine sakkadischen Augenbewegungen und dein peripheres Sehfeld. Finde den aufleuchtenden grünen Richtungspfeil im Raster und tippe blitzschnell die entsprechende Taste unten an.
            </p>
          </div>

          {/* Quick instructions panel */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-left space-y-3 text-slate-300 text-xs font-sans max-w-md mx-auto leading-normal">
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-[10px]">1</span>
              <p>Finde sofort den grünen Pfeil im <strong>4x4 Raster</strong>.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-[10px]">2</span>
              <p>Reagiere blitzschnell mit den Pfeiltasten (oder Tastatur: <strong>←, ↑, ↓, →</strong>).</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-[10px]">3</span>
              <p>Falsche Eingaben kosten wertvolle Zeit (<strong>+500ms Strafe</strong>).</p>
            </div>
          </div>

          <button
            onClick={startNewGame}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Training Starten</span>
          </button>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
          <span className="text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest">
            Fokus aufbauen...
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-7xl font-black text-amber-500 font-mono select-none"
            >
              {countdown}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* STATS HEADBAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="space-y-0.5">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Fortschritt</span>
              <span className="text-sm font-black text-white font-mono flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-amber-500" />
                <span>Runde {round} / 20</span>
              </span>
            </div>

            <div className="space-y-0.5 text-right">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Letzte Reaktionszeit</span>
              <span className="text-sm font-black text-amber-500 font-mono">
                {lastReactionTime !== null ? `${lastReactionTime}ms` : '---'}
              </span>
            </div>
          </div>

          {/* 4x4 MATRIX GRID AREA */}
          <div className="relative aspect-square w-full max-w-[210px] sm:max-w-xs md:max-w-md mx-auto bg-slate-950 border-2 border-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.06)] rounded-3xl p-2 sm:p-3 flex items-center justify-center overflow-hidden">
            <div className="grid grid-cols-4 grid-rows-4 gap-1.5 sm:gap-2.5 w-full h-full">
              {Array.from({ length: 16 }).map((_, idx) => {
                const row = Math.floor(idx / 4);
                const col = idx % 4;
                const isActive = activeCell.row === row && activeCell.col === col;

                return (
                  <div
                    key={idx}
                    className={`relative rounded-lg sm:rounded-xl border flex items-center justify-center transition-all overflow-hidden ${
                      isActive 
                        ? 'bg-emerald-500/10 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse scale-[1.02]' 
                        : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-800'
                    }`}
                  >
                    {/* Tiny visual coordinate label inside grids (for high-tech sport look) */}
                    <span className="absolute top-0.5 left-1 text-[6px] sm:text-[8px] font-mono text-slate-700 select-none">
                      {row + 1}{col + 1}
                    </span>

                    {isActive && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1.1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="p-1 sm:p-2"
                      >
                        {getArrowIcon(activeDirection)}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTTOM DIRECTIONAL DIAMOND BUTTON LAYOUT */}
          <div className="bg-slate-900/40 border border-slate-800/60 p-4 sm:p-6 rounded-3xl space-y-3 sm:space-y-4">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-sans tracking-wide">
                Wähle blitzschnell den passenden Richtungspfeil:
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-[240px] sm:max-w-[320px] mx-auto select-none">
              {/* Left Arrow */}
              <button
                onPointerDown={() => handleDirectionInput('left')}
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-md transform active:scale-95 ${
                  flashedButton?.dir === 'left'
                    ? flashedButton.status === 'correct'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-white hover:border-slate-700'
                }`}
              >
                <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Up Arrow */}
              <button
                onPointerDown={() => handleDirectionInput('up')}
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-md transform active:scale-95 ${
                  flashedButton?.dir === 'up'
                    ? flashedButton.status === 'correct'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-white hover:border-slate-700'
                }`}
              >
                <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Down Arrow */}
              <button
                onPointerDown={() => handleDirectionInput('down')}
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-md transform active:scale-95 ${
                  flashedButton?.dir === 'down'
                    ? flashedButton.status === 'correct'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-white hover:border-slate-700'
                }`}
              >
                <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Right Arrow */}
              <button
                onPointerDown={() => handleDirectionInput('right')}
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-md transform active:scale-95 ${
                  flashedButton?.dir === 'right'
                    ? flashedButton.status === 'correct'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-white hover:border-slate-700'
                }`}
              >
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'finished' && (
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 text-center shadow-2xl animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/5">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">Target Striking beendet!</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Klasse Durchgang! Du hast 20 saccadische Erfassungstests absolviert. Hier sind deine Leistungswerte:
            </p>
          </div>

          {/* METRIC BOXES */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 relative overflow-hidden">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Genauigkeit</span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">
                {accuracy}%
              </span>
              <p className="text-[9px] text-slate-500 font-sans mt-1">
                {correctCount} von 20 richtig
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 relative overflow-hidden">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Ø Reaktionszeit</span>
              <span className="text-2xl font-black text-amber-500 font-mono mt-1 block">
                {avgReactionTime}ms
              </span>
              <p className="text-[9px] text-slate-500 font-sans mt-1">
                Inkl. +500ms pro Fehler
              </p>
            </div>
          </div>

          {/* CHART FLOW FOR ATTEMPTS */}
          {attempts.length > 0 && (
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black text-left mb-3">Reaktionskurve (Runde 1-20)</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="round" stroke="#475569" fontSize={9} fontStyle="mono" tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} fontStyle="mono" tickLine={false} unit="ms" />
                    <Tooltip 
                      contentStyle={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#f59e0b', fontSize: '11px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="speed" 
                      name="Reaktionszeit" 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      dot={{ r: 2, fill: '#f59e0b' }} 
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* FOOTER MOTIVATION NOTE */}
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center">
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              Torhüter müssen visuelle Reize innerhalb von Millisekunden verarbeiten und die richtige Bewegungsausführung einleiten. Mach direkt noch einen Durchgang!
            </p>
          </div>

          {/* CONTROLS */}
          <div className="flex gap-3">
            <button
              onClick={startNewGame}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Neustart</span>
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Trainingsübersicht
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
