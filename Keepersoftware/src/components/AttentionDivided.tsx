import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Timer, Brain, Trophy, Volume2, VolumeX, 
  RotateCcw, CheckCircle2, XCircle, Sparkles, Award
} from 'lucide-react';
import { UserProfile } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface AttentionDividedProps {
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

type GameState = 'idle' | 'countdown' | 'target_phase' | 'tracking_phase' | 'selection_phase' | 'evaluation_phase';

interface Circle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isTarget: boolean;
  isSelected: boolean;
}

const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;
const CIRCLE_RADIUS = 28; // Large and clear touch target

export default function AttentionDivided({ userProfile, onBack, onUpdatePoints, onTrainingComplete, challengeMode }: AttentionDividedProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(3);
  const [targetTimer, setTargetTimer] = useState<number>(2.0); // 2 seconds target reveal
  const [trackingTimer, setTrackingTimer] = useState<number>(10.0); // 10 seconds tracking phase
  const [circles, setCircles] = useState<Circle[]>([]);
  const [score, setScore] = useState<number>(0); // Number of correctly identified targets (0-3)
  const [strobeActive, setStrobeActive] = useState<boolean>(false);

  // Strobe effect during tracking_phase
  useEffect(() => {
    if (gameState !== 'tracking_phase') {
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const circlesRef = useRef<Circle[]>([]);

  // Sound generator
  const playSound = (type: 'correct' | 'wrong' | 'complete' | 'tick' | 'start') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        oscillator.frequency.setValueAtTime(550, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'start') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'complete') {
        // Double tone beep
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.35);
      }
    } catch (err) {
      console.warn('Audio Context block:', err);
    }
  };

  // Helper to initialize 8 non-overlapping circles
  const initCircles = () => {
    const list: Circle[] = [];
    const numCircles = 8;
    
    // Choose 3 unique random indexes as targets
    const targetIndexes = new Set<number>();
    while (targetIndexes.size < 3) {
      targetIndexes.add(Math.floor(Math.random() * numCircles));
    }

    for (let i = 0; i < numCircles; i++) {
      let x = 0;
      let y = 0;
      let attempts = 0;
      let overlapping = true;

      // Keep generating coordinates until we find a non-overlapping spot
      while (overlapping && attempts < 100) {
        attempts++;
        x = CIRCLE_RADIUS + Math.random() * (VIRTUAL_WIDTH - CIRCLE_RADIUS * 2);
        y = CIRCLE_RADIUS + Math.random() * (VIRTUAL_HEIGHT - CIRCLE_RADIUS * 2);
        overlapping = false;

        for (const existing of list) {
          const dx = existing.x - x;
          const dy = existing.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CIRCLE_RADIUS * 2.5) {
            overlapping = true;
            break;
          }
        }
      }

      // Random directions
      const angle = Math.random() * Math.PI * 2;
      // High-performance velocity ranges for optimal goalkeeper cognitive response
      const speed = 2.8 + Math.random() * 1.5; 
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      list.push({
        id: i,
        x,
        y,
        vx,
        vy,
        radius: CIRCLE_RADIUS,
        isTarget: targetIndexes.has(i),
        isSelected: false
      });
    }

    circlesRef.current = list;
    setCircles(list);
  };

  // Trigger game initialization on mount
  useEffect(() => {
    initCircles();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle countdown before game starts
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown === 0) {
      setGameState('target_phase');
      setTargetTimer(2.0);
      playSound('start');
      return;
    }

    const timer = setTimeout(() => {
      playSound('tick');
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState, countdown]);

  // Handle target reveal phase (2.0 seconds)
  useEffect(() => {
    if (gameState !== 'target_phase') return;

    const interval = 100; // Step timer by 100ms
    const timer = setInterval(() => {
      setTargetTimer((prev) => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setGameState('tracking_phase');
          setTrackingTimer(10.0);
          return 0;
        }
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, interval);

    return () => clearInterval(timer);
  }, [gameState]);

  // Handle tracking phase countdown (10.0 seconds)
  useEffect(() => {
    if (gameState !== 'tracking_phase') return;

    const interval = 100;
    const timer = setInterval(() => {
      setTrackingTimer((prev) => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setGameState('selection_phase');
          playSound('complete');
          return 0;
        }
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, interval);

    return () => clearInterval(timer);
  }, [gameState]);

  // Game/Physics Loop (runs during tracking_phase)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Determine responsive scale factor
      const scaleX = canvas.width / VIRTUAL_WIDTH;
      const scaleY = canvas.height / VIRTUAL_HEIGHT;

      const items = circlesRef.current;

      if (gameState === 'tracking_phase') {
        // 1. Update positions and boundary collision
        for (const c of items) {
          c.x += c.vx;
          c.y += c.vy;

          // Wall bounces
          if (c.x - c.radius < 0) {
            c.x = c.radius;
            c.vx = -c.vx;
          } else if (c.x + c.radius > VIRTUAL_WIDTH) {
            c.x = VIRTUAL_WIDTH - c.radius;
            c.vx = -c.vx;
          }

          if (c.y - c.radius < 0) {
            c.y = c.radius;
            c.vy = -c.vy;
          } else if (c.y + c.radius > VIRTUAL_HEIGHT) {
            c.y = VIRTUAL_HEIGHT - c.radius;
            c.vy = -c.vy;
          }
        }

        // 2. Elastic 2D Circle-to-Circle Collisions (Goalkeeper performance vector math)
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const c1 = items[i];
            const c2 = items[j];

            const dx = c2.x - c1.x;
            const dy = c2.y - c1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = c1.radius + c2.radius;

            if (dist < minDist) {
              // Handle overlaps instantly to prevent stickiness
              const overlap = minDist - dist;
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);

              c1.x -= nx * overlap * 0.5;
              c1.y -= ny * overlap * 0.5;
              c2.x += nx * overlap * 0.5;
              c2.y += ny * overlap * 0.5;

              // Calculate relative velocity along the normal
              const kx = c1.vx - c2.vx;
              const ky = c1.vy - c2.vy;
              const vn = kx * nx + ky * ny;

              // Only bounce if they are moving towards each other
              if (vn > 0) {
                // Perfect elastic 2D collision formula
                const impulse = vn;
                c1.vx -= impulse * nx;
                c1.vy -= impulse * ny;
                c2.vx += impulse * nx;
                c2.vy += impulse * ny;
              }
            }
          }
        }
      }

      // 3. Draw All Circles
      items.forEach((c) => {
        const drawX = c.x * scaleX;
        const drawY = c.y * scaleY;
        const drawRadius = c.radius * Math.min(scaleX, scaleY);

        ctx.beginPath();
        ctx.arc(drawX, drawY, drawRadius, 0, Math.PI * 2);

        // Styling based on game state
        if (gameState === 'target_phase') {
          if (c.isTarget) {
            // Teammate reveals as glowing emerald green
            ctx.fillStyle = '#10b981';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#10b981';
          } else {
            // Neutral grey circles
            ctx.fillStyle = '#475569';
            ctx.shadowBlur = 0;
          }
        } else if (gameState === 'selection_phase') {
          if (c.isSelected) {
            // Selected highlight (beautiful deep fuchsia)
            ctx.fillStyle = '#d946ef';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#d946ef';
          } else {
            // Unselected grey circles
            ctx.fillStyle = '#475569';
            ctx.shadowBlur = 0;
          }
        } else if (gameState === 'evaluation_phase') {
          // Evaluation reveal
          if (c.isSelected) {
            if (c.isTarget) {
              // Correct Choice (Emerald Green glow)
              ctx.fillStyle = '#10b981';
              ctx.shadowBlur = 25;
              ctx.shadowColor = '#10b981';
            } else {
              // Incorrect Choice (Rose Red warning glow)
              ctx.fillStyle = '#f43f5e';
              ctx.shadowBlur = 25;
              ctx.shadowColor = '#f43f5e';
            }
          } else if (c.isTarget) {
            // Revealed target that was missed (Cyan outline / transparent body)
            ctx.fillStyle = 'rgba(71, 85, 105, 0.4)';
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#06b6d4';
          } else {
            // Neutral grey circles unselected
            ctx.fillStyle = '#1e293b';
            ctx.shadowBlur = 0;
          }
        } else {
          // Tracking phase or countdown phase (identical grey)
          ctx.fillStyle = '#475569';
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.closePath();

        // Add visual styling details (shiny overlay/inner depth)
        ctx.shadowBlur = 0; // reset
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Subtly draw a white inner glare to make circles look like 3D balls
        ctx.beginPath();
        ctx.arc(drawX - drawRadius * 0.3, drawY - drawRadius * 0.3, drawRadius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        ctx.closePath();
      });

      // Continue loop if in matching states
      if (gameState === 'countdown' || gameState === 'tracking_phase' || gameState === 'target_phase' || gameState === 'selection_phase' || gameState === 'evaluation_phase') {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, circles]);

  // Handle clicking/tapping canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'selection_phase') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert screen coordinates to canvas virtual units (800x600)
    const clickX = ((clientX - rect.left) / rect.width) * VIRTUAL_WIDTH;
    const clickY = ((clientY - rect.top) / rect.height) * VIRTUAL_HEIGHT;

    // Check which circle was clicked (with a slightly generous touch zone)
    const clickedCircle = circlesRef.current.find((c) => {
      const dx = c.x - clickX;
      const dy = c.y - clickY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < c.radius + 15; // +15px tolerance for mobile finger taps
    });

    if (clickedCircle) {
      playSound('tick');
      
      // Toggle selection (max 3 selected)
      const currentSelectedCount = circlesRef.current.filter((c) => c.isSelected).length;

      if (clickedCircle.isSelected) {
        clickedCircle.isSelected = false;
      } else if (currentSelectedCount < 3) {
        clickedCircle.isSelected = true;
      }

      // Refresh list to force react update/canvas redrawing
      setCircles([...circlesRef.current]);

      // If exactly 3 have been chosen, evaluate instantly
      const updatedSelectedCount = circlesRef.current.filter((c) => c.isSelected).length;
      if (updatedSelectedCount === 3) {
        setTimeout(() => {
          evaluateRound();
        }, 300);
      }
    }
  };

  // Evaluate the tracking results
  const evaluateRound = () => {
    const finalCircles = circlesRef.current;
    
    // Count matches (correctly chosen original targets)
    const matches = finalCircles.filter((c) => c.isSelected && c.isTarget).length;
    setScore(matches);
    setGameState('evaluation_phase');

    if (matches === 3) {
      playSound('correct');
    } else {
      playSound('wrong');
    }

    if (!challengeMode && onTrainingComplete) {
      onTrainingComplete(matches);
    }
  };

  // Restart next round
  const restartGame = () => {
    setCountdown(3);
    setTargetTimer(2.0);
    setTrackingTimer(10.0);
    setScore(0);
    initCircles();
    setGameState('countdown');
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
            <Brain className="w-3.5 h-3.5" />
            <span>Kognitionstraining</span>
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
                <Brain className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Attention Divided</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Trainiert das periphere Sehen, die räumliche Orientierung und die geteilte Aufmerksamkeit. Du musst mehrere sich bewegende Objekte gleichzeitig fokussieren und verfolgen.
              </p>
            </div>

            <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
              <span className="block text-[10px] font-mono font-bold uppercase text-pink-400 tracking-wider">
                Spielanleitung (Multi-Object Tracking)
              </span>

              <div className="space-y-3.5 text-xs">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">1</span>
                  <p className="text-slate-300 leading-normal">
                    <strong>Einprägen:</strong> Zu Beginn leuchten <span className="text-emerald-400 font-bold">3 von 8 grauen Kreisen</span> für 2 Sekunden grün auf. Merke dir diese 3 Kreise gut!
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">2</span>
                  <p className="text-slate-300 leading-normal">
                    <strong>Verfolgen:</strong> Alle Kreise werden wieder grau und bewegen sich für 10 Sekunden chaotisch durcheinander. Verliere deine 3 Kreise nicht aus den Augen!
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">3</span>
                  <p className="text-slate-300 leading-normal">
                    <strong>Auswählen:</strong> Sobald die Bewegung stoppt, tippst du genau die 3 Kreise an, die anfangs grün waren.
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2 text-center">
              <p className="text-[10px] text-slate-500 leading-normal font-sans">
                Schaffe eine perfekte Runde (<span className="text-emerald-400 font-semibold">alle 3 Mitspieler richtig identifiziert</span>), um deine Übersicht zu demonstrieren!
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={() => {
                  setCountdown(3);
                  setGameState('countdown');
                }}
                className="px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-2xl text-sm uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Kognitionstraining Starten</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ACTIVE GAME CANVAS (Countdown, Target, Tracking, Selection, and Evaluation) */}
        {gameState !== 'idle' && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* STATUS HEADER INFO */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-pink-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {gameState === 'countdown' && 'Bereitmachen...'}
                  {gameState === 'target_phase' && '1. Einprägen: Partner merken!'}
                  {gameState === 'tracking_phase' && '2. Verfolgen: Augen auf!'}
                  {gameState === 'selection_phase' && '3. Auswählen: 3 Partner tippen!'}
                  {gameState === 'evaluation_phase' && '4. Auswertung'}
                </span>
              </div>

              {/* TIMERS */}
              <div className="flex items-center gap-3">
                {gameState === 'countdown' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono font-bold text-xs rounded-xl">
                    <span>Fokus!</span>
                  </div>
                )}
                {gameState === 'target_phase' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs rounded-xl">
                    <span>Reveal: {targetTimer.toFixed(1)}s</span>
                  </div>
                )}
                {gameState === 'tracking_phase' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono font-bold text-xs rounded-xl animate-pulse">
                    <Timer className="w-3.5 h-3.5" />
                    <span>Verbleibend: {trackingTimer.toFixed(1)}s</span>
                  </div>
                )}
                {gameState === 'selection_phase' && (
                  <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs rounded-xl">
                    <span>Ausgewählt: {circles.filter((c) => c.isSelected).length} / 3</span>
                  </div>
                )}
                {gameState === 'evaluation_phase' && (
                  <div className={`px-3 py-1 rounded-xl text-xs font-bold font-mono ${
                    score === 3 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    <span>Treffer: {score} / 3</span>
                  </div>
                )}
              </div>
            </div>

            {/* CANVAS CONTAINER */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl mx-auto max-w-2xl relative overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={525}
                onClick={handleCanvasClick}
                onTouchStart={handleCanvasClick}
                className="w-full aspect-[4/3] bg-slate-950 rounded-2xl cursor-pointer"
                id="mot-canvas"
              />

              {/* STROBOSCOPIC BLACKOUT OVERLAY */}
              {strobeActive && (
                <div className="absolute inset-0 bg-black z-20 pointer-events-none transition-opacity duration-75 rounded-2xl" />
              )}
              {/* COUNTDOWN OVERLAY ON TOP OF CANVAS */}
              {gameState === 'countdown' && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-black tracking-widest mb-2">Bereitmachen</span>
                  <motion.span
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-7xl font-black text-pink-400 font-mono"
                  >
                    {countdown}
                  </motion.span>
                </div>
              )}
            </div>

            {/* LIVE FEEDBACK OR EVALUATION CARD */}
            {gameState === 'evaluation_phase' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 text-center max-w-md mx-auto"
              >
                <div className="flex justify-center">
                  {score === 3 ? (
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
                    {score === 3 ? 'Hervorragende Übersicht!' : 'Knapp daneben!'}
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    {score === 3 
                      ? 'Du hast alle 3 Mitspieler perfekt im Blick behalten. Deine perzeptuelle Geschwindigkeit ist auf Top-Niveau!'
                      : `Du hast ${score} von 3 Mitspielern erfolgreich verfolgt. Konzentriere dich auf dein peripheres Sehfeld!`
                    }
                  </p>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  {challengeMode ? (
                    <button
                      onClick={() => challengeMode.onComplete(score, { score, accuracy: (score / 3) * 100 })}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Wettkampf-Ergebnis einreichen</span>
                    </button>
                  ) : (
                    <button
                      onClick={restartGame}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Nächste Runde</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* LIVE FEEDBACK */}
            {gameState !== 'evaluation_phase' && (
              <p className="text-center text-[11px] text-slate-500 font-mono uppercase tracking-wider">
                {gameState === 'countdown' && 'Bereite dich vor. Die Kreise fangen gleich an zu wandern!'}
                {gameState === 'target_phase' && 'Merke dir die Positionen der grünen Kreise.'}
                {gameState === 'tracking_phase' && 'Behalte die Ziele während des Durcheinanders im Blick!'}
                {gameState === 'selection_phase' && 'Tippe genau die 3 Kreise an, die anfangs grün waren.'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
