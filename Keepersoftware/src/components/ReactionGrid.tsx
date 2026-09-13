import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Timer, Brain, Award, Trophy, Target, Zap, 
  RotateCcw, CheckCircle2, XCircle, AlertCircle, Volume2, VolumeX, Sparkles 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserProfile } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface ReactionGridProps {
  userProfile: UserProfile;
  onBack: () => void;
  onUpdatePoints?: (newPoints: number, newPointsByCategory: any) => void;
  onTrainingComplete?: (score: number) => void;
  challengeMode?: {
    isCreating: boolean;
    isAnswering: boolean;
    opponentGroup?: string;
    gameId: string;
    gameName: string;
    challengerScore?: number;
    challengerStats?: any;
    challengeId?: string;
    gameSettings?: any;
    onComplete: (score: number, stats: any) => void;
  };
}

type GameMode = 'sequence' | 'chase';
type GameState = 'idle' | 'countdown' | 'playing' | 'finished';
type StrobeMode = 'none' | 'slow' | 'fast';

interface ReactionDataPoint {
  attempt: number;
  timeMs: number;
}

export default function ReactionGrid({ userProfile, onBack, onUpdatePoints, onTrainingComplete, challengeMode }: ReactionGridProps) {
  // Game Settings (Fixiert auf maximalen Schwierigkeitsgrad mit Stroboskop-Effekt)
  const [gridSize, setGridSize] = useState<3 | 4 | 5>(5);
  const [gameMode, setGameMode] = useState<GameMode>('chase');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [strobeMode, setStrobeMode] = useState<StrobeMode>('fast');
  const [strobeActive, setStrobeActive] = useState<boolean>(false);

  // Locked settings for answering challenge
  useEffect(() => {
    if (challengeMode?.isAnswering && challengeMode?.gameSettings) {
      if (challengeMode.gameSettings.gridSize) setGridSize(challengeMode.gameSettings.gridSize);
      if (challengeMode.gameSettings.gameMode) setGameMode(challengeMode.gameSettings.gameMode);
      if (challengeMode.gameSettings.strobeMode) setStrobeMode(challengeMode.gameSettings.strobeMode);
    }
  }, [challengeMode]);

  // Game States
  const [gameState, setGameState] = useState<GameState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [timeRemaining, setTimeRemaining] = useState<number>(30); // 30s game
  const [score, setScore] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);

  // Mode Specific States
  const [gridItems, setGridItems] = useState<{ id: number; value: number; color?: 'green' | 'red' | 'gray' }[]>([]);
  const [nextTargetNumber, setNextTargetNumber] = useState<number>(1);
  const [activeChaseIndex, setActiveChaseIndex] = useState<number>(-1);

  // Analytics
  const [reactionTimes, setReactionTimes] = useState<ReactionDataPoint[]>([]);
  const [averageReactionTime, setAverageReactionTime] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);

  // Timers Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Load highscore from localStorage
  useEffect(() => {
    const key = `reaction_grid_best_${gameMode}_${gridSize}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setBestScore(parseInt(saved, 10));
    } else {
      setBestScore(0);
    }
  }, [gameMode, gridSize, gameState]);

  // Handle count down timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'countdown') {
      playSound('tick');
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            startGame();
            return 3;
          }
          playSound('tick');
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Handle active game timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            finishGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Handle Strobobrille flickering effect
  useEffect(() => {
    if (gameState !== 'playing' || strobeMode === 'none') {
      setStrobeActive(false);
      return;
    }

    const intervalTime = strobeMode === 'slow' ? 350 : 180;
    const interval = setInterval(() => {
      setStrobeActive((prev) => !prev);
    }, intervalTime);

    return () => {
      clearInterval(interval);
      setStrobeActive(false);
    };
  }, [gameState, strobeMode]);

  // Audio synthesis using Web Audio API
  const playSound = (type: 'correct' | 'wrong' | 'complete' | 'tick') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'correct') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'wrong') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'tick') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'complete') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
        
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
          gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.15);
        }, 120);
        
        setTimeout(() => {
          const osc3 = audioCtx.createOscillator();
          const gain3 = audioCtx.createGain();
          osc3.connect(gain3);
          gain3.connect(audioCtx.destination);
          osc3.type = 'sine';
          osc3.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
          gain3.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          osc3.start();
          osc3.stop(audioCtx.currentTime + 0.3);
        }, 240);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by browser', e);
    }
  };

  // Helper to trigger countdown
  const startCountdown = () => {
    setCountdown(3);
    setGameState('countdown');
  };

  // Initialize and Start Game
  const startGame = () => {
    setScore(0);
    setMisses(0);
    setReactionTimes([]);
    setTimeRemaining(gameMode === 'sequence' ? 99 : 30); // Sequence runs until completed, others run for 30s
    lastTapTimeRef.current = Date.now();
    startTimeRef.current = Date.now();

    const totalCells = gridSize * gridSize;

    if (gameMode === 'sequence') {
      // Scramble numbers from 1 to totalCells
      const nums = Array.from({ length: totalCells }, (_, i) => i + 1);
      const scrambled = [...nums].sort(() => Math.random() - 0.5);
      setGridItems(scrambled.map((num, idx) => ({ id: idx, value: num })));
      setNextTargetNumber(1);
    } else if (gameMode === 'chase') {
      // Select one random cell as active target
      const randomIndex = Math.floor(Math.random() * totalCells);
      setActiveChaseIndex(randomIndex);
    }

    setGameState('playing');
  };

  // Click handler on cells
  const handleCellClick = (index: number) => {
    if (gameState !== 'playing') return;

    const now = Date.now();
    const reactTime = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (gameMode === 'sequence') {
      const clickedItem = gridItems[index];
      if (clickedItem.value === nextTargetNumber) {
        playSound('correct');
        setReactionTimes((prev) => [...prev, { attempt: score + 1, timeMs: reactTime }]);
        setScore((prev) => prev + 1);

        const totalCells = gridSize * gridSize;
        if (nextTargetNumber === totalCells) {
          // Game Completed successfully!
          finishGame();
        } else {
          setNextTargetNumber((prev) => prev + 1);
        }
      } else {
        playSound('wrong');
        setMisses((prev) => prev + 1);
      }
    } else if (gameMode === 'chase') {
      if (index === activeChaseIndex) {
        playSound('correct');
        setReactionTimes((prev) => [...prev, { attempt: score + 1, timeMs: reactTime }]);
        setScore((prev) => prev + 1);

        // Pick next random position (different from current one)
        const totalCells = gridSize * gridSize;
        let nextIdx = Math.floor(Math.random() * totalCells);
        while (nextIdx === activeChaseIndex && totalCells > 1) {
          nextIdx = Math.floor(Math.random() * totalCells);
        }
        setActiveChaseIndex(nextIdx);
      } else {
        playSound('wrong');
        setMisses((prev) => prev + 1);
      }
    }
  };

  // Complete Game
  const finishGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('complete');

    // Calculate average reaction time from logged points
    const times = reactionTimes.map((r) => r.timeMs);
    const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    setAverageReactionTime(avg);

    // Highscore updates
    const finalScore = score;
    const key = `reaction_grid_best_${gameMode}_${gridSize}`;
    const savedBest = localStorage.getItem(key);
    const currentBest = savedBest ? parseInt(savedBest, 10) : 0;
    
    if (finalScore > currentBest) {
      localStorage.setItem(key, finalScore.toString());
      setBestScore(finalScore);
    } else {
      setBestScore(currentBest);
    }

    if (!challengeMode && onTrainingComplete) {
      onTrainingComplete(finalScore);
    }

    setGameState('finished');
    const finalElapsed = Date.now() - startTimeRef.current;
    setElapsedTimeMs(finalElapsed);
  };

  // Format accuracy percentage
  const totalClicks = score + misses;
  const accuracy = totalClicks > 0 ? Math.round((score / totalClicks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer"
            title={soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-full text-xs font-semibold">
            <Brain className="w-3.5 h-3.5" />
            <span>Kognitionstraining</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* IDLE SCREEN / CONFIGURATION */}
        {gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6"
          >
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto text-pink-400">
                <Brain className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Reaction Grid</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Trainiert das schnelle visuelle Erfassen und Reagieren auf wechselnde Muster und verbessert die perzeptuelle Entscheidungsgeschwindigkeit sowie die Auge-Hand-Koordination unter Zeitdruck.
              </p>
            </div>

            <div className="max-w-md mx-auto p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase">
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Schwerste Herausforderung (Fixiert)</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                <strong>5x5 Grid</strong> mit hochfrequentem <strong>Stroboskop-Effekt (5 Hz)</strong>.
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 uppercase">Persönliche Bestleistung:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  {bestScore} {gameMode === 'sequence' ? 'Sätze komplett' : 'Hits'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 leading-normal font-sans">
                Dieses Training fördert dein peripheres Sehen, deine Auge-Hand-Koordination und deine Reaktionsgeschwindigkeit.
              </div>
            </div>

            <div className="pt-4 text-center">
              <button
                onClick={startCountdown}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg hover:shadow-pink-500/10 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer inline-flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Kognitionstraining starten</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* COUNTDOWN SCREEN */}
        {gameState === 'countdown' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center min-h-[350px] text-center"
          >
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Bereitmachen...</span>
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-400 font-mono"
            >
              {countdown}
            </motion.div>
            <span className="text-xs text-slate-400 mt-6 font-sans">
              {gameMode === 'chase' && 'Fokus auf das leuchtende Feld!'}
              {gameMode === 'sequence' && 'Tippe Zahlen von 1 aufsteigend an!'}
            </span>
          </motion.div>
        )}

        {/* ACTIVE PLAYING GRID */}
        {gameState === 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* STATS BAR */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase hidden sm:inline">Score</span>
                </div>
                <span className="text-base font-black text-white font-mono">{score}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-pink-500" />
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase hidden sm:inline">Zeit</span>
                </div>
                <span className={`text-base font-black font-mono ${timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {gameMode === 'sequence' ? 'Aktiv' : `${timeRemaining}s`}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase hidden sm:inline">Ziel</span>
                </div>
                <span className="text-xs font-bold text-slate-300 font-mono">
                  {gameMode === 'sequence' ? `Nr. ${nextTargetNumber}` : 'Leuchten'}
                </span>
              </div>
            </div>

            {/* THE GAME GRID */}
            <div 
              className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 mx-auto max-w-md aspect-square flex items-center justify-center shadow-2xl relative overflow-hidden"
            >
              <div 
                className="grid gap-2 w-full h-full"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`
                }}
              >
                {/* SEQUENCE MODE */}
                {gameMode === 'sequence' && gridItems.map((item, index) => {
                  const isCompleted = item.value < nextTargetNumber;
                  return (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCellClick(index);
                      }}
                      disabled={isCompleted}
                      className={`w-full h-full rounded-2xl border font-mono font-black text-lg md:text-xl transition-all cursor-pointer flex items-center justify-center ${
                        isCompleted
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500/30'
                          : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-300 active:bg-slate-800'
                      }`}
                    >
                      {item.value}
                    </button>
                  );
                })}

                {/* CHASE MODE */}
                {gameMode === 'chase' && Array.from({ length: gridSize * gridSize }).map((_, index) => {
                  const isActive = index === activeChaseIndex;
                  return (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCellClick(index);
                      }}
                      className={`w-full h-full rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-[0.98]'
                          : 'bg-slate-950 border-slate-850 hover:border-slate-800 active:bg-slate-900'
                      }`}
                    >
                      {isActive && (
                        <div className="w-3 h-3 rounded-full bg-white mx-auto animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* STROBOSCOPIC BLACKOUT OVERLAY */}
              {strobeActive && (
                <div className="absolute inset-0 bg-black z-50 pointer-events-none transition-opacity duration-75" />
              )}
            </div>

            {/* LIVE FEEDBACK TEXT */}
            <div className="text-center">
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wide">
                {gameMode === 'chase' && 'Konzentriere dich auf periphere Sichtweite.'}
                {gameMode === 'sequence' && 'Suche nach der kleinsten Zahl auf dem Spielfeld.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* GAME FINISHED / SUMMARY / RECHARTS CHART */}
        {gameState === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* GRID SUMMARY PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="text-center max-w-sm mx-auto space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white">Training beendet!</h2>
                <p className="text-xs text-slate-400">
                  Hervorragende Leistung. Du hast deine kognitiven Fähigkeiten für heute erfolgreich geschärft.
                </p>
              </div>

              {/* THREE STATS TILES */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center space-y-1">
                  <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest">Score / Treffer</span>
                  <span className="block text-xl font-black text-white font-mono">{score}</span>
                  <span className="block text-[8px] font-mono text-slate-400">Hits</span>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center space-y-1">
                  <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest">Genauigkeit</span>
                  <span className="block text-xl font-black text-pink-400 font-mono">{accuracy}%</span>
                  <span className="block text-[8px] font-mono text-slate-400">{misses} Fehler</span>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center space-y-1">
                  <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest">Ø Reaktionszeit</span>
                  <span className="block text-xl font-black text-emerald-400 font-mono">
                    {averageReactionTime} <span className="text-xs font-normal">ms</span>
                  </span>
                  <span className="block text-[8px] font-mono text-slate-400">pro Tap</span>
                </div>
              </div>

              {/* REACTION TIME CHART (RECHARTS) */}
              {reactionTimes.length > 0 && (
                <div className="bg-slate-950 border border-slate-850/80 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wide">
                      Auge-Hand-Reaktionsverlauf
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">Reaktionszeit pro Treffer</span>
                  </div>
                  <div className="h-40 w-full font-mono text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={reactionTimes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="attempt" stroke="#64748b" />
                        <YAxis unit="ms" stroke="#64748b" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          labelStyle={{ color: '#94a3b8' }}
                          itemStyle={{ color: '#f43f5e' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="timeMs"
                          name="Reaktionszeit"
                          stroke="#ec4899"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-center">
                <p className="text-[10px] text-slate-500 font-sans leading-normal">
                  Torhüter benötigen blitzschnelle visuelle Verarbeitung und periphere Wahrnehmung. Mach direkt noch einen Durchgang, um dich weiter zu steigern!
                </p>
              </div>

              {/* PLAY AGAIN OR CHANGE SETTINGS CONTROLS */}
              {challengeMode ? (
                <div className="pt-4 border-t border-slate-800/60 w-full">
                  <button
                    onClick={() => {
                      const elapsed = elapsedTimeMs || (Date.now() - startTimeRef.current);
                      challengeMode.onComplete(score, {
                        elapsedTimeMs: elapsed,
                        averageReactionTime: averageReactionTime,
                        misses: misses,
                        gridSize,
                        gameMode,
                        strobeMode
                      });
                    }}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer animate-pulse"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Wettkampf-Ergebnis einreichen</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800/60">
                  <button
                    onClick={startCountdown}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Nochmal spielen</span>
                  </button>

                  <button
                    onClick={() => setGameState('idle')}
                    className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-slate-400 hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Brain className="w-4 h-4" />
                    <span>Einstellungen ändern</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
