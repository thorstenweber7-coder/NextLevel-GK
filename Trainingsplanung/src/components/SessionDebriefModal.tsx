import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  Users, 
  Layers, 
  FileEdit, 
  Save, 
  Sparkles, 
  MessageSquare, 
  MessageSquareQuote,
  AlertCircle,
  Clock,
  Tag,
  Globe,
  Building2,
  User,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  Mic,
  MicOff
} from 'lucide-react';
import type { TrainingPlan, TrainingGroup, Exercise } from '../types';
import { CATEGORY_COLORS } from '../types';
import { savePlanToFirestore } from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { useSpeechToText } from '../hooks/useSpeechToText';

interface SessionDebriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: TrainingPlan | null;
  groups: TrainingGroup[];
  exerciseMap: Map<string, Exercise>;
  onPlanUpdated?: (updatedPlan: TrainingPlan) => void;
}

export const SessionDebriefModal: React.FC<SessionDebriefModalProps> = ({
  isOpen,
  onClose,
  plan,
  groups,
  exerciseMap,
  onPlanUpdated
}) => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'jumpVolume' | 'keepers' | 'exercises' | 'talks'>('jumpVolume');

  // Form states
  const [jumpVolume, setJumpVolume] = useState<'low' | 'medium' | 'high' | ''>('');
  const [keeperJumpVolumes, setKeeperJumpVolumes] = useState<Record<string, 'low' | 'medium' | 'high' | string>>({});
  const [keeperInsights, setKeeperInsights] = useState<Record<string, string>>({});
  const [keeperLoadRatings, setKeeperLoadRatings] = useState<Record<string, number>>({});
  const [exerciseExperiences, setExerciseExperiences] = useState<Record<string, string>>({});
  const [playerConversations, setPlayerConversations] = useState<Record<string, string>>({});
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Speech to text integration for textareas
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const activeVoiceFieldRef = useRef<string | null>(null);
  activeVoiceFieldRef.current = activeVoiceField;

  const handleSpeechResult = useCallback((chunk: string) => {
    const currentField = activeVoiceFieldRef.current;
    if (!currentField || !chunk.trim()) return;

    if (currentField.startsWith('keeper_')) {
      const keeperId = currentField.replace('keeper_', '');
      setKeeperInsights(prev => {
        const existing = prev[keeperId] || '';
        return {
          ...prev,
          [keeperId]: existing.trim() ? `${existing.trim()} ${chunk.trim()}` : chunk.trim()
        };
      });
    } else if (currentField.startsWith('exercise_')) {
      const exId = currentField.replace('exercise_', '');
      setExerciseExperiences(prev => {
        const existing = prev[exId] || '';
        return {
          ...prev,
          [exId]: existing.trim() ? `${existing.trim()} ${chunk.trim()}` : chunk.trim()
        };
      });
    } else if (currentField.startsWith('talk_')) {
      const keeperId = currentField.replace('talk_', '');
      setPlayerConversations(prev => {
        const existing = prev[keeperId] || '';
        return {
          ...prev,
          [keeperId]: existing.trim() ? `${existing.trim()} ${chunk.trim()}` : chunk.trim()
        };
      });
    }
  }, []);

  const {
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening
  } = useSpeechToText({
    lang: 'de-DE',
    continuous: true,
    interimResults: true,
    onResult: (chunk) => handleSpeechResult(chunk),
    onError: () => {
      setActiveVoiceField(null);
    }
  });

  // When listening ends from browser timeout or error
  useEffect(() => {
    if (!isListening) {
      setActiveVoiceField(null);
    }
  }, [isListening]);

  // Clean up listening when unmounting or tab changes
  useEffect(() => {
    if (isListening) {
      stopListening();
      setActiveVoiceField(null);
    }
  }, [activeTab]);

  const toggleVoiceInput = (fieldId: string) => {
    if (isListening) {
      if (activeVoiceField === fieldId) {
        stopListening();
        setActiveVoiceField(null);
      } else {
        setActiveVoiceField(fieldId);
        activeVoiceFieldRef.current = fieldId;
      }
    } else {
      setActiveVoiceField(fieldId);
      activeVoiceFieldRef.current = fieldId;
      startListening();
    }
  };

  // Initialize form state when plan opens
  useEffect(() => {
    if (plan) {
      setJumpVolume((plan.jumpVolume as 'low' | 'medium' | 'high') || '');
      setKeeperJumpVolumes(plan.keeperJumpVolumes || {});
      setKeeperInsights(plan.keeperInsights || {});
      setKeeperLoadRatings(plan.keeperLoadRatings || {});
      setExerciseExperiences(plan.exerciseExperiences || {});
      setPlayerConversations(plan.playerConversations || {});
      setFeedbackMsg(null);
      setSelectedExerciseId('');
    }
  }, [plan]);

  // Derived: Target Group and Keepers
  const targetGroupObj = useMemo(() => {
    if (!plan) return null;
    const tg = (plan.targetGroup || '').trim().toLowerCase();
    return groups.find(g => g.name.trim().toLowerCase() === tg || g.id === plan.targetGroup) || null;
  }, [plan, groups]);

  // Keepers list: If group matched, use its players; otherwise all players from all groups
  const keepersList = useMemo(() => {
    if (targetGroupObj && targetGroupObj.players && targetGroupObj.players.length > 0) {
      return targetGroupObj.players;
    }
    // Fallback: collect all keepers from all groups if not specifically matched
    const allPlayersMap = new Map();
    groups.forEach(g => {
      (g.players || []).forEach(p => {
        if (!allPlayersMap.has(p.id)) allPlayersMap.set(p.id, p);
      });
    });
    return Array.from(allPlayersMap.values());
  }, [targetGroupObj, groups]);

  // Derived: Exercises in this plan (strictly only exercises that were part of this training unit)
  const planExercises = useMemo(() => {
    if (!plan) return [];
    const phaseMap = plan.phaseExercises || plan.phases || {};
    const result: Exercise[] = [];
    const seenIds = new Set<string>();

    Object.values(phaseMap).forEach(list => {
      if (!Array.isArray(list)) return;
      list.forEach(item => {
        if (!item) return;
        if (typeof item === 'string' && item.trim()) {
          const id = item.trim();
          if (seenIds.has(id)) return;
          const ex = plan.customPlanExercises?.[id] || exerciseMap.get(id);
          if (ex && ex.title) {
            seenIds.add(id);
            result.push(ex);
          }
        } else if (typeof item === 'object' && (item as Exercise).title) {
          const exObj = item as Exercise;
          const id = exObj.id || exObj.title;
          if (id && seenIds.has(id)) return;
          if (id) seenIds.add(id);
          result.push(exObj);
        }
      });
    });

    return result;
  }, [plan, exerciseMap]);

  // Derived: Active Selected Exercise for the right column in exercises tab
  const activeSelectedExercise = useMemo(() => {
    if (planExercises.length === 0) return null;
    return planExercises.find(e => e.id === selectedExerciseId) || planExercises[0];
  }, [planExercises, selectedExerciseId]);

  if (!isOpen || !plan) return null;

  const handleSaveDebrief = async () => {
    setIsSaving(true);
    try {
      const trainerDisplayName = userProfile?.firstName && userProfile?.lastName 
        ? `${userProfile.firstName} ${userProfile.lastName}`
        : userProfile?.displayName || user?.displayName || plan.trainerName || 'Trainer';

      const updatedPayload: Partial<TrainingPlan> = {
        ...plan,
        jumpVolume: jumpVolume || undefined,
        keeperJumpVolumes: Object.keys(keeperJumpVolumes).length > 0 ? keeperJumpVolumes : undefined,
        keeperInsights,
        keeperLoadRatings,
        exerciseExperiences,
        playerConversations,
        debriefedAt: Date.now(),
        debriefedByTrainer: trainerDisplayName,
        debriefedByUserId: user?.uid,
        updatedAt: Date.now()
      };

      await savePlanToFirestore(updatedPayload, user);

      setFeedbackMsg({
        type: 'success',
        text: 'Nachbereitung der Trainingseinheit erfolgreich gespeichert!'
      });

      if (onPlanUpdated) {
        onPlanUpdated({ ...plan, ...updatedPayload } as TrainingPlan);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error saving session debrief:', err);
      setFeedbackMsg({
        type: 'error',
        text: 'Fehler beim Speichern der Nachbereitung. Bitte erneut versuchen.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filledJumpVolumeCount = (jumpVolume ? 1 : 0) + Object.keys(keeperJumpVolumes).length;
  const filledKeepersCount = keepersList.filter(k => k.id && keeperInsights[k.id]?.trim()).length;
  const filledExercisesCount = planExercises.filter(ex => ex.id && exerciseExperiences[ex.id]?.trim()).length;
  const filledTalksCount = keepersList.filter(k => k.id && playerConversations[k.id]?.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <FileEdit className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3" />
                  {plan.date || plan.planDate || 'Kein Datum'}
                </span>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-500" />
                  {plan.targetGroup || 'Gruppe'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white truncate mt-1">
                Einheit nachbereiten: {plan.title || plan.planTitle || 'Torwart-Trainingseinheit'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div className={`p-3 text-xs font-bold flex items-center gap-2 border-b ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' 
              : 'bg-rose-950/60 text-rose-300 border-rose-800'
          }`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-0 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('jumpVolume')}
              className={cn(
                "px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
                activeTab === 'jumpVolume'
                  ? "bg-slate-900 text-amber-400 border-amber-500 font-black"
                  : "text-slate-400 hover:text-slate-200 border-transparent"
              )}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>0. Sprungvolumen</span>
              {jumpVolume && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] border font-mono font-bold",
                  jumpVolume === 'high' ? "bg-rose-950 text-rose-300 border-rose-700" :
                  jumpVolume === 'medium' ? "bg-amber-950 text-amber-300 border-amber-700" :
                  "bg-emerald-950 text-emerald-300 border-emerald-700"
                )}>
                  {jumpVolume === 'high' ? 'Hoch' : jumpVolume === 'medium' ? 'Mittel' : 'Niedrig'}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('keepers')}
              className={cn(
                "px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
                activeTab === 'keepers'
                  ? "bg-slate-900 text-emerald-400 border-emerald-500 font-black"
                  : "text-slate-400 hover:text-slate-200 border-transparent"
              )}
            >
              <Users className="w-4 h-4" />
              <span>1. Torhüter ({keepersList.length})</span>
              {filledKeepersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {filledKeepersCount} ausgefüllt
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('exercises')}
              className={cn(
                "px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
                activeTab === 'exercises'
                  ? "bg-slate-900 text-emerald-400 border-emerald-500 font-black"
                  : "text-slate-400 hover:text-slate-200 border-transparent"
              )}
            >
              <Layers className="w-4 h-4" />
              <span>2. Übungen ({planExercises.length})</span>
              {filledExercisesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {filledExercisesCount} ausgefüllt
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('talks')}
              className={cn(
                "px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
                activeTab === 'talks'
                  ? "bg-slate-900 text-emerald-400 border-emerald-500 font-black"
                  : "text-slate-400 hover:text-slate-200 border-transparent"
              )}
            >
              <MessageSquareQuote className="w-4 h-4" />
              <span>3. Spielergespräche ({keepersList.length})</span>
              {filledTalksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {filledTalksCount} ausgefüllt
                </span>
              )}
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline flex-shrink-0">
            Alle Felder sind optional (keine Pflichtfelder)
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {/* ================================================================= */}
          {/* TAB 0: SPRUNG- & HECHTVOLUMEN (IMPACT- & GELENKBELASTUNG)         */}
          {/* ================================================================= */}
          {activeTab === 'jumpVolume' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-white text-sm block">
                    Sprung- & Hechtvolumen (Gelenk-, Sehnen- & Knorpelbelastung)
                  </span>
                </div>
              </div>

              {/* General Session Jump Volume Selection */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>1. Allgemeines Sprung- & Hechtvolumen dieser Einheit</span>
                  {jumpVolume && (
                    <button
                      type="button"
                      onClick={() => setJumpVolume('')}
                      className="text-[11px] font-normal text-slate-500 hover:text-slate-300 underline"
                    >
                      Auswahl zurücksetzen
                    </button>
                  )}
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option: Niedrig */}
                  <button
                    type="button"
                    onClick={() => setJumpVolume(prev => prev === 'low' ? '' : 'low')}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 group",
                      jumpVolume === 'low'
                        ? "bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-950/40"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-xs font-black uppercase px-2.5 py-0.5 rounded-full border",
                          jumpVolume === 'low'
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-800 group-hover:text-emerald-400"
                        )}>
                          Niedrig
                        </span>
                        {jumpVolume === 'low' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <h4 className="font-extrabold text-white text-sm">Flach / Regeneration</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Keine oder minimale Hechtsprünge. Flaches Passspiel, lockeres Stellungsspiel, Kognition oder regenerative Einheit.
                      </p>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span>✓ Gelenkschonend</span>
                    </div>
                  </button>

                  {/* Option: Mittel */}
                  <button
                    type="button"
                    onClick={() => setJumpVolume(prev => prev === 'medium' ? '' : 'medium')}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 group",
                      jumpVolume === 'medium'
                        ? "bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/40"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-xs font-black uppercase px-2.5 py-0.5 rounded-full border",
                          jumpVolume === 'medium'
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-800 group-hover:text-amber-400"
                        )}>
                          Mittel
                        </span>
                        {jumpVolume === 'medium' && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <h4 className="font-extrabold text-white text-sm">Moderat / Grundtechnik</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Standard Grundtechnik, 1v1, moderater Abdruck, Reaktionsbälle aus kurzer Distanz mit kontrollierten Landungen.
                      </p>
                    </div>
                    <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      <span>⚡ Normale Belastung</span>
                    </div>
                  </button>

                  {/* Option: Hoch */}
                  <button
                    type="button"
                    onClick={() => setJumpVolume(prev => prev === 'high' ? '' : 'high')}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 group",
                      jumpVolume === 'high'
                        ? "bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50 shadow-lg shadow-rose-950/40"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-xs font-black uppercase px-2.5 py-0.5 rounded-full border",
                          jumpVolume === 'high'
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-800 group-hover:text-rose-400"
                        )}>
                          Hoch
                        </span>
                        {jumpVolume === 'high' && (
                          <CheckCircle2 className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <h4 className="font-extrabold text-white text-sm">Maximal / Flugparaden</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Maximale Flugparaden, weiter Flankenabdruck mit voller Wucht, intensive Torschussduelle mit vielen harten Landungen.
                      </p>
                    </div>
                    <div className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                      <span>🔥 Hoher Impact auf Sehnen & Gelenke</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Individual Goalkeeper Overrides */}
              {keepersList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>2. Individuelle Torwart-Abweichungen (optional)</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Nur anpassen, wenn ein Torwart gezielt geschont oder stärker belastet wurde
                    </span>
                  </div>

                  <div className="space-y-2">
                    {keepersList.map(player => {
                      const individualVal = keeperJumpVolumes[player.id];
                      return (
                        <div 
                          key={player.id}
                          className="p-3 sm:p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-white">
                              {player.jerseyNumber ? `#${player.jerseyNumber}` : player.firstName[0]}
                            </div>
                            <span className="font-extrabold text-white text-xs sm:text-sm">
                              {player.firstName} {player.lastName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setKeeperJumpVolumes(prev => {
                                  const updated = { ...prev };
                                  delete updated[player.id];
                                  return updated;
                                });
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-bold transition",
                                !individualVal
                                  ? "bg-slate-800 text-white border border-slate-700 font-extrabold"
                                  : "text-slate-400 hover:text-slate-200 bg-slate-900/60"
                              )}
                            >
                              Standard {jumpVolume ? `(${jumpVolume === 'high' ? 'Hoch' : jumpVolume === 'medium' ? 'Mittel' : 'Niedrig'})` : ''}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setKeeperJumpVolumes(prev => ({ ...prev, [player.id]: 'low' }));
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-bold transition border",
                                individualVal === 'low'
                                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500"
                                  : "text-slate-400 hover:text-emerald-400 border-transparent bg-slate-900/60"
                              )}
                            >
                              Niedrig
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setKeeperJumpVolumes(prev => ({ ...prev, [player.id]: 'medium' }));
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-bold transition border",
                                individualVal === 'medium'
                                  ? "bg-amber-950/80 text-amber-300 border-amber-500"
                                  : "text-slate-400 hover:text-amber-400 border-transparent bg-slate-900/60"
                              )}
                            >
                              Mittel
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setKeeperJumpVolumes(prev => ({ ...prev, [player.id]: 'high' }));
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-bold transition border",
                                individualVal === 'high'
                                  ? "bg-rose-950/80 text-rose-300 border-rose-500"
                                  : "text-slate-400 hover:text-rose-400 border-transparent bg-slate-900/60"
                              )}
                            >
                              Hoch
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ================================================================= */}
          {/* TAB 1: TORHÜTER DER TRAININGSGRUPPE                               */}
          {/* ================================================================= */}
          {activeTab === 'keepers' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">
                    Individuelle Torwart-Erkenntnisse dieser Trainingseinheit
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Eintragungen fließen automatisch in die <strong>Spielerbezogene Auswertung</strong> (unter Orga ➔ Datenauswertung ➔ Trainer-Feedback) für den jeweiligen Torwart ein.
                  </p>
                </div>
              </div>

              {keepersList.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-slate-500 text-xs">
                  <Users className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="font-bold text-slate-300">Keine Torhüter für diese Gruppe gefunden</p>
                  <p className="text-[11px]">Trage im Bereich „Orga“ unter „Trainingsgruppen & Torhüter“ Torwarte in deine Gruppen ein.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {keepersList.map(player => (
                    <div 
                      key={player.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-white">
                            {player.jerseyNumber ? `#${player.jerseyNumber}` : player.firstName[0]}
                          </div>
                          <span className="font-extrabold text-white text-sm">
                            {player.firstName} {player.lastName}
                          </span>
                          {player.birthYear && (
                            <span className="text-[10.5px] text-slate-500 font-mono">
                              (Jg. {player.birthYear})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Belastungsbewertung (RPE Dropdown 1-10) */}
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap">
                              <Activity className="w-3.5 h-3.5 text-amber-400" />
                              <span>Belastung:</span>
                            </label>
                            <select
                              value={keeperLoadRatings[player.id] || ''}
                              onChange={e => {
                                const val = e.target.value ? parseInt(e.target.value, 10) : 0;
                                setKeeperLoadRatings(prev => {
                                  const updated = { ...prev };
                                  if (val > 0) updated[player.id] = val;
                                  else delete updated[player.id];
                                  return updated;
                                });
                              }}
                              className={cn(
                                "bg-slate-900 border rounded-xl px-2.5 py-1 text-xs font-bold transition focus:outline-none cursor-pointer",
                                keeperLoadRatings[player.id]
                                  ? keeperLoadRatings[player.id] >= 8
                                    ? "text-rose-300 border-rose-500/60 bg-rose-950/40"
                                    : keeperLoadRatings[player.id] >= 5
                                    ? "text-amber-300 border-amber-500/60 bg-amber-950/40"
                                    : "text-emerald-300 border-emerald-500/60 bg-emerald-950/40"
                                  : "text-slate-400 border-slate-800 hover:border-slate-700"
                              )}
                            >
                              <option value="" className="bg-slate-950 text-slate-400">RPE wählen (1-10)</option>
                              <option value="1" className="bg-slate-950 text-emerald-300">1 - Sehr leicht (Regeneration)</option>
                              <option value="2" className="bg-slate-950 text-emerald-300">2 - Leicht</option>
                              <option value="3" className="bg-slate-950 text-emerald-300">3 - Leicht bis moderat</option>
                              <option value="4" className="bg-slate-950 text-emerald-300">4 - Moderat</option>
                              <option value="5" className="bg-slate-950 text-amber-300">5 - Deutlich spürbar</option>
                              <option value="6" className="bg-slate-950 text-amber-300">6 - Anstrengend</option>
                              <option value="7" className="bg-slate-950 text-amber-300">7 - Schwer (Hochintensiv)</option>
                              <option value="8" className="bg-slate-950 text-rose-300">8 - Sehr schwer</option>
                              <option value="9" className="bg-slate-950 text-rose-300">9 - Extrem schwer</option>
                              <option value="10" className="bg-slate-950 text-rose-300">10 - Maximal / All-Out</option>
                            </select>
                          </div>

                          {keeperInsights[player.id]?.trim() && (
                            <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Erfasst
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Erkenntnisse der Trainingseinheit</span>
                            <span className="text-slate-500 lowercase font-normal">(optional)</span>
                          </label>

                          {isSpeechSupported && (
                            <button
                              type="button"
                              onClick={() => toggleVoiceInput(`keeper_${player.id}`)}
                              className={cn(
                                "px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border",
                                isListening && activeVoiceField === `keeper_${player.id}`
                                  ? "bg-rose-600 text-white border-rose-500 animate-pulse ring-2 ring-rose-400 shadow-md shadow-rose-950"
                                  : "bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border-slate-800 hover:border-emerald-500/50"
                              )}
                              title={isListening && activeVoiceField === `keeper_${player.id}` ? "Spracheingabe beenden" : "Per Sprache diktieren"}
                            >
                              {isListening && activeVoiceField === `keeper_${player.id}` ? (
                                <>
                                  <MicOff className="w-3.5 h-3.5 text-white" />
                                  <span>Aufnahme aktiv...</span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Per Sprache eingeben</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={3}
                          value={keeperInsights[player.id] || ''}
                          onChange={e => setKeeperInsights(prev => ({ ...prev, [player.id]: e.target.value }))}
                          placeholder={`Erkenntnisse, Entwicklungen oder Auffälligkeiten von ${player.firstName} in dieser Trainingseinheit...`}
                          className={cn(
                            "w-full bg-slate-900 border rounded-xl p-3 text-slate-100 placeholder-slate-600 focus:outline-none text-xs leading-relaxed transition",
                            isListening && activeVoiceField === `keeper_${player.id}`
                              ? "border-rose-500 ring-1 ring-rose-500/50"
                              : "border-slate-800 focus:border-emerald-500"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: ÜBUNGEN DER TRAININGSEINHEIT (2-SPALTIGES LAYOUT)           */}
          {/* ================================================================= */}
          {activeTab === 'exercises' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">
                    Erfahrungen & Feedback zu den eingesetzten Übungen
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dokumentiere deine Erfahrungen zur Durchführung (z.B. Intensität, Abstände, Verhalten der Torhüter). Eintragungen sind im <strong>Trainingsplaner</strong> und im <strong>Übungs-Katalog</strong> bei der jeweiligen Übung hinter dem Button <strong>„Erfahrungen“</strong> abrufbar.
                  </p>
                </div>
              </div>

              {planExercises.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-slate-500 text-xs">
                  <Layers className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="font-bold text-slate-300">Keine Übungen in diesem Plan hinterlegt</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Horizontal Exercise Switcher Tabs at top if multiple exercises */}
                  {planExercises.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      <span className="text-[11px] font-bold uppercase text-slate-400 flex-shrink-0 mr-1">
                        Übung wählen ({filledExercisesCount}/{planExercises.length} erfasst):
                      </span>
                      {planExercises.map((exercise, idx) => {
                        const isSelected = activeSelectedExercise?.id === exercise.id;
                        const hasExp = Boolean(exercise.id && exerciseExperiences[exercise.id]?.trim());

                        return (
                          <button
                            key={exercise.id || idx}
                            type="button"
                            onClick={() => setSelectedExerciseId(exercise.id || '')}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 flex-shrink-0 shadow-sm cursor-pointer",
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/60"
                                : "bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-900 hover:border-slate-700"
                            )}
                          >
                            <span>{idx + 1}. {exercise.title}</span>
                            {hasExp ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Main 2-Column Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* =============================================================== */}
                    {/* LEFT COLUMN: DIE ÜBUNG (GENAU WIE IM ÜBUNGSKATALOG)              */}
                    {/* =============================================================== */}
                    <div className="lg:col-span-6 flex flex-col">
                      {activeSelectedExercise ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
                          {/* 1. Übungsgrafik (Pitch Canvas / Image) wie im Katalog */}
                          <div className="aspect-[720/500] bg-slate-950 relative overflow-hidden border-b border-slate-800 flex-shrink-0">
                            {(activeSelectedExercise.imageUrl || activeSelectedExercise.imageBase64) ? (
                              <img
                                src={activeSelectedExercise.imageUrl || activeSelectedExercise.imageBase64}
                                alt={activeSelectedExercise.title}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                <Layers className="w-8 h-8" />
                                <span className="text-xs">Keine Grafik hinterlegt</span>
                              </div>
                            )}

                            {/* Badge Overlay Top-Left */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                              <span className={cn(
                                "text-[11px] px-2.5 py-0.5 rounded-md font-extrabold border shadow-md backdrop-blur-md", 
                                CATEGORY_COLORS[activeSelectedExercise.category]?.badge || "bg-slate-800 text-slate-300"
                              )}>
                                {activeSelectedExercise.category}
                              </span>
                              {activeSelectedExercise.isPublished ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-purple-950/90 text-purple-300 border border-purple-700/80 shadow-md backdrop-blur-md flex items-center gap-1">
                                  <Globe className="w-3 h-3 text-purple-400" />
                                  <span>Akademie</span>
                                </span>
                              ) : activeSelectedExercise.clubId ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-sky-950/90 text-sky-300 border border-sky-700/80 shadow-md backdrop-blur-md flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-sky-400" />
                                  <span>{activeSelectedExercise.clubName || 'Verein'}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-900/90 text-slate-300 border border-slate-700/80 shadow-md backdrop-blur-md flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>Privat</span>
                                </span>
                              )}
                            </div>

                            {/* Duration Badge Bottom-Right */}
                            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-bold text-slate-200 border border-slate-800 shadow-md">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{activeSelectedExercise.durationMinutes || 15} Min.</span>
                            </div>
                          </div>

                          {/* 2. Card Body: Titel, Attribute, Ablauf & Coaching-Punkte */}
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5 overflow-y-auto max-h-[460px] custom-scrollbar">
                            <div className="space-y-3">
                              <h3 className="font-extrabold text-base sm:text-lg text-white leading-snug">
                                {activeSelectedExercise.title}
                              </h3>

                              {/* Attribute Badges */}
                              <div className="flex flex-wrap gap-1.5 text-[11px]">
                                <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-semibold flex items-center gap-1">
                                  <Users className="w-3 h-3 text-sky-400" />
                                  <span>{activeSelectedExercise.minKeepers || 1}–{activeSelectedExercise.maxKeepers || 4} TW</span>
                                </span>

                                {activeSelectedExercise.minAgeGroup && activeSelectedExercise.minAgeGroup !== 'immer' && (
                                  <span className="bg-purple-950/50 text-purple-300 px-2 py-0.5 rounded border border-purple-800/70 font-semibold flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-purple-400" />
                                    <span>ab {activeSelectedExercise.minAgeGroup}</span>
                                  </span>
                                )}

                                {activeSelectedExercise.atSchwerpunkt && (
                                  <span className="bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60 font-semibold">
                                    {activeSelectedExercise.atSchwerpunkt}
                                  </span>
                                )}

                                {activeSelectedExercise.athletikSchwerpunkt && (
                                  <span className="bg-blue-950/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/60 font-semibold">
                                    {activeSelectedExercise.athletikSchwerpunkt}
                                  </span>
                                )}

                                {activeSelectedExercise.technik && (
                                  <span className="bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 font-semibold">
                                    {activeSelectedExercise.technik}
                                  </span>
                                )}

                                {activeSelectedExercise.situativeSchwerpunkte && activeSelectedExercise.situativeSchwerpunkte.map(s => (
                                  <span key={s} className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                                    {s}
                                  </span>
                                ))}

                                {activeSelectedExercise.siegbedingung && (
                                  <span className="bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded border border-rose-800/60 font-semibold flex items-center gap-1">
                                    <Trophy className="w-3 h-3 text-rose-400" />
                                    <span>Siegbedingung</span>
                                  </span>
                                )}
                              </div>

                              {/* Ablauf der Übung */}
                              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                                  Ablauf der Übung:
                                </span>
                                <p className="text-slate-200 font-mono text-[11.5px] whitespace-pre-line leading-relaxed">
                                  {activeSelectedExercise.ablauf || 'Kein Ablauftext hinterlegt.'}
                                </p>
                              </div>

                              {/* Coaching-Punkte */}
                              {activeSelectedExercise.coachingPoints && (
                                <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-900/50 space-y-1">
                                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Coaching-Punkte / Trainer-Tipps:</span>
                                  </span>
                                  <p className="text-emerald-200 text-[11.5px] whitespace-pre-line leading-relaxed">
                                    {activeSelectedExercise.coachingPoints}
                                  </p>
                                </div>
                              )}

                              {/* Material-Liste */}
                              {activeSelectedExercise.materials && activeSelectedExercise.materials.length > 0 && (
                                <div className="space-y-1 pt-0.5">
                                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                                    Benötigte Materialien:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {activeSelectedExercise.materials.map(m => (
                                      <span key={m} className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-800">
                                        {m}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-slate-500 text-xs my-auto">
                          <Layers className="w-8 h-8 mx-auto text-slate-600" />
                          <p className="font-bold text-slate-300">Wähle eine Übung aus</p>
                        </div>
                      )}
                    </div>

                    {/* =============================================================== */}
                    {/* RIGHT COLUMN: ERFAHRUNGEN MIT DER ÜBUNG (FREITEXTFELD)           */}
                    {/* =============================================================== */}
                    <div className="lg:col-span-6 flex flex-col h-full">
                      {activeSelectedExercise ? (
                        <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col flex-1 space-y-4 shadow-sm">
                          {/* Header on Right */}
                          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-5 h-5 text-amber-400" />
                              <div>
                                <h4 className="font-extrabold text-white text-sm sm:text-base">
                                  Erfahrungen mit der Übung
                                </h4>
                                <span className="text-[11px] text-slate-400">
                                  Für: <strong className="text-slate-200">{activeSelectedExercise.title}</strong>
                                </span>
                              </div>
                            </div>

                            {activeSelectedExercise.id && exerciseExperiences[activeSelectedExercise.id]?.trim() ? (
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1.5 flex-shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Erfasst</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-500 border border-slate-800 text-xs font-bold flex items-center gap-1.5 flex-shrink-0">
                                <span className="w-2 h-2 rounded-full bg-slate-600" />
                                <span>Noch kein Eintrag</span>
                              </span>
                            )}
                          </div>

                          {/* Prominent Freitextfeld für Erfahrungen */}
                          <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                                <MessageSquare className="w-4 h-4 text-amber-400" />
                                <span>Erfahrungen mit der Übung</span>
                                <span className="text-slate-500 font-normal lowercase">(optional)</span>
                              </label>

                              {isSpeechSupported && activeSelectedExercise.id && (
                                <button
                                  type="button"
                                  onClick={() => toggleVoiceInput(`exercise_${activeSelectedExercise.id}`)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border",
                                    isListening && activeVoiceField === `exercise_${activeSelectedExercise.id}`
                                      ? "bg-rose-600 text-white border-rose-500 animate-pulse ring-2 ring-rose-400 shadow-md shadow-rose-950"
                                      : "bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border-slate-800 hover:border-amber-500/50"
                                  )}
                                  title={isListening && activeVoiceField === `exercise_${activeSelectedExercise.id}` ? "Spracheingabe beenden" : "Per Sprache diktieren"}
                                >
                                  {isListening && activeVoiceField === `exercise_${activeSelectedExercise.id}` ? (
                                    <>
                                      <MicOff className="w-3.5 h-3.5 text-white" />
                                      <span>Aufnahme aktiv...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Mic className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Per Sprache eingeben</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <textarea
                              rows={10}
                              value={(activeSelectedExercise.id && exerciseExperiences[activeSelectedExercise.id]) || ''}
                              onChange={e => {
                                if (activeSelectedExercise.id) {
                                  const exId = activeSelectedExercise.id;
                                  setExerciseExperiences(prev => ({ ...prev, [exId]: e.target.value }));
                                }
                              }}
                              placeholder={`Wie lief die Übung „${activeSelectedExercise.title}“?\n\n• Welche Anpassungen (Abstände, Schusspositionen, Belastungsdauer) waren nötig?\n• Welche technischen/taktischen Schwerpunkte haben gut funktioniert?\n• Wie war die Intensität und das Feedback der Torhüter?`}
                              className={cn(
                                "w-full flex-1 min-h-[220px] bg-slate-900 border rounded-2xl p-4 text-slate-100 placeholder-slate-600 focus:outline-none text-xs sm:text-sm leading-relaxed transition",
                                isListening && activeVoiceField === `exercise_${activeSelectedExercise.id}`
                                  ? "border-rose-500 ring-1 ring-rose-500/50"
                                  : "border-slate-800 focus:border-emerald-500"
                              )}
                            />
                          </div>

                          {/* Next / Previous Navigation if multiple exercises */}
                          {planExercises.length > 1 && (
                            <div className="pt-3 border-t border-slate-850 flex items-center justify-between gap-2">
                              {(() => {
                                const currentIndex = planExercises.findIndex(e => e.id === activeSelectedExercise.id);
                                const hasPrev = currentIndex > 0;
                                const hasNext = currentIndex < planExercises.length - 1;

                                return (
                                  <>
                                    <button
                                      type="button"
                                      disabled={!hasPrev}
                                      onClick={() => {
                                        if (hasPrev) setSelectedExerciseId(planExercises[currentIndex - 1].id || '');
                                      }}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
                                    >
                                      <ChevronLeft className="w-3.5 h-3.5" />
                                      <span>Vorherige Übung</span>
                                    </button>

                                    <span className="text-xs text-slate-500 font-mono">
                                      {currentIndex + 1} von {planExercises.length}
                                    </span>

                                    <button
                                      type="button"
                                      disabled={!hasNext}
                                      onClick={() => {
                                        if (hasNext) setSelectedExerciseId(planExercises[currentIndex + 1].id || '');
                                      }}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
                                    >
                                      <span>Nächste Übung</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-slate-500 text-xs my-auto">
                          <Layers className="w-8 h-8 mx-auto text-slate-600" />
                          <p className="font-bold text-slate-300">Wähle links eine Übung aus</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ================================================================= */}
          {/* TAB 3: SPIELERGESPRÄCHE DER TRAININGSGRUPPE                       */}
          {/* ================================================================= */}
          {activeTab === 'talks' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">
                    Individuelle Spielergespräche & Absprachen dieser Trainingseinheit
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dokumentiere hier persönliche Feedback-Gespräche, Zielvereinbarungen oder Absprachen mit den einzelnen Torhütern. Diese Notizen werden in der Historie archiviert und stehen im Trainingsplaner unter <strong>„Orga & Gespräche“</strong> bereit.
                  </p>
                </div>
              </div>

              {keepersList.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-slate-500 text-xs">
                  <Users className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="font-bold text-slate-300">Keine Torhüter für diese Gruppe gefunden</p>
                  <p className="text-[11px]">Trage im Bereich „Orga“ unter „Trainingsgruppen & Torhüter“ Torwarte in deine Gruppen ein.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {keepersList.map(player => (
                    <div 
                      key={player.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-white">
                            {player.jerseyNumber ? `#${player.jerseyNumber}` : player.firstName[0]}
                          </div>
                          <span className="font-extrabold text-white text-sm">
                            {player.firstName} {player.lastName}
                          </span>
                          {player.birthYear && (
                            <span className="text-[10.5px] text-slate-500 font-mono">
                              (Jg. {player.birthYear})
                            </span>
                          )}
                        </div>

                        {playerConversations[player.id]?.trim() && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Erfasst
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Gesprächsnotiz / Absprachen</span>
                            <span className="text-slate-500 lowercase font-normal">(optional)</span>
                          </label>

                          {isSpeechSupported && (
                            <button
                              type="button"
                              onClick={() => toggleVoiceInput(`talk_${player.id}`)}
                              className={cn(
                                "px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border",
                                isListening && activeVoiceField === `talk_${player.id}`
                                  ? "bg-rose-600 text-white border-rose-500 animate-pulse ring-2 ring-rose-400 shadow-md shadow-rose-950"
                                  : "bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border-slate-800 hover:border-emerald-500/50"
                              )}
                              title={isListening && activeVoiceField === `talk_${player.id}` ? "Spracheingabe beenden" : "Per Sprache diktieren"}
                            >
                              {isListening && activeVoiceField === `talk_${player.id}` ? (
                                <>
                                  <MicOff className="w-3.5 h-3.5 text-white" />
                                  <span>Aufnahme aktiv...</span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Per Sprache eingeben</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={3}
                          value={playerConversations[player.id] || ''}
                          onChange={e => setPlayerConversations(prev => ({ ...prev, [player.id]: e.target.value }))}
                          placeholder={`Gesprächsinhalte, Feedback, persönliche Zielvereinbarungen oder Absprachen mit ${player.firstName}...`}
                          className={cn(
                            "w-full bg-slate-900 border rounded-xl p-3 text-slate-100 placeholder-slate-600 focus:outline-none text-xs leading-relaxed transition",
                            isListening && activeVoiceField === `talk_${player.id}`
                              ? "border-rose-500 ring-1 ring-rose-500/50"
                              : "border-slate-800 focus:border-emerald-500"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {filledJumpVolumeCount + filledKeepersCount + filledExercisesCount + filledTalksCount > 0 ? (
              <span className="text-emerald-400 font-bold">
                ✓ {[
                  jumpVolume ? `Sprungvolumen: ${jumpVolume === 'high' ? 'Hoch' : jumpVolume === 'medium' ? 'Mittel' : 'Niedrig'}` : null,
                  filledKeepersCount > 0 ? `${filledKeepersCount} Torwart-Erkenntnisse` : null,
                  filledExercisesCount > 0 ? `${filledExercisesCount} Übungs-Erfahrungen` : null,
                  filledTalksCount > 0 ? `${filledTalksCount} Spielergespräche` : null
                ].filter(Boolean).join(' • ')} erfasst
              </span>
            ) : (
              <span>Optionale Freitext- & Belastungsfelder zur nachhaltigen Trainingsanalyse</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Abbrechen
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveDebrief}
              className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Wird gespeichert...' : 'Nachbereitung speichern'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
