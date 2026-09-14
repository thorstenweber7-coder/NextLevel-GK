import React, { useState, useEffect } from 'react';
import type { Exercise, TrainingPlan } from '../types';
import { CATEGORY_COLORS, METHODISCHE_REIHE_LABELS } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Clock, 
  Layers, 
  Sparkles, 
  Tag, 
  CheckSquare, 
  Edit3, 
  Users, 
  Trophy, 
  Star,
  AlertTriangle,
  RotateCcw,
  Check,
  Info,
  MessageSquare,
  Video
} from 'lucide-react';
import { VideoEmbedPlayer } from './VideoEmbedPlayer';
import { ExerciseExperiencesModal } from './ExerciseExperiencesModal';
import { getAuthorizedExerciseExperiences } from '../utils/exerciseExperiences';
import { cn } from '../utils/cn';

interface ExerciseModalProps {
  exercise: Exercise | null;
  onClose: () => void;
  onEdit?: (exercise: Exercise) => void;
  isPlanExercise?: boolean;
  onSavePlanExercise?: (updatedExercise: Exercise) => void;
  onResetPlanExercise?: (exerciseId: string) => void;
  isCustomizedForPlan?: boolean;
  savedPlans?: TrainingPlan[];
}

export const ExerciseModal: React.FC<ExerciseModalProps> = ({
  exercise,
  onClose,
  onEdit,
  isPlanExercise = false,
  onSavePlanExercise,
  onResetPlanExercise,
  isCustomizedForPlan = false,
  savedPlans = []
}) => {
  const { user, isMasterAdmin, isClubAdmin, clubId, isExerciseFavorite, toggleFavoriteExercise } = useAuth();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isExperiencesModalOpen, setIsExperiencesModalOpen] = useState<boolean>(false);

  // Authorized experiences count for badge
  const experiencesCount = React.useMemo(() => {
    if (!exercise?.id) return 0;
    return getAuthorizedExerciseExperiences(
      exercise.id,
      savedPlans,
      user,
      isMasterAdmin,
      isClubAdmin,
      clubId
    ).length;
  }, [exercise?.id, savedPlans, user, isMasterAdmin, isClubAdmin, clubId]);

  // Form State for editing plan-specific fields (Dauer, Ablauf & Coaching-Punkte)
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [ablauf, setAblauf] = useState<string>('');
  const [coachingPoints, setCoachingPoints] = useState<string>('');

  // Sync state when exercise changes
  useEffect(() => {
    if (exercise) {
      setDurationMinutes(exercise.durationMinutes || 15);
      setAblauf(exercise.ablauf || '');
      setCoachingPoints(exercise.coachingPoints || '');
      setIsEditing(false);
    }
  }, [exercise]);

  if (!exercise) return null;

  const isFav = exercise.id ? isExerciseFavorite(exercise.id) : false;

  const handleSavePlanModifications = () => {
    const parsedDuration = Math.max(1, Math.min(180, Number(durationMinutes) || 15));
    const updatedExercise: Exercise = {
      ...exercise,
      durationMinutes: parsedDuration,
      ablauf: ablauf.trim(),
      coachingPoints: coachingPoints.trim(),
      updatedAt: Date.now()
    };

    if (onSavePlanExercise) {
      onSavePlanExercise(updatedExercise);
    }
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span className={cn("px-3 py-1 rounded-lg text-xs font-bold border flex-shrink-0", CATEGORY_COLORS[exercise.category]?.badge || "bg-slate-800 text-slate-200")}>
              {exercise.category}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
                  {exercise.title}
                </h2>
                {isCustomizedForPlan && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600 flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Plan-Anpassung</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Button Erfahrungen */}
            {exercise.id && !isEditing && (
              <button
                type="button"
                onClick={() => setIsExperiencesModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shadow-sm bg-slate-950 border-slate-800 text-amber-300 hover:text-amber-200 hover:bg-slate-800 hover:border-amber-500/50"
                title="Erfahrungsberichte zu dieser Übung ansehen"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Erfahrungen</span>
                {experiencesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-600 font-mono">
                    {experiencesCount}
                  </span>
                )}
              </button>
            )}

            {/* Global Favorite */}
            {exercise.id && !isEditing && (
              <button
                type="button"
                onClick={() => toggleFavoriteExercise(exercise.id!)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shadow-sm",
                  isFav
                    ? "bg-amber-950/70 border-amber-500/80 text-amber-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                )}
                title={isFav ? "Aus Favoriten entfernen" : "Als Favorit markieren"}
              >
                <Star className={cn("w-3.5 h-3.5", isFav ? "fill-amber-400 text-amber-400" : "")} />
                <span className="hidden sm:inline">{isFav ? 'Favorit' : 'Favorisieren'}</span>
              </button>
            )}

            {/* Global Edit (for Admin/Catalog) */}
            {onEdit && !isPlanExercise && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(exercise);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-400 bg-sky-950/40 border border-sky-800/80 hover:bg-sky-900/50 flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Katalog-Übung bearbeiten</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Plan-Specific Notice Banner & Quick Mode Toggle */}
        {isPlanExercise && (
          <div className="bg-gradient-to-r from-amber-950/80 via-slate-950 to-amber-950/80 border-b border-amber-500/30 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-200 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex-shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="leading-snug">
                <strong className="font-bold text-amber-300">Hinweis zur Trainingsplan-Anpassung:</strong>
                <p className="text-amber-200/90 text-[11.5px]">
                  Änderungen an Dauer/Zeiten, Ablauf und Coaching-Punkten gelten <strong>nur für diesen aktiven Trainingsplan</strong> und werden nicht im Übungs-Katalog gespeichert.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isCustomizedForPlan && onResetPlanExercise && !isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Möchtest du die individuellen Änderungen dieser Übung verwerfen und auf die Original-Katalogversion zurücksetzen?')) {
                      if (exercise.id) onResetPlanExercise(exercise.id);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-300 bg-rose-950/40 border border-rose-800/80 hover:bg-rose-900/50 flex items-center gap-1 transition"
                  title="Auf Katalog-Vorlage zurücksetzen"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Auf Vorlage zurücksetzen</span>
                </button>
              )}

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-1.5 transition shadow-md shadow-amber-950/50 active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Zeiten, Ablauf & Coaching für diesen Plan anpassen</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDurationMinutes(exercise.durationMinutes || 15);
                      setAblauf(exercise.ablauf || '');
                      setCoachingPoints(exercise.coachingPoints || '');
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePlanModifications}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/50 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Nur für dieses Training übernehmen</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Top Info Grid: Taktikboard Image + Read-Only Metadata & Eckdaten */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Taktikboard Image & Video */}
            <div className="md:col-span-7 space-y-3">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center p-2">
                {(exercise.imageUrl || exercise.imageBase64) ? (
                  <img
                    src={exercise.imageUrl || exercise.imageBase64}
                    alt={exercise.title}
                    className="w-full h-auto rounded-xl object-contain max-h-[380px]"
                  />
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Layers className="w-8 h-8" />
                    <span>Keine Taktikgrafik vorhanden</span>
                  </div>
                )}
              </div>

              {exercise.videoUrl && (
                <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Video className="w-4 h-4 text-rose-400" />
                    <span>Übungs-Video:</span>
                  </div>
                  <VideoEmbedPlayer url={exercise.videoUrl} title={exercise.title} />
                </div>
              )}
            </div>

            {/* Quick Details (Read-Only) */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80">
                  <span className="font-semibold uppercase tracking-wider text-slate-400">Eckdaten</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sky-400 font-bold">
                      <Users className="w-3.5 h-3.5" />
                      <span>{exercise.minKeepers || 1}–{exercise.maxKeepers || 4} TW</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isEditing ? durationMinutes : (exercise.durationMinutes || 15)} Min.</span>
                      {isPlanExercise && !isEditing && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 bg-amber-950/70 hover:bg-amber-900/60 border border-amber-600/60 px-1.5 py-0.5 rounded transition shadow-sm ml-0.5"
                          title="Übungsdauer für diesen Trainingsplan anpassen"
                        >
                          anpassen
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Altersgruppe */}
                {exercise.minAgeGroup && exercise.minAgeGroup !== 'immer' && (
                  <div className="text-xs flex items-center gap-1.5 text-purple-300">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-medium text-slate-400">Altersklasse:</span>
                    <strong className="font-bold">ab {exercise.minAgeGroup}</strong>
                  </div>
                )}

                {/* Specific details depending on category */}
                {exercise.category === 'WarmUp' && (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {exercise.atSchwerpunkt && (
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                          <span className="text-slate-500 font-medium block text-[10.5px]">Athletisches Element:</span>
                          <span className="text-amber-300 font-bold">{exercise.atSchwerpunkt}</span>
                        </div>
                      )}
                      {exercise.kognition && (
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                          <span className="text-slate-500 font-medium block text-[10.5px]">Kognitives Element:</span>
                          <span className={cn("font-bold", exercise.kognition === 'enthalten' ? "text-emerald-300" : "text-slate-400")}>
                            {exercise.kognition}
                          </span>
                        </div>
                      )}
                      {exercise.koordinativesElement && (
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                          <span className="text-slate-500 font-medium block text-[10.5px]">Koordinatives Element:</span>
                          <span className={cn("font-bold", exercise.koordinativesElement === 'enthalten' ? "text-emerald-300" : "text-slate-400")}>
                            {exercise.koordinativesElement}
                          </span>
                        </div>
                      )}
                      {exercise.visuellesElement && (
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                          <span className="text-slate-500 font-medium block text-[10.5px]">Visuelles Element:</span>
                          <span className={cn("font-bold", exercise.visuellesElement === 'enthalten' ? "text-emerald-300" : "text-slate-400")}>
                            {exercise.visuellesElement}
                          </span>
                        </div>
                      )}
                    </div>

                    {exercise.warmUpSchwerpunkte && exercise.warmUpSchwerpunkte.length > 0 && (
                      <div className="pt-1">
                        <span className="text-slate-500 font-medium block mb-1">Hauptschwerpunkt(e):</span>
                        <div className="flex flex-wrap gap-1">
                          {exercise.warmUpSchwerpunkte.map(s => (
                            <span key={s} className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/80">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {exercise.category === 'Torwart-Athletik' && (exercise.athletikSchwerpunkt || exercise.athletischerEntwicklungsreiz) && (
                  <div className="text-xs space-y-1">
                    {exercise.athletikSchwerpunkt && (
                      <div>
                        <span className="text-slate-500 font-medium">Athletik-Schwerpunkt: </span>
                        <span className="text-blue-300 font-bold">{exercise.athletikSchwerpunkt}</span>
                      </div>
                    )}
                    {exercise.athletischerEntwicklungsreiz && (
                      <div>
                        <span className="text-slate-500 font-medium">Entwicklungsreiz: </span>
                        <span className="text-sky-300 font-bold">{exercise.athletischerEntwicklungsreiz}</span>
                      </div>
                    )}
                  </div>
                )}

                {exercise.category === 'Analytisch' && (
                  <div className="space-y-1.5 text-xs">
                    {exercise.technik && (
                      <div>
                        <span className="text-slate-500 font-medium">Torwarttechnik: </span>
                        <span className="text-purple-300 font-bold">{exercise.technik}</span>
                      </div>
                    )}
                    {exercise.technikprinzipien && (
                      <div>
                        <span className="text-slate-500 font-medium">Prinzipien: </span>
                        <span className="text-slate-200">{exercise.technikprinzipien}</span>
                      </div>
                    )}
                    {exercise.methodischeReiheStufen && (
                      <div className="pt-2 border-t border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-purple-400 uppercase">Methodische Stufen:</span>
                        {(Object.keys(METHODISCHE_REIHE_LABELS) as (keyof typeof METHODISCHE_REIHE_LABELS)[]).map(k => {
                          const val = exercise.methodischeReiheStufen?.[k];
                          if (!val) return null;
                          return (
                            <div key={k} className="bg-slate-900 p-1.5 rounded-lg text-[11px] border border-slate-800">
                              <span className="font-bold text-slate-400 block">{METHODISCHE_REIHE_LABELS[k]}:</span>
                              <span className="text-slate-200">{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {exercise.category === 'Situativ' && (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {exercise.situativeSchwerpunkte?.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {s}
                        </span>
                      ))}
                    </div>
                    {exercise.taktikprinzipien && (
                      <div className="pt-1">
                        <span className="text-slate-500 font-medium">Taktikprinzipien: </span>
                        <span className="text-slate-200">{exercise.taktikprinzipien}</span>
                      </div>
                    )}
                  </div>
                )}

                {exercise.category === 'Wettkämpfe' && (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {exercise.situativeSchwerpunkte?.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          {s}
                        </span>
                      ))}
                    </div>
                    {exercise.siegbedingung && (
                      <div className="pt-1.5 bg-rose-950/40 p-2 rounded-lg border border-rose-900/60">
                        <span className="text-rose-400 font-bold flex items-center gap-1 mb-0.5">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Siegbedingung:</span>
                        </span>
                        <span className="text-slate-100 font-medium">{exercise.siegbedingung}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Material List (Read-Only) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Material ({exercise.materials?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.materials && exercise.materials.length > 0 ? (
                    exercise.materials.map(m => (
                      <span
                        key={m}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1"
                      >
                        <CheckSquare className="w-3 h-3 text-emerald-400" />
                        <span>{m}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">Keine speziellen Materialien</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Plan-Specific Duration Customization Section in Edit Mode */}
          {isEditing && isPlanExercise && (
            <div className="bg-slate-950 border border-emerald-500/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Übungszeit / Dauer für diesen Trainingsplan</span>
                      <span className="text-[10px] font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/70">
                        Nur für diesen Plan
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Passe die geplante Dauer der Übung individuell für diese Trainingseinheit an.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold">
                  <span className="text-slate-400 text-[11px]">Eingestellt:</span>
                  <strong className="text-emerald-400 text-sm">{durationMinutes} Min.</strong>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Stepper Controls */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setDurationMinutes(prev => Math.max(1, prev - 5))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xs flex items-center justify-center transition"
                      title="-5 Minuten"
                    >
                      -5
                    </button>
                    <div className="px-3 text-center min-w-[70px]">
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={durationMinutes}
                        onChange={e => setDurationMinutes(Math.max(1, Math.min(180, parseInt(e.target.value) || 0)))}
                        className="w-16 bg-transparent text-center text-lg font-black font-mono text-emerald-300 focus:outline-none"
                      />
                      <span className="text-[9.5px] text-slate-400 block -mt-1 font-bold uppercase tracking-wider">Min.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDurationMinutes(prev => Math.min(180, prev + 5))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xs flex items-center justify-center transition"
                      title="+5 Minuten"
                    >
                      +5
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[5, 10, 15, 20, 25, 30, 45, 60].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={cn(
                          "px-3 py-2 rounded-xl font-bold text-xs transition-all border active:scale-95",
                          durationMinutes === mins
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/60 scale-105"
                            : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                        )}
                      >
                        {mins} Min.
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11.5px] text-slate-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    Die veränderte Übungsdauer wird automatisch in die <strong>Phasendauer</strong> und die <strong>Gesamttrainingszeit</strong> dieses Plans eingerechnet. Der Übungs-Katalog bleibt unverändert.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Ablauf Text: View Mode vs Edit Mode */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>Übungsablauf & Organisation</span>
                {isEditing && (
                  <span className="text-xs normal-case font-bold text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-700/60">
                    Für dieses Training anpassen
                  </span>
                )}
              </h3>

              {isPlanExercise && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Bearbeiten</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                rows={6}
                value={ablauf}
                onChange={e => setAblauf(e.target.value)}
                placeholder="Beschreibe den genauen Ablauf, Stationen, Durchgänge und Variationen für diese Trainingseinheit..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-sm text-white font-sans leading-relaxed"
              />
            ) : (
              <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                {exercise.ablauf || 'Kein Ablauf hinterlegt.'}
              </p>
            )}
          </div>

          {/* Coaching Points: View Mode vs Edit Mode */}
          <div className={cn(
            "rounded-2xl p-5 space-y-3 border transition-colors",
            isEditing 
              ? "bg-slate-950 border-slate-800" 
              : "bg-emerald-950/20 border-emerald-900/50"
          )}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Coaching-Punkte / Trainerhinweise</span>
                {isEditing && (
                  <span className="text-xs normal-case font-bold text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-700/60">
                    Für dieses Training anpassen
                  </span>
                )}
              </h4>

              {isPlanExercise && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Bearbeiten</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                rows={4}
                value={coachingPoints}
                onChange={e => setCoachingPoints(e.target.value)}
                placeholder="Wichtige Detailkorrekturen, Schlüsselwörter und Beobachtungspunkte für dieses Training..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-sm text-emerald-200 font-sans leading-relaxed"
              />
            ) : (
              <p className="text-xs text-emerald-200/90 whitespace-pre-line leading-relaxed">
                {exercise.coachingPoints || 'Keine Coaching-Punkte hinterlegt.'}
              </p>
            )}
          </div>

          {/* Bottom Floating Save Action Bar in Edit Mode */}
          {isEditing && (
            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-4 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 rounded-b-3xl flex flex-wrap items-center justify-between gap-3 z-10 shadow-2xl">
              <div className="text-xs text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="font-medium">
                  Änderungen werden nur für dieses Training übernommen (Katalog bleibt unverändert).
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAblauf(exercise.ablauf || '');
                    setCoachingPoints(exercise.coachingPoints || '');
                    setIsEditing(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSavePlanModifications}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 flex items-center gap-2 transition shadow-lg shadow-emerald-950/60 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Nur für dieses Training übernehmen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exercise Experiences Modal */}
      {isExperiencesModalOpen && (
        <ExerciseExperiencesModal
          isOpen={isExperiencesModalOpen}
          onClose={() => setIsExperiencesModalOpen(false)}
          exercise={exercise}
          savedPlans={savedPlans}
        />
      )}
    </div>
  );
};
