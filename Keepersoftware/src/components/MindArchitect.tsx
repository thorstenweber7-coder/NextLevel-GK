import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Brain, Trophy, Volume2, VolumeX, 
  RotateCcw, CheckCircle2, XCircle, Award, Sparkles, Info, Target, Timer, AlertTriangle
} from 'lucide-react';
import { UserProfile } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface MindArchitectProps {
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

type GameState = 'idle' | 'countdown' | 'playing' | 'finished';
type ThemeType = 'landolt' | 'clock';

interface GridItem {
  r: number; // row
  c: number; // col
  x: number; // canvas x
  y: number; // canvas y
  isTarget: boolean;
  angle: number; // For Landolt rings or hands
  theme: ThemeType;
}

export default function MindArchitect({ userProfile, onBack, onUpdatePoints, onTrainingComplete, challengeMode }: MindArchitectProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [strobeActive, setStrobeActive] = useState<boolean>(false);

  // Strobe effect during playing
  useEffect(() => {
    if (gameState !== 'playing') {
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
  
  // Game session stats
  const [score, setScore] = useState<number>(0);
  const [errors, setErrors] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60); // 60 seconds training session
  const [correctReactionTimes, setCorrectReactionTimes] = useState<number[]>([]);

  // Dynamic screen flash state
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);

  // Active items
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('landolt');

  // Timer Ref & Audio Context Ref
  const timerIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const lastTargetTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const countdownRef = useRef<number>(3);
  const [countdownDisplay, setCountdownDisplay] = useState<number>(3);

  useEffect(() => {
    if (gameState === 'finished' && !challengeMode && onTrainingComplete) {
      onTrainingComplete(score);
    }
  }, [gameState, challengeMode, onTrainingComplete, score]);

  // Sound synthesis
  const playSound = (type: 'correct' | 'wrong' | 'countdown' | 'complete' | 'click' | 'tick') => {
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
        oscillator.frequency.setValueAtTime(650, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1300, audioCtx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.14);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.14);
      } else if (type === 'wrong') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(140, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'countdown') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(450, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'tick') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.04);
      } else if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(550, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.04);
      } else if (type === 'complete') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
        oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.36); // C6
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Sound synthesis error:', e);
    }
  };

  // Generate layout of distractors and exactly ONE target
  const generateLayout = () => {
    // We place elements on a 7x7 Grid (49 spots) with slight random offsets to avoid perfect uniformity,
    // which simulates organic visual noise!
    const rows = 7;
    const cols = 7;
    const items: GridItem[] = [];

    // Choose Theme randomly per screen to keep engagement high
    const theme: ThemeType = Math.random() > 0.5 ? 'landolt' : 'clock';
    setCurrentTheme(theme);

    // Pick target indices randomly
    const targetRow = Math.floor(Math.random() * rows);
    const targetCol = Math.floor(Math.random() * cols);

    const cellWidth = 450 / cols;
    const cellHeight = 450 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isTarget = r === targetRow && c === targetCol;
        
        // Base center of the cell
        const baseX = (c + 0.5) * cellWidth;
        const baseY = (r + 0.5) * cellHeight;

        // Add small jitter to make scanning more realistic
        const jitterX = (Math.random() - 0.5) * (cellWidth * 0.18);
        const jitterY = (Math.random() - 0.5) * (cellHeight * 0.18);

        let angle = 0;
        if (theme === 'landolt') {
          // Distractor Landolt: Opening facing TOP (270 degrees or 1.5 * Math.PI)
          // Target Landolt: Opening facing LEFT (180 degrees), RIGHT (0 degrees), or BOTTOM (90 degrees)
          if (isTarget) {
            const targetAngles = [0, Math.PI * 0.5, Math.PI]; // RIGHT, BOTTOM, LEFT
            angle = targetAngles[Math.floor(Math.random() * targetAngles.length)];
          } else {
            angle = Math.PI * 1.5; // TOP
          }
        } else {
          // Clock Theme:
          // Distractor: Exactly 12:00 (Hour hand vertical, Minute hand vertical - angle 0)
          // Target: Clock showing 12:05 or 11:55 (Minute hand tilted slightly by 30 degrees)
          if (isTarget) {
            angle = Math.random() > 0.5 ? Math.PI / 6 : -Math.PI / 6; // 5 mins past or 5 mins before
          } else {
            angle = 0; // 12:00 exact
          }
        }

        items.push({
          r,
          c,
          x: baseX + jitterX,
          y: baseY + jitterY,
          isTarget,
          angle,
          theme
        });
      }
    }

    setGridItems(items);
    lastTargetTimeRef.current = Date.now();
  };

  // Start the 60 seconds game
  const startGame = () => {
    setScore(0);
    setErrors(0);
    setTimeLeft(60);
    setCorrectReactionTimes([]);
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
        setGameState('playing');
        generateLayout();
        startTimeRef.current = Date.now();
      } else {
        setCountdownDisplay(countdownRef.current);
        playSound('countdown');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Main 60-second stopwatch
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      setTimeLeft(remaining);

      // Low time warning ticking sound in last 5 seconds
      if (remaining <= 5.1 && remaining > 0) {
        const ceilSec = Math.ceil(remaining);
        // We trigger tick on every whole second transition
        if (Math.abs((remaining % 1) - 0.5) < 0.03) {
          // Play a warning click
          playSound('tick');
        }
      }

      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        setGameState('finished');
        playSound('complete');
      }
    }, 50);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState]);

  // Draw Grid Canvas
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current || gridItems.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark high contrast premium background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const radius = 15; // fixed compact shape size for high density

    gridItems.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);

      // Distractor color: cool premium slate blue. Target color: exact same to prevent cheap color hints,
      // forcing deep perceptual scanning of detail! This is an elite cognitive task.
      const color = '#38bdf8'; // Neon light blue
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = color;

      if (item.theme === 'landolt') {
        // Rotate context based on opening direction
        ctx.rotate(item.angle);
        
        // Draw Landolt ring (C-shaped circle)
        ctx.beginPath();
        // Leaving 60 degree gap (0.17 * PI to 1.83 * PI)
        ctx.arc(0, 0, radius, 0.17 * Math.PI, 1.83 * Math.PI);
        ctx.stroke();
      } else {
        // Draw clock face outline
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Clock center tick
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, 2 * Math.PI);
        ctx.fill();

        // Hour Hand: always pointing exactly straight up (12:00)
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -radius * 0.55);
        ctx.stroke();

        // Minute Hand: distractor at 12 (vertical, straight up), target tilted by +/- 30 degrees (12:05 or 11:55)
        ctx.lineWidth = 2;
        ctx.rotate(item.angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -radius * 0.85);
        ctx.stroke();
      }

      ctx.restore();
    });
  }, [gameState, gridItems]);

  // Click & Tap processing
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || gridItems.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Relative mouse coordinate in 450x450 scale
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Find the closest item
    let closestItem: GridItem | null = null;
    let minDistance = 999999;

    gridItems.forEach(item => {
      const dist = Math.sqrt((item.x - clickX) ** 2 + (item.y - clickY) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestItem = item;
      }
    });

    // Check if the click is reasonably close to the closest item to avoid random clicking
    if (closestItem && minDistance < 35) {
      const item = closestItem as GridItem;
      if (item.isTarget) {
        // Correct Filtered Target!
        const reactionTime = (Date.now() - lastTargetTimeRef.current) / 1000;
        setCorrectReactionTimes(prev => [...prev, reactionTime]);

        playSound('correct');
        setFlash('correct');
        setTimeout(() => setFlash(null), 150);
        setScore(prev => prev + 1);

        // Generate next complex layout
        generateLayout();
      } else {
        // Miss / Distractor Clicked
        playSound('wrong');
        setFlash('wrong');
        setTimeout(() => setFlash(null), 150);
        setErrors(prev => prev + 1);
      }
    }
  };

  const avgSpeed = correctReactionTimes.length > 0
    ? (correctReactionTimes.reduce((a, b) => a + b, 0) / correctReactionTimes.length).toFixed(2)
    : '0.00';

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
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Mind Architect</h1>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span>Belohnung ab: 10 Treffer, max. 5 Fehler</span>
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
          {/* Main Info Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 md:col-span-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Brain className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                Visuelle Selektion &amp; Detail-Filterung
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                In einem vollbesetzten Strafraum muss ein erstklassiger Torhüter die entscheidenden Details (z.B. den Ball oder die Fußstellung des Angreifers) aus einem Meer von visuellen Störfaktoren (Spielern, Schatten, wehenden Trikots) blitzschnell herausfiltern. 
              </p>
              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                <strong>Mind Architect</strong> schult deine visuelle Selektion und deine Fähigkeit, massives Rauschen auszublenden, indem ein dichtes Raster aus fast identischen Symbolen geladen wird. Nur EIN einziges Symbol weicht minimal ab.
              </p>
            </div>

            {/* FEATURES AND FOCUS */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                <span className="block text-[10px] font-mono text-pink-400 uppercase tracking-wider font-bold">⏱️ Zeitfenster</span>
                <span className="block text-xs text-slate-300 font-sans">60 Sekunden Dauerpower-Scanning</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                <span className="block text-[10px] font-mono text-pink-400 uppercase tracking-wider font-bold">🎯 Suchmuster</span>
                <span className="block text-xs text-slate-300 font-sans">Minimal deformierte C-Ringe &amp; Uhren</span>
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
              <span className="text-xs font-mono uppercase tracking-wider">Spielregeln</span>
            </div>

            <div className="space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">1</span>
                <div className="space-y-1">
                  <strong>Störfaktoren filtern:</strong>
                  <p className="text-slate-400">
                    49 dichte Objekte füllen das Suchfeld. Sie weisen winzige Positions-Abweichungen auf und sehen fast exakt gleich aus.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">2</span>
                <div className="space-y-1">
                  <strong>Die minimale Abweichung:</strong>
                  <p className="text-slate-400">
                    Genau EIN Symbol unterscheidet sich minimal. Bei den C-Ringen zeigt die Öffnung in eine andere Himmelsrichtung. Bei den Uhren weicht der Minutenzeiger um wenige Minuten ab!
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">3</span>
                <div className="space-y-1">
                  <strong>Fokus und Präzision:</strong>
                  <p className="text-slate-400">
                    Klicke das abweichende Symbol so schnell wie möglich an. Schließe das Training mit einer möglichst hohen Trefferanzahl und geringen Fehlerrate ab.
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
            Störfaktoren werden geladen... Scan bereitmachen!
          </p>
        </div>
      )}

      {/* 3. SIMULATION / PLAYING VIEW */}
      {gameState === 'playing' && (
        <div className="space-y-4 relative">
          {/* STROBOSCOPIC BLACKOUT OVERLAY */}
          {strobeActive && (
            <div className="absolute inset-0 bg-black z-50 pointer-events-none transition-opacity duration-75 rounded-3xl" />
          )}
          {/* Live HUD dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Target className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">GELÖST</span>
                <span className="block text-sm font-black text-white font-mono">{score}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Timer className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">RESTZEIT</span>
                <span className={`block text-sm font-black font-mono ${timeLeft < 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                  {timeLeft.toFixed(1)}s
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">FEHLER</span>
                <span className="block text-sm font-black text-amber-400 font-mono">{errors}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3 col-span-2 md:col-span-1">
              <div className="w-full text-center md:text-left md:pl-2">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">AKTUELLER STÖRFAKTOR</span>
                <span className="block text-xs font-black text-slate-300 font-mono mt-0.5 uppercase tracking-wider">
                  {currentTheme === 'landolt' ? 'C-Ringe (Öffnung)' : 'Analog-Uhren'}
                </span>
              </div>
            </div>
          </div>

          {/* Time Limit Progress Bar */}
          <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl">
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-[1px]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-75"
                style={{ width: `${(timeLeft / 60) * 100}%` }}
              />
            </div>
          </div>

          {/* Canvas container */}
          <div className="relative max-w-md mx-auto aspect-square bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Flashing layers */}
            {flash === 'correct' && (
              <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none z-10 transition-colors duration-75" />
            )}
            {flash === 'wrong' && (
              <div className="absolute inset-0 bg-rose-500/20 pointer-events-none z-10 transition-colors duration-75" />
            )}

            <canvas
              ref={canvasRef}
              width={450}
              height={450}
              onClick={handleCanvasClick}
              className="w-full h-full block cursor-pointer transition-transform duration-75 active:scale-[0.995]"
            />
          </div>

          <p className="text-center text-[10px] font-mono text-slate-500 tracking-wide uppercase">
            Tippe auf das Symbol, welches sich minimal von allen anderen unterscheidet!
          </p>
        </div>
      )}

      {/* 4. FINISHED / EVALUATION PHASE */}
      {gameState === 'finished' && (
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 text-center max-w-md mx-auto">
          <div className="flex justify-center">
            {score >= 10 ? (
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
              Mind Architect - Auswertung
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              {score >= 10 
                ? `Exzellente Leistung! Du hast das massive visuelle Rauschen erfolgreich gefiltert und ${score} Abweichungen eliminiert.`
                : `Du hast ${score} Abweichungen gelöst bei ${errors} Fehlern. Trainiere weiter, um deine Reaktionszeit und Detailaufmerksamkeit zu steigern.`}
            </p>
          </div>

          {/* DETAILED STATS ROW */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-950 p-3 border border-slate-850 rounded-xl text-center">
              <span className="block text-[8px] font-mono text-slate-500 uppercase">GELÖST</span>
              <span className="block text-base font-black text-white font-mono">{score}</span>
            </div>
            <div className="bg-slate-950 p-3 border border-slate-850 rounded-xl text-center">
              <span className="block text-[8px] font-mono text-slate-500 uppercase">FEHLER</span>
              <span className="block text-base font-black text-amber-400 font-mono">{errors}</span>
            </div>
            <div className="bg-slate-950 p-3 border border-slate-850 rounded-xl text-center">
              <span className="block text-[8px] font-mono text-slate-500 uppercase">Ø TEMPO</span>
              <span className="block text-base font-black text-pink-400 font-mono">{avgSpeed}s</span>
            </div>
          </div>

          <p className="text-[9px] text-slate-500 font-sans leading-relaxed text-left">
            Deine visuelle Verarbeitungsgeschwindigkeit (Ø Tempo) misst die durchschnittliche Reaktionszeit vom Laden des Layouts bis zur Identifikation des Target-Objekts. Je geringer, desto besser gefiltert ist dein Aufmerksamkeitsfokus!
          </p>

          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center space-y-2">
            <p className="text-[10px] text-slate-400 font-sans leading-normal">
              Regelmäßiges Training filtert Störfaktoren aus und optimiert die Detailwahrnehmung bei unübersichtlichen Spielsituationen im Strafraum.
            </p>
          </div>

          {/* REPLAY / CLOSE CONTROLS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {challengeMode ? (
              <button
                onClick={() => challengeMode.onComplete(score, {
                  score,
                  errors,
                  avgSpeed
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
                  <span>Erneut Starten</span>
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
