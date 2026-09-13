import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, increment, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Competition, hasModulePermission } from '../types';
import { getUserLevelQuizzes } from '../utils/levelQuizzes';
import { Swords, Trophy, Sparkles, Brain, Lock, ArrowLeft, Timer, AlertCircle, Check, Play, ExternalLink, RefreshCw, Video, Zap, Eye, EyeOff, Target, User, CheckCircle2, XCircle, Calendar, Shield, Users, Activity, HelpCircle, BookOpen, RotateCcw } from 'lucide-react';
import VideoAnalysis from './VideoAnalysis';
import ReactionGrid from './ReactionGrid';
import AttentionDivided from './AttentionDivided';
import Blitzmerker from './Blitzmerker';
import Farbrausch from './Farbrausch';
import Memobox from './Memobox';
import Solitaria from './Solitaria';
import MindArchitect from './MindArchitect';
import Flights from './Flights';
import TargetStriking from './TargetStriking';
import EyeFocus from './EyeFocus';
import Peripherie from './Peripherie';
import PeripherieZaehler from './PeripherieZaehler';
import ReflexFocus from './ReflexFocus';
import StabilityFocus from './StabilityFocus';

interface CompetitionsProps {
  userProfile: UserProfile;
  onUpdatePoints: (newPoints: number, newPointsByCategory: any) => void;
}

export default function Competitions({ userProfile, onUpdatePoints }: CompetitionsProps) {
  const [activeView, setActiveView] = useState<'menu' | 'training' | 'challenge' | 'seilspringen' | 'quiz' | 'coming_soon' | 'freestoss' | 'elfmeter' | 'offensiv_training' | 'gleichgewicht_training' | 'neuro_training' | 'torwart_athletik_training' | 'kognitionsspiele' | 'kognitionsspiele_wettkampf' | 'reaction_grid' | 'attention_divided' | 'blitzmerker' | 'farbrausch' | 'memobox' | 'solitaria' | 'mind_architect' | 'flights' | 'target_striking' | 'eye_focus' | 'peripherie' | 'peripherie_zaehler' | 'kognition_ball' | 'reflex_focus' | 'stability_focus' | 'whatsnext' | 'coaching' | 'kognition_tutorial' | 'mental_training'>('menu');
  const [comingSoonLabel, setComingSoonLabel] = useState('');
  const [cogTab, setCogTab] = useState<'hints' | 'videos'>('hints');
  const [twAthletikTab, setTwAthletikTab] = useState<'antritt' | 'schnelle_beine' | 'explosivitaet' | 'beweglichkeit' | 'gleichgewicht'>('antritt');
  const [mentalTab, setMentalTab] = useState<'selbstvertrauen' | 'fokus' | 'externe_faktoren' | 'fehler'>('selbstvertrauen');
  
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainingVideoLinks, setTrainingVideoLinks] = useState<Record<string, any>>({});
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Quiz active state
  const [activeQuiz, setActiveQuiz] = useState<Competition | null>(null);
  const [quizTimer, setQuizTimer] = useState<number>(30);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);
  const [quizCompletedIds, setQuizCompletedIds] = useState<Set<string>>(new Set());
  const [userSubmissions, setUserSubmissions] = useState<Record<string, { answeredIndex: number; correct: boolean }>>({});
  const [viewOnlyMode, setViewOnlyMode] = useState<boolean>(false);

  // Challenge states
  const [activeChallenge, setActiveChallenge] = useState<{
    isCreating: boolean;
    isAnswering: boolean;
    opponentId?: string;
    opponentName?: string;
    opponentGroup?: string;
    gameId: string;
    gameName: string;
    challengerScore?: number;
    challengerStats?: any;
    challengeId?: string;
    gameSettings?: any;
  } | null>(null);

  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengesLoading, setChallengesLoading] = useState<boolean>(false);

  // New challenge creation form states
  const [selectedOpponentGroup, setSelectedOpponentGroup] = useState<'Alle Keeper' | 'externe keeper' | 'Eigener Verein'>('Alle Keeper');
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('all');
  const [selectedGameId, setSelectedGameId] = useState<string>('reaction_grid');
  
  // Game settings form states
  const [gameSettingsGridSize, setGameSettingsGridSize] = useState<number>(5);
  const [gameSettingsGameMode, setGameSettingsGameMode] = useState<'numbers' | 'letters' | 'colors'>('numbers');
  const [gameSettingsStrobe, setGameSettingsStrobe] = useState<'off' | 'slow' | 'fast'>('off');
  const [gameSettingsLevel, setGameSettingsLevel] = useState<number>(1);

  // Multi-round state tracking
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [roundStatsList, setRoundStatsList] = useState<any[]>([]);
  const [gameKey, setGameKey] = useState<number>(0);
  const [showRoundOverlay, setShowRoundOverlay] = useState<boolean>(false);

  // Challenge results summary overlay
  const [lastChallengeResult, setLastChallengeResult] = useState<{
    gameName: string;
    challengerName: string;
    challengerScore: number;
    opponentName: string;
    opponentScore: number;
    winnerName: string;
    winCriteria: string;
    challengerBetter: boolean;
    statsComparison: { label: string; challengerVal: string; opponentVal: string }[];
  } | null>(null);

  // Training stats for regular training (saving highscore and play counter)
  const [trainingStats, setTrainingStats] = useState<Record<string, { bestScore: number; playCount: number }>>({});

  const loadTrainingStats = async () => {
    if (!userProfile?.uid) return;
    try {
      const q = query(
        collection(db, 'kognitionsspiele_training_stats'),
        where('userId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      const statsMap: Record<string, { bestScore: number; playCount: number }> = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.gameId) {
          statsMap[data.gameId] = {
            bestScore: data.bestScore || 0,
            playCount: data.playCount || 0
          };
        }
      });
      setTrainingStats(statsMap);
    } catch (err) {
      console.error('Error fetching training stats:', err);
    }
  };

  const [neuroStats, setNeuroStats] = useState<Record<string, { playCount: number }>>({});

  const loadNeuroStats = async () => {
    if (!userProfile?.uid) return;
    try {
      const q = query(
        collection(db, 'neuroathletik_training_stats'),
        where('userId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      const statsMap: Record<string, { playCount: number }> = {};
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.gameId) {
          statsMap[data.gameId] = {
            playCount: data.playCount || 0
          };
        }
      });
      setNeuroStats(statsMap);
    } catch (err) {
      console.error('Error fetching neuro stats:', err);
    }
  };

  useEffect(() => {
    if (activeView === 'kognitionsspiele' && userProfile?.uid) {
      loadTrainingStats();
    }
  }, [activeView, userProfile?.uid]);

  useEffect(() => {
    if ((activeView === 'neuro_training' || activeView === 'reflex_focus' || activeView === 'stability_focus') && userProfile?.uid) {
      loadNeuroStats();
    }
  }, [activeView, userProfile?.uid]);

  // Scroll to top when changing views
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeView]);

  const handleNeuroTrainingComplete = async (gameId: string) => {
    if (!userProfile?.uid) return;
    try {
      const statsDocRef = doc(db, 'neuroathletik_training_stats', `${userProfile.uid}_${gameId}`);
      const docSnap = await getDoc(statsDocRef);

      let playCount = 1;

      if (docSnap.exists()) {
        const currentData = docSnap.data();
        playCount = (currentData.playCount || 0) + 1;
      } else {
        playCount = 1;
      }

      await setDoc(statsDocRef, {
        userId: userProfile.uid,
        gameId: gameId,
        playCount: playCount,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await loadNeuroStats();
      console.log(`Neuroathletik stats updated for ${gameId}. Playcount: ${playCount}`);
    } catch (err) {
      console.error(`Error updating neuroathletik stats for ${gameId}:`, err);
    }
  };

  const handleResetNeuroStats = async (gameId: string) => {
    if (!userProfile?.uid) return;
    try {
      const statsDocRef = doc(db, 'neuroathletik_training_stats', `${userProfile.uid}_${gameId}`);
      await setDoc(statsDocRef, {
        userId: userProfile.uid,
        gameId: gameId,
        playCount: 0,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await loadNeuroStats();
      console.log(`Neuroathletik stats reset for ${gameId}.`);
    } catch (err) {
      console.error(`Error resetting neuroathletik stats for ${gameId}:`, err);
    }
  };

  const handleTrainingComplete = async (gameId: string, score: number) => {
    if (!userProfile?.uid) return;
    try {
      const statsDocRef = doc(db, 'kognitionsspiele_training_stats', `${userProfile.uid}_${gameId}`);
      const docSnap = await getDoc(statsDocRef);

      let isNewBest = false;
      let newBest = score;
      let playCount = 1;

      if (docSnap.exists()) {
        const currentData = docSnap.data();
        const currentBest = currentData.bestScore;
        playCount = (currentData.playCount || 0) + 1;

        if (currentBest !== undefined) {
          if (gameId === 'solitaria' || gameId === 'flights') {
            isNewBest = score < currentBest;
            newBest = isNewBest ? score : currentBest;
          } else {
            isNewBest = score > currentBest;
            newBest = isNewBest ? score : currentBest;
          }
        } else {
          isNewBest = true;
          newBest = score;
        }
      } else {
        isNewBest = true;
        playCount = 1;
        newBest = score;
      }

      await setDoc(statsDocRef, {
        userId: userProfile.uid,
        gameId: gameId,
        bestScore: newBest,
        playCount: playCount,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await loadTrainingStats();
      console.log(`Training stats updated for ${gameId}. Playcount: ${playCount}, Best Score: ${newBest}`);
    } catch (err) {
      console.error(`Error updating training stats for ${gameId}:`, err);
    }
  };

  // Load challenges from Firestore
  const loadChallenges = async () => {
    setChallengesLoading(true);
    try {
      const snap = await getDocs(collection(db, 'kognitionsspiele_challenges'));
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => b.createdAt?.localeCompare(a.createdAt) || 0);
      setChallenges(list);
    } catch (err) {
      console.error('Error loading challenges:', err);
    } finally {
      setChallengesLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'kognitionsspiele_wettkampf') {
      loadChallenges();
    }
  }, [activeView]);

  // Handle game completions in challenge modes
  const handleChallengeGameComplete = async (score: number, stats: any) => {
    if (!activeChallenge) return;

    const gameId = activeChallenge.gameId;
    const isMultiRound = gameId === 'attention_divided' || gameId === 'blitzmerker' || gameId === 'flights';
    const maxRounds = gameId === 'attention_divided' ? 3 : gameId === 'blitzmerker' ? 5 : gameId === 'flights' ? 3 : 1;

    if (isMultiRound && currentRoundIndex < maxRounds - 1) {
      const nextRound = currentRoundIndex + 1;
      setCurrentRoundIndex(nextRound);
      setRoundScores([...roundScores, score]);
      setRoundStatsList([...roundStatsList, stats]);
      setGameKey((prev) => prev + 1);
      setShowRoundOverlay(true);
      return;
    }

    let finalScore = score;
    let finalStats = stats;

    if (isMultiRound) {
      const allScores = [...roundScores, score];
      const allStats = [...roundStatsList, stats];

      if (gameId === 'attention_divided') {
        finalScore = allScores.reduce((a, b) => a + b, 0);
        finalStats = {
          scores: allScores,
          totalScore: finalScore,
          avgAccuracy: allStats.reduce((a, b) => a + (b.accuracy || 100), 0) / maxRounds,
          level: stats.level
        };
      } else if (gameId === 'blitzmerker') {
        finalScore = allScores.reduce((a, b) => a + b, 0);
        finalStats = {
          scores: allScores,
          totalScore: finalScore,
          level: stats.level
        };
      } else if (gameId === 'flights') {
        finalScore = allScores.reduce((a, b) => a + b, 0) / maxRounds;
        finalStats = {
          scores: allScores,
          avgTemporal: finalScore,
          avgSpatial: allStats.reduce((a, b) => a + (b.avgSpatial || 0), 0) / maxRounds
        };
      }
    }

    setCurrentRoundIndex(0);
    setRoundScores([]);
    setRoundStatsList([]);

    if (activeChallenge.isCreating) {
      try {
        if (activeChallenge.challengeId) {
          await updateDoc(doc(db, 'kognitionsspiele_challenges', activeChallenge.challengeId), {
            challengerScore: finalScore,
            challengerStats: finalStats,
            status: 'open'
          });
          alert(`Herausforderung erfolgreich an ${activeChallenge.opponentName} gesendet!`);
        }
      } catch (err) {
        console.error('Error saving challenge:', err);
      }
      setActiveChallenge(null);
      setActiveView('kognitionsspiele_wettkampf');
    } else if (activeChallenge.isAnswering && activeChallenge.challengeId) {
      const challengerScore = activeChallenge.challengerScore!;
      const challengerStats = activeChallenge.challengerStats;
      const oppScore = finalScore;
      const oppStats = finalStats;

      let winnerId = '';
      let winnerName = '';
      let winCriteriaText = '';
      let statsComparisonList: any[] = [];

      if (gameId === 'reaction_grid') {
        const chalScore = challengerScore;
        const opScore = oppScore;
        const chalTime = challengerStats.avgTime || challengerStats.averageReactionTime || 999;
        const opTime = oppStats.avgTime || oppStats.averageReactionTime || 999;

        winCriteriaText = 'Höhere Trefferanzahl (bei Gleichstand geringere Reaktionszeit)';
        statsComparisonList = [
          { label: 'Trefferanzahl', challengerVal: `${chalScore}`, opponentVal: `${opScore}` },
          { label: 'Ø Reaktionszeit', challengerVal: `${chalTime.toFixed(2)}s`, opponentVal: `${opTime.toFixed(2)}s` }
        ];

        if (opScore > chalScore) {
          winnerId = userProfile.uid;
          winnerName = userProfile.name;
        } else if (chalScore > opScore) {
          winnerId = activeChallenge.opponentId!;
          winnerName = activeChallenge.opponentName!;
        } else {
          if (opTime < chalTime) {
            winnerId = userProfile.uid;
            winnerName = userProfile.name;
          } else if (chalTime < opTime) {
            winnerId = activeChallenge.opponentId!;
            winnerName = activeChallenge.opponentName!;
          } else {
            winnerId = 'tie';
            winnerName = 'Unentschieden';
          }
        }
      } else if (gameId === 'attention_divided') {
        winCriteriaText = 'Höhere Trefferanzahl über 3 Runden';
        statsComparisonList = [
          { label: 'Trefferanzahl gesamt', challengerVal: `${challengerScore}`, opponentVal: `${oppScore}` },
          { label: 'Ø Genauigkeit', challengerVal: `${(challengerStats.avgAccuracy || 100).toFixed(0)}%`, opponentVal: `${(oppStats.avgAccuracy || 100).toFixed(0)}%` }
        ];

        if (oppScore > challengerScore) {
          winnerId = userProfile.uid;
          winnerName = userProfile.name;
        } else if (challengerScore > oppScore) {
          winnerId = activeChallenge.opponentId!;
          winnerName = activeChallenge.opponentName!;
        } else {
          winnerId = 'tie';
          winnerName = 'Unentschieden';
        }
      } else if (gameId === 'blitzmerker') {
        winCriteriaText = 'Mehr korrekte Antworten';
        statsComparisonList = [
          { label: 'Trefferanzahl gesamt', challengerVal: `${challengerScore} / 5`, opponentVal: `${oppScore} / 5` }
        ];

        if (oppScore > challengerScore) {
          winnerId = userProfile.uid;
          winnerName = userProfile.name;
        } else if (challengerScore > oppScore) {
          winnerId = activeChallenge.opponentId!;
          winnerName = activeChallenge.opponentName!;
        } else {
          winnerId = 'tie';
          winnerName = 'Unentschieden';
        }
      } else if (gameId === 'farbrausch') {
        const chalAcc = challengerStats.accuracy || 0;
        const opAcc = oppStats.accuracy || 0;
        const chalTime = challengerStats.avgTime || challengerStats.averageReactionTime || 999;
        const opTime = oppStats.avgTime || oppStats.averageReactionTime || 999;

        winCriteriaText = 'Höhere Genauigkeit (bei Gleichstand geringere Ø Reaktionszeit)';
        statsComparisonList = [
          { label: 'Genauigkeit', challengerVal: `${chalAcc.toFixed(0)}%`, opponentVal: `${opAcc.toFixed(0)}%` },
          { label: 'Ø Reaktionszeit', challengerVal: `${chalTime.toFixed(2)}s`, opponentVal: `${opTime.toFixed(2)}s` }
        ];

        if (opAcc > chalAcc) {
          winnerId = userProfile.uid;
          winnerName = userProfile.name;
        } else if (chalAcc > opAcc) {
          winnerId = activeChallenge.opponentId!;
          winnerName = activeChallenge.opponentName!;
        } else {
          if (opTime < chalTime) {
            winnerId = userProfile.uid;
            winnerName = userProfile.name;
          } else if (chalTime < opTime) {
            winnerId = activeChallenge.opponentId!;
            winnerName = activeChallenge.opponentName!;
          } else {
            winnerId = 'tie';
            winnerName = 'Unentschieden';
          }
        }
      } else if (gameId === 'memobox') {
        winCriteriaText = 'Mehr fehlerfreie Runden';
        statsComparisonList = [
          { label: 'Fehlerfreie Runden', challengerVal: `${challengerScore} / 3`, opponentVal: `${oppScore} / 3` }
        ];

        if (oppScore > challengerScore) {
          winnerId = userProfile.uid;
          winnerName = userProfile.name;
        } else if (challengerScore > oppScore) {
          winnerId = activeChallenge.opponentId!;
          winnerName = activeChallenge.opponentName!;
        } else {
          winnerId = 'tie';
          winnerName = 'Unentschieden';
        }
      } else if (gameId === 'solitaria') {
        winCriteriaText = 'Geringere Gesamtzeit (Suchzeit + Fehlerstrafen)';
        statsComparisonList = [
          { label: 'Gesamtzeit', challengerVal: `${challengerScore.toFixed(1)}s`, opponentVal: `${oppScore.toFixed(1)}s` },
          { label: 'Reine Suchzeit', challengerVal: `${(challengerStats.elapsedTime || 0).toFixed(1)}s`, opponentVal: `${(oppStats.elapsedTime || 0).toFixed(1)}s` },
          { label: 'Fehlversuche', challengerVal: `${challengerStats.errors || 0}`, opponentVal: `${oppStats.errors || 0}` }
        ];

        if (oppScore < challengerScore) {
          winnerId = userProfile.uid;
          winnerName = userProfile.name;
        } else if (challengerScore < oppScore) {
          winnerId = activeChallenge.opponentId!;
          winnerName = activeChallenge.opponentName!;
        } else {
          winnerId = 'tie';
          winnerName = 'Unentschieden';
        }
      } else if (gameId === 'mind_architect') {
        const chalScore = challengerScore;
        const opScore = oppScore;
        const chalTime = parseFloat(challengerStats.avgSpeed || '99');
        const opTime = parseFloat(oppStats.avgSpeed || '99');

        winCriteriaText = 'Mehr gelöste Abweichungen (bei Gleichstand geringeres Ø Tempo)';
        statsComparisonList = [
          { label: 'Abweichungen', challengerVal: `${chalScore}`, opponentVal: `${opScore}` },
          { label: 'Ø Tempo', challengerVal: `${chalTime.toFixed(2)}s`, opponentVal: `${opTime.toFixed(2)}s` }
        ];

        if (opScore > chalScore) {
          winnerId = userProfile.uid;
          winnerName = userProfile.name;
        } else if (chalScore > opScore) {
          winnerId = activeChallenge.opponentId!;
          winnerName = activeChallenge.opponentName!;
        } else {
          if (opTime < chalTime) {
            winnerId = userProfile.uid;
            winnerName = userProfile.name;
          } else if (chalTime < opTime) {
            winnerId = activeChallenge.opponentId!;
            winnerName = activeChallenge.opponentName!;
          } else {
            winnerId = 'tie';
            winnerName = 'Unentschieden';
          }
        }
      } else if (gameId === 'flights') {
        winCriteriaText = 'Geringere durchschnittliche Zeitabweichung (Timing-Fehler)';
        statsComparisonList = [
          { label: 'Ø Timing-Fehler', challengerVal: `${challengerScore.toFixed(0)} ms`, opponentVal: `${oppScore.toFixed(0)} ms` },
          { label: 'Ø Abweichung', challengerVal: `${(challengerStats.avgSpatial || 0).toFixed(0)} px`, opponentVal: `${(oppStats.avgSpatial || 0).toFixed(0)} px` }
        ];

        if (oppScore < challengerScore) {
          winnerId = userProfile.uid;
          winnerName = userProfile.name;
        } else if (challengerScore < oppScore) {
          winnerId = activeChallenge.opponentId!;
          winnerName = activeChallenge.opponentName!;
        } else {
          winnerId = 'tie';
          winnerName = 'Unentschieden';
        }
      }

      if (winnerId === userProfile.uid) {
        try {
          const userRef = doc(db, 'users', userProfile.uid);
          const nextKognition = (userProfile.pointsByCategory?.Kognition || 0) + 1;
          await updateDoc(userRef, {
            points: increment(1),
            [`pointsByCategory.Kognition`]: nextKognition
          });

          // Add point log
          await addDoc(collection(db, 'point_logs'), {
            userId: userProfile.uid,
            points: 1,
            category: 'Kognition',
            action: `Duell gewonnen gegen ${activeChallenge.opponentName}: "${activeChallenge.gameName}"`,
            date: new Date().toISOString().split('T')[0]
          });
        } catch (err) {
          console.error('Error updating winner user profile in DB:', err);
        }

        const updatedPoints = (userProfile.points || 0) + 1;
        const updatedPointsByCategory = { ...(userProfile.pointsByCategory || {}) };
        updatedPointsByCategory['Kognition'] = (updatedPointsByCategory['Kognition'] || 0) + 1;
        onUpdatePoints(updatedPoints, updatedPointsByCategory);
      } else if (winnerId === activeChallenge.opponentId) {
        try {
          const challengerDocRef = doc(db, 'users', activeChallenge.opponentId!);
          const challengerSnap = await getDoc(challengerDocRef);
          if (challengerSnap.exists()) {
            const data = challengerSnap.data();
            const currentPoints = data.points || 0;
            const currentPointsByCategory = data.pointsByCategory || {};
            const nextKognition = (currentPointsByCategory['Kognition'] || 0) + 1;

            await updateDoc(challengerDocRef, {
              points: currentPoints + 1,
              [`pointsByCategory.Kognition`]: nextKognition
            });

            // Add point log for challenger
            await addDoc(collection(db, 'point_logs'), {
              userId: activeChallenge.opponentId!,
              points: 1,
              category: 'Kognition',
              action: `Duell gewonnen gegen ${userProfile.name}: "${activeChallenge.gameName}"`,
              date: new Date().toISOString().split('T')[0]
            });
          }
        } catch (err) {
          console.error('Error updating challenger points:', err);
        }
      }

      try {
        await updateDoc(doc(db, 'kognitionsspiele_challenges', activeChallenge.challengeId), {
          opponentId: userProfile.uid,
          opponentName: userProfile.name,
          opponentScore: oppScore,
          opponentStats: oppStats,
          status: 'completed',
          winnerId,
          winnerName,
          completedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error updating challenge document:', err);
      }

      setLastChallengeResult({
        gameName: activeChallenge.gameName,
        challengerName: activeChallenge.opponentName!,
        challengerScore: challengerScore,
        opponentName: userProfile.name,
        opponentScore: oppScore,
        winnerName,
        winCriteria: winCriteriaText,
        challengerBetter: winnerId === activeChallenge.opponentId,
        statsComparison: statsComparisonList
      });

      setActiveChallenge(null);
      setActiveView('kognitionsspiele_wettkampf');
    }
  };

  const getGameNameById = (id: string) => {
    switch (id) {
      case 'reaction_grid': return 'Reaction Grid';
      case 'attention_divided': return 'Attention Divided';
      case 'blitzmerker': return 'Blitzmerker';
      case 'farbrausch': return 'Farbrausch';
      case 'memobox': return 'Memobox';
      case 'solitaria': return 'Solitaria';
      case 'mind_architect': return 'Mind Architect';
      case 'flights': return 'Flights';
      default: return id;
    }
  };

  // Load competitions data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const querySnap = await getDocs(collection(db, 'competitions'));
        const list: Competition[] = [];
        querySnap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Competition);
        });
        setCompetitions(list);

        // Fetch content config for special training views
        const contentSnap = await getDoc(doc(db, 'config', 'contents'));
        if (contentSnap.exists()) {
          setTrainingVideoLinks(contentSnap.data() || {});
        }

        // Fetch users to display names
        const usersSnap = await getDocs(collection(db, 'users'));
        const uList: UserProfile[] = [];
        usersSnap.forEach((doc) => {
          uList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setUsersList(uList);

        // Load user's quiz submissions to know which are completed
        const quizSnap = await getDocs(collection(db, `users/${userProfile.uid}/quiz_submissions`));
        const doneSet = new Set<string>();
        const subs: Record<string, { answeredIndex: number; correct: boolean }> = {};
        quizSnap.forEach((doc) => {
          doneSet.add(doc.id);
          subs[doc.id] = doc.data() as any;
        });
        setQuizCompletedIds(doneSet);
        setUserSubmissions(subs);

      } catch (err) {
        console.error('Error fetching competitions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userProfile.uid, activeView]);

  // Quiz timer count down
  useEffect(() => {
    if (!activeQuiz || quizAnswered || viewOnlyMode) return;

    if (quizTimer === 0) {
      // Auto submit incorrect when timer hits 0
      handleAnswerQuiz(-1);
      return;
    }

    const timer = setTimeout(() => {
      setQuizTimer(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeQuiz, quizTimer, quizAnswered, viewOnlyMode]);

  // Alert block if user tries to leave the active quiz page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeQuiz && !quizAnswered && !viewOnlyMode) {
        e.preventDefault();
        e.returnValue = 'Beantworte erst die Frage! Du verlierst sonst deinen Versuch.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeQuiz, quizAnswered, viewOnlyMode]);

  // Unmount abandon lock: auto-submit as incorrect if user navigates away
  useEffect(() => {
    return () => {
      if (activeQuiz && !quizAnswered && !viewOnlyMode) {
        const todayStr = new Date().toISOString().split('T')[0];
        setDoc(doc(db, `users/${userProfile.uid}/quiz_submissions`, activeQuiz.id), {
          answeredIndex: -1,
          correct: false,
          date: todayStr,
          abandoned: true
        }).catch(err => console.error('Error logging quiz abandon:', err));
      }
    };
  }, [activeQuiz, quizAnswered, viewOnlyMode, userProfile.uid]);

  const handleStartQuiz = (quiz: Competition) => {
    setActiveQuiz(quiz);
    setQuizTimer(30);
    setQuizAnswered(false);
    setSelectedQuizIndex(null);
    setViewOnlyMode(false);
  };

  const handleResetQuizStatus = async (quizId: string) => {
    if (!userProfile) return;
    try {
      await deleteDoc(doc(db, `users/${userProfile.uid}/quiz_submissions`, quizId));
      setQuizCompletedIds(prev => {
        const next = new Set(prev);
        next.delete(quizId);
        return next;
      });
      setUserSubmissions(prev => {
        const next = { ...prev };
        delete next[quizId];
        return next;
      });
      if (activeQuiz && activeQuiz.id === quizId) {
        setQuizAnswered(false);
        setSelectedQuizIndex(null);
        setViewOnlyMode(false);
        setQuizTimer(30);
      }
    } catch (err) {
      console.error('Error resetting quiz submission:', err);
    }
  };

  const handleResetAllQuizSubmissions = async () => {
    if (!userProfile) return;
    try {
      const quizSnap = await getDocs(collection(db, `users/${userProfile.uid}/quiz_submissions`));
      const deletePromises: Promise<void>[] = [];
      quizSnap.forEach((d) => {
        deletePromises.push(deleteDoc(doc(db, `users/${userProfile.uid}/quiz_submissions`, d.id)));
      });
      await Promise.all(deletePromises);
      setQuizCompletedIds(new Set());
      setUserSubmissions({});
      if (activeQuiz) {
        setQuizAnswered(false);
        setSelectedQuizIndex(null);
        setViewOnlyMode(false);
        setQuizTimer(30);
      }
    } catch (err) {
      console.error('Error resetting all quiz submissions:', err);
    }
  };

  const handleAnswerQuiz = async (answerIndex: number) => {
    if (!activeQuiz || quizAnswered) return;

    setQuizAnswered(true);
    setSelectedQuizIndex(answerIndex);

    const isCorrect = answerIndex === activeQuiz.correctAnswer;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      // 1. Log submission to mark as completed
      await setDoc(doc(db, `users/${userProfile.uid}/quiz_submissions`, activeQuiz.id), {
        answeredIndex: answerIndex,
        correct: isCorrect,
        date: todayStr
      });

      // Update local set of completed quiz IDs
      setQuizCompletedIds(prev => {
        const next = new Set(prev);
        next.add(activeQuiz.id);
        return next;
      });

      const updatedSubmissions = {
        ...userSubmissions,
        [activeQuiz.id]: { answeredIndex: answerIndex, correct: isCorrect }
      };
      setUserSubmissions(updatedSubmissions);

      // 2. Award 1 point for every 3 correct answers
      if (isCorrect) {
        const totalCorrectCount = Object.values(updatedSubmissions).filter((s: any) => s.correct).length;

        if (totalCorrectCount > 0 && totalCorrectCount % 3 === 0) {
          const userRef = doc(db, 'users', userProfile.uid);
          await updateDoc(userRef, {
            points: increment(1),
            [`pointsByCategory.Quiz`]: increment(1)
          });

          // Add point log
          await addDoc(collection(db, 'point_logs'), {
            userId: userProfile.uid,
            points: 1,
            category: 'Quiz',
            action: `1 Punkt für 3 richtig beantwortete Wissens-Quiz Fragen (${totalCorrectCount} gesamt)`,
            date: todayStr
          });

          const updatedPts = userProfile.points + 1;
          const updatedCats = {
            ...userProfile.pointsByCategory,
            Quiz: (userProfile.pointsByCategory?.Quiz || 0) + 1
          };
          onUpdatePoints(updatedPts, updatedCats);
        }
      }
    } catch (err) {
      console.error('Error saving quiz submission:', err);
    }
  };

  // Push completed quizzes to the bottom & include Level Quizzes
  const getSortedQuizzes = () => {
    const levelQuizzes = getUserLevelQuizzes(userProfile || null);
    const firestoreQuizzes = competitions.filter(c => c.type === 'quiz');

    const combinedMap = new Map<string, any>();
    levelQuizzes.forEach(q => combinedMap.set(q.id, q));
    firestoreQuizzes.forEach(q => {
      if (!combinedMap.has(q.id)) {
        combinedMap.set(q.id, q);
      }
    });

    const quizList = Array.from(combinedMap.values());
    return [...quizList].sort((a, b) => {
      const aDone = quizCompletedIds.has(a.id);
      const bDone = quizCompletedIds.has(b.id);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });
  };

  const renderEmbedVideo = (url: string, title: string) => {
    if (!url) return null;
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    const isEmbed = embedUrl.includes('youtube.com/embed/') || embedUrl.includes('player.vimeo.com');

    if (isEmbed) {
      return (
        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 shadow bg-black">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    }

    return (
      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{title}</p>
          <p className="text-[10px] text-slate-500 font-mono truncate">{url}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0"
        >
          <span>Link öffnen</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  };

  const hasOffensiv = (trainingVideoLinks.offensiv_training || []).some((v: any) => v.url && v.url.trim() !== '');
  const hasGleichgewicht = (trainingVideoLinks.gleichgewicht_training || []).some((v: any) => v.url && v.url.trim() !== '');
  const hasNeuro = (trainingVideoLinks.neuro_training || []).some((v: any) => v.url && v.url.trim() !== '');
  const hasTorwartAthletik = [
    'torwart_athletik_training',
    'tw_at',
    'tw_at_antritt',
    'tw_at_schnelle_beine',
    'tw_at_explosivitaet',
    'tw_at_beweglichkeit',
    'tw_at_gleichgewicht'
  ].some(key => (trainingVideoLinks[key] || []).some((v: any) => v.url && v.url.trim() !== ''));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 font-sans">
      {/* 1. MENU VIEW */}
      {activeView === 'menu' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Swords className="w-7 h-7 text-amber-500" />
              Training
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
              Trainings-Challenges, Quizfragen & kognitive Spiele
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'coaching',
                label: 'Coaching Spielszenen',
                perm: 'training_coaching',
                icon: Shield,
                iconColor: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5',
                subtext: 'Was coachst du an den markierten Stellen?',
                onClick: () => setActiveView('coaching')
              },
              {
                id: 'elfmeter',
                label: 'Elfmeter',
                perm: 'training_penalties',
                icon: Video,
                iconColor: 'text-rose-400 border-rose-500/10 bg-rose-500/5',
                subtext: 'Ecken erraten & Torwartreaktionen',
                onClick: () => setActiveView('elfmeter')
              },
              {
                id: 'freestoss',
                label: 'Freistöße',
                perm: 'training_freekicks',
                icon: Video,
                iconColor: 'text-indigo-400 border-indigo-500/10 bg-indigo-500/5',
                subtext: 'Mauerstärke und Positionierung',
                onClick: () => setActiveView('freestoss')
              },
              {
                id: 'kognitionsspiele',
                label: 'Kognitionsspiele',
                perm: 'training_kognition',
                icon: Brain,
                iconColor: 'text-pink-400 border-pink-500/10 bg-pink-500/5',
                subtext: 'Gehirntraining, Aufmerksamkeit & Reaktion',
                onClick: () => setActiveView('kognitionsspiele')
              },
              {
                id: 'kognition_ball',
                label: 'Kognitionstraining mit Ball',
                perm: 'training_kognition_ball',
                icon: Brain,
                iconColor: 'text-pink-500 border-pink-500/10 bg-pink-500/5',
                subtext: 'Trainingshinweise & Videos zum Mitlaufen',
                onClick: () => {
                  setCogTab('hints');
                  setActiveView('kognition_ball');
                }
              },
              {
                id: 'challenge',
                label: 'Koordinationsleiter-Challenge',
                perm: 'training_ladder',
                icon: Sparkles,
                iconColor: 'text-amber-400 border-amber-500/10 bg-amber-500/5',
                subtext: 'Koordinations-Duelle',
                onClick: () => setActiveView('challenge')
              },
              {
                id: 'mental_training',
                label: 'Mentales Training',
                perm: 'training_mental',
                icon: Brain,
                iconColor: 'text-purple-400 border-purple-500/10 bg-purple-500/5',
                subtext: 'Selbstvertrauen, Fokus, externe Faktoren & Fehler',
                onClick: () => {
                  setMentalTab('selbstvertrauen');
                  setActiveView('mental_training');
                }
              },
              {
                id: 'neuro_training',
                label: 'Neuroathletiktraining',
                perm: 'training_neuro',
                icon: Target,
                iconColor: 'text-fuchsia-400 border-fuchsia-500/10 bg-fuchsia-500/5',
                subtext: 'Auge-Hand-Koordination & Reflexe',
                onClick: () => setActiveView('neuro_training')
              },
              {
                id: 'offensiv_training',
                label: 'Offensivtechniken',
                perm: 'training_offensiv',
                icon: Video,
                iconColor: 'text-amber-400 border-amber-500/10 bg-amber-500/5',
                subtext: 'Techniken für den Spielaufbau & Angriff',
                isCustomLocked: !hasOffensiv,
                onCustomClick: () => {
                  setComingSoonLabel('Offensivtechniken');
                  setActiveView('coming_soon');
                },
                onClick: () => setActiveView('offensiv_training')
              },
              {
                id: 'seilspringen',
                label: 'Seilspringen Challenge',
                perm: 'training_rope',
                icon: Sparkles,
                iconColor: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5',
                subtext: 'Seilspringen-Duelle',
                onClick: () => setActiveView('seilspringen')
              },
              {
                id: 'torwart_athletik_training',
                label: 'Torwartspezifisches Athletiktraining',
                perm: 'training_athletic',
                icon: Video,
                iconColor: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5',
                subtext: 'Kraft, Schnelligkeit & Sprungkraft im Torwartspiel',
                onClick: () => setActiveView('torwart_athletik_training')
              },
              {
                id: 'training',
                label: 'Trainingswettkämpfe',
                perm: 'training_competitions',
                icon: Trophy,
                iconColor: 'text-yellow-400 border-yellow-500/10 bg-yellow-500/5',
                subtext: 'Letzte Gewinner & Platzierungen',
                onClick: () => setActiveView('training')
              },
              {
                id: 'whatsnext',
                label: 'Taktikanalyse',
                perm: 'training_whatsnext',
                icon: HelpCircle,
                iconColor: 'text-amber-400 border-amber-500/10 bg-amber-500/5',
                subtext: 'Was tust du als nächstes in der Spielszene?',
                onClick: () => setActiveView('whatsnext')
              }
            ]
              .sort((a, b) => a.label.localeCompare(b.label, 'de'))
              .map((mod) => {
                const IconComp = mod.icon;
                const isLocked = !hasModulePermission(userProfile, mod.perm);

                if (isLocked) {
                  return (
                    <button
                      key={mod.id}
                      onClick={() => alert('Dieses Modul wurde noch nicht freigeschaltet. Bitte wende dich an deinen Coach.')}
                      className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl text-left flex items-center justify-between opacity-65 cursor-pointer relative select-none"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-zinc-500 shrink-0">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-zinc-500">
                            {mod.label}
                          </span>
                          <span className="block text-[9px] text-amber-500 font-mono mt-0.5 uppercase tracking-wider font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Gesperrt</span>
                          </span>
                        </div>
                      </div>
                      <Lock className="w-4 h-4 text-zinc-600 shrink-0" />
                    </button>
                  );
                }

                if (mod.isCustomLocked) {
                  return (
                    <button
                      key={mod.id}
                      onClick={mod.onCustomClick}
                      className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl text-left flex items-center justify-between opacity-80 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-600 shrink-0">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-slate-400">
                            {mod.label}
                          </span>
                          <span className="block text-[10px] text-slate-600 font-mono mt-0.5 uppercase tracking-wider">
                            Sperre aktiv
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-700 shrink-0" />
                    </button>
                  );
                }

                return (
                  <button
                    key={mod.id}
                    onClick={mod.onClick}
                    className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-amber-500/40 shadow-md group flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2.5 rounded-xl border ${mod.iconColor} shrink-0`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white group-hover:text-amber-500 transition-colors">
                          {mod.label}
                        </span>
                        <span className="block text-xs text-slate-400 mt-0.5">
                          {mod.subtext}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-700 group-hover:text-amber-500 transition-colors shrink-0" />
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* 2. COMING SOON SCREEN */}
      {activeView === 'coming_soon' && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">{comingSoonLabel}</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Dieser Bereich wird in einer zukünftigen Version der NextLevel Goalkeeping Academy freigeschaltet. Bitte gedulde dich noch ein wenig!
            </p>
            <div className="pt-2">
              <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded font-mono text-slate-500 border border-slate-850">
                STATUS: COMING SOON
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRAININGS-WETTKÄMPFE VIEW */}
      {activeView === 'training' && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Trainingswettkämpfe
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">Letzte Wettkampf-Ergebnisse des Torwart-Trainings</p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map(n => <div key={n} className="h-20 bg-slate-900 rounded-2xl"></div>)}
            </div>
          ) : competitions.filter(c => c.type === 'training').length === 0 ? (
            <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs font-mono">
              Keine Trainingswettkämpfe eingetragen.
            </div>
          ) : (
            <div className="space-y-3">
              {competitions
                .filter(c => c.type === 'training')
                // Sort by date newest first
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                .map((comp) => (
                  <div key={comp.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-amber-500 font-mono font-bold">
                        WETTKAMPF VOM {comp.date?.split('-').reverse().join('.')}
                      </span>
                      <h4 className="text-sm font-extrabold text-white mt-1">
                        Trainingswettbewerb im Torwarttraining
                      </h4>
                    </div>

                    <div className="flex gap-4 items-center">
                      <div className="bg-slate-950 border border-slate-850 px-3 py-2 rounded-xl text-center">
                        <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Sieger (+1 Pkt)</span>
                        <span className="font-bold text-yellow-400 text-xs">{comp.winner}</span>
                      </div>
                      {comp.second && (
                        <div className="bg-slate-950 border border-slate-850 px-3 py-2 rounded-xl text-center">
                          <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Platz 2 (+2 Pkt)</span>
                          <span className="font-bold text-slate-300 text-xs">{comp.second}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 4. CHALLENGE VIEW */}
      {activeView === 'challenge' && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Koordinationsleiter-Challenge
              </h2>
              <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-2xl">
                Arbeite dich durch 25 Level durch und erhalte einen Punkt für jede erfolgreiche Herausforderung. Filme dich dabei, schicke das Video an Thorsten und schon gehört der Punkt dir!
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-xl text-xs max-w-2xl font-medium flex items-center gap-2">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p>
                  <strong>Voraussetzung:</strong> Ein Durchgang mit mindestens 10 Felder in der Leiter ohne Fehler!
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setActiveView('kognition_tutorial')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Video className="w-4 h-4 text-amber-500" />
                  <span>Bewegungen unklar? Hier lang!</span>
                </button>
              </div>
            </div>
            <div className="md:w-96 shrink-0 bg-amber-500/10 border border-amber-500/30 text-amber-200 p-4 rounded-2xl text-xs space-y-1.5 shadow-lg shadow-amber-500/5">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] block">Hinweis:</span>
              <p className="leading-relaxed text-slate-300">
                Du kannst jederzeit selbst eine schwierige Koordinationsleiter-Challenge entwickeln, diese vormachen, filmen und an Thorsten schicken. Ist diese herausfordernd, werden dir dadurch zwei Punkte gutgeschrieben und die Herausforderung wird für alle veröffentlicht (nicht das Video, nur die Aufgabe). Sei kreativ und sammle auch dafür Punkte!
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-32 bg-slate-900 rounded-2xl"></div>
            </div>
          ) : competitions.filter(c => c.type === 'challenge').length === 0 ? (
            <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs font-mono">
              Keine Challenges aktiv.
            </div>
          ) : (
            <div className="space-y-4">
              {competitions
                .filter(c => c.type === 'challenge')
                .sort((a, b) => {
                  const getLevelNum = (val: string | undefined) => {
                    if (!val) return Infinity;
                    const match = val.match(/\d+/);
                    return match ? parseInt(match[0], 10) : Infinity;
                  };
                  return getLevelNum(a.period) - getLevelNum(b.period);
                })
                .map((comp) => {
                  const isCreator = comp.creator === userProfile.name;
                  const completed = comp.successfulUsers?.includes(userProfile.uid) || false;

                  return (
                    <div key={comp.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold uppercase">
                            Level: {comp.period || 'Keine Angabe'}
                          </span>
                          <h3 className="text-base font-extrabold text-white mt-1">
                            Erstellt von: {comp.creator}
                          </h3>
                        </div>

                        {comp.videoLink && (
                          <a
                            href={comp.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Challenge-Video ansehen</span>
                          </a>
                        )}
                      </div>

                      {comp.description && (
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1">
                          <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Beschreibung & Anleitung</span>
                          <p className="text-slate-300 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                            {comp.description}
                          </p>
                        </div>
                      )}

                      {/* Info blocks */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                          <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Punktevergabe</span>
                          <p className="text-slate-300 mt-1">
                            Ersteller erhält **2 Punkte**. Erfolgreiche Absolventen erhalten **1 Punkt**.
                          </p>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                          <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Dein Status</span>
                          <p className="mt-1 font-bold">
                            {isCreator ? (
                              <span className="text-amber-500">Du bist der Ersteller (+2 Pkt erhalten)</span>
                            ) : completed ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Erfolgreich absolviert (+1 Pkt erhalten)
                              </span>
                            ) : (
                              <span className="text-slate-400">Noch offen</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Successful users list */}
                      {comp.successfulUsers && comp.successfulUsers.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/40">
                          <span className="block text-[9px] text-slate-500 font-mono uppercase font-black">Erfolgreiche Absolventen</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {comp.successfulUsers.map((uid) => (
                              <span
                                key={uid}
                                className="px-2.5 py-1 bg-slate-950 border border-slate-850 text-slate-300 font-mono text-[10px] font-bold rounded-md"
                              >
                                UID: {uid.slice(0, 5)}...
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeView === 'kognition_tutorial' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <button
            onClick={() => setActiveView('challenge')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zur Challenge</span>
          </button>

          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-500" />
              Koordinationsleiter-Tutorials
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Übungs- & Erklärvideos zur Koordinationsleiter</p>
          </div>

          <div className="space-y-6">
            {(() => {
              const videos = trainingVideoLinks['koordinationsleiter_challenge'] || [];
              const activeVideos = videos.filter((v: any) => v.url && v.url.trim() !== '');
              if (activeVideos.length === 0) {
                return (
                  <div className="p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400 space-y-2">
                    <p className="text-sm font-bold">Noch kein Video hinterlegt.</p>
                    <p className="text-xs text-slate-600 font-mono">Der Admin kann YouTube-Videolinks in der Coaching Zone eintragen.</p>
                  </div>
                );
              }
              return activeVideos.map((vid: any, idx: number) => (
                <div key={idx} className="space-y-3 bg-slate-900/40 p-4 sm:p-6 rounded-3xl border border-slate-800/60 shadow-lg">
                  {vid.title && (
                    <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-800/80 pb-2">
                      <Video className="w-4 h-4 text-purple-500" />
                      <span>{vid.title}</span>
                    </h3>
                  )}
                  {renderEmbedVideo(vid.url, vid.title || 'Koordinationsleiter Video')}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* 5. WISSENS-QUIZ VIEW */}
      {activeView === 'quiz' && (
        <div className="space-y-6">
          {/* Main Quiz panel or detail quiz run */}
          {!activeQuiz ? (
            <>
              <button
                onClick={() => setActiveView('menu')}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zurück</span>
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-emerald-400" />
                    Wissens-Quiz
                  </h2>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">Beantworte Fragen zum Torwartspiel und sammle Punkte für die Bestenliste.</p>
                </div>
                {userProfile?.role === 'admin' && (
                  <button
                    onClick={handleResetAllQuizSubmissions}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Status aller Quizfragen für Admin zurücksetzen"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Alle zurücksetzen (Admin)</span>
                  </button>
                )}
              </div>

              {/* Rule Notice Banner */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start gap-2.5 font-sans">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-200">Bestenlisten-Punkte Regel:</span>
                  Du erhältst erst nach jeweils <strong className="underline text-amber-200">3 richtig beantworteten Quizfragen</strong> 1 Punkt für die Bestenliste.
                  {userProfile && (
                    <div className="mt-1 text-[11px] text-amber-300/80 font-mono">
                      Dein Fortschritt: <strong className="text-amber-100">{Object.values(userSubmissions).filter((s: any) => s.correct).length % 3} / 3</strong> richtige Antworten bis zum nächsten Punkt (Insgesamt {Object.values(userSubmissions).filter((s: any) => s.correct).length} richtig gelöst)
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-14 bg-slate-900 rounded-xl"></div>
                </div>
              ) : getSortedQuizzes().length === 0 ? (
                <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs font-mono">
                  Aktuell sind keine Quiz-Fragen verfügbar. Schalte Level im Keeper-Profil frei, um Quiz-Fragen freizuschalten!
                </div>
              ) : (
                <div className="space-y-2">
                  {getSortedQuizzes().map((quiz, index) => {
                    const done = quizCompletedIds.has(quiz.id);

                    return (
                      <div
                        key={quiz.id}
                        className={`border rounded-xl p-4 flex items-center justify-between transition-all ${
                          done ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-900 border-slate-800 hover:border-emerald-500/30'
                        }`}
                      >
                        <div className="max-w-[70%]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase block">
                              QUIZFRAGE #{index + 1}
                            </span>
                            {quiz.level && (
                              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded font-mono">
                                Level {quiz.level}
                              </span>
                            )}
                            {done && <span className="text-emerald-500 text-[10px] font-bold font-mono">[Beantwortet]</span>}
                          </div>
                          {done ? (
                            <span className="block text-sm font-semibold text-slate-300 mt-1 break-words">
                              {quiz.question}
                            </span>
                          ) : (
                            <span className="block text-xs font-medium text-slate-400 italic mt-1 break-words flex items-center gap-1.5">
                              <Lock className="w-3 h-3 text-slate-500 inline shrink-0" />
                              Frage verborgen – klicke auf „Frage starten“, um zu beginnen.
                            </span>
                          )}
                        </div>

                        {!done ? (
                          <div className="flex items-center gap-2">
                            {userProfile?.role === 'admin' && (
                              <button
                                onClick={() => handleResetQuizStatus(quiz.id)}
                                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded-lg text-[11px] transition-all cursor-pointer shadow shrink-0 flex items-center gap-1"
                                title="Status für diese Frage zurücksetzen"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleStartQuiz(quiz)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow shrink-0"
                            >
                              Frage starten
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveQuiz(quiz);
                                setQuizTimer(0);
                                setQuizAnswered(true);
                                setSelectedQuizIndex(userSubmissions[quiz.id]?.answeredIndex ?? null);
                                setViewOnlyMode(true);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer shadow shrink-0"
                            >
                              Antwort ansehen
                            </button>
                            {userProfile?.role === 'admin' && (
                              <button
                                onClick={() => handleResetQuizStatus(quiz.id)}
                                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded-lg text-[11px] transition-all cursor-pointer shadow shrink-0 flex items-center gap-1"
                                title="Status für diese Frage zurücksetzen"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* ACTIVE RUNNING QUIZ VIEW with 30s locked timer */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-xl mx-auto my-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600"></div>

              {/* Timer Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 uppercase font-black tracking-wider">
                    {viewOnlyMode ? 'Quiz-Ergebnis' : 'Wissens-Quiz läuft...'}
                  </span>
                  {activeQuiz.level && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded font-mono">
                      Level {activeQuiz.level}
                    </span>
                  )}
                </div>

                {viewOnlyMode ? (
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-[10px] font-bold font-mono">
                    Archiviert • Lesemodus
                  </div>
                ) : (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm ${
                    quizTimer <= 10 
                      ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    <Timer className="w-4 h-4 shrink-0" />
                    <span>00:{quizTimer.toString().padStart(2, '0')}</span>
                  </div>
                )}
              </div>

              {/* Locked Window warn notice */}
              {!quizAnswered && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Sperre aktiv: Bitte verlasse diese Seite nicht ("Beantworte erst die Frage!")</span>
                </div>
              )}

              {/* Question Statement */}
              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-white leading-relaxed">
                  {activeQuiz.question}
                </h3>

                {/* Answers list */}
                <div className="grid grid-cols-1 gap-2.5">
                  {activeQuiz.answers?.map((option, idx) => {
                    const isSelected = selectedQuizIndex === idx;
                    const isCorrectIndex = idx === activeQuiz.correctAnswer;
                    
                    let btnClass = 'bg-slate-950 border-slate-850 text-slate-300 hover:text-white hover:bg-slate-900';
                    
                    if (quizAnswered) {
                      if (isCorrectIndex) {
                        btnClass = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold';
                      } else if (isSelected && !isCorrectIndex) {
                        btnClass = 'bg-red-500/10 border-red-500 text-red-400';
                      } else {
                        btnClass = 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-50';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={quizAnswered}
                        onClick={() => handleAnswerQuiz(idx)}
                        className={`w-full p-4 text-left border rounded-xl text-xs transition-all ${btnClass} font-sans ${!quizAnswered && 'cursor-pointer'}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation if available and answered */}
                {quizAnswered && activeQuiz.explanation && (
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-left mt-4">
                    <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Erklärung:
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {activeQuiz.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* Result & Back Button */}
              {quizAnswered && (
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {selectedQuizIndex === activeQuiz.correctAnswer ? (
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Check className="w-4 h-4 font-black shrink-0" />
                        <span>
                          {(() => {
                            const totalCorrect = Object.values(userSubmissions).filter((s: any) => s.correct).length;
                            if (totalCorrect > 0 && totalCorrect % 3 === 0) {
                              return `Korrekt! 🎉 3/3 Richtige erreicht: +1 Punkt für Bestenliste erhalten!`;
                            } else {
                              const remaining = 3 - (totalCorrect % 3);
                              return `Korrekt! (${totalCorrect % 3}/3) — Noch ${remaining} richtige Antwort${remaining > 1 ? 'en' : ''} bis zum nächsten Punkt für die Bestenliste.`;
                            }
                          })()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-red-400">
                        Leider falsch. Die richtige Antwort ist markiert.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {userProfile?.role === 'admin' && (
                      <button
                        onClick={async () => {
                          await handleResetQuizStatus(activeQuiz.id);
                          setQuizAnswered(false);
                          setSelectedQuizIndex(null);
                          setViewOnlyMode(false);
                          setQuizTimer(30);
                        }}
                        className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                        title="Fragenstatus zurücksetzen & neu testen"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset & Neu testen</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveQuiz(null);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      Zurück zur Liste
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeView === 'freestoss' && (
        <VideoAnalysis
          userProfile={userProfile}
          onUpdatePoints={onUpdatePoints}
          initialView="freestoss"
          onBack={() => setActiveView('menu')}
        />
      )}

      {activeView === 'elfmeter' && (
        <VideoAnalysis
          userProfile={userProfile}
          onUpdatePoints={onUpdatePoints}
          initialView="elfmeter"
          onBack={() => setActiveView('menu')}
        />
      )}

      {activeView === 'whatsnext' && (
        <VideoAnalysis
          userProfile={userProfile}
          onUpdatePoints={onUpdatePoints}
          initialView="whatsnext"
          onBack={() => setActiveView('menu')}
        />
      )}

      {activeView === 'coaching' && (
        <VideoAnalysis
          userProfile={userProfile}
          onUpdatePoints={onUpdatePoints}
          initialView="coaching"
          onBack={() => setActiveView('menu')}
        />
      )}

      {/* Seilspringen View */}
      {activeView === 'seilspringen' && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Seilspringen Challenge
              </h2>
              <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-2xl">
                Arbeite dich durch 25 Level durch und erhalte einen Punkt für jede erfolgreiche Herausforderung. Filme dich dabei, schicke das Video an Thorsten und schon gehört der Punkt dir!
              </p>
            </div>
            <div className="md:w-96 shrink-0 bg-amber-500/10 border border-amber-500/30 text-amber-200 p-4 rounded-2xl text-xs space-y-1.5 shadow-lg shadow-amber-500/5">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] block">Hinweis:</span>
              <p className="leading-relaxed text-slate-300">
                Du kannst jederzeit selbst eine schwierige Seilspringen-Challenge entwickeln, diese vormachen, filmen und an Thorsten schicken. Ist diese herausfordernd, werden dir dadurch zwei Punkte gutgeschrieben und die Herausforderung wird für alle veröffentlicht (nicht das Video, nur die Aufgabe). Sei kreativ und sammle auch dafür Punkte!
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-32 bg-slate-900 rounded-2xl"></div>
            </div>
          ) : competitions.filter(c => c.type === 'seilspringen').length === 0 ? (
            <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs font-mono">
              Keine Seilspringen-Challenges aktiv.
            </div>
          ) : (
            <div className="space-y-4">
              {competitions
                .filter(c => c.type === 'seilspringen')
                .sort((a, b) => {
                  const getLevelNum = (val: string | undefined) => {
                    if (!val) return Infinity;
                    const match = val.match(/\d+/);
                    return match ? parseInt(match[0], 10) : Infinity;
                  };
                  return getLevelNum(a.period) - getLevelNum(b.period);
                })
                .map((comp) => {
                  const isCreator = comp.creator === userProfile.name;
                  const completed = comp.successfulUsers?.includes(userProfile.uid) || false;

                  return (
                    <div key={comp.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold uppercase">
                            Level: {comp.period || 'Keine Angabe'}
                          </span>
                          <h3 className="text-base font-extrabold text-white mt-1">
                            Erstellt von: {comp.creator}
                          </h3>
                        </div>

                        {comp.videoLink && (
                          <a
                            href={comp.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Challenge-Video ansehen</span>
                          </a>
                        )}
                      </div>

                      {comp.description && (
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1">
                          <span className="block text-[8px] text-emerald-500 font-mono uppercase font-black">Beschreibung & Anleitung</span>
                          <p className="text-slate-300 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                            {comp.description}
                          </p>
                        </div>
                      )}

                      {/* Info blocks */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                          <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Punktevergabe</span>
                          <p className="text-slate-300 mt-1">
                            Ersteller erhält 2 Punkte. Erfolgreiche Absolventen erhalten 1 Punkt.
                          </p>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                          <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Dein Status</span>
                          <p className="mt-1 font-bold">
                            {isCreator ? (
                              <span className="text-amber-500">Du bist der Ersteller (+2 Pkt erhalten)</span>
                            ) : completed ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Erfolgreich absolviert (+1 Pkt erhalten)
                              </span>
                            ) : (
                              <span className="text-slate-400">Noch offen</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Successful users list */}
                      {comp.successfulUsers && comp.successfulUsers.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/40">
                          <span className="block text-[9px] text-slate-500 font-mono uppercase font-black">Erfolgreiche Absolventen</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {comp.successfulUsers.map((uid) => {
                              const found = usersList.find(u => u.uid === uid);
                              const dispName = found ? found.name : `Spieler (${uid.slice(0, 5)})`;
                              return (
                                <span
                                  key={uid}
                                  className="px-2.5 py-1 bg-slate-950 border border-slate-850 text-slate-300 font-mono text-[10px] font-bold rounded-md"
                                >
                                  {dispName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Special content training views (Offensivtechniken, Gleichgewichtsherausforderungen, Neuroathletiktraining, Torwartspezifisches Athletiktraining) */}
      {(activeView === 'offensiv_training' || activeView === 'gleichgewicht_training' || activeView === 'neuro_training' || activeView === 'torwart_athletik_training') && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          <div>
            <h2 className="text-lg font-bold text-white uppercase font-mono">
              {activeView === 'offensiv_training' && 'Offensivtechniken'}
              {activeView === 'gleichgewicht_training' && 'Neurozentriertes Training auf dem Platz'}
              {activeView === 'neuro_training' && 'Neuroathletiktraining'}
              {activeView === 'torwart_athletik_training' && 'Torwartspezifisches Athletiktraining'}
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              {activeView === 'neuro_training'
                ? 'Kognitives Gehirntraining & Augenkoordination'
                : 'Torwartspezifische Theorie- & Übungsvideos für diesen Trainingsbereich'}
            </p>
          </div>

          {activeView === 'torwart_athletik_training' && (
            <div className="flex border-b border-slate-900 gap-1 pb-px overflow-x-auto scrollbar-none">
              <button
                onClick={() => setTwAthletikTab('antritt')}
                className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                  twAthletikTab === 'antritt'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Antritt
              </button>
              <button
                onClick={() => setTwAthletikTab('beweglichkeit')}
                className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                  twAthletikTab === 'beweglichkeit'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Beweglichkeit
              </button>
              <button
                onClick={() => setTwAthletikTab('explosivitaet')}
                className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                  twAthletikTab === 'explosivitaet'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Explosivität
              </button>
              <button
                onClick={() => setTwAthletikTab('gleichgewicht')}
                className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                  twAthletikTab === 'gleichgewicht'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Gleichgewicht
              </button>
              <button
                onClick={() => setTwAthletikTab('schnelle_beine')}
                className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                  twAthletikTab === 'schnelle_beine'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Schnelle Beine
              </button>
            </div>
          )}

          {activeView === 'neuro_training' && (
            <div className="space-y-4">
              {/* Target Striking */}
              <div 
                onClick={() => setActiveView('target_striking')}
                className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-805 rounded-3xl text-left transition-all hover:border-amber-500/30 shadow-lg group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight font-mono">
                      Target Striking
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
                    Verbessere die Präzision deiner Augenbewegungen nach einer Vororientierung.
                  </p>
                </div>
                <div className="px-5 py-2.5 bg-amber-500 group-hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow shrink-0 text-center">
                  Jetzt Starten
                </div>
              </div>

              {/* Eye Focus */}
              <div 
                onClick={() => setActiveView('eye_focus')}
                className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-805 rounded-3xl text-left transition-all hover:border-fuchsia-500/30 shadow-lg group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 group-hover:scale-105 transition-transform">
                      <Brain className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white group-hover:text-fuchsia-400 transition-colors uppercase tracking-tight font-mono">
                      Eye Focus
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
                    Verbessere deinen Augenfokus und deine Fähigkeit, Impulse zu unterdrücken.
                  </p>
                </div>
                <div className="px-5 py-2.5 bg-fuchsia-500 group-hover:bg-fuchsia-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow shrink-0 text-center">
                  Jetzt Starten
                </div>
              </div>

              {/* Limit of the Eyes */}
              <div 
                onClick={() => setActiveView('peripherie')}
                className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-805 rounded-3xl text-left transition-all hover:border-cyan-500/30 shadow-lg group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <Eye className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight font-mono">
                      Limit of the Eyes
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
                    Verbessere deine Informationswahrnehmung auf beweglichen Objekten.
                  </p>
                </div>
                <div className="px-5 py-2.5 bg-cyan-500 group-hover:bg-cyan-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow shrink-0 text-center">
                  Jetzt Starten
                </div>
              </div>

              {/* Peripherie */}
              <div 
                onClick={() => setActiveView('peripherie_zaehler')}
                className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-805 rounded-3xl text-left transition-all hover:border-emerald-500/30 shadow-lg group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight font-mono">
                      Peripherie
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
                    Verbessere deine Informationswahrnehmung außerhalb deines Blicks.
                  </p>
                </div>
                <div className="px-5 py-2.5 bg-emerald-500 group-hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow shrink-0 text-center">
                  Jetzt Starten
                </div>
              </div>

              {/* Reflex-Focus (VOR) */}
              <div 
                onClick={() => setActiveView('reflex_focus')}
                className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-805 rounded-3xl text-left transition-all hover:border-pink-500/30 shadow-lg group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                      <Brain className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white group-hover:text-pink-400 transition-colors uppercase tracking-tight font-mono">
                      Reflex-Focus (VOR)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
                    Trainiere deinen vestibulookulären Reflex und die Blickstabilisierung bei schnellen Kopfbewegungen.
                  </p>
                </div>
                <div className="px-5 py-2.5 bg-pink-500 group-hover:bg-pink-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow shrink-0 text-center">
                  Jetzt Starten
                </div>
              </div>

              {/* Stability-Focus */}
              <div 
                onClick={() => setActiveView('stability_focus')}
                className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-805 rounded-3xl text-left transition-all hover:border-pink-500/35 shadow-lg group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                      <Activity className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white group-hover:text-pink-400 transition-colors uppercase tracking-tight font-mono">
                      Stability-Focus
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
                    Auf ein Bein stellen, Blick fixieren und die Kopf-Bewegungsreize stabilisieren.
                  </p>
                </div>
                <div className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow shrink-0 text-center">
                  Jetzt Starten
                </div>
              </div>
            </div>
          )}

          {activeView !== 'neuro_training' && (
            <div className="space-y-8">
              {(() => {
                const key1 = `torwart_athletik_${twAthletikTab}`;
                const key2 = `tw_at_${twAthletikTab}`;
                let videos = (activeView === 'torwart_athletik_training' ? (trainingVideoLinks[key1] || trainingVideoLinks[key2]) : trainingVideoLinks[activeView]) || [];
                if ((!videos || videos.length === 0) && activeView === 'torwart_athletik_training') {
                  videos = trainingVideoLinks['torwart_athletik_training'] || trainingVideoLinks['tw_at'] || [];
                }
                const activeVideos = videos.filter((v: any) => v.url && v.url.trim() !== '');
                if (activeVideos.length === 0) {
                  return (
                    <div className="p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400 space-y-2">
                      <p className="text-sm font-bold">Noch kein Video hinterlegt.</p>
                      <p className="text-xs text-slate-600 font-mono">Der Trainer kann YouTube-Videolinks in der Coaching Zone eintragen.</p>
                    </div>
                  );
                }
                return activeVideos.map((vid: any, idx: number) => (
                  <div key={idx} className="space-y-3 bg-slate-900/40 p-4 sm:p-6 rounded-3xl border border-slate-800/60 shadow-lg animate-in fade-in">
                    {vid.title && (
                      <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-800/80 pb-2">
                        <Video className="w-4 h-4 text-amber-500" />
                        <span>{vid.title}</span>
                      </h3>
                    )}
                    {renderEmbedVideo(vid.url, vid.title || 'Trainingsvideo')}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* Kognitionstraining mit Ball View */}
      {activeView === 'kognition_ball' && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono animate-in fade-in"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          <div>
            <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
              <Brain className="w-5 h-5 text-pink-500" />
              <span>Kognitionstraining mit Ball</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Trainingshinweise für verschiedene Übungen und kognitive Trainingsvideos zum Mitlaufen lassen.
            </p>
          </div>

          {/* Subtabs for Hints & Videos */}
          <div className="flex border-b border-slate-900 gap-1 pb-px">
            <button
              onClick={() => setCogTab('hints')}
              className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer ${
                cogTab === 'hints'
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Trainingshinweise
            </button>
            <button
              onClick={() => setCogTab('videos')}
              className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer ${
                cogTab === 'videos'
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Trainingsvideos (Mitlaufen)
            </button>
          </div>

          {/* TAB 1: Hints */}
          {cogTab === 'hints' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {(() => {
                const hints = trainingVideoLinks.kognition_ball_hints || [];
                const activeHints = hints.filter((h: string) => h && h.trim() !== '');
                if (activeHints.length === 0) {
                  return (
                    <div className="p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400 space-y-2">
                      <p className="text-sm font-bold">Noch keine Trainingshinweise hinterlegt.</p>
                      <p className="text-xs text-slate-600 font-mono">Der Coach kann in der Coaching Zone Übungsanleitungen hinzufügen.</p>
                    </div>
                  );
                }
                return (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                    <h3 className="text-xs font-bold text-amber-500 font-mono uppercase tracking-wider pb-2 border-b border-slate-800">
                      Übungsanleitungen & Tipps
                    </h3>
                    <ul className="space-y-3.5">
                      {activeHints.map((hint: string, hIdx: number) => (
                        <li key={hIdx} className="flex gap-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans items-start">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] font-bold font-mono shrink-0 mt-0.5">
                            {hIdx + 1}
                          </span>
                          <span>{hint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: Videos */}
          {cogTab === 'videos' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {(() => {
                const videos = trainingVideoLinks.kognition_ball_training || [];
                const activeVideos = videos.filter((v: any) => v.url && v.url.trim() !== '');
                if (activeVideos.length === 0) {
                  return (
                    <div className="p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400 space-y-2">
                      <p className="text-sm font-bold">Noch keine Trainingsvideos hinterlegt.</p>
                      <p className="text-xs text-slate-600 font-mono">Der Coach kann in der Coaching Zone YouTube-Links zum Mitlaufen hinterlegen.</p>
                    </div>
                  );
                }
                return activeVideos.map((vid: any, idx: number) => (
                  <div key={idx} className="space-y-3 bg-slate-900/40 p-4 sm:p-6 rounded-3xl border border-slate-800/60 shadow-lg animate-in fade-in">
                    {vid.title && (
                      <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-800/80 pb-2">
                        <Video className="w-4 h-4 text-pink-500" />
                        <span>{vid.title}</span>
                      </h3>
                    )}
                    {renderEmbedVideo(vid.url, vid.title || 'Kognitionstraining Video')}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* MENTALES TRAINING VIEW */}
      {activeView === 'mental_training' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          <div>
            <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" />
              <span>Mentales Training</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Mentale Stärke, Fokus & Fehlerbewältigung im Torwartspiel
            </p>
          </div>

          {/* Navigationsreiter: Selbstvertrauen, Fokus, externe Faktoren, Fehler */}
          <div className="flex border-b border-slate-900 gap-1 pb-px overflow-x-auto scrollbar-none">
            {[
              { id: 'selbstvertrauen', label: 'Selbstvertrauen' },
              { id: 'fokus', label: 'Fokus' },
              { id: 'externe_faktoren', label: 'Externe Faktoren' },
              { id: 'fehler', label: 'Fehler' },
            ].map((tab) => {
              const isActive = mentalTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMentalTab(tab.id as any)}
                  className={`px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-xl'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Instruction field at top of EVERY navigation tab */}
          <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-2xl flex items-start gap-3 text-purple-200 text-xs leading-relaxed shadow-lg">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-0.5 uppercase tracking-wider font-mono text-[11px]">Anleitung</span>
              <p className="text-purple-100/90 font-medium">
                Anleitung: Lese dir die Aufgabe jedes Videos genau durch. Mach es dir anschließend gemütlich, schließe die Augen und höre dir das Video an.
              </p>
            </div>
          </div>

          {/* Videos for active tab */}
          <div className="space-y-6">
            {(() => {
              const currentKey = `mental_tr_${mentalTab}`;
              const videos = (trainingVideoLinks[currentKey] || []).filter((v: any) => v && (v.url || v.title));

              if (videos.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2">
                    <Brain className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-mono text-slate-400">
                      Aktuell sind noch keine Videos in diesem Bereich hinterlegt.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Dein Coach kann in der Coaching Zone unter "Trainingsinhalte verwalten" Videos für diesen Bereich eintragen.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {videos.map((vid: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
                            Video #{idx + 1}
                          </span>
                        </div>
                        {vid.title && (
                          <h3 className="text-sm font-bold text-white">
                            {vid.title}
                          </h3>
                        )}
                      </div>
                      {vid.url && renderEmbedVideo(vid.url, vid.title || 'Mentales Training Video')}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4. KOGNITIONSSPIELE VIEW */}
      {activeView === 'kognitionsspiele' && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveView('menu')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
                <Brain className="w-5 h-5 text-pink-400" />
                <span>Kognitionsspiele</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">Schule deine geistige Fitness, Reaktionsschnelligkeit und Antizipation.</p>
            </div>
            <div>
              <button
                onClick={() => setActiveView('kognitionsspiele_wettkampf')}
                className="w-full sm:w-auto px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>zu den Wettkämpfen</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setActiveView('reaction_grid')}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-pink-500/40 shadow-lg group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="block text-base font-black text-white group-hover:text-pink-400 transition-colors">
                  Reaction Grid
                </span>
                <span className="block text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Schule deine periphere Sicht, Hand-Auge-Koordination und Entscheidungsgeschwindigkeit unter Zeitdruck.
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full space-y-3">
                {trainingStats['reaction_grid'] && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bestwert: <strong className="text-white font-bold">{trainingStats['reaction_grid'].bestScore} Hits</strong></span>
                    </span>
                    <span>Spiele: <strong className="text-white font-bold">{trainingStats['reaction_grid'].playCount}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase tracking-wider text-pink-500/80 font-bold">Jetzt Starten</span>
                  <span>2 VERSCHIEDENE MODI</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveView('attention_divided')}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-pink-500/40 shadow-lg group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-105 transition-transform">
                  <Brain className="w-5 h-5" />
                </div>
                <span className="block text-base font-black text-white group-hover:text-pink-400 transition-colors">
                  Attention Divided
                </span>
                <span className="block text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Verbessere deine periphere Wahrnehmung und deine Raumorientierung.
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full space-y-3">
                {trainingStats['attention_divided'] && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bestwert: <strong className="text-white font-bold">{trainingStats['attention_divided'].bestScore} Treffer</strong></span>
                    </span>
                    <span>Spiele: <strong className="text-white font-bold">{trainingStats['attention_divided'].playCount}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase tracking-wider text-pink-500/80 font-bold">Jetzt Starten</span>
                  <span>KOGNITIONSTRAINING</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveView('blitzmerker')}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-pink-500/40 shadow-lg group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-105 transition-transform">
                  <Eye className="w-5 h-5" />
                </div>
                <span className="block text-base font-black text-white group-hover:text-pink-400 transition-colors">
                  Fastbrain
                </span>
                <span className="block text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Schult die Fähigkeit, visuelle Informationen maximal schnell zu erfassen.
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full space-y-3">
                {trainingStats['blitzmerker'] && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bestwert: <strong className="text-white font-bold">{trainingStats['blitzmerker'].bestScore} Treffer</strong></span>
                    </span>
                    <span>Spiele: <strong className="text-white font-bold">{trainingStats['blitzmerker'].playCount}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase tracking-wider text-pink-500/80 font-bold">Jetzt Starten</span>
                  <span>TACHISTOSKOPIE</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveView('farbrausch')}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-pink-500/40 shadow-lg group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="block text-base font-black text-white group-hover:text-pink-400 transition-colors">
                  Control
                </span>
                <span className="block text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Schult die Fähigkeit, einen körperlichen Impuls zu kontrollieren.
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full space-y-3">
                {trainingStats['farbrausch'] && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bestwert: <strong className="text-white font-bold">{trainingStats['farbrausch'].bestScore} Treffer</strong></span>
                    </span>
                    <span>Spiele: <strong className="text-white font-bold">{trainingStats['farbrausch'].playCount}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase tracking-wider text-pink-500/80 font-bold">Jetzt Starten</span>
                  <span>IMPULSKONTROLLE</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveView('memobox')}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-pink-500/40 shadow-lg group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-105 transition-transform">
                  <Brain className="w-5 h-5" />
                </div>
                <span className="block text-base font-black text-white group-hover:text-pink-400 transition-colors">
                  Shell Game
                </span>
                <span className="block text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Verbessert das Arbeitsgedächtnis für komplexe Spielsituationen.
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full space-y-3">
                {trainingStats['memobox'] && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bestwert: <strong className="text-white font-bold">{trainingStats['memobox'].bestScore} Runden</strong></span>
                    </span>
                    <span>Spiele: <strong className="text-white font-bold">{trainingStats['memobox'].playCount}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase tracking-wider text-pink-500/80 font-bold">Jetzt Starten</span>
                  <span>ARBEITSGEDÄCHTNIS</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveView('solitaria')}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-pink-500/40 shadow-lg group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-105 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
                <span className="block text-base font-black text-white group-hover:text-pink-400 transition-colors">
                  Deviation
                </span>
                <span className="block text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Verbessert das erkennen von ungewöhnlichen Abweichungen.
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full space-y-3">
                {trainingStats['solitaria'] && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bestwert: <strong className="text-white font-bold">{trainingStats['solitaria'].bestScore.toFixed(1)}s</strong></span>
                    </span>
                    <span>Spiele: <strong className="text-white font-bold">{trainingStats['solitaria'].playCount}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase tracking-wider text-pink-500/80 font-bold">Jetzt Starten</span>
                  <span>MUSTEREKENNUNG</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveView('mind_architect')}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-pink-500/40 shadow-lg group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-105 transition-transform">
                  <Brain className="w-5 h-5" />
                </div>
                <span className="block text-base font-black text-white group-hover:text-pink-400 transition-colors">
                  Mind Architect
                </span>
                <span className="block text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Schult deine Fähigkeit, Störfaktoren auszublenden.
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full space-y-3">
                {trainingStats['mind_architect'] && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bestwert: <strong className="text-white font-bold">{trainingStats['mind_architect'].bestScore} Treffer</strong></span>
                    </span>
                    <span>Spiele: <strong className="text-white font-bold">{trainingStats['mind_architect'].playCount}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase tracking-wider text-pink-500/80 font-bold">Jetzt Starten</span>
                  <span>VISUELLE SELEKTION</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveView('flights')}
              className="p-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-pink-500/40 shadow-lg group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-105 transition-transform">
                  <EyeOff className="w-5 h-5" />
                </div>
                <span className="block text-base font-black text-white group-hover:text-pink-400 transition-colors">
                  Flights
                </span>
                <span className="block text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Schult deine Fähigkeit für Timing und Entscheidungen mit fehlenden Informationen.
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full space-y-3">
                {trainingStats['flights'] && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bestwert: <strong className="text-white font-bold">{trainingStats['flights'].bestScore.toFixed(0)} ms</strong></span>
                    </span>
                    <span>Spiele: <strong className="text-white font-bold">{trainingStats['flights'].playCount}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="uppercase tracking-wider text-pink-500/80 font-bold">Jetzt Starten</span>
                  <span>FLUGBAHN-ANTIZIPATION</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 4.1 KOGNITIONSSPIELE WETTKAMPF DASHBOARD VIEW */}
      {activeView === 'kognitionsspiele_wettkampf' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={() => setActiveView('kognitionsspiele')}
              className="w-max p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück zu den Spielen</span>
            </button>

            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl text-xs font-mono text-amber-400">
              <Trophy className="w-4 h-4" />
              <span>PUNKTE: <span className="font-black text-white">{userProfile.pointsByCategory?.Kognition || 0}</span></span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>Wettkampf & Duelle</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Herausforderungs-Modus für alle 8 Kognitionsspiele gegen andere Torhüter.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* COLUMN 1: CHALLENGES */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-white tracking-wider font-mono uppercase border-b border-slate-800/80 pb-2">
                  Aktive Herausforderungen
                </h3>

                {challengesLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-24 bg-slate-900 rounded-2xl border border-slate-800"></div>
                    <div className="h-24 bg-slate-900 rounded-2xl border border-slate-800"></div>
                  </div>
                ) : (() => {
                  const filtered = challenges.filter(c => {
                    const isSelf = c.challengerId === userProfile.uid;
                    const isOpen = c.status === 'open' && c.challengerScore !== null;
                    if (!isOpen) return false;

                    const isDirectOpponent = c.opponentId === userProfile.uid;
                    const isAll = c.opponentId === 'all';
                    const isGroupMatch = 
                      (c.opponentGroup === 'Alle Keeper') ||
                      (c.opponentGroup === 'Eigener Verein' && userProfile.role === 'keeper_verein') ||
                      (c.opponentGroup === 'externe keeper' && userProfile.role === 'keeper_extern');

                    return isOpen && !isSelf && (isDirectOpponent || isAll || isGroupMatch);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 bg-slate-950/40 border border-slate-850 rounded-2xl text-center text-slate-500 text-xs font-mono">
                        Momentan keine offenen Herausforderungen für dich vorhanden.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filtered.map(c => (
                        <div key={c.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-700/60 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                                {c.gameName}
                              </span>
                              <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono">
                                Level {c.gameSettings?.level || 'Standard'}
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                <span>Herausforderer: {c.challengerName}</span>
                              </h4>
                              <p className="text-[10px] text-slate-400 font-sans">
                                Gesendet am: {c.createdAt ? new Date(c.createdAt).toLocaleDateString('de-DE') : 'Unbekannt'}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              try {
                                const challengeDocRef = doc(db, 'kognitionsspiele_challenges', c.id);
                                const challengeSnap = await getDoc(challengeDocRef);
                                if (challengeSnap.exists()) {
                                  const data = challengeSnap.data();
                                  if (data.status !== 'open') {
                                    alert('Dieses Duell wurde bereits von einem anderen Keeper angenommen!');
                                    loadChallenges();
                                    return;
                                  }
                                }

                                await updateDoc(challengeDocRef, {
                                  status: 'in_progress',
                                  opponentId: userProfile.uid,
                                  opponentName: userProfile.name
                                });

                                setActiveChallenge({
                                  isCreating: false,
                                  isAnswering: true,
                                  challengeId: c.id,
                                  gameId: c.gameId,
                                  gameName: c.gameName,
                                  challengerScore: c.challengerScore,
                                  challengerStats: c.challengerStats,
                                  opponentId: c.challengerId,
                                  opponentName: c.challengerName,
                                  gameSettings: c.gameSettings
                                });
                                setActiveView(c.gameId as any);
                              } catch (err) {
                                console.error('Error accepting challenge:', err);
                                alert('Diese Herausforderung konnte nicht gestartet werden.');
                              }
                            }}
                            className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            <span>Annehmen</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* SENT CHALLENGES */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-black text-slate-400 tracking-wider font-mono uppercase border-b border-slate-800/80 pb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                  <span>Deine gesendeten Duelle</span>
                </h3>

                {(() => {
                  const sent = challenges.filter(c => c.challengerId === userProfile.uid && c.status === 'open');
                  if (sent.length === 0) {
                    return (
                      <div className="p-6 bg-slate-950/20 border border-slate-850 rounded-2xl text-center text-slate-600 text-[11px] font-sans">
                        Du hast noch keine eigenen Duelle aktiv gestartet.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {sent.map(c => (
                        <div key={c.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 text-xs">
                          <div>
                            <span className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
                              {c.gameName}
                            </span>
                            <div className="mt-1.5 text-slate-300 font-sans">
                              Gegner: <span className="font-bold text-white">{c.opponentName || c.opponentGroup}</span>
                            </div>
                          </div>

                          <div className="text-right font-mono text-[10px] text-slate-500 space-y-0.5">
                            <div className="text-amber-500 font-bold">Wartet auf Antwort</div>
                            <div>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('de-DE') : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* COMPLETED DUELS HISTORY */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-black text-slate-400 tracking-wider font-mono uppercase border-b border-slate-800/80 pb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Wettkampf-Archiv</span>
                </h3>

                {(() => {
                  const done = challenges.filter(c => {
                    const isCompleted = c.status === 'completed';
                    if (!isCompleted) return false;
                    return c.challengerId === userProfile.uid || c.opponentId === userProfile.uid || c.opponentGroup === 'Alle Keeper';
                  });

                  if (done.length === 0) {
                    return (
                      <div className="p-6 bg-slate-950/20 border border-slate-850 rounded-2xl text-center text-slate-600 text-[11px] font-sans">
                        Noch keine abgeschlossenen Kognitionsduelle im Archiv.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {done.map(c => {
                        const isWinner = c.winnerId === userProfile.uid;
                        const isTie = c.winnerId === 'tie';
                        let winnerLabel = '';

                        if (isTie) {
                          winnerLabel = 'Unentschieden';
                        } else if (c.winnerId === c.challengerId) {
                          winnerLabel = `Sieger: ${c.challengerName}`;
                        } else {
                          winnerLabel = `Sieger: ${c.opponentName}`;
                        }

                        return (
                          <div key={c.id} className="bg-slate-900/40 border border-slate-850/80 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs">
                            <div className="space-y-1">
                              <span className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                {c.gameName}
                              </span>
                              <div className="font-sans text-slate-300">
                                <span className="font-bold text-white">{c.challengerName}</span> gegen <span className="font-bold text-white">{c.opponentName}</span>
                              </div>
                            </div>

                            <div className="text-right space-y-0.5 font-mono text-[10px]">
                              <div className={`font-black ${isTie ? 'text-slate-400' : isWinner ? 'text-emerald-400' : 'text-amber-500'}`}>
                                {winnerLabel}
                              </div>
                              <div className="text-slate-500">
                                {c.completedAt ? new Date(c.completedAt).toLocaleDateString('de-DE') : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* COLUMN 2: NEW CHALLENGE */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <Swords className="w-4.5 h-4.5 text-pink-400" />
                    <span>Neue Herausforderung</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">Wähle dein Spiel, konfiguriere die Einstellungen und fordere andere Keeper heraus.</p>
                </div>

                <div className="space-y-4">
                  {/* OPPONENT SELECTION */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Gegner auswählen
                    </label>
                    <select
                      value={selectedOpponentId}
                      onChange={(e) => setSelectedOpponentId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 py-3 px-3.5 rounded-xl text-xs font-sans focus:outline-none focus:border-pink-500 transition-colors"
                    >
                      <option value="all">An alle senden (Offenes Duell - Erster gewinnt)</option>
                      {usersList
                        .filter(u => u.uid !== userProfile.uid && u.role !== 'kraftsport' && !u.archived)
                        .map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.name} ({u.role === 'keeper_verein' ? 'Eigener Verein' : 'Extern'})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* GAME SELECTION */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Kognitionsspiel wählen
                    </label>
                    <select
                      value={selectedGameId}
                      onChange={(e) => {
                        setSelectedGameId(e.target.value);
                        setGameSettingsLevel(1);
                      }}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 py-3 px-3.5 rounded-xl text-xs font-sans focus:outline-none focus:border-pink-500 transition-colors"
                    >
                      <option value="reaction_grid">Reaction Grid</option>
                      <option value="attention_divided">Attention Divided (3 Runden)</option>
                      <option value="blitzmerker">Blitzmerker (5 Runden)</option>
                      <option value="farbrausch">Farbrausch (Control)</option>
                      <option value="memobox">Memobox (Shell Game)</option>
                      <option value="solitaria">Solitaria (Deviation)</option>
                      <option value="mind_architect">Mind Architect</option>
                      <option value="flights">Flights (Flugbahn-Antizipation - 3 Runden)</option>
                    </select>
                  </div>

                  {/* AUTOMATIC MAX DIFFICULTY INFO */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono">
                      <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Schwerste Herausforderung mit Stroboskop-Effekt</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                      Das Duell wird automatisch auf der maximalen Schwierigkeitsstufe inkl. Stroboskop-Effekt gestartet. Keine weiteren Einstellungen erforderlich!
                    </p>
                  </div>

                  <button
                    disabled={!selectedOpponentId}
                    onClick={async () => {
                      const settings: any = {
                        gridSize: 5,
                        gameMode: 'sequence',
                        strobeMode: 'fast',
                        level: (selectedGameId === 'solitaria' || selectedGameId === 'farbrausch') ? 4 : 3
                      };

                      const isAll = selectedOpponentId === 'all';
                      const targetOpponent = isAll ? null : usersList.find(u => u.uid === selectedOpponentId);
                      const opponentName = isAll ? 'Alle Keeper' : (targetOpponent ? targetOpponent.name : 'Unbekannter Keeper');

                      try {
                        // Create the challenge in Firestore IMMEDIATELY!
                        const docRef = await addDoc(collection(db, 'kognitionsspiele_challenges'), {
                          gameId: selectedGameId,
                          gameName: getGameNameById(selectedGameId),
                          challengerId: userProfile.uid,
                          challengerName: userProfile.name,
                          challengerScore: null,
                          challengerStats: null,
                          opponentId: selectedOpponentId,
                          opponentName: opponentName,
                          opponentGroup: 'Alle',
                          opponentScore: null,
                          opponentStats: null,
                          status: 'pending',
                          winnerId: null,
                          winnerName: null,
                          gameSettings: settings,
                          createdAt: new Date().toISOString(),
                          completedAt: null
                        });

                        setActiveChallenge({
                          isCreating: true,
                          isAnswering: false,
                          opponentId: selectedOpponentId,
                          opponentName: opponentName,
                          opponentGroup: 'Alle',
                          gameId: selectedGameId,
                          gameName: getGameNameById(selectedGameId),
                          gameSettings: settings,
                          challengeId: docRef.id
                        });
                        setActiveView(selectedGameId as any);
                      } catch (err) {
                        console.error('Error starting challenge:', err);
                        alert('Fehler beim Starten des Duells. Bitte erneut versuchen.');
                      }
                    }}
                    className={`w-full py-4 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${selectedOpponentId ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'}`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Herausforderung beginnen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. REACTION GRID GAME VIEW */}
      {activeView === 'reaction_grid' && (
        <div key={gameKey}>
          <ReactionGrid
            userProfile={userProfile}
            onBack={() => {
              if (activeChallenge) {
                alert("Du befindest dich in einem aktiven Wettkampf. Dieser kann nicht abgebrochen oder zurückgezogen werden!");
              } else {
                setActiveView('kognitionsspiele');
              }
            }}
            onUpdatePoints={onUpdatePoints}
            onTrainingComplete={(score) => handleTrainingComplete('reaction_grid', score)}
            challengeMode={activeChallenge ? {
              isCreating: activeChallenge.isCreating,
              isAnswering: activeChallenge.isAnswering,
              opponentGroup: activeChallenge.opponentGroup,
              gameId: activeChallenge.gameId,
              gameName: activeChallenge.gameName,
              challengerScore: activeChallenge.challengerScore,
              challengerStats: activeChallenge.challengerStats,
              challengeId: activeChallenge.challengeId,
              gameSettings: activeChallenge.gameSettings,
              onComplete: handleChallengeGameComplete
            } : undefined}
          />
        </div>
      )}

      {/* 6. ATTENTION DIVIDED GAME VIEW */}
      {activeView === 'attention_divided' && (
        <div key={gameKey}>
          <AttentionDivided
            userProfile={userProfile}
            onBack={() => {
              if (activeChallenge) {
                alert("Du befindest dich in einem aktiven Wettkampf. Dieser kann nicht abgebrochen oder zurückgezogen werden!");
              } else {
                setActiveView('kognitionsspiele');
              }
            }}
            onUpdatePoints={onUpdatePoints}
            onTrainingComplete={(score) => handleTrainingComplete('attention_divided', score)}
            challengeMode={activeChallenge ? {
              isCreating: activeChallenge.isCreating,
              isAnswering: activeChallenge.isAnswering,
              opponentGroup: activeChallenge.opponentGroup,
              gameId: activeChallenge.gameId,
              gameName: activeChallenge.gameName,
              challengerScore: activeChallenge.challengerScore,
              challengerStats: activeChallenge.challengerStats,
              challengeId: activeChallenge.challengeId,
              gameSettings: activeChallenge.gameSettings,
              onComplete: handleChallengeGameComplete
            } : undefined}
          />
        </div>
      )}

      {/* 7. BLITZMERKER GAME VIEW */}
      {activeView === 'blitzmerker' && (
        <div key={gameKey}>
          <Blitzmerker
            userProfile={userProfile}
            onBack={() => {
              if (activeChallenge) {
                alert("Du befindest dich in einem aktiven Wettkampf. Dieser kann nicht abgebrochen oder zurückgezogen werden!");
              } else {
                setActiveView('kognitionsspiele');
              }
            }}
            onUpdatePoints={onUpdatePoints}
            onTrainingComplete={(score) => handleTrainingComplete('blitzmerker', score)}
            challengeMode={activeChallenge ? {
              isCreating: activeChallenge.isCreating,
              isAnswering: activeChallenge.isAnswering,
              opponentGroup: activeChallenge.opponentGroup,
              gameId: activeChallenge.gameId,
              gameName: activeChallenge.gameName,
              challengerScore: activeChallenge.challengerScore,
              challengerStats: activeChallenge.challengerStats,
              challengeId: activeChallenge.challengeId,
              gameSettings: activeChallenge.gameSettings,
              onComplete: handleChallengeGameComplete
            } : undefined}
          />
        </div>
      )}

      {/* 8. FARBRAUSCH GAME VIEW */}
      {activeView === 'farbrausch' && (
        <div key={gameKey}>
          <Farbrausch
            userProfile={userProfile}
            onBack={() => {
              if (activeChallenge) {
                alert("Du befindest dich in einem aktiven Wettkampf. Dieser kann nicht abgebrochen oder zurückgezogen werden!");
              } else {
                setActiveView('kognitionsspiele');
              }
            }}
            onUpdatePoints={onUpdatePoints}
            onTrainingComplete={(score) => handleTrainingComplete('farbrausch', score)}
            challengeMode={activeChallenge ? {
              isCreating: activeChallenge.isCreating,
              isAnswering: activeChallenge.isAnswering,
              opponentGroup: activeChallenge.opponentGroup,
              gameId: activeChallenge.gameId,
              gameName: activeChallenge.gameName,
              challengerScore: activeChallenge.challengerScore,
              challengerStats: activeChallenge.challengerStats,
              challengeId: activeChallenge.challengeId,
              gameSettings: activeChallenge.gameSettings,
              onComplete: handleChallengeGameComplete
            } : undefined}
          />
        </div>
      )}

      {/* 9. MEMOBOX GAME VIEW */}
      {activeView === 'memobox' && (
        <div key={gameKey}>
          <Memobox
            userProfile={userProfile}
            onBack={() => {
              if (activeChallenge) {
                alert("Du befindest dich in einem aktiven Wettkampf. Dieser kann nicht abgebrochen oder zurückgezogen werden!");
              } else {
                setActiveView('kognitionsspiele');
              }
            }}
            onUpdatePoints={onUpdatePoints}
            onTrainingComplete={(score) => handleTrainingComplete('memobox', score)}
            challengeMode={activeChallenge ? {
              isCreating: activeChallenge.isCreating,
              isAnswering: activeChallenge.isAnswering,
              opponentGroup: activeChallenge.opponentGroup,
              gameId: activeChallenge.gameId,
              gameName: activeChallenge.gameName,
              challengerScore: activeChallenge.challengerScore,
              challengerStats: activeChallenge.challengerStats,
              challengeId: activeChallenge.challengeId,
              gameSettings: activeChallenge.gameSettings,
              onComplete: handleChallengeGameComplete
            } : undefined}
          />
        </div>
      )}

      {/* 10. SOLITARIA GAME VIEW */}
      {activeView === 'solitaria' && (
        <div key={gameKey}>
          <Solitaria
            userProfile={userProfile}
            onBack={() => {
              if (activeChallenge) {
                alert("Du befindest dich in einem aktiven Wettkampf. Dieser kann nicht abgebrochen oder zurückgezogen werden!");
              } else {
                setActiveView('kognitionsspiele');
              }
            }}
            onUpdatePoints={onUpdatePoints}
            onTrainingComplete={(score) => handleTrainingComplete('solitaria', score)}
            challengeMode={activeChallenge ? {
              isCreating: activeChallenge.isCreating,
              isAnswering: activeChallenge.isAnswering,
              opponentGroup: activeChallenge.opponentGroup,
              gameId: activeChallenge.gameId,
              gameName: activeChallenge.gameName,
              challengerScore: activeChallenge.challengerScore,
              challengerStats: activeChallenge.challengerStats,
              challengeId: activeChallenge.challengeId,
              gameSettings: activeChallenge.gameSettings,
              onComplete: handleChallengeGameComplete
            } : undefined}
          />
        </div>
      )}

      {/* 11. MIND ARCHITECT GAME VIEW */}
      {activeView === 'mind_architect' && (
        <div key={gameKey}>
          <MindArchitect
            userProfile={userProfile}
            onBack={() => {
              if (activeChallenge) {
                alert("Du befindest dich in einem aktiven Wettkampf. Dieser kann nicht abgebrochen oder zurückgezogen werden!");
              } else {
                setActiveView('kognitionsspiele');
              }
            }}
            onUpdatePoints={onUpdatePoints}
            onTrainingComplete={(score) => handleTrainingComplete('mind_architect', score)}
            challengeMode={activeChallenge ? {
              isCreating: activeChallenge.isCreating,
              isAnswering: activeChallenge.isAnswering,
              opponentGroup: activeChallenge.opponentGroup,
              gameId: activeChallenge.gameId,
              gameName: activeChallenge.gameName,
              challengerScore: activeChallenge.challengerScore,
              challengerStats: activeChallenge.challengerStats,
              challengeId: activeChallenge.challengeId,
              gameSettings: activeChallenge.gameSettings,
              onComplete: handleChallengeGameComplete
            } : undefined}
          />
        </div>
      )}

      {/* 12. FLIGHTS GAME VIEW */}
      {activeView === 'flights' && (
        <div key={gameKey}>
          <Flights
            userProfile={userProfile}
            onBack={() => {
              if (activeChallenge) {
                alert("Du befindest dich in einem aktiven Wettkampf. Dieser kann nicht abgebrochen oder zurückgezogen werden!");
              } else {
                setActiveView('kognitionsspiele');
              }
            }}
            onUpdatePoints={onUpdatePoints}
            onTrainingComplete={(score) => handleTrainingComplete('flights', score)}
            challengeMode={activeChallenge ? {
              isCreating: activeChallenge.isCreating,
              isAnswering: activeChallenge.isAnswering,
              opponentGroup: activeChallenge.opponentGroup,
              gameId: activeChallenge.gameId,
              gameName: activeChallenge.gameName,
              challengerScore: activeChallenge.challengerScore,
              challengerStats: activeChallenge.challengerStats,
              challengeId: activeChallenge.challengeId,
              gameSettings: activeChallenge.gameSettings,
              onComplete: handleChallengeGameComplete
            } : undefined}
          />
        </div>
      )}

      {/* 13. TARGET STRIKING GAME VIEW */}
      {activeView === 'target_striking' && (
        <TargetStriking
          userProfile={userProfile}
          onBack={() => setActiveView('neuro_training')}
          onTrainingComplete={() => handleNeuroTrainingComplete('target_striking')}
        />
      )}

      {/* 14. EYE FOCUS GAME VIEW */}
      {activeView === 'eye_focus' && (
        <EyeFocus
          userProfile={userProfile}
          onBack={() => setActiveView('neuro_training')}
          onTrainingComplete={() => handleNeuroTrainingComplete('eye_focus')}
        />
      )}

      {/* 15. PERIPHERIE GAME VIEW */}
      {activeView === 'peripherie' && (
        <Peripherie
          userProfile={userProfile}
          onBack={() => setActiveView('neuro_training')}
          onTrainingComplete={() => handleNeuroTrainingComplete('peripherie')}
        />
      )}

      {/* 16. PERIPHERIE ZAEHLER GAME VIEW */}
      {activeView === 'peripherie_zaehler' && (
        <PeripherieZaehler
          userProfile={userProfile}
          onBack={() => setActiveView('neuro_training')}
          onTrainingComplete={() => handleNeuroTrainingComplete('peripherie_zaehler')}
        />
      )}

      {/* 17. REFLEX FOCUS GAME VIEW */}
      {activeView === 'reflex_focus' && (
        <ReflexFocus
          userProfile={userProfile}
          onBack={() => setActiveView('neuro_training')}
          onTrainingComplete={() => handleNeuroTrainingComplete('reflex_focus')}
          onResetPlayCount={() => handleResetNeuroStats('reflex_focus')}
          playCount={neuroStats['reflex_focus']?.playCount || 0}
        />
      )}

      {/* 18. STABILITY FOCUS GAME VIEW */}
      {activeView === 'stability_focus' && (
        <StabilityFocus
          userProfile={userProfile}
          onBack={() => setActiveView('neuro_training')}
          onTrainingComplete={() => handleNeuroTrainingComplete('stability_focus')}
          onResetPlayCount={() => handleResetNeuroStats('stability_focus')}
          playCount={neuroStats['stability_focus']?.playCount || 0}
        />
      )}

      {/* MULTI-ROUND INTERSTITIAL OVERLAY */}
      {showRoundOverlay && activeChallenge && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 text-center max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Check className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white">Runde abgeschlossen!</h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Du hast Runde {currentRoundIndex} von {activeChallenge.gameId === 'blitzmerker' ? 5 : 3} erfolgreich beendet. Deine Einstellungen bleiben gesichert.
              </p>
            </div>

            <button
              onClick={() => setShowRoundOverlay(false)}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Nächste Runde starten</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* DUEL DETAILED COMPARISON OVERLAY */}
      {lastChallengeResult && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 p-6 md:p-8 rounded-3xl space-y-6 text-center max-w-md w-full shadow-2xl shadow-amber-500/5 my-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                <Trophy className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full font-mono font-black uppercase">
                {lastChallengeResult.gameName}
              </span>
              <h3 className="text-xl font-black text-white mt-2">Wettkampf-Ergebnis</h3>
              <p className="text-xs text-slate-400 font-sans font-medium">
                Duell beendet! Die Ergebnisse wurden mit der Bestenliste abgeglichen.
              </p>
            </div>

            {/* RESULTS WINNER FLAG */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 text-center">
              <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider">WINNER</span>
              <span className="block text-base font-black text-amber-400 mt-1 uppercase font-mono">
                {lastChallengeResult.winnerName === 'tie' ? 'Unentschieden!' : lastChallengeResult.winnerName}
              </span>
              <p className="text-[10px] text-slate-400 font-sans mt-1.5 leading-relaxed">
                {lastChallengeResult.winnerName === 'tie' 
                  ? 'Keiner der beiden Torhüter erhält Punkte. Ihr wart exakt ebenbürtig!'
                  : lastChallengeResult.winnerName === userProfile.name
                    ? 'Herzlichen Glückwunsch! Du hast das Duell gewonnen und erhältst +1 Punkt in der Kategorie Kognition!'
                    : `Bleib fokussiert! ${lastChallengeResult.winnerName} war dieses Mal stärker und sichert sich den Punkt.`}
              </p>
            </div>

            {/* STATS COMPARISON GRID */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 text-center text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider px-2">
                <span>METRIK</span>
                <span>{lastChallengeResult.challengerName}</span>
                <span>{lastChallengeResult.opponentName}</span>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden divide-y divide-slate-850">
                {lastChallengeResult.statsComparison.map((stat, idx) => (
                  <div key={idx} className="grid grid-cols-3 p-3.5 text-center text-xs font-mono">
                    <span className="text-slate-400 font-sans text-left font-semibold text-[11px] flex items-center">{stat.label}</span>
                    <span className={`font-bold ${lastChallengeResult.challengerBetter ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {stat.challengerVal}
                    </span>
                    <span className={`font-bold ${!lastChallengeResult.challengerBetter && lastChallengeResult.winnerName !== 'tie' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {stat.opponentVal}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-slate-500 font-sans text-left leading-relaxed">
                <span className="font-bold text-slate-400">Entscheidungsregel:</span> {lastChallengeResult.winCriteria}
              </p>
            </div>

            <button
              onClick={() => setLastChallengeResult(null)}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
            >
              <span>Duelle ansehen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
