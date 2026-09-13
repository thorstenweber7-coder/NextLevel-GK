import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, increment, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GoogleAuthProvider, linkWithPopup, signInWithPopup } from 'firebase/auth';
import { UserProfile, VideoScene, VideoSubmission, hasModulePermission } from '../types';
import { Play, ArrowLeft, Check, AlertCircle, Award, BookOpen, ExternalLink, RefreshCw, Trophy, FileText, ChevronDown, ChevronUp, Shield, Target, Sparkles, X, Eye, HelpCircle, Tv, Video, Lock, Upload, Maximize2, CheckCircle2, XCircle } from 'lucide-react';
import GoalkeeperSimulator from './GoalkeeperSimulator';

interface VideoAnalysisProps {
  userProfile: UserProfile;
  onUpdatePoints: (newPoints: number, newPointsByCategory: any) => void;
  initialView?: 'menu' | 'analysis' | 'whatsnext' | 'coaching' | 'freestoss' | 'elfmeter' | 'veo' | 'bigsave';
  onBack?: () => void;
}

export default function VideoAnalysis({ userProfile, onUpdatePoints, initialView, onBack }: VideoAnalysisProps) {
  const [activeView, setActiveView] = useState<'menu' | 'analysis' | 'whatsnext' | 'coaching' | 'freestoss' | 'elfmeter' | 'veo' | 'bigsave'>(initialView || 'menu');
  
  // Data
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [submissions, setSubmissions] = useState<{ [sceneId: string]: VideoSubmission }>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [usersDb, setUsersDb] = useState<{ [uid: string]: string }>({}); // map of uid -> user's name for player analyses
  const [playerSubmissions, setPlayerSubmissions] = useState<VideoSubmission[]>([]); // all submissions for admins to see player's analyses
  
  const [loading, setLoading] = useState(true);
  const [globalAnalysisRules, setGlobalAnalysisRules] = useState('');

  // States
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [elfmeterTab, setElfmeterTab] = useState<'lernen' | 'uebung'>('lernen');
  const [veoFilter, setVeoFilter] = useState<'ALL' | 'U16' | 'U17' | 'U19'>('ALL');
  const [fullscreenVideoUrl, setFullscreenVideoUrl] = useState<string | null>(null);
  const [whatsnextTab, setWhatsnextTab] = useState<'flanken' | 'querpass' | '1vs1_nahdistanz' | 'ferndistanz' | 'abwehrkette'>('flanken');
  
  // A) Spielszenen inputs
  const [analysisText, setAnalysisText] = useState<{ [sceneId: string]: string }>({});

  // Goalkeeper Simulator States
  const [simulatorStarted, setSimulatorStarted] = useState(false);
  const [simRound, setSimRound] = useState(1);
  const [simScore, setSimScore] = useState(0);
  const [simStatus, setSimStatus] = useState<'setup' | 'shooting' | 'result'>('setup');
  const [simFkSide, setSimFkSide] = useState<'left' | 'center' | 'right'>('left');
  const [simWallPos, setSimWallPos] = useState<number>(2); // 0: Left, 1: Half-Left, 2: Center, 3: Half-Right, 4: Right
  const [simGkPos, setSimGkPos] = useState<number>(2); // 0: Left, 1: Half-Left, 2: Center, 3: Half-Right, 4: Right
  const [simShotTarget, setSimShotTarget] = useState<'left' | 'right'>('left');
  const [simFeedback, setSimFeedback] = useState('');
  const [simIsSaved, setSimIsSaved] = useState(false);
  const [simHistory, setSimHistory] = useState<{ round: number; side: string; result: 'save' | 'goal'; feedback: string }[]>([]);

  const startSimulator = () => {
    setSimRound(1);
    setSimScore(0);
    setSimHistory([]);
    setSimulatorStarted(true);
    generateRandomFreeKick(1);
  };

  const generateRandomFreeKick = (roundNum: number = 1) => {
    const sides: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    const randomSide = sides[Math.floor(Math.random() * sides.length)];
    setSimFkSide(randomSide);
    setSimWallPos(2);
    setSimGkPos(2);
    setSimStatus('setup');
    setSimRound(roundNum);
  };

  const handleSimulateShot = () => {
    const target: 'left' | 'right' = Math.random() > 0.5 ? 'left' : 'right';
    setSimShotTarget(target);
    
    let isSaved = false;
    let feedback = '';
    
    if (simFkSide === 'left') {
      if (target === 'left') {
        // Far post
        if (simGkPos === 0 || simGkPos === 1) {
          isSaved = true;
          feedback = "Hervorragendes Stellungsspiel! Du standest goldrichtig in der langen Ecke (Far Post) und hast den Ball glänzend pariert.";
        } else {
          isSaved = false;
          feedback = "Tor! Du standest zu weit in der kurzen Ecke und konntest den Ball in der langen Ecke nicht mehr erreichen.";
        }
      } else {
        // Near post
        if (simWallPos === 3 || simWallPos === 4) {
          isSaved = true;
          feedback = "Mauer blockt! Deine Mauer stand perfekt auf der rechten Seite und hat den Freistoß in die kurze Ecke abgewehrt.";
        } else if (simGkPos === 3 || simGkPos === 4) {
          isSaved = true;
          feedback = "Die Mauer stand zwar falsch, aber du hast den Fehler vorausgesehen und den Ball in der kurzen Ecke pariert!";
        } else {
          isSaved = false;
          feedback = "Tor! Die Mauer stand falsch und der Ball schlägt unhaltbar für dich in der kurzen Ecke (Near Post) ein.";
        }
      }
    } else if (simFkSide === 'right') {
      if (target === 'right') {
        // Far post
        if (simGkPos === 3 || simGkPos === 4) {
          isSaved = true;
          feedback = "Klasse Parade! Du standest perfekt in der langen Ecke (Far Post) und fängst den Ball sicher.";
        } else {
          isSaved = false;
          feedback = "Tor! Du standest zu nah an der Mauer und konntest den Ball in der langen Ecke nicht erreichen.";
        }
      } else {
        // Near post
        if (simWallPos === 0 || simWallPos === 1) {
          isSaved = true;
          feedback = "Mauer blockt! Deine Mauer stand ideal auf der linken Seite und blockiert den Schuss des Gegners.";
        } else if (simGkPos === 0 || simGkPos === 1) {
          isSaved = true;
          feedback = "Die Mauer hatte ein Loch, aber durch deine schnelle Reaktion konntest du den Ball in der kurzen Ecke noch parieren!";
        } else {
          isSaved = false;
          feedback = "Tor! Der Freistoß schlägt in der kurzen Ecke ein, weil die Mauer falsch positioniert war und du auf die lange Ecke spekuliert hast.";
        }
      }
    } else {
      // Center
      const wallCoversLeft = simWallPos <= 1;
      const wallCoversRight = simWallPos >= 3;
      const gkCoversLeft = simGkPos <= 1;
      const gkCoversRight = simGkPos >= 3;
      
      if (target === 'left') {
        if (wallCoversLeft) {
          isSaved = true;
          feedback = "Mauer blockt! Du hast die Mauer links aufgestellt und sie hat die Ecke erfolgreich abgesichert.";
        } else if (gkCoversLeft) {
          isSaved = true;
          feedback = "Ganz starke Parade! Du hast dich auf die linke Seite konzentriert und den Ball gehalten.";
        } else {
          isSaved = false;
          feedback = "Tor! Freistoß schlägt links ein. Bei zentralen Freistößen musst du eine Seite mit der Mauer blockieren und die andere selbst abdecken.";
        }
      } else {
        // target right
        if (wallCoversRight) {
          isSaved = true;
          feedback = "Mauer blockt! Die Mauer stand rechts und wehrt den Ball ab.";
        } else if (gkCoversRight) {
          isSaved = true;
          feedback = "Glanzparade! Du standest optimal auf der rechten Seite und lenkst den Ball um den Pfosten.";
        } else {
          isSaved = false;
          feedback = "Tor! Der Schuss schlägt rechts ein. Stelle die Mauer auf eine Seite und positioniere dich entgegengesetzt.";
        }
      }
    }
    
    setSimIsSaved(isSaved);
    setSimFeedback(feedback);
    setSimStatus('shooting');
    
    const finalScore = isSaved ? simScore + 1 : simScore;
    if (simRound === 5) {
      if (finalScore >= 3) {
        rewardPoint(5, `Torwartsimulator erfolgreich absolviert (${finalScore}/5 gehalten)`);
      }
    }
    
    // Set a timer to finish the shot animation
    setTimeout(() => {
      setSimStatus('result');
      if (isSaved) {
        setSimScore(prev => prev + 1);
      }
      setSimHistory(prev => [
        ...prev,
        {
          round: simRound,
          side: simFkSide === 'left' ? 'Links' : simFkSide === 'right' ? 'Rechts' : 'Mitte',
          result: isSaved ? 'save' : 'goal',
          feedback
        }
      ]);
    }, 1200);
  };

  const isSceneVisible = (scene: VideoScene) => {
    if (!scene.assignedUsers || scene.assignedUsers.length === 0) return true;
    return scene.assignedUsers.includes(userProfile.uid);
  };

  // Fetch Video scenes, categories and user submissions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Load scenes
        const scenesSnap = await getDocs(collection(db, 'video_scenes'));
        const scenesList: VideoScene[] = [];
        scenesSnap.forEach((doc) => {
          scenesList.push({ id: doc.id, ...doc.data() } as VideoScene);
        });
        setScenes(scenesList);

        // Load general analysis rules config
        const rulesSnap = await getDoc(doc(db, 'config', 'analysisRules'));
        if (rulesSnap.exists()) {
          setGlobalAnalysisRules(rulesSnap.data().text || '');
        }

        // Load categories for A
        const catSnap = await getDocs(collection(db, 'video_categories'));
        const catList: { id: string; name: string }[] = [];
        catSnap.forEach((doc) => {
          catList.push({ id: doc.id, name: doc.data().name });
        });
        setCategories(catList);
        if (catList.length > 0) setSelectedCategoryId(catList[0].id);

        // Load submissions of active user
        const subQuery = userProfile.role === 'admin'
          ? collection(db, 'video_submissions')
          : query(collection(db, 'video_submissions'), where('userId', '==', userProfile.uid));
        const subSnap = await getDocs(subQuery);
        const subMap: { [sceneId: string]: VideoSubmission } = {};
        const allPlayerSubs: VideoSubmission[] = [];
        
        subSnap.forEach((doc) => {
          const s = { id: doc.id, ...doc.data() } as VideoSubmission;
          allPlayerSubs.push(s);
          if (userProfile.role === 'admin' || s.userId === userProfile.uid) {
            subMap[s.sceneId] = s;
          }
        });

        // Automatically clear admin's submission for Lernszene 1 if requested
        if (userProfile.role === 'admin') {
          const lernszene1 = scenesList.find(s => s.type === 'elfmeter_lernen');
          if (lernszene1 && subMap[lernszene1.id]) {
            const adminSubId = `${userProfile.uid}_${lernszene1.id}`;
            delete subMap[lernszene1.id];
            try {
              await deleteDoc(doc(db, 'video_submissions', adminSubId));
            } catch (e) {
              console.error('Error removing admin sub for Lernszene 1:', e);
            }
          }
        }

        setSubmissions(subMap);
        setPlayerSubmissions(allPlayerSubs);

        // If admin, load user profile map to display player names in analyses
        if (userProfile.role === 'admin') {
          const usersSnap = await getDocs(collection(db, 'users'));
          const uMap: { [uid: string]: string } = {};
          usersSnap.forEach((doc) => {
            uMap[doc.id] = doc.data().name || doc.data().username || 'Spieler';
          });
          setUsersDb(uMap);
        }

      } catch (err) {
        console.error('Error fetching video analysis data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeView, userProfile.uid, userProfile.role]);

  // Points incrementer utility (disabled for Videoanalyse)
  const rewardPoint = async (_pointsAmount: number, _actionName: string) => {
    return;
  };

  // Submit typed analysis in A
  const handleSendAnalysis = async (sceneId: string) => {
    const text = analysisText[sceneId] || '';
    if (!text.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const subId = `${userProfile.uid}_${sceneId}`;

    const submission: VideoSubmission = {
      id: subId,
      userId: userProfile.uid,
      sceneId,
      timestamp: todayStr,
      submission: { text }
    };

    try {
      await setDoc(doc(db, 'video_submissions', subId), submission);
      
      // Update local state
      setSubmissions(prev => ({ ...prev, [sceneId]: submission }));

      // Reward 1 Point
      await rewardPoint(1, 'Videoanalyse: Eigene Analyse Spielszene eingereicht');
    } catch (err) {
      console.error('Error sending analysis:', err);
    }
  };

  // Handle MC response inside B, C, D
  const handleSelectMCAnswer = async (scene: VideoScene, selectedOption: string) => {
    if (submissions[scene.id]) return; // already answered

    const subId = `${userProfile.uid}_${scene.id}`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    const isCorrect = selectedOption === scene.correctAnswer;
    const pts = isCorrect ? 1 : 0;

    const submission: VideoSubmission = {
      id: subId,
      userId: userProfile.uid,
      sceneId: scene.id,
      timestamp: todayStr,
      submission: { answer: selectedOption },
      correct: isCorrect
    };

    try {
      await setDoc(doc(db, 'video_submissions', subId), submission);
      setSubmissions(prev => ({ ...prev, [scene.id]: submission }));

      if (pts > 0) {
        await rewardPoint(pts, `Videoanalyse: Frage richtig beantwortet (${scene.type})`);
      }
    } catch (err) {
      console.error('Error logging MC answer:', err);
    }
  };

  // Handle Free Kick MC response (D) which has 2 questions
  const [freestossSelected, setFreestossSelected] = useState<{ [sceneId: string]: { pos?: string; wall?: string } }>({});

  const handleSelectFreestossAnswer = async (scene: VideoScene, key: 'pos' | 'wall', val: string) => {
    setFreestossSelected(prev => ({
      ...prev,
      [scene.id]: {
        ...prev[scene.id],
        [key]: val
      }
    }));
  };

  const handleSubmitFreestoss = async (scene: VideoScene) => {
    const selected = freestossSelected[scene.id];
    if (!selected || !selected.pos || !selected.wall) {
      alert('Bitte beantworte beide Fragen zuerst!');
      return;
    }

    const subId = `${userProfile.uid}_${scene.id}`;
    const todayStr = new Date().toISOString().split('T')[0];

    // Correct Answers configuration in Coaching Zone:
    // e.g. scene.correctAnswer is stored as "posOptIndex,wallOptIndex" or similar
    // For robust matching, we assume scene.correctAnswer contains something like "Option 1|Option 2"
    let isCorrect = false;
    const splitAnswers = scene.correctAnswer ? scene.correctAnswer.split('|') : [];
    if (splitAnswers.length >= 2) {
      isCorrect = (selected.pos === splitAnswers[0]) && (selected.wall === splitAnswers[1]);
    } else {
      isCorrect = true; // fallback
    }

    const pts = isCorrect ? 1 : 0;

    const submission: VideoSubmission = {
      id: subId,
      userId: userProfile.uid,
      sceneId: scene.id,
      timestamp: todayStr,
      submission: { pos: selected.pos, wall: selected.wall },
      correct: isCorrect
    };

    try {
      await setDoc(doc(db, 'video_submissions', subId), submission);
      setSubmissions(prev => ({ ...prev, [scene.id]: submission }));

      if (pts > 0) {
        await rewardPoint(pts, 'Videoanalyse: Freistoß-Positionierung richtig gelöst');
      }
    } catch (err) {
      console.error('Error logging Freistoß response:', err);
    }
  };

  // Handle E) Penalty Lernen option change (Users can answer strictly ONCE, +1 point if correct)
  const handleSelectPenaltyLernen = async (scene: VideoScene, option: string) => {
    if (submissions[scene.id]) return; // Already answered - selection locked!

    const subId = `${userProfile.uid}_${scene.id}`;
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if user answer matches correct answer (Rechts, Mitte, Links)
    const userAns = option.trim().toLowerCase();
    const correctAns = (scene.correctAnswer || '').trim().toLowerCase();
    const isCorrect = correctAns ? (userAns === correctAns || correctAns.includes(userAns) || userAns.includes(correctAns)) : false;

    const pts = isCorrect ? 1 : 0;

    const submission: VideoSubmission = {
      id: subId,
      userId: userProfile.uid,
      sceneId: scene.id,
      timestamp: todayStr,
      submission: { direction: option },
      correct: isCorrect
    };

    try {
      await setDoc(doc(db, 'video_submissions', subId), submission);
      setSubmissions(prev => ({ ...prev, [scene.id]: submission }));

      if (pts > 0) {
        await rewardPoint(pts, 'Videoanalyse: Elfmeter-Ecke richtig erraten (+1 Pkt)');
      }
    } catch (err) {
      console.error('Error logging Lernen penalty:', err);
    }
  };

  // Reset penalty selection for admin testing
  const handleResetPenaltySelection = async (scene: VideoScene) => {
    const subId = `${userProfile.uid}_${scene.id}`;
    try {
      await deleteDoc(doc(db, 'video_submissions', subId));
      setSubmissions(prev => {
        const copy = { ...prev };
        delete copy[scene.id];
        return copy;
      });
    } catch (err) {
      console.error('Error resetting submission:', err);
    }
  };

  // Handle E) Penalty Übung completion
  const handleCheckPenaltyUebung = async (scene: VideoScene) => {
    if (submissions[scene.id]) return; // Already completed

    const subId = `${userProfile.uid}_${scene.id}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const submission: VideoSubmission = {
      id: subId,
      userId: userProfile.uid,
      sceneId: scene.id,
      timestamp: todayStr,
      submission: { completed: true },
      correct: true
    };

    try {
      await setDoc(doc(db, 'video_submissions', subId), submission);
      setSubmissions(prev => ({ ...prev, [scene.id]: submission }));

      // Reward 1 Point
      await rewardPoint(1, 'Videoanalyse: Elfmeter-Übung abgeschlossen (+1 Pkt)');
    } catch (err) {
      console.error('Error logging Penalty exercise:', err);
    }
  };

  // Helper to extract youtube ID
  const getYouTubeEmbedId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  // Render Youtube Video embed with Vollbild toggle button
  const renderEmbedVideo = (url: string, title?: string) => {
    const embedId = getYouTubeEmbedId(url);

    if (embedId) {
      return (
        <div className="relative group aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 shadow shadow-slate-950 bg-black">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${embedId}?rel=0`}
            title={title || "Videoanalyse"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            className="w-full h-full"
          ></iframe>

          <button
            type="button"
            onClick={() => setFullscreenVideoUrl(url)}
            className="absolute top-3 right-3 px-3 py-1.5 bg-slate-950/85 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg cursor-pointer z-10"
            title="Vollbildmodus öffnen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Vollbild</span>
          </button>
        </div>
      );
    }

    return (
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
        <span>Externer Video-Link:</span>
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline flex items-center gap-1 font-mono">
            <span>{url}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => setFullscreenVideoUrl(url)}
            className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 flex items-center gap-1 cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Vollbild</span>
          </button>
        </div>
      </div>
    );
  };

  // Helper: push completed items to the bottom of the array
  const sortScenesByCompleted = (list: VideoScene[]) => {
    return [...list].sort((a, b) => {
      const aDone = !!submissions[a.id];
      const bDone = !!submissions[b.id];
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });
  };

  const positionsList = ['Links', 'Halb-Links', 'Mitte', 'Halb-Rechts', 'Rechts'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 font-sans">
      {/* MENU VIEW */}
      {activeView === 'menu' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-amber-500" />
              Videoanalyse
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
              Analysiere und lerne Spiel- und Trainingsszenen
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[
              { id: 'analysis', label: 'Analyse von Spielszenen', icon: Eye, color: 'text-sky-400 border-sky-500/10 bg-sky-500/5', permission: 'video_scenes' },
              ...(userProfile.role !== 'keeper_extern' ? [{ id: 'veo', label: 'Veo Links zu den Spielen', icon: Tv, color: 'text-rose-400 border-rose-500/10 bg-rose-500/5', permission: 'video_veo' }] : []),
              { id: 'bigsave', label: 'Big Save Award', icon: Trophy, color: 'text-yellow-400 border-yellow-500/10 bg-yellow-500/5', permission: 'video_bigsave' }
            ].map(item => {
              const IconComp = item.icon;
              const isLocked = item.permission !== 'always_unlocked' && !hasModulePermission(userProfile, item.permission);

              if (isLocked) {
                return (
                  <button
                    key={item.id}
                    onClick={() => alert('Dieses Modul wurde noch nicht freigeschaltet. Bitte wende dich an deinen Coach.')}
                    className="p-4 py-5 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col items-center justify-center text-center opacity-65 cursor-pointer gap-2.5 select-none relative"
                  >
                    <div className="absolute top-2.5 right-2.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-zinc-500">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-zinc-500 shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="block text-xs sm:text-sm font-bold text-zinc-500 leading-snug">
                      {item.label}
                    </span>
                    <span className="block text-[9px] font-mono text-amber-500 uppercase font-bold tracking-wider">
                      Gesperrt
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className="p-4 py-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:border-amber-500/40 shadow-md group cursor-pointer gap-2.5"
                >
                  <div className={`p-2 rounded-xl border ${item.color} shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="block text-xs sm:text-sm font-bold text-white group-hover:text-amber-500 transition-colors leading-snug">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAILED CATEGORIES VIEW */}
      {activeView !== 'menu' && (
        <div className="space-y-6">
          {/* Back Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onBack ? onBack() : setActiveView('menu')}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">
                {activeView === 'analysis' && 'Analyse von Spielszenen'}
                {activeView === 'whatsnext' && 'Taktikanalyse'}
                {activeView === 'coaching' && 'Coaching Spielszenen'}
                {activeView === 'freestoss' && 'Freistöße'}
                {activeView === 'elfmeter' && 'Elfmeter'}
                {activeView === 'veo' && 'Veo Links zu den Spielen'}
                {activeView === 'bigsave' && 'Big Save Award'}
              </h1>
              <span className="text-xs text-slate-400 font-mono">Videoanalyse Coaching-Zone</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-3"></div>
              <p className="text-xs text-slate-500 font-mono">Daten werden geladen...</p>
            </div>
          ) : (
            <>
              {/* SECTION A: Analyse von Spielszenen */}
              {activeView === 'analysis' && (
                <div className="space-y-6">
                  {/* Category Filter */}
                  {categories.length === 0 ? (
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-400 font-mono">
                      Noch keine Kategorien angelegt.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                            selectedCategoryId === cat.id
                              ? 'bg-amber-500 border-amber-600 text-slate-950 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Scenes inside Category */}
                  {scenes.filter(s => s.type === 'analysis' && s.categoryId === selectedCategoryId && isSceneVisible(s)).length === 0 ? (
                    <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                      In dieser Kategorie wurden noch keine Videos freigegeben.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {scenes
                        .filter(s => s.type === 'analysis' && s.categoryId === selectedCategoryId && isSceneVisible(s))
                        .map((scene, idx) => {
                          const done = !!submissions[scene.id];
                          const sub = submissions[scene.id];
                          const txt = analysisText[scene.id] || '';

                          return (
                            <div key={scene.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                              <h3 className="text-sm font-bold text-white font-mono">
                                Szene {idx + 1}
                              </h3>

                              {renderEmbedVideo(scene.videoLink)}

                              {(globalAnalysisRules || scene.analysisRules) && (
                                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                                  {globalAnalysisRules && (
                                    <div>
                                      <span className="block text-[8px] text-amber-500 font-mono uppercase font-black">Allgemeine Analyse-Regeln</span>
                                      <p className="text-xs text-slate-300 font-sans leading-relaxed mt-0.5 whitespace-pre-wrap">
                                        {globalAnalysisRules}
                                      </p>
                                    </div>
                                  )}
                                  {scene.analysisRules && (
                                    <div className={globalAnalysisRules ? "pt-2 border-t border-slate-900" : ""}>
                                      <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Spezifische Hinweise zur Szene</span>
                                      <p className="text-xs text-slate-300 font-sans leading-relaxed mt-0.5 whitespace-pre-wrap">
                                        {scene.analysisRules}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {!done ? (
                                <div className="space-y-2">
                                  <label className="block text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                                    Eigene Analyse verfassen
                                  </label>
                                  <textarea
                                    value={txt}
                                    onChange={(e) => setAnalysisText(prev => ({ ...prev, [scene.id]: e.target.value }))}
                                    placeholder="Beschreibe deine Stellungsarbeit, den Absprung, Handstellung..."
                                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                  />
                                  <button
                                    onClick={() => handleSendAnalysis(scene.id)}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Analyse abschicken (+1 Punkt)</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                    <span className="block text-[8px] text-emerald-400 font-mono uppercase font-black">Deine eingereichte Analyse</span>
                                    <p className="text-xs text-slate-200 font-sans mt-0.5 leading-relaxed italic">
                                      "{sub.submission?.text}"
                                    </p>
                                  </div>

                                  <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                    <span className="block text-[8px] text-amber-500 font-mono uppercase font-black">Trainer-Musteranalyse</span>
                                    <p className="text-xs text-slate-300 font-sans mt-0.5 leading-relaxed">
                                      {scene.followUpText || 'Der Trainer hat noch keine Musteranalyse für diese Szene freigegeben.'}
                                    </p>
                                  </div>

                                  {scene.trainingRecommendation && (
                                    <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                      <span className="block text-[8px] text-amber-500 font-mono uppercase font-black">Trainingsempfehlungen</span>
                                      <p className="text-xs text-slate-300 font-sans mt-0.5 leading-relaxed">
                                        {scene.trainingRecommendation}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Admin special View: Player Submissions */}
                              {userProfile.role === 'admin' && (
                                <div className="mt-4 pt-4 border-t border-slate-800/60">
                                  <details className="group">
                                    <summary className="flex items-center justify-between text-xs font-bold text-slate-400 font-mono cursor-pointer select-none">
                                      <span>[ Spieler-Analysen einsehen ]</span>
                                      <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="mt-3 space-y-2.5 max-h-48 overflow-y-auto pt-1">
                                      {playerSubmissions.filter(ps => ps.sceneId === scene.id).length === 0 ? (
                                        <p className="text-[10px] text-slate-500 font-mono italic">Noch keine Spielerabgaben.</p>
                                      ) : (
                                        playerSubmissions
                                          .filter(ps => ps.sceneId === scene.id)
                                          .map((ps, sIdx) => (
                                            <div key={sIdx} className="bg-slate-950 p-2.5 border border-slate-850 rounded-lg text-[11px]">
                                              <span className="block font-bold text-amber-500 font-mono">{usersDb[ps.userId] || 'Spieler'}</span>
                                              <p className="text-slate-300 italic mt-0.5">"{ps.submission?.text}"</p>
                                            </div>
                                          ))
                                      )}
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION B & C: Whats-Next / Coaching Spielszenen */}
              {(activeView === 'whatsnext' || activeView === 'coaching') && (() => {
                const activeScenes = scenes.filter(s => {
                  if (s.type !== activeView || !isSceneVisible(s)) return false;
                  if (activeView === 'whatsnext') {
                    if (s.subCategory) {
                      return s.subCategory === whatsnextTab;
                    }
                    return whatsnextTab === 'flanken';
                  }
                  return true;
                });

                return (
                  <div className="space-y-6">
                    {activeView === 'whatsnext' && (
                      <div className="flex border-b border-slate-900 gap-1 pb-px overflow-x-auto scrollbar-none">
                        {[
                          { id: 'flanken', label: 'Flankensituationen', perm: 'training_whatsnext_flanken' },
                          { id: 'querpass', label: 'Querpasssituationen', perm: 'training_whatsnext_querpass' },
                          { id: '1vs1_nahdistanz', label: '1vs1 Situationen & Nahdistanzsituationen', perm: 'training_whatsnext_1vs1_nahdistanz' },
                          { id: 'ferndistanz', label: 'Ferndistanzsituationen', perm: 'training_whatsnext_ferndistanz' },
                          { id: 'abwehrkette', label: 'Verteidigen hinter der Abwehrkette', perm: 'training_whatsnext_abwehrkette' },
                        ].map(sub => {
                          const isLocked = !hasModulePermission(userProfile, sub.perm);
                          const isActive = whatsnextTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                if (isLocked) {
                                  alert('Dieses Modul wurde noch nicht freigeschaltet. Bitte wende dich an deinen Coach.');
                                  return;
                                }
                                setWhatsnextTab(sub.id as any);
                              }}
                              className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                isActive
                                  ? 'border-amber-500 text-amber-400'
                                  : isLocked
                                  ? 'border-transparent text-zinc-600 hover:text-zinc-500'
                                  : 'border-transparent text-slate-400 hover:text-white'
                              }`}
                            >
                              {isLocked && <Lock className="w-3 h-3 text-amber-500/80 shrink-0" />}
                              <span>{sub.label}</span>
                              {isLocked && <span className="text-[9px] text-amber-500 font-mono font-bold ml-1">(Gesperrt)</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activeScenes.length === 0 ? (
                      <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 font-mono text-xs">
                        Es wurden noch keine Szenen für diesen Bereich freigegeben.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {sortScenesByCompleted(activeScenes).map((scene, idx) => {
                        const done = !!submissions[scene.id];
                        const sub = submissions[scene.id];

                        return (
                          <div
                            key={scene.id}
                            className={`border rounded-2xl p-5 space-y-4 ${
                              done ? 'bg-slate-900/60 border-slate-850' : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-bold text-white font-mono">
                                Szene {idx + 1}
                              </h3>
                              {done && (
                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                                  sub.correct 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {sub.correct ? 'RICHTIG' : 'FALSCH'}
                                </span>
                              )}
                            </div>

                            {renderEmbedVideo(scene.videoLink)}

                            {/* Question & MC Panel */}
                            <div className="space-y-3">
                              <span className="block text-xs font-black text-slate-200">
                                {scene.question || (activeView === 'whatsnext' ? 'Was tust du als nächstes?' : 'Was coachst du an den folgenden Stellen?')}
                              </span>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {scene.answers?.map((option, oIdx) => {
                                  const isSelected = sub?.submission?.answer === option;
                                  const isCorrectOption = option === scene.correctAnswer;
                                  
                                  let btnClass = 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900';
                                  
                                  if (done) {
                                    if (isCorrectOption) {
                                      btnClass = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold';
                                    } else if (isSelected && !sub.correct) {
                                      btnClass = 'bg-red-500/10 border-red-500 text-red-400';
                                    } else {
                                      btnClass = 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
                                    }
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      disabled={done}
                                      onClick={() => handleSelectMCAnswer(scene, option)}
                                      className={`p-3 text-left border rounded-xl text-xs transition-all ${btnClass} font-sans ${!done && 'cursor-pointer'}`}
                                    >
                                      {option}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Follow-up info after completion */}
                            {done && scene.followUpText && (
                              <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs">
                                <span className="block text-[8px] text-amber-500 font-mono uppercase font-black">Erklärung / Folgeaktion</span>
                                <p className="text-slate-300 mt-1 font-sans leading-relaxed">
                                  {scene.followUpText}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

              {/* SECTION D: Freistöße aus Torwartsicht (Interactive Goalkeeper Simulator) */}
              {activeView === 'freestoss' && (
                <GoalkeeperSimulator onBack={onBack || (() => setActiveView('menu'))} />
              )}

              {/* SECTION E: Analyse von Elfmetern */}
              {activeView === 'elfmeter' && (
                <div className="space-y-6">
                  {/* Sub-tabs */}
                  <div className="flex border-b border-slate-800">
                    <button
                      onClick={() => setElfmeterTab('lernen')}
                      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all cursor-pointer ${
                        elfmeterTab === 'lernen'
                          ? 'border-amber-500 text-amber-500'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Lernen
                    </button>
                    <button
                      onClick={() => setElfmeterTab('uebung')}
                      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all cursor-pointer ${
                        elfmeterTab === 'uebung'
                          ? 'border-amber-500 text-amber-500'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Übung
                    </button>
                  </div>

                  {/* Banner / Notice about single response rule */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="block text-xs font-bold text-white font-sans flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        Wichtige Regel für Elfmeter-Szenen
                      </span>
                      <p className="text-amber-200/90 text-xs leading-relaxed font-medium">
                        Du kannst pro Elfmeter-Szene <strong className="text-amber-400 uppercase font-black">nur einmal antworten</strong>. Nach deiner Auswahl ist keine Korrektur mehr möglich! Für jede richtige Antwort erhältst du 1 Punkt für die Bestenliste.
                      </p>
                    </div>
                  </div>

                  {/* Tab contents */}
                  {elfmeterTab === 'lernen' ? (
                    <div className="space-y-6">
                      {scenes.filter(s => s.type === 'elfmeter_lernen' && isSceneVisible(s)).length === 0 ? (
                        <p className="text-center py-10 text-xs text-slate-500 font-mono">Keine Lernvideos freigegeben.</p>
                      ) : (
                        scenes
                          .filter(s => s.type === 'elfmeter_lernen' && isSceneVisible(s))
                          .map((scene, idx) => {
                            const sub = submissions[scene.id];
                            const selectedDir = sub?.submission?.direction;
                            const isDone = !!sub;

                            return (
                              <div key={scene.id} className={`border rounded-2xl p-5 space-y-4 transition-all ${
                                isDone ? 'bg-slate-900/60 border-slate-850' : 'bg-slate-900 border-slate-800'
                              }`}>
                                <div className="flex justify-between items-center">
                                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                                    <Video className="w-4 h-4 text-amber-500" />
                                    <span>Lernszene {idx + 1}</span>
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {scene.level && (
                                      <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                        {scene.level}
                                      </span>
                                    )}
                                    {isDone && (
                                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                                        sub.correct
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                                      }`}>
                                        {sub.correct ? (
                                          <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>RICHTIG</span>
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="w-3 h-3" />
                                            <span>FALSCH</span>
                                          </>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {renderEmbedVideo(scene.videoLink, `Lernszene ${idx + 1}`)}

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="block text-xs font-bold text-slate-300">
                                      Aus Torwartsicht Links, Mitte oder Rechts?
                                    </span>
                                    <span className="text-[10px] font-mono text-amber-400/90 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                      {isDone ? 'Auswahl gesperrt (bereits geantwortet)' : 'Nur 1 Versuch möglich!'}
                                    </span>
                                  </div>

                                  <div className="flex gap-2">
                                    {['Links', 'Mitte', 'Rechts'].map((dir) => {
                                      const isSelected = selectedDir === dir;
                                      return (
                                        <button
                                          key={dir}
                                          disabled={isDone}
                                          onClick={() => handleSelectPenaltyLernen(scene, dir)}
                                          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                            isDone
                                              ? isSelected
                                                ? sub.correct
                                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                                  : 'bg-red-500/20 border-red-500 text-red-300'
                                                : 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 hover:border-amber-500/50 cursor-pointer active:scale-95'
                                          }`}
                                        >
                                          {dir}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {isDone && (
                                  <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-emerald-400 font-mono uppercase font-black">Richtige Lösung</span>
                                      <span className="text-[10px] text-slate-400 font-mono">Deine Antwort: <strong className="text-white">{selectedDir}</strong></span>
                                    </div>
                                    <span className="font-bold text-white text-sm block">
                                      {scene.correctAnswer}
                                    </span>
                                    {scene.followUpText && <p className="text-slate-400 text-xs pt-1 border-t border-slate-900 leading-relaxed">{scene.followUpText}</p>}
                                  </div>
                                )}

                                {userProfile.role === 'admin' && (
                                  <div className="pt-2 border-t border-slate-850/60 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleResetPenaltySelection(scene)}
                                      className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Auswahl für mich (Admin) zurücksetzen</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-white font-sans">Hinweis zur Durchführung</span>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            Jeder der folgenden Links enthält mehrere Elfmeter. Ihr beginnt bei Level 1 (langsame Geschwindigkeit) und versucht die Ecke zu antizipieren. Nutzt die Pausentaste für maximales Learning!
                          </p>
                        </div>
                      </div>

                      {scenes.filter(s => s.type === 'elfmeter_uebung' && isSceneVisible(s)).length === 0 ? (
                        <p className="text-center py-10 text-xs text-slate-500 font-mono">Keine Übungsvideos freigegeben.</p>
                      ) : (
                        scenes
                          .filter(s => s.type === 'elfmeter_uebung' && isSceneVisible(s))
                          .map((scene, idx) => {
                            const done = !!submissions[scene.id];

                            return (
                              <div key={scene.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                                <div className="flex justify-between items-center">
                                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                                    <Video className="w-4 h-4 text-amber-500" />
                                    <span>Übungsszene {idx + 1}</span>
                                  </h3>
                                  {scene.level && (
                                    <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                      {scene.level}
                                    </span>
                                  )}
                                </div>

                                {scene.videoLink && renderEmbedVideo(scene.videoLink, `Übungsszene ${idx + 1}`)}

                                <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`check-${scene.id}`}
                                      checked={done}
                                      disabled={done}
                                      onChange={() => handleCheckPenaltyUebung(scene)}
                                      className="w-4.5 h-4.5 rounded border-slate-800 text-amber-500 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <label
                                      htmlFor={`check-${scene.id}`}
                                      className="text-xs text-slate-300 font-semibold cursor-pointer select-none"
                                    >
                                      Ich habe diese Szene analysiert und abgeschlossen
                                    </label>
                                  </div>
                                  <span className="text-[10px] font-mono text-amber-400/90 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    {done ? 'Abgeschlossen' : 'Nur 1-mal abschließbar'}
                                  </span>
                                </div>

                                {done && (
                                  <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1">
                                    <span className="block text-[8px] text-amber-500 font-mono uppercase font-black">Richtung (Trainerhinweis)</span>
                                    <p className="text-slate-300 font-bold mt-0.5">
                                      {scene.correctAnswer || 'Richtige Richtung'}
                                    </p>
                                    {scene.followUpText && (
                                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                        {scene.followUpText}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION F: Veo Links (U16, U17, U19 Filters) */}
              {activeView === 'veo' && (
                <div className="space-y-6">
                  {/* Category filters */}
                  <div className="flex gap-1.5 bg-slate-950 border border-slate-850 p-1 rounded-xl max-w-xs">
                    {['ALL', 'U16', 'U17', 'U19'].map((v) => (
                      <button
                        key={v}
                        onClick={() => setVeoFilter(v as any)}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          veoFilter === v
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  {/* List games */}
                  {scenes.filter(s => s.type === 'veo' && isSceneVisible(s)).length === 0 ? (
                    <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                      Noch keine Veo-Spiellinks eingetragen.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scenes
                        .filter(s => s.type === 'veo' && isSceneVisible(s))
                        .filter(s => veoFilter === 'ALL' || s.team === veoFilter)
                        .map((scene) => (
                          <div key={scene.id} className="bg-slate-900 border border-slate-800 px-5 py-4 rounded-2xl flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <span className="block text-[10px] text-amber-500 font-mono uppercase font-bold">
                                {scene.team} • {scene.date?.split('-').reverse().join('.')}
                              </span>
                              <span className="block text-sm font-bold text-white truncate mt-1">
                                {scene.question || 'Spielaufzeichnung'}
                              </span>
                            </div>

                            <a
                              href={scene.videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shrink-0 flex items-center gap-1.5 transition-all"
                            >
                              <span>Veo öffnen</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION G: Big Save Award */}
              {activeView === 'bigsave' && (
                <div className="space-y-6">
                  {scenes.filter(s => s.type === 'bigsave' && isSceneVisible(s)).length === 0 ? (
                    <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                      Noch keine Big Save Awards eingetragen.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scenes
                        .filter(s => s.type === 'bigsave' && isSceneVisible(s))
                        .map((scene) => (
                          <div key={scene.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                  {scene.season || 'Saison'} • Part {scene.part || '1'}
                                </span>
                                <h3 className="text-base font-bold text-white mt-1">
                                  Gewinner: {scene.winner || 'Noch offen'}
                                </h3>
                              </div>

                              {scene.videoLink && (
                                <a
                                  href={scene.videoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-amber-500 hover:underline shrink-0"
                                >
                                  <span>YouTube Video</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs">
                                <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Nominierungen</span>
                                <p className="text-slate-300 font-sans leading-relaxed mt-1 whitespace-pre-wrap">
                                  {scene.nominations || 'Keine Nominierungen eingetragen.'}
                                </p>
                              </div>

                              {scene.videoLink && renderEmbedVideo(scene.videoLink)}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      )}
      {/* Fullscreen Video Modal */}
      {fullscreenVideoUrl && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 flex flex-col items-center justify-center p-2 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-full max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-white font-bold font-mono text-xs sm:text-sm">
                <Tv className="w-4 h-4 text-amber-500" />
                <span>Elfmeter Video - Vollbildmodus</span>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenVideoUrl(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-500/30 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Schließen</span>
              </button>
            </div>
            <div className="flex-1 w-full h-full bg-black relative">
              {getYouTubeEmbedId(fullscreenVideoUrl) ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${getYouTubeEmbedId(fullscreenVideoUrl)}?autoplay=1&rel=0`}
                  title="Videoanalyse Vollbild"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              ) : (
                <iframe
                  width="100%"
                  height="100%"
                  src={fullscreenVideoUrl}
                  title="Videoanalyse Vollbild"
                  frameBorder="0"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
