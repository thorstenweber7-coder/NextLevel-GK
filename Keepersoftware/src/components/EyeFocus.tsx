import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Timer, Brain, Trophy, Target, Zap, 
  RotateCcw, CheckCircle2, XCircle, AlertCircle, Volume2, VolumeX, Sparkles,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserProfile } from '../types';

interface EyeFocusProps {
  userProfile: UserProfile;
  onBack: () => void;
  onTrainingComplete?: () => void;
}

type GameState = 'idle' | 'countdown' | 'delay' | 'stimulus' | 'feedback' | 'finished';
type Side = 'left' | 'right';

interface AntiSaccadeAttempt {
  round: number;
  timeMs: number;
  correct: boolean;
  stimulusSide: Side;
  clickedSide: Side | 'timeout';
}

export default function EyeFocus({ userProfile, onBack, onTrainingComplete }: EyeFocusProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [round, setRound] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Gameplay State
  const [stimulusSide, setStimulusSide] = useState<Side | null>(null);
  const [feedbackState, setFeedbackState] = useState<{ side: Side; status: 'correct' | 'incorrect' } | null>(null);
  const [lastReactionTime, setLastReactionTime] = useState<number | null>(null);
  const [infoText, setInfoText] = useState<string>('Konzentriere dich auf das Kreuz.');

  // Session logs
  const [attempts, setAttempts] = useState<AntiSaccadeAttempt[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const delayTimeoutRef = useRef<any>(null);
  const responseTimeoutRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const stateRef = useRef<GameState>('idle');

  // Keep ref up to date to prevent closure bugs
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  // Synthetic sound generator
  const playSound = (type: 'correct' | 'incorrect' | 'tick' | 'complete' | 'pop') => {
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
        osc.frequency.setValueAtTime(950, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'incorrect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'complete') {
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, idx) => {
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
          }, idx * 120);
        });
      }
    } catch (e) {
      console.warn('Web Audio API issue:', e);
    }
  };

  const startNewGame = () => {
    // Clear all active timeouts
    if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
    if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

    setAttempts([]);
    setRound(1);
    setLastReactionTime(null);
    setStimulusSide(null);
    setFeedbackState(null);
    setCountdown(3);
    setInfoText('Fokus aufbauen...');
    setGameState('countdown');
  };

  // Countdown Loop
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown === 0) {
      startRoundDelay(1);
      return;
    }

    playSound('tick');
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, gameState]);

  // Start the randomized delay before a stimulus pops up
  const startRoundDelay = (currentRound: number) => {
    setGameState('delay');
    setStimulusSide(null);
    setFeedbackState(null);
    setInfoText('Fokus auf das Fixationskreuz (+)');

    // Random duration between 1000ms and 2500ms
    const delayDuration = 1000 + Math.random() * 1500;

    delayTimeoutRef.current = setTimeout(() => {
      triggerStimulus(currentRound);
    }, delayDuration);
  };

  // Trigger the stimulus
  const triggerStimulus = (currentRound: number) => {
    setGameState('stimulus');
    const sides: Side[] = ['left', 'right'];
    const selectedSide = sides[Math.floor(Math.random() * sides.length)];
    setStimulusSide(selectedSide);
    setInfoText('REAGIERE SPIEGELBILDLICH!');
    playSound('pop');
    
    startTimeRef.current = performance.now();

    // 1500ms response timeout window
    responseTimeoutRef.current = setTimeout(() => {
      handleTimeout(currentRound, selectedSide);
    }, 1500);
  };

  // Handle Timeout (taking too long to respond)
  const handleTimeout = (currentRound: number, side: Side) => {
    if (stateRef.current !== 'stimulus') return;
    
    playSound('incorrect');
    setFeedbackState({ side: 'left', status: 'incorrect' }); // Just highlight red to show error
    setInfoText('Zu langsam! (Zeitüberschreitung >1.5s)');
    setLastReactionTime(1500);

    const log: AntiSaccadeAttempt = {
      round: currentRound,
      timeMs: 1500,
      correct: false,
      stimulusSide: side,
      clickedSide: 'timeout'
    };

    const nextAttempts = [...attempts, log];
    setAttempts(nextAttempts);

    advanceGame(currentRound, nextAttempts);
  };

  // Evaluate User Action (Left or Right Click/Tap)
  const handleSideClick = (clickedSide: Side) => {
    if (gameState !== 'stimulus') return;

    // Clear response timeout instantly
    if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current);

    const endTime = performance.now();
    const duration = Math.round(endTime - startTimeRef.current);

    // Anti-Saccade rule: Correct side is the OPPOSITE of stimulusSide
    const correctSide = stimulusSide === 'left' ? 'right' : 'left';
    const isCorrect = clickedSide === correctSide;

    setLastReactionTime(duration);

    if (isCorrect) {
      playSound('correct');
      setFeedbackState({ side: clickedSide, status: 'correct' });
      setInfoText('Perfekt! Treffer.');
    } else {
      playSound('incorrect');
      setFeedbackState({ side: clickedSide, status: 'incorrect' });
      setInfoText('Reflex-Fehler! Auf die falsche Seite geschaut.');
    }

    const log: AntiSaccadeAttempt = {
      round,
      timeMs: duration,
      correct: isCorrect,
      stimulusSide: stimulusSide!,
      clickedSide
    };

    const nextAttempts = [...attempts, log];
    setAttempts(nextAttempts);

    advanceGame(round, nextAttempts);
  };

  // Transition helper to keep game flow smooth
  const advanceGame = (currentRound: number, currentAttempts: AntiSaccadeAttempt[]) => {
    setGameState('feedback');

    feedbackTimeoutRef.current = setTimeout(() => {
      if (currentRound >= 30) {
        playSound('complete');
        setGameState('finished');
        if (onTrainingComplete) {
          onTrainingComplete();
        }
      } else {
        setRound(currentRound + 1);
        startRoundDelay(currentRound + 1);
      }
    }, 600);
  };

  // Desktop keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'stimulus') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleSideClick('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleSideClick('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, stimulusSide, round, attempts]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
      if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // Performance calculations
  const correctCount = attempts.filter(a => a.correct).length;
  const accuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;
  const avgReactionTime = attempts.length > 0
    ? Math.round(attempts.reduce((sum, curr) => sum + curr.timeMs, 0) / attempts.length)
    : 0;

  // Chart data formatting
  const chartData = attempts.map(att => ({
    round: att.round,
    speed: att.timeMs,
    Fehler: att.correct ? 0 : 300
  }));

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* TOP HEADER */}
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
          <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mx-auto text-fuchsia-400 shadow-lg">
            <Target className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono">
              Eye Focus (Spiegelblitz)
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Neuroathletisches Anti-Sakkaden-Training zur Unterdrückung automatischer Blickreflexe. Der rote Stimulus zieht deine Augen magisch an — du musst dich jedoch zwingen, sofort die <strong>gespiegelte, leere Seite</strong> anzutippen.
            </p>
          </div>

          {/* Guidelines */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 text-left space-y-3 text-slate-300 text-xs font-sans max-w-md mx-auto leading-normal">
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center font-bold text-fuchsia-400 text-[10px]">1</span>
              <p>Fixiere das weiße <strong>Kreuz (+)</strong> im Zentrum.</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center font-bold text-fuchsia-400 text-[10px]">2</span>
              <p>Wenn links ein roter Kreis aufleuchtet, tippe <strong>rechts</strong> (und umgekehrt!).</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-5 h-5 shrink-0 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center font-bold text-fuchsia-400 text-[10px]">3</span>
              <p>Schaffst du alle <strong>30 Durchgänge</strong> mit hoher Präzision?</p>
            </div>
          </div>

          <button
            onClick={startNewGame}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Training Starten</span>
          </button>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
          <span className="text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest">
            Blick auf das Zentrum fixieren...
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-7xl font-black text-fuchsia-500 font-mono select-none"
            >
              {countdown}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* RUNNING GAME INTERFACE */}
      {(gameState === 'delay' || gameState === 'stimulus' || gameState === 'feedback') && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* HUD AREA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="space-y-0.5">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Fortschritt</span>
              <span className="text-sm font-black text-white font-mono flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-fuchsia-400" />
                <span>Runde {round} / 30</span>
              </span>
            </div>

            <div className="text-center px-3 py-1 bg-slate-950 rounded-lg border border-slate-850">
              <span className="text-[10px] font-bold text-slate-400 tracking-tight block">
                {infoText}
              </span>
            </div>

            <div className="space-y-0.5 text-right">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Letzte Reaktion</span>
              <span className="text-sm font-black text-fuchsia-400 font-mono">
                {lastReactionTime !== null ? `${lastReactionTime}ms` : '---'}
              </span>
            </div>
          </div>

          {/* SPLIT SCREEN ACTIVE AREA */}
          <div className="relative aspect-[16/9] w-full bg-slate-950 border-2 border-slate-850 rounded-3xl overflow-hidden flex shadow-inner">
            
            {/* LEFT CONTAINER */}
            <div 
              onPointerDown={() => handleSideClick('left')}
              className={`flex-1 relative flex items-center justify-center transition-all cursor-pointer select-none ${
                feedbackState?.side === 'left'
                  ? feedbackState.status === 'correct'
                    ? 'bg-emerald-500/10 border-r border-emerald-500/20'
                    : 'bg-red-500/10 border-r border-red-500/20'
                  : 'hover:bg-slate-900/10 border-r border-slate-900'
              }`}
            >
              <div className="absolute top-3 left-4 text-[9px] font-mono font-bold text-slate-700 uppercase tracking-widest">
                Linker Bereich (A / ←)
              </div>

              {/* STIMULUS CIRCLE */}
              {gameState === 'stimulus' && stimulusSide === 'left' && (
                <motion.div
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-red-500 shadow-[0_0_25px_#ef4444]"
                />
              )}

              {/* Correct / Incorrect overlay indicators */}
              {feedbackState?.side === 'left' && (
                <div className={`text-xs font-black uppercase tracking-wider font-mono ${
                  feedbackState.status === 'correct' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {feedbackState.status === 'correct' ? 'Treffer ✓' : 'Fehler ✗'}
                </div>
              )}
            </div>

            {/* PERMANENT FIXATION CROSSHAIR */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg pointer-events-none z-10 select-none">
              <span className="text-xl font-bold text-white leading-none font-mono">+</span>
            </div>

            {/* RIGHT CONTAINER */}
            <div 
              onPointerDown={() => handleSideClick('right')}
              className={`flex-1 relative flex items-center justify-center transition-all cursor-pointer select-none ${
                feedbackState?.side === 'right'
                  ? feedbackState.status === 'correct'
                    ? 'bg-emerald-500/10 border-l border-emerald-500/20'
                    : 'bg-red-500/10 border-l border-red-500/20'
                  : 'hover:bg-slate-900/10 border-l border-slate-900'
              }`}
            >
              <div className="absolute top-3 right-4 text-[9px] font-mono font-bold text-slate-700 uppercase tracking-widest">
                Rechter Bereich (D / →)
              </div>

              {/* STIMULUS CIRCLE */}
              {gameState === 'stimulus' && stimulusSide === 'right' && (
                <motion.div
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-red-500 shadow-[0_0_25px_#ef4444]"
                />
              )}

              {/* Correct / Incorrect overlay indicators */}
              {feedbackState?.side === 'right' && (
                <div className={`text-xs font-black uppercase tracking-wider font-mono ${
                  feedbackState.status === 'correct' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {feedbackState.status === 'correct' ? 'Treffer ✓' : 'Fehler ✗'}
                </div>
              )}
            </div>
          </div>

          {/* LANDSCAPE CONVENIENCE TIPS */}
          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-fuchsia-400 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              <strong>Tipp für Smartphones:</strong> Drehe dein Gerät ins Querformat. Halte es mit beiden Händen und nutze deine Daumen zum schnellen Tippen auf den linken oder rechten Bereich. Auf dem PC kannst du die Pfeiltasten <strong>←</strong> und <strong>→</strong> verwenden.
            </p>
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
            <h3 className="text-xl font-black text-white">Eye Focus beendet!</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Exzellente neuronale Leistung! Du hast deine automatischen Blick- & Greifreflexe erfolgreich trainiert. Hier sind deine Ergebnisse:
            </p>
          </div>

          {/* STATS HIGHLIGHT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 relative overflow-hidden">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Genauigkeit</span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">
                {accuracy}%
              </span>
              <p className="text-[9px] text-slate-500 font-sans mt-1">
                {correctCount} von 30 richtig gelöst
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 relative overflow-hidden">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Ø Reaktionszeit</span>
              <span className="text-2xl font-black text-fuchsia-400 font-mono mt-1 block">
                {avgReactionTime}ms
              </span>
              <p className="text-[9px] text-slate-500 font-sans mt-1">
                Inklusive Fehler- & Timeout-Zeiten
              </p>
            </div>
          </div>

          {/* PERFORMANCE LINE CHART */}
          {attempts.length > 0 && (
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl">
              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black text-left mb-3">Aufmerksamkeitsverlauf (Runde 1-30)</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="round" stroke="#475569" fontSize={9} fontStyle="mono" tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} fontStyle="mono" tickLine={false} unit="ms" />
                    <Tooltip 
                      contentStyle={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#d946ef', fontSize: '11px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="speed" 
                      name="Reaktionszeit" 
                      stroke="#d946ef" 
                      strokeWidth={2} 
                      dot={{ r: 2, fill: '#d946ef' }} 
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center">
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              <strong>Nutzen im Torwartspiel:</strong> Ein starker Augenfokus und die Fähigkeit, reflexartige Sakkaden zu unterdrücken, helfen dir, angetäuschten Bewegungen von Angreifern nicht sofort zu erliegen, sondern die Ballbahn konzentriert zu lesen.
            </p>
          </div>

          {/* FOOTER CONTROLS */}
          <div className="flex gap-3">
            <button
              onClick={startNewGame}
              className="flex-1 py-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
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
