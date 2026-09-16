import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  subscribeExercises, 
  subscribeUserStructures,
  subscribeUserPlans,
  savePlanToFirestore,
  subscribeUserTrainingGroups,
  getLocalTrainingGroups,
  subscribeUserMesoPlans,
  getLocalMesoPlans,
  subscribeUserMicroPlans,
  getLocalMicroPlans,
  subscribeUserMatchPlaytimes,
  getLocalMatchPlaytimes,
  subscribeUserFeedbackTalks,
  getLocalFeedbackTalks,
  subscribeUserAbsences,
  getLocalPlayerAbsences
} from '../firebase/firestoreService';
import { 
  DEFAULT_TRAINING_STRUCTURE,
  PITCH_SURFACE_OPTIONS,
  CATEGORY_COLORS,
  PERIODIZATION_TOPICS,
  DEFAULT_ATHLETIC_STIMULI
} from '../types';
import type { 
  Exercise, 
  TrainingStructure, 
  PlannerCatalogTab, 
  TrainingPlan, 
  AgeGroup, 
  TrainingGroup, 
  Player, 
  MesoPlan, 
  MicroPlan,
  PlayerMatchPlaytime, 
  PlayerFeedbackTalk,
  PlayerAbsence,
  PitchSurface,
  TrainingPhaseItem,
  MesoDayItem,
  MesoWeekItem
} from '../types';
import { ExerciseModal } from './ExerciseModal';
import { TrainingPlanHistoryModal } from './TrainingPlanHistoryModal';
import { LiveSessionModal } from './LiveSessionModal';
import { OrgaTalksModal } from './OrgaTalksModal';
import { WorkloadManagementModal } from './WorkloadManagementModal';
import { PeriodizationContextCard } from './planner/PeriodizationContextCard';
import { PlannerPhaseCard } from './planner/PlannerPhaseCard';
import { PlannerCatalogSidebar } from './planner/PlannerCatalogSidebar';
import { PlannerExportModal } from './planner/PlannerExportModal';
import { CalendarTrainingOverviewModal } from './planner/CalendarTrainingOverviewModal';
import { CustomDatePicker } from './common/CustomDatePicker';
import { calculateGroupWorkload } from '../utils/workloadCalculator';
import { generateTrainingPlanPDF, generateCompactTrainingPlanPDF, getTrainingPlanPDFBlob } from '../utils/pdfExport';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  FileDown, 
  Layers, 
  Star, 
  RotateCcw, 
  History, 
  CheckCircle2, 
  Tag, 
  Trophy,
  Users,
  Sparkles,
  Activity,
  UserCheck,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useDirtyStateTracker } from '../hooks/useDirtyStateTracker';

export interface PlannerViewProps {
  onOpenEditorForNew?: () => void;
  onOpenEditorForEdit?: (exercise: Exercise) => void;
  onNavigateToStructure?: () => void;
  onNavigateToOrga?: (subTab?: 'periodization' | 'structure' | 'groups' | 'dataEntry' | 'stats' | 'absences' | 'playtimes' | 'macro' | 'meso' | 'micro') => void;
  phaseExercises?: Record<string, string[]>;
  setPhaseExercises?: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  openPhases?: Record<string, boolean>;
  setOpenPhases?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  onOpenEditorForNew,
  onOpenEditorForEdit: _onOpenEditorForEdit,
  onNavigateToStructure: _onNavigateToStructure,
  onNavigateToOrga,
  phaseExercises: externalPhaseExercises,
  setPhaseExercises: externalSetPhaseExercises,
  openPhases: externalOpenPhases,
  setOpenPhases: externalSetOpenPhases
}) => {
  const { 
    user, 
    userProfile, 
    isAdmin, 
    isClubAdmin, 
    isClubCoach,
    isMasterAdmin,
    clubId, 
    clubName, 
    favoriteExerciseIds = [], 
    toggleFavoriteExercise 
  } = useAuth();

  // User full name
  const userFullName = useMemo(() => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName.trim()} ${userProfile.lastName.trim()}`;
    }
    if (userProfile?.firstName) return userProfile.firstName.trim();
    if (userProfile?.displayName) return userProfile.displayName.trim();
    if (user?.displayName) return user.displayName.trim();
    return 'Torwarttrainer';
  }, [userProfile?.firstName, userProfile?.lastName, userProfile?.displayName, user?.displayName]);

  // Plan Metadata State
  const userKey = user?.uid || 'guest';
  const defaultInitialTopic = 'offen';
  const [ignoreMicroplanningTopic, setIgnoreMicroplanningTopic] = useState<boolean>(false);
  const [planTitle, setPlanTitle] = useState<string>(() => defaultInitialTopic);
  const [isPeriodizationOpen, setIsPeriodizationOpen] = useState<boolean>(false);
  const [trainerName, setTrainerName] = useState<string>(() => userFullName);

  useEffect(() => {
    if (userFullName && userFullName !== 'Torwarttrainer') {
      setTrainerName(userFullName);
    }
  }, [userFullName]);

  const [planDate, setPlanDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });

  const [targetGroup, setTargetGroup] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`planner_target_group_${userKey}`);
      return saved !== null ? saved : '';
    } catch {
      return '';
    }
  });

  const [availableKeepers, setAvailableKeepers] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`planner_available_keepers_${userKey}`);
      return saved !== null ? parseInt(saved, 10) || 3 : 3;
    } catch {
      return 3;
    }
  });

  const [pitchSurface, setPitchSurface] = useState<PitchSurface>(() => {
    try {
      const saved = localStorage.getItem(`planner_pitch_surface_${userKey}`);
      return (saved as PitchSurface) || 'artificial_turf';
    } catch {
      return 'artificial_turf';
    }
  });

  const [planImportantNotes, setPlanImportantNotes] = useState<string>('');
  const [planHasVideoAnalysis, setPlanHasVideoAnalysis] = useState<boolean>(false);
  const [planVideoAnalysisNotes, setPlanVideoAnalysisNotes] = useState<string>('');

  // Persistent preferences
  const handleTrainerChange = (val: string) => {
    setTrainerName(val);
    try {
      localStorage.setItem(`planner_trainer_name_${userKey}`, val);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTargetGroupChange = (val: string) => {
    setTargetGroup(val);
    try {
      localStorage.setItem(`planner_target_group_${userKey}`, val);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePitchSurfaceChange = (val: PitchSurface) => {
    setPitchSurface(val);
    try {
      localStorage.setItem(`planner_pitch_surface_${userKey}`, val);
    } catch (e) {
      console.error(e);
    }
  };

  // Structures state
  const [structures, setStructures] = useState<TrainingStructure[]>([DEFAULT_TRAINING_STRUCTURE]);
  const [activeStructureId, setActiveStructureId] = useState<string>(() => {
    try {
      return localStorage.getItem(`planner_active_structure_${userKey}`) || DEFAULT_TRAINING_STRUCTURE.id;
    } catch {
      return DEFAULT_TRAINING_STRUCTURE.id;
    }
  });

  useEffect(() => {
    const unsub = subscribeUserStructures(user, (data) => {
      if (data && data.length > 0) {
        setStructures(data);
      } else {
        setStructures([DEFAULT_TRAINING_STRUCTURE]);
      }
    });
    return () => unsub();
  }, [user]);

  const activeStructure = useMemo(() => {
    return structures.find(s => s.id === activeStructureId) || structures[0] || DEFAULT_TRAINING_STRUCTURE;
  }, [structures, activeStructureId]);

  // Phase exercises & open accordion state
  const [internalPhaseExercises, setInternalPhaseExercises] = useState<Record<string, string[]>>({});
  const phaseExercises = externalPhaseExercises !== undefined ? externalPhaseExercises : internalPhaseExercises;
  const setPhaseExercises = externalSetPhaseExercises !== undefined ? externalSetPhaseExercises : setInternalPhaseExercises;

  const [internalOpenPhases, setInternalOpenPhases] = useState<Record<string, boolean>>({});
  const openPhases = externalOpenPhases !== undefined ? externalOpenPhases : internalOpenPhases;
  const setOpenPhases = externalSetOpenPhases !== undefined ? externalSetOpenPhases : setInternalOpenPhases;

  // Custom modified plan exercises (does NOT overwrite catalog!)
  const [customPlanExercises, setCustomPlanExercises] = useState<Record<string, Exercise>>({});

  // Subscribed Entities
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [savedPlans, setSavedPlans] = useState<TrainingPlan[]>([]);
  const [trainingGroups, setTrainingGroups] = useState<TrainingGroup[]>(() => getLocalTrainingGroups(user?.uid));
  const [mesoPlans, setMesoPlans] = useState<MesoPlan[]>(() => getLocalMesoPlans(user?.uid));
  const [microPlans, setMicroPlans] = useState<MicroPlan[]>(() => getLocalMicroPlans(user?.uid));
  const [matchPlaytimes, setMatchPlaytimes] = useState<PlayerMatchPlaytime[]>(() => getLocalMatchPlaytimes(user?.uid));
  const [feedbackTalks, setFeedbackTalks] = useState<PlayerFeedbackTalk[]>(() => getLocalFeedbackTalks(user?.uid));
  const [absences, setAbsences] = useState<PlayerAbsence[]>(() => getLocalPlayerAbsences(user?.uid));
  const [isCalendarOverviewOpen, setIsCalendarOverviewOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub1 = subscribeExercises(user, isAdmin, (data: Exercise[]) => setAllExercises(data), undefined, isClubAdmin, clubId);
    const unsub2 = subscribeUserPlans(user, isAdmin, (data: TrainingPlan[]) => setSavedPlans(data), undefined, clubId, isClubAdmin);
    const unsub3 = subscribeUserTrainingGroups(user, (data) => setTrainingGroups(data));
    const unsub4 = subscribeUserMesoPlans(user, (data) => setMesoPlans(data));
    const unsub5 = subscribeUserMatchPlaytimes(user, (data) => setMatchPlaytimes(data));
    const unsub6 = subscribeUserFeedbackTalks(user, (data) => setFeedbackTalks(data), undefined, clubId);
    const unsub7 = subscribeUserAbsences(user, (data: PlayerAbsence[]) => setAbsences(data), undefined, clubId);
    const unsub8 = subscribeUserMicroPlans(user, (data) => setMicroPlans(data), undefined, clubId);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
    };
  }, [user, isAdmin, clubId, isClubAdmin]);

  const canViewGroup = (group: TrainingGroup) => {
    if (isMasterAdmin || isClubAdmin) return true;
    const userEmail = (user?.email || '').toLowerCase().trim();
    const uid = user?.uid;

    if (!group.clubId) {
      return group.ownerId === uid || !group.ownerId || (Boolean(group.ownerEmail) && group.ownerEmail?.toLowerCase() === userEmail);
    }

    if (isClubCoach) {
      const isAssigned = (Boolean(group.assignedCoachEmail) && group.assignedCoachEmail?.toLowerCase() === userEmail) ||
                         (Boolean(group.assignedCoachId) && group.assignedCoachId === uid);
      if (isAssigned) return true;

      const isObserver = (group.observerCoachEmails || []).some(e => e && e.toLowerCase().trim() === userEmail) ||
                         (group.observerCoachIds || []).includes(uid || '');
      if (isObserver) return true;

      if (group.ownerId === uid || (Boolean(group.ownerEmail) && group.ownerEmail?.toLowerCase() === userEmail)) {
        return true;
      }

      return false;
    }

    return true;
  };

  const visibleTrainingGroups = useMemo(() => {
    return trainingGroups.filter(canViewGroup);
  }, [trainingGroups, user, isMasterAdmin, isClubAdmin, isClubCoach]);

  // Ensure default targetGroup is always the first created group
  useEffect(() => {
    if (visibleTrainingGroups.length > 0) {
      setTargetGroup(prev => {
        if (prev && visibleTrainingGroups.some(g => g.name === prev)) return prev;
        return visibleTrainingGroups[0].name;
      });
    }
  }, [visibleTrainingGroups]);

  // Selected Training Group Object & Calculated Available Keepers for planDate (Group Keepers - Absences)
  const selectedGroupObj = useMemo(() => {
    return visibleTrainingGroups.find(g => g.name === targetGroup || g.id === targetGroup) || visibleTrainingGroups[0];
  }, [visibleTrainingGroups, targetGroup]);

  const actualAvailableKeepers = useMemo(() => {
    if (!selectedGroupObj || !selectedGroupObj.players) return 0;
    const activePlayers = selectedGroupObj.players.filter(p => !p.archived);
    if (activePlayers.length === 0) return 0;
    if (!planDate) return activePlayers.length;

    const targetDateStr = planDate.split('T')[0];
    const targetDateObj = new Date(targetDateStr + 'T12:00:00');
    const targetTime = targetDateObj.getTime();
    const targetDayOfWeek = targetDateObj.getDay(); // 0 = So, 1 = Mo, 2 = Di, 3 = Mi, 4 = Do, 5 = Fr, 6 = Sa

    const absentCount = activePlayers.filter(player => {
      return absences.some(abs => {
        if (abs.playerId !== player.id) return false;

        // Check recurring weekday absence
        if (abs.isRecurring && abs.recurringWeekday !== undefined) {
          if (Number(abs.recurringWeekday) === targetDayOfWeek) {
            const startStr = abs.startDate ? abs.startDate.split('T')[0] : null;
            const endStr = abs.endDate ? abs.endDate.split('T')[0] : null;
            if (startStr && targetDateStr < startStr) return false;
            if (endStr && targetDateStr > endStr) return false;
            return true;
          }
          return false;
        }

        // Standard date range absence
        if (!abs.startDate) return false;
        const startStr = abs.startDate.split('T')[0];
        const endStr = (abs.endDate || abs.startDate).split('T')[0];
        const startTime = new Date(startStr + 'T00:00:00').getTime();
        const endTime = new Date(endStr + 'T23:59:59').getTime();
        if (isNaN(startTime) || isNaN(endTime)) return false;
        return targetTime >= startTime && targetTime <= endTime;
      });
    }).length;

    return Math.max(0, activePlayers.length - absentCount);
  }, [selectedGroupObj, absences, planDate]);

  // Automatically adjust availableKeepers when group or date changes
  const prevGroupAndDateRef = useRef<string>('');

  useEffect(() => {
    const groupDateKey = `${targetGroup}__${planDate}`;
    if (prevGroupAndDateRef.current !== groupDateKey) {
      prevGroupAndDateRef.current = groupDateKey;
      const targetVal = actualAvailableKeepers > 0 ? Math.min(8, Math.max(1, actualAvailableKeepers)) : 1;
      setAvailableKeepers(targetVal);
    }
  }, [targetGroup, planDate, actualAvailableKeepers]);

  // Catalog filtering state
  const [activeCatalogTab, setActiveCatalogTab] = useState<PlannerCatalogTab>('ALLE');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MINE' | 'CLUB' | 'PUBLISHED' | 'FAVORITES'>('ALL');
  const [filterAgeGroup, setFilterAgeGroup] = useState<AgeGroup | 'ALL'>('ALL');
  const [filterWarmUpHauptschwerpunkt, setFilterWarmUpHauptschwerpunkt] = useState<string>('ALL');
  const [filterWarmUpAthletisch, setFilterWarmUpAthletisch] = useState<string>('ALL');
  const [filterWarmUpKognitiv, setFilterWarmUpKognitiv] = useState<string>('ALL');
  const [filterWarmUpKoordinativ, setFilterWarmUpKoordinativ] = useState<string>('ALL');
  const [filterWarmUpVisuell, setFilterWarmUpVisuell] = useState<string>('ALL');
  const [filterAnalytischTechnik, setFilterAnalytischTechnik] = useState<string>('');
  const [filterAthletischerEntwicklungsreiz, setFilterAthletischerEntwicklungsreiz] = useState<string>('ALL');
  const [subFocusFilter, setSubFocusFilter] = useState<string>('ALL');
  const [filterMaterial, setFilterMaterial] = useState<string>('ALL');

  // Exercise lookup map
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach(ex => {
      if (ex.id) map.set(ex.id, ex);
    });
    Object.entries(customPlanExercises).forEach(([id, customEx]) => {
      map.set(id, customEx);
    });
    return map;
  }, [allExercises, customPlanExercises]);

  // Total Duration & Count
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let totalCount = 0;
    activeStructure.phases.forEach(phase => {
      const ids = phaseExercises[phase.id] || [];
      ids.forEach(id => {
        const ex = exerciseMap.get(id);
        if (ex) {
          totalMinutes += ex.durationMinutes || 15;
          totalCount += 1;
        }
      });
    });
    return { totalMinutes, totalCount };
  }, [activeStructure.phases, phaseExercises, exerciseMap]);

  // Dirty State Tracker
  const isPlanDirty = stats.totalCount > 0;
  useDirtyStateTracker(isPlanDirty);

  // Active Specific Filter Count
  const activeSpecificFilterCount = useMemo(() => {
    let count = 0;
    if (filterMaterial !== 'ALL') count++;
    if (activeCatalogTab === 'WarmUp') {
      if (filterWarmUpHauptschwerpunkt !== 'ALL') count++;
      if (filterWarmUpAthletisch !== 'ALL') count++;
      if (filterWarmUpKognitiv !== 'ALL') count++;
      if (filterWarmUpKoordinativ !== 'ALL') count++;
      if (filterWarmUpVisuell !== 'ALL') count++;
    }
    if (activeCatalogTab === 'Analytisch') {
      if (filterAnalytischTechnik.trim()) count++;
    } else {
      if (subFocusFilter !== 'ALL' && subFocusFilter.trim() !== '') count++;
    }
    if (activeCatalogTab === 'Torwart-Athletik') {
      if (filterAthletischerEntwicklungsreiz !== 'ALL' && filterAthletischerEntwicklungsreiz.trim() !== '') count++;
    }
    return count;
  }, [
    filterMaterial,
    activeCatalogTab,
    filterWarmUpHauptschwerpunkt,
    filterWarmUpAthletisch,
    filterWarmUpKognitiv,
    filterWarmUpKoordinativ,
    filterWarmUpVisuell,
    filterAnalytischTechnik,
    subFocusFilter,
    filterAthletischerEntwicklungsreiz
  ]);

  const isFilterActive = activeSpecificFilterCount > 0 || filterAgeGroup !== 'ALL' || catalogSearch.trim().length > 0;

  const handleResetCatalogFilters = () => {
    setFilterAgeGroup('ALL');
    setCatalogSearch('');
    setFilterMaterial('ALL');
    setFilterWarmUpHauptschwerpunkt('ALL');
    setFilterWarmUpAthletisch('ALL');
    setFilterWarmUpKognitiv('ALL');
    setFilterWarmUpKoordinativ('ALL');
    setFilterWarmUpVisuell('ALL');
    setFilterAnalytischTechnik('');
    setFilterAthletischerEntwicklungsreiz('ALL');
    setSubFocusFilter('ALL');
  };

  // Filter Catalog Exercises
  const filteredCatalog = useMemo(() => {
    return allExercises.filter(ex => {
      const matchesTab = activeCatalogTab === 'ALLE' || ex.category === activeCatalogTab;
      const matchesKeeper = (ex.minKeepers || 1) <= availableKeepers && (ex.maxKeepers || 7) >= availableKeepers;
      const matchesScope = 
        scopeFilter === 'ALL' ||
        (scopeFilter === 'FAVORITES' && Boolean(ex.id && favoriteExerciseIds.includes(ex.id))) ||
        (scopeFilter === 'MINE' && Boolean(user?.uid && ex.ownerId === user.uid)) ||
        (scopeFilter === 'CLUB' && Boolean(clubId && ex.clubId === clubId)) ||
        (scopeFilter === 'PUBLISHED' && ex.isPublished === true);

      const matchesAge = 
        filterAgeGroup === 'ALL' ||
        (filterAgeGroup === 'immer' ? (ex.minAgeGroup === 'immer' || !ex.minAgeGroup) : (ex.minAgeGroup === filterAgeGroup || ex.minAgeGroup === 'immer' || !ex.minAgeGroup));

      const matchesMaterial = filterMaterial === 'ALL' || Boolean(ex.materials && ex.materials.includes(filterMaterial as any));

      let matchesWarmUp = true;
      if (activeCatalogTab === 'WarmUp') {
        if (filterWarmUpHauptschwerpunkt !== 'ALL') {
          matchesWarmUp = matchesWarmUp && Boolean(ex.warmUpSchwerpunkte && ex.warmUpSchwerpunkte.includes(filterWarmUpHauptschwerpunkt));
        }
        if (filterWarmUpAthletisch !== 'ALL') {
          matchesWarmUp = matchesWarmUp && (ex.atSchwerpunkt === filterWarmUpAthletisch || (!ex.atSchwerpunkt && filterWarmUpAthletisch === 'unspezifisch'));
        }
        if (filterWarmUpKognitiv !== 'ALL') {
          matchesWarmUp = matchesWarmUp && (ex.kognition === filterWarmUpKognitiv || (!ex.kognition && filterWarmUpKognitiv === 'nicht enthalten'));
        }
        if (filterWarmUpKoordinativ !== 'ALL') {
          matchesWarmUp = matchesWarmUp && (ex.koordinativesElement === filterWarmUpKoordinativ || (!ex.koordinativesElement && filterWarmUpKoordinativ === 'nicht enthalten'));
        }
        if (filterWarmUpVisuell !== 'ALL') {
          matchesWarmUp = matchesWarmUp && (ex.visuellesElement === filterWarmUpVisuell || (!ex.visuellesElement && filterWarmUpVisuell === 'nicht enthalten'));
        }
      }

      let matchesAnalytisch = true;
      if (activeCatalogTab === 'Analytisch' && filterAnalytischTechnik.trim()) {
        const techQuery = filterAnalytischTechnik.toLowerCase().trim();
        matchesAnalytisch = Boolean(
          (ex.technik && ex.technik.toLowerCase().includes(techQuery)) ||
          (ex.technikprinzipien && ex.technikprinzipien.toLowerCase().includes(techQuery)) ||
          ex.title.toLowerCase().includes(techQuery)
        );
      }

      let matchesSubFocus = true;
      if (activeCatalogTab !== 'Analytisch' && subFocusFilter !== 'ALL' && subFocusFilter.trim() !== '') {
        const topQuery = subFocusFilter.toLowerCase().trim();
        matchesSubFocus = Boolean(
          (ex.situativeSchwerpunkte && ex.situativeSchwerpunkte.some(s => s.toLowerCase() === topQuery || s.toLowerCase().includes(topQuery))) ||
          (ex.situativerSchwerpunkt && ex.situativerSchwerpunkt.toLowerCase().includes(topQuery)) ||
          (ex.athletikSchwerpunkt && ex.athletikSchwerpunkt.toLowerCase().includes(topQuery)) ||
          (ex.atSchwerpunkt && ex.atSchwerpunkt.toLowerCase().includes(topQuery)) ||
          (ex.warmUpSchwerpunkte && ex.warmUpSchwerpunkte.some(w => w.toLowerCase().includes(topQuery))) ||
          ex.category.toLowerCase() === topQuery ||
          ex.title.toLowerCase().includes(topQuery) ||
          ex.ablauf.toLowerCase().includes(topQuery) ||
          (ex.taktikprinzipien && ex.taktikprinzipien.toLowerCase().includes(topQuery))
        );
      }

      let matchesAthletikReiz = true;
      if (activeCatalogTab === 'Torwart-Athletik' && filterAthletischerEntwicklungsreiz !== 'ALL' && filterAthletischerEntwicklungsreiz.trim() !== '') {
        const reizQuery = filterAthletischerEntwicklungsreiz.toLowerCase().trim();
        matchesAthletikReiz = Boolean(
          ex.athletischerEntwicklungsreiz && ex.athletischerEntwicklungsreiz.toLowerCase().includes(reizQuery)
        );
      }

      const q = catalogSearch.toLowerCase().trim();
      const matchesQuery = !q || 
        ex.title.toLowerCase().includes(q) ||
        ex.ablauf.toLowerCase().includes(q) ||
        (ex.situativeSchwerpunkte && ex.situativeSchwerpunkte.some(s => s.toLowerCase().includes(q))) ||
        (ex.situativerSchwerpunkt && ex.situativerSchwerpunkt.toLowerCase().includes(q)) ||
        (ex.athletikSchwerpunkt && ex.athletikSchwerpunkt.toLowerCase().includes(q)) ||
        (ex.athletischerEntwicklungsreiz && ex.athletischerEntwicklungsreiz.toLowerCase().includes(q)) ||
        (ex.atSchwerpunkt && ex.atSchwerpunkt.toLowerCase().includes(q)) ||
        (ex.technik && ex.technik.toLowerCase().includes(q)) ||
        (ex.taktikprinzipien && ex.taktikprinzipien.toLowerCase().includes(q)) ||
        (ex.siegbedingung && ex.siegbedingung.toLowerCase().includes(q));

      return matchesTab && matchesKeeper && matchesScope && matchesAge && matchesMaterial && matchesWarmUp && matchesAnalytisch && matchesSubFocus && matchesAthletikReiz && matchesQuery;
    });
  }, [
    allExercises, 
    activeCatalogTab, 
    availableKeepers, 
    scopeFilter, 
    filterAgeGroup,
    filterMaterial,
    filterWarmUpHauptschwerpunkt,
    filterWarmUpAthletisch,
    filterWarmUpKognitiv,
    filterWarmUpKoordinativ,
    filterWarmUpVisuell,
    filterAnalytischTechnik,
    filterAthletischerEntwicklungsreiz,
    subFocusFilter, 
    catalogSearch, 
    user, 
    favoriteExerciseIds,
    clubId
  ]);

  // Accordion Toggle
  const togglePhase = (phaseId: string) => {
    setOpenPhases(prev => {
      const isCurrentlyOpen = Boolean(prev[phaseId]);
      if (isCurrentlyOpen) return {};
      return { [phaseId]: true };
    });
  };

  // Add exercise to phase & auto-expand
  const handleAddExerciseToPhase = (phaseId: string, exerciseId: string) => {
    setPhaseExercises(prev => {
      const currentList = prev[phaseId] || [];
      return {
        ...prev,
        [phaseId]: [...currentList, exerciseId]
      };
    });
    setOpenPhases({ [phaseId]: true });
  };

  const handleSmartAddExercise = (exerciseId: string) => {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) return;
    const matchingPhase = activeStructure.phases.find(
      p => p.categoryKey === exercise.category || p.name.toLowerCase() === exercise.category.toLowerCase()
    );
    if (matchingPhase) {
      handleAddExerciseToPhase(matchingPhase.id, exercise.id!);
      return;
    }
    if (activeStructure.phases.length > 0) {
      handleAddExerciseToPhase(activeStructure.phases[0].id, exercise.id!);
    }
  };

  const handleRemoveFromPhase = (phaseId: string, indexToRemove: number) => {
    setPhaseExercises(prev => {
      const currentList = prev[phaseId] || [];
      return {
        ...prev,
        [phaseId]: currentList.filter((_, idx) => idx !== indexToRemove)
      };
    });
  };

  const handleMoveExerciseInPhase = (phaseId: string, index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    setPhaseExercises(prev => {
      const list = [...(prev[phaseId] || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const [moved] = list.splice(index, 1);
      list.splice(targetIndex, 0, moved);
      return {
        ...prev,
        [phaseId]: list
      };
    });
  };

  // Drag and Drop State
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);
  const [draggedCardInfo, setDraggedCardInfo] = useState<{ sourcePhaseId: string; sourceIndex: number; exerciseId?: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ phaseId: string; index: number; position: 'above' | 'below' } | null>(null);

  const handleDragStart = (e: React.DragEvent, exerciseId: string) => {
    e.dataTransfer.setData('text/plain', exerciseId);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleCardDragStart = (e: React.DragEvent, phaseId: string, index: number, exerciseId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', exerciseId);
    e.dataTransfer.setData('application/json', JSON.stringify({ phaseId, index, exerciseId }));
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedCardInfo({ sourcePhaseId: phaseId, sourceIndex: index, exerciseId });
  };

  const handleDragOver = (e: React.DragEvent, phaseId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPhaseId !== phaseId) setDragOverPhaseId(phaseId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPhaseId(null);
  };

  const handleDrop = (e: React.DragEvent, targetPhaseId: string) => {
    e.preventDefault();
    setDragOverPhaseId(null);
    let sourceInfo = draggedCardInfo;
    const rawJson = e.dataTransfer.getData('application/json');
    if (rawJson) {
      try {
        sourceInfo = JSON.parse(rawJson);
      } catch (err) {
        console.error(err);
      }
    }

    if (sourceInfo && sourceInfo.sourcePhaseId) {
      const { sourcePhaseId, sourceIndex, exerciseId: rawExId } = sourceInfo;
      const exId = rawExId || (phaseExercises[sourcePhaseId] || [])[sourceIndex];
      if (sourcePhaseId === targetPhaseId) {
        setDraggedCardInfo(null);
        return;
      }
      setPhaseExercises(prev => {
        const sourceList = (prev[sourcePhaseId] || []).filter((_, idx) => idx !== sourceIndex);
        const targetList = [...(prev[targetPhaseId] || []), exId].filter(Boolean);
        return {
          ...prev,
          [sourcePhaseId]: sourceList,
          [targetPhaseId]: targetList
        };
      });
      setOpenPhases({ [targetPhaseId]: true });
      setDraggedCardInfo(null);
      return;
    }

    const exerciseId = e.dataTransfer.getData('text/plain');
    if (exerciseId) {
      handleAddExerciseToPhase(targetPhaseId, exerciseId);
    }
    setDraggedCardInfo(null);
  };

  const handleCardDragOver = (e: React.DragEvent, phaseId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    setDragOverTarget({ phaseId, index, position });
  };

  const handleCardDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleCardDrop = (e: React.DragEvent, targetPhaseId: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    let sourceInfo = draggedCardInfo;
    const rawJson = e.dataTransfer.getData('application/json');
    if (rawJson) {
      try {
        sourceInfo = JSON.parse(rawJson);
      } catch (err) {
        console.error(err);
      }
    }

    if (sourceInfo && sourceInfo.sourcePhaseId) {
      const { sourcePhaseId, sourceIndex, exerciseId: rawExId } = sourceInfo;
      const exId = rawExId || (phaseExercises[sourcePhaseId] || [])[sourceIndex];
      if (sourcePhaseId === targetPhaseId) {
        if (sourceIndex === targetIndex) {
          setDraggedCardInfo(null);
          return;
        }
        setPhaseExercises(prev => {
          const list = [...(prev[targetPhaseId] || [])];
          const [moved] = list.splice(sourceIndex, 1);
          list.splice(targetIndex, 0, moved);
          return { ...prev, [targetPhaseId]: list };
        });
      } else {
        setPhaseExercises(prev => {
          const sourceList = (prev[sourcePhaseId] || []).filter((_, idx) => idx !== sourceIndex);
          const targetList = [...(prev[targetPhaseId] || [])];
          targetList.splice(targetIndex, 0, exId);
          return {
            ...prev,
            [sourcePhaseId]: sourceList,
            [targetPhaseId]: targetList
          };
        });
        setOpenPhases({ [targetPhaseId]: true });
      }
      setDraggedCardInfo(null);
      return;
    }

    const exerciseId = e.dataTransfer.getData('text/plain');
    if (exerciseId) {
      setPhaseExercises(prev => {
        const targetList = [...(prev[targetPhaseId] || [])];
        targetList.splice(targetIndex, 0, exerciseId);
        return {
          ...prev,
          [targetPhaseId]: targetList
        };
      });
      setOpenPhases({ [targetPhaseId]: true });
    }
    setDraggedCardInfo(null);
  };

  // Phase color helper
  const getPhaseColorStyle = (phase: TrainingPhaseItem) => {
    return CATEGORY_COLORS[phase.categoryKey as keyof typeof CATEGORY_COLORS] || {
      border: 'border-slate-800',
      bg: 'bg-slate-900',
      text: 'text-slate-300',
      badge: 'bg-slate-800 text-slate-300 border-slate-700'
    };
  };

  // Reset Plan
  const handleResetPlan = () => {
    if (stats.totalCount > 0 && !window.confirm('Möchtest du alle zugeordneten Übungen aus dem Trainingsplan entfernen?')) {
      return;
    }
    setPhaseExercises({});
    setCustomPlanExercises({});
    setPlanImportantNotes('');
    setPlanHasVideoAnalysis(false);
    setPlanVideoAnalysisNotes('');
    const targetVal = actualAvailableKeepers > 0 ? Math.min(8, Math.max(1, actualAvailableKeepers)) : 1;
    setAvailableKeepers(targetVal);
  };

  // Modals State
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [isPreviewFromPlan, setIsPreviewFromPlan] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [liveSessionPlan, setLiveSessionPlan] = useState<TrainingPlan | null>(null);
  const [isOrgaTalksModalOpen, setIsOrgaTalksModalOpen] = useState<boolean>(false);
  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [duplicateConflictPlan, setDuplicateConflictPlan] = useState<TrainingPlan | null>(null);
  const [pendingActionType, setPendingActionType] = useState<'full' | 'compact' | 'share_compact' | 'share_full' | 'save_only' | null>(null);

  const isTopicValid = useMemo(() => {
    return Boolean(planTitle && planTitle.trim() && planTitle.trim().toLowerCase() !== 'offen');
  }, [planTitle]);

  // Group players derived
  const currentGroupPlayers = useMemo(() => {
    const tgNorm = (targetGroup || '').trim().toLowerCase();
    const matched = visibleTrainingGroups.find(g => g.name.trim().toLowerCase() === tgNorm || g.id === targetGroup);
    if (matched && matched.players?.length) return matched.players;
    const allP: Player[] = [];
    visibleTrainingGroups.forEach(g => {
      (g.players || []).forEach(p => {
        if (!allP.some(x => x.id === p.id)) allP.push(p);
      });
    });
    return allP;
  }, [targetGroup, visibleTrainingGroups]);

  // Workload data
  const currentPlannerGroup = useMemo(() => {
    const tgNorm = (targetGroup || '').trim().toLowerCase();
    return visibleTrainingGroups.find(g => g.name.trim().toLowerCase() === tgNorm || g.id === targetGroup) || visibleTrainingGroups[0] || null;
  }, [targetGroup, visibleTrainingGroups]);

  const activeGroupWorkload = useMemo(() => {
    return calculateGroupWorkload(currentPlannerGroup, visibleTrainingGroups, savedPlans, planDate, matchPlaytimes, mesoPlans);
  }, [currentPlannerGroup, visibleTrainingGroups, savedPlans, planDate, matchPlaytimes, mesoPlans]);

  // Matching Periodization (strictly for selected target group & planDate)
  const matchedPeriodization = useMemo(() => {
    if (!planDate || mesoPlans.length === 0) return null;
    const currentGroup = visibleTrainingGroups.find(g => g.name === targetGroup || g.id === targetGroup);
    const currentGroupId = currentGroup?.id;
    if (!currentGroupId) return null;

    // Filter strictly by this training group
    const groupMesoPlans = mesoPlans.filter(m => m.groupId === currentGroupId);
    if (groupMesoPlans.length === 0) return null;

    let matchedDay: MesoDayItem | null = null;
    let matchedWeek: MesoWeekItem | null = null;
    let matchedMeso: MesoPlan | null = null;

    // 1. Direct search across all days in this group's meso plans
    for (const meso of groupMesoPlans) {
      for (const week of meso.weeks || []) {
        const found = (week.days || []).find(d => d.date === planDate);
        if (found) {
          matchedDay = found;
          matchedWeek = week;
          matchedMeso = meso;
          break;
        }
      }
      if (matchedDay) break;
    }

    // 2. Fallback: match by week date range if exact day not found, within this group's meso plans
    if (!matchedDay) {
      for (const meso of groupMesoPlans) {
        for (const week of meso.weeks || []) {
          const dates = (week.days || []).map(d => d.date).filter(Boolean).sort();
          if (dates.length > 0) {
            const startDate = dates[0];
            const endDate = dates[dates.length - 1];
            if (planDate >= startDate && planDate <= endDate) {
              matchedWeek = week;
              matchedMeso = meso;
              break;
            }
          }
        }
        if (matchedWeek) break;
      }
    }

    // 3. Fallback: match by meso date range within this group's meso plans
    if (!matchedMeso) {
      matchedMeso = groupMesoPlans.find(m => m.startDate && m.endDate && planDate >= m.startDate && planDate <= m.endDate) || null;
    }

    if (!matchedDay && !matchedWeek && !matchedMeso) return null;

    const isAdult = Boolean(matchedMeso?.forAdults);
    const reizName = isAdult
      ? (matchedDay?.athleticMicrodosing || 'Microdosing')
      : (matchedMeso?.athleticFocus || 'unspezifisch');
    const stimulusObj = DEFAULT_ATHLETIC_STIMULI.find(s => s.name === reizName || s.id === reizName);
    const reizDesc = stimulusObj?.focus || (isAdult && matchedDay?.athleticMicrodosing ? `Spezifisches Microdosing am ${matchedDay.dayName}: ${matchedDay.athleticMicrodosing}` : '');

    const morningTopic = matchedDay?.morningTopic?.trim() || '';
    const afternoonTopic = matchedDay?.afternoonTopic?.trim() || '';
    const microTopicVal = morningTopic || afternoonTopic || '';

    const morningTwInt = (matchedDay?.morningTwIntensity !== undefined && matchedDay?.morningTwIntensity !== '') ? String(matchedDay.morningTwIntensity) : '';
    const afternoonTwInt = (matchedDay?.afternoonTwIntensity !== undefined && matchedDay?.afternoonTwIntensity !== '') ? String(matchedDay.afternoonTwIntensity) : '';
    const microTwIntensityVal = morningTwInt || afternoonTwInt || '';

    const morningTeamFocus = matchedDay?.morningTeamFocus?.trim() || '';
    const afternoonTeamFocus = matchedDay?.afternoonTeamFocus?.trim() || '';
    const microTeamFocusVal = morningTeamFocus || afternoonTeamFocus || '';

    const morningFieldSize = matchedDay?.morningFieldSize?.trim() || '';
    const afternoonFieldSize = matchedDay?.afternoonFieldSize?.trim() || '';
    const microFieldSizeVal = morningFieldSize || afternoonFieldSize || '';

    const morningTeamInt = (matchedDay?.morningTeamIntensity !== undefined && matchedDay?.morningTeamIntensity !== '') ? String(matchedDay.morningTeamIntensity) : '';
    const afternoonTeamInt = (matchedDay?.afternoonTeamIntensity !== undefined && matchedDay?.afternoonTeamIntensity !== '') ? String(matchedDay.afternoonTeamIntensity) : '';
    const microTeamIntensityVal = morningTeamInt || afternoonTeamInt || '';

    const microTeamDurationVal = matchedDay?.morningTeamDurationMinutes || matchedDay?.afternoonTeamDurationMinutes || 60;

    const isTwAndTeamVal = (
      matchedDay?.slots?.morning === 'tw_and_team' ||
      matchedDay?.slots?.afternoon === 'tw_and_team' ||
      Boolean(microTeamFocusVal || microFieldSizeVal || microTeamIntensityVal)
    );

    return { 
      hasData: Boolean(matchedDay || matchedWeek || matchedMeso),
      meso: matchedMeso,
      mesoPlan: matchedMeso,
      week: matchedWeek,
      matchedWeekNumber: matchedWeek?.weekNumber,
      day: matchedDay,
      isAdultMode: isAdult,
      athleticReizName: reizName,
      athleticReizDescription: reizDesc,
      targetDefenseGoals: matchedMeso?.targetDefenseGoals || '',
      targetDefenseTechnique1: matchedMeso?.targetDefenseTechnique1 || '',
      targetDefenseTechnique2: matchedMeso?.targetDefenseTechnique2 || '',
      spaceDefenseGoals: matchedMeso?.spaceDefenseGoals || '',
      spaceDefenseTechnique1: matchedMeso?.spaceDefenseTechnique3 || '',
      spaceDefenseTechnique2: matchedMeso?.spaceDefenseTechnique4 || '',
      isTwAndTeam: isTwAndTeamVal,
      microTopic: microTopicVal,
      microTwIntensity: microTwIntensityVal,
      microTeamFocus: microTeamFocusVal,
      microFieldSize: microFieldSizeVal,
      microTeamIntensity: microTeamIntensityVal,
      microTeamDuration: microTeamDurationVal
    };
  }, [planDate, mesoPlans, targetGroup, visibleTrainingGroups]);

  // Derived microplanning topic for active date and group
  const microTopic = useMemo(() => {
    if (!matchedPeriodization?.day) return '';
    return (
      matchedPeriodization.day.morningTopic?.trim() ||
      matchedPeriodization.day.afternoonTopic?.trim() ||
      ''
    );
  }, [matchedPeriodization]);

  // Auto-take topic from microplanning if matching periodization exists for this date, otherwise fallback to 'offen'
  useEffect(() => {
    if (!ignoreMicroplanningTopic) {
      if (microTopic) {
        setPlanTitle(microTopic);
      } else {
        setPlanTitle('offen');
      }
    }
  }, [microTopic, ignoreMicroplanningTopic, planDate, targetGroup]);

  // Load Saved Plan
  const handleLoadPlan = (plan: TrainingPlan) => {
    setIgnoreMicroplanningTopic(true);
    if (plan.title || plan.planTitle) setPlanTitle(plan.title || plan.planTitle || 'offen');
    let loadedDate = new Date().toISOString().substring(0, 10);
    if (plan.date || plan.planDate) {
      const rawDate = (plan.date || plan.planDate || '').trim();
      loadedDate = rawDate.split(' ')[0] || loadedDate;
      setPlanDate(loadedDate);
    }
    if (plan.trainerName) handleTrainerChange(plan.trainerName);
    const loadedGroup = plan.targetGroup || targetGroup;
    if (plan.targetGroup) handleTargetGroupChange(plan.targetGroup);
    
    // Prevent auto-sync from overriding the explicitly loaded keepers of this plan
    prevGroupAndDateRef.current = `${loadedGroup}__${loadedDate}`;
    if (typeof plan.availableKeepers === 'number') setAvailableKeepers(plan.availableKeepers);
    if (plan.pitchSurface) setPitchSurface(plan.pitchSurface as PitchSurface);

    const phasesData = plan.phaseExercises || plan.phases || {};
    setPhaseExercises(phasesData);
    setCustomPlanExercises(plan.customPlanExercises || {});

    const firstActivePhaseEntry = Object.entries(phasesData).find(([_, exIds]) => Array.isArray(exIds) && exIds.length > 0);
    if (firstActivePhaseEntry) {
      setOpenPhases({ [firstActivePhaseEntry[0]]: true });
    } else {
      setOpenPhases({});
    }

    setPlanImportantNotes(plan.importantNotes || '');
    setPlanHasVideoAnalysis(Boolean(plan.hasVideoAnalysis));
    setPlanVideoAnalysisNotes(plan.videoAnalysisNotes || '');

    setExportFeedback(`Trainingsplan "${plan.title || plan.planTitle}" erfolgreich geladen!`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  // Custom Plan Exercise handlers
  const handleSaveCustomPlanExercise = (updated: Exercise) => {
    if (!updated.id) return;
    setCustomPlanExercises(prev => ({ ...prev, [updated.id!]: updated }));
    setPreviewExercise(updated);
    setExportFeedback(`Übung "${updated.title}" wurde für diesen Trainingsplan angepasst.`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  const handleResetCustomPlanExercise = (exerciseId: string) => {
    setCustomPlanExercises(prev => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setTimeout(() => setExportFeedback(null), 3000);
  };

  // Export handlers
  const buildExportData = (effectiveTitle: string, effectiveDate: string) => ({
    title: effectiveTitle,
    planDate: effectiveDate,
    trainerName: trainerName.trim() || 'Torwarttrainer',
    targetGroup: targetGroup.trim() || 'nicht zugeordnet',
    availableKeepers,
    structure: activeStructure,
    phaseExercises,
    customPlanExercises,
    exerciseMap,
    pitchSurface,
    importantNotes: planImportantNotes,
    hasVideoAnalysis: planHasVideoAnalysis,
    videoAnalysisNotes: planVideoAnalysisNotes,
    clubName: clubName || 'NextLevel Goalkeeping Academy'
  });

  const executeExportAction = async (action: 'full' | 'compact' | 'share_compact' | 'share_full' | 'save_only', options?: { mode?: 'replace' | 'create_b' | 'skip_history'; existingId?: string }) => {
    try {
      setIsExporting(true);
      const effectiveTitle = planTitle.trim() || 'Torwart-Trainingseinheit';
      const effectiveDate = options?.mode === 'create_b' ? `${planDate} (B)` : planDate;

      if (options?.mode !== 'skip_history') {
        const planPayload: TrainingPlan = {
          title: effectiveTitle,
          planTitle: effectiveTitle,
          date: effectiveDate,
          planDate: effectiveDate,
          trainerName: trainerName.trim() || 'Torwarttrainer',
          targetGroup: targetGroup.trim() || 'nicht zugeordnet',
          availableKeepers,
          pitchSurface: pitchSurface || 'natural_grass',
          structureId: activeStructure.id,
          structureName: activeStructure.name,
          phaseExercises,
          customPlanExercises,
          importantNotes: planImportantNotes.trim(),
          hasVideoAnalysis: planHasVideoAnalysis,
          videoAnalysisNotes: planVideoAnalysisNotes.trim(),
          totalMinutes: stats.totalMinutes,
          exerciseCount: stats.totalCount,
          createdAt: Date.now()
        };

        if (options?.mode === 'replace' && options.existingId) {
          planPayload.id = options.existingId;
        }

        await savePlanToFirestore(planPayload, user);
      }

      const exportData = buildExportData(effectiveTitle, effectiveDate);

      if (action === 'full') {
        await generateTrainingPlanPDF(exportData);
        setExportFeedback('Ausführliches PDF heruntergeladen & in Historie gesichert!');
        setTimeout(() => setExportFeedback(null), 4000);
        setIsExportModalOpen(false);
      } else if (action === 'compact') {
        await generateCompactTrainingPlanPDF(exportData);
        setExportFeedback('Klemmbrett-PDF (1 Seite A4) heruntergeladen & in Historie gesichert!');
        setTimeout(() => setExportFeedback(null), 4000);
        setIsExportModalOpen(false);
      } else if (action === 'share_compact' || action === 'share_full') {
        const isCompact = action === 'share_compact';
        const summaryText = `⚽ Torwart-Trainingsplan: ${effectiveTitle}\n📅 Datum: ${effectiveDate}\n👤 Trainer: ${trainerName}\n🧤 Trainingsgruppe: ${targetGroup}\n🧤 Torhüter: ${availableKeepers} TW | ⏱️ Dauer: ${stats.totalMinutes} Min.\n\n🚀 NextLevel Goalkeeping Academy Coach PRO`;

        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            const res = await getTrainingPlanPDFBlob(exportData, isCompact);
            const file = new File([res.blob], res.filename, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ title: effectiveTitle, text: summaryText, files: [file] });
              setExportFeedback(`${isCompact ? 'Kompakter' : 'Ausführlicher'} Plan geteilt!`);
            } else {
              if (isCompact) await generateCompactTrainingPlanPDF(exportData);
              else await generateTrainingPlanPDF(exportData);
            }
          } catch {
            if (isCompact) await generateCompactTrainingPlanPDF(exportData);
            else await generateTrainingPlanPDF(exportData);
          }
        } else {
          if (isCompact) await generateCompactTrainingPlanPDF(exportData);
          else await generateTrainingPlanPDF(exportData);
        }
        setTimeout(() => setExportFeedback(null), 4000);
        setIsExportModalOpen(false);
      } else if (action === 'save_only') {
        setExportFeedback('Trainingseinheit erfolgreich in Historie gesichert!');
        setTimeout(() => setExportFeedback(null), 4000);
        setIsExportModalOpen(false);
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenExportModal = () => {
    if (!isTopicValid) {
      const errorMsg = 'Thema ist ein Pflichtfeld! Bitte wähle vor dem Abschluss ein konkretes Thema für diese Einheit aus („offen“ ist nicht zulässig).';
      setTopicError(errorMsg);
      setExportFeedback(errorMsg);
      return;
    }
    setTopicError(null);
    setIsExportModalOpen(true);
  };

  const handleInitiateExport = (action: 'full' | 'compact' | 'share_compact' | 'share_full' | 'save_only') => {
    if (!isTopicValid) {
      const errorMsg = 'Thema ist ein Pflichtfeld! Bitte wähle vor dem Abschluss ein konkretes Thema für diese Einheit aus („offen“ ist nicht zulässig).';
      setTopicError(errorMsg);
      setExportFeedback(errorMsg);
      setIsExportModalOpen(false);
      return;
    }

    const currentGroupNormalized = (targetGroup || '').trim().toLowerCase();
    const existingConflict = savedPlans.find(p => {
      const pBaseDate = (p.date || p.planDate || '').trim();
      const pGroupNormalized = (p.targetGroup || '').trim().toLowerCase();
      return (pBaseDate === planDate || pBaseDate === `${planDate} (B)`) && pGroupNormalized === currentGroupNormalized;
    });

    if (existingConflict) {
      setDuplicateConflictPlan(existingConflict);
      setPendingActionType(action);
      return;
    }

    executeExportAction(action);
  };

  const handleResolveConflict = (mode: 'replace' | 'create_b' | 'skip_history') => {
    const action = pendingActionType || 'full';
    const existingId = duplicateConflictPlan?.id;
    setDuplicateConflictPlan(null);
    setPendingActionType(null);
    executeExportAction(action, { mode, existingId });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Plan Header & Control Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="h-20 sm:h-24 w-auto flex items-center justify-center flex-shrink-0">
              <img 
                src="/Logo.png" 
                alt="NextLevel Logo" 
                className="h-full w-auto object-contain drop-shadow-[0_6px_16px_rgba(34,197,94,0.3)]" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-wider uppercase mb-1">
                <Sparkles className="w-4 h-4" />
                <span>NextLevel Goalkeeping Academy — Trainingsplaner</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Torwart-Trainingsplan erstellen
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap ml-auto justify-end">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-3.5 py-3 rounded-xl font-bold text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700 active:scale-95 transition shadow flex items-center gap-2 text-xs cursor-pointer"
            >
              <History className="w-4 h-4 text-slate-400" />
              <span>Historie ({savedPlans.filter(p => !p.isArchived).length})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenExportModal}
              className={cn(
                "px-5 py-3 rounded-xl font-extrabold text-white transition shadow-lg flex items-center gap-2 text-sm cursor-pointer active:scale-95",
                isTopicValid
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-900/40"
                  : "bg-slate-800 hover:bg-slate-700 border border-rose-500/50 text-rose-300 hover:text-rose-200 shadow-rose-950/30"
              )}
              title={!isTopicValid ? "Bitte zuerst ein konkretes Thema auswählen (Pflichtfeld)" : "Trainingsplan abschließen & exportieren"}
            >
              <FileDown className={cn("w-4 h-4", isTopicValid ? "text-emerald-200" : "text-rose-400")} />
              <span>Abschließen & Exportieren</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {exportFeedback && (
          <div className={cn(
            "p-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in",
            topicError || exportFeedback.includes('Pflichtfeld') || exportFeedback.includes('nicht zulässig')
              ? "bg-rose-950/90 border border-rose-500/60 text-rose-200 shadow-rose-950/40"
              : "bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 shadow-emerald-950/40"
          )}>
            {topicError || exportFeedback.includes('Pflichtfeld') || exportFeedback.includes('nicht zulässig') ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span>{exportFeedback}</span>
          </div>
        )}

        {/* Form Inputs Grid (5 Spalten: Datum ganz links, Thema Dropdown, Trainingsgruppe, Anzahl TW 1-8 + Anwesenheit, Platzbelag) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Datum (ganz links mit Kalenderpicker, Übersicht-Button & Periodisierungs-Button) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Datum</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsCalendarOverviewOpen(true)}
                  className="text-[10px] font-black text-slate-950 bg-amber-500 hover:bg-amber-400 px-2 py-0.5 rounded border border-amber-400/60 transition cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Monatsübersicht (Kalender & Mikroplanung) öffnen"
                >
                  <Calendar className="w-3 h-3 text-slate-950" />
                  <span>Übersicht</span>
                </button>
                {onNavigateToOrga && (
                  <button
                    type="button"
                    onClick={() => onNavigateToOrga('macro')}
                    className="text-[10px] font-bold text-emerald-400 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-500/40 transition cursor-pointer flex items-center gap-1 shadow-sm"
                    title="Zu Orga > Periodisierung > Makroplanung wechseln"
                  >
                    <ExternalLink className="w-3 h-3 text-emerald-400" />
                    <span>Periodisierung</span>
                  </button>
                )}
              </div>
            </div>
            <CustomDatePicker
              value={planDate}
              onChange={newDate => setPlanDate(newDate)}
            />
          </div>

          {/* 2. Thema (Übernahme aus Mikroplanung / Checkbox Mikroplanung ignorieren) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Thema</span>
                <span className="text-rose-400 text-xs font-black" title="Pflichtfeld">*</span>
              </label>

              {/* Checkbox: Mikroplanung ignorieren */}
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ignoreMicroplanningTopic}
                  onChange={e => {
                    const checked = e.target.checked;
                    setIgnoreMicroplanningTopic(checked);
                    if (!checked) {
                      if (microTopic) {
                        setPlanTitle(microTopic);
                      } else {
                        setPlanTitle('offen');
                      }
                    }
                  }}
                  className="w-3 h-3 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>Mikroplanung ignorieren</span>
              </label>
            </div>

            <div className="relative">
              <select
                value={planTitle || 'offen'}
                disabled={Boolean(microTopic && !ignoreMicroplanningTopic)}
                onChange={e => {
                  const val = e.target.value;
                  setPlanTitle(val);
                  if (val && val.trim().toLowerCase() !== 'offen') {
                    setTopicError(null);
                    if (exportFeedback && (exportFeedback.includes('Pflichtfeld') || exportFeedback.includes('nicht zulässig'))) {
                      setExportFeedback(null);
                    }
                  }
                }}
                className={cn(
                  "w-full border rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition font-medium truncate",
                  microTopic && !ignoreMicroplanningTopic
                    ? "bg-slate-900/90 border-teal-500/50 text-teal-200 cursor-not-allowed opacity-90"
                    : topicError
                      ? "bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30 text-rose-100"
                      : "bg-slate-950 border-slate-800 focus:border-emerald-500 cursor-pointer"
                )}
                title={microTopic && !ignoreMicroplanningTopic ? `Aus Mikroplanung übernommen: ${microTopic} (Aktiviere „Mikroplanung ignorieren“ zum Bearbeiten)` : 'Thema auswählen'}
              >
                <option value="offen" className="bg-slate-950 text-amber-300 font-bold">
                  offen (Bitte Thema wählen)
                </option>
                {PERIODIZATION_TOPICS.map(topic => (
                  <option key={topic.id} value={topic.label} className="bg-slate-900 text-white font-normal">
                    {topic.label}
                  </option>
                ))}
                {/* Falls individuelles Thema vorhanden ist (z.B. aus historischem Plan) */}
                {planTitle && planTitle !== 'offen' && !PERIODIZATION_TOPICS.some(t => t.label === planTitle || t.id === planTitle) && (
                  <optgroup label="Individuell / Aus Planung" className="bg-slate-950 text-amber-400 font-bold">
                    <option value={planTitle} className="bg-slate-900 text-amber-200">
                      {planTitle}
                    </option>
                  </optgroup>
                )}
              </select>

              {microTopic && !ignoreMicroplanningTopic && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-[9.5px] font-bold text-teal-300 bg-teal-950/90 border border-teal-700/80 px-2 py-0.5 rounded-md shadow-sm">
                  <span>Mikroplanung</span>
                </div>
              )}
            </div>

            {topicError && (
              <p className="text-[10.5px] font-bold text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{topicError}</span>
              </p>
            )}
          </div>

          {/* 3. Trainingsgruppe (inkl. 'verwalten' Button) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Trainingsgruppe</span>
              </label>
              {onNavigateToOrga && (
                <button
                  type="button"
                  onClick={() => onNavigateToOrga('groups')}
                  className="text-[10px] font-bold text-emerald-400 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-500/40 transition cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Zu Orga > Trainingsgruppen wechseln"
                >
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                  <span>verwalten</span>
                </button>
              )}
            </div>
            <select
              value={targetGroup}
              onChange={e => handleTargetGroupChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-medium truncate"
            >
              {visibleTrainingGroups.map(g => (
                <option key={g.id} value={g.name} className="bg-slate-900 text-white">
                  {g.name} ({g.players?.length || 0} TW)
                </option>
              ))}
            </select>
          </div>

          {/* 4. Torhüteranzahl (1 bis 8 + Anwesenheits-Button) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anzahl TW</span>
              </label>
              {onNavigateToOrga && (
                <button
                  type="button"
                  onClick={() => onNavigateToOrga('absences')}
                  className="text-[10px] font-bold text-emerald-400 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-500/40 transition cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Zu Orga > Dateneingabe > Fehlzeiten wechseln"
                >
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  <span>Anwesenheit</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setAvailableKeepers(num);
                    try {
                      localStorage.setItem(`planner_available_keepers_${userKey}`, num.toString());
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-center",
                    availableKeepers === num
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>

            {availableKeepers !== actualAvailableKeepers && (
              <div className="mt-1 p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-400 text-[10.5px] font-bold flex items-center gap-1.5 animate-in fade-in leading-tight shadow-sm">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                <span>Sind an diesem Tag wirklich so viele TW da? (Fehlzeiten beachten!)</span>
              </div>
            )}
          </div>

          {/* 5. Platzbelag (Standard Kunstrasen) + Spielzeiten-Button */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Platzbelag</span>
              </label>
              {onNavigateToOrga && (
                <button
                  type="button"
                  onClick={() => onNavigateToOrga('playtimes')}
                  className="text-[10px] font-bold text-amber-300 hover:text-white bg-amber-950/80 hover:bg-amber-900 px-1.5 py-0.5 rounded border border-amber-500/40 transition cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Zu Orga > Dateneingabe > Spielzeiten wechseln"
                >
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Spielzeiten</span>
                </button>
              )}
            </div>
            <select
              value={pitchSurface}
              onChange={e => handlePitchSurfaceChange(e.target.value as PitchSurface)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-medium"
            >
              {PITCH_SURFACE_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Periodization Context Card */}
        {matchedPeriodization && matchedPeriodization.hasData && (
          <PeriodizationContextCard
            matchedPeriodization={matchedPeriodization}
            isPeriodizationOpen={isPeriodizationOpen}
            setIsPeriodizationOpen={setIsPeriodizationOpen}
            planDate={planDate}
            onNavigateToOrga={onNavigateToOrga}
            setIsWorkloadModalOpen={setIsWorkloadModalOpen}
            activeGroupWorkload={activeGroupWorkload}
          />
        )}
      </div>

      {/* Main Content Grid: 5 Cols Phase Canvas (Left) | 7 Cols Exercise Catalog (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas Accordion */}
        <div className="lg:col-span-5 space-y-4">
          {/* Button: Orga & Gespräche (dauerhaft hervorgehoben, kompakt, Hover-Verstärkung) */}
          <button
            type="button"
            onClick={() => setIsOrgaTalksModalOpen(true)}
            className="w-full py-2 sm:py-2.5 px-4 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 hover:from-teal-500 hover:via-teal-400 hover:to-emerald-500 active:scale-[0.99] border border-teal-400/80 hover:border-teal-200 rounded-2xl shadow-md shadow-teal-950/60 hover:shadow-xl hover:shadow-teal-400/40 hover:scale-[1.01] transition-all cursor-pointer group flex items-center justify-center gap-2.5"
            title="Orga & Gespräche öffnen"
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 border border-white/30 group-hover:bg-white group-hover:text-teal-900 flex items-center justify-center text-white transition-colors flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow">
              Orga & Gespräche
            </span>
            {(planHasVideoAnalysis || Boolean(planImportantNotes && planImportantNotes.trim())) && (
              <span 
                className="w-5 h-5 rounded-full bg-rose-600 border border-rose-400 text-white font-black text-xs flex items-center justify-center shadow-md shadow-rose-950/80 animate-pulse flex-shrink-0"
                title="Wichtiges zum Training oder Videoanalyse hinterlegt!"
              >
                !
              </span>
            )}
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">Trainingsstruktur</span>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={activeStructureId}
                  onChange={e => {
                    setActiveStructureId(e.target.value);
                    try {
                      localStorage.setItem(`planner_active_structure_${userKey}`, e.target.value);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {structures.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phases.length} Phasen)</option>
                  ))}
                </select>
                {(onNavigateToOrga || _onNavigateToStructure) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToOrga) {
                        onNavigateToOrga('structure');
                      } else if (_onNavigateToStructure) {
                        _onNavigateToStructure();
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition cursor-pointer"
                    title="Zur Trainingsstruktur in Orga"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Star className="w-4 h-4 text-emerald-400 fill-emerald-400 flex-shrink-0" />
                <h3 className="text-sm font-extrabold text-white truncate" title={activeStructure.name}>
                  {activeStructure.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleResetPlan}
                className="text-[11px] font-bold text-slate-400 hover:text-rose-400 bg-slate-950 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-rose-700/50 transition flex items-center gap-1.5 flex-shrink-0 shadow-sm cursor-pointer"
                title="Alle zugeordneten Übungen aus dem Plan entfernen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Neu starten</span>
              </button>
            </div>
          </div>

          {/* Dynamic Accordion Phase Folders */}
          <div className="space-y-3">
            {activeStructure.phases.map((phase, phaseIndex) => {
              const isOpen = Boolean(openPhases[phase.id]);
              const assignedIds = phaseExercises[phase.id] || [];
              const isDragOver = dragOverPhaseId === phase.id;
              const colorStyle = getPhaseColorStyle(phase);

              return (
                <PlannerPhaseCard
                  key={phase.id || phaseIndex}
                  phase={phase}
                  phaseIndex={phaseIndex}
                  isOpen={isOpen}
                  onToggleOpen={() => togglePhase(phase.id)}
                  assignedIds={assignedIds}
                  exerciseMap={exerciseMap}
                  customPlanExercises={customPlanExercises}
                  availableKeepers={availableKeepers}
                  isDragOver={isDragOver}
                  activeCatalogTab={activeCatalogTab}
                  colorStyle={colorStyle}
                  draggedCardInfo={draggedCardInfo}
                  dragOverTarget={dragOverTarget}
                  onDragOver={(e) => handleDragOver(e, phase.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, phase.id)}
                  onCardDragStart={(e, exIdx, exId) => handleCardDragStart(e, phase.id, exIdx, exId)}
                  onCardDragEnd={() => {
                    setDraggedCardInfo(null);
                    setDragOverTarget(null);
                  }}
                  onCardDragOver={(e, exIdx) => handleCardDragOver(e, phase.id, exIdx)}
                  onCardDragLeave={handleCardDragLeave}
                  onCardDrop={(e, exIdx) => handleCardDrop(e, phase.id, exIdx)}
                  onMoveExercise={(exIdx, direction, e) => handleMoveExerciseInPhase(phase.id, exIdx, direction, e)}
                  onPreviewExercise={(ex) => {
                    setPreviewExercise(ex);
                    setIsPreviewFromPlan(true);
                  }}
                  onRemoveExercise={(exIdx) => handleRemoveFromPhase(phase.id, exIdx)}
                />
              );
            })}
          </div>

          {/* Gesamtdauer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 shadow-md flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-bold">Gesamtdauer:</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-emerald-400">
                {stats.totalMinutes} Min.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Catalog Sidebar */}
        <PlannerCatalogSidebar
          availableKeepers={availableKeepers}
          onOpenEditorForNew={onOpenEditorForNew}
          activeCatalogTab={activeCatalogTab}
          setActiveCatalogTab={setActiveCatalogTab}
          catalogSearch={catalogSearch}
          setCatalogSearch={setCatalogSearch}
          scopeFilter={scopeFilter}
          setScopeFilter={setScopeFilter}
          filterAgeGroup={filterAgeGroup}
          setFilterAgeGroup={setFilterAgeGroup}
          filterWarmUpHauptschwerpunkt={filterWarmUpHauptschwerpunkt}
          setFilterWarmUpHauptschwerpunkt={setFilterWarmUpHauptschwerpunkt}
          filterWarmUpAthletisch={filterWarmUpAthletisch}
          setFilterWarmUpAthletisch={setFilterWarmUpAthletisch}
          filterWarmUpKognitiv={filterWarmUpKognitiv}
          setFilterWarmUpKognitiv={setFilterWarmUpKognitiv}
          filterWarmUpKoordinativ={filterWarmUpKoordinativ}
          setFilterWarmUpKoordinativ={setFilterWarmUpKoordinativ}
          filterWarmUpVisuell={filterWarmUpVisuell}
          setFilterWarmUpVisuell={setFilterWarmUpVisuell}
          filterAnalytischTechnik={filterAnalytischTechnik}
          setFilterAnalytischTechnik={setFilterAnalytischTechnik}
          filterAthletischerEntwicklungsreiz={filterAthletischerEntwicklungsreiz}
          setFilterAthletischerEntwicklungsreiz={setFilterAthletischerEntwicklungsreiz}
          subFocusFilter={subFocusFilter}
          setSubFocusFilter={setSubFocusFilter}
          filterMaterial={filterMaterial}
          setFilterMaterial={setFilterMaterial}
          onResetCatalogFilters={handleResetCatalogFilters}
          isFilterActive={isFilterActive}
          activeSpecificFilterCount={activeSpecificFilterCount}
          allExercises={allExercises}
          filteredExercises={filteredCatalog}
          userId={user?.uid}
          clubId={clubId}
          clubName={clubName}
          favoriteExerciseIds={favoriteExerciseIds}
          onToggleFavorite={toggleFavoriteExercise}
          onPreviewExercise={(ex) => {
            setPreviewExercise(ex);
            setIsPreviewFromPlan(false);
          }}
          onAddExerciseToActivePhase={handleSmartAddExercise}
          onDragStart={handleDragStart}
          onDragEnd={() => {
            setDragOverPhaseId(null);
            setDragOverTarget(null);
          }}
        />
      </div>

      {/* Modals */}
      {previewExercise && (
        <ExerciseModal
          exercise={previewExercise}
          onClose={() => setPreviewExercise(null)}
          isPlanExercise={isPreviewFromPlan}
          onSavePlanExercise={handleSaveCustomPlanExercise}
          onResetPlanExercise={handleResetCustomPlanExercise}
          isCustomizedForPlan={Boolean(previewExercise.id && customPlanExercises[previewExercise.id])}
          savedPlans={savedPlans}
        />
      )}

      <TrainingPlanHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        savedPlans={savedPlans}
        exerciseMap={exerciseMap}
        structures={structures}
        groups={visibleTrainingGroups}
        onLoadPlan={handleLoadPlan}
        onPlanUpdated={(updated) => {
          setSavedPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        }}
      />

      {liveSessionPlan && (
        <LiveSessionModal
          plan={liveSessionPlan}
          exerciseMap={exerciseMap}
          structures={structures}
          groups={visibleTrainingGroups}
          onClose={() => setLiveSessionPlan(null)}
          onPlanUpdated={(updated) => {
            setSavedPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
          }}
        />
      )}

      <OrgaTalksModal
        isOpen={isOrgaTalksModalOpen}
        onClose={() => setIsOrgaTalksModalOpen(false)}
        targetGroupName={targetGroup}
        players={currentGroupPlayers}
        allGroups={visibleTrainingGroups}
        savedPlans={savedPlans}
        feedbackTalks={feedbackTalks}
        userId={user?.uid}
        initialImportantNotes={planImportantNotes}
        initialHasVideoAnalysis={planHasVideoAnalysis}
        initialVideoAnalysisNotes={planVideoAnalysisNotes}
        onSaveToTraining={({ importantNotes, hasVideoAnalysis, videoAnalysisNotes }) => {
          setPlanImportantNotes(importantNotes);
          setPlanHasVideoAnalysis(hasVideoAnalysis);
          setPlanVideoAnalysisNotes(videoAnalysisNotes);
          setExportFeedback('Wichtiges zum Training erfolgreich hinterlegt!');
          setTimeout(() => setExportFeedback(null), 3500);
        }}
      />

      <WorkloadManagementModal
        isOpen={isWorkloadModalOpen}
        onClose={() => setIsWorkloadModalOpen(false)}
        groups={visibleTrainingGroups}
        savedPlans={savedPlans}
        matchPlaytimes={matchPlaytimes}
        mesoPlans={mesoPlans}
      />

      <PlannerExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        isExporting={isExporting}
        isTopicValid={isTopicValid}
        planTitle={planTitle}
        planDate={planDate}
        targetGroup={targetGroup}
        availableKeepers={availableKeepers}
        stats={stats}
        onInitiateExport={handleInitiateExport}
        duplicateConflictPlan={duplicateConflictPlan}
        onResolveConflict={handleResolveConflict}
        onCancelConflict={() => {
          setDuplicateConflictPlan(null);
          setPendingActionType(null);
        }}
      />

      <CalendarTrainingOverviewModal
        isOpen={isCalendarOverviewOpen}
        onClose={() => setIsCalendarOverviewOpen(false)}
        savedPlans={savedPlans}
        trainingGroups={visibleTrainingGroups}
        mesoPlans={mesoPlans}
        microPlans={microPlans}
        currentPlannerDate={planDate}
        currentPlannerGroupId={selectedGroupObj?.id}
        onSelectDate={(newDate) => setPlanDate(newDate)}
        onSelectPlan={(planId) => {
          const plan = savedPlans.find(p => p.id === planId);
          if (plan) handleLoadPlan(plan);
        }}
        onNavigateToOrga={onNavigateToOrga}
      />
    </div>
  );
};
