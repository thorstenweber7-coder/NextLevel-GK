import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  User,
  Send,
  Target,
  Grid,
  Zap
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { 
  PeriodizationFeedback, 
  TrainingGroup, 
  MacroPlan, 
  MesoPlan 
} from '../types';
import { 
  addFeedbackToMacroPlan, 
  deleteFeedbackFromMacroPlan, 
  addFeedbackToMesoPlan, 
  deleteFeedbackFromMesoPlan 
} from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';

interface PeriodizationFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: TrainingGroup | null;
  activeMacroPlan: MacroPlan | null;
  activeMesoPlan: MesoPlan | null;
  activeStage: 'macro' | 'meso' | 'micro';
  onFeedbackChanged?: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const FEEDBACK_CATEGORIES: { id: PeriodizationFeedback['category']; label: string; color: string }[] = [
  { id: 'Methodik', label: 'Methodik & Didaktik', color: 'bg-purple-950/80 text-purple-300 border-purple-700/60' },
  { id: 'Belastungssteuerung', label: 'Belastungssteuerung (Workload)', color: 'bg-amber-950/80 text-amber-300 border-amber-700/60' },
  { id: 'Organisation', label: 'Organisation & Ablauf', color: 'bg-sky-950/80 text-sky-300 border-sky-700/60' },
  { id: 'Sonstiges', label: 'Sonstiges / Notiz', color: 'bg-slate-800 text-slate-300 border-slate-700' }
];

export const PeriodizationFeedbackModal: React.FC<PeriodizationFeedbackModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  activeMacroPlan,
  activeMesoPlan,
  activeStage,
  onFeedbackChanged,
  showToast
}) => {
  const { user, userProfile, isClubAdmin, isAdmin, isMasterAdmin } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState<PeriodizationFeedback['category']>('Methodik');
  const [feedbackScope, setFeedbackScope] = useState<'macro' | 'meso' | 'micro'>(activeStage);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync scope when stage changes
  React.useEffect(() => {
    setFeedbackScope(activeStage);
  }, [activeStage]);

  if (!isOpen) return null;

  // Gather all feedbacks from activeMacroPlan and activeMesoPlan
  const macroFeedbacks: (PeriodizationFeedback & { parentType: 'macro'; parentId: string })[] = (activeMacroPlan?.feedbacks || []).map(f => ({
    ...f,
    parentType: 'macro' as const,
    parentId: activeMacroPlan?.id || ''
  }));

  const mesoFeedbacks: (PeriodizationFeedback & { parentType: 'meso'; parentId: string })[] = (activeMesoPlan?.feedbacks || []).map(f => ({
    ...f,
    parentType: 'meso' as const,
    parentId: activeMesoPlan?.id || ''
  }));

  // Combine and sort by newest first
  const allFeedbacks = [...macroFeedbacks, ...mesoFeedbacks].sort((a, b) => b.createdAt - a.createdAt);

  const authorName = userProfile?.firstName && userProfile?.lastName 
    ? `${userProfile.firstName.trim()} ${userProfile.lastName.trim()}`
    : (userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Trainer');

  const authorRole = isMasterAdmin 
    ? 'master_admin' 
    : (isAdmin ? 'admin' : (isClubAdmin ? 'club_admin' : (userProfile?.role || 'club_coach')));

  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      setErrorMsg('Bitte gib einen Feedback-Text ein.');
      return;
    }

    if (!user) {
      setErrorMsg('Du musst angemeldet sein, um Feedback zu speichern.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const targetTitle = feedbackScope === 'macro'
        ? `Makroplan (${activeMacroPlan?.halfYear || 1}. Halbjahr)`
        : (feedbackScope === 'meso' ? `Mesoplan (${activeMesoPlan?.name || 'Allgemein'})` : `Mikroplan (6-Wochen-Zahlenstrahl)`);

      const feedbackData: Omit<PeriodizationFeedback, 'id' | 'createdAt'> = {
        authorUid: user.uid,
        authorEmail: user.email || '',
        authorName,
        authorRole: authorRole as any,
        text: feedbackText.trim(),
        category: selectedCategory,
        scope: feedbackScope,
        targetTitle,
        clubId: activeGroup?.clubId
      };

      if (feedbackScope === 'macro') {
        if (!activeMacroPlan?.id) {
          throw new Error('Kein aktiver Makroplan zum Speichern gefunden. Bitte speichere den Makroplan zuerst.');
        }
        await addFeedbackToMacroPlan(activeMacroPlan.id, feedbackData, user);
      } else {
        if (!activeMesoPlan?.id) {
          // If no meso plan exists, attach to macro plan as fallback
          if (activeMacroPlan?.id) {
            await addFeedbackToMacroPlan(activeMacroPlan.id, {
              ...feedbackData,
              scope: feedbackScope
            }, user);
          } else {
            throw new Error('Kein aktiver Meso- oder Makroplan vorhanden.');
          }
        } else {
          await addFeedbackToMesoPlan(activeMesoPlan.id, feedbackData, user);
        }
      }

      setFeedbackText('');
      showToast('Feedback erfolgreich übermittelt!', 'success');
      if (onFeedbackChanged) {
        onFeedbackChanged();
      }
    } catch (err: any) {
      console.error('Error adding periodization feedback:', err);
      const msg = err?.message || 'Fehler beim Speichern des Feedbacks.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFeedback = async (fb: typeof allFeedbacks[number]) => {
    if (!window.confirm('Möchtest du diesen Feedback-Eintrag wirklich löschen?')) {
      return;
    }

    try {
      setDeletingId(fb.id);
      if (fb.parentType === 'macro') {
        await deleteFeedbackFromMacroPlan(fb.parentId, fb.id, user);
      } else {
        await deleteFeedbackFromMesoPlan(fb.parentId, fb.id, user);
      }
      showToast('Feedback gelöscht.');
      if (onFeedbackChanged) {
        onFeedbackChanged();
      }
    } catch (err: any) {
      console.error('Error deleting feedback:', err);
      showToast('Fehler beim Löschen des Feedbacks.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Periodisierungs-Feedback & Trainer-Austausch
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">
                  {allFeedbacks.length} {allFeedbacks.length === 1 ? 'Eintrag' : 'Einträge'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {activeGroup?.name ? `Trainingsgruppe: ${activeGroup.name}` : 'Vereinsweites Feedback zur Periodisierung'}
                {isClubAdmin && <span className="ml-2 text-cyan-400 font-bold">• Club Admin Ansicht</span>}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Create Feedback Form (Available to Club Admins and Coaches) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Neues Feedback verfassen</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Als <strong className="text-slate-200">{authorName}</strong> ({isClubAdmin ? 'Club Admin' : 'Trainer'})
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs font-bold text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateFeedback} className="space-y-3.5">
              
              {/* Scope & Category Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Scope */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 block">
                    Planungsebene (Bezug)
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFeedbackScope('macro')}
                      className={cn(
                        "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5",
                        feedbackScope === 'macro' ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Makro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackScope('meso')}
                      className={cn(
                        "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5",
                        feedbackScope === 'meso' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Meso</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackScope('micro')}
                      className={cn(
                        "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5",
                        feedbackScope === 'micro' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Mikro</span>
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 block">
                    Kategorie
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                  >
                    {FEEDBACK_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-1.5">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Gib hier konstruktives Feedback, Hinweise zur Belastung, didaktische Empfehlungen oder Rückfragen ein..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition custom-scrollbar"
                />
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !feedbackText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition shadow-md shadow-purple-950 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Feedback speichern</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* List of Feedbacks */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Bestehende Rückmeldungen & Anmerkungen</span>
              <span className="text-[11px] font-normal text-slate-500">
                {allFeedbacks.length} Einträge
              </span>
            </h3>

            {allFeedbacks.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">Noch keine Rückmeldungen vorhanden.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Club Admins und Trainer können hier methodische Hinweise und Abstimmungen zur Periodisierung hinterlegen.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allFeedbacks.map(fb => {
                  const isAuthor = fb.authorUid === user?.uid;
                  const canDelete = isAuthor || isClubAdmin || isAdmin || isMasterAdmin;
                  const formattedDate = new Date(fb.createdAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const catConfig = FEEDBACK_CATEGORIES.find(c => c.id === fb.category) || FEEDBACK_CATEGORIES[3];

                  return (
                    <div
                      key={fb.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2.5 shadow-sm"
                    >
                      {/* Top Row: Author, Role, Date, Badges & Delete */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-200">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">
                                {fb.authorName}
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.2 rounded border",
                                fb.authorRole === 'club_admin' 
                                  ? "bg-cyan-950 text-cyan-300 border-cyan-800" 
                                  : (fb.authorRole === 'master_admin' || fb.authorRole === 'admin' 
                                      ? "bg-rose-950 text-rose-300 border-rose-800"
                                      : "bg-slate-800 text-slate-300 border-slate-700")
                              )}>
                                {fb.authorRole === 'club_admin' ? 'Club Admin' : (fb.authorRole === 'master_admin' ? 'Master Admin' : 'Trainer')}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Scope Badge */}
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            fb.scope === 'macro' 
                              ? "bg-purple-950 text-purple-300 border-purple-800" 
                              : (fb.scope === 'meso' ? "bg-indigo-950 text-indigo-300 border-indigo-800" : "bg-emerald-950 text-emerald-300 border-emerald-800")
                          )}>
                            {fb.scope === 'macro' ? 'Makroplan' : (fb.scope === 'meso' ? 'Mesoplan' : 'Mikroplan')}
                          </span>

                          {/* Category Badge */}
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", catConfig.color)}>
                            {catConfig.label}
                          </span>

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFeedback(fb)}
                              disabled={deletingId === fb.id}
                              title="Feedback löschen"
                              className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition disabled:opacity-40"
                            >
                              {deletingId === fb.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Target context note if present */}
                      {fb.targetTitle && (
                        <div className="text-[11px] font-semibold text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                          🎯 {fb.targetTitle}
                        </div>
                      )}

                      {/* Feedback Text Content */}
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap pl-1">
                        {fb.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
