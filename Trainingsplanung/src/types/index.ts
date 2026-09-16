// User Roles and Authentication Profile
export type UserRole = 
  | 'master_admin' 
  | 'admin'
  | 'club_admin' 
  | 'club_coach' 
  | 'single_pro' 
  | 'single_standard' 
  | 'trial_user'
  | 'user'; // Legacy alias for single_standard

export interface RoleDefinition {
  id: UserRole;
  label: string;
  badgeLabel: string;
  description: string;
  color: string;
  badgeClass: string;
}

export const USER_ROLES: { id: UserRole; label: string; badgeLabel: string; description: string }[] = [
  {
    id: 'trial_user',
    label: 'Testnutzer (14 Tage)',
    badgeLabel: 'Testnutzer (14 Tage)',
    description: '14 Tage kostenloser Komplettzugriff auf alle Funktionen der gesamten App.'
  },
  {
    id: 'single_standard',
    label: 'Einzelnutzer Standard',
    badgeLabel: 'Einzelnutzer Standard',
    description: 'Trainingsplaner, Live-Modus, Orga-Datenauswertung, Fehlzeiten & Spielzeiten eintragen. Periodisierung & Detailbewertungen gesperrt.'
  },
  {
    id: 'single_pro',
    label: 'Einzelnutzer Pro',
    badgeLabel: 'Einzelnutzer Pro',
    description: 'Komplettzugriff auf alle Funktionen der gesamten App (Planer, Periodisierung, Bewertungen, Berichte).'
  },
  {
    id: 'club_admin',
    label: 'Vereins-Administrator (Club-Admin)',
    badgeLabel: 'Club-Admin',
    description: 'Vollzugriff & Leitung der Torwartabteilung eines Partner-Vereins (Trainer- und Lizenzverwaltung).'
  },
  {
    id: 'club_coach',
    label: 'Vereinstrainer (Club-Coach)',
    badgeLabel: 'Club-Coach',
    description: 'Vollzugriff innerhalb des lizenzierten Partner-Vereins inkl. Vereinsübungen.'
  },
  {
    id: 'master_admin',
    label: 'Master-Administrator',
    badgeLabel: 'Master-Admin',
    description: 'Uneingeschränkter Plattform- und Systemzugriff über alle Mandanten und Benutzer hinweg.'
  }
];

export function getRoleLabel(role?: UserRole): string {
  if (!role) return 'Einzelnutzer Standard';
  switch (role) {
    case 'master_admin':
    case 'admin':
      return 'Master-Admin';
    case 'club_admin':
      return 'Club-Admin';
    case 'club_coach':
      return 'Club-Coach';
    case 'single_pro':
      return 'Einzelnutzer Pro';
    case 'trial_user':
      return 'Testnutzer (14 Tage)';
    case 'single_standard':
    case 'user':
    default:
      return 'Einzelnutzer Standard';
  }
}

export function getRoleBadgeClass(role?: UserRole): string {
  if (!role) return 'bg-slate-950 text-slate-400 border-slate-800';
  switch (role) {
    case 'master_admin':
    case 'admin':
      return 'bg-purple-950 text-purple-300 border-purple-800';
    case 'club_admin':
      return 'bg-sky-950 text-sky-300 border-sky-800';
    case 'club_coach':
      return 'bg-cyan-950 text-cyan-300 border-cyan-800';
    case 'single_pro':
      return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    case 'trial_user':
      return 'bg-amber-950 text-amber-300 border-amber-800';
    case 'single_standard':
    case 'user':
    default:
      return 'bg-slate-950 text-slate-300 border-slate-800';
  }
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  clubId?: string;
  clubName?: string;
  createdAt: number;
  trialExpiresAt: number;
  subscriptionExpiresAt?: number | null;
  isBlocked: boolean;
  favoriteExerciseIds?: string[];
}

export interface Club {
  id: string;
  name: string;
  logoUrl?: string;
  adminUid: string;
  adminEmail: string;
  coachUids: string[];
  coachEmails?: string[];
  maxCoaches?: number;
  createdAt: number;
  updatedAt?: number;
}

// Category and Phase Definitions (7 Total Categories)
export type ExerciseCategory = 
  | 'WarmUp' 
  | 'Analytisch' 
  | 'Torwart-Athletik' 
  | 'Situativ' 
  | 'Wettkämpfe' 
  | 'Integrativ' 
  | 'CoolDown';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'WarmUp',
  'Analytisch',
  'Torwart-Athletik',
  'Situativ',
  'Wettkämpfe',
  'Integrativ',
  'CoolDown'
];

// Fixed Catalog Tabs in Planner View (Right column)
export const PLANNER_CATALOG_TABS = [
  'ALLE',
  'WarmUp',
  'Analytisch',
  'Torwart-Athletik',
  'Situativ',
  'Wettkämpfe',
  'Integrativ',
  'CoolDown'
] as const;

export type PlannerCatalogTab = typeof PLANNER_CATALOG_TABS[number];

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'ALLE': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-600 text-white border-emerald-400'
  },
  'WarmUp': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  'Analytisch': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  'Torwart-Athletik': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  'Situativ': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  'Wettkämpfe': {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  'Integrativ': {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  'CoolDown': {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  }
};

// Training Phase Definition inside a Structure
export interface TrainingPhaseItem {
  id: string;
  name: string;
  categoryKey?: ExerciseCategory | string;
  color?: string; // e.g. 'amber', 'purple', 'emerald', 'cyan', 'teal', 'blue', 'rose', 'slate'
  defaultDurationMinutes: number;
  description?: string;
  isCustom?: boolean;
}

// Training Structure Definition (Standard or Custom)
export interface TrainingStructure {
  id: string;
  name: string;
  description?: string;
  phases: TrainingPhaseItem[];
  isFavorite: boolean;
  isDefault?: boolean;
  ownerId: string;
  createdAt: number;
  updatedAt?: number;
}

// Standard-Trainingsstruktur: WarmUp -> Analytisch -> Situativ -> Integrativ -> CoolDown
export const DEFAULT_TRAINING_STRUCTURE: TrainingStructure = {
  id: 'default_standard_structure',
  name: 'Standard-Trainingsstruktur',
  description: 'Offizielle NextLevel Struktur: WarmUp -> Analytisch -> Situativ -> Integrativ -> CoolDown.',
  isFavorite: true,
  isDefault: true,
  ownerId: 'system',
  createdAt: 1700000000000,
  phases: [
    {
      id: 'phase_warmup',
      name: 'WarmUp',
      categoryKey: 'WarmUp',
      color: 'amber',
      defaultDurationMinutes: 15,
      description: 'Aufwärmen, schnelle Beine, Aktivierung & Kognition'
    },
    {
      id: 'phase_analytisch',
      name: 'Analytisch',
      categoryKey: 'Analytisch',
      color: 'purple',
      defaultDurationMinutes: 20,
      description: 'Methodische Reihe, isolierte & kombinierte Technikschulung'
    },
    {
      id: 'phase_situativ',
      name: 'Situativ',
      categoryKey: 'Situativ',
      color: 'emerald',
      defaultDurationMinutes: 25,
      description: 'Entscheidungsfindung & spielnahe Taktiksituationen'
    },
    {
      id: 'phase_integrativ',
      name: 'Integrativ',
      categoryKey: 'Integrativ',
      color: 'cyan',
      defaultDurationMinutes: 20,
      description: 'Integration in mannschaftsnahe Spiel- und Großformen'
    },
    {
      id: 'phase_cooldown',
      name: 'CoolDown',
      categoryKey: 'CoolDown',
      color: 'teal',
      defaultDurationMinutes: 10,
      description: 'Regeneration, Auslaufen, Dehnen & Abschlussbesprechung'
    }
  ]
};

// Preset Templates for quick Phase adding
export const PRESET_PHASE_TEMPLATES: TrainingPhaseItem[] = [
  { id: 'tpl_warmup', name: 'WarmUp', categoryKey: 'WarmUp', color: 'amber', defaultDurationMinutes: 15, description: 'Aufwärmen, Aktivierung & Kognition' },
  { id: 'tpl_analytisch', name: 'Analytisch', categoryKey: 'Analytisch', color: 'purple', defaultDurationMinutes: 20, description: 'Technikschulung nach methodischer Reihe' },
  { id: 'tpl_torwart_athletik', name: 'Torwart-Athletik', categoryKey: 'Torwart-Athletik', color: 'blue', defaultDurationMinutes: 20, description: 'Schnelligkeit, Sprungkraft & Rumpfstabilität' },
  { id: 'tpl_situativ', name: 'Situativ', categoryKey: 'Situativ', color: 'emerald', defaultDurationMinutes: 25, description: 'Spielnahe Aktionen & taktische Prinzipien' },
  { id: 'tpl_wettkaempfe', name: 'Wettkämpfe', categoryKey: 'Wettkämpfe', color: 'rose', defaultDurationMinutes: 15, description: 'Torwart-Duelle & Umschalt-Wettbewerbe' },
  { id: 'tpl_integrativ', name: 'Integrativ', categoryKey: 'Integrativ', color: 'cyan', defaultDurationMinutes: 20, description: 'Integration in Mannschaftsspielformen' },
  { id: 'tpl_cooldown', name: 'CoolDown', categoryKey: 'CoolDown', color: 'teal', defaultDurationMinutes: 10, description: 'Regeneration & Nachbesprechung' }
];

// Available Materials
export type MaterialType =
  | 'Bank'
  | 'Blazepods'
  | 'Dummies'
  | 'Hürden'
  | 'Hütchen'
  | 'Medizinball'
  | 'Plyobox'
  | 'Quadrate'
  | 'Rebounder'
  | 'Shield'
  | 'Sprungseile'
  | 'Stangen'
  | 'Strobobrille'
  | 'Widerstandsbänder';

export const ALL_MATERIALS: MaterialType[] = [
  'Bank',
  'Blazepods',
  'Dummies',
  'Hürden',
  'Hütchen',
  'Medizinball',
  'Plyobox',
  'Quadrate',
  'Rebounder',
  'Shield',
  'Sprungseile',
  'Stangen',
  'Strobobrille',
  'Widerstandsbänder'
];

// Age Groups for Exercise Tagging & Filtering
export type AgeGroup = 'immer' | 'U12' | 'U13' | 'U14' | 'U15' | 'U16' | 'U17' | 'U19' | 'Senioren';

export const AGE_GROUPS: AgeGroup[] = [
  'immer',
  'U12',
  'U13',
  'U14',
  'U15',
  'U16',
  'U17',
  'U19',
  'Senioren'
];

// Focus Options for WarmUp & Torwart-Athletik
export type FocusSchwerpunkt = 'unspezifisch' | 'Schnelle Beine' | 'Gleichgewicht' | 'Stabilität' | 'Explosivität';

export const FOCUS_SCHWERPUNKT_OPTIONS: FocusSchwerpunkt[] = [
  'unspezifisch',
  'Schnelle Beine',
  'Gleichgewicht',
  'Stabilität',
  'Explosivität'
];

// Athletische Entwicklungsreize (Spezifikation für Torwart-Athletik bei Schwerpunkt Explosivität)
export type AthletischerEntwicklungsreiz = 
  | 'Gewebetoleranz / Exzentrik'
  | 'Explosivkraft'
  | 'Reaktivkraft'
  | 'Agilität'
  | 'Reaktion / Wiederholbarkeit';

export const ATHLETISCHER_ENTWICKLUNGSREIZ_OPTIONS: AthletischerEntwicklungsreiz[] = [
  'Gewebetoleranz / Exzentrik',
  'Explosivkraft',
  'Reaktivkraft',
  'Agilität',
  'Reaktion / Wiederholbarkeit'
];

// Pitch Surface (Platzbelag / Untergrund für biomechanische Belastungssteuerung)
export type PitchSurface = 'natural_grass' | 'artificial_turf' | 'hybrid_grass' | 'indoor' | 'hardcourt';

export interface PitchSurfaceOption {
  id: PitchSurface;
  label: string;
  shortLabel: string;
  impactFactor: number;
  description: string;
  badgeColor: string;
}

export const PITCH_SURFACE_OPTIONS: PitchSurfaceOption[] = [
  { 
    id: 'natural_grass', 
    label: 'Naturrasen (Weich / Optimal)', 
    shortLabel: 'Naturrasen', 
    impactFactor: 1.0, 
    description: 'Geringe Gelenk- und Aufprallbelastung beim Hechten', 
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' 
  },
  { 
    id: 'hybrid_grass', 
    label: 'Hybridrasen (Mäßige Dämpfung)', 
    shortLabel: 'Hybridrasen', 
    impactFactor: 1.05, 
    description: 'Stabile Grasnarbe mit mäßiger Aufprallbelastung', 
    badgeColor: 'text-teal-400 bg-teal-950/60 border-teal-500/40' 
  },
  { 
    id: 'artificial_turf', 
    label: 'Kunstrasen (Erhöhte Stoßbelastung)', 
    shortLabel: 'Kunstrasen', 
    impactFactor: 1.20, 
    description: 'Erhöhte Stoß- und Scherbelastung für Knie, Hüfte und Wirbelsäule', 
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/40' 
  },
  { 
    id: 'hardcourt', 
    label: 'Hartplatz / Gefrorener Boden (Hohe Belastung)', 
    shortLabel: 'Hartplatz/Frost', 
    impactFactor: 1.35, 
    description: 'Maximale Aufprall- und Gelenkbelastung; Sprungvolumen dosieren', 
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-500/40' 
  },
  { 
    id: 'indoor', 
    label: 'Halle / Futsal (Harter Schwingboden)', 
    shortLabel: 'Halle', 
    impactFactor: 1.25, 
    description: 'Harter Schwingboden; erhöhte Stoßbelastung bei Landungen', 
    badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-500/40' 
  }
];

// Status Options for Element Fields
export type ElementStatus = 'nicht enthalten' | 'enthalten';
export type KognitionStatus = ElementStatus;

export const ELEMENT_STATUS_OPTIONS: ElementStatus[] = [
  'nicht enthalten',
  'enthalten'
];

export const KOGNITION_OPTIONS: KognitionStatus[] = [
  'nicht enthalten',
  'enthalten'
];

// WarmUp Hauptschwerpunkte
export type WarmUpHauptschwerpunkt =
  | 'Basistechniken'
  | 'Ferndistanz'
  | '1vs1'
  | 'Nahdistanz'
  | 'Flanken'
  | 'Early Cross'
  | 'Querpass'
  | 'Verteidigen hinter der Abwehrkette';

export const WARMUP_HAUPTSCHWERPUNKTE: WarmUpHauptschwerpunkt[] = [
  'Basistechniken',
  'Ferndistanz',
  '1vs1',
  'Nahdistanz',
  'Flanken',
  'Early Cross',
  'Querpass',
  'Verteidigen hinter der Abwehrkette'
];

// Situative Schwerpunkte
export type SituativerSchwerpunkt =
  | 'Ferndistanz'
  | '1vs1'
  | 'Nahdistanz'
  | 'Flanken'
  | 'Early Cross'
  | 'Querpass'
  | 'Verteidigen hinter der Abwehrkette';

export const SITUATIVE_SCHWERPUNKTE: SituativerSchwerpunkt[] = [
  'Ferndistanz',
  '1vs1',
  'Nahdistanz',
  'Flanken',
  'Early Cross',
  'Querpass',
  'Verteidigen hinter der Abwehrkette'
];

// Trainingsplaner Themen (Torwarttaktiken, Athletik & Sonstiges)
export const TRAINING_THEMES = [
  '1vs1',
  'Ferndistanz',
  'Nahdistanz',
  'Flanken',
  'Early Cross',
  'Querpass',
  'Verteidigen hinter der Abwehrkette',
  'Spiel mit dem Ball',
  'Standards',
  'Torwart-Athletik',
  'Sonstiges'
] as const;

export type TrainingTheme = typeof TRAINING_THEMES[number];

// 6 Stufen der Methodischen Reihe für Analytisch
export interface MethodischeReiheStufen {
  stufe1?: string;
  stufe2?: string;
  stufe3?: string;
  stufe4?: string;
  stufe5?: string;
  stufe6?: string;
}

export const METHODISCHE_REIHE_LABELS = {
  stufe1: 'Stufe 1 - isoliert, Fokus auf die Arme und Hände',
  stufe2: 'Stufe 2 - isoliert, Fokus auf die Beine und Füße',
  stufe3: 'Stufe 3 - isoliert, im stehen mit Auftaktschritt',
  stufe4: 'Stufe 4 - kombiniert mit einer Positionsanpassung',
  stufe5: 'Stufe 5 - kombiniert mit einer einfachen Entscheidung',
  stufe6: 'Stufe 6 - kombiniert mit einer Positionsanpassung und einer Entscheidung'
};

export interface MethodicalProgression {
  id: string;
  techniqueId: string;
  techniqueName: string;
  group?: string;
  stufen: MethodischeReiheStufen;
  technikprinzipien?: string;
  scope: 'global' | 'club' | 'user';
  clubId?: string | null;
  clubName?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  authorName?: string | null;
  isStandard?: boolean;
  updatedAt: number;
  createdAt: number;
}

export interface TacticalPrinciple {
  id: string;
  tacticId: string;
  tacticName: string;
  group?: string;
  taktikprinzipien: string;
  scope: 'global' | 'club' | 'user';
  clubId?: string | null;
  clubName?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  authorName?: string | null;
  isStandard?: boolean;
  updatedAt: number;
  createdAt: number;
}

// Canvas & Taktikboard Data Types
export type ToolType = 
  | 'select' 
  | 'goal_large' 
  | 'goal_mini' 
  | 'cone' 
  | 'dummy' 
  | 'pole'
  | 'blazepod'
  | 'hurdle' 
  | 'board'
  | 'rebounder'
  | 'bench'
  | 'plyobox'
  | 'medicine_ball'
  | 'square'
  | 'resistance_band'
  | 'jumping_rope'
  | 'ball' 
  | 'gk' 
  | 'player' 
  | 'pass_arrow' 
  | 'run_arrow' 
  | 'dribble_arrow' 
  | 'shot_arrow';

export interface CanvasElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  rotation?: number;
  label?: string;
  color?: string;
  size?: number;
}

export interface TacticalCanvasData {
  elements: CanvasElement[];
  width: number;
  height: number;
}

// Exercise Model with Multi-Tenancy & Publishing
export interface Exercise {
  id?: string;
  title: string;
  category: ExerciseCategory;
  materials: MaterialType[];
  ablauf: string;
  durationMinutes?: number;
  coachingPoints?: string;
  
  // Keeper count requirements (1 - 7)
  minKeepers: number;
  maxKeepers: number;
  
  // Age Group Requirement (default: immer)
  minAgeGroup?: AgeGroup;
  
  // WarmUp Specific Element Fields
  atSchwerpunkt?: FocusSchwerpunkt | string; // Athletisches Element
  kognition?: KognitionStatus | string; // Kognitives Element
  koordinativesElement?: ElementStatus | string; // Koordinatives Element
  visuellesElement?: ElementStatus | string; // Visuelles Element
  warmUpSchwerpunkte?: (WarmUpHauptschwerpunkt | string)[];
  
  // Torwart-Athletik Specific Fields
  athletikSchwerpunkt?: FocusSchwerpunkt | string;
  athletischerEntwicklungsreiz?: AthletischerEntwicklungsreiz | string;
  
  // Analytisch Specific Fields
  technik?: string;
  methodischeReiheStufen?: MethodischeReiheStufen;
  technikprinzipien?: string;
  
  // Situativ Specific Fields
  situativeSchwerpunkte?: SituativerSchwerpunkt[];
  situativerSchwerpunkt?: SituativerSchwerpunkt;
  taktikprinzipien?: string;
  includeTaktikprinzipienInPdf?: boolean;
  
  // Wettkämpfe Specific Fields
  siegbedingung?: string;
  
  // Canvas data & rendered image (Storage URL or Base64 fallback)
  canvasData?: TacticalCanvasData;
  imageUrl?: string;
  imageBase64?: string;

  // Video Link (YouTube, Vimeo, MP4 etc.)
  videoUrl?: string;

  // RBAC & Multi-Tenancy & Review Workflow
  ownerId?: string;
  ownerEmail?: string;
  clubId?: string; // Associated Club ID
  clubName?: string; // Associated Club Name
  isClubPublished?: boolean; // Set by club_admin to publish within the club
  isPublished?: boolean; // Set by master admin to publish globally to all users
  isArchived?: boolean; // Set by admin when rejected / archived
  isPlaceholder?: boolean; // True if this is a fallback placeholder for a deleted/missing exercise
  rejectedAt?: number;
  rejectionReason?: string;
  
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Safe Factory for placeholder/fallback exercises when an exercise ID is deleted or missing
 */
export function createPlaceholderExercise(id: string, customTitle?: string): Exercise {
  return {
    id,
    title: customTitle || `Übung (${id})`,
    category: 'Technik' as ExerciseCategory,
    materials: [],
    ablauf: 'Diese Übung ist in der Datenbank nicht mehr vorhanden.',
    durationMinutes: 15,
    coachingPoints: '',
    minKeepers: 1,
    maxKeepers: 4,
    atSchwerpunkt: 'unspezifisch',
    kognition: 'nicht enthalten',
    koordinativesElement: 'nicht enthalten',
    visuellesElement: 'nicht enthalten',
    warmUpSchwerpunkte: [],
    athletikSchwerpunkt: '',
    athletischerEntwicklungsreiz: '',
    technik: '',
    methodischeReiheStufen: {},
    technikprinzipien: '',
    situativeSchwerpunkte: [],
    situativerSchwerpunkt: undefined,
    taktikprinzipien: '',
    siegbedingung: '',
    isPlaceholder: true,
    isPublished: false,
    createdAt: Date.now()
  };
}

export interface CompetitionRound {
  id: string;
  title: string;
  exerciseId?: string;
  exerciseTitle?: string;
  phaseId?: string;
  phaseName?: string;
  scores: Record<string, number>; // Map of playerId or keeperName -> points in this round
  createdAt: number;
}

export interface TrainingPlan {
  id?: string;
  title: string;
  planTitle?: string;
  date: string;
  planDate?: string;
  trainerName: string;
  targetGroup: string;
  availableKeepers: number;
  warmUpDuration?: number;
  mainDuration?: number;
  totalDuration?: number;
  totalMinutes?: number;
  exerciseCount?: number;
  structureId?: string;
  structureName?: string;
  phaseExercises?: Record<string, string[]>;
  phases?: Record<string, string[]>;
  customPlanExercises?: Record<string, Exercise>;
  notes?: string;
  importantNotes?: string; // "Wichtiges zum Training"
  hasVideoAnalysis?: boolean;
  videoAnalysisNotes?: string;
  keeperInsights?: Record<string, string>; // Map of playerId -> "Erkenntnisse der Trainingseinheit"
  keeperLoadRatings?: Record<string, number>; // Map of playerId -> Belastungsbewertung (RPE 1-10)
  jumpVolume?: 'low' | 'medium' | 'high' | string; // Allgemeines Sprung- & Hechtvolumen der Einheit ('low' | 'medium' | 'high')
  keeperJumpVolumes?: Record<string, 'low' | 'medium' | 'high' | string>; // Individuelles Sprung- & Hechtvolumen pro Torwart
  pitchSurface?: PitchSurface | string; // Platzbelag / Untergrund ('natural_grass' | 'artificial_turf' | 'hybrid_grass' | 'indoor' | 'hardcourt')
  keeperCompetitionScores?: Record<string, number>; // Map of playerId or keeperName -> Points in on-pitch competition (Aggregated or active round)
  competitionTitle?: string; // Title or preset of the competition (e.g. "Torschuss-Duell", "1v1 Turnier")
  competitionRounds?: CompetitionRound[]; // Distinct rounds with drill/phase linkage and scores
  liveNotes?: string; // Quick notes recorded during on-pitch Live Mode
  exerciseExperiences?: Record<string, string>; // Map of exerciseId -> "Erfahrungen mit der Übung"
  playerConversations?: Record<string, string>; // Map of playerId -> "Spielergespräche"
  debriefedAt?: number;
  debriefedByTrainer?: string;
  debriefedByUserId?: string;
  isArchived?: boolean;
  archivedSeasonId?: string;
  archivedAt?: number;
  clubId?: string;
  ownerId?: string;
  ownerEmail?: string;
  authorName?: string;
  createdByName?: string;
  authorRole?: string;
  groupId?: string;
  groupName?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ExerciseExperienceEntry {
  planId?: string;
  planTitle: string;
  planDate: string;
  trainerName: string;
  experienceText: string;
  ownerId?: string;
  ownerEmail?: string;
  clubId?: string;
  debriefedAt?: number;
}

export type SavedTrainingPlan = TrainingPlan;

// ----------------------------------------------------------------------------
// ORGANISATION: TRAININGSGRUPPEN, SPIELER & FEHLZEITEN
// ----------------------------------------------------------------------------

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number | string;
  jerseyNumber?: number | string;
  notes?: string;
  archived?: boolean;
  archivedAt?: number;
  originalGroupId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface PeriodizationFeedback {
  id: string;
  authorUid: string;
  authorEmail?: string;
  authorName: string;
  authorRole?: 'club_admin' | 'master_admin' | 'club_coach' | 'admin' | 'user' | string;
  createdAt: number;
  text: string;
  category?: 'Allgemein' | 'Belastung' | 'Methodik' | 'Inhalte' | 'Reflexion' | string;
  scope?: 'macro' | 'meso' | 'micro';
  targetTitle?: string;
  weekNumber?: number;
  clubId?: string;
}

export interface TrainingGroup {
  id: string;
  name: string; // e.g. "U17 / U19 Leistungsgruppe"
  description?: string;
  ageCategory?: string; // e.g. "U17", "Senioren"
  color?: string; // e.g. "emerald", "sky", "purple", "amber", "rose"
  players: Player[];
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  createdByName?: string;
  createdByRole?: string;
  assignedCoachEmail?: string; // E-Mail des zugewiesenen Trainers (Haupttrainer)
  assignedCoachId?: string; // User ID des zugewiesenen Trainers
  assignedCoachName?: string; // Name des zugewiesenen Trainers
  observerCoachEmails?: string[]; // E-Mails der lizensierten Vereinstrainer mit Beobachter-/Einsichtsrechten
  observerCoachIds?: string[]; // User IDs der Trainer mit Beobachter-Rechten
  clubId?: string;
  createdAt: number;
  updatedAt?: number;
}

export type AbsenceReason = 
  | 'Krankheit' 
  | 'Schule' 
  | 'Belastungssteuerung' 
  | 'Verletzung' 
  | 'Privat' 
  | 'Sonstiges';

export const ABSENCE_REASONS: AbsenceReason[] = [
  'Krankheit',
  'Schule',
  'Belastungssteuerung',
  'Verletzung',
  'Privat',
  'Sonstiges'
];

export interface AbsenceWeekdayOption {
  dayIndex: number; // 0=Sonntag, 1=Montag, ..., 5=Freitag, 6=Samstag
  short: string;
  name: string;
}

export const ABSENCE_WEEKDAYS: AbsenceWeekdayOption[] = [
  { dayIndex: 1, short: 'Mo', name: 'Montag' },
  { dayIndex: 2, short: 'Di', name: 'Dienstag' },
  { dayIndex: 3, short: 'Mi', name: 'Mittwoch' },
  { dayIndex: 4, short: 'Do', name: 'Donnerstag' },
  { dayIndex: 5, short: 'Fr', name: 'Freitag' },
  { dayIndex: 6, short: 'Sa', name: 'Samstag' },
  { dayIndex: 0, short: 'So', name: 'Sonntag' },
];

export interface PlayerAbsence {
  id: string;
  groupId: string;
  groupName?: string;
  playerId: string;
  playerName: string; // "Vorname Nachname"
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional if same day)
  isRecurring?: boolean; // Wiederkehrende Fehlzeit (z.B. immer an einem Wochentag)
  recurringWeekday?: number; // 0=Sonntag, 1=Montag, 2=Dienstag, 3=Mittwoch, 4=Donnerstag, 5=Freitag, 6=Samstag
  recurringWeekdayName?: string; // "Freitag", "Montag", etc.
  reason: AbsenceReason;
  injuredBodyPart?: string;
  note?: string;
  ownerId: string;
  clubId?: string;
  createdAt: number;
}

// ----------------------------------------------------------------------------
// DATENEINGABE: SPIELERBEWERTUNGEN (TECHNIK, TAKTIK, ATHLETIK, MENTAL)
// ----------------------------------------------------------------------------

export type EvaluationCategory = 'Technik' | 'Taktik' | 'Athletik' | 'Mental';

export interface SkillLevelDefinition {
  level: number;
  isPrimary?: boolean;
  definition: string;
  description: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  shortDesc: string;
  group?: string;
  question?: string;
  levels?: SkillLevelDefinition[];
}

export interface EvaluationScaleLevel {
  level: number; // 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
  isPrimary: boolean; // true for primary integer steps 1, 2, 3, 4, 5
  definition: string;
  description: string;
  coachingPointsRef: string;
}

export const EVALUATION_SCALE_LEVELS_TECHNIK: EvaluationScaleLevel[] = [
  {
    level: 1,
    isPrimary: true,
    definition: 'Mangelhaft / Basisniveau',
    description: 'Grobform mit Defiziten: Die Grundbewegung ist noch fehlerhaft (z. B. falsche Armhaltung, ineffiziente Schrittfolge, falsches Timing, unsaubere Körperhaltung). Gelingt selbst in einfachen Abläufen nur inkonstant. Hoher Korrekturbedarf im isolierten Techniktraining.',
    coachingPointsRef: 'Grundlegende Coaching Points werden selbst im isolierten Basistraining ohne Gegnerdruck nicht sauber erfüllt.'
  },
  {
    level: 1.5,
    isPrimary: false,
    definition: 'Zwischenstufe 1 – 2',
    description: 'Erste Ansätze zur fehlerfreien Grundbewegung erkennbar, jedoch weiterhin hohe Inkonstanz.',
    coachingPointsRef: 'Coaching Points werden im isolierten Basistraining ansatzweise, aber noch unvollständig erfüllt.'
  },
  {
    level: 2,
    isPrimary: true,
    definition: 'Entwicklungsfähig',
    description: 'Feinform im geschützten Raum: Die Grundbewegung ist mechanisch korrekt, aber noch nicht automatisiert und wirkt oft steif oder verzögert. Funktioniert im geschützten Setting, bricht aber bei steigender Komplexität ein.',
    coachingPointsRef: 'Coaching Points werden im isolierten Training stabil beherrscht, brechen aber bei Tempo-, Zeit- oder Entscheidungsdruck weg.'
  },
  {
    level: 2.5,
    isPrimary: false,
    definition: 'Zwischenstufe 2 – 3',
    description: 'Solide Ausführung im Training mit zunehmender Stabilität unter leichtem Spieldruck.',
    coachingPointsRef: 'Coaching Points halten leichtem Druck stand, sind aber noch nicht vollständig wettkampffest.'
  },
  {
    level: 3,
    isPrimary: true,
    definition: 'Altersgemäßer Standard',
    description: 'Gefestigt unter Teildruck (Soll-Benchmark): Saubere Feinform mit guter Wiederholgenauigkeit und flüssigen Abläufen. Funktioniert in komplexen Spielformen und im normalen Wettkampf zuverlässig.',
    coachingPointsRef: 'Coaching Points sitzen im Training stabil und halten normalem Wettkampfdruck stand (vereinzelte Fehler nur unter Extrembelastung).'
  },
  {
    level: 3.5,
    isPrimary: false,
    definition: 'Zwischenstufe 3 – 4',
    description: 'Überdurchschnittlich sicher und handlungsschnell, oft auch in Drucksituationen stabil.',
    coachingPointsRef: 'Coaching Points werden auch unter höherem Wettkampfdruck zuverlässig umgesetzt.'
  },
  {
    level: 4,
    isPrimary: true,
    definition: 'Wettkampfstark',
    description: 'Voll wettkampfstabil: Hohe Automatisierung und Effizienz. Die Technik bleibt auch bei maximaler Dynamik, Vorermüdung oder schwierigen Platz-/Wetterverhältnissen fehlerfrei und handlungsschnell abrufbar.',
    coachingPointsRef: 'Coaching Points werden auch unter höchstem Gegner-/Zeitdruck und bei Vorermüdung zumeist fehlerfrei umgesetzt.'
  },
  {
    level: 4.5,
    isPrimary: false,
    definition: 'Zwischenstufe 4 – 5',
    description: 'Herausragende Beherrschung und Antizipation, nahe an der perfekten Benchmark.',
    coachingPointsRef: 'Coaching Points werden nahezu ausnahmslos unter allen Belastungen meisterhaft erfüllt.'
  },
  {
    level: 5,
    isPrimary: true,
    definition: 'Benchmark / Exzellenz',
    description: 'Altersübergreifende Dominanz: Perfekte Beherrschung und situative Variabilität unter extremen Bedingungen. Besitzt in diesem Bereich ein absolutes Qualitätsmerkmal.',
    coachingPointsRef: 'Technik wird perfekt beherrscht, Umsetzung ist vollkommen effektiv und eine besondere Fähigkeit.'
  }
];

export const EVALUATION_SCALE_LEVELS_TAKTIK: EvaluationScaleLevel[] = [
  {
    level: 1,
    isPrimary: true,
    definition: 'Einstiegsniveau',
    description: 'Agiert rein reaktiv und ohne Vororientierung; erkennt Spielsituationen nicht oder deutlich zu spät. Trifft systematisch falsche Grundsatzentscheidungen in Raum, Tiefe und Passwahl.',
    coachingPointsRef: 'Taktische Coaching Points (z. B. Positionierung, Timing, Ansagen) werden selbst in strukturierten Trainingsformen ohne Gegnerdruck nicht umgesetzt.'
  },
  {
    level: 1.5,
    isPrimary: false,
    definition: 'Zwischenstufe 1 – 2',
    description: 'Ansätze taktischen Verständnisses erkennbar, jedoch noch mit erheblicher Verzögerung in der Umsetzung.',
    coachingPointsRef: 'Taktische Coaching Points werden im strukturierten Basistraining ansatzweise beachtet.'
  },
  {
    level: 2,
    isPrimary: true,
    definition: 'Entwicklungsniveau',
    description: 'Taktisches Grundverständnis in der Theorie vorhanden. Die praktische Umsetzung erfolgt jedoch verzögert oder zögerlich.',
    coachingPointsRef: 'Taktische Coaching Points funktionieren in isolierten/vorhersehbaren Spielformen, brechen jedoch bei hohem Spieltempo, Zeitdruck oder unübersichtlichen Situationen weg.'
  },
  {
    level: 2.5,
    isPrimary: false,
    definition: 'Zwischenstufe 2 – 3',
    description: 'Solide situative Entscheidungen im Training mit zunehmender Stabilität bei moderatem Spieltempo.',
    coachingPointsRef: 'Taktische Coaching Points halten moderatem Spieldruck stand, noch nicht voll wettkampffest.'
  },
  {
    level: 3,
    isPrimary: true,
    definition: 'Altersgemäßer Standard',
    description: 'Erkennt Spielmuster und Standardsituationen rechtzeitig. Passt Positionierung, Timing und Aktionen adäquat an (Für Organisation: coacht seine Vorderleute in regulären Spielphasen zuverlässig).',
    coachingPointsRef: 'Taktische Coaching Points werden im normalen Wettkampfbetrieb stabil und fehlerfrei umgesetzt; falsche Entscheidungen treten primär bei extrem hoher Komplexität oder maximalem Gegnerdruck auf.'
  },
  {
    level: 3.5,
    isPrimary: false,
    definition: 'Zwischenstufe 3 – 4',
    description: 'Gute Spielantizipation und zielgerichtetes Verhalten auch in dynamischen Spielphasen.',
    coachingPointsRef: 'Taktische Coaching Points werden auch unter höherem Spieldruck zuverlässig und handlungsschnell erfüllt.'
  },
  {
    level: 4,
    isPrimary: true,
    definition: 'Fortgeschritten',
    description: 'Hohe Spielintelligenz und Antizipation („Proaktiver Torwart“). Erkennt Gefahren vor der Entstehung, (Organisation: steuert das Defensivgefüge vorausschauend) und trifft unter Zeitnot die optimale Folgeentscheidung.',
    coachingPointsRef: 'Taktische Coaching Points werden auch in extremen Druckphasen handlungsschnell und fehlerfrei angewendet.'
  },
  {
    level: 4.5,
    isPrimary: false,
    definition: 'Zwischenstufe 4 – 5',
    description: 'Herausragendes Spielverständnis und exzellente Steuerung des Spielgeschehens auf konstantem Top-Niveau.',
    coachingPointsRef: 'Taktische Coaching Points werden nahezu ausnahmslos meisterhaft und vorausschauend umgesetzt.'
  },
  {
    level: 5,
    isPrimary: true,
    definition: 'Exzellenz',
    description: 'Liest das Spiel wie ein Spielmacher und trifft alle Entscheidungen effizient. (Organisation: dirigiert das Team kontinuierlich und lösungsorientiert).',
    coachingPointsRef: 'Erfüllt alle taktischen Coaching Points auf überregionalem Top-Niveau.'
  }
];

export const EVALUATION_SCALE_LEVELS_BY_CATEGORY: Record<EvaluationCategory, EvaluationScaleLevel[]> = {
  Technik: EVALUATION_SCALE_LEVELS_TECHNIK,
  Taktik: EVALUATION_SCALE_LEVELS_TAKTIK,
  Athletik: EVALUATION_SCALE_LEVELS_TECHNIK,
  Mental: EVALUATION_SCALE_LEVELS_TECHNIK
};

export const getEvaluationScaleLevels = (category: EvaluationCategory): EvaluationScaleLevel[] => {
  return EVALUATION_SCALE_LEVELS_BY_CATEGORY[category] || EVALUATION_SCALE_LEVELS_TECHNIK;
};

export const getSkillScaleLevels = (skill: SkillDefinition, category: EvaluationCategory): EvaluationScaleLevel[] => {
  if (skill.levels && skill.levels.length > 0) {
    const primaryMap = new Map<number, SkillLevelDefinition>();
    skill.levels.forEach(l => primaryMap.set(l.level, l));

    const result: EvaluationScaleLevel[] = [];
    const steps = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

    for (const step of steps) {
      if (primaryMap.has(step)) {
        const item = primaryMap.get(step)!;
        result.push({
          level: step,
          isPrimary: true,
          definition: item.definition,
          description: item.description,
          coachingPointsRef: item.description
        });
      } else {
        const lower = Math.floor(step);
        const upper = Math.ceil(step);
        const lowerItem = primaryMap.get(lower);
        const upperItem = primaryMap.get(upper);
        const def = `Zwischenstufe ${lower} – ${upper}`;
        const desc = lowerItem && upperItem 
          ? `Zwischen [${lower}] ${lowerItem.definition} und [${upper}] ${upperItem.definition}` 
          : def;
        result.push({
          level: step,
          isPrimary: false,
          definition: def,
          description: desc,
          coachingPointsRef: desc
        });
      }
    }
    return result;
  }
  return getEvaluationScaleLevels(category);
};

export const EVALUATION_SCALE_LEVELS: EvaluationScaleLevel[] = EVALUATION_SCALE_LEVELS_TECHNIK;

export const SKILL_DEFINITIONS: Record<EvaluationCategory, SkillDefinition[]> = {
  Technik: [
    // Grundstellungen
    { id: 'tech_a1_ferndistanz', group: 'Grundstellungen', name: 'Ballerwartungshaltung (Ferndistanz)', shortDesc: '' },
    { id: 'tech_a2_nahdistanz', group: 'Grundstellungen', name: 'Ballerwartungshaltung (Nahdistanz)', shortDesc: '' },
    { id: 'tech_a3_flankenzonen', group: 'Grundstellungen', name: 'Ballerwartungshaltung (Flankenzonen)', shortDesc: '' },
    { id: 'tech_a4_lauerstellung', group: 'Grundstellungen', name: 'Lauerstellung', shortDesc: '' },

    // Basistechniken
    { id: 'tech_b1_fangen', group: 'Basistechniken', name: 'Fangen', shortDesc: '' },
    { id: 'tech_b2_korb', group: 'Basistechniken', name: 'Korb', shortDesc: '' },
    { id: 'tech_b3_tiefer_korb', group: 'Basistechniken', name: 'tiefer Korb', shortDesc: '' },
    { id: 'tech_b4_abkippen_flach', group: 'Basistechniken', name: 'Abkippen flach', shortDesc: '' },
    { id: 'tech_b5_abkippen_halbhoch', group: 'Basistechniken', name: 'Abkippen halbhoch', shortDesc: '' },

    // Nah- und Ferndistanz
    { id: 'tech_c1_hand_fuss_reaktion', group: 'Nah- und Ferndistanz', name: 'Hand-Fuß Reaktion', shortDesc: '' },
    { id: 'tech_c2_abtauchen_entlasten', group: 'Nah- und Ferndistanz', name: 'Abtauchen/Entlasten', shortDesc: '' },
    { id: 'tech_c3_abdruck_flach', group: 'Nah- und Ferndistanz', name: 'Abdruck flach', shortDesc: '' },
    { id: 'tech_c4_abdruck_halbhoch', group: 'Nah- und Ferndistanz', name: 'Abdruck halbhoch', shortDesc: '' },
    { id: 'tech_c5_abdruck_hoch', group: 'Nah- und Ferndistanz', name: 'Abdruck hoch', shortDesc: '' },
    { id: 'tech_c6_abdruck_uebergreifen', group: 'Nah- und Ferndistanz', name: 'Abdruck Übergreifen', shortDesc: '' },
    { id: 'tech_c7_lob_abwehr', group: 'Nah- und Ferndistanz', name: 'Lob-Abwehr', shortDesc: '' },

    // 1vs1
    { id: 'tech_d1_ballangriff', group: '1vs1', name: 'Ballangriff', shortDesc: '' },
    { id: 'tech_d2_block_kurz', group: '1vs1', name: 'Block kurz', shortDesc: '' },
    { id: 'tech_d3_block_lang', group: '1vs1', name: 'Block lang', shortDesc: '' },

    // Hohe Bälle & Flanken
    { id: 'tech_e1_fangen_hoch', group: 'Hohe Bälle & Flanken', name: 'Fangen hoch', shortDesc: '' },
    { id: 'tech_e2_fausten_einarmig', group: 'Hohe Bälle & Flanken', name: 'Fausten einarmig', shortDesc: '' },
    { id: 'tech_e3_fausten_beidarmig', group: 'Hohe Bälle & Flanken', name: 'Fausten beidarmig', shortDesc: '' },
    { id: 'tech_e4_kreuzschritt', group: 'Hohe Bälle & Flanken', name: 'Kreuzschritt', shortDesc: '' },

    // Offensivtechniken
    { id: 'tech_f0_erster_kontakt', group: 'Offensivtechniken', name: 'Erster Kontakt', shortDesc: '' },
    { id: 'tech_f1_passspiel', group: 'Offensivtechniken', name: 'Passspiel', shortDesc: '' },
    { id: 'tech_f2_flugball', group: 'Offensivtechniken', name: 'Flugball', shortDesc: '' },
    { id: 'tech_f3_abstoss', group: 'Offensivtechniken', name: 'Abstoß', shortDesc: '' },
    { id: 'tech_f4_abrollen', group: 'Offensivtechniken', name: 'Abrollen', shortDesc: '' },
    { id: 'tech_f5_abwurf', group: 'Offensivtechniken', name: 'Abwurf', shortDesc: '' },
    { id: 'tech_f6_abschlag', group: 'Offensivtechniken', name: 'Abschlag', shortDesc: '' }
  ],
  Taktik: [
    // Allgemein
    { id: 'tact_allg_spielfaehigkeit', group: 'Allgemein', name: 'Spielfähigkeit (das Spiel lesen)', shortDesc: '' },

    // Zielverteidigung
    { id: 'tact_zv_grundposition', group: 'Zielverteidigung', name: 'Grundpositionierung (Breite)', shortDesc: '' },
    { id: 'tact_zv_ferndistanz', group: 'Zielverteidigung', name: 'Ferndistanz', shortDesc: '' },
    { id: 'tact_zv_nahdistanz', group: 'Zielverteidigung', name: 'Nahdistanz', shortDesc: '' },
    { id: 'tact_zv_1vs1', group: 'Zielverteidigung', name: '1vs1', shortDesc: '' },

    // Raumverteidigung
    { id: 'tact_rv_flanken', group: 'Raumverteidigung', name: 'Flanken', shortDesc: '' },
    { id: 'tact_rv_early_cross', group: 'Raumverteidigung', name: 'Early Cross', shortDesc: '' },
    { id: 'tact_rv_querpaesse', group: 'Raumverteidigung', name: 'Querpässe', shortDesc: '' },
    { id: 'tact_rv_hinter_kette', group: 'Raumverteidigung', name: 'Verteidigen hinter der Abwehrkette', shortDesc: '' },

    // Standards
    { id: 'tact_std_freistoesse', group: 'Standards', name: 'Freistöße', shortDesc: '' },
    { id: 'tact_std_eckbaelle', group: 'Standards', name: 'Eckbälle', shortDesc: '' },
    { id: 'tact_std_elfmeter', group: 'Standards', name: 'Elfmeter', shortDesc: '' },

    // Offensive
    { id: 'tact_off_anbieteverhalten', group: 'Offensive', name: 'Anbieteverhalten', shortDesc: '' },
    { id: 'tact_off_spielfortsetzung', group: 'Offensive', name: 'Spielfortsetzung', shortDesc: '' },
    { id: 'tact_off_umschaltverhalten', group: 'Offensive', name: 'Umschaltverhalten', shortDesc: '' },

    // Organisation
    { id: 'tact_org_standards', group: 'Organisation', name: 'Coaching bei Standards', shortDesc: '' },
    { id: 'tact_org_spiel', group: 'Organisation', name: 'Coachings während des Spiels', shortDesc: '' }
  ],
  Athletik: [
    { id: 'ath_grip', name: '1. Griffkraft (Handgrip Strength)', shortDesc: 'Isometrische Maximalkraft (kg) — Fangsicherheit, Handgelenksstabilität & Symmetrie' },
    { id: 'ath_cmj', name: '2. Countermovement Jump (CMJ)', shortDesc: 'Vertikale Sprunghöhe (cm) — Flankensicherung & Lufthoheit' },
    { id: 'ath_lateral_push', name: '3. Single-Leg Lateral Push', shortDesc: 'Laterale Abdruckweite (cm) — Abdruck zielnahes Bein beim Hechten & Dysbalancen' },
    { id: 'ath_sprint', name: '4. Linearsprint (5 m / 10 m)', shortDesc: 'Antritt & Beschleunigung (s) — Verlassen der Linie, 1vs1-Attacke' },
    { id: 'ath_shuttle', name: '5. Hybrid-Shuttle (5-10-5 m)', shortDesc: 'Sidestep-to-Sprint Agilität (s) — Verschieben im Torraum & Nachsetzen' },
    { id: 'ath_medball', name: '6. Medizinballwurf über Kopf', shortDesc: 'Oberkörper-Schnellkraft (m) — Abwurfweite & Rumpf-Explosivität' },
    { id: 'ath_blazepod', name: '7. BlazePod Tisch-Reaktionstest (Trapez-Setup)', shortDesc: 'Reaktionszeit (ms/Hits) & Inhibition (Go/No-Go) — Visuelle Reaktionsschnelligkeit, Auge-Hand-Koordination & Handlungsinhibition' }
  ],
  Mental: [
    {
      id: 'men_resilienz',
      name: 'Resilienz beim Umgang mit Fehlern',
      question: 'Wie verarbeitet der Torwart eigene Patzer, Gegentore oder Fehlentscheidungen?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Bricht nach einem Fehler mental ein; hadert minutenlang mit hängenden Schultern; zeigt unmittelbar Folgefehler aus Verunsicherung.' },
        { level: 2, isPrimary: true, definition: 'Instabil', description: 'Zeigt nach Fehlern spürbare Verunsicherung; meidet risikoreiche Aktionen und benötigt mehrere Minuten oder Zuspruch von außen, um sich zu fangen.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Ärgert sich kurz, schüttelt den Fehler nach 10–15 Sekunden ab und ist bei der nächsten regulären Aktion wieder voll handlungsfähig.' },
        { level: 4, isPrimary: true, definition: 'Hochgradig resilient', description: 'Lebt die „Next-Action“-Mentalität: Richtet die Körpersprache sofort auf, fordert direkt den nächsten Ball und bleibt vollkommen mutig.' },
        { level: 5, isPrimary: true, definition: 'Benchmark', description: 'Reagiert auf Rückschläge mit maximalem Trotz und Leistungssteigerung; stabilisiert nach eigenem Fehler sogar aktiv verunsicherte Mitspieler.' }
      ]
    },
    {
      id: 'men_emotionsregulation',
      name: 'Emotionsregulation',
      question: 'Wie reagiert der Torwart auf Schiedsrichterentscheidungen, Provokationen oder Ungerechtigkeiten?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Verliert bei Gegentoren oder Fehlentscheidungen die Beherrschung (Meckern, Gestikulieren, Frustfouls, Kartenrisiko).' },
        { level: 2, isPrimary: true, definition: 'Instabil', description: 'Lässt sich durch Provokationen oder Nickligkeiten des Gegners aus dem Konzept bringen; hadert sichtbar mit dem Schiedsrichter.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Behält im regulären Spielbetrieb die Fassung; Frust bleibt kontrolliert und führt nicht zu Disziplinlosigkeiten.' },
        { level: 4, isPrimary: true, definition: 'Hochgradig reguliert', description: 'Völlig unbeeindruckt von gegnerischen Psychospielchen oder Fehlentscheidungen; bleibt in hitziger Atmosphäre komplett sachlich.' },
        { level: 5, isPrimary: true, definition: 'Benchmark', description: 'Wirkt in hitzigen Spielphasen als Deeskalator auf dem Platz; kanalisiert Emotionen zu 100 % in maximale Spielschärfe.' }
      ]
    },
    {
      id: 'men_fokus',
      name: 'Fokus & Konzentrationsdauer',
      question: 'Wie hoch ist die Wachheit über 90 Minuten, insbesondere bei langer Unterbeschäftigung?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Träumt bei Ballferne weg, schaut ins Publikum oder verpasst gegnerische Umschaltmomente komplett durch Schrecksekunden.' },
        { level: 2, isPrimary: true, definition: 'Instabil', description: 'Hält den Fokus bei gegnerischem Dauerdruck, schaltet aber bei eigenem Ballbesitz oder langen Ballpassagen mental ab.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Verschiebt mit der Kette zuverlässig mit; hält die Aufmerksamkeit über das normale Spielgeschehen aufrecht.' },
        { level: 4, isPrimary: true, definition: 'Hochgradig fokussiert', description: 'Maximale Schärfe bei jedem gegnerischen Umschaltmoment; blendet Rufe von außen komplett aus; ist nach 80 Minuten Kälte sofort auf den Punkt da.' },
        { level: 5, isPrimary: true, definition: 'Benchmark', description: 'Scannt das Feld permanent wie ein Libero; antizipiert Spielsituationen Sekunden vor dem Entstehen; keine Sekunde geistige Abwesenheit.' }
      ]
    },
    {
      id: 'men_druckresistenz',
      name: 'Druckresistenz & Mut',
      question: 'Wie verhält sich der Keeper in Crunchtime-Momenten (Schlussphase, K.-o.-Spiele, hohes Pressing)?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Wirkt vor großer Kulisse oder bei Rückstand gelähmt; versteckt sich im Spielaufbau und schlägt Bälle nur panisch weg.' },
        { level: 2, isPrimary: true, definition: 'Instabil', description: 'Weicht unter hohem Gegnerdruck von der spielerischen Linie ab; wählt aus Angst vor Fehlern die sicherste, oft passive Option.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Bringt in Spitzenspielen und K.-o.-Phasen seine gewohnte Trainingsleistung zuverlässig auf den Platz.' },
        { level: 4, isPrimary: true, definition: 'Hochgradig druckresistent', description: 'Trifft auch in der 90. Minute bei gegnerischem Pressing mutige, spielerische Entscheidungen; liebt entscheidende Druckmomente.' },
        { level: 5, isPrimary: true, definition: 'Benchmark', description: 'Wächst in K.-o.-Spielen oder im Elfmeterschießen über sich hinaus; strahlt absolute Unbesiegbarkeit aus.' }
      ]
    },
    {
      id: 'men_praesenz',
      name: 'Präsenz & Körpersprache',
      question: 'Welche nonverbale Wirkung erzielt der Torwart auf Mitspieler, Schiedsrichter und Gegner?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Duckmäuserische Haltung; wirkt im Sechzehner klein, unsicher und ängstlich; strahlt Hilflosigkeit aus.' },
        { level: 2, isPrimary: true, definition: 'Instabil', description: 'Aufrechte Haltung nur bei Führungen; fällt bei Gegentoren oder starkem Gegner in sich zusammen.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Sportlich aufrechte, präsente Grundhaltung im Sechzehner; strahlt verlässliche Ruhe auf die Abwehr aus.' },
        { level: 4, isPrimary: true, definition: 'Hochgradig präsent', description: 'Einnehmende, dominante Körpersprache im gesamten Strafraum; signalisiert dem Gegner: „Hier kommt keiner durch.“' },
        { level: 5, isPrimary: true, definition: 'Benchmark', description: 'Aura eines absoluten Führungsspielers; flößt dem Gegner Respekt ein und gibt der Mannschaft schon beim Einlaufen mentale Sicherheit.' }
      ]
    },
    {
      id: 'men_kommunikation',
      name: 'Kommunikationsverhalten',
      question: 'Wie steuert der Torwart seine Vorderleute verbal während des Spiels?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Schweigt 90 Minuten komplett oder beschränkt sich auf nachträgliches Gemecker und Vorwürfe nach Torchancen.' },
        { level: 2, isPrimary: true, definition: 'Instabil', description: 'Coacht nur auf Zuruf der Trainerbank; verstummt vollständig, sobald das Spiel hektisch oder die Abwehr ungeordnet wird.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Coacht Standardabläufe laut, klar und sachlich („Hintermann!“, „Verschieben!“, „Leo!“).' },
        { level: 4, isPrimary: true, definition: 'Hochgradig steuernd', description: 'Coacht vorausschauend vor der Ballabgabe; ordnet das Spiel lösungsorientiert und pusht Mitspieler nach Ballgewinnen.' },
        { level: 5, isPrimary: true, definition: 'Benchmark', description: 'Dirigiert das Team wie ein Cheftrainer auf dem Feld; findet auch in höchster Hektik stets den richtigen Ton zwischen Führung und Beruhigung.' }
      ]
    },
    {
      id: 'men_lernbereitschaft',
      name: 'Lern- & Entwicklungsbereitschaft (Coachability)',
      question: 'Wie nimmt der Torwart Feedback an und wie hoch ist die eigene Motivation zur Weiterentwicklung?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Sucht bei Fehlern sofort Ausreden (Rasen, Handschuhe, Mitspieler); reagiert auf Kritik beleidigt oder abweisend.' },
        { level: 2, isPrimary: true, definition: 'Instabil', description: 'Hört bei Feedback zu, setzt Korrekturen aber nur um, solange der Trainer unmittelbar danebensteht.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Nimmt Videoanalysen und Trainingskorrekturen sachlich an; setzt Anpassungen nach wenigen Trainingseinheiten verlässlich um.' },
        { level: 4, isPrimary: true, definition: 'Hochgradig lernwillig', description: 'Fragt aktiv nach Feedback; fordert Videoanalysen ein; trainiert Details mit hoher Akribie und Eigenmotivation.' },
        { level: 5, isPrimary: true, definition: 'Benchmark', description: 'Echte Profi-Einstellung: Analysiert eigene Spiele akribisch im Vorfeld; treibt den Trainer aktiv mit gezielten Detailfragen voran.' }
      ]
    },
    {
      id: 'men_siegeswille',
      name: 'Siegeswille & Einsatzbereitschaft',
      question: 'Welche Intensität und welchen unbedingten Willen bringt der Torwart in jede einzelne Aktion?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Gibt bei deutlichem Rückstand frühzeitig auf; zieht bei harten 1vs1-Duellen oder Zusammenstößen ängstlich zurück.' },
        { level: 2, isPrimary: true, definition: 'Instabil', description: 'Voller Einsatz nur, wenn es gut läuft; lässt bei widrigen Bedingungen (Kälte, Regen, schlechter Platz) spürbar nach.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Kämpft über 90 Minuten um jeden Ball und zeigt die geforderte Leistungs- und Einsatzbereitschaft.' },
        { level: 4, isPrimary: true, definition: 'Bedingungsloser Wille', description: 'Wirft sich in jede Aktion mit 100 % Konsequenz; sprintet in der 95. Minute bei eigenem Eckball mit nach vorne.' },
        { level: 5, isPrimary: true, definition: 'Benchmark', description: 'Verkörpert absolute Winner-Mentalität; reißt Mitspieler durch pure Willensleistung und kompromisslosen Einsatz aus Lethargie-Phasen heraus.' }
      ]
    },
    {
      id: 'men_leadership',
      name: 'Führung & Teamsteuerung (Leadership)',
      question: 'Wie übernimmt der Torwart Verantwortung und wie stark prägt er die Stabilität und Ausrichtung des gesamten Teams?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv', description: 'Zieht sich sozial komplett zurück oder spaltet das Team durch Schuldzuweisungen; übernimmt keinerlei Verantwortung für das Mannschaftsgefüge.' },
        { level: 2, isPrimary: true, definition: 'Passiv / Mitläufer', description: 'Beschäftigt sich ausschließlich mit sich selbst; zeigt keinerlei ordnenden oder stabilisierenden Einfluss auf Mitspieler.' },
        { level: 3, isPrimary: true, definition: 'Solide (Altersstandard)', description: 'Übernimmt die Führungsrolle im eigenen Sechzehner; ordnet die Kette bei Standards und gibt dem Team eine verlässliche defensive Grundordnung.' },
        { level: 4, isPrimary: true, definition: 'Proaktiver Leader', description: 'Führt das Team aktiv durch Krisen- und Druckphasen; erkennt Verunsicherungen bei Mitspielern frühzeitig, fängt diese auf und fordert taktische Disziplin lautstark und lösungsorientiert ein.' },
        { level: 5, isPrimary: true, definition: 'Benchmark / Führungsspieler', description: 'Unangefochtener Chef auf dem Platz und verlängerter Arm des Trainerteams; besitzt herausragende integrative Autorität und hebt die Leistungsbereitschaft der gesamten Mannschaft messbar an.' }
      ]
    },
    {
      id: 'men_rollen_konkurrenzverhalten',
      name: 'Rollen- & Konkurrenzverhalten (Teamplay im Torwartteam)',
      question: 'Wie verhält sich der Torwart in Konkurrenzsituationen, bei Nicht-Nominierung und innerhalb der täglichen Torwart-Trainingsgruppe?',
      shortDesc: '',
      levels: [
        { level: 1, isPrimary: true, definition: 'Destruktiv / Spaltend', description: 'Reagiert auf die Bankrolle mit Leistungsverweigerung, offenem Frust oder Missgunst; wärmt die Nummer 1 unkonzentriert/lustlos auf und stört das Gruppenklima.' },
        { level: 2, isPrimary: true, definition: 'Passiv / Resignativ', description: 'Akzeptiert die Rolle als Nummer 2 äußerlich, lässt im Training jedoch die Intensität spürbar schleifen; unterstützt den Konkurrenten nur pflichtbewusst auf Anweisung.' },
        { level: 3, isPrimary: true, definition: 'Solide / Professionell (Altersstandard)', description: 'Verhält sich loyal und sportlich fair; wärmt den Spieltagstorwart gewissenhaft auf und hält die eigene Trainingsintensität verlässlich hoch.' },
        { level: 4, isPrimary: true, definition: 'Vorbildlicher Teamplayer & Challenger', description: 'Pusht den Konkurrenten beim Aufwärmen mit maximaler Energie und schärft das Niveau im torwartspezifischen Training durch vollen, fairen Konkurrenzkampf.' },
        { level: 5, isPrimary: true, definition: 'Benchmark / Führungs- & Integrationsfigur', description: 'Verkörpert absolute Loyalität zum Torwartteam; treibt den Konkurrenten zu Höchstleistungen an, coacht und unterstützt ihn von der Bank über 90 Minuten und stellt den Teamerfolg bedingungslos über das eigene Ego.' }
      ]
    }
  ]
};

export interface AthleticTestMetrics {
  testDate?: string;
  gripRightKg?: number | string;
  gripLeftKg?: number | string;
  cmjHeightCm?: number | string;
  lateralPushRightCm?: number | string;
  lateralPushLeftCm?: number | string;
  sprint5mSec?: number | string;
  sprint10mSec?: number | string;
  agilityShuttleRightSec?: number | string;
  agilityShuttleLeftSec?: number | string;
  medBallWeightKg?: number | string;
  medBallDistanceM?: number | string;
  blazePodSimpleHits?: number | string;
  blazePodSimpleAvgTimeMs?: number | string;
  blazePodReactionTimeMs?: number | string;
  blazePodGoNoGoHits?: number | string;
  blazePodGoNoGoErrors?: number | string;
}

export interface BiologicalMaturityMetrics {
  standingHeightCm?: number | string; // Körperhöhe (Standhöhe in cm)
  sittingHeightCm?: number | string;   // Sitzhöhe (in cm)
  weightKg?: number | string;          // Körpergewicht (in kg)
  wingspanCm?: number | string;        // Armspannweite (Wingspan in cm)
  customAge?: number | string;         // Chronologisches Alter (optional)
  measurementDate?: string;            // Messdatum
  maturityOffsetYears?: number | string; // Berechneter Abstand zum PHV (Jahre)
  phvClassification?: 'Pre-PHV' | 'Circa-PHV' | 'Post-PHV';
  estimatedAgeAtPhv?: number | string;
  apeIndex?: number | string;
  sittingHeightRatio?: number | string;
  legLengthCm?: number | string;
}

export interface PlayerEvaluation {
  id: string; // `${playerId}_${category.toLowerCase()}`
  playerId: string;
  playerName: string;
  groupId: string;
  groupName?: string;
  category: EvaluationCategory;
  ratings: Record<string, number>; // skillId -> score (1 to 5, including 0.5 increments)
  athleticMetrics?: AthleticTestMetrics;
  biologicalMetrics?: BiologicalMaturityMetrics;
  overallNotes?: string;
  strengths?: string;
  developmentAreas?: string;
  updatedAt: number;
  ownerId: string;
  clubId?: string;
}

// ----------------------------------------------------------------------------
// SPIELZEITEN (MATCH PLAYTIMES)
// ----------------------------------------------------------------------------
export const MATCH_TEAMS = [
  'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19',
  'Herren 1', 'Herren 2', 'Damen 1', 'Damen 2'
] as const;
export type MatchTeam = typeof MATCH_TEAMS[number];

export const MATCH_LOCATIONS = ['Heimspiel', 'Auswärtsspiel'] as const;
export type MatchLocation = typeof MATCH_LOCATIONS[number];

export const MATCH_TYPES = ['Meisterschaftsspiel', 'Pokalspiel', 'Testspiel'] as const;
export type MatchType = typeof MATCH_TYPES[number];

export interface MatchGradeOption {
  grade: number;
  label: string;
  description: string;
}

export const MATCH_GRADE_OPTIONS: MatchGradeOption[] = [
  { grade: 1, label: 'Note 1', description: 'mindestens fünf herausragende Aktionen' },
  { grade: 2, label: 'Note 2', description: 'mindestens zwei herausragende Aktionen' },
  { grade: 3, label: 'Note 3', description: 'einige gute Aktionen, aber keine schlechten' },
  { grade: 4, label: 'Note 4', description: 'ordentliche Aktionen, mit schlechten Aktionen' },
  { grade: 5, label: 'Note 5', description: 'mehr schlechte als gute Aktionen' },
];

export interface PlayerMatchPlaytime {
  id: string;
  date: string; // YYYY-MM-DD
  team: string; // e.g. 'U17'
  opponent: string; // Gegner
  location: MatchLocation; // 'Heimspiel' | 'Auswärtsspiel'
  matchType?: MatchType; // 'Meisterschaftsspiel' | 'Pokalspiel' | 'Testspiel'
  groupId: string; // Trainingsgruppe
  groupName?: string;
  playerMinutes: Record<string, number>; // playerId -> minutes (e.g. 0, 45, 90)
  playerGrades?: Record<string, number>; // playerId -> grade (1 to 5, optional)
  playerBenchStatus?: Record<string, boolean>; // playerId -> true if Ersatz-Torwart auf der Bank (Warm-up & Standby)
  notes?: string;
  createdAt: number;
  updatedAt: number;
  ownerId?: string;
  clubId?: string;
}

// ----------------------------------------------------------------------------
// FEEDBACKGESPRÄCHE (FEEDBACK TALKS)
// ----------------------------------------------------------------------------
export interface PlayerFeedbackTalk {
  id: string;
  groupId: string;
  groupName?: string;
  playerId: string;
  playerName?: string;
  date: string; // YYYY-MM-DD
  trainer1: string; // Trainer 1 (eigenes Profil vorausgefüllt)
  trainer2?: string; // Trainer 2
  keyPoints: string; // 3 zentrale Eckpunkte des Gesprächs (Freitext)
  createdAt: number;
  updatedAt: number;
  ownerId?: string;
  clubId?: string;
}

// ----------------------------------------------------------------------------
// PERIODISIERUNG: SAISON, MAKRO-, MESO- & MIKROPLANUNG
// ----------------------------------------------------------------------------

export type PeriodizationTopic = 
  | '1vs1'
  | 'Ferndistanz'
  | 'Nahdistanz'
  | 'Flanken'
  | 'Early Cross'
  | 'Querpass'
  | 'Verteidigen hinter der Abwehrkette'
  | 'Spiel mit dem Ball'
  | 'Standards'
  | 'Torwart-Athletik';

export interface PeriodizationTopicDefinition {
  id: PeriodizationTopic;
  label: string;
  description: string;
  color: string;
  badge: string;
}

export const PERIODIZATION_TOPICS: PeriodizationTopicDefinition[] = [
  { 
    id: '1vs1', 
    label: '1vs1', 
    description: 'Raumverteidigung, Blockstellung, Timing & Reaktionsverhalten im 1-gegen-1', 
    color: '#10b981',
    badge: 'bg-emerald-950 text-emerald-300 border-emerald-700'
  },
  { 
    id: 'Ferndistanz', 
    label: 'Ferndistanz', 
    description: 'Grundstellung, Abdruck, Kippen & Schüsse aus der 2. Reihe', 
    color: '#38bdf8',
    badge: 'bg-sky-950 text-sky-300 border-sky-700'
  },
  { 
    id: 'Nahdistanz', 
    label: 'Nahdistanz', 
    description: 'Reaktionsschnelligkeit, Hand-Fuß-Reaktion & Nahdistanzabwehr', 
    color: '#818cf8',
    badge: 'bg-indigo-950 text-indigo-300 border-indigo-700'
  },
  { 
    id: 'Flanken', 
    label: 'Flanken', 
    description: 'Flankenzone, Raumbeherrschung, Fausten & Abfangen hoher Bälle', 
    color: '#fbbf24',
    badge: 'bg-amber-950 text-amber-300 border-amber-700'
  },
  { 
    id: 'Early Cross', 
    label: 'Early Cross', 
    description: 'Raumbeherrschung, Timing & Verteidigen früher Hereingaben aus dem Halbfeld', 
    color: '#eab308',
    badge: 'bg-yellow-950 text-yellow-300 border-yellow-700'
  },
  { 
    id: 'Querpass', 
    label: 'Querpass', 
    description: 'Verschieben, Übergreifen & Verteidigen von Querpässen vor das Tor', 
    color: '#f97316',
    badge: 'bg-orange-950 text-orange-300 border-orange-700'
  },
  { 
    id: 'Verteidigen hinter der Abwehrkette', 
    label: 'Verteidigen hinter der Abwehrkette', 
    description: 'Antizipation, Steilpässe ablaufen, Stellungsspiel & offensives Mitspielen', 
    color: '#c084fc',
    badge: 'bg-purple-950 text-purple-300 border-purple-700'
  },
  { 
    id: 'Spiel mit dem Ball', 
    label: 'Spiel mit dem Ball', 
    description: 'Spieleröffnung, Beidfüßigkeit, Rückpässe & Passgenauigkeit', 
    color: '#2dd4bf',
    badge: 'bg-teal-950 text-teal-300 border-teal-700'
  },
  { 
    id: 'Standards', 
    label: 'Standards', 
    description: 'Eckbälle, Freistöße, Mauerstellung & Strafstöße', 
    color: '#fb7185',
    badge: 'bg-rose-950 text-rose-300 border-rose-700'
  },
  { 
    id: 'Torwart-Athletik', 
    label: 'Torwart-Athletik', 
    description: 'Schnellkraft, Sprungkraft, Antritt & Reaktionsvermögen', 
    color: '#e879f9',
    badge: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-700'
  }
];

export type BuildingBlockType = 
  | 'tw_and_team'    // Torwart- und Mannschaftstraining
  | 'team_only'      // Nur Mannschaftstraining
  | 'tw_only'        // Nur Torwarttraining
  | 'free'           // Frei
  | 'matchday';      // Spieltag

export interface BuildingBlockConfig {
  type: BuildingBlockType;
  label: string;
  shortLabel: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  isGoalkeeperTraining: boolean;
}

export const BUILDING_BLOCK_CONFIGS: Record<BuildingBlockType, BuildingBlockConfig> = {
  tw_and_team: {
    type: 'tw_and_team',
    label: 'Torwart- und Mannschaftstraining',
    shortLabel: 'TW + Team',
    color: '#10b981',
    bgClass: 'bg-emerald-950/80',
    borderClass: 'border-emerald-500/60',
    textClass: 'text-emerald-300',
    isGoalkeeperTraining: true
  },
  team_only: {
    type: 'team_only',
    label: 'Nur Mannschaftstraining',
    shortLabel: 'Nur Team',
    color: '#38bdf8',
    bgClass: 'bg-sky-950/80',
    borderClass: 'border-sky-500/60',
    textClass: 'text-sky-300',
    isGoalkeeperTraining: false
  },
  tw_only: {
    type: 'tw_only',
    label: 'Nur Torwarttraining',
    shortLabel: 'Nur TW',
    color: '#a855f7',
    bgClass: 'bg-purple-950/80',
    borderClass: 'border-purple-500/60',
    textClass: 'text-purple-300',
    isGoalkeeperTraining: true
  },
  free: {
    type: 'free',
    label: 'Frei',
    shortLabel: 'Frei',
    color: '#64748b',
    bgClass: 'bg-slate-900/90',
    borderClass: 'border-slate-700/60',
    textClass: 'text-slate-400',
    isGoalkeeperTraining: false
  },
  matchday: {
    type: 'matchday',
    label: 'Spieltag',
    shortLabel: 'Spieltag',
    color: '#f43f5e',
    bgClass: 'bg-rose-950/80',
    borderClass: 'border-rose-500/60',
    textClass: 'text-rose-300',
    isGoalkeeperTraining: false
  }
};

export interface GroupPeriodizationConfig {
  sessionsPerWeek: number;
  trainingWeeksPerYear?: number; // Default: 40
  totalSeasonSessions: number; // sessionsPerWeek * trainingWeeksPerYear
}

export interface PeriodizationSeason {
  id: string;
  name: string; // e.g. "Saison 2026/2027"
  startYear: number; // 2026 -> 01.07.2026
  endYear: number; // 2027 -> 30.06.2027
  groupConfigs: Record<string, GroupPeriodizationConfig>;
  isCompleted?: boolean;
  completedAt?: number;
  ownerId: string;
  clubId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MacroPlan {
  id: string;
  seasonId: string;
  groupId: string;
  halfYear: 1 | 2; // 1 = 1. Halbjahr (Jul-Dez), 2 = 2. Halbjahr (Jan-Jun)
  name: string;
  totalHalfYearSessions: number; // TE_Saison / 2
  topicDistribution: Record<PeriodizationTopic, number>;
  feedbacks?: PeriodizationFeedback[];
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  createdByName?: string;
  createdByRole?: string;
  clubId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AthleticStimulusOption {
  id: string;
  name: string;
  focus: string;
}

export const DEFAULT_ATHLETIC_STIMULI: AthleticStimulusOption[] = [
  {
    id: 'unspecific',
    name: 'unspezifisch',
    focus: 'Allgemeiner / unspezifischer athletischer Reiz oder Grundlagenbereich.'
  },
  {
    id: 'tissue_eccentric',
    name: 'Gewebetoleranz / Exzentrik',
    focus: 'Ziel: Sehnen, Muskelansätze und Gelenke stoßfest machen; Energie beim Landen und Fallen kontrolliert aufnehmen.\nPrävention: Fester 10-Minuten-Präventionszirkel.\nTraining: Absprung von einer Erhöhung (Drop-Landings), Gewicht abfangen und 2 Sekunden stabil einfrieren (ein-/beidbeinig), dann Aktion; kontrollierte Fallschule und dynamisches seitliches Abrollen/Gleiten zur Aufpralldämpfung.'
  },
  {
    id: 'explosive_power',
    name: 'Explosivkraft',
    focus: 'Ziel: Maximale Kraft in kürzester Zeit aus der Ruhe oder nach langsamen Auftaktbewegungen in den Boden bringen.\nPrävention: Fester 10-Minuten-Präventionszirkel.\nTraining: Sprünge ohne Ausholbewegung aus dem statischen TW-Stand (hoher Ball, Flugparade), einbeinige Flankensprünge ohne Schwung, Start aus Bodenlage, Dreh- und Überkopfwürfe mit leichten Medizinbällen (max. 2–3 kg zur Förderung der Schnellkraft).'
  },
  {
    id: 'reactive_power',
    name: 'Reaktivkraft',
    focus: 'Ziel: Nutzung des Dehnungs-Verkürzungs-Zyklus; Muskeln und Sehnen agieren wie eine elastische Sprungfeder bei minimaler Bodenkontaktzeit (< 250 ms).\nPrävention: Fester 10-Minuten-Präventionszirkel.\nTraining: Hürdensprünge mit minimaler Bodenkontaktzeit, einbeinige Explosivsprünge nach einfachem seitlichem Sprung, Doppel-/Dreifachaktionen über dieselbe Seite (sofortiges Re-Explodieren) => Qualität vor Quantität (ausreichend Pause nach einem Durchgang).'
  },
  {
    id: 'agility',
    name: 'Agilität',
    focus: 'Ziel: Maximale Beschleunigung auf den ersten Metern, Abstoppen und Richtungswechsel für unvorhersehbare Spielsituationen.\nPrävention: Fester 10-Minuten-Präventionszirkel.\nTraining: Aktionen nach 0–5 m Sprint aus der Lauerstellung (1v1, Bälle hinter die Kette), harte Richtungswechsel gegen die Laufrichtung (abgefälschte Bälle/Querpass), Doppel-/Dreifachaktionen zur Gegenseite.'
  },
  {
    id: 'reaction_repeatability',
    name: 'Reaktion / Wiederholbarkeit',
    focus: 'Ziel: Höchste visuelle und motorische Reaktionsschärfe sowie die Fähigkeit, maximale Aktionen unter Vorbelastung ohne Qualitätsverlust zu wiederholen.\nPrävention: Fester 10-Minuten-Präventionszirkel.\nTraining: Mehrfache verdeckte Schüsse z. B. durch Dummies (Ball erst spät in der Flugbahn sichtbar), Mehrfachaktionen mit kurzen, unvollständigen Pausen (30–45 s) zur Simulation von Wettkampfserien.'
  }
];

export const DEFAULT_INTENSITY_LEVELS: string[] = [
  'mittel (ca. 80%)',
  'hoch (ca. 90%)',
  'sehr hoch (ca. 95%)',
  'maximal (ca. 100%)'
];

export const DEFAULT_VOLUME_LEVELS: string[] = [
  'sehr niedrig',
  'niedrig',
  'mittel',
  'hoch',
  'sehr hoch'
];

export const DEFAULT_WEEK_SETTINGS: Record<number, { intensity: string; volume: string }> = {
  1: { intensity: 'mittel (ca. 80%)', volume: 'mittel' },
  2: { intensity: 'hoch (ca. 90%)', volume: 'hoch' },
  3: { intensity: 'mittel (ca. 80%)', volume: 'niedrig' },
  4: { intensity: 'hoch (ca. 90%)', volume: 'mittel' },
  5: { intensity: 'maximal (ca. 100%)', volume: 'mittel' },
  6: { intensity: 'sehr hoch (ca. 95%)', volume: 'sehr niedrig' }
};

export interface MesoDaySlot {
  morning?: BuildingBlockType;
  afternoon?: BuildingBlockType;
}

export interface MesoDayItem {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Mo, 1=Di, ..., 6=So
  dayName: string; // 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'
  slots: MesoDaySlot;
  athleticMicrodosing?: string;

  // Slot 1: Vormittag Attribute
  morningTopic?: string; // Taktik (z.B. 1vs1, Ferndistanz...)
  morningTwIntensity?: string | number; // Intensität der TW im TW-Training (1-10)
  morningTeamFocus?: string; // Schwerpunkt Teamtraining
  morningFieldSize?: 'Klein' | 'Mittel' | 'Groß' | string; // Spielfeldgröße
  morningTeamIntensity?: string | number; // Intensität der TW im Teamtraining (1-10)
  morningTeamDurationMinutes?: number; // Zeit im Teamtraining in Minuten (Standard: 60)
  morningOpponentInfo?: string; // Informationen zum Gegner

  // Slot 2: Nachmittag Attribute
  afternoonTopic?: string; // Taktik
  afternoonTwIntensity?: string | number; // Intensität der TW im TW-Training (1-10)
  afternoonTeamFocus?: string; // Schwerpunkt Teamtraining
  afternoonFieldSize?: 'Klein' | 'Mittel' | 'Groß' | string; // Spielfeldgröße
  afternoonTeamIntensity?: string | number; // Intensität der TW im Teamtraining (1-10)
  afternoonTeamDurationMinutes?: number; // Zeit im Teamtraining in Minuten (Standard: 60)
  afternoonOpponentInfo?: string; // Informationen zum Gegner
}

export interface GeneralWeekTemplateDay {
  dayOfWeek: number; // 0=Mo, 1=Di, ..., 6=So
  dayName: string; // 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'
  slots: MesoDaySlot;
  athleticMicrodosing?: string;

  morningTopic?: string;
  morningTwIntensity?: string | number;
  morningTeamFocus?: string;
  morningFieldSize?: string;
  morningTeamIntensity?: string | number;
  morningTeamDurationMinutes?: number;
  morningOpponentInfo?: string;

  afternoonTopic?: string;
  afternoonTwIntensity?: string | number;
  afternoonTeamFocus?: string;
  afternoonFieldSize?: string;
  afternoonTeamIntensity?: string | number;
  afternoonTeamDurationMinutes?: number;
  afternoonOpponentInfo?: string;
}

export const INTENSITY_SCALE_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;
export const FIELD_SIZE_OPTIONS = ['Klein', 'Mittel', 'Groß'] as const;
export type FieldSizeType = typeof FIELD_SIZE_OPTIONS[number];

export interface TacticalTopicGroup {
  group: string;
  topics: string[];
}

export const PERIODIZATION_TACTICAL_TOPICS: TacticalTopicGroup[] = [
  {
    group: 'Zielverteidigung',
    topics: [
      '1vs1',
      'Ferndistanz',
      'Nahdistanz'
    ]
  },
  {
    group: 'Raumverteidigung',
    topics: [
      'Flanken',
      'Early Cross',
      'Querpässe',
      'Verteidigen hinter der Abwehrkette'
    ]
  },
  {
    group: 'Standards',
    topics: [
      'Freistöße',
      'Eckbälle',
      'Elfmeter'
    ]
  },
  {
    group: 'Offensive & Spieleröffnung',
    topics: [
      'Anbieteverhalten',
      'Spielfortsetzung',
      'Umschaltverhalten'
    ]
  },
  {
    group: 'Organisation & Coaching',
    topics: [
      'Coaching bei Standards',
      'Coachings während des Spiels'
    ]
  }
];

export interface MesoWeekItem {
  weekNumber: number; // 1 to 6
  tacticalFocus?: string;
  intensity?: string;
  volume?: string;
  isSaved?: boolean;
  days: MesoDayItem[];
}

export interface MesoPlan {
  id: string;
  macroPlanId: string;
  seasonId: string;
  groupId: string;
  mesoIndex: number; // 1 to 5 (max 5 pro Makroplan)
  name: string; // z.B. "Mesoplan 1 (Woche 1-6)"
  startDate: string; // YYYY-MM-DD (Erster Montag)
  endDate: string; // YYYY-MM-DD (Sonntag nach 6 Wochen)
  athleticFocus?: string; // Standard für Jugend/Gesamtzyklus
  forAdults?: boolean; // Checkbox "für Erwachsene"
  targetDefenseGoals?: string; // Konkrete Entwicklungsziele in der Zielverteidigung
  targetDefenseTechnique1?: string; // Technikfokus ZV 1
  targetDefenseTechnique2?: string; // Technikfokus ZV 2
  spaceDefenseGoals?: string; // Konkrete Entwicklungsziele in der Raumverteidigung
  spaceDefenseTechnique3?: string; // Technikfokus RV 3
  spaceDefenseTechnique4?: string; // Technikfokus RV 4
  // Meso-Reflexion
  athleticStimulusAchieved?: 'ja' | 'in Teilen' | 'nein';
  targetDefenseReflection?: string; // Reflexion des Zielverteidigungsziels
  spaceDefenseReflection?: string; // Reflexion des Raumverteidigungsziels
  intensityFocusLearning?: string; // Learning für Intensität & Fokus
  generalWeekTemplate?: GeneralWeekTemplateDay[]; // Allgemeine Struktur der Wochenplanung (Vorauswahl)
  weeks: MesoWeekItem[];
  feedbacks?: PeriodizationFeedback[];
  isSaved?: boolean;
  isReflected?: boolean;
  isCompleted: boolean;
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  createdByName?: string;
  createdByRole?: string;
  clubId?: string;
  createdAt: number;
  updatedAt: number;
}

export const TARGET_DEFENSE_TECHNIQUES: string[] = [
  'Ballerwartungshaltung (Ferndistanz)',
  'Ballerwartungshaltung (Nahdistanz)',
  'Fangen',
  'Korb',
  'tiefer Korb',
  'Abkippen flach',
  'Abkippen halbhoch',
  'Hand-Fuß Reaktion',
  'Abtauchen / Entlasten',
  'Abdruck flach',
  'Abdruck halbhoch',
  'Abdruck hoch',
  'Abdruck Übergreifen',
  'Lob-Abwehr',
  'Ballangriff',
  'Block kurz',
  'Block lang'
];

export const SPACE_DEFENSE_TECHNIQUES: string[] = [
  'Ballerwartungshaltung (Flankenzonen)',
  'Lauerstellung',
  'Kreuzschritt',
  'Fangen hoch',
  'Fausten einarmig',
  'Fausten beidarmig'
];

export interface PlannerTacticalTopicGroup {
  groupName: string;
  topics: string[];
}

export const PLANNER_TACTICAL_TOPICS: PlannerTacticalTopicGroup[] = [
  {
    groupName: 'Zielverteidigung (Taktik & Technik)',
    topics: [
      'Grundpositionierung (Breite)',
      'Ferndistanz',
      'Nahdistanz',
      '1vs1',
      'Ballerwartungshaltung (Ferndistanz)',
      'Ballerwartungshaltung (Nahdistanz)',
      'Fangen',
      'Korb',
      'tiefer Korb',
      'Abkippen flach',
      'Abkippen halbhoch',
      'Hand-Fuß Reaktion',
      'Abtauchen / Entlasten',
      'Abdruck flach',
      'Abdruck halbhoch',
      'Abdruck hoch',
      'Abdruck Übergreifen',
      'Lob-Abwehr',
      'Ballangriff',
      'Block kurz',
      'Block lang'
    ]
  },
  {
    groupName: 'Raumverteidigung (Flanken & Tiefe)',
    topics: [
      'Flanken',
      'Early Cross',
      'Querpässe',
      'Verteidigen hinter der Abwehrkette',
      'Ballerwartungshaltung (Flankenzonen)',
      'Lauerstellung',
      'Kreuzschritt',
      'Fangen hoch',
      'Fausten einarmig',
      'Fausten beidarmig'
    ]
  },
  {
    groupName: 'Standardsituationen',
    topics: [
      'Freistöße',
      'Eckbälle',
      'Elfmeter',
      'Coaching bei Standards'
    ]
  },
  {
    groupName: 'Offensive & Spieleröffnung',
    topics: [
      'Anbieteverhalten',
      'Spielfortsetzung',
      'Umschaltverhalten',
      'Erster Kontakt',
      'Passspiel',
      'Flugball',
      'Abstoß',
      'Abrollen',
      'Abwurf',
      'Abschlag'
    ]
  },
  {
    groupName: 'Organisation & Spielverständnis',
    topics: [
      'Spielfähigkeit (das Spiel lesen)',
      'Coachings während des Spiels'
    ]
  },
  {
    groupName: 'Sonstiges',
    topics: [
      'Sonstiges'
    ]
  }
];

export type TrainingIntensity = 'Niedrig' | 'Mittel' | 'Hoch' | 'Maximal';

export interface MicroDayPlan {
  date: string;
  dayOfWeek: number;
  dayName: string;
  morningBlock?: BuildingBlockType;
  afternoonBlock?: BuildingBlockType;
  twSessionIntensity?: TrainingIntensity;
  twSessionTopic?: PeriodizationTopic;
  notes?: string;
}

export interface MicroPlan {
  id: string;
  mesoPlanId: string;
  macroPlanId: string;
  seasonId: string;
  groupId: string;
  weekIndex: number; // 1 bis 6
  name: string; // z.B. "Mikroplan Woche 1"
  startDate: string;
  endDate: string;
  days: MicroDayPlan[];
  isSaved: boolean;
  ownerId: string;
  clubId?: string;
  createdAt: number;
  updatedAt: number;
}

