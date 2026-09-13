import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Brain, Trophy, Volume2, VolumeX, 
  RotateCcw, CheckCircle2, XCircle, Award, Eye, Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface BlitzmerkerProps {
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

type GameState = 'idle' | 'fixation' | 'flash' | 'mask' | 'answer' | 'evaluation';

interface FlashShape {
  type: 'circle' | 'square' | 'triangle';
  x: number;
  y: number;
  size: number;
  color: string;
}

const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;
const SHAPE_SIZE = 45;

const NEON_COLORS = [
  '#39ff14', // Neon Green
  '#00ffff', // Neon Cyan
  '#ff007f', // Neon Pink
  '#ff00ff', // Neon Magenta
  '#ffff00', // Neon Yellow
  '#ff5f1f', // Neon Orange
];

export default function Blitzmerker({ userProfile, onBack, onUpdatePoints, onTrainingComplete, challengeMode }: BlitzmerkerProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [strobeActive, setStrobeActive] = useState<boolean>(false);

  // Strobe effect during fixation and flash
  useEffect(() => {
    if (gameState !== 'fixation' && gameState !== 'flash') {
      setStrobeActive(false);
      return;
    }
    const interval = setInterval(() => {
      setStrobeActive((prev) => !prev);
    }, 180);
    return () => {
      clearInterval(interval);
      setStrobeActive(false);
    };
  }, [gameState]);
  
  const [streak, setStreak] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shapesRef = useRef<FlashShape[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Sound feedback system
  const playSound = (type: 'correct' | 'wrong' | 'tick' | 'flash' | 'complete') => {
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
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'wrong') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'tick') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'flash') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'complete') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.35);
      }
    } catch (err) {
      console.warn('Audio Context block:', err);
    }
  };

  // Generate 4 to 9 non-overlapping random shapes
  const generateShapes = () => {
    const count = Math.floor(Math.random() * 6) + 4; // Between 4 and 9
    setCorrectCount(count);

    const shapesList: FlashShape[] = [];
    const shapeTypes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let overlapping = true;
      let attempts = 0;

      while (overlapping && attempts < 150) {
        attempts++;
        // Generate coordinates inside safe bounds
        x = SHAPE_SIZE + Math.random() * (VIRTUAL_WIDTH - SHAPE_SIZE * 2);
        y = SHAPE_SIZE + Math.random() * (VIRTUAL_HEIGHT - SHAPE_SIZE * 2);
        overlapping = false;

        // Ensure shapes don't overlap
        for (const existing of shapesList) {
          const dx = existing.x - x;
          const dy = existing.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SHAPE_SIZE * 2.2) {
            overlapping = true;
            break;
          }
        }

        // Avoid the exact center to keep the central fixation clear
        const centerDist = Math.sqrt((x - VIRTUAL_WIDTH / 2) ** 2 + (y - VIRTUAL_HEIGHT / 2) ** 2);
        if (centerDist < SHAPE_SIZE * 1.5) {
          overlapping = true;
        }
      }

      shapesList.push({
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
        x,
        y,
        size: SHAPE_SIZE,
        color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
      });
    }

    shapesRef.current = shapesList;
  };

  // Start the tachistoscopic training pipeline
  const startChallenge = () => {
    setSelectedAnswer(null);
    generateShapes();
    setGameState('fixation');
  };

  // Handle fixation phase (1.5 seconds)
  useEffect(() => {
    if (gameState !== 'fixation') return;

    playSound('tick');
    const timer = setTimeout(() => {
      setGameState('flash');
    }, 1500);

    return () => clearTimeout(timer);
  }, [gameState]);

  // Handle flash phase (exactly 150 milliseconds)
  useEffect(() => {
    if (gameState !== 'flash') return;

    playSound('flash');
    const flashTimer = setTimeout(() => {
      setGameState('mask');
    }, 150);

    return () => {
      clearTimeout(flashTimer);
    };
  }, [gameState]);

  // Handle mask phase (500 milliseconds empty screen)
  useEffect(() => {
    if (gameState !== 'mask') return;

    const timer = setTimeout(() => {
      setGameState('answer');
    }, 500);

    return () => clearTimeout(timer);
  }, [gameState]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / VIRTUAL_WIDTH;
    const scaleY = canvas.height / VIRTUAL_HEIGHT;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Fixation Crosshair (Fixationskreuz)
    if (gameState === 'fixation') {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const size = 20;

      ctx.beginPath();
      ctx.strokeStyle = '#f43f5e'; // High-contrast Rose crosshair
      ctx.lineWidth = 3;
      
      // Horizontal line
      ctx.moveTo(cx - size, cy);
      ctx.lineTo(cx + size, cy);
      
      // Vertical line
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx, cy + size);
      
      ctx.stroke();
      ctx.closePath();

      // Add a subtle central point
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.closePath();
    }

    // 2. Draw Tachistoscopic Flash Shapes
    if (gameState === 'flash') {
      shapesRef.current.forEach((s) => {
        const drawX = s.x * scaleX;
        const drawY = s.y * scaleY;
        const drawSize = s.size * Math.min(scaleX, scaleY);

        ctx.beginPath();
        ctx.fillStyle = s.color;
        // Neon glow effect using canvas shadows
        ctx.shadowBlur = 15;
        ctx.shadowColor = s.color;

        if (s.type === 'circle') {
          ctx.arc(drawX, drawY, drawSize * 0.9, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.type === 'square') {
          ctx.rect(drawX - drawSize, drawY - drawSize, drawSize * 2, drawSize * 2);
          ctx.fill();
        } else if (s.type === 'triangle') {
          ctx.moveTo(drawX, drawY - drawSize);
          ctx.lineTo(drawX - drawSize, drawY + drawSize);
          ctx.lineTo(drawX + drawSize, drawY + drawSize);
          ctx.closePath();
          ctx.fill();
        }

        ctx.closePath();
        
        // Reset shadows
        ctx.shadowBlur = 0;
      });
    }

    // 3. Draw Masking (visual buffer so there's no afterimage)
    if (gameState === 'mask') {
      // Just plain empty dark canvas, or a subtle grid pattern
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

  }, [gameState]);

  // Handle user submitting their answer
  const submitAnswer = (num: number) => {
    setSelectedAnswer(num);
    setGameState('evaluation');

    const scoreValue = num === correctCount ? 1 : 0;
    if (num === correctCount) {
      playSound('correct');
      setStreak((prev) => prev + 1);
    } else {
      playSound('wrong');
      setStreak(0);
    }

    if (!challengeMode && onTrainingComplete) {
      onTrainingComplete(scoreValue);
    }
  };

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
            <Eye className="w-3.5 h-3.5" />
            <span>Tachistoskopie-Training</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* IDLE SCREEN / START PANEL */}
        {gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6"
          >
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto text-pink-400">
                <Eye className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Fastbrain</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Schult die Fähigkeit, visuelle Informationen maximal schnell zu erfassen. Dieses Tachistoskopie-Training verbessert die visuelle Verarbeitungsgeschwindigkeit von Torhütern unter Zeitdruck.
              </p>
            </div>

            <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
              <span className="block text-[10px] font-mono font-bold uppercase text-pink-400 tracking-wider">
                Ablauf des Trainings:
              </span>

              <div className="space-y-3.5 text-xs">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">1</span>
                  <p className="text-slate-300 leading-normal">
                    <strong>Fokussieren:</strong> Schaue genau auf das rote Fixationskreuz in der Mitte des Bildschirms (1.5 Sekunden).
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">2</span>
                  <p className="text-slate-300 leading-normal">
                    <strong>Der Blitz:</strong> Eine zufällige Anzahl von geometrischen Neon-Symbolen (4-9 Stück) blitzt für exakt <span className="text-pink-400 font-bold">150 Millisekunden</span> auf.
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">3</span>
                  <p className="text-slate-300 leading-normal">
                    <strong>Schätzen:</strong> Tippe anschließend so schnell wie möglich die richtige Anzahl der gesehenen Symbole an!
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2 text-center">
              <p className="text-[10px] text-slate-500 leading-normal font-sans">
                Baue eine Serie auf, um deine mentale Schärfe unter Beweis zu stellen und deine visuelle Erfassungsrate zu trainieren.
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={startChallenge}
                className="px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-2xl text-sm uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Fastbrain Starten</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ACTIVE CANVAS & SELECTION INTERFACES */}
        {gameState !== 'idle' && (
          <motion.div
            key="active-blitz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* ROUND PANEL */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-pink-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {gameState === 'fixation' && 'Fokussiere das rote Kreuz!'}
                  {gameState === 'flash' && 'BLITZ!'}
                  {gameState === 'mask' && 'Verarbeitung...'}
                  {gameState === 'answer' && 'Wie viele Symbole hast du gesehen?'}
                  {gameState === 'evaluation' && 'Auswertung'}
                </span>
              </div>

              {streak > 0 && (
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs rounded-xl font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                  <span>Serie: {streak}</span>
                </div>
              )}
            </div>

            {/* HIGH-CONTRAST CANVAS */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl mx-auto max-w-2xl relative overflow-hidden flex items-center justify-center">
              {/* STROBOSCOPIC BLACKOUT OVERLAY */}
              {strobeActive && (
                <div className="absolute inset-0 bg-black z-10 pointer-events-none transition-opacity duration-75 rounded-3xl" />
              )}
              <canvas
                ref={canvasRef}
                width={700}
                height={525}
                className="w-full aspect-[4/3] bg-slate-950 rounded-2xl"
                id="blitzmerker-canvas"
              />

              {/* OVERLAY INTERFACES FOR USER ANSWERS */}
              {gameState === 'answer' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20">
                  <span className="text-xs font-mono uppercase text-pink-400 tracking-widest font-black mb-3">Tachistoskopie-Abfrage</span>
                  <h3 className="text-lg md:text-xl font-black text-white text-center mb-6">
                    Wie viele Symbole hast du gesehen?
                  </h3>

                  <div className="grid grid-cols-4 gap-3 max-w-xs w-full">
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        onClick={() => submitAnswer(num)}
                        className="py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/40 text-slate-200 hover:text-white font-mono font-black text-lg rounded-xl transition-all cursor-pointer shadow-md"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* EVALUATION PANEL */}
            {gameState === 'evaluation' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 text-center max-w-md mx-auto"
              >
                <div className="flex justify-center">
                  {selectedAnswer === correctCount ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">
                    {selectedAnswer === correctCount ? 'Absolut richtig!' : 'Falsch geschätzt!'}
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    {selectedAnswer === correctCount
                      ? `Hervorragende Leistung! Du hast die ${correctCount} Symbole in 150ms fehlerfrei erfasst.`
                      : `Es waren tatsächlich genau ${correctCount} Symbole auf dem Spielfeld zu sehen.`
                    }
                  </p>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  {challengeMode ? (
                    <button
                      onClick={() => challengeMode.onComplete(selectedAnswer === correctCount ? 1 : 0, { correct: selectedAnswer === correctCount })}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Wettkampf-Ergebnis einreichen</span>
                    </button>
                  ) : (
                    <button
                      onClick={startChallenge}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Nächster Versuch</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* GENERAL FEEDBACK INSTRUCTION */}
            {gameState !== 'evaluation' && gameState !== 'answer' && (
              <p className="text-center text-[11px] text-slate-500 font-mono uppercase tracking-wider">
                {gameState === 'fixation' && 'Halte deinen Blick zentriert auf das Kreuz.'}
                {gameState === 'flash' && 'Erfasse das gesamte Feld peripher!'}
                {gameState === 'mask' && 'Informationen im Gehirn verarbeiten...'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
