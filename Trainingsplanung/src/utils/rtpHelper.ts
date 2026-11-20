import type { Player, PlayerAbsence } from '../types';

export interface ResolvedRtpPlayer {
  id: string;
  name: string;
  stage: string;
  allowedActions: string;
  maxRpe?: number;
  source: 'manual' | 'absence' | 'both';
}

function normalizeYMD(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const de = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (de) {
    return `${de[3]}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}`;
  }
  return '';
}

function formatDE(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return y && m && d ? `${d}.${m}.${y}` : ymd;
}

/**
 * Resolves all active Return-to-Play (RTP) players for a group on a target date:
 * 1) Manual RTP status toggled on the player profile (always active while enabled).
 * 2) Automatic 7-day recovery/RTP reminder after a documented 'Verletzung' or 'Krankheit' absence.
 */
export function resolveGroupRtpPlayers(
  players: Player[] = [],
  absences: PlayerAbsence[] = [],
  referenceDateStr: string = new Date().toISOString().slice(0, 10)
): ResolvedRtpPlayer[] {
  const refYmd = normalizeYMD(referenceDateStr) || new Date().toISOString().slice(0, 10);
  const refMs = new Date(`${refYmd}T12:00:00`).getTime();

  const result: ResolvedRtpPlayer[] = [];

  players
    .filter(p => !p.archived)
    .forEach(player => {
      const fullName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Torwart';
      const manual = player.returnToPlay?.active ? player.returnToPlay : null;

      // Find most recent Verletzung or Krankheit absence 1..7 days prior to referenceDateStr
      // (only if player is not marked absent with Verletzung/Krankheit on referenceDateStr itself)
      const playerAbsences = absences.filter(a => a.playerId === player.id && !a.isRecurring);
      const isAbsentToday = playerAbsences.some(a => {
        if (a.reason !== 'Verletzung' && a.reason !== 'Krankheit') return false;
        const startYmd = normalizeYMD(a.startDate || (a as any).date);
        const endYmd = normalizeYMD(a.endDate) || startYmd;
        if (!startYmd) return false;
        return startYmd <= refYmd && refYmd <= endYmd;
      });

      let recentRecoveryAbsence: { reason: string; dateYmd: string; bodyPart?: string; note?: string } | null = null;
      if (!isAbsentToday) {
        let bestDiff = 999;
        playerAbsences.forEach(a => {
          if (a.reason !== 'Verletzung' && a.reason !== 'Krankheit') return;
          const absYmd = normalizeYMD(a.endDate) || normalizeYMD(a.startDate || (a as any).date);
          if (!absYmd) return;
          const absMs = new Date(`${absYmd}T12:00:00`).getTime();
          const diffDays = Math.round((refMs - absMs) / 86400000);
          if (diffDays >= 1 && diffDays <= 7 && diffDays < bestDiff) {
            bestDiff = diffDays;
            recentRecoveryAbsence = {
              reason: a.reason,
              dateYmd: absYmd,
              bodyPart: a.injuredBodyPart,
              note: a.note
            };
          }
        });
      }

      if (manual && recentRecoveryAbsence) {
        const rec = recentRecoveryAbsence as { reason: string; dateYmd: string; bodyPart?: string; note?: string };
        result.push({
          id: player.id,
          name: fullName,
          stage: manual.stage,
          allowedActions: manual.allowedActions || `Rückkehr nach ${rec.reason}${rec.bodyPart ? ` (${rec.bodyPart})` : ''} am ${formatDE(rec.dateYmd)}`,
          maxRpe: manual.maxRpe,
          source: 'both'
        });
      } else if (manual) {
        result.push({
          id: player.id,
          name: fullName,
          stage: manual.stage,
          allowedActions: manual.allowedActions || '',
          maxRpe: manual.maxRpe,
          source: 'manual'
        });
      } else if (recentRecoveryAbsence) {
        const rec = recentRecoveryAbsence as { reason: string; dateYmd: string; bodyPart?: string; note?: string };
        const details = [rec.bodyPart, rec.note].filter(Boolean).join(' – ');
        result.push({
          id: player.id,
          name: fullName,
          stage: `Wiedereinstieg (${rec.reason})`,
          allowedActions: `Letzte ${rec.reason} am ${formatDE(rec.dateYmd)}${details ? ` (${details})` : ''} — Belastung schrittweise steigern`,
          source: 'absence'
        });
      }
    });

  return result;
}
