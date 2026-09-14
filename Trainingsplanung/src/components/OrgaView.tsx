import React, { useState, useEffect, useMemo } from 'react';
import { 
  type TrainingGroup, 
  type Player, 
  type PlayerAbsence, 
  type AbsenceReason,
  type PlayerEvaluation, 
  type EvaluationCategory,
  type SkillDefinition,
  type AthleticTestMetrics,
  type BiologicalMaturityMetrics,
  type TrainingPlan,
  type Exercise,
  type PlayerMatchPlaytime,
  type PlayerFeedbackTalk,
  type MatchLocation,
  type MatchType,
  ABSENCE_REASONS,
  SKILL_DEFINITIONS,
  MATCH_TEAMS,
  MATCH_TYPES,
  MATCH_GRADE_OPTIONS,
  getEvaluationScaleLevels,
  getSkillScaleLevels
} from '../types';
import { 
  subscribeUserTrainingGroups,
  saveTrainingGroupToFirestore,
  deleteTrainingGroupFromFirestore,
  subscribeUserAbsences,
  saveAbsenceToFirestore,
  deleteAbsenceFromFirestore,
  subscribeUserEvaluations,
  savePlayerEvaluationToFirestore,
  deletePlayerEvaluationFromFirestore,
  subscribeUserMatchPlaytimes,
  saveMatchPlaytimeToFirestore,
  deleteMatchPlaytimeFromFirestore,
  subscribeUserFeedbackTalks,
  saveFeedbackTalkToFirestore,
  deleteFeedbackTalkFromFirestore,
  subscribeUserPlans,
  subscribeExercises,
  getLocalTrainingGroups,
  getLocalPlayerAbsences,
  getLocalPlayerEvaluations,
  getLocalMatchPlaytimes,
  getLocalFeedbackTalks
} from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';
import { TrainingStructureView } from './TrainingStructureView';
import { OrgaStatsView } from './OrgaStatsView';
import { PeriodizationView } from './PeriodizationView';
import { BodyPartSelectorModal } from './BodyPartSelectorModal';
import { AthleticNormwertTables } from './AthleticNormwertTables';
import { AthleticEvaluationMatrixCard } from './AthleticEvaluationMatrixCard';
import { PlayerEvaluationHistoryModal } from './PlayerEvaluationHistoryModal';
import { MovePlayerModal } from './MovePlayerModal';
import { generateAthleticTestPDF } from '../utils/athleticTestPdfExport';
import { calculateMirwaldMaturityOffset, parseBioNumber, getClosestBiologicalEvaluation } from '../utils/biologicalMaturity';
import { evaluateAllAthleticTests } from '../utils/athleticNormEvaluation';
import { 
  Calendar,
  Layers, 
  Users, 
  User,
  CalendarX2, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit3, 
  UserPlus, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Shield,
  Activity,
  HeartPulse,
  GraduationCap,
  HelpCircle,
  X,
  Database,
  Target,
  FileText,
  Save,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Zap,
  FileDown,
  Dna,
  Ruler,
  TableProperties,
  History,
  Timer,
  MessageSquare,
  Minus,
  Trophy,
  ClipboardList,
  Filter,
  Archive,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Lock
} from 'lucide-react';
import { cn } from '../utils/cn';

export type OrgaSubTab = 'periodization' | 'structure' | 'groups' | 'dataEntry' | 'stats' | 'absences' | 'playtimes' | 'evaluation' | 'feedbackTalks' | 'macro' | 'meso' | 'micro';
export type DataEntrySubPoint = 'absences' | 'playtimes' | 'technik' | 'taktik' | 'athletik' | 'mental' | 'feedback_talks';
export type AthleticSubTab = 'biological' | 'athletic' | 'criteria';

interface OrgaViewProps {
  initialSubTab?: OrgaSubTab;
  onNavigateToPlanner?: () => void;
}

const GROUP_COLORS = [
  { key: 'emerald', label: 'Grün', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { key: 'sky', label: 'Blau / Sky', bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { key: 'purple', label: 'Lila', bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { key: 'amber', label: 'Gelb / Amber', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { key: 'rose', label: 'Rot / Rose', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { key: 'teal', label: 'Türkis', bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40' }
];

const AGE_CATEGORIES = ['Alle', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U19', 'Senioren'];

export const OrgaView: React.FC<OrgaViewProps> = ({
  initialSubTab = 'periodization',
  onNavigateToPlanner
}) => {
  const { user, currentClub, clubName, clubId, userProfile, isAdmin, isMasterAdmin, isClubAdmin, hasProAccess } = useAuth();
  
  // Normalize initial tab (if 'absences' or 'playtimes', map to 'dataEntry'; if 'macro'/'meso'/'micro', map to 'periodization')
  const [activeSubTab, setActiveSubTab] = useState<OrgaSubTab>(() => {
    if (initialSubTab === 'absences' || initialSubTab === 'playtimes') return 'dataEntry';
    if (initialSubTab === 'macro' || initialSubTab === 'meso' || initialSubTab === 'micro') return 'periodization';
    return initialSubTab;
  });

  const [periodizationStage, setPeriodizationStage] = useState<'macro' | 'meso' | 'micro'>(() => {
    if (initialSubTab === 'meso') return 'meso';
    if (initialSubTab === 'micro') return 'micro';
    return 'macro';
  });

  // Active Sub-Point in Dateneingabe
  const [activeDataEntryTab, setActiveDataEntryTab] = useState<DataEntrySubPoint>(() => {
    if (initialSubTab === 'playtimes') return 'playtimes';
    return 'absences';
  });

  // Sync activeSubTab & activeDataEntryTab when initialSubTab prop changes
  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'absences') {
        setActiveSubTab('dataEntry');
        setActiveDataEntryTab('absences');
      } else if (initialSubTab === 'playtimes') {
        setActiveSubTab('dataEntry');
        setActiveDataEntryTab('playtimes');
      } else if (initialSubTab === 'macro') {
        setActiveSubTab('periodization');
        setPeriodizationStage('macro');
      } else if (initialSubTab === 'meso') {
        setActiveSubTab('periodization');
        setPeriodizationStage('meso');
      } else if (initialSubTab === 'micro') {
        setActiveSubTab('periodization');
        setPeriodizationStage('micro');
      } else if (initialSubTab === 'periodization') {
        setActiveSubTab('periodization');
        setPeriodizationStage('macro');
      } else {
        setActiveSubTab(initialSubTab);
      }
    }
  }, [initialSubTab]);

  // Groups, Absences and Evaluations State (initialized with local cache immediately)
  const [groups, setGroups] = useState<TrainingGroup[]>(() => {
    return getLocalTrainingGroups(user?.uid);
  });
  const [absences, setAbsences] = useState<PlayerAbsence[]>(() => {
    return getLocalPlayerAbsences(user?.uid);
  });
  const [evaluations, setEvaluations] = useState<PlayerEvaluation[]>(() => {
    return getLocalPlayerEvaluations(user?.uid);
  });
  const [savedPlans, setSavedPlans] = useState<TrainingPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Group & Player Selection for Skill Ratings
  const [selectedEvaluationGroupId, setSelectedEvaluationGroupId] = useState<string>('');
  const [selectedEvaluationPlayerId, setSelectedEvaluationPlayerId] = useState<string>('');
  const [showPreparation, setShowPreparation] = useState<boolean>(false);
  const [preparationInsightFilter, setPreparationInsightFilter] = useState<string>('all');

  // Rating form state
  const [currentRatingScores, setCurrentRatingScores] = useState<Record<string, number>>({});
  
  // Sub-tab in Athletik: 'biological' (Biologischer Entwicklungsstand) vs. 'athletic' (Athletischer Entwicklungsstand)
  const [athleticSubTab, setAthleticSubTab] = useState<AthleticSubTab>('biological');

  // Biological maturity form state
  const [currentBioMetrics, setCurrentBioMetrics] = useState<BiologicalMaturityMetrics>({
    standingHeightCm: '',
    sittingHeightCm: '',
    weightKg: '',
    wingspanCm: '',
    customAge: '',
    measurementDate: new Date().toISOString().substring(0, 10)
  });

  // Athletic tests form state
  const [currentAthleticMetrics, setCurrentAthleticMetrics] = useState<AthleticTestMetrics>({
    testDate: new Date().toISOString().substring(0, 10),
    gripRightKg: '',
    gripLeftKg: '',
    cmjHeightCm: '',
    lateralPushRightCm: '',
    lateralPushLeftCm: '',
    sprint5mSec: '',
    sprint10mSec: '',
    agilityShuttleRightSec: '',
    agilityShuttleLeftSec: '',
    medBallWeightKg: '2',
    medBallDistanceM: '',
    blazePodSimpleHits: '',
    blazePodSimpleAvgTimeMs: '',
    blazePodGoNoGoHits: '',
    blazePodGoNoGoErrors: ''
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [currentStrengths, setCurrentStrengths] = useState<string>('');
  const [currentDevelopmentAreas, setCurrentDevelopmentAreas] = useState<string>('');
  const [currentNotes, setCurrentNotes] = useState<string>('');
  const [isSavingEvaluation, setIsSavingEvaluation] = useState<boolean>(false);
  const [isScaleGuideOpen, setIsScaleGuideOpen] = useState<boolean>(false);
  const [hoveredScaleLevel, setHoveredScaleLevel] = useState<{ skillId: string; level: number } | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Modals state for Groups & Absences
  const [editingGroup, setEditingGroup] = useState<TrainingGroup | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    ageCategory: 'U17',
    color: 'emerald',
    assignedCoachEmail: ''
  });

  // Available licensed coaches in club
  const availableCoaches = useMemo(() => {
    const list: { email: string; name: string }[] = [];
    if (currentClub?.adminEmail) {
      list.push({
        email: currentClub.adminEmail,
        name: `${currentClub.adminEmail} (Club-Admin)`
      });
    }
    (currentClub?.coachEmails || []).forEach(email => {
      if (email && email.toLowerCase() !== (currentClub?.adminEmail || '').toLowerCase() && !list.some(c => c.email.toLowerCase() === email.toLowerCase())) {
        list.push({
          email,
          name: email
        });
      }
    });
    return list;
  }, [currentClub]);

  // Central permission check for group data editing
  const canEditGroupData = (group?: TrainingGroup | null): boolean => {
    if (!group) return false;
    if (isMasterAdmin || isClubAdmin) return true;
    if (!group.clubId) {
      return group.ownerId === user?.uid || !group.ownerId;
    }
    const userEmail = (user?.email || '').toLowerCase();
    if (group.assignedCoachEmail) {
      return group.assignedCoachEmail.toLowerCase() === userEmail;
    }
    if (group.assignedCoachId) {
      return group.assignedCoachId === user?.uid;
    }
    return group.ownerId === user?.uid || (Boolean(group.ownerEmail) && group.ownerEmail?.toLowerCase() === userEmail);
  };

  // Permission check for advanced evaluation & diagnostics (Technik, Taktik, Athletik, Mental, Feedback talks)
  const canEditEvaluation = (group?: TrainingGroup | null): boolean => {
    if (!hasProAccess) return false;
    return canEditGroupData(group);
  };

  const [selectedGroupForPlayer, setSelectedGroupForPlayer] = useState<TrainingGroup | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{ player: Player; group: TrainingGroup; step: 1 | 2 } | null>(null);
  const [isMovePlayerModalOpen, setIsMovePlayerModalOpen] = useState<boolean>(false);
  const [movingPlayer, setMovingPlayer] = useState<Player | null>(null);
  const [movingSourceGroup, setMovingSourceGroup] = useState<TrainingGroup | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    firstName: '',
    lastName: '',
    birthYear: '',
    jerseyNumber: '',
    notes: ''
  });

  const [isBodyModalOpen, setIsBodyModalOpen] = useState(false);
  const [editingAbsenceId, setEditingAbsenceId] = useState<string | null>(null);
  const [absenceFormData, setAbsenceFormData] = useState({
    groupId: '',
    playerId: '',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date().toISOString().substring(0, 10),
    reason: 'Krankheit' as AbsenceReason,
    injuredBodyPart: '',
    note: ''
  });

  // Match Playtimes and Feedback Talks State
  const [matchPlaytimes, setMatchPlaytimes] = useState<PlayerMatchPlaytime[]>(() => {
    return getLocalMatchPlaytimes(user?.uid);
  });
  const [feedbackTalks, setFeedbackTalks] = useState<PlayerFeedbackTalk[]>(() => {
    return getLocalFeedbackTalks(user?.uid);
  });

  // State & Filters for Spielzeiten (Match Playtimes)
  const [filterPlaytimeGroup, setFilterPlaytimeGroup] = useState<string>('ALL');
  const [filterPlaytimePlayer, setFilterPlaytimePlayer] = useState<string>('ALL');
  const [filterPlaytimeType, setFilterPlaytimeType] = useState<string>('ALL');
  const [searchPlaytime, setSearchPlaytime] = useState<string>('');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [matchFormData, setMatchFormData] = useState<{
    date: string;
    team: string;
    opponent: string;
    location: MatchLocation;
    matchType: MatchType;
    groupId: string;
    playerMinutes: Record<string, number>;
    playerGrades: Record<string, number>;
    playerBenchStatus: Record<string, boolean>;
    notes: string;
  }>({
    date: new Date().toISOString().substring(0, 10),
    team: MATCH_TEAMS[0],
    opponent: '',
    location: 'Heimspiel',
    matchType: 'Meisterschaftsspiel',
    groupId: '',
    playerMinutes: {},
    playerGrades: {},
    playerBenchStatus: {},
    notes: ''
  });

  // State & Selection for Feedbackgespräche (first created group preselected)
  const [selectedFeedbackGroupId, setSelectedFeedbackGroupId] = useState<string>(() => {
    const initial = getLocalTrainingGroups(user?.uid);
    return initial.length > 0 ? initial[0].id : '';
  });
  const [selectedFeedbackPlayerId, setSelectedFeedbackPlayerId] = useState<string>(() => {
    const initial = getLocalTrainingGroups(user?.uid);
    if (initial.length > 0) {
      const activeP = (initial[0].players || []).filter(p => !p.archived);
      return activeP.length > 0 ? activeP[0].id : '';
    }
    return '';
  });
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [filterFeedbackGroup, setFilterFeedbackGroup] = useState<string>('ALL');
  const [filterFeedbackPlayer, setFilterFeedbackPlayer] = useState<string>('ALL');
  const [searchFeedback, setSearchFeedback] = useState<string>('');
  const [feedbackFormData, setFeedbackFormData] = useState<{
    date: string;
    trainer1: string;
    trainer2: string;
    keyPoints: string;
  }>({
    date: new Date().toISOString().substring(0, 10),
    trainer1: '',
    trainer2: '',
    keyPoints: ''
  });

  // Subscriptions
  useEffect(() => {
    setGroups(getLocalTrainingGroups(user?.uid));
    setAbsences(getLocalPlayerAbsences(user?.uid));
    setEvaluations(getLocalPlayerEvaluations(user?.uid));
    setMatchPlaytimes(getLocalMatchPlaytimes(user?.uid));
    setFeedbackTalks(getLocalFeedbackTalks(user?.uid));

    const unsubGroups = subscribeUserTrainingGroups(user, (data) => {
      setGroups(data);
    }, undefined, clubId);
    const unsubAbsences = subscribeUserAbsences(user, (data) => {
      setAbsences(data);
    }, undefined, clubId);
    const unsubEvals = subscribeUserEvaluations(user, (data) => {
      setEvaluations(data);
    }, undefined, clubId);
    const unsubMatches = subscribeUserMatchPlaytimes(user, (data) => {
      setMatchPlaytimes(data);
    }, undefined, clubId);
    const unsubTalks = subscribeUserFeedbackTalks(user, (data) => {
      setFeedbackTalks(data);
    }, undefined, clubId);
    const unsubPlans = subscribeUserPlans(user, Boolean(isAdmin || isMasterAdmin), (plans) => {
      setSavedPlans(plans);
    }, undefined, clubId, isClubAdmin);
    const unsubExercises = subscribeExercises(
      user, 
      Boolean(isAdmin || isMasterAdmin), 
      (data) => {
        setExercises(data);
      },
      undefined,
      isClubAdmin,
      clubId
    );

    return () => {
      unsubGroups();
      unsubAbsences();
      unsubEvals();
      unsubMatches();
      unsubTalks();
      unsubPlans();
      unsubExercises();
    };
  }, [user, clubId, isAdmin, isMasterAdmin, isClubAdmin]);

  // Sync selected group and player when groups change for Evaluations
  useEffect(() => {
    if (groups.length > 0) {
      const activeGroup = groups.find(g => g.id === selectedEvaluationGroupId) || groups[0];
      if (!selectedEvaluationGroupId || !groups.some(g => g.id === selectedEvaluationGroupId)) {
        setSelectedEvaluationGroupId(activeGroup.id);
      }
      const activePlayers = (activeGroup.players || []).filter(p => !p.archived);
      if (activePlayers.length > 0) {
        if (!selectedEvaluationPlayerId || !activePlayers.some(p => p.id === selectedEvaluationPlayerId)) {
          setSelectedEvaluationPlayerId(activePlayers[0].id);
        }
      } else {
        setSelectedEvaluationPlayerId('');
      }
    }
  }, [groups, selectedEvaluationGroupId, selectedEvaluationPlayerId]);

  // Sync selected group and player when groups change for Feedbackgespräche
  useEffect(() => {
    if (groups.length > 0) {
      const activeGroup = groups.find(g => g.id === selectedFeedbackGroupId) || groups[0];
      if (!selectedFeedbackGroupId || !groups.some(g => g.id === selectedFeedbackGroupId)) {
        setSelectedFeedbackGroupId(activeGroup.id);
      }
      const activePlayers = (activeGroup.players || []).filter(p => !p.archived);
      if (activePlayers.length > 0) {
        if (!selectedFeedbackPlayerId || !activePlayers.some(p => p.id === selectedFeedbackPlayerId)) {
          setSelectedFeedbackPlayerId(activePlayers[0].id);
        }
      } else {
        setSelectedFeedbackPlayerId('');
      }
    }
  }, [groups, selectedFeedbackGroupId, selectedFeedbackPlayerId]);

  // Sync selected group and player when groups change for Fehlzeiten
  useEffect(() => {
    if (groups.length > 0) {
      const activeGroup = groups.find(g => g.id === absenceFormData.groupId) || groups[0];
      const validGroupId = (absenceFormData.groupId && groups.some(g => g.id === absenceFormData.groupId))
        ? absenceFormData.groupId
        : activeGroup.id;

      const currentGroupObj = groups.find(g => g.id === validGroupId) || groups[0];
      const activePlayers = (currentGroupObj.players || []).filter(p => !p.archived);

      const validPlayerId = (absenceFormData.playerId && activePlayers.some(p => p.id === absenceFormData.playerId))
        ? absenceFormData.playerId
        : (activePlayers[0]?.id || '');

      if (validGroupId !== absenceFormData.groupId || validPlayerId !== absenceFormData.playerId) {
        setAbsenceFormData(prev => ({
          ...prev,
          groupId: validGroupId,
          playerId: validPlayerId
        }));
      }
    }
  }, [groups, absenceFormData.groupId, absenceFormData.playerId]);

  // Helper for player initials
  const getPlayerInitials = (firstName: string, lastName: string): string => {
    const f = (firstName || '').trim().charAt(0).toUpperCase();
    const l = (lastName || '').trim().charAt(0).toUpperCase();
    if (f && l) return `${f}${l}`;
    if (f) return f;
    if (l) return l;
    return '?';
  };

  // Helper for overall score
  const getPlayerOverallScore = (player: Player, evaluationsList: PlayerEvaluation[]): string | null => {
    const categoryAverages: number[] = [];

    (['Technik', 'Taktik', 'Mental', 'Athletik'] as const).forEach(cat => {
      const catEvals = evaluationsList
        .filter(e => e.playerId === player.id && e.category === cat)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      
      const latest = catEvals[0];
      if (!latest) return;

      if (cat === 'Athletik') {
        const latestAth = catEvals.find(e => e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean));
        if (!latestAth) return;

        const athDate = latestAth.athleticMetrics?.testDate || latestAth.updatedAt;
        const matchingBio = getClosestBiologicalEvaluation(evaluationsList, player.id, athDate)?.biologicalMetrics;

        const birthYearNum = typeof player.birthYear === 'number'
          ? player.birthYear
          : (player.birthYear ? parseInt(String(player.birthYear), 10) || undefined : undefined);

        const calculatedResult = evaluateAllAthleticTests(
          latestAth.athleticMetrics,
          matchingBio,
          birthYearNum
        );
        const validItemScores = calculatedResult.items
          .map(i => i.score)
          .filter((s): s is number => typeof s === 'number' && s > 0);

        if (validItemScores.length > 0) {
          const avg = validItemScores.reduce((a, b) => a + b, 0) / validItemScores.length;
          categoryAverages.push(avg);
        }
      } else {
        const rawRatings = latest.ratings || {};
        const validScores = Object.entries(rawRatings)
          .filter(([k, v]) => !k.startsWith('ath_') && typeof v === 'number' && v > 0)
          .map(([_, v]) => Number(v));

        if (validScores.length > 0) {
          const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
          categoryAverages.push(avg);
        }
      }
    });

    if (categoryAverages.length === 0) return null;
    return (categoryAverages.reduce((a, b) => a + b, 0) / categoryAverages.length).toFixed(1);
  };

  // List of all archived players across all groups
  const archivedPlayers = useMemo(() => {
    const list: Array<{ player: Player; group: TrainingGroup }> = [];
    groups.forEach(g => {
      (g.players || []).forEach(p => {
        if (p.archived) {
          list.push({ player: p, group: g });
        }
      });
    });
    return list;
  }, [groups]);

  // Load existing evaluation data when player or category changes
  // Pre-fill matrices and biological status with the latest dataset for that player
  useEffect(() => {
    if (!selectedEvaluationPlayerId) {
      setCurrentRatingScores({});
      setCurrentBioMetrics({
        standingHeightCm: '',
        sittingHeightCm: '',
        weightKg: '',
        wingspanCm: '',
        customAge: '',
        measurementDate: new Date().toISOString().substring(0, 10)
      });
      setCurrentAthleticMetrics({
        testDate: new Date().toISOString().substring(0, 10),
        gripRightKg: '',
        gripLeftKg: '',
        cmjHeightCm: '',
        lateralPushRightCm: '',
        lateralPushLeftCm: '',
        sprint5mSec: '',
        sprint10mSec: '',
        agilityShuttleRightSec: '',
        agilityShuttleLeftSec: '',
        medBallWeightKg: '2',
        medBallDistanceM: '',
        blazePodSimpleHits: '',
        blazePodSimpleAvgTimeMs: '',
        blazePodGoNoGoHits: '',
        blazePodGoNoGoErrors: ''
      });
      setCurrentStrengths('');
      setCurrentDevelopmentAreas('');
      setCurrentNotes('');
      return;
    }
    if (activeDataEntryTab === 'absences' || activeDataEntryTab === 'playtimes' || activeDataEntryTab === 'feedback_talks') return;

    const catKey: EvaluationCategory = 
      activeDataEntryTab === 'technik' ? 'Technik' :
      activeDataEntryTab === 'taktik' ? 'Taktik' :
      activeDataEntryTab === 'athletik' ? 'Athletik' : 'Mental';

    if (catKey === 'Athletik') {
      // Find the most recent biological evaluation dataset for this player
      const latestBioEval = evaluations
        .filter(e => e.playerId === selectedEvaluationPlayerId && e.category === 'Athletik' && e.biologicalMetrics && (parseBioNumber(e.biologicalMetrics.standingHeightCm) > 50 || parseBioNumber(e.biologicalMetrics.weightKg) > 15))
        .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))[0];

      if (latestBioEval?.biologicalMetrics) {
        setCurrentBioMetrics({
          standingHeightCm: latestBioEval.biologicalMetrics.standingHeightCm || '',
          sittingHeightCm: latestBioEval.biologicalMetrics.sittingHeightCm || '',
          weightKg: latestBioEval.biologicalMetrics.weightKg || '',
          wingspanCm: latestBioEval.biologicalMetrics.wingspanCm || '',
          customAge: latestBioEval.biologicalMetrics.customAge || '',
          measurementDate: latestBioEval.biologicalMetrics.measurementDate || new Date().toISOString().substring(0, 10),
          maturityOffsetYears: latestBioEval.biologicalMetrics.maturityOffsetYears,
          phvClassification: latestBioEval.biologicalMetrics.phvClassification,
          estimatedAgeAtPhv: latestBioEval.biologicalMetrics.estimatedAgeAtPhv,
          apeIndex: latestBioEval.biologicalMetrics.apeIndex,
          sittingHeightRatio: latestBioEval.biologicalMetrics.sittingHeightRatio,
          legLengthCm: latestBioEval.biologicalMetrics.legLengthCm
        });
      } else {
        setCurrentBioMetrics({
          standingHeightCm: '',
          sittingHeightCm: '',
          weightKg: '',
          wingspanCm: '',
          customAge: '',
          measurementDate: new Date().toISOString().substring(0, 10)
        });
      }

      setCurrentRatingScores({});
      setCurrentAthleticMetrics({
        testDate: new Date().toISOString().substring(0, 10),
        gripRightKg: '',
        gripLeftKg: '',
        cmjHeightCm: '',
        lateralPushRightCm: '',
        lateralPushLeftCm: '',
        sprint5mSec: '',
        sprint10mSec: '',
        agilityShuttleRightSec: '',
        agilityShuttleLeftSec: '',
        medBallWeightKg: '2',
        medBallDistanceM: '',
        blazePodSimpleHits: '',
        blazePodSimpleAvgTimeMs: '',
        blazePodGoNoGoHits: '',
        blazePodGoNoGoErrors: ''
      });
      setCurrentStrengths('');
      setCurrentDevelopmentAreas('');
      setCurrentNotes('');
    } else {
      // Find the most recent evaluation dataset for this player and category
      const playerCategoryEvals = evaluations
        .filter(e => e.playerId === selectedEvaluationPlayerId && e.category === catKey)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      const latestEval = playerCategoryEvals[0];

      if (latestEval) {
        setCurrentRatingScores(latestEval.ratings || {});
        setCurrentStrengths(latestEval.strengths || '');
        setCurrentDevelopmentAreas(latestEval.developmentAreas || '');
        setCurrentNotes(latestEval.overallNotes || '');
      } else {
        setCurrentRatingScores({});
        setCurrentStrengths('');
        setCurrentDevelopmentAreas('');
        setCurrentNotes('');
      }
    }
  }, [selectedEvaluationPlayerId, activeDataEntryTab]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // --------------------------------------------------------------------------
  // Group CRUD Handlers
  // --------------------------------------------------------------------------
  const handleOpenNewGroupModal = () => {
    setEditingGroup(null);
    setGroupFormData({
      name: '',
      description: '',
      ageCategory: 'U17',
      color: 'emerald',
      assignedCoachEmail: currentClub?.adminEmail || user?.email || ''
    });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroupModal = (group: TrainingGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      ageCategory: group.ageCategory || 'U17',
      color: group.color || 'emerald',
      assignedCoachEmail: group.assignedCoachEmail || ''
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) {
      showToast('Bitte gib einen Gruppennamen an.', 'error');
      return;
    }

    try {
      const assignedCoachObj = availableCoaches.find(c => c.email.toLowerCase() === (groupFormData.assignedCoachEmail || '').toLowerCase());
      const assignedCoachName = assignedCoachObj ? assignedCoachObj.name : (groupFormData.assignedCoachEmail || undefined);

      if (editingGroup) {
        await saveTrainingGroupToFirestore({
          ...editingGroup,
          name: groupFormData.name.trim(),
          description: groupFormData.description.trim(),
          ageCategory: groupFormData.ageCategory,
          color: groupFormData.color,
          assignedCoachEmail: groupFormData.assignedCoachEmail || undefined,
          assignedCoachName: assignedCoachName || undefined,
        }, user, clubId);
        showToast('Trainingsgruppe erfolgreich aktualisiert!');
      } else {
        await saveTrainingGroupToFirestore({
          name: groupFormData.name.trim(),
          description: groupFormData.description.trim(),
          ageCategory: groupFormData.ageCategory,
          color: groupFormData.color,
          assignedCoachEmail: groupFormData.assignedCoachEmail || undefined,
          assignedCoachName: assignedCoachName || undefined,
          players: []
        }, user, clubId);
        showToast('Neue Trainingsgruppe erfolgreich angelegt!');
      }
      setGroups(getLocalTrainingGroups(user?.uid));
      setIsGroupModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Speichern der Trainingsgruppe.', 'error');
    }
  };

  const handleDeleteGroup = async (group: TrainingGroup) => {
    const playerCount = group.players?.length || 0;
    const confirmMsg = playerCount > 0 
      ? `Möchtest du die Trainingsgruppe "${group.name}" inklusive aller ${playerCount} Torhüter wirklich löschen?` 
      : `Möchtest du die Trainingsgruppe "${group.name}" wirklich löschen?`;

    if (window.confirm(confirmMsg)) {
      try {
        await deleteTrainingGroupFromFirestore(group.id, user);
        setGroups(getLocalTrainingGroups(user?.uid));
        showToast('Trainingsgruppe gelöscht.');
      } catch (err) {
        console.error(err);
        showToast('Fehler beim Löschen der Trainingsgruppe.', 'error');
      }
    }
  };

  // --------------------------------------------------------------------------
  // Player CRUD Handlers
  // --------------------------------------------------------------------------
  const handleOpenAddPlayerModal = (group: TrainingGroup) => {
    setSelectedGroupForPlayer(group);
    setEditingPlayer(null);
    setPlayerFormData({
      firstName: '',
      lastName: '',
      birthYear: '',
      jerseyNumber: '',
      notes: ''
    });
    setIsPlayerModalOpen(true);
  };

  const handleOpenEditPlayerModal = (group: TrainingGroup, player: Player) => {
    setSelectedGroupForPlayer(group);
    setEditingPlayer(player);
    setPlayerFormData({
      firstName: player.firstName,
      lastName: player.lastName,
      birthYear: player.birthYear ? String(player.birthYear) : '',
      jerseyNumber: player.jerseyNumber ? String(player.jerseyNumber) : '',
      notes: player.notes || ''
    });
    setIsPlayerModalOpen(true);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupForPlayer) return;
    if (!playerFormData.firstName.trim() || !playerFormData.lastName.trim()) {
      showToast('Vor- und Nachname sind erforderlich.', 'error');
      return;
    }

    try {
      const currentPlayers = [...(selectedGroupForPlayer.players || [])];
      
      if (editingPlayer) {
        const idx = currentPlayers.findIndex(p => p.id === editingPlayer.id);
        if (idx >= 0) {
          currentPlayers[idx] = {
            ...editingPlayer,
            firstName: playerFormData.firstName.trim(),
            lastName: playerFormData.lastName.trim(),
            birthYear: playerFormData.birthYear.trim() || undefined,
            jerseyNumber: playerFormData.jerseyNumber.trim() || undefined,
            notes: playerFormData.notes.trim() || undefined,
            updatedAt: Date.now()
          };
        }
      } else {
        currentPlayers.push({
          id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          firstName: playerFormData.firstName.trim(),
          lastName: playerFormData.lastName.trim(),
          birthYear: playerFormData.birthYear.trim() || undefined,
          jerseyNumber: playerFormData.jerseyNumber.trim() || undefined,
          notes: playerFormData.notes.trim() || undefined,
          createdAt: Date.now()
        });
      }

      await saveTrainingGroupToFirestore({
        ...selectedGroupForPlayer,
        players: currentPlayers
      }, user, clubId);

      setGroups(getLocalTrainingGroups(user?.uid));
      setIsPlayerModalOpen(false);
      showToast(editingPlayer ? 'Spielerdaten aktualisiert!' : 'Spieler zur Gruppe hinzugefügt!');
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Speichern des Spielers.', 'error');
    }
  };

  const handleArchivePlayer = async (group: TrainingGroup, playerId: string, playerName: string) => {
    if (window.confirm(`Möchtest du "${playerName}" wirklich archivieren? Der Spieler wird aus der aktiven Trainingsgruppe entfernt und im Archiv abgelegt.`)) {
      try {
        const updatedPlayers = (group.players || []).map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              archived: true,
              archivedAt: Date.now(),
              originalGroupId: group.id
            };
          }
          return p;
        });
        const updatedGroup = {
          ...group,
          players: updatedPlayers
        };
        setGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g));

        await saveTrainingGroupToFirestore(updatedGroup, user, clubId);
        setGroups(getLocalTrainingGroups(user?.uid));
        showToast(`Spieler "${playerName}" wurde ins Archiv verschoben.`);
      } catch (err) {
        console.error(err);
        showToast('Fehler beim Archivieren des Spielers.', 'error');
      }
    }
  };

  const handleRestorePlayer = async (group: TrainingGroup, playerId: string, playerName: string) => {
    try {
      const updatedPlayers = (group.players || []).map(p => {
        if (p.id === playerId) {
          const { archived, archivedAt, originalGroupId, ...rest } = p;
          return {
            ...rest,
            archived: false
          };
        }
        return p;
      });
      const updatedGroup = {
        ...group,
        players: updatedPlayers
      };
      setGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g));

      await saveTrainingGroupToFirestore(updatedGroup, user, clubId);
      setGroups(getLocalTrainingGroups(user?.uid));
      showToast(`Spieler "${playerName}" wurde erfolgreich wiederhergestellt.`);
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Wiederherstellen des Spielers.', 'error');
    }
  };

  const handleOpenMovePlayerModal = (group: TrainingGroup, player: Player) => {
    setMovingSourceGroup(group);
    setMovingPlayer(player);
    setIsMovePlayerModalOpen(true);
  };

  const handlePermanentDeletePlayer = async (group: TrainingGroup, playerId: string, playerName: string) => {
    try {
      // 1. Remove player completely from group
      const updatedPlayers = (group.players || []).filter(p => p.id !== playerId);
      const updatedGroup = {
        ...group,
        players: updatedPlayers
      };
      setGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g));
      await saveTrainingGroupToFirestore(updatedGroup, user, clubId);

      // 2. Delete evaluations for this player
      const playerEvals = evaluations.filter(e => e.playerId === playerId);
      for (const ev of playerEvals) {
        await deletePlayerEvaluationFromFirestore(ev.id, user);
      }
      setEvaluations(getLocalPlayerEvaluations(user?.uid));

      // 3. Delete absences for this player
      const playerAbs = absences.filter(a => a.playerId === playerId);
      for (const ab of playerAbs) {
        await deleteAbsenceFromFirestore(ab.id, user);
      }
      setAbsences(getLocalPlayerAbsences(user?.uid));

      // 4. Delete feedback talks for this player
      const playerTalks = (feedbackTalks || []).filter(t => t.playerId === playerId);
      for (const talk of playerTalks) {
        await deleteFeedbackTalkFromFirestore(talk.id, user);
      }
      setFeedbackTalks(getLocalFeedbackTalks(user?.uid));

      // 5. Clean up match playtimes
      const matchUpdates = (matchPlaytimes || []).filter(m => m.playerMinutes?.[playerId] !== undefined || m.playerGrades?.[playerId] !== undefined);
      for (const match of matchUpdates) {
        const newMins = { ...(match.playerMinutes || {}) };
        delete newMins[playerId];
        const newGrades = { ...(match.playerGrades || {}) };
        delete newGrades[playerId];
        await saveMatchPlaytimeToFirestore({
          ...match,
          playerMinutes: newMins,
          playerGrades: newGrades
        }, user);
      }
      setMatchPlaytimes(getLocalMatchPlaytimes(user?.uid));

      setGroups(getLocalTrainingGroups(user?.uid));
      setPermanentDeleteTarget(null);
      showToast(`Profil "${playerName}" und alle zugehörigen Daten wurden endgültig gelöscht.`);
    } catch (err) {
      console.error(err);
      showToast('Fehler beim endgültigen Löschen des Spielers.', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // Absence CRUD Handlers
  // --------------------------------------------------------------------------
  const handleEditAbsence = (absence: PlayerAbsence) => {
    setEditingAbsenceId(absence.id);
    setAbsenceFormData({
      groupId: absence.groupId,
      playerId: absence.playerId,
      startDate: absence.startDate,
      endDate: absence.endDate || absence.startDate,
      reason: absence.reason,
      injuredBodyPart: absence.injuredBodyPart || '',
      note: absence.note || ''
    });
  };

  const handleCancelEditAbsence = () => {
    setEditingAbsenceId(null);
    setAbsenceFormData(prev => ({
      ...prev,
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date().toISOString().substring(0, 10),
      reason: 'Krankheit',
      injuredBodyPart: '',
      note: ''
    }));
  };

  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceFormData.groupId) {
      alert('Bitte wähle eine Trainingsgruppe aus.');
      return;
    }
    if (!absenceFormData.playerId) {
      alert('Bitte wähle einen Spieler aus.');
      return;
    }
    if (!absenceFormData.startDate) {
      alert('Bitte gib ein Startdatum an.');
      return;
    }
    if (!absenceFormData.endDate) {
      alert('Bitte gib ein Enddatum an.');
      return;
    }

    const group = groups.find(g => g.id === absenceFormData.groupId);
    const player = group?.players.find(p => p.id === absenceFormData.playerId);

    if (!group || !player) {
      alert('Trainingsgruppe oder Spieler nicht gefunden.');
      return;
    }

    const isEditing = !!editingAbsenceId;

    try {
      await saveAbsenceToFirestore({
        id: editingAbsenceId || undefined,
        groupId: group.id,
        groupName: group.name,
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        startDate: absenceFormData.startDate,
        endDate: absenceFormData.endDate,
        reason: absenceFormData.reason,
        injuredBodyPart: absenceFormData.reason === 'Verletzung' ? (absenceFormData.injuredBodyPart?.trim() || undefined) : undefined,
        note: absenceFormData.note.trim()
      }, user);

      setAbsences(getLocalPlayerAbsences(user?.uid));
      setEditingAbsenceId(null);
      setAbsenceFormData(prev => ({
        ...prev,
        startDate: new Date().toISOString().substring(0, 10),
        endDate: new Date().toISOString().substring(0, 10),
        reason: 'Krankheit',
        injuredBodyPart: '',
        note: ''
      }));
      showToast(isEditing ? `Fehlzeit für ${player.firstName} ${player.lastName} aktualisiert!` : `Fehlzeit für ${player.firstName} ${player.lastName} gespeichert!`);
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Speichern der Fehlzeit.', 'error');
    }
  };

  const handleDeleteAbsence = async (absenceId: string, playerName: string) => {
    if (window.confirm(`Fehlzeit von "${playerName}" wirklich löschen?`)) {
      try {
        setAbsences(prev => prev.filter(a => a.id !== absenceId));
        if (editingAbsenceId === absenceId) {
          handleCancelEditAbsence();
        }
        await deleteAbsenceFromFirestore(absenceId, user);
        showToast('Fehlzeit gelöscht.');
      } catch (err) {
        console.error(err);
        showToast('Fehler beim Löschen der Fehlzeit.', 'error');
        setAbsences(getLocalPlayerAbsences(user?.uid));
      }
    }
  };

  // --------------------------------------------------------------------------
  // Skill Evaluation Handler
  // --------------------------------------------------------------------------
  const handleSaveEvaluation = async (category: EvaluationCategory) => {
    if (!hasProAccess) {
      showToast('Die Spieler-Diagnostik (Technik, Taktik, Athletik, Mental) ist ein PRO-Feature.', 'error');
      return;
    }

    if (!selectedEvaluationPlayerId || !selectedEvaluationGroupId) {
      showToast('Bitte wähle zuerst eine Trainingsgruppe und einen Torhüter aus.', 'error');
      return;
    }

    const group = groups.find(g => g.id === selectedEvaluationGroupId);
    const player = group?.players.find(p => p.id === selectedEvaluationPlayerId);

    if (!group || !player) {
      showToast('Trainingsgruppe oder Torhüter nicht gefunden.', 'error');
      return;
    }

    if (!canEditEvaluation(group)) {
      showToast('Nur der zugeordnete Trainer oder Club-Admin darf Bewertungen für diese Gruppe speichern.', 'error');
      return;
    }

    setIsSavingEvaluation(true);
    try {
      const currentYear = new Date().getFullYear();
      const playerBirthYear = player.birthYear ? parseBioNumber(player.birthYear) : undefined;
      const defaultAge = playerBirthYear && playerBirthYear > 1980 ? (currentYear - playerBirthYear) : 15;
      const calcAge = parseBioNumber(currentBioMetrics.customAge) || defaultAge;

      const mirwaldResult = calculateMirwaldMaturityOffset({
        standingHeightCm: currentBioMetrics.standingHeightCm,
        sittingHeightCm: currentBioMetrics.sittingHeightCm,
        weightKg: currentBioMetrics.weightKg,
        chronologicalAge: calcAge,
        wingspanCm: currentBioMetrics.wingspanCm
      });

      const bioToSave: BiologicalMaturityMetrics = {
        ...currentBioMetrics,
        maturityOffsetYears: mirwaldResult?.maturityOffsetYears,
        phvClassification: mirwaldResult?.phvClassification,
        estimatedAgeAtPhv: mirwaldResult?.estimatedAgeAtPhv,
        apeIndex: mirwaldResult?.apeIndex,
        sittingHeightRatio: mirwaldResult?.sittingHeightRatio,
        legLengthCm: mirwaldResult?.legLengthCm
      };

      let ratingsToSave: Record<string, number> = currentRatingScores;
      let athleticMetricsToSave: AthleticTestMetrics | undefined = undefined;
      let biologicalMetricsToSave: BiologicalMaturityMetrics | undefined = undefined;

      if (category === 'Athletik') {
        if (athleticSubTab === 'biological') {
          // Nur den biologischen Entwicklungsstand der Seite speichern (nicht die Werte des Athletiktests im Reiter Athletischer Entwicklungsstand)
          biologicalMetricsToSave = bioToSave;
          athleticMetricsToSave = undefined;
          ratingsToSave = {};
        } else if (athleticSubTab === 'athletic') {
          // Pflichtfeld Prüfung: Datum
          if (!currentAthleticMetrics.testDate || !currentAthleticMetrics.testDate.trim()) {
            showToast('Bitte ein Testdatum für den Athletiktest auswählen (Pflichtfeld).', 'error');
            setIsSavingEvaluation(false);
            return;
          }

          // Im Reiter Athletischer Entwicklungsstand: Nur Athletiktest-Messwerte und daraus abgeleitete Scores speichern (keine biologischen Daten im Dokument ablegen)
          athleticMetricsToSave = currentAthleticMetrics;
          biologicalMetricsToSave = undefined;

          // Biologische Reifegrad-Metriken heranziehen, die zeitlich möglichst nah vor/am Testdatum liegen
          const targetDateForNorms = currentAthleticMetrics.testDate || new Date().toISOString().substring(0, 10);
          const matchedBio = getClosestBiologicalEvaluation(evaluations, player.id, targetDateForNorms)?.biologicalMetrics;
          const effectiveBioForNorms = matchedBio;

          const calculatedResult = evaluateAllAthleticTests(
            currentAthleticMetrics,
            effectiveBioForNorms,
            player.birthYear
          );

          const derivedScores: Record<string, number> = {};
          calculatedResult.items.forEach(item => {
            if (item.score > 0) {
              derivedScores[item.id] = item.score;
            }
          });

          ratingsToSave = {
            ...derivedScores,
            ath_grip_r: parseBioNumber(currentAthleticMetrics.gripRightKg) || 0,
            ath_grip_l: parseBioNumber(currentAthleticMetrics.gripLeftKg) || 0,
            ath_cmj: parseBioNumber(currentAthleticMetrics.cmjHeightCm) || 0,
            ath_lat_push_r: parseBioNumber(currentAthleticMetrics.lateralPushRightCm) || 0,
            ath_lat_push_l: parseBioNumber(currentAthleticMetrics.lateralPushLeftCm) || 0,
            ath_sprint_5m: parseBioNumber(currentAthleticMetrics.sprint5mSec) || 0,
            ath_sprint_10m: parseBioNumber(currentAthleticMetrics.sprint10mSec) || 0,
            ath_shuttle_r: parseBioNumber(currentAthleticMetrics.agilityShuttleRightSec) || 0,
            ath_shuttle_l: parseBioNumber(currentAthleticMetrics.agilityShuttleLeftSec) || 0,
            ath_medball_weight: parseBioNumber(currentAthleticMetrics.medBallWeightKg) || (effectiveBioForNorms?.phvClassification === 'Pre-PHV' ? 1 : 2),
            ath_medball_dist: parseBioNumber(currentAthleticMetrics.medBallDistanceM) || 0,
            ath_blazepod_hits_1: parseBioNumber(currentAthleticMetrics.blazePodSimpleHits) || 0,
            ath_blazepod_hits_2: parseBioNumber(currentAthleticMetrics.blazePodGoNoGoHits) || 0,
            ath_blazepod_err_2: parseBioNumber(currentAthleticMetrics.blazePodGoNoGoErrors) || 0
          };
        }
      }

      let finalUpdatedAt: number = Date.now();
      if (category === 'Athletik' && athleticSubTab === 'athletic' && currentAthleticMetrics.testDate) {
        const [y, m, d] = currentAthleticMetrics.testDate.split('-').map(Number);
        const testDateTime = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
        if (!isNaN(testDateTime.getTime())) {
          finalUpdatedAt = testDateTime.getTime();
        }
      } else if (category === 'Athletik' && athleticSubTab === 'biological' && currentBioMetrics.measurementDate) {
        const [y, m, d] = currentBioMetrics.measurementDate.split('-').map(Number);
        const bioDateTime = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
        if (!isNaN(bioDateTime.getTime())) {
          finalUpdatedAt = bioDateTime.getTime();
        }
      }

      await savePlayerEvaluationToFirestore({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        groupId: group.id,
        groupName: group.name,
        category,
        ratings: ratingsToSave,
        athleticMetrics: athleticMetricsToSave,
        biologicalMetrics: biologicalMetricsToSave,
        strengths: currentStrengths.trim(),
        developmentAreas: currentDevelopmentAreas.trim(),
        overallNotes: currentNotes.trim(),
        updatedAt: finalUpdatedAt
      }, user);

      setEvaluations(getLocalPlayerEvaluations(user?.uid));
      if (category === 'Athletik' && athleticSubTab === 'biological') {
        setCurrentBioMetrics(bioToSave);
        showToast(`Biologischer Entwicklungsstand für ${player.firstName} ${player.lastName} erfolgreich gespeichert!`);
      } else if (category === 'Athletik' && athleticSubTab === 'athletic') {
        showToast(`Athletiktest für ${player.firstName} ${player.lastName} erfolgreich gespeichert!`);
      } else {
        showToast(`Bewertung für ${player.firstName} ${player.lastName} (${category}) erfolgreich gespeichert!`);
      }
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Speichern der Bewertung.', 'error');
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  // Handler to delete a single historical evaluation record
  const handleDeleteEvaluation = async (evaluationId: string) => {
    if (!hasProAccess) {
      showToast('Spieler-Diagnostik ist ein PRO-Feature.', 'error');
      return;
    }
    try {
      setEvaluations(prev => prev.filter(e => e.id !== evaluationId));
      await deletePlayerEvaluationFromFirestore(evaluationId, user);
      showToast('Historischer Eintrag erfolgreich gelöscht.');
    } catch (err) {
      console.error('Error deleting evaluation:', err);
      setEvaluations(getLocalPlayerEvaluations(user?.uid));
      showToast('Fehler beim Löschen des Eintrags.', 'error');
    }
  };

  // Handler to update/backfill an existing historical evaluation record
  const handleSaveEditedEvaluation = async (updatedEval: PlayerEvaluation) => {
    if (!hasProAccess) {
      showToast('Spieler-Diagnostik ist ein PRO-Feature.', 'error');
      return;
    }
    try {
      let finalRatings = updatedEval.ratings || {};
      let finalBio = updatedEval.biologicalMetrics;

      if (updatedEval.category === 'Athletik') {
        const player = groups.flatMap(g => g.players).find(p => p.id === updatedEval.playerId);
        const currentYear = new Date().getFullYear();
        const playerBirthYear = player?.birthYear ? parseBioNumber(player.birthYear) : undefined;
        const defaultAge = playerBirthYear && playerBirthYear > 1980 ? (currentYear - playerBirthYear) : 15;
        const calcAge = parseBioNumber(finalBio?.customAge) || defaultAge;

        if (finalBio && (parseBioNumber(finalBio.standingHeightCm) > 50 || parseBioNumber(finalBio.weightKg) > 15)) {
          const mirwaldResult = calculateMirwaldMaturityOffset({
            standingHeightCm: finalBio.standingHeightCm,
            sittingHeightCm: finalBio.sittingHeightCm,
            weightKg: finalBio.weightKg,
            chronologicalAge: calcAge,
            wingspanCm: finalBio.wingspanCm
          });

          finalBio = {
            ...finalBio,
            maturityOffsetYears: mirwaldResult?.maturityOffsetYears,
            phvClassification: mirwaldResult?.phvClassification,
            estimatedAgeAtPhv: mirwaldResult?.estimatedAgeAtPhv,
            apeIndex: mirwaldResult?.apeIndex,
            sittingHeightRatio: mirwaldResult?.sittingHeightRatio,
            legLengthCm: mirwaldResult?.legLengthCm
          };
        }

        if (updatedEval.athleticMetrics) {
          const testDateTarget = updatedEval.athleticMetrics.testDate || updatedEval.updatedAt;
          const matchingBio = getClosestBiologicalEvaluation(evaluations, updatedEval.playerId, testDateTarget)?.biologicalMetrics;
          const effectiveBio = finalBio || matchingBio;

          const calculatedResult = evaluateAllAthleticTests(
            updatedEval.athleticMetrics,
            effectiveBio,
            player?.birthYear
          );

          const derivedScores: Record<string, number> = {};
          calculatedResult.items.forEach(item => {
            if (item.score > 0) {
              derivedScores[item.id] = item.score;
            }
          });

          finalRatings = {
            ...derivedScores,
            ath_grip_r: Number(updatedEval.athleticMetrics.gripRightKg) || 0,
            ath_grip_l: Number(updatedEval.athleticMetrics.gripLeftKg) || 0,
            ath_cmj: Number(updatedEval.athleticMetrics.cmjHeightCm) || 0,
            ath_lat_push_r: Number(updatedEval.athleticMetrics.lateralPushRightCm) || 0,
            ath_lat_push_l: Number(updatedEval.athleticMetrics.lateralPushLeftCm) || 0,
            ath_sprint_5m: Number(updatedEval.athleticMetrics.sprint5mSec) || 0,
            ath_sprint_10m: Number(updatedEval.athleticMetrics.sprint10mSec) || 0,
            ath_shuttle_r: Number(updatedEval.athleticMetrics.agilityShuttleRightSec) || 0,
            ath_shuttle_l: Number(updatedEval.athleticMetrics.agilityShuttleLeftSec) || 0,
            ath_medball_weight: Number(updatedEval.athleticMetrics.medBallWeightKg) || (finalBio?.phvClassification === 'Pre-PHV' ? 1 : 2),
            ath_medball_dist: Number(updatedEval.athleticMetrics.medBallDistanceM) || 0,
            ath_blazepod_hits_1: Number(updatedEval.athleticMetrics.blazePodSimpleHits) || 0,
            ath_blazepod_hits_2: Number(updatedEval.athleticMetrics.blazePodGoNoGoHits) || 0,
            ath_blazepod_err_2: Number(updatedEval.athleticMetrics.blazePodGoNoGoErrors) || 0
          };
        }
      }

      const evalToSave: PlayerEvaluation = {
        ...updatedEval,
        biologicalMetrics: finalBio,
        ratings: finalRatings,
        updatedAt: updatedEval.updatedAt || Date.now()
      };

      setEvaluations(prev => {
        const idx = prev.findIndex(e => e.id === evalToSave.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = evalToSave;
          return next;
        }
        return [evalToSave, ...prev];
      });

      await savePlayerEvaluationToFirestore({
        id: evalToSave.id,
        playerId: evalToSave.playerId,
        playerName: evalToSave.playerName,
        groupId: evalToSave.groupId,
        groupName: evalToSave.groupName,
        category: evalToSave.category,
        ratings: evalToSave.ratings,
        athleticMetrics: evalToSave.athleticMetrics,
        biologicalMetrics: evalToSave.biologicalMetrics,
        overallNotes: evalToSave.overallNotes,
        strengths: evalToSave.strengths,
        developmentAreas: evalToSave.developmentAreas,
        updatedAt: evalToSave.updatedAt
      }, user);

      showToast('Datensatz erfolgreich aktualisiert!');
    } catch (err) {
      console.error('Error updating evaluation:', err);
      showToast('Fehler beim Aktualisieren des Eintrags.', 'error');
    }
  };

  // Handler to load a historical evaluation record into the current active input form
  const handleLoadEvaluationIntoForm = (evalData: PlayerEvaluation) => {
    if (activeDataEntryTab === 'athletik' && athleticSubTab === 'biological') {
      if (evalData.biologicalMetrics) {
        setCurrentBioMetrics({
          standingHeightCm: evalData.biologicalMetrics.standingHeightCm || '',
          sittingHeightCm: evalData.biologicalMetrics.sittingHeightCm || '',
          weightKg: evalData.biologicalMetrics.weightKg || '',
          wingspanCm: evalData.biologicalMetrics.wingspanCm || '',
          customAge: evalData.biologicalMetrics.customAge || '',
          measurementDate: evalData.biologicalMetrics.measurementDate || ''
        });
      }
      setIsHistoryModalOpen(false);
      showToast('Biologische Messwerte wurden erfolgreich in die Eingabemaske geladen.');
      return;
    }

    if (activeDataEntryTab === 'athletik' && athleticSubTab === 'athletic') {
      if (evalData.athleticMetrics) {
        const fallbackDate = evalData.updatedAt ? new Date(evalData.updatedAt).toISOString().split('T')[0] : new Date().toISOString().substring(0, 10);
        setCurrentAthleticMetrics({
          testDate: evalData.athleticMetrics.testDate || fallbackDate,
          gripRightKg: evalData.athleticMetrics.gripRightKg || '',
          gripLeftKg: evalData.athleticMetrics.gripLeftKg || '',
          cmjHeightCm: evalData.athleticMetrics.cmjHeightCm || '',
          lateralPushRightCm: evalData.athleticMetrics.lateralPushRightCm || '',
          lateralPushLeftCm: evalData.athleticMetrics.lateralPushLeftCm || '',
          sprint5mSec: evalData.athleticMetrics.sprint5mSec || '',
          sprint10mSec: evalData.athleticMetrics.sprint10mSec || '',
          agilityShuttleRightSec: evalData.athleticMetrics.agilityShuttleRightSec || '',
          agilityShuttleLeftSec: evalData.athleticMetrics.agilityShuttleLeftSec || '',
          medBallWeightKg: evalData.athleticMetrics.medBallWeightKg || '2',
          medBallDistanceM: evalData.athleticMetrics.medBallDistanceM || '',
          blazePodSimpleHits: evalData.athleticMetrics.blazePodSimpleHits || '',
          blazePodGoNoGoHits: evalData.athleticMetrics.blazePodGoNoGoHits || '',
          blazePodGoNoGoErrors: evalData.athleticMetrics.blazePodGoNoGoErrors ?? ''
        });
      }
      if (evalData.ratings) {
        setCurrentRatingScores(evalData.ratings);
      }
      setIsHistoryModalOpen(false);
      showToast('Athletiktest-Messwerte wurden erfolgreich in die Eingabemaske geladen.');
      return;
    }

    if (evalData.ratings) {
      setCurrentRatingScores(evalData.ratings);
    }
    if (evalData.athleticMetrics) {
      setCurrentAthleticMetrics({
        gripRightKg: evalData.athleticMetrics.gripRightKg || '',
        gripLeftKg: evalData.athleticMetrics.gripLeftKg || '',
        cmjHeightCm: evalData.athleticMetrics.cmjHeightCm || '',
        lateralPushRightCm: evalData.athleticMetrics.lateralPushRightCm || '',
        lateralPushLeftCm: evalData.athleticMetrics.lateralPushLeftCm || '',
        sprint5mSec: evalData.athleticMetrics.sprint5mSec || '',
        sprint10mSec: evalData.athleticMetrics.sprint10mSec || '',
        agilityShuttleRightSec: evalData.athleticMetrics.agilityShuttleRightSec || '',
        agilityShuttleLeftSec: evalData.athleticMetrics.agilityShuttleLeftSec || '',
        medBallWeightKg: evalData.athleticMetrics.medBallWeightKg || '2',
        medBallDistanceM: evalData.athleticMetrics.medBallDistanceM || '',
        blazePodSimpleHits: evalData.athleticMetrics.blazePodSimpleHits || '',
        blazePodGoNoGoHits: evalData.athleticMetrics.blazePodGoNoGoHits || '',
        blazePodGoNoGoErrors: evalData.athleticMetrics.blazePodGoNoGoErrors ?? ''
      });
    }
    if (evalData.biologicalMetrics) {
      setCurrentBioMetrics({
        standingHeightCm: evalData.biologicalMetrics.standingHeightCm || '',
        sittingHeightCm: evalData.biologicalMetrics.sittingHeightCm || '',
        weightKg: evalData.biologicalMetrics.weightKg || '',
        wingspanCm: evalData.biologicalMetrics.wingspanCm || '',
        customAge: evalData.biologicalMetrics.customAge || '',
        measurementDate: evalData.biologicalMetrics.measurementDate || ''
      });
    }
    setIsHistoryModalOpen(false);
    showToast('Werte wurden erfolgreich in die Eingabemaske geladen.');
  };

  // Athletic Test PDF Export Handler (Allgemeines Testmanual & Blanko-Protokoll)
  const handleDownloadAthleticTestPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateAthleticTestPDF({
        clubLogoUrl: currentClub?.logoUrl,
        clubName: currentClub?.name || clubName,
        trainerName: userProfile?.displayName || user?.displayName || 'Trainer',
        date: new Date().toISOString().substring(0, 10)
      });
      showToast('Allgemeines Athletiktest-Manual & Protokoll als PDF heruntergeladen!');
    } catch (err) {
      console.error('Error generating Athletic Test PDF:', err);
      showToast('Fehler beim Erstellen der PDF-Datei.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  // Available Goalkeepers for Spielzeiten Filter
  const availableFilterPlayers = useMemo(() => {
    if (filterPlaytimeGroup === 'ALL') {
      const all: Player[] = [];
      const seen = new Set<string>();
      groups.forEach(g => {
        (g.players || []).forEach(p => {
          if (!p.archived && !seen.has(p.id)) {
            seen.add(p.id);
            all.push(p);
          }
        });
      });
      return all;
    }
    const grp = groups.find(g => g.id === filterPlaytimeGroup);
    return (grp?.players || []).filter(p => !p.archived);
  }, [groups, filterPlaytimeGroup]);

  // Filtered Match Playtimes
  const filteredMatchPlaytimes = useMemo(() => {
    return matchPlaytimes.filter(m => {
      const matchesGroup = filterPlaytimeGroup === 'ALL' || m.groupId === filterPlaytimeGroup || m.team === filterPlaytimeGroup;
      const matchesPlayer = filterPlaytimePlayer === 'ALL' || (
        m.playerMinutes && (m.playerMinutes[filterPlaytimePlayer] !== undefined && Number(m.playerMinutes[filterPlaytimePlayer]) > 0)
      );
      const matchesType = filterPlaytimeType === 'ALL' || m.matchType === filterPlaytimeType;
      const q = searchPlaytime.trim().toLowerCase();
      const matchesSearch = !q ||
        (m.opponent && m.opponent.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (m.team && m.team.toLowerCase().includes(q)) ||
        (m.groupName && m.groupName.toLowerCase().includes(q)) ||
        (m.date && m.date.toLowerCase().includes(q));
      return matchesGroup && matchesPlayer && matchesType && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [matchPlaytimes, filterPlaytimeGroup, filterPlaytimePlayer, filterPlaytimeType, searchPlaytime]);

  // Handlers for Match Playtimes
  const handleCancelEditMatch = () => {
    setEditingMatchId(null);
    setMatchFormData({
      date: new Date().toISOString().substring(0, 10),
      team: MATCH_TEAMS[0],
      opponent: '',
      location: 'Heimspiel',
      matchType: 'Meisterschaftsspiel',
      groupId: groups[0]?.id || '',
      playerMinutes: {},
      playerGrades: {},
      playerBenchStatus: {},
      notes: ''
    });
  };

  const handleEditMatch = (match: PlayerMatchPlaytime) => {
    setMatchFormData({
      date: match.date,
      team: match.team || MATCH_TEAMS[0],
      opponent: match.opponent || '',
      location: match.location || 'Heimspiel',
      matchType: match.matchType || 'Meisterschaftsspiel',
      groupId: match.groupId,
      playerMinutes: { ...match.playerMinutes },
      playerGrades: { ...(match.playerGrades || {}) },
      playerBenchStatus: { ...(match.playerBenchStatus || {}) },
      notes: match.notes || ''
    });
    setEditingMatchId(match.id);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveGroupId = matchFormData.groupId || groups[0]?.id;
    if (!effectiveGroupId) {
      showToast('Bitte wähle eine Trainingsgruppe aus.', 'error');
      return;
    }

    const group = groups.find(g => g.id === effectiveGroupId);

    try {
      await saveMatchPlaytimeToFirestore({
        ...(editingMatchId ? { id: editingMatchId } : {}),
        date: matchFormData.date,
        team: matchFormData.team || group?.ageCategory || group?.name || 'Team',
        opponent: matchFormData.opponent?.trim() || '',
        location: matchFormData.location || 'Heimspiel',
        matchType: matchFormData.matchType,
        groupId: effectiveGroupId,
        groupName: group?.name || '',
        playerMinutes: matchFormData.playerMinutes,
        playerGrades: matchFormData.playerGrades,
        playerBenchStatus: matchFormData.playerBenchStatus,
        notes: matchFormData.notes.trim()
      }, user);

      showToast(editingMatchId ? 'Spielzeit erfolgreich aktualisiert!' : 'Neues Spiel erfolgreich gespeichert!');
      setEditingMatchId(null);
      setMatchFormData(prev => ({
        date: new Date().toISOString().substring(0, 10),
        team: prev.team || MATCH_TEAMS[0],
        opponent: '',
        location: 'Heimspiel',
        matchType: 'Meisterschaftsspiel',
        groupId: prev.groupId || groups[0]?.id || '',
        playerMinutes: {},
        playerGrades: {},
        playerBenchStatus: {},
        notes: ''
      }));
    } catch (err) {
      console.error('Error saving match playtime:', err);
      showToast('Fehler beim Speichern des Spiels.', 'error');
    }
  };

  const handleDeleteMatch = async (matchId: string, matchDate?: string, opponent?: string) => {
    const label = opponent ? `gegen "${opponent}"` : matchDate ? `vom ${new Date(matchDate).toLocaleDateString('de-DE')}` : '';
    if (window.confirm(`Möchtest du dieses Spiel ${label} wirklich löschen?`)) {
      try {
        await deleteMatchPlaytimeFromFirestore(matchId, user);
        if (editingMatchId === matchId) {
          handleCancelEditMatch();
        }
        showToast('Spiel erfolgreich gelöscht.');
      } catch (err) {
        console.error('Error deleting match:', err);
        showToast('Fehler beim Löschen des Spiels.', 'error');
      }
    }
  };

  const adjustPlayerMinutes = (playerId: string, delta: number) => {
    setMatchFormData(prev => {
      const current = prev.playerMinutes[playerId] ?? 0;
      const next = Math.max(0, current + delta);
      const nextBench = { ...prev.playerBenchStatus };
      if (next > 0) {
        nextBench[playerId] = false;
      }
      return {
        ...prev,
        playerMinutes: {
          ...prev.playerMinutes,
          [playerId]: next
        },
        playerBenchStatus: nextBench
      };
    });
  };

  const setPlayerMinutesDirect = (playerId: string, minutes: number) => {
    setMatchFormData(prev => {
      const nextMins = Math.max(0, minutes);
      const nextBench = { ...prev.playerBenchStatus };
      if (nextMins > 0) {
        nextBench[playerId] = false;
      }
      return {
        ...prev,
        playerMinutes: {
          ...prev.playerMinutes,
          [playerId]: nextMins
        },
        playerBenchStatus: nextBench
      };
    });
  };

  const setPlayerBenchStatus = (playerId: string, isBench: boolean) => {
    setMatchFormData(prev => {
      const nextMins = { ...prev.playerMinutes };
      const nextBench = { ...prev.playerBenchStatus };
      if (isBench) {
        nextMins[playerId] = 0;
        nextBench[playerId] = true;
      } else {
        nextBench[playerId] = false;
      }
      return {
        ...prev,
        playerMinutes: nextMins,
        playerBenchStatus: nextBench
      };
    });
  };

  const setPlayerGrade = (playerId: string, grade: number | undefined) => {
    setMatchFormData(prev => {
      const nextGrades = { ...prev.playerGrades };
      if (grade === undefined || isNaN(grade) || grade <= 0) {
        delete nextGrades[playerId];
      } else {
        nextGrades[playerId] = grade;
      }
      return {
        ...prev,
        playerGrades: nextGrades
      };
    });
  };

  const getMatchGradeBadge = (grade: number) => {
    switch (grade) {
      case 1:
        return { 
          label: 'Note 1 (≥5 herausragende Aktionen)', 
          short: 'Note 1', 
          full: '1 - mindestens fünf herausragende Aktionen', 
          style: 'bg-emerald-950 text-emerald-300 border-emerald-700/70' 
        };
      case 2:
        return { 
          label: 'Note 2 (≥2 herausragende Aktionen)', 
          short: 'Note 2', 
          full: '2 - mindestens zwei herausragende Aktionen', 
          style: 'bg-teal-950 text-teal-300 border-teal-700/70' 
        };
      case 3:
        return { 
          label: 'Note 3 (einige gute Aktionen)', 
          short: 'Note 3', 
          full: '3 - einige gute Aktionen, aber keine schlechten', 
          style: 'bg-sky-950 text-sky-300 border-sky-700/70' 
        };
      case 4:
        return { 
          label: 'Note 4 (ordentlich mit Fehlern)', 
          short: 'Note 4', 
          full: '4 - ordentliche Aktionen, mit schlechten Aktionen', 
          style: 'bg-amber-950 text-amber-300 border-amber-700/70' 
        };
      case 5:
        return { 
          label: 'Note 5 (mehr schlechte Aktionen)', 
          short: 'Note 5', 
          full: '5 - mehr schlechte als gute Aktionen', 
          style: 'bg-rose-950 text-rose-300 border-rose-700/70' 
        };
      default:
        return { 
          label: `Note ${grade}`, 
          short: `Note ${grade}`, 
          full: `Note ${grade}`, 
          style: 'bg-slate-900 text-slate-300 border-slate-700' 
        };
    }
  };

  // Available filter players for Feedbackgespräche right column
  const availableFeedbackFilterPlayers = useMemo(() => {
    if (filterFeedbackGroup === 'ALL') {
      const allP: { id: string; firstName: string; lastName: string; jerseyNumber?: number | string }[] = [];
      const seen = new Set<string>();
      groups.forEach(g => {
        (g.players || []).forEach(p => {
          if (!p.archived && !seen.has(p.id)) {
            seen.add(p.id);
            allP.push({ id: p.id, firstName: p.firstName, lastName: p.lastName, jerseyNumber: p.jerseyNumber });
          }
        });
      });
      return allP;
    }
    const grp = groups.find(g => g.id === filterFeedbackGroup);
    return (grp?.players || []).filter(p => !p.archived);
  }, [groups, filterFeedbackGroup]);

  // Filtered feedback talks for right column
  const filteredFeedbackTalks = useMemo(() => {
    return feedbackTalks
      .filter(talk => {
        if (filterFeedbackGroup !== 'ALL' && talk.groupId !== filterFeedbackGroup) {
          return false;
        }
        if (filterFeedbackPlayer !== 'ALL' && talk.playerId !== filterFeedbackPlayer) {
          return false;
        }
        if (searchFeedback.trim()) {
          const query = searchFeedback.toLowerCase();
          const player = groups.flatMap(g => g.players || []).find(p => p.id === talk.playerId);
          const playerName = player ? `${player.firstName} ${player.lastName}`.toLowerCase() : (talk.playerName || '').toLowerCase();
          const trainer1 = (talk.trainer1 || '').toLowerCase();
          const trainer2 = (talk.trainer2 || '').toLowerCase();
          const keyPoints = (talk.keyPoints || '').toLowerCase();
          const groupName = (talk.groupName || '').toLowerCase();
          if (!playerName.includes(query) && !trainer1.includes(query) && !trainer2.includes(query) && !keyPoints.includes(query) && !groupName.includes(query)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [feedbackTalks, filterFeedbackGroup, filterFeedbackPlayer, searchFeedback, groups]);

  // Handlers for Feedbackgespräche
  const handleEditFeedback = (talk: PlayerFeedbackTalk) => {
    setEditingFeedbackId(talk.id);
    if (talk.groupId) {
      setSelectedFeedbackGroupId(talk.groupId);
    }
    if (talk.playerId) {
      setSelectedFeedbackPlayerId(talk.playerId);
    }
    setFeedbackFormData({
      date: talk.date,
      trainer1: talk.trainer1,
      trainer2: talk.trainer2 || '',
      keyPoints: talk.keyPoints
    });
  };

  const handleCancelEditFeedback = () => {
    setEditingFeedbackId(null);
    setFeedbackFormData({
      date: new Date().toISOString().substring(0, 10),
      trainer1: userProfile?.displayName || user?.displayName || user?.email || 'Trainer',
      trainer2: '',
      keyPoints: ''
    });
  };

  const handleSaveFeedbackTalk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasProAccess) {
      showToast('Feedbackgespräche sind ein PRO-Feature.', 'error');
      return;
    }
    const effectiveGroupId = selectedFeedbackGroupId || groups[0]?.id;
    const currentGrp = groups.find(g => g.id === effectiveGroupId) || groups[0];
    const activePlayers = (currentGrp?.players || []).filter(p => !p.archived);
    const effectivePlayerId = selectedFeedbackPlayerId || (activePlayers.length > 0 ? activePlayers[0].id : '');

    if (!canEditEvaluation(currentGrp)) {
      showToast('Nur der zugeordnete Trainer oder Club-Admin darf Feedbackgespräche für diese Gruppe eintragen.', 'error');
      return;
    }

    if (!effectivePlayerId) {
      showToast('Bitte wähle zuerst einen Torhüter aus.', 'error');
      return;
    }
    if (!feedbackFormData.trainer1.trim()) {
      showToast('Bitte gib den Namen von Trainer 1 an.', 'error');
      return;
    }
    if (!feedbackFormData.keyPoints.trim()) {
      showToast('Bitte trage die 3 zentralen Eckpunkte des Gesprächs ein.', 'error');
      return;
    }

    const player = (currentGrp?.players || []).find(p => p.id === effectivePlayerId) || groups.flatMap(g => g.players || []).find(p => p.id === effectivePlayerId);

    try {
      await saveFeedbackTalkToFirestore({
        ...(editingFeedbackId ? { id: editingFeedbackId } : {}),
        groupId: effectiveGroupId,
        groupName: currentGrp?.name || '',
        playerId: effectivePlayerId,
        playerName: player ? `${player.firstName} ${player.lastName}` : '',
        date: feedbackFormData.date,
        trainer1: feedbackFormData.trainer1.trim(),
        trainer2: feedbackFormData.trainer2.trim(),
        keyPoints: feedbackFormData.keyPoints.trim()
      }, user);

      showToast(editingFeedbackId ? 'Feedbackgespräch erfolgreich aktualisiert!' : 'Feedbackgespräch erfolgreich gespeichert!');
      setEditingFeedbackId(null);
      setFeedbackFormData(prev => ({
        ...prev,
        keyPoints: ''
      }));
    } catch (err) {
      console.error('Error saving feedback talk:', err);
      showToast('Fehler beim Speichern des Feedbackgesprächs.', 'error');
    }
  };

  const handleDeleteFeedbackTalk = async (talkId: string) => {
    if (!hasProAccess) {
      showToast('Feedbackgespräche sind ein PRO-Feature.', 'error');
      return;
    }
    const talkToDelete = feedbackTalks.find(t => t.id === talkId);
    const talkGroup = groups.find(g => g.id === talkToDelete?.groupId);
    if (!canEditEvaluation(talkGroup)) {
      showToast('Nur der zugeordnete Trainer oder Club-Admin darf dieses Gespräch löschen.', 'error');
      return;
    }

    if (window.confirm('Möchtest du dieses Feedbackgespräch wirklich löschen?')) {
      try {
        await deleteFeedbackTalkFromFirestore(talkId, user);
        showToast('Feedbackgespräch erfolgreich gelöscht.');
        if (editingFeedbackId === talkId) {
          handleCancelEditFeedback();
        }
      } catch (err) {
        console.error('Error deleting feedback talk:', err);
        showToast('Fehler beim Löschen des Feedbackgesprächs.', 'error');
      }
    }
  };

  const getReasonBadge = (reason: AbsenceReason) => {
    switch (reason) {
      case 'Krankheit':
        return { label: 'Krankheit', icon: HeartPulse, style: 'bg-rose-950/80 text-rose-300 border-rose-700/70' };
      case 'Belastungssteuerung':
        return { label: 'Belastungssteuerung', icon: Activity, style: 'bg-amber-950/80 text-amber-300 border-amber-700/70' };
      case 'Schule':
        return { label: 'Schule / Ausbildung', icon: GraduationCap, style: 'bg-sky-950/80 text-sky-300 border-sky-700/70' };
      case 'Verletzung':
        return { label: 'Verletzung', icon: AlertCircle, style: 'bg-red-950/80 text-red-300 border-red-700/70' };
      case 'Privat':
        return { label: 'Privat', icon: Shield, style: 'bg-purple-950/80 text-purple-300 border-purple-700/70' };
      case 'Sonstiges':
      default:
        return { label: 'Sonstiges', icon: HelpCircle, style: 'bg-slate-900 text-slate-300 border-slate-700' };
    }
  };

  // Get score visual styling (1 to 5 with 0.5 steps)
  const getScoreBadge = (score: number, cat: EvaluationCategory = 'Technik', skill?: SkillDefinition) => {
    const levels = skill ? getSkillScaleLevels(skill, cat) : getEvaluationScaleLevels(cat);
    const lvl = levels.find(l => l.level === score);
    const defLabel = lvl ? lvl.definition : '';

    if (score >= 5) return { bg: 'bg-emerald-500 text-slate-950 font-black border-emerald-400', label: `Stufe 5: ${defLabel || 'Benchmark / Exzellenz'}` };
    if (score >= 4.5) return { bg: 'bg-emerald-600/90 text-white font-bold border-emerald-500', label: `Stufe 4,5: ${defLabel || 'Herausragend'}` };
    if (score >= 4) return { bg: 'bg-sky-500 text-slate-950 font-black border-sky-400', label: `Stufe 4: ${defLabel || 'Wettkampfstark'}` };
    if (score >= 3.5) return { bg: 'bg-sky-600/90 text-white font-bold border-sky-500', label: `Stufe 3,5: ${defLabel || 'Überdurchschnittlich'}` };
    if (score >= 3) return { bg: 'bg-teal-500 text-slate-950 font-black border-teal-400', label: `Stufe 3: ${defLabel || 'Altersgemäßer Standard'}` };
    if (score >= 2.5) return { bg: 'bg-amber-500/90 text-slate-950 font-bold border-amber-400', label: `Stufe 2,5: ${defLabel || 'Solide Ansätze'}` };
    if (score >= 2) return { bg: 'bg-amber-600 text-white font-black border-amber-500', label: `Stufe 2: ${defLabel || 'Entwicklungsfähig'}` };
    if (score >= 1.5) return { bg: 'bg-rose-500/90 text-white font-bold border-rose-400', label: `Stufe 1,5: ${defLabel || 'Erste Ansätze'}` };
    return { bg: 'bg-rose-600 text-white font-black border-rose-400', label: `Stufe 1: ${defLabel || 'Basisniveau'}` };
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header & Sub-Navigation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
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
                <span>NextLevel Goalkeeping Academy — Organisationsbereich</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Organisation & Trainingsverwaltung
              </h1>
            </div>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-md",
            feedback.type === 'success' 
              ? "bg-emerald-950/80 border border-emerald-600 text-emerald-200" 
              : "bg-rose-950/80 border border-rose-600 text-rose-200"
          )}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* 5 Modern Sub-Tabs (Buttons) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {/* Button 0: Periodisierung (Ganz links) */}
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('periodization');
              setPeriodizationStage('macro');
            }}
            className={cn(
              "p-3.5 sm:p-4 rounded-2xl border text-left transition flex items-center gap-3 shadow-sm active:scale-98",
              activeSubTab === 'periodization'
                ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/50 shadow-lg font-extrabold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 hover:border-slate-700"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
              activeSubTab === 'periodization' ? "bg-emerald-700/80 border-emerald-400/40 text-white" : "bg-slate-900 border-slate-800 text-slate-400"
            )}>
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs sm:text-sm font-bold truncate">Periodisierung</span>
              <span className={cn("text-[10px] block truncate", activeSubTab === 'periodization' ? "text-emerald-100" : "text-slate-500")}>
                Saison-, Meso- & Mikroplan
              </span>
            </div>
          </button>

          {/* Button 1: Trainingsstruktur */}
          <button
            type="button"
            onClick={() => setActiveSubTab('structure')}
            className={cn(
              "p-3.5 sm:p-4 rounded-2xl border text-left transition flex items-center gap-3 shadow-sm active:scale-98",
              activeSubTab === 'structure'
                ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/50 shadow-lg font-extrabold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 hover:border-slate-700"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
              activeSubTab === 'structure' ? "bg-emerald-700/80 border-emerald-400/40 text-white" : "bg-slate-900 border-slate-800 text-slate-400"
            )}>
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs sm:text-sm font-bold truncate">Trainingsstruktur</span>
              <span className={cn("text-[10px] block truncate", activeSubTab === 'structure' ? "text-emerald-100" : "text-slate-500")}>
                Phasen & Favoriten
              </span>
            </div>
          </button>

          {/* Button 2: Trainingsgruppe */}
          <button
            type="button"
            onClick={() => setActiveSubTab('groups')}
            className={cn(
              "p-3.5 sm:p-4 rounded-2xl border text-left transition flex items-center gap-3 shadow-sm active:scale-98",
              activeSubTab === 'groups'
                ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/50 shadow-lg font-extrabold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 hover:border-slate-700"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
              activeSubTab === 'groups' ? "bg-emerald-700/80 border-emerald-400/40 text-white" : "bg-slate-900 border-slate-800 text-slate-400"
            )}>
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs sm:text-sm font-bold truncate">Trainingsgruppe</span>
              <span className={cn("text-[10px] block truncate", activeSubTab === 'groups' ? "text-emerald-100" : "text-slate-500")}>
                {groups.length} {groups.length === 1 ? 'Gruppe' : 'Gruppen'} angelegt
              </span>
            </div>
          </button>

          {/* Button 3: Dateneingabe (Ersetzt Fehlzeiten) */}
          <button
            type="button"
            onClick={() => setActiveSubTab('dataEntry')}
            className={cn(
              "p-3.5 sm:p-4 rounded-2xl border text-left transition flex items-center gap-3 shadow-sm active:scale-98",
              (activeSubTab === 'dataEntry' || activeSubTab === 'absences')
                ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/50 shadow-lg font-extrabold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 hover:border-slate-700"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
              (activeSubTab === 'dataEntry' || activeSubTab === 'absences') ? "bg-emerald-700/80 border-emerald-400/40 text-white" : "bg-slate-900 border-slate-800 text-slate-400"
            )}>
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs sm:text-sm font-bold truncate">Dateneingabe</span>
              <span className={cn("text-[10px] block truncate", (activeSubTab === 'dataEntry' || activeSubTab === 'absences') ? "text-emerald-100" : "text-slate-500")}>
                Skills & Fehlzeiten
              </span>
            </div>
          </button>

          {/* Button 4: Datenauswertung */}
          <button
            type="button"
            onClick={() => setActiveSubTab('stats')}
            className={cn(
              "p-3.5 sm:p-4 rounded-2xl border text-left transition flex items-center gap-3 shadow-sm active:scale-98",
              activeSubTab === 'stats'
                ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/50 shadow-lg font-extrabold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 hover:border-slate-700"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
              activeSubTab === 'stats' ? "bg-emerald-700/80 border-emerald-400/40 text-white" : "bg-slate-900 border-slate-800 text-slate-400"
            )}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs sm:text-sm font-bold truncate">Datenauswertung</span>
              <span className={cn("text-[10px] block truncate", activeSubTab === 'stats' ? "text-emerald-100" : "text-slate-500")}>
                Statistiken & Berichte
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 0: PERIODISIERUNG (SAISON, MAKRO, MESO & MIKRO)               */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'periodization' && (
        <PeriodizationView
          groups={groups}
          showToast={showToast}
          onNavigateToPlanner={onNavigateToPlanner}
          initialStage={periodizationStage}
        />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 1: TRAININGSSTRUKTUR                                          */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'structure' && (
        <TrainingStructureView onNavigateToPlanner={onNavigateToPlanner} />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 2: TRAININGSGRUPPEN & SPIELER                                 */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'groups' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div>
              <h3 className="text-base font-extrabold text-white">Eigene Trainingsgruppen</h3>
              <p className="text-xs text-slate-400">
                Erstelle Trainingsgruppen für deine Altersklassen und ordne ihnen konkrete Torhüter zu.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewGroupModal}
              className="px-4 py-2.5 rounded-xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Neue Trainingsgruppe anlegen</span>
            </button>
          </div>

          {/* Groups Grid */}
          {groups.length === 0 ? (
            <div className="p-12 text-center bg-slate-950 rounded-3xl border border-dashed border-slate-800 space-y-3">
              <Users className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">
                Noch keine Trainingsgruppen angelegt.
              </p>
              <button
                type="button"
                onClick={handleOpenNewGroupModal}
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                + Jetzt die erste Trainingsgruppe erstellen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groups.map(group => {
                const colorObj = GROUP_COLORS.find(c => c.key === group.color) || GROUP_COLORS[0];

                return (
                  <div 
                    key={group.id} 
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col justify-between space-y-4 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className={cn("px-2.5 py-1 rounded-lg text-xs font-black border", colorObj.badge)}>
                              {group.ageCategory || 'Gruppe'}
                            </span>
                            <h4 className="text-base font-extrabold text-white truncate">
                              {group.name}
                            </h4>
                          </div>

                          {/* Coach Badge */}
                          {(group.assignedCoachEmail || group.assignedCoachName) ? (
                            <div className="flex items-center gap-1.5 text-xs text-sky-300 mt-1.5">
                              <Shield className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                              <span>Zuständiger Trainer: <strong className="font-bold text-sky-200">{group.assignedCoachName || group.assignedCoachEmail}</strong></span>
                            </div>
                          ) : group.clubId ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                              <Shield className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span className="italic">Trainer: Club-Admin (nicht zugewiesen)</span>
                            </div>
                          ) : null}

                          {(group.ownerName || group.createdByName || group.ownerEmail) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                              <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                              <span className="truncate">Erstellt von: <strong className="text-slate-300">{group.ownerName || group.createdByName || group.ownerEmail}</strong></span>
                              {group.createdByRole === 'club_admin' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 flex-shrink-0">Club Admin</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditGroupModal(group)}
                            title="Gruppe bearbeiten"
                            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group)}
                            title="Gruppe löschen"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-950/50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {group.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {group.description}
                        </p>
                      )}

                      {/* Players List */}
                      <div className="pt-2">
                        {(() => {
                          const activePlayers = (group.players || []).filter(p => !p.archived);

                          return (
                            <>
                              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                                <span className="font-bold text-slate-300">
                                  Torhüter ({activePlayers.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddPlayerModal(group)}
                                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>+ Spieler hinzufügen</span>
                                </button>
                              </div>

                              {activePlayers.length === 0 ? (
                                <div className="py-4 text-center text-xs text-slate-500">
                                  Noch keine aktiven Torhüter in dieser Gruppe.
                                </div>
                              ) : (
                                <div className="divide-y divide-slate-800/60 mt-1">
                                  {activePlayers.map(player => {
                                    const pScore = getPlayerOverallScore(player, evaluations);
                                    const initials = getPlayerInitials(player.firstName, player.lastName);

                                    return (
                                      <div key={player.id} className="py-2.5 flex items-center justify-between gap-3 text-xs group">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div 
                                            className="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-slate-200 text-[10.5px] flex-shrink-0 shadow-inner"
                                            title={`Initialen: ${player.firstName} ${player.lastName}`}
                                          >
                                            {initials}
                                          </div>
                                          <div className="min-w-0">
                                            <span className="font-bold text-white block truncate">
                                              {player.firstName} {player.lastName}
                                            </span>
                                            <span className="text-[10px] text-slate-500 block truncate">
                                              {player.birthYear ? `Jg. ${player.birthYear}` : 'Kein Jahrgang'} {player.notes ? `• ${player.notes}` : ''}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {pScore ? (
                                            <span 
                                              className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm"
                                              title={`Ø Gesamtscore: ${pScore} / 5.0`}
                                            >
                                              ⭐ {pScore}
                                            </span>
                                          ) : (
                                            <span 
                                              className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800"
                                              title="Noch keine Bewertung vorhanden"
                                            >
                                              –
                                            </span>
                                          )}

                                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenMovePlayerModal(group, player)}
                                              title="Torhüter in andere Trainingsgruppe verschieben"
                                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition"
                                            >
                                              <ArrowRightLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditPlayerModal(group, player)}
                                              title="Spieler bearbeiten"
                                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleArchivePlayer(group, player.id, `${player.firstName} ${player.lastName}`)}
                                              title="Spieler archivieren"
                                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-950/40 transition"
                                            >
                                              <Archive className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Toolbar with Archiv Button on the bottom right */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="text-xs text-slate-400">
              {archivedPlayers.length > 0 ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>{archivedPlayers.length} {archivedPlayers.length === 1 ? 'Torhüter befindet sich' : 'Torhüter befinden sich'} im Archiv.</span>
                </span>
              ) : (
                <span className="text-slate-500">Keine archivierten Torhüter vorhanden.</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsArchiveModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 flex items-center gap-2 shadow-xl transition active:scale-95 group"
            >
              <Archive className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Archiv</span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-950 text-amber-300 border border-amber-800/60">
                {archivedPlayers.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 3: DATENEINGABE (Fehlzeiten + Technik, Taktik, Athletik, Mental) */}
      {/* --------------------------------------------------------------------- */}
      {(activeSubTab === 'dataEntry' || activeSubTab === 'absences') && (
        <div className="space-y-6">
          {/* Dateneingabe 7-Sub-Point Top Navigation */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {/* Point 1: Fehlzeiten */}
              <button
                type="button"
                onClick={() => setActiveDataEntryTab('absences')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition flex items-center justify-center sm:justify-start gap-2.5 shadow-sm active:scale-98 cursor-pointer",
                  activeDataEntryTab === 'absences'
                    ? "bg-amber-600 border-amber-500 text-white shadow-amber-950/50 shadow-lg font-black"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeDataEntryTab === 'absences' ? "bg-amber-700/80 border-amber-400/40 text-white" : "bg-slate-900 border-slate-800 text-amber-400"
                )}>
                  <CalendarX2 className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-xs sm:text-sm font-bold truncate">Fehlzeiten</span>
                </div>
              </button>

              {/* Point 2: Spielzeiten (neu, rechts neben Fehlzeiten) */}
              <button
                type="button"
                onClick={() => setActiveDataEntryTab('playtimes')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition flex items-center justify-center sm:justify-start gap-2.5 shadow-sm active:scale-98 cursor-pointer",
                  activeDataEntryTab === 'playtimes'
                    ? "bg-teal-600 border-teal-500 text-white shadow-teal-950/50 shadow-lg font-black"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeDataEntryTab === 'playtimes' ? "bg-teal-700/80 border-teal-400/40 text-white" : "bg-slate-900 border-slate-800 text-teal-400"
                )}>
                  <Timer className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-xs sm:text-sm font-bold truncate">Spielzeiten</span>
                </div>
              </button>

              {/* Point 3: Technik */}
              <button
                type="button"
                onClick={() => setActiveDataEntryTab('technik')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition flex items-center justify-center sm:justify-start gap-2.5 shadow-sm active:scale-98 cursor-pointer",
                  activeDataEntryTab === 'technik'
                    ? "bg-purple-600 border-purple-500 text-white shadow-purple-950/50 shadow-lg font-black"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeDataEntryTab === 'technik' ? "bg-purple-700/80 border-purple-400/40 text-white" : "bg-slate-900 border-slate-800 text-purple-400"
                )}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="block text-xs sm:text-sm font-bold truncate">Technik</span>
                    {!hasProAccess && (
                      <span className="text-[8px] font-black px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                        PRO
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Point 4: Taktik */}
              <button
                type="button"
                onClick={() => setActiveDataEntryTab('taktik')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition flex items-center justify-center sm:justify-start gap-2.5 shadow-sm active:scale-98 cursor-pointer",
                  activeDataEntryTab === 'taktik'
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/50 shadow-lg font-black"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeDataEntryTab === 'taktik' ? "bg-emerald-700/80 border-emerald-400/40 text-white" : "bg-slate-900 border-slate-800 text-emerald-400"
                )}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="block text-xs sm:text-sm font-bold truncate">Taktik</span>
                    {!hasProAccess && (
                      <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        PRO
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Point 5: Athletik */}
              <button
                type="button"
                onClick={() => setActiveDataEntryTab('athletik')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition flex items-center justify-center sm:justify-start gap-2.5 shadow-sm active:scale-98 cursor-pointer",
                  activeDataEntryTab === 'athletik'
                    ? "bg-sky-600 border-sky-500 text-white shadow-sky-950/50 shadow-lg font-black"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeDataEntryTab === 'athletik' ? "bg-sky-700/80 border-sky-400/40 text-white" : "bg-slate-900 border-slate-800 text-sky-400"
                )}>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="block text-xs sm:text-sm font-bold truncate">Athletik</span>
                    {!hasProAccess && (
                      <span className="text-[8px] font-black px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                        PRO
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Point 6: Mental */}
              <button
                type="button"
                onClick={() => setActiveDataEntryTab('mental')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition flex items-center justify-center sm:justify-start gap-2.5 shadow-sm active:scale-98 cursor-pointer",
                  activeDataEntryTab === 'mental'
                    ? "bg-rose-600 border-rose-500 text-white shadow-rose-950/50 shadow-lg font-black"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeDataEntryTab === 'mental' ? "bg-rose-700/80 border-rose-400/40 text-white" : "bg-slate-900 border-slate-800 text-rose-400"
                )}>
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="block text-xs sm:text-sm font-bold truncate">Mental</span>
                    {!hasProAccess && (
                      <span className="text-[8px] font-black px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                        PRO
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Point 7: Feedbackgespräche (neu, ganz rechts neben Mental) */}
              <button
                type="button"
                onClick={() => setActiveDataEntryTab('feedback_talks')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition flex items-center justify-center sm:justify-start gap-2.5 shadow-sm active:scale-98 col-span-2 sm:col-span-1 cursor-pointer",
                  activeDataEntryTab === 'feedback_talks'
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-indigo-950/50 shadow-lg font-black"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
                  activeDataEntryTab === 'feedback_talks' ? "bg-indigo-700/80 border-indigo-400/40 text-white" : "bg-slate-900 border-slate-800 text-indigo-400"
                )}>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="block text-xs sm:text-sm font-bold truncate">Feedback</span>
                    {!hasProAccess && (
                      <span className="text-[8px] font-black px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                        PRO
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 1. FEHLZEITEN VIEW (ZWEISPALTIG: LINKS 70% FORMULAR ALS REITER, RECHTS 30% FEHLZEITEN DES AUSGEWÄHLTEN SPIELERS) */}
          {activeDataEntryTab === 'absences' && (() => {
            const selectedAbsenceGroup = groups.find(g => g.id === absenceFormData.groupId) || groups[0];
            const selectedAbsenceGroupPlayers = (selectedAbsenceGroup?.players || []).filter(p => !p.archived);
            const selectedAbsencePlayer = selectedAbsenceGroupPlayers.find(p => p.id === absenceFormData.playerId) || selectedAbsenceGroupPlayers[0];
            const selectedPlayerAbsences = absenceFormData.playerId
              ? absences
                  .filter(a => a.playerId === absenceFormData.playerId)
                  .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
              : [];

            const formatDisplayDate = (dStr?: string) => {
              if (!dStr) return '';
              const parts = dStr.split('-');
              if (parts.length === 3) {
                return `${parts[2]}.${parts[1]}.${parts[0]}`;
              }
              return dStr;
            };

            const getAbsenceDurationDays = (startDate?: string, endDate?: string) => {
              if (!startDate) return 0;
              const start = new Date(startDate);
              const end = endDate ? new Date(endDate) : start;
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
              return isNaN(diffDays) ? 1 : diffDays;
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                {/* ================================================================= */}
                {/* LINKE SPALTE: FORMULAR ZUR FEHLZEITEN-ERFASSUNG & BEARBEITUNG     */}
                {/* ================================================================= */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    {editingAbsenceId ? (
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center">
                          <Edit3 className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-amber-300">Fehlzeit bearbeiten</span>
                        <button
                          type="button"
                          onClick={handleCancelEditAbsence}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Abbrechen</span>
                        </button>
                      </div>
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      onClick={() => onNavigateToPlanner?.()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 hover:border-emerald-500 transition shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto active:scale-95"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>zum Trainingsplaner</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>

                  {groups.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 space-y-3">
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
                      <p className="text-xs font-semibold text-slate-300">
                        Es sind noch keine Trainingsgruppen angelegt.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('groups')}
                        className="text-xs text-emerald-400 font-bold hover:underline"
                      >
                        + Jetzt Trainingsgruppe und Spieler erstellen
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveAbsence} className="space-y-4 text-xs">
                      {/* Read-Only Banner if coach is not assigned to this group */}
                      {(() => {
                        const isAbsenceGroupEditable = canEditGroupData(selectedAbsenceGroup);
                        if (!isAbsenceGroupEditable) {
                          return (
                            <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-3.5 flex items-center gap-3 text-amber-200 text-xs">
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              <div>
                                <span className="font-bold">Nur Leseansicht:</span> Du hast keine Schreibrechte für die Trainingsgruppe <strong>{selectedAbsenceGroup?.name}</strong>. Nur der zuständige Trainer ({selectedAbsenceGroup?.assignedCoachName || selectedAbsenceGroup?.assignedCoachEmail || 'Club Coach'}) oder Club-Admin können Fehlzeiten eintragen.
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* 1. Trainingsgruppe als Reiter */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-2 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Trainingsgruppe <span className="text-emerald-400">*</span></span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Reiter (1 Klick)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {groups.map(g => {
                            const isSelected = (absenceFormData.groupId === g.id) || (!absenceFormData.groupId && groups[0]?.id === g.id);
                            const gActivePlayers = (g.players || []).filter(p => !p.archived);
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  const nextPlayers = (g.players || []).filter(p => !p.archived);
                                  setAbsenceFormData(prev => ({
                                    ...prev,
                                    groupId: g.id,
                                    playerId: nextPlayers.length > 0 ? nextPlayers[0].id : ''
                                  }));
                                }}
                                className={cn(
                                  "px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer active:scale-95",
                                  isSelected
                                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/60"
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                                )}
                              >
                                <span>{g.name}</span>
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                                  isSelected ? "bg-emerald-700 text-emerald-100" : "bg-slate-900 text-slate-400 border border-slate-800"
                                )}>
                                  {gActivePlayers.length} TW
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Spieler als Reiter */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-2 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-teal-400" />
                            <span>Spieler / Torhüter <span className="text-teal-400">*</span></span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Reiter (1 Klick)</span>
                        </label>
                        {selectedAbsenceGroupPlayers.length === 0 ? (
                          <div className="p-3 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs flex items-center justify-between">
                            <span>In dieser Gruppe sind noch keine aktiven Spieler vorhanden.</span>
                            <button
                              type="button"
                              onClick={() => setActiveSubTab('groups')}
                              className="text-emerald-400 font-bold hover:underline text-[11px]"
                            >
                              + Spieler anlegen
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedAbsenceGroupPlayers.map(p => {
                              const isSelected = absenceFormData.playerId === p.id;
                              const pAbsCount = absences.filter(a => a.playerId === p.id).length;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setAbsenceFormData(prev => ({ ...prev, playerId: p.id }))}
                                  className={cn(
                                    "px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer active:scale-95",
                                    isSelected
                                      ? "bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-950/60"
                                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                                  )}
                                >
                                  <span>{p.firstName} {p.lastName}</span>
                                  {p.jerseyNumber && (
                                    <span className={cn(
                                      "text-[10px] font-mono px-1 py-0.2 rounded",
                                      isSelected ? "bg-teal-700 text-teal-100" : "bg-slate-900 text-slate-400 border border-slate-800"
                                    )}>
                                      #{p.jerseyNumber}
                                    </span>
                                  )}
                                  {pAbsCount > 0 && (
                                    <span className={cn(
                                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                                      isSelected ? "bg-teal-800 text-amber-200" : "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                                    )}>
                                      {pAbsCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 3. Grund der Fehlzeit als Reiter */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-2 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Grund der Fehlzeit <span className="text-amber-400">*</span></span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Reiter (1 Klick)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {ABSENCE_REASONS.map(r => {
                            const isSelected = absenceFormData.reason === r;
                            const meta = getReasonBadge(r);
                            const ReasonIcon = meta.icon;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setAbsenceFormData(prev => ({
                                  ...prev,
                                  reason: r,
                                  injuredBodyPart: r === 'Verletzung' ? prev.injuredBodyPart : ''
                                }))}
                                className={cn(
                                  "px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer active:scale-95",
                                  isSelected
                                    ? cn("shadow-lg shadow-black/40 ring-1 ring-white/20", meta.style)
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                                )}
                              >
                                <ReasonIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{meta.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Verletztes Körperteil (falls Verletzung) */}
                      {absenceFormData.reason === 'Verletzung' && (
                        <div className="animate-in fade-in duration-200 space-y-1.5 bg-rose-950/30 border border-rose-900/60 rounded-2xl p-3">
                          <div className="flex items-center justify-between">
                            <label className="text-rose-200 font-bold text-xs flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-rose-400" />
                              <span>Verletztes Körperteil</span>
                            </label>
                            {absenceFormData.injuredBodyPart && (
                              <button
                                type="button"
                                onClick={() => setAbsenceFormData(prev => ({ ...prev, injuredBodyPart: '' }))}
                                className="text-[10px] text-rose-400/80 hover:text-rose-300 transition underline cursor-pointer"
                              >
                                Auswahl aufheben
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsBodyModalOpen(true)}
                            className={cn(
                              "w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-xs text-left font-semibold flex items-center justify-between transition group shadow-inner cursor-pointer",
                              absenceFormData.injuredBodyPart
                                ? "border-rose-500/60 text-rose-200 bg-rose-950/40 hover:bg-rose-950/60"
                                : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-base">🩺</span>
                              <span className={cn(absenceFormData.injuredBodyPart ? "text-white font-bold" : "text-slate-400")}>
                                {absenceFormData.injuredBodyPart || 'Körperteil interaktiv auswählen (Körperkarte)...'}
                              </span>
                            </div>
                            <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 group-hover:bg-rose-500/30 transition flex-shrink-0">
                              {absenceFormData.injuredBodyPart ? 'Ändern' : 'Körperkarte öffnen'}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* 4. Datum von und Datum bis (Pflichtfelder mit Kalenderklick) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold mb-1.5 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>Datum von <span className="text-amber-400">*</span></span>
                          </label>
                          <input
                            type="date"
                            required
                            value={absenceFormData.startDate}
                            onChange={e => {
                              const val = e.target.value;
                              setAbsenceFormData(prev => ({
                                ...prev,
                                startDate: val,
                                endDate: (!prev.endDate || prev.endDate < val) ? val : prev.endDate
                              }));
                            }}
                            onClick={e => {
                              try {
                                (e.currentTarget as HTMLInputElement).showPicker?.();
                              } catch (err) {}
                            }}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none text-xs font-semibold cursor-pointer transition shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-bold mb-1.5 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>Datum bis <span className="text-amber-400">*</span></span>
                          </label>
                          <input
                            type="date"
                            required
                            min={absenceFormData.startDate}
                            value={absenceFormData.endDate}
                            onChange={e => setAbsenceFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            onClick={e => {
                              try {
                                (e.currentTarget as HTMLInputElement).showPicker?.();
                              } catch (err) {}
                            }}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none text-xs font-semibold cursor-pointer transition shadow-inner"
                          />
                        </div>
                      </div>

                      {/* 5. Notiz / Bemerkung */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1.5 text-xs">
                          Notiz / Bemerkung <span className="text-slate-500 font-normal">(optional)</span>
                        </label>
                        <textarea
                          rows={2}
                          value={absenceFormData.note}
                          onChange={e => setAbsenceFormData(prev => ({ ...prev, note: e.target.value }))}
                          placeholder="z. B. Bänderdehnung, MRT-Befund, Schonung, Klausurphase..."
                          className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none text-xs transition resize-none shadow-inner"
                        />
                      </div>

                      {/* 6. Submit Button / Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {editingAbsenceId && (
                          <button
                            type="button"
                            onClick={handleCancelEditAbsence}
                            className="py-3 px-4 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
                          >
                            Abbrechen
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={!canEditGroupData(selectedAbsenceGroup) || !absenceFormData.playerId || !absenceFormData.groupId}
                          className={cn(
                            "flex-1 py-3 px-4 rounded-xl font-extrabold text-xs text-white transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-98",
                            editingAbsenceId
                              ? "bg-amber-600 hover:bg-amber-500 shadow-amber-950/60"
                              : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/60"
                          )}
                        >
                          {editingAbsenceId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          <span>{editingAbsenceId ? 'Änderungen speichern' : 'Fehlzeit speichern'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* ================================================================= */}
                {/* RECHTE SPALTE: FEHLZEITEN DES AUSGEWÄHLTEN SPIELERS               */}
                {/* ================================================================= */}
                <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                  {/* Header with Selected Player Info */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-black text-sm flex-shrink-0">
                        {selectedAbsencePlayer ? getPlayerInitials(selectedAbsencePlayer.firstName, selectedAbsencePlayer.lastName) : '?'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                          {selectedAbsencePlayer
                            ? `${selectedAbsencePlayer.firstName} ${selectedAbsencePlayer.lastName}`
                            : 'Kein Torhüter gewählt'}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate">
                          {selectedAbsencePlayer
                            ? `${selectedAbsenceGroup?.name} • Jg. ${selectedAbsencePlayer.birthYear || '–'}`
                            : 'Wähle oben eine Gruppe & einen Spieler'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Absences List for Selected Player */}
                  {selectedPlayerAbsences.length === 0 ? (
                    <div className="py-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs italic space-y-2">
                      <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/60" />
                      <p>Keine Fehlzeiten für diesen Torhüter eingetragen.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPlayerAbsences.map(item => {
                        const reasonMeta = getReasonBadge(item.reason);
                        const ReasonIcon = reasonMeta.icon;
                        const durationDays = getAbsenceDurationDays(item.startDate, item.endDate);

                        return (
                          <div
                            key={item.id}
                            className="bg-slate-950 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 transition shadow-sm space-y-2.5 group"
                          >
                            {/* Top Row: Reason badge + injured body part + Delete button */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5", reasonMeta.style)}>
                                  <ReasonIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>{reasonMeta.label}</span>
                                </span>
                                {item.reason === 'Verletzung' && item.injuredBodyPart && (
                                  <span className="text-[11px] font-bold text-rose-300 bg-rose-950/70 border border-rose-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                    <span>🩺</span>
                                    <span>{item.injuredBodyPart}</span>
                                  </span>
                                )}
                              </div>


                              {canEditGroupData(selectedAbsenceGroup) && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditAbsence(item)}
                                    title="Fehlzeit bearbeiten"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-950/40 transition cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAbsence(item.id, item.playerName)}
                                    title="Fehlzeit löschen"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Middle Row: Date & Duration */}
                            <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-900">
                              <div className="flex items-center gap-2 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span>
                                  {item.startDate === item.endDate || !item.endDate ? (
                                    <span className="font-semibold text-slate-200">{formatDisplayDate(item.startDate)}</span>
                                  ) : (
                                    <span>
                                      <span className="font-semibold text-slate-200">{formatDisplayDate(item.startDate)}</span>
                                      <span className="text-slate-500 mx-1.5">bis</span>
                                      <span className="font-semibold text-slate-200">{formatDisplayDate(item.endDate)}</span>
                                    </span>
                                  )}
                                </span>
                              </div>

                              <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                {durationDays} {durationDays === 1 ? 'Tag' : 'Tage'}
                              </span>
                            </div>

                            {/* Bottom Row: Note */}
                            {item.note && (
                  <div className="text-xs text-slate-300 bg-slate-900/70 border border-slate-800/60 rounded-xl px-3 py-2 text-left italic">
                    &quot;{item.note}&quot;
                  </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 2. SPIELZEITEN VIEW */}
          {activeDataEntryTab === 'playtimes' && (
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
              {/* ================================================================= */}
              {/* LINKE SPALTE: FORMULAR ZUR SPIELERFASSUNG & SPIELZEITEN (60% Breite) */}
              {/* ================================================================= */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-lg flex items-center justify-center",
                      editingMatchId ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                    )}>
                      {editingMatchId ? <Edit3 className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                    </div>
                    <span className={cn("text-xs font-bold", editingMatchId ? "text-amber-300" : "text-white")}>
                      {editingMatchId ? 'Spiel bearbeiten' : 'Neues Spiel erfassen'}
                    </span>
                    {editingMatchId && (
                      <button
                        type="button"
                        onClick={handleCancelEditMatch}
                        className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1 ml-2"
                      >
                        <X className="w-3 h-3" />
                        <span>Abbrechen</span>
                      </button>
                    )}
                  </div>
                </div>

                {groups.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 space-y-3">
                    <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
                    <p className="text-xs font-semibold text-slate-300">
                      Es sind noch keine Trainingsgruppen angelegt.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('groups')}
                      className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      + Jetzt Trainingsgruppe und Spieler erstellen
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSaveMatch} className="space-y-4 text-xs">
                    {/* Read-Only Banner if coach is not assigned to this group */}
                    {(() => {
                      const effectiveGroupId = matchFormData.groupId || groups[0]?.id;
                      const currentGrp = groups.find(g => g.id === effectiveGroupId) || groups[0];
                      const isMatchGroupEditable = canEditGroupData(currentGrp);
                      if (!isMatchGroupEditable) {
                        return (
                          <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-3.5 flex items-center gap-3 text-amber-200 text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <div>
                              <span className="font-bold">Nur Leseansicht:</span> Du hast keine Schreibrechte für die Trainingsgruppe <strong>{currentGrp?.name}</strong>. Nur der zuständige Trainer ({currentGrp?.assignedCoachName || currentGrp?.assignedCoachEmail || 'Club Coach'}) oder Club-Admin können Spielzeiten erfassen.
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 1. Zeile: Datum & Trainingsgruppe in einer Zeile (Datum klein, Trainingsgruppe flexibel) */}
                    <div className="flex flex-wrap sm:flex-nowrap items-start gap-3.5">
                      {/* Datum (kleines Feld) */}
                      <div className="w-full sm:w-40 flex-shrink-0">
                        <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Datum <span className="text-emerald-400">*</span></span>
                          </span>
                        </label>
                        <input
                          type="date"
                          required
                          value={matchFormData.date}
                          onClick={(e) => {
                            try {
                              (e.currentTarget as any).showPicker?.();
                            } catch (err) {}
                          }}
                          onChange={e => setMatchFormData(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs cursor-pointer font-medium"
                        />
                      </div>

                      {/* Trainingsgruppe als Reiter (so groß wie nötig) */}
                      <div className="flex-1 min-w-0">
                        <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Trainingsgruppe <span className="text-emerald-400">*</span></span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Reiter (1 Klick)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {groups.map(g => {
                            const isSelected = (matchFormData.groupId === g.id) || (!matchFormData.groupId && groups[0]?.id === g.id);
                            const gActivePlayers = (g.players || []).filter(p => !p.archived);
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  const initMins: Record<string, number> = {};
                                  const initGrades: Record<string, number> = {};
                                  (g.players || []).forEach(p => {
                                    initMins[p.id] = matchFormData.playerMinutes[p.id] ?? 0;
                                    if (matchFormData.playerGrades[p.id] !== undefined) {
                                      initGrades[p.id] = matchFormData.playerGrades[p.id];
                                    }
                                  });
                                  setMatchFormData(prev => ({
                                    ...prev,
                                    groupId: g.id,
                                    playerMinutes: initMins,
                                    playerGrades: initGrades
                                  }));
                                }}
                                className={cn(
                                  "px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer active:scale-95",
                                  isSelected
                                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/60"
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                                )}
                              >
                                <span>{g.name}</span>
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                                  isSelected ? "bg-emerald-700 text-emerald-100" : "bg-slate-900 text-slate-400 border border-slate-800"
                                )}>
                                  {gActivePlayers.length} TW
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 2. Spieltyp als Reiter */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Spieltyp <span className="text-emerald-400">*</span></span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">Reiter (1 Klick)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {MATCH_TYPES.map(type => {
                          const isSelected = matchFormData.matchType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setMatchFormData(prev => ({ ...prev, matchType: type }))}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer active:scale-95",
                                isSelected
                                  ? type === 'Meisterschaftsspiel'
                                    ? "bg-purple-700 border-purple-500 text-white shadow-lg shadow-purple-950/60"
                                    : type === 'Pokalspiel'
                                    ? "bg-amber-700 border-amber-500 text-white shadow-lg shadow-amber-950/60"
                                    : "bg-cyan-700 border-cyan-500 text-white shadow-lg shadow-cyan-950/60"
                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                              )}
                            >
                              {type === 'Pokalspiel' ? <Trophy className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
                              <span>{type}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Notiz / Besonderheiten (optional) direkt unter dem Feld Spieltyp */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Notiz / Besonderheiten (optional)</label>
                      <input
                        type="text"
                        value={matchFormData.notes}
                        onChange={e => setMatchFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="z. B. Elfmeter pariert, 1. Pflichtspieleinsatz..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                      />
                    </div>

                    {/* 4. Spielzeiten der TW */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="block text-slate-200 font-extrabold text-xs">
                        Spielzeiten der TW
                      </label>
                      {(() => {
                        const effectiveGroupId = matchFormData.groupId || groups[0]?.id;
                        const currentGrp = groups.find(g => g.id === effectiveGroupId) || groups[0];
                        const players = (currentGrp?.players || []).filter(p => !p.archived);

                        if (players.length === 0) {
                          return (
                            <div className="p-4 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 italic text-xs">
                              In dieser Trainingsgruppe sind keine aktiven Torhüter hinterlegt.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2.5">
                            {players.map(p => {
                              const mins = matchFormData.playerMinutes[p.id] ?? 0;
                              const gradeVal = matchFormData.playerGrades[p.id];
                              const isBench = Boolean(matchFormData.playerBenchStatus?.[p.id]);

                              return (
                                <div
                                  key={p.id}
                                  className={cn(
                                    "bg-slate-950 p-3 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition",
                                    isBench
                                      ? "border-sky-500/50 bg-sky-950/10 shadow-sm shadow-sky-950/40"
                                      : mins > 0
                                      ? "border-emerald-500/30"
                                      : "border-slate-800"
                                  )}
                                >
                                  {/* Player Avatar & Name */}
                                  <div className="flex items-center gap-2.5 min-w-[130px] flex-shrink-0">
                                    <div className={cn(
                                      "w-7 h-7 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0 transition",
                                      isBench ? "bg-sky-500 text-slate-950 font-black" : "bg-slate-800 text-slate-300"
                                    )}>
                                      {p.jerseyNumber ? `#${p.jerseyNumber}` : p.firstName.charAt(0)}
                                    </div>
                                    <div>
                                      <span className="font-bold text-white block text-xs truncate max-w-[120px] sm:max-w-[140px]">
                                        {p.firstName} {p.lastName}
                                      </span>
                                      {isBench ? (
                                        <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1">
                                          🧤 Bank / Warm-up (~193 A.U.)
                                        </span>
                                      ) : mins > 0 ? (
                                        <span className="text-[10px] text-emerald-400 font-medium">
                                          Start-TW ({mins * 8} A.U.)
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Minutes Controls (+ / - in 5 min steps) */}
                                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => adjustPlayerMinutes(p.id, -5)}
                                      disabled={mins <= 0}
                                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold flex items-center justify-center transition active:scale-90 cursor-pointer"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    
                                    <input
                                      type="number"
                                      min="0"
                                      step="5"
                                      value={mins}
                                      onChange={e => setPlayerMinutesDirect(p.id, parseInt(e.target.value) || 0)}
                                      className="w-12 text-center font-mono font-bold text-xs text-white bg-transparent border-none focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 pr-1">Min.</span>

                                    <button
                                      type="button"
                                      onClick={() => adjustPlayerMinutes(p.id, 5)}
                                      className="w-7 h-7 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center justify-center transition active:scale-90 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Quick Presets (inkl. Ersatzbank) */}
                                  <div className="grid grid-cols-2 gap-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPlayerMinutesDirect(p.id, 0);
                                        setPlayerBenchStatus(p.id, false);
                                      }}
                                      className={cn(
                                        "px-2 py-0.5 rounded text-[9.5px] font-bold border transition cursor-pointer text-center leading-tight",
                                        mins === 0 && !isBench ? "bg-slate-800 text-white border-slate-700" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                                      )}
                                      title="Nicht im Kader / 0 Min."
                                    >
                                      0 Min
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPlayerBenchStatus(p.id, !isBench)}
                                      className={cn(
                                        "px-2 py-0.5 rounded text-[9.5px] font-bold border transition cursor-pointer text-center leading-tight flex items-center justify-center gap-0.5",
                                        isBench ? "bg-sky-600 border-sky-400 text-white shadow-sm shadow-sky-950 font-extrabold" : "bg-slate-900 text-sky-400/80 border-slate-800 hover:text-sky-300 hover:border-sky-800"
                                      )}
                                      title="Ersatztorwart auf der Bank (Match-Warm-up & Standby ~193 A.U. Belastung)"
                                    >
                                      🧤 Bank
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPlayerMinutesDirect(p.id, 45)}
                                      className={cn(
                                        "px-2 py-0.5 rounded text-[9.5px] font-bold border transition cursor-pointer text-center leading-tight",
                                        mins === 45 ? "bg-teal-950 text-teal-300 border-teal-700" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                                      )}
                                    >
                                      45 Min
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPlayerMinutesDirect(p.id, 90)}
                                      className={cn(
                                        "px-2 py-0.5 rounded text-[9.5px] font-bold border transition cursor-pointer text-center leading-tight",
                                        mins === 90 ? "bg-emerald-950 text-emerald-300 border-emerald-700" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                                      )}
                                    >
                                      90 Min
                                    </button>
                                  </div>

                                  {/* Leistungsnote (ganz nach rechts) */}
                                  <div className="flex-1 min-w-[140px] flex items-center justify-end">
                                    <select
                                      value={gradeVal || ''}
                                      onChange={e => {
                                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                                        setPlayerGrade(p.id, val);
                                      }}
                                      className={cn(
                                        "w-full bg-slate-900 border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold transition",
                                        gradeVal
                                          ? "border-emerald-500/60 text-emerald-300 bg-emerald-950/20 font-bold"
                                          : "border-slate-800 text-slate-400 hover:border-slate-700"
                                      )}
                                    >
                                      <option value="">Leistungsnote: Keine</option>
                                      {MATCH_GRADE_OPTIONS.map(opt => (
                                        <option key={opt.grade} value={opt.grade}>
                                          Note {opt.grade} ({opt.description})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                      {editingMatchId && (
                        <button
                          type="button"
                          onClick={handleCancelEditMatch}
                          className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 font-bold transition cursor-pointer"
                        >
                          Abbrechen
                        </button>
                      )}
                      {(() => {
                        const effectiveGroupId = matchFormData.groupId || groups[0]?.id;
                        const currentGrp = groups.find(g => g.id === effectiveGroupId) || groups[0];
                        const isMatchGroupEditable = canEditGroupData(currentGrp);

                        return (
                          <button
                            type="submit"
                            disabled={!isMatchGroupEditable}
                            className={cn(
                              "w-full sm:w-auto px-5 py-2.5 rounded-xl text-white font-extrabold transition shadow shadow-emerald-950 flex items-center justify-center gap-2",
                              isMatchGroupEditable
                                ? "bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
                                : "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Save className="w-4 h-4" />
                            <span>{editingMatchId ? 'Änderungen speichern' : 'Spiel speichern'}</span>
                          </button>
                        );
                      })()}
                    </div>
                  </form>
                )}
              </div>

              {/* ================================================================= */}
              {/* RECHTE SPALTE: LISTE DER ANGELEGTEN SPIELE (40% Breite)           */}
              {/* ================================================================= */}
              <div className="lg:col-span-4 space-y-4">
                {/* Filter & Search Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs shadow-xl">
                  {/* 1. Trainingsgruppen Filter */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between tracking-wider">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>Trainingsgruppe</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono font-normal">
                        {filterPlaytimeGroup === 'ALL' ? `${matchPlaytimes.length} Spiele` : `${matchPlaytimes.filter(m => m.groupId === filterPlaytimeGroup).length} Spiele`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFilterPlaytimeGroup('ALL')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                          filterPlaytimeGroup === 'ALL'
                            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950"
                            : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                        )}
                      >
                        <span>Alle</span>
                        <span className="text-[10px] opacity-75 font-mono">({matchPlaytimes.length})</span>
                      </button>
                      {groups.map(g => {
                        const isSelected = filterPlaytimeGroup === g.id;
                        const count = matchPlaytimes.filter(m => m.groupId === g.id).length;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setFilterPlaytimeGroup(g.id);
                              if (filterPlaytimePlayer !== 'ALL') {
                                const inGroup = (g.players || []).some(p => p.id === filterPlaytimePlayer && !p.archived);
                                if (!inGroup) setFilterPlaytimePlayer('ALL');
                              }
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                              isSelected
                                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950"
                                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                            )}
                          >
                            <span>{g.name}</span>
                            <span className="text-[10px] opacity-75 font-mono">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Spieler / Torhüter Filter */}
                  {availableFilterPlayers.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider">
                        <User className="w-3 h-3 text-teal-400" />
                        <span className="text-slate-300">Torhüter</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilterPlaytimePlayer('ALL')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                            filterPlaytimePlayer === 'ALL'
                              ? "bg-teal-600 text-white shadow-sm shadow-teal-950"
                              : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                          )}
                        >
                          <span>Alle TW</span>
                        </button>
                        {availableFilterPlayers.map(p => {
                          const isSelected = filterPlaytimePlayer === p.id;
                          const pCount = matchPlaytimes.filter(m => {
                            const matchesGrp = filterPlaytimeGroup === 'ALL' || m.groupId === filterPlaytimeGroup;
                            return matchesGrp && m.playerMinutes && Number(m.playerMinutes[p.id] || 0) > 0;
                          }).length;

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setFilterPlaytimePlayer(p.id)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                                isSelected
                                  ? "bg-teal-600 text-white shadow-sm shadow-teal-950"
                                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                              )}
                            >
                              <span>{p.firstName} {p.lastName}</span>
                              <span className="text-[10px] opacity-75 font-mono">({pCount})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Spieltyp Filter */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider">
                      <Timer className="w-3 h-3 text-purple-400" />
                      <span className="text-slate-300">Spieltyp</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFilterPlaytimeType('ALL')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                          filterPlaytimeType === 'ALL'
                            ? "bg-purple-600 text-white shadow-sm shadow-purple-950"
                            : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                        )}
                      >
                        <span>Alle Typen</span>
                      </button>
                      {MATCH_TYPES.map(type => {
                        const isSelected = filterPlaytimeType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFilterPlaytimeType(type)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                              isSelected
                                ? "bg-purple-600 text-white shadow-sm shadow-purple-950"
                                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                            )}
                          >
                            {type === 'Pokalspiel' && <Trophy className="w-2.5 h-2.5" />}
                            <span>{type}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Search Bar */}
                  <div className="relative w-full pt-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-[calc(50%+2px)] -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchPlaytime}
                      onChange={e => setSearchPlaytime(e.target.value)}
                      placeholder="Notiz / Details suchen..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Match Cards List */}
                <div className="space-y-3 max-h-[850px] overflow-y-auto pr-1">
                  {filteredMatchPlaytimes.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 space-y-2">
                      <Timer className="w-7 h-7 mx-auto text-slate-600" />
                      <p className="text-xs font-semibold text-slate-400">
                        Keine Spiele gefunden.
                      </p>
                    </div>
                  ) : (
                    filteredMatchPlaytimes.map(match => {
                      const group = groups.find(g => g.id === match.groupId);
                      const playersInMatch = group?.players || [];
                      const totalPlayedMins = Object.values(match.playerMinutes || {}).reduce((a, b) => a + Number(b || 0), 0);
                      const matchType = match.matchType || 'Meisterschaftsspiel';
                      const isEditingThis = editingMatchId === match.id;

                      return (
                        <div
                          key={match.id}
                          className={cn(
                            "bg-slate-900 border rounded-2xl p-4 shadow-lg space-y-3 transition",
                            isEditingThis
                              ? "border-amber-500/80 ring-1 ring-amber-500/50 bg-amber-950/10"
                              : "border-slate-800 hover:border-slate-700"
                          )}
                        >
                          {/* Header: Date, Match Type, Group, Actions */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-700/60 text-[10px] font-mono font-bold">
                                  {new Date(match.date).toLocaleDateString('de-DE')}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
                                  matchType === 'Meisterschaftsspiel'
                                    ? "bg-purple-950/80 text-purple-300 border-purple-800"
                                    : matchType === 'Pokalspiel'
                                    ? "bg-amber-950/80 text-amber-300 border-amber-800"
                                    : "bg-cyan-950/80 text-cyan-300 border-cyan-800"
                                )}>
                                  {matchType === 'Pokalspiel' ? <Trophy className="w-2.5 h-2.5" /> : <Timer className="w-2.5 h-2.5" />}
                                  <span>{matchType}</span>
                                </span>
                                {match.groupName && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-semibold">
                                    {match.groupName}
                                  </span>
                                )}
                              </div>
                              {match.opponent ? (
                                <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                                  {match.team ? `${match.team} vs. ` : ''}<span className="text-emerald-400">{match.opponent}</span>
                                </h4>
                              ) : (
                                <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                                  {match.groupName || 'Spiel'} <span className="text-emerald-400 font-semibold text-xs">({matchType})</span>
                                </h4>
                              )}
                            </div>

                            {canEditGroupData(groups.find(g => g.id === match.groupId)) && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditMatch(match)}
                                  title="Spiel bearbeiten"
                                  className={cn(
                                    "p-1.5 rounded-xl border transition cursor-pointer",
                                    isEditingThis
                                      ? "text-amber-300 bg-amber-950/80 border-amber-600"
                                      : "text-slate-400 hover:text-white bg-slate-950 border-slate-800 hover:border-slate-700"
                                  )}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMatch(match.id, match.date, match.opponent)}
                                  title="Spiel löschen"
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 hover:border-rose-900/60 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Player Playtime Chips */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400">
                              <span>Spielzeiten:</span>
                              <span className="font-mono text-slate-300">Gesamt: {totalPlayedMins} Min.</span>
                            </div>
                            <div className="space-y-1">
                              {playersInMatch.map(p => {
                                const mins = match.playerMinutes?.[p.id] ?? 0;
                                const isBench = Boolean(match.playerBenchStatus?.[p.id]);
                                const grade = match.playerGrades?.[p.id];
                                const gradeBadge = grade ? getMatchGradeBadge(grade) : null;

                                return (
                                  <div
                                    key={p.id}
                                    className={cn(
                                      "p-2 rounded-xl border flex items-center justify-between gap-1.5 text-xs",
                                      mins > 0
                                        ? "bg-slate-950 border-emerald-500/30 text-white"
                                        : isBench
                                        ? "bg-slate-950 border-sky-500/30 text-white"
                                        : "bg-slate-950/40 border-slate-800/80 text-slate-500"
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <div className={cn(
                                        "w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px]",
                                        mins > 0 
                                          ? "bg-emerald-500 text-slate-950" 
                                          : isBench 
                                          ? "bg-sky-500 text-slate-950" 
                                          : "bg-slate-800 text-slate-400"
                                      )}>
                                        {p.jerseyNumber ? `#${p.jerseyNumber}` : p.firstName.charAt(0)}
                                      </div>
                                      <span className="font-medium truncate text-[11px]">{p.firstName} {p.lastName}</span>
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {gradeBadge && (
                                        <span 
                                          title={gradeBadge.full}
                                          className={cn("px-1.5 py-0.2 rounded font-bold text-[9.5px] border cursor-help", gradeBadge.style)}
                                        >
                                          {gradeBadge.short}
                                        </span>
                                      )}
                                      {mins > 0 ? (
                                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10.5px] border bg-emerald-950 text-emerald-300 border-emerald-700/60">
                                          {mins} Min.
                                        </span>
                                      ) : isBench ? (
                                        <span className="px-1.5 py-0.5 rounded font-semibold text-[10.5px] border bg-sky-950 text-sky-300 border-sky-700/60 flex items-center gap-1" title="Ersatztorwart auf der Bank (Match-Warm-up & Standby ~193 A.U.)">
                                          🧤 Bank
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10.5px] border bg-slate-900 text-slate-500 border-slate-800">
                                          0 Min.
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Optional notes */}
                          {match.notes && (
                            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 italic">
                              💬 &quot;{match.notes}&quot;
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. TECHNIK, TAKTIK, ATHLETIK & MENTAL SKILL RATINGS VIEW */}
          {(activeDataEntryTab === 'technik' || activeDataEntryTab === 'taktik' || activeDataEntryTab === 'athletik' || activeDataEntryTab === 'mental') && (() => {
            const currentCat: EvaluationCategory = 
              activeDataEntryTab === 'technik' ? 'Technik' :
              activeDataEntryTab === 'taktik' ? 'Taktik' :
              activeDataEntryTab === 'athletik' ? 'Athletik' : 'Mental';

            const catColor = 
              currentCat === 'Technik' ? { bg: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500/40', badge: 'bg-purple-950 text-purple-300 border-purple-700' } :
              currentCat === 'Taktik' ? { bg: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500/40', badge: 'bg-emerald-950 text-emerald-300 border-emerald-700' } :
              currentCat === 'Athletik' ? { bg: 'bg-sky-600', text: 'text-sky-400', border: 'border-sky-500/40', badge: 'bg-sky-950 text-sky-300 border-sky-700' } :
              { bg: 'bg-rose-600', text: 'text-rose-400', border: 'border-rose-500/40', badge: 'bg-rose-950 text-rose-300 border-rose-700' };

            const currentSkills = SKILL_DEFINITIONS[currentCat] || [];
            const activeGroup = groups.find(g => g.id === selectedEvaluationGroupId) || groups[0];
            const groupPlayers = (activeGroup?.players || []).filter(p => !p.archived);
            const activePlayer = groupPlayers.find(p => p.id === selectedEvaluationPlayerId) || groupPlayers[0];

            const scoresList = Object.values(currentRatingScores).filter((v): v is number => typeof v === 'number' && v > 0);
            const averageScore = scoresList.length > 0 
              ? (scoresList.reduce((a, b) => a + b, 0) / scoresList.length).toFixed(1) 
              : null;

            if (groups.length === 0) {
              return (
                <div className="p-12 text-center bg-slate-900 rounded-3xl border border-dashed border-slate-800 space-y-3">
                  <Users className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm font-bold text-white">
                    Noch keine Trainingsgruppe angelegt
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Um Spielerfähigkeiten für {currentCat} einzugeben, erstelle bitte zuerst eine Trainingsgruppe mit Torhütern.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('groups')}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow shadow-emerald-950"
                  >
                    + Trainingsgruppe anlegen
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {/* PRO Access Locked Banner for Single Standard Users */}
                {!hasProAccess && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-extrabold text-white text-sm flex items-center gap-2">
                          <span>PRO-Funktion: Spieler-Diagnostik ({currentCat})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 font-bold uppercase tracking-wider">
                            Nur Lesezugriff
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
                          Die aktive Erfassung und Speicherung von Diagnostikdaten (Technik, Taktik, Athletik, Mental) ist für <strong>Einzelnutzer PRO</strong> und Vereinsaccounts reserviert. Als Einzelnutzer Standard kannst du alle Leistungsdiagramme im Reiter <strong>&quot;Datenauswertung&quot;</strong> einsehen.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5-Step Evaluation Scale Guide Card (Collapsible) - placed ABOVE Player Selection for Technik & Taktik */}
                {(currentCat === 'Technik' || currentCat === 'Taktik') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                            <span>5-Stufen-Bewertungsmatrix & Coaching-Points-Kriterien</span>
                          </h5>
                          <p className="text-[11px] text-slate-400">
                            Offizieller Bewertungsleitfaden für Soll-Benchmarks & Zielerreichung ({currentCat})
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsScaleGuideOpen(!isScaleGuideOpen)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>{isScaleGuideOpen ? 'Leitfaden-Tabelle ausblenden' : 'Leitfaden-Tabelle anzeigen'}</span>
                        {isScaleGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Quick Summary Chips */}
                    {(() => {
                      const currentScaleLevels = getEvaluationScaleLevels(currentCat);
                      const primaryLevels = currentScaleLevels.filter(l => l.isPrimary);

                      return (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px] pt-1">
                            {primaryLevels.map(lvl => (
                              <div 
                                key={lvl.level}
                                className={cn(
                                  "p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2",
                                  lvl.level === 5 && "col-span-2 sm:col-span-1"
                                )}
                              >
                                <span className={cn(
                                  "w-5 h-5 rounded-md font-black text-[10px] flex items-center justify-center flex-shrink-0",
                                  lvl.level === 5 ? "bg-emerald-500 text-slate-950" :
                                  lvl.level === 4 ? "bg-sky-500 text-slate-950" :
                                  lvl.level === 3 ? "bg-teal-500 text-slate-950" :
                                  lvl.level === 2 ? "bg-amber-500 text-slate-950" :
                                  "bg-rose-600 text-white"
                                )}>
                                  {lvl.level}
                                </span>
                                <span className="text-slate-300 font-medium truncate" title={lvl.definition}>
                                  {lvl.definition}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Full Stufenbewertung Guide Table */}
                          {isScaleGuideOpen && (
                            <div className="overflow-x-auto border-t border-slate-800/80 pt-3 mt-2 animate-in fade-in duration-150">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10px]">
                                  <tr>
                                    <th className="py-2.5 px-3 w-16 text-center">Stufe</th>
                                    <th className="py-2.5 px-3 w-48">Definition</th>
                                    <th className="py-2.5 px-4">Beschreibung</th>
                                    <th className="py-2.5 px-4 text-emerald-400">
                                      {currentCat === 'Taktik' ? 'Bezug zu taktischen Coaching Points & Spielkomplexität' : 'Bezug zu Coaching Points (Zielerreichung)'}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {primaryLevels.map(lvl => (
                                    <tr key={lvl.level} className="hover:bg-slate-950/50 transition">
                                      <td className="py-3 px-3 text-center align-top">
                                        <span className={cn(
                                          "w-7 h-7 inline-flex items-center justify-center rounded-xl font-black text-xs border shadow-sm",
                                          lvl.level === 5 ? "bg-emerald-500 text-slate-950 border-emerald-400" :
                                          lvl.level === 4 ? "bg-sky-500 text-slate-950 border-sky-400" :
                                          lvl.level === 3 ? "bg-teal-500 text-slate-950 border-teal-400" :
                                          lvl.level === 2 ? "bg-amber-500 text-slate-950 border-amber-400" :
                                          "bg-rose-600 text-white border-rose-500"
                                        )}>
                                          {lvl.level}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 font-bold text-white align-top">
                                        {lvl.definition}
                                      </td>
                                      <td className="py-3 px-4 text-slate-300 align-top leading-relaxed text-xs">
                                        {lvl.description}
                                      </td>
                                      <td className="py-3 px-4 text-emerald-300 font-medium align-top leading-relaxed text-xs bg-emerald-950/20 rounded-r-lg">
                                        {lvl.coachingPointsRef}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <p className="text-[11px] text-slate-400 mt-2.5 italic">
                                💡 Hinweis: Für feinere Abstufungen können über die dezenten Zwischen-Buttons auch halbe Stufen (1,5 / 2,5 / 3,5 / 4,5) vergeben werden.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Selection Ribbon (only for Technik, Taktik, Mental) */}
                {currentCat !== 'Athletik' && (() => {
                  const exMap = new Map((exercises || []).map(ex => [ex.id, ex]));

                  const playerKeeperInsights = activePlayer
                    ? (savedPlans || [])
                        .filter(p => Boolean(p.keeperInsights?.[activePlayer.id]?.trim()))
                        .sort((a, b) => {
                          const dA = new Date(a.date || a.planDate || '').getTime() || 0;
                          const dB = new Date(b.date || b.planDate || '').getTime() || 0;
                          return dB - dA;
                        })
                    : [];

                  const filteredKeeperInsights = playerKeeperInsights.filter(plan => {
                    if (!preparationInsightFilter || preparationInsightFilter === 'all') return true;
                    const term = preparationInsightFilter.toLowerCase();

                    // 1. Check keeper insight text
                    const insightText = (activePlayer && plan.keeperInsights?.[activePlayer.id]) || '';
                    if (insightText.toLowerCase().includes(term)) return true;

                    // 2. Check plan title, notes, targetGroup
                    if ((plan.title || '').toLowerCase().includes(term)) return true;
                    if ((plan.planTitle || '').toLowerCase().includes(term)) return true;
                    if ((plan.notes || '').toLowerCase().includes(term)) return true;
                    if ((plan.targetGroup || '').toLowerCase().includes(term)) return true;

                    // 3. Check exercises in plan
                    const planPhases = (plan as any).phaseExercises || (plan as any).phases || {};
                    const customExercises = (plan as any).customPlanExercises || {};

                    for (const phaseExIds of Object.values(planPhases)) {
                      if (!Array.isArray(phaseExIds)) continue;
                      for (const exId of phaseExIds) {
                        const ex = customExercises[exId] || exMap.get(exId);
                        if (!ex) continue;
                        if ((ex.title || '').toLowerCase().includes(term)) return true;
                        if ((ex.category || '').toLowerCase().includes(term)) return true;
                        if ((ex.technik || '').toLowerCase().includes(term)) return true;
                        if ((ex.taktik || '').toLowerCase().includes(term)) return true;
                        if ((ex.description || '').toLowerCase().includes(term)) return true;
                        if ((ex.coachingPoints || []).some((cp: string) => cp.toLowerCase().includes(term))) return true;
                      }
                    }

                    return false;
                  });

                  const latestQualEval = activePlayer
                    ? (evaluations || [])
                        .filter(e => e.playerId === activePlayer.id && e.category === currentCat)
                        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                        .find(e => Boolean(e.strengths?.trim()) || Boolean(e.developmentAreas?.trim()) || Boolean(e.overallNotes?.trim())) ||
                      (evaluations || [])
                        .filter(e => e.playerId === activePlayer.id && e.category === currentCat)
                        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null
                    : null;

                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border", catColor.badge)}>
                              Dateneingabe • {currentCat}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <h3 className="text-lg font-extrabold text-white">
                              Fähigkeiten-Bewertung: {currentCat}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setShowPreparation(prev => !prev)}
                              className={cn(
                                "px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition active:scale-95 shadow-sm border",
                                showPreparation
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/30"
                                  : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 hover:border-slate-600"
                              )}
                              title="Vorbereitungsansicht (Erkenntnisse & letztes Feedback) ein-/ausblenden"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Vorbereitung</span>
                              <span className="text-[10px] opacity-75">{showPreparation ? '▲' : '▼'}</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Wähle eine Trainingsgruppe und einen Torhüter aus, um die {currentCat}-Skills zu bewerten.
                          </p>
                        </div>

                        {/* Group Dropdown */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 font-bold">Gruppe:</label>
                          <select
                            value={selectedEvaluationGroupId}
                            onChange={e => {
                              const gid = e.target.value;
                              setSelectedEvaluationGroupId(gid);
                              const g = groups.find(x => x.id === gid);
                              if (g && g.players && g.players.length > 0) {
                                setSelectedEvaluationPlayerId(g.players[0].id);
                              } else {
                                setSelectedEvaluationPlayerId('');
                              }
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                          >
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>
                                {g.name} ({g.players?.length || 0} TW)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Read-Only Notice for non-assigned coaches in club */}
                      {!canEditGroupData(activeGroup) && activeGroup && (
                        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 flex items-center gap-3 text-amber-200 text-xs shadow-md">
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-amber-300">Schreibgeschützter Modus: </span>
                            Diese Trainingsgruppe ist dem lizenzierten Trainer <span className="font-semibold text-white">{activeGroup.assignedCoachName || activeGroup.assignedCoachEmail || 'einem anderen Trainer'}</span> zugewiesen. Du kannst alle Daten einsehen, Bewertungen können jedoch nur vom zugewiesenen Trainer oder Club-Admin gespeichert werden.
                          </div>
                        </div>
                      )}

                      {/* Player Quick Chips */}
                      {groupPlayers.length === 0 ? (
                        <div className="p-6 text-center bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400">
                          In dieser Trainingsgruppe sind noch keine Torhüter angelegt.{' '}
                          <button
                            type="button"
                            onClick={() => setActiveSubTab('groups')}
                            className="text-emerald-400 font-bold hover:underline ml-1"
                          >
                            + Spieler anlegen
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                          {groupPlayers.map(p => {
                            const isSelected = p.id === selectedEvaluationPlayerId;
                            const pEval = evaluations.find(e => e.playerId === p.id && e.category === currentCat);
                            const pScores = pEval?.ratings ? Object.values(pEval.ratings).filter(v => v > 0) : [];
                            const pAvg = pScores.length > 0 ? (pScores.reduce((a, b) => a + b, 0) / pScores.length).toFixed(1) : null;

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedEvaluationPlayerId(p.id)}
                                className={cn(
                                  "px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 flex-shrink-0 transition active:scale-95",
                                  isSelected 
                                    ? "bg-slate-950 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/50 font-bold"
                                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                                )}
                              >
                                <div className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px]",
                                  isSelected ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                                )}>
                                  {p.jerseyNumber ? `#${p.jerseyNumber}` : p.firstName.charAt(0)}
                                </div>
                                <span className="truncate">{p.firstName} {p.lastName}</span>
                                {pAvg && (
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                                    ⭐ {pAvg}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 2-Column Preparation View (when active) */}
                      {showPreparation && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                                  Vorbereitung: {activePlayer?.firstName} {activePlayer?.lastName}
                                  <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60">
                                    {currentCat}
                                  </span>
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                  Erkenntnisse aus vergangenen Trainingseinheiten und zuletzt dokumentiertes qualitatives Feedback im Bereich {currentCat}.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPreparation(false)}
                              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                            >
                              ✕ Schließen
                            </button>
                          </div>

                          {/* Two Columns Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                            {/* Linke Spalte: Erkenntnisse der Trainingseinheiten */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col h-full">
                              <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                                  <h5 className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-wider">
                                    Erkenntnisse der Trainingseinheiten
                                  </h5>
                                </div>

                                {/* Filter Dropdown (Technik, Taktik, Athletik, Mental, Alle) */}
                                <div className="flex items-center gap-1.5">
                                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                                  <select
                                    value={preparationInsightFilter}
                                    onChange={e => setPreparationInsightFilter(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                                    title="Nach Begriff / Bereich filtern"
                                  >
                                    <option value="all">Alle Bereiche</option>
                                    <option value="Technik">Technik</option>
                                    <option value="Taktik">Taktik</option>
                                    <option value="Athletik">Athletik</option>
                                    <option value="Mental">Mental</option>
                                  </select>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                    {filteredKeeperInsights.length}
                                  </span>
                                </div>
                              </div>

                              {playerKeeperInsights.length === 0 ? (
                                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800/80 my-auto">
                                  <p className="text-xs text-slate-400 italic">
                                    Noch keine spezifischen Erkenntnisse aus den Trainingseinheiten für {activePlayer?.firstName || 'diesen Torwart'} erfasst.
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-1">
                                    (Diese werden im Bereich <em>Trainingsplaner &gt; Historie &gt; Trainingseinheit nachbereiten</em> dokumentiert)
                                  </p>
                                </div>
                              ) : filteredKeeperInsights.length === 0 ? (
                                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800/80 my-auto space-y-2">
                                  <p className="text-xs text-slate-300 font-medium">
                                    Keine Erkenntnisse oder Einheiten mit dem Begriff <span className="font-bold text-emerald-400">„{preparationInsightFilter}“</span> gefunden.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setPreparationInsightFilter('all')}
                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                                  >
                                    Filter auf „Alle Bereiche“ zurücksetzen
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                                  {filteredKeeperInsights.map(plan => {
                                    const insightText = (activePlayer && plan.keeperInsights?.[activePlayer.id]) || '';
                                    const planDateStr = plan.date || plan.planDate || '';
                                    let formattedDate = planDateStr;
                                    try {
                                      if (planDateStr) {
                                        formattedDate = new Date(planDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                      }
                                    } catch {
                                      formattedDate = planDateStr;
                                    }

                                    return (
                                      <div key={plan.id} className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                          <span className="font-extrabold text-white">
                                            {plan.title || plan.planTitle || 'Trainingseinheit'}
                                          </span>
                                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                                            📅 {formattedDate || '–'}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800/60 whitespace-pre-wrap">
                                          {insightText}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Rechte Spalte: Letztes qualitatives Feedback */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col h-full">
                              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-sky-400" />
                                  <h5 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                                    Letztes qualitatives Feedback ({currentCat})
                                  </h5>
                                </div>
                                {latestQualEval?.updatedAt && (
                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                    Stand: {new Date(latestQualEval.updatedAt).toLocaleDateString('de-DE')}
                                  </span>
                                )}
                              </div>

                              {!latestQualEval || (!latestQualEval.strengths?.trim() && !latestQualEval.developmentAreas?.trim() && !latestQualEval.overallNotes?.trim()) ? (
                                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800/80 my-auto">
                                  <p className="text-xs text-slate-400 italic">
                                    Noch kein qualitatives Feedback im Bereich {currentCat} für {activePlayer?.firstName || 'diesen Torwart'} hinterlegt.
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-1">
                                    (Wird unten in den Feldern <em>Stärken</em>, <em>Entwicklungsfelder</em> und <em>Notizen</em> erfasst)
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                                  {/* Stärken */}
                                  <div className="bg-slate-950 border border-emerald-900/40 rounded-xl p-3.5 space-y-1.5">
                                    <span className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                                      • Positive Entwicklung und Stärken
                                    </span>
                                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800/60 whitespace-pre-wrap">
                                      {latestQualEval.strengths?.trim() || <span className="text-slate-500 italic">Keine Einträge vorhanden</span>}
                                    </p>
                                  </div>

                                  {/* Entwicklungsfelder */}
                                  <div className="bg-slate-950 border border-amber-900/40 rounded-xl p-3.5 space-y-1.5">
                                    <span className="text-[11px] font-extrabold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                                      • Entwicklungsfelder & Schwierigkeiten
                                    </span>
                                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800/60 whitespace-pre-wrap">
                                      {latestQualEval.developmentAreas?.trim() || <span className="text-slate-500 italic">Keine Einträge vorhanden</span>}
                                    </p>
                                  </div>

                                  {/* Allgemeine Notizen */}
                                  <div className="bg-slate-950 border border-sky-900/40 rounded-xl p-3.5 space-y-1.5">
                                    <span className="text-[11px] font-extrabold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                                      • Allgemeine Notizen & Beobachtungen
                                    </span>
                                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800/60 whitespace-pre-wrap">
                                      {latestQualEval.overallNotes?.trim() || <span className="text-slate-500 italic">Keine Einträge vorhanden</span>}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Main Rating Scorecard for Selected Player */}
                {activePlayer && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
                    {/* Player Info Banner & Category Average (only for Technik, Taktik, Mental) */}
                    {currentCat !== 'Athletik' && (
                      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-800">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-base text-emerald-400 shadow-inner">
                            {activePlayer.jerseyNumber ? `#${activePlayer.jerseyNumber}` : activePlayer.firstName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base sm:text-lg font-black text-white">
                                {activePlayer.firstName} {activePlayer.lastName}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {activeGroup.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {activePlayer.birthYear ? `Jahrgang ${activePlayer.birthYear}` : 'Kein Jahrgang angegeben'} {activePlayer.notes ? `• ${activePlayer.notes}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Category Score / Status Badge */}
                        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-800">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Ø {currentCat}-Score
                            </span>
                            <span className="text-xs font-medium text-slate-300">
                              {scoresList.length} von {currentSkills.length} bewertet
                            </span>
                          </div>
                          <div className="text-2xl font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/40">
                            {averageScore ? `${averageScore}` : '-'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ATHLETIK VIEW: 3 Sub-Tabs (Biologischer vs. Athletischer Entwicklungsstand vs. Bewertungskriterien) */}
                    {currentCat === 'Athletik' ? (
                      <div className="space-y-5">
                        {/* Sub-Tabs Selector */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                          <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
                            <button
                              type="button"
                              onClick={() => setAthleticSubTab('biological')}
                              className={cn(
                                "flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2",
                                athleticSubTab === 'biological'
                                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-950/60"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              )}
                            >
                              <Dna className="w-4 h-4" />
                              <span>Biologischer Entwicklungsstand</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAthleticSubTab('athletic')}
                              className={cn(
                                "flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2",
                                athleticSubTab === 'athletic'
                                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-950/60"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              )}
                            >
                              <Zap className="w-4 h-4" />
                              <span>Athletischer Entwicklungsstand</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAthleticSubTab('criteria')}
                              className={cn(
                                "flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2",
                                athleticSubTab === 'criteria'
                                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-950/60"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              )}
                            >
                              <TableProperties className="w-4 h-4" />
                              <span>Bewertungskriterien</span>
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-400 font-medium px-2 hidden sm:block">
                            {athleticSubTab === 'biological' 
                              ? '🧬 Anthropometrie & Mirwald PHV-Reifegrad' 
                              : athleticSubTab === 'athletic' 
                              ? '⚡ 7 Leistungsdiagnostik-Tests & PDF' 
                              : '📊 AT-Normwerttabellen & 9-Stufen-Raster'}
                          </div>
                        </div>

                        {/* SUB-TAB 1: BIOLOGISCHER ENTWICKLUNGSSTAND */}
                        {athleticSubTab === 'biological' && (
                          <div className="space-y-5 animate-in fade-in duration-150">
                            {/* Hero Card */}
                            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-400">
                                  <Dna className="w-4 h-4 text-teal-400" />
                                  <span>NextLevel Goalkeeping Academy • Biologische Reifebestimmung & Bio-Banding</span>
                                </div>
                                <h4 className="text-lg sm:text-xl font-extrabold text-white">
                                  Biologischer Entwicklungsstand (Mirwald PHV-Reifegrad)
                                </h4>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                                  Berechnung des Abstands zum Peak Height Velocity (Wachstumsschub) über Alter, Körperhöhe, Sitzhöhe und Gewicht nach der Mirwald-Formel. Ermöglicht faire Leistungsvergleiche und verletzungspräventive Belastungssteuerung im Torwarttraining.
                                </p>
                              </div>

                              {/* 3 Phases Explainers */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
                                <div className="p-3 rounded-2xl bg-sky-950/30 border border-sky-500/30">
                                  <div className="flex items-center gap-1.5 text-xs font-black text-sky-400">
                                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                                    <span>Pre-PHV (vor dem Schub)</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                                    Maturity Offset &lt; -1,0 J. Schwerpunkt: Koordination, Fangsicherheit, Grundlagenschnelligkeit & Gewandtheit.
                                  </p>
                                </div>

                                <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30">
                                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span>Circa-PHV (im Schub)</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                                    Maturity Offset -1,0 bis +1,0 J. Schwerpunkt: Belastungsreduktion, Sehnen-/Gelenkschutz & Technikanpassung an Hebel.
                                  </p>
                                </div>

                                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Post-PHV (ausgereift)</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                                    Maturity Offset &gt; +1,0 J. Schwerpunkt: Gezielter Muskelaufbau, Hypertrophie, Maximalkraft & Zweikampfhärte.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Keeper Selection Bar directly above Anthropometrische Messgrößen erfassen */}
                            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-md">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-teal-400" />
                                  <span>Torhüter auswählen:</span>
                                </label>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-400 font-bold">Gruppe:</span>
                                  <select
                                    value={selectedEvaluationGroupId}
                                    onChange={e => {
                                      const gid = e.target.value;
                                      setSelectedEvaluationGroupId(gid);
                                      const g = groups.find(x => x.id === gid);
                                      if (g && g.players && g.players.length > 0) {
                                        setSelectedEvaluationPlayerId(g.players[0].id);
                                      } else {
                                        setSelectedEvaluationPlayerId('');
                                      }
                                    }}
                                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-teal-500"
                                  >
                                    {groups.map(g => (
                                      <option key={g.id} value={g.id}>
                                        {g.name} ({g.players?.length || 0} TW)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {groupPlayers.length === 0 ? (
                                <div className="p-3 text-center bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-400">
                                  In dieser Trainingsgruppe sind noch keine Torhüter angelegt.
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                                  {groupPlayers.map(p => {
                                    const isSelected = p.id === selectedEvaluationPlayerId;
                                    const pEval = evaluations.find(e => e.playerId === p.id && e.category === 'Athletik');
                                    const bioClass = pEval?.biologicalMetrics?.phvClassification;

                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setSelectedEvaluationPlayerId(p.id)}
                                        className={cn(
                                          "px-3.5 py-2 rounded-2xl border flex items-center gap-2 flex-shrink-0 transition active:scale-95",
                                          isSelected 
                                            ? "bg-slate-900 border-teal-500 text-white shadow-md ring-1 ring-teal-500/50 font-bold"
                                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                                        )}
                                      >
                                        <div className={cn(
                                          "w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px]",
                                          isSelected ? "bg-teal-500 text-slate-950" : "bg-slate-800 text-slate-300"
                                        )}>
                                          {p.jerseyNumber ? `#${p.jerseyNumber}` : p.firstName.charAt(0)}
                                        </div>
                                        <span className="truncate">{p.firstName} {p.lastName}</span>
                                        {bioClass && (
                                          <span className={cn(
                                            "text-[10px] font-extrabold px-1.5 py-0.2 rounded border",
                                            bioClass === 'Pre-PHV' ? "bg-sky-950 text-sky-300 border-sky-600" :
                                            bioClass === 'Circa-PHV' ? "bg-amber-950 text-amber-300 border-amber-600" :
                                            "bg-emerald-950 text-emerald-300 border-emerald-600"
                                          )}>
                                            {bioClass}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Anthropometric Input Fields */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <Ruler className="w-4 h-4 text-teal-400" />
                                <span>Anthropometrische Messgrößen erfassen</span>
                              </h5>
                              <span className="text-[11px] text-slate-500">
                                Stadiometer, Hocker-Sitzhöhe, Waage & Wingspan
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 1. Körperhöhe */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-teal-400">01.</span>
                                      <h6 className="text-sm font-extrabold text-white">Körperhöhe (Standhöhe in cm)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Mit Stadiometer oder festem Wandmaßband (aufrecht, ohne Schuhe).
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    cm
                                  </span>
                                </div>

                                <div className="pt-1">
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                    Standhöhe (cm)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="z. B. 175.5"
                                    value={currentBioMetrics.standingHeightCm || ''}
                                    onChange={(e) => setCurrentBioMetrics(prev => ({ ...prev, standingHeightCm: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 2. Sitzhöhe */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-teal-400">02.</span>
                                      <h6 className="text-sm font-extrabold text-white">Sitzhöhe (in cm)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Messung der Rumpflänge im Sitzen auf einem Hocker (optional – wird sonst näherungsweise geschätzt).
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    cm
                                  </span>
                                </div>

                                <div className="pt-1">
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                    Sitzhöhe / Rumpflänge (cm)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="z. B. 89.0 (optional)"
                                    value={currentBioMetrics.sittingHeightCm || ''}
                                    onChange={(e) => setCurrentBioMetrics(prev => ({ ...prev, sittingHeightCm: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 3. Körpergewicht */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-teal-400">03.</span>
                                      <h6 className="text-sm font-extrabold text-white">Körpergewicht (in kg)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Zur Berechnung von Relativkraftwerten und Körpermasse im Reifegradmodell.
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    kg
                                  </span>
                                </div>

                                <div className="pt-1">
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                    Gewicht (kg)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="z. B. 63.8"
                                    value={currentBioMetrics.weightKg || ''}
                                    onChange={(e) => setCurrentBioMetrics(prev => ({ ...prev, weightKg: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 4. Armspannweite */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-teal-400">04.</span>
                                      <h6 className="text-sm font-extrabold text-white">Armspannweite (Wingspan in cm)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Fingerspitze zu Fingerspitze bei horizontal ausgestreckten Armen (TW-Profilmerkmal).
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    cm
                                  </span>
                                </div>

                                <div className="pt-1">
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                    Wingspan (cm)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="z. B. 181.0"
                                    value={currentBioMetrics.wingspanCm || ''}
                                    onChange={(e) => setCurrentBioMetrics(prev => ({ ...prev, wingspanCm: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Optional: Age and Date info bar */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
                              <div>
                                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                  Chronologisches Alter (Dezimaljahre)
                                </label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder={activePlayer?.birthYear ? `Berechnet: ${(new Date().getFullYear() - (parseBioNumber(activePlayer.birthYear) || 2010)).toFixed(1)} J.` : 'z. B. 14.5'}
                                  value={currentBioMetrics.customAge || ''}
                                  onChange={(e) => setCurrentBioMetrics(prev => ({ ...prev, customAge: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                  Messdatum der Anthropometrie
                                </label>
                                <input
                                  type="date"
                                  value={currentBioMetrics.measurementDate || ''}
                                  onChange={(e) => setCurrentBioMetrics(prev => ({ ...prev, measurementDate: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                                />
                              </div>
                            </div>

                            {/* Live Mirwald Calculation Results Dashboard */}
                            {(() => {
                              const currentYear = new Date().getFullYear();
                              const playerBirthYear = activePlayer?.birthYear ? parseBioNumber(activePlayer.birthYear) : undefined;
                              const defaultAge = playerBirthYear && playerBirthYear > 1980 ? (currentYear - playerBirthYear) : 15;
                              const calcAge = parseBioNumber(currentBioMetrics.customAge) || defaultAge;

                              const mirwald = calculateMirwaldMaturityOffset({
                                standingHeightCm: currentBioMetrics.standingHeightCm,
                                sittingHeightCm: currentBioMetrics.sittingHeightCm,
                                weightKg: currentBioMetrics.weightKg,
                                chronologicalAge: calcAge,
                                wingspanCm: currentBioMetrics.wingspanCm
                              });

                              if (!mirwald) {
                                return (
                                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
                                    <Info className="w-5 h-5 text-teal-400 flex-shrink-0" />
                                    <span>
                                      Trage oben <strong>Körperhöhe</strong> und <strong>Körpergewicht</strong> ein (Sitzhöhe optional), um den biologischen Reifegrad (Maturity Offset) und die Bio-Banding Einstufung live zu berechnen.
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                  {/* Main Result Card */}
                                  <div className={cn(
                                    "p-5 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4",
                                    mirwald.phvClassification === 'Pre-PHV' ? "bg-gradient-to-br from-sky-950/40 via-slate-900 to-sky-950/20 border-sky-500/40" :
                                    mirwald.phvClassification === 'Circa-PHV' ? "bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-950/20 border-amber-500/40" :
                                    "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-emerald-950/20 border-emerald-500/40"
                                  )}>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                                          mirwald.phvClassification === 'Pre-PHV' ? "bg-sky-500/20 text-sky-300 border-sky-500/40" :
                                          mirwald.phvClassification === 'Circa-PHV' ? "bg-amber-500/20 text-amber-300 border-amber-500/40" :
                                          "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        )}>
                                          {mirwald.phvClassificationLabel}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                          Alter: {calcAge.toFixed(1)} J.
                                        </span>
                                      </div>
                                      <h4 className="text-xl font-black text-white pt-1">
                                        Maturity Offset: {mirwald.maturityOffsetYears > 0 ? `+${mirwald.maturityOffsetYears}` : mirwald.maturityOffsetYears} Jahre zum PHV
                                      </h4>
                                      <p className="text-xs text-slate-300">
                                        Geschätztes Alter beim Peak Height Velocity: <strong className="text-white font-mono">{mirwald.estimatedAgeAtPhv} Jahre</strong>
                                      </p>
                                      {mirwald.isSittingHeightEstimated && (
                                        <p className="text-[11px] text-teal-300/80 pt-0.5">
                                          ℹ️ Sitzhöhe näherungsweise geschätzt (~52.5% der Standhöhe).
                                        </p>
                                      )}
                                    </div>

                                    {/* Morphometrics Quick Pills */}
                                    <div className="grid grid-cols-3 gap-2 flex-shrink-0">
                                      <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center min-w-[85px]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Beinlänge</span>
                                        <span className="text-sm font-black text-white font-mono">{mirwald.legLengthCm} cm</span>
                                      </div>
                                      <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center min-w-[85px]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Sitzhöhe-Ratio</span>
                                        <span className="text-sm font-black text-white font-mono">{mirwald.sittingHeightRatio} %</span>
                                      </div>
                                      <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center min-w-[85px]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Ape-Index</span>
                                        <span className="text-sm font-black text-teal-400 font-mono">
                                          {mirwald.apeIndex ? `${mirwald.apeIndex}` : '—'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bio-Banding Coaching Recommendations */}
                                  <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2.5">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase text-teal-400">
                                      <Sparkles className="w-4 h-4 text-teal-400" />
                                      <span>Wissenschaftliche Bio-Banding Handlungsempfehlungen ({mirwald.phvClassification})</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                                        <strong className="text-white block font-bold">🎯 Trainingsschwerpunkte:</strong>
                                        <p className="text-slate-300 leading-relaxed">{mirwald.recommendations.focus}</p>
                                      </div>
                                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                                        <strong className="text-amber-400 block font-bold">⚠️ Belastungssteuerung & Prävention:</strong>
                                        <p className="text-slate-300 leading-relaxed">{mirwald.recommendations.cautions}</p>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 italic pt-1">
                                      💡 <strong>Bio-Banding Hinweis:</strong> {mirwald.recommendations.bioBandingHint}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                              {/* SUB-TAB 2: ATHLETISCHER ENTWICKLUNGSSTAND (7 TESTS + PDF) */}
                              {athleticSubTab === 'athletic' && (
                                <div className="space-y-5 animate-in fade-in duration-150">
                                  {/* Hero Card & Download PDF */}
                                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="space-y-1.5 max-w-2xl">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                                          <Zap className="w-4 h-4 text-emerald-400" />
                                          <span>NextLevel Goalkeeping Academy • Standardisierte Leistungsdiagnostik</span>
                                        </div>
                                        <h4 className="text-lg sm:text-xl font-extrabold text-white">
                                          Torwartspezifischer Athletiktest (7 Testübungen)
                                        </h4>
                                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                          Standardisierte Messprotokolle für Maximalkraft, Sprunghöhe, laterale Explosivität, Antritts- & Richtungswechselschnelligkeit, Rumpfkraft sowie Reaktionsschnelligkeit & kognitive Handlungsinhibition zur Bestimmung des individuellen Torwart-Athletikprofils.
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={isGeneratingPdf}
                                        onClick={handleDownloadAthleticTestPDF}
                                        className="px-5 py-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2.5 transition active:scale-98 flex-shrink-0 disabled:opacity-50"
                                      >
                                        {isGeneratingPdf ? (
                                          <>
                                            <Clock className="w-4 h-4 animate-spin" />
                                            <span>PDF wird erstellt...</span>
                                          </>
                                        ) : (
                                          <>
                                            <FileDown className="w-4.5 h-4.5" />
                                            <span>Athletiktest als PDF herunterladen</span>
                                          </>
                                        )}
                                      </button>
                              </div>

                              {/* Compact Test Overview Chips */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 pt-2 border-t border-slate-800/80">
                                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">1. Griffkraft</span>
                                  <span className="text-xs font-extrabold text-white">Maximalkraft (kg)</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">2. CMJ Jump</span>
                                  <span className="text-xs font-extrabold text-white">Sprunghöhe (cm)</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">3. Lateral Push</span>
                                  <span className="text-xs font-extrabold text-white">Abdruckweite (cm)</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">4. Linearsprint</span>
                                  <span className="text-xs font-extrabold text-white">5 m / 10 m (s)</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">5. Hybrid-Shuttle</span>
                                  <span className="text-xs font-extrabold text-white">5-10-5 m Agility (s)</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">6. Medizinball</span>
                                  <span className="text-xs font-extrabold text-white">Wurfweite (m)</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">7. BlazePod</span>
                                  <span className="text-xs font-extrabold text-white">Reaktion (ms/Hits)</span>
                                </div>
                              </div>
                            </div>

                            {/* Keeper Selection Bar directly above Messwerte der 7 Athletiktests erfassen */}
                            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-md">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-emerald-400" />
                                  <span>Torhüter auswählen:</span>
                                </label>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-400 font-bold">Gruppe:</span>
                                  <select
                                    value={selectedEvaluationGroupId}
                                    onChange={e => {
                                      const gid = e.target.value;
                                      setSelectedEvaluationGroupId(gid);
                                      const g = groups.find(x => x.id === gid);
                                      if (g && g.players && g.players.length > 0) {
                                        setSelectedEvaluationPlayerId(g.players[0].id);
                                      } else {
                                        setSelectedEvaluationPlayerId('');
                                      }
                                    }}
                                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                                  >
                                    {groups.map(g => (
                                      <option key={g.id} value={g.id}>
                                        {g.name} ({g.players?.length || 0} TW)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {groupPlayers.length === 0 ? (
                                <div className="p-3 text-center bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-400">
                                  In dieser Trainingsgruppe sind noch keine Torhüter angelegt.
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                                  {groupPlayers.map(p => {
                                    const isSelected = p.id === selectedEvaluationPlayerId;
                                    const pEval = evaluations.find(e => e.playerId === p.id && e.category === 'Athletik');
                                    const hasAthletics = pEval?.athleticMetrics && Object.values(pEval.athleticMetrics).some(v => Boolean(v));

                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setSelectedEvaluationPlayerId(p.id)}
                                        className={cn(
                                          "px-3.5 py-2 rounded-2xl border flex items-center gap-2 flex-shrink-0 transition active:scale-95",
                                          isSelected 
                                            ? "bg-slate-900 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/50 font-bold"
                                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                                        )}
                                      >
                                        <div className={cn(
                                          "w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px]",
                                          isSelected ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                                        )}>
                                          {p.jerseyNumber ? `#${p.jerseyNumber}` : p.firstName.charAt(0)}
                                        </div>
                                        <span className="truncate">{p.firstName} {p.lastName}</span>
                                        {hasAthletics && (
                                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                                            ✓ Erfasst
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Form Header */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-400" />
                                <span>Messwerte der 7 Athletiktests erfassen</span>
                              </h5>
                              <span className="text-[11px] text-slate-500">
                                Exakte Werte in den jeweiligen Einheiten (kg, cm, s, m, ms, Hits)
                              </span>
                            </div>

                            {/* Testdatum / Diagnostiktag (Pflichtfeld mit Kalenderauswahl & Direkteingabe) */}
                            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-emerald-400" />
                                    <label htmlFor="athletic-test-date" className="text-sm font-extrabold text-white flex items-center gap-1.5 cursor-pointer">
                                      <span>Datum des Athletiktests</span>
                                      <span className="text-rose-400 font-black text-sm" title="Pflichtfeld">*</span>
                                    </label>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30">
                                      Pflichtfeld
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Datum der Durchführung des Athletiktests (über den integrierten Kalender auswählen oder manuell eingeben).
                                  </p>
                                </div>
                                <div className="w-full sm:w-64">
                                  <input
                                    id="athletic-test-date"
                                    type="date"
                                    required
                                    value={currentAthleticMetrics.testDate || ''}
                                    onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, testDate: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2 text-sm text-white font-mono shadow-inner transition-all cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 7 Test Input Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 1. Griffkraft */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-emerald-400">01.</span>
                                      <h6 className="text-sm font-extrabold text-white">Griffkraft (Handgrip Strength)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Isometrische Maximalkraft (kg) • Southampton-Protokoll
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    kg
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Rechts (kg)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      placeholder="z. B. 42.5"
                                      value={currentAthleticMetrics.gripRightKg || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, gripRightKg: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Links (kg)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      placeholder="z. B. 39.8"
                                      value={currentAthleticMetrics.gripLeftKg || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, gripLeftKg: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                </div>

                                {/* Live Grip Diff */}
                                {(() => {
                                  const r = Number(currentAthleticMetrics.gripRightKg) || 0;
                                  const l = Number(currentAthleticMetrics.gripLeftKg) || 0;
                                  const max = Math.max(r, l);
                                  if (r > 0 && l > 0 && max > 0) {
                                    const diff = ((Math.abs(r - l) / max) * 100).toFixed(1);
                                    const isHigh = parseFloat(diff) > 10;
                                    return (
                                      <div className={cn(
                                        "p-2 rounded-xl text-xs flex items-center justify-between border",
                                        isHigh ? "bg-amber-950/30 border-amber-500/30 text-amber-300" : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                                      )}>
                                        <span className="font-semibold">Seitendifferenz:</span>
                                        <span className="font-black font-mono">{diff} % Δ {isHigh ? '(⚠️ >10% Dysbalance)' : '(✓ Symmetrisch)'}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>

                              {/* 2. CMJ */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-emerald-400">02.</span>
                                      <h6 className="text-sm font-extrabold text-white">Countermovement Jump (CMJ)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Vertikale Sprunghöhe (cm) mit Armeinsatz • Flankensicherung
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    cm
                                  </span>
                                </div>

                                <div className="pt-1">
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                    Sprunghöhe (cm) — Maximalwert aus 3 Versuchen
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    placeholder="z. B. 48.5"
                                    value={currentAthleticMetrics.cmjHeightCm || ''}
                                    onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, cmjHeightCm: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 3. Single-Leg Lateral Push */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-emerald-400">03.</span>
                                      <h6 className="text-sm font-extrabold text-white">Single-Leg Lateral Push (Abdruck)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Laterale Abdruckweite (cm) zielnahes Bein • Stick the Landing
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    cm
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Abdruck Rechts (cm)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      placeholder="z. B. 195"
                                      value={currentAthleticMetrics.lateralPushRightCm || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, lateralPushRightCm: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Abdruck Links (cm)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      placeholder="z. B. 190"
                                      value={currentAthleticMetrics.lateralPushLeftCm || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, lateralPushLeftCm: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                </div>

                                {/* Live Lateral Diff */}
                                {(() => {
                                  const r = Number(currentAthleticMetrics.lateralPushRightCm) || 0;
                                  const l = Number(currentAthleticMetrics.lateralPushLeftCm) || 0;
                                  const max = Math.max(r, l);
                                  if (r > 0 && l > 0 && max > 0) {
                                    const diff = ((Math.abs(r - l) / max) * 100).toFixed(1);
                                    const isHigh = parseFloat(diff) > 10;
                                    return (
                                      <div className={cn(
                                        "p-2 rounded-xl text-xs flex items-center justify-between border",
                                        isHigh ? "bg-amber-950/30 border-amber-500/30 text-amber-300" : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                                      )}>
                                        <span className="font-semibold">Symmetrie-Index:</span>
                                        <span className="font-black font-mono">{diff} % {isHigh ? '(⚠️ >10% Kraftdefizit)' : '(✓ Symmetrisch)'}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>

                              {/* 4. Linearsprints 5 m / 10 m */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-emerald-400">04.</span>
                                      <h6 className="text-sm font-extrabold text-white">Lineare Sprints (5 m und 10 m)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Antritt & Beschleunigung (s) • Lichtschrankenmessung
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    s
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Zeit 5 m (s)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="z. B. 1.08"
                                      value={currentAthleticMetrics.sprint5mSec || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, sprint5mSec: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Zeit 10 m (s)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="z. B. 1.84"
                                      value={currentAthleticMetrics.sprint10mSec || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, sprint10mSec: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* 5. Hybrid Shuttle */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-emerald-400">05.</span>
                                      <h6 className="text-sm font-extrabold text-white">Hybrid-Shuttle (5-10-5 m Agilität)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Transition Sidestep/Sprint & Torraumschnelligkeit (s)
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    s
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Start Rechts (s)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="z. B. 4.65"
                                      value={currentAthleticMetrics.agilityShuttleRightSec || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, agilityShuttleRightSec: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Start Links (s)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="z. B. 4.70"
                                      value={currentAthleticMetrics.agilityShuttleLeftSec || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, agilityShuttleLeftSec: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* 6. Medizinballwurf über Kopf */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-emerald-400">06.</span>
                                      <h6 className="text-sm font-extrabold text-white">Medizinballwurf über Kopf</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Dynamische Oberkörper- und Rumpfschnellkraft (m)
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                    m
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Ballgewicht (kg)
                                    </label>
                                    <select
                                      value={currentAthleticMetrics.medBallWeightKg || '2'}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, medBallWeightKg: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-bold"
                                    >
                                      <option value="1">1 kg (U12–U14)</option>
                                      <option value="2">2 kg (ab U15 / Senioren)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                      Wurfweite (m)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      placeholder="z. B. 8.4"
                                      value={currentAthleticMetrics.medBallDistanceM || ''}
                                      onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, medBallDistanceM: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* 7. BlazePod Tisch-Reaktionstest */}
                              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 md:col-span-2">
                                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-emerald-400">07.</span>
                                      <h6 className="text-sm font-extrabold text-white">BlazePod Tisch-Reaktionstest (Trapez-Setup)</h6>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Visuelle Reaktionsschnelligkeit, Auge-Hand-Koordination & kognitive Handlungsinhibition (Go/No-Go)
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-emerald-300">
                                    Hits / Treffer
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Test 1: Single Color */}
                                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-200">Test 1: Einfache Reaktionsschnelligkeit</span>
                                      <span className="text-[10px] font-semibold text-slate-400">Single Color (20s)</span>
                                    </div>
                                    <div>
                                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                        Trefferquote (Hits in 20s)
                                      </label>
                                      <input
                                        type="number"
                                        placeholder="z. B. 24"
                                        value={currentAthleticMetrics.blazePodSimpleHits || ''}
                                        onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, blazePodSimpleHits: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                      />
                                    </div>
                                  </div>

                                  {/* Test 2: Go/No-Go Inhibition */}
                                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-200">Test 2: Kognitive Inhibition (Go/No-Go)</span>
                                      <span className="text-[10px] font-semibold text-slate-400">2 Farben (20s)</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                          Zielfarben-Treffer (Go)
                                        </label>
                                        <input
                                          type="number"
                                          placeholder="z. B. 18"
                                          value={currentAthleticMetrics.blazePodGoNoGoHits || ''}
                                          onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, blazePodGoNoGoHits: e.target.value }))}
                                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                          Inhibitionsfehler (No-Go)
                                        </label>
                                        <input
                                          type="number"
                                          placeholder="z. B. 1"
                                          value={currentAthleticMetrics.blazePodGoNoGoErrors ?? ''}
                                          onChange={(e) => setCurrentAthleticMetrics(prev => ({ ...prev, blazePodGoNoGoErrors: e.target.value }))}
                                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SUB-TAB 3: BEWERTUNGSKRITERIEN (NORMWERTTABELLEN) */}
                        {athleticSubTab === 'criteria' && (
                          <AthleticNormwertTables />
                        )}
                      </div>
                    ) : (
                      /* Skill Rating Matrix (5-Step Scale with 0.5 Intermediate Steps) */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <h5 className="text-xs font-black uppercase tracking-wider text-slate-300">
                            Einzelne Fähigkeiten bewerten (Stufen 1 bis 5 inkl. Zwischenschritte)
                          </h5>
                          <span className="text-[11px] text-slate-500">
                            {currentCat === 'Mental'
                              ? 'Individuelle 5-Stufen-Kriterien je Aspekt'
                              : currentCat === 'Taktik' 
                              ? '1 = Einstiegsniveau • 3 = Altersgemäßer Standard • 5 = Exzellenz'
                              : '1 = Mangelhaft • 3 = Altersgemäßer Standard • 5 = Benchmark / Exzellenz'}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {(() => {
                            let lastGroup = '';
                            return currentSkills.map((skill, idx) => {
                              const isNewGroup = skill.group && skill.group !== lastGroup;
                              if (skill.group) lastGroup = skill.group;
                              const skillScaleLevels = getSkillScaleLevels(skill, currentCat);
                              const currentScore = currentRatingScores[skill.id] || 0;
                              const badge = currentScore > 0 ? getScoreBadge(currentScore, currentCat, skill) : null;
                              const activeHoveredLevel = hoveredScaleLevel?.skillId === skill.id 
                                ? skillScaleLevels.find(l => l.level === hoveredScaleLevel.level) 
                                : null;
                              const selectedLevel = currentScore > 0
                                ? skillScaleLevels.find(l => l.level === currentScore)
                                : null;

                              return (
                                <React.Fragment key={skill.id}>
                                  {isNewGroup && (
                                    <div className="pt-3 pb-1">
                                      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white shadow-inner">
                                        <div className={cn(
                                          "p-1.5 rounded-lg border",
                                          currentCat === 'Technik' ? "bg-purple-950/80 border-purple-500/40 text-purple-300" :
                                          currentCat === 'Taktik' ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" :
                                          "bg-rose-950/80 border-rose-500/40 text-rose-300"
                                        )}>
                                          <Target className="w-4 h-4" />
                                        </div>
                                        <h6 className="font-extrabold text-sm text-slate-100">
                                          {skill.group}
                                        </h6>
                                      </div>
                                    </div>
                                  )}

                                  <div 
                                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition space-y-3"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-mono font-bold text-slate-500">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}.</span>
                                          <span className="text-sm font-extrabold text-white">{skill.name}</span>
                                        </div>

                                        {badge ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                              {badge.label}
                                            </span>
                                            <span className={cn("px-2.5 py-0.5 rounded-lg text-xs border font-black", badge.bg)}>
                                              Stufe {currentScore} / 5
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[11px] text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                            nicht bewertet
                                          </span>
                                        )}
                                      </div>

                                      {skill.question ? (
                                        <p className="text-xs font-semibold text-rose-300/90 leading-relaxed bg-rose-950/30 border border-rose-500/20 px-3 py-1.5 rounded-xl w-full">
                                          ❓ {skill.question}
                                        </p>
                                      ) : skill.shortDesc ? (
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                          {skill.shortDesc}
                                        </p>
                                      ) : null}
                                    </div>

                                    {/* 5 Primary Step + 4 Intermediate Step Buttons (Full Width) */}
                                    <div className="flex items-center w-full gap-1 sm:gap-1.5 pt-1">
                                      {skillScaleLevels.map(lvl => {
                                        const isSelected = currentScore === lvl.level;
                                        const isPrimary = lvl.isPrimary;
                                        const isHovered = hoveredScaleLevel?.skillId === skill.id && hoveredScaleLevel?.level === lvl.level;

                                        return (
                                          <div
                                            key={lvl.level}
                                            className={cn(
                                              "relative flex items-center justify-center",
                                              isPrimary ? "flex-[2]" : "flex-1"
                                            )}
                                          >
                                            {/* Floating Tooltip positioned ABOVE the button */}
                                            {isHovered && (
                                              <div className={cn(
                                                "absolute bottom-full mb-2.5 w-60 max-w-[85vw] sm:w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-slate-100 p-2.5 rounded-xl shadow-2xl z-50 pointer-events-none text-left animate-in fade-in zoom-in-95 duration-150",
                                                lvl.level <= 1.5 ? "left-0" : lvl.level >= 4.5 ? "right-0" : "left-1/2 -translate-x-1/2"
                                              )}>
                                                <div className="flex items-center gap-1.5 font-bold text-[10.5px] text-emerald-400 mb-1">
                                                  <span>🎯 {currentCat === 'Mental' ? 'Kriterium' : currentCat === 'Taktik' ? 'Taktische Coaching Points' : 'Bezug zu Coaching Points'} (Stufe {lvl.level})</span>
                                                </div>
                                                <p className="text-[11px] text-slate-200 leading-snug">
                                                  {lvl.coachingPointsRef}
                                                </p>
                                                {/* Arrow */}
                                                <div className={cn(
                                                  "absolute top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-700",
                                                  lvl.level <= 1.5 ? "left-4" : lvl.level >= 4.5 ? "right-4" : "left-1/2 -translate-x-1/2"
                                                )} />
                                                <div className={cn(
                                                  "absolute top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-900 -mt-[1px]",
                                                  lvl.level <= 1.5 ? "left-4" : lvl.level >= 4.5 ? "right-4" : "left-1/2 -translate-x-1/2"
                                                )} />
                                              </div>
                                            )}

                                            <button
                                              type="button"
                                              onMouseEnter={() => setHoveredScaleLevel({ skillId: skill.id, level: lvl.level })}
                                              onMouseLeave={() => setHoveredScaleLevel(null)}
                                              onClick={() => {
                                                setCurrentRatingScores(prev => ({
                                                  ...prev,
                                                  [skill.id]: prev[skill.id] === lvl.level ? 0 : lvl.level
                                                }));
                                              }}
                                              className={cn(
                                                "w-full transition-all flex items-center justify-center border",
                                                isPrimary 
                                                  ? "h-9 sm:h-10 rounded-xl font-black text-xs sm:text-sm shadow-sm"
                                                  : "h-7 sm:h-8 rounded-lg text-[10px] sm:text-xs font-bold self-center opacity-70 hover:opacity-100",
                                                isSelected
                                                  ? lvl.level === 5
                                                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950 scale-105 ring-2 ring-emerald-400/40 opacity-100 font-black z-10"
                                                    : lvl.level >= 4
                                                    ? "bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-950 scale-105 ring-2 ring-sky-400/40 opacity-100 font-black z-10"
                                                    : lvl.level >= 3
                                                    ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-950 scale-105 ring-2 ring-teal-400/40 opacity-100 font-black z-10"
                                                    : lvl.level >= 2
                                                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950 scale-105 ring-2 ring-amber-400/40 opacity-100 font-black z-10"
                                                    : "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950 scale-105 ring-2 ring-rose-400/40 opacity-100 font-black z-10"
                                                  : isPrimary
                                                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700"
                                                  : "bg-slate-950/80 border-slate-800 text-slate-500 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-700"
                                              )}
                                            >
                                              {lvl.level}
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Live Stage Description Preview */}
                                    {(activeHoveredLevel || selectedLevel) && (
                                      <div className={cn(
                                        "p-3 rounded-xl border text-xs leading-relaxed transition-all duration-150 animate-in fade-in",
                                        activeHoveredLevel 
                                          ? "bg-slate-900/90 border-emerald-500/40 text-slate-200" 
                                          : "bg-slate-900/40 border-slate-800 text-slate-400"
                                      )}>
                                        <div className="flex items-center gap-2 font-bold mb-1.5">
                                          <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-black border",
                                            (activeHoveredLevel || selectedLevel)?.level === 5 ? "bg-emerald-950 text-emerald-300 border-emerald-600" :
                                            (activeHoveredLevel || selectedLevel)!.level >= 4 ? "bg-sky-950 text-sky-300 border-sky-600" :
                                            (activeHoveredLevel || selectedLevel)!.level >= 3 ? "bg-teal-950 text-teal-300 border-teal-600" :
                                            (activeHoveredLevel || selectedLevel)!.level >= 2 ? "bg-amber-950 text-amber-300 border-amber-600" :
                                            "bg-rose-950 text-rose-300 border-rose-600"
                                          )}>
                                            Stufe {(activeHoveredLevel || selectedLevel)?.level}: {(activeHoveredLevel || selectedLevel)?.definition}
                                          </span>
                                          {activeHoveredLevel && (
                                            <span className="text-[10px] text-emerald-400 font-semibold italic">
                                              (Vorschau Stufenbeschreibung)
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-[11.5px] text-slate-300 leading-relaxed">
                                          {(activeHoveredLevel || selectedLevel)?.description}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </React.Fragment>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Qualitative Notes (Positive Entwicklungen und Stärken, Entwicklungsfelder und Schwierigkeiten, Trainer-Notizen) */}
                    {!(currentCat === 'Athletik' && (athleticSubTab === 'biological' || athleticSubTab === 'criteria')) && (
                      <div className="space-y-4 pt-2 border-t border-slate-800">
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-300">
                          Qualitatives Trainer-Feedback ({currentCat})
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Positive Entwicklungen und Stärken</span>
                            </label>
                            <textarea
                              rows={3}
                              value={currentStrengths}
                              onChange={e => setCurrentStrengths(e.target.value)}
                              placeholder="z. B. Überragende Fangsicherheit, exzellente Ruhe im Passspiel, dynamischer Abdruck..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-amber-400" />
                              <span>Entwicklungsfelder und Schwierigkeiten</span>
                            </label>
                            <textarea
                              rows={3}
                              value={currentDevelopmentAreas}
                              onChange={e => setCurrentDevelopmentAreas(e.target.value)}
                              placeholder="z. B. Timing beim Herauslaufen, Spieleröffnung mit dem schwachen Fuß..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                            <span>Allgemeine Notizen & Beobachtungen</span>
                          </label>
                          <textarea
                            rows={2}
                            value={currentNotes}
                            onChange={e => setCurrentNotes(e.target.value)}
                            placeholder="z. B. Sehr lernwillig, gutes Feedbackgespräch am 28.08. geführt..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    {/* Save & History Buttons */}
                    {!(currentCat === 'Athletik' && athleticSubTab === 'criteria') && (
                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-800 flex-wrap">
                        <div className="text-xs text-slate-500">
                          Änderungen werden mit aktuellem Datum als historischer Datensatz archiviert.
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Button: Historie für NAME anzeigen */}
                          <button
                            type="button"
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="px-5 py-3 rounded-2xl font-extrabold text-xs sm:text-sm text-slate-200 bg-slate-800 hover:bg-slate-750 hover:text-white border border-slate-700 active:scale-95 transition shadow-md flex items-center gap-2"
                            title={`Historische 5-Stufen Bewertungsdaten und Messungen für ${activePlayer.firstName} ansehen`}
                          >
                            <History className="w-4 h-4 text-sky-400" />
                            <span>Historie für {activePlayer.firstName} anzeigen</span>
                            {(() => {
                              const count = evaluations.filter(e => {
                                if (e.playerId !== activePlayer.id) return false;
                                if (currentCat === 'Athletik') {
                                  if (e.category !== 'Athletik') return false;
                                  if (athleticSubTab === 'biological') {
                                    return Boolean(e.biologicalMetrics && (e.biologicalMetrics.standingHeightCm || e.biologicalMetrics.weightKg));
                                  }
                                  if (athleticSubTab === 'athletic') {
                                    return Boolean(
                                      (e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean)) ||
                                      (e.ratings && Object.keys(e.ratings).length > 0)
                                    );
                                  }
                                  return true;
                                }
                                return e.category === currentCat;
                              }).length;

                              return count > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-950 text-sky-300 border border-sky-600 font-mono">
                                  {count}
                                </span>
                              ) : null;
                            })()}
                          </button>

                          {/* Button: Bewertung für NAME speichern */}
                          <button
                            type="button"
                            disabled={isSavingEvaluation || !canEditEvaluation(activeGroup)}
                            onClick={() => handleSaveEvaluation(currentCat)}
                            className={cn(
                              "px-6 py-3 rounded-2xl font-extrabold text-xs sm:text-sm text-white flex items-center gap-2.5 transition shadow-lg",
                              !canEditEvaluation(activeGroup)
                                ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60 shadow-none"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 shadow-emerald-950/60"
                            )}
                          >
                            {!hasProAccess ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            <span>
                              {!hasProAccess
                                ? 'PRO-Funktion (Nur Lesezugriff)'
                                : !canEditGroupData(activeGroup)
                                ? 'Nur Lesezugriff (Trainer zugewiesen)'
                                : isSavingEvaluation
                                ? 'Wird gespeichert...'
                                : `Bewertung für ${activePlayer.firstName} speichern`}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Standardisierte 5-Stufen Bewertungstabelle (direkt über der Gruppenübersicht) */}
                {currentCat === 'Athletik' && activePlayer && athleticSubTab !== 'criteria' && (() => {
                  const latestSavedAth = evaluations
                    .filter(e => e.playerId === activePlayer.id && e.category === 'Athletik' && e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean))
                    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];

                  const isAthleticsTab = athleticSubTab === 'athletic';
                  const hasLiveAthleticInputs = isAthleticsTab && Object.entries(currentAthleticMetrics).some(([k, v]) => k !== 'testDate' && k !== 'medBallWeightKg' && Boolean(v));

                  const athleticMetricsToEval = hasLiveAthleticInputs
                    ? currentAthleticMetrics
                    : latestSavedAth?.athleticMetrics;

                  const targetDate = hasLiveAthleticInputs
                    ? (currentAthleticMetrics.testDate || new Date().toISOString().substring(0, 10))
                    : (latestSavedAth?.athleticMetrics?.testDate || latestSavedAth?.updatedAt);

                  // Der biologische Entwicklungsstand, der zeitlich möglichst nah VOR dem eingetragenen Datum liegt
                  const closestBio = getClosestBiologicalEvaluation(evaluations, activePlayer.id, targetDate)?.biologicalMetrics;

                  return (
                    <div className="space-y-2">
                      <AthleticEvaluationMatrixCard 
                        player={activePlayer}
                        athleticMetrics={athleticMetricsToEval}
                        biologicalMetrics={closestBio}
                        savedTimestamp={hasLiveAthleticInputs ? null : (latestSavedAth?.updatedAt || null)}
                      />
                    </div>
                  );
                })()}

                {/* Team Overview Matrix */}
                {groupPlayers.length > 0 && !(currentCat === 'Athletik' && athleticSubTab === 'criteria') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-sm font-extrabold text-white">
                          Gruppenübersicht {activeGroup.name} ({currentCat})
                        </h4>
                      </div>
                      <span className="text-xs text-slate-400">
                        {groupPlayers.length} Torhüter im Vergleich
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10px]">
                          <tr>
                            <th className="py-3 px-3">Torhüter</th>
                            <th className="py-3 px-3 text-center">
                              {currentCat === 'Athletik' 
                                ? (athleticSubTab === 'biological' ? 'Reifegrad' : 'Diagnostik') 
                                : 'Ø Score'}
                            </th>
                            {currentCat === 'Athletik' && athleticSubTab === 'biological' ? (
                              <>
                                <th className="py-3 px-2 text-center">Körperhöhe</th>
                                <th className="py-3 px-2 text-center">Sitzhöhe</th>
                                <th className="py-3 px-2 text-center">Gewicht</th>
                                <th className="py-3 px-2 text-center">Spannweite</th>
                                <th className="py-3 px-2 text-center">Ape-Index</th>
                                <th className="py-3 px-2 text-center">Maturity Offset</th>
                              </>
                            ) : (
                              currentSkills.map(s => (
                                <th key={s.id} className="py-3 px-2 text-center truncate max-w-[120px]" title={s.name}>
                                  {s.name.split(' ')[0]}
                                </th>
                              ))
                            )}
                            <th className="py-3 px-3 text-right">Aktion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {groupPlayers.map(p => {
                            const pEval = currentCat === 'Athletik'
                              ? (athleticSubTab === 'biological'
                                  ? evaluations.filter(e => e.playerId === p.id && e.category === 'Athletik' && e.biologicalMetrics && (e.biologicalMetrics.standingHeightCm || e.biologicalMetrics.weightKg)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]
                                  : evaluations.filter(e => e.playerId === p.id && e.category === 'Athletik' && e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]
                                )
                              : evaluations.filter(e => e.playerId === p.id && e.category === currentCat).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
                            const pScores = pEval?.ratings ? Object.values(pEval.ratings).filter(v => v > 0) : [];
                            const pAvg = pScores.length > 0 ? (pScores.reduce((a, b) => a + b, 0) / pScores.length).toFixed(1) : '-';
                            const isSelected = p.id === selectedEvaluationPlayerId;
                            const hasAthletics = pEval?.athleticMetrics && Object.values(pEval.athleticMetrics).some(v => Boolean(v));
                            const hasBio = pEval?.biologicalMetrics && Boolean(pEval.biologicalMetrics.standingHeightCm || pEval.biologicalMetrics.weightKg);

                            return (
                              <tr key={p.id} className={cn("hover:bg-slate-850/60 transition", isSelected && "bg-slate-850/40")}>
                                <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                                  {p.firstName} {p.lastName} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''}
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  {currentCat === 'Athletik' ? (
                                    athleticSubTab === 'biological' ? (
                                      <span className={cn(
                                        "px-2 py-0.5 rounded font-black text-[10px] border",
                                        pEval?.biologicalMetrics?.phvClassification === 'Pre-PHV' ? "bg-sky-950 text-sky-300 border-sky-600" :
                                        pEval?.biologicalMetrics?.phvClassification === 'Circa-PHV' ? "bg-amber-950 text-amber-300 border-amber-600" :
                                        pEval?.biologicalMetrics?.phvClassification === 'Post-PHV' ? "bg-emerald-950 text-emerald-300 border-emerald-600" :
                                        "text-slate-500 border-slate-800"
                                      )}>
                                        {pEval?.biologicalMetrics?.phvClassification || (hasBio ? 'Erfasst' : '—')}
                                      </span>
                                    ) : (
                                      <span className={cn(
                                        "px-2 py-0.5 rounded font-black text-[11px]",
                                        hasAthletics ? "bg-emerald-950 text-emerald-300 border border-emerald-700" : "text-slate-500"
                                      )}>
                                        {hasAthletics ? '✓ Erfasst' : '—'}
                                      </span>
                                    )
                                  ) : (
                                    <span className={cn(
                                      "px-2 py-0.5 rounded font-black text-xs",
                                      pAvg !== '-' ? "bg-emerald-950 text-emerald-300 border border-emerald-700" : "text-slate-500"
                                    )}>
                                      {pAvg}
                                    </span>
                                  )}
                                </td>
                                {currentCat === 'Athletik' && athleticSubTab === 'biological' ? (
                                  <>
                                    <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                      {pEval?.biologicalMetrics?.standingHeightCm ? `${pEval.biologicalMetrics.standingHeightCm} cm` : '—'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                      {pEval?.biologicalMetrics?.sittingHeightCm ? `${pEval.biologicalMetrics.sittingHeightCm} cm` : '—'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                      {pEval?.biologicalMetrics?.weightKg ? `${pEval.biologicalMetrics.weightKg} kg` : '—'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                      {pEval?.biologicalMetrics?.wingspanCm ? `${pEval.biologicalMetrics.wingspanCm} cm` : '—'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono text-[11px] text-teal-300 font-bold whitespace-nowrap">
                                      {pEval?.biologicalMetrics?.apeIndex || '—'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-200 font-bold whitespace-nowrap">
                                      {pEval?.biologicalMetrics?.maturityOffsetYears !== undefined 
                                        ? `${Number(pEval.biologicalMetrics.maturityOffsetYears) > 0 ? '+' : ''}${pEval.biologicalMetrics.maturityOffsetYears} J.` 
                                        : '—'}
                                    </td>
                                  </>
                                ) : (
                                  currentSkills.map(s => {
                                    if (currentCat === 'Athletik') {
                                      const m = pEval?.athleticMetrics;
                                      let cellVal = '—';
                                      if (s.id === 'ath_grip' && (m?.gripRightKg || m?.gripLeftKg)) {
                                        cellVal = `${m.gripRightKg || '-'} / ${m.gripLeftKg || '-'} kg`;
                                      } else if (s.id === 'ath_cmj' && m?.cmjHeightCm) {
                                        cellVal = `${m.cmjHeightCm} cm`;
                                      } else if (s.id === 'ath_lateral_push' && (m?.lateralPushRightCm || m?.lateralPushLeftCm)) {
                                        cellVal = `${m.lateralPushRightCm || '-'} / ${m.lateralPushLeftCm || '-'} cm`;
                                      } else if (s.id === 'ath_sprint' && (m?.sprint5mSec || m?.sprint10mSec)) {
                                        cellVal = `${m.sprint5mSec || '-'}s / ${m.sprint10mSec || '-'}s`;
                                      } else if (s.id === 'ath_shuttle' && (m?.agilityShuttleRightSec || m?.agilityShuttleLeftSec)) {
                                        cellVal = `${m.agilityShuttleRightSec || '-'}s / ${m.agilityShuttleLeftSec || '-'}s`;
                                      } else if (s.id === 'ath_medball' && m?.medBallDistanceM) {
                                        cellVal = `${m.medBallDistanceM} m`;
                                      } else if (s.id === 'ath_blazepod' && (m?.blazePodSimpleHits || m?.blazePodGoNoGoHits)) {
                                        const t1 = m?.blazePodSimpleHits ? `${m.blazePodSimpleHits}H` : '-';
                                        const t2 = m?.blazePodGoNoGoHits ? `${m.blazePodGoNoGoHits}H` : '-';
                                        cellVal = `T1: ${t1} • T2: ${t2}`;
                                      }

                                      return (
                                        <td key={s.id} className="py-3 px-2 text-center font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                          {cellVal !== '—' ? (
                                            <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-bold text-emerald-300">
                                              {cellVal}
                                            </span>
                                          ) : (
                                            <span className="text-slate-600">—</span>
                                          )}
                                        </td>
                                      );
                                    }

                                    const val = pEval?.ratings?.[s.id] || 0;
                                    return (
                                      <td key={s.id} className="py-3 px-2 text-center font-mono">
                                        {val > 0 ? (
                                          <span className={cn(
                                            "px-1.5 py-0.5 inline-flex items-center justify-center rounded-lg text-[11px] font-bold border",
                                            val >= 5 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                                            val >= 4 ? "bg-sky-500/20 text-sky-300 border-sky-500/40" :
                                            val >= 3 ? "bg-teal-500/20 text-teal-300 border-teal-500/40" :
                                            val >= 2 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" :
                                            "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                          )}>
                                            {val}
                                          </span>
                                        ) : (
                                          <span className="text-slate-600">—</span>
                                        )}
                                      </td>
                                    );
                                  })
                                )}
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEvaluationPlayerId(p.id)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                  >
                                    Bearbeiten
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Player Evaluation History Modal */}
                {activePlayer && (
                  <PlayerEvaluationHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    player={activePlayer}
                    group={activeGroup || null}
                    category={currentCat}
                    athleticSubTab={athleticSubTab}
                    evaluations={evaluations}
                    onDeleteEvaluation={handleDeleteEvaluation}
                    onSaveEvaluation={handleSaveEditedEvaluation}
                    onLoadIntoForm={handleLoadEvaluationIntoForm}
                  />
                )}
              </div>
            );
          })()}

          {/* 4. FEEDBACKGESPRÄCHE VIEW */}
          {activeDataEntryTab === 'feedback_talks' && (() => {
            const currentFbGroupId = selectedFeedbackGroupId || groups[0]?.id || '';
            const activeFbGroup = groups.find(g => g.id === currentFbGroupId) || groups[0];
            const fbGroupPlayers = (activeFbGroup?.players || []).filter(p => !p.archived);
            const currentFbPlayerId = selectedFeedbackPlayerId || (fbGroupPlayers.length > 0 ? fbGroupPlayers[0].id : '');

            return (
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                {/* PRO Access Locked Banner for Feedback Talks */}
                {!hasProAccess && (
                  <div className="lg:col-span-10 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-extrabold text-white text-sm flex items-center gap-2">
                          <span>PRO-Funktion: Entwicklungs- & Feedbackgespräche</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-bold uppercase tracking-wider">
                            Nur Lesezugriff
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
                          Das Erfassen und Dokumentieren von Entwicklungsgesprächen ist für <strong>Einzelnutzer PRO</strong> und Vereinsaccounts reserviert. Als Einzelnutzer Standard kannst du alle hinterlegten Gespräche einsehen.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* LINKE SPALTE: FORMULAR ZUR ERFASSUNG VON FEEDBACKGESPRÄCHEN (60%) */}
                {/* ================================================================= */}
                <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded-lg flex items-center justify-center",
                        editingFeedbackId ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                      )}>
                        {editingFeedbackId ? <Edit3 className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <span className={cn("text-xs font-bold", editingFeedbackId ? "text-amber-300" : "text-white")}>
                        {editingFeedbackId ? 'Feedbackgespräch bearbeiten' : 'Neues Feedbackgespräch erfassen'}
                      </span>
                      {editingFeedbackId && (
                        <button
                          type="button"
                          onClick={handleCancelEditFeedback}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1 ml-2"
                        >
                          <X className="w-3 h-3" />
                          <span>Abbrechen</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {groups.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 space-y-3">
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
                      <p className="text-xs font-semibold text-slate-300">
                        Es sind noch keine Trainingsgruppen angelegt.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('groups')}
                        className="text-xs text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        + Jetzt Trainingsgruppe und Spieler erstellen
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Read-Only Notice for non-assigned coaches in club */}
                      {!canEditGroupData(activeFbGroup) && activeFbGroup && (
                        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 flex items-center gap-3 text-amber-200 text-xs shadow-md">
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-amber-300">Schreibgeschützter Modus: </span>
                            Diese Trainingsgruppe ist dem lizenzierten Trainer <span className="font-semibold text-white">{activeFbGroup.assignedCoachName || activeFbGroup.assignedCoachEmail || 'einem anderen Trainer'}</span> zugewiesen. Du kannst alle Gespräche einsehen, neue Einträge können jedoch nur vom zugewiesenen Trainer oder Club-Admin gespeichert werden.
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleSaveFeedbackTalk} className="space-y-4 text-xs">
                      {/* 1. Zeile: Datum & Trainingsgruppe in einer Zeile (Datum klein, Trainingsgruppe flexibel) */}
                      <div className="flex flex-wrap sm:flex-nowrap items-start gap-3.5">
                        {/* Datum */}
                        <div className="w-full sm:w-40 flex-shrink-0">
                          <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Datum <span className="text-indigo-400">*</span></span>
                            </span>
                          </label>
                          <input
                            type="date"
                            required
                            value={feedbackFormData.date}
                            onClick={(e) => {
                              try {
                                (e.currentTarget as any).showPicker?.();
                              } catch (err) {}
                            }}
                            onChange={e => setFeedbackFormData(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs cursor-pointer font-medium"
                          />
                        </div>

                        {/* Trainingsgruppe als Reiter */}
                        <div className="flex-1 min-w-0">
                          <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Trainingsgruppe <span className="text-indigo-400">*</span></span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">Reiter (1 Klick)</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {groups.map(g => {
                              const isSelected = (currentFbGroupId === g.id);
                              const gActivePlayers = (g.players || []).filter(p => !p.archived);
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedFeedbackGroupId(g.id);
                                    const activeP = (g.players || []).filter(p => !p.archived);
                                    if (activeP.length > 0) {
                                      if (!activeP.some(p => p.id === selectedFeedbackPlayerId)) {
                                        setSelectedFeedbackPlayerId(activeP[0].id);
                                      }
                                    } else {
                                      setSelectedFeedbackPlayerId('');
                                    }
                                  }}
                                  className={cn(
                                    "px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer active:scale-95",
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-950/60"
                                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                                  )}
                                >
                                  <span>{g.name}</span>
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                                    isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-900 text-slate-400 border border-slate-800"
                                  )}>
                                    {gActivePlayers.length} TW
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 2. Zeile: Torhüter der ausgewählten Gruppe als Reiter */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Torhüter <span className="text-indigo-400">*</span></span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Reiter (1 Klick)</span>
                        </label>
                        {fbGroupPlayers.length === 0 ? (
                          <div className="p-3 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 italic text-xs">
                            In dieser Trainingsgruppe sind keine aktiven Torhüter hinterlegt.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {fbGroupPlayers.map(p => {
                              const isSelected = p.id === currentFbPlayerId;
                              const talkCount = feedbackTalks.filter(t => t.playerId === p.id).length;

                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setSelectedFeedbackPlayerId(p.id)}
                                  className={cn(
                                    "px-3 py-2 rounded-xl border flex items-center gap-2 transition active:scale-95 cursor-pointer text-xs",
                                    isSelected
                                      ? "bg-slate-950 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/50 font-bold"
                                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                                  )}
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px]",
                                    isSelected ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-300"
                                  )}>
                                    {p.jerseyNumber ? `#${p.jerseyNumber}` : p.firstName.charAt(0)}
                                  </div>
                                  <span className="truncate">{p.firstName} {p.lastName}</span>
                                  {talkCount > 0 && (
                                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                                      💬 {talkCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 3. Zeile: Trainer 1 & Trainer 2 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Trainer 1 <span className="text-indigo-400">*</span></span>
                          </label>
                          <input
                            type="text"
                            required
                            value={feedbackFormData.trainer1}
                            onChange={e => setFeedbackFormData(prev => ({ ...prev, trainer1: e.target.value }))}
                            placeholder="Name Trainer 1"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Trainer 2 (optional)</span>
                          </label>
                          <input
                            type="text"
                            value={feedbackFormData.trainer2}
                            onChange={e => setFeedbackFormData(prev => ({ ...prev, trainer2: e.target.value }))}
                            placeholder="z. B. Co-Trainer / TW-Trainer 2"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                          />
                        </div>
                      </div>

                      {/* 4. Zeile: 3 zentrale Eckpunkte des Gesprächs */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>3 zentrale Eckpunkte des Gesprächs <span className="text-indigo-400">*</span></span>
                          </span>
                        </label>
                        <textarea
                          required
                          rows={6}
                          value={feedbackFormData.keyPoints}
                          onChange={e => setFeedbackFormData(prev => ({ ...prev, keyPoints: e.target.value }))}
                          placeholder={`1. Positiver Entwicklungsfortschritt bei Raumverteidigung und Timing.\n2. Optimierungsfeld: Mutigere Spieleröffnung und Kommunikation mit der Abwehrkette.\n3. Vereinbarter Schwerpunkt für die nächsten 4 Wochen: Handlungsschnelligkeit bei Rebound-Bällen.`}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs leading-relaxed font-medium"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                        {editingFeedbackId && (
                          <button
                            type="button"
                            onClick={handleCancelEditFeedback}
                            className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 font-bold transition cursor-pointer"
                          >
                            Abbrechen
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={!canEditEvaluation(activeFbGroup)}
                          className={cn(
                            "w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold transition shadow flex items-center justify-center gap-2",
                            !canEditEvaluation(activeFbGroup)
                              ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60 shadow-none"
                              : "text-white bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950 cursor-pointer"
                          )}
                        >
                          {!hasProAccess ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                          <span>
                            {!hasProAccess
                              ? 'PRO-Funktion (Nur Lesezugriff)'
                              : !canEditGroupData(activeFbGroup)
                              ? 'Nur Lesezugriff (Trainer zugewiesen)'
                              : editingFeedbackId
                              ? 'Änderungen speichern'
                              : 'Feedbackgespräch speichern'}
                          </span>
                        </button>
                      </div>
                    </form>
                    </>
                  )}
                </div>

                {/* ================================================================= */}
                {/* RECHTE SPALTE: LISTE DER ANGELEGTEN GESPRÄCHE (40% Breite)        */}
                {/* ================================================================= */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Filter & Search Bar */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs shadow-xl">
                    {/* 1. Trainingsgruppen Filter */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between tracking-wider">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Users className="w-3 h-3 text-indigo-400" />
                          <span>Trainingsgruppe</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-normal">
                          {filterFeedbackGroup === 'ALL' ? `${feedbackTalks.length} Gespräche` : `${feedbackTalks.filter(t => t.groupId === filterFeedbackGroup).length} Gespräche`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilterFeedbackGroup('ALL')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                            filterFeedbackGroup === 'ALL'
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-950"
                              : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                          )}
                        >
                          <span>Alle</span>
                          <span className="text-[10px] opacity-75 font-mono">({feedbackTalks.length})</span>
                        </button>
                        {groups.map(g => {
                          const isSelected = filterFeedbackGroup === g.id;
                          const count = feedbackTalks.filter(t => t.groupId === g.id).length;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setFilterFeedbackGroup(g.id);
                                if (filterFeedbackPlayer !== 'ALL') {
                                  const inGroup = (g.players || []).some(p => p.id === filterFeedbackPlayer && !p.archived);
                                  if (!inGroup) setFilterFeedbackPlayer('ALL');
                                }
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                                isSelected
                                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-950"
                                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                              )}
                            >
                              <span>{g.name}</span>
                              <span className="text-[10px] opacity-75 font-mono">({count})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Spieler / Torhüter Filter */}
                    {availableFeedbackFilterPlayers.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider">
                          <User className="w-3 h-3 text-teal-400" />
                          <span className="text-slate-300">Torhüter</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFilterFeedbackPlayer('ALL')}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                              filterFeedbackPlayer === 'ALL'
                                ? "bg-teal-600 text-white shadow-sm shadow-teal-950"
                                : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                            )}
                          >
                            <span>Alle TW</span>
                          </button>
                          {availableFeedbackFilterPlayers.map(p => {
                            const isSelected = filterFeedbackPlayer === p.id;
                            const pCount = feedbackTalks.filter(t => {
                              const matchesGrp = filterFeedbackGroup === 'ALL' || t.groupId === filterFeedbackGroup;
                              return matchesGrp && t.playerId === p.id;
                            }).length;

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setFilterFeedbackPlayer(p.id)}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1",
                                  isSelected
                                    ? "bg-teal-600 text-white shadow-sm shadow-teal-950"
                                    : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                                )}
                              >
                                <span>{p.firstName} {p.lastName}</span>
                                <span className="text-[10px] opacity-75 font-mono">({pCount})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. Search Bar */}
                    <div className="relative w-full pt-1">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-[calc(50%+2px)] -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchFeedback}
                        onChange={e => setSearchFeedback(e.target.value)}
                        placeholder="Inhalten, Trainer, Notizen suchen..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Feedback Talks Cards List */}
                  <div className="space-y-3 max-h-[850px] overflow-y-auto pr-1">
                    {filteredFeedbackTalks.length === 0 ? (
                      <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 space-y-2">
                        <MessageSquare className="w-7 h-7 mx-auto text-slate-600" />
                        <p className="text-xs font-semibold text-slate-400">
                          Keine Feedbackgespräche gefunden.
                        </p>
                      </div>
                    ) : (
                      filteredFeedbackTalks.map(talk => {
                        const group = groups.find(g => g.id === talk.groupId);
                        const player = (group?.players || []).find(p => p.id === talk.playerId) || groups.flatMap(g => g.players || []).find(p => p.id === talk.playerId);
                        const isEditingThis = editingFeedbackId === talk.id;

                        return (
                          <div
                            key={talk.id}
                            className={cn(
                              "bg-slate-900 border rounded-2xl p-4 shadow-lg space-y-3 transition",
                              isEditingThis
                                ? "border-amber-500/80 ring-1 ring-amber-500/50 bg-amber-950/10"
                                : "border-slate-800 hover:border-slate-700"
                            )}
                          >
                            {/* Header: Date, Group, Player, Actions */}
                            <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[11px] font-mono font-bold flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(talk.date).toLocaleDateString('de-DE')}</span>
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-bold truncate max-w-[130px]">
                                    {talk.groupName || group?.name || 'Gruppe'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[9px] flex items-center justify-center flex-shrink-0">
                                    {player?.jerseyNumber ? `#${player.jerseyNumber}` : (player ? player.firstName.charAt(0) : (talk.playerName ? talk.playerName.charAt(0) : 'T'))}
                                  </div>
                                  <span className="text-xs font-extrabold text-white truncate">
                                    {talk.playerName || (player ? `${player.firstName} ${player.lastName}` : 'Torhüter')}
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              {canEditGroupData(group) && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleEditFeedback(talk)}
                                    title="Gespräch bearbeiten"
                                    className={cn(
                                      "p-1.5 rounded-lg transition cursor-pointer",
                                      isEditingThis
                                        ? "bg-amber-500 text-slate-950 font-bold shadow"
                                        : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                                    )}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFeedbackTalk(talk.id)}
                                    title="Gespräch löschen"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/60 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Trainer Info */}
                            <div className="flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-indigo-400" />
                                <span>Trainer 1: <strong className="text-white">{talk.trainer1}</strong></span>
                              </span>
                              {talk.trainer2 && (
                                <span className="text-slate-400 flex items-center gap-1 pl-2 border-l border-slate-800">
                                  <span>Trainer 2: <strong className="text-slate-300">{talk.trainer2}</strong></span>
                                </span>
                              )}
                            </div>

                            {/* Key Points */}
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1 tracking-wider">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Zentrale Eckpunkte:</span>
                              </span>
                              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-medium shadow-inner">
                                {talk.keyPoints}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 4: DATENAUSWERTUNG (Trainer- und Spielerbezogen)             */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'stats' && (
        <OrgaStatsView
          savedPlans={savedPlans}
          exercises={exercises}
          groups={groups}
          absences={absences}
          evaluations={evaluations}
          matchPlaytimes={matchPlaytimes}
          feedbackTalks={feedbackTalks}
          onNavigateToPlanner={onNavigateToPlanner}
        />
      )}

      {/* ===================================================================== */}
      {/* MODAL: TRAININGSGRUPPE ERSTELLEN / BEARBEITEN                         */}
      {/* ===================================================================== */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {editingGroup ? 'Trainingsgruppe bearbeiten' : 'Neue Trainingsgruppe anlegen'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsGroupModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Gruppenname *</label>
                <input
                  type="text"
                  required
                  value={groupFormData.name}
                  onChange={e => setGroupFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z. B. U17 / U19 Leistungsgruppe oder Grundlagen U12"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Altersklasse</label>
                  <select
                    value={groupFormData.ageCategory}
                    onChange={e => setGroupFormData(prev => ({ ...prev, ageCategory: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    {AGE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Farbschema</label>
                  <select
                    value={groupFormData.color}
                    onChange={e => setGroupFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    {GROUP_COLORS.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned Coach Dropdown (if in Club or Admin) */}
              {availableCoaches.length > 0 && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Zuständiger Trainer (lizensierter Trainer)</span>
                  </label>
                  <select
                    value={groupFormData.assignedCoachEmail || ''}
                    onChange={e => setGroupFormData(prev => ({ ...prev, assignedCoachEmail: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    <option value="">Kein Trainer fest zugewiesen (Club-Admin)</option>
                    {availableCoaches.map(c => (
                      <option key={c.email} value={c.email}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Der zugewiesene Trainer erhält Schreibrechte für Dateneingaben und die Periodisierung dieser Gruppe.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">Beschreibung / Notizen (optional)</label>
                <textarea
                  rows={2}
                  value={groupFormData.description}
                  onChange={e => setGroupFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="z. B. Trainingszeiten Dienstag / Donnerstag, 4 feste Keeper..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 font-bold transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 font-extrabold transition shadow shadow-emerald-950"
                >
                  {editingGroup ? 'Änderungen speichern' : 'Gruppe anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SPIELER ANLEGEN / BEARBEITEN                                   */}
      {/* ===================================================================== */}
      {isPlayerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingPlayer ? 'Spieler bearbeiten' : 'Neuen Spieler anlegen'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Gruppe: {selectedGroupForPlayer?.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPlayerModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Vorname *</label>
                  <input
                    type="text"
                    required
                    value={playerFormData.firstName}
                    onChange={e => setPlayerFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="z. B. Max"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nachname *</label>
                  <input
                    type="text"
                    required
                    value={playerFormData.lastName}
                    onChange={e => setPlayerFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="z. B. Mustermann"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Jahrgang / Geburtsjahr</label>
                  <input
                    type="text"
                    value={playerFormData.birthYear}
                    onChange={e => setPlayerFormData(prev => ({ ...prev, birthYear: e.target.value }))}
                    placeholder="z. B. 2008"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Trikotnummer</label>
                  <input
                    type="text"
                    value={playerFormData.jerseyNumber}
                    onChange={e => setPlayerFormData(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                    placeholder="z. B. 1 oder 22"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Notizen / Trainingsfokus (optional)</label>
                <textarea
                  rows={2}
                  value={playerFormData.notes}
                  onChange={e => setPlayerFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="z. B. Starke Spieleröffnung, Fokus auf 1-gegen-1..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPlayerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 font-bold transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 font-extrabold transition shadow shadow-emerald-950"
                >
                  {editingPlayer ? 'Speichern' : 'Spieler hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SPIELER-ARCHIV                                                 */}
      {/* ===================================================================== */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Spieler-Archiv
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-950 text-amber-300 border border-amber-800/60">
                      {archivedPlayers.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Archivierte Torhüter können hier wieder in ihre Gruppe zurückgeholt oder inklusive aller Daten endgültig gelöscht werden.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsArchiveModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Archived Players List */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-3 custom-scrollbar">
              {archivedPlayers.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
                  <Archive className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-60" />
                  <p className="font-bold text-slate-400">Das Archiv ist aktuell leer.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Gelöschte Spieler aus den Trainingsgruppen werden hier sicher aufbewahrt.</p>
                </div>
              ) : (
                archivedPlayers.map(({ player, group }) => {
                  const pScore = getPlayerOverallScore(player, evaluations);
                  const initials = getPlayerInitials(player.firstName, player.lastName);
                  const dArchived = player.archivedAt ? new Date(player.archivedAt).toLocaleDateString('de-DE') : '–';

                  return (
                    <div key={player.id} className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-wrap items-center justify-between gap-3 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-xs text-slate-200 flex-shrink-0 shadow-inner">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-white text-sm truncate">
                              {player.firstName} {player.lastName}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {group.name}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                            <span>{player.birthYear ? `Jg. ${player.birthYear}` : 'Kein Jahrgang'}</span>
                            <span>•</span>
                            <span>Archiviert am: {dArchived}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {pScore ? (
                          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700/60" title="Gesamtscore">
                            ⭐ {pScore}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                            Kein Score
                          </span>
                        )}

                        {/* Move Player Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsArchiveModalOpen(false);
                            handleOpenMovePlayerModal(group, player);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                          title="Spieler in eine andere Gruppe verschieben"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Verschieben</span>
                        </button>

                        {/* Restore Button */}
                        <button
                          type="button"
                          onClick={() => handleRestorePlayer(group, player.id, `${player.firstName} ${player.lastName}`)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                          title="Spieler in seine Trainingsgruppe wiederherstellen"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Wiederherstellen</span>
                        </button>

                        {/* Permanent Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setPermanentDeleteTarget({ player, group, step: 1 });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                          title="Profil und alle zugehörigen Daten endgültig löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Endgültig löschen</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ENDGÜLTIGES LÖSCHEN (DOPPELTE BESTÄTIGUNG)                      */}
      {/* ===================================================================== */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-600/70 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-rose-950/60 space-y-5 animate-in fade-in zoom-in-95">
            {permanentDeleteTarget.step === 1 ? (
              /* SCHRITT 1 VON 2 */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-700/60">
                      Sicherheitsabfrage • Schritt 1 von 2
                    </span>
                    <h3 className="text-base font-black text-white mt-1">
                      Profil endgültig löschen?
                    </h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 leading-relaxed space-y-2">
                  <p className="font-bold">
                    Du bist im Begriff, das Profil von <span className="underline text-white font-extrabold">{permanentDeleteTarget.player.firstName} {permanentDeleteTarget.player.lastName}</span> vollständig zu löschen.
                  </p>
                  <p className="text-[11.5px] text-rose-300">
                    ⚠️ Folgende Daten werden <strong>unwiderruflich vernichtet</strong>:
                  </p>
                  <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-rose-200/90">
                    <li>Alle Fähigkeiten-Bewertungen (Technik, Taktik, Mental, Athletik)</li>
                    <li>Alle dokumentierten Fehlzeiten & Ausfalltage</li>
                    <li>Alle Feedbackgespräche & Trainer-Notizen</li>
                    <li>Alle erfassten Spielminuten & Noten</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPermanentDeleteTarget(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermanentDeleteTarget(prev => prev ? { ...prev, step: 2 } : null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-950 flex items-center gap-1.5"
                  >
                    <span>Weiter zu Schritt 2</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SCHRITT 2 VON 2 */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-lg flex-shrink-0 animate-pulse">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-700/60">
                      Finale Bestätigung • Schritt 2 von 2
                    </span>
                    <h3 className="text-base font-black text-white mt-1">
                      Letzte Warnung: Unwiderruflich!
                    </h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                  <p className="text-slate-300">
                    Bist du dir <strong>absolut sicher</strong>? Diese Aktion kann unter keinen Umständen rückgängig gemacht werden.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Klicke auf den roten Button, um das Profil von <strong className="text-white">{permanentDeleteTarget.player.firstName} {permanentDeleteTarget.player.lastName}</strong> und alle zugehörigen Daten jetzt dauerhaft zu vernichten.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPermanentDeleteTarget(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePermanentDeletePlayer(permanentDeleteTarget.group, permanentDeleteTarget.player.id, `${permanentDeleteTarget.player.firstName} ${permanentDeleteTarget.player.lastName}`)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-500 transition shadow-xl shadow-rose-950 ring-2 ring-rose-500/50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Ja, Profil jetzt endgültig löschen</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Body Part Selector Modal */}
      <BodyPartSelectorModal
        isOpen={isBodyModalOpen}
        onClose={() => setIsBodyModalOpen(false)}
        selectedPart={absenceFormData.injuredBodyPart}
        onSelect={(part) => setAbsenceFormData(prev => ({ ...prev, injuredBodyPart: part }))}
      />

      {/* Move Player Between Groups Modal */}
      <MovePlayerModal
        isOpen={isMovePlayerModalOpen}
        onClose={() => {
          setIsMovePlayerModalOpen(false);
          setMovingPlayer(null);
          setMovingSourceGroup(null);
        }}
        player={movingPlayer}
        sourceGroup={movingSourceGroup}
        allGroups={groups}
        onPlayerMoved={(_playerName, _targetGroupName) => {
          setGroups(getLocalTrainingGroups(user?.uid));
          setAbsences(getLocalPlayerAbsences(user?.uid));
          setEvaluations(getLocalPlayerEvaluations(user?.uid));
          setFeedbackTalks(getLocalFeedbackTalks(user?.uid));
        }}
        showToast={showToast}
      />
    </div>
  );
};

