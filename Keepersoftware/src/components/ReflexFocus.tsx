import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Timer, Brain, Trophy, Target, Zap, 
  RotateCcw, CheckCircle2, AlertCircle, Volume2, VolumeX, Sparkles,
  Sliders, PlayCircle, StopCircle, RefreshCw, ChevronRight, HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface ReflexFocusProps {
  userProfile: UserProfile;
  onBack: () => void;
  onTrainingComplete?: () => void;
  onResetPlayCount?: () => void;
  playCount?: number;
}

type ExerciseState = 'idle' | 'countdown' | 'running' | 'finished';
type FixationSymbol = 'X' | 'O' | 'H' | '┼';
type Direction = 'waagerecht' | 'senkrecht' | 'diagonal_1' | 'diagonal_2';

const DIRECTIONS: { id: Direction; label: string; arrow: string; description: string }[] = [
  { id: 'waagerecht', label: 'Waagerecht', arrow: '← Waagerecht →', description: 'Kopf horizontal nach links und rechts drehen.' },
  { id: 'senkrecht', label: 'Senkrecht', arrow: '↑ Senkrecht ↓', description: 'Kopf vertikal nach oben und unten neigen.' },
  { id: 'diagonal_1', label: 'Diagonal (Links oben nach rechts unten)', arrow: '↖ Diagonal ↘', description: 'Kopf von links oben nach rechts unten bewegen.' },
  { id: 'diagonal_2', label: 'Diagonal (Links unten nach rechts oben)', arrow: '↙ Diagonal ↗', description: 'Kopf von links unten nach rechts oben bewegen.' },
];

export default function ReflexFocus({ 
  userProfile, 
  onBack, 
  onTrainingComplete, 
  onResetPlayCount,
  playCount = 0 
}: ReflexFocusProps) {
  const [exerciseState, setExerciseState] = useState<ExerciseState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [duration] = useState<number>(90); // seconds (fixed to 90)
  const [timeLeft, setTimeLeft] = useState<number>(90);
  
  // Track local completed count to prevent asynchronous double-increment UI flicker and lock the starting value
  const [localCompletedCount, setLocalCompletedCount] = useState<number>(playCount);
  const hasCompletedSessionRef = useRef<boolean>(false);

  // Sync localCompletedCount to prop playCount when the user is idle, so they see the fresh database value
  useEffect(() => {
    if (exerciseState === 'idle') {
      setLocalCompletedCount(playCount);
    }
  }, [playCount, exerciseState]);
  
  // Metronome / BPM settings
  const [bpm, setBpm] = useState<number>(60);
  const [autoSpeedup] = useState<boolean>(true); // locked to true
  const [speedupInterval] = useState<number>(15); // seconds
  const [speedupAmount] = useState<number>(5); // BPM to add
  
  // Audio settings
  const [metronomeSound] = useState<boolean>(true); // locked to true
  const [speechCommands] = useState<boolean>(true); // locked to true
  
  // Target settings
  const [targetSymbol] = useState<FixationSymbol>('X'); // locked to X
  const [targetColor] = useState<string>('text-pink-500');

  // Runtime State
  const [currentDirection, setCurrentDirection] = useState<Direction>('waagerecht');
  const [nextDirection, setNextDirection] = useState<Direction>('senkrecht');
  const [beatsCount, setBeatsCount] = useState<number>(0);
  const [avgBpmReached, setAvgBpmReached] = useState<number>(60);
  const [isBpmPulse, setIsBpmPulse] = useState<boolean>(false);

  // Audio Context Ref for low latency synthesizer ticking
  const audioCtxRef = useRef<AudioContext | null>(null);
  const exerciseTimerRef = useRef<any>(null);
  const metronomeIntervalRef = useRef<any>(null);
  
  // Keep refs up-to-date for timers
  const bpmRef = useRef(bpm);
  const currentDirectionRef = useRef(currentDirection);
  const nextDirectionRef = useRef(nextDirection);
  const metronomeSoundRef = useRef(metronomeSound);
  const speechCommandsRef = useRef(speechCommands);
  const timeLeftRef = useRef(timeLeft);
  const autoSpeedupRef = useRef(autoSpeedup);
  const speedupIntervalRef = useRef(speedupInterval);
  const speedupAmountRef = useRef(speedupAmount);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    currentDirectionRef.current = currentDirection;
  }, [currentDirection]);

  useEffect(() => {
    nextDirectionRef.current = nextDirection;
  }, [nextDirection]);

  useEffect(() => {
    metronomeSoundRef.current = metronomeSound;
  }, [metronomeSound]);

  useEffect(() => {
    speechCommandsRef.current = speechCommands;
  }, [speechCommands]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    autoSpeedupRef.current = autoSpeedup;
  }, [autoSpeedup]);

  useEffect(() => {
    speedupIntervalRef.current = speedupInterval;
  }, [speedupInterval]);

  useEffect(() => {
    speedupAmountRef.current = speedupAmount;
  }, [speedupAmount]);

  // Clean up timers and speech on unmount
  useEffect(() => {
    return () => {
      clearInterval(exerciseTimerRef.current);
      clearInterval(metronomeIntervalRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Synthesize a high-quality metronome click/tick sound
  const playTickSound = (isFirstBeatInBar: boolean = false) => {
    if (!metronomeSoundRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pitch: high crisp click, accent on first beat of bars/direction changes
      const freq = isFirstBeatInBar ? 1200 : 800;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      // Decay envelope
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (err) {
      console.warn('Audio Context is blocked or not supported yet.', err);
    }
  };

  // Synthesize a completion sound
  const playCompletionSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      
      // Play a happy major arpeggio
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, now + start);
        gainNode.gain.setValueAtTime(0.1, now + start);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        osc.start(now + start);
        osc.stop(now + start + duration);
      };

      playTone(523.25, 0, 0.3);     // C5
      playTone(659.25, 0.15, 0.3);  // E5
      playTone(783.99, 0.3, 0.3);   // G5
      playTone(1046.50, 0.45, 0.5); // C6
    } catch (err) {
      console.warn('Completion sound failed', err);
    }
  };

  // Speaks command text aloud using Web Speech API
  const speakCommand = (text: string) => {
    if (!speechCommandsRef.current) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 1.3; // Speed up slightly to be snappier
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('Speech synthesis failed', err);
    }
  };

  // Initialize the Metronome interval (called on startup or tempo change)
  const restartMetronome = (targetBpm: number) => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
    }

    const intervalMs = 60000 / targetBpm;
    let localBeatsCount = 0;

    metronomeIntervalRef.current = setInterval(() => {
      // Trigger Pulse animation
      setIsBpmPulse(true);
      setTimeout(() => setIsBpmPulse(false), 80);

      // Metronome Click
      const isNewDirectionBeat = localBeatsCount % 8 === 0;
      playTickSound(isNewDirectionBeat);
      
      localBeatsCount++;
      setBeatsCount(b => b + 1);
    }, intervalMs);
  };

  // Starts the countdown
  const startCountdown = () => {
    // 1. Unblock Web Audio API in direct user event thread
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Play a tiny silent tone to unlock immediately
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (err) {
      console.warn('Audio Context unblock failed:', err);
    }

    // 2. Unblock Web Speech API speechSynthesis in direct user event thread
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('Start');
        utterance.lang = 'de-DE';
        utterance.volume = 0.0001; // Silent
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('Speech synthesis unblock failed:', err);
    }

    setLocalCompletedCount(playCount); // Lock the starting count
    hasCompletedSessionRef.current = false; // Reset the session completion guard
    setExerciseState('countdown');
    setCountdown(3);
    const cdInterval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(cdInterval);
          startExercise();
          return 0;
        }
        // Tick sound for countdown
        playTickSound(true);
        return c - 1;
      });
    }, 1000);
  };

  // Starts the main exercise
  const startExercise = () => {
    setExerciseState('running');
    setTimeLeft(duration);
    setBeatsCount(0);
    
    // Choose random starting and next directions
    const initialDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)].id;
    let nextDirCandidates = DIRECTIONS.filter(d => d.id !== initialDir);
    const secondDir = nextDirCandidates[Math.floor(Math.random() * nextDirCandidates.length)].id;
    
    setCurrentDirection(initialDir);
    setNextDirection(secondDir);

    // Initial voice instruction
    const currentLabel = DIRECTIONS.find(d => d.id === initialDir)?.label || '';
    speakCommand(currentLabel);

    // Launch metronome
    restartMetronome(bpm);

    // Directions change every 8 seconds (or beats relative to current pace)
    let secondsElapsedInCurrentDirection = 0;
    let totalSecondsElapsed = 0;

    exerciseTimerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          stopAndFinishExercise();
          return 0;
        }

        totalSecondsElapsed++;
        secondsElapsedInCurrentDirection++;

        // Automatic speedup calculation
        if (autoSpeedupRef.current) {
          if (totalSecondsElapsed % speedupIntervalRef.current === 0) {
            setBpm(oldBpm => {
              const newBpm = Math.min(oldBpm + speedupAmountRef.current, 180);
              // Restart metronome with new BPM
              restartMetronome(newBpm);
              return newBpm;
            });
          }
        }

        // Change movement direction every 10 seconds
        if (secondsElapsedInCurrentDirection >= 10) {
          secondsElapsedInCurrentDirection = 0;
          
          // Current becomes next
          const newCurrent = nextDirectionRef.current;
          setCurrentDirection(newCurrent);

          // Speak next direction
          const nextLabel = DIRECTIONS.find(d => d.id === newCurrent)?.label || '';
          speakCommand(nextLabel);

          // Pick a brand new next direction
          const pool = DIRECTIONS.filter(d => d.id !== newCurrent);
          const newNext = pool[Math.floor(Math.random() * pool.length)].id;
          setNextDirection(newNext);
        }

        return prevTime - 1;
      });
    }, 1000);
  };

  const stopAndFinishExercise = () => {
    if (hasCompletedSessionRef.current) return;
    hasCompletedSessionRef.current = true;

    clearInterval(exerciseTimerRef.current);
    clearInterval(metronomeIntervalRef.current);
    playCompletionSound();
    
    // Calculate final stats
    setAvgBpmReached(bpm);
    setExerciseState('finished');

    if (onTrainingComplete) {
      onTrainingComplete();
    }
  };

  const terminateExerciseEarly = () => {
    clearInterval(exerciseTimerRef.current);
    clearInterval(metronomeIntervalRef.current);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setExerciseState('idle');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. IDLE/PRE-START SCREEN */}
      {exerciseState === 'idle' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </button>
            <div className="px-3 py-1 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono text-[10px] uppercase font-black tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3" />
              <span>Neuroathletik (VOR)</span>
            </div>
          </div>

          {/* Intro Banner */}
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-4 max-w-2xl relative">
              <div className="inline-flex p-3 bg-pink-500/10 border border-pink-500/20 rounded-2xl text-pink-400">
                <Target className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-mono tracking-tight">
                Reflex-Focus
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                Der <strong>Vestibulookuläre Reflex (VOR)</strong> sorgt dafür, dass deine Augen das Spielobjekt (den Ball) vollkommen scharf und ruhig auf der Netzhaut behalten, während sich dein Kopf und dein Körper blitzschnell im Tor bewegen. 
              </p>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Mit dieser geführten Neuro-Einheit trainierst du die neuronale Verbindung zwischen Gleichgewichtsorgan (Vestibulärsystem) und deinen Augenmuskeln.
              </p>
            </div>
          </div>

          {/* Quick instructions steps */}
          <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
              <HelpCircle className="w-4 h-4 text-pink-400" />
              <span>So funktioniert die Übung:</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900 flex gap-3 items-start">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Augen starr fixieren</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Fixiere das Symbol in der Mitte des Bildschirms permanent. Blinzle so wenig wie möglich und weiche mit den Augen keinen Millimeter ab!</p>
                </div>
              </div>
              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900 flex gap-3 items-start">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Kopfbewegung nach Ansage</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Drehe oder neige deinen Kopf rhythmisch nach links/rechts (Waagerecht), oben/unten (Senkrecht) oder diagonal, je nachdem, was auf dem Bildschirm steht.</p>
                </div>
              </div>
              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900 flex gap-3 items-start">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono font-bold shrink-0 mt-0.5">3</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Metronom-Synchronisation</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Bewege deinen Kopf exakt im Rhythmus des Metronoms. Jeder Tick signalisiert einen Endpunkt der Bewegung (z.B. ganz links, ganz rechts).</p>
                </div>
              </div>
              <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900 flex gap-3 items-start">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono font-bold shrink-0 mt-0.5">4</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Tempo-Steigerung (VOR-Challenge)</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Wenn aktiviert, erhöht die App schrittweise automatisch das Tempo. Versuche, die Fokussierung auch bei maximalen Geschwindigkeiten zu halten!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preset Configuration Card (Non-editable) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-3">
              <Sliders className="w-4 h-4 text-pink-500" />
              <span>Aktive Trainings-Vorgaben</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl text-center">
                <span className="block text-[9px] text-slate-500 font-mono uppercase font-black">Übungsdauer</span>
                <span className="text-sm font-black text-white font-mono mt-0.5 block">90 Sekunden</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl text-center">
                <span className="block text-[9px] text-slate-500 font-mono uppercase font-black">Fixpunkt</span>
                <span className="text-sm font-black text-pink-400 font-mono mt-0.5 block">X (Zentral)</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl text-center">
                <span className="block text-[9px] text-slate-500 font-mono uppercase font-black">Startfrequenz</span>
                <span className="text-sm font-black text-white font-mono mt-0.5 block">60 BPM</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl text-center">
                <span className="block text-[9px] text-slate-500 font-mono uppercase font-black">Tempo-Challenge</span>
                <span className="text-sm font-black text-pink-400 font-mono mt-0.5 block">Aktiv (+5 BPM / 15s)</span>
              </div>
            </div>

            <div className="p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                <span>Auditive Metronom-Taktgebung & Sprachkommandos</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 text-[10px] font-bold font-mono">AKTIV</span>
            </div>

            {/* Bisherige Durchgänge display only inside the training */}
            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <span className="font-sans font-bold text-white flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Deine bisherigen Erfolge: {localCompletedCount} {localCompletedCount === 1 ? 'Durchgang' : 'Durchgänge'}</span>
              </span>
              {onResetPlayCount && localCompletedCount > 0 && (
                <button
                  onClick={onResetPlayCount}
                  className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
                >
                  Zurücksetzen
                </button>
              )}
            </div>

            {/* Launch Exercise Button */}
            <button
              onClick={startCountdown}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-pink-500/10 cursor-pointer transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Reflex-Focus Starten</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. COUNTDOWN VIEW */}
      {exerciseState === 'countdown' && (
        <div className="aspect-[16/10] w-full bg-slate-950 border border-slate-900 rounded-3xl flex flex-col items-center justify-center space-y-4 shadow-2xl relative overflow-hidden min-h-[350px]">
          <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-pink-500/5 to-transparent pointer-events-none" />
          
          <motion.div
            key={countdown}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="text-8xl font-black font-mono text-pink-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.3)]"
          >
            {countdown}
          </motion.div>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
            Fixiere gleich den Punkt in der Mitte!
          </span>
        </div>
      )}

      {/* 3. ACTIVE RUNNING EXERCISE VIEW */}
      {exerciseState === 'running' && (
        <div className="space-y-4">
          {/* Top Info HUD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="space-y-0.5">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Restzeit</span>
              <span className="text-sm sm:text-base font-black text-white font-mono flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-pink-400" />
                <span>{timeLeft}s</span>
              </span>
            </div>

            <div className="text-center px-4 py-1 bg-slate-950 rounded-lg border border-slate-850/80">
              <span className="text-[10px] sm:text-xs font-bold text-white tracking-tight flex items-center gap-1.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Augen starr auf den Fixpunkt richten!</span>
              </span>
            </div>

            <div className="space-y-0.5 text-right">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Aktuelle Frequenz</span>
              <span className={`text-sm sm:text-base font-black text-pink-400 font-mono transition-transform duration-100 block ${isBpmPulse ? 'scale-110 text-white' : 'scale-100'}`}>
                {bpm} BPM
              </span>
            </div>
          </div>

          {/* Core Exercise Canvas Area (Fixed central target inside, with clear visual and audible direction guides) */}
          <div className="relative aspect-[16/10] w-full bg-slate-950 border-2 border-slate-850 rounded-3xl overflow-hidden flex flex-col items-center justify-center shadow-inner min-h-[350px]">
            
            {/* Dynamic visual path guidelines behind fixation symbol to assist movement path */}
            <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
              {currentDirection === 'waagerecht' && (
                <div className="w-full h-1 border-t-4 border-dashed border-pink-500/30" />
              )}
              {currentDirection === 'senkrecht' && (
                <div className="h-full w-1 border-l-4 border-dashed border-pink-500/30" />
              )}
              {currentDirection === 'diagonal_1' && (
                <div className="w-[150%] h-1 border-t-4 border-dashed border-pink-500/30 rotate-45" />
              )}
              {currentDirection === 'diagonal_2' && (
                <div className="w-[150%] h-1 border-t-4 border-dashed border-pink-500/30 -rotate-45" />
              )}
            </div>

            {/* Pulsing Edge Arrows to show movement direction path */}
            {currentDirection === 'waagerecht' && (
              <>
                <div className="absolute left-6 top-1/2 -translate-y-1/2 animate-bounce text-pink-400 font-mono text-2xl font-black">◀</div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-bounce text-pink-400 font-mono text-2xl font-black">▶</div>
              </>
            )}
            {currentDirection === 'senkrecht' && (
              <>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 animate-bounce text-pink-400 font-mono text-2xl font-black">▲</div>
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 animate-bounce text-pink-400 font-mono text-2xl font-black">▼</div>
              </>
            )}
            {currentDirection === 'diagonal_1' && (
              <>
                <div className="absolute left-6 top-6 animate-pulse text-pink-400 font-mono text-2xl font-black">◤</div>
                <div className="absolute right-6 bottom-24 animate-pulse text-pink-400 font-mono text-2xl font-black">◢</div>
              </>
            )}
            {currentDirection === 'diagonal_2' && (
              <>
                <div className="absolute left-6 bottom-24 animate-pulse text-pink-400 font-mono text-2xl font-black">◣</div>
                <div className="absolute right-6 top-6 animate-pulse text-pink-400 font-mono text-2xl font-black">◥</div>
              </>
            )}

            {/* Pulsing concentric ring in rhythm with the metronome beat */}
            <div className={`absolute z-10 w-24 h-24 rounded-full border-2 border-pink-500/20 transition-all duration-100 ${isBpmPulse ? 'scale-125 opacity-80 border-pink-500/50 bg-pink-500/5' : 'scale-100 opacity-20'}`} />

            {/* ABSOLUTE STATIONARY CENTRAL TARGET */}
            <div className="relative z-20 w-16 h-16 rounded-full bg-slate-900/90 border-2 border-slate-800/80 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)] select-none">
              <span className={`text-3xl font-black font-mono tracking-tighter leading-none ${targetColor} select-none drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]`}>
                {targetSymbol}
              </span>
            </div>

            {/* Floating text card explaining current head-movement directions */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center space-y-1.5 z-10 w-11/12 max-w-sm">
              <motion.div
                key={currentDirection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/95 border border-slate-800 px-5 py-2.5 rounded-2xl shadow-xl flex flex-col items-center"
              >
                <span className="text-[9px] text-pink-400 font-mono uppercase font-black tracking-widest block mb-0.5">Kopf-Bewegungsachse:</span>
                <span className="text-sm sm:text-base font-black text-white font-mono tracking-wide uppercase">
                  {DIRECTIONS.find(d => d.id === currentDirection)?.arrow}
                </span>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                  {DIRECTIONS.find(d => d.id === currentDirection)?.description}
                </p>
              </motion.div>

              {/* Countdown timer before next change */}
              <div className="text-[10px] text-slate-400 font-mono bg-slate-950/90 px-3 py-1 rounded-xl border border-slate-850 shadow-md inline-block">
                Achsenwechsel in <strong className="text-pink-400 font-black">{10 - ((90 - timeLeft) % 10)}s</strong> zu: <span className="text-white font-bold">{DIRECTIONS.find(d => d.id === nextDirection)?.label}</span>
              </div>
            </div>

          </div>
 
          {/* Quick Active Controls (Locked configuration) */}
          <div className="flex justify-center items-center bg-slate-900/40 p-3 rounded-2xl border border-slate-900">
            <button
              onClick={terminateExerciseEarly}
              className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
            >
              <StopCircle className="w-4 h-4" />
              <span>Übung abbrechen</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. FINISHED SUMMARY SCREEN */}
      {exerciseState === 'finished' && (
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 text-center shadow-2xl animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/5">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">Reflex-Focus beendet!</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Hervorragende neuronale Leistung! Du hast die Stabilität deiner vestibulookulären Fokussierung erfolgreich gesteigert. Hier ist dein Trainingsprotokoll:
            </p>
          </div>

          {/* STATS SUMMARY BOXES */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 relative overflow-hidden">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Trainierte Dauer</span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">
                {duration}s
              </span>
              <p className="text-[9px] text-slate-500 font-sans mt-1">
                Gleichmäßige Reizfrequenz gehalten
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 relative overflow-hidden">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Endgeschwindigkeit</span>
              <span className="text-2xl font-black text-pink-500 font-mono mt-1 block">
                {avgBpmReached} BPM
              </span>
              <p className="text-[9px] text-slate-500 font-sans mt-1">
                {autoSpeedup ? 'Mit kontinuierlicher Steigerung' : 'Konstante Frequenz'}
              </p>
            </div>
          </div>

          {/* Bisherige Durchgänge (Only shown inside the exercise screen) */}
          <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <span className="font-sans font-bold text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-pink-500" />
              <span>Erfolgreich absolvierte Durchgänge insgesamt:</span>
            </span>
            <span className="px-3.5 py-1 rounded bg-slate-900 border border-slate-800 text-sm font-black text-white font-mono">
              {localCompletedCount + 1}
            </span>
          </div>

          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center">
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              <strong>Nutzen im Torwartspiel:</strong> Der VOR-Reflex ist die neuronale Voraussetzung für eine makellose "Eye-Tracking"-Performance. Goalkeepers mit einer perfekt trainierten VOR-Kopplung verlieren den Ball auch bei heftigen Ausweichbewegungen im Luftkampf oder Hechtsprüngen niemals aus dem Blick.
            </p>
          </div>

          {/* FOOTER ACTION CONTROLS */}
          <div className="flex gap-3">
            <button
              onClick={startCountdown}
              className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow"
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
