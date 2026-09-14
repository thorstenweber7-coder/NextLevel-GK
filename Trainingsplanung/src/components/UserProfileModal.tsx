import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Crown, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Save,
  Sparkles
} from 'lucide-react';
import { cn } from '../utils/cn';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceComplete?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  forceComplete = false
}) => {
  const { 
    user, 
    userProfile, 
    updateUserProfile, 
    isMasterAdmin, 
    isClubAdmin, 
    isClubCoach,
    clubName,
    trialDaysRemaining,
    isSubscriptionActive,
    isTrialActive
  } = useAuth();

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [clubNameInput, setClubNameInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setClubNameInput(userProfile.clubName || '');
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const fName = firstName.trim();
    const lName = lastName.trim();

    if (!fName || !lName) {
      setFeedback({
        type: 'error',
        message: 'Bitte gib sowohl deinen Vornamen als auch deinen Nachnamen ein.'
      });
      return;
    }

    try {
      setLoading(true);
      await updateUserProfile({ firstName: fName, lastName: lName, clubName: clubNameInput.trim() });
      setFeedback({
        type: 'success',
        message: 'Profil erfolgreich gespeichert! Dein Name & Verein werden ab sofort im Trainingsplaner und bei Übungen übernommen.'
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      setFeedback({
        type: 'error',
        message: 'Fehler beim Speichern des Profils. Bitte versuche es erneut.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = () => {
    if (isMasterAdmin) return 'Master Administrator';
    if (isClubAdmin) return `Chef-Torwarttrainer (${clubName || 'Verein'})`;
    if (isClubCoach) return `Torwarttrainer (${clubName || 'Verein'})`;
    if (isSubscriptionActive) return 'PRO Lizenz (Aktiv)';
    if (isTrialActive) return `7-Tage-Testphase (${trialDaysRemaining} Tage verbleibend)`;
    return 'Trainer';
  };

  const initials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase() || 'TR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative">
        {/* Top Glow Header Accent */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/10 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-base shadow-inner">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>Trainer-Profil</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Trainerdaten
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Verwalte deinen Vor- und Nachnamen für Trainingspläne & Exporte.
              </p>
            </div>
          </div>

          {!forceComplete && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Force Complete Notice */}
        {forceComplete && (
          <div className="bg-amber-950/60 border-b border-amber-500/40 px-5 sm:px-6 py-3 flex items-start gap-2.5 text-xs text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-300 block">Profil vervollständigen:</strong>
              <span>Bitte gib deinen Vor- und Nachnamen ein. Dieser wird fest in all deinen erstellten Trainingsplänen als Trainer hinterlegt.</span>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-4 sm:px-6 pb-0">
            <div className={cn(
              "p-3 rounded-xl border flex items-start gap-2.5 text-xs",
              feedback.type === 'success'
                ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-200"
                : "bg-rose-950/60 border-rose-800 text-rose-200"
            )}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Vorname */}
            <div>
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vorname *</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Thorsten"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
              />
            </div>

            {/* Nachname */}
            <div>
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nachname *</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Weber"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Verein / Club Name */}
          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Verein / Club (Optional)</span>
            </label>
            <input
              type="text"
              value={clubNameInput}
              onChange={e => setClubNameInput(e.target.value)}
              placeholder="z. B. FC Bayern, Borussia Dortmund oder leer lassen"
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Wird bei deinen erstellten Übungen und Profilübersichten als Verein angezeigt.
            </p>
          </div>

          {/* E-Mail (Read Only) */}
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>E-Mail-Adresse (Login)</span>
            </label>
            <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-mono flex items-center justify-between">
              <span className="truncate">{user?.email || '–'}</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 font-sans font-bold flex-shrink-0">
                Verifiziert
              </span>
            </div>
          </div>

          {/* Account Status / Role Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                Status & Lizenz
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                {isMasterAdmin ? (
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                ) : isClubAdmin || isClubCoach ? (
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{getRoleLabel()}</span>
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              💡 Dein Vor- und Nachname wird im Trainingsplaner automatisch als fester Trainername eingetragen und ist dort schreibgeschützt.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            {!forceComplete && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
              >
                Abbrechen
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Profil speichern</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
