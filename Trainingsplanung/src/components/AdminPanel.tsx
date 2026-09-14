import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeAllUsers, 
  unlockUserForOneYear, 
  extendUserTrial, 
  updateUserRole, 
  toggleUserBlockStatus,
  createNewUserByAdmin,
  subscribeExercises,
  toggleExercisePublishStatus,
  approveAndPublishExercise,
  rejectExerciseInFirestore,
  restoreExerciseFromArchive,
  deleteExerciseFromFirestore,
  subscribeClubs,
  createClub,
  deleteClub,
  editClubFull,
  assignUserToClub,
  removeCoachEmailFromClub,
  setActiveClubForUser,
  subscribeMethodicalProgressions,
  saveGlobalTechniqueStandard,
  deleteMethodicalProgression,
  clearAllMethodicalProgressions,
  DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS,
  subscribeTacticalPrinciples,
  saveGlobalTacticalStandard,
  deleteTacticalPrinciple,
  clearAllTacticalPrinciples,
  DEFAULT_ACADEMY_TACTICAL_PRINCIPLES
} from '../firebase/firestoreService';
import type { UserProfile, Exercise, UserRole, Club, MethodicalProgression, MethodischeReiheStufen, TacticalPrinciple } from '../types';
import { CATEGORY_COLORS, METHODISCHE_REIHE_LABELS, SKILL_DEFINITIONS, getRoleLabel, getRoleBadgeClass } from '../types';
import { ExerciseModal } from './ExerciseModal';
import { 
  ShieldCheck, 
  Users, 
  Key, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Ban, 
  Unlock, 
  Search, 
  Globe, 
  EyeOff, 
  Trash2, 
  Sparkles,
  Archive,
  Eye,
  Edit3,
  RotateCcw,
  Layers, 
  Building2, 
  Plus, 
  Upload,
  Check,
  X,
  Info,
  UserCheck,
  UserPlus,
  Award,
  GripVertical,
  Mail,
  BookOpen,
  Save,
  Copy,
  ChevronDown,
  ChevronUp,
  Compass,
  User
} from 'lucide-react';
import { cn } from '../utils/cn';

interface AdminPanelProps {
  onEditExercise?: (exercise: Exercise) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onEditExercise }) => {
  const { user, userProfile, isAdmin, currentClub } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'users' | 'exercises' | 'clubs' | 'principles' | 'tactic_principles' | 'roles'>('users');
  const [searchUser, setSearchUser] = useState<string>('');
  const [searchExercise, setSearchExercise] = useState<string>('');
  const [exerciseSubTab, setExerciseSubTab] = useState<'active' | 'archived'>('active');
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  // Methodical Progressions (Technikprinzipien) state
  const [progressions, setProgressions] = useState<MethodicalProgression[]>([]);
  const [principlesGroupFilter, setPrinciplesGroupFilter] = useState<string>('all');
  const [principlesSearchQuery, setPrinciplesSearchQuery] = useState<string>('');
  const [expandedTechniqueId, setExpandedTechniqueId] = useState<string | null>(null);
  const [draftStufen, setDraftStufen] = useState<Record<string, MethodischeReiheStufen>>({});
  const [draftPrinciples, setDraftPrinciples] = useState<Record<string, string>>({});
  const [savingTechniqueId, setSavingTechniqueId] = useState<string | null>(null);

  // Tactical Principles (Taktikprinzipien) state
  const [tacticalPrinciples, setTacticalPrinciples] = useState<TacticalPrinciple[]>([]);
  const [tacticalGroupFilter, setTacticalGroupFilter] = useState<string>('all');
  const [tacticalTrainerFilter, setTacticalTrainerFilter] = useState<string>('all');
  const [tacticalSearchQuery, setTacticalSearchQuery] = useState<string>('');
  const [expandedTacticId, setExpandedTacticId] = useState<string | null>(null);
  const [draftTactics, setDraftTactics] = useState<Record<string, string>>({});
  const [savingTacticId, setSavingTacticId] = useState<string | null>(null);

  // New Club modal state
  const [showCreateClubModal, setShowCreateClubModal] = useState<boolean>(false);
  const [newClubName, setNewClubName] = useState<string>('');
  const [newClubAdminEmail, setNewClubAdminEmail] = useState<string>('');
  const [newClubLogo, setNewClubLogo] = useState<string>('');
  const [newClubCoachEmails, setNewClubCoachEmails] = useState<string[]>([]);
  const [newClubMaxCoaches, setNewClubMaxCoaches] = useState<number>(5);
  const [coachEmailInput, setCoachEmailInput] = useState<string>('');
  const [clubModalLoading, setClubModalLoading] = useState<boolean>(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Club modal state
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [editClubName, setEditClubName] = useState<string>('');
  const [editClubAdminEmail, setEditClubAdminEmail] = useState<string>('');
  const [editClubLogo, setEditClubLogo] = useState<string>('');
  const [editClubCoachEmails, setEditClubCoachEmails] = useState<string[]>([]);
  const [editClubMaxCoaches, setEditClubMaxCoaches] = useState<number>(5);
  const [editCoachEmailInput, setEditCoachEmailInput] = useState<string>('');
  const [editClubLoading, setEditClubLoading] = useState<boolean>(false);
  const editLogoInputRef = useRef<HTMLInputElement | null>(null);

  // Create User modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState<boolean>(false);
  const [newUserNameFirst, setNewUserNameFirst] = useState<string>('');
  const [newUserNameLast, setNewUserNameLast] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('trial_user');
  const [newUserClubId, setNewUserClubId] = useState<string>('');
  const [newUserLicenseType, setNewUserLicenseType] = useState<'trial_14' | 'pro_1_year' | 'lifetime' | 'standard'>('trial_14');
  const [createUserLoading, setCreateUserLoading] = useState<boolean>(false);

  // Role Change modal state
  const [editingRoleUser, setEditingRoleUser] = useState<UserProfile | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('single_standard');
  const [changeRoleLoading, setChangeRoleLoading] = useState<boolean>(false);

  // Drag & Drop trainer assignment & Club filters
  const [draggingUser, setDraggingUser] = useState<UserProfile | null>(null);
  const [dragOverClubId, setDragOverClubId] = useState<string | null>(null);
  const [clubSearchQuery, setClubSearchQuery] = useState<string>('');
  const [trayUserSearch, setTrayUserSearch] = useState<string>('');
  const [trayUserFilter, setTrayUserFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');

  // Subscribe to all users, exercises, clubs, progressions & tactical principles
  useEffect(() => {
    if (!isAdmin) return;
    const unsubUsers = subscribeAllUsers(setUsers);
    const unsubExercises = subscribeExercises(null, true, setExercises);
    const unsubClubs = subscribeClubs(setClubs);
    const unsubProgressions = subscribeMethodicalProgressions(setProgressions);
    const unsubTactics = subscribeTacticalPrinciples(setTacticalPrinciples);
    return () => {
      unsubUsers();
      unsubExercises();
      unsubClubs();
      unsubProgressions();
      unsubTactics();
    };
  }, [isAdmin]);

  const showFeedbackToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // License Handlers
  const handleUnlock1Year = async (uid: string, email: string) => {
    try {
      setActionLoading(uid);
      await unlockUserForOneYear(uid);
      showFeedbackToast(`Account ${email} erfolgreich für 1 Jahr freigeschaltet!`);
    } catch (err) {
      console.error('Error unlocking user:', err);
      alert('Fehler beim Freischalten.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendTrial = async (uid: string, email: string, days: number) => {
    try {
      setActionLoading(uid);
      await extendUserTrial(uid, days);
      showFeedbackToast(`Testzeitraum für ${email} um ${days} Tage verlängert!`);
    } catch (err) {
      console.error('Error extending trial:', err);
      alert('Fehler beim Verlängern.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenCreateUserModal = () => {
    setNewUserNameFirst('');
    setNewUserNameLast('');
    setNewUserEmail('');
    setNewUserRole('trial_user');
    setNewUserClubId('');
    setNewUserLicenseType('trial_14');
    setShowCreateUserModal(true);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      alert('Bitte eine gültige E-Mail-Adresse eingeben.');
      return;
    }
    try {
      setCreateUserLoading(true);
      const selectedClub = clubs.find(c => c.id === newUserClubId);
      await createNewUserByAdmin({
        email: newUserEmail.trim(),
        firstName: newUserNameFirst.trim(),
        lastName: newUserNameLast.trim(),
        role: newUserRole,
        clubId: newUserClubId || undefined,
        clubName: selectedClub?.name || undefined,
        licenseType: newUserLicenseType
      });
      showFeedbackToast(`Benutzer ${newUserEmail} erfolgreich angelegt / aktualisiert!`);
      setShowCreateUserModal(false);
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Fehler beim Anlegen des Benutzers.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleOpenRoleModal = (u: UserProfile) => {
    setEditingRoleUser(u);
    setSelectedNewRole(u.role);
  };

  const handleSaveRoleChange = async () => {
    if (!editingRoleUser) return;
    try {
      setChangeRoleLoading(true);
      await updateUserRole(editingRoleUser.uid, selectedNewRole);
      showFeedbackToast(`Rolle für ${editingRoleUser.email} auf "${getRoleLabel(selectedNewRole)}" geändert!`);
      setEditingRoleUser(null);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Fehler beim Ändern der Rolle.');
    } finally {
      setChangeRoleLoading(false);
    }
  };

  const handleToggleBlock = async (uid: string, currentBlocked: boolean, email: string) => {
    const action = currentBlocked ? 'entsperren' : 'sperren';
    if (window.confirm(`Möchtest du den Account ${email} wirklich ${action}?`)) {
      try {
        setActionLoading(uid);
        await toggleUserBlockStatus(uid, !currentBlocked);
        showFeedbackToast(`Account ${email} wurde ${currentBlocked ? 'entsperrt' : 'gesperrt'}.`);
      } catch (err) {
        console.error('Error toggling block:', err);
        alert('Fehler beim Ändern des Sperrstatus.');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleAddCoachEmail = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const email = coachEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!email.includes('@') || !email.includes('.')) {
      showFeedbackToast('Bitte eine gültige Trainer-E-Mail eingeben.');
      return;
    }
    if (newClubAdminEmail && email === newClubAdminEmail.trim().toLowerCase()) {
      showFeedbackToast('Diese E-Mail ist bereits als Club-Admin angegeben.');
      return;
    }
    if (newClubCoachEmails.includes(email)) {
      showFeedbackToast('Diese Trainer-E-Mail ist bereits in der Liste.');
      return;
    }
    setNewClubCoachEmails(prev => [...prev, email]);
    setCoachEmailInput('');
  };

  const handleRemoveCoachEmail = (emailToRemove: string) => {
    setNewClubCoachEmails(prev => prev.filter(e => e !== emailToRemove));
  };

  const handleCreateClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim() || !newClubAdminEmail.trim()) {
      showFeedbackToast('Bitte Vereinsname und Admin-E-Mail angeben.');
      return;
    }

    setClubModalLoading(true);
    try {
      await createClub(
        newClubName.trim(), 
        newClubAdminEmail.trim(), 
        newClubLogo, 
        newClubCoachEmails, 
        newClubMaxCoaches
      );
      showFeedbackToast(`Verein "${newClubName}" mit ${newClubMaxCoaches} Trainer-Lizenzen erfolgreich angelegt!`);
      setShowCreateClubModal(false);
      setNewClubName('');
      setNewClubAdminEmail('');
      setNewClubLogo('');
      setNewClubCoachEmails([]);
      setNewClubMaxCoaches(5);
      setCoachEmailInput('');
    } catch (err) {
      console.error('Error creating club:', err);
      showFeedbackToast('Fehler beim Anlegen des Vereins.');
    } finally {
      setClubModalLoading(false);
    }
  };

  const handleStartEditClub = (club: Club) => {
    setEditingClub(club);
    setEditClubName(club.name);
    setEditClubAdminEmail(club.adminEmail);
    setEditClubLogo(club.logoUrl || '');
    setEditClubCoachEmails(club.coachEmails || []);
    setEditClubMaxCoaches(typeof club.maxCoaches === 'number' && club.maxCoaches > 0 ? club.maxCoaches : 5);
    setEditCoachEmailInput('');
  };

  const handleAddEditCoachEmail = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const email = editCoachEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!email.includes('@') || !email.includes('.')) {
      showFeedbackToast('Bitte eine gültige Trainer-E-Mail eingeben.');
      return;
    }
    if (editClubAdminEmail && email === editClubAdminEmail.trim().toLowerCase()) {
      showFeedbackToast('Diese E-Mail ist bereits als Club-Admin angegeben.');
      return;
    }
    if (editClubCoachEmails.includes(email)) {
      showFeedbackToast('Diese Trainer-E-Mail ist bereits in der Liste.');
      return;
    }
    setEditClubCoachEmails(prev => [...prev, email]);
    setEditCoachEmailInput('');
  };

  const handleRemoveEditCoachEmail = (emailToRemove: string) => {
    setEditClubCoachEmails(prev => prev.filter(e => e !== emailToRemove));
  };

  const handleUpdateClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;
    if (!editClubName.trim() || !editClubAdminEmail.trim()) {
      showFeedbackToast('Bitte Vereinsname und Admin-E-Mail angeben.');
      return;
    }

    setEditClubLoading(true);
    try {
      await editClubFull(editingClub.id, {
        name: editClubName.trim(),
        adminEmail: editClubAdminEmail.trim(),
        logoUrl: editClubLogo,
        coachEmails: editClubCoachEmails,
        maxCoaches: editClubMaxCoaches
      });
      showFeedbackToast(`Verein "${editClubName}" erfolgreich aktualisiert (${editClubMaxCoaches} Lizenzen)!`);
      setEditingClub(null);
    } catch (err) {
      console.error('Error updating club:', err);
      showFeedbackToast('Fehler beim Aktualisieren des Vereins.');
    } finally {
      setEditClubLoading(false);
    }
  };

  const handleRemoveCoachDirectly = async (clubId: string, email: string, clubName: string) => {
    if (window.confirm(`Trainer "${email}" wirklich aus dem Verein "${clubName}" entfernen?`)) {
      try {
        await removeCoachEmailFromClub(clubId, email);
        showFeedbackToast(`Trainer "${email}" aus "${clubName}" entfernt.`);
      } catch (err) {
        console.error('Error removing coach from club:', err);
        showFeedbackToast('Fehler beim Entfernen des Trainers.');
      }
    }
  };

  const handleDropUserOnClub = async (clubId: string) => {
    if (!draggingUser) return;
    try {
      const res = await assignUserToClub(clubId, draggingUser.uid, draggingUser.email);
      showFeedbackToast(res.message);
    } catch (err) {
      console.error('Error assigning user via drag & drop:', err);
      showFeedbackToast('Fehler bei der Trainerzuweisung.');
    } finally {
      setDraggingUser(null);
      setDragOverClubId(null);
    }
  };

  const handleDeleteClub = async (clubId: string, clubName: string) => {
    if (window.confirm(`Möchtest du den Verein "${clubName}" wirklich löschen? Alle verknüpften Trainer werden auf Standard-Trainer zurückgesetzt.`)) {
      try {
        await deleteClub(clubId);
        showFeedbackToast(`Verein "${clubName}" wurde gelöscht.`);
      } catch (err) {
        console.error('Error deleting club:', err);
        showFeedbackToast('Fehler beim Löschen des Vereins.');
      }
    }
  };

  // Exercise Workflow Handlers
  const handleApproveAndPublish = async (exercise: Exercise) => {
    if (!exercise.id) return;
    try {
      setActionLoading(exercise.id);
      await approveAndPublishExercise(exercise.id);
      showFeedbackToast(`Übung "${exercise.title}" wurde erfolgreich freigegeben und ist jetzt öffentlich für alle Trainer!`);
    } catch (err) {
      console.error('Error approving exercise:', err);
      alert('Fehler beim Freigeben der Übung.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async (exercise: Exercise) => {
    if (!exercise.id) return;
    try {
      setActionLoading(exercise.id);
      await toggleExercisePublishStatus(exercise.id, false);
      showFeedbackToast(`Übung "${exercise.title}" wurde auf Privat gesetzt.`);
    } catch (err) {
      console.error('Error unpublishing exercise:', err);
      alert('Fehler beim Zurücksetzen des Status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectExercise = async (exercise: Exercise) => {
    if (!exercise.id) return;
    if (window.confirm(`Möchtest du die Übung "${exercise.title}" wirklich ablehnen und in die archivierten Übungen verschieben?`)) {
      try {
        setActionLoading(exercise.id);
        await rejectExerciseInFirestore(exercise.id);
        showFeedbackToast(`Übung "${exercise.title}" wurde abgelehnt und ins Archiv verschoben.`);
      } catch (err) {
        console.error('Error rejecting exercise:', err);
        alert('Fehler beim Ablehnen der Übung.');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleRestoreExercise = async (exercise: Exercise) => {
    if (!exercise.id) return;
    try {
      setActionLoading(exercise.id);
      await restoreExerciseFromArchive(exercise.id);
      showFeedbackToast(`Übung "${exercise.title}" wurde aus dem Archiv wiederhergestellt.`);
    } catch (err) {
      console.error('Error restoring exercise:', err);
      alert('Fehler beim Wiederherstellen der Übung.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteExercise = async (id: string, title: string) => {
    if (window.confirm(`Möchtest du die Übung "${title}" wirklich unwiderruflich löschen?`)) {
      try {
        await deleteExerciseFromFirestore(id);
        showFeedbackToast(`Übung "${title}" wurde gelöscht.`);
      } catch (err) {
        console.error('Error deleting exercise:', err);
        alert('Fehler beim Löschen.');
      }
    }
  };

  // Stats calculation
  const now = Date.now();
  const stats = useMemo(() => {
    const totalUsers = users.length;
    let activeSubscribed = 0;
    let activeTrial = 0;
    let expired = 0;
    let blocked = 0;

    users.forEach(u => {
      if (u.isBlocked) {
        blocked++;
      } else if (u.subscriptionExpiresAt && u.subscriptionExpiresAt > now) {
        activeSubscribed++;
      } else if (u.trialExpiresAt && u.trialExpiresAt > now) {
        activeTrial++;
      } else {
        expired++;
      }
    });

    const activeExercisesCount = exercises.filter(e => !e.isArchived).length;
    const archivedExercisesCount = exercises.filter(e => Boolean(e.isArchived)).length;
    const publishedExercises = exercises.filter(e => e.isPublished && !e.isArchived).length;

    return { 
      totalUsers, 
      activeSubscribed, 
      activeTrial, 
      expired, 
      blocked, 
      publishedExercises,
      activeExercisesCount,
      archivedExercisesCount 
    };
  }, [users, exercises, now]);

  // Filtered lists
  const filteredUsers = useMemo(() => {
    const q = searchUser.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => 
      u.email.toLowerCase().includes(q) || 
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, searchUser]);

  const filteredExercises = useMemo(() => {
    const q = searchExercise.toLowerCase().trim();
    const list = exercises.filter(e => {
      if (exerciseSubTab === 'active') {
        return !e.isArchived;
      } else {
        return Boolean(e.isArchived);
      }
    });

    if (!q) return list;
    return list.filter(e => 
      e.title.toLowerCase().includes(q) ||
      (e.ownerEmail && e.ownerEmail.toLowerCase().includes(q)) ||
      e.category.toLowerCase().includes(q)
    );
  }, [exercises, exerciseSubTab, searchExercise]);

  const filteredClubs = useMemo(() => {
    const q = clubSearchQuery.toLowerCase().trim();
    if (!q) return clubs;
    return clubs.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.adminEmail.toLowerCase().includes(q) ||
      (c.coachEmails || []).some(e => e.toLowerCase().includes(q))
    );
  }, [clubs, clubSearchQuery]);

  const unassignedCount = useMemo(() => {
    return users.filter(u => !u.clubId && u.role !== 'master_admin' && u.role !== 'admin').length;
  }, [users]);

  const assignedCount = useMemo(() => {
    return users.filter(u => Boolean(u.clubId) && u.role !== 'master_admin' && u.role !== 'admin').length;
  }, [users]);

  const trayFilteredUsers = useMemo(() => {
    let list = users.filter(u => u.role !== 'master_admin' && u.role !== 'admin');
    if (trayUserFilter === 'unassigned') {
      list = list.filter(u => !u.clubId);
    } else if (trayUserFilter === 'assigned') {
      list = list.filter(u => Boolean(u.clubId));
    }
    const q = trayUserSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(u => 
      u.email.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.clubName && u.clubName.toLowerCase().includes(q))
    );
  }, [users, trayUserFilter, trayUserSearch]);

  // Filtered techniques for principles tab
  const filteredTechniques = useMemo(() => {
    let list = SKILL_DEFINITIONS.Technik;
    if (principlesGroupFilter !== 'all') {
      list = list.filter(t => t.group === principlesGroupFilter);
    }
    const q = principlesSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.group && t.group.toLowerCase().includes(q))
    );
  }, [principlesGroupFilter, principlesSearchQuery]);

  // Helper to resolve technique progression
  const getTechniqueProgression = (techniqueId: string, techniqueName: string) => {
    // Check for global standard progression from Firestore
    const globalDoc = progressions.find(p => 
      (p.techniqueId === techniqueId || p.techniqueName.toLowerCase() === techniqueName.toLowerCase()) && 
      p.scope === 'global' && 
      p.isStandard
    );
    if (globalDoc) {
      return {
        source: 'firestore' as const,
        progression: globalDoc
      };
    }
    // Check for seed progression
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
    const { progression } = getTechniqueProgression(techId, techName);
    return progression?.stufen || {};
  };

  const getDraftPrinciplesFor = (techId: string, techName: string): string => {
    if (draftPrinciples[techId] !== undefined) return draftPrinciples[techId];
    const { progression } = getTechniqueProgression(techId, techName);
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

  const handleSaveGlobalStandard = async (techId: string, techName: string, group?: string) => {
    try {
      setSavingTechniqueId(techId);
      const stufen = getDraftStufenFor(techId, techName);
      const principles = getDraftPrinciplesFor(techId, techName);
      await saveGlobalTechniqueStandard(
        techId,
        techName,
        group || '',
        stufen,
        principles,
        'NextLevel Akademie'
      );
      showFeedbackToast(`Akademie-Standard für "${techName}" erfolgreich gespeichert & für alle Nutzer aktiv!`);
    } catch (err) {
      console.error('Error saving global standard:', err);
      alert('Fehler beim Speichern des Standards.');
    } finally {
      setSavingTechniqueId(null);
    }
  };

  const handleClearAllStandards = async () => {
    if (window.confirm('Möchtest du wirklich ALLE derzeit gespeicherten Akademie-Standards, Vereins-Standards und Trainer-Standards für alle Techniken unwiderruflich löschen? Alle Felder werden geleert.')) {
      try {
        setActionLoading('clear_all_progressions');
        await clearAllMethodicalProgressions();
        setDraftStufen({});
        setDraftPrinciples({});
        setProgressions([]);
        showFeedbackToast('Alle Standards und methodischen Reihen wurden erfolgreich für alle Techniken gelöscht.');
      } catch (err) {
        console.error('Error clearing progressions:', err);
        showFeedbackToast('Fehler beim Löschen der Standards.');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleClearTechniqueFields = async (techId: string, techName: string) => {
    setDraftStufen(prev => ({
      ...prev,
      [techId]: {
        stufe1: '',
        stufe2: '',
        stufe3: '',
        stufe4: '',
        stufe5: '',
        stufe6: ''
      }
    }));
    setDraftPrinciples(prev => ({ ...prev, [techId]: '' }));

    const globalDoc = progressions.find(p => 
      (p.techniqueId === techId || p.techniqueName.toLowerCase() === techName.toLowerCase()) && 
      p.scope === 'global' && 
      p.isStandard
    );
    if (globalDoc) {
      await deleteMethodicalProgression(globalDoc.id);
      setProgressions(prev => prev.filter(p => p.id !== globalDoc.id));
    }
    showFeedbackToast(`Felder für "${techName}" wurden geleert.`);
  };

  const handleAdoptSubmissionAsStandard = async (submission: MethodicalProgression) => {
    if (window.confirm(`Möchtest du den Entwurf von "${submission.authorName || submission.userEmail || 'Trainer'}" als offiziellen NextLevel Akademie-Standard für "${submission.techniqueName}" festlegen?`)) {
      try {
        setSavingTechniqueId(submission.techniqueId);
        await saveGlobalTechniqueStandard(
          submission.techniqueId,
          submission.techniqueName,
          submission.group || '',
          submission.stufen,
          submission.technikprinzipien || '',
          'NextLevel Akademie'
        );
        // Update local drafts
        setDraftStufen(prev => ({ ...prev, [submission.techniqueId]: submission.stufen }));
        setDraftPrinciples(prev => ({ ...prev, [submission.techniqueId]: submission.technikprinzipien || '' }));
        showFeedbackToast(`Entwurf von "${submission.authorName || submission.userEmail}" als neuer Akademie-Standard für "${submission.techniqueName}" übernommen!`);
      } catch (err) {
        console.error('Error adopting submission:', err);
        alert('Fehler beim Übernehmen des Entwurfs.');
      } finally {
        setSavingTechniqueId(null);
      }
    }
  };

  const handleDeleteSubmission = async (progressionId: string, title: string) => {
    if (window.confirm(`Diesen Entwurf ("${title}") wirklich löschen?`)) {
      try {
        setProgressions(prev => prev.filter(p => p.id !== progressionId));
        await deleteMethodicalProgression(progressionId);
        showFeedbackToast(`Entwurf gelöscht.`);
      } catch (err) {
        console.error('Error deleting progression:', err);
        alert('Fehler beim Löschen.');
      }
    }
  };

  // Tactical Trainer submissions & unique trainers for filter
  const userTacticalSubmissions = useMemo(() => {
    return tacticalPrinciples.filter(p => p.scope === 'user' && p.userId);
  }, [tacticalPrinciples]);

  const uniqueTacticalTrainers = useMemo(() => {
    const map = new Map<string, { userId: string; name: string; email: string; count: number }>();
    userTacticalSubmissions.forEach(p => {
      if (!p.userId) return;
      const existing = map.get(p.userId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(p.userId, {
          userId: p.userId,
          name: p.authorName || p.userEmail || 'Trainer',
          email: p.userEmail || '',
          count: 1
        });
      }
    });
    return Array.from(map.values());
  }, [userTacticalSubmissions]);

  // Filtered tactics for tactic_principles tab
  const filteredTactics = useMemo(() => {
    let list = SKILL_DEFINITIONS.Taktik;
    if (tacticalGroupFilter !== 'all') {
      list = list.filter(t => t.group === tacticalGroupFilter);
    }
    if (tacticalTrainerFilter !== 'all') {
      list = list.filter(t => {
        return tacticalPrinciples.some(p => 
          p.scope === 'user' && 
          p.userId === tacticalTrainerFilter && 
          (p.tacticId === t.id || p.tacticName.toLowerCase() === t.name.toLowerCase() || 
           ((t.name.toLowerCase() === 'querpässe' || t.name.toLowerCase() === 'querpass') && (p.tacticName.toLowerCase() === 'querpass' || p.tacticName.toLowerCase() === 'querpässe')))
        );
      });
    }
    const q = tacticalSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.group && t.group.toLowerCase().includes(q))
    );
  }, [tacticalGroupFilter, tacticalTrainerFilter, tacticalPrinciples, tacticalSearchQuery]);

  // Helper to resolve tactical principle
  const getTacticProgression = (tacticId: string, tacticName: string) => {
    // Check for global standard from Firestore
    const globalDoc = tacticalPrinciples.find(p => 
      (p.tacticId === tacticId || p.tacticName.toLowerCase() === tacticName.toLowerCase()) && 
      p.scope === 'global' && 
      p.isStandard
    );
    if (globalDoc) {
      return {
        source: 'firestore' as const,
        principle: globalDoc
      };
    }
    // Check for seed template
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
    const { principle } = getTacticProgression(tacticId, tacticName);
    return principle?.taktikprinzipien || '';
  };

  const handleUpdateDraftTactic = (tacticId: string, value: string) => {
    setDraftTactics(prev => ({
      ...prev,
      [tacticId]: value
    }));
  };

  const handleSaveGlobalTacticalStandard = async (tacticId: string, tacticName: string, group?: string) => {
    try {
      setSavingTacticId(tacticId);
      const taktikprinzipien = getDraftTacticFor(tacticId, tacticName);
      await saveGlobalTacticalStandard(
        tacticId,
        tacticName,
        group || '',
        taktikprinzipien,
        'NextLevel Akademie'
      );
      showFeedbackToast(`Akademie-Standard für "${tacticName}" erfolgreich gespeichert & für alle Nutzer aktiv!`);
    } catch (err) {
      console.error('Error saving global tactical standard:', err);
      alert('Fehler beim Speichern des Taktik-Standards.');
    } finally {
      setSavingTacticId(null);
    }
  };

  const handleClearAllTacticalStandards = async () => {
    if (window.confirm('Möchtest du wirklich ALLE derzeit gespeicherten Akademie-Standards, Vereins-Standards und Trainer-Standards für alle Taktiken unwiderruflich löschen? Alle Felder werden geleert.')) {
      try {
        setActionLoading('clear_all_tactics');
        await clearAllTacticalPrinciples();
        setDraftTactics({});
        setTacticalPrinciples([]);
        showFeedbackToast('Alle Taktik-Standards wurden erfolgreich für alle Taktiken gelöscht.');
      } catch (err) {
        console.error('Error clearing tactical principles:', err);
        showFeedbackToast('Fehler beim Löschen der Taktik-Standards.');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleClearTacticFields = async (tacticId: string, tacticName: string) => {
    setDraftTactics(prev => ({ ...prev, [tacticId]: '' }));

    const globalDoc = tacticalPrinciples.find(p => 
      (p.tacticId === tacticId || p.tacticName.toLowerCase() === tacticName.toLowerCase()) && 
      p.scope === 'global' && 
      p.isStandard
    );
    if (globalDoc) {
      await deleteTacticalPrinciple(globalDoc.id);
      setTacticalPrinciples(prev => prev.filter(p => p.id !== globalDoc.id));
    }
    showFeedbackToast(`Taktikprinzipien für "${tacticName}" wurden geleert.`);
  };

  const handleAdoptTacticalSubmissionAsStandard = async (submission: TacticalPrinciple) => {
    if (window.confirm(`Möchtest du den Entwurf von "${submission.authorName || submission.userEmail || 'Trainer'}" als offiziellen NextLevel Akademie-Standard für "${submission.tacticName}" festlegen?`)) {
      try {
        setSavingTacticId(submission.tacticId);
        await saveGlobalTacticalStandard(
          submission.tacticId,
          submission.tacticName,
          submission.group || '',
          submission.taktikprinzipien || '',
          'NextLevel Akademie'
        );
        // Update local drafts
        setDraftTactics(prev => ({ ...prev, [submission.tacticId]: submission.taktikprinzipien || '' }));
        showFeedbackToast(`Entwurf von "${submission.authorName || submission.userEmail}" als neuer Akademie-Standard für "${submission.tacticName}" übernommen!`);
      } catch (err) {
        console.error('Error adopting tactical submission:', err);
        alert('Fehler beim Übernehmen des Entwurfs.');
      } finally {
        setSavingTacticId(null);
      }
    }
  };

  const handleDeleteTacticalSubmission = async (principleId: string, title: string) => {
    if (window.confirm(`Diesen Taktik-Entwurf ("${title}") wirklich löschen?`)) {
      try {
        setTacticalPrinciples(prev => prev.filter(p => p.id !== principleId));
        await deleteTacticalPrinciple(principleId);
        showFeedbackToast(`Taktik-Entwurf gelöscht.`);
      } catch (err) {
        console.error('Error deleting tactical principle:', err);
        alert('Fehler beim Löschen.');
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-rose-400 bg-rose-950/30 rounded-2xl border border-rose-900">
        <Ban className="w-12 h-12 mx-auto mb-2" />
        <h2 className="text-xl font-bold">Zugriff verweigert</h2>
        <p className="text-xs text-slate-400 mt-1">Dieser Bereich ist nur für den Haupt-Administrator zugänglich.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 sm:h-20 w-auto flex items-center justify-center flex-shrink-0">
              <img src="/Logo.png" alt="Logo" className="h-full w-auto object-contain drop-shadow-[0_4px_16px_rgba(168,85,247,0.3)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold tracking-wider uppercase mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>NextLevel Academy — Master Control</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Admin-Dashboard & Lizenzverwaltung
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Eingeloggt als Haupt-Administrator: <span className="text-purple-300 font-bold">{userProfile?.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Registrierte Trainer</span>
            </div>
            <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Aktive Pro-Abos</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">{stats.activeSubscribed}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>In 7-Tage-Test</span>
            </div>
            <div className="text-2xl font-black text-amber-400">{stats.activeTrial}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="text-slate-500 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Abgelaufen / Gesperrt</span>
            </div>
            <div className="text-2xl font-black text-rose-400">{stats.expired + stats.blocked}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
            <div className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>Freigegebene Üb.</span>
            </div>
            <div className="text-2xl font-black text-purple-400">{stats.publishedExercises} / {stats.activeExercisesCount}</div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-800 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
              activeTab === 'users'
                ? "bg-purple-950/60 text-purple-200 border-purple-500"
                : "text-slate-400 hover:text-white border-transparent"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Trainer & Lizenzen ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clubs')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
              activeTab === 'clubs'
                ? "bg-purple-950/60 text-purple-200 border-purple-500"
                : "text-slate-400 hover:text-white border-transparent"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Vereine & Partner-Clubs ({clubs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exercises')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
              activeTab === 'exercises'
                ? "bg-purple-950/60 text-purple-200 border-purple-500"
                : "text-slate-400 hover:text-white border-transparent"
            )}
          >
            <Globe className="w-4 h-4" />
            <span>Akademie-Übungen Freigabe ({stats.activeExercisesCount + stats.archivedExercisesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('principles')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
              activeTab === 'principles'
                ? "bg-purple-950/60 text-purple-200 border-purple-500"
                : "text-slate-400 hover:text-white border-transparent"
            )}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Technikprinzipien</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tactic_principles')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
              activeTab === 'tactic_principles'
                ? "bg-purple-950/60 text-purple-200 border-purple-500"
                : "text-slate-400 hover:text-white border-transparent"
            )}
          >
            <Compass className="w-4 h-4 text-purple-400" />
            <span>Taktikprinzipien</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border-b-2",
              activeTab === 'roles'
                ? "bg-purple-950/60 text-purple-200 border-purple-500"
                : "text-slate-400 hover:text-white border-transparent"
            )}
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Rollen & Rechte</span>
          </button>
        </div>
      </div>

        {/* TAB 1: USERS & LICENSES TABLE */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Trainer-Accounts & Laufzeiten</span>
              </h3>
              <button
                type="button"
                onClick={handleOpenCreateUserModal}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Benutzer anlegen</span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                placeholder="Trainer nach E-Mail suchen..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Trainer (E-Mail / Name)</th>
                  <th className="py-3 px-4">Rolle / Verein</th>
                  <th className="py-3 px-4">Lizenz-Status</th>
                  <th className="py-3 px-4">Registriert</th>
                  <th className="py-3 px-4">Gültig bis</th>
                  <th className="py-3 px-4 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-slate-900/60 text-slate-200">
                {filteredUsers.map((u) => {
                  const isSubActive = !!u.subscriptionExpiresAt && u.subscriptionExpiresAt > now;
                  const isTrialActive = !isSubActive && u.trialExpiresAt > now;
                  const trialDays = Math.max(0, Math.ceil((u.trialExpiresAt - now) / (24 * 60 * 60 * 1000)));
                  const displayName = (u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.displayName || '');

                  return (
                    <tr key={u.uid} className="hover:bg-slate-850/60 transition">
                      <td className="py-3.5 px-4 font-semibold">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-white">{u.email}</span>
                            {u.email.toLowerCase() === 'thorsten.weber7@gmail.com' && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold border border-purple-500/40">
                                Master-Admin
                              </span>
                            )}
                          </div>
                          {displayName && displayName !== u.email && (
                            <span className="text-[11px] text-slate-400 font-normal">
                              {displayName}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-bold border w-fit",
                            getRoleBadgeClass(u.role)
                          )}>
                            {getRoleLabel(u.role)}
                          </span>
                          {u.clubName && (
                            <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5" />
                              <span>{u.clubName}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.isBlocked ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 w-fit">
                            <Ban className="w-3 h-3" />
                            <span>Gesperrt</span>
                          </span>
                        ) : isSubActive ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Pro-Abo Aktiv</span>
                          </span>
                        ) : isTrialActive ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Testphase ({trialDays} T. übrig)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-950 text-rose-400 border border-rose-900/60 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Abgelaufen</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('de-DE')}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] font-medium">
                        {isSubActive && u.subscriptionExpiresAt ? (
                          <span className="text-emerald-300">{new Date(u.subscriptionExpiresAt).toLocaleDateString('de-DE')}</span>
                        ) : u.trialExpiresAt ? (
                          <span className="text-slate-400">{new Date(u.trialExpiresAt).toLocaleDateString('de-DE')}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUnlock1Year(u.uid, u.email)}
                            disabled={actionLoading === u.uid}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition flex items-center gap-1 shadow disabled:opacity-50 cursor-pointer"
                            title="Setzt subscriptionExpiresAt auf +365 Tage (Pro-Abo)"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>1 Jahr frei</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExtendTrial(u.uid, u.email, 14)}
                            disabled={actionLoading === u.uid}
                            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-amber-300 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="+14 Tage Testphase verlängern"
                          >
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>+14 Tage</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenRoleModal(u)}
                            disabled={actionLoading === u.uid || u.email.toLowerCase() === 'thorsten.weber7@gmail.com'}
                            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-purple-950/60 hover:text-purple-300 text-slate-300 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Rolle gezielt auswählen"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                            <span>Rolle</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBlock(u.uid, !!u.isBlocked, u.email)}
                            disabled={actionLoading === u.uid || u.email.toLowerCase() === 'thorsten.weber7@gmail.com'}
                            className={cn(
                              "p-1 rounded-lg border transition cursor-pointer",
                              u.isBlocked 
                                ? "bg-rose-950 border-rose-800 text-rose-300 hover:bg-rose-900" 
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            )}
                            title={u.isBlocked ? "Entsperren" : "Sperren"}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXERCISES PUBLISHING & ACADEMY MANAGEMENT */}
      {activeTab === 'exercises' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Akademie-Übungen Freigabe & Prüfungs-Center</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Klicke auf eine Übung, um sie komplett anzuschauen, zu verändern, freizugeben oder ins Archiv abzulehnen.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchExercise}
                  onChange={e => setSearchExercise(e.target.value)}
                  placeholder="Nach Titel oder Autor filtern..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Club Dashboard Toggle Switch in Akademie-Übungen Freigabe */}
          {clubs.length > 0 && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Club-Dashboard Menü-Ansicht</span>
                  <span className="text-[10px] text-slate-400">
                    {currentClub ? `Aktiver Verein im Dashboard: "${currentClub.name}"` : 'Aktuell kein Club-Dashboard im Hauptmenü aktiviert (unsichtbar)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={currentClub?.id || ''}
                  onChange={async (e) => {
                    const selectedClubId = e.target.value;
                    if (!user) return;
                    if (!selectedClubId) {
                      await setActiveClubForUser(user.uid, null, null);
                      showFeedbackToast('Club-Dashboard deaktiviert (ausgeblendet).');
                    } else {
                      const found = clubs.find(c => c.id === selectedClubId);
                      if (found) {
                        await setActiveClubForUser(user.uid, found.id, found.name);
                        showFeedbackToast(`Club-Dashboard für "${found.name}" aktiviert!`);
                      }
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-sky-300 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">-- Kein Verein gewählt (Inaktiv) --</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                  <span className="text-[10px] font-bold text-slate-400">
                    {currentClub ? 'Dashboard an' : 'Dashboard aus'}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user) return;
                      if (currentClub) {
                        await setActiveClubForUser(user.uid, null, null);
                        showFeedbackToast(`Club-Dashboard für "${currentClub.name}" deaktiviert (ausgeblendet).`);
                      } else if (clubs.length > 0) {
                        const firstClub = clubs[0];
                        await setActiveClubForUser(user.uid, firstClub.id, firstClub.name);
                        showFeedbackToast(`Club-Dashboard für "${firstClub.name}" aktiviert!`);
                      }
                    }}
                    className={cn(
                      "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      currentClub ? "bg-sky-500 shadow-md shadow-sky-500/30" : "bg-slate-800"
                    )}
                    title={currentClub ? 'Club-Dashboard deaktivieren (ausblenden)' : 'Club-Dashboard aktivieren (anzeigen)'}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        currentClub ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Navigation: Aktive Übungen vs. Archivierte Übungen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExerciseSubTab('active')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 border",
                exerciseSubTab === 'active'
                  ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/50"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Aktive Übungen (Zur Freigabe)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-950 text-purple-300 border border-purple-800/80">
                {stats.activeExercisesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExerciseSubTab('archived')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 border",
                exerciseSubTab === 'archived'
                  ? "bg-rose-900/80 text-rose-200 border-rose-600 shadow-md shadow-rose-950/50"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Archive className="w-3.5 h-3.5 text-rose-400" />
              <span>Archivierte / Abgelehnte Übungen</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800/80">
                {stats.archivedExercisesCount}
              </span>
            </button>
          </div>

          {exerciseSubTab === 'archived' && (
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-200">
              <Archive className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-300">Archivierte & abgelehnte Akademie-Übungen</h4>
                <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                  Diese Übungen wurden aus der aktiven Freigabeliste abgelehnt. Du kannst sie hier jederzeit anklicken, komplett ansehen, im Übungseditor anpassen und anschließend nachträglich für alle Trainer freigeben.
                </p>
              </div>
            </div>
          )}

          {filteredExercises.length === 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
              <Layers className="w-10 h-10 mx-auto text-slate-600 mb-1" />
              <div className="text-sm font-bold text-slate-300">Keine Übungen gefunden</div>
              <p className="text-xs text-slate-500">
                {exerciseSubTab === 'active' 
                  ? 'Aktuell liegen keine aktiven Übungen vor.' 
                  : 'Aktuell befinden sich keine Übungen im Archiv.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((exercise) => {
              const isArchived = Boolean(exercise.isArchived);
              const isPublished = Boolean(exercise.isPublished && !isArchived);

              return (
                <div
                  key={exercise.id}
                  className={cn(
                    "bg-slate-950 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all shadow-lg hover:border-slate-700 relative",
                    isArchived
                      ? "border-rose-900/60 bg-rose-950/10"
                      : isPublished
                      ? "border-emerald-500/40 bg-emerald-950/10"
                      : "border-slate-800"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold border", CATEGORY_COLORS[exercise.category]?.badge)}>
                        {exercise.category}
                      </span>
                      
                      {isArchived ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border bg-rose-950 text-rose-300 border-rose-800">
                          <Archive className="w-3 h-3 text-rose-400" />
                          <span>Abgelehnt / Archiviert</span>
                        </span>
                      ) : isPublished ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border bg-emerald-950 text-emerald-300 border-emerald-800">
                          <Globe className="w-3 h-3 text-emerald-400" />
                          <span>Öffentlich (Freigegeben)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border bg-amber-950/60 text-amber-300 border-amber-800">
                          <EyeOff className="w-3 h-3 text-amber-400" />
                          <span>Privat / Ausstehend</span>
                        </span>
                      )}
                    </div>

                    <div 
                      onClick={() => setPreviewExercise(exercise)}
                      className="relative aspect-video rounded-xl bg-slate-900 border border-slate-800 overflow-hidden cursor-pointer group flex items-center justify-center"
                      title="Klicken für Vollbild-Vorschau"
                    >
                      {(exercise.imageUrl || exercise.imageBase64) ? (
                        <img 
                          src={exercise.imageUrl || exercise.imageBase64} 
                          alt={exercise.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-600 gap-1 text-xs">
                          <Layers className="w-6 h-6" />
                          <span>Kein Taktikboard</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-xs">
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <span>Komplett ansehen</span>
                      </div>
                    </div>

                    <div>
                      <h4 
                        onClick={() => setPreviewExercise(exercise)}
                        className="text-sm font-extrabold text-white hover:text-emerald-400 cursor-pointer transition truncate"
                        title={exercise.title}
                      >
                        {exercise.title}
                      </h4>
                      
                      {(() => {
                        const ownerProfile = users.find(u => u.uid === exercise.ownerId || (u.email && exercise.ownerEmail && u.email.toLowerCase().trim() === exercise.ownerEmail.toLowerCase().trim()));
                        const ownerClubName = exercise.clubName || ownerProfile?.clubName || 'vereinslos';

                        return (
                          <div className="text-[11px] text-slate-400 space-y-0.5 mt-1">
                            <div className="truncate">
                              <span className="text-slate-500">Erstellt von: </span>
                              <span className="text-slate-200 font-semibold">{exercise.ownerEmail || 'Unbekannt'}</span>
                            </div>
                            <div className="truncate flex items-center gap-1.5">
                              <span className="text-slate-500">Verein: </span>
                              <span className={cn(
                                "font-bold",
                                ownerClubName !== 'vereinslos' ? "text-sky-300" : "text-slate-400 italic"
                              )}>
                                {ownerClubName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                              <span>{exercise.durationMinutes || 15} Min.</span>
                              <span>•</span>
                              <span>{exercise.minKeepers || 1}-{exercise.maxKeepers || 4} Torhüter</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-900 space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewExercise(exercise)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span>Anschauen</span>
                      </button>

                      {onEditExercise && (
                        <button
                          type="button"
                          onClick={() => onEditExercise(exercise)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-950/50 border border-sky-800/80 hover:bg-sky-900/60 text-sky-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Verändern</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      {isArchived ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveAndPublish(exercise)}
                            disabled={actionLoading === exercise.id}
                            className="flex-1 px-3 py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white transition shadow disabled:opacity-50"
                            title="Übung aus dem Archiv direkt für alle Trainer freigeben"
                          >
                            <Globe className="w-3.5 h-3.5 text-white" />
                            <span>Nachträglich freigeben</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRestoreExercise(exercise)}
                            disabled={actionLoading === exercise.id}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                            title="Ins Prüfungs-Center (Entwürfe) zurückholen"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {isPublished ? (
                            <button
                              type="button"
                              onClick={() => handleUnpublish(exercise)}
                              disabled={actionLoading === exercise.id}
                              className="flex-1 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 transition shadow disabled:opacity-50"
                            >
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                              <span>Auf Privat</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApproveAndPublish(exercise)}
                              disabled={actionLoading === exercise.id}
                              className="flex-1 px-3 py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white transition shadow shadow-emerald-950/60 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Freigeben</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRejectExercise(exercise)}
                            disabled={actionLoading === exercise.id}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/60 text-rose-300 text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                            title="Übung ablehnen und ins Archiv verschieben"
                          >
                            <Archive className="w-3.5 h-3.5 text-rose-400" />
                            <span>Ablehnen</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(exercise.id!, exercise.title)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="Übung endgültig löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CLUBS & ORGANIZATIONS */}
      {activeTab === 'clubs' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-400" />
                  <span>Lizenzierte Partner-Vereine & Torwartschulen ({clubs.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verwalte Vereine, bearbeite Vereinsdaten (Stiftsymbol), weise Trainer per Drag & Drop zu und behalte alle Lizenzen und E-Mails im Blick.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clubSearchQuery}
                    onChange={e => setClubSearchQuery(e.target.value)}
                    placeholder="Verein oder Admin suchen..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateClubModal(true)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-sky-950/60 flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Neuen Verein anlegen</span>
                </button>
              </div>
            </div>

            {/* DRAG & DROP TRAINER TRAY */}
            <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-2">
                      <span>Trainer per Drag & Drop zuordnen</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {trayFilteredUsers.length} verfügbar
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Ziehe eine Trainerkarte direkt auf einen Verein, um ihn sofort als lizenzierten Club-Coach zuzuweisen.
                    </p>
                  </div>
                </div>

                {/* Filter Controls & Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setTrayUserFilter('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg transition",
                        trayUserFilter === 'all'
                          ? "bg-cyan-600 text-white"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      Alle ({users.filter(u => u.role !== 'master_admin' && u.role !== 'admin').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrayUserFilter('unassigned')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg transition",
                        trayUserFilter === 'unassigned'
                          ? "bg-cyan-600 text-white"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      Nicht zugeordnet ({unassignedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrayUserFilter('assigned')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg transition",
                        trayUserFilter === 'assigned'
                          ? "bg-cyan-600 text-white"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      Im Verein ({assignedCount})
                    </button>
                  </div>

                  <div className="relative w-40 sm:w-48">
                    <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={trayUserSearch}
                      onChange={e => setTrayUserSearch(e.target.value)}
                      placeholder="Trainer filtern..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Draggable User Badges List */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 pt-1">
                {trayFilteredUsers.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-2">
                    Keine Trainer passend zu diesem Filter gefunden.
                  </div>
                ) : (
                  trayFilteredUsers.map(u => {
                    const isBeingDragged = draggingUser?.uid === u.uid;
                    const hasClub = Boolean(u.clubId);

                    return (
                      <div
                        key={u.uid}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', u.uid);
                          setDraggingUser(u);
                        }}
                        onDragEnd={() => {
                          setDraggingUser(null);
                          setDragOverClubId(null);
                        }}
                        className={cn(
                          "group cursor-grab active:cursor-grabbing select-none px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all duration-200 shadow-sm",
                          isBeingDragged
                            ? "opacity-40 border-cyan-500 scale-95"
                            : hasClub
                            ? "bg-slate-900/90 border-slate-800 hover:border-cyan-500/70 hover:bg-slate-850"
                            : "bg-cyan-950/30 border-cyan-800/60 hover:border-cyan-400 hover:bg-cyan-950/60 text-cyan-200"
                        )}
                        title={`Ziehe ${u.displayName || u.email} auf einen Verein`}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
                        <div className="text-left overflow-hidden">
                          <div className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                            {u.displayName || u.email.split('@')[0]}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px] sm:max-w-[180px]">
                            {u.email}
                          </div>
                        </div>

                        {u.clubName ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-sky-950 text-sky-300 border border-sky-800 truncate max-w-[90px]" title={u.clubName}>
                            {u.clubName}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Frei
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* CLUBS GRID */}
          {filteredClubs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <Building2 className="w-12 h-12 mx-auto text-slate-600" />
              <h4 className="text-base font-bold text-white">Keine Vereine gefunden</h4>
              <p className="text-xs text-slate-400">
                {clubs.length === 0 
                  ? 'Bisher sind noch keine Partner-Vereine angelegt.' 
                  : 'Kein Verein entspricht dem Suchbegriff.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClubs.map(c => {
                const isDragTarget = dragOverClubId === c.id;
                const isCurrentAdminRegistered = users.some(u => u.email?.toLowerCase().trim() === c.adminEmail.toLowerCase().trim());

                return (
                  <div 
                    key={c.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      if (dragOverClubId !== c.id) setDragOverClubId(c.id);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverClubId === c.id) setDragOverClubId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverClubId(null);
                      handleDropUserOnClub(c.id);
                    }}
                    className={cn(
                      "bg-slate-950 border rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all duration-300 relative",
                      isDragTarget 
                        ? "border-cyan-400 ring-4 ring-cyan-500/30 bg-cyan-950/30 scale-[1.02] shadow-cyan-950/50" 
                        : "border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <div className="space-y-3.5">
                      {/* Club Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 p-2 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                            {c.logoUrl ? (
                              <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="w-7 h-7 text-sky-400" />
                            )}
                          </div>
                          <div className="space-y-1 overflow-hidden flex-1">
                            <h4 className="font-black text-sm text-white truncate" title={c.name}>
                              {c.name}
                            </h4>
                            {(() => {
                              const maxAllowed = typeof c.maxCoaches === 'number' && c.maxCoaches > 0 ? c.maxCoaches : 5;
                              const assignedCoaches = c.coachEmails?.length || 0;
                              const isFull = assignedCoaches >= maxAllowed;

                              return (
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border",
                                  isFull 
                                    ? "bg-amber-950/80 text-amber-300 border-amber-800" 
                                    : "bg-sky-950 text-sky-300 border border-sky-800"
                                )}>
                                  <Sparkles className="w-3 h-3 text-sky-400" />
                                  <span>{assignedCoaches} / {maxAllowed} Trainer lizenziert</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Action Controls: Toggle Switch for Club Dashboard, Edit (Stiftsymbol) & Delete */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(() => {
                            const isClubActive = Boolean(userProfile?.clubId === c.id || currentClub?.id === c.id);

                            return (
                              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm">
                                <span className={cn(
                                  "text-[10px] font-bold hidden sm:inline transition-colors",
                                  isClubActive ? "text-sky-300" : "text-slate-400"
                                )}>
                                  {isClubActive ? 'Dashboard an' : 'Dashboard aus'}
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!user) return;
                                    try {
                                      if (isClubActive) {
                                        await setActiveClubForUser(user.uid, null, null);
                                        showFeedbackToast(`Club-Dashboard für "${c.name}" deaktiviert (ausgeblendet).`);
                                      } else {
                                        await setActiveClubForUser(user.uid, c.id, c.name);
                                        showFeedbackToast(`Club-Dashboard für "${c.name}" aktiviert (im Menü sichtbar)!`);
                                      }
                                    } catch (err) {
                                      console.error('Error toggling club active status:', err);
                                      showFeedbackToast('Fehler beim Ändern des Dashboard-Status.');
                                    }
                                  }}
                                  className={cn(
                                    "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                    isClubActive ? "bg-sky-500 shadow-md shadow-sky-500/30" : "bg-slate-800"
                                  )}
                                  title={isClubActive ? `Dashboard für "${c.name}" ist aktiv (sichtbar). Klicke zum Deaktivieren (Ausblenden).` : `Diesen Club im Dashboard aktivieren (Anzeigen im Menü)`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={cn(
                                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                      isClubActive ? "translate-x-4" : "translate-x-0"
                                    )}
                                  />
                                </button>
                              </div>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => handleStartEditClub(c)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-sky-400 hover:text-white hover:bg-sky-900/60 transition shadow-sm"
                            title="Verein bearbeiten (Stiftsymbol)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteClub(c.id, c.name)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition shadow-sm"
                            title="Verein löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Club-Admin Details */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-1">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          <span className="flex items-center gap-1 text-sky-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Club-Admin (Chef-Torwarttrainer)</span>
                          </span>
                          {isCurrentAdminRegistered ? (
                            <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Registriert
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] text-amber-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Vorgemerkt
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{c.adminEmail}</span>
                        </div>
                      </div>

                      {/* Coaches & E-Mail-Adressen Liste */}
                      <div className="bg-slate-900/70 border border-slate-850 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Users className="w-3.5 h-3.5" />
                            <span>Verknüpfte Torwarttrainer ({c.coachEmails?.length || 0})</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal lowercase">
                            (Club Coaches)
                          </span>
                        </div>

                        {c.coachEmails && c.coachEmails.length > 0 ? (
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {c.coachEmails.map(email => {
                              const norm = email.toLowerCase().trim();
                              const regUser = users.find(u => u.email?.toLowerCase().trim() === norm);

                              return (
                                <div 
                                  key={email}
                                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs hover:border-slate-700 transition"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    <span 
                                      className={cn(
                                        "w-2 h-2 rounded-full flex-shrink-0",
                                        regUser ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-amber-400"
                                      )}
                                      title={regUser ? "In App registriert & aktiv" : "Noch nicht registriert (vorgemerkt)"}
                                    />
                                    <div className="truncate">
                                      {regUser?.displayName && (
                                        <div className="text-[11px] font-bold text-white truncate">
                                          {regUser.displayName}
                                        </div>
                                      )}
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {email}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCoachDirectly(c.id, email, c.name)}
                                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition flex-shrink-0"
                                    title="Trainer aus Verein entfernen"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic py-1">
                            Keine weiteren Trainer verknüpft. Ziehe einen Trainer hierher oder klicke oben auf das Stiftsymbol.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Drag & Drop Target Area Footer */}
                    <div 
                      className={cn(
                        "pt-2 border-t border-slate-850 flex items-center justify-between text-[11px]",
                        isDragTarget ? "text-cyan-300 font-bold" : "text-slate-500"
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <UserPlus className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">
                          {isDragTarget ? "Jetzt ablegen zum Zuweisen!" : "Trainer hierher ziehen für Schnellzuweisung"}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-600 flex-shrink-0">
                        {c.id.substring(0, 6)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TECHNIKPRINZIPIEN & METHODISCHE REIHEN (AKADEMIE-STANDARDS) */}
      {activeTab === 'principles' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-extrabold uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  <span>Didaktik & Trainingsmethodik — Master Control</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Technikprinzipien & Methodische Reihen (Akademie-Standards)
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Definiere hier für alle 30 Torwarttechniken die offiziellen Akademie-Standards (Stufen 1–6) sowie Kern-Technikprinzipien. 
                  Sobald ein Trainer im Übungseditor in der Phase <strong>"Analytisch"</strong> eine Technik auswählt, wird der hinterlegte Standard automatisch in die Übung geladen.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Torwarttechniken</span>
                  <span className="text-lg font-black text-purple-400">{SKILL_DEFINITIONS.Technik.length}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Gespeicherte Standards</span>
                  <span className="text-lg font-black text-emerald-400">
                    {progressions.filter(p => p.scope === 'global' && p.isStandard).length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllStandards}
                  disabled={actionLoading === 'clear_all_progressions'}
                  className="px-4 py-2.5 rounded-2xl bg-rose-950/70 border border-rose-800 hover:bg-rose-900/80 text-rose-300 hover:text-white text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer"
                  title="Löscht alle gespeicherten Standards und methodischen Reihen für alle Techniken"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>{actionLoading === 'clear_all_progressions' ? 'Wird geleert...' : 'Alle Standards leeren'}</span>
                </button>
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
                    onClick={() => setPrinciplesGroupFilter(group.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition",
                      principlesGroupFilter === group.id
                        ? "bg-purple-600 text-white shadow-md shadow-purple-950/50"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {group.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={principlesSearchQuery}
                  onChange={e => setPrinciplesSearchQuery(e.target.value)}
                  placeholder="Technik nach Name durchsuchen..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Techniques Grid / List */}
          <div className="space-y-4">
            {filteredTechniques.map(tech => {
              const isExpanded = expandedTechniqueId === tech.id;
              const { source } = getTechniqueProgression(tech.id, tech.name);
              const customSubmissions = progressions.filter(p => 
                (p.techniqueId === tech.id || p.techniqueName.toLowerCase() === tech.name.toLowerCase()) && 
                p.scope !== 'global'
              );
              const draftStufenCurrent = getDraftStufenFor(tech.id, tech.name);
              const draftPrinciplesCurrent = getDraftPrinciplesFor(tech.id, tech.name);
              const isSaving = savingTechniqueId === tech.id;

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
                      <div className="w-10 h-10 rounded-2xl bg-purple-950/70 border border-purple-800 text-purple-300 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner">
                        <BookOpen className="w-5 h-5 text-purple-400" />
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
                      {source === 'firestore' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Akademie-Standard aktiv (Cloud)</span>
                        </span>
                      ) : source === 'seed' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>Standard-Vorlage</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 shadow-sm">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Kein Standard definiert</span>
                        </span>
                      )}

                      {customSubmissions.length > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800 flex items-center gap-1">
                          <Users className="w-3 h-3 text-sky-400" />
                          <span>{customSubmissions.length} Trainer-Entwurf{customSubmissions.length > 1 ? 'e' : ''}</span>
                        </span>
                      )}

                      <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Editor Body */}
                  {isExpanded && (
                    <div className="p-6 sm:p-8 border-t border-slate-800/80 bg-slate-950/40 space-y-6 animate-in fade-in duration-200">
                      <div className="p-3.5 bg-purple-950/30 border border-purple-800/50 rounded-2xl text-purple-200 text-xs flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed text-[11px]">
                          <strong>Didaktischer Standard für alle App-Nutzer:</strong> Alle Änderungen, die du hier speicherst, 
                          werden sofort als offizieller Akademie-Standard für <strong>"{tech.name}"</strong> synchronisiert. 
                          Trainer können diese Reihe mit 1 Klick im Übungseditor übernehmen oder als Basis für ihren eigenen Standard nutzen.
                        </div>
                      </div>

                      {/* Technikprinzipien Section */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-purple-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Didaktische Technikprinzipien & Coaching Points</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Kernmerkmale & Merksätze für die Ausführung
                          </span>
                        </label>
                        <textarea
                          rows={3}
                          value={draftPrinciplesCurrent}
                          onChange={e => handleUpdateDraftPrinciples(tech.id, e.target.value)}
                          placeholder="z.B. • Ballnahes Bein drückt explosiv ab&#10;• Arme greifen aktiv vor der Körperebene zu&#10;• Blickkontakt bis zur Ballsicherung halten"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                        />
                      </div>

                      {/* Methodische Reihe Stufen 1 to 6 */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 text-sky-300">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Methodische Reihe (6 Stufen)</span>
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
                                className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 focus-within:border-purple-500/80 transition"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-purple-300">
                                    <span className="w-5 h-5 rounded-lg bg-purple-950 border border-purple-800 text-[10px] flex items-center justify-center text-purple-300">
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
                                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
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
                            onClick={() => handleClearTechniqueFields(tech.id, tech.name)}
                            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-850 text-xs font-semibold text-rose-300 hover:text-rose-200 transition flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Felder leeren</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveGlobalStandard(tech.id, tech.name, tech.group)}
                          disabled={isSaving}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition shadow-lg shadow-purple-950/60 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Wird gespeichert...' : 'Als offiziellen Akademie-Standard speichern'}</span>
                        </button>
                      </div>

                      {/* Community / Coach Submissions for this technique */}
                      {customSubmissions.length > 0 && (
                        <div className="pt-4 border-t border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              <span>Eingereichte Varianten von Trainern & Partner-Clubs ({customSubmissions.length})</span>
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              Klicke auf "Übernehmen", um einen Entwurf als offiziellen Standard zu adaptieren
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {customSubmissions.map(sub => (
                              <div
                                key={sub.id}
                                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 relative group hover:border-slate-700 transition"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-white">
                                        {sub.authorName || sub.userEmail || 'Trainer'}
                                      </span>
                                      <span className={cn(
                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                        sub.scope === 'club'
                                          ? "bg-sky-950 text-sky-300 border-sky-800"
                                          : "bg-emerald-950 text-emerald-300 border-emerald-800"
                                      )}>
                                        {sub.scope === 'club' ? (sub.clubName || 'Verein') : 'Trainer-Standard'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {sub.userEmail && <span>{sub.userEmail} • </span>}
                                      <span>Aktualisiert: {new Date(sub.updatedAt).toLocaleDateString('de-DE')}</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteSubmission(sub.id, sub.techniqueName);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition cursor-pointer"
                                    title="Entwurf löschen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {sub.technikprinzipien && (
                                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-850 text-[11px] text-slate-300 font-mono line-clamp-2">
                                    {sub.technikprinzipien}
                                  </div>
                                )}

                                <div className="space-y-1 text-[11px] text-slate-400">
                                  {sub.stufen.stufe1 && <div className="line-clamp-1"><strong>Stufe 1:</strong> {sub.stufen.stufe1}</div>}
                                  {sub.stufen.stufe2 && <div className="line-clamp-1"><strong>Stufe 2:</strong> {sub.stufen.stufe2}</div>}
                                  {sub.stufen.stufe3 && <div className="line-clamp-1"><strong>Stufe 3:</strong> {sub.stufen.stufe3}</div>}
                                  {sub.stufen.stufe4 && <div className="line-clamp-1"><strong>Stufe 4:</strong> {sub.stufen.stufe4}</div>}
                                  {sub.stufen.stufe5 && <div className="line-clamp-1"><strong>Stufe 5:</strong> {sub.stufen.stufe5}</div>}
                                  {sub.stufen.stufe6 && <div className="line-clamp-1"><strong>Stufe 6:</strong> {sub.stufen.stufe6}</div>}
                                </div>

                                <div className="pt-2 border-t border-slate-850 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleAdoptSubmissionAsStandard(sub)}
                                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-md shadow-sky-950/50"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Als Akademie-Standard übernehmen</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: TAKTIKPRINZIPIEN (AKADEMIE-STANDARDS) */}
      {activeTab === 'tactic_principles' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-extrabold uppercase tracking-wider">
                  <Compass className="w-4 h-4" />
                  <span>Taktik & Entscheidungsverhalten — Master Control</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Taktikprinzipien & Coaching Points (Akademie-Standards)
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Definiere hier für alle 16 taktischen Schwerpunkte die offiziellen Akademie-Standards für Taktikprinzipien und Integrationshinweise. 
                  Sobald ein Trainer im Übungseditor in der Phase <strong>"Situativ"</strong> einen Schwerpunkt anwählt, wird der hinterlegte Standard-Textblock automatisch in die Taktikprinzipien eingefügt (und beim Abwählen wieder entfernt).
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Taktik-Schwerpunkte</span>
                  <span className="text-lg font-black text-purple-400">{SKILL_DEFINITIONS.Taktik.length}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Gespeicherte Standards</span>
                  <span className="text-lg font-black text-emerald-400">
                    {tacticalPrinciples.filter(p => p.scope === 'global' && p.isStandard).length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllTacticalStandards}
                  disabled={actionLoading === 'clear_all_tactics'}
                  className="px-4 py-2.5 rounded-2xl bg-rose-950/70 border border-rose-800 hover:bg-rose-900/80 text-rose-300 hover:text-white text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer"
                  title="Löscht alle gespeicherten Standards für alle Taktikprinzipien"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>{actionLoading === 'clear_all_tactics' ? 'Wird geleert...' : 'Alle Taktik-Standards leeren'}</span>
                </button>
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
                    onClick={() => setTacticalGroupFilter(group.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition",
                      tacticalGroupFilter === group.id
                        ? "bg-purple-600 text-white shadow-md shadow-purple-950/50"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {group.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {uniqueTacticalTrainers.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                    <User className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[11px] font-bold text-slate-400">Trainer:</span>
                    <select
                      value={tacticalTrainerFilter}
                      onChange={e => setTacticalTrainerFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-sky-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-slate-900 text-slate-200">
                        Alle Trainer ({userTacticalSubmissions.length} Vorlagen)
                      </option>
                      {uniqueTacticalTrainers.map(tr => (
                        <option key={tr.userId} value={tr.userId} className="bg-slate-900 text-slate-200">
                          {tr.name} ({tr.count} Vorlage{tr.count > 1 ? 'n' : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tacticalSearchQuery}
                    onChange={e => setTacticalSearchQuery(e.target.value)}
                    placeholder="Taktik nach Name durchsuchen..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tactics Grid / List */}
          <div className="space-y-4">
            {filteredTactics.map(tactic => {
              const isExpanded = expandedTacticId === tactic.id;
              const { source } = getTacticProgression(tactic.id, tactic.name);
              const isMatch = (p: TacticalPrinciple) => {
                if (p.tacticId === tactic.id) return true;
                const pName = p.tacticName.toLowerCase().trim();
                const tName = tactic.name.toLowerCase().trim();
                if (pName === tName) return true;
                if ((tName === 'querpässe' || tName === 'querpass') && (pName === 'querpass' || pName === 'querpässe')) return true;
                return false;
              };
              const customSubmissions = tacticalPrinciples.filter(p => 
                isMatch(p) && 
                p.scope !== 'global' &&
                (tacticalTrainerFilter === 'all' || p.userId === tacticalTrainerFilter)
              );
              const draftTacticCurrent = getDraftTacticFor(tactic.id, tactic.name);
              const isSaving = savingTacticId === tactic.id;

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
                          Taktikprinzipien & Coaching Points für situative Spielformen in der Phase "Situativ"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {source === 'firestore' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Akademie-Standard aktiv (Cloud)</span>
                        </span>
                      ) : source === 'seed' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>Standard-Vorlage</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 shadow-sm">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Kein Standard definiert</span>
                        </span>
                      )}

                      {customSubmissions.length > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800 flex items-center gap-1">
                          <Users className="w-3 h-3 text-sky-400" />
                          <span>{customSubmissions.length} Trainer-Entwurf{customSubmissions.length > 1 ? 'e' : ''}</span>
                        </span>
                      )}

                      <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Editor Body */}
                  {isExpanded && (
                    <div className="p-6 sm:p-8 border-t border-slate-800/80 bg-slate-950/40 space-y-6 animate-in fade-in duration-200">
                      <div className="p-3.5 bg-purple-950/30 border border-purple-800/50 rounded-2xl text-purple-200 text-xs flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed text-[11px]">
                          <strong>Taktischer Standard für alle App-Nutzer:</strong> Alle Prinzipien, die du hier speicherst, 
                          werden sofort als offizieller Akademie-Standard für <strong>"{tactic.name}"</strong> synchronisiert. 
                          Sobald ein Trainer im Übungseditor in der Phase <em>Situativ</em> diesen Schwerpunkt anklickt, wird dieser Textblock automatisch in das Feld "Taktikprinzipien" eingefügt.
                        </div>
                      </div>

                      {/* Taktikprinzipien Textarea */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-purple-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Taktikprinzipien & Integrationshinweise ({tactic.name})</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Coaching Points & taktisches Verhalten
                          </span>
                        </label>
                        <textarea
                          rows={6}
                          value={draftTacticCurrent}
                          onChange={e => handleUpdateDraftTactic(tactic.id, e.target.value)}
                          placeholder={`z.B. ${tactic.name}:&#10;• Grundposition dem Spielgeschehen dynamisch anpassen&#10;• Optimale Schnittstellenverteidigung gewährleisten&#10;• Schnelles Umschalten nach Ballgewinn vorbereiten`}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                        />
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleClearTacticFields(tactic.id, tactic.name)}
                            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-850 text-xs font-semibold text-rose-300 hover:text-rose-200 transition flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Felder leeren</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveGlobalTacticalStandard(tactic.id, tactic.name, tactic.group)}
                          disabled={isSaving}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition shadow-lg shadow-purple-950/60 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Wird gespeichert...' : 'Als offiziellen Akademie-Standard speichern'}</span>
                        </button>
                      </div>

                      {/* Community / Coach Submissions for this tactic */}
                      {customSubmissions.length > 0 && (
                        <div className="pt-4 border-t border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              <span>Eingereichte Varianten von Trainern & Partner-Clubs ({customSubmissions.length})</span>
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              Klicke auf "Übernehmen", um einen Entwurf als offiziellen Standard zu adaptieren
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {customSubmissions.map(sub => (
                              <div
                                key={sub.id}
                                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 relative group hover:border-slate-700 transition"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-white">
                                        {sub.authorName || sub.userEmail || 'Trainer'}
                                      </span>
                                      <span className={cn(
                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                        sub.scope === 'club'
                                          ? "bg-sky-950 text-sky-300 border-sky-800"
                                          : "bg-emerald-950 text-emerald-300 border-emerald-800"
                                      )}>
                                        {sub.scope === 'club' ? (sub.clubName || 'Verein') : 'Trainer-Standard'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {sub.userEmail && <span>{sub.userEmail} • </span>}
                                      <span>Aktualisiert: {new Date(sub.updatedAt).toLocaleDateString('de-DE')}</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteTacticalSubmission(sub.id, sub.tacticName);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition cursor-pointer"
                                    title="Entwurf löschen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {sub.taktikprinzipien && (
                                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-850 text-[11px] text-slate-300 font-mono line-clamp-4 whitespace-pre-wrap">
                                    {sub.taktikprinzipien}
                                  </div>
                                )}

                                <div className="pt-2 border-t border-slate-850 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleAdoptTacticalSubmissionAsStandard(sub)}
                                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-md shadow-sky-950/50"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Als Akademie-Standard übernehmen</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ROLES & PERMISSIONS OVERVIEW */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Berechtigungs-Architektur & Rollenkonzept</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Rollen, Rechte & Lizenzmodelle im Überblick
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              NextLevel Torwartplaner nutzt eine granulare Multi-Mandanten-Architektur. Jede Rolle verfügt über maßgeschneiderte Zugriffsrechte für Desktop-Planung, mobilen Live-Modus auf dem Platz, Orga-Dateneingabe, Leistungsdiagnostik, Periodisierung und die Zusammenarbeit im Verein.
            </p>
          </div>

          {/* Detailed Role Cards (6 Total Roles) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Master Admin Card */}
            <div className="bg-slate-900 border border-purple-900/60 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-800">
                    master_admin
                  </span>
                  <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Master-Administrator</h3>
                  <p className="text-[11px] text-purple-300 font-semibold mt-0.5">
                    NextLevel Academy-Leitung & Gesamtsystem-Kontrolle
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verfügt über uneingeschränkten Plattform- und Systemzugriff über alle Mandanten und Benutzer hinweg.
                </p>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Kern-Berechtigungen:</div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Globale Akademie-Übungen:</strong> Freigeben (<code className="text-purple-300">isPublished</code>), ablehnen oder archivieren</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Benutzer- & Rollenverwaltung:</strong> Benutzer anlegen, Rollen frei zuweisen, Lizenzen steuern, Konten sperren</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Partner-Vereine anlegen:</strong> Club-Admins ernennen und Club-Coaches verknüpfen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Vollzugriff:</strong> Planer, alle Orga-Eintragungen, Periodisierung & Live-Modus</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-medium">
                Zielgruppe: Haupt-Administrator / Inhaber
              </div>
            </div>

            {/* 2. Club Admin Card */}
            <div className="bg-slate-900 border border-sky-900/60 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-sky-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-950 text-sky-300 border border-sky-800">
                    club_admin
                  </span>
                  <Building2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Vereins-Administrator</h3>
                  <p className="text-[11px] text-sky-300 font-semibold mt-0.5">
                    Chef-Torwarttrainer / NLZ-Leiter des Partner-Vereins
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Leitet die Torwartabteilung eines Partner-Vereins und steuert Trainer, Lizenzen und Methodik.
                </p>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Kern-Berechtigungen:</div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Club-Management:</strong> Eigener Bereich "Mein Verein" zur Trainer- und Wappen-Verwaltung</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Trainerteam verwalten:</strong> Club-Coaches per E-Mail hinzufügen oder entfernen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Vereins-Übungsdatenbank:</strong> Übungen intern freigeben (<code className="text-sky-300">isClubPublished</code>)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Komplettzugriff:</strong> Planer, Periodisierung, Bewertungen, Berichte & Live-Modus</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-medium">
                Zielgruppe: Chef-Torwarttrainer & NLZ-Koordinatoren
              </div>
            </div>

            {/* 3. Club Coach Card */}
            <div className="bg-slate-900 border border-cyan-900/60 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                    club_coach
                  </span>
                  <Users className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Vereinstrainer (Club-Coach)</h3>
                  <p className="text-[11px] text-cyan-300 font-semibold mt-0.5">
                    Torwarttrainer im lizenzierten Partner-Verein
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nachwuchs- und Jugend-Torwarttrainer innerhalb des Vereins-Trainerpools (z. B. U19, U17, U15).
                </p>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Kern-Berechtigungen:</div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Voller PRO-Funktionsumfang:</strong> Desktop-Planung, Periodisierung & Live-Modus</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Doppelter Übungszugriff:</strong> Globale NextLevel-Übungen + interne Vereins-Übungen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Vollständige Orga:</strong> Gruppen, Torhüter, alle Bewertungen, Berichte & Periodisierung</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Kostenfrei lizenziert:</strong> Lizenzierung erfolgt vollständig über den Verein</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-medium">
                Zielgruppe: Jugend- & Akademie-Torwarttrainer im Verein
              </div>
            </div>

            {/* 4. Einzelnutzer PRO Card */}
            <div className="bg-slate-900 border border-emerald-900/60 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                    single_pro
                  </span>
                  <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Einzelnutzer Pro</h3>
                  <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                    Selbstständiger Trainer / Komplettzugriff
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Freie Torwarttrainer und Torwartschulen mit individuellem PRO-Abonnement.
                </p>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Kern-Berechtigungen:</div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Trainingsplaner & Live-Modus:</strong> Einheiten, Phasen, Taktikboard, Stoppuhr, RPE & PDF-Export</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Vollständige Orga & Dateneingabe:</strong> Fehlzeiten, Spielzeiten, Technik-, Taktik-, Athletik- & Mentalbewertung</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Entwicklungsberichte:</strong> Feedbackgespräche, Stärken-Schwächen-Profile & PDF-Export</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Periodisierung:</strong> Saisonplanung, Makro-, Meso- & Mikrozyklen</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-medium">
                Zielgruppe: Freie Torwarttrainer, Torwartschulen & Einzeltrainer
              </div>
            </div>

            {/* 5. Einzelnutzer Standard Card */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-slate-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950 text-slate-300 border border-slate-700">
                    single_standard
                  </span>
                  <BookOpen className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Einzelnutzer Standard</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Basis-Planung & Fehlzeiten- / Spielzeiten-Erfassung
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trainer mit Standard-Lizenz für Trainingsplanung, Spielminuten und Auswertungen.
                </p>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Berechtigungsumfang:</div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Trainingsplaner & Live-Modus:</strong> Einheiten, Taktikboard & mobiler Live-Modus</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Dateneingabe (Basis):</strong> Nur Fehlzeiten & Spielzeiten eintragen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Datenauswertung:</strong> Alle Statistiken, Diagramme & Heatmaps einsehen</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-500">
                      <Ban className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Gesperrt:</strong> Periodisierung, Technik-/Taktik-/Athletik-/Mental-Bewertungen & Entwicklungsberichte (PRO-Feature)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-medium">
                Zielgruppe: Basis-Torwarttrainer / Einsteiger
              </div>
            </div>

            {/* 6. Testnutzer (14 Tage) Card */}
            <div className="bg-slate-900 border border-amber-900/60 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800">
                    trial_user (14 Tage)
                  </span>
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Testnutzer (14 Tage)</h3>
                  <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                    14 Tage kostenloser Komplettzugriff
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Neue Benutzer erhalten ab Registrierung 14 Tage lang uneingeschränkten Vollzugriff auf alle Features.
                </p>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Test-Berechtigungen (14 Tage):</div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>14 Tage Komplettzugriff:</strong> Voller Funktionsumfang der PRO-Version</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Planer & Periodisierung:</strong> Saison-, Makro-, Meso- & Mikrozyklen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Komplette Leistungsdiagnostik:</strong> Alle Bewertungskategorien & Berichte</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>Nach Ablauf: Upgrade auf Einzelnutzer Standard / Pro oder Vereins-Zuordnung</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-medium">
                Status: 14-Tage-Testphase ab Registrierung
              </div>
            </div>
          </div>

          {/* Feature & Permission Comparison Matrix (6 Roles) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span>Berechtigungs-Matrix im direkten Vergleich</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Funktionsübersicht aller 6 Rollen auf einen Blick.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Funktion / Bereich</th>
                    <th className="py-3 px-3 text-center text-purple-300">Master-Admin</th>
                    <th className="py-3 px-3 text-center text-sky-300">Club-Admin</th>
                    <th className="py-3 px-3 text-center text-cyan-300">Club-Coach</th>
                    <th className="py-3 px-3 text-center text-emerald-300">Einzelnutzer Pro</th>
                    <th className="py-3 px-3 text-center text-slate-300">Einzelnutzer Standard</th>
                    <th className="py-3 px-3 text-center text-amber-300">Testnutzer (14 T.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Desktop-Trainingsplaner & PDF-Export</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Mobiler Live-Modus auf dem Platz (Timer, RPE, Warmup-Credit)</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Öffentliche NextLevel-Übungsdatenbank & private Bibliothek</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Orga: Trainingsgruppen & Torhüter anlegen/verwalten</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Orga Dateneingabe: Fehlzeiten erfassen & verwalten</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Orga Dateneingabe: Spielzeiten & Spielnoten erfassen</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Orga Datenauswertung: Alle Statistiken, Heatmaps & Diagramme einsehen</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-3 px-4 font-semibold text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Orga Dateneingabe: Technik-, Taktik-, Athletik- & Mentalbewertung</span>
                    </td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center" title="PRO-Feature"><Ban className="w-4 h-4 text-rose-500/70 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-3 px-4 font-semibold text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Orga Dateneingabe: Entwicklungsberichte & Feedbackgespräche</span>
                    </td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center" title="PRO-Feature"><Ban className="w-4 h-4 text-rose-500/70 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-3 px-4 font-semibold text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Orga: Periodisierung (Saison-, Makro-, Meso-, Mikrozyklen)</span>
                    </td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center" title="PRO-Feature"><Ban className="w-4 h-4 text-rose-500/70 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Vereins-Management (Club-Admins & Club-Coaches zuweisen)</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Globale Akademie-Freigabe für alle Trainer (isPublished)</td>
                    <td className="py-3 px-3 text-center"><CheckCircle2 className="w-4 h-4 text-purple-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Ban className="w-4 h-4 text-slate-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Didactic Workflow Card: Zusammenspiel Club Admin & Club Coaches */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-sky-900/50 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-extrabold uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Praxis-Leitfaden: Vereins- & Trainer-Verknüpfung</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Wie funktioniert die automatische Verknüpfung von Club Admin & Club Coaches?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="w-7 h-7 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 font-black text-xs flex items-center justify-center">
                  1
                </div>
                <h4 className="font-bold text-white text-xs">Verein & Trainer anlegen</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Im Master-Admin-Panel wird der Verein mit dem Club-Admin und beliebig vielen Trainer-E-Mails für die Club Coaches erstellt.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="w-7 h-7 rounded-xl bg-sky-950 border border-sky-800 text-sky-300 font-black text-xs flex items-center justify-center">
                  2
                </div>
                <h4 className="font-bold text-white text-xs">Automatische Zuweisung</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bestehende Trainer erhalten sofort die Rolle <code className="text-cyan-300">club_coach</code>. Noch nicht registrierte Trainer werden beim ersten Login automatisch erkannt und verknüpft.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="w-7 h-7 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 font-black text-xs flex items-center justify-center">
                  3
                </div>
                <h4 className="font-bold text-white text-xs">Club-Management für Admin</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Der Club-Admin sieht alle zugeordneten Coaches in seinem Dashboard "Mein Verein" und kann jederzeit weitere Trainer nachladen oder austauschen.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 font-black text-xs flex items-center justify-center">
                  4
                </div>
                <h4 className="font-bold text-white text-xs">Gemeinsame Übungs-DNA</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Alle Coaches des Vereins greifen auf dieselben internen Vereins-Übungen zu und können eigene Übungen beim Club-Admin zur Freigabe einreichen.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CLUB MODAL */}
      {showCreateClubModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <span>Neuen Partner-Verein anlegen</span>
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowCreateClubModal(false);
                  setNewClubCoachEmails([]);
                  setCoachEmailInput('');
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClubSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Offizieller Vereinsname *
                </label>
                <input
                  type="text"
                  value={newClubName}
                  onChange={e => setNewClubName(e.target.value)}
                  placeholder="z.B. FC Augsburg NLZ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  E-Mail des Club-Admins (Chef-Torwarttrainer) *
                </label>
                <input
                  type="email"
                  value={newClubAdminEmail}
                  onChange={e => setNewClubAdminEmail(e.target.value)}
                  placeholder="chefcoach@verein.de"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-medium"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Wichtig: Der Nutzer erhält automatisch die Rolle "Club-Admin" und kann Trainer hinzufügen sowie Übungen freigeben.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Maximal lizensierte Trainer (Kontingent) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newClubMaxCoaches}
                  onChange={e => setNewClubMaxCoaches(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-bold"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Legt fest, wie viele Trainer-Accounts diesem Verein maximal zugeordnet werden dürfen (inkl. Club-Admin).
                </p>
              </div>

              {/* Dynamic Club Coaches input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Trainer zum Verein hinzufügen (Club Coaches)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={coachEmailInput}
                    onChange={e => setCoachEmailInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCoachEmail();
                      }
                    }}
                    placeholder="trainer@verein.de"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCoachEmail()}
                    className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Diese Trainer erhalten automatisch die Rolle "Club Coach" und werden mit dem Club-Admin und dem Verein verknüpft.
                </p>

                {/* Tag List of added coach emails */}
                {newClubCoachEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 p-2.5 bg-slate-950 rounded-xl border border-slate-850 max-h-32 overflow-y-auto">
                    {newClubCoachEmails.map(email => (
                      <span 
                        key={email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-200 text-xs font-medium"
                      >
                        <UserCheck className="w-3 h-3 text-cyan-400" />
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCoachEmail(email)}
                          className="text-cyan-400 hover:text-white p-0.5 rounded hover:bg-cyan-900/60"
                          title="Entfernen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 italic mt-1.5">
                    Noch keine weiteren Trainer hinzugefügt (können auch später im Club-Dashboard ergänzt werden).
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Vereinslogo / Wappen (optional)
                </label>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onloadend = () => setNewClubLogo(r.result as string);
                    r.readAsDataURL(f);
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Wappen hochladen</span>
                  </button>
                  {newClubLogo && (
                    <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center">
                      <img src={newClubLogo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateClubModal(false);
                    setNewClubCoachEmails([]);
                    setCoachEmailInput('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={clubModalLoading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black text-white transition shadow-lg shadow-sky-950/60 disabled:opacity-50"
                >
                  {clubModalLoading ? 'Wird angelegt...' : 'Verein anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLUB MODAL (Stiftsymbol) */}
      {editingClub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-400" />
                <span>Verein "{editingClub.name}" bearbeiten</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingClub(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateClubSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Offizieller Vereinsname *
                </label>
                <input
                  type="text"
                  value={editClubName}
                  onChange={e => setEditClubName(e.target.value)}
                  placeholder="z.B. FC Augsburg NLZ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  E-Mail des Club-Admins (Chef-Torwarttrainer) *
                </label>
                <input
                  type="email"
                  value={editClubAdminEmail}
                  onChange={e => setEditClubAdminEmail(e.target.value)}
                  placeholder="chefcoach@verein.de"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-medium"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Der angegebene Nutzer ist als Chef-Torwarttrainer berechtigt, Trainer zu verwalten und vereinsinterne Übungen freizugeben.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Maximal lizensierte Trainer (Kontingent) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={editClubMaxCoaches}
                  onChange={e => setEditClubMaxCoaches(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-bold"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Legt fest, wie viele Trainer-Accounts diesem Verein maximal zugeordnet werden dürfen (inkl. Club-Admin).
                </p>
              </div>

              {/* Dynamic Club Coaches input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Verknüpfte Torwarttrainer (Club Coaches)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={editCoachEmailInput}
                    onChange={e => setEditCoachEmailInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditCoachEmail();
                      }
                    }}
                    placeholder="trainer@verein.de"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEditCoachEmail()}
                    className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Alle hier eingetragenen Trainer erhalten die Rolle "Club Coach" und vollen Zugriff über die Vereinslizenz.
                </p>

                {/* Tag List of added coach emails */}
                {editClubCoachEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 p-2.5 bg-slate-950 rounded-xl border border-slate-850 max-h-36 overflow-y-auto">
                    {editClubCoachEmails.map(email => (
                      <span 
                        key={email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-200 text-xs font-medium"
                      >
                        <UserCheck className="w-3 h-3 text-cyan-400" />
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditCoachEmail(email)}
                          className="text-cyan-400 hover:text-white p-0.5 rounded hover:bg-cyan-900/60"
                          title="Entfernen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 italic mt-1.5">
                    Noch keine weiteren Trainer zugeordnet.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Vereinslogo / Wappen (optional)
                </label>
                <input
                  type="file"
                  ref={editLogoInputRef}
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onloadend = () => setEditClubLogo(r.result as string);
                    r.readAsDataURL(f);
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editLogoInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Wappen ändern</span>
                  </button>
                  {editClubLogo && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center">
                        <img src={editClubLogo} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditClubLogo('')}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        Entfernen
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClub(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={editClubLoading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black text-white transition shadow-lg shadow-sky-950/60 disabled:opacity-50"
                >
                  {editClubLoading ? 'Wird gespeichert...' : 'Änderungen speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setShowCreateUserModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Neuen Benutzer anlegen</h3>
                <p className="text-xs text-slate-400">Erstelle ein neues Benutzerprofil mit vorkonfigurierten Rollen und Lizenzen.</p>
              </div>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Vorname
                  </label>
                  <input
                    type="text"
                    value={newUserNameFirst}
                    onChange={e => setNewUserNameFirst(e.target.value)}
                    placeholder="z.B. Max"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Nachname
                  </label>
                  <input
                    type="text"
                    value={newUserNameLast}
                    onChange={e => setNewUserNameLast(e.target.value)}
                    placeholder="z.B. Mustermann"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  E-Mail-Adresse <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="trainer@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Wenn sich der Benutzer später mit dieser E-Mail registriert, übernimmt er automatisch die hinterlegten Berechtigungen.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Rolle & Berechtigungsstufe
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="trial_user">Testnutzer (14 Tage kostenlose Nutzung gesamte App)</option>
                  <option value="single_standard">Einzelnutzer Standard (Planer & Orga-Fehl-/Spielzeiten)</option>
                  <option value="single_pro">Einzelnutzer Pro (Komplettzugriff alle Funktionen)</option>
                  <option value="club_coach">Vereinstrainer (Club-Mitglied & Trainingsplaner)</option>
                  <option value="club_admin">Vereins-Admin (Vereinsverwaltung & Club-Coaches)</option>
                  <option value="master_admin">Master Admin (Gesamtsystem-Verwaltung)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Verein zuweisen (optional)
                </label>
                <select
                  value={newUserClubId}
                  onChange={e => setNewUserClubId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Kein Verein (Einzelnutzer)</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Lizenz & Gültigkeit
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'trial_14', label: '14 Tage Test', desc: 'Ab sofort aktiv' },
                    { id: 'sub_1year', label: '1 Jahr Lizenz', desc: 'Abo freigeschaltet' },
                    { id: 'unlimited', label: 'Dauerhaft', desc: 'Kein Ablaufdatum' },
                    { id: 'expired', label: 'Inaktiv', desc: 'Abgelaufener Status' }
                  ].map(lic => (
                    <button
                      key={lic.id}
                      type="button"
                      onClick={() => setNewUserLicenseType(lic.id as any)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition text-xs",
                        newUserLicenseType === lic.id 
                          ? "bg-sky-500/10 border-sky-500 text-sky-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <div className="font-bold text-white">{lic.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{lic.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={createUserLoading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black text-white transition shadow-lg shadow-sky-950/60 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{createUserLoading ? 'Wird angelegt...' : 'Benutzer speichern'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {editingRoleUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setEditingRoleUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Rolle & Berechtigung ändern</h3>
                <p className="text-xs text-slate-400 font-mono truncate max-w-sm">{editingRoleUser.email}</p>
              </div>
            </div>

            <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto pr-1">
              {[
                { 
                  role: 'trial_user' as UserRole, 
                  label: 'Testnutzer (14 Tage)', 
                  badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                  desc: '14 Tage uneingeschränkter Testzugriff auf alle Funktionen der gesamten App.' 
                },
                { 
                  role: 'single_standard' as UserRole, 
                  label: 'Einzelnutzer Standard', 
                  badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                  desc: 'Trainingsplaner & Orga (Fehlzeiten/Spielzeiten). Detaildiagnostik & Periodisierung gesperrt.' 
                },
                { 
                  role: 'single_pro' as UserRole, 
                  label: 'Einzelnutzer Pro', 
                  badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                  desc: 'Komplettzugriff auf alle Planer-, Orga- (inkl. Diagnostik) und Periodisierungsfunktionen.' 
                },
                { 
                  role: 'club_coach' as UserRole, 
                  label: 'Vereinstrainer', 
                  badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                  desc: 'Vereinsmitglied mit Zugriff auf Vereinsübungen, Übungsdatenbank und Trainingsplaner.' 
                },
                { 
                  role: 'club_admin' as UserRole, 
                  label: 'Vereins-Admin', 
                  badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  desc: 'Volle Verwaltung des Vereins (Trainer-Zuweisung, Vereinsübungen, Spieler-Pool).' 
                },
                { 
                  role: 'master_admin' as UserRole, 
                  label: 'Master Admin', 
                  badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                  desc: 'Vollständiger administrativer Systemzugriff auf alle Clubs, Accounts und Übungen.' 
                }
              ].map(item => {
                const isSelected = selectedNewRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSelectedNewRole(item.role)}
                    className={cn(
                      "w-full p-3 rounded-xl border text-left transition flex items-start gap-3",
                      isSelected
                        ? "bg-sky-500/10 border-sky-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0",
                      isSelected ? "border-sky-500 bg-sky-500 text-white" : "border-slate-700 bg-slate-900"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.label}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", item.badge)}>
                          {item.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRoleUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSaveRoleChange}
                disabled={changeRoleLoading}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black text-white transition shadow-lg shadow-sky-950/60 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{changeRoleLoading ? 'Wird gespeichert...' : 'Rolle übernehmen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Exercise Preview Modal */}
      {previewExercise && (
        <ExerciseModal
          exercise={previewExercise}
          onClose={() => setPreviewExercise(null)}
          onEdit={onEditExercise ? (ex) => {
            setPreviewExercise(null);
            onEditExercise(ex);
          } : undefined}
        />
      )}
    </div>
  );
};
