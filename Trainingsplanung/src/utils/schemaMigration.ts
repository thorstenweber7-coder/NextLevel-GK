import type { 
  TrainingPlan, 
  Exercise, 
  MesoPlan, 
  MacroPlan, 
  TrainingGroup,
  ExerciseCategory,
  PitchSurface,
  MethodicalProgression,
  TacticalPrinciple
} from '../types';

/**
 * Type Guard: Validates PitchSurface enum
 */
export function isValidPitchSurface(val: unknown): val is PitchSurface {
  return typeof val === 'string' && ['natural_grass', 'hybrid_grass', 'artificial_turf', 'hardcourt', 'indoor'].includes(val);
}

/**
 * Type Guard: Validates JumpVolume enum
 */
export function isValidJumpVolume(val: unknown): val is 'low' | 'medium' | 'high' {
  return typeof val === 'string' && ['low', 'medium', 'high'].includes(val);
}

/**
 * Type Guard: Validates RPE rating (1-10 range)
 */
export function isValidRpe(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 10;
}

/**
 * Type Guard: Validates TacticalPrinciple object structure
 */
export function isTacticalPrinciple(val: unknown): val is TacticalPrinciple {
  if (!val || typeof val !== 'object') return false;
  const p = val as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.tacticId === 'string' &&
    typeof p.taktikprinzipien === 'string' &&
    typeof p.scope === 'string' &&
    ['global', 'club', 'user'].includes(p.scope)
  );
}

/**
 * Type Guard: Validates MethodicalProgression object structure
 */
export function isMethodicalProgression(val: unknown): val is MethodicalProgression {
  if (!val || typeof val !== 'object') return false;
  const m = val as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.techniqueId === 'string' &&
    typeof m.scope === 'string' &&
    ['global', 'club', 'user'].includes(m.scope) &&
    typeof m.stufen === 'object' &&
    m.stufen !== null
  );
}

/**
 * Type Guard: Validates Exercise object structure
 */
export function isExercise(val: unknown): val is Exercise {
  if (!val || typeof val !== 'object') return false;
  const e = val as Record<string, unknown>;
  return typeof e.id === 'string' && typeof e.title === 'string' && typeof e.category === 'string';
}

/**
 * Type Guard: Validates TrainingPlan object structure
 */
export function isTrainingPlan(val: unknown): val is TrainingPlan {
  if (!val || typeof val !== 'object') return false;
  const p = val as Record<string, unknown>;
  return typeof p.id === 'string' && (typeof p.title === 'string' || typeof p.planTitle === 'string');
}

/**
 * Defensive schema normalizer for TrainingPlan
 * Resolves legacy field discrepancies:
 * - phases vs phaseExercises (array vs map)
 * - date vs planDate
 * - totalMinutes vs totalDuration
 * - customPlanExercises map
 */
export function normalizeTrainingPlan(raw: any): TrainingPlan {
  if (!raw || typeof raw !== 'object') {
    return {
      id: 'invalid_plan',
      title: 'Ungültiger Plan',
      planTitle: 'Ungültiger Plan',
      date: new Date().toISOString().substring(0, 10),
      planDate: new Date().toISOString().substring(0, 10),
      trainerName: 'Trainer',
      targetGroup: 'Jugend Leistungsbereich',
      availableKeepers: 3,
      structureId: 'default_structure',
      structureName: 'Torwart-Ausbildungsstruktur',
      phaseExercises: {},
      phases: {},
      customPlanExercises: {},
      totalDuration: 60,
      totalMinutes: 60,
      exerciseCount: 0,
      notes: '',
      importantNotes: '',
      hasVideoAnalysis: false,
      videoAnalysisNotes: '',
      keeperInsights: {},
      keeperLoadRatings: {},
      keeperJumpVolumes: {},
      keeperCompetitionScores: {},
      competitionTitle: '',
      competitionRounds: [],
      liveNotes: '',
      exerciseExperiences: {},
      playerConversations: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // Normalize phaseExercises / phases
  let phaseMap: Record<string, string[]> = {};
  if (raw.phaseExercises && typeof raw.phaseExercises === 'object' && !Array.isArray(raw.phaseExercises)) {
    phaseMap = { ...raw.phaseExercises };
  } else if (raw.phases && typeof raw.phases === 'object') {
    if (Array.isArray(raw.phases)) {
      // Legacy array of phase items with { id, exerciseIds }
      raw.phases.forEach((p: any) => {
        if (p?.id) {
          phaseMap[p.id] = Array.isArray(p.exerciseIds) ? p.exerciseIds : (Array.isArray(p.exercises) ? p.exercises : []);
        }
      });
    } else {
      phaseMap = { ...raw.phases };
    }
  }

  const title = String(raw.title || raw.planTitle || 'Torwart-Trainingseinheit').trim();
  const date = String(raw.date || raw.planDate || new Date().toISOString().substring(0, 10)).trim();
  const totalMin = Number(raw.totalMinutes || raw.totalDuration || 60);

  return {
    ...raw,
    id: String(raw.id || `plan_${Date.now()}`),
    title,
    planTitle: title,
    date,
    planDate: date,
    trainerName: raw.trainerName ? String(raw.trainerName) : 'Trainer',
    targetGroup: raw.targetGroup ? String(raw.targetGroup) : 'Jugend Leistungsbereich',
    availableKeepers: Number(raw.availableKeepers) || 3,
    structureId: String(raw.structureId || 'default_structure'),
    structureName: String(raw.structureName || 'Torwart-Ausbildungsstruktur'),
    phaseExercises: phaseMap,
    phases: phaseMap,
    customPlanExercises: raw.customPlanExercises && typeof raw.customPlanExercises === 'object' ? raw.customPlanExercises : {},
    totalDuration: totalMin,
    totalMinutes: totalMin,
    exerciseCount: Number(raw.exerciseCount) || Object.values(phaseMap).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
    notes: String(raw.notes || ''),
    importantNotes: String(raw.importantNotes || ''),
    hasVideoAnalysis: Boolean(raw.hasVideoAnalysis),
    videoAnalysisNotes: String(raw.videoAnalysisNotes || ''),
    pitchSurface: isValidPitchSurface(raw.pitchSurface) ? raw.pitchSurface : 'natural_grass',
    jumpVolume: raw.jumpVolume ? String(raw.jumpVolume) : undefined,
    keeperInsights: raw.keeperInsights && typeof raw.keeperInsights === 'object' ? raw.keeperInsights : {},
    keeperLoadRatings: raw.keeperLoadRatings && typeof raw.keeperLoadRatings === 'object' ? raw.keeperLoadRatings : {},
    keeperJumpVolumes: raw.keeperJumpVolumes && typeof raw.keeperJumpVolumes === 'object' ? raw.keeperJumpVolumes : {},
    keeperCompetitionScores: raw.keeperCompetitionScores && typeof raw.keeperCompetitionScores === 'object' ? raw.keeperCompetitionScores : {},
    competitionTitle: String(raw.competitionTitle || ''),
    competitionRounds: Array.isArray(raw.competitionRounds) ? raw.competitionRounds : [],
    liveNotes: String(raw.liveNotes || ''),
    exerciseExperiences: raw.exerciseExperiences && typeof raw.exerciseExperiences === 'object' ? raw.exerciseExperiences : {},
    playerConversations: raw.playerConversations && typeof raw.playerConversations === 'object' ? raw.playerConversations : {},
    debriefedAt: raw.debriefedAt,
    debriefedByTrainer: raw.debriefedByTrainer,
    debriefedByUserId: raw.debriefedByUserId,
    isArchived: Boolean(raw.isArchived),
    archivedSeasonId: raw.archivedSeasonId,
    archivedAt: raw.archivedAt,
    clubId: raw.clubId,
    ownerId: raw.ownerId || 'admin',
    ownerEmail: raw.ownerEmail,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now()
  };
}

/**
 * Defensive schema normalizer for Exercise
 */
export function normalizeExercise(raw: any): Exercise {
  const defaultCategory: ExerciseCategory = 'WarmUp';
  if (!raw || typeof raw !== 'object') {
    return {
      id: 'invalid_exercise',
      title: 'Unbekannte Übung',
      category: defaultCategory,
      durationMinutes: 15,
      materials: [],
      ablauf: '',
      coachingPoints: '',
      minAgeGroup: 'immer',
      minKeepers: 1,
      maxKeepers: 6
    };
  }

  return {
    ...raw,
    id: String(raw.id || `ex_${Date.now()}`),
    title: String(raw.title || raw.name || 'Torwartübung').trim(),
    category: raw.category || defaultCategory,
    durationMinutes: Number(raw.durationMinutes || raw.duration || 15),
    materials: Array.isArray(raw.materials) ? raw.materials : [],
    ablauf: String(raw.ablauf || raw.description || ''),
    coachingPoints: String(raw.coachingPoints || raw.coachingPunkte || ''),
    minAgeGroup: raw.minAgeGroup || 'immer',
    minKeepers: Number(raw.minKeepers) || 1,
    maxKeepers: Number(raw.maxKeepers) || 6,
    imageUrl: raw.imageUrl || raw.diagramUrl || undefined,
    canvasData: (raw.canvasData && typeof raw.canvasData === 'object') ? raw.canvasData : (raw.tacticalCanvasData && typeof raw.tacticalCanvasData === 'object' ? raw.tacticalCanvasData : undefined),
    isFavorite: Boolean(raw.isFavorite),
    isPublished: Boolean(raw.isPublished),
    isClubPublished: Boolean(raw.isClubPublished),
    ownerId: raw.ownerId || 'admin'
  };
}

/**
 * Defensive schema normalizer for MesoPlan
 */
export function normalizeMesoPlan(raw: any): MesoPlan {
  const normalizedWeeks = Array.isArray(raw.weeks) ? raw.weeks.map((w: any) => ({
    ...w,
    weekNumber: Number(w.weekNumber) || 1,
    isSaved: Boolean(w.isSaved),
    tacticalFocus: w.tacticalFocus || '',
    intensity: w.intensity || '',
    volume: w.volume || '',
    days: Array.isArray(w.days) ? w.days.map((d: any) => ({
      ...d,
      slots: {
        morning: d.slots?.morning || undefined,
        afternoon: d.slots?.afternoon || undefined
      },
      morningTopic: d.morningTopic || '',
      morningTwIntensity: d.morningTwIntensity || '',
      morningTeamFocus: d.morningTeamFocus || '',
      morningFieldSize: d.morningFieldSize || '',
      morningTeamIntensity: d.morningTeamIntensity || '',
      morningTeamDurationMinutes: d.morningTeamDurationMinutes !== undefined ? d.morningTeamDurationMinutes : undefined,
      morningOpponentInfo: d.morningOpponentInfo || '',
      afternoonTopic: d.afternoonTopic || '',
      afternoonTwIntensity: d.afternoonTwIntensity || '',
      afternoonTeamFocus: d.afternoonTeamFocus || '',
      afternoonFieldSize: d.afternoonFieldSize || '',
      afternoonTeamIntensity: d.afternoonTeamIntensity || '',
      afternoonTeamDurationMinutes: d.afternoonTeamDurationMinutes !== undefined ? d.afternoonTeamDurationMinutes : undefined,
      afternoonOpponentInfo: d.afternoonOpponentInfo || '',
      athleticMicrodosing: d.athleticMicrodosing || ''
    })) : []
  })) : [];

  return {
    ...raw,
    id: String(raw.id || `meso_${Date.now()}`),
    macroPlanId: String(raw.macroPlanId || ''),
    seasonId: String(raw.seasonId || ''),
    groupId: String(raw.groupId || ''),
    name: String(raw.name || 'Mesozyklus').trim(),
    mesoIndex: Number(raw.mesoIndex) || 0,
    weeksCount: Number(raw.weeksCount) || 6,
    weeks: normalizedWeeks,
    feedbacks: Array.isArray(raw.feedbacks) ? raw.feedbacks : [],
    isCompleted: Boolean(raw.isCompleted),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now()
  };
}

/**
 * Defensive schema normalizer for MacroPlan
 */
export function normalizeMacroPlan(raw: any): MacroPlan {
  return {
    ...raw,
    id: String(raw.id || `macro_${Date.now()}`),
    seasonId: String(raw.seasonId || ''),
    groupId: String(raw.groupId || ''),
    halfYear: (Number(raw.halfYear) === 2 ? 2 : 1) as 1 | 2,
    name: String(raw.name || 'Makrozyklus').trim(),
    totalHalfYearSessions: Number(raw.totalHalfYearSessions) || 20,
    topicDistribution: raw.topicDistribution && typeof raw.topicDistribution === 'object' ? raw.topicDistribution : {},
    feedbacks: Array.isArray(raw.feedbacks) ? raw.feedbacks : [],
    ownerId: String(raw.ownerId || 'admin'),
    clubId: raw.clubId ? String(raw.clubId) : undefined,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now()
  };
}

/**
 * Defensive schema normalizer for TrainingGroup
 */
export function normalizeTrainingGroup(raw: any): TrainingGroup {
  return {
    ...raw,
    id: String(raw.id || `group_${Date.now()}`),
    name: String(raw.name || 'Trainingsgruppe').trim(),
    ageGroup: raw.ageGroup || 'Herren',
    players: Array.isArray(raw.players) ? raw.players : [],
    observerCoachEmails: Array.isArray(raw.observerCoachEmails) ? raw.observerCoachEmails : (raw.observerCoachEmails ? [raw.observerCoachEmails] : []),
    observerCoachIds: Array.isArray(raw.observerCoachIds) ? raw.observerCoachIds : (raw.observerCoachIds ? [raw.observerCoachIds] : []),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now()
  };
}
