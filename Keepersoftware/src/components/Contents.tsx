import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BookOpen, ArrowLeft, Video, ExternalLink, Brain, Timer, AlertCircle, Check, Zap, Activity, Apple, Shield, Flame, Target, Compass, Trophy, HelpCircle, Lightbulb, Dumbbell, Users, Lock, RotateCcw } from 'lucide-react';
import { UserProfile, hasModulePermission } from '../types';
import { getUserLevelQuizzes } from '../utils/levelQuizzes';
import { resolveVideoInfo } from '../utils/videoUtils';

const CATEGORY_PERMISSIONS: Record<string, string> = {
  kraftsport: 'content_kraftsport',
  mental: 'content_mental',
  kognition: 'content_kognition',
  neuro: 'content_neuro',
  mobility: 'content_mobility',
  nutrition: 'content_nutrition',
  coaching: 'content_coaching',
  warmup: 'content_warmup',
  standards: 'content_standards',
  regelkunde: 'content_regelkunde',
  anbieteverhalten: 'content_anbieteverhalten',
  tw_at: 'content_tw_at',
  tw_taktik: 'content_tw_taktik'
};

interface ContentsProps {
  userProfile?: UserProfile;
  onUpdatePoints?: (newPoints: number, newPointsByCategory: any) => void;
}

export default function Contents({ userProfile, onUpdatePoints }: ContentsProps) {
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [mentalTab, setMentalTab] = useState<'hacks' | 'fehler'>('hacks');
  const [standardsTab, setStandardsTab] = useState<'freistoß' | 'eckball' | 'elfmeter'>('freistoß');
  const [twAtTab, setTwAtTab] = useState<'antritt' | 'schnelle_beine' | 'explosivitaet' | 'beweglichkeit' | 'gleichgewicht' | 'technik'>('antritt');
  const [twTaktikTab, setTwTaktikTab] = useState<'flanken' | 'querpass' | '1vs1_nahdistanz' | 'ferndistanz' | 'abwehrkette'>('flanken');
  const [offensivTab, setOffensivTab] = useState<'mitspielen' | 'umschaltverhalten'>('mitspielen');
  
  // Video link config loaded from DB
  const [videoLinks, setVideoLinks] = useState<{ [id: string]: Array<{ title: string; url: string }> }>({});
  const [loading, setLoading] = useState(false);

  // Quiz active states
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [quizTimer, setQuizTimer] = useState<number>(30);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);
  const [quizCompletedIds, setQuizCompletedIds] = useState<Set<string>>(new Set());
  const [userSubmissions, setUserSubmissions] = useState<Record<string, { answeredIndex: number; correct: boolean }>>({});
  const [viewOnlyMode, setViewOnlyMode] = useState<boolean>(false);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);

  const categories = [
    { id: 'anbieteverhalten', label: 'Offensivtaktiken', icon: Users, iconColor: 'text-fuchsia-400 border-fuchsia-500/10 bg-fuchsia-500/5' },
    { id: 'coaching', label: 'Coaching', icon: Shield, iconColor: 'text-sky-400 border-sky-500/10 bg-sky-500/5' },
    { id: 'warmup', label: 'Empfehlungen für das Spiel WarmUp', icon: Flame, iconColor: 'text-orange-500 border-orange-500/10 bg-orange-500/5' },
    { id: 'nutrition', label: 'Ernährung', icon: Apple, iconColor: 'text-rose-400 border-rose-500/10 bg-rose-500/5' },
    { id: 'kraftsport', label: 'Kraftsport', icon: Dumbbell, iconColor: 'text-pink-400 border-pink-500/10 bg-pink-500/5' },
    { id: 'mental', label: 'Mentaltraining', icon: Brain, iconColor: 'text-purple-400 border-purple-500/10 bg-purple-500/5' },
    { id: 'neuro', label: 'Neuroathletiktraining', icon: Zap, iconColor: 'text-amber-400 border-amber-500/10 bg-amber-500/5' },
    { id: 'regelkunde', label: 'Regelkunde', icon: BookOpen, iconColor: 'text-red-400 border-red-500/10 bg-red-500/5' },
    { id: 'standards', label: 'Standards', icon: Target, iconColor: 'text-cyan-400 border-cyan-500/10 bg-cyan-500/5' },
    { id: 'tw_at', label: 'Torwartspezifisches Athletiktraining', icon: Dumbbell, iconColor: 'text-indigo-400 border-indigo-500/10 bg-indigo-500/5' },
    { id: 'tw_taktik', label: 'Torwart-Taktik', icon: Compass, iconColor: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5' },
    { id: 'kognition', label: 'Training mit der Koordinationsleiter', icon: Lightbulb, iconColor: 'text-blue-400 border-blue-500/10 bg-blue-500/5' },
    { id: 'quiz', label: 'Wissens-Quiz', icon: HelpCircle, iconColor: 'text-yellow-400 border-yellow-500/10 bg-yellow-500/5' },
  ];

  // Fetch saved video URLs from config/contents doc
  useEffect(() => {
    const fetchLinks = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'config', 'contents'));
        if (docSnap.exists()) {
          const data = docSnap.data() || {};
          const formatted: { [id: string]: Array<{ title: string; url: string }> } = {};
          const categoriesToFetch = [
            ...categories.map(cat => cat.id),
            'anbieteverhalten_mitspielen',
            'anbieteverhalten_umschaltverhalten',
            'mental_fehler',
            'freistoß',
            'eckball',
            'elfmeter',
            'tw_at_antritt',
            'tw_at_schnelle_beine',
            'tw_at_explosivitaet',
            'tw_at_beweglichkeit',
            'tw_at_gleichgewicht',
            'tw_at_technik',
            'tw_taktik_flanken',
            'tw_taktik_querpass',
            'tw_taktik_1vs1_nahdistanz',
            'tw_taktik_1vs1',
            'tw_taktik_nahdistanz',
            'tw_taktik_ferndistanz',
            'tw_taktik_abwehrkette'
          ];
          
          categoriesToFetch.forEach(catId => {
            const val = data[catId];
            if (Array.isArray(val)) {
              formatted[catId] = val.map((item: any) => ({
                title: item?.title || '',
                url: item?.url || ''
              }));
            } else if (typeof val === 'string' && val.trim() !== '') {
              formatted[catId] = [{ title: '', url: val }];
            } else {
              formatted[catId] = [];
            }
          });
          setVideoLinks(formatted);
        }
      } catch (err) {
        console.error('Error fetching content links:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [activeContentId]);

  // Load quiz data when "Wissens-Quiz" is opened
  useEffect(() => {
    if (activeContentId !== 'quiz' || !userProfile) return;

    const loadQuizData = async () => {
      setQuizLoading(true);
      try {
        const querySnap = await getDocs(collection(db, 'competitions'));
        const list: any[] = [];
        querySnap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setCompetitions(list);

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
        console.error('Error fetching quiz data:', err);
      } finally {
        setQuizLoading(false);
      }
    };

    loadQuizData();
  }, [activeContentId, userProfile?.uid]);

  // Scroll to top when active content changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (activeContentId !== 'mental') {
      setMentalTab('hacks');
    }
    if (activeContentId !== 'standards') {
      setStandardsTab('freistoß');
    }
    if (activeContentId !== 'tw_at') {
      setTwAtTab('antritt');
    }
  }, [activeContentId]);

  // Quiz active timer count down
  useEffect(() => {
    if (!activeQuiz || quizAnswered || viewOnlyMode) return;

    if (quizTimer === 0) {
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
      if (activeQuiz && !quizAnswered && !viewOnlyMode && userProfile) {
        const todayStr = new Date().toISOString().split('T')[0];
        setDoc(doc(db, `users/${userProfile.uid}/quiz_submissions`, activeQuiz.id), {
          answeredIndex: -1,
          correct: false,
          date: todayStr,
          abandoned: true
        }).catch(err => console.error('Error logging quiz abandon:', err));
      }
    };
  }, [activeQuiz, quizAnswered, viewOnlyMode, userProfile?.uid]);

  const handleStartQuiz = (quiz: any) => {
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
    if (!activeQuiz || quizAnswered || !userProfile) return;

    setQuizAnswered(true);
    setSelectedQuizIndex(answerIndex);

    const isCorrect = answerIndex === activeQuiz.correctAnswer;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      await setDoc(doc(db, `users/${userProfile.uid}/quiz_submissions`, activeQuiz.id), {
        answeredIndex: answerIndex,
        correct: isCorrect,
        date: todayStr
      });

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

      if (isCorrect) {
        const totalCorrectCount = Object.values(updatedSubmissions).filter((s: any) => s.correct).length;
        // Award 1 point for every 3 correct answers
        if (totalCorrectCount > 0 && totalCorrectCount % 3 === 0) {
          const userRef = doc(db, 'users', userProfile.uid);
          await updateDoc(userRef, {
            points: increment(1),
            [`pointsByCategory.Quiz`]: increment(1)
          });

          await addDoc(collection(db, 'point_logs'), {
            userId: userProfile.uid,
            points: 1,
            category: 'Quiz',
            action: `1 Punkt für 3 richtig beantwortete Wissens-Quiz Fragen (${totalCorrectCount} gesamt)`,
            date: todayStr
          });

          if (onUpdatePoints) {
            const updatedPts = userProfile.points + 1;
            const updatedCats = {
              ...userProfile.pointsByCategory,
              Quiz: (userProfile.pointsByCategory?.Quiz || 0) + 1
            };
            onUpdatePoints(updatedPts, updatedCats);
          }
        }
      }
    } catch (err) {
      console.error('Error saving quiz submission:', err);
    }
  };

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

  const handleOpenContent = (id: string, label: string) => {
    setActiveContentId(id);
    setActiveTitle(label);
  };

  const renderEmbedVideo = (url: string, iframeTitle: string) => {
    const videoInfo = resolveVideoInfo(url, iframeTitle);

    if (videoInfo.type === 'youtube' || videoInfo.type === 'drive') {
      return (
        <div className="aspect-video w-full rounded-3xl overflow-hidden border border-slate-800 shadow-xl shadow-slate-950 bg-black">
          <iframe
            width="100%"
            height="100%"
            src={videoInfo.embedUrl}
            title={iframeTitle}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0"
          ></iframe>
        </div>
      );
    }

    if (videoInfo.type === 'direct') {
      return (
        <div className="aspect-video w-full rounded-3xl overflow-hidden border border-slate-800 shadow-xl shadow-slate-950 bg-black">
          <video
            src={videoInfo.embedUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    return (
      <div className="p-8 bg-slate-950 border border-slate-850 rounded-2xl text-center text-xs text-slate-400 space-y-2">
        <p>Kein kompatibles Video erkannt oder der Link ist ungültig.</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:underline inline-flex items-center gap-1 font-bold"
          >
            <span>Link extern öffnen</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 font-sans">
      {!activeContentId ? (
        /* GRID SELECTION VIEW */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-amber-500" />
                Inhalte
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
                Torwartspezifische Theorie- & Übungsvideos
              </p>
            </div>
            
            {/* Wissens-Quiz as extra button top right */}
            <button
              onClick={() => handleOpenContent('quiz', 'Wissens-Quiz')}
              className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 self-start sm:self-auto"
            >
              <HelpCircle className="w-4 h-4 text-slate-950" />
              <span>Wissens-Quiz</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.filter(cat => cat.id !== 'quiz').sort((a, b) => a.label.localeCompare(b.label, 'de')).map((cat) => {
              const IconComp = cat.icon;
              const permId = CATEGORY_PERMISSIONS[cat.id];
              const isLocked = permId ? !hasModulePermission(userProfile, permId) : false;

              if (isLocked) {
                return (
                  <button
                    key={cat.id}
                    onClick={() => alert('Dieses Modul wurde noch nicht freigeschaltet. Bitte wende dich an deinen Coach.')}
                    className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl text-left flex items-center justify-between opacity-65 cursor-pointer relative select-none"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-zinc-500 shrink-0">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-zinc-500">
                          {cat.label}
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

              return (
                <button
                  key={cat.id}
                  onClick={() => handleOpenContent(cat.id, cat.label)}
                  className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-left transition-all hover:border-amber-500/40 shadow-md group flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-xl border ${cat.iconColor} shrink-0`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-white group-hover:text-amber-500 transition-colors">
                        {cat.label}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
                        Inhalte ansehen
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-700 group-hover:text-amber-500 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* INDIVIDUAL VIDEO CONTENT SCREEN OR QUIZ */
        <div className="space-y-6">
          <button
            onClick={() => {
              setActiveContentId(null);
              setActiveQuiz(null);
            }}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-white text-slate-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono animate-in fade-in"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>

          {activeContentId === 'quiz' ? (
            /* QUIZ SECTION RENDERING */
            <div className="space-y-6">
              {!activeQuiz ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5 font-mono uppercase">
                        <Brain className="w-5 h-5 text-emerald-400" />
                        <span>Wissens-Quiz Fragen</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-sans mt-0.5">Löse die Fragen, um dein Wissen zu testen</p>
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

                  {quizLoading ? (
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
                      {activeQuiz.answers?.map((option: string, idx: number) => {
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
          ) : (
            /* STANDARD VIDEO VIEW */
            <>
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{activeTitle}</h2>
                  <p className="text-xs text-slate-400 font-mono">Keeper-Coaching Schulungsvideo</p>
                </div>

                {activeContentId === 'mental' && (
                  <div className="flex border-b border-slate-900 gap-1 pb-px">
                    <button
                      onClick={() => setMentalTab('hacks')}
                      className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer ${
                        mentalTab === 'hacks'
                          ? 'border-purple-500 text-purple-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Mentale Hacks
                    </button>
                    <button
                      onClick={() => setMentalTab('fehler')}
                      className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer ${
                        mentalTab === 'fehler'
                          ? 'border-purple-500 text-purple-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Umgang mit Fehlern
                    </button>
                  </div>
                )}

                {activeContentId === 'tw_taktik' && (
                  <div className="flex border-b border-slate-900 gap-1 pb-px overflow-x-auto scrollbar-none">
                    {[
                      { id: 'flanken', label: 'Flankensituationen', perm: 'content_tw_taktik_flanken' },
                      { id: 'querpass', label: 'Querpasssituationen', perm: 'content_tw_taktik_querpass' },
                      { id: '1vs1_nahdistanz', label: '1vs1 & Nahdistanzsituationen', perm: 'content_tw_taktik_1vs1_nahdistanz' },
                      { id: 'ferndistanz', label: 'Ferndistanzsituationen', perm: 'content_tw_taktik_ferndistanz' },
                      { id: 'abwehrkette', label: 'Verteidigen hinter der Abwehrkette', perm: 'content_tw_taktik_abwehrkette' },
                    ].map(sub => {
                      const isLocked = !hasModulePermission(userProfile, sub.perm);
                      const isActive = twTaktikTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            if (isLocked) {
                              alert('Dieses Modul wurde noch nicht freigeschaltet. Bitte wende dich an deinen Coach.');
                              return;
                            }
                            setTwTaktikTab(sub.id as any);
                          }}
                          className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            isActive
                              ? 'border-emerald-500 text-emerald-400'
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

                {activeContentId === 'standards' && (
                  <div className="flex border-b border-slate-900 gap-1 pb-px overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setStandardsTab('eckball')}
                      className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                        standardsTab === 'eckball'
                          ? 'border-cyan-500 text-cyan-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Eckbälle
                    </button>
                    <button
                      onClick={() => setStandardsTab('elfmeter')}
                      className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                        standardsTab === 'elfmeter'
                          ? 'border-cyan-500 text-cyan-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Elfmeter
                    </button>
                    <button
                      onClick={() => setStandardsTab('freistoß')}
                      className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                        standardsTab === 'freistoß'
                          ? 'border-cyan-500 text-cyan-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Freistöße
                    </button>
                  </div>
                )}

                {activeContentId === 'anbieteverhalten' && (
                  <div className="flex border-b border-slate-900 gap-1 pb-px overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setOffensivTab('mitspielen')}
                      className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                        offensivTab === 'mitspielen'
                          ? 'border-fuchsia-500 text-fuchsia-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Mitspielen
                    </button>
                    <button
                      onClick={() => setOffensivTab('umschaltverhalten')}
                      className={`px-4 py-2 text-xs font-bold font-mono tracking-wider border-b-2 uppercase transition-all cursor-pointer shrink-0 ${
                        offensivTab === 'umschaltverhalten'
                          ? 'border-fuchsia-500 text-fuchsia-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      Umschaltverhalten
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : (
                <div className="space-y-8 mt-4 animate-in fade-in duration-200">
                  {(() => {
                    const targetId = activeContentId === 'mental' && mentalTab === 'fehler' 
                      ? 'mental_fehler' 
                      : activeContentId === 'standards'
                      ? standardsTab
                      : activeContentId === 'tw_at'
                      ? 'tw_at'
                      : activeContentId === 'tw_taktik'
                      ? `tw_taktik_${twTaktikTab}`
                      : activeContentId === 'anbieteverhalten'
                      ? `anbieteverhalten_${offensivTab}`
                      : activeContentId;
                    let videos = videoLinks[targetId || ''] || [];
                    if (videos.length === 0 && activeContentId === 'tw_taktik' && twTaktikTab === '1vs1_nahdistanz') {
                      videos = [
                        ...(videoLinks['tw_taktik_1vs1_nahdistanz'] || []),
                        ...(videoLinks['tw_taktik_1vs1'] || []),
                        ...(videoLinks['tw_taktik_nahdistanz'] || [])
                      ];
                    }
                    if (videos.length === 0 && activeContentId === 'tw_at') {
                      videos = [
                        ...(videoLinks['tw_at'] || []),
                        ...(videoLinks['tw_at_antritt'] || []),
                        ...(videoLinks['tw_at_schnelle_beine'] || []),
                        ...(videoLinks['tw_at_explosivitaet'] || []),
                        ...(videoLinks['tw_at_beweglichkeit'] || []),
                        ...(videoLinks['tw_at_gleichgewicht'] || []),
                        ...(videoLinks['tw_at_technik'] || [])
                      ];
                    }
                    if (videos.length === 0 && activeContentId === 'tw_taktik' && videoLinks['tw_taktik']?.length) {
                      videos = videoLinks['tw_taktik'];
                    }
                    const activeVideos = videos.filter(v => v.url && v.url.trim() !== '');
                    if (activeVideos.length === 0) {
                      return (
                        <div className="p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400 space-y-2">
                          <p className="text-sm font-bold">Noch kein Video hinterlegt.</p>
                          <p className="text-xs text-slate-600 font-mono">Der Admin kann YouTube-Videolinks in der Coaching Zone eintragen.</p>
                        </div>
                      );
                    }
                    return activeVideos.map((vid, idx) => (
                      <div key={idx} className="space-y-3 bg-slate-900/40 p-4 sm:p-6 rounded-3xl border border-slate-800/60 shadow-lg">
                        {vid.title && (
                          <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-800/80 pb-2">
                            <Video className="w-4 h-4 text-purple-500" />
                            <span>{vid.title}</span>
                          </h3>
                        )}
                        {renderEmbedVideo(vid.url, vid.title || activeTitle)}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
