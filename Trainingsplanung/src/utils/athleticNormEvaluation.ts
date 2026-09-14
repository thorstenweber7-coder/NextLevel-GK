import type { AthleticTestMetrics, BiologicalMaturityMetrics } from '../types';
import { calculateMirwaldMaturityOffset, parseBioNumber } from './biologicalMaturity';

export type PhvClassification = 'Pre-PHV' | 'Circa-PHV' | 'Post-PHV';

export interface AthleticEvaluationItem {
  id: string;
  testNumber: string;
  name: string;
  category: string;
  unit: string;
  measuredValueDisplay: string;
  measuredNumericValue: number;
  score: number; // 1.0 to 5.0 (or 0 if unmeasured)
  phvStage: PhvClassification;
  normCutoffs: string[]; // 9 values as strings
  targetBaseline: string; // 3.0 value
  eliteBenchmark: string; // 5.0 value
  isInverse?: boolean;
}

export const PRE_PHV_CUTOFFS = {
  grip: [14, 16, 18, 20, 22, 24, 26, 28, 30],
  cmj: [22, 24, 26, 28, 30, 32, 34, 36, 38],
  lateralPush: [115, 125, 135, 145, 155, 165, 175, 185, 195],
  sprint5m: [1.32, 1.28, 1.24, 1.20, 1.16, 1.12, 1.08, 1.04, 1.00],
  sprint10m: [2.25, 2.18, 2.11, 2.04, 1.97, 1.90, 1.83, 1.76, 1.70],
  shuttle: [5.90, 5.75, 5.60, 5.45, 5.30, 5.15, 5.00, 4.85, 4.70],
  medball: [4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5],
  blazepodHits: [24, 26, 28, 30, 32, 34, 36, 38, 40],
};

export const CIRCA_PHV_CUTOFFS = {
  grip: [22, 25, 28, 31, 34, 37, 40, 43, 46],
  cmj: [28, 30, 32, 34, 36, 38, 40, 42, 45],
  lateralPush: [145, 155, 165, 175, 185, 195, 205, 215, 225],
  sprint5m: [1.24, 1.20, 1.16, 1.12, 1.08, 1.04, 1.00, 0.97, 0.94],
  sprint10m: [2.08, 2.01, 1.94, 1.88, 1.82, 1.76, 1.70, 1.64, 1.58],
  shuttle: [5.45, 5.30, 5.15, 5.00, 4.85, 4.70, 4.55, 4.40, 4.25],
  medball: [5.5, 6.2, 6.9, 7.6, 8.3, 9.0, 9.7, 10.4, 11.2],
  blazepodHits: [25, 28, 30, 32, 34, 36, 38, 40, 43],
};

export const POST_PHV_CUTOFFS = {
  grip: [34, 38, 42, 46, 50, 54, 58, 62, 66],
  cmj: [34, 37, 40, 43, 46, 49, 52, 55, 58],
  lateralPush: [175, 185, 195, 205, 215, 225, 235, 245, 255],
  sprint5m: [1.16, 1.12, 1.08, 1.04, 1.01, 0.98, 0.95, 0.92, 0.89],
  sprint10m: [1.92, 1.86, 1.80, 1.74, 1.68, 1.62, 1.57, 1.52, 1.47],
  shuttle: [5.10, 4.95, 4.80, 4.65, 4.50, 4.35, 4.20, 4.08, 3.95],
  medball: [8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0],
  blazepodHits: [30, 33, 35, 38, 41, 44, 46, 49, 52],
};

export function computeAscendingScore(val: number, cutoffs: number[]): number {
  if (!val || val <= 0 || isNaN(val)) return 0;
  if (val >= cutoffs[8]) return 5.0;
  if (val <= cutoffs[0]) return 1.0;
  
  for (let i = 0; i < 8; i++) {
    if (val >= cutoffs[i] && val <= cutoffs[i + 1]) {
      const denom = cutoffs[i + 1] - cutoffs[i];
      const fraction = denom > 0 ? (val - cutoffs[i]) / denom : 0;
      const raw = 1.0 + i * 0.5 + fraction * 0.5;
      return Math.round(raw * 2) / 2;
    }
  }
  return 1.0;
}

export function computeDescendingScore(val: number, cutoffs: number[]): number {
  if (!val || val <= 0 || isNaN(val)) return 0;
  if (val <= cutoffs[8]) return 5.0; // Fastest / lowest time
  if (val >= cutoffs[0]) return 1.0; // Slowest / highest time
  
  for (let i = 0; i < 8; i++) {
    if (val <= cutoffs[i] && val >= cutoffs[i + 1]) {
      const denom = cutoffs[i] - cutoffs[i + 1];
      const fraction = denom > 0 ? (cutoffs[i] - val) / denom : 0;
      const raw = 1.0 + i * 0.5 + fraction * 0.5;
      return Math.round(raw * 2) / 2;
    }
  }
  return 1.0;
}

export function computeGoNoGoScore(hits: number, errors: number, stage: PhvClassification): number {
  if (!hits && !errors) return 0;
  
  if (stage === 'Pre-PHV') {
    if (hits >= 32 && errors === 0) return 5.0;
    if (hits >= 30 && errors === 0) return 4.5;
    if (hits >= 28 && errors <= 1) return 4.0;
    if (hits >= 26 && errors <= 1) return 3.5;
    if (hits >= 24 && errors <= 2) return 3.0;
    if (hits >= 22 && errors <= 2) return 2.5;
    if (hits >= 20 && errors <= 3) return 2.0;
    if (hits >= 18 && errors <= 3) return 1.5;
    return 1.0;
  }
  
  if (stage === 'Circa-PHV') {
    if (hits >= 34 && errors === 0) return 5.0;
    if (hits >= 31 && errors === 0) return 4.5;
    if (hits >= 29 && errors === 0) return 4.0;
    if (hits >= 27 && errors <= 1) return 3.5;
    if (hits >= 25 && errors <= 1) return 3.0;
    if (hits >= 23 && errors <= 2) return 2.5;
    if (hits >= 21 && errors <= 2) return 2.0;
    if (hits >= 19 && errors <= 3) return 1.5;
    return 1.0;
  }
  
  // Post-PHV
  if (hits >= 45 && errors === 0) return 5.0;
  if (hits >= 42 && errors === 0) return 4.5;
  if (hits >= 39 && errors === 0) return 4.0;
  if (hits >= 36 && errors === 0) return 3.5;
  if (hits >= 33 && errors <= 1) return 3.0;
  if (hits >= 30 && errors <= 1) return 2.5;
  if (hits >= 27 && errors <= 2) return 2.0;
  if (hits >= 24 && errors <= 2) return 1.5;
  return 1.0;
}

export function determinePhvStage(
  bioMetrics?: BiologicalMaturityMetrics | null,
  birthYear?: string | number | null
): { stage: PhvClassification; offsetYears?: number; isEstimated: boolean } {
  if (bioMetrics?.phvClassification) {
    return {
      stage: bioMetrics.phvClassification as PhvClassification,
      offsetYears: bioMetrics.maturityOffsetYears !== undefined && bioMetrics.maturityOffsetYears !== null && String(bioMetrics.maturityOffsetYears).trim() !== '' 
        ? parseBioNumber(bioMetrics.maturityOffsetYears) 
        : undefined,
      isEstimated: false
    };
  }
  
  if (bioMetrics?.maturityOffsetYears !== undefined && bioMetrics.maturityOffsetYears !== null && String(bioMetrics.maturityOffsetYears).trim() !== '') {
    const offset = parseBioNumber(bioMetrics.maturityOffsetYears);
    const stage: PhvClassification = offset < -1.0 ? 'Pre-PHV' : offset > 1.0 ? 'Post-PHV' : 'Circa-PHV';
    return { stage, offsetYears: offset, isEstimated: false };
  }

  // If raw measurements exist, calculate Mirwald on the fly
  if (
    bioMetrics && 
    (parseBioNumber(bioMetrics.standingHeightCm) > 50) && 
    (parseBioNumber(bioMetrics.weightKg) > 15)
  ) {
    const currentYear = new Date().getFullYear();
    const y = birthYear ? parseBioNumber(birthYear) : undefined;
    const defaultAge = y && y > 1980 ? (currentYear - y) : 15;
    const calcAge = parseBioNumber(bioMetrics.customAge) || defaultAge;
    const mirwald = calculateMirwaldMaturityOffset({
      standingHeightCm: bioMetrics.standingHeightCm,
      sittingHeightCm: bioMetrics.sittingHeightCm,
      weightKg: bioMetrics.weightKg,
      chronologicalAge: calcAge,
      wingspanCm: bioMetrics.wingspanCm
    });
    if (mirwald) {
      return {
        stage: mirwald.phvClassification,
        offsetYears: mirwald.maturityOffsetYears,
        isEstimated: false
      };
    }
  }
  
  // Fallback to age estimation if biological metrics are not recorded yet (standard development)
  const currentYear = new Date().getFullYear();
  const y = birthYear ? parseBioNumber(birthYear) : undefined;
  if (y && y > 1980) {
    const age = currentYear - y;
    if (age <= 13) return { stage: 'Pre-PHV', isEstimated: true };
    if (age >= 16) return { stage: 'Post-PHV', isEstimated: true };
    return { stage: 'Circa-PHV', isEstimated: true };
  }
  
  return { stage: 'Circa-PHV', isEstimated: true };
}

export function evaluateAllAthleticTests(
  metrics?: AthleticTestMetrics | null,
  bioMetrics?: BiologicalMaturityMetrics | null,
  birthYear?: string | number | null
): {
  items: AthleticEvaluationItem[];
  phvInfo: { stage: PhvClassification; offsetYears?: number; isEstimated: boolean };
  overallScore: number | null;
} {
  const m = metrics || {};
  const phvInfo = determinePhvStage(bioMetrics, birthYear);
  const stage = phvInfo.stage;
  
  const cutoffs = stage === 'Pre-PHV' 
    ? PRE_PHV_CUTOFFS 
    : stage === 'Circa-PHV' 
    ? CIRCA_PHV_CUTOFFS 
    : POST_PHV_CUTOFFS;

  const toStrArr = (arr: number[], isInverse?: boolean, unit?: string) => {
    return arr.map((v, idx) => {
      let prefix = '';
      if (idx === 0) prefix = isInverse ? '≥ ' : '≤ ';
      if (idx === 8) prefix = isInverse ? '≤ ' : '≥ ';
      return `${prefix}${v.toString().replace('.', ',')}${unit ? ' ' + unit : ''}`;
    });
  };

  // 1. Griffkraft
  const gripR = Number(m.gripRightKg) || 0;
  const gripL = Number(m.gripLeftKg) || 0;
  const gripVal = Math.max(gripR, gripL);
  const gripScore = computeAscendingScore(gripVal, cutoffs.grip);
  const gripDisplay = gripVal > 0 
    ? `${gripVal} kg ${gripR && gripL ? `(R: ${gripR} / L: ${gripL})` : ''}`
    : '–';

  // 2. CMJ Sprunghöhe
  const cmjVal = Number(m.cmjHeightCm) || 0;
  const cmjScore = computeAscendingScore(cmjVal, cutoffs.cmj);
  const cmjDisplay = cmjVal > 0 ? `${cmjVal} cm` : '–';

  // 3. Single-Leg Lateral Push
  const latR = Number(m.lateralPushRightCm) || 0;
  const latL = Number(m.lateralPushLeftCm) || 0;
  const latVal = Math.max(latR, latL);
  const latScore = computeAscendingScore(latVal, cutoffs.lateralPush);
  const latDisplay = latVal > 0 
    ? `${latVal} cm ${latR && latL ? `(R: ${latR} / L: ${latL})` : ''}`
    : '–';

  // 4. Linearsprint 5 m
  const s5Val = Number(m.sprint5mSec) || 0;
  const s5Score = computeDescendingScore(s5Val, cutoffs.sprint5m);
  const s5Display = s5Val > 0 ? `${s5Val} s` : '–';

  // 5. Linearsprint 10 m
  const s10Val = Number(m.sprint10mSec) || 0;
  const s10Score = computeDescendingScore(s10Val, cutoffs.sprint10m);
  const s10Display = s10Val > 0 ? `${s10Val} s` : '–';

  // 6. Hybrid-Shuttle 5-10-5
  const shutR = Number(m.agilityShuttleRightSec) || 0;
  const shutL = Number(m.agilityShuttleLeftSec) || 0;
  const shutVal = (shutR > 0 && shutL > 0) ? Math.min(shutR, shutL) : (shutR || shutL || 0);
  const shutScore = computeDescendingScore(shutVal, cutoffs.shuttle);
  const shutDisplay = shutVal > 0 
    ? `${shutVal} s ${shutR && shutL ? `(R: ${shutR} / L: ${shutL})` : ''}`
    : '–';

  // 7. Medizinballwurf
  const medVal = Number(m.medBallDistanceM) || 0;
  const medWeight = stage === 'Pre-PHV' ? 1 : 2;
  const medScore = computeAscendingScore(medVal, cutoffs.medball);
  const medDisplay = medVal > 0 ? `${medVal} m (${medWeight} kg Ball)` : '–';

  // 8. BlazePod T1 - Hits (20s)
  const bpHitsVal = Number(m.blazePodSimpleHits) || 0;
  const bpHitsScore = computeAscendingScore(bpHitsVal, cutoffs.blazepodHits);
  const bpHitsDisplay = bpHitsVal > 0 ? `${bpHitsVal} Hits` : '–';

  // 9. BlazePod T2 - Go/No-Go
  const gHits = Number(m.blazePodGoNoGoHits) || 0;
  const gErrors = Number(m.blazePodGoNoGoErrors) || 0;
  const gScore = computeGoNoGoScore(gHits, gErrors, stage);
  const gDisplay = (gHits > 0 || gErrors > 0) ? `${gHits} Hits / ${gErrors} Fehler` : '–';

  const gonogoCutoffsStrings = stage === 'Pre-PHV'
    ? ['16 / ≥4', '18 / 3', '20 / 3', '22 / 2', '24 / 2', '26 / 1', '28 / 1', '30 / 0', '≥ 32 / 0']
    : stage === 'Circa-PHV'
    ? ['17 / ≥4', '19 / 3', '21 / 2', '23 / 2', '25 / 1', '27 / 1', '29 / 0', '31 / 0', '≥ 34 / 0']
    : ['21 / ≥3', '24 / 2', '27 / 2', '30 / 1', '33 / 1', '36 / 0', '39 / 0', '42 / 0', '≥ 45 / 0'];

  const items: AthleticEvaluationItem[] = [
    {
      id: 'ath_grip',
      testNumber: '01',
      name: 'Griffkraft',
      category: 'Maximalkraft Hände & Unterarme',
      unit: 'kg',
      measuredValueDisplay: gripDisplay,
      measuredNumericValue: gripVal,
      score: gripScore,
      phvStage: stage,
      normCutoffs: toStrArr(cutoffs.grip, false, 'kg'),
      targetBaseline: `${cutoffs.grip[4]} kg`,
      eliteBenchmark: `≥ ${cutoffs.grip[8]} kg`
    },
    {
      id: 'ath_cmj',
      testNumber: '02',
      name: 'CMJ Sprunghöhe',
      category: 'Vertikale Explosivkraft (Beinstreckerkette)',
      unit: 'cm',
      measuredValueDisplay: cmjDisplay,
      measuredNumericValue: cmjVal,
      score: cmjScore,
      phvStage: stage,
      normCutoffs: toStrArr(cutoffs.cmj, false, 'cm'),
      targetBaseline: `${cutoffs.cmj[4]} cm`,
      eliteBenchmark: `≥ ${cutoffs.cmj[8]} cm`
    },
    {
      id: 'ath_lateral_push',
      testNumber: '03',
      name: 'Single-Leg Lateral Push',
      category: 'Laterale Explosivkraft (Abdruckweite einbeinig)',
      unit: 'cm',
      measuredValueDisplay: latDisplay,
      measuredNumericValue: latVal,
      score: latScore,
      phvStage: stage,
      normCutoffs: toStrArr(cutoffs.lateralPush, false, 'cm'),
      targetBaseline: `${cutoffs.lateralPush[4]} cm`,
      eliteBenchmark: `≥ ${cutoffs.lateralPush[8]} cm`
    },
    {
      id: 'ath_sprint_5m',
      testNumber: '04',
      name: 'Linearsprint 5 m',
      category: 'Antritts- & Reaktionsschnelligkeit (0–5 m)',
      unit: 's',
      measuredValueDisplay: s5Display,
      measuredNumericValue: s5Val,
      score: s5Score,
      phvStage: stage,
      normCutoffs: toStrArr(cutoffs.sprint5m, true, 's'),
      targetBaseline: `${cutoffs.sprint5m[4]} s`,
      eliteBenchmark: `≤ ${cutoffs.sprint5m[8]} s`,
      isInverse: true
    },
    {
      id: 'ath_sprint_10m',
      testNumber: '05',
      name: 'Linearsprint 10 m',
      category: 'Beschleunigungsschnelligkeit (0–10 m)',
      unit: 's',
      measuredValueDisplay: s10Display,
      measuredNumericValue: s10Val,
      score: s10Score,
      phvStage: stage,
      normCutoffs: toStrArr(cutoffs.sprint10m, true, 's'),
      targetBaseline: `${cutoffs.sprint10m[4]} s`,
      eliteBenchmark: `≤ ${cutoffs.sprint10m[8]} s`,
      isInverse: true
    },
    {
      id: 'ath_shuttle',
      testNumber: '06',
      name: 'Hybrid-Shuttle 5-10-5',
      category: 'Richtungswechselschnelligkeit & Agilität (COD)',
      unit: 's',
      measuredValueDisplay: shutDisplay,
      measuredNumericValue: shutVal,
      score: shutScore,
      phvStage: stage,
      normCutoffs: toStrArr(cutoffs.shuttle, true, 's'),
      targetBaseline: `${cutoffs.shuttle[4]} s`,
      eliteBenchmark: `≤ ${cutoffs.shuttle[8]} s`,
      isInverse: true
    },
    {
      id: 'ath_medball',
      testNumber: '07',
      name: `Medizinballwurf (${medWeight} kg)`,
      category: 'Oberkörper- & Rumpf-Schnellkraft (Rotationsstoß)',
      unit: 'm',
      measuredValueDisplay: medDisplay,
      measuredNumericValue: medVal,
      score: medScore,
      phvStage: stage,
      normCutoffs: toStrArr(cutoffs.medball, false, 'm'),
      targetBaseline: `${cutoffs.medball[4]} m`,
      eliteBenchmark: `≥ ${cutoffs.medball[8]} m`
    },
    {
      id: 'ath_blazepod_hits',
      testNumber: '08',
      name: 'BlazePod T1 - Trefferquote (20s)',
      category: 'Reaktionsfrequenz & motorische Trefferanzahl',
      unit: 'Hits',
      measuredValueDisplay: bpHitsDisplay,
      measuredNumericValue: bpHitsVal,
      score: bpHitsScore,
      phvStage: stage,
      normCutoffs: toStrArr(cutoffs.blazepodHits, false, 'Hits'),
      targetBaseline: `${cutoffs.blazepodHits[4]} Hits`,
      eliteBenchmark: `≥ ${cutoffs.blazepodHits[8]} Hits`
    },
    {
      id: 'ath_blazepod_gonogo',
      testNumber: '09',
      name: 'BlazePod T2 - Go/No-Go',
      category: 'Kognitive Handlungsinhibition (Hits vs. Fehler)',
      unit: 'Hits/Err',
      measuredValueDisplay: gDisplay,
      measuredNumericValue: gHits,
      score: gScore,
      phvStage: stage,
      normCutoffs: gonogoCutoffsStrings,
      targetBaseline: gonogoCutoffsStrings[4],
      eliteBenchmark: gonogoCutoffsStrings[8]
    }
  ];

  const validScores = items.map(i => i.score).filter(s => s > 0);
  const overallScore = validScores.length > 0
    ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
    : null;

  return {
    items,
    phvInfo,
    overallScore
  };
}
