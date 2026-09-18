import React, { useState } from 'react';
import { useAuth, MAIN_ADMIN_EMAIL } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  Clock,
  KeyRound,
  User
} from 'lucide-react';
import { cn } from '../utils/cn';
import logoImg from '../assets/Logo.png';

type AuthMode = 'login' | 'register' | 'forgot_password';

export const AuthScreen: React.FC = () => {
  const { login, register, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isPreFilledAdmin = email.toLowerCase().trim() === MAIN_ADMIN_EMAIL.toLowerCase();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    if (mode === 'forgot_password') {
      try {
        setLoading(true);
        await resetPassword(email);
        setSuccessMsg(`Ein Link zum Zurücksetzen deines Passworts wurde an ${email} gesendet.`);
      } catch (err: any) {
        console.error('Password reset error:', err);
        if (err.code === 'auth/user-not-found') {
          setErrorMsg('Kein Account mit dieser E-Mail-Adresse gefunden.');
        } else {
          setErrorMsg('Fehler beim Senden des Links. Bitte überprüfe die E-Mail-Adresse.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Bitte gib dein Passwort ein.');
      return;
    }

    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg('Bitte gib deinen Vornamen und Nachnamen ein (Pflichtangabe für Trainerprofile).');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Das Passwort muss mindestens 6 Zeichen lang sein.');
        return;
      }
      if (password !== passwordConfirm) {
        setErrorMsg('Die eingegebenen Passwörter stimmen nicht überein.');
        return;
      }

      try {
        setLoading(true);
        await register(email, password, { firstName: firstName.trim(), lastName: lastName.trim() });
        setSuccessMsg('Account erfolgreich erstellt! Bitte überprüfe dein E-Mail-Postfach zur Verifizierung.');
      } catch (err: any) {
        console.error('Registration error:', err);
        if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
          setErrorMsg('Firebase Authentication ist in deiner Firebase-Konsole noch nicht aktiviert. Bitte aktiviere "E-Mail/Passwort" unter Authentication -> Sign-in method.');
        } else if (err.code === 'auth/email-already-in-use') {
          setErrorMsg('Diese E-Mail-Adresse ist bereits registriert. Bitte klicke oben auf "Anmelden".');
        } else if (err.code === 'auth/weak-password') {
          setErrorMsg('Das Passwort ist zu schwach. Bitte wähle mindestens 6 Zeichen.');
        } else if (err.code === 'auth/invalid-email') {
          setErrorMsg('Ungültiges E-Mail-Format.');
        } else {
          setErrorMsg(`Registrierungsfehler: ${err.message || 'Bitte versuche es erneut.'}`);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login mode
    try {
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Firebase Authentication ist in deiner Firebase-Konsole noch nicht aktiviert. Bitte aktiviere "E-Mail/Passwort" unter Authentication -> Sign-in method.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Ungültige Anmeldedaten. Wenn du noch kein Passwort hast, klicke oben auf "7 Tage testen", um dich einmalig zu registrieren.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Zu viele fehlgeschlagene Versuche. Bitte warte einen Moment.');
      } else {
        setErrorMsg(`Anmeldefehler: ${err.message || 'Bitte überprüfe deine Daten.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      {/* Container Box */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Brand Header with Large Transparent Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-20 sm:h-24 w-auto flex items-center justify-center">
            <img
              src={logoImg}
              alt="NextLevel Logo"
              className="h-full w-auto object-contain drop-shadow-[0_6px_20px_rgba(34,197,94,0.35)]"
            />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                NextLevel Goalkeeping
              </span>
              <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Trainingsplaner & Taktikboard für Torwarttrainer
            </p>
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={cn(
              "py-2.5 rounded-lg transition",
              mode === 'login'
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Anmelden
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={cn(
              "py-2.5 rounded-lg transition flex items-center justify-center gap-1.5",
              mode === 'register'
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>14 Tage testen</span>
          </button>
        </div>

        {/* 14-Days Trial Badge in Register mode */}
        {mode === 'register' && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-emerald-300 block">Kostenlose 14-Tage-Testphase (Testnutzer):</span>
              <span>Sofortiger voller Zugriff auf alle Funktionen der gesamten App (Trainingsplaner, Taktikboard, Periodisierung & Orga) nach E-Mail-Bestätigung.</span>
            </div>
          </div>
        )}

        {/* Admin Bootstrap Info Notice */}
        {isPreFilledAdmin && (
          <div className="bg-purple-950/50 border border-purple-500/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-purple-200">
            <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-300 block">Haupt-Administrator:</span>
              <span>Konto wird automatisch mit Administrator-Rechten und unbegrenzter Lizenz verknüpft.</span>
            </div>
          </div>
        )}

        {/* Alerts / Feedback */}
        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/60 border border-emerald-800 rounded-xl p-3 flex items-start gap-2 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Vorname</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Max"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nachname</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Mustermann"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>E-Mail-Adresse</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="coach@nextlevel.de"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Passwort</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Passwort wiederholen</span>
              </label>
              <input
                type="password"
                required
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <span>Jetzt anmelden</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'register' ? (
              <>
                <span>{isPreFilledAdmin ? 'Admin-Passwort einrichten & Registrieren' : 'Kostenlos registrieren (14 Tage)'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Passwort-Reset-Link anfordern</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        {mode === 'forgot_password' && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition underline"
            >
              Zurück zur Anmeldung
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
