import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Shield, Lock, User as UserIcon, AlertCircle, Mail, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import logoImg from '../assets/Logo.png';

interface LoginProps {
  onLoginSuccess: (userProfile: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDbEmpty, setIsDbEmpty] = useState(false);
  const [customLoginText, setCustomLoginText] = useState('Willkommen bei der NextLevel Goalkeeping Academy. Bitte melde dich an.');

  // Password reset state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check if users collection is empty to allow first admin registration (if rules allow)
    const checkDbEmpty = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        if (querySnapshot.empty) {
          setIsDbEmpty(true);
        }
      } catch (err) {
        // Unauthenticated access restricted by security rules; continue standard login
      }
    };

    // Load custom login text from config/login (if rules allow)
    const loadCustomText = async () => {
      try {
        const docRef = doc(db, 'config', 'login');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCustomLoginText(docSnap.data().text || 'Willkommen bei der NextLevel Goalkeeping Academy. Bitte melde dich an.');
        }
      } catch (err) {
        // Unauthenticated access restricted by security rules
      }
    };

    checkDbEmpty();
    loadCustomText();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Bitte Benutzername und Passwort eingeben.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const input = username.trim().toLowerCase();
      let email = input;
      let fallbackEmail = '';

      if (input.includes('@')) {
        email = input;
        fallbackEmail = `${input.split('@')[0]}@keepercoaching.local`;
      } else {
        email = `${input}@keepercoaching.local`;
      }

      if (isDbEmpty) {
        // Automatically register first user as Admin if database is completely empty
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUserProfile = {
          uid: userCredential.user.uid,
          username: input.includes('@') ? input.split('@')[0] : input,
          role: 'admin',
          name: username.charAt(0).toUpperCase() + username.slice(1),
          club: 'Eigener Verein',
          position: 'Torwart-Trainer (Admin)',
          location: '',
          school: '',
          otherInfo: 'Initialer Admin-Account',
          points: 0,
          pointsByCategory: {},
          weightHistory: [],
          heightHistory: [],
          email: email
        };

        // User is now authenticated (request.auth != null), so writing profile succeeds
        await setDoc(doc(db, 'users', userCredential.user.uid), newUserProfile);
        setIsDbEmpty(false);
        setLoading(false);
        return;
      }

      // Standard login - authenticates first before any Firestore user data is queried
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (firstErr: any) {
        if (fallbackEmail && fallbackEmail !== email && (
          firstErr.code === 'auth/user-not-found' || 
          firstErr.code === 'auth/invalid-credential' || 
          firstErr.code === 'auth/invalid-email'
        )) {
          userCredential = await signInWithEmailAndPassword(auth, fallbackEmail, password);
        } else {
          throw firstErr;
        }
      }

      // Firebase Auth verified the credentials.
      // The onAuthStateChanged listener in App.tsx will load the profile safely.
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Ungültiger Benutzername oder Passwort.');
      } else if (err.code === 'auth/weak-password') {
        setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      } else {
        setError(`Fehler bei der Anmeldung: ${err.message || 'Unbekannter Fehler'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    if (username.trim().includes('@')) {
      setResetEmail(username.trim());
    }
    setError('');
    setResetMessage(null);
    setShowForgotPassword(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = resetEmail.trim().toLowerCase();
    if (!trimmed) {
      setResetMessage({ type: 'error', text: 'Bitte gib deine E-Mail-Adresse ein.' });
      return;
    }

    if (!trimmed.includes('@')) {
      setResetMessage({
        type: 'error',
        text: 'Bitte gib eine vollständige E-Mail-Adresse ein (z. B. keeper@beispiel.de). Wenn du bisher nur einen Benutzernamen hattest, wende dich bitte an deinen Coach.'
      });
      return;
    }

    if (trimmed.endsWith('@keepercoaching.local')) {
      setResetMessage({
        type: 'error',
        text: 'Für diesen Account ist noch keine private E-Mail-Adresse hinterlegt. Bitte wende dich an deinen Coach, um dein Passwort zurückzusetzen.'
      });
      return;
    }

    setResetLoading(true);
    setResetMessage(null);

    try {
      await sendPasswordResetEmail(auth, trimmed);
      setResetMessage({
        type: 'success',
        text: `Ein Link zum Zurücksetzen des Passworts wurde an "${trimmed}" gesendet. Bitte prüfe deinen Posteingang (und den Spam-Ordner).`
      });
      setResetEmail('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setResetMessage({
          type: 'error',
          text: 'Kein Konto mit dieser E-Mail-Adresse gefunden. Bitte prüfe die Schreibweise oder wende dich an deinen Coach.'
        });
      } else if (err.code === 'auth/invalid-email') {
        setResetMessage({
          type: 'error',
          text: 'Ungültiges E-Mail-Format.'
        });
      } else if (err.code === 'auth/too-many-requests') {
        setResetMessage({
          type: 'error',
          text: 'Zu viele Anfragen. Bitte warte ein paar Minuten und versuche es erneut.'
        });
      } else {
        setResetMessage({
          type: 'error',
          text: `Fehler beim Zurücksetzen: ${err.message || 'Unbekannter Fehler'}`
        });
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative top gradient bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-neon via-brand-neon-hover to-brand-neon"></div>
        
        <div className="flex flex-col items-center mb-8">
          <img 
            src={logoImg} 
            alt="NextLevel Goalkeeping Academy" 
            className="w-24 h-24 object-contain mb-3 drop-shadow-[0_0_20px_rgba(192,255,0,0.25)]" 
          />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white font-display text-center">
            NextLevel
          </h1>
          <p className="text-xs text-brand-neon font-mono uppercase tracking-widest font-bold">
            Goalkeeping Academy
          </p>
        </div>

        {showForgotPassword ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetMessage(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zur Anmeldung
              </button>
            </div>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center mb-3">
                <KeyRound className="w-6 h-6 text-brand-neon" />
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white font-display">
                Passwort zurücksetzen
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed font-sans">
                Gib deine hinterlegte E-Mail-Adresse ein. Wir senden dir einen Link, mit dem du ein neues Passwort festlegen kannst.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">
                  E-Mail-Adresse
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-600">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="z.B. deinnachname@gmail.com"
                    disabled={resetLoading}
                    className="w-full pl-10 pr-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon transition-all font-sans text-sm"
                  />
                </div>
              </div>

              {resetMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    resetMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {resetMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{resetMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 bg-brand-neon hover:bg-brand-neon-hover disabled:bg-zinc-800 disabled:text-zinc-600 text-brand-bg font-extrabold rounded-xl tracking-widest uppercase text-xs transition-all shadow-[0_0_15px_rgba(192,255,0,0.15)] hover:shadow-[0_0_25px_rgba(192,255,0,0.3)] cursor-pointer font-sans"
              >
                {resetLoading ? 'Wird gesendet...' : 'Reset-Link senden'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {isDbEmpty && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-3 text-sm text-amber-200">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold">Datenbank ist leer</p>
                  <p className="text-xs text-amber-300/80 mt-1">
                    Melde dich mit einem beliebigen Benutzernamen und Passwort an, um das erste **Admin-Konto** zu erstellen.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">
                  Benutzername oder E-Mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-600">
                    <UserIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="z.B. trainer1 oder keeper1"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon transition-all font-sans text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                    Passwort
                  </label>
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-[11px] text-zinc-400 hover:text-brand-neon transition-colors font-mono cursor-pointer underline-offset-4 hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-600">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon transition-all font-sans text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-neon hover:bg-brand-neon-hover disabled:bg-zinc-800 disabled:text-zinc-600 text-brand-bg font-extrabold rounded-xl tracking-widest uppercase text-xs transition-all shadow-[0_0_15px_rgba(192,255,0,0.15)] hover:shadow-[0_0_25px_rgba(192,255,0,0.3)] cursor-pointer font-sans"
              >
                {loading ? 'Anmeldung...' : 'Anmelden'}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-brand-border/60 text-center">
          <div className="p-4 bg-brand-bg/60 border border-brand-border/40 rounded-xl">
            <p className="text-xs text-zinc-400 leading-relaxed font-sans italic">
              "{customLoginText}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
