export const CATEGORY_COLORS_LIVE: Record<string, { bg: string; text: string; border: string }> = {
  'WarmUp': {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/40'
  },
  'Analytisch': {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/40'
  },
  'Torwart-Athletik': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/40'
  },
  'Situativ': {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40'
  },
  'Wettkämpfe': {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/40'
  },
  'Integrativ': {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40'
  },
  'CoolDown': {
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    border: 'border-teal-500/40'
  }
};

export function formatSeconds(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
