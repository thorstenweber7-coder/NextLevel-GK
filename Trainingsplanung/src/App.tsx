import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initAndSeedFirestore, subscribeUserStructures, subscribeExercises } from './firebase/firestoreService';
import { AuthScreen } from './components/AuthScreen';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { AccessBlockedScreen } from './components/AccessBlockedScreen';
import { PlannerView } from './components/PlannerView';
import { UserProfileModal } from './components/UserProfileModal';
import { usePlannerSession } from './hooks/usePlannerSession';
import { useAppRouter, type ActiveTab } from './hooks/useAppRouter';
import { type Exercise, type TrainingStructure, DEFAULT_TRAINING_STRUCTURE } from './types';
import { 
  CalendarDays, 
  Layers, 
  PenTool, 
  BookOpen, 
  ShieldCheck, 
  LogOut, 
  Clock, 
  Crown,
  WifiOff,
  Building2,
  User
} from 'lucide-react';
import { cn } from './utils/cn';
import { ErrorBoundary } from './components/ErrorBoundary';
import { migrateLocalStorageToIndexedDB } from './db/database';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Lazy load non-default views for optimal initial bundle size and instant start times
const ExerciseEditor = React.lazy(() => 
  import('./components/ExerciseEditor').then(m => ({ default: m.ExerciseEditor }))
);
const ExerciseCatalogView = React.lazy(() => 
  import('./components/ExerciseCatalogView').then(m => ({ default: m.ExerciseCatalogView }))
);
const OrgaView = React.lazy(() => 
  import('./components/OrgaView').then(m => ({ default: m.OrgaView }))
);
const AdminPanel = React.lazy(() => 
  import('./components/AdminPanel').then(m => ({ default: m.AdminPanel }))
);
const ClubAdminPanel = React.lazy(() => 
  import('./components/ClubAdminPanel').then(m => ({ default: m.ClubAdminPanel }))
);

const ViewSuspenseFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3">
    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider animate-pulse">
      Lade Ansicht...
    </span>
  </div>
);

const MainAppContent: React.FC = () => {
  const { 
    user, 
    userProfile, 
    loading, 
    isAdmin, 
    isMasterAdmin,
    isClubAdmin,
    isClubCoach,
    clubName,
    currentClub,
    isEmailVerified, 
    isTrialActive, 
    isSubscriptionActive, 
    trialDaysRemaining, 
    isAccessGranted,
    logout 
  } = useAuth();

  // Online/Offline status detection for pitch readiness (PWA)
  const [isOnline, setIsOnline] = useState<boolean>(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // URL Hash-based routing & browser history
  const {
    activeTab,
    orgaSubTab,
    setActiveTab,
    setOrgaSubTab
  } = useAppRouter();

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editorOriginTab, setEditorOriginTab] = useState<ActiveTab>('planner');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Run automatic, zero-data-loss migration from localStorage to Dexie IndexedDB
  useEffect(() => {
    migrateLocalStorageToIndexedDB().catch(err => {
      console.warn('IndexedDB automatic migration note:', err);
    });
  }, []);

  // Global desktop keyboard shortcuts (Cmd/Ctrl+S, Cmd/Ctrl+P, Cmd/Ctrl+K, Escape)
  useKeyboardShortcuts({
    onSave: () => {
      // Shortcut triggers active view save action or feedback
    },
    onPrint: () => {
      window.print();
    },
    onSearch: () => {
      setActiveTab('catalog');
    },
    onEscape: () => {
      setIsProfileModalOpen(false);
      setEditingExercise(null);
    }
  });

  // Always reset scroll position to the very top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [activeTab]);

  // User full name derivation
  const userFullName = useMemo(() => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName.trim()} ${userProfile.lastName.trim()}`;
    }
    if (userProfile?.firstName) return userProfile.firstName.trim();
    if (userProfile?.displayName) return userProfile.displayName.trim();
    if (user?.displayName) return user.displayName.trim();
    return user?.email?.split('@')[0] || 'Trainer';
  }, [userProfile?.firstName, userProfile?.lastName, userProfile?.displayName, user?.displayName, user?.email]);

  const needsProfileCompletion = Boolean(
    user && 
    userProfile && 
    (!userProfile.firstName?.trim() || !userProfile.lastName?.trim())
  );

  // Subscribe to Training Structures to know the active favorite structure
  const [structures, setStructures] = useState<TrainingStructure[]>([DEFAULT_TRAINING_STRUCTURE]);

  useEffect(() => {
    const unsub = subscribeUserStructures(user, (data) => {
      setStructures(data);
    });
    return () => unsub();
  }, [user]);

  const activeStructure = useMemo(() => {
    return structures.find(s => s.isFavorite) || structures[0] || DEFAULT_TRAINING_STRUCTURE;
  }, [structures]);

  // Global Plan state for phase assignments and expanded folders
  const {
    phaseExercises,
    setPhaseExercises,
    openPhases,
    setOpenPhases,
    addExerciseToPhase
  } = usePlannerSession({
    initialStructure: activeStructure,
    storageKey: 'nextlevel_planner_phase_exercises'
  });

  // Real-time listener for pending club exercise reviews (for Club-Admin notification badge)
  const [pendingClubCount, setPendingClubCount] = useState<number>(0);

  useEffect(() => {
    if (!isClubAdmin || !currentClub?.id) {
      setPendingClubCount(0);
      return;
    }
    const unsub = subscribeExercises(
      user,
      isMasterAdmin,
      (data) => {
        const pending = data.filter(e => e.clubId === currentClub.id && !e.isClubPublished && !e.isPublished && !e.isArchived);
        setPendingClubCount(pending.length);
      },
      console.error,
      true,
      currentClub.id
    );
    return () => unsub();
  }, [isClubAdmin, currentClub?.id, user, isMasterAdmin]);

  // Initialize Firestore collections & default exercises on mount
  useEffect(() => {
    initAndSeedFirestore().catch(console.error);
  }, []);

  // 1. Auth Loading Spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="h-20 w-auto flex items-center justify-center mb-2 animate-pulse">
          <img src="/Logo.png" alt="NextLevel Logo" className="h-full w-auto object-contain" />
        </div>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Lade NextLevel Coach PRO...</p>
      </div>
    );
  }

  // 2. Not logged in -> Show Auth Screen (Login / Register)
  if (!user) {
    return <AuthScreen />;
  }

  // 3. Logged in, but email NOT verified -> Show Verification Screen
  if (!isEmailVerified) {
    return <EmailVerificationScreen />;
  }

  // 4. Logged in & verified, but access NOT granted (Trial expired / Blocked) -> Show Lock Screen
  if (!isAccessGranted) {
    return <AccessBlockedScreen />;
  }

  // 5. Full Access Granted -> Render Dashboard
  const handleOpenEditorForNew = () => {
    setEditorOriginTab(activeTab);
    setEditingExercise(null);
    setActiveTab('editor');
  };

  const handleOpenEditorForEdit = (exercise: Exercise) => {
    setEditorOriginTab(activeTab);
    setEditingExercise(exercise);
    setActiveTab('editor');
  };

  const handleExerciseSaved = (savedExercise?: Exercise) => {
    if (editorOriginTab === 'planner' && savedExercise && savedExercise.id) {
      const normalize = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const catNorm = normalize(savedExercise.category);
      const phases = activeStructure.phases || [];

      // 1. Direct categoryKey / name / id match
      let targetPhase = phases.find(p => 
        (p.categoryKey && normalize(p.categoryKey) === catNorm) ||
        normalize(p.name) === catNorm ||
        normalize(p.id) === catNorm
      );

      // 2. Partial name match
      if (!targetPhase) {
        targetPhase = phases.find(p => 
          normalize(p.name).includes(catNorm) || (p.categoryKey && catNorm.includes(normalize(p.categoryKey)))
        );
      }

      // 3. Fallback: WarmUp phase (or first phase if no WarmUp phase exists)
      if (!targetPhase) {
        targetPhase = phases.find(p => 
          p.categoryKey === 'WarmUp' || normalize(p.name).includes('warm')
        ) || phases[0];
      }

      if (targetPhase) {
        addExerciseToPhase(savedExercise.id!, targetPhase.id);
        setOpenPhases({ [targetPhase.id]: true });
      }
    }

    const returnTab = editorOriginTab || 'planner';
    setEditingExercise(null);
    setActiveTab(returnTab);
  };

  const handleAddToPlan = (exercise: Exercise, targetPhaseId?: string) => {
    if (!exercise.id) return;
    
    let phaseId = targetPhaseId;
    if (!phaseId) {
      const normalize = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const catNorm = normalize(exercise.category);
      const phases = activeStructure.phases || [];

      // 1. Direct categoryKey / name / id match
      let targetPhase = phases.find(p => 
        (p.categoryKey && normalize(p.categoryKey) === catNorm) ||
        normalize(p.name) === catNorm ||
        normalize(p.id) === catNorm
      );

      // 2. Partial match
      if (!targetPhase) {
        targetPhase = phases.find(p => 
          normalize(p.name).includes(catNorm) || (p.categoryKey && catNorm.includes(normalize(p.categoryKey)))
        );
      }

      // 3. Fallback: WarmUp phase or first phase
      if (!targetPhase) {
        targetPhase = phases.find(p => 
          p.categoryKey === 'WarmUp' || normalize(p.name).includes('warm')
        ) || phases[0];
      }
      phaseId = targetPhase?.id;
    }

    if (phaseId) {
      addExerciseToPhase(exercise.id!, phaseId);
      setOpenPhases({ [phaseId]: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('planner')} 
            className="flex items-center gap-2.5 cursor-pointer select-none group flex-shrink-0"
          >
            <div className="h-10 sm:h-12 w-auto flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <img
                src="/Logo.png"
                alt="NextLevel Goalkeeping Academy Logo"
                className="h-full w-auto object-contain drop-shadow-[0_4px_12px_rgba(34,197,94,0.25)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-base tracking-tight text-white group-hover:text-emerald-400 transition whitespace-nowrap">
                  NextLevel Goalkeeping
                </span>
                <span className="text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm hidden sm:inline-block">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide hidden xl:block">
                Professionelle Torwart-Trainingsplanung
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Orga is left of Trainingsplaner) */}
          <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/90 text-xs flex-shrink-1">
            <button
              type="button"
              onClick={() => { setEditingExercise(null); setOrgaSubTab('periodization'); }}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'orga'
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <Layers className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Orga</span>
            </button>

            <button
              type="button"
              onClick={() => { setEditingExercise(null); setActiveTab('planner'); }}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'planner'
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden md:inline">Trainingsplaner</span>
              <span className="md:hidden">Planer</span>
            </button>

            <button
              type="button"
              onClick={handleOpenEditorForNew}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'editor'
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <PenTool className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden md:inline">
                {editingExercise ? 'Übung bearbeiten' : 'Übungseditor'}
              </span>
              <span className="md:hidden">Editor</span>
            </button>

            <button
              type="button"
              onClick={() => { setEditingExercise(null); setActiveTab('catalog'); }}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'catalog'
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden md:inline">Übungskatalog</span>
              <span className="md:hidden">Katalog</span>
            </button>

            {/* Club Admin Panel (Chef-Torwarttrainer / Master Admin) */}
            {(isClubAdmin || isMasterAdmin) && (
              <button
                type="button"
                onClick={() => { setEditingExercise(null); setActiveTab('club_admin'); }}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap relative",
                  activeTab === 'club_admin'
                    ? "bg-sky-600 text-white shadow-md shadow-sky-950/60"
                    : "text-sky-400 hover:text-sky-300 hover:bg-slate-900"
                )}
              >
                <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-sky-400" />
                <span className="hidden lg:inline">{currentClub?.name || clubName || 'Vereins-Verwaltung'}</span>
                <span className="lg:hidden">Verein</span>
                
                {/* Real-Time Red Counter Badge for Pending Exercises */}
                {pendingClubCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm animate-pulse">
                    {pendingClubCount}
                  </span>
                )}
              </button>
            )}

            {/* Global Master Admin Tab */}
            {(isMasterAdmin || isAdmin) && (
              <button
                type="button"
                onClick={() => { setEditingExercise(null); setActiveTab('admin'); }}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap",
                  activeTab === 'admin'
                    ? "bg-purple-600 text-white shadow-md shadow-purple-950/60"
                    : "text-purple-400 hover:text-purple-300 hover:bg-slate-900"
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden lg:inline">Master Admin</span>
                <span className="lg:hidden">Admin</span>
              </button>
            )}
          </nav>

          {/* User Status / Profile Button / Logout */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              title="Mein Trainer-Profil öffnen (Vor- & Nachname bearbeiten)"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-sm transition flex-shrink-0 text-left border group cursor-pointer",
                isMasterAdmin 
                  ? "bg-purple-950/70 border-purple-800/80 hover:border-purple-600 hover:bg-purple-950" 
                  : isClubAdmin 
                  ? "bg-sky-950/70 border-sky-800/80 hover:border-sky-600 hover:bg-sky-950"
                  : isClubCoach 
                  ? "bg-sky-950/40 border-sky-800/50 hover:border-sky-600 hover:bg-sky-950/70"
                  : isSubscriptionActive 
                  ? "bg-emerald-950/70 border-emerald-800/80 hover:border-emerald-600 hover:bg-emerald-950"
                  : isTrialActive 
                  ? "bg-amber-950/70 border-amber-800/80 hover:border-amber-600 hover:bg-amber-950"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700"
              )}
            >
              {isMasterAdmin ? (
                <Crown className="w-4 h-4 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              ) : isClubAdmin || isClubCoach ? (
                <Building2 className="w-4 h-4 text-sky-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              ) : isSubscriptionActive ? (
                <Crown className="w-4 h-4 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              ) : isTrialActive ? (
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              ) : (
                <User className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              )}
              <div className="text-left flex flex-col justify-center">
                <span className="text-xs font-black text-white leading-tight flex items-center gap-1">
                  <span className="max-w-[120px] sm:max-w-[160px] truncate">{userFullName}</span>
                </span>
                <span className="text-[10px] text-slate-400 leading-tight max-w-[120px] sm:max-w-[160px] truncate" title={user.email || ''}>
                  {isMasterAdmin ? 'Master Admin' : isClubAdmin ? (clubName || 'Club Admin') : isClubCoach ? (clubName || 'Vereinstrainer') : isSubscriptionActive ? 'Pro Lizenz' : `${trialDaysRemaining} Tage Test`}
                </span>
              </div>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={logout}
              title={`Abmelden (${user.email || ''})`}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition border border-slate-800/80 flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-amber-950/80 border-b border-amber-800 text-amber-200 py-1.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>Offline-Modus aktiv (PWA-Speicher) — Du kannst auf dem Platz ohne Internetverbindung weiterarbeiten.</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Suspense fallback={<ViewSuspenseFallback />}>
          {activeTab === 'orga' && (
            <OrgaView
              initialSubTab={orgaSubTab}
              onNavigateToPlanner={() => setActiveTab('planner')}
            />
          )}

          {activeTab === 'planner' && (
            <PlannerView
              onOpenEditorForNew={handleOpenEditorForNew}
              onOpenEditorForEdit={handleOpenEditorForEdit}
              onNavigateToOrga={(subTab) => {
                if (subTab) {
                  setOrgaSubTab(subTab);
                } else {
                  setActiveTab('orga');
                }
              }}
              phaseExercises={phaseExercises}
              setPhaseExercises={setPhaseExercises}
              openPhases={openPhases}
              setOpenPhases={setOpenPhases}
            />
          )}

          {activeTab === 'editor' && (
            <ExerciseEditor
              initialExercise={editingExercise}
              onSaved={handleExerciseSaved}
              onCancel={() => setActiveTab(editorOriginTab || 'planner')}
            />
          )}

          {activeTab === 'catalog' && (
            <ExerciseCatalogView
              onNewExercise={handleOpenEditorForNew}
              onEditExercise={handleOpenEditorForEdit}
              activeStructure={activeStructure}
              onAddToPlan={handleAddToPlan}
            />
          )}

          {activeTab === 'club_admin' && (isClubAdmin || isMasterAdmin) && (
            <ClubAdminPanel
              onEditExercise={handleOpenEditorForEdit}
            />
          )}

          {activeTab === 'admin' && (isMasterAdmin || isAdmin) && (
            <AdminPanel 
              onEditExercise={handleOpenEditorForEdit}
            />
          )}
        </Suspense>
      </main>

      {/* Modern Sports Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/Logo.png" alt="Logo" className="h-7 w-auto object-contain inline" />
            <span className="text-slate-400 font-semibold">NextLevel Goalkeeping Academy — Coach PRO</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Angemeldet als: {user.email}</span>
            <span>•</span>
            <span>{isAdmin ? '🛡️ Administrator' : isSubscriptionActive ? '⭐ Pro-Lizenz' : `⏳ Testphase (${trialDaysRemaining} Tage)`}</span>
          </div>
        </div>
      </footer>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen || needsProfileCompletion}
        onClose={() => setIsProfileModalOpen(false)}
        forceComplete={needsProfileCompletion}
      />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
