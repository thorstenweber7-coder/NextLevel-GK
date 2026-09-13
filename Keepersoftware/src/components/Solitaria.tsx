import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Brain, Trophy, Volume2, VolumeX, 
  RotateCcw, CheckCircle2, XCircle, Award, Sparkles, Info, Target, Timer, AlertTriangle
} from 'lucide-react';
import { UserProfile } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface SolitariaProps {
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
type Level = 1 | 2 | 3 | 4;
type ShapeType = 'circle' | 'square' | 'triangle';
type SizeType = 'normal' | 'small';

interface GridObject {
  shape: ShapeType;
  color: string;
  size: SizeType;
  isOdd: boolean;
}

export default function Solitaria({ userProfile, onBack, onUpdatePoints, onTrainingComplete, challengeMode }: SolitariaProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  // Level & Timer States (Fixiert auf Level 4 Legende)
  const [level, setLevel] = useState<Level>(4);
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
  const [puzzleIndex, setPuzzleIndex] = useState<number>(1);
  const [errors, setErrors] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [penaltyTime, setPenaltyTime] = useState<number>(0);
  
  // Individual puzzle timer
  const [puzzleTimeLeft, setPuzzleTimeLeft] = useState<number | null>(null);
  const puzzleGeneratedTimeRef = useRef<number>(0);
  const lastTickSecondRef = useRef<number>(-1);

  // Sync state to refs for interval use
  const puzzleIndexRef = useRef<number>(1);
  useEffect(() => {
    puzzleIndexRef.current = puzzleIndex;
  }, [puzzleIndex]);

  const levelRef = useRef<Level>(1);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  
  // Dynamic screen flash state
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);

  // Active grid details
  const [gridSize, setGridSize] = useState<number>(4); // 4x4 or 5x5
  const [gridObjects, setGridObjects] = useState<GridObject[][]>([]);
  const [oddOnePos, setOddOnePos] = useState<{ row: number; col: number }>({ row: -1, col: -1 });

  // Timer Ref & Audio Context Ref
  const timerIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startTimeRef = useRef<number>(0);

  const countdownRef = useRef<number>(3);
  const [countdownDisplay, setCountdownDisplay] = useState<number>(3);

  // Level dimensions
  const getGridSizeByLevel = (lvl: Level) => {
    switch (lvl) {
      case 1: return 4; // 4x4
      case 2: return 5; // 5x5
      case 3: return 6; // 6x6
      case 4: return 6; // 6x6
    }
  };

  const getLevelLabel = (lvl: Level) => {
    switch (lvl) {
      case 1: return 'Level 1: Einfach (4x4) - Ohne Zeitdruck';
      case 2: return 'Level 2: Mittel (5x5) - Max. 5s';
      case 3: return 'Level 3: Profi (6x6) - Max. 3s';
      case 4: return 'Level 4: Legende (6x6) - Max. 2s';
    }
  };

  const getTimeLimitByLevel = (lvl: Level): number | null => {
    switch (lvl) {
      case 1: return null;
      case 2: return 5;
      case 3: return 3;
      case 4: return 2;
    }
  };

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
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'wrong') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(180, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'countdown') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(550, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.04);
      } else if (type === 'tick') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.015, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
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

  // Generate a random puzzle grid
  const generatePuzzle = (lvl: Level) => {
    const size = getGridSizeByLevel(lvl);
    setGridSize(size);

    // Reset puzzle timer tracking
    puzzleGeneratedTimeRef.current = Date.now();
    lastTickSecondRef.current = -1;
    setPuzzleTimeLeft(getTimeLimitByLevel(lvl));

    const shapes: ShapeType[] = ['circle', 'square', 'triangle'];
    const colors = [
      '#38bdf8', // Neon Blue
      '#a3e635', // Neon Green
      '#eab308', // Yellow
      '#ec4899', // Hot Pink
      '#a855f7'  // Neon Purple
    ];
    const sizes: SizeType[] = ['normal', 'small'];

    // 1. Generate the standard properties
    const standardShape = shapes[Math.floor(Math.random() * shapes.length)];
    const standardColor = colors[Math.floor(Math.random() * colors.length)];
    const standardSize = sizes[Math.floor(Math.random() * sizes.length)];

    // 2. Select standard grid objects
    const grid: GridObject[][] = [];
    for (let r = 0; r < size; r++) {
      const row: GridObject[] = [];
      for (let c = 0; c < size; c++) {
        row.push({
          shape: standardShape,
          color: standardColor,
          size: standardSize,
          isOdd: false
        });
      }
      grid.push(row);
    }

    // 3. Define the odd-one position
    const oddRow = Math.floor(Math.random() * size);
    const oddCol = Math.floor(Math.random() * size);
    setOddOnePos({ row: oddRow, col: oddCol });

    // 4. Select which feature is different for the Odd-One
    const features: ('shape' | 'color' | 'size')[] = ['shape', 'color', 'size'];
    const differingFeature = features[Math.floor(Math.random() * features.length)];

    let oddShape = standardShape;
    let oddColor = standardColor;
    let oddSize = standardSize;

    if (differingFeature === 'shape') {
      const otherShapes = shapes.filter(s => s !== standardShape);
      oddShape = otherShapes[Math.floor(Math.random() * otherShapes.length)];
    } else if (differingFeature === 'color') {
      const otherColors = colors.filter(c => c !== standardColor);
      oddColor = otherColors[Math.floor(Math.random() * otherColors.length)];
    } else if (differingFeature === 'size') {
      oddSize = standardSize === 'normal' ? 'small' : 'normal';
    }

    grid[oddRow][oddCol] = {
      shape: oddShape,
      color: oddColor,
      size: oddSize,
      isOdd: true
    };

    setGridObjects(grid);
  };

  // Timeout handler for when time runs out on an individual puzzle
  const handleTimeout = () => {
    playSound('wrong');
    setFlash('wrong');
    setTimeout(() => setFlash(null), 150);
    setErrors(prev => prev + 1);
    setPenaltyTime(prev => prev + 1.0);

    const nextIndex = puzzleIndexRef.current + 1;
    if (nextIndex <= 20) {
      setPuzzleIndex(nextIndex);
      generatePuzzle(levelRef.current);
    } else {
      setGameState('finished');
      playSound('complete');
      if (!challengeMode && onTrainingComplete) {
        onTrainingComplete(elapsedTime + penaltyTime);
      }
    }
  };

  // Start the game loop
  const startGame = () => {
    setErrors(0);
    setElapsedTime(0);
    setPenaltyTime(0);
    setPuzzleIndex(1);
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
        generatePuzzle(level);
        startTimeRef.current = Date.now();
      } else {
        setCountdownDisplay(countdownRef.current);
        playSound('countdown');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, level]);

  // Main game stopwatch & live time counter
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      // 1. Overall stopwatch
      const ms = Date.now() - startTimeRef.current;
      setElapsedTime(ms / 1000);

      // 2. Individual level time limits
      const limitSec = getTimeLimitByLevel(level);
      if (limitSec !== null) {
        const timePassed = (Date.now() - puzzleGeneratedTimeRef.current) / 1000;
        const left = Math.max(0, limitSec - timePassed);
        setPuzzleTimeLeft(left);

        // Auditive cues / Warning click when running out of time (e.g. last 2 seconds)
        if (left <= 2.1 && left > 0) {
          const currentSecondFloor = Math.ceil(left);
          if (lastTickSecondRef.current !== currentSecondFloor) {
            lastTickSecondRef.current = currentSecondFloor;
            playSound('tick');
          }
        }

        if (left <= 0) {
          // Timeout occurred!
          handleTimeout();
        }
      } else {
        setPuzzleTimeLeft(null);
      }
    }, 50);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState, level]);

  // Render Grid onto Canvas
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current || gridObjects.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with premium dark aesthetic
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid details
    const size = gridSize;
    const cellWidth = canvas.width / size;
    const cellHeight = canvas.height / size;

    // Draw delicate separation lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    for (let i = 1; i < size; i++) {
      // vertical lines
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, canvas.height);
      ctx.stroke();

      // horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(canvas.width, i * cellHeight);
      ctx.stroke();
    }

    // Render each object inside cells
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const item = gridObjects[r][c];
        const cx = (c + 0.5) * cellWidth;
        const cy = (r + 0.5) * cellHeight;

        // Base cell dimension
        const baseRadius = Math.min(cellWidth, cellHeight) * 0.3;
        const radius = item.size === 'normal' ? baseRadius : baseRadius * 0.5;

        ctx.save();
        
        // Premium Glow shadow setup
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.color;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 3.5;
        ctx.fillStyle = item.color + '22'; // 13% opacity fill for rich volumetric feel

        // Draw the specific shape
        if (item.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (item.shape === 'square') {
          ctx.beginPath();
          ctx.rect(cx - radius, cy - radius, radius * 2, radius * 2);
          ctx.fill();
          ctx.stroke();
        } else if (item.shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(cx, cy - radius);
          ctx.lineTo(cx + radius * 1.1, cy + radius * 0.9);
          ctx.lineTo(cx - radius * 1.1, cy + radius * 0.9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      }
    }
  }, [gameState, gridObjects, gridSize]);

  // Click handler for finding the solitaire object
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || gridObjects.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cellWidth = canvas.width / gridSize;
    const cellHeight = canvas.height / gridSize;

    const col = Math.floor(clickX / cellWidth);
    const row = Math.floor(clickY / cellHeight);

    // Safeguard indices bounds
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return;

    if (row === oddOnePos.row && col === oddOnePos.col) {
      // CORRECT
      playSound('correct');
      setFlash('correct');
      setTimeout(() => setFlash(null), 150);

      if (puzzleIndex < 20) {
        setPuzzleIndex(prev => prev + 1);
        generatePuzzle(level);
      } else {
        // Complete training session
        setGameState('finished');
        playSound('complete');
        if (!challengeMode && onTrainingComplete) {
          onTrainingComplete(elapsedTime + penaltyTime);
        }
      }
    } else {
      // WRONG (OddOne missed)
      playSound('wrong');
      setFlash('wrong');
      setTimeout(() => setFlash(null), 150);
      setErrors(prev => prev + 1);
      // Apply 1-second penalty
      setPenaltyTime(prev => prev + 1);
    }
  };

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
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Deviation</h1>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span>Fehler-Limit: Max. 2 Fehler</span>
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
              <Target className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                Mustererkennung &amp; Visuelle Suche
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                Als Torhüter musst du das Spielfeld in Sekundenbruchteilen scannen, Abweichungen im Verhalten der gegnerischen Stürmer bemerken und außergewöhnliche Flugbahnen erfassen. Deviation trainiert deine perzeptuelle Suchgeschwindigkeit und periphere Aufmerksamkeit.
              </p>
              <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-4 text-xs space-y-1.5 text-pink-300 font-sans">
                <span className="font-bold text-white uppercase tracking-wider block text-[10px] font-mono">⚠️ NEUES ZEITDRUCK-SYSTEM:</span>
                <p>
                  Ab Level 2 läuft für jedes Puzzle ein unerbittlicher Countdown! Wenn die Zeit abläuft, wird die Antwort als falsch gewertet und das nächste Puzzle erscheint. Ein tickendes Signal warnt dich kurz vor Ablauf!
                </p>
              </div>
            </div>

            {/* FIXED HARD LEVEL BADGE */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Schwerste Herausforderung (Fixiert)</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                <strong>Level 4 (Legende 6x6 - Max. 2s)</strong> mit <strong>Stroboskop-Effekt</strong>.
              </p>
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
              <span className="text-xs font-mono uppercase tracking-wider">Spielregeln &amp; Levels</span>
            </div>

            <div className="space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">1</span>
                <p>
                  <strong>Finde die Abweichung:</strong> In jeder Runde siehst du ein Raster voller geometrischer Symbole. Genau eines davon unterscheidet sich in <strong>Form</strong>, <strong>Farbe</strong> oder <strong>Größe</strong> von den anderen.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">2</span>
                <div className="space-y-1">
                  <strong>Zeitdruck nach Level:</strong>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li><strong>Level 1:</strong> 4x4 Grid — Unbegrenzte Zeit</li>
                    <li><strong>Level 2:</strong> 5x5 Grid — Max. 5s pro Antwort</li>
                    <li><strong>Level 3:</strong> 6x6 Grid — Max. 3s pro Antwort</li>
                    <li><strong>Level 4:</strong> 6x6 Grid — Max. 2s pro Antwort</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">3</span>
                <p>
                  <strong>Timeout ist ein Fehler:</strong> Läuft die Zeit ab, zählt das als Fehler (+1,0s Strafzeit) und das nächste Muster wird sofort geladen. Bleib also hochkonzentriert!
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
            20 Puzzles starten... Augen schärfen!
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
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">PUZZLE</span>
                <span className="block text-sm font-black text-white font-mono">{puzzleIndex} / 20</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Timer className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">Echtzeit</span>
                <span className="block text-sm font-black text-white font-mono">{elapsedTime.toFixed(1)}s</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">Strafzeit (+1,0s)</span>
                <span className="block text-sm font-black text-white font-mono text-amber-400">+{penaltyTime.toFixed(1)}s</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3 col-span-2 md:col-span-1">
              <div className="w-full text-center md:text-left md:pl-2">
                <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">MODUS</span>
                <span className="block text-xs font-black text-slate-300 font-mono mt-0.5 truncate">{getLevelLabel(level)}</span>
              </div>
            </div>
          </div>

          {/* Individual Puzzle Timer Progress Bar */}
          {puzzleTimeLeft !== null && (
            <div className="bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5 uppercase tracking-wider font-bold">
                  <span className={`w-2 h-2 rounded-full ${puzzleTimeLeft < 1.5 ? 'bg-rose-500 animate-ping' : 'bg-pink-500'}`} />
                  Zeit für diese Antwort:
                </span>
                <span className={`font-black text-sm ${puzzleTimeLeft < 1.5 ? 'text-rose-400 animate-pulse' : 'text-pink-400'}`}>
                  {puzzleTimeLeft.toFixed(2)}s
                </span>
              </div>
              
              {/* Outer bar */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-850 p-[2px]">
                {/* Inner filling */}
                <div 
                  className={`h-full rounded-full transition-all duration-75 ${
                    puzzleTimeLeft < 1.0 
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse' 
                      : puzzleTimeLeft < 2.0 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${(puzzleTimeLeft / (getTimeLimitByLevel(level) || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Canvas grid container */}
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
            Tippe so schnell wie möglich auf das abweichende Symbol!
          </p>
        </div>
      )}

      {/* 4. FINISHED / EVALUATION PHASE */}
      {gameState === 'finished' && (
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 text-center max-w-md mx-auto">
          <div className="flex justify-center">
            {errors <= 2 ? (
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
              {errors <= 2 ? 'Perfekte visuelle Suche!' : 'Bleib am Ball!'}
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              {errors <= 2 
                ? `Exzellente Leistung! Du hast die 20 Puzzles mit nur ${errors} Fehlern gelöst. Deine Kognitionszeit ist absolut erstklassig.`
                : `Du hast die 20 Puzzles mit ${errors} Fehlern gelöst. Trainiere weiter, um deine Erkennungsgeschwindigkeit und visuelle Selektion zu steigern.`}
            </p>
          </div>

          {/* DETAILED STATS ROW */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl text-center">
              <span className="block text-[8px] font-mono text-slate-500 uppercase">Reine Suchzeit</span>
              <span className="block text-lg font-black text-white font-mono">{elapsedTime.toFixed(1)}s</span>
            </div>
            <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl text-center">
              <span className="block text-[8px] font-mono text-slate-500 uppercase">Fehler (Strafzeit)</span>
              <span className="block text-lg font-black text-amber-400 font-mono">{errors} (+{penaltyTime.toFixed(1)}s)</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">GESAMTZEIT:</span>
              <span className="font-black text-pink-400">
                {(elapsedTime + penaltyTime).toFixed(1)} Sekunden
              </span>
            </div>
            <p className="text-[9px] text-slate-500 font-sans text-left leading-relaxed mt-1">
              Deine Gesamtzeit setzt sich aus der reinen kognitiven Erkennungszeit plus 1,0s Strafe pro falschem Klick oder Zeitüberschreitung zusammen.
            </p>
          </div>

          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center space-y-2">
            <p className="text-[10px] text-slate-400 font-sans leading-normal">
              Regelmäßiges Kognitionstraining optimiert deine Antizipationsfähigkeit im Tor. Mach direkt noch einen Durchgang!
            </p>
          </div>

          {/* REPLAY / CLOSE CONTROLS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {challengeMode ? (
              <button
                onClick={() => {
                  const finalTotalTime = elapsedTime + penaltyTime;
                  // In Solitaria, lower time is better, but since standard points are positive,
                  // let's pass finalTotalTime in the stats. For the "score", we want to pass something that represents performance.
                  // We can pass errors or we can pass a negative/positive score.
                  // In Competitions.tsx, the win criteria for "Deviation" (Solitaria) is:
                  // "Gewinnkriterium: Es gewinnt derjenige mit der geringeren Gesamtzeit."
                  // So we will pass the total time (elapsedTime + penaltyTime) as the primary score!
                  challengeMode.onComplete(finalTotalTime, {
                    elapsedTime,
                    penaltyTime,
                    errors,
                    finalTotalTime,
                    level
                  });
                }}
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
                  <span>Nächster Durchgang</span>
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
