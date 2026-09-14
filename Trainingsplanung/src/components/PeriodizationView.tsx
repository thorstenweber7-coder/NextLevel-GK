import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar,
  Plus,
  Zap,
  X,
  Target,
  Grid,
  Users,
  Settings,
  Sliders,
  Trash2,
  RotateCcw,
  FileDown,
  Loader2,
  Archive,
  AlertTriangle,
  MessageSquare,
  Lock
} from 'lucide-react';
import { cn } from '../utils/cn';
import { generateMacroPlanPDF } from '../utils/macroPlanPdfExport';
import { generateMesoPlanPDF } from '../utils/mesoPlanPdfExport';
import { generateMicroPlanPDF } from '../utils/microPlanPdfExport';
import { generateHalfYearEvaluationPDF, generateSeasonEvaluationPDF, type HalfYearTopicComparison, type MesoReflectionData } from '../utils/halfYearEvaluationPdfExport';
import { MesoReflectionModal } from './MesoReflectionModal';
import { PeriodizationFeedbackModal } from './PeriodizationFeedbackModal';
import { MacroPlanEditor } from './MacroPlanEditor';
import { MesoPlanEditor } from './MesoPlanEditor';
import { MicroPlanGrid } from './MicroPlanGrid';
import { WorkloadManagementModal } from './WorkloadManagementModal';
import { calculateGroupWorkload } from '../utils/workloadCalculator';
import { 
  type PeriodizationSeason, 
  type MacroPlan, 
  type MesoPlan, 
  type PeriodizationTopic, 
  PERIODIZATION_TOPICS,
  type BuildingBlockType,
  type TrainingGroup,
  type MesoWeekItem,
  type MesoDayItem,
  type GeneralWeekTemplateDay,
  type AthleticStimulusOption,
  DEFAULT_ATHLETIC_STIMULI,
  DEFAULT_INTENSITY_LEVELS,
  DEFAULT_VOLUME_LEVELS,
  DEFAULT_WEEK_SETTINGS,
  type TrainingPlan,
  type PlayerMatchPlaytime
} from '../types';
import { 
  getLocalPeriodizationSeasons, 
  savePeriodizationSeasonToFirestore, 
  subscribeUserPeriodizationSeasons,
  getLocalMacroPlans,
  saveMacroPlanToFirestore,
  subscribeUserMacroPlans,
  getLocalMesoPlans,
  saveMesoPlanToFirestore,
  deleteMesoPlanFromFirestore,
  subscribeUserMesoPlans,
  subscribeUserPlans,
  savePlanToFirestore,
  subscribeUserMatchPlaytimes,
  getLocalMatchPlaytimes
} from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';

interface PeriodizationViewProps {
  groups: TrainingGroup[];
  showToast: (message: string, type?: 'success' | 'error') => void;
  onNavigateToPlanner?: () => void;
  initialStage?: 'macro' | 'meso' | 'micro';
}

const normalizeDateToYMD = (dateStr?: string | null): string | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim().replace(/\s*\([AB\d]+\)$/, '').trim().split('T')[0].split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const deMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deMatch) {
    return `${deMatch[3]}-${deMatch[2].padStart(2, '0')}-${deMatch[1].padStart(2, '0')}`;
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d.toISOString().substring(0, 10);
};

export const PeriodizationView: React.FC<PeriodizationViewProps> = ({
  groups,
  showToast,
  onNavigateToPlanner,
  initialStage
}) => {
  const { user, clubId, currentClub, clubName, isAdmin, isMasterAdmin, isClubAdmin, hasProAccess } = useAuth();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingMesoPdf, setIsExportingMesoPdf] = useState(false);
  const [isExportingMicroPdf, setIsExportingMicroPdf] = useState(false);
  const [isExportingSeasonPdf, setIsExportingSeasonPdf] = useState(false);
  const [isCompletingSeason, setIsCompletingSeason] = useState(false);

  // In-App Confirmation Modal with Dirty-State Protection
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // --------------------------------------------------------------------------
  // State: Data Collections
  // --------------------------------------------------------------------------
  const [seasons, setSeasons] = useState<PeriodizationSeason[]>(() => getLocalPeriodizationSeasons(user?.uid));
  const [macroPlans, setMacroPlans] = useState<MacroPlan[]>(() => getLocalMacroPlans(user?.uid));
  const [mesoPlans, setMesoPlans] = useState<MesoPlan[]>(() => getLocalMesoPlans(user?.uid));
  const [savedPlans, setSavedPlans] = useState<TrainingPlan[]>(() => {
    try {
      const authUid = user?.uid || 'guest';
      const saved = localStorage.getItem(`nextlevel_saved_plans_${authUid}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [matchPlaytimes, setMatchPlaytimes] = useState<PlayerMatchPlaytime[]>(() => {
    return getLocalMatchPlaytimes(user?.uid);
  });

  // Active Selections
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [activeStage, setActiveStage] = useState<'macro' | 'meso' | 'micro'>(() => initialStage || 'macro');
  const [selectedHalfYear, setSelectedHalfYear] = useState<1 | 2>(() => {
    const month = new Date().getMonth(); // 0 = Jan, 6 = Jul
    return month >= 6 ? 1 : 2;
  });
  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialStage) {
      setActiveStage(initialStage);
    }
  }, [initialStage]);

  // Subscriptions
  useEffect(() => {
    const unsubSeasons = subscribeUserPeriodizationSeasons(user, data => setSeasons(data), undefined, clubId);
    const unsubMacro = subscribeUserMacroPlans(user, data => setMacroPlans(data), undefined, clubId);
    const unsubMeso = subscribeUserMesoPlans(user, data => setMesoPlans(data), undefined, clubId);
    const unsubPlans = subscribeUserPlans(user, Boolean(isAdmin || isMasterAdmin), data => setSavedPlans(data), undefined, clubId, isClubAdmin);
    const unsubMatches = subscribeUserMatchPlaytimes(user, data => setMatchPlaytimes(data), undefined, clubId);

    return () => {
      unsubSeasons();
      unsubMacro();
      unsubMeso();
      unsubPlans?.();
      unsubMatches?.();
    };
  }, [user, clubId, isAdmin, isMasterAdmin, isClubAdmin]);

  // Ensure a default season and group are selected
  useEffect(() => {
    if (seasons.length > 0 && (!selectedSeasonId || !seasons.some(s => s.id === selectedSeasonId))) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const targetStartYear = currentMonth >= 6 ? currentYear : currentYear - 1;
      const matchedSeason = seasons.find(s => s.startYear === targetStartYear) || seasons[0];
      setSelectedSeasonId(matchedSeason.id);
    }
  }, [seasons, selectedSeasonId]);

  useEffect(() => {
    if (groups.length > 0 && (!selectedGroupId || !groups.some(g => g.id === selectedGroupId))) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Current Active Season & Group
  const activeSeason = useMemo(() => {
    return seasons.find(s => s.id === selectedSeasonId) || seasons[0] || null;
  }, [seasons, selectedSeasonId]);

  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || groups[0] || null;
  }, [groups, selectedGroupId]);

  // Permission check: PRO access / Club role required + assigned coach/club admin/master admin check
  const canEditPeriodization = useMemo(() => {
    if (!hasProAccess) return false;
    if (!activeGroup) return false;
    if (isMasterAdmin || isClubAdmin) return true;
    if (!activeGroup.clubId) {
      return activeGroup.ownerId === user?.uid || !activeGroup.ownerId;
    }
    const userEmail = (user?.email || '').toLowerCase();
    if (activeGroup.assignedCoachEmail) {
      return activeGroup.assignedCoachEmail.toLowerCase() === userEmail;
    }
    if (activeGroup.assignedCoachId) {
      return activeGroup.assignedCoachId === user?.uid;
    }
    return activeGroup.ownerId === user?.uid || (Boolean(activeGroup.ownerEmail) && activeGroup.ownerEmail?.toLowerCase() === userEmail);
  }, [hasProAccess, activeGroup, isMasterAdmin, isClubAdmin, user]);

  // Calculations for current Group in active Season
  const sessionsPerWeek = useMemo(() => {
    if (!activeSeason || !activeGroup) return 2;
    return activeSeason.groupConfigs?.[activeGroup.id]?.sessionsPerWeek ?? 2;
  }, [activeSeason, activeGroup]);

  const trainingWeeksPerYear = useMemo(() => {
    if (!activeSeason || !activeGroup) return 40;
    return activeSeason.groupConfigs?.[activeGroup.id]?.trainingWeeksPerYear ?? 40;
  }, [activeSeason, activeGroup]);

  // Draft state for Group Parameter Config in Macro Plan (Sessions / Week & Training Weeks / Year)
  const [draftSessionsPerWeek, setDraftSessionsPerWeek] = useState<number>(2);
  const [draftTrainingWeeksPerYear, setDraftTrainingWeeksPerYear] = useState<number>(40);

  // Sync draft when activeGroup or activeSeason changes
  useEffect(() => {
    setDraftSessionsPerWeek(sessionsPerWeek);
    setDraftTrainingWeeksPerYear(trainingWeeksPerYear);
  }, [sessionsPerWeek, trainingWeeksPerYear, selectedGroupId, selectedSeasonId]);

  // TW-Einheiten pro Jahr = draftSessionsPerWeek * draftTrainingWeeksPerYear (dynamisch aus den Eingabefeldern)
  const totalSeasonSessions = useMemo(() => {
    return draftSessionsPerWeek * draftTrainingWeeksPerYear;
  }, [draftSessionsPerWeek, draftTrainingWeeksPerYear]);

  // TE pro Halbjahr = TW-Einheiten pro Jahr / 2 (dynamisch aus den Eingabefeldern)
  const totalHalfYearSessions = useMemo(() => {
    return Math.round(totalSeasonSessions / 2);
  }, [totalSeasonSessions]);


  // Active Macro Plan for current Season, Group & HalfYear
  const activeMacroPlan = useMemo(() => {
    if (!activeSeason || !activeGroup) return null;
    return macroPlans.find(p => 
      p.seasonId === activeSeason.id && 
      p.groupId === activeGroup.id && 
      p.halfYear === selectedHalfYear
    ) || null;
  }, [macroPlans, activeSeason, activeGroup, selectedHalfYear]);

  const hasSavedMacroPlanHalfYear1 = useMemo(() => {
    if (!activeSeason || !activeGroup) return false;
    return macroPlans.some(p => 
      p.seasonId === activeSeason.id && 
      p.groupId === activeGroup.id && 
      p.halfYear === 1
    );
  }, [macroPlans, activeSeason, activeGroup]);

  const hasSavedMacroPlanHalfYear2 = useMemo(() => {
    if (!activeSeason || !activeGroup) return false;
    return macroPlans.some(p => 
      p.seasonId === activeSeason.id && 
      p.groupId === activeGroup.id && 
      p.halfYear === 2
    );
  }, [macroPlans, activeSeason, activeGroup]);

  // Status check for any Meso Plan: 'abgeschlossen' | 'gespeichert' | 'in Planung'
  const isMesoPlanReflected = (m: MesoPlan): boolean => {
    return !!(
      m.isReflected ||
      m.athleticStimulusAchieved ||
      (m.targetDefenseReflection && m.targetDefenseReflection.trim() !== '') ||
      (m.spaceDefenseReflection && m.spaceDefenseReflection.trim() !== '') ||
      (m.intensityFocusLearning && m.intensityFocusLearning.trim() !== '')
    );
  };

  const getMesoPlanStatus = (m: MesoPlan): 'in Planung' | 'gespeichert' | 'abgeschlossen' => {
    if (isMesoPlanReflected(m)) {
      return 'abgeschlossen';
    }
    if (m.isSaved || m.isCompleted) {
      return 'gespeichert';
    }
    return 'in Planung';
  };

  // All Meso Plans for the current Season & Group across all MacroPlans / Halbjahre
  const allGroupMesoPlans = useMemo(() => {
    if (!activeSeason || !activeGroup) return [];
    return mesoPlans
      .filter(m => m.seasonId === activeSeason.id && m.groupId === activeGroup.id)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [mesoPlans, activeSeason, activeGroup]);

  // Oldest Meso Plan that is NOT marked as completed
  const defaultUncompletedMesoPlan = useMemo(() => {
    if (allGroupMesoPlans.length === 0) return null;
    const uncompleted = allGroupMesoPlans.filter(m => getMesoPlanStatus(m) !== 'abgeschlossen');
    if (uncompleted.length > 0) {
      // Sort oldest created first
      return [...uncompleted].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))[0];
    }
    // Fallback if all are completed: oldest created
    return allGroupMesoPlans[0] || null;
  }, [allGroupMesoPlans]);

  // Meso Plans for current Macro Plan (max 5)
  const currentMesoPlans = useMemo(() => {
    if (!activeMacroPlan) return [];
    return mesoPlans
      .filter(m => m.macroPlanId === activeMacroPlan.id)
      .sort((a, b) => a.mesoIndex - b.mesoIndex);
  }, [mesoPlans, activeMacroPlan]);

  const [selectedMesoId, setSelectedMesoId] = useState<string>('');

  useEffect(() => {
    if (allGroupMesoPlans.length > 0) {
      if (!selectedMesoId || !allGroupMesoPlans.some(m => m.id === selectedMesoId)) {
        const target = defaultUncompletedMesoPlan || allGroupMesoPlans[0];
        if (target) {
          setSelectedMesoId(target.id);
          const parentMacro = macroPlans.find(mp => mp.id === target.macroPlanId);
          if (parentMacro && parentMacro.halfYear && parentMacro.halfYear !== selectedHalfYear) {
            setSelectedHalfYear(parentMacro.halfYear);
          }
        }
      }
    } else {
      setSelectedMesoId('');
    }
  }, [allGroupMesoPlans, selectedMesoId, defaultUncompletedMesoPlan, macroPlans]);

  const activeMesoPlan = useMemo(() => {
    return allGroupMesoPlans.find(m => m.id === selectedMesoId) || currentMesoPlans.find(m => m.id === selectedMesoId) || currentMesoPlans[0] || allGroupMesoPlans[0] || null;
  }, [allGroupMesoPlans, currentMesoPlans, selectedMesoId]);

  const handleSelectMicroWeek = (mesoId: string, weekIndex: number) => {
    const targetMeso = allGroupMesoPlans.find(m => m.id === mesoId) || mesoPlans.find(m => m.id === mesoId);
    if (!targetMeso) return;

    setSelectedMesoId(targetMeso.id);
    setActiveMicroWeekIndex(weekIndex);

    // Sync halfYear if needed
    const parentMacro = macroPlans.find(mp => mp.id === targetMeso.macroPlanId);
    if (parentMacro && parentMacro.halfYear && parentMacro.halfYear !== selectedHalfYear) {
      setSelectedHalfYear(parentMacro.halfYear);
    }
  };

  // Combined count of feedbacks on active macro and meso plans
  const totalFeedbacksCount = useMemo(() => {
    return (activeMacroPlan?.feedbacks?.length || 0) + (activeMesoPlan?.feedbacks?.length || 0);
  }, [activeMacroPlan, activeMesoPlan]);

  // Topic Statistics: Count of conducted training units in history vs. planned target from Makroplan
  const topicStats = useMemo(() => {
    const stats: Record<string, { conducted: number; target: number }> = {};

    // Date range for current half year & season if available
    let startLimit = '';
    let endLimit = '';
    if (activeSeason) {
      if (selectedHalfYear === 1) {
        startLimit = `${activeSeason.startYear}-07-01`;
        endLimit = `${activeSeason.startYear}-12-31`;
      } else {
        startLimit = `${activeSeason.endYear}-01-01`;
        endLimit = `${activeSeason.endYear}-06-30`;
      }
    }

    // Filter plans for active group & season
    const relevantPlans = savedPlans.filter(p => {
      // Group match
      if (activeGroup) {
        const matchesGroup = !p.targetGroup || 
          p.targetGroup.toLowerCase() === activeGroup.name.toLowerCase() || 
          p.targetGroup.toLowerCase() === activeGroup.id.toLowerCase();
        if (!matchesGroup) return false;
      }

      // Date match within half year if season active
      const rawDate = p.date || p.planDate || '';
      const pYMD = normalizeDateToYMD(rawDate);
      if (startLimit && endLimit) {
        if (!pYMD || pYMD < startLimit || pYMD > endLimit) {
          return false;
        }
      }

      return true;
    });

    // Calculate for all Makroplan topics in dropdowns
    PERIODIZATION_TOPICS.forEach(topic => {
      const target = activeMacroPlan?.topicDistribution?.[topic.id] || 0;

      // Count conducted in relevantPlans
      let conducted = 0;
      relevantPlans.forEach(plan => {
        const rawTitle = (plan.title || plan.planTitle || '').trim();
        const cleanTitle = rawTitle.replace(/\s*\([AB\d]+\)$/, '').trim().toLowerCase();
        
        const matchesTitle = 
          cleanTitle.includes(topic.label.toLowerCase()) || 
          cleanTitle.includes(topic.id.toLowerCase()) ||
          (topic.id === 'Querpass' && cleanTitle.includes('querpass')) ||
          (topic.id === 'Standards' && (cleanTitle.includes('freistoß') || cleanTitle.includes('eckball') || cleanTitle.includes('elfmeter')));

        if (matchesTitle) {
          conducted++;
          return;
        }

        // Also check exercise tags inside the plan
        const planPhases = plan.phaseExercises || plan.phases || {};
        const customExercises = plan.customPlanExercises || {};
        let foundInExercises = false;

        Object.values(planPhases).forEach(exIds => {
          if (foundInExercises) return;
          (exIds || []).forEach(exId => {
            const ex = customExercises[exId];
            if (!ex) return;
            if (ex.situativeSchwerpunkte && Array.isArray(ex.situativeSchwerpunkte)) {
              if (ex.situativeSchwerpunkte.some(s => 
                s.toLowerCase().includes(topic.label.toLowerCase()) || 
                s.toLowerCase().includes(topic.id.toLowerCase()) ||
                (topic.id === 'Querpass' && s.toLowerCase().includes('querpass')) ||
                (topic.id === 'Standards' && s.toLowerCase().includes('standard'))
              )) {
                foundInExercises = true;
              }
            }
            if (ex.situativerSchwerpunkt && (
              ex.situativerSchwerpunkt.toLowerCase().includes(topic.label.toLowerCase()) ||
              ex.situativerSchwerpunkt.toLowerCase().includes(topic.id.toLowerCase()) ||
              (topic.id === 'Querpass' && ex.situativerSchwerpunkt.toLowerCase().includes('querpass')) ||
              (topic.id === 'Standards' && ex.situativerSchwerpunkt.toLowerCase().includes('standard'))
            )) {
              foundInExercises = true;
            }
          });
        });

        if (foundInExercises) {
          conducted++;
        }
      });

      stats[topic.id] = { conducted, target };
      stats[topic.label] = { conducted, target };
    });

    return stats;
  }, [savedPlans, activeGroup, activeSeason, selectedHalfYear, activeMacroPlan]);

  // --------------------------------------------------------------------------
  // Modals & Form States
  // --------------------------------------------------------------------------
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [seasonStartYear, setSeasonStartYear] = useState<number>(currentYear);

  // Macro Plan Editing state
  const [macroTopicDraft, setMacroTopicDraft] = useState<Record<PeriodizationTopic, number>>(() => {
    const init: Record<string, number> = {};
    PERIODIZATION_TOPICS.forEach(t => { init[t.id] = 0; });
    return init as Record<PeriodizationTopic, number>;
  });
  const [macroValidationError, setMacroValidationError] = useState<string | null>(null);
  const [mesoValidationError, setMesoValidationError] = useState<string | null>(null);
  const [microValidationError, setMicroValidationError] = useState<string | null>(null);

  // Reflection modal & Half-Year Evaluation PDF export states
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [reflectingMesoPlan, setReflectingMesoPlan] = useState<MesoPlan | null>(null);
  const [isCreatingNextAfterReflection, setIsCreatingNextAfterReflection] = useState(false);
  const [isExportingHalfYearPdf, setIsExportingHalfYearPdf] = useState<1 | 2 | null>(null);

  // Sync draft when activeMacroPlan or selections change
  useEffect(() => {
    setMacroValidationError(null);
    setMesoValidationError(null);
    setMicroValidationError(null);
    if (activeMacroPlan && activeMacroPlan.topicDistribution) {
      setMacroTopicDraft({ ...activeMacroPlan.topicDistribution });
    } else {
      const init: Record<string, number> = {};
      PERIODIZATION_TOPICS.forEach(t => { init[t.id] = 0; });
      setMacroTopicDraft(init as Record<PeriodizationTopic, number>);
    }
  }, [activeMacroPlan?.id, activeMacroPlan?.updatedAt, selectedHalfYear, selectedGroupId, selectedSeasonId]);

  // Default general week template (7 standard days: Mo..So)
  const DEFAULT_GENERAL_WEEK_TEMPLATE: GeneralWeekTemplateDay[] = useMemo(() => [
    { dayOfWeek: 0, dayName: 'Mo', slots: {} },
    { dayOfWeek: 1, dayName: 'Di', slots: {} },
    { dayOfWeek: 2, dayName: 'Mi', slots: {} },
    { dayOfWeek: 3, dayName: 'Do', slots: {} },
    { dayOfWeek: 4, dayName: 'Fr', slots: {} },
    { dayOfWeek: 5, dayName: 'Sa', slots: {} },
    { dayOfWeek: 6, dayName: 'So', slots: {} },
  ], []);

  // Mesoplanung: Allgemeine Struktur der Wochenplanung Draft
  const [generalWeekTemplateDraft, setGeneralWeekTemplateDraft] = useState<GeneralWeekTemplateDay[]>(DEFAULT_GENERAL_WEEK_TEMPLATE);

  // Sync generalWeekTemplateDraft when activeMesoPlan changes
  useEffect(() => {
    setMesoValidationError(null);
    if (activeMesoPlan) {
      if (activeMesoPlan.generalWeekTemplate && activeMesoPlan.generalWeekTemplate.length === 7) {
        setGeneralWeekTemplateDraft([...activeMesoPlan.generalWeekTemplate]);
      } else if (activeMesoPlan.weeks && activeMesoPlan.weeks[0]?.days?.length === 7) {
        const fromFirstWeek: GeneralWeekTemplateDay[] = activeMesoPlan.weeks[0].days.map(d => ({
          dayOfWeek: d.dayOfWeek,
          dayName: d.dayName,
          slots: { ...d.slots },
          athleticMicrodosing: d.athleticMicrodosing
        }));
        setGeneralWeekTemplateDraft(fromFirstWeek);
      } else {
        setGeneralWeekTemplateDraft(DEFAULT_GENERAL_WEEK_TEMPLATE);
      }
    } else {
      setGeneralWeekTemplateDraft(DEFAULT_GENERAL_WEEK_TEMPLATE);
    }
  }, [activeMesoPlan?.id, activeMesoPlan?.updatedAt, DEFAULT_GENERAL_WEEK_TEMPLATE]);

  // Mesoplanung: Collapsible state for Allgemeine Wochenstruktur (Standard: zugeklappt)
  const [isGeneralWeekStructureOpen, setIsGeneralWeekStructureOpen] = useState<boolean>(false);

  // Mesoplanung: Collapsible state for Periodisierungs-Verlauf Chart (Standard: zugeklappt)
  const [isPeriodizationWaveOpen, setIsPeriodizationWaveOpen] = useState<boolean>(false);

  // Mesoplanung: Active Week for Weekly Focus, Intensity & Volume Tabs
  const [activeMesoWeekIndex, setActiveMesoWeekIndex] = useState<number>(1); // 1 to 6

  // Mikroplanung: Active Week on 6-Week Zahlenstrahl
  const [activeMicroWeekIndex, setActiveMicroWeekIndex] = useState<number>(1); // 1 to 6
  const [selectedBlockBrush, setSelectedBlockBrush] = useState<BuildingBlockType | null>('tw_and_team');
  const [draggedBlock, setDraggedBlock] = useState<BuildingBlockType | null>(null);

  // Mikroplanung: Reference date for TW-Belastung (End of previous week: Sunday 23:59:59 before active week starts)
  const microPreviousWeekDate = useMemo(() => {
    if (!activeMesoPlan?.weeks) return new Date();
    
    // Find active week data
    const currentWeekData = activeMesoPlan.weeks.find(w => w.weekNumber === activeMicroWeekIndex);
    const firstDayStr = currentWeekData?.days?.[0]?.date;
    
    if (firstDayStr) {
      // First day of current week (Monday)
      const firstDay = new Date(firstDayStr + 'T12:00:00');
      // Previous week ends 1 day before the start of current week (Sunday 23:59:59)
      const prevSunday = new Date(firstDay.getTime());
      prevSunday.setDate(prevSunday.getDate() - 1);
      prevSunday.setHours(23, 59, 59, 999);
      return prevSunday;
    }
    
    // Fallback if day dates are not set yet
    if (activeMesoPlan.startDate) {
      const mesoStart = new Date(activeMesoPlan.startDate + 'T12:00:00');
      const currentWeekStart = new Date(mesoStart.getTime());
      currentWeekStart.setDate(currentWeekStart.getDate() + (activeMicroWeekIndex - 1) * 7);
      const prevSunday = new Date(currentWeekStart.getTime());
      prevSunday.setDate(prevSunday.getDate() - 1);
      prevSunday.setHours(23, 59, 59, 999);
      return prevSunday;
    }

    return new Date();
  }, [activeMesoPlan, activeMicroWeekIndex]);

  // Workload Summary for active group in Mikroplanung based on previous week data
  const microGroupWorkload = useMemo(() => {
    return calculateGroupWorkload(activeGroup, groups, savedPlans, microPreviousWeekDate, matchPlaytimes, mesoPlans);
  }, [activeGroup, groups, savedPlans, microPreviousWeekDate, matchPlaytimes, mesoPlans]);

  // Switch to Mikroplanung and auto-select the first unsaved week
  const handleSelectMicroStage = () => {
    if (!activeMesoPlan) {
      showToast('Bitte erstelle zuerst eine Mesoplanung.', 'error');
      return;
    }
    if (!activeMesoPlan.isCompleted || !isMesoSaved) {
      showToast('Bitte speichere zuerst die Mesoplanung, bevor du zur Mikroplanung wechselst.', 'error');
      return;
    }
    if (activeMesoPlan.weeks && activeMesoPlan.weeks.length > 0) {
      const firstUnsaved = activeMesoPlan.weeks.find(w => !w.isSaved);
      if (firstUnsaved) {
        setActiveMicroWeekIndex(firstUnsaved.weekNumber);
      } else {
        setActiveMicroWeekIndex(1);
      }
    } else {
      setActiveMicroWeekIndex(1);
    }
    setActiveStage('micro');
  };

  // Auto-select the first unsaved week when activeMesoPlan is loaded/changed
  useEffect(() => {
    if (activeMesoPlan?.weeks && activeMesoPlan.weeks.length > 0) {
      const firstUnsaved = activeMesoPlan.weeks.find(w => !w.isSaved);
      if (firstUnsaved) {
        setActiveMicroWeekIndex(firstUnsaved.weekNumber);
      }
    }
  }, [activeMesoPlan?.id]);

  // Is Macro Plan currently saved and unmodified?
  const isMacroSaved = useMemo(() => {
    if (!activeMacroPlan || !activeMacroPlan.topicDistribution || !activeSeason || !activeGroup) return false;
    
    // Check if group parameters were modified
    const savedConf = activeSeason.groupConfigs?.[activeGroup.id];
    const savedSessions = savedConf?.sessionsPerWeek ?? 2;
    const savedWeeks = savedConf?.trainingWeeksPerYear ?? 40;
    if (draftSessionsPerWeek !== savedSessions || draftTrainingWeeksPerYear !== savedWeeks) {
      return false;
    }

    for (const t of PERIODIZATION_TOPICS) {
      const draftVal = macroTopicDraft[t.id] || 0;
      const savedVal = activeMacroPlan.topicDistribution[t.id] || 0;
      if (draftVal !== savedVal) {
        return false;
      }
    }
    return true;
  }, [activeMacroPlan, macroTopicDraft, activeSeason, activeGroup, draftSessionsPerWeek, draftTrainingWeeksPerYear]);

  // Switch to Mesoplanung with guard that Macro plan must be saved
  const handleSelectMesoStage = () => {
    if (!activeMacroPlan || !isMacroSaved) {
      showToast('Bitte speichere zuerst die Makroplanung, bevor du zur Mesoplanung wechselst.', 'error');
      return;
    }
    setActiveStage('meso');
  };

  // Is Meso Plan currently saved and unmodified? (Checks completion state & general week template)
  const isMesoSaved = useMemo(() => {
    if (!activeMesoPlan || !activeMesoPlan.isCompleted) return false;
    if (!activeMesoPlan.generalWeekTemplate || activeMesoPlan.generalWeekTemplate.length !== 7) return false;
    for (let i = 0; i < 7; i++) {
      const d1 = generalWeekTemplateDraft[i];
      const d2 = activeMesoPlan.generalWeekTemplate[i];
      if (!d1 || !d2) return false;
      if (d1.slots?.morning !== d2.slots?.morning) return false;
      if (d1.slots?.afternoon !== d2.slots?.afternoon) return false;
      if (d1.athleticMicrodosing !== d2.athleticMicrodosing) return false;
    }
    return true;
  }, [activeMesoPlan, generalWeekTemplateDraft]);

  const activeMesoStatus = useMemo(() => {
    if (!activeMesoPlan) return 'in Planung';
    return getMesoPlanStatus(activeMesoPlan);
  }, [activeMesoPlan, isMesoSaved]);

  // Custom user options for athletic stimuli and intensity/volume levels
  const [athleticStimuli, setAthleticStimuli] = useState<AthleticStimulusOption[]>(() => {
    try {
      const stored = localStorage.getItem(`periodization_athletic_stimuli_${user?.uid || 'guest'}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasOldDefaults = parsed.some((p: any) => p.focus && p.focus.startsWith('Fokus: Stoß- und Landeabsorption'));
          if (!hasOldDefaults) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ATHLETIC_STIMULI;
  });

  const [intensityLevels, setIntensityLevels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`periodization_intensity_levels_${user?.uid || 'guest'}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_INTENSITY_LEVELS;
  });

  const [volumeLevels, setVolumeLevels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`periodization_volume_levels_${user?.uid || 'guest'}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_VOLUME_LEVELS;
  });

  const [isCustomizingStimuli, setIsCustomizingStimuli] = useState(false);
  const [isCustomizingLevels, setIsCustomizingLevels] = useState(false);

  // Temporary editing buffers for customizer modals
  const [editingStimuli, setEditingStimuli] = useState<AthleticStimulusOption[]>([]);
  const [editingIntensities, setEditingIntensities] = useState<string[]>([]);
  const [editingVolumes, setEditingVolumes] = useState<string[]>([]);
  const [newStimulusName, setNewStimulusName] = useState('');
  const [newStimulusFocus, setNewStimulusFocus] = useState('');
  const [newIntensityLevel, setNewIntensityLevel] = useState('');
  const [newVolumeLevel, setNewVolumeLevel] = useState('');

  // Sync temp state when opening modals
  useEffect(() => {
    if (isCustomizingStimuli) {
      setEditingStimuli([...athleticStimuli]);
      setNewStimulusName('');
      setNewStimulusFocus('');
    }
  }, [isCustomizingStimuli, athleticStimuli]);

  useEffect(() => {
    if (isCustomizingLevels) {
      setEditingIntensities([...intensityLevels]);
      setEditingVolumes([...volumeLevels]);
      setNewIntensityLevel('');
      setNewVolumeLevel('');
    }
  }, [isCustomizingLevels, intensityLevels, volumeLevels]);

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const getFirstMondayOfHalfYear = (year: number, halfYear: 1 | 2): Date => {
    const targetMonth = halfYear === 1 ? 6 : 0;
    const targetYear = halfYear === 1 ? year : year + 1;
    const d = new Date(targetYear, targetMonth, 1);
    
    while (d.getDay() !== 1) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  };

  const formatDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseDateString = (str: string): Date => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // Total topics sum distributed in Macro draft
  const allocatedMacroSessions = useMemo(() => {
    return Object.values(macroTopicDraft).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [macroTopicDraft]);

  const remainingMacroSessions = totalHalfYearSessions - allocatedMacroSessions;

  // --------------------------------------------------------------------------
  // Handlers: Season & Weekly Sessions
  // --------------------------------------------------------------------------
  const handleSaveNewSeason = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasProAccess) {
      showToast('Die Erstellung neuer Saisons ist ein PRO-Feature.', 'error');
      return;
    }
    const startY = seasonStartYear;
    const endY = startY + 1;
    const seasonName = `Saison ${startY}/${endY}`;

    // Initialize groupConfigs with 2 sessions/week and 40 weeks per year
    const configs: Record<string, { sessionsPerWeek: number; trainingWeeksPerYear: number; totalSeasonSessions: number }> = {};
    groups.forEach(g => {
      configs[g.id] = { sessionsPerWeek: 2, trainingWeeksPerYear: 40, totalSeasonSessions: 80 };
    });

    const newSeasonId = `season_${startY}_${endY}_${Date.now()}`;
    const newSeasonObj: PeriodizationSeason = {
      id: newSeasonId,
      name: seasonName,
      startYear: startY,
      endYear: endY,
      groupConfigs: configs,
      ownerId: user?.uid || 'guest',
      clubId: clubId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Optimistically update React state
    setSeasons(prev => [newSeasonObj, ...prev.filter(s => s.id !== newSeasonId)]);
    setSelectedSeasonId(newSeasonId);
    setIsSeasonModalOpen(false);

    try {
      await savePeriodizationSeasonToFirestore(newSeasonObj, user, clubId);
      showToast(`Saison ${startY}/${endY} erfolgreich angelegt.`);
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Anlegen der Saison.', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Macro Plan
  // --------------------------------------------------------------------------
  const handleTopicCountChange = (topicId: PeriodizationTopic, delta: number) => {
    if (macroValidationError) setMacroValidationError(null);
    const currentVal = macroTopicDraft[topicId] || 0;
    const nextVal = Math.max(0, currentVal + delta);
    const newSum = allocatedMacroSessions - currentVal + nextVal;

    if (newSum > totalHalfYearSessions) {
      showToast(`Maximal ${totalHalfYearSessions} TE im Halbjahr erlaubt!`, 'error');
      return;
    }

    setMacroTopicDraft(prev => ({
      ...prev,
      [topicId]: nextVal
    }));
  };

  const handleSaveMacroPlan = async () => {
    if (!canEditPeriodization) {
      showToast('Nur der dieser Trainingsgruppe zugeordnete Trainer oder Club-Admin darf die Periodisierung bearbeiten.', 'error');
      return;
    }

    if (!activeSeason || !activeGroup) {
      showToast('Keine aktive Saison oder Trainingsgruppe ausgewählt.', 'error');
      return;
    }

    if (allocatedMacroSessions < totalHalfYearSessions) {
      const missing = totalHalfYearSessions - allocatedMacroSessions;
      const errorMsg = `Es wurden noch nicht alle Einheiten verteilt! Es fehlen noch ${missing} TE (${allocatedMacroSessions} von ${totalHalfYearSessions} TE verteilt).`;
      setMacroValidationError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    if (allocatedMacroSessions > totalHalfYearSessions) {
      const excess = allocatedMacroSessions - totalHalfYearSessions;
      const errorMsg = `Es wurden ${excess} TE zu viel verteilt! Maximal ${totalHalfYearSessions} TE erlaubt.`;
      setMacroValidationError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    setMacroValidationError(null);

    // 1. Update Season Group Configs (TW-Einheiten / Jahr mit Saison verknüpft speichern)
    const updatedConfigs = {
      ...(activeSeason.groupConfigs || {}),
      [activeGroup.id]: {
        sessionsPerWeek: draftSessionsPerWeek,
        trainingWeeksPerYear: draftTrainingWeeksPerYear,
        totalSeasonSessions: draftSessionsPerWeek * draftTrainingWeeksPerYear
      }
    };

    const updatedSeason: PeriodizationSeason = {
      ...activeSeason,
      groupConfigs: updatedConfigs,
      updatedAt: Date.now()
    };

    setSeasons(prev => prev.map(s => s.id === activeSeason.id ? updatedSeason : s));

    // 2. Update Macro Plan (Themenverteilung je Thema speichern)
    const planId = activeMacroPlan?.id || `macro_${activeSeason.id}_${activeGroup.id}_h${selectedHalfYear}_${Date.now()}`;
    const planName = `${selectedHalfYear}. Halbjahr ${activeSeason.name}`;

    const newMacroObj: MacroPlan = {
      id: planId,
      seasonId: activeSeason.id,
      groupId: activeGroup.id,
      halfYear: selectedHalfYear,
      name: planName,
      totalHalfYearSessions: totalHalfYearSessions,
      topicDistribution: { ...macroTopicDraft },
      ownerId: user?.uid || 'guest',
      clubId: clubId || undefined,
      createdAt: activeMacroPlan?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    // 3. Immediately update React state optimistically
    setMacroPlans(prev => [newMacroObj, ...prev.filter(p => p.id !== planId)]);
    showToast('Halbjährliche Makroplanung & Einheiten erfolgreich gespeichert.');

    // 4. Persist to Firestore & LocalStorage
    try {
      await Promise.all([
        savePeriodizationSeasonToFirestore(updatedSeason, user, clubId),
        saveMacroPlanToFirestore(newMacroObj, user, clubId)
      ]);
    } catch (err) {
      console.error('Error saving macro plan & season config:', err);
      showToast('Fehler beim Speichern in der Datenbank.', 'error');
    }
  };

  const handleExportMacroPdf = async () => {
    if (!activeSeason || !activeGroup) {
      showToast('Keine aktive Saison oder Trainingsgruppe ausgewählt.', 'error');
      return;
    }

    setIsExportingPdf(true);
    try {
      await generateMacroPlanPDF({
        seasonName: activeSeason.name,
        seasonStartYear: activeSeason.startYear,
        seasonEndYear: activeSeason.endYear,
        groupName: activeGroup.name,
        groupAgeCategory: activeGroup.ageCategory,
        halfYear: selectedHalfYear,
        sessionsPerWeek: draftSessionsPerWeek,
        trainingWeeksPerYear: draftTrainingWeeksPerYear,
        totalSeasonSessions: totalSeasonSessions,
        totalHalfYearSessions: totalHalfYearSessions,
        allocatedMacroSessions: allocatedMacroSessions,
        remainingMacroSessions: remainingMacroSessions,
        topicDistribution: { ...macroTopicDraft },
        clubName: currentClub?.name || clubName || undefined,
        clubLogoUrl: currentClub?.logoUrl || undefined
      });
      showToast('PDF der Makroplanung erfolgreich erstellt!', 'success');
    } catch (err) {
      console.error('Error generating Macro Plan PDF:', err);
      showToast('Fehler beim Erstellen der PDF.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportMesoPdf = async () => {
    if (!activeSeason || !activeGroup || !activeMesoPlan) {
      showToast('Keine aktive Saison, Trainingsgruppe oder Mesoplanung ausgewählt.', 'error');
      return;
    }

    setIsExportingMesoPdf(true);
    try {
      await generateMesoPlanPDF({
        seasonName: activeSeason.name,
        seasonStartYear: activeSeason.startYear,
        seasonEndYear: activeSeason.endYear,
        groupName: activeGroup.name,
        groupAgeCategory: activeGroup.ageCategory,
        halfYear: selectedHalfYear,
        mesoIndex: activeMesoPlan.mesoIndex,
        mesoName: activeMesoPlan.name,
        startDate: activeMesoPlan.startDate,
        endDate: activeMesoPlan.endDate,
        athleticFocus: activeMesoPlan.athleticFocus,
        forAdults: Boolean(activeMesoPlan.forAdults),
        targetDefenseGoals: activeMesoPlan.targetDefenseGoals,
        targetDefenseTechnique1: activeMesoPlan.targetDefenseTechnique1,
        targetDefenseTechnique2: activeMesoPlan.targetDefenseTechnique2,
        spaceDefenseGoals: activeMesoPlan.spaceDefenseGoals,
        spaceDefenseTechnique3: activeMesoPlan.spaceDefenseTechnique3,
        spaceDefenseTechnique4: activeMesoPlan.spaceDefenseTechnique4,
        generalWeekTemplate: generalWeekTemplateDraft,
        weeks: activeMesoPlan.weeks || [],
        clubName: currentClub?.name || clubName || undefined,
        clubLogoUrl: currentClub?.logoUrl || undefined
      });
      showToast('PDF der Mesoplanung erfolgreich erstellt!', 'success');
    } catch (err) {
      console.error('Error generating Meso Plan PDF:', err);
      showToast('Fehler beim Erstellen der PDF.', 'error');
    } finally {
      setIsExportingMesoPdf(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Meso Plan (6-Week Cycles)
  // --------------------------------------------------------------------------
  const executeCreateNewMesoPlan = async () => {
    if (!canEditPeriodization) {
      showToast('Nur der dieser Trainingsgruppe zugeordnete Trainer oder Club-Admin darf die Periodisierung bearbeiten.', 'error');
      return;
    }
    if (!activeMacroPlan || !activeSeason || !activeGroup) return;

    const nextMesoIndex = currentMesoPlans.length + 1;
    let startDateObj: Date;

    if (currentMesoPlans.length === 0) {
      startDateObj = getFirstMondayOfHalfYear(activeSeason.startYear, selectedHalfYear);
    } else {
      const lastMeso = currentMesoPlans[currentMesoPlans.length - 1];
      const lastEnd = parseDateString(lastMeso.endDate);
      startDateObj = new Date(lastEnd);
      startDateObj.setDate(startDateObj.getDate() + 1);
    }

    // Build 6 weeks of 7 days pre-filled with general week template
    const weeks: MesoWeekItem[] = [];
    const curDay = new Date(startDateObj);

    for (let w = 1; w <= 6; w++) {
      const days: MesoDayItem[] = [];
      for (let d = 0; d < 7; d++) {
        days.push({
          date: formatDateString(curDay),
          dayOfWeek: d,
          dayName: DAY_NAMES[d],
          slots: {
            morning: generalWeekTemplateDraft[d]?.slots.morning,
            afternoon: generalWeekTemplateDraft[d]?.slots.afternoon
          },
          athleticMicrodosing: generalWeekTemplateDraft[d]?.athleticMicrodosing
        });
        curDay.setDate(curDay.getDate() + 1);
      }
      weeks.push({
        weekNumber: w,
        tacticalFocus: '',
        intensity: DEFAULT_WEEK_SETTINGS[w]?.intensity || 'mittel (ca. 80%)',
        volume: DEFAULT_WEEK_SETTINGS[w]?.volume || 'mittel',
        days
      });
    }

    const endDay = new Date(curDay);
    endDay.setDate(endDay.getDate() - 1);

    const mesoName = `Mesoplan ${nextMesoIndex} (Woche ${((nextMesoIndex - 1) * 6) + 1}–${nextMesoIndex * 6})`;
    const newMesoId = `meso_${activeMacroPlan.id}_${nextMesoIndex}_${Date.now()}`;

    const newMesoObj: MesoPlan = {
      id: newMesoId,
      macroPlanId: activeMacroPlan.id,
      seasonId: activeSeason.id,
      groupId: activeGroup.id,
      mesoIndex: nextMesoIndex,
      name: mesoName,
      startDate: formatDateString(startDateObj),
      endDate: formatDateString(endDay),
      athleticFocus: 'unspezifisch',
      forAdults: false,
      targetDefenseGoals: '',
      targetDefenseTechnique1: '',
      targetDefenseTechnique2: '',
      spaceDefenseGoals: '',
      spaceDefenseTechnique3: '',
      spaceDefenseTechnique4: '',
      generalWeekTemplate: [...generalWeekTemplateDraft],
      weeks: weeks,
      isCompleted: false,
      ownerId: user?.uid || 'guest',
      clubId: clubId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Optimistically update React state
    setMesoPlans(prev => [newMesoObj, ...prev.filter(m => m.id !== newMesoId)]);
    setSelectedMesoId(newMesoId);
    setActiveMicroWeekIndex(1);
    showToast(`Mesoplan ${nextMesoIndex} (6 Wochen) erfolgreich erstellt.`);

    try {
      await saveMesoPlanToFirestore(newMesoObj, user, clubId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNewMesoPlan = async () => {
    if (!canEditPeriodization) {
      showToast('Nur der dieser Trainingsgruppe zugeordnete Trainer oder Club-Admin darf die Periodisierung bearbeiten.', 'error');
      return;
    }
    if (!activeMacroPlan || !activeSeason || !activeGroup) {
      showToast('Bitte erstelle und speichere zuerst eine halbjährliche Makroplanung.', 'error');
      return;
    }

    if (currentMesoPlans.length >= 5) {
      showToast('Maximal 5 Mesoplanungen pro Halbjahr zulässig. Bitte lege für weitere Zyklen ein neues Halbjahr an.', 'error');
      return;
    }

    // If starting from 2nd meso plan onwards, show reflection modal for currently selected meso plan in dropdown
    if (currentMesoPlans.length > 0) {
      const planToReflect = activeMesoPlan || currentMesoPlans[0];
      setReflectingMesoPlan(planToReflect);
      setIsCreatingNextAfterReflection(true);
      setIsReflectionModalOpen(true);
    } else {
      setIsCreatingNextAfterReflection(false);
      await executeCreateNewMesoPlan();
    }
  };

  const [isDeletingMesoPlan, setIsDeletingMesoPlan] = useState(false);

  const handleDeleteMesoPlan = (mesoPlanToDelete: MesoPlan) => {
    if (!canEditPeriodization) {
      showToast('Nur der dieser Trainingsgruppe zugeordnete Trainer oder Club-Admin darf die Periodisierung bearbeiten.', 'error');
      return;
    }
    if (!mesoPlanToDelete) return;

    setConfirmDialog({
      title: 'Mesozyklus löschen',
      message: `Möchtest du die Mesoplanung "${mesoPlanToDelete.name}" wirklich endgültig löschen?\n\nAlle zugehörigen Wochen-, Tages- und Reflexionsdaten dieses Mesozyklus werden unwiderruflich gelöscht.`,
      confirmText: 'Endgültig löschen',
      isDanger: true,
      onConfirm: async () => {
        setIsDeletingMesoPlan(true);
        try {
          await deleteMesoPlanFromFirestore(mesoPlanToDelete.id, user);

          // Optimistically update React state
          setMesoPlans(prev => prev.filter(m => m.id !== mesoPlanToDelete.id));

          showToast(`Mesoplanung "${mesoPlanToDelete.name}" wurde endgültig gelöscht.`, 'success');
        } catch (err) {
          console.error('Error deleting meso plan:', err);
          showToast('Fehler beim Löschen der Mesoplanung.', 'error');
        } finally {
          setIsDeletingMesoPlan(false);
        }
      }
    });
  };

  const handleSaveMesoReflectionAndCreateNext = async (reflectionData: {
    athleticStimulusAchieved?: 'ja' | 'in Teilen' | 'nein';
    targetDefenseReflection?: string;
    spaceDefenseReflection?: string;
    intensityFocusLearning?: string;
  }) => {
    if (!reflectingMesoPlan) return;

    const updatedLastMeso: MesoPlan = {
      ...reflectingMesoPlan,
      ...reflectionData,
      isCompleted: true,
      updatedAt: Date.now()
    };

    // Optimistically update state
    setMesoPlans(prev => prev.map(m => m.id === updatedLastMeso.id ? updatedLastMeso : m));

    try {
      await saveMesoPlanToFirestore(updatedLastMeso, user, clubId);
    } catch (err) {
      console.error('Error saving reflection to Firestore:', err);
    }

    setIsReflectionModalOpen(false);
    const shouldCreateNext = isCreatingNextAfterReflection;
    setReflectingMesoPlan(null);
    setIsCreatingNextAfterReflection(false);

    if (shouldCreateNext) {
      await executeCreateNewMesoPlan();
    } else {
      showToast('Reflexion des Mesozyklus erfolgreich gespeichert.', 'success');
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Half-Year Evaluation PDF Export
  // --------------------------------------------------------------------------
  const handleExportHalfYearEvaluationPdf = async (targetHalfYear: 1 | 2) => {
    if (!activeSeason || !activeGroup) {
      showToast('Bitte wähle zuerst eine Saison und Trainingsgruppe aus.', 'error');
      return;
    }

    setIsExportingHalfYearPdf(targetHalfYear);
    try {
      // Find macro plan for target half year
      const targetMacroPlan = macroPlans.find(
        m => m.seasonId === activeSeason.id && m.groupId === activeGroup.id && m.halfYear === targetHalfYear
      ) || (selectedHalfYear === targetHalfYear ? activeMacroPlan : null);

      const otherMacroPlan = macroPlans.find(
        m => m.seasonId === activeSeason.id && m.groupId === activeGroup.id && m.halfYear !== targetHalfYear
      ) || (selectedHalfYear !== targetHalfYear ? activeMacroPlan : null);

      // Date range for the target half year
      const startLimit = targetHalfYear === 1
        ? `${activeSeason.startYear}-07-01`
        : `${activeSeason.endYear}-01-01`;
      const endLimit = targetHalfYear === 1
        ? `${activeSeason.startYear}-12-31`
        : `${activeSeason.endYear}-06-30`;

      // Find all meso plans for the target half year strictly
      const halfYearMesoPlans = mesoPlans
        .filter(m => {
          if (m.seasonId !== activeSeason.id || m.groupId !== activeGroup.id) return false;
          // If explicitly attached to the OTHER half year's macro plan, exclude
          if (otherMacroPlan && m.macroPlanId === otherMacroPlan.id) return false;
          // If explicitly attached to target macro plan, include
          if (targetMacroPlan && m.macroPlanId === targetMacroPlan.id) return true;

          // Otherwise, check if meso startDate falls into the target half-year window
          const mesoStartYMD = normalizeDateToYMD(m.startDate);
          if (mesoStartYMD) {
            return mesoStartYMD >= startLimit && mesoStartYMD <= endLimit;
          }
          return false;
        })
        .sort((a, b) => a.mesoIndex - b.mesoIndex);

      // Filter relevant plans for conducted calculation
      const relevantPlans = savedPlans.filter(p => {
        if (activeGroup) {
          const matchesGroup = !p.targetGroup || 
            p.targetGroup.toLowerCase() === activeGroup.name.toLowerCase() || 
            p.targetGroup.toLowerCase() === activeGroup.id.toLowerCase();
          if (!matchesGroup) return false;
        }

        const rawDate = p.date || p.planDate || '';
        const pYMD = normalizeDateToYMD(rawDate);
        if (!pYMD || pYMD < startLimit || pYMD > endLimit) return false;
        return true;
      });

      // Compute topic comparisons for all 9 macro topics
      const topicComparisons: HalfYearTopicComparison[] = PERIODIZATION_TOPICS.map(topic => {
        const targetSessions = targetMacroPlan?.topicDistribution?.[topic.id] || 0;
        
        let conducted = 0;
        relevantPlans.forEach(plan => {
          const rawTitle = (plan.title || plan.planTitle || '').trim();
          const cleanTitle = rawTitle.replace(/\s*\([AB\d]+\)$/, '').trim().toLowerCase();
          
          const matchesTitle = 
            cleanTitle.includes(topic.id.toLowerCase()) ||
            cleanTitle.includes(topic.label.toLowerCase()) ||
            (topic.id === 'Querpass' && (cleanTitle.includes('querpass') || cleanTitle.includes('querpässe'))) ||
            (topic.id === 'Spiel mit dem Ball' && (cleanTitle.includes('anbieteverhalten') || cleanTitle.includes('spielfortsetzung') || cleanTitle.includes('umschaltverhalten') || cleanTitle.includes('spiel mit dem ball'))) ||
            (topic.id === 'Standards' && (cleanTitle.includes('freistoß') || cleanTitle.includes('freistöße') || cleanTitle.includes('eckball') || cleanTitle.includes('eckbälle') || cleanTitle.includes('elfmeter') || cleanTitle.includes('standards')));

          if (matchesTitle) {
            conducted++;
            return;
          }

          const planPhases = plan.phaseExercises || plan.phases || {};
          const customExercises = plan.customPlanExercises || {};
          let foundInExercises = false;

          Object.values(planPhases).forEach(exIds => {
            if (foundInExercises) return;
            (exIds || []).forEach(exId => {
              const ex = customExercises[exId];
              if (!ex) return;
              if (ex.situativeSchwerpunkte && Array.isArray(ex.situativeSchwerpunkte)) {
                if (ex.situativeSchwerpunkte.some(s => 
                  s.toLowerCase().includes(topic.id.toLowerCase()) || 
                  s.toLowerCase().includes(topic.label.toLowerCase())
                )) {
                  foundInExercises = true;
                }
              }
              if (ex.situativerSchwerpunkt && (
                ex.situativerSchwerpunkt.toLowerCase().includes(topic.id.toLowerCase()) ||
                ex.situativerSchwerpunkt.toLowerCase().includes(topic.label.toLowerCase())
              )) {
                foundInExercises = true;
              }
            });
          });

          if (foundInExercises) conducted++;
        });

        // Also check if any meso plan micro day slots in this half year match this topic
        halfYearMesoPlans.forEach(m => {
          m.weeks.forEach(w => {
            w.days.forEach(d => {
              const mTopic = (d.morningTopic || '').toLowerCase();
              const aTopic = (d.afternoonTopic || '').toLowerCase();
              const matchesM = mTopic.includes(topic.id.toLowerCase()) || mTopic.includes(topic.label.toLowerCase()) || (topic.id === 'Querpass' && mTopic.includes('querpass'));
              const matchesA = aTopic.includes(topic.id.toLowerCase()) || aTopic.includes(topic.label.toLowerCase()) || (topic.id === 'Querpass' && aTopic.includes('querpass'));
              if (matchesM && (d.slots?.morning === 'tw_only' || d.slots?.morning === 'tw_and_team')) {
                if (relevantPlans.length === 0) conducted++;
              }
              if (matchesA && (d.slots?.afternoon === 'tw_only' || d.slots?.afternoon === 'tw_and_team')) {
                if (relevantPlans.length === 0) conducted++;
              }
            });
          });
        });

        const completionPercent = targetSessions > 0 ? Math.round((conducted / targetSessions) * 100) : (conducted > 0 ? 100 : 0);

        let group = 'Zielverteidigung';
        if (['Flanken', 'Early Cross', 'Querpass', 'Verteidigen hinter der Abwehrkette'].includes(topic.id)) group = 'Raumverteidigung';
        else if (topic.id === 'Standards') group = 'Standards';
        else if (topic.id === 'Spiel mit dem Ball') group = 'Offensive & Spiel';
        else if (topic.id === 'Torwart-Athletik') group = 'Athletik';

        return {
          id: topic.id,
          topicLabel: topic.label,
          group,
          targetSessions,
          conductedSessions: conducted,
          completionPercent
        };
      });

      const totalPlanned = topicComparisons.reduce((sum, t) => sum + t.targetSessions, 0);
      const totalConducted = relevantPlans.length > 0 
        ? relevantPlans.length 
        : topicComparisons.reduce((sum, t) => sum + t.conductedSessions, 0);

      const mesoReflections: MesoReflectionData[] = halfYearMesoPlans.map(m => ({
        mesoIndex: m.mesoIndex,
        mesoName: m.name,
        startDate: m.startDate,
        endDate: m.endDate,
        athleticFocus: m.athleticFocus,
        athleticStimulusAchieved: m.athleticStimulusAchieved,
        targetDefenseGoals: m.targetDefenseGoals,
        targetDefenseTechnique1: m.targetDefenseTechnique1,
        targetDefenseTechnique2: m.targetDefenseTechnique2,
        targetDefenseReflection: m.targetDefenseReflection,
        spaceDefenseGoals: m.spaceDefenseGoals,
        spaceDefenseTechnique3: m.spaceDefenseTechnique3,
        spaceDefenseTechnique4: m.spaceDefenseTechnique4,
        spaceDefenseReflection: m.spaceDefenseReflection,
        intensityFocusLearning: m.intensityFocusLearning
      }));

      await generateHalfYearEvaluationPDF({
        seasonName: activeSeason.name,
        seasonStartYear: activeSeason.startYear,
        seasonEndYear: activeSeason.endYear,
        groupName: activeGroup.name,
        groupAgeCategory: activeGroup.ageCategory,
        halfYear: targetHalfYear,
        halfYearLabel: targetHalfYear === 1 ? '1. Halbjahr (Juli – Dez)' : '2. Halbjahr (Jan – Juni)',
        totalPlannedSessions: totalPlanned || (targetMacroPlan?.totalHalfYearSessions || totalHalfYearSessions),
        totalConductedSessions: totalConducted,
        sessionsPerWeek: draftSessionsPerWeek,
        trainingWeeksPerYear: draftTrainingWeeksPerYear,
        topicComparisons,
        mesoReflections,
        clubName: clubName || undefined,
        clubLogoUrl: currentClub?.logoUrl || undefined
      });

      showToast(`Halbjahres-Auswertung (${targetHalfYear}. Halbjahr) erfolgreich als PDF erstellt!`, 'success');
    } catch (err) {
      console.error('Error exporting half-year evaluation PDF:', err);
      showToast('Fehler beim Erstellen der Halbjahres-Auswertung.', 'error');
    } finally {
      setIsExportingHalfYearPdf(null);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Full Season Evaluation PDF Export
  // --------------------------------------------------------------------------
  const handleExportSeasonEvaluationPdf = async () => {
    if (!activeSeason || !activeGroup) {
      showToast('Bitte wähle zuerst eine Saison und Trainingsgruppe aus.', 'error');
      return;
    }

    setIsExportingSeasonPdf(true);
    try {
      // Find macro plans for both half years
      const macroPlanHY1 = macroPlans.find(
        m => m.seasonId === activeSeason.id && m.groupId === activeGroup.id && m.halfYear === 1
      );
      const macroPlanHY2 = macroPlans.find(
        m => m.seasonId === activeSeason.id && m.groupId === activeGroup.id && m.halfYear === 2
      );

      // Date range for the entire season (01.07.startYear – 30.06.endYear)
      const startLimit = `${activeSeason.startYear}-07-01`;
      const endLimit = `${activeSeason.endYear}-06-30`;

      // Find all meso plans for the season
      const seasonMesoPlans = mesoPlans
        .filter(m => {
          if (m.seasonId !== activeSeason.id || m.groupId !== activeGroup.id) return false;
          const mesoStartYMD = normalizeDateToYMD(m.startDate);
          if (mesoStartYMD) {
            return mesoStartYMD >= startLimit && mesoStartYMD <= endLimit;
          }
          return true;
        })
        .sort((a, b) => a.mesoIndex - b.mesoIndex);

      // Filter relevant plans for conducted calculation across the full season
      const relevantPlans = savedPlans.filter(p => {
        if (activeGroup) {
          const matchesGroup = !p.targetGroup || 
            p.targetGroup.toLowerCase() === activeGroup.name.toLowerCase() || 
            p.targetGroup.toLowerCase() === activeGroup.id.toLowerCase();
          if (!matchesGroup) return false;
        }

        const rawDate = p.date || p.planDate || '';
        const pYMD = normalizeDateToYMD(rawDate);
        if (!pYMD || pYMD < startLimit || pYMD > endLimit) return false;
        return true;
      });

      // Compute topic comparisons for all 9 macro topics across the whole season
      const topicComparisons: HalfYearTopicComparison[] = PERIODIZATION_TOPICS.map(topic => {
        const targetHY1 = macroPlanHY1?.topicDistribution?.[topic.id] || 0;
        const targetHY2 = macroPlanHY2?.topicDistribution?.[topic.id] || 0;
        const targetSessions = targetHY1 + targetHY2;
        
        let conducted = 0;
        relevantPlans.forEach(plan => {
          const rawTitle = (plan.title || plan.planTitle || '').trim();
          const cleanTitle = rawTitle.replace(/\s*\([AB\d]+\)$/, '').trim().toLowerCase();
          
          const matchesTitle = 
            cleanTitle.includes(topic.id.toLowerCase()) ||
            cleanTitle.includes(topic.label.toLowerCase()) ||
            (topic.id === 'Querpass' && (cleanTitle.includes('querpass') || cleanTitle.includes('querpässe'))) ||
            (topic.id === 'Spiel mit dem Ball' && (cleanTitle.includes('anbieteverhalten') || cleanTitle.includes('spielfortsetzung') || cleanTitle.includes('umschaltverhalten') || cleanTitle.includes('spiel mit dem ball'))) ||
            (topic.id === 'Standards' && (cleanTitle.includes('freistoß') || cleanTitle.includes('freistöße') || cleanTitle.includes('eckball') || cleanTitle.includes('eckbälle') || cleanTitle.includes('elfmeter') || cleanTitle.includes('standards')));

          if (matchesTitle) {
            conducted++;
            return;
          }

          const planPhases = plan.phaseExercises || plan.phases || {};
          const customExercises = plan.customPlanExercises || {};
          let foundInExercises = false;

          Object.values(planPhases).forEach(exIds => {
            if (foundInExercises) return;
            (exIds || []).forEach(exId => {
              const ex = customExercises[exId];
              if (!ex) return;
              if (ex.situativeSchwerpunkte && Array.isArray(ex.situativeSchwerpunkte)) {
                if (ex.situativeSchwerpunkte.some(s => 
                  s.toLowerCase().includes(topic.id.toLowerCase()) || 
                  s.toLowerCase().includes(topic.label.toLowerCase())
                )) {
                  foundInExercises = true;
                }
              }
              if (ex.situativerSchwerpunkt && (
                ex.situativerSchwerpunkt.toLowerCase().includes(topic.id.toLowerCase()) ||
                ex.situativerSchwerpunkt.toLowerCase().includes(topic.label.toLowerCase())
              )) {
                foundInExercises = true;
              }
            });
          });

          if (foundInExercises) conducted++;
        });

        // Also check if any meso plan micro day slots in this season match this topic if no history plans
        seasonMesoPlans.forEach(m => {
          m.weeks.forEach(w => {
            w.days.forEach(d => {
              const mTopic = (d.morningTopic || '').toLowerCase();
              const aTopic = (d.afternoonTopic || '').toLowerCase();
              const matchesM = mTopic.includes(topic.id.toLowerCase()) || mTopic.includes(topic.label.toLowerCase()) || (topic.id === 'Querpass' && mTopic.includes('querpass'));
              const matchesA = aTopic.includes(topic.id.toLowerCase()) || aTopic.includes(topic.label.toLowerCase()) || (topic.id === 'Querpass' && aTopic.includes('querpass'));
              if (matchesM && (d.slots?.morning === 'tw_only' || d.slots?.morning === 'tw_and_team')) {
                if (relevantPlans.length === 0) conducted++;
              }
              if (matchesA && (d.slots?.afternoon === 'tw_only' || d.slots?.afternoon === 'tw_and_team')) {
                if (relevantPlans.length === 0) conducted++;
              }
            });
          });
        });

        const completionPercent = targetSessions > 0 ? Math.round((conducted / targetSessions) * 100) : (conducted > 0 ? 100 : 0);

        let group = 'Zielverteidigung';
        if (['Flanken', 'Early Cross', 'Querpass', 'Verteidigen hinter der Abwehrkette'].includes(topic.id)) group = 'Raumverteidigung';
        else if (topic.id === 'Standards') group = 'Standards';
        else if (topic.id === 'Spiel mit dem Ball') group = 'Offensive & Spiel';
        else if (topic.id === 'Torwart-Athletik') group = 'Athletik';

        return {
          id: topic.id,
          topicLabel: topic.label,
          group,
          targetSessions,
          conductedSessions: conducted,
          completionPercent
        };
      });

      const totalPlanned = topicComparisons.reduce((sum, t) => sum + t.targetSessions, 0);
      const totalConducted = relevantPlans.length > 0 
        ? relevantPlans.length 
        : topicComparisons.reduce((sum, t) => sum + t.conductedSessions, 0);

      const mesoReflections: MesoReflectionData[] = seasonMesoPlans.map(m => ({
        mesoIndex: m.mesoIndex,
        mesoName: m.name,
        startDate: m.startDate,
        endDate: m.endDate,
        athleticFocus: m.athleticFocus,
        athleticStimulusAchieved: m.athleticStimulusAchieved,
        targetDefenseGoals: m.targetDefenseGoals,
        targetDefenseTechnique1: m.targetDefenseTechnique1,
        targetDefenseTechnique2: m.targetDefenseTechnique2,
        targetDefenseReflection: m.targetDefenseReflection,
        spaceDefenseGoals: m.spaceDefenseGoals,
        spaceDefenseTechnique3: m.spaceDefenseTechnique3,
        spaceDefenseTechnique4: m.spaceDefenseTechnique4,
        spaceDefenseReflection: m.spaceDefenseReflection,
        intensityFocusLearning: m.intensityFocusLearning
      }));

      await generateSeasonEvaluationPDF({
        seasonName: activeSeason.name,
        seasonStartYear: activeSeason.startYear,
        seasonEndYear: activeSeason.endYear,
        groupName: activeGroup.name,
        groupAgeCategory: activeGroup.ageCategory,
        evaluationType: 'full_season',
        halfYearLabel: `Saison-Gesamtauswertung (01.07.${activeSeason.startYear} – 30.06.${activeSeason.endYear})`,
        totalPlannedSessions: totalPlanned || totalSeasonSessions,
        totalConductedSessions: totalConducted,
        sessionsPerWeek: draftSessionsPerWeek,
        trainingWeeksPerYear: draftTrainingWeeksPerYear,
        topicComparisons,
        mesoReflections,
        clubName: clubName || undefined,
        clubLogoUrl: currentClub?.logoUrl || undefined
      });

      showToast(`Gesamte Saison-Auswertung erfolgreich als PDF erstellt!`, 'success');
    } catch (err) {
      console.error('Error exporting season evaluation PDF:', err);
      showToast('Fehler beim Erstellen der Saison-Auswertung.', 'error');
    } finally {
      setIsExportingSeasonPdf(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Season Conclusion & Archiving
  // --------------------------------------------------------------------------
  const handleCompleteSeason = async () => {
    if (!activeSeason) return;

    const startLimit = `${activeSeason.startYear}-07-01`;
    const endLimit = `${activeSeason.endYear}-06-30`;

    const seasonPlansToArchive = savedPlans.filter(p => {
      if (p.isArchived) return false;
      const rawDate = p.date || p.planDate || '';
      const pYMD = normalizeDateToYMD(rawDate);
      return Boolean(pYMD && pYMD >= startLimit && pYMD <= endLimit);
    });

    setConfirmDialog({
      title: 'Saison abschließen & archivieren',
      message: `Bist du sicher, dass du die "${activeSeason.name}" abschließen möchtest?\n\nAlle ${seasonPlansToArchive.length} Trainingseinheiten der Historie im Zeitraum 01.07.${activeSeason.startYear} bis 30.06.${activeSeason.endYear} werden ins Archiv verschoben.`,
      confirmText: 'Saison abschließen',
      isDanger: false,
      onConfirm: async () => {
        setIsCompletingSeason(true);
        try {
          const updatedPlans = savedPlans.map(p => {
            const rawDate = p.date || p.planDate || '';
            const pYMD = normalizeDateToYMD(rawDate);
            const inSeason = Boolean(pYMD && pYMD >= startLimit && pYMD <= endLimit);
            if (inSeason && !p.isArchived) {
              return {
                ...p,
                isArchived: true,
                archivedSeasonId: activeSeason.id,
                archivedAt: Date.now()
              };
            }
            return p;
          });

          // Save updated plans to Firestore
          await Promise.all(
            updatedPlans
              .filter(p => p.archivedSeasonId === activeSeason.id && p.id)
              .map(p => savePlanToFirestore(p, user))
          );

          const updatedSeason: PeriodizationSeason = {
            ...activeSeason,
            isCompleted: true,
            completedAt: Date.now(),
            updatedAt: Date.now()
          };

          await savePeriodizationSeasonToFirestore(updatedSeason, user, clubId);

          setSavedPlans(updatedPlans);
          setSeasons(prev => prev.map(s => s.id === activeSeason.id ? updatedSeason : s));

          showToast(`Saison "${activeSeason.name}" erfolgreich abgeschlossen. ${seasonPlansToArchive.length} Einheiten wurden ins Archiv verschoben.`, 'success');
        } catch (err) {
          console.error('Error completing season:', err);
          showToast('Fehler beim Abschließen der Saison.', 'error');
        } finally {
          setIsCompletingSeason(false);
        }
      }
    });
  };

  const handleResetSeasonCompletion = async () => {
    if (!activeSeason) return;

    const startLimit = `${activeSeason.startYear}-07-01`;
    const endLimit = `${activeSeason.endYear}-06-30`;

    const archivedSeasonPlans = savedPlans.filter(p => {
      if (!p.isArchived) return false;
      if (p.archivedSeasonId === activeSeason.id) return true;
      const rawDate = p.date || p.planDate || '';
      const pYMD = normalizeDateToYMD(rawDate);
      return Boolean(pYMD && pYMD >= startLimit && pYMD <= endLimit);
    });

    setConfirmDialog({
      title: 'Saison-Abschluss zurücksetzen',
      message: `Möchtest du den Abschluss der "${activeSeason.name}" wirklich zurücksetzen?\n\nAlle ${archivedSeasonPlans.length} archivierten Trainingseinheiten dieser Saison werden zurück in die Historie verschoben.`,
      confirmText: 'Abschluss aufheben',
      isDanger: false,
      onConfirm: async () => {
        setIsCompletingSeason(true);
        try {
          const updatedPlans = savedPlans.map(p => {
            const rawDate = p.date || p.planDate || '';
            const pYMD = normalizeDateToYMD(rawDate);
            const isThisSeason = p.archivedSeasonId === activeSeason.id || (Boolean(pYMD && pYMD >= startLimit && pYMD <= endLimit) && p.isArchived);
            if (isThisSeason) {
              return {
                ...p,
                isArchived: false,
                archivedSeasonId: undefined,
                archivedAt: undefined
              };
            }
            return p;
          });

          await Promise.all(
            updatedPlans
              .filter(p => p.id && archivedSeasonPlans.some(a => a.id === p.id))
              .map(p => savePlanToFirestore(p, user))
          );

          const updatedSeason: PeriodizationSeason = {
            ...activeSeason,
            isCompleted: false,
            completedAt: undefined,
            updatedAt: Date.now()
          };

          await savePeriodizationSeasonToFirestore(updatedSeason, user, clubId);

          setSavedPlans(updatedPlans);
          setSeasons(prev => prev.map(s => s.id === activeSeason.id ? updatedSeason : s));

          showToast(`Saison-Abschluss für "${activeSeason.name}" wurde aufgehoben.`, 'success');
        } catch (err) {
          console.error('Error resetting season completion:', err);
          showToast('Fehler beim Zurücksetzen des Saisonabschlusses.', 'error');
        } finally {
          setIsCompletingSeason(false);
        }
      }
    });
  };

  const handleSaveCustomAthleticStimuli = () => {
    if (editingStimuli.length === 0) {
      showToast('Mindestens ein Entwicklungsreiz muss definiert sein.', 'error');
      return;
    }
    setAthleticStimuli(editingStimuli);
    localStorage.setItem(`periodization_athletic_stimuli_${user?.uid || 'guest'}`, JSON.stringify(editingStimuli));
    setIsCustomizingStimuli(false);
    showToast('Athletische Entwicklungsreize individuell gespeichert.');
  };

  const handleResetAthleticStimuli = () => {
    setEditingStimuli(DEFAULT_ATHLETIC_STIMULI);
  };

  const handleSaveCustomLevels = () => {
    if (editingIntensities.length === 0 || editingVolumes.length === 0) {
      showToast('Mindestens eine Stufe muss jeweils definiert sein.', 'error');
      return;
    }
    setIntensityLevels(editingIntensities);
    setVolumeLevels(editingVolumes);
    localStorage.setItem(`periodization_intensity_levels_${user?.uid || 'guest'}`, JSON.stringify(editingIntensities));
    localStorage.setItem(`periodization_volume_levels_${user?.uid || 'guest'}`, JSON.stringify(editingVolumes));
    setIsCustomizingLevels(false);
    showToast('Intensitäts- & Volumenstufen individuell gespeichert.');
  };

  const handleResetLevels = () => {
    setEditingIntensities(DEFAULT_INTENSITY_LEVELS);
    setEditingVolumes(DEFAULT_VOLUME_LEVELS);
  };

  const handleUpdateMesoAthleticFocus = (focus: string) => {
    if (!activeMesoPlan) return;
    if (mesoValidationError) setMesoValidationError(null);
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      athleticFocus: focus,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleToggleForAdults = (forAdults: boolean) => {
    if (!activeMesoPlan) return;
    if (mesoValidationError) setMesoValidationError(null);
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      forAdults,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleUpdateMesoTargetDefenseGoals = (targetDefenseGoals: string) => {
    if (!activeMesoPlan) return;
    if (mesoValidationError) setMesoValidationError(null);
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      targetDefenseGoals,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleUpdateMesoSpaceDefenseGoals = (spaceDefenseGoals: string) => {
    if (!activeMesoPlan) return;
    if (mesoValidationError) setMesoValidationError(null);
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      spaceDefenseGoals,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleUpdateMesoTargetDefenseTechnique1 = (targetDefenseTechnique1: string) => {
    if (!activeMesoPlan) return;
    if (mesoValidationError) setMesoValidationError(null);
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      targetDefenseTechnique1,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleUpdateMesoTargetDefenseTechnique2 = (targetDefenseTechnique2: string) => {
    if (!activeMesoPlan) return;
    if (mesoValidationError) setMesoValidationError(null);
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      targetDefenseTechnique2,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleUpdateMesoSpaceDefenseTechnique3 = (spaceDefenseTechnique3: string) => {
    if (!activeMesoPlan) return;
    if (mesoValidationError) setMesoValidationError(null);
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      spaceDefenseTechnique3,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleUpdateMesoSpaceDefenseTechnique4 = (spaceDefenseTechnique4: string) => {
    if (!activeMesoPlan) return;
    if (mesoValidationError) setMesoValidationError(null);
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      spaceDefenseTechnique4,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  // Handler for Mesoplanung General Week Template Slot
  const handleUpdateGeneralTemplateSlot = (
    dayIndex: number,
    slotType: 'morning' | 'afternoon',
    block?: BuildingBlockType
  ) => {
    setGeneralWeekTemplateDraft(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      return {
        ...d,
        slots: {
          ...d.slots,
          [slotType]: block
        }
      };
    }));
  };

  // Save Mesoplanung (General Week Structure as default for Mikroplanung)
  const handleSaveMesoPlan = async () => {
    if (!canEditPeriodization) {
      showToast('Nur der dieser Trainingsgruppe zugeordnete Trainer oder Club-Admin darf die Periodisierung bearbeiten.', 'error');
      return;
    }
    if (!activeMesoPlan || !activeMacroPlan || !activeSeason || !activeGroup) return;

    // Validate mandatory fields in Mesoplanung
    const missingFields: string[] = [];
    if (!activeMesoPlan.forAdults && (!activeMesoPlan.athleticFocus || activeMesoPlan.athleticFocus.trim() === '')) {
      missingFields.push('Athletischer Entwicklungsreiz');
    }
    if (!activeMesoPlan.targetDefenseTechnique1 || activeMesoPlan.targetDefenseTechnique1.trim() === '') {
      missingFields.push('Technikfokus ZV 1');
    }
    if (!activeMesoPlan.spaceDefenseTechnique3 || activeMesoPlan.spaceDefenseTechnique3.trim() === '') {
      missingFields.push('Technikfokus RV 1');
    }
    if (!activeMesoPlan.targetDefenseGoals || activeMesoPlan.targetDefenseGoals.trim() === '') {
      missingFields.push('Konkrete Entwicklungsziele in der Zielverteidigung');
    }
    if (!activeMesoPlan.spaceDefenseGoals || activeMesoPlan.spaceDefenseGoals.trim() === '') {
      missingFields.push('Konkrete Entwicklungsziele in der Raumverteidigung');
    }

    if (missingFields.length > 0) {
      const errorMsg = `Bitte fülle alle Pflichtfelder aus: ${missingFields.join(', ')}.`;
      setMesoValidationError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    setMesoValidationError(null);

    // Apply generalWeekTemplateDraft as default pre-selection to unconfigured weeks only
    const updatedWeeks = activeMesoPlan.weeks.map(w => {
      if (w.isSaved) {
        return w;
      }
      return {
        ...w,
        days: w.days.map((d, dIdx) => ({
          ...d,
          slots: {
            morning: (d.morningTopic || d.slots?.morning) ? d.slots?.morning : (generalWeekTemplateDraft[dIdx]?.slots.morning ?? d.slots?.morning),
            afternoon: (d.afternoonTopic || d.slots?.afternoon) ? d.slots?.afternoon : (generalWeekTemplateDraft[dIdx]?.slots.afternoon ?? d.slots?.afternoon)
          },
          athleticMicrodosing: generalWeekTemplateDraft[dIdx]?.athleticMicrodosing || d.athleticMicrodosing
        }))
      };
    });

    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      macroPlanId: activeMacroPlan.id,
      seasonId: activeSeason.id,
      groupId: activeGroup.id,
      athleticFocus: activeMesoPlan.forAdults ? undefined : (activeMesoPlan.athleticFocus || 'unspezifisch'),
      generalWeekTemplate: [...generalWeekTemplateDraft],
      weeks: updatedWeeks,
      isSaved: true,
      isCompleted: true,
      updatedAt: Date.now()
    };

    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));

    try {
      await saveMesoPlanToFirestore(updatedMeso, user, clubId);
      showToast('Mesoplanung erfolgreich in der Datenbank gespeichert.', 'success');
    } catch (err) {
      console.error('Error saving meso plan:', err);
      showToast('Fehler beim Speichern des Mesoplans in der Datenbank.', 'error');
    }
  };

  const handleUpdateMicroDayField = async (
    weekNumber: number,
    dayIndex: number,
    field:
      | 'morningTopic'
      | 'morningTwIntensity'
      | 'morningTeamFocus'
      | 'morningFieldSize'
      | 'morningTeamIntensity'
      | 'morningTeamDurationMinutes'
      | 'morningOpponentInfo'
      | 'afternoonTopic'
      | 'afternoonTwIntensity'
      | 'afternoonTeamFocus'
      | 'afternoonFieldSize'
      | 'afternoonTeamIntensity'
      | 'afternoonTeamDurationMinutes'
      | 'afternoonOpponentInfo',
    value: string | number
  ) => {
    if (!activeMesoPlan) return;
    if (microValidationError) setMicroValidationError(null);
    const updatedWeeks = activeMesoPlan.weeks.map(w => {
      if (w.weekNumber !== weekNumber) return w;
      const updatedDays = w.days.map((d, idx) => {
        if (idx !== dayIndex) return d;
        return {
          ...d,
          [field]: value
        };
      });
      return { ...w, days: updatedDays };
    });

    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      weeks: updatedWeeks,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
    try {
      await saveMesoPlanToFirestore(updatedMeso, user, clubId);
    } catch (err) {
      console.error('Error updating micro field:', err);
    }
  };

  // Handlers for Mikroplanung (6-Wochen Zahlenstrahl & Detailplanung)
  const handleUpdateMicroSlot = async (
    weekNumber: number,
    dayIndex: number,
    slotType: 'morning' | 'afternoon',
    newBlock?: BuildingBlockType
  ) => {
    if (!activeMesoPlan) return;
    if (microValidationError) setMicroValidationError(null);

    const updatedWeeks = activeMesoPlan.weeks.map(w => {
      if (w.weekNumber !== weekNumber) return w;
      const updatedDays = w.days.map((d, idx) => {
        if (idx !== dayIndex) return d;
        return {
          ...d,
          slots: {
            ...d.slots,
            [slotType]: newBlock
          }
        };
      });
      return { ...w, days: updatedDays };
    });

    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      weeks: updatedWeeks,
      updatedAt: Date.now()
    };

    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));

    try {
      await saveMesoPlanToFirestore(updatedMeso, user, clubId);
    } catch (err) {
      console.error('Error updating micro slot:', err);
    }
  };

  const handleUpdateMicroDayMicrodosing = async (
    weekNumber: number,
    dayIndex: number,
    microdosing: string
  ) => {
    if (!activeMesoPlan) return;
    if (microValidationError) setMicroValidationError(null);
    const updatedWeeks = activeMesoPlan.weeks.map(w => {
      if (w.weekNumber !== weekNumber) return w;
      const updatedDays = w.days.map((d, idx) => {
        if (idx !== dayIndex) return d;
        return {
          ...d,
          athleticMicrodosing: microdosing
        };
      });
      return { ...w, days: updatedDays };
    });

    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      weeks: updatedWeeks,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
    try {
      await saveMesoPlanToFirestore(updatedMeso, user, clubId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateWeekIntensity = (weekNumber: number, intensity: string) => {
    if (!activeMesoPlan) return;
    const updatedWeeks = activeMesoPlan.weeks.map(w => {
      if (w.weekNumber !== weekNumber) return w;
      return { ...w, intensity };
    });
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      weeks: updatedWeeks,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleUpdateWeekVolume = (weekNumber: number, volume: string) => {
    if (!activeMesoPlan) return;
    const updatedWeeks = activeMesoPlan.weeks.map(w => {
      if (w.weekNumber !== weekNumber) return w;
      return { ...w, volume };
    });
    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      weeks: updatedWeeks,
      isCompleted: false,
      updatedAt: Date.now()
    };
    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));
  };

  const handleSaveMicroPlan = async () => {
    if (!canEditPeriodization) {
      showToast('Nur der dieser Trainingsgruppe zugeordnete Trainer oder Club-Admin darf die Periodisierung bearbeiten.', 'error');
      return;
    }
    if (!activeMesoPlan) return;

    const currentWeekData = activeMesoPlan.weeks?.find(w => w.weekNumber === activeMicroWeekIndex);
    if (!currentWeekData) return;

    // Validate mandatory fields in the active week (Thema & Intensität der TW im TW-Training)
    const missingFields: string[] = [];
    currentWeekData.days.forEach(d => {
      // Vormittag
      if (d.slots?.morning === 'tw_and_team' || d.slots?.morning === 'tw_only') {
        if (!d.morningTopic || d.morningTopic.trim() === '') {
          missingFields.push(`Thema (${d.dayName} Vormittag)`);
        }
        if (!d.morningTwIntensity || String(d.morningTwIntensity).trim() === '') {
          missingFields.push(`Intensität der TW (${d.dayName} Vormittag)`);
        }
      }
      // Nachmittag
      if (d.slots?.afternoon === 'tw_and_team' || d.slots?.afternoon === 'tw_only') {
        if (!d.afternoonTopic || d.afternoonTopic.trim() === '') {
          missingFields.push(`Thema (${d.dayName} Nachmittag)`);
        }
        if (!d.afternoonTwIntensity || String(d.afternoonTwIntensity).trim() === '') {
          missingFields.push(`Intensität der TW (${d.dayName} Nachmittag)`);
        }
      }
    });

    if (missingFields.length > 0) {
      const errorMsg = `Bitte fülle alle Pflichtfelder aus: ${missingFields.join(', ')}.`;
      setMicroValidationError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    setMicroValidationError(null);

    const updatedWeeks = activeMesoPlan.weeks.map(w => {
      if (w.weekNumber === activeMicroWeekIndex) {
        return { ...w, isSaved: true };
      }
      return w;
    });

    const updatedMeso: MesoPlan = {
      ...activeMesoPlan,
      weeks: updatedWeeks,
      updatedAt: Date.now()
    };

    setMesoPlans(prev => prev.map(m => m.id === activeMesoPlan.id ? updatedMeso : m));

    try {
      await saveMesoPlanToFirestore(updatedMeso, user, clubId);
      showToast(`Mikroplan für Woche ${activeMicroWeekIndex} erfolgreich gespeichert!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Speichern der Mikroplanung.', 'error');
    }
  };

  const handleExportMicroPdf = async () => {
    if (!activeSeason || !activeGroup || !activeMesoPlan) {
      showToast('Keine aktive Saison, Trainingsgruppe oder Mesoplanung ausgewählt.', 'error');
      return;
    }

    const currentWeekData = activeMesoPlan.weeks?.find(w => w.weekNumber === activeMicroWeekIndex);
    if (!currentWeekData) {
      showToast('Keine Daten für die aktive Woche gefunden.', 'error');
      return;
    }

    setIsExportingMicroPdf(true);
    try {
      await generateMicroPlanPDF({
        seasonName: activeSeason.name,
        seasonStartYear: activeSeason.startYear,
        seasonEndYear: activeSeason.endYear,
        groupName: activeGroup.name,
        groupAgeCategory: activeGroup.ageCategory,
        halfYear: selectedHalfYear,
        mesoIndex: activeMesoPlan.mesoIndex,
        mesoName: activeMesoPlan.name,
        weekNumber: activeMicroWeekIndex,
        weekStartDate: currentWeekData.days?.[0]?.date,
        weekEndDate: currentWeekData.days?.[6]?.date,
        weekIntensity: currentWeekData.intensity || DEFAULT_WEEK_SETTINGS[activeMicroWeekIndex]?.intensity,
        weekVolume: currentWeekData.volume || DEFAULT_WEEK_SETTINGS[activeMicroWeekIndex]?.volume,
        athleticFocus: activeMesoPlan.athleticFocus,
        forAdults: Boolean(activeMesoPlan.forAdults),
        targetDefenseGoals: activeMesoPlan.targetDefenseGoals,
        targetDefenseTechnique1: activeMesoPlan.targetDefenseTechnique1,
        targetDefenseTechnique2: activeMesoPlan.targetDefenseTechnique2,
        spaceDefenseGoals: activeMesoPlan.spaceDefenseGoals,
        spaceDefenseTechnique3: activeMesoPlan.spaceDefenseTechnique3,
        spaceDefenseTechnique4: activeMesoPlan.spaceDefenseTechnique4,
        days: currentWeekData.days || [],
        clubName: currentClub?.name || clubName || undefined,
        clubLogoUrl: currentClub?.logoUrl || undefined
      });
      showToast(`PDF für Woche ${activeMicroWeekIndex} erfolgreich erstellt!`, 'success');
    } catch (err) {
      console.error('Error generating Micro Plan PDF:', err);
      showToast('Fehler beim Erstellen der PDF.', 'error');
    } finally {
      setIsExportingMicroPdf(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: Main Periodization View
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER: SAISON-AUSWAHL & GRUPPEN-KONFIGURATION                 */}
      {/* ===================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700">
                  Ausbildungs-Periodisierung
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Saison • Makro • Meso • Mikro
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Periodisierungs- & Saisonplaner
              </h2>
            </div>
          </div>

          {/* Top Right: Season Selector + Action Buttons (Stacked Vertically) */}
          <div className="flex flex-col sm:items-end gap-2.5 w-full sm:w-auto">
            {/* 1. Aktive Saison Dropdown */}
            {seasons.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-2xl px-3 py-1.5 shadow-md w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  1. Aktive Saison:
                </span>
                <select
                  value={selectedSeasonId}
                  onChange={e => setSelectedSeasonId(e.target.value)}
                  className="bg-transparent border-0 text-xs font-extrabold text-white focus:outline-none focus:ring-0 cursor-pointer pr-1"
                >
                  {seasons.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name} (01.07.{s.startYear} – 30.06.{s.endYear}){s.isCompleted ? ' (abgeschlossen)' : ''}
                    </option>
                  ))}
                </select>
                {activeSeason?.isCompleted && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60 whitespace-nowrap">
                    Abgeschlossen
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons Row: Gesamte Saison auswerten (links) | Saison abschließen (Mitte) | Neue Saison anlegen (rechts) */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Button: Gesamte Saison auswerten */}
              {seasons.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportSeasonEvaluationPdf}
                  disabled={isExportingSeasonPdf || !activeSeason}
                  className="px-3.5 py-2.5 rounded-xl border border-purple-800/70 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-purple-100 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm flex-1 sm:flex-initial whitespace-nowrap"
                  title="Soll/Ist-Vergleich und Reflexionen für die gesamte Saison (Juli – Juni) als PDF exportieren"
                >
                  {isExportingSeasonPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saison-Auswertung...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Gesamte Saison auswerten</span>
                    </>
                  )}
                </button>
              )}

              {/* Button: Saison abschließen / Saisonabschluss zurücksetzen */}
              {activeSeason && (
                !activeSeason.isCompleted ? (
                  <button
                    type="button"
                    onClick={handleCompleteSeason}
                    disabled={isCompletingSeason}
                    className="px-3.5 py-2.5 rounded-xl border border-amber-500/50 bg-amber-950/30 hover:bg-amber-900/50 text-amber-300 hover:text-amber-100 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm flex-1 sm:flex-initial whitespace-nowrap"
                    title="Schließt die Saison ab und verschiebt alle Trainingseinheiten dieser Saison ins Archiv"
                  >
                    {isCompletingSeason ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Wird abgeschlossen...</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5 text-amber-400" />
                        <span>Saison abschließen</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetSeasonCompletion}
                    disabled={isCompletingSeason}
                    className="px-3.5 py-2.5 rounded-xl border border-blue-500/50 bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 hover:text-blue-100 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm flex-1 sm:flex-initial whitespace-nowrap"
                    title="Setzt den Abschluss der Saison zurück und holt die archivierten Einheiten zurück in die Historie"
                  >
                    {isCompletingSeason ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Wird zurückgesetzt...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                        <span>Saisonabschluss zurücksetzen</span>
                      </>
                    )}
                  </button>
                )
              )}

              {/* Button: Neue Saison anlegen (ganz rechts) */}
              <button
                type="button"
                onClick={() => {
                  if (!hasProAccess) {
                    showToast('Die Erstellung neuer Saisons ist ein PRO-Feature.', 'error');
                    return;
                  }
                  if (activeSeason && !activeSeason.isCompleted) return;
                  setIsSeasonModalOpen(true);
                }}
                disabled={Boolean(!hasProAccess || (activeSeason && !activeSeason.isCompleted))}
                className={cn(
                  "px-4 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 flex-shrink-0 shadow-lg flex-1 sm:flex-initial whitespace-nowrap",
                  (!hasProAccess || (activeSeason && !activeSeason.isCompleted))
                    ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-50 shadow-none"
                    : "text-white bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 active:scale-95 shadow-indigo-950/60 cursor-pointer"
                )}
                title={!hasProAccess ? "Nur mit PRO-Lizenz verfügbar" : (activeSeason && !activeSeason.isCompleted ? "Schließe zuerst die aktive Saison ab, um eine neue Saison anzulegen." : "Eine neue Saison anlegen")}
              >
                {!hasProAccess ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>Neue Saison anlegen</span>
              </button>
            </div>
          </div>
        </div>

        {/* If no season exists yet, render guided setup banner */}
        {seasons.length === 0 ? (
          <div className="bg-slate-950 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="text-lg font-black text-white">
                1. Saison anlegen (Juli bis Juni)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Eine Saison läuft immer vom <strong>01. Juli bis zum 30. Juni</strong> des Folgejahres. Wähle das Startjahr, um die Saison anzulegen:
              </p>
            </div>

            <form onSubmit={handleSaveNewSeason} className="max-w-md mx-auto space-y-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Startjahr der Saison *
                </label>
                <select
                  value={seasonStartYear}
                  onChange={e => setSeasonStartYear(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-extrabold text-white focus:outline-none focus:border-indigo-500"
                >
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                    <option key={y} value={y}>
                      Saison {y}/{y + 1} (01.07.{y} – 30.06.{y + 1})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-extrabold text-xs text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Saison {seasonStartYear}/{seasonStartYear + 1} anlegen</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Global Controls Grid (4 Spalten nebeneinander) */}
            {/* Top Bar: Trainingsgruppen-Reiter (1-Klick-Auswahl) & Feedback-Button */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 pr-1">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider whitespace-nowrap">
                      Trainingsgruppe:
                    </span>
                  </div>

                  {groups.length === 0 ? (
                    <div className="text-xs text-slate-500 py-1">Keine Gruppen vorhanden.</div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                      {groups.map(g => {
                        const isSelected = g.id === selectedGroupId;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedGroupId(g.id)}
                            className={cn(
                              "px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 active:scale-95",
                              isSelected
                                ? "bg-purple-600 text-white shadow-md shadow-purple-950/60 border border-purple-400/40"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent"
                            )}
                          >
                            <span>{g.name}</span>
                            {g.ageCategory && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded font-bold",
                                isSelected ? "bg-purple-900/80 text-purple-200" : "bg-slate-800 text-slate-400"
                              )}>
                                {g.ageCategory}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Feedback & Trainer-Austausch Button */}
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 border bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 hover:text-purple-100 border-purple-700/60 shadow-md shadow-purple-950/50 cursor-pointer active:scale-95 flex-shrink-0"
                  title="Periodisierungs-Feedback und methodische Anmerkungen einsehen oder hinzufügen"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Feedback & Anmerkungen</span>
                  {totalFeedbacksCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-500 text-white font-mono">
                      {totalFeedbacksCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Stage Navigation Pills */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveStage('macro')}
                className={cn(
                  "p-3 rounded-2xl border text-left transition flex items-center gap-3 active:scale-98 cursor-pointer",
                  activeStage === 'macro'
                    ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-950/60 font-extrabold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeStage === 'macro' ? "bg-purple-700/80 border-purple-400/40 text-white" : "bg-slate-900 border-slate-800 text-purple-400"
                )}>
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block">1. Makroplanung</span>
                  <span className="text-[10px] opacity-80 block">Halbjahr ({totalHalfYearSessions} TE)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleSelectMesoStage}
                className={cn(
                  "p-3 rounded-2xl border text-left transition flex items-center gap-3 active:scale-98",
                  activeStage === 'meso'
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-950/60 font-extrabold cursor-pointer"
                    : (!activeMacroPlan || !isMacroSaved)
                      ? "bg-slate-950/50 border-slate-800/60 text-slate-600 cursor-not-allowed"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 cursor-pointer"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeStage === 'meso' ? "bg-indigo-700/80 border-indigo-400/40 text-white" : "bg-slate-900 border-slate-800 text-indigo-400"
                )}>
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block">2. Mesoplanung</span>
                  <span className="text-[10px] opacity-80 block">Allgemeine Wochenstruktur</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleSelectMicroStage}
                className={cn(
                  "p-3 rounded-2xl border text-left transition flex items-center gap-3 active:scale-98",
                  activeStage === 'micro'
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/60 font-extrabold cursor-pointer"
                    : (!activeMesoPlan || !activeMesoPlan.isCompleted)
                      ? "bg-slate-950/50 border-slate-800/60 text-slate-600 cursor-not-allowed"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 cursor-pointer"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeStage === 'micro' ? "bg-emerald-700/80 border-emerald-400/40 text-white" : "bg-slate-900 border-slate-800 text-emerald-400"
                )}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block">3. Mikroplanung</span>
                  <span className="text-[10px] opacity-80 block">6-Wochen Zahlenstrahl</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* When a season exists, render the active planning stages */}
      {seasons.length > 0 && (
        <>
          {/* Read-Only Lock Banner when user is not authorized to edit this group's periodization */}
          {!canEditPeriodization && activeGroup && (
            <div className={cn(
              "p-4 rounded-2xl text-xs flex items-center gap-3",
              !hasProAccess
                ? "bg-purple-500/10 border border-purple-500/30 text-purple-200"
                : "bg-amber-500/10 border border-amber-500/30 text-amber-200"
            )}>
              <div className={cn(
                "p-2.5 rounded-xl flex-shrink-0",
                !hasProAccess ? "bg-purple-500/20 text-purple-300" : "bg-amber-500/20 text-amber-300"
              )}>
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-white flex items-center gap-2">
                  <span>
                    {!hasProAccess ? 'PRO-Funktion: Periodisierung (Nur Lesezugriff)' : 'Nur Lesezugriff für Periodisierung'}
                  </span>
                  {!hasProAccess ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold uppercase tracking-wider">
                      Einzelnutzer Standard
                    </span>
                  ) : activeGroup.assignedCoachName ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold">
                      Zugewiesener Trainer: {activeGroup.assignedCoachName} ({activeGroup.assignedCoachEmail || '–'})
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                      Kein Trainer zugewiesen
                    </span>
                  )}
                </div>
                <p className={cn("text-[11px]", !hasProAccess ? "text-purple-300/80" : "text-amber-300/80")}>
                  {!hasProAccess
                    ? 'Die Erstellung und Anpassung von Jahres- und Saisonplänen (Makro-, Meso- & Mikrozyklen) ist für Einzelnutzer PRO und Vereinsaccounts freigeschaltet. Du kannst bestehende Pläne ansehen und als PDF exportieren.'
                    : 'Du kannst alle Makro-, Meso- und Mikropläne dieser Trainingsgruppe ansehen und als PDF exportieren. Änderungen und Speichern sind dem zugewiesenen lizenzierten Trainer und Club-Admins vorbehalten.'}
                </p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 1. STAGE: HALBJÄHRLICHE MAKROPLANUNG (AUSBILDUNGSORIENTIERT)       */}
          {/* ================================================================= */}
          {activeStage === 'macro' && (
            <MacroPlanEditor
              readOnly={!canEditPeriodization}
              selectedHalfYear={selectedHalfYear}
              setSelectedHalfYear={setSelectedHalfYear}
              activeSeason={activeSeason}
              activeGroup={activeGroup}
              activeMacroPlan={activeMacroPlan}
              draftSessionsPerWeek={draftSessionsPerWeek}
              setDraftSessionsPerWeek={setDraftSessionsPerWeek}
              draftTrainingWeeksPerYear={draftTrainingWeeksPerYear}
              setDraftTrainingWeeksPerYear={setDraftTrainingWeeksPerYear}
              totalHalfYearSessions={totalHalfYearSessions}
              allocatedMacroSessions={allocatedMacroSessions}
              remainingMacroSessions={remainingMacroSessions}
              macroTopicDraft={macroTopicDraft}
              handleTopicCountChange={handleTopicCountChange}
              macroValidationError={macroValidationError}
              setMacroValidationError={setMacroValidationError}
              isMacroSaved={isMacroSaved}
              handleSaveMacroPlan={handleSaveMacroPlan}
              handleSelectMesoStage={handleSelectMesoStage}
              handleExportMacroPdf={handleExportMacroPdf}
              isExportingPdf={isExportingPdf}
              hasSavedMacroPlanHalfYear1={hasSavedMacroPlanHalfYear1}
              hasSavedMacroPlanHalfYear2={hasSavedMacroPlanHalfYear2}
              handleExportHalfYearEvaluationPdf={handleExportHalfYearEvaluationPdf}
              isExportingHalfYearPdf={isExportingHalfYearPdf}
            />
          )}

          {/* ================================================================= */}
          {/* 2. STAGE: MESOPLANUNG (ALLGEMEINE WOCHENSTRUKTUR ALS VORAUSWAHL)  */}
          {/* ================================================================= */}
          {activeStage === 'meso' && (
            <MesoPlanEditor
              readOnly={!canEditPeriodization}
              selectedHalfYear={selectedHalfYear}
              currentMesoPlans={currentMesoPlans}
              selectedMesoId={selectedMesoId}
              setSelectedMesoId={setSelectedMesoId}
              activeMesoPlan={activeMesoPlan}
              activeMesoStatus={activeMesoStatus}
              handleDeleteMesoPlan={handleDeleteMesoPlan}
              isDeletingMesoPlan={isDeletingMesoPlan}
              executeCreateNewMesoPlan={executeCreateNewMesoPlan}
              handleCreateNewMesoPlan={handleCreateNewMesoPlan}
              setReflectingMesoPlan={setReflectingMesoPlan}
              setIsCreatingNextAfterReflection={setIsCreatingNextAfterReflection}
              setIsReflectionModalOpen={setIsReflectionModalOpen}
              isGeneralWeekStructureOpen={isGeneralWeekStructureOpen}
              setIsGeneralWeekStructureOpen={setIsGeneralWeekStructureOpen}
              generalWeekTemplateDraft={generalWeekTemplateDraft}
              handleUpdateGeneralTemplateSlot={handleUpdateGeneralTemplateSlot}
              selectedBlockBrush={selectedBlockBrush}
              setSelectedBlockBrush={setSelectedBlockBrush}
              draggedBlock={draggedBlock}
              setDraggedBlock={setDraggedBlock}
              athleticStimuli={athleticStimuli}
              handleUpdateMesoAthleticFocus={handleUpdateMesoAthleticFocus}
              handleToggleForAdults={handleToggleForAdults}
              setIsCustomizingStimuli={setIsCustomizingStimuli}
              isMesoSaved={isMesoSaved}
              handleUpdateMesoTargetDefenseGoals={handleUpdateMesoTargetDefenseGoals}
              handleUpdateMesoTargetDefenseTechnique1={handleUpdateMesoTargetDefenseTechnique1}
              handleUpdateMesoTargetDefenseTechnique2={handleUpdateMesoTargetDefenseTechnique2}
              handleUpdateMesoSpaceDefenseGoals={handleUpdateMesoSpaceDefenseGoals}
              handleUpdateMesoSpaceDefenseTechnique3={handleUpdateMesoSpaceDefenseTechnique3}
              handleUpdateMesoSpaceDefenseTechnique4={handleUpdateMesoSpaceDefenseTechnique4}
              intensityLevels={intensityLevels}
              volumeLevels={volumeLevels}
              setIsCustomizingLevels={setIsCustomizingLevels}
              activeMesoWeekIndex={activeMesoWeekIndex}
              setActiveMesoWeekIndex={setActiveMesoWeekIndex}
              handleUpdateWeekIntensity={handleUpdateWeekIntensity}
              handleUpdateWeekVolume={handleUpdateWeekVolume}
              isPeriodizationWaveOpen={isPeriodizationWaveOpen}
              setIsPeriodizationWaveOpen={setIsPeriodizationWaveOpen}
              mesoValidationError={mesoValidationError}
              setMesoValidationError={setMesoValidationError}
              handleExportMesoPdf={handleExportMesoPdf}
              isExportingMesoPdf={isExportingMesoPdf}
              handleSaveMesoPlan={handleSaveMesoPlan}
              handleSelectMicroStage={handleSelectMicroStage}
              getMesoPlanStatus={getMesoPlanStatus}
            />
          )}

          {/* ================================================================= */}
          {/* 3. STAGE: MIKROPLANUNG (DETAILPLANUNG DER WOCHEN)                  */}
          {/* ================================================================= */}
          {activeStage === 'micro' && (
            <MicroPlanGrid
              readOnly={!canEditPeriodization}
              activeMesoPlan={activeMesoPlan}
              activeMacroPlan={activeMacroPlan}
              allGroupMesoPlans={allGroupMesoPlans}
              macroPlans={macroPlans}
              getMesoPlanStatus={getMesoPlanStatus}
              onSelectMicroWeek={handleSelectMicroWeek}
              activeMicroWeekIndex={activeMicroWeekIndex}
              setActiveMicroWeekIndex={setActiveMicroWeekIndex}
              microValidationError={microValidationError}
              setMicroValidationError={setMicroValidationError}
              intensityLevels={intensityLevels}
              volumeLevels={volumeLevels}
              selectedBlockBrush={selectedBlockBrush}
              setSelectedBlockBrush={setSelectedBlockBrush}
              draggedBlock={draggedBlock}
              setDraggedBlock={setDraggedBlock}
              handleUpdateMicroSlot={handleUpdateMicroSlot}
              handleUpdateMicroDayField={handleUpdateMicroDayField}
              handleUpdateMicroDayMicrodosing={handleUpdateMicroDayMicrodosing}
              topicStats={topicStats}
              athleticStimuli={athleticStimuli}
              handleExportMicroPdf={handleExportMicroPdf}
              isExportingMicroPdf={isExportingMicroPdf}
              handleSaveMicroPlan={handleSaveMicroPlan}
              onNavigateToPlanner={onNavigateToPlanner}
              setActiveStage={setActiveStage}
              groupWorkload={microGroupWorkload}
              onOpenWorkload={() => setIsWorkloadModalOpen(true)}
            />
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NEUE SAISON ANLEGEN                                            */}
      {/* ===================================================================== */}
      {isSeasonModalOpen && (
        <div 
          onClick={() => setIsSeasonModalOpen(false)}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Neue Saison anlegen</h3>
                  <p className="text-[11px] text-slate-400">Juli bis Juni des Folgejahres</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsSeasonModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSeason} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Startjahr der Saison *</label>
                <select
                  value={seasonStartYear}
                  onChange={e => setSeasonStartYear(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                >
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                    <option key={y} value={y}>
                      Saison {y}/{y + 1} (Juli {y} – Juni {y + 1})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>💡 Eine Saison läuft immer offiziell vom <strong>01. Juli bis zum 30. Juni</strong> des Folgejahres.</p>
                <p>Standardmäßig werden für jede Trainingsgruppe <strong>2 Torwart-Trainingseinheiten pro Woche</strong> (80 TE/Saison) vorkonfiguriert.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSeasonModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 font-bold transition cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-extrabold transition shadow shadow-indigo-950 cursor-pointer"
                >
                  Saison anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ATHLETISCHE ENTWICKLUNGSREIZE ANPASSEN (INDIVIDUELL)           */}
      {/* ===================================================================== */}
      {isCustomizingStimuli && (
        <div 
          onClick={() => setIsCustomizingStimuli(false)}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Athletische Entwicklungsreize anpassen</h3>
                  <p className="text-xs text-slate-400">Individuelle Bezeichnungen und Fokus-Beschreibungen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizingStimuli(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[50vh]">
              {/* List of existing stimuli */}
              <div className="space-y-3">
                {editingStimuli.map((st, idx) => (
                  <div key={st.id || idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={st.name}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingStimuli(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-white w-full focus:outline-none focus:border-indigo-500"
                        placeholder="Bezeichnung des Reizes..."
                      />
                      {editingStimuli.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditingStimuli(prev => prev.filter((_, i) => i !== idx))}
                          className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/60 cursor-pointer flex-shrink-0"
                          title="Reiz entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={st.focus}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingStimuli(prev => prev.map((item, i) => i === idx ? { ...item, focus: val } : item));
                      }}
                      rows={4}
                      className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-y"
                      placeholder="Fokus-Beschreibung..."
                    />
                  </div>
                ))}
              </div>

              {/* Add New Stimulus Form */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-700/40 space-y-2">
                <span className="text-xs font-black text-indigo-300 block">+ Neuen Reiz hinzufügen</span>
                <input
                  type="text"
                  value={newStimulusName}
                  onChange={e => setNewStimulusName(e.target.value)}
                  placeholder="z. B. Maximalkraft / Hypertrophie..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <textarea
                  value={newStimulusFocus}
                  onChange={e => setNewStimulusFocus(e.target.value)}
                  placeholder="Fokus: Beschreibung der Anpassungen und Schwerpunkte..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newStimulusName.trim()) return;
                    setEditingStimuli(prev => [
                      ...prev,
                      {
                        id: `custom_${Date.now()}`,
                        name: newStimulusName.trim(),
                        focus: newStimulusFocus.trim() || `Fokus: ${newStimulusName.trim()}`
                      }
                    ]);
                    setNewStimulusName('');
                    setNewStimulusFocus('');
                  }}
                  disabled={!newStimulusName.trim()}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition cursor-pointer"
                >
                  Reiz zur Liste hinzufügen
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetAthleticStimuli}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Auf Standard zurücksetzen</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomizingStimuli(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomAthleticStimuli}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-950 cursor-pointer"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: INTENSITÄTS- & VOLUMENSTUFEN ANPASSEN (INDIVIDUELL)            */}
      {/* ===================================================================== */}
      {isCustomizingLevels && (
        <div 
          onClick={() => setIsCustomizingLevels(false)}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Intensitäts- & Volumenstufen anpassen</h3>
                  <p className="text-xs text-slate-400">Individuelle Abstufungen für deine Trainingswochen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizingLevels(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-1 flex-1 max-h-[50vh]">
              {/* Column 1: Intensität */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-black text-white block">Intensitäts-Stufen</span>
                <div className="space-y-2">
                  {editingIntensities.map((lvl, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={lvl}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingIntensities(prev => prev.map((item, i) => i === idx ? val : item));
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white w-full focus:outline-none focus:border-indigo-500"
                      />
                      {editingIntensities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditingIntensities(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/60 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-850">
                  <input
                    type="text"
                    value={newIntensityLevel}
                    onChange={e => setNewIntensityLevel(e.target.value)}
                    placeholder="Neue Stufe..."
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white w-full focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newIntensityLevel.trim()) return;
                      setEditingIntensities(prev => [...prev, newIntensityLevel.trim()]);
                      setNewIntensityLevel('');
                    }}
                    disabled={!newIntensityLevel.trim()}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 cursor-pointer flex-shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Column 2: Volumen */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-black text-white block">Volumen-Stufen</span>
                <div className="space-y-2">
                  {editingVolumes.map((vol, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vol}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingVolumes(prev => prev.map((item, i) => i === idx ? val : item));
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white w-full focus:outline-none focus:border-indigo-500"
                      />
                      {editingVolumes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditingVolumes(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/60 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-850">
                  <input
                    type="text"
                    value={newVolumeLevel}
                    onChange={e => setNewVolumeLevel(e.target.value)}
                    placeholder="Neue Stufe..."
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white w-full focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newVolumeLevel.trim()) return;
                      setEditingVolumes(prev => [...prev, newVolumeLevel.trim()]);
                      setNewVolumeLevel('');
                    }}
                    disabled={!newVolumeLevel.trim()}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 cursor-pointer flex-shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetLevels}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Auf Standard zurücksetzen</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomizingLevels(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomLevels}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-950 cursor-pointer"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meso Reflection Modal */}
      {reflectingMesoPlan && (
        <MesoReflectionModal
          isOpen={isReflectionModalOpen}
          onClose={() => {
            setIsReflectionModalOpen(false);
            setReflectingMesoPlan(null);
            setIsCreatingNextAfterReflection(false);
          }}
          mesoPlan={reflectingMesoPlan}
          onSaveReflection={handleSaveMesoReflectionAndCreateNext}
        />
      )}

      {/* Belastungssteuerung & ACWR Modal */}
      <WorkloadManagementModal
        isOpen={isWorkloadModalOpen}
        onClose={() => setIsWorkloadModalOpen(false)}
        groups={groups}
        savedPlans={savedPlans}
        matchPlaytimes={matchPlaytimes}
        mesoPlans={mesoPlans}
        initialGroupId={selectedGroupId}
        referenceDate={activeStage === 'micro' ? microPreviousWeekDate : undefined}
      />

      {/* In-App Confirmation Modal */}
      {confirmDialog && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmDialog(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-2xl border flex items-center justify-center flex-shrink-0",
                confirmDialog.isDanger !== false 
                  ? "bg-rose-500/20 border-rose-500/30 text-rose-400"
                  : "bg-amber-500/20 border-amber-500/30 text-amber-400"
              )}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">{confirmDialog.title}</h3>
                <p className="text-[11px] text-slate-400">Sicherheitsbestätigung erforderlich</p>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              {confirmDialog.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                {confirmDialog.cancelText || 'Abbrechen'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  action();
                }}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-lg cursor-pointer",
                  confirmDialog.isDanger !== false 
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-950/60" 
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/60"
                )}
              >
                {confirmDialog.confirmText || 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Periodization Feedback Modal */}
      <PeriodizationFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        activeGroup={activeGroup}
        activeMacroPlan={activeMacroPlan}
        activeMesoPlan={activeMesoPlan}
        activeStage={activeStage}
        showToast={showToast}
      />
    </div>
  );
};
