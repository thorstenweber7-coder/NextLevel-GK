import type { AbsenceReason } from '../../types';

export const TECHNIQUE_GROUP_CONFIG: Record<string, { label: string; hex: string; bg: string; text: string; border: string; badge: string }> = {
  'Grundstellungen': {
    label: 'Grundstellungen',
    hex: '#0284c7', // sky
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/40',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  'Basistechniken': {
    label: 'Basistechniken',
    hex: '#10b981', // emerald
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  'Nah- und Ferndistanz': {
    label: 'Nah- & Ferndistanz',
    hex: '#6366f1', // indigo
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/40',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  '1vs1': {
    label: '1vs1',
    hex: '#f59e0b', // amber
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  'Hohe Bälle & Flanken': {
    label: 'Hohe Bälle & Flanken',
    hex: '#a855f7', // purple
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  'Offensivtechniken': {
    label: 'Offensivtechniken',
    hex: '#f43f5e', // rose
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  }
};

export const TRAINING_PHASE_CONFIG: Record<string, {
  key: string;
  name: string;
  shortName: string;
  description: string;
  hex: string;
  bg: string;
  text: string;
  border: string;
  badge: string;
  gradient: string;
}> = {
  'WarmUp': {
    key: 'WarmUp',
    name: 'WarmUp',
    shortName: 'WarmUp',
    description: 'Aufwärmen, schnelle Beine, Aktivierung & Kognition',
    hex: '#f59e0b',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    gradient: 'from-amber-500 to-amber-600'
  },
  'Analytisch': {
    key: 'Analytisch',
    name: 'Analytisch',
    shortName: 'Analytisch',
    description: 'Methodische Reihe, isolierte & kombinierte Technikschulung',
    hex: '#a855f7',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    gradient: 'from-purple-500 to-purple-600'
  },
  'Situativ': {
    key: 'Situativ',
    name: 'Situativ',
    shortName: 'Situativ',
    description: 'Entscheidungsfindung & spielnahe Taktiksituationen',
    hex: '#10b981',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  'Integrativ': {
    key: 'Integrativ',
    name: 'Integrativ',
    shortName: 'Integrativ',
    description: 'Integration in mannschaftsnahe Spiel- & Großformen',
    hex: '#06b6d4',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    gradient: 'from-cyan-500 to-cyan-600'
  },
  'CoolDown': {
    key: 'CoolDown',
    name: 'CoolDown',
    shortName: 'CoolDown',
    description: 'Regeneration, Auslaufen, Dehnen & Besprechung',
    hex: '#14b8a6',
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    border: 'border-teal-500/40',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    gradient: 'from-teal-500 to-teal-600'
  }
};

export const MATERIAL_CONFIG: Record<string, { label: string; hex: string; bg: string; text: string; border: string; badge: string; gradient: string }> = {
  'Hütchen': {
    label: 'Hütchen',
    hex: '#f59e0b',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    gradient: 'from-amber-500 to-amber-600'
  },
  'Dummies': {
    label: 'Dummies',
    hex: '#ef4444',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/40',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    gradient: 'from-red-500 to-red-600'
  },
  'Hürden': {
    label: 'Hürden',
    hex: '#3b82f6',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    gradient: 'from-blue-500 to-blue-600'
  },
  'Strobobrille': {
    label: 'Strobobrille',
    hex: '#a855f7',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    gradient: 'from-purple-500 to-purple-600'
  },
  'Widerstandsbänder': {
    label: 'Widerstandsbänder',
    hex: '#ec4899',
    bg: 'bg-pink-500/15',
    text: 'text-pink-400',
    border: 'border-pink-500/40',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    gradient: 'from-pink-500 to-pink-600'
  },
  'Quadrate': {
    label: 'Quadrate',
    hex: '#14b8a6',
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    border: 'border-teal-500/40',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    gradient: 'from-teal-500 to-teal-600'
  },
  'Stangen': {
    label: 'Stangen',
    hex: '#eab308',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    gradient: 'from-yellow-500 to-yellow-600'
  },
  'Blazepods': {
    label: 'Blazepods',
    hex: '#06b6d4',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    gradient: 'from-cyan-500 to-cyan-600'
  },
  'Sprungseile': {
    label: 'Sprungseile',
    hex: '#8b5cf6',
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    border: 'border-violet-500/40',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    gradient: 'from-violet-500 to-violet-600'
  },
  'Shield': {
    label: 'Shield',
    hex: '#10b981',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  'Board': {
    label: 'Shield',
    hex: '#10b981',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  'Rebounder': {
    label: 'Rebounder',
    hex: '#6366f1',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/40',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    gradient: 'from-indigo-500 to-indigo-600'
  }
};

export const getMaterialConfig = (materialName: string) => {
  if (MATERIAL_CONFIG[materialName]) return MATERIAL_CONFIG[materialName];
  return {
    label: materialName,
    hex: '#6366f1',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/40',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    gradient: 'from-indigo-500 to-indigo-600'
  };
};

export const THEME_COLORS: Record<string, { hex: string; bg: string; text: string; border: string; badge: string }> = {
  '1vs1': {
    hex: '#10b981',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  'Ferndistanz': {
    hex: '#0284c7',
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/40',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  'Nahdistanz': {
    hex: '#6366f1',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/40',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  'Flanken': {
    hex: '#f59e0b',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  'Early Cross': {
    hex: '#eab308',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
  },
  'Querpass': {
    hex: '#f43f5e',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  'Verteidigen hinter der Abwehrkette': {
    hex: '#a855f7',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  'Spiel mit dem Ball': {
    hex: '#14b8a6',
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    border: 'border-teal-500/40',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  },
  'Standards': {
    hex: '#ea580c',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/40',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  },
  'Torwart-Athletik': {
    hex: '#3b82f6',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  'Sonstiges': {
    hex: '#64748b',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/40',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
  }
};

export const FALLBACK_PALETTE = ['#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#eab308', '#f97316'];

export const getThemeColor = (themeName: string, index = 0) => {
  if (THEME_COLORS[themeName]) return THEME_COLORS[themeName];
  const fallbackHex = FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  return {
    hex: fallbackHex,
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    badge: 'bg-slate-800 text-slate-200 border-slate-700'
  };
};

export const REASON_COLORS: Record<AbsenceReason, { bg: string; text: string; hex: string }> = {
  'Krankheit': { bg: 'bg-amber-950/60', text: 'text-amber-400', hex: '#f59e0b' },
  'Schule': { bg: 'bg-sky-950/60', text: 'text-sky-400', hex: '#0284c7' },
  'Belastungssteuerung': { bg: 'bg-emerald-950/60', text: 'text-emerald-400', hex: '#10b981' },
  'Verletzung': { bg: 'bg-rose-950/60', text: 'text-rose-400', hex: '#f43f5e' },
  'Privat': { bg: 'bg-purple-950/60', text: 'text-purple-400', hex: '#a855f7' },
  'Sonstiges': { bg: 'bg-slate-900', text: 'text-slate-400', hex: '#64748b' }
};

export const getAbsenceReasonColor = (reason: AbsenceReason) => {
  return REASON_COLORS[reason] || { bg: 'bg-slate-900', text: 'text-slate-400', hex: '#64748b' };
};

export const getScaleRatingLabel = (avg: number): string => {
  if (avg >= 4.5) return 'Hervorragend / Elite (Stufe 5)';
  if (avg >= 3.5) return 'Sehr gut / Fortgeschritten (Stufe 4)';
  if (avg >= 2.5) return 'Gut / Durchschnitt (Stufe 3)';
  if (avg >= 1.5) return 'Ausbaufähig / Basis (Stufe 2)';
  return 'Entwicklungsbedarf (Stufe 1)';
};

// ----------------------------------------------------------------------------
// ATTENDANCE & KEEPER AVERAGE CALCULATIONS
// ----------------------------------------------------------------------------

export function normalizeDateToYMD(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().replace(/\s*\([AB\d]+\)$/, "").trim().split("T")[0].split(" ")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const deMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deMatch) {
    return `${deMatch[3]}-${deMatch[2].padStart(2, "0")}-${deMatch[1].padStart(2, "0")}`;
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? clean.slice(0, 10) : d.toISOString().substring(0, 10);
}

export function isPlayerAbsentOnPlan(
  playerId: string,
  planDateStr: string | undefined | null,
  absences: any[] = []
): boolean {
  if (!planDateStr) return false;
  const pYMD = normalizeDateToYMD(planDateStr);
  if (!pYMD) return false;

  return absences.some(abs => {
    if (abs.playerId !== playerId) return false;
    if (!abs.startDate) return false;
    const startYMD = normalizeDateToYMD(abs.startDate);
    if (!startYMD) return false;
    const endYMD = normalizeDateToYMD(abs.endDate || abs.startDate) || startYMD;
    return pYMD >= startYMD && pYMD <= endYMD;
  });
}

export function calculateAverageKeeperAttendance(
  plans: any[],
  groups: any[] = [],
  absences: any[] = []
): string {
  if (!plans || plans.length === 0) return '0';

  let totalAttendedCountAcrossPlans = 0;

  plans.forEach(plan => {
    const planDateStr = (plan.date || plan.planDate || "").trim();

    // 1. Find matching training group
    let matchingGroup = groups.find(g =>
      (plan.groupId && g.id === plan.groupId) ||
      (plan.trainingGroupId && g.id === plan.trainingGroupId) ||
      (plan.targetGroup && g.name && g.name.toLowerCase() === plan.targetGroup.toLowerCase()) ||
      (plan.groupName && g.name && g.name.toLowerCase() === plan.groupName.toLowerCase())
    );

    // If no direct name/id match, but only 1 group exists, use that group
    if (!matchingGroup && groups.length === 1) {
      matchingGroup = groups[0];
    }

    const activeKeepers = matchingGroup
      ? (matchingGroup.players || []).filter((p: any) => !p.archived)
      : [];

    if (activeKeepers.length > 0) {
      // Calculate how many keepers were present on that day
      const presentCount = activeKeepers.filter((p: any) => !isPlayerAbsentOnPlan(p.id, planDateStr, absences)).length;
      totalAttendedCountAcrossPlans += presentCount;
    } else {
      // Fallback if no group/players configured
      const fallback = Number(plan.availableKeepers);
      totalAttendedCountAcrossPlans += (!isNaN(fallback) && fallback > 0) ? fallback : 3;
    }
  });

  return (totalAttendedCountAcrossPlans / plans.length).toFixed(1);
}

