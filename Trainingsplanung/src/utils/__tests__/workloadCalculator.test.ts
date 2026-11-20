import { describe, it, expect } from 'vitest';
import { calculatePlayerWorkload } from '../workloadCalculator';
import type { TrainingPlan } from '../../types';

describe('workloadCalculator', () => {
  it('filters savedPlans strictly by groupId so other groups do not leak', () => {
    const player = { id: 'p1', firstName: 'Max', lastName: 'Mustermann', groupId: 'g1', groupName: 'U17' };
    const plans: TrainingPlan[] = [
      {
        id: 'plan_g1',
        title: 'U17 Einheit',
        date: '2026-11-18',
        groupId: 'g1',
        targetGroup: 'U17',
        totalMinutes: 60,
        keeperLoadRatings: { p1: 7 },
        createdAt: 1
      },
      {
        id: 'plan_g2',
        title: 'U19 Einheit',
        date: '2026-11-18',
        groupId: 'g2',
        targetGroup: 'U19',
        totalMinutes: 90,
        keeperLoadRatings: { p1: 9 },
        createdAt: 2
      }
    ];

    const res = calculatePlayerWorkload(player, plans, '2026-11-19');
    expect(res.acuteLoad7d).toBe(420); // 60 * 7 only, not U19 plan
  });

  it('calculates duration-weighted RPE when 2+ sessions happen on the same day', () => {
    const player = { id: 'p1', firstName: 'Max', lastName: 'Mustermann', groupId: 'g1', groupName: 'U17' };
    const plans: TrainingPlan[] = [
      {
        id: 's1',
        title: 'Aktivierung',
        date: '2026-11-18',
        groupId: 'g1',
        totalMinutes: 20,
        keeperLoadRatings: { p1: 3 }, // load 60
        createdAt: 1
      },
      {
        id: 's2',
        title: 'Haupttraining',
        date: '2026-11-18',
        groupId: 'g1',
        totalMinutes: 80,
        keeperLoadRatings: { p1: 8 }, // load 640
        createdAt: 2
      }
    ];

    const res = calculatePlayerWorkload(player, plans, '2026-11-19');
    // Total load = 700, total minutes = 100 -> weighted RPE = 7.0
    expect(res.acuteLoad7d).toBe(700);
    const entry = res.dailyHistory.find(d => d.date === '2026-11-18');
    expect(entry?.rpe).toBe(7);
  });
});
