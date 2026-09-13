import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Play, 
  StopCircle, 
  Brain, 
  Timer, 
  Trophy, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  RefreshCw, 
  Info, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface StabilityFocusProps {
  userProfile: UserProfile;
  onBack: () => void;
  onTrainingComplete?: () => void;
  onResetPlayCount?: () => void;
  playCount?: number;
}

type ExerciseState = 'idle' | 'countdown' | 'running' | 'finished';
type DifficultyLevel = 'leicht' | 'mittel' | 'profi';

interface DirectionCommand {
  id: string;
  label: string;
  description: string;
  arrow: string;
  speechText: string;
  colorClass: string;
  glowClass: string;
}

const DIRECTIONS: DirectionCommand[] = [
  { 
    id: 'links', 
    label: 'Links', 
    description: 'Kopf nach links drehen, Blick stabilisieren.', 
    arrow: '◀ LINKS', 
    speechText: 'Links',
    colorClass: 'text-amber-500 border-amber-500/20 bg-amber-500/10',
    glowClass: 'shadow-[0_0_40px_rgba(245,158,11,0.25)]'
  },
  { 
    id: 'rechts', 
    label: 'Rechts', 
    description: 'Kopf nach rechts drehen, Blick stabilisieren.', 
    arrow: 'RECHTS ▶', 
    speechText: 'Rechts',
    colorClass: 'text-amber-500 border-amber-500/20 bg-amber-500/10',
    glowClass: 'shadow-[0_0_40px_rgba(245,158,11,0.25)]'
  },
  { 
    id: 'kinn_brust', 
    label: 'Kinn zur Brust', 
    description: 'Kopf nach unten neigen, Blick stabilisieren.', 
    arrow: '▼ KINN ZUR BRUST', 
    speechText: 'Kinn zur Brust',
    colorClass: 'text-pink-500 border-pink-500/20 bg-pink-500/10',
    glowClass: 'shadow-[0_0_40px_rgba(236,72,153,0.25)]'
  },
  { 
    id: 'nacken', 
    label: 'In den Nacken', 
    description: 'Kopf nach hinten neigen, Blick stabilisieren.', 
    arrow: '▲ IN DEN NACKEN', 
    speechText: 'In den Nacken',
    colorClass: 'text-pink-500 border-pink-500/20 bg-pink-500/10',
    glowClass: 'shadow-[0_0_40px_rgba(236,72,153,0.25)]'
  }
];

export default function StabilityFocus({ 
  userProfile, 
  onBack, 
  onTrainingComplete, 
  onResetPlayCount,
  playCount = 0 
}: StabilityFocusProps) {
  const [exerciseState, setExerciseState] = useState<ExerciseState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  
  // Track local completed count to prevent asynchronous double-increment UI flicker and lock the starting value
  const [localCompletedCount, setLocalCompletedCount] = useState<number>(playCount);
  const hasCompletedSessionRef = useRef<boolean>(false);

  // Sync localCompletedCount to prop playCount when the user is idle, so they see the fresh database value
  useEffect(() => {
    if (exerciseState === 'idle') {
      setLocalCompletedCount(playCount);
    }
  }, [playCount, exerciseState]);
  
  // Difficulty levels and intervals
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('mittel');
  
  // Sound and Speech Cues toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);

  // Runtime State
  const [currentDirection, setCurrentDirection] = useState<DirectionCommand>(DIRECTIONS[0]);
  const [nextDirection, setNextDirection] = useState<DirectionCommand>(DIRECTIONS[1]);
  const [commandTimeLeft, setCommandTimeLeft] = useState<number>(2.5);

  const currentDirectionRef = useRef<DirectionCommand>(DIRECTIONS[0]);
  const nextDirectionRef = useRef<DirectionCommand>(DIRECTIONS[1]);
  
  // Web Audio Context & speech synthesize
  const audioCtxRef = useRef<AudioContext | null>(null);
  const exerciseTimerRef = useRef<any>(null);
  const commandTimerRef = useRef<any>(null);

  // Difficulty parameters mapper
  const getIntervalForDifficulty = (diff: DifficultyLevel): number => {
    switch (diff) {
      case 'leicht': return 4.0;
      case 'mittel': return 2.5;
      case 'profi': return 1.5;
    }
  };

  // Synchronous ref syncing
  const soundEnabledRef = useRef(soundEnabled);
  const speechEnabledRef = useRef(speechEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { speechEnabledRef.current = speechEnabled; }, [speechEnabled]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(exerciseTimerRef.current);
      clearInterval(commandTimerRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play crisp tick sound
  const playTickSound = (isHighTone: boolean = false) => {
    if (!soundEnabledRef.current) return;
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

      const freq = isHighTone ? 1400 : 900;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  };

  // Play completion sound
  const playCompletionSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      
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

      playTone(523.25, 0, 0.25);    // C5
      playTone(659.25, 0.12, 0.25); // E5
      playTone(783.99, 0.24, 0.25); // G5
      playTone(1046.50, 0.36, 0.4); // C6
    } catch (err) {
      console.warn('Completion sound failed', err);
    }
  };

  // Speech output
  const speakCommand = (text: string) => {
    if (!speechEnabledRef.current) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 1.35; // brisk and responsive
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('Speech synthesis failed:', err);
    }
  };

  // Trigger exercise start with unblocking Audio & Speech APIs in direct event handler thread
  const startCountdown = () => {
    // Unblock Web Audio API
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
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (err) {
      console.warn('Audio Context unblock failed:', err);
    }

    // Unblock speech synthesis
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('Start');
        utterance.lang = 'de-DE';
        utterance.volume = 0.0001; // Silent unblock
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
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(cdInterval);
          startExercise();
          return 0;
        }
        playTickSound(false);
        return prev - 1;
      });
    }, 1000);
    playTickSound(true);
  };

  // Starts the main 60-seconds exercise loop
  const startExercise = () => {
    setExerciseState('running');
    setTimeLeft(60);

    // Pick first direction
    const firstDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    let nextDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    while (nextDir.id === firstDir.id) {
      nextDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    }

    currentDirectionRef.current = firstDir;
    nextDirectionRef.current = nextDir;
    setCurrentDirection(firstDir);
    setNextDirection(nextDir);
    
    const initialInterval = getIntervalForDifficulty(difficulty);
    setCommandTimeLeft(initialInterval);

    // Speak first command
    speakCommand(firstDir.speechText);
    playTickSound(true);

    // 1. General timer for 60 seconds (updates once per second)
    exerciseTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopAndFinishExercise();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Command interval loop (running at fine resolution of 100ms for smooth progress circles and exact ticks)
    let timeElapsedSinceCommand = 0;
    commandTimerRef.current = setInterval(() => {
      const step = 0.1;
      timeElapsedSinceCommand += step;
      
      const currentInterval = getIntervalForDifficulty(difficulty);
      const remaining = Math.max(0, currentInterval - timeElapsedSinceCommand);
      setCommandTimeLeft(remaining);

      if (remaining <= 0) {
        // Trigger command switch!
        timeElapsedSinceCommand = 0;
        
        // Use the pre-calculated next command from ref to avoid stale closure
        const next = nextDirectionRef.current;
        
        // Pre-calculate a NEW next command that is different from this one
        let candidate = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        while (candidate.id === next.id) {
          candidate = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        }

        currentDirectionRef.current = next;
        nextDirectionRef.current = candidate;
        
        setCurrentDirection(next);
        setNextDirection(candidate);
        
        // Execute outputs
        speakCommand(next.speechText);
        playTickSound(true);
      }
    }, 100);
  };

  const stopAndFinishExercise = () => {
    if (hasCompletedSessionRef.current) return;
    hasCompletedSessionRef.current = true;

    clearInterval(exerciseTimerRef.current);
    clearInterval(commandTimerRef.current);
    playCompletionSound();
    setExerciseState('finished');

    if (onTrainingComplete) {
      onTrainingComplete();
    }
  };

  const terminateExerciseEarly = () => {
    clearInterval(exerciseTimerRef.current);
    clearInterval(commandTimerRef.current);
    setExerciseState('idle');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. IDLE/PRE-START SCREEN */}
      {exerciseState === 'idle' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase font-mono tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück zur Übersicht</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono text-[10px] font-black uppercase tracking-widest">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Gleichgewicht & VOR</span>
            </div>
          </div>

          {/* Hero Explainer Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="space-y-4 max-w-xl text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Brain className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono">
                  Stability-Focus
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Diese neuroathletische Gleichgewichtsübung trainiert deine sensorische Integration. Indem du auf einem Bein stehst und der Kopf dynamischen Befehlen folgt, während der Blick starr fixiert bleibt, forderst du dein vestibuläres System (Gleichgewicht) und visuelles System zeitgleich heraus.
              </p>
              
              <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl flex items-start gap-3 text-left">
                <Info className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-white uppercase tracking-wider font-mono">Ausgangsposition & Durchführung:</span>
                  <p className="text-xs text-pink-400/90 font-medium">
                    "Auf ein Bein stellen und den Körperschwerpunkt stabilisieren."
                  </p>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Fixiere einen Punkt starr vor dir an der Wand. Bewege deinen Kopf abrupt bei jedem akustischen oder visuellen Kommando in die entsprechende Richtung, halte deinen Körper auf einem Bein absolut stabil und bringe den Blick direkt wieder auf den Fixpunkt.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Deco */}
            <div className="w-32 h-32 rounded-3xl bg-pink-500/5 border border-pink-500/10 flex items-center justify-center relative shrink-0">
              <div className="absolute inset-2 rounded-2xl border border-dashed border-pink-500/15 animate-spin duration-10000" />
              <Brain className="w-12 h-12 text-pink-500/40" />
            </div>
          </div>

          {/* Configuration Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-pink-500" />
              <span>Übungs-Konfiguration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Difficulty intervals */}
              <div className="space-y-4">
                <label className="block text-xs font-black text-white uppercase font-mono tracking-wide">
                  Schwierigkeitsgrad (Kommando-Intervall)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['leicht', 'mittel', 'profi'] as DifficultyLevel[]).map((level) => {
                    const active = difficulty === level;
                    const descriptions = {
                      leicht: 'Alle 4.0 Sek.',
                      mittel: 'Alle 2.5 Sek.',
                      profi: 'Alle 1.5 Sek.'
                    };
                    return (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          active
                            ? 'bg-pink-500/10 border-pink-500/40 text-pink-400 shadow-inner'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider font-mono">{level}</span>
                        <span className="text-[10px] opacity-80 font-mono font-medium">{descriptions[level]}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-[11px] text-slate-400">
                  <AlertCircle className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Je höher der Schwierigkeitsgrad, desto kürzer die Stabilitätsphasen zwischen den Kopfbewegungen.</span>
                </div>
              </div>

              {/* Right Column: Audio & Toggles */}
              <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850/80">
                <span className="block text-[10px] text-slate-500 font-mono uppercase font-black tracking-wider border-b border-slate-900 pb-2">Auditive & Visuelle Signal-Optionen</span>
                
                {/* 1. Toggle Voice Cues */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white font-mono block">Sprachausgabe (de-DE)</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Kommandos werden per Snappy-Stimme angesagt.
                    </span>
                  </div>
                  <button
                    onClick={() => setSpeechEnabled(!speechEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                      speechEnabled ? 'bg-pink-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      speechEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 2. Toggle Metronome Sound */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white font-mono block">Umschalt-Signalton</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Zusätzlicher hoher Signalton bei jedem Richtungswechsel.
                    </span>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                      soundEnabled ? 'bg-pink-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Static Training Presets indicator */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Gesamtdauer</span>
                <span className="text-xs font-black text-white font-mono">60s (Fix)</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Ausgangsposition</span>
                <span className="text-xs font-black text-pink-400 font-mono">Einbeinig</span>
              </div>
            </div>

            {/* Historical Stats indicator inside the exercise */}
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

            {/* Launch Button */}
            <button
              onClick={startCountdown}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-pink-500/10 cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Stability-Focus Starten</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. COUNTDOWN SCREEN */}
      {exerciseState === 'countdown' && (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-slate-950 border border-slate-850 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-pink-500/5 to-transparent pointer-events-none" />
          
          <span className="text-xs font-bold text-pink-400 uppercase tracking-widest font-mono">Mach dich bereit...</span>
          
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm">
            <p className="text-xs text-amber-400 font-mono font-bold uppercase mb-1">Ausgangsposition:</p>
            <p className="text-xs text-white leading-relaxed">
              "Auf ein Bein stellen und den Körperschwerpunkt stabilisieren."
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-8xl font-black text-white font-mono drop-shadow-[0_0_20px_rgba(236,72,153,0.3)]"
            >
              {countdown}
            </motion.div>
          </AnimatePresence>

          <span className="text-xs text-slate-500 font-mono">Fixiere starr den Blick nach vorne.</span>
        </div>
      )}

      {/* 3. RUNNING EXERCISE SCREEN */}
      {exerciseState === 'running' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Progress Bars */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Timer className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 font-mono uppercase font-black tracking-wider">Verbleibende Übungsdauer</span>
                <span className="text-lg font-black text-white font-mono leading-none">{timeLeft} Sekunden</span>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-4">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-850 font-mono text-[10px] text-slate-400">
                Schwierigkeit: <span className="text-pink-400 font-black uppercase">{difficulty}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-850 font-mono text-[10px] text-slate-400">
                Intervall: <span className="text-white font-black">{getIntervalForDifficulty(difficulty)}s</span>
              </div>
            </div>
          </div>

          {/* Core Exercise Display Area */}
          <div className={`relative aspect-[16/10] w-full bg-slate-950 border-2 border-slate-850 rounded-3xl overflow-hidden flex flex-col items-center justify-center shadow-inner min-h-[380px] transition-all duration-300 ${currentDirection.glowClass}`}>
            
            {/* Pulsing ring indicator synchronized with interval */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="rounded-full border-2 border-pink-500/10 transition-all ease-linear duration-100"
                style={{
                  width: `${120 + (commandTimeLeft / getIntervalForDifficulty(difficulty)) * 160}px`,
                  height: `${120 + (commandTimeLeft / getIntervalForDifficulty(difficulty)) * 160}px`,
                  opacity: 0.1 + (commandTimeLeft / getIntervalForDifficulty(difficulty)) * 0.4
                }}
              />
            </div>

            {/* Visual Direction Instructions (Big, unmistakable) */}
            <div className="z-10 text-center space-y-6 px-6">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 block">Kopf-Bewegungssignal:</span>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentDirection.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`px-8 py-6 rounded-3xl border-2 font-mono font-black text-3xl sm:text-4xl md:text-5xl uppercase tracking-wider text-center flex flex-col items-center gap-3 shadow-2xl transition-all ${currentDirection.colorClass}`}
                >
                  <span className="drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]">{currentDirection.arrow}</span>
                  <span className="text-[11px] font-sans font-bold tracking-normal opacity-90 text-slate-300 normal-case">
                    {currentDirection.description}
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* Countdown Progress until next instruction */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-36 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850 relative">
                  <div 
                    className="h-full bg-pink-500 transition-all ease-linear duration-100"
                    style={{ width: `${(commandTimeLeft / getIntervalForDifficulty(difficulty)) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-mono">
                  Nächstes Kommando in: <strong className="text-white font-bold">{commandTimeLeft.toFixed(1)}s</strong>
                </span>
              </div>
            </div>

            {/* Next Cue Preview Snippet at top right */}
            <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-850 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-400 shadow-md">
              Vorschau: <strong className="text-pink-400 font-bold">{nextDirection.label}</strong>
            </div>

            {/* Standing Position Reminder at bottom left */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/90 border border-slate-850 px-3.5 py-1.5 rounded-xl text-[10px] font-mono text-amber-400 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Einbeiniger Stand</span>
            </div>
          </div>

          {/* Quick Active Controls */}
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

      {/* 4. FINISHED/SUMMARY SCREEN */}
      {exerciseState === 'finished' && (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="mx-auto w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shadow-inner">
            <Trophy className="w-8 h-8 animate-bounce text-amber-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-white uppercase font-mono tracking-tight">
              Stability-Focus Beendet!
            </h2>
            <p className="text-xs text-slate-400">
              Hervorragend gearbeitet! Du hast die 60-sekündige Gleichgewichtsübung vollständig absolviert.
            </p>
          </div>

          {/* Training Accomplishments Details */}
          <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-900 pb-2">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Gewählter Level:</span>
              <span className="text-pink-400 font-black uppercase">{difficulty}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-900 pb-2">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Durchlaufzeit:</span>
              <span className="text-white font-bold">60 Sekunden</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Absolvierte Durchgänge:</span>
              <span className="text-white font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                {localCompletedCount + 1}
              </span>
            </div>
          </div>

          {/* Erfolgs-Display */}
          <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between text-xs text-slate-400">
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
              <strong>Nutzen im Torwartspiel:</strong> Ein hervorragend kalibriertes Gleichgewichtssystem gepaart mit einer reaktionsschnellen Kopf-Auge-Kopplung ermöglicht es dir, bei Flanken, im Luftkampf und nach Hechtsprüngen die Orientierung niemals zu verlieren und sofort wieder aufnahmebereit zu sein.
            </p>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setExerciseState('idle');
                setTimeLeft(60);
              }}
              className="py-3 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700/50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Nochmal</span>
            </button>
            <button
              onClick={onBack}
              className="py-3 bg-pink-500 hover:bg-pink-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Übersicht
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
