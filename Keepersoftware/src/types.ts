export type UserRole = 'admin' | 'kraftsport' | 'keeper_verein' | 'keeper_extern';

export interface PointsByCategory {
  [category: string]: number;
}

export interface WeightHistoryEntry {
  date: string;
  value: number; // in kg
}

export interface HeightHistoryEntry {
  date: string;
  value: number; // in cm
}

export interface UserProfile {
  uid: string;
  username: string;
  role: UserRole;
  name: string;
  club: string;
  position: string;
  location: string;
  school: string;
  otherInfo: string;
  points: number;
  pointsByCategory: PointsByCategory;
  weightHistory: WeightHistoryEntry[];
  heightHistory: HeightHistoryEntry[];
  archived?: boolean;
  email?: string;
  modulePermissions?: {
    [moduleId: string]: boolean;
  };
}

export interface Exercise {
  id: string;
  name: string;
  imageLink?: string;
  muscleGroup: 'PUSH' | 'PULL' | 'Leg' | 'Core';
  trainerNote?: string;
  cadence?: string;
  videoLink?: string;
  bodyweightMoved?: boolean;
  bodyweightPartiallyMoved?: boolean;
  unilateral?: boolean;
  isAdminCreated?: boolean;
  createdBy?: string;
}

export interface WorkoutSetDef {
  type: 'warmup' | 'regular';
  reps: number; // fixed reps for warmup, or target reps
  minReps?: number;
  targetReps?: number;
}

export interface WorkoutExerciseRef {
  exerciseId: string;
  sets: WorkoutSetDef[];
}

export interface Workout {
  id: string;
  name: string;
  exercises: WorkoutExerciseRef[];
  assignedUsers: string[]; // list of user uids
  category?: 'eigene' | 'spieler' | 'kraftsport' | 'andere';
}

export interface WorkoutLogSet {
  type: 'warmup' | 'regular';
  weight: number;
  reps: number;
  isBest?: boolean;
}

export interface WorkoutLogExercise {
  exerciseId: string;
  name: string;
  sets: WorkoutLogSet[];
}

export interface WorkoutLog {
  id: string;
  userId: string;
  workoutId: string;
  workoutName: string;
  date: string;
  startTime?: string;
  duration: number; // in minutes
  exercises: WorkoutLogExercise[];
  totalVolume: number;
}

export interface VideoScene {
  id: string;
  type: 'analysis' | 'whatsnext' | 'coaching' | 'freestoss' | 'elfmeter_lernen' | 'elfmeter_uebung' | 'veo' | 'bigsave';
  categoryId?: string; // used for A) Spielszenen categories
  subCategory?: string; // used for B) Whats-Next sub-categories
  videoLink: string;
  question?: string;
  answers?: string[]; // Multiple choice options
  correctAnswer?: string; // Correct MC answer or other correct option
  followUpText?: string;
  analysisRules?: string; // Rules for A) Spielszenen
  trainingRecommendation?: string; // Training recommendations for Spielszenen
  team?: string; // for F) Veo Links (U16, U17, U19)
  date?: string; // for F) Veo Links and G) Big Save
  season?: string; // for G) Big Save
  part?: string; // for G) Big Save
  nominations?: string; // for G) Big Save
  winner?: string; // for G) Big Save
  youtubeLink?: string; // for G) Big Save
  isReleased?: boolean; // admin controlled release status
  assignedUsers?: string[]; // list of user uids assigned to this scene
  level?: string; // Level 1, Level 2, Level 3 for E) Elfmeter
}

export interface VideoSubmission {
  id: string;
  userId: string;
  sceneId: string;
  timestamp: string;
  submission: any; // E.g., text for analysis, selected option, correct/incorrect evaluation
  correct?: boolean;
  trainerFeedback?: string;
}

export interface Goal {
  id: string;
  userId: string;
  type: 'Technik' | 'Taktik' | 'Entscheidung';
  description: string;
  assessment?: string; // from admin
  evaluation?: number; // -2 to +2
  actions: {
    team: boolean; // team training
    tw: boolean; // goalkeeping training
    play: boolean; // match games
    extra?: boolean; // own extra training (Eigenes Zusatztraining)
  };
  completed: boolean;
  date: string; // creation date
  evaluationDate?: string;
  createdBy?: 'spieler' | 'trainer';
  category?: 'ziel' | 'todo';
  renewedAt?: string; // last extension/renewal date (YYYY-MM-DD)
  evaluableFrom?: string; // earliest date from which self-evaluation is possible (YYYY-MM-DD)
  renewalCount?: number; // number of times extended by trainer
}

export interface Competition {
  id: string;
  type: 'training' | 'challenge' | 'quiz' | 'seilspringen';
  date?: string; // training match date
  winner?: string; // training match winner, or challenge creator, or quiz answers
  second?: string; // training match second place
  period?: string; // challenge period
  videoLink?: string; // challenge video link
  creator?: string; // challenge creator username/name
  successfulUsers?: string[]; // list of uids who completed the challenge
  question?: string; // quiz question
  answers?: string[]; // quiz answers (4 MC options)
  correctAnswer?: number; // index of correct quiz answer (0-3)
  explanation?: string; // explanation for quiz answer
  level?: number; // assigned level for quiz question
  description?: string; // description for coordination ladder / jump rope challenges
}

export interface GlobalConfig {
  loginText: string;
  trainerNote: string;
}

export interface Level {
  name: string;
  minPoints: number;
  badgeColor: string; // Tailwind colors to make it visually pop!
}

export const USER_LEVELS: Level[] = [
  { name: 'Hobbykicker', minPoints: 0, badgeColor: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  { name: 'Kreisklasse', minPoints: 20, badgeColor: 'bg-amber-700/10 text-amber-500 border-amber-700/20' },
  { name: 'Kreisliga', minPoints: 30, badgeColor: 'bg-amber-600/10 text-amber-500 border-amber-600/20' },
  { name: 'Bezirksliga', minPoints: 40, badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { name: 'Landesliga', minPoints: 50, badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { name: 'Oberliga', minPoints: 55, badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { name: 'Regionalliga', minPoints: 60, badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { name: '3. Liga', minPoints: 80, badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { name: '2. Bundesliga', minPoints: 100, badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { name: '1. Bundesliga', minPoints: 120, badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { name: 'Conference League', minPoints: 140, badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  { name: 'Europa League', minPoints: 150, badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { name: 'Champions League', minPoints: 160, badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { name: 'Nationalmannschaft', minPoints: 180, badgeColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
  { name: 'Weltmeister', minPoints: 200, badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 border shadow-[0_0_10px_rgba(234,179,8,0.2)]' },
];

export function getLevelForPoints(points: number): Level {
  let currentLevel = USER_LEVELS[0];
  for (const lvl of USER_LEVELS) {
    if (points >= lvl.minPoints) {
      currentLevel = lvl;
    } else {
      break;
    }
  }
  return currentLevel;
}

export function hasModulePermission(user: UserProfile | null | undefined, mId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'kraftsport') return true;
  
  const permissions = user.modulePermissions || {};
  
  // If explicitly set, return true
  if (permissions[mId]) return true;

  // Handle composite parent permissions
  if (mId === 'content_tw_taktik') {
    return !!(
      permissions['content_tw_taktik'] ||
      permissions['content_tw_taktik_flanken'] ||
      permissions['content_tw_taktik_1vs1_nahdistanz'] ||
      permissions['content_tw_taktik_1vs1'] ||
      permissions['content_tw_taktik_nahdistanz'] ||
      permissions['content_tw_taktik_querpass'] ||
      permissions['content_tw_taktik_ferndistanz'] ||
      permissions['content_tw_taktik_abwehrkette']
    );
  }

  if (mId === 'training_whatsnext') {
    return !!(
      permissions['training_whatsnext'] ||
      permissions['training_whatsnext_flanken'] ||
      permissions['training_whatsnext_1vs1_nahdistanz'] ||
      permissions['training_whatsnext_querpass'] ||
      permissions['training_whatsnext_ferndistanz'] ||
      permissions['training_whatsnext_abwehrkette']
    );
  }

  // Handle mappings from button IDs in Competitions.tsx to individual checkbox IDs in LEVELS_STRUCTURE
  const permissionMappings: Record<string, string[]> = {
    'training_freekicks': ['training_freestoss_sim'],
    'training_penalties': ['training_elfmeter_sim'],
    'training_ladder': ['training_challenge'],
    'training_rope': ['training_seilspringen'],
    'training_athletic': ['training_tw_at'],
    'training_mobility': ['training_beweglichkeit'],
    'training_coaching': ['video_coaching'],
    'training_mental': ['training_mentaltraining', 'content_mental'],
    'training_mentaltraining': ['training_mental', 'content_mental'],
    'content_tw_taktik_1vs1_nahdistanz': ['content_tw_taktik_1vs1', 'content_tw_taktik_nahdistanz'],
    'content_tw_taktik_1vs1': ['content_tw_taktik_1vs1_nahdistanz'],
    'content_tw_taktik_nahdistanz': ['content_tw_taktik_1vs1_nahdistanz'],
    
    // Reverse mappings to ensure bidirectional compatibility
    'training_freestoss_sim': ['training_freekicks'],
    'training_elfmeter_sim': ['training_penalties'],
    'training_challenge': ['training_ladder'],
    'training_seilspringen': ['training_rope'],
    'training_tw_at': ['training_athletic'],
    'training_beweglichkeit': ['training_mobility'],
    'video_coaching': ['training_coaching']
  };

  const equivalents = permissionMappings[mId];
  if (equivalents) {
    return equivalents.some(eqId => !!permissions[eqId]);
  }

  return false;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  topic: string;
  message: string;
  timestamp: number;
  senderRole: 'User' | 'Admin';
}

