import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Trophy, Volume2, VolumeX, 
  RotateCcw, CheckCircle2, XCircle, Award, Sparkles, Info, Target, Timer, Eye, EyeOff
} from 'lucide-react';
import { UserProfile } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface FlightsProps {
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

type GameState = 'idle' | 'countdown' | 'playing' | 'feedback' | 'finished';
type PathMode = 'Schuss' | 'Flanke';

interface TrajectoryPoint {
  x: number;
  y: number;
  time: number; // relative time in ms from flight start
}

export default function Flights({ userProfile, onBack, onUpdatePoints, onTrainingComplete, challengeMode }: FlightsProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [strobeActive, setStrobeActive] = useState<boolean>(false);

  // Strobe effect during flight or occlusion
  useEffect(() => {
    if (gameState !== 'flying' && gameState !== 'occluded') {
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
  
  // Game session parameters
  const [round, setRound] = useState<number>(1);
  const [pathMode, setPathMode] = useState<PathMode>('Schuss');
  const [spatialErrors, setSpatialErrors] = useState<number[]>([]);
  const [temporalErrors, setTemporalErrors] = useState<number[]>([]);
  
  // Single round stats
  const [roundSpatialError, setRoundSpatialError] = useState<number>(0);
  const [roundTemporalError, setRoundTemporalError] = useState<number>(0); // ms
  const [isTooEarly, setIsTooEarly] = useState<boolean>(false);
  const [userTap, setUserTap] = useState<{ x: number; y: number } | null>(null);

  // Physics & Animation Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Ball physical parameters
  const flightDuration = 2200; // Total travel time in ms (2.2 seconds)
  const flightStartTimeRef = useRef<number>(0);
  const trajectoryPointsRef = useRef<TrajectoryPoint[]>([]);
  const ballRadius = 15;
  const isBallInvisibleRef = useRef<boolean>(false);
  const [isBallInvisible, setIsBallInvisible] = useState<boolean>(false);
  
  // User tap record
  const userTapRef = useRef<{ x: number; time: number } | null>(null);

  const countdownRef = useRef<number>(3);
  const [countdownDisplay, setCountdownDisplay] = useState<number>(3);

  const avgTemporal = temporalErrors.length > 0 
    ? temporalErrors.reduce((a, b) => a + b, 0) / temporalErrors.length 
    : 0;

  useEffect(() => {
    if (gameState === 'finished' && !challengeMode && onTrainingComplete) {
      onTrainingComplete(avgTemporal);
    }
  }, [gameState, challengeMode, onTrainingComplete, avgTemporal]);

  // Sound synthesis
  const playSound = (type: 'correct' | 'wrong' | 'countdown' | 'complete' | 'shot' | 'invisible') => {
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
        oscillator.frequency.setValueAtTime(580, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1160, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.18);
      } else if (type === 'wrong') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'countdown') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(380, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'shot') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'invisible') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(700, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'complete') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
        oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.36); // C6
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Sound synthesis error:', e);
    }
  };

  // Generate deterministic ball path based on canvas dimensions
  const calculateTrajectory = (width: number, height: number, mode: PathMode) => {
    const points: TrajectoryPoint[] = [];
    const steps = 220; // 220 steps for 2.2 seconds (10ms interval)
    
    const startX = Math.random() > 0.5 ? Math.random() * (width * 0.2) : width - Math.random() * (width * 0.2);
    const startY = 15;
    
    const goalLineY = height - 40; // The goal target zone boundary
    const endX = width * 0.15 + Math.random() * (width * 0.7); // hits somewhere in the goal range

    if (mode === 'Schuss') {
      // Linear straight shot
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps);
        const x = startX + (endX - startX) * t;
        const y = startY + (goalLineY - startY) * t;
        points.push({ x, y, time: t * flightDuration });
      }
    } else {
      // Parabolic Arc Flanke
      // We want the ball to go up first and then drop. Standard parabola vertex:
      const peakHeight = height * 0.45; // peak amplitude
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps);
        const x = startX + (endX - startX) * t;
        // height parabolic drop formula
        // y goes from startY up to peak and then drops down to goalLineY
        const peakFactor = 4 * t * (1 - t); // ranges from 0 to 1 at t=0.5
        const y = startY + (goalLineY - startY) * t - peakHeight * peakFactor;
        points.push({ x, y, time: t * flightDuration });
      }
    }

    trajectoryPointsRef.current = points;
  };

  const startNextRound = () => {
    if (round > 10) {
      setGameState('finished');
      playSound('complete');
      return;
    }

    const mode: PathMode = Math.random() > 0.5 ? 'Schuss' : 'Flanke';
    setPathMode(mode);
    setIsBallInvisible(false);
    isBallInvisibleRef.current = false;
    userTapRef.current = null;
    setUserTap(null);

    calculateTrajectory(350, 460, mode);

    setGameState('playing');
    flightStartTimeRef.current = Date.now();
    playSound('shot');
  };

  const startGame = () => {
    setRound(1);
    setSpatialErrors([]);
    setTemporalErrors([]);
    setGameState('countdown');
    countdownRef.current = 3;
    setCountdownDisplay(3);
    playSound('countdown');
  };

  // Countdown timer effect
  useEffect(() => {
    if (gameState !== 'countdown') return;

    const timer = setInterval(() => {
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        clearInterval(timer);
        startNextRound();
      } else {
        setCountdownDisplay(countdownRef.current);
        playSound('countdown');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Main animation / physics loop
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let playedInvisibleSound = false;

    const render = () => {
      const now = Date.now();
      const elapsed = now - flightStartTimeRef.current;

      // Draw background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const goalLineY = canvas.height - 40;

      // Draw Goal / Interception Zone at the bottom
      ctx.save();
      // Premium futuristic glow for goal line
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ec4899'; // pink
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, goalLineY);
      ctx.lineTo(canvas.width - 10, goalLineY);
      ctx.stroke();

      // Draw goal net visual
      ctx.strokeStyle = '#ec489922';
      ctx.lineWidth = 1;
      for (let x = 15; x < canvas.width - 10; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, goalLineY);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      ctx.restore();

      // Text indicating goal zone
      ctx.fillStyle = '#ec4899aa';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GOAL / TOR-LINIE', canvas.width / 2, goalLineY + 25);

      // Find ball position at this exact elapsed time
      const trajectory = trajectoryPointsRef.current;
      let ballX = 0;
      let ballY = 0;

      if (trajectory.length > 0) {
        // Interpolate points
        let currentPt = trajectory[0];
        let nextPt = trajectory[trajectory.length - 1];

        for (let i = 0; i < trajectory.length - 1; i++) {
          if (trajectory[i].time <= elapsed && trajectory[i+1].time >= elapsed) {
            currentPt = trajectory[i];
            nextPt = trajectory[i+1];
            break;
          }
        }

        const tDiff = nextPt.time - currentPt.time;
        const ratio = tDiff > 0 ? (elapsed - currentPt.time) / tDiff : 0;
        ballX = currentPt.x + (nextPt.x - currentPt.x) * ratio;
        ballY = currentPt.y + (nextPt.y - currentPt.y) * ratio;
      }

      // 50% point tracking
      const halfTime = flightDuration / 2;
      const isCurrentlyInvisible = elapsed >= halfTime;
      
      if (isCurrentlyInvisible !== isBallInvisibleRef.current) {
        isBallInvisibleRef.current = isCurrentlyInvisible;
        setIsBallInvisible(isCurrentlyInvisible);
        if (isCurrentlyInvisible && !playedInvisibleSound) {
          playSound('invisible');
          playedInvisibleSound = true;
        }
      }

      // Draw Ball (if visible)
      if (!isCurrentlyInvisible && elapsed <= flightDuration) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#38bdf8'; // bright cyan
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // If flight duration elapsed and user hasn't clicked yet (Timeout / "Too Late")
      if (elapsed > flightDuration + 800) { // give 800ms leeway before auto-ending
        // Auto feedback for failure (Too late)
        handleEvaluation(null);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState]);

  // Evaluate the player's tap coordinates & timestamp
  const handleEvaluation = (tap: { x: number; y: number; time: number } | null) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const trajectory = trajectoryPointsRef.current;
    if (trajectory.length === 0) return;

    const actualEndPt = trajectory[trajectory.length - 1];
    const actualEndTime = flightDuration;

    if (tap === null) {
      // Too Late / Missed completely
      setUserTap(null);
      setRoundSpatialError(250); // penalty value
      setRoundTemporalError(800);
      setIsTooEarly(false);
      setSpatialErrors(prev => [...prev, 250]);
      setTemporalErrors(prev => [...prev, 800]);
      playSound('wrong');
      setGameState('feedback');
      return;
    }

    setUserTap({ x: tap.x, y: tap.y });

    // Temporal calculation: how close to flightDuration (2200ms)
    const timeDelta = Math.round(tap.time - actualEndTime); // positive = too late, negative = too early
    const absoluteTimeError = Math.abs(timeDelta);

    // Spatial calculation: distance along the goal line (only x coordinate matters on the horizontal line)
    const distanceError = Math.round(Math.abs(tap.x - actualEndPt.x));

    setRoundSpatialError(distanceError);
    setRoundTemporalError(absoluteTimeError);
    setIsTooEarly(timeDelta < 0);

    setSpatialErrors(prev => [...prev, distanceError]);
    setTemporalErrors(prev => [...prev, absoluteTimeError]);

    if (absoluteTimeError <= 200 && distanceError <= 35) {
      playSound('correct');
    } else {
      playSound('wrong');
    }

    setGameState('feedback');
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Record tap details
    const elapsed = Date.now() - flightStartTimeRef.current;
    handleEvaluation({ x: clickX, y: clickY, time: elapsed });
  };

  // Render static feedback (with trajectory revealed)
  useEffect(() => {
    if (gameState !== 'feedback' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const trajectory = trajectoryPointsRef.current;
    if (trajectory.length === 0) return;

    // Draw background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const goalLineY = canvas.height - 40;

    // Draw Goal / Interception Zone at the bottom
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ec4899'; // pink
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, goalLineY);
    ctx.lineTo(canvas.width - 10, goalLineY);
    ctx.stroke();

    // Draw goal net visual
    ctx.strokeStyle = '#ec489922';
    ctx.lineWidth = 1;
    for (let x = 15; x < canvas.width - 10; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, goalLineY);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.restore();

    // Text indicating goal zone
    ctx.fillStyle = '#ec4899aa';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL / TOR-LINIE', canvas.width / 2, goalLineY + 25);

    // Draw the actual flight path (full reveal)
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#38bdf888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    for (let i = 1; i < trajectory.length; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // Draw the final position of the ball
    const endPt = trajectory[trajectory.length - 1];
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#22c55e'; // green glow
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw landing point coordinate text
    ctx.fillStyle = '#22c55e';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('REALER EINTRITT', endPt.x, endPt.y - 25);

    // Draw the user's tap point if they reacted
    if (userTap) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444'; // red glow
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      
      // Draw crosshair/X
      const size = 8;
      ctx.beginPath();
      ctx.moveTo(userTap.x - size, userTap.y - size);
      ctx.lineTo(userTap.x + size, userTap.y + size);
      ctx.moveTo(userTap.x + size, userTap.y - size);
      ctx.lineTo(userTap.x - size, userTap.y + size);
      ctx.stroke();

      // Draw outer circle
      ctx.beginPath();
      ctx.arc(userTap.x, userTap.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Text label for tap
      ctx.fillStyle = '#ef4444';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEIN TIPP', userTap.x, userTap.y + 20);
    }
  }, [gameState, userTap]);

  const avgSpatial = spatialErrors.length > 0 
    ? spatialErrors.reduce((a, b) => a + b, 0) / spatialErrors.length 
    : 0;

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
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Flights</h1>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3 self-end md:self-auto">
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
          {/* Main Info Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 md:col-span-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Eye className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                Timing &amp; Flugbahn-Antizipation
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                Schult deine Fähigkeit für Timing und Entscheidungen mit fehlenden Informationen. Als Torhüter musst du oft Flanken oder Bälle abfangen, die sich durch Spieler oder Flutlichtstrahler kurzzeitig deiner Sicht entziehen. 
              </p>
              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                Dieses kognitive Training schult das <strong>mentale Extrapolieren von Flugbahnen</strong>. Nach 50% der Strecke wird der fliegende Ball komplett unsichtbar. Du musst berechnen, wo und wann er die Torlinie kreuzt.
              </p>
            </div>

            {/* FEATURES */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                <span className="block text-[10px] font-mono text-pink-400 uppercase tracking-wider font-bold">⚽ Flugmodi</span>
                <span className="block text-xs text-slate-300 font-sans">Abwechselnd lineare Schüsse &amp; parabolische Flanken</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                <span className="block text-[10px] font-mono text-pink-400 uppercase tracking-wider font-bold">🙈 Unsichtbar</span>
                <span className="block text-xs text-slate-300 font-sans">Genau ab der Hälfte des Weges wird der Ball unsichtbar</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                onClick={startGame}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-pink-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Training Starten</span>
              </button>
            </div>
          </div>

          {/* Tutorial rules card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 md:col-span-2">
            <div className="flex items-center gap-2 text-pink-400 font-bold">
              <Info className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider">Flug-Analyse</span>
            </div>

            <div className="space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">1</span>
                <div className="space-y-1">
                  <strong>Flugbahn scannen:</strong>
                  <p className="text-slate-400">
                    Beobachte den Ball im ersten Moment genau, um Richtung, Geschwindigkeit und Bogen (Schuss vs. Flanke) zu erfassen.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">2</span>
                <div className="space-y-1">
                  <strong>Der Blindflug:</strong>
                  <p className="text-slate-400">
                    Ab 50% der Strecke wird der Ball unsichtbar. Er bewegt sich jedoch physikalisch exakt auf der gleichen Flugbahn weiter!
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">3</span>
                <div className="space-y-1">
                  <strong>Interception:</strong>
                  <p className="text-slate-400">
                    Tippe auf den genauen Punkt auf der pinken Tor-Linie in dem exakten Moment, in dem du glaubst, dass der unsichtbare Ball die Torlinie kreuzt!
                  </p>
                </div>
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
            10 Bälle werden vorbereitet... Fokus auf die Torlinie!
          </p>
        </div>
      )}

      {/* 3. SIMULATION / PLAYING VIEW */}
      {gameState === 'playing' && (
        <div className="space-y-4">
          {/* Live HUD dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Target className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">BALL</span>
                <span className="block text-sm font-black text-white font-mono">{round} / 10</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Timer className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">TYP</span>
                <span className="block text-sm font-black text-white font-mono uppercase">{pathMode}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3 col-span-2 md:col-span-2">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isBallInvisible ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                    {isBallInvisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">STATUS</span>
                    <span className="block text-xs font-black text-slate-200 font-mono">
                      {isBallInvisible ? 'BALL UNSICHTBAR' : 'BALL SICHTBAR'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[10px] font-mono font-bold bg-pink-500/10 text-pink-400 px-2.5 py-1 rounded-md border border-pink-500/20 uppercase tracking-wider animate-pulse">
                    Muster folgen!
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas container */}
          <div className="relative max-w-sm mx-auto aspect-[3/4] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* STROBOSCOPIC BLACKOUT OVERLAY */}
            {strobeActive && (
              <div className="absolute inset-0 bg-black z-50 pointer-events-none transition-opacity duration-75" />
            )}
            <canvas
              ref={canvasRef}
              width={350}
              height={460}
              onClick={handleCanvasClick}
              className="w-full h-full block cursor-pointer"
            />
          </div>

          <p className="text-center text-[10px] font-mono text-slate-500 tracking-wide uppercase">
            Tippe auf den genauen Punkt auf der Torlinie im exakten Moment des Ballkontaktes!
          </p>
        </div>
      )}

      {/* ROUND FEEDBACK OVERLAY */}
      {gameState === 'feedback' && (
        <div className="space-y-4">
          <div className="max-w-sm mx-auto bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-[3px]">
            {/* Visual preview Canvas */}
            <div className="relative aspect-[3/4]">
              <canvas
                ref={canvasRef}
                width={350}
                height={460}
                className="w-full h-full block rounded-2xl"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl max-w-sm mx-auto text-center space-y-4">
            <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
              Auswertung Ball {round}
            </h3>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="block text-[8px] font-mono text-slate-500 uppercase">ABWEICHUNG (RAUM)</span>
                <span className="block text-sm font-black font-mono text-white">
                  {roundSpatialError === 250 ? 'Nicht reagiert' : `${roundSpatialError} Pixel`}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="block text-[8px] font-mono text-slate-500 uppercase">TIMING-ABWEICHUNG</span>
                <span className={`block text-sm font-black font-mono ${roundTemporalError > 300 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {roundTemporalError === 800 ? 'Keine Reaktion' : `${roundTemporalError} ms`}
                </span>
                {roundTemporalError !== 800 && (
                  <span className="block text-[9px] text-slate-400 font-sans">
                    {isTooEarly ? 'Zu früh! ⏱️' : 'Zu spät! ⏱️'}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setRound(prev => prev + 1);
                startNextRound();
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {round < 10 ? 'Nächster Ball' : 'Zur Gesamtauswertung'}
            </button>
          </div>
        </div>
      )}

      {/* 4. FINISHED / EVALUATION PHASE */}
      {gameState === 'finished' && (
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 text-center max-w-md mx-auto">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shadow-xl shadow-pink-500/10">
              <Trophy className="w-10 h-10" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">
              Flights - Gesamtauswertung
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Kognitives Training erfolgreich beendet! Hier sind deine durchschnittlichen Werte aus den absolvierten Versuchen.
            </p>
          </div>

          {/* DETAILED STATS ROW */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl text-center">
              <span className="block text-[8px] font-mono text-slate-500 uppercase">Ø TIMING-FEHLER</span>
              <span className="block text-lg font-black text-pink-400 font-mono">{avgTemporal.toFixed(0)} ms</span>
            </div>
            <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl text-center">
              <span className="block text-[8px] font-mono text-slate-500 uppercase">Ø ABWEICHUNG</span>
              <span className="block text-lg font-black text-white font-mono">{avgSpatial.toFixed(0)} px</span>
            </div>
          </div>

          {/* REPLAY / CLOSE CONTROLS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {challengeMode ? (
              <button
                onClick={() => challengeMode.onComplete(avgTemporal, {
                  avgTemporal,
                  avgSpatial
                })}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer animate-pulse"
              >
                <Trophy className="w-4 h-4" />
                <span>Wettkampf-Ergebnis einreichen</span>
              </button>
            ) : (
              <>
                <button
                  onClick={startGame}
                  className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Erneut versuchen</span>
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
