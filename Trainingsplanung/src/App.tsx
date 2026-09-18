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
  User,
  ChevronDown,
  Check,
  X,
  AlertCircle
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isEditorDirty, setIsEditorDirty] = useState<boolean>(false);
  const [pendingTabTransition, setPendingTabTransition] = useState<{
    tab: ActiveTab;
    orgaSubTab?: any;
    exerciseToEdit?: Exercise | null;
    isNew?: boolean;
  } | null>(null);

  // Run automatic, zero-data-loss migration from localStorage to Dexie IndexedDB
  useEffect(() => {
    migrateLocalStorageToIndexedDB().catch(err => {
      console.warn('IndexedDB automatic migration note:', err);
    });
  }, []);

  // Centralized Tab Navigation Execution
  const executeTabChange = (
    targetTab: ActiveTab, 
    targetOrgaSubTab?: any, 
    targetExercise?: Exercise | null,
    isNew?: boolean
  ) => {
    setIsEditorDirty(false);
    setPendingTabTransition(null);
    setIsMobileNavOpen(false);
    if (targetOrgaSubTab) {
      setOrgaSubTab(targetOrgaSubTab);
    }
    if (targetTab === 'editor') {
      setEditorOriginTab(activeTab === 'editor' ? editorOriginTab : activeTab);
      if (isNew) {
        setEditingExercise(null);
      } else if (targetExercise !== undefined) {
        setEditingExercise(targetExercise);
      }
    } else {
      setEditingExercise(null);
    }
    setActiveTab(targetTab);
  };

  // Guarded Tab Navigation (Prompts if Editor has unsaved changes)
  const handleRequestTabChange = (
    targetTab: ActiveTab, 
    targetOrgaSubTab?: any, 
    targetExercise?: Exercise | null,
    isNew?: boolean
  ) => {
    if (activeTab === 'editor' && isEditorDirty) {
      if (targetTab === 'editor' && !isNew && targetExercise === editingExercise) {
        return;
      }
      setPendingTabTransition({
        tab: targetTab,
        orgaSubTab: targetOrgaSubTab,
        exerciseToEdit: targetExercise,
        isNew
      });
      return;
    }

    executeTabChange(targetTab, targetOrgaSubTab, targetExercise, isNew);
  };

  // Global desktop keyboard shortcuts (Cmd/Ctrl+S, Cmd/Ctrl+P, Cmd/Ctrl+K, Escape)
  useKeyboardShortcuts({
    onSave: () => {
      // Shortcut triggers active view save action or feedback
    },
    onPrint: () => {
      window.print();
    },
    onSearch: () => {
      handleRequestTabChange('catalog');
    },
    onEscape: () => {
      setIsProfileModalOpen(false);
      setPendingTabTransition(null);
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
    handleRequestTabChange('editor', undefined, null, true);
  };

  const handleOpenEditorForEdit = (exercise: Exercise) => {
    handleRequestTabChange('editor', undefined, exercise, false);
  };

  const handleExerciseSaved = (savedExercise?: Exercise) => {
    setIsEditorDirty(false);
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
            onClick={() => handleRequestTabChange('planner')} 
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

          {/* Desktop Navigation Tabs (NUR Desktop / Tablet ab md) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/90 text-xs flex-shrink-1">
            <button
              type="button"
              onClick={() => handleRequestTabChange('orga', 'periodization')}
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
              onClick={() => handleRequestTabChange('planner')}
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
              onClick={() => handleRequestTabChange('catalog')}
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
                onClick={() => handleRequestTabChange('club_admin')}
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
                onClick={() => handleRequestTabChange('admin')}
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

          {/* Mobile Navigation Dropdown (NUR auf mobilen Geräten unter md) */}
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              {activeTab === 'orga' && <Layers className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              {activeTab === 'planner' && <CalendarDays className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              {activeTab === 'editor' && <PenTool className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              {activeTab === 'catalog' && <BookOpen className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              {activeTab === 'club_admin' && <Building2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
              {activeTab === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}

              <span className="font-extrabold text-xs">
                {activeTab === 'orga' && 'Orga'}
                {activeTab === 'planner' && 'Planer'}
                {activeTab === 'editor' && (editingExercise ? 'Editor *' : 'Editor')}
                {activeTab === 'catalog' && 'Katalog'}
                {activeTab === 'club_admin' && 'Verein'}
                {activeTab === 'admin' && 'Admin'}
              </span>

              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isMobileNavOpen && "rotate-180")} />
            </button>

            {isMobileNavOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
                  onClick={() => setIsMobileNavOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                    <span>Reiter wechseln</span>
                    <button 
                      type="button" 
                      onClick={() => setIsMobileNavOpen(false)}
                      className="text-slate-500 hover:text-white p-0.5 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Orga */}
                  <button
                    type="button"
                    onClick={() => {
                      handleRequestTabChange('orga', 'periodization');
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between text-xs text-left cursor-pointer",
                      activeTab === 'orga'
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60 font-extrabold"
                        : "text-slate-300 hover:text-white hover:bg-slate-850"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-1.5 rounded-lg", activeTab === 'orga' ? "bg-emerald-700 text-white" : "bg-slate-950 text-emerald-400")}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Orga</span>
                        <span className="block text-[10px] font-normal opacity-75">Periodisierung & Daten</span>
                      </div>
                    </div>
                    {activeTab === 'orga' && <Check className="w-4 h-4 text-white" />}
                  </button>

                  {/* Trainingsplaner */}
                  <button
                    type="button"
                    onClick={() => {
                      handleRequestTabChange('planner');
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between text-xs text-left cursor-pointer",
                      activeTab === 'planner'
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60 font-extrabold"
                        : "text-slate-300 hover:text-white hover:bg-slate-850"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-1.5 rounded-lg", activeTab === 'planner' ? "bg-emerald-700 text-white" : "bg-slate-950 text-emerald-400")}>
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Trainingsplaner</span>
                        <span className="block text-[10px] font-normal opacity-75">Sitzungen & Belastung</span>
                      </div>
                    </div>
                    {activeTab === 'planner' && <Check className="w-4 h-4 text-white" />}
                  </button>

                  {/* Übungseditor */}
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEditorForNew();
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between text-xs text-left cursor-pointer",
                      activeTab === 'editor'
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60 font-extrabold"
                        : "text-slate-300 hover:text-white hover:bg-slate-850"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-1.5 rounded-lg", activeTab === 'editor' ? "bg-emerald-700 text-white" : "bg-slate-950 text-emerald-400")}>
                        <PenTool className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">{editingExercise ? 'Übung bearbeiten' : 'Übungseditor'}</span>
                        <span className="block text-[10px] font-normal opacity-75">Zeichnen & Konzipieren</span>
                      </div>
                    </div>
                    {activeTab === 'editor' && <Check className="w-4 h-4 text-white" />}
                  </button>

                  {/* Übungskatalog */}
                  <button
                    type="button"
                    onClick={() => {
                      handleRequestTabChange('catalog');
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between text-xs text-left cursor-pointer",
                      activeTab === 'catalog'
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60 font-extrabold"
                        : "text-slate-300 hover:text-white hover:bg-slate-850"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-1.5 rounded-lg", activeTab === 'catalog' ? "bg-emerald-700 text-white" : "bg-slate-950 text-emerald-400")}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Übungskatalog</span>
                        <span className="block text-[10px] font-normal opacity-75">Bibliothek & Übungen</span>
                      </div>
                    </div>
                    {activeTab === 'catalog' && <Check className="w-4 h-4 text-white" />}
                  </button>

                  {/* Vereins-Verwaltung */}
                  {(isClubAdmin || isMasterAdmin) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRequestTabChange('club_admin');
                      }}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between text-xs text-left cursor-pointer",
                        activeTab === 'club_admin'
                          ? "bg-sky-600 text-white shadow-md shadow-sky-950/60 font-extrabold"
                          : "text-sky-400 hover:text-sky-300 hover:bg-slate-850"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-1.5 rounded-lg", activeTab === 'club_admin' ? "bg-sky-700 text-white" : "bg-slate-950 text-sky-400")}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-bold">{currentClub?.name || clubName || 'Vereins-Verwaltung'}</span>
                          <span className="block text-[10px] font-normal opacity-75">Trainer & Club-Teams</span>
                        </div>
                      </div>
                      {activeTab === 'club_admin' && <Check className="w-4 h-4 text-white" />}
                    </button>
                  )}

                  {/* Master Admin */}
                  {(isMasterAdmin || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRequestTabChange('admin');
                      }}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between text-xs text-left cursor-pointer",
                        activeTab === 'admin'
                          ? "bg-purple-600 text-white shadow-md shadow-purple-950/60 font-extrabold"
                          : "text-purple-400 hover:text-purple-300 hover:bg-slate-850"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-1.5 rounded-lg", activeTab === 'admin' ? "bg-purple-700 text-white" : "bg-slate-950 text-purple-400")}>
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-bold">Master Admin</span>
                          <span className="block text-[10px] font-normal opacity-75">Globale Verwaltung</span>
                        </div>
                      </div>
                      {activeTab === 'admin' && <Check className="w-4 h-4 text-white" />}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

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
              onNavigateToPlanner={() => handleRequestTabChange('planner')}
            />
          )}

          {activeTab === 'planner' && (
            <PlannerView
              onOpenEditorForNew={handleOpenEditorForNew}
              onOpenEditorForEdit={handleOpenEditorForEdit}
              onNavigateToOrga={(subTab) => {
                if (subTab) {
                  handleRequestTabChange('orga', subTab);
                } else {
                  handleRequestTabChange('orga');
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
              onCancel={() => handleRequestTabChange(editorOriginTab || 'planner')}
              onDirtyChange={setIsEditorDirty}
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

      {/* Discard Changes Confirmation Modal */}
      {pendingTabTransition !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Übung verwerfen?</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Ungespeicherte Änderungen</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Du hast ungespeicherte Änderungen an dieser Übung. Wenn du den Übungseditor jetzt verlässt, gehen deine nicht gespeicherten Eingaben verloren.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingTabTransition(null)}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingTabTransition) {
                    executeTabChange(
                      pendingTabTransition.tab,
                      pendingTabTransition.orgaSubTab,
                      pendingTabTransition.exerciseToEdit,
                      pendingTabTransition.isNew
                    );
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-extrabold text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.98] transition shadow-lg shadow-rose-950/60 cursor-pointer"
              >
                Übung verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

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
