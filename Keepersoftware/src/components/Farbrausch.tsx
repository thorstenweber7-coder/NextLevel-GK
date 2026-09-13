import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowLeft, Brain, Trophy, Volume2, VolumeX, 
  RotateCcw, CheckCircle2, XCircle, Award, Sparkles, Zap,
  ChevronDown
} from 'lucide-react';
import { UserProfile } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface FarbrauschProps {
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

type GameState = 'idle' | 'countdown' | 'playing' | 'summary';
type GameRule = 'WORT' | 'FARBE';

interface StroopColor {
  name: string;      // German name, e.g., "ROT"
  english: string;   // English name for fallback or styling
  hex: string;       // Hex code for rendering, e.g., "#ef4444"
}

const STROOP_COLORS: StroopColor[] = [
  { name: 'ROT', english: 'red', hex: '#ef4444' },     // Rose Red
  { name: 'BLAU', english: 'blue', hex: '#3b82f6' },   // Royal Blue
  { name: 'GRÜN', english: 'green', hex: '#22c55e' },  // Emerald Green
  { name: 'GELB', english: 'yellow', hex: '#eab308' }, // Amber Yellow
];

export default function Farbrausch({ userProfile, onBack, onUpdatePoints, onTrainingComplete, challengeMode }: FarbrauschProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Level & Timer States (Fixiert auf Level 4)
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(4);
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
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  // Game Play states
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [activeRule, setActiveRule] = useState<GameRule>('WORT');
  const [wordItem, setWordItem] = useState<StroopColor>(STROOP_COLORS[0]);
  const [colorItem, setColorItem] = useState<StroopColor>(STROOP_COLORS[0]);
  
  // Scoring & Stats
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [flashFeedback, setFlashFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Countdown clock
  const [countdown, setCountdown] = useState<number>(3);

  const roundStartTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Audio synthesis using Web Audio API
  const playSound = (type: 'correct' | 'wrong' | 'complete' | 'tick' | 'start') => {
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
        oscillator.frequency.setValueAtTime(140, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'tick') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'start') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.25);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'complete') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      }
    } catch (err) {
      console.warn('Audio Context block:', err);
    }
  };

  // Setup one round of Stroop stimulus
  const nextRoundSetup = () => {
    // Determine rule (50% WORT, 50% FARBE)
    const rule: GameRule = Math.random() > 0.5 ? 'WORT' : 'FARBE';
    setActiveRule(rule);

    // Pick random word
    const randomWordIdx = Math.floor(Math.random() * STROOP_COLORS.length);
    const word = STROOP_COLORS[randomWordIdx];

    let color = word;
    // 75% chance to be incongruent to trigger Stroop interference
    if (Math.random() < 0.75) {
      const otherColors = STROOP_COLORS.filter(c => c.name !== word.name);
      color = otherColors[Math.floor(Math.random() * otherColors.length)];
    }

    setWordItem(word);
    setColorItem(color);

    // Set countdown timer based on active level
    if (level === 2) {
      setTimeLeft(5.0);
    } else if (level === 3) {
      setTimeLeft(3.0);
    } else if (level === 4) {
      setTimeLeft(2.0);
    } else {
      setTimeLeft(0);
    }

    roundStartTimeRef.current = Date.now();
  };

  // Start countdown before the game loop
  const startGame = () => {
    setCorrectAnswers(0);
    setReactionTimes([]);
    setCurrentRound(1);
    setCountdown(3);
    setGameState('countdown');
  };

  // Countdown timer handler
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown === 0) {
      setGameState('playing');
      nextRoundSetup();
      playSound('start');
      return;
    }

    const timer = setTimeout(() => {
      playSound('tick');
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState, countdown]);

  // Timer countdown tick effect for Level 2 and Level 3
  useEffect(() => {
    if (gameState !== 'playing' || level === 1) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          return 0;
        }
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, level, currentRound]);

  // Handle timeout when timeLeft hits 0
  useEffect(() => {
    if (gameState !== 'playing' || level === 1) return;
    if (timeLeft === 0) {
      handleAnswer(null);
    }
  }, [timeLeft, gameState, level]);

  // Play ticking sound on low time (below 2 seconds)
  useEffect(() => {
    if (gameState !== 'playing' || level === 1) return;
    
    const ticks = [2.0, 1.5, 1.0, 0.5];
    if (ticks.includes(timeLeft)) {
      playSound('tick');
    }
  }, [timeLeft, gameState, level]);

  // Handle user's tap decision
  const handleAnswer = (choice: StroopColor | null) => {
    if (gameState !== 'playing') return;

    const maxRt = level === 2 ? 5000 : level === 3 ? 3000 : level === 4 ? 2000 : 0;
    const rt = choice === null ? maxRt : (Date.now() - roundStartTimeRef.current);
    
    // Determine the expected answer based on the active rule
    const expectedColor = activeRule === 'WORT' ? wordItem : colorItem;
    const isCorrect = choice !== null && choice.name === expectedColor.name;

    if (isCorrect) {
      playSound('correct');
      setCorrectAnswers((prev) => prev + 1);
      setFlashFeedback('correct');
    } else {
      playSound('wrong');
      setFlashFeedback('wrong');
    }

    setReactionTimes((prev) => [...prev, rt]);

    // Clear border feedback after 200ms
    setTimeout(() => {
      setFlashFeedback(null);
    }, 200);

    // Transition or next round
    if (currentRound >= 20) {
      setTimeout(() => {
        setGameState('summary');
        playSound('complete');
        if (!challengeMode && onTrainingComplete) {
          onTrainingComplete(correctAnswers);
        }
      }, 250);
    } else {
      setCurrentRound((prev) => prev + 1);
      nextRoundSetup();
    }
  };

  // Calculate stats
  const averageReactionTime = reactionTimes.length > 0 
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;
  
  const accuracy = Math.round((correctAnswers / 20) * 100);

  return (
    <div className="space-y-6 relative">
      {/* SHINY FEEDBACK FLASH BORDERS */}
      {flashFeedback === 'correct' && (
        <div className="absolute inset-0 border-[6px] border-emerald-500/80 rounded-3xl pointer-events-none z-50 transition-all duration-75" />
      )}
      {flashFeedback === 'wrong' && (
        <div className="absolute inset-0 border-[6px] border-rose-500/80 rounded-3xl pointer-events-none z-50 transition-all duration-75" />
      )}

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
            <Zap className="w-3.5 h-3.5" />
            <span>Kognitive Flexibilität</span>
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
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">Control (Stroop-Test)</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Schult die Fähigkeit, einen körperlichen Impuls zu kontrollieren (Inhibitorische Kontrolle). Torhüter müssen im Bruchteil einer Sekunde irreführende visuelle Impulse unterdrücken und die richtige Entscheidung treffen.
              </p>
            </div>

            {/* FIXED HARD LEVEL BADGE */}
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase">
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Schwerste Herausforderung (Fixiert)</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                <strong>Level 4 (Extremer Zeitdruck - 2s)</strong> mit <strong>Stroboskop-Effekt</strong>.
              </p>
            </div>

            <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
              <span className="block text-[10px] font-mono font-bold uppercase text-pink-400 tracking-wider">
                Spielregeln & Levels:
              </span>

              <div className="space-y-3.5 text-xs">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-[10px]">1</span>
                  <p className="text-slate-300 leading-normal">
                    <strong>Regelwechsel beachten:</strong> Achte ganz genau auf das Feld ganz oben.
                    <br />
                    • Zeigt es <span className="text-orange-400 font-bold uppercase">WORT</span>, musst du das geschriebene Wort antippen.
                    <br />
                    • Zeigt es <span className="text-blue-400 font-bold uppercase">FARBE</span>, musst du die eigentliche Schriftfarbe antippen.
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">2</span>
                  <p className="text-slate-300 leading-normal">
                    <strong>Interferenz widerstehen:</strong> Wort und Farbe stimmen meistens nicht überein (z. B. steht das Wort "ROT" in blauem Text). Lass dich nicht verwirren!
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-pink-400 text-[10px]">3</span>
                  <div className="text-slate-300 leading-normal space-y-1">
                    <strong>Wähle dein Level (Zeitdruck):</strong>
                    <div>• <strong className="text-emerald-400">Level 1:</strong> Ohne Zeitdruck. Ideal zum Kennenlernen.</div>
                    <div>• <strong className="text-blue-400">Level 2:</strong> Maximal 5 Sekunden pro Antwort. Bei Zeitablauf gilt die Antwort als falsch. Unterstützt durch akustisches Ticken bei Zeitnot.</div>
                    <div>• <strong className="text-amber-400">Level 3:</strong> Maximal 3 Sekunden pro Antwort für echte Profi-Reaktion.</div>
                    <div>• <strong className="text-rose-500 font-bold">Level 4:</strong> Extremer Zeitdruck von maximal 2 Sekunden pro Antwort für pure Reflexe unter Hochspannung.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2 text-center">
              <p className="text-[10px] text-slate-500 leading-normal font-sans">
                Erreiche eine möglichst hohe Genauigkeit und versuche, die 20 Runden fehlerfrei zu absolvieren!
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={startGame}
                className="px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-2xl text-sm uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Training Starten</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* 3, 2, 1 COUNTDOWN */}
        {gameState === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
          >
            <span className="text-[10px] text-slate-500 font-mono uppercase font-black tracking-widest mb-4">Bereitmachen</span>
            <motion.span
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-8xl font-black text-pink-400 font-mono"
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}

        {/* ACTIVE GAME PLAYING */}
        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 max-w-md mx-auto relative"
          >
            {/* STROBOSCOPIC BLACKOUT OVERLAY */}
            {strobeActive && (
              <div className="absolute inset-0 bg-black z-50 pointer-events-none transition-opacity duration-75 rounded-3xl" />
            )}
            {/* ROUND PROGRESS BAR */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Runde {currentRound} / 20</span>
              <span className="text-emerald-400 font-bold">Richtig: {correctAnswers}</span>
            </div>
            
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 transition-all duration-150"
                style={{ width: `${(currentRound / 20) * 100}%` }}
              />
            </div>

            {/* LEVEL TIMER BAR */}
            {level !== 1 && (
              <div className="space-y-1.5 p-3.5 bg-slate-950/50 border border-slate-850 rounded-2xl">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 font-bold">⏱ VERBLEIBENDE ZEIT</span>
                  <span className={`font-black tracking-widest text-sm transition-colors ${timeLeft <= 1.5 ? 'text-rose-500 animate-pulse' : 'text-blue-400'}`}>
                    {timeLeft.toFixed(1)}s
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div 
                    className={`h-full transition-all duration-100 ease-linear ${timeLeft <= 1.5 ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${(timeLeft / (level === 2 ? 5.0 : level === 3 ? 3.0 : 2.0)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* DYNAMIC ACTIVE RULE BANNER */}
            <div className="text-center">
              <AnimatePresence mode="wait">
                {activeRule === 'FARBE' ? (
                  <motion.div
                    key="rule-farbe"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="inline-flex flex-col items-center px-6 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl font-mono"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500/70">Aktion</span>
                    <span className="text-base font-black uppercase tracking-widest">Wähle die FARBE!</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="rule-wort"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="inline-flex flex-col items-center px-6 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl font-mono"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/70">Aktion</span>
                    <span className="text-base font-black uppercase tracking-widest">Lies das WORT!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* THE CENTRAL STIMULUS WORD */}
            <div className="h-44 bg-slate-950 border border-slate-850 rounded-3xl flex items-center justify-center shadow-inner relative overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={`${currentRound}-${wordItem.name}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-4xl md:text-5xl font-black tracking-widest select-none"
                  style={{ color: colorItem.hex }}
                >
                  {wordItem.name}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* INPUT SELECTION BUTTONS */}
            <div className="grid grid-cols-2 gap-4">
              {STROOP_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => handleAnswer(color)}
                  className="py-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-black text-lg font-mono rounded-2xl tracking-widest transition-all transform active:scale-95 cursor-pointer shadow-md"
                >
                  {color.name}
                </button>
              ))}
            </div>

            {/* SUBTLE CHEATSHEET */}
            <p className="text-center text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              {activeRule === 'WORT' 
                ? 'Ignoriere die Farbe! Drücke das geschriebene Wort.' 
                : 'Ignoriere das Wort! Drücke die Farbe der Schrift.'}
            </p>
          </motion.div>
        )}

        {/* SUMMARY SCREEN */}
        {gameState === 'summary' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 text-center max-w-md mx-auto"
          >
            <div className="flex justify-center">
              {accuracy >= 95 ? (
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
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
                {accuracy >= 95 ? 'Hervorragende Impulskontrolle!' : 'Bleib am Ball!'}
              </h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                {accuracy >= 95 
                  ? 'Exzellente Leistung! Du hast den Stroop-Test gemeistert und die 95% Genauigkeitsquote übertroffen. Dein Gehirn filtert Störfaktoren perfekt aus.'
                  : 'Kopf hoch! Der Farbrausch erfordert extrem schnelle Reaktionen und fehlerfreie Impulskontrolle. Das ständige Umschalten zwischen Wort und Farbe ist anspruchsvoll. Gleich noch eine Runde versuchen!'}
              </p>
            </div>

            {/* STATISTICS STATS CARDS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="block text-[10px] text-slate-500 uppercase font-mono tracking-wider">Genauigkeit</span>
                <span className="block text-2xl font-black text-white font-mono mt-1">{accuracy}%</span>
                <span className="block text-[9px] text-slate-400 mt-0.5">{correctAnswers} von 20 richtig</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="block text-[10px] text-slate-500 uppercase font-mono tracking-wider">ø Reaktionszeit</span>
                <span className="block text-2xl font-black text-white font-mono mt-1">{averageReactionTime} ms</span>
                <span className="block text-[9px] text-slate-400 mt-0.5">Visuelle Latenz</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center space-y-2">
              <p className="text-[10px] text-slate-400 font-sans leading-normal">
                Mach direkt noch einen Versuch, um deine Aufmerksamkeit, Impulskontrolle und kognitive Schnelligkeit weiter auszubauen!
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              {challengeMode ? (
                <button
                  onClick={() => challengeMode.onComplete(correctAnswers, {
                    correctAnswers,
                    averageReactionTime,
                    accuracy,
                    level
                  })}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Wettkampf-Ergebnis einreichen</span>
                </button>
              ) : (
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Erneut Trainieren</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
