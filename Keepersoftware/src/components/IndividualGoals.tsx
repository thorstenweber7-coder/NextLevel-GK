import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, increment, addDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { syncUserLevelTodos } from '../utils/levelTodos';
import { getGoalEvaluationStatus, calculateThreeWeeksFromNow } from '../utils/goalUtils';
import { UserProfile, Goal } from '../types';
import { Plus, Target, Check, AlertCircle, Save, Calendar, Star, HelpCircle, ArrowLeft, Video, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { resolveVideoInfo } from '../utils/videoUtils';

interface IndividualGoalsProps {
  userProfile: UserProfile;
  onUpdatePoints?: (newPoints: number, newPointsByCategory: any) => void;
}

export default function IndividualGoals({ userProfile, onUpdatePoints }: IndividualGoalsProps) {
  const isAdmin = userProfile.role === 'admin';
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // New goal creation inputs
  const [showCreate, setShowCreate] = useState(false);
  const [goalType, setGoalType] = useState<'Technik' | 'Taktik' | 'Entscheidung'>('Technik');
  const [goalDesc, setGoalDesc] = useState('');

  // Local evaluation inputs per goal
  const [evalValue, setEvalValue] = useState<{ [goalId: string]: number }>({});
  const [evalActions, setEvalActions] = useState<{ [goalId: string]: { team: boolean; tw: boolean; play: boolean; extra?: boolean } }>({});

  // "Warum?" page states
  const [showWhy, setShowWhy] = useState(false);
  const [activeWhyTab, setActiveWhyTab] = useState<'motivation' | 'big_saves'>('motivation');
  const [whyVideos, setWhyVideos] = useState<{ [id: string]: Array<{ title: string; url: string }> }>({
    motivation: [],
    big_saves: []
  });
  const [whyLoading, setWhyLoading] = useState(false);

  const fetchWhyVideos = async () => {
    setWhyLoading(true);
    try {
      const configSnap = await getDoc(doc(db, 'config', 'contents'));
      const userSnap = await getDoc(doc(db, 'users', userProfile.uid));

      const formatted: typeof whyVideos = { motivation: [], big_saves: [] };

      // 1. Load global motivation videos
      if (configSnap.exists()) {
        const configData = configSnap.data() || {};
        const val = configData['motivation'];
        if (Array.isArray(val)) {
          formatted['motivation'] = val.map((item: any) => ({
            title: item?.title || '',
            url: item?.url || ''
          }));
        } else if (typeof val === 'string' && val.trim() !== '') {
          formatted['motivation'] = [{ title: '', url: val }];
        }
      }

      // 2. Load user-specific big save videos
      if (userSnap.exists()) {
        const userData = userSnap.data() || {};
        const val = userData.bigSaveVideos;
        if (Array.isArray(val)) {
          formatted['big_saves'] = val.map((item: any) => ({
            title: item?.title || '',
            url: item?.url || ''
          }));
        } else if (typeof val === 'string' && val.trim() !== '') {
          formatted['big_saves'] = [{ title: '', url: val }];
        }
      }

      setWhyVideos(formatted);
    } catch (err) {
      console.error('Error fetching why videos:', err);
    } finally {
      setWhyLoading(false);
    }
  };

  useEffect(() => {
    if (showWhy) {
      fetchWhyVideos();
    }
  }, [showWhy]);

  const renderEmbedVideo = (url: string, iframeTitle: string) => {
    const videoInfo = resolveVideoInfo(url, iframeTitle);

    if (videoInfo.type === 'youtube' || videoInfo.type === 'drive') {
      return (
        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 shadow shadow-slate-950 bg-black">
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
        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 shadow shadow-slate-950 bg-black">
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
      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-center text-xs text-slate-400 space-y-2">
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

  const loadGoals = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const q = query(collection(db, 'goals'), where('userId', '==', userProfile.uid));
      const querySnap = await getDocs(q);
      const list: Goal[] = [];
      querySnap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Goal);
      });
      setGoals(list);

      // Populate local evaluation values
      const initialEvals: typeof evalValue = {};
      const initialActions: typeof evalActions = {};
      list.forEach((g) => {
        initialEvals[g.id] = g.evaluation ?? 0;
        initialActions[g.id] = {
          team: false,
          tw: false,
          play: false,
          extra: false,
          ...(g.actions || {})
        };
      });
      setEvalValue(initialEvals);
      setEvalActions(initialActions);
    } catch (err) {
      console.error('Error fetching individual goals:', err);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    const syncAndLoad = async () => {
      if (userProfile.uid && userProfile.modulePermissions) {
        await syncUserLevelTodos(userProfile.uid, userProfile.modulePermissions);
      }
      await loadGoals();
    };
    syncAndLoad();
  }, [userProfile.uid, JSON.stringify(userProfile.modulePermissions)]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalDesc.trim()) return;

    const { dateStr, evaluableFrom } = calculateThreeWeeksFromNow();

    const newGoal: Omit<Goal, 'id'> = {
      userId: userProfile.uid,
      type: goalType,
      description: goalDesc,
      completed: false,
      date: dateStr,
      evaluableFrom: evaluableFrom,
      actions: { team: false, tw: false, play: false, extra: false },
      createdBy: isAdmin ? 'trainer' : 'spieler',
      category: 'ziel'
    };

    try {
      await addDoc(collection(db, 'goals'), newGoal);
      setGoalDesc('');
      setShowCreate(false);
      await loadGoals();
    } catch (err) {
      console.error('Error adding individual goal:', err);
    }
  };

  const handleToggleTodoCompleted = async (goal: Goal) => {
    const nextCompleted = !goal.completed;

    // Optimistic UI updates to avoid lag
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: nextCompleted } : g));

    try {
      await updateDoc(doc(db, 'goals', goal.id), {
        completed: nextCompleted,
        evaluationDate: nextCompleted ? new Date().toISOString().split('T')[0] : null
      });

      // Reward/deduct 1 point
      const pointsDiff = nextCompleted ? 1 : -1;
      const todayStr = new Date().toISOString().split('T')[0];

      // Update user points in Firestore
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        points: increment(pointsDiff),
        [`pointsByCategory.Ziele`]: increment(pointsDiff)
      });

      // Log points change
      await addDoc(collection(db, 'point_logs'), {
        userId: userProfile.uid,
        points: pointsDiff,
        category: 'Ziele',
        action: nextCompleted ? `To Do abgeschlossen: ${goal.description}` : `To Do wieder geöffnet: ${goal.description}`,
        date: todayStr
      });

      // Update state in App
      if (onUpdatePoints) {
        const updatedPts = (userProfile.points || 0) + pointsDiff;
        const updatedCats = {
          ...userProfile.pointsByCategory,
          Ziele: ((userProfile.pointsByCategory?.Ziele) || 0) + pointsDiff
        };
        onUpdatePoints(updatedPts, updatedCats);
      }

      // Reload goals in the background without layout flashing
      await loadGoals(false);
    } catch (err) {
      console.error('Error toggling todo completion:', err);
      // Revert optimistic update on failure
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: !nextCompleted } : g));
    }
  };

  const handleSaveEvaluation = async (goal: Goal) => {
    const val = evalValue[goal.id] ?? 0;
    const actions = evalActions[goal.id] ?? { team: false, tw: false, play: false, extra: false };
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      await updateDoc(doc(db, 'goals', goal.id), {
        evaluation: val,
        actions: actions,
        completed: true, // mark completed upon evaluation saving, locking further rating!
        evaluationDate: todayStr
      });
      await loadGoals();
    } catch (err) {
      console.error('Error updating individual goal evaluation:', err);
    }
  };

  const evalLabels = [
    { value: -2, label: '-2 (Keine)' },
    { value: -1, label: '-1 (Wenig)' },
    { value: 0, label: '0 (Leichte)' },
    { value: 1, label: '1 (Gute)' },
    { value: 2, label: '2 (Sehr gute)' },
  ];

  if (showWhy) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 font-sans space-y-6 animate-in fade-in duration-200">
        <button
          onClick={() => setShowWhy(false)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zu den Zielen</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-7 h-7 text-amber-500" />
              Warum individuelle Ziele?
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
              Motivation & Inspiration für deinen Erfolg
            </p>
          </div>
        </div>

        {/* Reiterauswahl / Tabs between Motivation & Big Saves */}
        <div className="flex gap-2 border-b border-slate-900 pb-2">
          <button
            onClick={() => setActiveWhyTab('motivation')}
            className={`px-4 py-2 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
              activeWhyTab === 'motivation'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 border border-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            Motivation
          </button>
          <button
            onClick={() => setActiveWhyTab('big_saves')}
            className={`px-4 py-2 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
              activeWhyTab === 'big_saves'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 border border-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            Big Saves
          </button>
        </div>

        {/* Videos rendering based on the active tab */}
        {whyLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-slate-900 rounded-3xl"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {whyVideos[activeWhyTab]?.length > 0 && whyVideos[activeWhyTab].some(v => v.url || v.title) ? (
              whyVideos[activeWhyTab].map((vid, idx) => {
                if (!vid.url && !vid.title) return null;
                return (
                  <div key={idx} className="bg-slate-900 border border-slate-850 rounded-3xl p-5 space-y-3 shadow-xl">
                    {vid.title && <h3 className="text-sm font-bold text-white font-sans">{vid.title}</h3>}
                    {vid.url ? (
                      renderEmbedVideo(vid.url, vid.title || 'Video')
                    ) : (
                      <p className="text-xs text-slate-500 italic">Kein Video-Link hinterlegt.</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="md:col-span-2 text-center text-xs text-slate-500 font-mono italic py-12 bg-slate-900/40 border border-slate-850 rounded-2xl">
                Der Trainer hat für diesen Bereich noch keine Videos hinterlegt.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 font-sans space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-7 h-7 text-amber-500" />
            Individuelle Ziele
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
            Verfolge und bewerte deine torwartspezifischen Meilensteine
          </p>
        </div>

        {/* Neues Ziel anlegen trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWhy(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>Warum?</span>
          </button>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Neues Ziel anlegen</span>
            </button>
          )}
        </div>
      </div>

      {/* Goal creation Form */}
      {showCreate && (
        <form onSubmit={handleCreateGoal} className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white font-mono">NEUES ZIEL ANLEGEN</h3>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-xs text-slate-400 hover:text-white font-mono"
            >
              [ Abbrechen ]
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Art des Ziels
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Technik">Technik</option>
                <option value="Taktik">Taktik</option>
                <option value="Entscheidung">Entscheidung</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Präzise Beschreibung des Ziels
              </label>
              <input
                type="text"
                value={goalDesc}
                onChange={(e) => setGoalDesc(e.target.value)}
                placeholder="Z.B. Standhöhe beim Absprung verbessern..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow cursor-pointer"
            >
              <Check className="w-4 h-4 font-black" />
              <span>Ziel speichern</span>
            </button>
          </div>
        </form>
      )}

      {/* List of existing goals */}
      <div className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(n => <div key={n} className="h-28 bg-slate-900 rounded-2xl"></div>)}
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/40 rounded-2xl p-12 text-center text-slate-400">
            <p className="text-sm font-medium">Noch keine Entwicklungsziele oder To Dos angelegt.</p>
            <p className="text-xs text-slate-600 mt-1">Lege oben über "Neues Ziel anlegen" deinen ersten Eintrag fest!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Column 1: To Dos */}
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center shadow">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">To Dos</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Deine täglichen oder wöchentlichen Aufgaben</p>
              </div>

              {goals.filter(g => g.category === 'todo').length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-2xl text-center text-xs text-slate-500 font-mono italic">
                  Keine To Dos vorhanden.
                </div>
              ) : (
                goals.filter(g => g.category === 'todo').map((todo) => {
                  return (
                    <div
                      key={todo.id}
                      className={`border rounded-2xl p-4 space-y-3 flex gap-3 items-start transition-all ${
                        todo.completed ? 'bg-slate-900/60 border-slate-850' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleTodoCompleted(todo)}
                        className="w-5 h-5 rounded border-slate-800 text-amber-500 focus:ring-amber-500 cursor-pointer mt-0.5 shrink-0"
                      />
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/40 pb-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            Erstellt: {todo.date.split('-').reverse().join('.')}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                            todo.createdBy === 'trainer' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {todo.createdBy === 'trainer' ? 'Vom Trainer' : 'Selbst'}
                          </span>
                        </div>
                        <p className={`text-sm font-semibold leading-relaxed ${todo.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                          {todo.description}
                        </p>
                        {todo.assessment && (
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs space-y-1">
                            <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Trainer-Einschätzung</span>
                            <p className="text-slate-300 italic">"{todo.assessment}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Column 2: Entwicklungsziele */}
            <div className="space-y-4">
              <div className="bg-slate-950 border border-amber-500/20 rounded-2xl p-3.5 text-center shadow border-t-amber-500/40">
                <h3 className="text-xs font-bold text-amber-500 uppercase font-mono tracking-wider">Individuelle Entwicklungsziele</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Längerfristige torwartspezifische Meilensteine</p>
              </div>

              {goals.filter(g => !g.category || g.category === 'ziel').length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-2xl text-center text-xs text-slate-500 font-mono italic">
                  Keine Entwicklungsziele vorhanden.
                </div>
              ) : (
                goals.filter(g => !g.category || g.category === 'ziel').map((goal) => {
                  const isLocked = goal.completed;
                  const isTrainerGoal = goal.createdBy === 'trainer';
                  const evalStatus = getGoalEvaluationStatus(goal);
                  const isEvaluable = evalStatus.isEvaluable;

                  return (
                    <div
                      key={goal.id}
                      className={`border rounded-2xl p-5 space-y-4 ${
                        isLocked ? 'bg-slate-900/60 border-slate-850' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {/* Top line detail */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/40 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold uppercase">
                            {goal.type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Erstellt: {goal.date.split('-').reverse().join('.')}
                          </span>
                          {goal.renewedAt && (
                            <span className="text-[9px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
                              Verlängert: {goal.renewedAt.split('-').reverse().join('.')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                            isTrainerGoal ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isTrainerGoal ? 'Vom Trainer' : 'Selbst'}
                          </span>

                          {isLocked ? (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Abgeschlossen</span>
                            </span>
                          ) : !isEvaluable ? (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono uppercase font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Gesperrt (noch {evalStatus.daysRemaining} {evalStatus.daysRemaining === 1 ? 'Tag' : 'Tage'})</span>
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono uppercase font-bold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Selbstbewertung bereit</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Goal Description statement */}
                      <div>
                        <p className="text-sm font-bold text-white">
                          {goal.description}
                        </p>
                      </div>

                      {/* Trainer feedback (Einschätzung) if exists */}
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs space-y-1">
                        <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Trainer-Einschätzung</span>
                        <p className="text-slate-300 italic">
                          {goal.assessment ? `"${goal.assessment}"` : 'Der Trainer hat noch keine Einschätzung abgegeben.'}
                        </p>
                      </div>

                      {/* 3-Week Lock vs Active Self-Evaluation vs Completed */}
                      {isLocked ? (
                        /* Completed State */
                        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Deine Selbstbewertung</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Abgeschlossen am: {goal.evaluationDate?.split('-').reverse().join('.') || 'Unbekannt'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="block text-[9px] text-slate-500 font-mono uppercase">Eigene Einschätzung:</span>
                              <span className="font-bold text-amber-500 text-sm mt-0.5 block">
                                {evalLabels.find(l => l.value === goal.evaluation)?.label || 'Keine Bewertung'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-slate-500 font-mono uppercase">Aktionen absolviert:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {goal.actions?.team && <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[9px] text-slate-300 rounded font-mono">Team</span>}
                                {goal.actions?.tw && <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[9px] text-slate-300 rounded font-mono">Torwart</span>}
                                {goal.actions?.play && <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[9px] text-slate-300 rounded font-mono">Spiele</span>}
                                {goal.actions?.extra && <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[9px] text-slate-300 rounded font-mono">Zusatz</span>}
                                {!goal.actions?.team && !goal.actions?.tw && !goal.actions?.play && !goal.actions?.extra && (
                                  <span className="text-[10px] text-slate-500 italic font-mono">Keine Aktionen vermerkt</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : !isEvaluable ? (
                        /* 3-Week Waiting / Training Phase (Self-evaluation locked) */
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
                              <Clock className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wide">
                                Versuche das in deinen Trainingseinheiten umzusetzen.
                              </h4>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                Um deine Fortschritte realistisch beurteilen zu können, ist die Selbstbewertung frühestens nach einer 3-wöchigen Trainingsphase möglich.
                              </p>
                            </div>
                          </div>

                          {/* Progress & Countdown details */}
                          <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-slate-400">Trainingsphase: Tag {evalStatus.passedDays} von {evalStatus.totalDays}</span>
                              <span className="text-amber-400 font-bold">
                                Freischaltung am: {evalStatus.unlockDateStr} (in {evalStatus.daysRemaining} {evalStatus.daysRemaining === 1 ? 'Tag' : 'Tagen'})
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                              <div
                                className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-300 rounded-full"
                                style={{ width: `${Math.max(5, evalStatus.progressPercent)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Unlocked Self-Evaluation (>= 3 weeks passed) */
                        <div className="space-y-4">
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
                            <Sparkles className="w-4 h-4 shrink-0" />
                            <span>Die 3-wöchige Trainingsphase ist um! Bewerte nun deinen Lernfortschritt:</span>
                          </div>

                          {/* Actions & Rating Grid */}
                          <div className="space-y-4">
                            {/* Checkboxes Checklist of actions */}
                            <div className="space-y-2">
                              <span className="block text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                                Genug Aktionen im Training / Spiel gehabt?
                              </span>
                              <div className="flex flex-col gap-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
                                {[
                                  { key: 'team', label: 'Teamtraining' },
                                  { key: 'tw', label: 'Torwarttraining' },
                                  { key: 'play', label: 'Spielen (Matches)' },
                                  { key: 'extra', label: 'Eigenes Zusatztraining' },
                                ].map((act) => (
                                  <div key={act.key} className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      id={`act-${goal.id}-${act.key}`}
                                      checked={evalActions[goal.id]?.[act.key as 'team' | 'tw' | 'play' | 'extra'] ?? false}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setEvalActions(prev => ({
                                          ...prev,
                                          [goal.id]: {
                                            ...prev[goal.id],
                                            [act.key]: checked
                                          }
                                        }));
                                      }}
                                      className="w-4 h-4 rounded border-slate-850 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <label
                                      htmlFor={`act-${goal.id}-${act.key}`}
                                      className="text-xs text-slate-300 cursor-pointer font-medium"
                                    >
                                      {act.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Improvement Rating selector */}
                            <div className="space-y-2">
                              <span className="block text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                                Eigene Verbesserung bewerten (Skala -2 bis +2)
                              </span>

                              <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
                                <select
                                  value={evalValue[goal.id] ?? 0}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setEvalValue(prev => ({ ...prev, [goal.id]: val }));
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                >
                                  {evalLabels.map((l) => (
                                    <option key={l.value} value={l.value}>
                                      {l.label}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleSaveEvaluation(goal)}
                                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow transition-all cursor-pointer font-mono uppercase"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Bewertung & Aktionen abspeichern</span>
                                </button>
                                <span className="block text-[8px] text-center text-slate-500 font-mono uppercase mt-1">
                                  INFO: Sperrt das Ziel nach dem Speichern bis zu einer erneuten Verlängerung!
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
