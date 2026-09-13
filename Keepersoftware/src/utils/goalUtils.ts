import { Goal } from '../types';

/**
 * Calculates whether 3 weeks (21 days) have passed since the goal creation or last extension.
 * Returns { isEvaluable: boolean, daysRemaining: number, unlockDateStr: string, progressPercent: number }
 */
export function getGoalEvaluationStatus(goal: Partial<Goal> | null | undefined): {
  isEvaluable: boolean;
  daysRemaining: number;
  unlockDateStr: string;
  totalDays: number;
  passedDays: number;
  progressPercent: number;
} {
  if (!goal) {
    return {
      isEvaluable: true,
      daysRemaining: 0,
      unlockDateStr: '',
      totalDays: 21,
      passedDays: 21,
      progressPercent: 100
    };
  }

  const baseDateStr = goal.renewedAt || goal.date;
  let targetUnlockTimestamp: number;
  let startTimestamp: number;

  if (goal.evaluableFrom) {
    const [ey, em, ed] = goal.evaluableFrom.split('-').map(Number);
    const unlockDate = new Date(ey, em - 1, ed, 0, 0, 0, 0);
    targetUnlockTimestamp = unlockDate.getTime();
    
    if (baseDateStr) {
      const [by, bm, bd] = baseDateStr.split('-').map(Number);
      startTimestamp = new Date(by, bm - 1, bd, 0, 0, 0, 0).getTime();
    } else {
      startTimestamp = targetUnlockTimestamp - 21 * 24 * 60 * 60 * 1000;
    }
  } else if (baseDateStr) {
    const [y, m, d] = baseDateStr.split('-').map(Number);
    const startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    startTimestamp = startDate.getTime();
    targetUnlockTimestamp = startTimestamp + 21 * 24 * 60 * 60 * 1000;
  } else {
    return {
      isEvaluable: true,
      daysRemaining: 0,
      unlockDateStr: '',
      totalDays: 21,
      passedDays: 21,
      progressPercent: 100
    };
  }

  const now = Date.now();
  const diffMs = targetUnlockTimestamp - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isEvaluable = daysRemaining <= 0;

  const totalDurationMs = Math.max(1, targetUnlockTimestamp - startTimestamp);
  const elapsedMs = Math.max(0, now - startTimestamp);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));
  const passedDays = Math.max(0, 21 - daysRemaining);

  const unlockDate = new Date(targetUnlockTimestamp);
  const unlockDateStr = `${String(unlockDate.getDate()).padStart(2, '0')}.${String(unlockDate.getMonth() + 1).padStart(2, '0')}.${unlockDate.getFullYear()}`;

  return {
    isEvaluable,
    daysRemaining,
    unlockDateStr,
    totalDays: 21,
    passedDays,
    progressPercent
  };
}

/**
 * Calculates the next evaluableFrom date (3 weeks / 21 days from today) in YYYY-MM-DD format
 */
export function calculateThreeWeeksFromNow(): { dateStr: string; evaluableFrom: string } {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const future = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
  const evaluableFrom = future.toISOString().split('T')[0];

  return {
    dateStr: todayStr,
    evaluableFrom
  };
}
