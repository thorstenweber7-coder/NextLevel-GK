import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Brain, Trophy, Volume2, VolumeX, 
  RotateCcw, CheckCircle2, XCircle, Award, Sparkles, Plus, Minus, Info
} from 'lucide-react';
import { UserProfile } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface MemoboxProps {
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

type GameState = 'idle' | 'countdown' | 'playing' | 'input' | 'feedback' | 'finished';
type Level = 1 | 2 | 3;

interface BallEvent {
  type: 'IN' | 'OUT';
  boxIndex: number; // 0, 1, or 2
}

interface MovingBall {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  progress: number;
  type: 'IN' | 'OUT';
  boxIndex: number;
}

export default function Memobox({ userProfile, onBack, onUpdatePoints, onTrainingComplete, challengeMode }: MemoboxProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  // Level & Timer States (Fixiert auf Level 3 Profi)
  const [level, setLevel] = useState<Level>(3);
  const [strobeActive, setStrobeActive] = useState<boolean>(false);

  // Strobe effect during playing_sequence
  useEffect(() => {
    if (gameState !== 'playing_sequence') {
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
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds] = useState<number>(3);
  
  // Game sequence state
  const [sequence, setSequence] = useState<BallEvent[]>([]);
  const [activeEventIndex, setActiveEventIndex] = useState<number>(-1);
  const [trueCounts, setTrueCounts] = useState<number[]>([0, 0, 0]);
  const [userCounts, setUserCounts] = useState<number[]>([0, 0, 0]);
  const [roundResults, setRoundResults] = useState<boolean[]>([]);
  
  // Audio state
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Animation ref & Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeBallRef = useRef<MovingBall | null>(null);
  const eventStartTimeRef = useRef<number>(0);
  const nextEventTimeoutRef = useRef<any>(null);

  const countdownRef = useRef<number>(3);
  const [countdownDisplay, setCountdownDisplay] = useState<number>(3);

  // Difficulty settings
  const getLevelSettings = (lvl: Level) => {
    switch (lvl) {
      case 1:
        return { eventsCount: 8, duration: 1800, label: 'Einfach', speedText: 'Gemächlich' };
      case 2:
        return { eventsCount: 12, duration: 1300, label: 'Mittel', speedText: 'Schnell' };
      case 3:
        return { eventsCount: 15, duration: 900, label: 'Profi', speedText: 'Extrem schnell' };
    }
  };

  const activeSettings = getLevelSettings(level);

  // Play synthesized audio
  const playSound = (type: 'correct' | 'wrong' | 'in' | 'out' | 'countdown' | 'complete' | 'click') => {
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
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'wrong') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'in') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(330, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'out') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(550, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'countdown') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'complete') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('Audio synthesis blocked/unsupported:', e);
    }
  };

  // Generate sequence of events
  const generateSequence = (length: number) => {
    const seq: BallEvent[] = [];
    const counts = [0, 0, 0];
    
    for (let i = 0; i < length; i++) {
      const canOut = counts.some(c => c > 0);
      // Give rolling-in a slightly higher chance to ensure boxes get filled
      const type = (!canOut || Math.random() < 0.6) ? 'IN' : 'OUT';
      
      let boxIndex = 0;
      if (type === 'IN') {
        boxIndex = Math.floor(Math.random() * 3);
        counts[boxIndex]++;
      } else {
        const nonZeroIndices = counts
          .map((count, idx) => (count > 0 ? idx : -1))
          .filter(idx => idx !== -1);
        boxIndex = nonZeroIndices[Math.floor(Math.random() * nonZeroIndices.length)];
        counts[boxIndex]--;
      }
      seq.push({ type, boxIndex });
    }
    
    return { seq, counts };
  };

  // Start a new round
  const startRound = (roundNum: number) => {
    const settings = getLevelSettings(level);
    const { seq, counts } = generateSequence(settings.eventsCount);
    
    setSequence(seq);
    setTrueCounts(counts);
    setUserCounts([0, 0, 0]);
    setActiveEventIndex(-1);
    activeBallRef.current = null;
    
    setCurrentRound(roundNum);
    setGameState('countdown');
    countdownRef.current = 3;
    setCountdownDisplay(3);
    playSound('countdown');
  };

  // Countdown cycle
  useEffect(() => {
    if (gameState !== 'countdown') return;

    const timer = setInterval(() => {
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        clearInterval(timer);
        setGameState('playing');
        triggerNextEvent(0);
      } else {
        setCountdownDisplay(countdownRef.current);
        playSound('countdown');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Handle setting off next event
  const triggerNextEvent = (index: number) => {
    if (index >= sequence.length) {
      // Finished simulation phase, move to inputs
      if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
      setTimeout(() => {
        setGameState('input');
        playSound('complete');
      }, 800);
      return;
    }

    setActiveEventIndex(index);
    const event = sequence[index];
    
    // Canvas dimensions are 600x350
    // Box center X coordinates: Left (120), Center (300), Right (480)
    const boxCentersX = [120, 300, 480];
    const targetY = 240; // inside the box

    let startX = 0;
    let startY = 0;
    let targetX = 0;
    let finalTargetY = 0;

    if (event.type === 'IN') {
      // Spawn at top outside
      startX = 50 + Math.random() * 500;
      startY = -20;
      targetX = boxCentersX[event.boxIndex];
      finalTargetY = targetY;
      playSound('in');
    } else {
      // Spawn inside the box and roll out bottom
      startX = boxCentersX[event.boxIndex];
      startY = targetY;
      targetX = startX + (Math.random() * 60 - 30);
      finalTargetY = 380;
      playSound('out');
    }

    activeBallRef.current = {
      startX,
      startY,
      targetX,
      targetY: finalTargetY,
      x: startX,
      y: startY,
      progress: 0,
      type: event.type,
      boxIndex: event.boxIndex
    };

    eventStartTimeRef.current = Date.now();
  };

  // Canvas render loop
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localAnimationFrame: number;

    const boxCentersX = [120, 300, 480];
    const boxWidth = 110;
    const boxHeight = 85;
    const boxY = 200;

    const render = () => {
      // 1. Clear Canvas with Slate-950 color
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw aesthetic tactical pitch grid on background
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      // Draw grid lines
      for (let i = 40; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 40; j < canvas.height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw penalty box outlines behind
      ctx.strokeStyle = '#334155/50';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(300, 10, 60, 0, Math.PI);
      ctx.stroke();

      // 3. Draw the 3 Boxes (goals)
      const colors = ['#ec4899', '#eab308', '#3b82f6']; // Pink, Yellow, Blue
      const boxLabels = ['TOR A (LINKS)', 'TOR B (MITTE)', 'TOR C (RECHTS)'];

      for (let i = 0; i < 3; i++) {
        const cx = boxCentersX[i];
        const bx = cx - boxWidth / 2;
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors[i] + '40';

        // Draw box container
        ctx.fillStyle = '#0f172a80'; // semi transparent slate-900
        ctx.strokeStyle = colors[i] + 'bb'; // custom borders
        ctx.lineWidth = 3;
        
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(bx, boxY, boxWidth, boxHeight, 16);
        ctx.fill();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw dynamic target circles inside box (for a clean visual anchor)
        ctx.strokeStyle = colors[i] + '25';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, boxY + boxHeight/2, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Box Label Inside
        ctx.fillStyle = colors[i];
        ctx.font = 'black 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(boxLabels[i], cx, boxY + boxHeight - 12);
      }

      // 4. Update and animate the current moving ball
      const ball = activeBallRef.current;
      if (ball) {
        const elapsed = Date.now() - eventStartTimeRef.current;
        const speedSettings = getLevelSettings(level);
        ball.progress = Math.min(1, elapsed / speedSettings.duration);
        
        // Sine ease-in-out translation
        const t = Math.sin(ball.progress * Math.PI / 2);
        ball.x = ball.startX + (ball.targetX - ball.startX) * t;
        ball.y = ball.startY + (ball.targetY - ball.startY) * t;

        // Draw neon ball
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#a3e635'; // Lime neon ball glow
        ctx.fillStyle = '#bef264'; // bright lime 300
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 11, 0, Math.PI * 2);
        ctx.fill();

        // Soccer ball pattern/lines details inside
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#3f6212'; // dark olive lines
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
        ctx.stroke();

        // Check if finished this animation
        if (ball.progress >= 1) {
          activeBallRef.current = null;
          // Set timeout for next movement
          nextEventTimeoutRef.current = setTimeout(() => {
            triggerNextEvent(activeEventIndex + 1);
          }, 350);
        }
      }

      localAnimationFrame = requestAnimationFrame(render);
    };

    localAnimationFrame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(localAnimationFrame);
      if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
    };
  }, [gameState, activeEventIndex, sequence, level]);

  // Handles Counter changes
  const updateCount = (index: number, val: number) => {
    playSound('click');
    setUserCounts(prev => {
      const next = [...prev];
      next[index] = Math.max(0, next[index] + val);
      return next;
    });
  };

  // Check user answers for the current round
  const checkAnswers = () => {
    const isCorrect = userCounts.every((count, idx) => count === trueCounts[idx]);
    
    if (isCorrect) {
      playSound('correct');
    } else {
      playSound('wrong');
    }

    setRoundResults(prev => [...prev, isCorrect]);
    setGameState('feedback');
  };

  // Move to next round or finish game
  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      startRound(currentRound + 1);
    } else {
      setGameState('finished');
      const allPerfect = [...roundResults, roundResults[roundResults.length - 1] || false]
        .every(r => r === true);
      if (allPerfect) {
        playSound('complete');
      }
      if (!challengeMode && onTrainingComplete) {
        onTrainingComplete(perfectCount);
      }
    }
  };

  const perfectCount = roundResults.filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-md border border-pink-500/20 uppercase tracking-wider">
                Kognitionstraining
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Shell Game</h1>
          </div>
        </div>

        {/* SOUND CONTROL & HIGH SCORE BADGE */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span>Erfolgsquote: 100% gefordert</span>
          </div>
          
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 hover:bg-pink-500/20' 
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 1. START SCREEN */}
      {gameState === 'idle' && (
        <div className="grid md:grid-cols-5 gap-6 items-start">
          {/* Main info card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 md:col-span-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Brain className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                Arbeitsgedächtnis &amp; Spatial Tracking
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                Als Torwart musst du das Spielgeschehen ständig scannen und abspeichern. Shell Game trainiert deine Fähigkeit, die Positionen von Bällen oder Spielern im Arbeitsgedächtnis aktiv zu aktualisieren (Working Memory Updating).
              </p>
            </div>

            {/* FIXED HARD LEVEL BADGE */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Schwerste Herausforderung (Fixiert)</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                <strong>Level 3 (Profi - 15 Ballaktionen)</strong> mit <strong>Stroboskop-Effekt</strong>.
              </p>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                onClick={() => startRound(1)}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-pink-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Training Starten</span>
              </button>
            </div>
          </div>

          {/* Rules / Explainers Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 md:col-span-2">
            <div className="flex items-center gap-2 text-pink-400 font-bold">
              <Info className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider">Spielanleitung</span>
            </div>

            <div className="space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">1</span>
                <p>
                  <strong>Die Simulation:</strong> Zu Beginn siehst du 3 leere Tore (A, B und C). Nacheinander rollen Bälle in die Tore hinein oder wieder heraus.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">2</span>
                <p>
                  <strong>Im Kopf mitzählen:</strong> Die Bälle verschwinden in den Toren. Du musst im Kopf mitzählen, wie viele Bälle sich aktuell in <em>jedem einzelnen</em> Tor befinden.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">3</span>
                <p>
                  <strong>Abfrage:</strong> Gib nach Ende aller Bewegungen die genaue Anzahl für jedes Tor ein. Versuche, alle 3 Runden fehlerfrei zu bestehen, um ein perfektes Ergebnis zu erzielen.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. COUNTDOWN VIEW */}
      {gameState === 'countdown' && (
        <div className="min-h-[350px] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-6">
          <motion.div
            key={countdownDisplay}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-4"
          >
            <span className="text-4xl font-black text-pink-400 font-mono">{countdownDisplay}</span>
          </motion.div>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest animate-pulse">
            Runde {currentRound} von {totalRounds} startet... Konzentration!
          </p>
        </div>
      )}

      {/* 3. SIMULATION VIEW */}
      {gameState === 'playing' && (
        <div className="space-y-4">
          {/* Header Stats bar */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">RUNDE:</span>
              <span className="text-pink-400 font-black">{currentRound} / {totalRounds}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">LEVEL:</span>
              <span className="text-slate-300 font-bold">{activeSettings.label} ({activeSettings.eventsCount} Aktionen)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">SCHRITT:</span>
              <span className="text-lime-400 font-black">{Math.min(activeSettings.eventsCount, activeEventIndex + 1)} / {activeSettings.eventsCount}</span>
            </div>
          </div>

          {/* Active Canvas wrapper */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* STROBOSCOPIC BLACKOUT OVERLAY */}
            {strobeActive && (
              <div className="absolute inset-0 bg-black z-50 pointer-events-none transition-opacity duration-75" />
            )}
            <canvas 
              ref={canvasRef}
              width={600}
              height={350}
              className="w-full h-auto aspect-[6/3.5] block"
            />
            
            {/* Status info toast inside canvas */}
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold tracking-wider text-slate-300 flex items-center gap-1.5 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              SIMULATION LÄUFT... MERKE DIR DIE BÄLLE!
            </div>
          </div>
        </div>
      )}

      {/* 4. INPUT PHASE */}
      {gameState === 'input' && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-pink-400 tracking-wider">
              Simulation beendet!
            </span>
            <h2 className="text-xl font-black text-white">
              Wie viele Bälle befinden sich in den Toren?
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-sans">
              Trage für jedes der drei Tore die genaue Anzahl an Bällen ein, die sich nach Abschluss aller Bewegungen im Inneren befinden.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {/* BOX 1 COUNTER */}
            <div className="bg-slate-900 border border-pink-500/20 rounded-2xl p-5 text-center space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-widest block">Tor A</span>
                <span className="text-sm font-black text-white">LINKS</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => updateCount(0, -1)}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-transform cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-black text-white w-8 font-mono">{userCounts[0]}</span>
                <button
                  onClick={() => updateCount(0, 1)}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-transform cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BOX 2 COUNTER */}
            <div className="bg-slate-900 border border-yellow-500/20 rounded-2xl p-5 text-center space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest block">Tor B</span>
                <span className="text-sm font-black text-white">MITTE</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => updateCount(1, -1)}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-transform cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-black text-white w-8 font-mono">{userCounts[1]}</span>
                <button
                  onClick={() => updateCount(1, 1)}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-transform cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BOX 3 COUNTER */}
            <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-5 text-center space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest block">Tor C</span>
                <span className="text-sm font-black text-white">RECHTS</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => updateCount(2, -1)}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-transform cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-black text-white w-8 font-mono">{userCounts[2]}</span>
                <button
                  onClick={() => updateCount(2, 1)}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 active:scale-95 transition-transform cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={checkAnswers}
              className="px-10 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer"
            >
              <span>Überprüfen</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. EVALUATION / FEEDBACK VIEW */}
      {gameState === 'feedback' && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
              Runde {currentRound} von {totalRounds} Auswertung
            </span>
            <h2 className="text-xl font-black text-white">
              {roundResults[roundResults.length - 1] ? 'Perfekt gelöst!' : 'Knapp daneben!'}
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto font-sans leading-relaxed">
              {roundResults[roundResults.length - 1] 
                ? 'Dein räumliches Tracking war fehlerfrei. Absolut fokussiert!'
                : 'Das Arbeitsgedächtnis wurde überlistet. Schau dir unten die wahren Werte an.'}
            </p>
          </div>

          {/* SIDE BY SIDE COMPARISON */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { label: 'Tor A (Links)', color: 'text-pink-400', u: userCounts[0], t: trueCounts[0] },
              { label: 'Tor B (Mitte)', color: 'text-yellow-400', u: userCounts[1], t: trueCounts[1] },
              { label: 'Tor C (Rechts)', color: 'text-blue-400', u: userCounts[2], t: trueCounts[2] }
            ].map((box, idx) => {
              const isMatch = box.u === box.t;
              return (
                <div 
                  key={idx}
                  className={`bg-slate-900 border rounded-2xl p-5 text-center space-y-3.5 transition-all ${
                    isMatch ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'border-rose-500/30 shadow-lg shadow-rose-500/5'
                  }`}
                >
                  <span className={`text-xs font-black uppercase tracking-wider block ${box.color}`}>
                    {box.label}
                  </span>

                  <div className="flex items-center justify-center gap-6">
                    <div>
                      <span className="block text-[9px] font-mono text-slate-500 uppercase">Deine Angabe</span>
                      <span className={`text-2xl font-black font-mono ${isMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {box.u}
                      </span>
                    </div>

                    <div className="w-px h-8 bg-slate-800" />

                    <div>
                      <span className="block text-[9px] font-mono text-slate-500 uppercase">Wahre Anzahl</span>
                      <span className="text-2xl font-black font-mono text-white">
                        {box.t}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center pt-1">
                    {isMatch ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> KORREKT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                        <XCircle className="w-3.5 h-3.5" /> FALSCH
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={handleNextRound}
              className="px-10 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer shadow-lg shadow-pink-500/20"
            >
              <span>{currentRound < totalRounds ? 'Nächste Runde starten' : 'Gesamtergebnis anzeigen'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. GAME OVER / FINISHED VIEW */}
      {gameState === 'finished' && (
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 text-center max-w-md mx-auto">
          <div className="flex justify-center">
            {perfectCount === 3 ? (
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <XCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">
              {perfectCount === 3 ? 'Kognitiver Spitzenwert!' : 'Bleib fokussiert!'}
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              {perfectCount === 3 
                ? 'Überragende Vorstellung! Du hast alle 3 Runden fehlerfrei absolviert. Dein Gehirn meistert das Arbeitsgedächtnis-Updating unter Stress perfekt!'
                : `Du hast ${perfectCount} von 3 Runden fehlerfrei gemeistert. Drücke unten auf "Erneut Spielen", um deine Arbeitsgedächtnis-Kapazität weiter zu trainieren.`}
            </p>
          </div>

          {/* ACCURACY BAR */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">RUNDEN FEHLERFREI:</span>
              <span className={`font-black ${perfectCount === 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {perfectCount} / 3 Runden
              </span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${perfectCount === 3 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${(perfectCount / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center space-y-2">
            <p className="text-[10px] text-slate-400 font-sans leading-normal">
              Arbeitsgedächtnis und räumliches Tracking sind entscheidend für Torhüter, um Spielsituationen sekundenschnell zu erfassen.
            </p>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {challengeMode ? (
              <button
                onClick={() => challengeMode.onComplete(perfectCount, {
                  perfectCount,
                  level,
                  roundResults
                })}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer animate-pulse"
              >
                <Trophy className="w-4 h-4" />
                <span>Wettkampf-Ergebnis einreichen</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => startRound(1)}
                  className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Erneut Spielen</span>
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 py-3 px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Fertig</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
