import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Timer, Target, Zap, RotateCcw, 
  CheckCircle2, Volume2, VolumeX, AlertCircle, Eye, HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface PeripherieProps {
  userProfile: UserProfile;
  onBack: () => void;
  onTrainingComplete?: () => void;
}

type GameState = 'idle' | 'countdown' | 'flight' | 'input' | 'feedback' | 'finished';

interface FlightAttempt {
  round: number;
  correctDigit: number;
  enteredDigit: number | null;
  correct: boolean;
}

export default function Peripherie({ userProfile, onBack, onTrainingComplete }: PeripherieProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [round, setRound] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);

  // Ball & Flight state
  const [enteredDigit, setEnteredDigit] = useState<number | null>(null);
  const [correctDigit, setCorrectDigit] = useState<number>(0);
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);

  // Session Logs
  const [attempts, setAttempts] = useState<FlightAttempt[]>([]);

  // Refs for the Canvas Animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Ball trajectory and flash parameters
  const ballPosRef = useRef({ x: 100, y: 100 });
  const ballVelRef = useRef({ vx: 3, vy: 2 });
  const flightStartTimeRef = useRef<number>(0);
  const flashTimeRef = useRef<number>(0); // Timestamp when the digit flashes
  const isFlashingRef = useRef<boolean>(false);
  const digitRef = useRef<number>(0);
  const stateRef = useRef<GameState>('idle');
  const selectedLevelRef = useRef<number>(1);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    selectedLevelRef.current = selectedLevel;
  }, [selectedLevel]);

  // Synthetic feedback sounds
  const playSound = (type: 'correct' | 'incorrect' | 'tick' | 'complete' | 'flash' | 'woosh') => {
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
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'incorrect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime); // low G
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'flash') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, audioCtx.currentTime); // high note for visual pop
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'woosh') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'complete') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 success melody
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, audioCtx.currentTime);
            g.gain.setValueAtTime(0.06, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            o.start();
            o.stop(audioCtx.currentTime + 0.2);
          }, idx * 100);
        });
      }
    } catch (e) {
      console.warn('Web Audio API audio context issue:', e);
    }
  };

  const startNewGame = () => {
    setAttempts([]);
    setRound(1);
    setEnteredDigit(null);
    setFeedbackStatus(null);
    setCountdown(3);
    setGameState('countdown');
  };

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown === 0) {
      startFlightRound(1);
      return;
    }

    playSound('tick');
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, gameState]);

  // Set up flight round parameters and trigger canvas animation
  const startFlightRound = (currRound: number) => {
    setGameState('flight');
    setEnteredDigit(null);
    setFeedbackStatus(null);

    const canvas = canvasRef.current;
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight || 320;
      }
    }

    // Initialize ball position to center
    const width = canvas ? canvas.width : 400;
    const height = canvas ? canvas.height : 320;
    ballPosRef.current = { x: width / 2, y: height / 2 };

    // Initial random organic speed
    const angle = Math.random() * Math.PI * 2;
    const multiplier = selectedLevelRef.current === 2 ? 1.5 : selectedLevelRef.current === 3 ? 2.0 : 1.0;
    const speed = (4 + Math.random() * 3) * multiplier;
    ballVelRef.current = {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed
    };

    // Determine when the digit will flash (between 1.5s and 3.5s into the 5.0s run)
    const randomFlashOffset = 1500 + Math.random() * 2000;
    flightStartTimeRef.current = performance.now();
    flashTimeRef.current = flightStartTimeRef.current + randomFlashOffset;
    isFlashingRef.current = false;

    // Select random digit from 0 to 9
    const randomDigit = Math.floor(Math.random() * 10);
    digitRef.current = randomDigit;
    setCorrectDigit(randomDigit);

    playSound('woosh');

    // Start requestAnimationFrame loop
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = requestAnimationFrame(updateCanvasAnimation);
  };

  // Continuous Canvas animation loop
  const updateCanvasAnimation = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Organic path mapping: bounce on walls + sine wave overlay perturbation
    let { x, y } = ballPosRef.current;
    let { vx, vy } = ballVelRef.current;
    const radius = 22;

    // Movement calculation
    x += vx;
    y += vy;

    // Overlay soft sinusoidal curves to make pursuit fluid and unpredictable
    const elapsedTotal = timestamp - flightStartTimeRef.current;
    const waveOffset = Math.sin(elapsedTotal / 250) * 1.5;
    y += waveOffset;

    // Edge collision boundaries
    if (x - radius < 0) {
      x = radius;
      vx = -vx * (0.9 + Math.random() * 0.2);
    } else if (x + radius > width) {
      x = width - radius;
      vx = -vx * (0.9 + Math.random() * 0.2);
    }

    if (y - radius < 0) {
      y = radius;
      vy = -vy * (0.9 + Math.random() * 0.2);
    } else if (y + radius > height) {
      y = height - radius;
      vy = -vy * (0.9 + Math.random() * 0.2);
    }

    // Keep speed bounded
    const multiplier = selectedLevelRef.current === 2 ? 1.5 : selectedLevelRef.current === 3 ? 2.0 : 1.0;
    const minSpeed = 3 * multiplier;
    const maxSpeed = 9 * multiplier;
    const currentSpeed = Math.sqrt(vx * vx + vy * vy);
    if (currentSpeed < minSpeed) {
      vx *= 1.3;
      vy *= 1.3;
    } else if (currentSpeed > maxSpeed) {
      vx *= 0.8;
      vy *= 0.8;
    }

    ballPosRef.current = { x, y };
    ballVelRef.current = { vx, vy };

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Draw Subtle Grid overlay in background
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let Gx = 0; Gx < width; Gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(Gx, 0);
      ctx.lineTo(Gx, height);
      ctx.stroke();
    }
    for (let Gy = 0; Gy < height; Gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, Gy);
      ctx.lineTo(width, Gy);
      ctx.stroke();
    }

    // Evaluate if flash trigger is active
    const isFlashingNow = timestamp >= flashTimeRef.current && timestamp < (flashTimeRef.current + 200);
    
    if (isFlashingNow && !isFlashingRef.current) {
      isFlashingRef.current = true;
      playSound('flash');
    }

    // DRAW SHADOW / TRAIL EFFECT
    ctx.beginPath();
    ctx.arc(x - vx * 1.5, y - vy * 1.5, radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.fill();

    // DRAW THE BALL
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    // Gradient fill for sleek sporty glow
    const gradient = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, radius);
    gradient.addColorStop(0, '#67e8f9'); // cyan-300
    gradient.addColorStop(0.5, '#06b6d4'); // cyan-500
    gradient.addColorStop(1, '#0891b2'); // cyan-600
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = isFlashingNow ? 18 : 8;
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow

    // DRAW THE FLASHED DIGIT (ONLY inside the 200ms window)
    if (isFlashingNow) {
      ctx.fillStyle = '#090d16'; // High contrast dark charcoal
      ctx.font = 'black 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(digitRef.current.toString(), x, y);
    }

    // Check if 5.0 seconds flight elapsed
    if (elapsedTotal >= 5000) {
      // End flight, request input phase
      setGameState('input');
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    } else {
      animationFrameIdRef.current = requestAnimationFrame(updateCanvasAnimation);
    }
  };

  // Submit recognized digit
  const handleSubmitDigit = () => {
    if (gameState !== 'input' || enteredDigit === null) return;

    const isCorrect = enteredDigit === correctDigit;
    setFeedbackStatus(isCorrect ? 'correct' : 'incorrect');
    setGameState('feedback');

    if (isCorrect) {
      playSound('correct');
    } else {
      playSound('incorrect');
    }

    // Save log
    const attempt: FlightAttempt = {
      round,
      correctDigit,
      enteredDigit,
      correct: isCorrect
    };

    const nextAttempts = [...attempts, attempt];
    setAttempts(nextAttempts);

    // Keep feedback screen on for 1.2s then transition
    setTimeout(() => {
      if (round >= 15) {
        playSound('complete');
        setGameState('finished');
        if (onTrainingComplete) {
          onTrainingComplete();
        }
      } else {
        setRound(prev => prev + 1);
        startFlightRound(round + 1);
      }
    }, 1200);
  };

  // Clean animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  // Keyboard keypad integration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'input') return;

      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 0 && num <= 9) {
        setEnteredDigit(num);
      } else if (e.key === 'Enter') {
        handleSubmitDigit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, enteredDigit, correctDigit, round, attempts]);

  // Session Stats calculations
  const correctCount = attempts.filter(a => a.correct).length;
  const accuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
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

      {/* VIEWS */}
      {gameState === 'idle' && (
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-lg">
            <Eye className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono">
              Limit of the Eyes
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Dieses neuroathletische Training erweitert deine visuelle Wahrnehmungsgrenze. Verfolge den gleitenden Ball mit deinen Augen (Smooth Pursuit) und erfasse blitzschnell die Zahl, die für einen Sekundenbruchteil im Ball aufleuchtet.
            </p>
          </div>

          {/* Guidelines */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-left space-y-3 text-slate-300 text-xs font-sans max-w-md mx-auto leading-normal">
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-[10px]">1</span>
              <p>Der blaue Ball gleitet <strong>5 Sekunden</strong> lang kreuz und quer über den Bildschirm.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-[10px]">2</span>
              <p>Irgendwann blitzt im Ball für nur <strong>200 Millisekunden</strong> eine Ziffer (0-9) auf.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-[10px]">3</span>
              <p>Wähle nach dem Stopp des Balls die erkannte Zahl aus. Insgesamt gibt es <strong>15 Runden</strong>.</p>
            </div>
          </div>

          {/* Level Selection */}
          <div className="space-y-3 text-left max-w-md mx-auto">
            <span className="block text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider">
              Geschwindigkeit (Schwierigkeitsgrad):
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 1, label: 'Level 1', speedLabel: 'Normal', desc: 'Standard', colorClass: 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10' },
                { level: 2, label: 'Level 2', speedLabel: 'Erhöht', desc: '+50%', colorClass: 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10' },
                { level: 3, label: 'Level 3', speedLabel: 'Maximal', desc: 'Doppelt', colorClass: 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10' }
              ].map((lvl) => (
                <button
                  key={lvl.level}
                  onClick={() => setSelectedLevel(lvl.level as any)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col justify-between ${
                    selectedLevel === lvl.level
                      ? lvl.level === 1
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : lvl.level === 2
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                      : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider">{lvl.label}</span>
                  <span className="block text-xs font-black mt-1 leading-none">{lvl.speedLabel}</span>
                  <span className="block text-[8px] opacity-60 mt-0.5">{lvl.desc}</span>
                </button>
              ))}
            </div>
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
            Fixiere deinen Blick...
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

      {/* FLIGHT STAGE & INPUT STAGE */}
      {(gameState === 'flight' || gameState === 'input' || gameState === 'feedback') && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* STATS HUD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div>
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Fortschritt</span>
              <span className="text-sm font-black text-white font-mono flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-cyan-400" />
                <span>Runde {round} / 15</span>
              </span>
            </div>

            <div className="hidden sm:block text-center">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Schwierigkeit</span>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                selectedLevel === 2 ? 'text-amber-400' : selectedLevel === 3 ? 'text-rose-400' : 'text-cyan-400'
              }`}>
                Level {selectedLevel} ({selectedLevel === 2 ? 'Erhöht' : selectedLevel === 3 ? 'Maximal' : 'Normal'})
              </span>
            </div>

            <div className="text-right">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Status</span>
              <span className={`text-xs font-mono font-bold ${
                gameState === 'flight' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'
              }`}>
                {gameState === 'flight' && 'Ball verfolgen...'}
                {gameState === 'input' && 'Zahl eingeben!'}
                {gameState === 'feedback' && 'Ergebnis wird ausgewertet...'}
              </span>
            </div>
          </div>

          {/* ACTIVE RENDERING CANVAS */}
          <div className="relative w-full h-[320px] bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center">
            
            {/* Real HTML5 Canvas */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full"
            />

            {/* FEEDBACK COLOURED FLASH OVERLAYS */}
            {gameState === 'feedback' && feedbackStatus === 'correct' && (
              <div className="absolute inset-0 bg-emerald-500/15 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-150 z-20">
                <span className="px-6 py-2 bg-emerald-500 text-slate-950 font-black text-sm uppercase tracking-widest rounded-full shadow-lg">
                  Richtig! ✓
                </span>
              </div>
            )}

            {gameState === 'feedback' && feedbackStatus === 'incorrect' && (
              <div className="absolute inset-0 bg-red-500/15 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-150 z-20">
                <span className="px-6 py-2 bg-red-500 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-lg">
                  Falsch! Die Zahl war {correctDigit}
                </span>
              </div>
            )}

            {/* Instruction for starting state */}
            {gameState === 'flight' && (
              <div className="absolute top-4 pointer-events-none select-none text-[9px] font-mono font-bold text-slate-600 uppercase tracking-widest bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-900/60">
                Augen auf den Ball richten
              </div>
            )}
          </div>

          {/* KEYPAD AND INPUT CONTAINER */}
          <div className={`p-5 bg-slate-900/80 border border-slate-800 rounded-3xl transition-all ${
            gameState !== 'input' ? 'opacity-40 pointer-events-none' : 'opacity-100'
          }`}>
            <div className="flex flex-col items-center space-y-4">
              
              {/* Output Display box */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-sans">Erkannte Zahl eingeben:</span>
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center font-mono font-black text-xl text-cyan-400">
                  {enteredDigit !== null ? enteredDigit : '?'}
                </div>

                <button
                  onClick={handleSubmitDigit}
                  disabled={enteredDigit === null}
                  className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    enteredDigit !== null
                      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Bestätigen
                </button>
              </div>

              {/* Number Buttons 0-9 */}
              <div className="grid grid-cols-5 gap-2 w-full max-w-sm">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <button
                    key={num}
                    onClick={() => setEnteredDigit(num)}
                    className={`h-11 rounded-xl border font-mono font-bold text-sm transition-all transform active:scale-95 cursor-pointer ${
                      enteredDigit === num
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-900 hover:border-slate-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* FINISHED SUMMARY SCREEN */}
      {gameState === 'finished' && (
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 text-center shadow-2xl animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/5">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">Training beendet!</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Dein Durchgang bei „Limit auf the Eyes“ wurde erfolgreich beendet. Hier sind deine Ergebnisse:
            </p>
          </div>

          {/* STATS */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 max-w-sm mx-auto relative overflow-hidden">
            <div className="flex justify-between items-start mb-3 border-b border-slate-900 pb-3">
              <div className="text-left">
                <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Level</span>
                <span className={`text-xs font-bold font-mono uppercase ${
                  selectedLevel === 2 ? 'text-amber-400' : selectedLevel === 3 ? 'text-rose-400' : 'text-cyan-400'
                }`}>
                  Level {selectedLevel}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Modus</span>
                <span className="text-xs font-bold font-mono uppercase text-slate-300">
                  {selectedLevel === 2 ? 'Erhöht' : selectedLevel === 3 ? 'Maximal' : 'Normal'}
                </span>
              </div>
            </div>
            <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Genauigkeit (Trefferquote)</span>
            <span className="text-4xl font-black text-cyan-400 font-mono mt-1 block">
              {accuracy}%
            </span>
            <p className="text-[10px] text-slate-400 font-sans mt-1.5 leading-relaxed">
              Du hast {correctCount} von 15 Ziffern richtig erkannt und fehlerfrei erfasst.
            </p>
          </div>

          {/* FOOTER ADVICE */}
          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center max-w-sm mx-auto">
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              <strong>Torwartrelevanz:</strong> Das präzise Verfolgen (Smooth Pursuit) rotierender Bälle gepaart mit dem schnellen Detailfokus ist die wichtigste Grundvoraussetzung, um die genaue Ballflugbahn bei Flatterbällen oder abgefälschten Schüssen im Auge zu behalten.
            </p>
          </div>

          {/* CONTROLS */}
          <div className="flex gap-3 max-w-sm mx-auto">
            <button
              onClick={startNewGame}
              className="flex-1 py-3 bg-cyan-400 hover:bg-cyan-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
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
