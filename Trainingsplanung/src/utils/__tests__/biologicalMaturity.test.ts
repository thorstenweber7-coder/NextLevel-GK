import { describe, it, expect } from 'vitest';
import { calculateMirwaldMaturityOffset } from '../biologicalMaturity';

describe('biologicalMaturity', () => {
  it('computes Mirwald maturity offset for valid anthropometric inputs', () => {
    const res = calculateMirwaldMaturityOffset({
      ageYears: 14.5,
      standingHeightCm: 172,
      sittingHeightCm: 88,
      weightKg: 62
    });
    expect(res).not.toBeNull();
    expect(typeof res?.maturityOffset).toBe('number');
    expect(res?.statusLabel).toBeTruthy();
  });
});
