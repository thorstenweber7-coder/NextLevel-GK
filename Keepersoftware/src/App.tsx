import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, updateEmail, verifyBeforeUpdateEmail, updatePassword } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, getLevelForPoints, hasModulePermission } from './types';
import { Mail, Shield, AlertTriangle, LogOut, Check, Sparkles, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

// Component Imports
import Login from './components/Login';
import Navigation from './components/Navigation';
import Leaderboard from './components/Leaderboard';
import Workouts from './components/Workouts';
import VideoAnalysis from './components/VideoAnalysis';
import Competitions from './components/Competitions';
import Contents from './components/Contents';
import IndividualGoals from './components/IndividualGoals';
import CoachingZone from './components/CoachingZone';
import SupportChat from './components/SupportChat';
import BallTransition from './components/BallTransition';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('leaderboard');
  const [highlightedTab, setHighlightedTab] = useState<string>('leaderboard');
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Tab transition states (interactive football flight with spark particle trail)
  const [triggerTabTransition, setTriggerTabTransition] = useState<boolean>(false);
  const [nextTab, setNextTab] = useState<string | null>(null);
  const [transitionId, setTransitionId] = useState<number>(0);

  const handleTabSwitch = (tab: string) => {
    if (tab === activeTab) return;

    // Change tab instantly without any delay
    setActiveTab(tab);
    setHighlightedTab(tab); // Instantly highlight the selected tab button in Navigation

    if (triggerTabTransition) {
      // Increment transition ID to cleanly unmount and remount a fresh BallTransition component if another transition is already in progress
      setTransitionId(prev => prev + 1);
    }
    
    setNextTab(tab);
    setTriggerTabTransition(true);
  };
  
  // Level-Up monitoring states
  const [levelUpModal, setLevelUpModal] = useState<{ oldLevel: string; newLevel: string; points: number } | null>(null);
  const prevPointsRef = useRef<number | null>(null);

  // Force email update state
  const [forceEmailInput, setForceEmailInput] = useState('');
  const [forcePasswordInput, setForcePasswordInput] = useState('');
  const [forcePasswordConfirmInput, setForcePasswordConfirmInput] = useState('');
  const [forceEmailError, setForceEmailError] = useState('');
  const [forceEmailLoading, setForceEmailLoading] = useState(false);

  // Monitor Auth state changes
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Listen to User Profile changes in real-time once Auth is guaranteed
        const profileRef = doc(db, 'users', firebaseUser.uid);
        
        unsubProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (data.archived) {
              signOut(auth);
              setUser(null);
              setUserProfile(null);
              setLoading(false);
              return;
            }
            setUserProfile({ ...data, uid: firebaseUser.uid } as UserProfile);
          } else {
            // Profile doesn't exist yet (e.g. initial seed admin or fallback)
            setUserProfile({
              uid: firebaseUser.uid,
              username: firebaseUser.email?.split('@')[0] || 'admin',
              role: 'admin',
              name: 'Coaching Admin',
              points: 0,
              pointsByCategory: {},
              weightHistory: [],
              heightHistory: []
            } as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Profile Error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubscribe();
    };
  }, []);

  // Level-Up detection and animation triggering
  useEffect(() => {
    if (userProfile) {
      const currentPoints = userProfile.points || 0;
      const currentLvl = getLevelForPoints(currentPoints);
      
      if (prevPointsRef.current !== null) {
        const prevLvl = getLevelForPoints(prevPointsRef.current);
        // Trigger if the new level is higher (larger minPoints threshold)
        if (currentLvl.minPoints > prevLvl.minPoints) {
          try {
            // Trigger confetti!
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 }
            });
            setTimeout(() => {
              confetti({
                particleCount: 100,
                spread: 100,
                origin: { y: 0.5 }
              });
            }, 350);
          } catch (e) {
            console.error('Error with confetti:', e);
          }

          // Show Success Level Up Modal
          setLevelUpModal({
            oldLevel: prevLvl.name,
            newLevel: currentLvl.name,
            points: currentPoints
          });
        }
      }
      prevPointsRef.current = currentPoints;
    } else {
      prevPointsRef.current = null;
    }
  }, [userProfile?.points]);

  const handleUpdatePoints = (newPoints: number, newPointsByCategory: any) => {
    if (userProfile) {
      setUserProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          points: newPoints,
          pointsByCategory: newPointsByCategory,
        };
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleSaveForcedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToSave = forceEmailInput.trim().toLowerCase();
    const passwordToSave = forcePasswordInput.trim();
    const passwordConfirmToSave = forcePasswordConfirmInput.trim();

    if (!emailToSave || !emailToSave.includes('@')) {
      setForceEmailError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    if (!passwordToSave) {
      setForceEmailError('Bitte gib ein neues Passwort ein.');
      return;
    }

    if (passwordToSave.length < 6) {
      setForceEmailError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (passwordToSave !== passwordConfirmToSave) {
      setForceEmailError('Die eingegebenen Passwörter stimmen nicht überein.');
      return;
    }

    setForceEmailError('');
    setForceEmailLoading(true);

    try {
      if (auth.currentUser) {
        // 1. Update the password in Firebase Auth first (crucial since it might fail and we don't want to leave DB out-of-sync)
        try {
          await updatePassword(auth.currentUser, passwordToSave);
        } catch (passErr: any) {
          console.error('Error updating auth password:', passErr);
          if (passErr.code === 'auth/requires-recent-login') {
            throw new Error('Das Ändern des Passworts erfordert eine kürzliche Anmeldung. Bitte melde dich ab und erneut an, um fortzufahren.');
          } else {
            throw new Error(`Fehler beim Aktualisieren des Passworts: ${passErr.message || 'Unbekannter Fehler'}`);
          }
        }

        // 2. Update the Firestore profile document so the user has the new email
        const profileRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(profileRef, {
          email: emailToSave
        });

        // 3. Try to update the email in Firebase Auth (handles both standard and verification-forced configs)
        try {
          await updateEmail(auth.currentUser, emailToSave);
        } catch (authErr: any) {
          console.warn('Standard updateEmail failed, trying verification fallback:', authErr);
          
          if (authErr.code === 'auth/operation-not-allowed' || authErr.message?.includes('verify') || authErr.code?.includes('not-allowed')) {
            // This is the error the user got. We fallback to verifyBeforeUpdateEmail
            await verifyBeforeUpdateEmail(auth.currentUser, emailToSave);
            alert('Deine E-Mail-Adresse wurde im Profil gespeichert! Da dein System eine E-Mail-Verifizierung verlangt, wurde ein Bestätigungs-Link an deine neue E-Mail gesendet. Bitte klicke auf diesen Link, um die Änderung abzuschließen.');
          } else if (authErr.code === 'auth/requires-recent-login') {
            // Don't block the user, just warn them that auth update needs a fresh login
            alert('Deine E-Mail-Adresse wurde im Profil gespeichert. Um die Adresse auch für die System-Passwortzurücksetzung zu synchronisieren, melde dich bitte beim nächsten Mal einmal ab und wieder an.');
          } else {
            // For other errors, let's still alert the user but don't block them entirely
            console.error('Non-blocking auth email sync error:', authErr);
            alert(`Hinweis: Deine E-Mail wurde im Profil gespeichert. (System-Sync Hinweis: ${authErr.message || 'Unbekannter Fehler'})`);
          }
        }

        // 4. Clear state
        setForceEmailInput('');
        setForcePasswordInput('');
        setForcePasswordConfirmInput('');
        alert('Deine E-Mail-Adresse und dein neues Passwort wurden erfolgreich gespeichert!');
      } else {
        setForceEmailError('Kein angemeldeter Benutzer gefunden.');
      }
    } catch (err: any) {
      console.error('Error updating forced email/password:', err);
      if (err.code === 'permission-denied') {
        setForceEmailError('Keine Berechtigung zum Aktualisieren des Profils.');
      } else {
        setForceEmailError(err.message || 'Fehler beim Speichern der Daten.');
      }
    } finally {
      setForceEmailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin"></div>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
            NextLevel Goalkeeping Academy lädt...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return <Login onLoginSuccess={(prof) => setUserProfile(prof)} />;
  }

  // Detect if user has no real email registered (meaning empty or ends with local placeholder)
  const needsEmailInput = !userProfile.email || userProfile.email.endsWith('@keepercoaching.local');

  if (needsEmailInput) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background ambient light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-neon/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900 border border-brand-border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top Neon line decoration */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-neon to-brand-neon-hover"></div>

          <div className="flex flex-col items-center">
            {/* Shield / Mail icon container */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <Mail className="w-8 h-8 text-amber-500" />
            </div>

            <h2 className="text-2xl font-black italic uppercase tracking-tight text-white font-display text-center">
              Erstmaliger Login
            </h2>
            <p className="text-[10px] text-brand-neon font-mono uppercase tracking-widest font-bold mt-1 text-center">
              E-Mail & Passwort einrichten
            </p>

            {/* Explanatory text / reasoning */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl mt-5 text-left space-y-2.5 w-full">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Für dein Konto ist <span className="text-amber-500 font-bold">zwingend eine echte E-Mail-Adresse</span> und ein <span className="text-amber-500 font-bold">eigenes sicheres Passwort</span> erforderlich.
                </p>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed pl-6">
                Dies ermöglicht dir, dich zukünftig mit deiner E-Mail-Adresse anzumelden und dein Passwort bei Bedarf selbstständig über einen Reset-Link zurückzusetzen.
              </p>
            </div>

            {/* Onboarding Form */}
            <form onSubmit={handleSaveForcedEmail} className="w-full mt-6 space-y-4 text-left">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1.5">
                  Deine E-Mail-Adresse
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={forceEmailInput}
                    onChange={(e) => setForceEmailInput(e.target.value)}
                    placeholder="name@beispiel.de"
                    required
                    disabled={forceEmailLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1.5">
                  Eigenes Passwort anlegen
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={forcePasswordInput}
                    onChange={(e) => setForcePasswordInput(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                    required
                    disabled={forceEmailLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1.5">
                  Passwort bestätigen
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={forcePasswordConfirmInput}
                    onChange={(e) => setForcePasswordConfirmInput(e.target.value)}
                    placeholder="Passwort wiederholen"
                    required
                    disabled={forceEmailLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon/30 transition-all"
                  />
                </div>
              </div>

              {forceEmailError && (
                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-2 text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-sans leading-tight">{forceEmailError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={forceEmailLoading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/40 text-slate-950 rounded-xl font-bold font-mono uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                {forceEmailLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-4 h-4 font-black" />
                    <span>Speichern & Fortfahren</span>
                  </>
                )}
              </button>
            </form>

            {/* Logout alternative so users aren't locked in */}
            <button
              onClick={handleLogout}
              className="mt-5 text-[11px] font-mono text-slate-500 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Abmelden und später eintragen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-zinc-100 flex flex-col font-sans antialiased selection:bg-brand-neon selection:text-brand-bg">
      {/* Dynamic Navigation Header */}
      <Navigation
        activeTab={highlightedTab}
        setActiveTab={(tab) => {
          if (tab === 'workouts' && !hasModulePermission(userProfile, 'workouts')) {
            alert('Dieses Modul wurde noch nicht freigeschaltet. Bitte wende dich an deinen Coach.');
            return;
          }
          if (tab === 'goals' && !hasModulePermission(userProfile, 'goals')) {
            alert('Dieses Modul wurde noch nicht freigeschaltet. Bitte wende dich an deinen Coach.');
            return;
          }
          if (isWorkoutActive && tab !== 'workouts') {
            setPendingTab(tab);
          } else {
            handleTabSwitch(tab);
          }
        }}
        userRole={userProfile.role}
        userName={userProfile.name}
        onLogout={() => {
          if (isWorkoutActive) {
            setPendingTab('logout');
          } else {
            handleLogout();
          }
        }}
        currentUserProfile={userProfile}
      />

      {/* Main Content Area */}
      <main className="flex-1 bg-gradient-to-b from-brand-bg to-brand-panel pb-16">
        {activeTab === 'leaderboard' && (
          <Leaderboard userProfile={userProfile} />
        )}

        {activeTab === 'workouts' && (
          <Workouts 
            userProfile={userProfile} 
            onUpdatePoints={handleUpdatePoints} 
            onWorkoutActiveChange={setIsWorkoutActive} 
          />
        )}

        {activeTab === 'video' && (
          <VideoAnalysis userProfile={userProfile} onUpdatePoints={handleUpdatePoints} />
        )}

        {activeTab === 'competitions' && (
          <Competitions userProfile={userProfile} onUpdatePoints={handleUpdatePoints} />
        )}

        {activeTab === 'contents' && (
          <Contents userProfile={userProfile} onUpdatePoints={handleUpdatePoints} />
        )}

        {activeTab === 'goals' && (
          <IndividualGoals userProfile={userProfile} onUpdatePoints={handleUpdatePoints} />
        )}

        {activeTab === 'chat' && userProfile && (
          <SupportChat userProfile={userProfile} />
        )}

        {activeTab === 'admin' && (userProfile.role === 'admin' || userProfile.role === 'kraftsport') && (
          <CoachingZone currentUserProfile={userProfile} />
        )}
      </main>

      {/* Immersive Theme Footer */}
      <footer className="bg-brand-bg border-t border-brand-border px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Datenbank Aktiv</span>
          </div>
        </div>
        <div className="text-[10px] text-zinc-600 font-medium font-mono">
          KEEPERPRO v2.4.0-STABLE | LIVE FIREBASE SYNC
        </div>
      </footer>

      {/* Custom Workout Interruption Confirmation Modal */}
      {pendingTab && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-brand-panel border border-brand-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display">Training abbrechen?</h3>
            <p className="text-sm text-zinc-300">
              Das führt zu einem Abbruch des Trainings, sicher?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingTab(null)}
                className="px-4 py-2 bg-brand-border hover:bg-brand-border-light text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Fortsetzen
              </button>
              <button
                onClick={() => {
                  setIsWorkoutActive(false);
                  if (pendingTab === 'logout') {
                    handleLogout();
                  } else {
                    handleTabSwitch(pendingTab);
                  }
                  setPendingTab(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Modal */}
      {levelUpModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-zinc-900 to-brand-panel border border-yellow-500/30 rounded-2xl max-w-lg w-full p-8 shadow-[0_0_50px_rgba(234,179,8,0.2)] text-center space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Absolute decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-500/10 blur-3xl rounded-full"></div>
            
            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Glow ring */}
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl scale-125 animate-pulse"></div>
                <div className="w-20 h-20 rounded-full border-2 border-yellow-500 bg-brand-panel flex items-center justify-center text-4xl relative z-10 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  🏆
                </div>
              </div>
              
              <div className="mt-6 space-y-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-yellow-500 flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Stufen-Aufstieg!
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                  Neue Stufe freigeschaltet!
                </h2>
              </div>
            </div>

            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Glückwunsch! Du hast durch deinen Einsatz im Training und in der Videoanalyse eine neue Stufe in der Bestenliste erreicht.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-center gap-6 relative">
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold text-zinc-500">Alte Stufe</span>
                <span className="text-sm font-bold text-zinc-400 mt-1 line-through">{levelUpModal.oldLevel}</span>
              </div>
              
              <div className="text-yellow-500 font-bold text-lg">➔</div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold text-yellow-500">Neue Stufe</span>
                <span className="text-lg font-black text-white uppercase tracking-wide mt-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                  {levelUpModal.newLevel}
                </span>
              </div>
            </div>

            <div className="text-xs font-mono text-zinc-500">
              Aktueller Punktestand: <span className="text-brand-neon font-bold">{levelUpModal.points} pts</span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setLevelUpModal(null)}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider rounded-xl text-xs transition-all duration-200 cursor-pointer shadow-[0_4px_15px_rgba(234,179,8,0.3)] hover:scale-[1.02]"
              >
                Weiter geht's!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Ball flight with spark particles on tab switch */}
      <BallTransition
        key={transitionId}
        trigger={triggerTabTransition}
        onMidpoint={() => {
          // Tab is already switched instantly
        }}
        onComplete={() => {
          setTriggerTabTransition(false);
          setNextTab(null);
        }}
      />
    </div>
  );
}
