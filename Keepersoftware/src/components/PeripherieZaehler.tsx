import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Timer, Target, RotateCcw, 
  CheckCircle2, Volume2, VolumeX, AlertCircle, Eye, HelpCircle,
  Hash, Award, Zap
} from 'lucide-react';
import { UserProfile } from '../types';

interface PeripherieZaehlerProps {
  userProfile: UserProfile;
  onBack: () => void;
  onTrainingComplete?: () => void;
}

type GameState = 'idle' | 'countdown' | 'playing' | 'finished';

interface Cell {
  id: number;
  value: number;
  isCleared: boolean;
  flashState: 'correct' | 'incorrect' | null;
}

export default function PeripherieZaehler({ userProfile, onBack, onTrainingComplete }: PeripherieZaehlerProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Game session states
  const [grid, setGrid] = useState<Cell[]>([]);
  const [currentTarget, setCurrentTarget] = useState<number>(1);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [misclicks, setMisclicks] = useState<number>(0);
  const [liveReaction, setLiveReaction] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  // Helper to generate a shuffled 1-25 array
  const generateRandomGrid = () => {
    const values = Array.from({ length: 25 }, (_, i) => i + 1);
    // Shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    // Ensure index 12 (the physical center of a 5x5 grid) is specifically styled,
    // but it still holds a random value. The fixation point is overlayed or integrated.
    return values.map((val, idx) => ({
      id: idx,
      value: val,
      isCleared: false,
      flashState: null
    }));
  };

  // Synthetic feedback sounds
  const playSound = (type: 'correct' | 'incorrect' | 'tick' | 'complete' | 'grid_start') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'incorrect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'grid_start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else if (type === 'complete') {
        const arpeggio = [523.25, 659.25, 783.99, 1046.50]; // C Major
        arpeggio.forEach((freq, idx) => {
          setTimeout(() => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, audioCtx.currentTime);
            g.gain.setValueAtTime(0.06, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            o.start();
            o.stop(audioCtx.currentTime + 0.25);
          }, idx * 100);
        });
      }
    } catch (e) {
      console.warn('Web Audio API issue:', e);
    }
  };

  const startNewGame = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setGrid(generateRandomGrid());
    setCurrentTarget(1);
    setTimeElapsed(0);
    setMisclicks(0);
    setLiveReaction(null);
    setCountdown(3);
    setGameState('countdown');
  };

  // Countdown timer loop
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown === 0) {
      setGameState('playing');
      playSound('grid_start');
      startTimeRef.current = performance.now();
      lastTapTimeRef.current = performance.now();

      timerIntervalRef.current = setInterval(() => {
        const diff = (performance.now() - startTimeRef.current) / 1000;
        setTimeElapsed(parseFloat(diff.toFixed(1)));
      }, 100);
      return;
    }

    playSound('tick');
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, gameState]);

  // Handle number tile tapping / pointer down
  const handleCellClick = (cellId: number, cellVal: number, isCleared: boolean) => {
    if (gameState !== 'playing' || isCleared) return;

    const currentTime = performance.now();
    const isCorrect = cellVal === currentTarget;

    setGrid(prev => prev.map(cell => {
      if (cell.id === cellId) {
        return {
          ...cell,
          flashState: isCorrect ? 'correct' : 'incorrect',
          isCleared: isCorrect ? true : cell.isCleared
        };
      }
      return cell;
    }));

    // Reset cell flash state after short timeout
    setTimeout(() => {
      setGrid(prev => prev.map(cell => {
        if (cell.id === cellId) {
          return { ...cell, flashState: null };
        }
        return cell;
      }));
    }, 250);

    if (isCorrect) {
      playSound('correct');
      const reactionTime = Math.round(currentTime - lastTapTimeRef.current);
      setLiveReaction(reactionTime);
      lastTapTimeRef.current = currentTime;

      if (currentTarget === 25) {
        // Stop game and win
        clearInterval(timerIntervalRef.current);
        playSound('complete');
        setGameState('finished');
        if (onTrainingComplete) {
          onTrainingComplete();
        }
      } else {
        setCurrentTarget(prev => prev + 1);
      }
    } else {
      playSound('incorrect');
      setMisclicks(prev => prev + 1);
      // Penalty: Add 1 second to elapsed time offset
      startTimeRef.current -= 1000;
    }
  };

  // Clean up interval
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const avgReactionTime = currentTarget > 1 
    ? Math.round((timeElapsed * 1000) / (currentTarget - 1)) 
    : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* HEADER SECTION */}
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

      {/* RENDER VIEWS */}
      {gameState === 'idle' && (
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-lg">
            <Eye className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono">
              Peripherie (Peripherie-Zähler)
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Erweitere dein peripheres Sichtfeld durch ein Schulte-Tabellen-Training. Fixiere den roten Punkt im Zentrum und finde die Zahlen von 1 bis 25 ausschließlich mit deiner peripheren Wahrnehmung!
            </p>
          </div>

          {/* Instructions */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-left space-y-3 text-slate-300 text-xs font-sans max-w-md mx-auto leading-normal">
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-[10px]">1</span>
              <p>Richte deinen Blick starr auf den <strong>roten Kreis (★)</strong> in der Mitte.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-[10px]">2</span>
              <p>Bewege deine Augen nicht! Suche die Zahlen <strong>1 bis 25</strong> in Reihenfolge.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-[10px]">3</span>
              <p>Tippe sie an. Jeder Fehlklick bestraft dich mit <strong>+1 Sekunde</strong> Zeitstrafe.</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center max-w-md mx-auto">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <strong>Tipp für maximale Effizienz:</strong> Drehe dein Smartphone ins Querformat (Landscape), um das periphere Feld optimal auszunutzen.
            </p>
          </div>

          <button
            onClick={startNewGame}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Training Starten</span>
          </button>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="h-96 flex flex-col items-center justify-center space-y-4 animate-in fade-in">
          <span className="text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest">
            Fixiere das Zentrum des Gitters...
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-7xl font-black text-cyan-400 font-mono select-none"
            >
              {countdown}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ACTIVE GAME VIEW */}
      {gameState === 'playing' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* HUD AREA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="space-y-0.5">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Suche Zahl</span>
              <span className="text-lg font-black text-white font-mono flex items-center gap-1.5 animate-pulse text-cyan-400">
                <Hash className="w-4 h-4" />
                <span>{currentTarget}</span>
              </span>
            </div>

            <div className="text-center px-4 py-1.5 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-[10px] text-rose-500 font-black uppercase tracking-widest block animate-pulse">
                ★ BLICK STARR AUF DAS ROT KREUZ RICHTEN! ★
              </span>
            </div>

            <div className="space-y-0.5 text-right flex items-center gap-6">
              <div className="hidden sm:block">
                <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Fehler</span>
                <span className="text-sm font-black text-rose-500 font-mono">
                  {misclicks}
                </span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Zeit</span>
                <span className="text-sm font-black text-white font-mono flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-slate-400" />
                  <span>{timeElapsed}s</span>
                </span>
              </div>
            </div>
          </div>

          {/* 5x5 GRID MATRIX */}
          <div className="relative w-full aspect-square sm:aspect-[4/3] bg-slate-950 border border-slate-850 rounded-3xl p-4 sm:p-6 shadow-inner flex items-center justify-center">
            
            <div className="grid grid-cols-5 gap-2 w-full h-full max-w-xl max-h-[450px]">
              {grid.map((cell) => {
                const isCenterCell = cell.id === 12; // Flat 0-indexed center of 5x5 is index 12

                return (
                  <div
                    key={cell.id}
                    onPointerDown={() => handleCellClick(cell.id, cell.value, cell.isCleared)}
                    className={`relative flex items-center justify-center rounded-2xl border font-mono font-black select-none transition-all cursor-pointer transform active:scale-95 ${
                      cell.isCleared
                        ? 'bg-slate-900/20 border-slate-900 text-slate-700 pointer-events-none'
                        : cell.flashState === 'correct'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : cell.flashState === 'incorrect'
                            ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                            : 'bg-slate-900/60 border-slate-850 text-slate-300 hover:bg-slate-850 hover:border-slate-800'
                    } text-base sm:text-xl md:text-2xl`}
                  >
                    {/* Render standard cell contents */}
                    <span>{cell.value}</span>

                    {/* RENDER THE FIXATION TARGET SPECIFICALLY IN THE CENTER CELL (SUPERIMPOSED) */}
                    {isCenterCell && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)] bg-slate-950/80">
                          <span className="text-rose-500 text-sm sm:text-base font-bold">★</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

          {/* REACTION HUD AND GUIDE */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900/40 border border-slate-850 rounded-2xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                Nutze deine <strong>periphere Wahrnehmung</strong>. Lass deinen Blick starr auf dem zentralen roten Stern <strong>★</strong> ruhen.
              </p>
            </div>
            {liveReaction !== null && (
              <div className="text-right text-[10px] font-mono">
                <span className="text-slate-500 uppercase font-black mr-2">Reaktionszeit:</span>
                <span className="text-cyan-400 font-bold">{liveReaction}ms</span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* WINNER SUMMARY SCREEN */}
      {gameState === 'finished' && (
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 text-center shadow-2xl animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/5">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">Auswertung abgeschlossen!</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Exzellente Leistung bei „Peripherie“. Du hast alle 25 Zahlen erfolgreich peripher lokalisiert!
            </p>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Gesamtzeit</span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">
                {timeElapsed}s
              </span>
              <p className="text-[9px] text-slate-500 font-sans mt-1">
                Inklusive Zeitstrafen
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Ø Reaktionszeit</span>
              <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">
                {avgReactionTime}ms
              </span>
              <p className="text-[9px] text-slate-500 font-sans mt-1">
                Pro korrektem Tipp
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Fehlklicks</span>
              <span className="text-2xl font-black text-rose-500 font-mono mt-1 block">
                {misclicks}
              </span>
              <p className="text-[9px] text-rose-500/80 font-sans mt-1 font-bold">
                +{misclicks}s Zeitstrafe
              </p>
            </div>
          </div>

          {/* ADVICE */}
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center">
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              <strong>Vorteil für Torhüter:</strong> Ein starkes peripheres Sichtfeld erlaubt es dir, die Bewegungen heranstürmender Stürmer oder positionierter Mitspieler im Strafraum wahrzunehmen, während dein Hauptfokus starr auf dem Ball liegt.
            </p>
          </div>

          {/* FOOTER CONTROLS */}
          <div className="flex gap-3 max-w-sm mx-auto">
            <button
              onClick={startNewGame}
              className="flex-1 py-3 bg-cyan-400 hover:bg-cyan-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Erneut Starten</span>
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
