import React, { useMemo } from 'react';
import { 
  X, 
  MessageSquare, 
  Calendar, 
  User, 
  Sparkles, 
  BookOpen, 
  ShieldCheck,
  Building2
} from 'lucide-react';
import type { Exercise, TrainingPlan } from '../types';
import { CATEGORY_COLORS } from '../types';
import { useAuth } from '../context/AuthContext';
import { getAuthorizedExerciseExperiences } from '../utils/exerciseExperiences';
import { cn } from '../utils/cn';

interface ExerciseExperiencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  savedPlans: TrainingPlan[];
}

export const ExerciseExperiencesModal: React.FC<ExerciseExperiencesModalProps> = ({
  isOpen,
  onClose,
  exercise,
  savedPlans
}) => {
  const { user, isMasterAdmin, isClubAdmin, clubId, clubName } = useAuth();

  const experiences = useMemo(() => {
    if (!exercise?.id) return [];
    return getAuthorizedExerciseExperiences(
      exercise.id,
      savedPlans,
      user,
      isMasterAdmin,
      isClubAdmin,
      clubId
    );
  }, [exercise?.id, savedPlans, user, isMasterAdmin, isClubAdmin, clubId]);

  if (!isOpen || !exercise) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border",
                  CATEGORY_COLORS[exercise.category]?.badge || "bg-slate-800 text-slate-300"
                )}>
                  {exercise.category}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                  Erfahrungen: {exercise.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {experiences.length} {experiences.length === 1 ? 'Erfahrungsbericht' : 'Erfahrungsberichte'} aus durchgeführten Trainingseinheiten
              </p>
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

        {/* Role Visibility Note */}
        <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            {isMasterAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 font-medium">Master-Admin: Voller Einblick in alle Trainer-Erfahrungen</span>
              </>
            ) : isClubAdmin ? (
              <>
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-300 font-medium">Club-Admin: Einblick in Erfahrungen deiner ClubCoaches ({clubName || 'Verein'})</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Deine persönlichen Erfahrungsberichte</span>
              </>
            )}
          </div>
        </div>

        {/* Body / List of experiences */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar">
          {experiences.length === 0 ? (
            <div className="p-10 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2.5">
              <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
              <h4 className="text-sm font-bold text-slate-300">
                Noch keine Erfahrungen erfasst
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Beim Nachbereiten einer Trainingseinheit im Trainingsplaner (unter „Historie“ ➔ „Einheit nachbereiten“) kannst du zu jeder Übung deine Erfahrungen festhalten.
              </p>
            </div>
          ) : (
            experiences.map((exp, idx) => (
              <div 
                key={exp.planId || idx}
                className="p-4 sm:p-4.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-sm"
              >
                {/* Meta header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-xs sm:text-sm">
                      {exp.planTitle}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {exp.planDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Trainer: <strong className="text-slate-200">{exp.trainerName}</strong></span>
                  </div>
                </div>

                {/* Experience Text */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  <strong className="text-amber-400 text-[10.5px] uppercase block mb-1">
                    Erfahrungen mit der Übung:
                  </strong>
                  {exp.experienceText}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
