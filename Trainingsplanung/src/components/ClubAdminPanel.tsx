import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  updateClub, 
  addCoachToClub, 
  removeCoachEmailFromClub,
  subscribeExercises, 
  subscribeClubs,
  setActiveClubForUser,
  toggleClubPublishStatus,
  rejectClubExerciseInFirestore,
  deleteExerciseFromFirestore,
  subscribeMethodicalProgressions,
  saveClubTechniqueStandard,
  deleteMethodicalProgression,
  DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS,
  subscribeTacticalPrinciples,
  saveClubTacticalStandard,
  deleteTacticalPrinciple,
  DEFAULT_ACADEMY_TACTICAL_PRINCIPLES,
  subscribeUserTrainingGroups,
  saveTrainingGroupToFirestore,
  deleteTrainingGroupFromFirestore,
  subscribeUserEvaluations
} from '../firebase/firestoreService';
import type { 
  Exercise, 
  Club, 
  MethodicalProgression, 
  MethodischeReiheStufen, 
  TacticalPrinciple,
  TrainingGroup,
  Player,
  PlayerEvaluation,
  SkillDefinition
} from '../types';
import { CATEGORY_COLORS, METHODISCHE_REIHE_LABELS, SKILL_DEFINITIONS } from '../types';
import { ExerciseModal } from './ExerciseModal';
import { MovePlayerModal } from './MovePlayerModal';
import { 
  ShieldCheck, 
  Users, 
  Image, 
  Upload, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Lock, 
  Layers, 
  Plus, 
  Mail, 
  AlertCircle,
  Building2,
  Archive,
  Sparkles,
  Info,
  BookOpen,
  Save,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  Compass,
  Clock,
  FolderPlus,
  UserPlus,
  ArrowRightLeft,
  Eye,
  X,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '../utils/cn';

interface ClubAdminPanelProps {
  onEditExercise?: (exercise: Exercise) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
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

export const ClubAdminPanel: React.FC<ClubAdminPanelProps> = ({ 
  onEditExercise,
  showToast: externalShowToast
}) => {
  const { user, currentClub, isMasterAdmin, clubId, clubName: authClubName } = useAuth();
  const effectiveClubId = currentClub?.id || clubId || '';
  const effectiveClubName = currentClub?.name || authClubName || 'Verein';

  const [internalToast, setInternalToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (externalShowToast) {
      externalShowToast(message, type);
    } else {
      setInternalToast({ message, type });
      setTimeout(() => setInternalToast(null), 3500);
    }
  };

  const [activeTab, setActiveTab] = useState<'profile' | 'coaches' | 'groups' | 'exercises' | 'principles' | 'tactic_principles'>('exercises');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);

  // Methodical Progressions (Technikprinzipien & Vereins-Standards) state
  const [progressions, setProgressions] = useState<MethodicalProgression[]>([]);
  const [principlesGroupFilter, setPrinciplesGroupFilter] = useState<string>('all');
  const [principlesCoachFilterOnly, setPrinciplesCoachFilterOnly] = useState<boolean>(false);
  const [principlesSearchQuery, setPrinciplesSearchQuery] = useState<string>('');
  const [expandedTechniqueId, setExpandedTechniqueId] = useState<string | null>(null);
  const [draftStufen, setDraftStufen] = useState<Record<string, MethodischeReiheStufen>>({});
  const [draftPrinciples, setDraftPrinciples] = useState<Record<string, string>>({});
  const [savingTechniqueId, setSavingTechniqueId] = useState<string | null>(null);

  // Tactical Principles (Taktikprinzipien & Vereins-Standards) state
  const [tacticalPrinciples, setTacticalPrinciples] = useState<TacticalPrinciple[]>([]);
  const [tacticalGroupFilter, setTacticalGroupFilter] = useState<string>('all');
  const [tacticalCoachFilterOnly, setTacticalCoachFilterOnly] = useState<boolean>(false);
  const [tacticalSearchQuery, setTacticalSearchQuery] = useState<string>('');
  const [expandedTacticId, setExpandedTacticId] = useState<string | null>(null);
  const [draftTactics, setDraftTactics] = useState<Record<string, string>>({});
  const [savingTacticId, setSavingTacticId] = useState<string | null>(null);

  // Coach Templates Modal state (Detail-Ansicht aller Trainer-Vorlagen)
  const [selectedTechniqueForCoachModal, setSelectedTechniqueForCoachModal] = useState<SkillDefinition | null>(null);
  const [selectedTacticForCoachModal, setSelectedTacticForCoachModal] = useState<SkillDefinition | null>(null);

  // Reject Modal state
  const [rejectModalExercise, setRejectModalExercise] = useState<Exercise | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Profile Form state
  const [formClubName, setFormClubName] = useState<string>(currentClub?.name || authClubName || '');
  const [logoBase64, setLogoBase64] = useState<string>(currentClub?.logoUrl || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Add coach form
  const [newCoachEmail, setNewCoachEmail] = useState<string>('');

  // Trainingsgruppen & Spielerprofile state
  const [trainingGroups, setTrainingGroups] = useState<TrainingGroup[]>([]);
  const [evaluations, setEvaluations] = useState<PlayerEvaluation[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');
  const [groupAgeFilter, setGroupAgeFilter] = useState<string>('Alle');

  // Group Modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TrainingGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState<{
    name: string;
    description: string;
    ageCategory: string;
    color: string;
    assignedCoachEmail: string;
    observerCoachEmails: string[];
  }>({
    name: '',
    description: '',
    ageCategory: 'U17',
    color: 'emerald',
    assignedCoachEmail: '',
    observerCoachEmails: []
  });

  // Player Modal state
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedGroupForPlayer, setSelectedGroupForPlayer] = useState<TrainingGroup | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    firstName: '',
    lastName: '',
    birthYear: '',
    jerseyNumber: '',
    notes: ''
  });

  // Move Player Modal state
  const [isMovePlayerModalOpen, setIsMovePlayerModalOpen] = useState(false);
  const [movingPlayer, setMovingPlayer] = useState<Player | null>(null);
  const [sourceGroupForMove, setSourceGroupForMove] = useState<TrainingGroup | null>(null);

  // Archive Modal state
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivedGroup, setArchivedGroup] = useState<TrainingGroup | null>(null);

  // Subscribe to all clubs if Master Admin
  useEffect(() => {
    if (isMasterAdmin) {
      const unsub = subscribeClubs(
        (data) => setAllClubs(data),
        console.error
      );
      return () => unsub();
    }
  }, [isMasterAdmin]);

  useEffect(() => {
    if (currentClub) {
      setFormClubName(currentClub.name);
      setLogoBase64(currentClub.logoUrl || '');
    }
  }, [currentClub]);

  // Subscribe to Club Exercises
  useEffect(() => {
    if (!currentClub?.id) return;
    const unsub = subscribeExercises(
      user, 
      isMasterAdmin, 
      (data) => setExercises(data.filter(e => e.clubId === currentClub.id)),
      console.error,
      true, 
      currentClub.id
    );
    return () => unsub();
  }, [currentClub?.id, user, isMasterAdmin]);

  // Subscribe to Training Groups & Evaluations in real-time
  useEffect(() => {
    if (!effectiveClubId) return;
    const unsubGroups = subscribeUserTrainingGroups(user, setTrainingGroups, console.error, effectiveClubId);
    const unsubEvals = subscribeUserEvaluations(user, setEvaluations, console.error, effectiveClubId);
    return () => {
      unsubGroups();
      unsubEvals();
    };
  }, [effectiveClubId, user]);

  // Subscribe to Methodical Progressions in real-time
  useEffect(() => {
    const unsub = subscribeMethodicalProgressions(setProgressions);
    return () => unsub();
  }, []);

  // Subscribe to Tactical Principles in real-time
  useEffect(() => {
    const unsub = subscribeTacticalPrinciples(setTacticalPrinciples);
    return () => unsub();
  }, []);

  // Coach emails and UIDs belonging to this club
  const clubCoachEmails = useMemo(() => {
    const set = new Set<string>();
    if (currentClub?.adminEmail) set.add(currentClub.adminEmail.toLowerCase().trim());
    (currentClub?.coachEmails || []).forEach(e => e && set.add(e.toLowerCase().trim()));
    trainingGroups.forEach(g => {
      if (g.assignedCoachEmail) set.add(g.assignedCoachEmail.toLowerCase().trim());
      (g.observerCoachEmails || []).forEach(e => e && set.add(e.toLowerCase().trim()));
    });
    return Array.from(set);
  }, [currentClub, trainingGroups]);

  const clubCoachUids = useMemo(() => {
    const set = new Set<string>();
    if (currentClub?.adminUid) set.add(currentClub.adminUid);
    (currentClub?.coachUids || []).forEach(id => id && set.add(id));
    return Array.from(set);
  }, [currentClub]);

  // Helper to get all coach progressions for a technique
  const getCoachTechniqueProgressions = (techniqueId: string, techniqueName: string): MethodicalProgression[] => {
    const cleanId = techniqueId.toLowerCase().trim();
    const cleanName = techniqueName.toLowerCase().trim();

    return progressions.filter(p => {
      if (p.scope !== 'user') return false;
      const techMatch = p.techniqueId?.toLowerCase().trim() === cleanId || p.techniqueName?.toLowerCase().trim() === cleanName;
      if (!techMatch) return false;

      const isClubCoachMatch = Boolean(
        (effectiveClubId && p.clubId === effectiveClubId) ||
        (p.userEmail && clubCoachEmails.includes(p.userEmail.toLowerCase().trim())) ||
        (p.userId && clubCoachUids.includes(p.userId)) ||
        (!effectiveClubId && isMasterAdmin)
      );
      if (!isClubCoachMatch) return false;

      const hasContent = Boolean(p.technikprinzipien?.trim()) || Object.values(p.stufen || {}).some(v => Boolean(v?.trim()));
      return hasContent;
    });
  };

  // Total techniques with coach templates
  const totalTechniquesWithCoachTemplates = useMemo(() => {
    return SKILL_DEFINITIONS.Technik.filter(t => getCoachTechniqueProgressions(t.id, t.name).length > 0).length;
  }, [SKILL_DEFINITIONS.Technik, progressions, effectiveClubId, clubCoachEmails, clubCoachUids]);

  // Filtered techniques for principles tab
  const filteredTechniques = useMemo(() => {
    let list = SKILL_DEFINITIONS.Technik;
    if (principlesGroupFilter !== 'all') {
      list = list.filter(t => t.group === principlesGroupFilter);
    }
    if (principlesCoachFilterOnly) {
      list = list.filter(t => getCoachTechniqueProgressions(t.id, t.name).length > 0);
    }
    const q = principlesSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.group && t.group.toLowerCase().includes(q))
    );
  }, [principlesGroupFilter, principlesCoachFilterOnly, principlesSearchQuery, progressions, effectiveClubId, clubCoachEmails, clubCoachUids]);

  // Helper to check if a custom Club Standard exists for a technique
  const getClubTechniqueDoc = (techniqueId: string, techniqueName: string) => {
    if (!effectiveClubId) return null;
    const cleanId = techniqueId.toLowerCase().trim();
    const cleanName = techniqueName.toLowerCase().trim();

    return progressions.find(p => 
      p.scope === 'club' && 
      p.clubId === effectiveClubId && 
      (p.techniqueId?.toLowerCase() === cleanId || p.techniqueName?.toLowerCase().trim() === cleanName) &&
      (Boolean(p.technikprinzipien?.trim()) || Object.values(p.stufen || {}).some(v => Boolean(v?.trim())))
    ) || null;
  };

  // Helper to resolve technique progression for this Club (or fallback to academy standard)
  const getClubTechniqueProgression = (techniqueId: string, techniqueName: string) => {
    // 1. Club Standard
    const clubDoc = getClubTechniqueDoc(techniqueId, techniqueName);
    if (clubDoc) {
      return {
        source: 'club' as const,
        progression: clubDoc
      };
    }

    // 2. Global Academy Standard
    const cleanId = techniqueId.toLowerCase().trim();
    const cleanName = techniqueName.toLowerCase().trim();
    const globalDoc = progressions.find(p => 
      (p.techniqueId?.toLowerCase() === cleanId || p.techniqueName?.toLowerCase().trim() === cleanName) && 
      p.scope === 'global' && 
      p.isStandard
    );
    if (globalDoc) {
      return {
        source: 'global' as const,
        progression: globalDoc
      };
    }

    // 3. Seed Fallback
    const seed = DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS[techniqueName] || DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS[techniqueId];
    if (seed) {
      return {
        source: 'seed' as const,
        progression: {
          id: `seed_${techniqueId}`,
          techniqueId,
          techniqueName,
          stufen: seed.stufen,
          technikprinzipien: seed.technikprinzipien,
          scope: 'global' as const,
          isStandard: true,
          authorName: 'NextLevel Akademie Standard',
          createdAt: 0,
          updatedAt: 0
        } as MethodicalProgression
      };
    }

    return {
      source: 'none' as const,
      progression: null
    };
  };

  const getDraftStufenFor = (techId: string, techName: string): MethodischeReiheStufen => {
    if (draftStufen[techId]) return draftStufen[techId];
    const { progression } = getClubTechniqueProgression(techId, techName);
    return progression?.stufen || {};
  };

  const getDraftPrinciplesFor = (techId: string, techName: string): string => {
    if (draftPrinciples[techId] !== undefined) return draftPrinciples[techId];
    const { progression } = getClubTechniqueProgression(techId, techName);
    return progression?.technikprinzipien || '';
  };

  const handleUpdateDraftStufe = (techId: string, techName: string, stufeKey: keyof MethodischeReiheStufen, value: string) => {
    const current = getDraftStufenFor(techId, techName);
    setDraftStufen(prev => ({
      ...prev,
      [techId]: {
        ...current,
        [stufeKey]: value
      }
    }));
  };

  const handleUpdateDraftPrinciples = (techId: string, value: string) => {
    setDraftPrinciples(prev => ({
      ...prev,
      [techId]: value
    }));
  };

  const handleSaveClubStandard = async (techId: string, techName: string, group?: string) => {
    if (!effectiveClubId) {
      showToast('Kein aktiver Verein ausgewählt.', 'error');
      return;
    }
    try {
      setSavingTechniqueId(techId);
      const stufen = getDraftStufenFor(techId, techName);
      const principles = getDraftPrinciplesFor(techId, techName);
      const savedDocId = await saveClubTechniqueStandard(
        effectiveClubId,
        effectiveClubName,
        techId,
        techName,
        group || '',
        stufen,
        principles,
        user?.displayName || user?.email || 'Club Admin'
      );

      // Instantly update local progressions state
      setProgressions(prev => {
        const id = `club_${effectiveClubId}_${techId}`;
        const newDoc: MethodicalProgression = {
          id: savedDocId || id,
          techniqueId: techId,
          techniqueName: techName,
          group: group || '',
          stufen,
          technikprinzipien: principles,
          scope: 'club',
          clubId: effectiveClubId,
          clubName: effectiveClubName,
          userId: null,
          userEmail: null,
          authorName: user?.displayName || user?.email || 'Club Admin',
          isStandard: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const filtered = prev.filter(p => p.id !== id && !(p.scope === 'club' && p.clubId === effectiveClubId && (p.techniqueId === techId || p.techniqueName.toLowerCase() === techName.toLowerCase())));
        return [newDoc, ...filtered];
      });

      showToast(`Vereins-Standard für „${techName}“ erfolgreich gespeichert & für alle Vereinstrainer aktiv!`);
    } catch (err) {
      console.error('Error saving club standard:', err);
      showToast('Fehler beim Speichern des Vereins-Standards.', 'error');
    } finally {
      setSavingTechniqueId(null);
    }
  };

  const handleLoadGlobalAcademyStandard = (techId: string, techName: string) => {
    const cleanId = techId.toLowerCase().trim();
    const cleanName = techName.toLowerCase().trim();
    const globalDoc = progressions.find(p => 
      (p.techniqueId?.toLowerCase() === cleanId || p.techniqueName?.toLowerCase().trim() === cleanName) && 
      p.scope === 'global' && 
      p.isStandard
    );
    const seed = DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS[techName] || DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS[techId];
    const stufen = globalDoc?.stufen || seed?.stufen || {};
    const principles = globalDoc?.technikprinzipien || seed?.technikprinzipien || '';

    setDraftStufen(prev => ({ ...prev, [techId]: stufen }));
    setDraftPrinciples(prev => ({ ...prev, [techId]: principles }));
    showToast(`Akademie-Standard für „${techName}“ in das Formular geladen.`);
  };

  const handleResetClubStandard = async (techId: string, techName: string) => {
    if (!effectiveClubId) return;
    const clubDoc = getClubTechniqueDoc(techId, techName);
    if (!clubDoc) return;

    if (window.confirm(`Möchtest du den Vereins-Standard für „${techName}“ zurücksetzen? Der Status wird wieder auf „noch nicht festgelegt“ gesetzt.`)) {
      try {
        setSavingTechniqueId(techId);
        setProgressions(prev => prev.filter(p => p.id !== clubDoc.id));
        await deleteMethodicalProgression(clubDoc.id);
        // Clean draft so it resets to academy fallback
        setDraftStufen(prev => {
          const c = { ...prev };
          delete c[techId];
          return c;
        });
        setDraftPrinciples(prev => {
          const c = { ...prev };
          delete c[techId];
          return c;
        });
        showToast(`Vereins-Standard für „${techName}“ zurückgesetzt.`);
      } catch (err) {
        console.error('Error resetting club standard:', err);
        showToast('Fehler beim Zurücksetzen des Standards.', 'error');
      } finally {
        setSavingTechniqueId(null);
      }
    }
  };

  const handleAdoptCoachTechniqueProgression = (techId: string, techName: string, coachProg: MethodicalProgression) => {
    const coachName = coachProg.authorName || coachProg.userEmail || 'Trainer';
    setDraftStufen(prev => ({
      ...prev,
      [techId]: {
        stufe1: coachProg.stufen?.stufe1 || '',
        stufe2: coachProg.stufen?.stufe2 || '',
        stufe3: coachProg.stufen?.stufe3 || '',
        stufe4: coachProg.stufen?.stufe4 || '',
        stufe5: coachProg.stufen?.stufe5 || '',
        stufe6: coachProg.stufen?.stufe6 || ''
      }
    }));
    setDraftPrinciples(prev => ({
      ...prev,
      [techId]: coachProg.technikprinzipien || ''
    }));
    showToast(`Vorlage für „${techName}“ von „${coachName}“ in das Formular geladen! Du kannst sie jetzt anpassen oder als Vereins-Standard speichern.`);
  };

  // Helper to get all coach tactical principles for a tactical focus
  const getCoachTacticalPrinciples = (tacticId: string, tacticName: string): TacticalPrinciple[] => {
    const cleanId = tacticId.toLowerCase().trim();
    const cleanName = tacticName.toLowerCase().trim();

    return tacticalPrinciples.filter(p => {
      if (p.scope !== 'user') return false;
      const tacticMatch = p.tacticId?.toLowerCase().trim() === cleanId || p.tacticName?.toLowerCase().trim() === cleanName;
      if (!tacticMatch) return false;

      const isClubCoachMatch = Boolean(
        (effectiveClubId && p.clubId === effectiveClubId) ||
        (p.userEmail && clubCoachEmails.includes(p.userEmail.toLowerCase().trim())) ||
        (p.userId && clubCoachUids.includes(p.userId)) ||
        (!effectiveClubId && isMasterAdmin)
      );
      if (!isClubCoachMatch) return false;

      return Boolean(p.taktikprinzipien?.trim());
    });
  };

  // Total tactics with coach templates
  const totalTacticsWithCoachTemplates = useMemo(() => {
    return SKILL_DEFINITIONS.Taktik.filter(t => getCoachTacticalPrinciples(t.id, t.name).length > 0).length;
  }, [SKILL_DEFINITIONS.Taktik, tacticalPrinciples, effectiveClubId, clubCoachEmails, clubCoachUids]);

  // Filtered tactics for tactic_principles tab
  const filteredTactics = useMemo(() => {
    let list = SKILL_DEFINITIONS.Taktik;
    if (tacticalGroupFilter !== 'all') {
      list = list.filter(t => t.group === tacticalGroupFilter);
    }
    if (tacticalCoachFilterOnly) {
      list = list.filter(t => getCoachTacticalPrinciples(t.id, t.name).length > 0);
    }
    const q = tacticalSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.group && t.group.toLowerCase().includes(q))
    );
  }, [tacticalGroupFilter, tacticalCoachFilterOnly, tacticalSearchQuery, tacticalPrinciples, effectiveClubId, clubCoachEmails, clubCoachUids]);

  // Helper to check if a custom Club Standard exists for a tactical focus
  const getClubTacticDoc = (tacticId: string, tacticName: string) => {
    if (!effectiveClubId) return null;
    const cleanId = tacticId.toLowerCase().trim();
    const cleanName = tacticName.toLowerCase().trim();

    return tacticalPrinciples.find(p => 
      p.scope === 'club' && 
      p.clubId === effectiveClubId && 
      (p.tacticId?.toLowerCase() === cleanId || p.tacticName?.toLowerCase().trim() === cleanName) &&
      Boolean(p.taktikprinzipien?.trim())
    ) || null;
  };

  // Helper to resolve tactical principle for this Club
  const getClubTacticProgression = (tacticId: string, tacticName: string) => {
    // 1. Club Standard
    const clubDoc = getClubTacticDoc(tacticId, tacticName);
    if (clubDoc) {
      return {
        source: 'club' as const,
        principle: clubDoc
      };
    }

    // 2. Global Academy Standard
    const cleanId = tacticId.toLowerCase().trim();
    const cleanName = tacticName.toLowerCase().trim();
    const globalDoc = tacticalPrinciples.find(p => 
      (p.tacticId?.toLowerCase() === cleanId || p.tacticName?.toLowerCase().trim() === cleanName) && 
      p.scope === 'global' && 
      p.isStandard
    );
    if (globalDoc) {
      return {
        source: 'global' as const,
        principle: globalDoc
      };
    }

    // 3. Seed Fallback
    const seed = DEFAULT_ACADEMY_TACTICAL_PRINCIPLES[tacticName] || DEFAULT_ACADEMY_TACTICAL_PRINCIPLES[tacticId];
    if (seed) {
      return {
        source: 'seed' as const,
        principle: {
          id: `seed_${tacticId}`,
          tacticId,
          tacticName,
          taktikprinzipien: seed,
          scope: 'global' as const,
          isStandard: true,
          authorName: 'NextLevel Akademie Standard',
          createdAt: 0,
          updatedAt: 0
        } as TacticalPrinciple
      };
    }

    return {
      source: 'none' as const,
      principle: null
    };
  };

  const getDraftTacticFor = (tacticId: string, tacticName: string): string => {
    if (draftTactics[tacticId] !== undefined) return draftTactics[tacticId];
    const { principle } = getClubTacticProgression(tacticId, tacticName);
    return principle?.taktikprinzipien || '';
  };

  const handleUpdateDraftTactic = (tacticId: string, value: string) => {
    setDraftTactics(prev => ({
      ...prev,
      [tacticId]: value
    }));
  };

  const handleSaveClubTacticalStandard = async (tacticId: string, tacticName: string, group?: string) => {
    if (!effectiveClubId) {
      showToast('Kein aktiver Verein ausgewählt.', 'error');
      return;
    }
    try {
      setSavingTacticId(tacticId);
      const taktikprinzipien = getDraftTacticFor(tacticId, tacticName);
      const savedDocId = await saveClubTacticalStandard(
        effectiveClubId,
        effectiveClubName,
        tacticId,
        tacticName,
        group || '',
        taktikprinzipien,
        user?.displayName || user?.email || 'Club Admin'
      );

      // Instantly update local state
      setTacticalPrinciples(prev => {
        const id = `club_${effectiveClubId}_${tacticId}`;
        const newDoc: TacticalPrinciple = {
          id: savedDocId || id,
          tacticId,
          tacticName,
          group: group || '',
          taktikprinzipien,
          scope: 'club',
          clubId: effectiveClubId,
          clubName: effectiveClubName,
          userId: null,
          userEmail: null,
          authorName: user?.displayName || user?.email || 'Club Admin',
          isStandard: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const filtered = prev.filter(p => p.id !== id && !(p.scope === 'club' && p.clubId === effectiveClubId && (p.tacticId === tacticId || p.tacticName.toLowerCase() === tacticName.toLowerCase())));
        return [newDoc, ...filtered];
      });

      showToast(`Vereins-Standard für „${tacticName}“ erfolgreich gespeichert & für alle Vereinstrainer aktiv!`);
    } catch (err) {
      console.error('Error saving club tactical standard:', err);
      showToast('Fehler beim Speichern des Vereins-Standards.', 'error');
    } finally {
      setSavingTacticId(null);
    }
  };

  const handleLoadGlobalAcademyTacticalStandard = (tacticId: string, tacticName: string) => {
    const cleanId = tacticId.toLowerCase().trim();
    const cleanName = tacticName.toLowerCase().trim();
    const globalDoc = tacticalPrinciples.find(p => 
      (p.tacticId?.toLowerCase() === cleanId || p.tacticName?.toLowerCase().trim() === cleanName) && 
      p.scope === 'global' && 
      p.isStandard
    );
    const seed = DEFAULT_ACADEMY_TACTICAL_PRINCIPLES[tacticName] || DEFAULT_ACADEMY_TACTICAL_PRINCIPLES[tacticId];
    const text = globalDoc?.taktikprinzipien || seed || '';

    setDraftTactics(prev => ({ ...prev, [tacticId]: text }));
    showToast(`Akademie-Standard für „${tacticName}“ in das Formular geladen.`);
  };

  const handleResetClubTacticalStandard = async (tacticId: string, tacticName: string) => {
    if (!effectiveClubId) return;
    const clubDoc = getClubTacticDoc(tacticId, tacticName);
    if (!clubDoc) return;

    if (window.confirm(`Möchtest du den Vereins-Standard für „${tacticName}“ zurücksetzen? Der Status wird wieder auf „noch nicht festgelegt“ gesetzt.`)) {
      try {
        setSavingTacticId(tacticId);
        setTacticalPrinciples(prev => prev.filter(p => p.id !== clubDoc.id));
        await deleteTacticalPrinciple(clubDoc.id);
        // Clean draft
        setDraftTactics(prev => {
          const c = { ...prev };
          delete c[tacticId];
          return c;
        });
        showToast(`Vereins-Standard für „${tacticName}“ zurückgesetzt.`);
      } catch (err) {
        console.error('Error resetting club tactical standard:', err);
        showToast('Fehler beim Zurücksetzen des Vereins-Standards.', 'error');
      } finally {
        setSavingTacticId(null);
      }
    }
  };

  const handleAdoptCoachTacticalPrinciple = (tacticId: string, coachPrinciple: TacticalPrinciple) => {
    const coachName = coachPrinciple.authorName || coachPrinciple.userEmail || 'Trainer';
    setDraftTactics(prev => ({
      ...prev,
      [tacticId]: coachPrinciple.taktikprinzipien || ''
    }));
    showToast(`Taktikprinzipien von „${coachName}“ in den Vereins-Standard geladen! Du kannst sie jetzt anpassen oder als Vereins-Standard speichern.`);
  };

  // List of licensed coaches in club for group assignment
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

  const filteredGroups = useMemo(() => {
    return trainingGroups.filter(g => {
      const matchesAge = groupAgeFilter === 'Alle' || g.ageCategory === groupAgeFilter;
      const q = groupSearchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        g.name.toLowerCase().includes(q) || 
        (g.description && g.description.toLowerCase().includes(q)) || 
        (g.assignedCoachName && g.assignedCoachName.toLowerCase().includes(q)) || 
        (g.assignedCoachEmail && g.assignedCoachEmail.toLowerCase().includes(q)) || 
        (g.players && g.players.some(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)));
      return matchesAge && matchesSearch;
    });
  }, [trainingGroups, groupAgeFilter, groupSearchQuery]);

  const getPlayerInitials = (firstName: string, lastName: string) => {
    const f = firstName?.trim() ? firstName.trim()[0].toUpperCase() : '';
    const l = lastName?.trim() ? lastName.trim()[0].toUpperCase() : '';
    return `${f}${l}` || 'T';
  };

  const getPlayerOverallScore = (player: Player, evaluationsList: PlayerEvaluation[]): string | null => {
    const categoryAverages: number[] = [];

    (['Technik', 'Taktik', 'Mental', 'Athletik'] as const).forEach(cat => {
      const catEvals = evaluationsList
        .filter(e => e.playerId === player.id && e.category === cat)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      
      const latest = catEvals[0];
      if (!latest) return;

      const rawRatings = latest.ratings || {};
      const numericRatings = Object.values(rawRatings)
        .map(v => (typeof v === 'number' ? v : (v && typeof v === 'object' && 'rating' in v && typeof (v as any).rating === 'number' ? (v as any).rating : null)))
        .filter((v): v is number => v !== null && v > 0);

      if (numericRatings.length > 0) {
        const catAvg = numericRatings.reduce((sum, val) => sum + val, 0) / numericRatings.length;
        categoryAverages.push(catAvg);
      }
    });

    if (categoryAverages.length === 0) return null;
    const overallAvg = categoryAverages.reduce((a, b) => a + b, 0) / categoryAverages.length;
    return overallAvg.toFixed(1);
  };

  const handleOpenNewGroupModal = () => {
    setEditingGroup(null);
    setGroupFormData({
      name: '',
      description: '',
      ageCategory: 'U17',
      color: 'emerald',
      assignedCoachEmail: currentClub?.adminEmail || user?.email || '',
      observerCoachEmails: []
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
      assignedCoachEmail: group.assignedCoachEmail || '',
      observerCoachEmails: Array.isArray(group.observerCoachEmails) ? [...group.observerCoachEmails] : []
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
      const assignedCoachObj = availableCoaches.find(c => c.email.toLowerCase() === groupFormData.assignedCoachEmail.toLowerCase());
      const assignedCoachName = assignedCoachObj ? assignedCoachObj.name : (groupFormData.assignedCoachEmail || undefined);

      // Clean observer emails: remove empty and primary coach email
      const cleanObservers = groupFormData.observerCoachEmails.filter(
        em => em && em.toLowerCase() !== (groupFormData.assignedCoachEmail || '').toLowerCase()
      );

      if (editingGroup) {
        await saveTrainingGroupToFirestore({
          ...editingGroup,
          name: groupFormData.name.trim(),
          description: groupFormData.description.trim(),
          ageCategory: groupFormData.ageCategory,
          color: groupFormData.color,
          assignedCoachEmail: groupFormData.assignedCoachEmail || undefined,
          assignedCoachName: assignedCoachName || undefined,
          observerCoachEmails: cleanObservers,
          clubId: effectiveClubId
        }, user, effectiveClubId);
        showToast('Trainingsgruppe erfolgreich aktualisiert!');
      } else {
        await saveTrainingGroupToFirestore({
          name: groupFormData.name.trim(),
          description: groupFormData.description.trim(),
          ageCategory: groupFormData.ageCategory,
          color: groupFormData.color,
          assignedCoachEmail: groupFormData.assignedCoachEmail || undefined,
          assignedCoachName: assignedCoachName || undefined,
          observerCoachEmails: cleanObservers,
          players: [],
          clubId: effectiveClubId
        }, user, effectiveClubId);
        showToast('Neue Trainingsgruppe erfolgreich angelegt!');
      }
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
        showToast('Trainingsgruppe gelöscht.');
      } catch (err) {
        console.error(err);
        showToast('Fehler beim Löschen der Trainingsgruppe.', 'error');
      }
    }
  };

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
      birthYear: player.birthYear !== undefined ? String(player.birthYear) : '',
      jerseyNumber: player.jerseyNumber !== undefined ? String(player.jerseyNumber) : '',
      notes: player.notes || ''
    });
    setIsPlayerModalOpen(true);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupForPlayer) return;
    if (!playerFormData.firstName.trim() || !playerFormData.lastName.trim()) {
      showToast('Bitte Vor- und Nachname des Spielers eingeben.', 'error');
      return;
    }

    try {
      const currentPlayers = [...(selectedGroupForPlayer.players || [])];

      if (editingPlayer) {
        const updatedPlayers = currentPlayers.map(p => {
          if (p.id === editingPlayer.id) {
            return {
              ...p,
              firstName: playerFormData.firstName.trim(),
              lastName: playerFormData.lastName.trim(),
              birthYear: playerFormData.birthYear ? parseInt(playerFormData.birthYear, 10) || undefined : undefined,
              jerseyNumber: playerFormData.jerseyNumber ? parseInt(playerFormData.jerseyNumber, 10) || undefined : undefined,
              notes: playerFormData.notes.trim() || undefined
            };
          }
          return p;
        });

        await saveTrainingGroupToFirestore({
          ...selectedGroupForPlayer,
          players: updatedPlayers
        }, user, effectiveClubId);
        showToast('Spielerprofil aktualisiert.');
      } else {
        const newPlayer: Player = {
          id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          firstName: playerFormData.firstName.trim(),
          lastName: playerFormData.lastName.trim(),
          birthYear: playerFormData.birthYear ? parseInt(playerFormData.birthYear, 10) || undefined : undefined,
          jerseyNumber: playerFormData.jerseyNumber ? parseInt(playerFormData.jerseyNumber, 10) || undefined : undefined,
          notes: playerFormData.notes.trim() || undefined,
          createdAt: Date.now()
        };

        await saveTrainingGroupToFirestore({
          ...selectedGroupForPlayer,
          players: [...currentPlayers, newPlayer]
        }, user, effectiveClubId);
        showToast('Neuen Spieler angelegt!');
      }

      setIsPlayerModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Speichern des Spielers.', 'error');
    }
  };

  const handleArchivePlayer = async (group: TrainingGroup, playerId: string, playerName: string) => {
    if (window.confirm(`Möchtest du "${playerName}" wirklich archivieren? Der Torhüter wird in der aktiven Ansicht ausgeblendet, bleibt aber im Archiv erhalten.`)) {
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

        await saveTrainingGroupToFirestore({
          ...group,
          players: updatedPlayers
        }, user, effectiveClubId);
        showToast(`${playerName} wurde archiviert.`);
      } catch (err) {
        console.error(err);
        showToast('Fehler beim Archivieren des Spielers.', 'error');
      }
    }
  };

  const handleUnarchivePlayer = async (group: TrainingGroup, playerId: string, playerName: string) => {
    try {
      const updatedPlayers = (group.players || []).map(p => {
        if (p.id === playerId) {
          const { archived, archivedAt, originalGroupId, ...rest } = p;
          return rest as Player;
        }
        return p;
      });

      await saveTrainingGroupToFirestore({
        ...group,
        players: updatedPlayers
      }, user, effectiveClubId);
      showToast(`${playerName} wurde wieder aktiviert.`);
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Wiederherstellen des Spielers.', 'error');
    }
  };

  const handleDeletePlayerPermanently = async (group: TrainingGroup, playerId: string, playerName: string) => {
    if (window.confirm(`Möchtest du "${playerName}" wirklich endgültig löschen? Dieser Schritt kann nicht rückgängig gemacht werden.`)) {
      try {
        const updatedPlayers = (group.players || []).filter(p => p.id !== playerId);
        await saveTrainingGroupToFirestore({
          ...group,
          players: updatedPlayers
        }, user, effectiveClubId);
        showToast(`${playerName} endgültig gelöscht.`);
      } catch (err) {
        console.error(err);
        showToast('Fehler beim Löschen des Spielers.', 'error');
      }
    }
  };

  const handleOpenMoveModal = (group: TrainingGroup, player: Player) => {
    setMovingPlayer(player);
    setSourceGroupForMove(group);
    setIsMovePlayerModalOpen(true);
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Das Vereinslogo darf maximal 2 MB groß sein.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
      showToast('Logo geladen. Klicke auf "Profil speichern", um es zu übernehmen.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClub?.id) return;
    if (!formClubName.trim()) {
      showToast('Bitte gib einen Vereinsnamen ein.', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateClub(currentClub.id, {
        name: formClubName.trim(),
        logoUrl: logoBase64
      });
      showToast('Vereinsprofil & Wappen erfolgreich aktualisiert!');
    } catch (err) {
      console.error('Error saving club profile:', err);
      showToast('Fehler beim Speichern des Vereinsprofils.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClub?.id) return;
    if (!newCoachEmail.trim()) {
      showToast('Bitte gib eine Trainer-E-Mail ein.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await addCoachToClub(currentClub.id, newCoachEmail.trim());
      if (res.success) {
        showToast(res.message, 'success');
        setNewCoachEmail('');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      console.error('Error adding coach:', err);
      showToast('Fehler beim Hinzufügen des Trainers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoachByEmail = async (email: string) => {
    if (!currentClub?.id) return;
    if (window.confirm(`Möchtest du den Trainer ${email} wirklich aus dem Verein entfernen? Dadurch wird 1 Trainer-Lizenz wieder freigegeben.`)) {
      try {
        setLoading(true);
        await removeCoachEmailFromClub(currentClub.id, email);
        showToast(`Trainer ${email} wurde aus dem Verein entfernt (1 Lizenz freigegeben).`);
      } catch (err) {
        console.error('Error removing coach by email:', err);
        showToast('Fehler beim Entfernen des Trainers.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleClubPublish = async (exercise: Exercise) => {
    if (!exercise.id) return;
    try {
      const newStatus = !exercise.isClubPublished;
      await toggleClubPublishStatus(exercise.id, newStatus);
      showToast(
        newStatus 
          ? `Übung "${exercise.title}" für alle Vereinstrainer freigeschaltet!` 
          : `Übung "${exercise.title}" auf intern/privat gesetzt.`
      );
    } catch (err) {
      console.error('Error toggling club publish:', err);
      showToast('Fehler beim Ändern des Freigabestatus.', 'error');
    }
  };

  const handleDeleteExercise = async (id: string, title: string) => {
    if (window.confirm(`Möchtest du die Übung "${title}" wirklich löschen?`)) {
      try {
        await deleteExerciseFromFirestore(id);
        showToast(`Übung "${title}" wurde gelöscht.`);
      } catch (err) {
        console.error('Error deleting exercise:', err);
        showToast('Fehler beim Löschen.', 'error');
      }
    }
  };

  if (!currentClub) {
    return (
      <div className="max-w-4xl mx-auto p-8 sm:p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-sky-950/70 border border-sky-800 text-sky-400 flex items-center justify-center mx-auto shadow-inner">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Kein Partner-Verein ausgewählt</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {isMasterAdmin
              ? 'Du bist als Master-Administrator eingeloggt. Wähle unten einen Partner-Verein aus, um dessen Club-Dashboard zu öffnen:'
              : 'Dein Account ist aktuell noch keinem lizenzierten Partner-Verein zugeordnet.'}
          </p>
        </div>

        {isMasterAdmin && allClubs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto text-left pt-2">
            {allClubs.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={async () => {
                  if (user) {
                    await setActiveClubForUser(user.uid, c.id, c.name);
                    showToast(`Verein "${c.name}" als aktiver Verein aktiviert!`);
                  }
                }}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-sky-500 hover:bg-sky-950/20 transition-all flex items-center gap-3 group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 p-1.5 flex items-center justify-center flex-shrink-0">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5 text-sky-400" />
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-bold text-white group-hover:text-sky-300 truncate">{c.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{c.adminEmail}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const coachEmails = currentClub.coachEmails || [];
  const maxAllowedCoaches = typeof currentClub.maxCoaches === 'number' && currentClub.maxCoaches > 0 ? currentClub.maxCoaches : 5;
  const assignedCoachesCount = coachEmails.length;
  const isQuotaReached = assignedCoachesCount >= maxAllowedCoaches;
  const freeLicensesCount = Math.max(0, maxAllowedCoaches - assignedCoachesCount);
  const quotaPercent = Math.min(100, Math.round((assignedCoachesCount / maxAllowedCoaches) * 100));
  const pendingCount = exercises.filter(e => !e.isClubPublished && !e.isPublished).length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className={cn(
          "p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in duration-200 border",
          feedback.type === 'success' ? "bg-emerald-950/90 text-emerald-300 border-emerald-700" : "bg-rose-950/90 text-rose-300 border-rose-700"
        )}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
            {currentClub.logoUrl ? (
              <img src={currentClub.logoUrl} alt={currentClub.name} className="h-full w-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-sky-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold tracking-wider uppercase mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Partner-Verein Portal • Chef-Torwarttrainer</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {currentClub.name}
            </h1>
          </div>
        </div>

        {/* Stats Pills & Master Admin Club Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          {isMasterAdmin && allClubs.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
              <Building2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Verein wechseln:</span>
              <select
                value={currentClub?.id || ''}
                onChange={async (e) => {
                  const targetClubId = e.target.value;
                  const selected = allClubs.find(c => c.id === targetClubId);
                  if (selected && user) {
                    await setActiveClubForUser(user.uid, selected.id, selected.name);
                    showToast(`Aktiver Verein auf "${selected.name}" gewechselt!`);
                  }
                }}
                className="bg-slate-900 border border-slate-700 text-sky-300 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {allClubs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Trainer-Lizenzen</span>
            <span className={cn(
              "text-base font-black",
              isQuotaReached ? "text-amber-400" : "text-sky-400"
            )}>
              {assignedCoachesCount} / {maxAllowedCoaches}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Vereins-Übungen</span>
            <span className="text-base font-black text-emerald-400">{exercises.length}</span>
          </div>
          {pendingCount > 0 && (
            <div className="bg-amber-950/70 border border-amber-800 px-3.5 py-2 rounded-xl text-center animate-pulse">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Zu Prüfen</span>
              <span className="text-base font-black text-amber-300">{pendingCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('exercises')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border",
            activeTab === 'exercises'
              ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Vereins-Übungen & Freigaben ({exercises.length})</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('coaches')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border",
            activeTab === 'coaches'
              ? "bg-sky-600 text-white border-sky-500 shadow-md"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white"
          )}
        >
          <Users className="w-4 h-4" />
          <span>Trainer-Team ({assignedCoachesCount}/{maxAllowedCoaches} Lizenzen)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border",
            activeTab === 'groups'
              ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white"
          )}
        >
          <FolderPlus className="w-4 h-4" />
          <span>Trainingsgruppen ({trainingGroups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('principles')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border",
            activeTab === 'principles'
              ? "bg-purple-600 text-white border-purple-500 shadow-md"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white"
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span>Technikprinzipien</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tactic_principles')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border",
            activeTab === 'tactic_principles'
              ? "bg-purple-600 text-white border-purple-500 shadow-md"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white"
          )}
        >
          <Compass className="w-4 h-4" />
          <span>Taktikprinzipien</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border",
            activeTab === 'profile'
              ? "bg-purple-600 text-white border-purple-500 shadow-md"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white"
          )}
        >
          <Image className="w-4 h-4" />
          <span>Vereinsprofil</span>
        </button>
      </div>

      {/* TAB 1: Übungen & Freigabe-Zentrale */}
      {activeTab === 'exercises' && (
        <div className="space-y-4">
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                Vereinsinterne Übungsdatenbank
              </h3>
              <p className="text-xs text-slate-400">
                Schalte Übungen deines Trainerteams für den gesamten Verein frei oder passe sie bei Bedarf an.
              </p>
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Layers className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">
                Bisher wurden noch keine Übungen von Trainern deines Vereins angelegt.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {exercises.map(ex => {
                const isApproved = Boolean(ex.isClubPublished || ex.isPublished);

                return (
                  <div 
                    key={ex.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between"
                  >
                    {/* Thumbnail Image with click preview */}
                    <div 
                      onClick={() => setPreviewExercise(ex)}
                      className="aspect-[720/500] bg-slate-950 relative overflow-hidden border-b border-slate-800 cursor-pointer group"
                      title="Klicken für Vollbildansicht"
                    >
                      {(ex.imageUrl || ex.imageBase64) ? (
                        <img src={ex.imageUrl || ex.imageBase64} alt={ex.title} className="w-full h-full object-contain group-hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1">
                          <Layers className="w-8 h-8" />
                          <span className="text-xs">Keine Grafik</span>
                        </div>
                      )}

                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-extrabold border shadow", CATEGORY_COLORS[ex.category]?.badge)}>
                          {ex.category}
                        </span>
                        {isApproved ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-950 text-sky-300 border border-sky-700 shadow flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-sky-400" />
                            <span>Im Verein aktiv</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-700 shadow flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>Nur Ersteller & Admin</span>
                          </span>
                        )}
                      </div>
                    </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <h4 className="font-extrabold text-sm text-slate-100 line-clamp-1">
                            {ex.title}
                          </h4>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span>Erstellt von:</span>
                              <span className="text-slate-200 font-semibold truncate max-w-[160px]">
                                {ex.ownerEmail || 'Trainer'}
                              </span>
                            </p>
                            {ex.minAgeGroup && ex.minAgeGroup !== 'immer' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800">
                                ab {ex.minAgeGroup}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-0.5 font-mono">
                            {ex.ablauf}
                          </p>

                          {/* Existing rejection notice */}
                          {ex.rejectionReason && !isApproved && (
                            <div className="mt-2 p-2 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-[11px] space-y-0.5">
                              <span className="font-bold flex items-center gap-1 text-rose-400">
                                <AlertCircle className="w-3 h-3" />
                                <span>Aktueller Hinweis an den Trainer:</span>
                              </span>
                              <p className="italic text-rose-200/90">"{ex.rejectionReason}"</p>
                            </div>
                          )}
                        </div>

                        {/* Action Bar: Toggle Publish, Reject, Edit, Delete */}
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleClubPublish(ex)}
                              className={cn(
                                "px-2.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm",
                                isApproved
                                  ? "bg-sky-950 text-sky-300 border border-sky-700 hover:bg-sky-900"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60"
                              )}
                              title={isApproved ? "Für Verein sperren" : "Für alle Trainer des Vereins freigeben"}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{isApproved ? 'Vereins-Öffentlich' : 'Freigeben'}</span>
                            </button>

                            {!isApproved && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalExercise(ex);
                                  setRejectionNote(ex.rejectionReason || '');
                                }}
                                className="px-2 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 bg-rose-950/40 border border-rose-900/60 text-rose-300 hover:bg-rose-900/60"
                                title="Übung ablehnen & Hinweis an den Trainer senden"
                              >
                                <Archive className="w-3.5 h-3.5 text-rose-400" />
                                <span>Ablehnen</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {onEditExercise && (
                              <button
                                type="button"
                                onClick={() => onEditExercise(ex)}
                                title="Übung bearbeiten"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-950/40 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteExercise(ex.id!, ex.title)}
                              title="Übung löschen"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Trainer-Team (Coaches) & Lizenz-Kontingent */}
      {activeTab === 'coaches' && (
        <div className="space-y-6">
          {/* License Quota Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner",
                  isQuotaReached 
                    ? "bg-amber-950/70 border-amber-700/80 text-amber-400" 
                    : "bg-sky-950/70 border-sky-800 text-sky-400"
                )}>
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Vereins-Lizenzen ({currentClub.name})</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border",
                      isQuotaReached
                        ? "bg-amber-950 text-amber-300 border-amber-700"
                        : "bg-emerald-950 text-emerald-300 border-emerald-700"
                    )}>
                      {isQuotaReached ? 'Kontingent voll' : `${freeLicensesCount} frei`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {assignedCoachesCount} von maximal {maxAllowedCoaches} lizensierten Trainer-Accounts zugeordnet.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Belegte Lizenzen</span>
                  <span className="text-lg font-black text-white">{assignedCoachesCount} <span className="text-xs text-slate-500 font-medium">/ {maxAllowedCoaches}</span></span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Freie Lizenzen</span>
                  <span className={cn(
                    "text-lg font-black",
                    freeLicensesCount > 0 ? "text-emerald-400" : "text-amber-400"
                  )}>
                    {freeLicensesCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isQuotaReached 
                      ? "bg-gradient-to-r from-amber-500 to-rose-500" 
                      : "bg-gradient-to-r from-sky-500 to-emerald-500"
                  )}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                <span>0 Lizenzen</span>
                <span>{quotaPercent}% belegt</span>
                <span>Max. {maxAllowedCoaches} Lizenzen</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Add Coach Form */}
            <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-400" />
                  <span>Trainer zum Verein hinzufügen</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trage die E-Mail-Adresse des Trainers ein. Sobald er hinzugefügt wird, erhält er vollen Zugriff auf die Vereins-Übungen und das Vereinswappen.
                </p>
              </div>

              {isQuotaReached ? (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Lizenzlimit erreicht ({assignedCoachesCount}/{maxAllowedCoaches})</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    Alle {maxAllowedCoaches} Lizenzen deines Vereins sind derzeit belegt. Entferne einen Trainer oder wende dich an den Master-Admin (NextLevel Academy), um das Kontingent zu erweitern.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAddCoach} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Trainer E-Mail-Adresse
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={newCoachEmail}
                        onChange={e => setNewCoachEmail(e.target.value)}
                        placeholder="trainer@verein.de"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-sky-500 focus:outline-none font-medium"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isQuotaReached}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-extrabold text-xs transition shadow-md shadow-sky-950/60 disabled:opacity-50"
                  >
                    {loading ? 'Wird hinzugefügt...' : `Trainer zuweisen (${freeLicensesCount} frei)`}
                  </button>
                </form>
              )}
            </div>

            {/* Coach List */}
            <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Aktive Vereinstrainer ({coachEmails.length + 1})</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {assignedCoachesCount} / {maxAllowedCoaches} Lizenzen
                </span>
              </h3>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {/* Club Admin Entry */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-sky-950 border border-sky-700 flex items-center justify-center text-sky-300 text-xs font-black">
                      A
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-100 block">
                        {currentClub.adminEmail}
                      </span>
                      <span className="text-[10px] font-extrabold text-sky-400 uppercase">
                        Club-Administrator (Chef-Trainer)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned Coaches */}
                {coachEmails.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-850">
                    Noch keine weiteren Trainer zugeordnet. Nutze das Formular links, um Trainer mit freier Lizenz einzuladen.
                  </div>
                ) : (
                  coachEmails.map((email) => {
                    return (
                      <div 
                        key={email}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-300 text-xs font-black">
                            T
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-100 block">
                              {email}
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase">
                              Vereinstrainer (Club Coach)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCoachByEmail(email)}
                          title="Trainer aus Verein entfernen & Lizenz freigeben"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TRAININGSGRUPPEN & SPIELERPROFILE */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-400 flex items-center justify-center shadow-inner">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Trainingsgruppen & Spielerprofile ({effectiveClubName})</span>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-emerald-950 text-emerald-300 border-emerald-700">
                      {trainingGroups.length} {trainingGroups.length === 1 ? 'Gruppe' : 'Gruppen'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lege vereinsweite Trainingsgruppen an, ordne ihnen lizensierte Trainer zu und verwalte die Spielerprofile zentral.
                  </p>
                </div>
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

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    placeholder="Gruppe, Trainer oder Torhüter suchen..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {groupSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGroupSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[11px] font-bold text-slate-500">Altersklasse:</span>
                {AGE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setGroupAgeFilter(cat)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold transition",
                      groupAgeFilter === cat
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Groups Grid */}
          {filteredGroups.length === 0 ? (
            <div className="p-12 text-center bg-slate-950 rounded-3xl border border-dashed border-slate-800 space-y-3">
              <Users className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">
                {trainingGroups.length === 0 
                  ? 'Noch keine Trainingsgruppen in diesem Verein angelegt.' 
                  : 'Keine Trainingsgruppen passend zum Suchfilter gefunden.'}
              </p>
              {trainingGroups.length === 0 && (
                <button
                  type="button"
                  onClick={handleOpenNewGroupModal}
                  className="text-xs text-emerald-400 font-bold hover:underline"
                >
                  + Jetzt die erste Trainingsgruppe erstellen
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredGroups.map(group => {
                const colorObj = GROUP_COLORS.find(c => c.key === group.color) || GROUP_COLORS[0];
                const activePlayers = (group.players || []).filter(p => !p.archived);
                const archivedPlayers = (group.players || []).filter(p => p.archived);

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

                          {/* Coach & Observer Badges */}
                          <div className="flex flex-col gap-1.5 mt-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                              <span className="text-slate-400">Haupttrainer:</span>
                              {group.assignedCoachEmail ? (
                                <span className="font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-lg border border-sky-800/60 truncate">
                                  {group.assignedCoachName || group.assignedCoachEmail}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                                  Club-Admin (nicht zugewiesen)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-300 flex-wrap">
                              <Eye className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="text-slate-400">Beobachter:</span>
                              {(group.observerCoachEmails && group.observerCoachEmails.length > 0) ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {group.observerCoachEmails.map(email => {
                                    const coachObj = availableCoaches.find(c => c.email.toLowerCase() === email.toLowerCase());
                                    const displayName = coachObj ? coachObj.name.replace(' (Club-Admin)', '') : email;
                                    return (
                                      <span 
                                        key={email}
                                        className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-800/70"
                                      >
                                        {displayName}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">
                                  Keine weiteren Beobachter
                                </span>
                              )}
                            </div>
                          </div>
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
                          <div className="divide-y divide-slate-800/60 mt-1 max-h-64 overflow-y-auto pr-1">
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
                                        {player.jerseyNumber ? ` (#${player.jerseyNumber})` : ''}
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
                                        onClick={() => handleOpenMoveModal(group, player)}
                                        title="Torhüter in andere Trainingsgruppe verschieben"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition"
                                      >
                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditPlayerModal(group, player)}
                                        title="Spielerprofil bearbeiten"
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
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePlayerPermanently(group, player.id, `${player.firstName} ${player.lastName}`)}
                                        title="Spieler endgültig löschen"
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {archivedPlayers.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setArchivedGroup(group);
                                setIsArchiveModalOpen(true);
                              }}
                              className="text-slate-500 hover:text-amber-400 text-[11px] font-bold flex items-center gap-1.5 transition"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>{archivedPlayers.length} archivierte(r) Torhüter</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: TECHNIKPRINZIPIEN & VEREINS-STANDARDS */}
      {activeTab === 'principles' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-extrabold uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>Vereins-Ausbildungsphilosophie • {effectiveClubName}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Technikprinzipien & Methodische Reihen (Vereins-Standards)
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Passe hier die Ausbildungs-Methodik und Coaching Points für deinen Verein an. 
                  Alle hier gespeicherten <strong>Vereins-Standards</strong> werden automatisch im Übungseditor in der Phase <strong>"Analytisch"</strong> für dich und alle deine <strong>Club Coaches</strong> eingefügt.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Torwarttechniken</span>
                  <span className="text-lg font-black text-sky-400">{SKILL_DEFINITIONS.Technik.length}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Vereins-Standards</span>
                  <span className="text-lg font-black text-emerald-400">
                    {SKILL_DEFINITIONS.Technik.filter(t => Boolean(getClubTechniqueDoc(t.id, t.name))).length} / {SKILL_DEFINITIONS.Technik.length}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Trainer-Vorlagen</span>
                  <span className="text-lg font-black text-indigo-400">
                    {totalTechniquesWithCoachTemplates}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  { id: 'all', label: 'Alle (30)' },
                  { id: 'Grundstellungen', label: 'Grundstellungen (4)' },
                  { id: 'Basistechniken', label: 'Basistechniken (5)' },
                  { id: 'Nah- und Ferndistanz', label: 'Nah- & Ferndistanz (7)' },
                  { id: '1vs1', label: '1vs1 (3)' },
                  { id: 'Hohe Bälle & Flanken', label: 'Flanken & Hohe Bälle (4)' },
                  { id: 'Offensivtechniken', label: 'Offensiv (7)' }
                ] as const).map(group => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setPrinciplesGroupFilter(group.id);
                      if (principlesCoachFilterOnly) setPrinciplesCoachFilterOnly(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition",
                      principlesGroupFilter === group.id && !principlesCoachFilterOnly
                        ? "bg-sky-600 text-white shadow-md shadow-sky-950/50"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {group.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPrinciplesCoachFilterOnly(prev => !prev)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                    principlesCoachFilterOnly
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50"
                      : "bg-slate-950 text-indigo-300 hover:text-white border border-indigo-900/50 hover:border-indigo-700"
                  )}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Mit Trainer-Vorlagen ({totalTechniquesWithCoachTemplates})</span>
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={principlesSearchQuery}
                  onChange={e => setPrinciplesSearchQuery(e.target.value)}
                  placeholder="Technik durchsuchen..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Techniques Grid / List */}
          <div className="space-y-4">
            {filteredTechniques.map(tech => {
              const isExpanded = expandedTechniqueId === tech.id;
              const { source } = getClubTechniqueProgression(tech.id, tech.name);
              const draftStufenCurrent = getDraftStufenFor(tech.id, tech.name);
              const draftPrinciplesCurrent = getDraftPrinciplesFor(tech.id, tech.name);
              const isSaving = savingTechniqueId === tech.id;
              const hasClubStandard = source === 'club';
              const coachProgressions = getCoachTechniqueProgressions(tech.id, tech.name);

              return (
                <div
                  key={tech.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all"
                >
                  {/* Card Header Banner */}
                  <div
                    onClick={() => setExpandedTechniqueId(isExpanded ? null : tech.id)}
                    className="p-5 sm:p-6 bg-slate-900 hover:bg-slate-850/60 cursor-pointer flex flex-wrap items-center justify-between gap-4 transition select-none"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-sky-950/70 border border-sky-800 text-sky-300 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner">
                        <BookOpen className="w-5 h-5 text-sky-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-white">
                            {tech.name}
                          </h3>
                          {tech.group && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                              {tech.group}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Methodische 6-Stufen-Reihe für isolierte & kombinierte Schulung in der Phase "Analytisch"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {coachProgressions.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTechniqueForCoachModal(tech);
                          }}
                          className="px-3 py-1.5 rounded-full text-[11px] font-black bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-100 border border-indigo-700/80 hover:border-indigo-500 flex items-center gap-1.5 shadow-md shadow-indigo-950/60 transition active:scale-95 cursor-pointer"
                          title="Klicke hier, um alle Vorlagen und methodischen Reihen deiner Trainer für diese Technik anzusehen"
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{coachProgressions.length === 1 ? '1. Trainer-Vorlage' : `${coachProgressions.length} Trainer-Vorlagen`}</span>
                          <Eye className="w-3 h-3 text-indigo-400 ml-0.5 opacity-80" />
                        </button>
                      )}

                      {hasClubStandard ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Vereins-Standard aktiv</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>noch nicht festgelegt</span>
                        </span>
                      )}

                      <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-sky-400" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Editor Body */}
                  {isExpanded && (
                    <div className="p-6 sm:p-8 border-t border-slate-800/80 bg-slate-950/40 space-y-8 animate-in fade-in duration-200">
                      <div className="p-3.5 bg-sky-950/30 border border-sky-800/50 rounded-2xl text-sky-200 text-xs flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed text-[11px]">
                          <strong>Vereins-Standard für {currentClub.name}:</strong> Wenn du hier Anpassungen vornimmst und speicherst, 
                          wird diese Reihe automatisch für alle Torwarttrainer deines Vereins als Vereins-Standard hinterlegt.
                        </div>
                      </div>

                      {/* Technikprinzipien Section */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sky-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Didaktische Technikprinzipien & Coaching Points (Vereins-Standard)</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Kernmerkmale & Merksätze für das Trainerteam
                          </span>
                        </label>
                        <textarea
                          rows={3}
                          value={draftPrinciplesCurrent}
                          onChange={e => handleUpdateDraftPrinciples(tech.id, e.target.value)}
                          placeholder="z.B. • Ballnahes Bein drückt explosiv ab&#10;• Arme greifen aktiv vor der Körperebene zu&#10;• Blickkontakt bis zur Ballsicherung halten"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
                        />
                      </div>

                      {/* Methodische Reihe Stufen 1 to 6 */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 text-sky-300">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Methodische Reihe (6 Stufen Vereins-Standard)</span>
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            Vom isolierten Basisschwerpunkt zur komplexen Entscheidung
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {(['stufe1', 'stufe2', 'stufe3', 'stufe4', 'stufe5', 'stufe6'] as const).map((stufeKey, idx) => {
                            const stepNum = idx + 1;
                            const label = METHODISCHE_REIHE_LABELS[stufeKey];
                            const val = draftStufenCurrent[stufeKey] || '';

                            return (
                              <div 
                                key={stufeKey}
                                className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 focus-within:border-sky-500/80 transition"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-sky-300">
                                    <span className="w-5 h-5 rounded-lg bg-sky-950 border border-sky-800 text-[10px] flex items-center justify-center text-sky-300">
                                      {stepNum}
                                    </span>
                                    <span className="truncate">{label}</span>
                                  </span>
                                </div>
                                <textarea
                                  rows={2}
                                  value={val}
                                  onChange={e => handleUpdateDraftStufe(tech.id, tech.name, stufeKey, e.target.value)}
                                  placeholder={`Ablauf & Schwerpunkt für Stufe ${stepNum}...`}
                                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadGlobalAcademyStandard(tech.id, tech.name)}
                            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                            <span>Akademie-Standard laden</span>
                          </button>

                          {hasClubStandard && (
                            <button
                              type="button"
                              onClick={() => handleResetClubStandard(tech.id, tech.name)}
                              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-rose-950/40 text-xs font-semibold text-rose-300 transition flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Standard zurücksetzen</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveClubStandard(tech.id, tech.name, tech.group)}
                          disabled={isSaving}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-black transition shadow-lg shadow-sky-950/60 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Wird gespeichert...' : 'Als Vereins-Standard speichern'}</span>
                        </button>
                      </div>

                      {/* SECTION: ABGESPEICHERTE TRAINER-VORLAGEN & METHODISCHE REIHEN */}
                      <div className="pt-6 border-t border-slate-800/80 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                              <Users className="w-4 h-4 text-indigo-400" />
                              <span>Abgespeicherte Vorlagen & Methodische Reihen deiner Trainer</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-950 text-indigo-300 border border-indigo-800">
                                {coachProgressions.length}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Hier siehst du alle Prinzipien und methodischen 6-Stufen-Reihen, die die Trainer deines Vereins für „{tech.name}“ abgespeichert haben.
                            </p>
                          </div>
                        </div>

                        {coachProgressions.length > 0 ? (
                          <div className="space-y-4">
                            {coachProgressions.map(coachProg => {
                              const coachName = coachProg.authorName || coachProg.userEmail || 'Vereinstrainer';
                              const formattedDate = coachProg.updatedAt
                                ? new Date(coachProg.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Gespeichert';
                              const stufenCount = Object.values(coachProg.stufen || {}).filter(v => Boolean(v?.trim())).length;

                              return (
                                <div 
                                  key={coachProg.id}
                                  className="bg-slate-900 border border-indigo-900/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg"
                                >
                                  {/* Coach Card Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 flex items-center justify-center font-black text-xs shadow-inner">
                                        {coachName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-bold text-white">{coachName}</span>
                                          {coachProg.userEmail && (
                                            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                                              {coachProg.userEmail}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                                          <Calendar className="w-3 h-3 text-slate-500" />
                                          <span>Zuletzt gespeichert: {formattedDate}</span>
                                          <span>•</span>
                                          <span className="text-indigo-400 font-bold">{stufenCount} von 6 Stufen ausgefüllt</span>
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleAdoptCoachTechniqueProgression(tech.id, tech.name, coachProg)}
                                      className="px-3.5 py-1.5 rounded-xl bg-indigo-950 border border-indigo-700/80 hover:bg-indigo-900 text-indigo-200 text-xs font-bold transition flex items-center gap-1.5 shadow active:scale-95"
                                      title="Kopiert diese Trainer-Vorlage in das obige Formular als Vereins-Standard"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>In Vereins-Standard übernehmen</span>
                                    </button>
                                  </div>

                                  {/* Trainer's Technikprinzipien */}
                                  <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                      <Sparkles className="w-3 h-3 text-indigo-400" />
                                      <span>Technikprinzipien & Coaching Points des Trainers:</span>
                                    </span>
                                    {coachProg.technikprinzipien?.trim() ? (
                                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
                                        {coachProg.technikprinzipien}
                                      </div>
                                    ) : (
                                      <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-2.5 text-[11px] text-slate-500 italic">
                                        Keine gesonderten Prinzipien hinterlegt
                                      </div>
                                    )}
                                  </div>

                                  {/* Trainer's 6 Stufen Methodische Reihe */}
                                  <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                      <Layers className="w-3 h-3 text-indigo-400" />
                                      <span>Methodische Reihe (6 Stufen) des Trainers:</span>
                                    </span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                      {(['stufe1', 'stufe2', 'stufe3', 'stufe4', 'stufe5', 'stufe6'] as const).map((stufeKey, idx) => {
                                        const stepNum = idx + 1;
                                        const label = METHODISCHE_REIHE_LABELS[stufeKey];
                                        const val = coachProg.stufen?.[stufeKey]?.trim();

                                        return (
                                          <div
                                            key={stufeKey}
                                            className={cn(
                                              "rounded-xl p-2.5 space-y-1 transition",
                                              val 
                                                ? "bg-slate-950 border border-indigo-900/50" 
                                                : "bg-slate-950/40 border border-slate-850 opacity-60"
                                            )}
                                          >
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-300">
                                              <span className="w-4 h-4 rounded-md bg-indigo-950 border border-indigo-800 text-[9px] flex items-center justify-center text-indigo-300">
                                                {stepNum}
                                              </span>
                                              <span className="truncate">{label}</span>
                                            </div>
                                            <p className="text-xs text-slate-200 leading-relaxed font-sans">
                                              {val || <span className="text-slate-600 italic">Kein Inhalt</span>}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-5 text-center space-y-1.5">
                            <Users className="w-6 h-6 text-slate-600 mx-auto" />
                            <p className="text-xs font-bold text-slate-400">
                              Noch keine Trainer-Vorlagen für „{tech.name}“ hinterlegt
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                              Sobald ein Trainer deines Vereins im Übungseditor bei dieser Technik eigene Prinzipien oder Stufen abspeichert, kannst du sie hier direkt einsehen und bei Bedarf als offiziellen Vereins-Standard übernehmen.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: TAKTIKPRINZIPIEN & VEREINS-STANDARDS */}
      {activeTab === 'tactic_principles' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-extrabold uppercase tracking-wider">
                  <Compass className="w-4 h-4" />
                  <span>Vereins-Ausbildungsphilosophie • {effectiveClubName}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Taktikprinzipien & Coaching Points (Vereins-Standards)
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Passe hier die taktischen Coaching Points und Verhaltensweisen für deinen Verein an. 
                  Alle hier gespeicherten <strong>Vereins-Standards</strong> werden automatisch im Übungseditor in der Phase <strong>"Situativ"</strong> für dich und alle deine <strong>Club Coaches</strong> eingefügt.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Taktik-Schwerpunkte</span>
                  <span className="text-lg font-black text-purple-400">{SKILL_DEFINITIONS.Taktik.length}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Vereins-Standards</span>
                  <span className="text-lg font-black text-emerald-400">
                    {SKILL_DEFINITIONS.Taktik.filter(t => Boolean(getClubTacticDoc(t.id, t.name))).length} / {SKILL_DEFINITIONS.Taktik.length}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Trainer-Vorlagen</span>
                  <span className="text-lg font-black text-purple-400">
                    {totalTacticsWithCoachTemplates}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  { id: 'all', label: 'Alle (16)' },
                  { id: 'Zielverteidigung', label: 'Zielverteidigung (4)' },
                  { id: 'Raumverteidigung', label: 'Raumverteidigung (4)' },
                  { id: 'Standards', label: 'Standards (3)' },
                  { id: 'Offensive', label: 'Offensive (3)' },
                  { id: 'Organisation', label: 'Organisation (2)' },
                  { id: 'Allgemein', label: 'Allgemein (1)' }
                ] as const).map(group => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setTacticalGroupFilter(group.id);
                      if (tacticalCoachFilterOnly) setTacticalCoachFilterOnly(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition",
                      tacticalGroupFilter === group.id && !tacticalCoachFilterOnly
                        ? "bg-purple-600 text-white shadow-md shadow-purple-950/50"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {group.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setTacticalCoachFilterOnly(prev => !prev)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                    tacticalCoachFilterOnly
                      ? "bg-purple-600 text-white shadow-md shadow-purple-950/50"
                      : "bg-slate-950 text-purple-300 hover:text-white border border-purple-900/50 hover:border-purple-700"
                  )}
                >
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Mit Trainer-Vorlagen ({totalTacticsWithCoachTemplates})</span>
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tacticalSearchQuery}
                  onChange={e => setTacticalSearchQuery(e.target.value)}
                  placeholder="Taktik durchsuchen..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Tactics Grid / List */}
          <div className="space-y-4">
            {filteredTactics.map(tactic => {
              const isExpanded = expandedTacticId === tactic.id;
              const { source } = getClubTacticProgression(tactic.id, tactic.name);
              const draftTacticCurrent = getDraftTacticFor(tactic.id, tactic.name);
              const isSaving = savingTacticId === tactic.id;
              const hasClubStandard = source === 'club';
              const coachPrinciples = getCoachTacticalPrinciples(tactic.id, tactic.name);

              return (
                <div
                  key={tactic.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all"
                >
                  {/* Card Header Banner */}
                  <div
                    onClick={() => setExpandedTacticId(isExpanded ? null : tactic.id)}
                    className="p-5 sm:p-6 bg-slate-900 hover:bg-slate-850/60 cursor-pointer flex flex-wrap items-center justify-between gap-4 transition select-none"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-purple-950/70 border border-purple-800 text-purple-300 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner">
                        <Compass className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-white">
                            {tactic.name}
                          </h3>
                          {tactic.group && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                              {tactic.group}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Taktikprinzipien & Coaching Points für die Phase "Situativ"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {coachPrinciples.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTacticForCoachModal(tactic);
                          }}
                          className="px-3 py-1.5 rounded-full text-[11px] font-black bg-purple-950/90 hover:bg-purple-900 text-purple-300 hover:text-purple-100 border border-purple-700/80 hover:border-purple-500 flex items-center gap-1.5 shadow-md shadow-purple-950/60 transition active:scale-95 cursor-pointer"
                          title="Klicke hier, um alle Taktikprinzipien deiner Trainer für diesen Schwerpunkt anzusehen"
                        >
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          <span>{coachPrinciples.length === 1 ? '1. Trainer-Vorlage' : `${coachPrinciples.length} Trainer-Vorlagen`}</span>
                          <Eye className="w-3 h-3 text-purple-400 ml-0.5 opacity-80" />
                        </button>
                      )}

                      {hasClubStandard ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Vereins-Standard aktiv</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>noch nicht festgelegt</span>
                        </span>
                      )}

                      <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Editor Body */}
                  {isExpanded && (
                    <div className="p-6 sm:p-8 border-t border-slate-800/80 bg-slate-950/40 space-y-8 animate-in fade-in duration-200">
                      <div className="p-3.5 bg-purple-950/30 border border-purple-800/50 rounded-2xl text-purple-200 text-xs flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed text-[11px]">
                          <strong>Vereins-Standard für "{currentClub?.name || 'deinen Verein'}":</strong> Änderungen, die du hier speicherst, 
                          überschreiben für alle Vereinstrainer den globalen Akademie-Standard bei dieser Taktik. 
                          Deine Trainer sehen diese Prinzipien bei Auswahl dieses Schwerpunkts in Phase <em>Situativ</em> standardmäßig vorbefüllt.
                        </div>
                      </div>

                      {/* Taktikprinzipien Textarea */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-purple-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Taktikprinzipien & Coaching Points (Vereins-Standard)</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Coaching Points & Ausbildungs-Leitlinien
                          </span>
                        </label>
                        <textarea
                          rows={6}
                          value={draftTacticCurrent}
                          onChange={e => handleUpdateDraftTactic(tactic.id, e.target.value)}
                          placeholder={`z.B. ${tactic.name}:&#10;• Grundposition dem Spielgeschehen dynamisch anpassen&#10;• Schnelles Umschalten nach Ballgewinn vorbereiten`}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                        />
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadGlobalAcademyTacticalStandard(tactic.id, tactic.name)}
                            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5"
                            title="Lädt den offiziellen Akademie-Standard in das Formular"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                            <span>Akademie-Standard laden</span>
                          </button>

                          {hasClubStandard && (
                            <button
                              type="button"
                              onClick={() => handleResetClubTacticalStandard(tactic.id, tactic.name)}
                              className="px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-850 hover:bg-rose-900/50 text-xs font-semibold text-rose-300 hover:text-rose-100 transition flex items-center gap-1.5"
                              title="Löscht den individuellen Vereins-Standard, sodass wieder der Akademie-Standard greift"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Auf Akademie-Standard zurücksetzen</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveClubTacticalStandard(tactic.id, tactic.name, tactic.group)}
                          disabled={isSaving}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition shadow-lg shadow-purple-950/60 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Wird gespeichert...' : 'Als Vereins-Standard speichern'}</span>
                        </button>
                      </div>

                      {/* SECTION: ABGESPEICHERTE TAKTIKPRINZIPIEN DEINER TRAINER */}
                      <div className="pt-6 border-t border-slate-800/80 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-400" />
                              <span>Abgespeicherte Taktikprinzipien deiner Trainer</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-950 text-purple-300 border border-purple-800">
                                {coachPrinciples.length}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Hier siehst du alle Coaching Points und taktischen Verhaltensweisen, die die Trainer für „{tactic.name}“ hinterlegt haben.
                            </p>
                          </div>
                        </div>

                        {coachPrinciples.length > 0 ? (
                          <div className="space-y-4">
                            {coachPrinciples.map(coachPrinciple => {
                              const coachName = coachPrinciple.authorName || coachPrinciple.userEmail || 'Vereinstrainer';
                              const formattedDate = coachPrinciple.updatedAt
                                ? new Date(coachPrinciple.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Gespeichert';

                              return (
                                <div 
                                  key={coachPrinciple.id}
                                  className="bg-slate-900 border border-purple-900/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg"
                                >
                                  {/* Coach Card Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-700/80 text-purple-300 flex items-center justify-center font-black text-xs shadow-inner">
                                        {coachName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-bold text-white">{coachName}</span>
                                          {coachPrinciple.userEmail && (
                                            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                                              {coachPrinciple.userEmail}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                          <Calendar className="w-3 h-3 text-slate-500" />
                                          <span>Zuletzt gespeichert: {formattedDate}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleAdoptCoachTacticalPrinciple(tactic.id, coachPrinciple)}
                                      className="px-3.5 py-1.5 rounded-xl bg-purple-950 border border-purple-700/80 hover:bg-purple-900 text-purple-200 text-xs font-bold transition flex items-center gap-1.5 shadow active:scale-95"
                                      title="Kopiert diese Trainer-Prinzipien in das obige Formular als Vereins-Standard"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                                      <span>In Vereins-Standard übernehmen</span>
                                    </button>
                                  </div>

                                  {/* Trainer's Taktikprinzipien */}
                                  <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                      <Sparkles className="w-3 h-3 text-purple-400" />
                                      <span>Taktikprinzipien & Coaching Points des Trainers:</span>
                                    </span>
                                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
                                      {coachPrinciple.taktikprinzipien}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-5 text-center space-y-1.5">
                            <Users className="w-6 h-6 text-slate-600 mx-auto" />
                            <p className="text-xs font-bold text-slate-400">
                              Noch keine Trainer-Prinzipien für „{tactic.name}“ hinterlegt
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                              Sobald ein Trainer deines Vereins im Übungseditor eigene Taktikprinzipien für diesen Schwerpunkt abspeichert, kannst du sie hier direkt einsehen und bei Bedarf als offiziellen Vereins-Standard übernehmen.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Vereins-Profil & Logo-Upload */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white">
              Vereinsprofil & Wappen anpassen
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Das hier hochgeladene Vereinswappen wird automatisch auf allen PDF-Trainingsplänen deiner Vereinstrainer oben rechts eingebunden.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Offizieller Vereinsname *
              </label>
              <input
                type="text"
                value={formClubName}
                onChange={e => setFormClubName(e.target.value)}
                placeholder="z.B. FC Augsburg NLZ"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Vereinswappen / Logo (für PDF-Exporte)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoBase64 ? (
                    <img src={logoBase64} alt="Vorschau" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-600 text-[10px] space-y-1">
                      <Image className="w-6 h-6 mx-auto" />
                      <span>Kein Logo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition"
                  >
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>Neues Wappen hochladen</span>
                  </button>
                  {logoBase64 && (
                    <button
                      type="button"
                      onClick={() => setLogoBase64('')}
                      className="text-xs text-rose-400 hover:underline block"
                    >
                      Logo entfernen (Standard NextLevel nutzen)
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs transition shadow-lg shadow-emerald-950/60 disabled:opacity-50"
            >
              {loading ? 'Speichere...' : 'Profil & Logo speichern'}
            </button>
          </form>
        </div>
      )}

      {/* Modal Preview */}
      <ExerciseModal
        exercise={previewExercise}
        onClose={() => setPreviewExercise(null)}
        onEdit={onEditExercise}
      />

      {/* Reject Exercise Modal (with coach feedback notice) */}
      {rejectModalExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <span>Übung ablehnen / zurückweisen</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setRejectModalExercise(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-200 block">
                {rejectModalExercise.title}
              </span>
              <span className="text-[11px] text-slate-400 block">
                Erstellt von: {rejectModalExercise.ownerEmail || 'Vereinstrainer'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Hinweis / Begründung an den Trainer (optional):
              </label>
              <textarea
                rows={4}
                value={rejectionNote}
                onChange={e => setRejectionNote(e.target.value)}
                placeholder="z.B. Bitte Coaching Points ergänzen, Taktikboard anpassen oder Passwege prüfen..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 font-sans leading-relaxed"
              />
              <p className="text-[11px] text-slate-500">
                Der Trainer sieht diesen Hinweis direkt an seiner Übungskarte und im Übungs-Editor.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalExercise(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={async () => {
                  setIsRejecting(true);
                  try {
                    await rejectClubExerciseInFirestore(rejectModalExercise.id!, rejectionNote.trim());
                    showToast('Übung abgelehnt und Hinweis für den Trainer gespeichert.');
                    setRejectModalExercise(null);
                  } catch (err) {
                    console.error('Error rejecting exercise:', err);
                    showToast('Fehler beim Ablehnen der Übung.', 'error');
                  } finally {
                    setIsRejecting(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-black transition shadow-lg shadow-rose-950/60 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isRejecting ? 'Wird gespeichert...' : 'Ablehnen & Hinweis senden'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===================================================================== */}
      {/* MODAL: TRAININGSGRUPPE ANLEGEN / BEARBEITEN                           */}
      {/* ===================================================================== */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingGroup ? 'Trainingsgruppe bearbeiten' : 'Neue Trainingsgruppe anlegen'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Verein: {effectiveClubName}</p>
                </div>
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

              {/* Assigned Primary Coach Dropdown */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Zuständiger Haupttrainer (lizensierter Trainer)</span>
                </label>
                <select
                  value={groupFormData.assignedCoachEmail}
                  onChange={e => {
                    const newPrimary = e.target.value;
                    setGroupFormData(prev => ({
                      ...prev,
                      assignedCoachEmail: newPrimary,
                      observerCoachEmails: prev.observerCoachEmails.filter(
                        em => em.toLowerCase() !== newPrimary.toLowerCase()
                      )
                    }));
                  }}
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
                  Der Haupttrainer erhält volle Schreibrechte für Dateneingaben, Periodisierung und Bewertungen dieser Gruppe.
                </p>
              </div>

              {/* Observer Coaches Checkbox List */}
              <div className="space-y-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Beobachter-Rechte (Vereinstrainer / Club-Coaches)</span>
                  </label>
                  {availableCoaches.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allCoachEmails = availableCoaches
                            .map(c => c.email)
                            .filter(em => em.toLowerCase() !== groupFormData.assignedCoachEmail.toLowerCase());
                          setGroupFormData(prev => ({ ...prev, observerCoachEmails: allCoachEmails }));
                        }}
                        className="text-[10px] text-emerald-400 hover:underline font-semibold"
                      >
                        Alle
                      </button>
                      <span className="text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setGroupFormData(prev => ({ ...prev, observerCoachEmails: [] }));
                        }}
                        className="text-[10px] text-slate-400 hover:underline font-semibold"
                      >
                        Keine
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Wähle per Checkbox aus, welche weiteren Vereinstrainer diese Trainingsgruppe einsehen dürfen (Lese- und Einsichtsrechte für Torhüter, Fehlzeiten, Spielzeiten, Periodisierung & Statistiken).
                </p>

                {availableCoaches.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    Bisher keine weiteren Trainer im Verein registriert.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 pt-1">
                    {availableCoaches.map(coach => {
                      const isPrimary = Boolean(
                        groupFormData.assignedCoachEmail &&
                        coach.email.toLowerCase() === groupFormData.assignedCoachEmail.toLowerCase()
                      );
                      const isObserver = groupFormData.observerCoachEmails.some(
                        em => em.toLowerCase() === coach.email.toLowerCase()
                      );

                      return (
                        <label
                          key={coach.email}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition select-none",
                            isPrimary 
                              ? "bg-sky-950/40 border-sky-800/60 opacity-80 cursor-default" 
                              : isObserver 
                                ? "bg-emerald-950/40 border-emerald-800 text-slate-100" 
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              disabled={isPrimary}
                              checked={isPrimary || isObserver}
                              onChange={e => {
                                if (isPrimary) return;
                                const checked = e.target.checked;
                                setGroupFormData(prev => {
                                  const filtered = prev.observerCoachEmails.filter(
                                    em => em.toLowerCase() !== coach.email.toLowerCase()
                                  );
                                  return {
                                    ...prev,
                                    observerCoachEmails: checked ? [...filtered, coach.email] : filtered
                                  };
                                });
                              }}
                              className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                            />
                            <span className="truncate font-medium text-xs">{coach.name}</span>
                          </div>

                          {isPrimary ? (
                            <span className="text-[10px] font-bold text-sky-300 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-800 flex-shrink-0">
                              Haupttrainer
                            </span>
                          ) : isObserver ? (
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800 flex-shrink-0">
                              Beobachter
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-medium flex-shrink-0">
                              Kein Zugriff
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

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
                    {editingPlayer ? 'Spielerprofil bearbeiten' : 'Neuen Spieler anlegen'}
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
      {/* MODAL: SPIELER VERSCHIEBEN                                            */}
      {/* ===================================================================== */}
      <MovePlayerModal
        isOpen={isMovePlayerModalOpen}
        onClose={() => {
          setIsMovePlayerModalOpen(false);
          setMovingPlayer(null);
          setSourceGroupForMove(null);
        }}
        player={movingPlayer}
        sourceGroup={sourceGroupForMove}
        allGroups={trainingGroups}
        showToast={showToast}
      />

      {/* ===================================================================== */}
      {/* MODAL: ARCHIVIERTE SPIELER                                            */}
      {/* ===================================================================== */}
      {isArchiveModalOpen && archivedGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Archivierte Spieler</h3>
                  <p className="text-[11px] text-slate-400">Gruppe: {archivedGroup.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsArchiveModalOpen(false);
                  setArchivedGroup(null);
                }} 
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const archivedList = (archivedGroup.players || []).filter(p => p.archived);
                if (archivedList.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Keine archivierten Torhüter in dieser Gruppe.
                    </div>
                  );
                }

                return archivedList.map(player => (
                  <div 
                    key={player.id} 
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 block truncate">
                        {player.firstName} {player.lastName}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {player.birthYear ? `Jg. ${player.birthYear}` : 'Kein Jahrgang'} 
                        {player.archivedAt ? ` • Archiviert am ${new Date(player.archivedAt).toLocaleDateString('de-DE')}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUnarchivePlayer(archivedGroup, player.id, `${player.firstName} ${player.lastName}`)}
                        className="px-2.5 py-1.5 rounded-xl text-emerald-300 bg-emerald-950/80 border border-emerald-800 hover:bg-emerald-900 text-[11px] font-bold transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Wiederherstellen</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlayerPermanently(archivedGroup, player.id, `${player.firstName} ${player.lastName}`)}
                        className="p-1.5 rounded-xl text-rose-400 bg-rose-950/50 border border-rose-900/60 hover:bg-rose-900 transition"
                        title="Endgültig löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsArchiveModalOpen(false);
                  setArchivedGroup(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 font-bold text-xs transition"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRAINER-VORLAGEN ÜBERSICHT (TECHNIK) */}
      {selectedTechniqueForCoachModal && (() => {
        const tech = selectedTechniqueForCoachModal;
        const coachProgressions = getCoachTechniqueProgressions(tech.id, tech.name);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-slate-900 border border-indigo-700/60 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 flex items-start justify-between gap-4 flex-shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {tech.group || 'Technik'}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">•</span>
                    <span className="text-xs text-indigo-400 font-extrabold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{coachProgressions.length === 1 ? '1 Trainer-Vorlage' : `${coachProgressions.length} Trainer-Vorlagen`}</span>
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <BookOpen className="w-6 h-6 text-sky-400 flex-shrink-0" />
                    <span>Trainer-Vorlagen: {tech.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    Hier siehst du den genauen Inhalt aller didaktischen Prinzipien und methodischen 6-Stufen-Reihen, die deine Vereinstrainer für diese Technik abgespeichert haben.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTechniqueForCoachModal(null)}
                  className="w-9 h-9 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition flex-shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900/50">
                {coachProgressions.length > 0 ? (
                  <div className="space-y-6">
                    {coachProgressions.map((coachProg, cIdx) => {
                      const coachName = coachProg.authorName || coachProg.userEmail || 'Vereinstrainer';
                      const formattedDate = coachProg.updatedAt
                        ? new Date(coachProg.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Gespeichert';
                      const filledStufenCount = Object.values(coachProg.stufen || {}).filter(v => Boolean(v?.trim())).length;

                      return (
                        <div
                          key={coachProg.id || `coach_${cIdx}`}
                          className="bg-slate-950 border border-indigo-900/50 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none" />

                          {/* Coach Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-700 text-indigo-300 flex items-center justify-center font-black text-sm shadow-inner">
                                {coachName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base font-extrabold text-white">{coachName}</span>
                                  {coachProg.userEmail && (
                                    <span className="text-[11px] text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono">
                                      {coachProg.userEmail}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Zuletzt gespeichert: {formattedDate}</span>
                                  <span>•</span>
                                  <span className="text-indigo-400 font-bold">{filledStufenCount} von 6 Stufen ausgefüllt</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleAdoptCoachTechniqueProgression(tech.id, tech.name, coachProg);
                                setExpandedTechniqueId(tech.id);
                                setSelectedTechniqueForCoachModal(null);
                              }}
                              className="px-4 py-2 rounded-xl bg-indigo-950 border border-indigo-600 hover:bg-indigo-900 text-indigo-200 text-xs font-black transition flex items-center gap-2 shadow-lg shadow-indigo-950/60 active:scale-95 cursor-pointer"
                              title="Überträgt diese Vorlage direkt in den Vereins-Standard"
                            >
                              <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                              <span>In Vereins-Standard übernehmen</span>
                            </button>
                          </div>

                          {/* Field 1: Didaktische Technikprinzipien */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 text-indigo-300">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Didaktische Technikprinzipien & Coaching Points (vom Trainer)</span>
                            </label>
                            {coachProg.technikprinzipien?.trim() ? (
                              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 font-mono leading-relaxed whitespace-pre-wrap">
                                {coachProg.technikprinzipien}
                              </div>
                            ) : (
                              <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-3 text-xs text-slate-500 italic">
                                Keine gesonderten Prinzipien hinterlegt
                              </div>
                            )}
                          </div>

                          {/* Field 2: Methodische 6-Stufen-Reihe */}
                          <div className="space-y-2.5">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 text-indigo-300">
                              <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Methodische Reihe (6 Stufen vom Trainer)</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(['stufe1', 'stufe2', 'stufe3', 'stufe4', 'stufe5', 'stufe6'] as const).map((stufeKey, idx) => {
                                const stepNum = idx + 1;
                                const label = METHODISCHE_REIHE_LABELS[stufeKey];
                                const val = coachProg.stufen?.[stufeKey]?.trim();

                                return (
                                  <div
                                    key={stufeKey}
                                    className={cn(
                                      "rounded-xl p-3.5 space-y-1.5 transition",
                                      val 
                                        ? "bg-slate-900 border border-indigo-900/60 shadow-sm" 
                                        : "bg-slate-900/40 border border-slate-850 opacity-60"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 text-[11px] font-black text-indigo-300">
                                      <span className="w-5 h-5 rounded-lg bg-indigo-950 border border-indigo-800 text-[10px] flex items-center justify-center text-indigo-300 shadow-inner">
                                        {stepNum}
                                      </span>
                                      <span className="truncate">{label}</span>
                                    </div>
                                    <p className="text-xs text-slate-200 leading-relaxed font-sans pl-7">
                                      {val || <span className="text-slate-600 italic">Kein Inhalt hinterlegt</span>}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">
                      Noch keine Vorlagen für „{tech.name}“ vorhanden
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Sobald ein Trainer deines Vereins im Übungseditor bei dieser Technik eine Vorlage speichert, erscheint sie hier.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
                <span className="text-xs text-slate-400 font-semibold">
                  Insgesamt {coachProgressions.length} Trainer-Vorlage{coachProgressions.length !== 1 ? 'n' : ''} für {tech.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTechniqueForCoachModal(null)}
                  className="px-5 py-2 rounded-xl text-slate-300 bg-slate-850 hover:bg-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: TRAINER-VORLAGEN ÜBERSICHT (TAKTIK) */}
      {selectedTacticForCoachModal && (() => {
        const tactic = selectedTacticForCoachModal;
        const coachPrinciples = getCoachTacticalPrinciples(tactic.id, tactic.name);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-slate-900 border border-purple-700/60 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 flex items-start justify-between gap-4 flex-shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-800">
                      {tactic.group || 'Taktik'}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">•</span>
                    <span className="text-xs text-purple-400 font-extrabold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{coachPrinciples.length === 1 ? '1 Trainer-Vorlage' : `${coachPrinciples.length} Trainer-Vorlagen`}</span>
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <Compass className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <span>Trainer-Vorlagen: {tactic.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    Hier siehst du alle Coaching Points und taktischen Verhaltensweisen, die deine Vereinstrainer für diesen Schwerpunkt hinterlegt haben.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTacticForCoachModal(null)}
                  className="w-9 h-9 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition flex-shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-900/50">
                {coachPrinciples.length > 0 ? (
                  <div className="space-y-5">
                    {coachPrinciples.map((coachPrinciple, cIdx) => {
                      const coachName = coachPrinciple.authorName || coachPrinciple.userEmail || 'Vereinstrainer';
                      const formattedDate = coachPrinciple.updatedAt
                        ? new Date(coachPrinciple.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Gespeichert';

                      return (
                        <div
                          key={coachPrinciple.id || `tact_${cIdx}`}
                          className="bg-slate-950 border border-purple-900/50 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-36 h-36 bg-purple-600/5 rounded-full blur-2xl pointer-events-none" />

                          {/* Coach Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-purple-950 border border-purple-700 text-purple-300 flex items-center justify-center font-black text-sm shadow-inner">
                                {coachName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base font-extrabold text-white">{coachName}</span>
                                  {coachPrinciple.userEmail && (
                                    <span className="text-[11px] text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono">
                                      {coachPrinciple.userEmail}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Zuletzt gespeichert: {formattedDate}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleAdoptCoachTacticalPrinciple(tactic.id, coachPrinciple);
                                setExpandedTacticId(tactic.id);
                                setSelectedTacticForCoachModal(null);
                              }}
                              className="px-4 py-2 rounded-xl bg-purple-950 border border-purple-600 hover:bg-purple-900 text-purple-200 text-xs font-black transition flex items-center gap-2 shadow-lg shadow-purple-950/60 active:scale-95 cursor-pointer"
                              title="Überträgt diese Taktikprinzipien direkt in den Vereins-Standard"
                            >
                              <ArrowUpRight className="w-4 h-4 text-purple-400" />
                              <span>In Vereins-Standard übernehmen</span>
                            </button>
                          </div>

                          {/* Taktikprinzipien Box */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 text-purple-300">
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              <span>Taktikprinzipien & Coaching Points (vom Trainer)</span>
                            </label>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 font-mono leading-relaxed whitespace-pre-wrap">
                              {coachPrinciple.taktikprinzipien}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">
                      Noch keine Taktikprinzipien für „{tactic.name}“ vorhanden
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Sobald ein Trainer deines Vereins im Übungseditor eigene Taktikprinzipien für diesen Schwerpunkt speichert, erscheinen sie hier.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
                <span className="text-xs text-slate-400 font-semibold">
                  Insgesamt {coachPrinciples.length} Trainer-Vorlage{coachPrinciples.length !== 1 ? 'n' : ''} für {tactic.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTacticForCoachModal(null)}
                  className="px-5 py-2 rounded-xl text-slate-300 bg-slate-850 hover:bg-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fixed Floating Toast Feedback Notification */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={cn(
            "p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-2xl border backdrop-blur-md",
            feedback.type === 'success' 
              ? "bg-emerald-950/95 text-emerald-200 border-emerald-600 shadow-emerald-950/60" 
              : "bg-rose-950/95 text-rose-200 border-rose-600 shadow-rose-950/60"
          )}>
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <span className="leading-snug">{feedback.message}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setFeedback(null)} 
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Fixed Floating Internal Toast Notification */}
      {internalToast && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={cn(
            "p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-2xl border backdrop-blur-md",
            internalToast.type === 'success' 
              ? "bg-emerald-950/95 text-emerald-200 border-emerald-600 shadow-emerald-950/60" 
              : "bg-rose-950/95 text-rose-200 border-rose-600 shadow-rose-950/60"
          )}>
            <div className="flex items-center gap-2.5">
              {internalToast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <span className="leading-snug">{internalToast.message}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setInternalToast(null)} 
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
