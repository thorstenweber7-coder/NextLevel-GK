import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  onSnapshot, 
  getDocs,
  getDoc,
  query, 
  orderBy,
  where,
  type Query,
  type QuerySnapshot,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { auth, firestoreDb } from '../firebase';
import type { 
  Exercise, 
  TrainingPlan, 
  UserProfile, 
  UserRole,
  TrainingStructure,
  TrainingPhaseItem,
  Club,
  TrainingGroup,
  Player,
  PlayerAbsence,
  PlayerEvaluation,
  EvaluationCategory,
  PlayerMatchPlaytime,
  PlayerFeedbackTalk,
  MatchLocation,
  PeriodizationSeason,
  MacroPlan,
  MesoPlan,
  MicroPlan,
  PeriodizationFeedback,
  MethodicalProgression,
  MethodischeReiheStufen,
  TacticalPrinciple
} from '../types';
import { 
  DEFAULT_TRAINING_STRUCTURE, 
  PRESET_PHASE_TEMPLATES 
} from '../types';
import { SEED_EXERCISES, renderPitchDiagram, db } from '../db/database';
import { MAIN_ADMIN_EMAIL, isMainAdminEmail } from '../context/AuthContext';
import { uploadTacticsImageToStorage } from '../utils/imageUtils';
import { 
  normalizeTrainingPlan, 
  normalizeExercise, 
  normalizeMesoPlan, 
  normalizeMacroPlan, 
  normalizeTrainingGroup 
} from '../utils/schemaMigration';

export const EXERCISES_COLLECTION = 'exercises';
export const PLANS_COLLECTION = 'plans';
export const USERS_COLLECTION = 'users';
export const STRUCTURES_COLLECTION = 'training_structures';
export const CUSTOM_PHASES_COLLECTION = 'custom_phases';
export const CLUBS_COLLECTION = 'clubs';
export const TRAINING_GROUPS_COLLECTION = 'training_groups';
export const PLAYER_ABSENCES_COLLECTION = 'player_absences';
export const PLAYER_EVALUATIONS_COLLECTION = 'player_evaluations';
export const MATCH_PLAYTIMES_COLLECTION = 'match_playtimes';
export const FEEDBACK_TALKS_COLLECTION = 'feedback_talks';
export const PERIODIZATION_SEASONS_COLLECTION = 'periodization_seasons';
export const PERIODIZATION_MACRO_PLANS_COLLECTION = 'periodization_macro_plans';
export const PERIODIZATION_MESO_PLANS_COLLECTION = 'periodization_meso_plans';
export const PERIODIZATION_MICRO_PLANS_COLLECTION = 'periodization_micro_plans';

const LOCAL_STRUCTURES_PREFIX = 'nextlevel_structures_';
const LOCAL_PHASES_PREFIX = 'nextlevel_custom_phases_';
const LOCAL_GROUPS_PREFIX = 'nextlevel_training_groups_';
const LOCAL_ABSENCES_PREFIX = 'nextlevel_player_absences_';
const LOCAL_EVALUATIONS_PREFIX = 'nextlevel_player_evaluations_';
const LOCAL_MATCH_PLAYTIMES_PREFIX = 'nextlevel_match_playtimes_';
const LOCAL_FEEDBACK_TALKS_PREFIX = 'nextlevel_feedback_talks_';

export function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return undefined as any;
  }
  if (Array.isArray(obj)) {
    return obj
      .map(item => sanitizeData(item))
      .filter(item => item !== undefined) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj as Record<string, any>)) {
      if (val !== undefined) {
        const sanitizedVal = sanitizeData(val);
        if (sanitizedVal !== undefined) {
          clean[key] = sanitizedVal;
        }
      }
    }
    return clean as T;
  }
  return obj;
}

// ----------------------------------------------------------------------------
// EXERCISES MANAGEMENT (With Multi-Tenancy, Club-Level & Publishing)
// ----------------------------------------------------------------------------

/**
 * Real-time listener for exercises using Firestore Query Constraints (multi-tenant filtering):
 * - Master Admin: queries all exercises
 * - Club Admin: queries Global exercises + ALL exercises of their own club + own private
 * - Club Coach: queries Global exercises + Club-published exercises + own private
 * - User: queries Global exercises + own private
 * - Guest: queries Global exercises
 */
export function subscribeExercises(
  user: { uid: string; email?: string | null } | null,
  isAdminOrMaster: boolean,
  onData: (exercises: Exercise[]) => void,
  onError?: (error: Error) => void,
  isClubAdmin?: boolean,
  clubId?: string
): () => void {
  const unsubs: Array<() => void> = [];
  const exerciseSlices = new Map<string, Map<string, Exercise>>();

  // 0. Immediate local Dexie cache load for instant UI responsiveness
  db.exercises.toArray().then((localList) => {
    if (localList && localList.length > 0) {
      const sliceMap = new Map<string, Exercise>();
      localList.forEach((ex) => {
        const normalized = normalizeExercise(ex);
        if (isAdminOrMaster && !isClubAdmin) {
          sliceMap.set(normalized.id!, normalized);
        } else if (!normalized.isArchived) {
          sliceMap.set(normalized.id!, normalized);
        }
      });
      exerciseSlices.set('local_dexie', sliceMap);
      updateCombinedData();
    }
  }).catch((err) => {
    console.warn('Initial local exercises cache read warning:', err);
  });

  const updateCombinedData = () => {
    const combined = new Map<string, Exercise>();
    for (const sliceMap of exerciseSlices.values()) {
      for (const [id, ex] of sliceMap.entries()) {
        combined.set(id, ex);
      }
    }

    const items = Array.from(combined.values());

    // Sort by createdAt descending
    items.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return timeB - timeA;
    });

    onData(items);
  };

  const handleSnapshot = (sliceKey: string, snapshot: any) => {
    const sliceMap = new Map<string, Exercise>();
    const itemsToCache: Exercise[] = [];

    snapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      const ex: Exercise = normalizeExercise({
        ...data,
        id: docSnap.id,
        imageUrl: data.imageUrl || (data.imageBase64?.startsWith('http') ? data.imageBase64 : undefined),
        imageBase64: data.imageBase64 || data.imageUrl || ''
      });

      // Filter out archived unless Master Admin
      if (isAdminOrMaster && !isClubAdmin) {
        sliceMap.set(docSnap.id, ex);
      } else if (!ex.isArchived) {
        sliceMap.set(docSnap.id, ex);
      }
      itemsToCache.push(ex);
    });

    exerciseSlices.set(sliceKey, sliceMap);
    updateCombinedData();

    // Background sync to local Dexie database
    if (itemsToCache.length > 0) {
      db.exercises.bulkPut(itemsToCache).catch((err) => {
        console.warn('Dexie background bulkPut warning:', err);
      });
    }
  };

  const handleError = (sliceKey: string, err: any) => {
    console.warn(`Firestore exercises subscription [${sliceKey}] error:`, err);
    if (onError) onError(err);
  };

  const colRef = collection(firestoreDb, EXERCISES_COLLECTION);

  // 1. Master Admin sees everything across all tenants
  if (isAdminOrMaster && !isClubAdmin) {
    const qAll = query(colRef);
    const unsub = onSnapshot(
      qAll,
      (snap) => handleSnapshot('all', snap),
      (err) => handleError('all', err)
    );
    unsubs.push(unsub);
    return () => unsubs.forEach(u => u());
  }

  // 2. Global Published Exercises (available to everyone)
  const qPublished = query(colRef, where('isPublished', '==', true));
  unsubs.push(
    onSnapshot(
      qPublished,
      (snap) => handleSnapshot('published', snap),
      (err) => handleError('published', err)
    )
  );

  // 3. User's Own Private / Created Exercises
  if (user?.uid && user.uid !== 'guest') {
    const qOwner = query(colRef, where('ownerId', '==', user.uid));
    unsubs.push(
      onSnapshot(
        qOwner,
        (snap) => handleSnapshot('owner', snap),
        (err) => handleError('owner', err)
      )
    );
  }

  // 4. Club-Level Exercises (if user belongs to a club)
  if (clubId) {
    if (isClubAdmin) {
      // Club Admin: queries all exercises with clubId == clubId (including pending/draft reviews)
      const qClubAll = query(colRef, where('clubId', '==', clubId));
      unsubs.push(
        onSnapshot(
          qClubAll,
          (snap) => handleSnapshot('club_all', snap),
          (err) => handleError('club_all', err)
        )
      );
    } else {
      // Club Coach: queries exercises published within this club
      const qClubPub = query(
        colRef, 
        where('clubId', '==', clubId), 
        where('isClubPublished', '==', true)
      );
      unsubs.push(
        onSnapshot(
          qClubPub,
          (snap) => handleSnapshot('club_published', snap),
          (err) => handleError('club_published', err)
        )
      );
    }
  }

  return () => {
    unsubs.forEach(u => {
      try {
        u();
      } catch (e) {
        console.warn('Error unsubscribing exercise listener:', e);
      }
    });
  };
}

/**
 * Save or Update an Exercise with Club Multi-Tenancy & Firebase Storage Tactics Upload
 */
export async function saveExerciseToFirestore(
  exercise: Partial<Exercise> & { title: string; category: any; imageBase64?: string; imageUrl?: string },
  currentUser: { uid: string; email?: string | null },
  _isAdmin?: boolean,
  userClub?: { clubId?: string; clubName?: string; isClubAdmin?: boolean }
): Promise<string> {
  const exCollection = collection(firestoreDb, EXERCISES_COLLECTION);
  const docRef = exercise.id ? doc(exCollection, exercise.id) : doc(exCollection);
  
  const isCreating = !exercise.id;
  const ownerId = isCreating ? currentUser.uid : (exercise.ownerId || currentUser.uid);
  const ownerEmail = isCreating ? (currentUser.email || '') : (exercise.ownerEmail || currentUser.email || '');
  
  // isPublished & isArchived status
  const isPublished = Boolean(exercise.isPublished);
  const isArchived = Boolean(exercise.isArchived);

  // Club Association
  const clubId = exercise.clubId !== undefined ? exercise.clubId : (userClub?.clubId || null);
  const clubName = exercise.clubName !== undefined ? exercise.clubName : (userClub?.clubName || null);
  
  // If club admin creates, default to club-published unless explicitly set
  let isClubPublished = false;
  if (exercise.isClubPublished !== undefined) {
    isClubPublished = Boolean(exercise.isClubPublished);
  } else if (userClub?.isClubAdmin && clubId) {
    isClubPublished = true;
  }

  // Tactical Board Image Upload to Firebase Storage (/exercises/{id}/tactics.webp)
  let imageUrl = exercise.imageUrl || '';
  let imageBase64 = exercise.imageBase64 || '';

  if (imageBase64 && imageBase64.startsWith('data:image')) {
    try {
      const storageUrl = await uploadTacticsImageToStorage(docRef.id, imageBase64);
      if (storageUrl) {
        imageUrl = storageUrl;
        imageBase64 = storageUrl; // Save URL in imageBase64 to prevent multi-megabyte Firestore documents
      }
    } catch (storageErr) {
      console.warn('Firebase Storage upload skipped/failed (saving base64 fallback):', storageErr);
    }
  } else if (imageUrl && !imageBase64) {
    imageBase64 = imageUrl;
  } else if (imageBase64 && !imageUrl && imageBase64.startsWith('http')) {
    imageUrl = imageBase64;
  }

  const payload = sanitizeData({
    title: exercise.title || 'Ohne Titel',
    category: exercise.category,
    materials: exercise.materials || [],
    ablauf: exercise.ablauf || '',
    durationMinutes: exercise.durationMinutes || 15,
    coachingPoints: exercise.coachingPoints || '',
    minKeepers: exercise.minKeepers || 1,
    maxKeepers: exercise.maxKeepers || 4,
    minAgeGroup: exercise.minAgeGroup || 'immer',
    atSchwerpunkt: exercise.atSchwerpunkt || 'unspezifisch',
    kognition: exercise.kognition || 'nicht enthalten',
    koordinativesElement: exercise.koordinativesElement || 'nicht enthalten',
    visuellesElement: exercise.visuellesElement || 'nicht enthalten',
    warmUpSchwerpunkte: exercise.warmUpSchwerpunkte || [],
    athletikSchwerpunkt: exercise.athletikSchwerpunkt || '',
    athletischerEntwicklungsreiz: exercise.athletischerEntwicklungsreiz || '',
    technik: exercise.technik || '',
    methodischeReiheStufen: exercise.methodischeReiheStufen || {},
    technikprinzipien: exercise.technikprinzipien || '',
    situativeSchwerpunkte: exercise.situativeSchwerpunkte || [],
    situativerSchwerpunkt: exercise.situativerSchwerpunkt || '',
    taktikprinzipien: exercise.taktikprinzipien || '',
    siegbedingung: exercise.siegbedingung || '',
    canvasData: exercise.canvasData || null,
    imageUrl: imageUrl || '',
    imageBase64: imageBase64 || '',
    videoUrl: exercise.videoUrl || '',
    ownerId,
    ownerEmail,
    clubId,
    clubName,
    isClubPublished,
    isPublished,
    isArchived,
    rejectedAt: exercise.rejectedAt || null,
    rejectionReason: exercise.rejectionReason || '',
    createdAt: exercise.createdAt || Date.now(),
    updatedAt: Date.now()
  });

  // 1. Optimistic local IndexedDB save - guaranteed immediate persistence
  try {
    await db.exercises.put({ ...(payload as any), id: docRef.id });
  } catch (dexieErr) {
    console.warn('Local IndexedDB immediate save warning:', dexieErr);
  }

  // 2. Firestore Cloud Save with timeout & fallback
  try {
    const firestoreWritePromise = setDoc(docRef, payload, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout')), 4000)
    );
    await Promise.race([firestoreWritePromise, timeoutPromise]);
    return docRef.id;
  } catch (writeErr: any) {
    // If updating existing doc failed due to security rules (e.g. read-only academy template or unowned exercise)
    if (exercise.id && (writeErr?.code === 'permission-denied' || writeErr?.message?.includes('permission') || writeErr?.message?.includes('Missing or insufficient'))) {
      console.warn('Firestore update permission denied on existing doc. Cloning as private user exercise...', writeErr);
      try {
        const newDocRef = doc(exCollection);
        const clonedPayload = sanitizeData({
          ...payload,
          ownerId: currentUser.uid || 'anonymous',
          ownerEmail: currentUser.email || '',
          isPublished: false,
          isClubPublished: Boolean(userClub?.isClubAdmin),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        const cloneWritePromise = setDoc(newDocRef, clonedPayload);
        const cloneTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore clone timeout')), 4000)
        );
        await Promise.race([cloneWritePromise, cloneTimeoutPromise]);
        try {
          await db.exercises.put({ ...(clonedPayload as any), id: newDocRef.id });
        } catch (dexieErr) {
          console.warn('Local IndexedDB sync warning on fallback:', dexieErr);
        }
        return newDocRef.id;
      } catch (cloneErr) {
        console.warn('Fallback cloning to Firestore failed, local data kept:', cloneErr);
        return docRef.id;
      }
    }
    console.warn('Firestore save completed locally (Cloud sync warning):', writeErr);
    return docRef.id;
  }
}

/**
 * Toggle Exercise Publish Status within Club (Club Admin only)
 */
export async function toggleClubPublishStatus(
  exerciseId: string, 
  isClubPublished: boolean
): Promise<void> {
  const docRef = doc(firestoreDb, EXERCISES_COLLECTION, exerciseId);
  const updatePayload: any = {
    isClubPublished,
    updatedAt: Date.now()
  };
  if (isClubPublished) {
    updatePayload.rejectionReason = '';
  }
  try {
    await updateDoc(docRef, updatePayload);
  } catch (e) {
    console.warn('Firestore updateDoc warning:', e);
  }
  try {
    await db.exercises.update(exerciseId, updatePayload);
  } catch (e) {
    console.warn('Dexie update warning:', e);
  }
}

/**
 * Reject a Club Exercise with a Reason (Club Admin)
 */
export async function rejectClubExerciseInFirestore(
  exerciseId: string,
  reason: string
): Promise<void> {
  const docRef = doc(firestoreDb, EXERCISES_COLLECTION, exerciseId);
  const updatePayload = {
    isClubPublished: false,
    rejectionReason: reason || '',
    rejectedAt: Date.now(),
    updatedAt: Date.now()
  };
  try {
    await updateDoc(docRef, updatePayload);
  } catch (e) {
    console.warn('Firestore updateDoc warning:', e);
  }
  try {
    await db.exercises.update(exerciseId, updatePayload);
  } catch (e) {
    console.warn('Dexie update warning:', e);
  }
}

/**
 * Toggle Global Exercise Publish Status (Master Admin only)
 */
export async function toggleExercisePublishStatus(
  exerciseId: string, 
  isPublished: boolean
): Promise<void> {
  const docRef = doc(firestoreDb, EXERCISES_COLLECTION, exerciseId);
  const updatePayload: any = {
    isPublished,
    isArchived: false,
    updatedAt: Date.now()
  };
  if (isPublished) {
    updatePayload.rejectionReason = '';
  }
  try {
    await updateDoc(docRef, updatePayload);
  } catch (e) {
    console.warn('Firestore updateDoc warning:', e);
  }
  try {
    await db.exercises.update(exerciseId, updatePayload);
  } catch (e) {
    console.warn('Dexie update warning:', e);
  }
}

/**
 * Approve & Publish an Exercise (Admin only)
 */
export async function approveAndPublishExercise(
  exerciseId: string
): Promise<void> {
  const docRef = doc(firestoreDb, EXERCISES_COLLECTION, exerciseId);
  const updatePayload = {
    isPublished: true,
    isArchived: false,
    rejectionReason: '',
    updatedAt: Date.now()
  };
  try {
    await updateDoc(docRef, updatePayload);
  } catch (e) {
    console.warn('Firestore updateDoc warning:', e);
  }
  try {
    await db.exercises.update(exerciseId, updatePayload);
  } catch (e) {
    console.warn('Dexie update warning:', e);
  }
}

/**
 * Reject and Archive an Exercise (Admin only)
 */
export async function rejectExerciseInFirestore(
  exerciseId: string,
  reason?: string
): Promise<void> {
  const docRef = doc(firestoreDb, EXERCISES_COLLECTION, exerciseId);
  const updatePayload = {
    isArchived: true,
    isPublished: false,
    rejectedAt: Date.now(),
    rejectionReason: reason || '',
    updatedAt: Date.now()
  };
  try {
    await updateDoc(docRef, updatePayload);
  } catch (e) {
    console.warn('Firestore updateDoc warning:', e);
  }
  try {
    await db.exercises.update(exerciseId, updatePayload);
  } catch (e) {
    console.warn('Dexie update warning:', e);
  }
}

/**
 * Restore an Archived Exercise to Active Review (Admin only)
 */
export async function restoreExerciseFromArchive(
  exerciseId: string
): Promise<void> {
  const docRef = doc(firestoreDb, EXERCISES_COLLECTION, exerciseId);
  const updatePayload = {
    isArchived: false,
    updatedAt: Date.now()
  };
  try {
    await updateDoc(docRef, updatePayload);
  } catch (e) {
    console.warn('Firestore updateDoc warning:', e);
  }
  try {
    await db.exercises.update(exerciseId, updatePayload);
  } catch (e) {
    console.warn('Dexie update warning:', e);
  }
}

/**
 * Delete an Exercise
 */
export async function deleteExerciseFromFirestore(id: string): Promise<void> {
  const docRef = doc(firestoreDb, EXERCISES_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore deleteDoc warning:', e);
  }
  try {
    await db.exercises.delete(id);
  } catch (e) {
    console.warn('Dexie delete warning:', e);
  }
}

// ----------------------------------------------------------------------------
// PLANS MANAGEMENT
// ----------------------------------------------------------------------------

export function subscribeUserPlans(
  currentUser: { uid: string } | null,
  isAdmin: boolean = false,
  onData: (plans: TrainingPlan[]) => void,
  onError?: (error: Error) => void,
  clubId?: string,
  _isClubAdmin?: boolean
): () => void {
  const authUid = auth.currentUser?.uid || currentUser?.uid || 'guest';
  const localKey = `nextlevel_saved_plans_${authUid}`;

  const getLocal = (): TrainingPlan[] => {
    try {
      const saved = localStorage.getItem(localKey);
      return saved ? JSON.parse(saved).map(normalizeTrainingPlan) : [];
    } catch {
      return [];
    }
  };

  const saveLocal = (items: TrainingPlan[]) => {
    try {
      localStorage.setItem(localKey, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving local plans cache:', e);
    }
  };

  // Immediate local cache response
  onData(getLocal());

  const pCol = collection(firestoreDb, PLANS_COLLECTION);
  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, TrainingPlan>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, TrainingPlan>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((plan, id) => {
        mergedMap.set(id, plan);
      });
    });
    const items = Array.from(mergedMap.values());
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    saveLocal(items);
    onData(items);
  };

  const queries: { key: string; q: Query }[] = [];

  if (isAdmin && !clubId) {
    // Global Master Admin sees all
    queries.push({ key: 'all', q: query(pCol) });
  } else if (clubId) {
    // Club Admin & Club Coaches see all plans of the club plus own plans
    queries.push({ key: 'club', q: query(pCol, where('clubId', '==', clubId)) });
    queries.push({ key: 'owner', q: query(pCol, where('ownerId', '==', authUid)) });
  } else {
    // Single Trainer sees only own plans
    queries.push({ key: 'owner', q: query(pCol, where('ownerId', '==', authUid)) });
  }

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, TrainingPlan>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            const data = docSnap.data() as any;
            const plan: TrainingPlan = normalizeTrainingPlan({
              ...data,
              id: docSnap.id
            });
            snapMap.set(plan.id!, plan);
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore plans listener error for ${key}:`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach plans query for ${key}:`, err);
    }
  });

  return () => {
    unsubs.forEach(u => u());
  };
}

// Backward compatibility alias
export function subscribePlans(
  onData: (plans: TrainingPlan[]) => void,
  onError?: (error: Error) => void
): () => void {
  return subscribeUserPlans(auth.currentUser, false, onData, onError);
}

export async function savePlanToFirestore(
  plan: Partial<TrainingPlan>,
  currentUser?: { uid: string; email?: string | null } | null,
  clubId?: string
): Promise<string> {
  const authUid = auth.currentUser?.uid || currentUser?.uid || 'guest';
  const authEmail = auth.currentUser?.email || currentUser?.email || MAIN_ADMIN_EMAIL;
  const pCollection = collection(firestoreDb, PLANS_COLLECTION);
  const docRef = plan.id ? doc(pCollection, plan.id) : doc(pCollection);
  const targetId = docRef.id;

  const resolvedTitle = (plan.title || plan.planTitle || 'Torwart-Trainingseinheit').trim();
  const resolvedDate = plan.date || plan.planDate || new Date().toISOString().substring(0, 10);
  const resolvedPhaseExercises = plan.phaseExercises || plan.phases || {};

  const payload = sanitizeData({
    id: targetId,
    title: resolvedTitle,
    planTitle: resolvedTitle,
    date: resolvedDate,
    planDate: resolvedDate,
    trainerName: (plan.trainerName || 'Thorsten').trim(),
    targetGroup: (plan.targetGroup || 'Jugend Leistungsbereich').trim(),
    groupId: plan.groupId || undefined,
    groupName: plan.groupName || plan.targetGroup || undefined,
    availableKeepers: plan.availableKeepers || 3,
    warmUpDuration: plan.warmUpDuration,
    mainDuration: plan.mainDuration,
    structureId: plan.structureId || 'default_structure',
    structureName: plan.structureName || 'Torwart-Ausbildungsstruktur',
    phaseExercises: resolvedPhaseExercises,
    phases: resolvedPhaseExercises,
    customPlanExercises: plan.customPlanExercises || {},
    totalMinutes: plan.totalMinutes || plan.totalDuration || 60,
    totalDuration: plan.totalMinutes || plan.totalDuration || 60,
    exerciseCount: plan.exerciseCount || 0,
    notes: (plan.notes || '').trim(),
    importantNotes: (plan.importantNotes || '').trim(),
    hasVideoAnalysis: Boolean(plan.hasVideoAnalysis),
    videoAnalysisNotes: (plan.videoAnalysisNotes || '').trim(),
    jumpVolume: plan.jumpVolume || undefined,
    keeperJumpVolumes: plan.keeperJumpVolumes || {},
    keeperInsights: plan.keeperInsights || {},
    keeperLoadRatings: plan.keeperLoadRatings || {},
    keeperCompetitionScores: plan.keeperCompetitionScores || {},
    competitionTitle: (plan.competitionTitle || '').trim(),
    competitionRounds: plan.competitionRounds || [],
    liveNotes: (plan.liveNotes || '').trim(),
    exerciseExperiences: plan.exerciseExperiences || {},
    playerConversations: plan.playerConversations || {},
    debriefedAt: plan.debriefedAt,
    debriefedByTrainer: plan.debriefedByTrainer,
    debriefedByUserId: plan.debriefedByUserId,
    isArchived: Boolean(plan.isArchived),
    archivedSeasonId: plan.archivedSeasonId || undefined,
    archivedAt: plan.archivedAt || undefined,
    clubId: clubId || plan.clubId || undefined,
    ownerId: plan.ownerId || authUid,
    ownerEmail: plan.ownerEmail || authEmail,
    createdAt: plan.createdAt || Date.now(),
    updatedAt: Date.now()
  });

  // Dexie IndexedDB + LocalStorage update for fast, asynchronous, quota-free offline access
  const localKey = `nextlevel_saved_plans_${authUid}`;
  try {
    const planItem: TrainingPlan = { ...payload, id: targetId } as any;
    await db.plans.put(planItem);

    const saved = localStorage.getItem(localKey);
    const list: TrainingPlan[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex(p => p.id === targetId);
    if (idx >= 0) {
      list[idx] = planItem;
    } else {
      list.unshift(planItem);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.error('Error caching local plan in Dexie/LocalStorage:', e);
  }

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err: any) {
    console.warn('Firestore savePlan failed (saved locally):', err);
  }

  return targetId;
}

export async function deletePlanFromFirestore(
  id: string,
  currentUser?: { uid: string } | null
): Promise<void> {
  const authUid = auth.currentUser?.uid || currentUser?.uid || 'guest';
  const localKey = `nextlevel_saved_plans_${authUid}`;
  try {
    await db.plans.delete(id);
    const saved = localStorage.getItem(localKey);
    if (saved) {
      const list: TrainingPlan[] = JSON.parse(saved).filter((p: TrainingPlan) => p.id !== id);
      localStorage.setItem(localKey, JSON.stringify(list));
    }
  } catch (e) {
    console.error('Error updating local plan storage on delete in Dexie/LocalStorage:', e);
  }

  try {
    const docRef = doc(firestoreDb, PLANS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deletePlan failed:', err);
  }
}

// ----------------------------------------------------------------------------
// USER & LICENSE MANAGEMENT (Admin functions)
// ----------------------------------------------------------------------------

/**
 * Real-time listener for all user profiles (Admin only)
 */
export function subscribeAllUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(firestoreDb, USERS_COLLECTION);
  
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as UserProfile;
        items.push({
          ...d,
          uid: d.uid || docSnap.id,
          email: d.email || '',
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          displayName: d.displayName || '',
          role: d.role || 'single_standard',
          createdAt: d.createdAt || 0
        });
      });
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(items);
    },
    (err) => {
      console.error('Error subscribing to users:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Unlock 1 Year Subscription for user (Admin only)
 */
export async function unlockUserForOneYear(uid: string): Promise<void> {
  const docRef = doc(firestoreDb, USERS_COLLECTION, uid);
  const oneYearFromNow = Date.now() + 365 * 24 * 60 * 60 * 1000;
  await updateDoc(docRef, {
    subscriptionExpiresAt: oneYearFromNow,
    isBlocked: false
  });
}

/**
 * Extend trial period by days (Admin only)
 */
export async function extendUserTrial(uid: string, days: number): Promise<void> {
  const docRef = doc(firestoreDb, USERS_COLLECTION, uid);
  const newTrial = Date.now() + days * 24 * 60 * 60 * 1000;
  await updateDoc(docRef, {
    trialExpiresAt: newTrial,
    isBlocked: false
  });
}

export interface CreateUserInput {
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  clubId?: string;
  clubName?: string;
  licenseType?: 'trial_14' | 'pro_1_year' | 'lifetime' | 'standard';
}

/**
 * Create or update a user profile from Master Admin Dashboard
 */
export async function createNewUserByAdmin(input: CreateUserInput): Promise<string> {
  const normEmail = input.email.toLowerCase().trim();
  const usersCol = collection(firestoreDb, USERS_COLLECTION);
  
  // Check if a user with this email already exists
  const q = query(usersCol, where('email', '==', normEmail));
  const snap = await getDocs(q);
  
  const now = Date.now();
  let trialExpiresAt = now + 14 * 24 * 60 * 60 * 1000;
  let subscriptionExpiresAt: number | null = null;
  
  if (input.licenseType === 'pro_1_year' || input.role === 'single_pro' || input.role === 'club_admin' || input.role === 'club_coach') {
    subscriptionExpiresAt = now + 365 * 24 * 60 * 60 * 1000;
  } else if (input.licenseType === 'lifetime' || input.role === 'master_admin' || input.role === 'admin') {
    subscriptionExpiresAt = now + 3650 * 24 * 60 * 60 * 1000;
  } else if (input.licenseType === 'trial_14' || input.role === 'trial_user') {
    trialExpiresAt = now + 14 * 24 * 60 * 60 * 1000;
  }

  const fName = input.firstName?.trim() || '';
  const lName = input.lastName?.trim() || '';
  const fullName = (fName && lName) ? `${fName} ${lName}` : (normEmail.split('@')[0] || 'Trainer');

  if (!snap.empty) {
    const existingDoc = snap.docs[0];
    const updatePayload: Partial<UserProfile> = {
      firstName: fName || existingDoc.data().firstName,
      lastName: lName || existingDoc.data().lastName,
      displayName: fullName || existingDoc.data().displayName,
      role: input.role,
      clubId: input.clubId || existingDoc.data().clubId,
      clubName: input.clubName || existingDoc.data().clubName,
      trialExpiresAt: trialExpiresAt || existingDoc.data().trialExpiresAt,
      subscriptionExpiresAt: subscriptionExpiresAt !== null ? subscriptionExpiresAt : existingDoc.data().subscriptionExpiresAt,
      isBlocked: false
    };
    await updateDoc(existingDoc.ref, sanitizeData(updatePayload));
    return existingDoc.id;
  }

  const newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newProfile: UserProfile = {
    uid: newUid,
    email: normEmail,
    firstName: fName,
    lastName: lName,
    displayName: fullName,
    role: input.role,
    clubId: input.clubId,
    clubName: input.clubName,
    createdAt: now,
    trialExpiresAt,
    subscriptionExpiresAt,
    isBlocked: false,
    favoriteExerciseIds: []
  };

  const docRef = doc(firestoreDb, USERS_COLLECTION, newUid);
  await setDoc(docRef, sanitizeData(newProfile));
  return newUid;
}

/**
 * Update user role (Admin only)
 */
export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  const docRef = doc(firestoreDb, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    role: newRole
  });
}

/**
 * Toggle user blocked status (Admin only)
 */
export async function toggleUserBlockStatus(uid: string, isBlocked: boolean): Promise<void> {
  const docRef = doc(firestoreDb, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    isBlocked
  });
}

/**
 * Toggle favorite exercise for a user
 */
export async function toggleUserFavoriteExerciseInFirestore(
  uid: string,
  exerciseId: string
): Promise<string[]> {
  const localKey = `nl_user_favorites_${uid}`;
  const getStored = (): string[] => {
    try {
      const s = localStorage.getItem(localKey);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  };

  const currentLocal = getStored();
  const nextList = currentLocal.includes(exerciseId)
    ? currentLocal.filter(id => id !== exerciseId)
    : [...currentLocal, exerciseId];

  try {
    localStorage.setItem(localKey, JSON.stringify(nextList));
  } catch (e) {
    console.warn('Error saving local favorites:', e);
  }

  if (uid && uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, USERS_COLLECTION, uid);
      const snap = await getDoc(docRef);
      let currentFavs: string[] = [];
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        currentFavs = data.favoriteExerciseIds || [];
      }
      const updatedFavs = currentFavs.includes(exerciseId)
        ? currentFavs.filter(id => id !== exerciseId)
        : [...currentFavs, exerciseId];

      await setDoc(docRef, { favoriteExerciseIds: updatedFavs }, { merge: true });
      localStorage.setItem(localKey, JSON.stringify(updatedFavs));
      return updatedFavs;
    } catch (err) {
      console.warn('Firestore favorite toggle failed (cached locally):', err);
    }
  }

  return nextList;
}

// ----------------------------------------------------------------------------
// TRAINING STRUCTURES & CUSTOM PHASES MANAGEMENT
// ----------------------------------------------------------------------------

const LOCAL_FAV_STRUCTURE_KEY = 'nextlevel_fav_structure_id_';

function getLocalStructures(userId?: string): TrainingStructure[] {
  try {
    const uid = userId || 'guest';
    const key = `${LOCAL_STRUCTURES_PREFIX}${uid}`;
    const favKey = `${LOCAL_FAV_STRUCTURE_KEY}${uid}`;
    const savedFavId = localStorage.getItem(favKey);
    const raw = localStorage.getItem(key);

    let list: TrainingStructure[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed.filter(s => s.ownerId === uid || s.id === DEFAULT_TRAINING_STRUCTURE.id || s.isDefault);
      }
    }
    if (list.length === 0) {
      list = [{ ...DEFAULT_TRAINING_STRUCTURE, isFavorite: true }];
    }

    // Determine strict single favorite ID
    let chosenFavId = savedFavId && list.some(s => s.id === savedFavId) ? savedFavId : null;
    if (!chosenFavId) {
      const found = list.find(s => s.isFavorite);
      chosenFavId = found ? found.id : list[0].id;
    }

    return list.map(s => ({
      ...s,
      isFavorite: s.id === chosenFavId
    }));
  } catch (e) {
    console.warn('Error reading local structures:', e);
  }
  return [{ ...DEFAULT_TRAINING_STRUCTURE, isFavorite: true }];
}

function saveLocalStructures(userId: string | undefined, list: TrainingStructure[]) {
  try {
    const uid = userId || 'guest';
    const key = `${LOCAL_STRUCTURES_PREFIX}${uid}`;
    const favKey = `${LOCAL_FAV_STRUCTURE_KEY}${uid}`;

    // Find the single favorite
    const fav = list.find(s => s.isFavorite) || list[0];
    const favId = fav ? fav.id : DEFAULT_TRAINING_STRUCTURE.id;

    // Enforce strictly one favorite before saving
    const singleFavList = list.map(s => ({
      ...s,
      isFavorite: s.id === favId
    }));

    localStorage.setItem(key, JSON.stringify(singleFavList));
    localStorage.setItem(favKey, favId);
  } catch (e) {
    console.warn('Error saving local structures:', e);
  }
}

function getLocalPhases(userId?: string): TrainingPhaseItem[] {
  try {
    const key = `${LOCAL_PHASES_PREFIX}${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading local phases:', e);
  }
  return [...PRESET_PHASE_TEMPLATES];
}

function saveLocalPhases(userId: string | undefined, list: TrainingPhaseItem[]) {
  try {
    const key = `${LOCAL_PHASES_PREFIX}${userId || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving local phases:', e);
  }
}

async function unsetOtherFavorites(userId: string, currentFavId: string) {
  try {
    const q = query(collection(firestoreDb, STRUCTURES_COLLECTION), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    const updates: Promise<any>[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (d.id !== currentFavId && data.isFavorite) {
        updates.push(updateDoc(doc(firestoreDb, STRUCTURES_COLLECTION, d.id), { isFavorite: false, updatedAt: Date.now() }).catch(console.warn));
      }
    });
    await Promise.all(updates);
  } catch (err) {
    console.warn('Error unsetting other favorites in Firestore:', err);
  }
}

/**
 * Real-time listener for training structures
 * Returns DEFAULT_TRAINING_STRUCTURE plus all user-created structures
 */
export function subscribeUserStructures(
  user: { uid: string; email?: string | null } | null,
  onData: (structures: TrainingStructure[]) => void,
  _onError?: (error: Error) => void
): () => void {
  const uid = user?.uid || 'guest';
  // Always trigger with local cache immediately
  const localList = getLocalStructures(uid);
  onData(localList);

  if (!user?.uid || user.uid === 'guest') {
    return () => {};
  }

  const q = query(collection(firestoreDb, STRUCTURES_COLLECTION), where('ownerId', '==', user.uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const userStructures: TrainingStructure[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<TrainingStructure, 'id'>;
        userStructures.push({
          ...data,
          id: docSnap.id
        });
      });

      // Ensure Default structure is always present
      const hasDefault = userStructures.some(s => s.id === DEFAULT_TRAINING_STRUCTURE.id || s.isDefault);
      let combined: TrainingStructure[] = [];
      if (!hasDefault) {
        combined = [DEFAULT_TRAINING_STRUCTURE, ...userStructures];
      } else {
        combined = userStructures;
      }

      // Single favorite reconciliation
      const favKey = `${LOCAL_FAV_STRUCTURE_KEY}${user.uid}`;
      const savedFavId = localStorage.getItem(favKey);
      let chosenFavId = savedFavId && combined.some(s => s.id === savedFavId) ? savedFavId : null;

      if (!chosenFavId) {
        const found = combined.find(s => s.isFavorite);
        chosenFavId = found ? found.id : combined[0]?.id || DEFAULT_TRAINING_STRUCTURE.id;
      }

      // Strictly map so only chosenFavId has isFavorite = true
      combined = combined.map(s => ({
        ...s,
        isFavorite: s.id === chosenFavId
      }));

      saveLocalStructures(user.uid, combined);
      onData(combined);
    },
    (err) => {
      console.warn('Could not subscribe to structures from Firestore, falling back to local cache:', err);
      onData(getLocalStructures(user.uid));
    }
  );
}

/**
 * Save or update a TrainingStructure
 */
export async function saveStructureToFirestore(
  structure: Partial<TrainingStructure> & { name: string; phases: TrainingPhaseItem[] },
  currentUser: { uid: string; email?: string | null }
): Promise<string> {
  const authUid = auth.currentUser?.uid || currentUser.uid || 'guest';
  const isCreating = !structure.id || structure.id.startsWith('temp_');
  const targetId = isCreating ? doc(collection(firestoreDb, STRUCTURES_COLLECTION)).id : structure.id!;
  const docRef = doc(firestoreDb, STRUCTURES_COLLECTION, targetId);

  const isFav = structure.isFavorite === true;

  const payload = sanitizeData({
    name: structure.name.trim(),
    description: structure.description?.trim() || '',
    phases: structure.phases || [],
    isFavorite: isFav,
    isDefault: structure.isDefault === true,
    ownerId: structure.ownerId || authUid,
    createdAt: structure.createdAt || Date.now(),
    updatedAt: Date.now()
  });

  // Update local cache first
  const localList = getLocalStructures(authUid);
  const existingIdx = localList.findIndex(s => s.id === targetId);
  const fullObj: TrainingStructure = { ...payload, id: targetId };

  if (existingIdx >= 0) {
    localList[existingIdx] = fullObj;
  } else {
    localList.push(fullObj);
  }

  // If marked as favorite, remove favorite from all other structures
  if (isFav) {
    localList.forEach(s => {
      s.isFavorite = (s.id === targetId);
    });
  }

  saveLocalStructures(authUid, localList);

  if (isFav) {
    await unsetOtherFavorites(authUid, targetId).catch(console.warn);
  }

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err: any) {
    console.warn('Firestore sync failed for structure (saved locally):', err);
    throw err;
  }

  return targetId;
}

/**
 * Set a structure as favorite (used in Planner view)
 */
export async function setFavoriteStructure(
  structureId: string,
  currentUser: { uid: string; email?: string | null }
): Promise<void> {
  const uid = auth.currentUser?.uid || currentUser?.uid || 'guest';

  // Update local cache immediately
  const localList = getLocalStructures(uid);
  localList.forEach(s => {
    s.isFavorite = (s.id === structureId);
  });
  saveLocalStructures(uid, localList);

  if (uid !== 'guest') {
    await unsetOtherFavorites(uid, structureId);
    if (structureId !== DEFAULT_TRAINING_STRUCTURE.id) {
      const docRef = doc(firestoreDb, STRUCTURES_COLLECTION, structureId);
      await updateDoc(docRef, { isFavorite: true, updatedAt: Date.now() }).catch(console.warn);
    }
  }
}

/**
 * Delete a structure
 */
export async function deleteStructureFromFirestore(
  structureId: string,
  currentUser?: { uid: string }
): Promise<void> {
  if (structureId === DEFAULT_TRAINING_STRUCTURE.id) {
    throw new Error('Die Standard-Trainingsstruktur kann nicht gelöscht werden.');
  }
  const docRef = doc(firestoreDb, STRUCTURES_COLLECTION, structureId);
  await deleteDoc(docRef).catch(console.error);

  if (currentUser?.uid) {
    const localList = getLocalStructures(currentUser.uid).filter(s => s.id !== structureId);
    if (!localList.some(s => s.isFavorite) && localList.length > 0) {
      localList[0].isFavorite = true;
    }
    saveLocalStructures(currentUser.uid, localList);
  }
}

/**
 * Real-time listener for custom phases
 */
export function subscribeCustomPhases(
  user: { uid: string; email?: string | null } | null,
  onData: (phases: TrainingPhaseItem[]) => void
): () => void {
  const localPhases = getLocalPhases(user?.uid);
  onData(localPhases);

  if (!user?.uid) {
    return () => {};
  }

  const q = query(collection(firestoreDb, CUSTOM_PHASES_COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => {
      const fetched: TrainingPhaseItem[] = [];
      snapshot.forEach(d => {
        const data = d.data() as TrainingPhaseItem & { ownerId?: string };
        if (data.ownerId === user.uid || !data.ownerId) {
          fetched.push({ ...data, id: d.id });
        }
      });

      // Merge with default templates ensuring unique IDs
      const map = new Map<string, TrainingPhaseItem>();
      PRESET_PHASE_TEMPLATES.forEach(t => map.set(t.id, { ...t, isCustom: false }));
      fetched.forEach(f => map.set(f.id, { ...f, isCustom: true }));

      const merged = Array.from(map.values());
      saveLocalPhases(user.uid, merged);
      onData(merged);
    },
    (err) => {
      console.warn('Could not subscribe to custom phases from Firestore:', err);
      onData(getLocalPhases(user.uid));
    }
  );
}

/**
 * Save custom phase
 */
export async function saveCustomPhaseToFirestore(
  phase: Omit<TrainingPhaseItem, 'id'> & { id?: string },
  currentUser: { uid: string; email?: string | null }
): Promise<string> {
  const authUid = auth.currentUser?.uid || currentUser.uid || 'guest';
  const targetId = phase.id || doc(collection(firestoreDb, CUSTOM_PHASES_COLLECTION)).id;
  const docRef = doc(firestoreDb, CUSTOM_PHASES_COLLECTION, targetId);

  const payload = sanitizeData({
    ...phase,
    ownerId: authUid,
    isCustom: true,
    updatedAt: Date.now()
  });

  // Always save locally first so user data is immediately available
  const list = getLocalPhases(authUid);
  const existingIdx = list.findIndex(p => p.id === targetId);
  const fullObj: TrainingPhaseItem = { ...phase, id: targetId, isCustom: true };
  if (existingIdx >= 0) {
    list[existingIdx] = fullObj;
  } else {
    list.push(fullObj);
  }
  saveLocalPhases(authUid, list);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err: any) {
    console.warn('Firestore sync failed for custom phase (saved locally):', err);
    throw err;
  }

  return targetId;
}

/**
 * Delete custom phase
 */
export async function deleteCustomPhaseFromFirestore(
  phaseId: string,
  currentUser?: { uid: string }
): Promise<void> {
  const authUid = auth.currentUser?.uid || currentUser?.uid || 'guest';
  const list = getLocalPhases(authUid).filter(p => p.id !== phaseId);
  saveLocalPhases(authUid, list);

  try {
    const docRef = doc(firestoreDb, CUSTOM_PHASES_COLLECTION, phaseId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('Firestore delete failed for custom phase (deleted locally):', err);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// INITIAL SEEDING
// ----------------------------------------------------------------------------

export async function initAndSeedFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(firestoreDb, EXERCISES_COLLECTION));
    if (snap.empty) {
      console.log('Firestore is empty. Seeding default NextLevel exercises...');

      for (const item of SEED_EXERCISES) {
        let imageBase64 = item.imageBase64;
        if (!imageBase64 && item.canvasData) {
          imageBase64 = renderPitchDiagram(item.canvasData.elements, item.canvasData.width, item.canvasData.height);
        }

        const newDocRef = doc(collection(firestoreDb, EXERCISES_COLLECTION));
        const payload = sanitizeData({
          ...item,
          imageBase64: imageBase64 || '',
          ownerId: 'admin_seed',
          ownerEmail: MAIN_ADMIN_EMAIL,
          isPublished: true, // Seed exercises are published by default
          createdAt: item.createdAt || Date.now()
        });
        await setDoc(newDocRef, payload);
      }
      console.log('Seeding complete!');
    }
  } catch (err) {
    console.error('Error initializing Cloud Firestore:', err);
  }
}

// ----------------------------------------------------------------------------
// CLUB & MULTI-COACH MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * Real-time listener for all Clubs (Master-Admin only)
 */
export function subscribeClubs(
  onData: (clubs: Club[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(firestoreDb, CLUBS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Club[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as Club);
      });
      onData(items);
    },
    (err) => {
      console.error('Error subscribing to clubs:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for a single Club
 */
export function subscribeClub(
  clubId: string,
  onData: (club: Club | null) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(firestoreDb, CLUBS_COLLECTION, clubId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData({ ...docSnap.data(), id: docSnap.id } as Club);
      } else {
        onData(null);
      }
    },
    (err) => {
      console.error('Error subscribing to club:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new Club (Master-Admin only)
 */
export async function createClub(
  name: string,
  adminEmail: string,
  logoUrl?: string,
  initialCoachEmails: string[] = [],
  maxCoaches: number = 5
): Promise<string> {
  const clubsCol = collection(firestoreDb, CLUBS_COLLECTION);
  const newClubRef = doc(clubsCol);
  const clubId = newClubRef.id;

  const cleanAdminEmail = adminEmail.toLowerCase().trim();
  const cleanCoachEmails = initialCoachEmails
    .map(e => e.toLowerCase().trim())
    .filter(e => e && e !== cleanAdminEmail);
  const uniqueCoachEmails = Array.from(new Set(cleanCoachEmails));

  // Find user by adminEmail if exists
  const usersQuery = query(collection(firestoreDb, USERS_COLLECTION));
  const usersSnap = await getDocs(usersQuery);
  let adminUid = '';
  const coachUids: string[] = [];

  usersSnap.forEach(d => {
    const u = d.data() as UserProfile;
    const userEmail = u.email?.toLowerCase().trim();
    if (userEmail === cleanAdminEmail) {
      adminUid = d.id;
    } else if (userEmail && uniqueCoachEmails.includes(userEmail)) {
      coachUids.push(d.id);
    }
  });

  const resolvedMaxCoaches = typeof maxCoaches === 'number' && maxCoaches > 0 ? maxCoaches : 5;

  const clubData: Omit<Club, 'id'> = {
    name: name.trim(),
    logoUrl: logoUrl || '',
    adminUid: adminUid || '',
    adminEmail: cleanAdminEmail,
    coachUids,
    coachEmails: uniqueCoachEmails,
    maxCoaches: resolvedMaxCoaches,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await setDoc(newClubRef, sanitizeData(clubData));

  // If admin user already exists in users collection, update their role to club_admin (keep master_admin if Master Admin)
  if (adminUid) {
    const userDocRef = doc(firestoreDb, USERS_COLLECTION, adminUid);
    const uSnap = await getDoc(userDocRef);
    const isMaster = uSnap.exists() && (uSnap.data().role === 'master_admin' || uSnap.data().role === 'admin' || isMainAdminEmail(uSnap.data().email));
    await updateDoc(userDocRef, {
      role: isMaster ? 'master_admin' : 'club_admin',
      clubId,
      clubName: name.trim()
    });
  }

  // If any initial coach users already exist, update their roles to club_coach (keep master_admin if Master Admin)
  for (const coachUid of coachUids) {
    try {
      const userDocRef = doc(firestoreDb, USERS_COLLECTION, coachUid);
      const uSnap = await getDoc(userDocRef);
      const isMaster = uSnap.exists() && (uSnap.data().role === 'master_admin' || uSnap.data().role === 'admin' || isMainAdminEmail(uSnap.data().email));
      await updateDoc(userDocRef, {
        role: isMaster ? 'master_admin' : 'club_coach',
        clubId,
        clubName: name.trim()
      });
    } catch (e) {
      console.warn(`Could not set club_coach role for ${coachUid}:`, e);
    }
  }

  return clubId;
}

/**
 * Update Club Profile (Master-Admin or Club-Admin)
 */
export async function updateClub(
  clubId: string,
  updates: Partial<Club>
): Promise<void> {
  const docRef = doc(firestoreDb, CLUBS_COLLECTION, clubId);
  await updateDoc(docRef, sanitizeData({
    ...updates,
    updatedAt: Date.now()
  }));

  // If name was updated, sync clubName to all members
  if (updates.name) {
    const clubSnap = await getDoc(docRef);
    if (clubSnap.exists()) {
      const club = clubSnap.data() as Club;
      const allMemberUids = [club.adminUid, ...(club.coachUids || [])].filter(Boolean);
      for (const uid of allMemberUids) {
        try {
          const userRef = doc(firestoreDb, USERS_COLLECTION, uid);
          await updateDoc(userRef, { clubName: updates.name });
        } catch (e) {
          console.warn(`Could not sync clubName to user ${uid}:`, e);
        }
      }
    }
  }
}

/**
 * Delete a Club (Master-Admin only)
 */
export async function deleteClub(clubId: string): Promise<void> {
  const docRef = doc(firestoreDb, CLUBS_COLLECTION, clubId);
  const clubSnap = await getDoc(docRef);
  
  if (clubSnap.exists()) {
    const club = clubSnap.data() as Club;
    const allMemberUids = [club.adminUid, ...(club.coachUids || [])].filter(Boolean);
    
    for (const uid of allMemberUids) {
      try {
        const userRef = doc(firestoreDb, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
          role: 'user',
          clubId: null,
          clubName: null
        });
      } catch (e) {
        console.warn(`Could not reset user ${uid} on club deletion:`, e);
      }
    }
  }

  await deleteDoc(docRef);
}

/**
 * Add a Coach to a Club by Email (Club-Admin or Master-Admin)
 */
export async function addCoachToClub(
  clubId: string,
  coachEmail: string
): Promise<{ success: boolean; message: string }> {
  const normEmail = coachEmail.toLowerCase().trim();
  const clubRef = doc(firestoreDb, CLUBS_COLLECTION, clubId);
  const clubSnap = await getDoc(clubRef);

  if (!clubSnap.exists()) {
    return { success: false, message: 'Verein nicht gefunden.' };
  }

  const club = clubSnap.data() as Club;
  const currentCoachUids = club.coachUids || [];
  const currentCoachEmails = club.coachEmails || [];
  const maxAllowed = typeof club.maxCoaches === 'number' && club.maxCoaches > 0 ? club.maxCoaches : 5;

  if (currentCoachEmails.length >= maxAllowed) {
    return {
      success: false,
      message: `Lizenzlimit erreicht: Dieser Verein verfügt über maximal ${maxAllowed} Trainer-Lizenzen (${currentCoachEmails.length}/${maxAllowed} belegt). Kontaktiere die NextLevel Academy für weitere Lizenzen.`
    };
  }

  if (currentCoachEmails.includes(normEmail)) {
    return { success: false, message: 'Dieser Trainer ist bereits im Verein eingetragen oder vorgemerkt.' };
  }
  
  // Find user with this email in users collection
  const usersQuery = query(collection(firestoreDb, USERS_COLLECTION));
  const usersSnap = await getDocs(usersQuery);
  let targetUser: UserProfile | null = null;

  usersSnap.forEach(d => {
    const u = d.data() as UserProfile;
    if (u.email?.toLowerCase().trim() === normEmail) {
      targetUser = u;
    }
  });

  if (!targetUser) {
    // Coach is not yet registered in app -> Add to club's coachEmails list for automatic linking upon registration
    await updateDoc(clubRef, {
      coachEmails: Array.from(new Set([...currentCoachEmails, normEmail])),
      updatedAt: Date.now()
    });
    return { 
      success: true, 
      message: `Trainer "${normEmail}" erfolgreich vorgemerkt. Sobald sich der Trainer registriert, wird er automatisch als Club Coach zugeordnet.` 
    };
  }

  const coachUid = (targetUser as UserProfile).uid;

  if (currentCoachUids.includes(coachUid)) {
    return { success: false, message: 'Dieser Trainer ist bereits Mitglied des Vereins.' };
  }

  // Update User Profile
  const userRef = doc(firestoreDb, USERS_COLLECTION, coachUid);
  await updateDoc(userRef, {
    role: 'club_coach',
    clubId,
    clubName: club.name
  });

  // Update Club Document
  await updateDoc(clubRef, {
    coachUids: [...currentCoachUids, coachUid],
    coachEmails: Array.from(new Set([...currentCoachEmails, normEmail])),
    updatedAt: Date.now()
  });

  return { success: true, message: `Trainer ${normEmail} erfolgreich zu "${club.name}" hinzugefügt!` };
}

/**
 * Remove a Coach from a Club by UID (Club-Admin or Master-Admin)
 */
export async function removeCoachFromClub(
  clubId: string,
  coachUid: string
): Promise<void> {
  const clubRef = doc(firestoreDb, CLUBS_COLLECTION, clubId);
  const clubSnap = await getDoc(clubRef);

  if (clubSnap.exists()) {
    const club = clubSnap.data() as Club;
    const updatedUids = (club.coachUids || []).filter(id => id !== coachUid);
    
    // Find email of this user to remove from coachEmails
    let userEmail = '';
    try {
      const userRef = doc(firestoreDb, USERS_COLLECTION, coachUid);
      const uSnap = await getDoc(userRef);
      if (uSnap.exists()) {
        userEmail = (uSnap.data() as UserProfile).email || '';
        await updateDoc(userRef, {
          role: 'user',
          clubId: null,
          clubName: null
        });
      }
    } catch (e) {
      console.warn(`Could not reset user profile for ${coachUid}:`, e);
    }

    const updatedEmails = (club.coachEmails || []).filter(em => em.toLowerCase() !== userEmail.toLowerCase());

    await updateDoc(clubRef, {
      coachUids: updatedUids,
      coachEmails: updatedEmails,
      updatedAt: Date.now()
    });
  }
}

/**
 * Remove a coach by email from a Club (Club-Admin or Master-Admin)
 */
export async function removeCoachEmailFromClub(
  clubId: string,
  coachEmail: string
): Promise<void> {
  const normEmail = coachEmail.toLowerCase().trim();
  const clubRef = doc(firestoreDb, CLUBS_COLLECTION, clubId);
  const clubSnap = await getDoc(clubRef);

  if (!clubSnap.exists()) return;

  const club = clubSnap.data() as Club;
  const updatedEmails = (club.coachEmails || []).filter(em => em.toLowerCase().trim() !== normEmail);

  // Find user by email to reset role if registered
  const usersQuery = query(collection(firestoreDb, USERS_COLLECTION));
  const usersSnap = await getDocs(usersQuery);
  let coachUidToRemove = '';

  usersSnap.forEach(d => {
    const u = d.data() as UserProfile;
    if (u.email?.toLowerCase().trim() === normEmail) {
      coachUidToRemove = d.id;
    }
  });

  if (coachUidToRemove) {
    try {
      const userRef = doc(firestoreDb, USERS_COLLECTION, coachUidToRemove);
      await updateDoc(userRef, {
        role: 'user',
        clubId: null,
        clubName: null
      });
    } catch (e) {
      console.warn(`Could not reset user profile for ${coachUidToRemove}:`, e);
    }
  }

  const updatedUids = coachUidToRemove 
    ? (club.coachUids || []).filter(id => id !== coachUidToRemove)
    : (club.coachUids || []);

  await updateDoc(clubRef, {
    coachUids: updatedUids,
    coachEmails: updatedEmails,
    updatedAt: Date.now()
  });
}

/**
 * Assign a registered User to a Club as Club-Coach (Drag & Drop or Direct Selection)
 */
export async function assignUserToClub(
  clubId: string,
  userUid: string,
  userEmail: string
): Promise<{ success: boolean; message: string }> {
  const normEmail = userEmail.toLowerCase().trim();
  const targetClubRef = doc(firestoreDb, CLUBS_COLLECTION, clubId);
  const targetClubSnap = await getDoc(targetClubRef);

  if (!targetClubSnap.exists()) {
    return { success: false, message: 'Ziel-Verein nicht gefunden.' };
  }

  const targetClub = targetClubSnap.data() as Club;
  const maxAllowed = typeof targetClub.maxCoaches === 'number' && targetClub.maxCoaches > 0 ? targetClub.maxCoaches : 5;

  // Check if already admin of this club
  if (targetClub.adminEmail?.toLowerCase().trim() === normEmail || targetClub.adminUid === userUid) {
    return { success: false, message: `Trainer ${normEmail} ist bereits Club-Admin von "${targetClub.name}".` };
  }

  // Check if already coach of this club
  if ((targetClub.coachEmails || []).some(e => e.toLowerCase().trim() === normEmail) || (targetClub.coachUids || []).includes(userUid)) {
    return { success: false, message: `Trainer ${normEmail} ist bereits Club-Coach bei "${targetClub.name}".` };
  }

  // Check license limit
  if ((targetClub.coachEmails?.length || 0) >= maxAllowed) {
    return {
      success: false,
      message: `Lizenzlimit erreicht: "${targetClub.name}" hat bereits alle ${maxAllowed} Trainer-Lizenzen vergeben.`
    };
  }

  // If user was previously assigned to another club, remove them from that club
  const allClubsQuery = query(collection(firestoreDb, CLUBS_COLLECTION));
  const allClubsSnap = await getDocs(allClubsQuery);

  for (const cDoc of allClubsSnap.docs) {
    if (cDoc.id === clubId) continue;
    const cData = cDoc.data() as Club;
    const hasEmail = (cData.coachEmails || []).some(e => e.toLowerCase().trim() === normEmail);
    const hasUid = (cData.coachUids || []).includes(userUid);

    if (hasEmail || hasUid) {
      const updatedUids = (cData.coachUids || []).filter(id => id !== userUid);
      const updatedEmails = (cData.coachEmails || []).filter(e => e.toLowerCase().trim() !== normEmail);
      await updateDoc(doc(firestoreDb, CLUBS_COLLECTION, cDoc.id), {
        coachUids: updatedUids,
        coachEmails: updatedEmails,
        updatedAt: Date.now()
      });
    }
  }

  // Update target user profile (preserve master_admin role)
  const userRef = doc(firestoreDb, USERS_COLLECTION, userUid);
  const uSnap = await getDoc(userRef);
  const isMaster = uSnap.exists() && (uSnap.data().role === 'master_admin' || uSnap.data().role === 'admin' || isMainAdminEmail(uSnap.data().email));
  await updateDoc(userRef, {
    role: isMaster ? 'master_admin' : 'club_coach',
    clubId,
    clubName: targetClub.name
  });

  // Update target club
  const updatedCoachUids = Array.from(new Set([...(targetClub.coachUids || []), userUid]));
  const updatedCoachEmails = Array.from(new Set([...(targetClub.coachEmails || []), normEmail]));

  await updateDoc(targetClubRef, {
    coachUids: updatedCoachUids,
    coachEmails: updatedCoachEmails,
    updatedAt: Date.now()
  });

  return { 
    success: true, 
    message: `Trainer ${normEmail} erfolgreich als Club-Coach zu "${targetClub.name}" zugeordnet!` 
  };
}

/**
 * Set or switch the active club for a user / Master-Admin
 */
export async function setActiveClubForUser(
  userUid: string,
  clubId: string | null,
  clubName: string | null
): Promise<void> {
  const userRef = doc(firestoreDb, USERS_COLLECTION, userUid);
  await updateDoc(userRef, {
    clubId: clubId || null,
    clubName: clubName || null
  });
}

/**
 * Edit Full Club Details (Master-Admin only)
 */
export async function editClubFull(
  clubId: string,
  data: {
    name: string;
    adminEmail: string;
    logoUrl?: string;
    coachEmails: string[];
    maxCoaches?: number;
  }
): Promise<void> {
  const clubRef = doc(firestoreDb, CLUBS_COLLECTION, clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) {
    throw new Error('Verein existiert nicht.');
  }

  const prevClub = clubSnap.data() as Club;
  const cleanName = data.name.trim();
  const cleanAdminEmail = data.adminEmail.toLowerCase().trim();
  const cleanCoachEmails = data.coachEmails
    .map(e => e.toLowerCase().trim())
    .filter(e => e && e !== cleanAdminEmail);
  const uniqueCoachEmails = Array.from(new Set(cleanCoachEmails));

  // Get all users in database
  const usersQuery = query(collection(firestoreDb, USERS_COLLECTION));
  const usersSnap = await getDocs(usersQuery);
  const usersList: UserProfile[] = [];
  usersSnap.forEach(d => usersList.push(d.data() as UserProfile));

  let newAdminUid = '';
  const newCoachUids: string[] = [];

  usersList.forEach(u => {
    const uEmail = u.email?.toLowerCase().trim();
    if (uEmail === cleanAdminEmail) {
      newAdminUid = u.uid;
    } else if (uEmail && uniqueCoachEmails.includes(uEmail)) {
      newCoachUids.push(u.uid);
    }
  });

  // 1. Handle previous admin if changed
  if (prevClub.adminUid && prevClub.adminUid !== newAdminUid) {
    const isStillCoach = uniqueCoachEmails.includes(prevClub.adminEmail.toLowerCase().trim());
    try {
      const oldAdminRef = doc(firestoreDb, USERS_COLLECTION, prevClub.adminUid);
      const oldSnap = await getDoc(oldAdminRef);
      const oldIsMaster = oldSnap.exists() && (oldSnap.data().role === 'master_admin' || oldSnap.data().role === 'admin' || isMainAdminEmail(oldSnap.data().email));
      if (isStillCoach) {
        await updateDoc(oldAdminRef, { role: oldIsMaster ? 'master_admin' : 'club_coach' });
      } else {
        await updateDoc(oldAdminRef, { 
          role: oldIsMaster ? 'master_admin' : 'user', 
          clubId: null, 
          clubName: null 
        });
      }
    } catch (e) {
      console.warn('Error resetting previous admin:', e);
    }
  }

  // 2. Set new admin (preserve master_admin role if Master Admin)
  if (newAdminUid) {
    try {
      const newAdminRef = doc(firestoreDb, USERS_COLLECTION, newAdminUid);
      const uSnap = await getDoc(newAdminRef);
      const isMaster = uSnap.exists() && (uSnap.data().role === 'master_admin' || uSnap.data().role === 'admin' || isMainAdminEmail(uSnap.data().email));
      await updateDoc(newAdminRef, {
        role: isMaster ? 'master_admin' : 'club_admin',
        clubId,
        clubName: cleanName
      });
    } catch (e) {
      console.warn('Error updating new admin:', e);
    }
  }

  // 3. Handle removed coaches
  const prevCoachEmails = prevClub.coachEmails || [];
  for (const prevEmail of prevCoachEmails) {
    const norm = prevEmail.toLowerCase().trim();
    if (!uniqueCoachEmails.includes(norm) && norm !== cleanAdminEmail) {
      const removedUser = usersList.find(u => u.email?.toLowerCase().trim() === norm);
      if (removedUser) {
        try {
          const uRef = doc(firestoreDb, USERS_COLLECTION, removedUser.uid);
          await updateDoc(uRef, { role: 'user', clubId: null, clubName: null });
        } catch (e) {
          console.warn('Error resetting removed coach:', e);
        }
      }
    }
  }

  // 4. Update all current coaches
  for (const coachUid of newCoachUids) {
    try {
      const uRef = doc(firestoreDb, USERS_COLLECTION, coachUid);
      await updateDoc(uRef, {
        role: 'club_coach',
        clubId,
        clubName: cleanName
      });
    } catch (e) {
      console.warn(`Error updating coach ${coachUid}:`, e);
    }
  }

  const resolvedMaxCoaches = typeof data.maxCoaches === 'number' && data.maxCoaches > 0 
    ? data.maxCoaches 
    : (prevClub.maxCoaches || 5);

  // 5. Save updated club doc
  await updateDoc(clubRef, sanitizeData({
    name: cleanName,
    adminEmail: cleanAdminEmail,
    adminUid: newAdminUid,
    logoUrl: data.logoUrl !== undefined ? data.logoUrl : (prevClub.logoUrl || ''),
    coachEmails: uniqueCoachEmails,
    coachUids: newCoachUids,
    maxCoaches: resolvedMaxCoaches,
    updatedAt: Date.now()
  }));
}

// ----------------------------------------------------------------------------
// ORGANISATION: TRAINING GROUPS & PLAYERS MANAGEMENT
// ----------------------------------------------------------------------------

const groupListeners = new Set<(groups: TrainingGroup[]) => void>();
const absenceListeners = new Set<(absences: PlayerAbsence[]) => void>();

function notifyGroupListeners(userId?: string) {
  const list = getLocalTrainingGroups(userId);
  groupListeners.forEach(cb => {
    try {
      cb(list);
    } catch (e) {
      console.warn('Error in group listener callback:', e);
    }
  });
}

function notifyAbsenceListeners(userId?: string) {
  const list = getLocalPlayerAbsences(userId);
  absenceListeners.forEach(cb => {
    try {
      cb(list);
    } catch (e) {
      console.warn('Error in absence listener callback:', e);
    }
  });
}

export function getLocalTrainingGroups(userId?: string): TrainingGroup[] {
  try {
    const uid = userId || 'guest';
    const primaryKey = `${LOCAL_GROUPS_PREFIX}${uid}`;
    const raw = localStorage.getItem(primaryKey);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
      } catch {}
    }

    // 1. Fallback: check guest storage
    if (uid !== 'guest') {
      const guestRaw = localStorage.getItem(`${LOCAL_GROUPS_PREFIX}guest`);
      if (guestRaw !== null) {
        try {
          const parsed = JSON.parse(guestRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          }
        } catch {}
      }
    }

    // 2. Comprehensive multi-key scan across localStorage (in case groups were saved under other user/legacy keys)
    const allFound: TrainingGroup[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_GROUPS_PREFIX)) {
        try {
          const itemRaw = localStorage.getItem(k);
          if (itemRaw) {
            const parsed = JSON.parse(itemRaw);
            if (Array.isArray(parsed)) {
              for (const g of parsed) {
                if (g && typeof g === 'object' && g.name) {
                  const ident = g.id || g.name;
                  if (!seenIds.has(ident)) {
                    seenIds.add(ident);
                    allFound.push(g);
                  }
                }
              }
            }
          }
        } catch {
          // ignore corrupted key
        }
      }
    }

    if (allFound.length > 0) {
      allFound.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      saveLocalTrainingGroups(uid, allFound);
      return allFound;
    }
  } catch (e) {
    console.warn('Error reading local training groups:', e);
  }
  return [];
}

export function saveLocalTrainingGroups(userId: string | undefined, list: TrainingGroup[]) {
  try {
    const uid = userId || 'guest';
    const key = `${LOCAL_GROUPS_PREFIX}${uid}`;
    localStorage.setItem(key, JSON.stringify(list));
    if (uid === 'guest') {
      localStorage.setItem(`${LOCAL_GROUPS_PREFIX}guest`, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error saving local training groups:', e);
  }
}

/**
 * Real-time listener for user's training groups (with offline caching & reactive memory dispatch)
 */
export function subscribeUserTrainingGroups(
  user: { uid: string; email?: string | null } | null,
  onData: (groups: TrainingGroup[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  groupListeners.add(onData);

  const initialLocal = getLocalTrainingGroups(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {
      groupListeners.delete(onData);
    };
  }

  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, TrainingGroup>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, TrainingGroup>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((group, id) => {
        mergedMap.set(id, group);
      });
    });

    const currentLocal = getLocalTrainingGroups(user.uid);
    currentLocal.forEach(g => {
      if (!mergedMap.has(g.id)) {
        mergedMap.set(g.id, g);
      }
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    saveLocalTrainingGroups(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, TRAINING_GROUPS_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, TRAINING_GROUPS_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, TrainingGroup>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            snapMap.set(docSnap.id, normalizeTrainingGroup({
              ...docSnap.data(),
              id: docSnap.id
            }));
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore training groups listener error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach training groups listener (${key}):`, err);
    }
  });

  return () => {
    groupListeners.delete(onData);
    unsubs.forEach(u => u());
  };
}

/**
 * Save or update a Training Group (with players)
 */
export async function saveTrainingGroupToFirestore(
  group: Partial<TrainingGroup> & { name: string; players: Player[] },
  currentUser: { uid: string; email?: string | null; displayName?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalTrainingGroups(uid);

  const groupId = group.id || `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const now = Date.now();
  const cleanPlayers: Player[] = (group.players || []).map(p => ({
    id: p.id || `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    firstName: (p.firstName || '').trim(),
    lastName: (p.lastName || '').trim(),
    birthYear: p.birthYear || '',
    jerseyNumber: p.jerseyNumber || '',
    notes: p.notes || '',
    archived: Boolean(p.archived),
    ...(p.archivedAt ? { archivedAt: p.archivedAt } : {}),
    ...(p.originalGroupId ? { originalGroupId: p.originalGroupId } : {}),
    createdAt: p.createdAt || now,
    updatedAt: now
  }));

  const newGroup: TrainingGroup = {
    id: groupId,
    name: group.name.trim(),
    description: group.description || '',
    ageCategory: group.ageCategory || 'Alle',
    color: group.color || 'emerald',
    players: cleanPlayers,
    ownerId: group.ownerId || currentUser?.uid || 'guest',
    ownerEmail: group.ownerEmail || currentUser?.email || '',
    ownerName: group.ownerName || currentUser?.displayName || currentUser?.email || undefined,
    createdByName: group.createdByName || currentUser?.displayName || currentUser?.email || undefined,
    createdByRole: group.createdByRole || (clubId ? 'club_coach' : 'user'),
    assignedCoachEmail: group.assignedCoachEmail || undefined,
    assignedCoachId: group.assignedCoachId || undefined,
    assignedCoachName: group.assignedCoachName || undefined,
    observerCoachEmails: Array.isArray(group.observerCoachEmails) ? group.observerCoachEmails : [],
    observerCoachIds: Array.isArray(group.observerCoachIds) ? group.observerCoachIds : [],
    clubId: clubId || group.clubId || undefined,
    createdAt: group.createdAt || now,
    updatedAt: now
  };

  const existingIdx = currentLocal.findIndex(g => g.id === groupId);
  let updatedLocal: TrainingGroup[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newGroup;
  } else {
    updatedLocal = [newGroup, ...currentLocal];
  }
  
  saveLocalTrainingGroups(uid, updatedLocal);
  notifyGroupListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, TRAINING_GROUPS_COLLECTION, groupId);
      const payload = sanitizeData({
        name: newGroup.name,
        description: newGroup.description,
        ageCategory: newGroup.ageCategory,
        color: newGroup.color,
        players: newGroup.players,
        ownerId: newGroup.ownerId,
        ownerEmail: newGroup.ownerEmail,
        ownerName: newGroup.ownerName || null,
        createdByName: newGroup.createdByName || null,
        createdByRole: newGroup.createdByRole || null,
        assignedCoachEmail: newGroup.assignedCoachEmail || null,
        assignedCoachId: newGroup.assignedCoachId || null,
        assignedCoachName: newGroup.assignedCoachName || null,
        observerCoachEmails: newGroup.observerCoachEmails || [],
        observerCoachIds: newGroup.observerCoachIds || [],
        clubId: newGroup.clubId || null,
        createdAt: newGroup.createdAt,
        updatedAt: newGroup.updatedAt
      });
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore training group save failed (cached locally):', err);
    }
  }

  return groupId;
}

/**
 * Move a Player from one Training Group to another Training Group
 */
export async function movePlayerBetweenGroups(
  sourceGroupId: string,
  targetGroupId: string,
  playerId: string,
  currentUser: { uid: string; email?: string | null; displayName?: string | null } | null,
  clubId?: string
): Promise<{ success: boolean; message: string; movedPlayerName: string }> {
  if (!sourceGroupId || !targetGroupId || !playerId || sourceGroupId === targetGroupId) {
    throw new Error('Ungültige Quell- oder Ziel-Gruppe.');
  }

  const uid = currentUser?.uid || 'guest';
  const allLocal = getLocalTrainingGroups(uid);
  const sourceGroup = allLocal.find(g => g.id === sourceGroupId);
  const targetGroup = allLocal.find(g => g.id === targetGroupId);

  if (!sourceGroup || !targetGroup) {
    throw new Error('Quell- oder Zielgruppe nicht gefunden.');
  }

  const playerIdx = (sourceGroup.players || []).findIndex(p => p.id === playerId);
  if (playerIdx === -1) {
    throw new Error('Spieler in der Quellgruppe nicht gefunden.');
  }

  const player = sourceGroup.players[playerIdx];
  const playerName = `${player.firstName} ${player.lastName}`.trim();

  // 1. Remove player from sourceGroup
  const updatedSourcePlayers = sourceGroup.players.filter(p => p.id !== playerId);
  const updatedSourceGroup: TrainingGroup = {
    ...sourceGroup,
    players: updatedSourcePlayers,
    updatedAt: Date.now()
  };

  // 2. Add player to targetGroup
  const updatedTargetPlayers = [...(targetGroup.players || []).filter(p => p.id !== playerId), {
    ...player,
    updatedAt: Date.now()
  }];
  const updatedTargetGroup: TrainingGroup = {
    ...targetGroup,
    players: updatedTargetPlayers,
    updatedAt: Date.now()
  };

  // Save both groups
  await saveTrainingGroupToFirestore(updatedSourceGroup, currentUser, clubId || sourceGroup.clubId);
  await saveTrainingGroupToFirestore(updatedTargetGroup, currentUser, clubId || targetGroup.clubId);

  // 3. Update related absences, evaluations and feedback talks
  try {
    const localAbs = getLocalPlayerAbsences(uid);
    for (const ab of localAbs) {
      if (ab.playerId === playerId) {
        await saveAbsenceToFirestore({
          ...ab,
          groupId: targetGroupId,
          groupName: targetGroup.name
        }, currentUser, clubId);
      }
    }

    const localEvals = getLocalPlayerEvaluations(uid);
    for (const ev of localEvals) {
      if (ev.playerId === playerId) {
        await savePlayerEvaluationToFirestore({
          ...ev,
          groupId: targetGroupId,
          groupName: targetGroup.name
        }, currentUser, clubId);
      }
    }

    const localTalks = getLocalFeedbackTalks(uid);
    for (const talk of localTalks) {
      if (talk.playerId === playerId) {
        await saveFeedbackTalkToFirestore({
          ...talk,
          groupId: targetGroupId,
          groupName: targetGroup.name
        }, currentUser, clubId);
      }
    }
  } catch (err) {
    console.warn('Error updating player related entities on move:', err);
  }

  return {
    success: true,
    message: `Torhüter "${playerName}" erfolgreich von "${sourceGroup.name}" nach "${targetGroup.name}" verschoben.`,
    movedPlayerName: playerName
  };
}

/**
 * Delete a Training Group
 */
export async function deleteTrainingGroupFromFirestore(
  groupId: string,
  currentUser: { uid: string; email?: string | null } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalTrainingGroups(uid);
  const filtered = currentLocal.filter(g => g.id !== groupId);
  
  saveLocalTrainingGroups(uid, filtered);

  // Clean from any other legacy or guest group keys in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LOCAL_GROUPS_PREFIX)) {
      try {
        const itemRaw = localStorage.getItem(k);
        if (itemRaw) {
          const parsed = JSON.parse(itemRaw);
          if (Array.isArray(parsed)) {
            const pruned = parsed.filter((g: any) => g?.id !== groupId);
            if (pruned.length !== parsed.length) {
              localStorage.setItem(k, JSON.stringify(pruned));
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  notifyGroupListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, TRAINING_GROUPS_COLLECTION, groupId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore training group deletion failed (cached locally):', err);
    }
  }
}

// ----------------------------------------------------------------------------
// ORGANISATION: PLAYER ABSENCES MANAGEMENT
// ----------------------------------------------------------------------------

export function getLocalPlayerAbsences(userId?: string): PlayerAbsence[] {
  try {
    const uid = userId || 'guest';
    const primaryKey = `${LOCAL_ABSENCES_PREFIX}${uid}`;
    const raw = localStorage.getItem(primaryKey);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    // 1. Fallback check guest
    if (uid !== 'guest') {
      const guestRaw = localStorage.getItem(`${LOCAL_ABSENCES_PREFIX}guest`);
      if (guestRaw !== null) {
        try {
          const parsed = JSON.parse(guestRaw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }

    // 2. Comprehensive multi-key scan
    const allFound: PlayerAbsence[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_ABSENCES_PREFIX)) {
        try {
          const itemRaw = localStorage.getItem(k);
          if (itemRaw) {
            const parsed = JSON.parse(itemRaw);
            if (Array.isArray(parsed)) {
              for (const a of parsed) {
                if (a && typeof a === 'object' && a.playerId && !seenIds.has(a.id || a.playerId + a.startDate)) {
                  seenIds.add(a.id || a.playerId + a.startDate);
                  allFound.push(a);
                }
              }
            }
          }
        } catch {
          // ignore error
        }
      }
    }

    if (allFound.length > 0) {
      saveLocalPlayerAbsences(uid, allFound);
      return allFound;
    }
  } catch (e) {
    console.warn('Error reading local player absences:', e);
  }
  return [];
}

export function saveLocalPlayerAbsences(userId: string | undefined, list: PlayerAbsence[]) {
  try {
    const uid = userId || 'guest';
    const key = `${LOCAL_ABSENCES_PREFIX}${uid}`;
    localStorage.setItem(key, JSON.stringify(list));
    if (uid === 'guest') {
      localStorage.setItem(`${LOCAL_ABSENCES_PREFIX}guest`, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error saving local player absences:', e);
  }
}

/**
 * Real-time listener for user's player absences (with offline caching & reactive dispatch)
 */
export function subscribeUserAbsences(
  user: { uid: string; email?: string | null } | null,
  onData: (absences: PlayerAbsence[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  absenceListeners.add(onData);

  const initialLocal = getLocalPlayerAbsences(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {
      absenceListeners.delete(onData);
    };
  }

  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, PlayerAbsence>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, PlayerAbsence>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((abs, id) => {
        mergedMap.set(id, abs);
      });
    });

    const currentLocal = getLocalPlayerAbsences(user.uid);
    currentLocal.forEach(a => {
      if (!mergedMap.has(a.id)) mergedMap.set(a.id, a);
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    saveLocalPlayerAbsences(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, PLAYER_ABSENCES_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, PLAYER_ABSENCES_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, PlayerAbsence>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            const data = docSnap.data() as Omit<PlayerAbsence, 'id'>;
            snapMap.set(docSnap.id, {
              ...data,
              id: docSnap.id
            });
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore player absences subscription error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach absences query (${key}):`, err);
    }
  });

  return () => {
    absenceListeners.delete(onData);
    unsubs.forEach(u => u());
  };
}

/**
 * Save or update a Player Absence
 */
export async function saveAbsenceToFirestore(
  absence: Partial<PlayerAbsence> & {
    groupId: string;
    playerId: string;
    playerName: string;
    startDate: string;
    reason: any;
  },
  currentUser: { uid: string; email?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalPlayerAbsences(uid);

  const absenceId = absence.id || `absence_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const newAbsence: PlayerAbsence = {
    id: absenceId,
    groupId: absence.groupId,
    groupName: absence.groupName || '',
    playerId: absence.playerId,
    playerName: absence.playerName.trim(),
    startDate: absence.startDate,
    endDate: absence.endDate || absence.startDate,
    isRecurring: Boolean(absence.isRecurring),
    recurringWeekday: absence.recurringWeekday !== undefined ? Number(absence.recurringWeekday) : undefined,
    recurringWeekdayName: absence.recurringWeekdayName || undefined,
    reason: absence.reason,
    injuredBodyPart: absence.injuredBodyPart ? absence.injuredBodyPart.trim() : undefined,
    note: absence.note || '',
    ownerId: absence.ownerId || currentUser?.uid || 'guest',
    clubId: clubId || absence.clubId || undefined,
    createdAt: absence.createdAt || now
  };

  const existingIdx = currentLocal.findIndex(a => a.id === absenceId);
  let updatedLocal: PlayerAbsence[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newAbsence;
  } else {
    updatedLocal = [newAbsence, ...currentLocal];
  }
  
  saveLocalPlayerAbsences(uid, updatedLocal);
  notifyAbsenceListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PLAYER_ABSENCES_COLLECTION, absenceId);
      const payload = sanitizeData({
        groupId: newAbsence.groupId,
        groupName: newAbsence.groupName,
        playerId: newAbsence.playerId,
        playerName: newAbsence.playerName,
        startDate: newAbsence.startDate,
        endDate: newAbsence.endDate,
        isRecurring: newAbsence.isRecurring || false,
        recurringWeekday: newAbsence.recurringWeekday !== undefined ? newAbsence.recurringWeekday : null,
        recurringWeekdayName: newAbsence.recurringWeekdayName || null,
        reason: newAbsence.reason,
        injuredBodyPart: newAbsence.injuredBodyPart || null,
        note: newAbsence.note,
        ownerId: newAbsence.ownerId,
        clubId: newAbsence.clubId || null,
        createdAt: newAbsence.createdAt
      });
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore absence save failed (cached locally):', err);
    }
  }

  return absenceId;
}

/**
 * Delete a Player Absence
 */
export async function deleteAbsenceFromFirestore(
  absenceId: string,
  currentUser: { uid: string; email?: string | null } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalPlayerAbsences(uid);
  const filtered = currentLocal.filter(a => a.id !== absenceId);
  
  saveLocalPlayerAbsences(uid, filtered);

  // Clean from any other legacy or guest absence keys in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LOCAL_ABSENCES_PREFIX)) {
      try {
        const itemRaw = localStorage.getItem(k);
        if (itemRaw) {
          const parsed = JSON.parse(itemRaw);
          if (Array.isArray(parsed)) {
            const pruned = parsed.filter((a: any) => a?.id !== absenceId);
            if (pruned.length !== parsed.length) {
              localStorage.setItem(k, JSON.stringify(pruned));
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  notifyAbsenceListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PLAYER_ABSENCES_COLLECTION, absenceId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore absence deletion failed (cached locally):', err);
    }
  }
}

// ----------------------------------------------------------------------------
// DATENEINGABE: SPIELERBEWERTUNGEN (TECHNIK, TAKTIK, ATHLETIK, MENTAL)
// ----------------------------------------------------------------------------

const evaluationListeners = new Set<(evals: PlayerEvaluation[]) => void>();

export function notifyEvaluationListeners(uid: string) {
  const current = getLocalPlayerEvaluations(uid);
  evaluationListeners.forEach(listener => {
    try {
      listener(current);
    } catch (e) {
      console.warn('Evaluation listener error:', e);
    }
  });
}

export function getLocalPlayerEvaluations(uid?: string): PlayerEvaluation[] {
  try {
    const userUid = uid || 'guest';
    const primaryKey = `${LOCAL_EVALUATIONS_PREFIX}${userUid}`;
    const raw = localStorage.getItem(primaryKey);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    if (userUid !== 'guest') {
      const guestRaw = localStorage.getItem(`${LOCAL_EVALUATIONS_PREFIX}guest`);
      if (guestRaw !== null) {
        const parsed = JSON.parse(guestRaw);
        if (Array.isArray(parsed)) return parsed;
      }
    }

    // Multi-key scan fallback if no primary key exists yet
    const allFound: PlayerEvaluation[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_EVALUATIONS_PREFIX)) {
        try {
          const itemRaw = localStorage.getItem(k);
          if (itemRaw) {
            const parsed = JSON.parse(itemRaw);
            if (Array.isArray(parsed)) {
              for (const ev of parsed) {
                if (ev && typeof ev === 'object' && ev.playerId) {
                  const ident = ev.id || `${ev.playerId}_${ev.category}_${ev.updatedAt || ''}`;
                  if (!seenIds.has(ident)) {
                    seenIds.add(ident);
                    allFound.push(ev);
                  }
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (allFound.length > 0) {
      saveLocalPlayerEvaluations(userUid, allFound);
      return allFound;
    }
  } catch (e) {
    console.error('Error reading local player evaluations:', e);
  }
  return [];
}

export function saveLocalPlayerEvaluations(uid: string, evals: PlayerEvaluation[]): void {
  try {
    const userUid = uid || 'guest';
    const key = `${LOCAL_EVALUATIONS_PREFIX}${userUid}`;
    localStorage.setItem(key, JSON.stringify(evals));
    if (userUid === 'guest' || !localStorage.getItem(`${LOCAL_EVALUATIONS_PREFIX}guest`)) {
      localStorage.setItem(`${LOCAL_EVALUATIONS_PREFIX}guest`, JSON.stringify(evals));
    }
  } catch (e) {
    console.error('Error saving local player evaluations:', e);
  }
}

export function subscribeUserEvaluations(
  user: { uid: string; email?: string | null } | null,
  onData: (evals: PlayerEvaluation[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  evaluationListeners.add(onData);
  const initialLocal = getLocalPlayerEvaluations(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {
      evaluationListeners.delete(onData);
    };
  }

  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, PlayerEvaluation>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, PlayerEvaluation>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((ev, id) => {
        mergedMap.set(id, ev);
      });
    });

    const currentLocal = getLocalPlayerEvaluations(user.uid);
    currentLocal.forEach(e => {
      if (!mergedMap.has(e.id)) mergedMap.set(e.id, e);
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    saveLocalPlayerEvaluations(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, PLAYER_EVALUATIONS_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, PLAYER_EVALUATIONS_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, PlayerEvaluation>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            const data = docSnap.data() as Omit<PlayerEvaluation, 'id'>;
            snapMap.set(docSnap.id, {
              ...data,
              id: docSnap.id
            });
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore player evaluations listener error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach evaluations query (${key}):`, err);
    }
  });

  return () => {
    evaluationListeners.delete(onData);
    unsubs.forEach(u => u());
  };
}

export async function savePlayerEvaluationToFirestore(
  evalData: Partial<PlayerEvaluation> & {
    playerId: string;
    playerName: string;
    groupId: string;
    category: EvaluationCategory;
    ratings: Record<string, number>;
  },
  currentUser: { uid: string; email?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalPlayerEvaluations(uid);

  const now = Date.now();
  const evalId = evalData.id || `${evalData.playerId}_${evalData.category.toLowerCase()}_${now}_${Math.random().toString(36).substring(2, 6)}`;

  const newEval: PlayerEvaluation = {
    id: evalId,
    playerId: evalData.playerId,
    playerName: evalData.playerName.trim(),
    groupId: evalData.groupId,
    groupName: evalData.groupName || '',
    category: evalData.category,
    ratings: evalData.ratings || {},
    athleticMetrics: evalData.athleticMetrics,
    biologicalMetrics: evalData.biologicalMetrics,
    overallNotes: evalData.overallNotes || '',
    strengths: evalData.strengths || '',
    developmentAreas: evalData.developmentAreas || '',
    ownerId: evalData.ownerId || currentUser?.uid || 'guest',
    clubId: clubId || evalData.clubId || undefined,
    updatedAt: evalData.updatedAt || now
  };

  const existingIdx = currentLocal.findIndex(e => e.id === evalId);
  let updatedLocal: PlayerEvaluation[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newEval;
  } else {
    updatedLocal = [newEval, ...currentLocal];
  }

  saveLocalPlayerEvaluations(uid, updatedLocal);
  notifyEvaluationListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PLAYER_EVALUATIONS_COLLECTION, evalId);
      const payload = sanitizeData({
        playerId: newEval.playerId,
        playerName: newEval.playerName,
        groupId: newEval.groupId,
        groupName: newEval.groupName,
        category: newEval.category,
        ratings: newEval.ratings,
        athleticMetrics: newEval.athleticMetrics,
        biologicalMetrics: newEval.biologicalMetrics,
        overallNotes: newEval.overallNotes,
        strengths: newEval.strengths,
        developmentAreas: newEval.developmentAreas,
        ownerId: newEval.ownerId,
        clubId: newEval.clubId || null,
        updatedAt: newEval.updatedAt
      });
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore player evaluation save failed (cached locally):', err);
    }
  }

  return evalId;
}

export async function deletePlayerEvaluationFromFirestore(
  evalId: string,
  currentUser: { uid: string; email?: string | null } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalPlayerEvaluations(uid);
  const filtered = currentLocal.filter(e => e.id !== evalId);

  saveLocalPlayerEvaluations(uid, filtered);

  // Clean all local storage keys containing this evalId
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LOCAL_EVALUATIONS_PREFIX)) {
      try {
        const itemRaw = localStorage.getItem(k);
        if (itemRaw) {
          const parsed = JSON.parse(itemRaw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(e => e && e.id !== evalId);
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        }
      } catch {}
    }
  }

  notifyEvaluationListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PLAYER_EVALUATIONS_COLLECTION, evalId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore player evaluation deletion failed (cached locally):', err);
    }
  }
}

// ----------------------------------------------------------------------------
// DATENEINGABE: SPIELZEITEN (MATCH PLAYTIMES)
// ----------------------------------------------------------------------------

const matchPlaytimeListeners = new Set<(playtimes: PlayerMatchPlaytime[]) => void>();

export function notifyMatchPlaytimeListeners(uid: string) {
  const current = getLocalMatchPlaytimes(uid);
  matchPlaytimeListeners.forEach(listener => {
    try {
      listener(current);
    } catch (e) {
      console.warn('Match playtime listener error:', e);
    }
  });
}

export function getLocalMatchPlaytimes(uid?: string): PlayerMatchPlaytime[] {
  try {
    const userUid = uid || 'guest';
    const primaryKey = `${LOCAL_MATCH_PLAYTIMES_PREFIX}${userUid}`;
    const raw = localStorage.getItem(primaryKey);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    if (userUid !== 'guest') {
      const guestRaw = localStorage.getItem(`${LOCAL_MATCH_PLAYTIMES_PREFIX}guest`);
      if (guestRaw !== null) {
        const parsed = JSON.parse(guestRaw);
        if (Array.isArray(parsed)) return parsed;
      }
    }

    const allFound: PlayerMatchPlaytime[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_MATCH_PLAYTIMES_PREFIX)) {
        try {
          const itemRaw = localStorage.getItem(k);
          if (itemRaw) {
            const parsed = JSON.parse(itemRaw);
            if (Array.isArray(parsed)) {
              for (const m of parsed) {
                if (m && typeof m === 'object' && m.id && !seenIds.has(m.id)) {
                  seenIds.add(m.id);
                  allFound.push(m);
                }
              }
            }
          }
        } catch {}
      }
    }

    if (allFound.length > 0) {
      saveLocalMatchPlaytimes(userUid, allFound);
      return allFound;
    }
  } catch (e) {
    console.warn('Error reading local match playtimes:', e);
  }
  return [];
}

export function saveLocalMatchPlaytimes(userId: string | undefined, list: PlayerMatchPlaytime[]) {
  try {
    const uid = userId || 'guest';
    const key = `${LOCAL_MATCH_PLAYTIMES_PREFIX}${uid}`;
    localStorage.setItem(key, JSON.stringify(list));
    if (uid === 'guest' || !localStorage.getItem(`${LOCAL_MATCH_PLAYTIMES_PREFIX}guest`)) {
      localStorage.setItem(`${LOCAL_MATCH_PLAYTIMES_PREFIX}guest`, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error saving local match playtimes:', e);
  }
}

export function subscribeUserMatchPlaytimes(
  user: { uid: string; email?: string | null } | null,
  onData: (playtimes: PlayerMatchPlaytime[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  matchPlaytimeListeners.add(onData);

  const initialLocal = getLocalMatchPlaytimes(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {
      matchPlaytimeListeners.delete(onData);
    };
  }

  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, PlayerMatchPlaytime>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, PlayerMatchPlaytime>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((playtime, id) => {
        mergedMap.set(id, playtime);
      });
    });

    const currentLocal = getLocalMatchPlaytimes(user.uid);
    currentLocal.forEach(p => {
      if (!mergedMap.has(p.id)) mergedMap.set(p.id, p);
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    saveLocalMatchPlaytimes(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, MATCH_PLAYTIMES_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, MATCH_PLAYTIMES_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, PlayerMatchPlaytime>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            const data = docSnap.data() as Omit<PlayerMatchPlaytime, 'id'>;
            snapMap.set(docSnap.id, {
              id: docSnap.id,
              ...data
            });
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore match playtimes listener error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach match playtimes query (${key}):`, err);
    }
  });

  return () => {
    matchPlaytimeListeners.delete(onData);
    unsubs.forEach(u => u());
  };
}

export async function saveMatchPlaytimeToFirestore(
  playtime: Partial<PlayerMatchPlaytime> & { date: string; team: string; opponent: string; location: MatchLocation; groupId: string; playerMinutes: Record<string, number> },
  currentUser: { uid: string; email?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const now = Date.now();
  const playtimeId = playtime.id || `match_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const newPlaytime: PlayerMatchPlaytime = {
    id: playtimeId,
    date: playtime.date,
    team: playtime.team,
    opponent: playtime.opponent,
    location: playtime.location,
    matchType: playtime.matchType || 'Meisterschaftsspiel',
    groupId: playtime.groupId,
    groupName: playtime.groupName || '',
    playerMinutes: playtime.playerMinutes || {},
    playerBenchStatus: playtime.playerBenchStatus || {},
    playerGrades: playtime.playerGrades || {},
    notes: playtime.notes || '',
    ownerId: playtime.ownerId || currentUser?.uid || 'guest',
    clubId: clubId || playtime.clubId || undefined,
    createdAt: playtime.createdAt || now,
    updatedAt: now
  };

  const currentLocal = getLocalMatchPlaytimes(uid);
  const existingIdx = currentLocal.findIndex(p => p.id === playtimeId);
  let updatedLocal: PlayerMatchPlaytime[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newPlaytime;
  } else {
    updatedLocal = [newPlaytime, ...currentLocal];
  }

  saveLocalMatchPlaytimes(uid, updatedLocal);
  notifyMatchPlaytimeListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, MATCH_PLAYTIMES_COLLECTION, playtimeId);
      const payload = sanitizeData(newPlaytime);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore match playtime save failed (cached locally):', err);
    }
  }

  return playtimeId;
}

export async function deleteMatchPlaytimeFromFirestore(
  playtimeId: string,
  currentUser: { uid: string; email?: string | null } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalMatchPlaytimes(uid);
  const filtered = currentLocal.filter(p => p.id !== playtimeId);

  saveLocalMatchPlaytimes(uid, filtered);
  notifyMatchPlaytimeListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, MATCH_PLAYTIMES_COLLECTION, playtimeId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore match playtime deletion failed (cached locally):', err);
    }
  }
}

// ----------------------------------------------------------------------------
// DATENEINGABE: FEEDBACKGESPRÄCHE (FEEDBACK TALKS)
// ----------------------------------------------------------------------------

const feedbackTalkListeners = new Set<(talks: PlayerFeedbackTalk[]) => void>();

export function notifyFeedbackTalkListeners(uid: string) {
  const current = getLocalFeedbackTalks(uid);
  feedbackTalkListeners.forEach(listener => {
    try {
      listener(current);
    } catch (e) {
      console.warn('Feedback talk listener error:', e);
    }
  });
}

export function getLocalFeedbackTalks(uid?: string): PlayerFeedbackTalk[] {
  try {
    const userUid = uid || 'guest';
    const primaryKey = `${LOCAL_FEEDBACK_TALKS_PREFIX}${userUid}`;
    const raw = localStorage.getItem(primaryKey);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    if (userUid !== 'guest') {
      const guestRaw = localStorage.getItem(`${LOCAL_FEEDBACK_TALKS_PREFIX}guest`);
      if (guestRaw !== null) {
        const parsed = JSON.parse(guestRaw);
        if (Array.isArray(parsed)) return parsed;
      }
    }

    const allFound: PlayerFeedbackTalk[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_FEEDBACK_TALKS_PREFIX)) {
        try {
          const itemRaw = localStorage.getItem(k);
          if (itemRaw) {
            const parsed = JSON.parse(itemRaw);
            if (Array.isArray(parsed)) {
              for (const t of parsed) {
                if (t && typeof t === 'object' && t.id && !seenIds.has(t.id)) {
                  seenIds.add(t.id);
                  allFound.push(t);
                }
              }
            }
          }
        } catch {}
      }
    }

    if (allFound.length > 0) {
      saveLocalFeedbackTalks(userUid, allFound);
      return allFound;
    }
  } catch (e) {
    console.warn('Error reading local feedback talks:', e);
  }
  return [];
}

export function saveLocalFeedbackTalks(userId: string | undefined, list: PlayerFeedbackTalk[]) {
  try {
    const uid = userId || 'guest';
    const key = `${LOCAL_FEEDBACK_TALKS_PREFIX}${uid}`;
    localStorage.setItem(key, JSON.stringify(list));
    if (uid === 'guest' || !localStorage.getItem(`${LOCAL_FEEDBACK_TALKS_PREFIX}guest`)) {
      localStorage.setItem(`${LOCAL_FEEDBACK_TALKS_PREFIX}guest`, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error saving local feedback talks:', e);
  }
}

export function subscribeUserFeedbackTalks(
  user: { uid: string; email?: string | null } | null,
  onData: (talks: PlayerFeedbackTalk[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  feedbackTalkListeners.add(onData);

  const initialLocal = getLocalFeedbackTalks(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {
      feedbackTalkListeners.delete(onData);
    };
  }

  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, PlayerFeedbackTalk>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, PlayerFeedbackTalk>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((talk, id) => {
        mergedMap.set(id, talk);
      });
    });

    const currentLocal = getLocalFeedbackTalks(user.uid);
    currentLocal.forEach(t => {
      if (!mergedMap.has(t.id)) mergedMap.set(t.id, t);
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    saveLocalFeedbackTalks(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, FEEDBACK_TALKS_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, FEEDBACK_TALKS_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, PlayerFeedbackTalk>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            const data = docSnap.data() as Omit<PlayerFeedbackTalk, 'id'>;
            snapMap.set(docSnap.id, {
              id: docSnap.id,
              ...data
            });
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore feedback talks listener error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach feedback talks query (${key}):`, err);
    }
  });

  return () => {
    feedbackTalkListeners.delete(onData);
    unsubs.forEach(u => u());
  };
}

export async function saveFeedbackTalkToFirestore(
  talk: Partial<PlayerFeedbackTalk> & { groupId: string; playerId: string; date: string; trainer1: string; keyPoints: string },
  currentUser: { uid: string; email?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const now = Date.now();
  const talkId = talk.id || `feedback_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const newTalk: PlayerFeedbackTalk = {
    id: talkId,
    groupId: talk.groupId,
    groupName: talk.groupName || '',
    playerId: talk.playerId,
    playerName: talk.playerName || '',
    date: talk.date,
    trainer1: talk.trainer1,
    trainer2: talk.trainer2 || '',
    keyPoints: talk.keyPoints,
    ownerId: talk.ownerId || currentUser?.uid || 'guest',
    clubId: clubId || talk.clubId || undefined,
    createdAt: talk.createdAt || now,
    updatedAt: now
  };

  const currentLocal = getLocalFeedbackTalks(uid);
  const existingIdx = currentLocal.findIndex(t => t.id === talkId);
  let updatedLocal: PlayerFeedbackTalk[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newTalk;
  } else {
    updatedLocal = [newTalk, ...currentLocal];
  }

  saveLocalFeedbackTalks(uid, updatedLocal);
  notifyFeedbackTalkListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, FEEDBACK_TALKS_COLLECTION, talkId);
      const payload = sanitizeData(newTalk);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore feedback talk save failed (cached locally):', err);
    }
  }

  return talkId;
}

export async function deleteFeedbackTalkFromFirestore(
  talkId: string,
  currentUser: { uid: string; email?: string | null } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalFeedbackTalks(uid);
  const filtered = currentLocal.filter(t => t.id !== talkId);

  saveLocalFeedbackTalks(uid, filtered);
  notifyFeedbackTalkListeners(uid);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, FEEDBACK_TALKS_COLLECTION, talkId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore feedback talk deletion failed (cached locally):', err);
    }
  }
}

// ----------------------------------------------------------------------------
// PERIODISIERUNG: SAISON, MAKRO-, MESO- & MIKROPLANUNG
// ----------------------------------------------------------------------------

const LOCAL_PERIODIZATION_SEASONS_PREFIX = 'nextlevel_periodization_seasons_';
const LOCAL_MACRO_PLANS_PREFIX = 'nextlevel_periodization_macro_';
const LOCAL_MESO_PLANS_PREFIX = 'nextlevel_periodization_meso_';
const LOCAL_MICRO_PLANS_PREFIX = 'nextlevel_periodization_micro_';

// Periodization Seasons
export function getLocalPeriodizationSeasons(uid: string = 'guest'): PeriodizationSeason[] {
  try {
    const raw = localStorage.getItem(LOCAL_PERIODIZATION_SEASONS_PREFIX + uid);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading local periodization seasons:', err);
    return [];
  }
}

export function saveLocalPeriodizationSeasons(uid: string = 'guest', seasons: PeriodizationSeason[]): void {
  try {
    localStorage.setItem(LOCAL_PERIODIZATION_SEASONS_PREFIX + uid, JSON.stringify(seasons));
  } catch (err) {
    console.error('Error saving local periodization seasons:', err);
  }
}

export function subscribeUserPeriodizationSeasons(
  user: { uid: string; email?: string | null } | null,
  onData: (seasons: PeriodizationSeason[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  const initialLocal = getLocalPeriodizationSeasons(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {};
  }

  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, PeriodizationSeason>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, PeriodizationSeason>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((season, id) => {
        mergedMap.set(id, season);
      });
    });

    const currentLocal = getLocalPeriodizationSeasons(user.uid);
    currentLocal.forEach(s => {
      if (!mergedMap.has(s.id)) mergedMap.set(s.id, s);
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => b.startYear - a.startYear);

    saveLocalPeriodizationSeasons(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, PERIODIZATION_SEASONS_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, PERIODIZATION_SEASONS_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, PeriodizationSeason>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            snapMap.set(docSnap.id, { ...docSnap.data(), id: docSnap.id } as PeriodizationSeason);
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore periodization seasons listener error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach seasons query (${key}):`, err);
    }
  });

  return () => {
    unsubs.forEach(u => u());
  };
}

export async function savePeriodizationSeasonToFirestore(
  season: Partial<PeriodizationSeason> & { name: string; startYear: number; endYear: number },
  currentUser: { uid: string; email?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const now = Date.now();
  const seasonId = season.id || `season_${season.startYear}_${season.endYear}_${Math.random().toString(36).substring(2, 7)}`;

  const newSeason: PeriodizationSeason = {
    id: seasonId,
    name: season.name.trim(),
    startYear: season.startYear,
    endYear: season.endYear,
    groupConfigs: season.groupConfigs || {},
    isCompleted: Boolean(season.isCompleted),
    completedAt: season.completedAt || undefined,
    ownerId: season.ownerId || currentUser?.uid || 'guest',
    clubId: clubId || season.clubId || undefined,
    createdAt: season.createdAt || now,
    updatedAt: now
  };

  const currentLocal = getLocalPeriodizationSeasons(uid);
  const existingIdx = currentLocal.findIndex(s => s.id === seasonId);
  let updatedLocal: PeriodizationSeason[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newSeason;
  } else {
    updatedLocal = [newSeason, ...currentLocal];
  }

  saveLocalPeriodizationSeasons(uid, updatedLocal);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PERIODIZATION_SEASONS_COLLECTION, seasonId);
      const payload = sanitizeData(newSeason);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore season save failed (cached locally):', err);
      throw err;
    }
  }

  return seasonId;
}

export async function deletePeriodizationSeasonFromFirestore(
  seasonId: string,
  currentUser: { uid: string; email?: string | null } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalPeriodizationSeasons(uid);
  const filtered = currentLocal.filter(s => s.id !== seasonId);

  saveLocalPeriodizationSeasons(uid, filtered);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PERIODIZATION_SEASONS_COLLECTION, seasonId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore season deletion failed (cached locally):', err);
    }
  }
}

// Macro Plans
export function getLocalMacroPlans(uid: string = 'guest'): MacroPlan[] {
  try {
    const raw = localStorage.getItem(LOCAL_MACRO_PLANS_PREFIX + uid);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading local macro plans:', err);
    return [];
  }
}

export function saveLocalMacroPlans(uid: string = 'guest', plans: MacroPlan[]): void {
  try {
    localStorage.setItem(LOCAL_MACRO_PLANS_PREFIX + uid, JSON.stringify(plans));
    if (plans.length > 0) {
      db.macroPlans.bulkPut(plans).catch(err => console.warn('Dexie macroPlans put error:', err));
    }
  } catch (err) {
    console.error('Error saving local macro plans:', err);
  }
}

export function subscribeUserMacroPlans(
  user: { uid: string; email?: string | null } | null,
  onData: (plans: MacroPlan[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  const initialLocal = getLocalMacroPlans(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {};
  }

  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, MacroPlan>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, MacroPlan>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((plan, id) => {
        mergedMap.set(id, plan);
      });
    });

    const currentLocal = getLocalMacroPlans(user.uid);
    currentLocal.forEach(p => {
      const remotePlan = mergedMap.get(p.id);
      if (!remotePlan) {
        mergedMap.set(p.id, p);
      } else {
        const localTime = typeof p.updatedAt === 'number' ? p.updatedAt : 0;
        const remoteTime = typeof remotePlan.updatedAt === 'number' ? remotePlan.updatedAt : 0;
        if (localTime > remoteTime) {
          mergedMap.set(p.id, p);
        }
      }
    });

    const mergedList = Array.from(mergedMap.values());
    saveLocalMacroPlans(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, PERIODIZATION_MACRO_PLANS_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, PERIODIZATION_MACRO_PLANS_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, MacroPlan>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            snapMap.set(docSnap.id, normalizeMacroPlan({ ...docSnap.data(), id: docSnap.id }));
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore macro plans listener error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach macro plans query (${key}):`, err);
    }
  });

  return () => {
    unsubs.forEach(u => u());
  };
}

export async function saveMacroPlanToFirestore(
  plan: Partial<MacroPlan> & { seasonId: string; groupId: string; halfYear: 1 | 2; name: string; totalHalfYearSessions: number; topicDistribution: any },
  currentUser: { uid: string; email?: string | null; displayName?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const now = Date.now();
  const planId = plan.id || `macro_${plan.seasonId}_${plan.groupId}_h${plan.halfYear}_${Math.random().toString(36).substring(2, 7)}`;

  const newPlan: MacroPlan = {
    id: planId,
    seasonId: plan.seasonId,
    groupId: plan.groupId,
    halfYear: plan.halfYear,
    name: plan.name.trim(),
    totalHalfYearSessions: plan.totalHalfYearSessions,
    topicDistribution: plan.topicDistribution || {},
    feedbacks: plan.feedbacks || [],
    ownerId: plan.ownerId || currentUser?.uid || 'guest',
    ownerName: plan.ownerName || currentUser?.displayName || currentUser?.email || undefined,
    createdByName: plan.createdByName || currentUser?.displayName || currentUser?.email || undefined,
    createdByRole: plan.createdByRole || (clubId ? 'club_coach' : 'user'),
    clubId: clubId || plan.clubId || undefined,
    createdAt: plan.createdAt || now,
    updatedAt: now
  };

  const currentLocal = getLocalMacroPlans(uid);
  const existingIdx = currentLocal.findIndex(p => p.id === planId);
  let updatedLocal: MacroPlan[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newPlan;
  } else {
    updatedLocal = [newPlan, ...currentLocal];
  }

  saveLocalMacroPlans(uid, updatedLocal);
  db.macroPlans.put(newPlan).catch(err => console.warn('Dexie macroPlans put error:', err));

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PERIODIZATION_MACRO_PLANS_COLLECTION, planId);
      const payload = sanitizeData(newPlan);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore macro plan save failed (cached locally):', err);
      throw err;
    }
  }

  return planId;
}

export async function addFeedbackToMacroPlan(
  macroPlanId: string,
  feedback: Omit<PeriodizationFeedback, 'id' | 'createdAt'>,
  currentUser: { uid: string; email?: string | null; displayName?: string | null } | null
): Promise<PeriodizationFeedback> {
  const newFeedback: PeriodizationFeedback = {
    ...feedback,
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now()
  };

  const uid = currentUser?.uid || 'guest';
  const localPlans = getLocalMacroPlans(uid);
  const planIdx = localPlans.findIndex(p => p.id === macroPlanId);
  if (planIdx >= 0) {
    const plan = localPlans[planIdx];
    const updated = {
      ...plan,
      feedbacks: [newFeedback, ...(plan.feedbacks || [])],
      updatedAt: Date.now()
    };
    localPlans[planIdx] = updated;
    saveLocalMacroPlans(uid, localPlans);
  }

  if (currentUser && currentUser.uid !== 'guest') {
    const docRef = doc(firestoreDb, PERIODIZATION_MACRO_PLANS_COLLECTION, macroPlanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MacroPlan;
      const currentFeedbacks = Array.isArray(data.feedbacks) ? data.feedbacks : [];
      await updateDoc(docRef, {
        feedbacks: [newFeedback, ...currentFeedbacks],
        updatedAt: Date.now()
      });
    }
  }

  return newFeedback;
}

export async function deleteFeedbackFromMacroPlan(
  macroPlanId: string,
  feedbackId: string,
  currentUser: { uid: string } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const localPlans = getLocalMacroPlans(uid);
  const planIdx = localPlans.findIndex(p => p.id === macroPlanId);
  if (planIdx >= 0) {
    const plan = localPlans[planIdx];
    const updated = {
      ...plan,
      feedbacks: (plan.feedbacks || []).filter(f => f.id !== feedbackId),
      updatedAt: Date.now()
    };
    localPlans[planIdx] = updated;
    saveLocalMacroPlans(uid, localPlans);
  }

  if (currentUser && currentUser.uid !== 'guest') {
    const docRef = doc(firestoreDb, PERIODIZATION_MACRO_PLANS_COLLECTION, macroPlanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MacroPlan;
      const currentFeedbacks = Array.isArray(data.feedbacks) ? data.feedbacks : [];
      await updateDoc(docRef, {
        feedbacks: currentFeedbacks.filter(f => f.id !== feedbackId),
        updatedAt: Date.now()
      });
    }
  }
}

export async function deleteMacroPlanFromFirestore(
  planId: string,
  currentUser: { uid: string; email?: string | null } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalMacroPlans(uid);
  const filtered = currentLocal.filter(p => p.id !== planId);

  saveLocalMacroPlans(uid, filtered);
  db.macroPlans.delete(planId).catch(err => console.warn('Dexie macroPlans delete error:', err));

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PERIODIZATION_MACRO_PLANS_COLLECTION, planId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore macro plan deletion failed (cached locally):', err);
    }
  }
}

// Meso Plans
export function getLocalMesoPlans(uid: string = 'guest'): MesoPlan[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESO_PLANS_PREFIX + uid);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading local meso plans:', err);
    return [];
  }
}

export function saveLocalMesoPlans(uid: string = 'guest', plans: MesoPlan[]): void {
  try {
    localStorage.setItem(LOCAL_MESO_PLANS_PREFIX + uid, JSON.stringify(plans));
    if (plans.length > 0) {
      db.mesoPlans.bulkPut(plans).catch(err => console.warn('Dexie mesoPlans put error:', err));
    }
  } catch (err) {
    console.error('Error saving local meso plans:', err);
  }
}

export function subscribeUserMesoPlans(
  user: { uid: string; email?: string | null } | null,
  onData: (plans: MesoPlan[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  const initialLocal = getLocalMesoPlans(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {};
  }

  const unsubs: (() => void)[] = [];
  const querySnapshots = new Map<string, Map<string, MesoPlan>>();

  const emitMerged = () => {
    const mergedMap = new Map<string, MesoPlan>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((plan, id) => {
        mergedMap.set(id, plan);
      });
    });

    const currentLocal = getLocalMesoPlans(user.uid);
    currentLocal.forEach(p => {
      const remotePlan = mergedMap.get(p.id);
      if (!remotePlan) {
        mergedMap.set(p.id, p);
      } else {
        const localTime = typeof p.updatedAt === 'number' ? p.updatedAt : 0;
        const remoteTime = typeof remotePlan.updatedAt === 'number' ? remotePlan.updatedAt : 0;
        if (localTime > remoteTime) {
          mergedMap.set(p.id, p);
        }
      }
    });

    const mergedList = Array.from(mergedMap.values());
    saveLocalMesoPlans(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, PERIODIZATION_MESO_PLANS_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, PERIODIZATION_MESO_PLANS_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, MesoPlan>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            snapMap.set(docSnap.id, normalizeMesoPlan({ ...docSnap.data(), id: docSnap.id }));
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore meso plans listener error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach meso plans query (${key}):`, err);
    }
  });

  return () => {
    unsubs.forEach(u => u());
  };
}

export async function saveMesoPlanToFirestore(
  plan: Partial<MesoPlan> & { macroPlanId: string; seasonId: string; groupId: string; mesoIndex: number; name: string; startDate: string; endDate: string; weeks: any[]; isCompleted: boolean },
  currentUser: { uid: string; email?: string | null; displayName?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const now = Date.now();
  const planId = plan.id || `meso_${plan.macroPlanId}_idx${plan.mesoIndex}_${Math.random().toString(36).substring(2, 7)}`;

  const newPlan: MesoPlan = normalizeMesoPlan({
    id: planId,
    macroPlanId: plan.macroPlanId,
    seasonId: plan.seasonId,
    groupId: plan.groupId,
    mesoIndex: plan.mesoIndex,
    name: plan.name.trim(),
    startDate: plan.startDate,
    endDate: plan.endDate,
    athleticFocus: plan.athleticFocus,
    forAdults: plan.forAdults,
    targetDefenseGoals: plan.targetDefenseGoals,
    targetDefenseTechnique1: plan.targetDefenseTechnique1,
    targetDefenseTechnique2: plan.targetDefenseTechnique2,
    spaceDefenseGoals: plan.spaceDefenseGoals,
    spaceDefenseTechnique3: plan.spaceDefenseTechnique3,
    spaceDefenseTechnique4: plan.spaceDefenseTechnique4,
    athleticStimulusAchieved: plan.athleticStimulusAchieved,
    targetDefenseReflection: plan.targetDefenseReflection,
    spaceDefenseReflection: plan.spaceDefenseReflection,
    intensityFocusLearning: plan.intensityFocusLearning,
    generalWeekTemplate: plan.generalWeekTemplate,
    weeks: plan.weeks || [],
    feedbacks: plan.feedbacks || [],
    isSaved: plan.isSaved !== undefined ? Boolean(plan.isSaved) : undefined,
    isReflected: plan.isReflected !== undefined ? Boolean(plan.isReflected) : undefined,
    isCompleted: Boolean(plan.isCompleted),
    ownerId: plan.ownerId || currentUser?.uid || 'guest',
    ownerName: plan.ownerName || currentUser?.displayName || currentUser?.email || undefined,
    createdByName: plan.createdByName || currentUser?.displayName || currentUser?.email || undefined,
    createdByRole: plan.createdByRole || (clubId ? 'club_coach' : 'user'),
    clubId: clubId || plan.clubId || undefined,
    createdAt: plan.createdAt || now,
    updatedAt: plan.updatedAt || now
  });

  const currentLocal = getLocalMesoPlans(uid);
  const existingIdx = currentLocal.findIndex(p => p.id === planId);
  let updatedLocal: MesoPlan[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newPlan;
  } else {
    updatedLocal = [newPlan, ...currentLocal];
  }

  saveLocalMesoPlans(uid, updatedLocal);
  db.mesoPlans.put(newPlan).catch(err => console.warn('Dexie mesoPlans put error:', err));

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PERIODIZATION_MESO_PLANS_COLLECTION, planId);
      const payload = sanitizeData(newPlan);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore meso plan save failed (persisted in local DB):', err);
    }
  }

  return planId;
}

export async function addFeedbackToMesoPlan(
  mesoPlanId: string,
  feedback: Omit<PeriodizationFeedback, 'id' | 'createdAt'>,
  currentUser: { uid: string; email?: string | null; displayName?: string | null } | null
): Promise<PeriodizationFeedback> {
  const newFeedback: PeriodizationFeedback = {
    ...feedback,
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now()
  };

  const uid = currentUser?.uid || 'guest';
  const localPlans = getLocalMesoPlans(uid);
  const planIdx = localPlans.findIndex(p => p.id === mesoPlanId);
  if (planIdx >= 0) {
    const plan = localPlans[planIdx];
    const updated = {
      ...plan,
      feedbacks: [newFeedback, ...(plan.feedbacks || [])],
      updatedAt: Date.now()
    };
    localPlans[planIdx] = updated;
    saveLocalMesoPlans(uid, localPlans);
  }

  if (currentUser && currentUser.uid !== 'guest') {
    const docRef = doc(firestoreDb, PERIODIZATION_MESO_PLANS_COLLECTION, mesoPlanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MesoPlan;
      const currentFeedbacks = Array.isArray(data.feedbacks) ? data.feedbacks : [];
      await updateDoc(docRef, {
        feedbacks: [newFeedback, ...currentFeedbacks],
        updatedAt: Date.now()
      });
    }
  }

  return newFeedback;
}

export async function deleteFeedbackFromMesoPlan(
  mesoPlanId: string,
  feedbackId: string,
  currentUser: { uid: string } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const localPlans = getLocalMesoPlans(uid);
  const planIdx = localPlans.findIndex(p => p.id === mesoPlanId);
  if (planIdx >= 0) {
    const plan = localPlans[planIdx];
    const updated = {
      ...plan,
      feedbacks: (plan.feedbacks || []).filter(f => f.id !== feedbackId),
      updatedAt: Date.now()
    };
    localPlans[planIdx] = updated;
    saveLocalMesoPlans(uid, localPlans);
  }

  if (currentUser && currentUser.uid !== 'guest') {
    const docRef = doc(firestoreDb, PERIODIZATION_MESO_PLANS_COLLECTION, mesoPlanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MesoPlan;
      const currentFeedbacks = Array.isArray(data.feedbacks) ? data.feedbacks : [];
      await updateDoc(docRef, {
        feedbacks: currentFeedbacks.filter(f => f.id !== feedbackId),
        updatedAt: Date.now()
      });
    }
  }
}

export async function deleteMesoPlanFromFirestore(
  planId: string,
  currentUser: { uid: string; email?: string | null } | null
): Promise<void> {
  const uid = currentUser?.uid || 'guest';
  const currentLocal = getLocalMesoPlans(uid);
  const filtered = currentLocal.filter(p => p.id !== planId);

  saveLocalMesoPlans(uid, filtered);
  db.mesoPlans.delete(planId).catch(err => console.warn('Dexie mesoPlans delete error:', err));

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PERIODIZATION_MESO_PLANS_COLLECTION, planId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore meso plan deletion failed (cached locally):', err);
    }
  }
}

// Micro Plans
export function getLocalMicroPlans(uid: string = 'guest'): MicroPlan[] {
  try {
    const raw = localStorage.getItem(LOCAL_MICRO_PLANS_PREFIX + uid);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading local micro plans:', err);
    return [];
  }
}

export function saveLocalMicroPlans(uid: string = 'guest', plans: MicroPlan[]): void {
  try {
    localStorage.setItem(LOCAL_MICRO_PLANS_PREFIX + uid, JSON.stringify(plans));
  } catch (err) {
    console.error('Error saving local micro plans:', err);
  }
}

export function subscribeUserMicroPlans(
  user: { uid: string; email?: string | null } | null,
  onData: (plans: MicroPlan[]) => void,
  onError?: (error: Error) => void,
  clubId?: string
): () => void {
  const uid = user?.uid || 'guest';
  const initialLocal = getLocalMicroPlans(uid);
  onData(initialLocal);

  if (!user || user.uid === 'guest') {
    return () => {};
  }

  const querySnapshots = new Map<string, Map<string, MicroPlan>>();
  const unsubs: (() => void)[] = [];

  const emitMerged = () => {
    const mergedMap = new Map<string, MicroPlan>();
    querySnapshots.forEach(snapMap => {
      snapMap.forEach((plan, id) => {
        mergedMap.set(id, plan);
      });
    });

    const currentLocal = getLocalMicroPlans(user.uid);
    currentLocal.forEach(p => {
      if (!mergedMap.has(p.id)) {
        mergedMap.set(p.id, p);
      }
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

    saveLocalMicroPlans(user.uid, mergedList);
    onData(mergedList);
  };

  const queries: { key: string; q: Query }[] = [];
  if (clubId) {
    queries.push({ key: 'club', q: query(collection(firestoreDb, PERIODIZATION_MICRO_PLANS_COLLECTION), where('clubId', '==', clubId)) });
  }
  queries.push({ key: 'owner', q: query(collection(firestoreDb, PERIODIZATION_MICRO_PLANS_COLLECTION), where('ownerId', '==', user.uid)) });

  queries.forEach(({ key, q }) => {
    try {
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot) => {
          const snapMap = new Map<string, MicroPlan>();
          snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
            snapMap.set(docSnap.id, {
              ...docSnap.data(),
              id: docSnap.id
            } as MicroPlan);
          });
          querySnapshots.set(key, snapMap);
          emitMerged();
        },
        (err: any) => {
          console.warn(`Firestore micro plans subscription error (${key}):`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.warn(`Failed to attach micro plans listener (${key}):`, err);
    }
  });

  return () => {
    unsubs.forEach(u => u());
  };
}

export async function saveMicroPlanToFirestore(
  plan: Partial<MicroPlan> & { mesoPlanId: string; macroPlanId: string; seasonId: string; groupId: string; weekIndex: number; name: string; startDate: string; endDate: string; days: any[]; isSaved: boolean },
  currentUser: { uid: string; email?: string | null } | null,
  clubId?: string
): Promise<string> {
  const uid = currentUser?.uid || 'guest';
  const now = Date.now();
  const planId = plan.id || `micro_${plan.mesoPlanId}_w${plan.weekIndex}_${Math.random().toString(36).substring(2, 7)}`;

  const newPlan: MicroPlan = {
    id: planId,
    mesoPlanId: plan.mesoPlanId,
    macroPlanId: plan.macroPlanId,
    seasonId: plan.seasonId,
    groupId: plan.groupId,
    weekIndex: plan.weekIndex,
    name: plan.name.trim(),
    startDate: plan.startDate,
    endDate: plan.endDate,
    days: plan.days || [],
    isSaved: Boolean(plan.isSaved),
    ownerId: currentUser?.uid || 'guest',
    clubId: clubId || plan.clubId || undefined,
    createdAt: plan.createdAt || now,
    updatedAt: now
  };

  const currentLocal = getLocalMicroPlans(uid);
  const existingIdx = currentLocal.findIndex(p => p.id === planId);
  let updatedLocal: MicroPlan[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = newPlan;
  } else {
    updatedLocal = [newPlan, ...currentLocal];
  }

  saveLocalMicroPlans(uid, updatedLocal);

  if (currentUser && currentUser.uid !== 'guest') {
    try {
      const docRef = doc(firestoreDb, PERIODIZATION_MICRO_PLANS_COLLECTION, planId);
      const payload = sanitizeData(newPlan);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore micro plan save failed (cached locally):', err);
    }
  }

  return planId;
}

export const METHODICAL_PROGRESSIONS_COLLECTION = 'methodical_progressions';

// Default Academy Methodical Progression templates (empty by default - all fields blank until defined)
export const DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS: Record<string, { stufen: MethodischeReiheStufen; technikprinzipien: string }> = {};

/**
 * Helper to get Academy standard template for any technique (returns blank by default)
 */
export function getAcademyTemplate(techNameOrId: string): { stufen: MethodischeReiheStufen; technikprinzipien: string } {
  if (techNameOrId && DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS[techNameOrId]) {
    return DEFAULT_ACADEMY_METHODICAL_PROGRESSIONS[techNameOrId];
  }
  return {
    stufen: {
      stufe1: '',
      stufe2: '',
      stufe3: '',
      stufe4: '',
      stufe5: '',
      stufe6: ''
    },
    technikprinzipien: ''
  };
}

/**
 * Clear all Methodical Progressions (Global, Club, User) across Firestore and LocalStorage
 */
export async function clearAllMethodicalProgressions(): Promise<void> {
  saveLocalMethodicalProgressions([]);
  try {
    const snap = await getDocs(collection(firestoreDb, METHODICAL_PROGRESSIONS_COLLECTION));
    const batchDeletes = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(batchDeletes);
  } catch (err) {
    console.warn('Firestore clearAllMethodicalProgressions failed:', err);
  }
}

function getLocalMethodicalProgressions(): MethodicalProgression[] {
  try {
    const raw = localStorage.getItem('nl_methodical_progressions');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Error reading local methodical progressions:', e);
    return [];
  }
}

function saveLocalMethodicalProgressions(items: MethodicalProgression[]): void {
  try {
    localStorage.setItem('nl_methodical_progressions', JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving local methodical progressions:', e);
  }
}

const progressionListeners = new Set<(data: MethodicalProgression[]) => void>();

/**
 * Subscribe to all Methodical Progressions in real-time
 */
export function subscribeMethodicalProgressions(
  onData: (data: MethodicalProgression[]) => void,
  onError?: (err: any) => void
): () => void {
  progressionListeners.add(onData);

  // 0. Immediate local cache load for instant UI responsiveness
  const initialLocal = getLocalMethodicalProgressions();
  if (initialLocal && initialLocal.length > 0) {
    onData(initialLocal);
  }

  const collRef = collection(firestoreDb, METHODICAL_PROGRESSIONS_COLLECTION);
  const q = query(collRef, orderBy('updatedAt', 'desc'));

  const unsub = onSnapshot(
    q,
    (snap) => {
      const list: MethodicalProgression[] = [];
      snap.forEach(d => {
        list.push({ ...d.data(), id: d.id } as MethodicalProgression);
      });
      // Merge with local items in case offline/local-only
      const currentLocal = getLocalMethodicalProgressions();
      const mergedMap = new Map<string, MethodicalProgression>();
      list.forEach(p => mergedMap.set(p.id, p));
      currentLocal.forEach(p => {
        if (!mergedMap.has(p.id)) {
          mergedMap.set(p.id, p);
        }
      });
      const mergedList = Array.from(mergedMap.values());
      saveLocalMethodicalProgressions(mergedList);
      progressionListeners.forEach(fn => fn(mergedList));
    },
    (err) => {
      console.warn('Firestore subscribeMethodicalProgressions failed, using local cache:', err);
      const local = getLocalMethodicalProgressions();
      progressionListeners.forEach(fn => fn(local));
      if (onError) onError(err);
    }
  );

  return () => {
    unsub();
    progressionListeners.delete(onData);
  };
}

/**
 * Save or update a Methodical Progression document
 */
export async function saveMethodicalProgression(
  data: Omit<MethodicalProgression, 'updatedAt' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<string> {
  const now = Date.now();
  const id = data.id || `${data.scope}_${data.techniqueId}_${Date.now()}`;
  
  const progression: MethodicalProgression = {
    ...data,
    id,
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  // Update local storage
  const currentLocal = getLocalMethodicalProgressions();
  const existingIdx = currentLocal.findIndex(p => p.id === id);
  let updatedLocal: MethodicalProgression[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = progression;
  } else {
    updatedLocal = [progression, ...currentLocal];
  }
  saveLocalMethodicalProgressions(updatedLocal);
  // Instantly notify all active subscribers
  progressionListeners.forEach(fn => fn(updatedLocal));

  try {
    const docRef = doc(firestoreDb, METHODICAL_PROGRESSIONS_COLLECTION, id);
    await setDoc(docRef, sanitizeData(progression), { merge: true });
  } catch (err) {
    console.warn('Firestore saveMethodicalProgression failed (cached locally):', err);
  }

  return id;
}

/**
 * Delete a Methodical Progression document
 */
export async function deleteMethodicalProgression(id: string): Promise<void> {
  const currentLocal = getLocalMethodicalProgressions();
  const updatedLocal = currentLocal.filter(p => p.id !== id);
  saveLocalMethodicalProgressions(updatedLocal);
  // Instantly notify all active subscribers
  progressionListeners.forEach(fn => fn(updatedLocal));

  try {
    const docRef = doc(firestoreDb, METHODICAL_PROGRESSIONS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteMethodicalProgression failed:', err);
  }
}

/**
 * Save official Master Admin / Academy Global Standard for a technique
 */
export async function saveGlobalTechniqueStandard(
  techniqueId: string,
  techniqueName: string,
  group: string,
  stufen: MethodischeReiheStufen,
  technikprinzipien: string = '',
  authorName: string = 'NextLevel Academy'
): Promise<string> {
  const id = `global_${techniqueId}`;
  return saveMethodicalProgression({
    id,
    techniqueId,
    techniqueName,
    group,
    stufen,
    technikprinzipien,
    scope: 'global',
    clubId: null,
    clubName: null,
    userId: null,
    userEmail: null,
    authorName,
    isStandard: true
  });
}

/**
 * Save Club Standard for a technique (Club-Admin)
 */
export async function saveClubTechniqueStandard(
  clubId: string,
  clubName: string,
  techniqueId: string,
  techniqueName: string,
  group: string,
  stufen: MethodischeReiheStufen,
  technikprinzipien: string = '',
  authorName: string = 'Club Admin'
): Promise<string> {
  const id = `club_${clubId}_${techniqueId}`;
  return saveMethodicalProgression({
    id,
    techniqueId,
    techniqueName,
    group,
    stufen,
    technikprinzipien,
    scope: 'club',
    clubId,
    clubName,
    userId: null,
    userEmail: null,
    authorName,
    isStandard: true
  });
}

/**
 * Save User Standard for a technique (Individual Coach)
 */
export async function saveUserTechniqueStandard(
  userId: string,
  userEmail: string,
  authorName: string,
  techniqueId: string,
  techniqueName: string,
  group: string,
  stufen: MethodischeReiheStufen,
  technikprinzipien: string = '',
  clubId?: string | null,
  clubName?: string | null
): Promise<string> {
  const id = `user_${userId}_${techniqueId}`;
  return saveMethodicalProgression({
    id,
    techniqueId,
    techniqueName,
    group,
    stufen,
    technikprinzipien,
    scope: 'user',
    clubId: clubId || null,
    clubName: clubName || null,
    userId,
    userEmail,
    authorName,
    isStandard: true
  });
}

// -----------------------------------------------------------------------------
// TACTICAL PRINCIPLES (Taktikprinzipien für Phase Situativ)
// -----------------------------------------------------------------------------

export const TACTICAL_PRINCIPLES_COLLECTION = 'tactical_principles';

// Default Academy Tactical Principles templates for all tactical focus topics
export const DEFAULT_ACADEMY_TACTICAL_PRINCIPLES: Record<string, string> = {
  // Zielverteidigung
  'tact_zv_ferndistanz': '• Grundpositionierung bei Schussabgabe (Set-Position / Abdruckbereitschaft)\n• Distanzverkürzung vs. Reaktionszeit abwägen\n• Ballkontrolle: Fangen vs. gezieltes Abwehren in unkritische Zonen',
  'Ferndistanz': '• Grundpositionierung bei Schussabgabe (Set-Position / Abdruckbereitschaft)\n• Distanzverkürzung vs. Reaktionszeit abwägen\n• Ballkontrolle: Fangen vs. gezieltes Abwehren in unkritische Zonen',

  'tact_zv_1vs1': '• Wann verkürzen (Raum schließen), wann einfrieren (Blockposition halten)?\n• Hand- & Fußflächen maximal breit machen, Körperschwerpunkt tief halten\n• Kein vorzeitiges Spekulieren; langes Stehenbleiben provoziert Stürmerfehler',
  '1vs1': '• Wann verkürzen (Raum schließen), wann einfrieren (Blockposition halten)?\n• Hand- & Fußflächen maximal breit machen, Körperschwerpunkt tief halten\n• Kein vorzeitiges Spekulieren; langes Stehenbleiben provoziert Stürmerfehler',

  'tact_zv_nahdistanz': '• Reaktionsposition einnehmen (Kompaktheit vor Reichweite)\n• Blick fixiert auf Ballkontakt des Angreifers\n• Schnelle Reaktionsparaden mit Händen und Füßen',
  'Nahdistanz': '• Reaktionsposition einnehmen (Kompaktheit vor Reichweite)\n• Blick fixiert auf Ballkontakt des Angreifers\n• Schnelle Reaktionsparaden mit Händen und Füßen',

  'tact_zv_grundposition': '• Optimale Positionierung auf der Winkelhalbierenden\n• Distanz zum Tor an die Spielsituation anpassen\n• Frühzeitiges Einnehmen der Set-Position vor dem Torschuss',
  'Grundpositionierung (Breite)': '• Optimale Positionierung auf der Winkelhalbierenden\n• Distanz zum Tor an die Spielsituation anpassen\n• Frühzeitiges Einnehmen der Set-Position vor dem Torschuss',

  // Raumverteidigung
  'tact_rv_flanken': '• Offene Grundstellung mit Blick zu Ball und Zielraum\n• Entscheidungspunkt vor der Flanke: Bleiben (Torverteidigung) oder Attackieren (Raumverteidigung)\n• Höchster Punkt beim Abfangen / Fausten anvisieren, klares akustisches Kommando',
  'Flanken': '• Offene Grundstellung mit Blick zu Ball und Zielraum\n• Entscheidungspunkt vor der Flanke: Bleiben (Torverteidigung) oder Attackieren (Raumverteidigung)\n• Höchster Punkt beim Abfangen / Fausten anvisieren, klares akustisches Kommando',

  'tact_rv_early_cross': '• Schnittstelle zwischen Abwehr und Torwart frühzeitig absichern\n• Flugkurve diagonal einschätzen und mutig entgegentreten\n• Ball vor dem einlaufenden Stürmer abfangen oder klären',
  'Early Cross': '• Schnittstelle zwischen Abwehr und Torwart frühzeitig absichern\n• Flugkurve diagonal einschätzen und mutig entgegentreten\n• Ball vor dem einlaufenden Stürmer abfangen oder klären',

  'tact_rv_querpaesse': '• Schnelles horizontales Verschieben bei Querpass des Gegners\n• Schrittfolge explosiv anpassen (Kreuzschritte / Nachstellschritte)\n• Blockstellung im Nahbereich gegen Direktabnahmen',
  'Querpass': '• Schnelles horizontales Verschieben bei Querpass des Gegners\n• Schrittfolge explosiv anpassen (Kreuzschritte / Nachstellschritte)\n• Blockstellung im Nahbereich gegen Direktabnahmen',
  'Querpässe': '• Schnelles horizontales Verschieben bei Querpass des Gegners\n• Schrittfolge explosiv anpassen (Kreuzschritte / Nachstellschritte)\n• Blockstellung im Nahbereich gegen Direktabnahmen',

  'tact_rv_hinter_kette': '• Hohe Grundposition als Sweeper-Keeper bei aufgerückter Abwehrkette\n• Flugbälle über die Kette antizipieren und mit dem Fuß/Kopf klären\n• Kontinuierliche Abstimmung und Coaching mit den Innenverteidigern',
  'Verteidigen hinter der Abwehrkette': '• Hohe Grundposition als Sweeper-Keeper bei aufgerückter Abwehrkette\n• Flugbälle über die Kette antizipieren und mit dem Fuß/Kopf klären\n• Kontinuierliche Abstimmung und Coaching mit den Innenverteidigern',

  // Allgemein
  'tact_allg_spielfaehigkeit': '• Spielsituationen antizipieren und Räume vorausschauend sichern\n• Pass- und Schussoptionen des Gegners frühzeitig erkennen\n• Passives vs. aktives Eingreifen situativ abwägen',
  'Spielfähigkeit (das Spiel lesen)': '• Spielsituationen antizipieren und Räume vorausschauend sichern\n• Pass- und Schussoptionen des Gegners frühzeitig erkennen\n• Passives vs. aktives Eingreifen situativ abwägen',

  // Standards
  'tact_std_freistoesse': '• Mauerstellung präzise und zügig organisieren\n• Eigene Positionierung mit freier Sicht auf den Ball\n• Absicherung der Torwartecke ohne Spekulieren auf die Mauerecke',
  'Freistöße': '• Mauerstellung präzise und zügig organisieren\n• Eigene Positionierung mit freier Sicht auf den Ball\n• Absicherung der Torwartecke ohne Spekulieren auf die Mauerecke',

  'tact_std_eckbaelle': '• Raum- und Manndeckung im Strafraum klar einteilen\n• Grundstellung auf Flugkurve des Balls (Hereingedreht / Weggedreht) ausrichten\n• Entschlossenes Verlassen der Linie zum höchsten Punkt',
  'Eckbälle': '• Raum- und Manndeckung im Strafraum klar einteilen\n• Grundstellung auf Flugkurve des Balls (Hereingedreht / Weggedreht) ausrichten\n• Entschlossenes Verlassen der Linie zum höchsten Punkt',

  'tact_std_elfmeter': '• Mentale Fokussierung und Körpersprache auf der Linie\n• Beobachtung von Anlaufwinkel, Schussfuß und Hüftstellung des Schützen\n• Explosiver Abdruck nach Initiierung des Schusses',
  'Elfmeter': '• Mentale Fokussierung und Körpersprache auf der Linie\n• Beobachtung von Anlaufwinkel, Schussfuß und Hüftstellung des Schützen\n• Explosiver Abdruck nach Initiierung des Schusses',

  // Offensive
  'tact_off_anbieteverhalten': '• Dreiecksbildung mit den Innen- und Außenverteidigern\n• Offene Körperhaltung zur Spielfeldmitte einnehmen\n• Klare Passwinkel außerhalb des gegnerischen Pressingschattens anbieten',
  'Anbieteverhalten': '• Dreiecksbildung mit den Innen- und Außenverteidigern\n• Offene Körperhaltung zur Spielfeldmitte einnehmen\n• Klare Passwinkel außerhalb des gegnerischen Pressingschattens anbieten',

  'tact_off_spielfortsetzung': '• Schnelle Spielfortsetzung bei gegnerischer Unordnung (Konterauslöser)\n• Ruhe und Spielkontrolle bei geordneter gegnerischer Defensive\n• Präzise Ballverteilung per Wurf, Abstoß oder Flugball',
  'Spielfortsetzung': '• Schnelle Spielfortsetzung bei gegnerischer Unordnung (Konterauslöser)\n• Ruhe und Spielkontrolle bei geordneter gegnerischer Defensive\n• Präzise Ballverteilung per Wurf, Abstoß oder Flugball',

  'tact_off_umschaltverhalten': '• Sofortiges Umschalten von Torverteidigung auf Spieleröffnung nach Ballgewinn\n• Absicherung bei eigenem Ballverlust (Rückzugsbewegung)\n• Aktives Coaching der Vorderleute beim Umschaltmoment',
  'Umschaltverhalten': '• Sofortiges Umschalten von Torverteidigung auf Spieleröffnung nach Ballgewinn\n• Absicherung bei eigenem Ballverlust (Rückzugsbewegung)\n• Aktives Coaching der Vorderleute beim Umschaltmoment',

  // Organisation
  'tact_org_standards': '• Klare, laute und unmissverständliche Kommandos vor Ausführung\n• Zuteilung der Gegenspieler und Pfostenbesetzung kontrollieren\n• Zweite Bälle absichern und Kommando zum Rausrücken geben',
  'Coaching bei Standards': '• Klare, laute und unmissverständliche Kommandos vor Ausführung\n• Zuteilung der Gegenspieler und Pfostenbesetzung kontrollieren\n• Zweite Bälle absichern und Kommando zum Rausrücken geben',

  'tact_org_spiel': '• Kontinuierliche taktische Steuerung der Abwehrkette\n• Warnung vor Gegenspielern im toten Winkel (Hintermann, Schulterblick)\n• Positive und handlungsorientierte Sprache nutzen',
  'Coachings während des Spiels': '• Kontinuierliche taktische Steuerung der Abwehrkette\n• Warnung vor Gegenspielern im toten Winkel (Hintermann, Schulterblick)\n• Positive und handlungsorientierte Sprache nutzen'
};

/**
 * Helper to get Academy tactical principle template for any tactic
 */
export function getAcademyTacticalTemplate(tacticNameOrId: string): string {
  if (!tacticNameOrId) return '';
  const clean = tacticNameOrId.trim().toLowerCase();

  // 1. Direct key match
  if (DEFAULT_ACADEMY_TACTICAL_PRINCIPLES[tacticNameOrId]) {
    return DEFAULT_ACADEMY_TACTICAL_PRINCIPLES[tacticNameOrId];
  }

  // 2. Case-insensitive key match
  for (const [key, val] of Object.entries(DEFAULT_ACADEMY_TACTICAL_PRINCIPLES)) {
    if (key.toLowerCase() === clean) {
      return val;
    }
  }

  // 3. Synonym matching for Querpass / Querpässe
  if (clean === 'querpass' || clean === 'querpässe') {
    return DEFAULT_ACADEMY_TACTICAL_PRINCIPLES['Querpass'] || DEFAULT_ACADEMY_TACTICAL_PRINCIPLES['Querpässe'] || DEFAULT_ACADEMY_TACTICAL_PRINCIPLES['tact_rv_querpaesse'] || '';
  }

  return '';
}

function getLocalTacticalPrinciples(): TacticalPrinciple[] {
  try {
    const raw = localStorage.getItem('nl_tactical_principles');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Error reading local tactical principles:', e);
    return [];
  }
}

function saveLocalTacticalPrinciples(items: TacticalPrinciple[]): void {
  try {
    localStorage.setItem('nl_tactical_principles', JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving local tactical principles:', e);
  }
}

const tacticalListeners = new Set<(data: TacticalPrinciple[]) => void>();

/**
 * Subscribe to all Tactical Principles in real-time
 */
export function subscribeTacticalPrinciples(
  onData: (data: TacticalPrinciple[]) => void,
  onError?: (err: any) => void
): () => void {
  tacticalListeners.add(onData);

  // 0. Immediate local cache load for instant UI responsiveness
  const initialLocal = getLocalTacticalPrinciples();
  if (initialLocal && initialLocal.length > 0) {
    onData(initialLocal);
  }

  const collRef = collection(firestoreDb, TACTICAL_PRINCIPLES_COLLECTION);
  const q = query(collRef, orderBy('updatedAt', 'desc'));

  const unsub = onSnapshot(
    q,
    (snap) => {
      const list: TacticalPrinciple[] = [];
      snap.forEach(d => {
        list.push({ ...d.data(), id: d.id } as TacticalPrinciple);
      });
      // Merge with local items in case offline/local-only
      const currentLocal = getLocalTacticalPrinciples();
      const mergedMap = new Map<string, TacticalPrinciple>();
      list.forEach(p => mergedMap.set(p.id, p));
      currentLocal.forEach(p => {
        if (!mergedMap.has(p.id)) {
          mergedMap.set(p.id, p);
        }
      });
      const mergedList = Array.from(mergedMap.values());
      saveLocalTacticalPrinciples(mergedList);
      tacticalListeners.forEach(fn => fn(mergedList));
    },
    (err) => {
      console.warn('Firestore subscribeTacticalPrinciples failed, using local cache:', err);
      const local = getLocalTacticalPrinciples();
      tacticalListeners.forEach(fn => fn(local));
      if (onError) onError(err);
    }
  );

  return () => {
    unsub();
    tacticalListeners.delete(onData);
  };
}

/**
 * Save or update a Tactical Principle document
 */
export async function saveTacticalPrinciple(
  data: Omit<TacticalPrinciple, 'updatedAt' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<string> {
  const now = Date.now();
  const id = data.id || `${data.scope}_${data.tacticId}_${Date.now()}`;
  
  const principle: TacticalPrinciple = {
    ...data,
    id,
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  // Update local storage
  const currentLocal = getLocalTacticalPrinciples();
  const existingIdx = currentLocal.findIndex(p => p.id === id);
  let updatedLocal: TacticalPrinciple[];
  if (existingIdx >= 0) {
    updatedLocal = [...currentLocal];
    updatedLocal[existingIdx] = principle;
  } else {
    updatedLocal = [principle, ...currentLocal];
  }
  saveLocalTacticalPrinciples(updatedLocal);
  // Instantly notify all active subscribers
  tacticalListeners.forEach(fn => fn(updatedLocal));

  try {
    const docRef = doc(firestoreDb, TACTICAL_PRINCIPLES_COLLECTION, id);
    await setDoc(docRef, sanitizeData(principle), { merge: true });
  } catch (err) {
    console.warn('Firestore saveTacticalPrinciple failed (cached locally):', err);
  }

  return id;
}

/**
 * Delete a Tactical Principle document
 */
export async function deleteTacticalPrinciple(id: string): Promise<void> {
  const currentLocal = getLocalTacticalPrinciples();
  const updatedLocal = currentLocal.filter(p => p.id !== id);
  saveLocalTacticalPrinciples(updatedLocal);
  // Instantly notify all active subscribers
  tacticalListeners.forEach(fn => fn(updatedLocal));

  try {
    const docRef = doc(firestoreDb, TACTICAL_PRINCIPLES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteTacticalPrinciple failed:', err);
  }
}

/**
 * Save official Master Admin / Academy Global Standard for a tactic
 */
export async function saveGlobalTacticalStandard(
  tacticId: string,
  tacticName: string,
  group: string,
  taktikprinzipien: string = '',
  authorName: string = 'NextLevel Academy'
): Promise<string> {
  const id = `global_${tacticId}`;
  return saveTacticalPrinciple({
    id,
    tacticId,
    tacticName,
    group,
    taktikprinzipien,
    scope: 'global',
    clubId: null,
    clubName: null,
    userId: null,
    userEmail: null,
    authorName,
    isStandard: true
  });
}

/**
 * Save Club Standard for a tactic (Club-Admin)
 */
export async function saveClubTacticalStandard(
  clubId: string,
  clubName: string,
  tacticId: string,
  tacticName: string,
  group: string,
  taktikprinzipien: string = '',
  authorName: string = 'Club Admin'
): Promise<string> {
  const id = `club_${clubId}_${tacticId}`;
  return saveTacticalPrinciple({
    id,
    tacticId,
    tacticName,
    group,
    taktikprinzipien,
    scope: 'club',
    clubId,
    clubName,
    userId: null,
    userEmail: null,
    authorName,
    isStandard: true
  });
}

/**
 * Save User Standard for a tactic (Individual Coach)
 */
export async function saveUserTacticalStandard(
  userId: string,
  userEmail: string,
  authorName: string,
  tacticId: string,
  tacticName: string,
  group: string,
  taktikprinzipien: string = '',
  clubId?: string | null,
  clubName?: string | null
): Promise<string> {
  const id = `user_${userId}_${tacticId}`;
  return saveTacticalPrinciple({
    id,
    tacticId,
    tacticName,
    group,
    taktikprinzipien,
    scope: 'user',
    clubId: clubId || null,
    clubName: clubName || null,
    userId,
    userEmail,
    authorName,
    isStandard: true
  });
}

/**
 * Clear all Tactical Principles (Global, Club, User) across Firestore and LocalStorage
 */
export async function clearAllTacticalPrinciples(): Promise<void> {
  saveLocalTacticalPrinciples([]);
  try {
    const snap = await getDocs(collection(firestoreDb, TACTICAL_PRINCIPLES_COLLECTION));
    const batchDeletes = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(batchDeletes);
  } catch (err) {
    console.warn('Firestore clearAllTacticalPrinciples failed:', err);
  }
}




