/**
 * Biologische Reifebestimmung & Anthropometrie nach Mirwald (2002)
 * Peak Height Velocity (PHV) Berechnung & Bio-Banding Klassifizierung
 */

export function parseBioNumber(val: any): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (val === null || val === undefined) return 0;
  const str = String(val).trim().replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export interface MirwaldCalculationInput {
  standingHeightCm?: number | string;
  sittingHeightCm?: number | string;
  weightKg?: number | string;
  chronologicalAge?: number | string;
  wingspanCm?: number | string;
}

export interface MirwaldCalculationResult {
  legLengthCm: number;
  sittingHeightRatio: number;
  weightHeightRatio: number;
  maturityOffsetYears: number;
  phvClassification: 'Pre-PHV' | 'Circa-PHV' | 'Post-PHV';
  phvClassificationLabel: string;
  estimatedAgeAtPhv: number;
  apeIndex?: number;
  reachDifferentialCm?: number;
  isSittingHeightEstimated?: boolean;
  recommendations: {
    title: string;
    focus: string;
    cautions: string;
    bioBandingHint: string;
  };
}

/**
 * Berechnet den Maturity Offset (Jahre zum PHV) nach Mirwald et al. (2002) für Jungen/männliche Athleten
 */
export function calculateMirwaldMaturityOffset(
  input: MirwaldCalculationInput
): MirwaldCalculationResult | null {
  const standingHeightCm = parseBioNumber(input.standingHeightCm);
  let sittingHeightCm = parseBioNumber(input.sittingHeightCm);
  const weightKg = parseBioNumber(input.weightKg);
  let chronologicalAge = parseBioNumber(input.chronologicalAge);
  const wingspanCm = parseBioNumber(input.wingspanCm);

  // Minimum required metrics: Standhöhe and Gewicht
  if (!standingHeightCm || standingHeightCm <= 50 || !weightKg || weightKg <= 15) {
    return null;
  }

  // Fallback for chronological age if not provided or out of lower range
  if (!chronologicalAge || chronologicalAge <= 5) {
    chronologicalAge = 14.5;
  }

  let isSittingHeightEstimated = false;
  // If sitting height is not provided or unrealistic (<= 30 cm or >= standingHeight), estimate it as 52.5% of standing height
  if (!sittingHeightCm || sittingHeightCm <= 30 || sittingHeightCm >= standingHeightCm) {
    sittingHeightCm = parseFloat((standingHeightCm * 0.525).toFixed(1));
    isSittingHeightEstimated = true;
  }

  const legLengthCm = standingHeightCm - sittingHeightCm;
  const legSittingInteraction = legLengthCm * sittingHeightCm;
  const ageLegInteraction = chronologicalAge * legLengthCm;
  const ageSittingInteraction = chronologicalAge * sittingHeightCm;
  const weightHeightRatio = (weightKg / standingHeightCm) * 100;

  // Mirwald (2002) equation for boys
  let maturityOffsetYears = -9.236 +
    (0.0002708 * legSittingInteraction) -
    (0.001663 * ageLegInteraction) +
    (0.007216 * ageSittingInteraction) +
    (0.02292 * weightHeightRatio);

  // Athletes >= 18 are naturally Post-PHV
  if (chronologicalAge >= 18 && maturityOffsetYears < 1.0) {
    maturityOffsetYears = Math.max(1.5, parseFloat((chronologicalAge - 14.0).toFixed(2)));
  }

  const sittingHeightRatio = (sittingHeightCm / standingHeightCm) * 100;
  const estimatedAgeAtPhv = chronologicalAge - maturityOffsetYears;

  let phvClassification: 'Pre-PHV' | 'Circa-PHV' | 'Post-PHV' = 'Pre-PHV';
  let phvClassificationLabel = 'Pre-PHV (Vor dem Wachstumsschub)';
  let recommendations = {
    title: 'Pre-PHV • Fundamentale Bewegungskompetenz & Schnelligkeit',
    focus: 'Koordination, Fangsicherheit, Beinarbeit, Gewandtheit, submaximale Sprungschulung & Grundlagenschnelligkeit.',
    cautions: 'Übermäßiges additives Krafttraining vermeiden. Natürliche Freude an der Bewegung und Technikvielfalt fördern.',
    bioBandingHint: 'In Spielformen gegen physisch stärkere Gleichaltrige durch taktische Antizipation und geschicktes Stellungsspiel ausgleichen.'
  };

  if (maturityOffsetYears >= -1.0 && maturityOffsetYears <= 1.0) {
    phvClassification = 'Circa-PHV';
    phvClassificationLabel = 'Circa-PHV (Im akuten Wachstumsschub)';
    recommendations = {
      title: 'Circa-PHV • Belastungssteuerung & Sehnen-/Gelenkschutz',
      focus: 'Rumpfstabilisation, Haltungskontrolle, Re-Kalibrierung der Fang- & Landetechnik an veränderte Hebelverhältnisse.',
      cautions: 'Erhöhte Verletzungsanfälligkeit der Wachstumsfugen & Sehnenansätze (z. B. Morbus Osgood-Schlatter an der Patellasehne). Sprungvolumen und Stoßbelastungen strikt dosieren!',
      bioBandingHint: 'Temporäre koordinative Einbrüche sind physiologisch normal (Adolescent Clumsiness) – mental stärken!'
    };
  } else if (maturityOffsetYears > 1.0) {
    phvClassification = 'Post-PHV';
    phvClassificationLabel = 'Post-PHV (Ausgereift / Post-Pubertär)';
    recommendations = {
      title: 'Post-PHV • Gezielter Muskel- & Explosivkraftaufbau',
      focus: 'Hypertrophietraining, Maximalkraft, plyometrisches Explosivkrafttraining, hohe Intensitäten & Zweikampfhärte.',
      cautions: 'Vollständige Erholungszeiten (Regeneration) und funktionelle Beweglichkeit (Mobility) zur Verletzungsprävention sicherstellen.',
      bioBandingHint: 'Voll belastbar – Leistungswerte können direkt mit Erwachsenen-/Senioren-Benchmarks verglichen werden.'
    };
  }

  let apeIndex: number | undefined;
  let reachDifferentialCm: number | undefined;
  if (wingspanCm && wingspanCm > 50) {
    apeIndex = parseFloat((wingspanCm / standingHeightCm).toFixed(3));
    reachDifferentialCm = parseFloat((wingspanCm - standingHeightCm).toFixed(1));
  }

  return {
    legLengthCm: parseFloat(legLengthCm.toFixed(1)),
    sittingHeightRatio: parseFloat(sittingHeightRatio.toFixed(1)),
    weightHeightRatio: parseFloat(weightHeightRatio.toFixed(2)),
    maturityOffsetYears: parseFloat(maturityOffsetYears.toFixed(2)),
    phvClassification,
    phvClassificationLabel,
    estimatedAgeAtPhv: parseFloat(estimatedAgeAtPhv.toFixed(1)),
    apeIndex,
    reachDifferentialCm,
    isSittingHeightEstimated,
    recommendations
  };
}

/**
 * Ermittelt den biologischen Entwicklungsstand (PHV) eines Spielers,
 * der zeitlich möglichst nah VOR (oder am selben Tag wie) dem angegebenen Stichtag / Testdatum liegt.
 * Falls kein Datensatz vor dem Stichtag vorliegt, wird der zeitlich am nächsten liegende
 * Datensatz zurückgegeben.
 */
export function getClosestBiologicalEvaluation(
  evaluations: Array<{
    playerId: string;
    category: string;
    biologicalMetrics?: any;
    updatedAt?: number;
  }>,
  playerId: string,
  targetDateOrTimestamp?: string | number | Date | null
): { evaluation?: any; biologicalMetrics?: any } | null {
  if (!evaluations || !playerId) return null;

  // 1. Alle validen biologischen Datensätze des Spielers filtern
  const bioEvals = evaluations.filter(e => {
    if (e.playerId !== playerId || e.category !== 'Athletik') return false;
    const bio = e.biologicalMetrics;
    if (!bio) return false;
    return (
      parseBioNumber(bio.standingHeightCm) > 50 || 
      parseBioNumber(bio.weightKg) > 15 || 
      Boolean(bio.phvClassification)
    );
  });

  if (bioEvals.length === 0) return null;

  // 2. Ziel-Zeitstempel berechnen (Ende des Tages bei Datumsstring)
  let targetTimestamp: number;
  if (!targetDateOrTimestamp) {
    targetTimestamp = Date.now();
  } else if (typeof targetDateOrTimestamp === 'number') {
    targetTimestamp = targetDateOrTimestamp;
  } else if (targetDateOrTimestamp instanceof Date) {
    targetTimestamp = targetDateOrTimestamp.getTime();
  } else if (typeof targetDateOrTimestamp === 'string') {
    if (targetDateOrTimestamp.includes('-')) {
      const parts = targetDateOrTimestamp.split('T')[0].split('-').map(Number);
      targetTimestamp = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 23, 59, 59, 999).getTime();
    } else {
      const parsed = Date.parse(targetDateOrTimestamp);
      targetTimestamp = isNaN(parsed) ? Date.now() : parsed;
    }
  } else {
    targetTimestamp = Date.now();
  }

  // Hilfsfunktion zum Ermitteln des genauen Datums/Zeitstempels der biologischen Messung
  const getBioTime = (e: any): number => {
    if (e.biologicalMetrics?.measurementDate) {
      const parts = String(e.biologicalMetrics.measurementDate).split('T')[0].split('-').map(Number);
      const dt = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
    return Number(e.updatedAt) || 0;
  };

  // 3. Datensätze filtern, die zeitlich VOR oder AM SELBEN TAG wie das Testdatum liegen
  const candidatesBeforeOrOn = bioEvals
    .map(e => ({ eval: e, time: getBioTime(e) }))
    .filter(item => item.time <= targetTimestamp)
    .sort((a, b) => b.time - a.time); // Absteigend sortiert: der neueste vor/am Stichtag zuerst

  if (candidatesBeforeOrOn.length > 0) {
    const chosen = candidatesBeforeOrOn[0].eval;
    return {
      evaluation: chosen,
      biologicalMetrics: chosen.biologicalMetrics
    };
  }

  // 4. Falls noch kein Eintrag vor dem Stichtag lag: nimm den zeitlich am nächsten liegenden Eintrag
  const sortedByProximity = bioEvals
    .map(e => ({ eval: e, time: getBioTime(e), diff: Math.abs(getBioTime(e) - targetTimestamp) }))
    .sort((a, b) => a.diff - b.diff);

  if (sortedByProximity.length > 0) {
    const chosen = sortedByProximity[0].eval;
    return {
      evaluation: chosen,
      biologicalMetrics: chosen.biologicalMetrics
    };
  }

  return null;
}
