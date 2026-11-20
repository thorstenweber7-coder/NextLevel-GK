import { describe, it, expect } from 'vitest';
import { resolveGroupRtpPlayers } from '../rtpHelper';
import type { Player, PlayerAbsence } from '../../types';

describe('resolveGroupRtpPlayers', () => {
  it('shows automatic RTP recovery reminder 1..7 days after Verletzung or Krankheit', () => {
    const players: Player[] = [
      { id: 'c1', firstName: 'Carlo', lastName: 'Siewer', createdAt: 1 }
    ];
    const absences: PlayerAbsence[] = [
      {
        id: 'a1',
        groupId: 'g1',
        playerId: 'c1',
        playerName: 'Carlo Siewer',
        startDate: '2026-11-19',
        reason: 'Verletzung',
        injuredBodyPart: 'vorderer Oberschenkel links',
        ownerId: 'u1',
        createdAt: 1
      }
    ];

    // On 2026-11-19 itself: player is absent, no RTP banner
    expect(resolveGroupRtpPlayers(players, absences, '2026-11-19')).toHaveLength(0);

    // On 2026-11-20 (next day): RTP reminder appears
    const nextDay = resolveGroupRtpPlayers(players, absences, '2026-11-20');
    expect(nextDay).toHaveLength(1);
    expect(nextDay[0].name).toBe('Carlo Siewer');
    expect(nextDay[0].stage).toContain('Verletzung');
    expect(nextDay[0].allowedActions).toContain('vorderer Oberschenkel links');
  });

  it('includes manual returnToPlay status even without absences', () => {
    const players: Player[] = [
      {
        id: 'p1',
        firstName: 'Max',
        lastName: 'Muster',
        returnToPlay: {
          active: true,
          stage: 'Teilintegration',
          allowedActions: 'Kein Hechten rechts',
          maxRpe: 6
        },
        createdAt: 1
      }
    ];

    const res = resolveGroupRtpPlayers(players, [], '2026-11-20');
    expect(res).toHaveLength(1);
    expect(res[0].maxRpe).toBe(6);
    expect(res[0].allowedActions).toBe('Kein Hechten rechts');
  });
});
