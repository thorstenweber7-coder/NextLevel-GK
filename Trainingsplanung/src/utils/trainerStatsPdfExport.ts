import type { TrainingPlan, Exercise, TrainingGroup, PlayerAbsence } from '../types';
import { SKILL_DEFINITIONS, ALL_MATERIALS } from '../types';
import { calculateAverageKeeperAttendance } from '../components/stats/statsConfig';

export interface TrainerStatsPdfExportData {
  timeFilter: 'all' | '30days' | '90days' | 'thisYear';
  targetGroupFilter: string;
  totalPlans: number;
  totalMinutes: number;
  filteredPlans: TrainingPlan[];
  themeStats: {
    entries: Array<{
      theme: string;
      count: number;
      minutes: number;
      minPercentage: number;
      countPercentage: number;
      color?: { hex: string };
    }>;
    totalMinutes: number;
    totalPlans: number;
    avgKeepers: string;
    topTheme: { theme: string; count: number; minutes: number; minPercentage: number } | null;
  };
  techniqueStats: {
    items: Array<{
      id: string;
      name: string;
      group: string;
      count: number;
      percentage: number;
    }>;
    totalAnalyticDrills: number;
    trainedCount: number;
    sortedByCount: Array<{ name: string; count: number; group: string; percentage: number }>;
    topTechnique: { name: string; count: number; percentage: number } | null;
    topGroup: { name: string; count: number; trainedTechniques: number; totalTechniques: number } | null;
  };
  phaseStats: {
    items: Array<{
      key: string;
      config: { name: string; shortName: string; description: string; hex?: string };
      totalMinutes: number;
      count: number;
      percentage: number;
      avgMinutesPerSession: number;
    }>;
    overallTotalMinutes: number;
    dominantPhase: { key: string; percentage: number; config: { name: string } } | null;
  };
  materialStats: {
    items: Array<{
      name: string;
      planCount: number;
      exerciseCount: number;
      quotePct: number;
      topTheme: string;
      topThemeCount?: number;
      config?: { hex?: string };
    }>;
    themesList?: string[];
    matrix?: Record<string, Record<string, number>>;
    maxMatrixCount?: number;
    usedMaterialsCount?: number;
    topMaterial?: { name: string; quotePct: number };
  };
  clubName?: string;
  clubLogoUrl?: string;
}

// Helper to convert HEX to RGB
function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [100, 116, 139];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Technique group color mapping
const TECHNIQUE_GROUP_COLORS: Record<string, string> = {
  'Grundstellungen': '#0284c7', // sky
  'Basistechniken': '#10b981', // emerald
  'Nah- und Ferndistanz': '#6366f1', // indigo
  '1vs1': '#f59e0b', // amber
  'Hohe Bälle & Flanken': '#a855f7', // purple
  'Offensivtechniken': '#f43f5e', // rose
  'Benutzerdefiniert': '#06b6d4',
  'Allgemein': '#14b8a6'
};

// Phase colors mapping
const PHASE_COLORS: Record<string, string> = {
  'WarmUp': '#f59e0b', // amber
  'Analytisch': '#a855f7', // purple
  'Situativ': '#0284c7', // sky
  'Integrativ': '#10b981', // emerald
  'CoolDown': '#64748b' // slate
};

// Theme color fallback palette
const THEME_COLOR_PALETTE = [
  '#10b981', '#0ea5e9', '#f59e0b', '#a855f7', '#ec4899', 
  '#06b6d4', '#84cc16', '#6366f1', '#f43f5e', '#14b8a6', '#f97316'
];

// Helper to fetch and convert transparent logo to Base64
async function loadLogoBase64(customLogoUrl?: string): Promise<string> {
  if (customLogoUrl && customLogoUrl.startsWith('data:image/')) {
    return customLogoUrl;
  }

  try {
    if (customLogoUrl) {
      const res = await fetch(customLogoUrl);
      if (res.ok) {
        const blob = await res.blob();
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      }
    }

    const response = await fetch('/logo_pdf.png');
    if (!response.ok) {
      const fallback = await fetch('/Logo.png');
      const blob = await fallback.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    }
    const blob = await response.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not load logo for PDF:', err);
    return '';
  }
}

/**
 * Draws a smooth vector donut slice using polygonal approximation in jsPDF
 */
function drawDonutSlice(
  doc: any,
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number,
  fillColor: [number, number, number]
) {
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);

  // If full circle (360 degrees)
  if (endAngle - startAngle >= 2 * Math.PI - 0.01) {
    doc.circle(cx, cy, rOuter, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, rInner, 'F');
    return;
  }

  const numSteps = Math.max(8, Math.ceil((endAngle - startAngle) / (Math.PI / 24)));
  const points: Array<{ x: number; y: number }> = [];

  // Outer arc (start to end)
  for (let i = 0; i <= numSteps; i++) {
    const angle = startAngle + (i / numSteps) * (endAngle - startAngle) - Math.PI / 2;
    points.push({
      x: cx + rOuter * Math.cos(angle),
      y: cy + rOuter * Math.sin(angle)
    });
  }

  // Inner arc (end back to start)
  for (let i = numSteps; i >= 0; i--) {
    const angle = startAngle + (i / numSteps) * (endAngle - startAngle) - Math.PI / 2;
    points.push({
      x: cx + rInner * Math.cos(angle),
      y: cy + rInner * Math.sin(angle)
    });
  }

  // Convert to relative lines for jsPDF
  const startPt = points[0];
  const lines: Array<[number, number]> = [];
  for (let i = 1; i < points.length; i++) {
    lines.push([points[i].x - points[i - 1].x, points[i].y - points[i - 1].y]);
  }
  lines.push([points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y]);

  doc.lines(lines, startPt.x, startPt.y, [1, 1], 'FD', true);
}

/**
 * Draws a standardized question header box matching the 4 questions in OrgaStatsView
 */
function drawQuestionBanner(
  doc: any,
  margin: number,
  contentWidth: number,
  currentY: number,
  questionNumber: number,
  categoryBadge: string,
  questionText: string,
  badgeColor: [number, number, number] = [16, 185, 129]
): number {
  const bannerHeight = 10.5;

  // Background Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, bannerHeight, 1.5, 1.5, 'FD');

  // Left Accent Bar
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(margin, currentY, 2.5, bannerHeight, 1.0, 1.0, 'F');

  // Top Line: Question Number Badge + Category
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(`FRAGE ${questionNumber} VON 4  •  ${categoryBadge.toUpperCase()}`, margin + 5.5, currentY + 4.0);

  // Bottom Line: The exact Question
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42); // slate-900
  const splitQ = doc.splitTextToSize(questionText, contentWidth - 10);
  doc.text(splitQ[0] || questionText, margin + 5.5, currentY + 8.2);

  return currentY + bannerHeight + 3.5;
}

export function buildTrainerStatsPdfData(params: {
  plans: TrainingPlan[];
  exercises?: Exercise[];
  groups?: TrainingGroup[];
  absences?: PlayerAbsence[];
  timeFilter?: 'all' | '30days' | '90days' | 'thisYear';
  targetGroupFilter?: string;
  trainerName?: string;
  clubName?: string;
  clubLogoUrl?: string;
}): TrainerStatsPdfExportData {
  const filteredPlans = params.plans || [];
  const exercises = params.exercises || [];
  const groups = params.groups || [];
  const absences = params.absences || [];
  const timeFilter = params.timeFilter || 'all';
  const targetGroupFilter = params.targetGroupFilter || 'all';
  const exerciseMap = new Map<string, Exercise>(
    exercises
      .filter((e): e is Exercise & { id: string } => Boolean(e && e.id))
      .map(e => [e.id, e])
  );

  // 1. Theme Stats
  const themeMap: Record<string, { count: number; minutes: number }> = {};
  let totalMinutes = 0;
  const totalPlans = filteredPlans.length;

  filteredPlans.forEach(plan => {
    const theme = (plan.title || plan.planTitle || 'Sonstiges').trim();
    const duration = Number(plan.totalMinutes || plan.totalDuration || 60) || 60;

    if (!themeMap[theme]) {
      themeMap[theme] = { count: 0, minutes: 0 };
    }
    themeMap[theme].count += 1;
    themeMap[theme].minutes += duration;
    totalMinutes += duration;
  });

  const themeEntries = Object.entries(themeMap).map(([theme, data], idx) => {
    const minPercentage = totalMinutes > 0 ? (data.minutes / totalMinutes) * 100 : 0;
    const countPercentage = totalPlans > 0 ? (data.count / totalPlans) * 100 : 0;
    const fallbackHex = THEME_COLOR_PALETTE[idx % THEME_COLOR_PALETTE.length];
    return {
      theme,
      count: data.count,
      minutes: data.minutes,
      minPercentage,
      countPercentage,
      color: { hex: fallbackHex }
    };
  });
  themeEntries.sort((a, b) => b.minutes - a.minutes);
  const avgKeepers = calculateAverageKeeperAttendance(filteredPlans, groups, absences);
  const topTheme = themeEntries[0] || null;

  // 2. Technique Stats
  const techDefs = (SKILL_DEFINITIONS as any)?.Technik || [];
  const techItems: Array<{ id: string; name: string; group: string; count: number; percentage: number }> = [];
  const techCountMap: Record<string, number> = {};
  let totalAnalyticDrills = 0;

  techDefs.forEach((def: any) => {
    techCountMap[def.name] = 0;
    techItems.push({
      id: def.id,
      name: def.name,
      group: def.group || 'Sonstige',
      count: 0,
      percentage: 0
    });
  });

  filteredPlans.forEach(plan => {
    const planPhases = plan.phaseExercises || plan.phases || {};
    const customExercises = plan.customPlanExercises || {};

    Object.entries(planPhases).forEach(([phaseId, exIds]) => {
      const isAnalyticPhase = phaseId.toLowerCase().includes('analytisch') || phaseId.toLowerCase().includes('technik');
      (exIds || []).forEach(exId => {
        const exercise = customExercises[exId] || exerciseMap.get(exId);
        if (!exercise) return;

        const isAnalyticCategory = exercise.category === 'Analytisch';
        if (isAnalyticPhase || isAnalyticCategory) {
          totalAnalyticDrills += 1;
          const focus = (exercise.technik || exercise.technikprinzipien || '').trim();
          if (focus && techCountMap[focus] !== undefined) {
            techCountMap[focus] += 1;
          } else if (focus) {
            const matched = techItems.find(i => i.name.toLowerCase() === focus.toLowerCase());
            if (matched) {
              techCountMap[matched.name] += 1;
            }
          }
        }
      });
    });
  });

  techItems.forEach(item => {
    item.count = techCountMap[item.name] || 0;
    item.percentage = totalAnalyticDrills > 0 ? (item.count / totalAnalyticDrills) * 100 : 0;
  });

  const sortedTechByCount = [...techItems].sort((a, b) => b.count - a.count);
  const trainedCount = techItems.filter(i => i.count > 0).length;
  const topTechnique = sortedTechByCount[0]?.count > 0 ? sortedTechByCount[0] : null;

  // Group aggregation
  const groupAggregation: Record<string, { count: number; trained: number; total: number }> = {};
  techItems.forEach(item => {
    if (!groupAggregation[item.group]) {
      groupAggregation[item.group] = { count: 0, trained: 0, total: 0 };
    }
    groupAggregation[item.group].total += 1;
    groupAggregation[item.group].count += item.count;
    if (item.count > 0) groupAggregation[item.group].trained += 1;
  });
  const topGroupEntry = Object.entries(groupAggregation).sort((a, b) => b[1].count - a[1].count)[0];
  const topGroup = topGroupEntry ? {
    name: topGroupEntry[0],
    count: topGroupEntry[1].count,
    trainedTechniques: topGroupEntry[1].trained,
    totalTechniques: topGroupEntry[1].total
  } : null;

  // 3. Phase Stats
  const phaseKeys = ['WarmUp', 'Analytisch', 'Situativ', 'Integrativ', 'CoolDown'] as const;
  const phaseTotals: Record<string, { minutes: number; count: number }> = {
    WarmUp: { minutes: 0, count: 0 },
    Analytisch: { minutes: 0, count: 0 },
    Situativ: { minutes: 0, count: 0 },
    Integrativ: { minutes: 0, count: 0 },
    CoolDown: { minutes: 0, count: 0 }
  };
  let overallTotalMinutes = 0;

  filteredPlans.forEach(plan => {
    const planPhases = plan.phaseExercises || plan.phases || {};
    const customExercises = plan.customPlanExercises || {};
    let planTotalMin = 0;

    Object.entries(planPhases).forEach(([phaseId, exIds]) => {
      (exIds || []).forEach(exId => {
        const exercise = customExercises[exId] || exerciseMap.get(exId);
        if (!exercise) return;

        const duration = exercise.durationMinutes || 15;
        let category = exercise.category;

        if (!category) {
          const lowPhase = phaseId.toLowerCase();
          if (lowPhase.includes('warmup') || lowPhase.includes('warm-up') || lowPhase.includes('aufwärmen')) category = 'WarmUp';
          else if (lowPhase.includes('analytisch') || lowPhase.includes('technik')) category = 'Analytisch';
          else if (lowPhase.includes('situativ') || lowPhase.includes('taktik')) category = 'Situativ';
          else if (lowPhase.includes('integrativ') || lowPhase.includes('spielform')) category = 'Integrativ';
          else if (lowPhase.includes('cooldown') || lowPhase.includes('cool-down') || lowPhase.includes('abschluss')) category = 'CoolDown';
          else category = 'Analytisch';
        }

        if (phaseTotals[category]) {
          phaseTotals[category].minutes += duration;
          phaseTotals[category].count += 1;
          planTotalMin += duration;
          overallTotalMinutes += duration;
        } else {
          phaseTotals['Situativ'].minutes += duration;
          phaseTotals['Situativ'].count += 1;
          planTotalMin += duration;
          overallTotalMinutes += duration;
        }
      });
    });

    if (planTotalMin === 0) {
      const fallbackTotal = Number(plan.totalMinutes || plan.totalDuration || 90);
      const standardWeights = { WarmUp: 15 / 90, Analytisch: 20 / 90, Situativ: 25 / 90, Integrativ: 20 / 90, CoolDown: 10 / 90 };
      phaseKeys.forEach(k => {
        const alloc = Math.round(fallbackTotal * standardWeights[k]);
        phaseTotals[k].minutes += alloc;
        phaseTotals[k].count += 1;
      });
      overallTotalMinutes += fallbackTotal;
    }
  });

  const phaseConfigMap: Record<string, { name: string; shortName: string; description: string; hex: string }> = {
    'WarmUp': { name: 'WarmUp', shortName: 'WarmUp', description: 'Aufwärmen, schnelle Beine, Aktivierung & Kognition', hex: '#f59e0b' },
    'Analytisch': { name: 'Analytisch', shortName: 'Analytisch', description: 'Methodische Reihe, isolierte & kombinierte Technikschulung', hex: '#a855f7' },
    'Situativ': { name: 'Situativ', shortName: 'Situativ', description: 'Entscheidungsfindung & spielnahe Taktiksituationen', hex: '#10b981' },
    'Integrativ': { name: 'Integrativ', shortName: 'Integrativ', description: 'Integration in mannschaftsnahe Spiel- & Großformen', hex: '#06b6d4' },
    'CoolDown': { name: 'CoolDown', shortName: 'CoolDown', description: 'Regeneration, Auslaufen, Dehnen & Besprechung', hex: '#14b8a6' }
  };

  const phaseItems = phaseKeys.map(k => {
    const min = phaseTotals[k].minutes;
    const count = phaseTotals[k].count;
    const percentage = overallTotalMinutes > 0 ? (min / overallTotalMinutes) * 100 : 0;
    const avgMinutesPerSession = totalPlans > 0 ? Math.round(min / totalPlans) : 0;
    return {
      key: k,
      config: phaseConfigMap[k],
      totalMinutes: min,
      count,
      percentage,
      avgMinutesPerSession
    };
  });

  const dominantPhase = [...phaseItems].sort((a, b) => b.percentage - a.percentage)[0] || null;

  // 4. Material Stats
  const allMaterialsList: string[] = (ALL_MATERIALS as string[]) || [
    'Hütchen', 'Dummies', 'Hürden', 'Strobobrille', 'Widerstandsbänder', 'Quadrate', 
    'Stangen', 'Blazepods', 'Sprungseile', 'Shield', 'Board', 'Rebounder'
  ];
  const materialPlanCount: Record<string, number> = {};
  const materialExerciseCount: Record<string, number> = {};
  const themeMaterialMatrix: Record<string, Record<string, number>> = {};
  const themesListSet = new Set<string>();

  allMaterialsList.forEach(m => {
    materialPlanCount[m] = 0;
    materialExerciseCount[m] = 0;
  });

  filteredPlans.forEach(plan => {
    const theme = (plan.title || plan.planTitle || 'Sonstiges').trim();
    themesListSet.add(theme);
    if (!themeMaterialMatrix[theme]) {
      themeMaterialMatrix[theme] = {};
      allMaterialsList.forEach(m => { themeMaterialMatrix[theme][m] = 0; });
    }

    const planUsedMaterials = new Set<string>();
    const planPhases = plan.phaseExercises || plan.phases || {};
    const customExercises = plan.customPlanExercises || {};

    Object.values(planPhases).forEach(exIds => {
      (exIds || []).forEach(exId => {
        const exercise = customExercises[exId] || exerciseMap.get(exId);
        if (!exercise || !exercise.materials) return;

        exercise.materials.forEach(mat => {
          const trimmedMat = mat.trim();
          if (materialPlanCount[trimmedMat] !== undefined) {
            planUsedMaterials.add(trimmedMat);
            materialExerciseCount[trimmedMat] += 1;
            themeMaterialMatrix[theme][trimmedMat] = (themeMaterialMatrix[theme][trimmedMat] || 0) + 1;
          }
        });
      });
    });

    planUsedMaterials.forEach(mat => {
      materialPlanCount[mat] += 1;
    });
  });

  let maxMatrixVal = 0;
  Object.values(themeMaterialMatrix).forEach(matRow => {
    Object.values(matRow).forEach(v => {
      if (v > maxMatrixVal) maxMatrixVal = v;
    });
  });

  const materialItems = allMaterialsList.map(name => {
    const pCount = materialPlanCount[name] || 0;
    const eCount = materialExerciseCount[name] || 0;
    const quotePct = totalPlans > 0 ? (pCount / totalPlans) * 100 : 0;

    let topTheme = '–';
    let topThemeCount = 0;
    Object.entries(themeMaterialMatrix).forEach(([t, mRow]) => {
      const cnt = mRow[name] || 0;
      if (cnt > topThemeCount) {
        topThemeCount = cnt;
        topTheme = t;
      }
    });

    return {
      name,
      planCount: pCount,
      exerciseCount: eCount,
      quotePct,
      topTheme,
      topThemeCount,
      config: { hex: '#6366f1' }
    };
  });

  materialItems.sort((a, b) => b.quotePct - a.quotePct || b.exerciseCount - a.exerciseCount);
  const usedMaterialsCount = materialItems.filter(m => m.planCount > 0).length;
  const topMaterial = materialItems[0] || null;

  return {
    timeFilter,
    targetGroupFilter,
    totalPlans,
    totalMinutes,
    filteredPlans,
    themeStats: {
      entries: themeEntries,
      totalMinutes,
      totalPlans,
      avgKeepers,
      topTheme
    },
    techniqueStats: {
      items: techItems,
      totalAnalyticDrills,
      trainedCount,
      sortedByCount: sortedTechByCount,
      topTechnique,
      topGroup
    },
    phaseStats: {
      items: phaseItems,
      overallTotalMinutes,
      dominantPhase
    },
    materialStats: {
      items: materialItems,
      themesList: Array.from(themesListSet),
      matrix: themeMaterialMatrix,
      maxMatrixCount: maxMatrixVal,
      usedMaterialsCount,
      topMaterial
    },
    clubName: params.clubName || params.trainerName,
    clubLogoUrl: params.clubLogoUrl
  };
}

/**
 * Generates and downloads a visually rich, multi-page PDF Dossier containing all 4 Questions and Diagrams
 * (Donut Chart, Column Chart, Stacked Bar Chart, Entire Material Ranking Chart, and Heatmap Matrix)
 */
export async function generateTrainerStatsPDF(
  input: TrainerStatsPdfExportData | {
    plans: TrainingPlan[];
    exercises?: Exercise[];
    groups?: TrainingGroup[];
    absences?: PlayerAbsence[];
    timeFilter?: 'all' | '30days' | '90days' | 'thisYear';
    targetGroupFilter?: string;
    trainerName?: string;
    clubName?: string;
    clubLogoUrl?: string;
  }
): Promise<void> {
  const data: TrainerStatsPdfExportData = 'themeStats' in input
    ? input
    : buildTrainerStatsPdfData(input);

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  let currentY = margin;

  const logoBase64 = await loadLogoBase64(data.clubLogoUrl);

  const getTimeFilterLabel = (tf: string) => {
    switch (tf) {
      case '30days': return 'Letzte 30 Tage';
      case '90days': return 'Letzte 90 Tage';
      case 'thisYear': return 'Aktuelles Jahr';
      default: return 'Gesamter Zeitraum';
    }
  };

  const getGroupFilterLabel = (gf: string) => {
    return gf === 'all' ? 'Alle Zielgruppen' : gf;
  };

  const timeLabel = getTimeFilterLabel(data.timeFilter);
  const groupLabel = getGroupFilterLabel(data.targetGroupFilter);
  const todayStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const drawHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      // Top background accent bar
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 28, 'F');
      
      // Top emerald stripe
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 0, pageWidth, 2.5, 'F');

      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', margin, 5.0, 18, 18);
        } catch (e) {
          console.warn('Could not draw logo on PDF:', e);
        }
      }

      const textLeft = logoBase64 ? margin + 22 : margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(data.clubName || 'NEXT LEVEL GOALKEEPING ACADEMY', textLeft, 13);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(52, 211, 153); // emerald-400
      doc.text('TRAINERBEZOGENE AUSWERTUNG DES TRAININGS', textLeft, 18.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Filter: ${timeLabel} • ${groupLabel}  |  Stand: ${todayStr}`, pageWidth - margin, 18.5, { align: 'right' });

      currentY = 32;

      // Stats KPI Bar (4 boxes)
      const kpiGap = 3;
      const kpiWidth = (contentWidth - kpiGap * 3) / 4;
      const kpiHeight = 13.5;

      const totalHours = (data.totalMinutes / 60).toFixed(1);
      const kpis = [
        { label: 'ANALYS. EINHEITEN', val: `${data.totalPlans}`, color: [16, 185, 129] },
        { label: 'TRAININGSZEIT', val: `${totalHours} Std. (${data.totalMinutes}m)`, color: [14, 165, 233] },
        { label: 'HAUPTTHEMEN', val: `${data.themeStats.entries.length} verschiedene`, color: [245, 158, 11] },
        { label: 'ISOLIERTE TECHNIKEN', val: `${data.techniqueStats.trainedCount} trainiert`, color: [168, 85, 247] }
      ];

      kpis.forEach((kpi, idx) => {
        const kX = margin + idx * (kpiWidth + kpiGap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(kX, currentY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, kX + 3, currentY + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(kpi.val, kX + 3, currentY + 10.0);
      });

      currentY += kpiHeight + 5;
    } else {
      // Subsequent page mini header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.0);
      doc.setTextColor(255, 255, 255);
      doc.text(data.clubName || 'NEXT LEVEL GOALKEEPING ACADEMY — TRAINERBEZOGENE AUSWERTUNG', margin, 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(148, 163, 184);
      doc.text(`${timeLabel} • ${groupLabel}`, pageWidth - margin, 8, { align: 'right' });

      currentY = 16;
    }
  };

  // Draw header for page 1
  drawHeader(true);

  // Helper for page break check
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      drawHeader(false);
    }
  };

  // =========================================================================
  // FRAGE 1: THEMEN-KREISDIAGRAMM (MIT ANZAHL EINHEITEN)
  // =========================================================================
  ensureSpace(88);

  currentY = drawQuestionBanner(
    doc,
    margin,
    contentWidth,
    currentY,
    1,
    'Themenanalyse & Trainingsfokus',
    '„Wie teilt sich meine gesamte Torwart-Trainingszeit prozentual auf die einzelnen Hauptthemen auf?“',
    [16, 185, 129]
  );

  // Outer Container Box
  const donutBoxHeight = 74;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, donutBoxHeight, 2, 2, 'FD');

  const totalPlansCount = data.totalPlans;

  if (totalPlansCount === 0 || data.themeStats.entries.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Keine Trainingseinheiten für diesen Filterzeitraum vorhanden.', margin + 15, currentY + 35);
  } else {
    // Draw Donut Chart on the Left Side
    const donutCenterX = margin + 35;
    const donutCenterY = currentY + 37;
    const outerRadius = 25;
    const innerRadius = 15;

    let currentAngle = 0;
    const sortedThemes = [...data.themeStats.entries].sort((a, b) => b.count - a.count);

    sortedThemes.forEach((entry, idx) => {
      const sliceFraction = entry.count / totalPlansCount;
      const sliceAngle = sliceFraction * 2 * Math.PI;
      const colorHex = entry.color?.hex || THEME_COLOR_PALETTE[idx % THEME_COLOR_PALETTE.length];
      const rgb = hexToRgb(colorHex);

      drawDonutSlice(doc, donutCenterX, donutCenterY, innerRadius, outerRadius, currentAngle, currentAngle + sliceAngle, rgb);
      currentAngle += sliceAngle;
    });

    // Center Donut Readout
    doc.setFillColor(255, 255, 255);
    doc.circle(donutCenterX, donutCenterY, innerRadius, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`${totalPlansCount}`, donutCenterX, donutCenterY + 1.0, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(totalPlansCount === 1 ? 'EINHEIT' : 'EINHEITEN', donutCenterX, donutCenterY + 4.8, { align: 'center' });

    // Right Side: Visual Legend List
    const legendX = margin + 74;
    let legendY = currentY + 6.0;
    const legendWidth = contentWidth - 78;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(71, 85, 105);
    doc.text('TRAININGSSCHWERPUNKT / THEMA', legendX, legendY);
    doc.text('ANZAHL EINHEITEN & ANTEIL', pageWidth - margin - 5, legendY, { align: 'right' });

    legendY += 3.2;

    sortedThemes.slice(0, 7).forEach((entry, idx) => {
      const colorHex = entry.color?.hex || THEME_COLOR_PALETTE[idx % THEME_COLOR_PALETTE.length];
      const rgb = hexToRgb(colorHex);
      const countPct = ((entry.count / totalPlansCount) * 100);

      // Color bullet
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.circle(legendX + 2, legendY + 2.0, 1.6, 'F');

      // Theme title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      const splitTh = doc.splitTextToSize(entry.theme, 60);
      doc.text(splitTh[0] || entry.theme, legendX + 6, legendY + 2.8);

      // Count + Percentage Badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      const statText = `${entry.count}x  (${countPct.toFixed(1)} %)`;
      doc.text(statText, pageWidth - margin - 5, legendY + 2.8, { align: 'right' });

      // Progress bar below
      const barY = legendY + 4.5;
      const maxBarW = legendWidth - 6;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(legendX + 6, barY, maxBarW, 1.6, 0.5, 0.5, 'F');

      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(legendX + 6, barY, Math.max((countPct / 100) * maxBarW, 1.5), 1.6, 0.5, 0.5, 'F');

      legendY += 8.0;
    });

    if (sortedThemes.length > 7) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.0);
      doc.setTextColor(148, 163, 184);
      doc.text(`+ ${sortedThemes.length - 7} weitere Themen im Filterzeitraum erfasst`, legendX + 6, legendY + 2);
    }
  }

  currentY += donutBoxHeight + 5;

  // =========================================================================
  // FRAGE 3: GESTAPELTES BALKENDIAGRAMM: GESAMTTRAININGSZEIT (PHASEN)
  // =========================================================================
  ensureSpace(74);

  currentY = drawQuestionBanner(
    doc,
    margin,
    contentWidth,
    currentY,
    3,
    'Trainingsstruktur & Phasen-Verteilung',
    '„Welchen Anteil hat welche Trainingsphase an der Gesamttrainingszeit meines Trainings?“',
    [14, 165, 233] // sky
  );

  const stackedBoxHeight = 56;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, stackedBoxHeight, 2, 2, 'FD');

  // Master 100% Stacked Bar
  const masterBarX = margin + 5;
  const masterBarY = currentY + 6.5;
  const masterBarW = contentWidth - 10;
  const masterBarH = 10;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(masterBarX, masterBarY, masterBarW, masterBarH, 1.5, 1.5, 'F');

  let barOffsetX = masterBarX;
  data.phaseStats.items.forEach(phase => {
    const hex = phase.config.hex || PHASE_COLORS[phase.key] || '#64748b';
    const rgb = hexToRgb(hex);
    const segW = (phase.percentage / 100) * masterBarW;

    if (segW > 0.5) {
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(barOffsetX, masterBarY, segW, masterBarH, 0.8, 0.8, 'F');

      if (segW >= 12) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        const pLabel = `${phase.config.shortName || phase.config.name} (${phase.percentage.toFixed(0)}%)`;
        doc.text(pLabel, barOffsetX + segW / 2, masterBarY + 6.8, { align: 'center' });
      }
      barOffsetX += segW;
    }
  });

  // Scale axis below master bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(148, 163, 184);
  doc.text('0 %', masterBarX, masterBarY + masterBarH + 3.5);
  doc.text('25 %', masterBarX + masterBarW * 0.25, masterBarY + masterBarH + 3.5, { align: 'center' });
  doc.text('50 %', masterBarX + masterBarW * 0.5, masterBarY + masterBarH + 3.5, { align: 'center' });
  doc.text('75 %', masterBarX + masterBarW * 0.75, masterBarY + masterBarH + 3.5, { align: 'center' });
  doc.text('100 % der Trainingszeit', masterBarX + masterBarW, masterBarY + masterBarH + 3.5, { align: 'right' });

  // 5 Detailed Phase Cards (1 row)
  const pCardY = masterBarY + masterBarH + 6.0;
  const pCardGap = 2.5;
  const pCardW = (contentWidth - 10 - pCardGap * 4) / 5;
  const pCardH = 24;

  data.phaseStats.items.forEach((phase, idx) => {
    const pcX = masterBarX + idx * (pCardW + pCardGap);
    const hex = phase.config.hex || PHASE_COLORS[phase.key] || '#64748b';
    const rgb = hexToRgb(hex);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(pcX, pCardY, pCardW, pCardH, 1.5, 1.5, 'FD');

    // Header bullet + Name
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.circle(pcX + 3.5, pCardY + 4.2, 1.3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.text(phase.config.name, pcX + 6.0, pCardY + 5.0);

    // Percentage
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(`${phase.percentage.toFixed(1)} %`, pcX + 3.5, pCardY + 11.5);

    // Duration Total
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Gesamt: ${phase.totalMinutes} Min.`, pcX + 3.5, pCardY + 16.5);
    doc.text(`Ø: ${phase.avgMinutesPerSession.toFixed(0)} Min. / TE`, pcX + 3.5, pCardY + 20.5);
  });

  currentY += stackedBoxHeight + 5;

  // =========================================================================
  // PAGE BREAK FOR PAGE 2: FRAGE 2 & FRAGE 4 (TEIL 1: GESAMTE MATERIALRANGLISTE)
  // =========================================================================
  doc.addPage();
  drawHeader(false);

  // =========================================================================
  // FRAGE 2: SÄULENDIAGRAMM: HÄUFIGKEIT ISOLIERTER TECHNIKEN
  // =========================================================================
  ensureSpace(120);

  currentY = drawQuestionBanner(
    doc,
    margin,
    contentWidth,
    currentY,
    2,
    'Isolierte Technikschulung • Phase Analytisch',
    '„Wie häufig trainiere ich welche Technik isoliert?“',
    [168, 85, 247] // purple
  );

  const columnBoxHeight = 110;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, columnBoxHeight, 2, 2, 'FD');

  // Legend of 6 Technique Categories at top of Column Box
  const catLegendY = currentY + 5;
  const groupsList = [
    { name: 'Grundstellungen', hex: '#0284c7' },
    { name: 'Basistechniken', hex: '#10b981' },
    { name: 'Nah- & Ferndistanz', hex: '#6366f1' },
    { name: '1vs1', hex: '#f59e0b' },
    { name: 'Hohe Bälle & Flanken', hex: '#a855f7' },
    { name: 'Offensivtechniken', hex: '#f43f5e' }
  ];

  let catX = margin + 5;
  groupsList.forEach(g => {
    const rgb = hexToRgb(g.hex);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.circle(catX + 1.5, catLegendY + 1.5, 1.3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    doc.text(g.name, catX + 4.5, catLegendY + 2.5);

    catX += doc.getTextWidth(g.name) + 8;
  });

  // Plot Chart
  const plotY = currentY + 14;
  const plotH = 56;
  const plotX = margin + 12;
  const plotW = contentWidth - 16;

  // Filter techniques to show ONLY techniques that were trained at least once (count >= 1)
  const displayTechs = [...data.techniqueStats.items]
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count);

  if (displayTechs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.0);
    doc.setTextColor(100, 116, 139);
    doc.text('Noch keine isolierten Techniken (Phase Analytisch) im ausgewählten Zeitraum trainiert.', margin + 15, currentY + 50);
  } else {
    const maxTechCount = Math.max(...displayTechs.map(t => t.count), 1);

    // Y-Axis Grid Lines
    const ySteps = [
      { val: maxTechCount, y: plotY },
      { val: Math.round(maxTechCount * 0.5), y: plotY + plotH * 0.5 },
      { val: 0, y: plotY + plotH }
    ];

    ySteps.forEach(step => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(plotX, step.y, plotX + plotW, step.y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(148, 163, 184);
      doc.text(`${step.val}`, plotX - 2.5, step.y + 1.5, { align: 'right' });
    });

    // Calculate Bar Width and Positioning
    const numBars = displayTechs.length;
    const barW = Math.max(5, Math.min(16, (plotW - 10) / numBars - 4));
    const barGap = numBars > 1 ? Math.max(3, Math.min(8, (plotW - 10 - barW * numBars) / (numBars - 1))) : 0;
    const totalBarsWidth = numBars * barW + (numBars - 1) * barGap;
    const startX = plotX + Math.max(4, (plotW - totalBarsWidth) / 2);

    displayTechs.forEach((tech, idx) => {
      const bX = startX + idx * (barW + barGap);
      const bH = maxTechCount > 0 ? (tech.count / maxTechCount) * (plotH - 2) : 0;
      const bY = plotY + plotH - bH;
      const hex = TECHNIQUE_GROUP_COLORS[tech.group] || '#0284c7';
      const rgb = hexToRgb(hex);

      // Bar rectangle
      if (bH > 0) {
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.roundedRect(bX, bY, barW, bH, 0.8, 0.8, 'F');

        // Value label on top
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.text(`${tech.count}x`, bX + barW / 2, bY - 1.2, { align: 'center' });
      }

      // Angled technique label below (45 degrees)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(51, 65, 85);
      const shortLabel = tech.name.length > 20 ? `${tech.name.substring(0, 18)}…` : tech.name;
      doc.text(shortLabel, bX + barW / 2, plotY + plotH + 3.5, { angle: 45 });
    });
  }

  currentY += columnBoxHeight + 5;

  // =========================================================================
  // FRAGE 4: TEIL 1: GESAMTE MATERIAL-RANGLISTE NACH NUTZUNGSQUOTE
  // =========================================================================
  ensureSpace(80);

  currentY = drawQuestionBanner(
    doc,
    margin,
    contentWidth,
    currentY,
    4,
    'Equipment-Tracking & Nutzungsquote (Teil 1)',
    '„Welche Materialien nutze ich und wie oft (% aller Trainingseinheiten)?“',
    [16, 185, 129] // emerald
  );

  // Render ALL materials sorted by quotePct descending
  const allMaterials = [...data.materialStats.items].sort((a, b) => b.quotePct - a.quotePct);
  const rowHeight = 7.5;
  const matContainerHeight = Math.max(30, allMaterials.length * rowHeight + 8);

  ensureSpace(matContainerHeight + 4);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, matContainerHeight, 2, 2, 'FD');

  if (allMaterials.length === 0 || data.totalPlans === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.0);
    doc.setTextColor(148, 163, 184);
    doc.text('Keine Materialdaten für diese Filterauswahl vorhanden.', margin + 15, currentY + 18);
  } else {
    let matY = currentY + 5.0;
    const labelW = 46;
    const barStartX = margin + labelW + 6;
    const maxHBarW = contentWidth - labelW - 64;

    allMaterials.forEach((mat) => {
      // Material Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(15, 23, 42);
      const splitName = doc.splitTextToSize(mat.name, labelW - 2);
      doc.text(splitName[0] || mat.name, margin + 4, matY + 3.2);

      // Bar Track
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(barStartX, matY + 0.5, maxHBarW, 3.8, 0.8, 0.8, 'F');

      // Filled Bar
      const fillW = Math.max((mat.quotePct / 100) * maxHBarW, mat.planCount > 0 ? 1.5 : 0);
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.roundedRect(barStartX, matY + 0.5, fillW, 3.8, 0.8, 0.8, 'F');

      // Quote % Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(16, 185, 129);
      doc.text(`${mat.quotePct.toFixed(1)} %`, barStartX + maxHBarW + 3, matY + 3.2);

      // Plan count & Top Theme
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.6);
      doc.setTextColor(100, 116, 139);
      const subInfo = `(${mat.planCount}/${data.totalPlans} TE) • ${mat.topTheme || '–'}`;
      const splitSub = doc.splitTextToSize(subInfo, 42);
      doc.text(splitSub[0] || subInfo, pageWidth - margin - 4, matY + 3.2, { align: 'right' });

      matY += rowHeight;
    });
  }

  currentY += matContainerHeight + 5;

  // =========================================================================
  // PAGE BREAK FOR PAGE 3: FRAGE 4 TEIL 2 (2. HEATMAP / MATRIX: MATERIAL × SCHWERPUNKT)
  // =========================================================================
  doc.addPage();
  drawHeader(false);

  // =========================================================================
  // FRAGE 4 (TEIL 2): 2. HEATMAP / MATRIX: MATERIAL × TRAININGSSCHWERPUNKT
  // =========================================================================
  ensureSpace(120);

  currentY = drawQuestionBanner(
    doc,
    margin,
    contentWidth,
    currentY,
    4,
    'Equipment-Tracking • Methodik-Matrix (Teil 2)',
    '„Welche Materialien nutze ich und wofür? (Heatmap: Material × Trainingsschwerpunkt)“',
    [20, 184, 166] // teal
  );

  const activeThemesList = data.materialStats.themesList || data.themeStats.entries.map(e => e.theme);
  const matrixData = data.materialStats.matrix || {};
  const maxMatCount = data.materialStats.maxMatrixCount || 1;

  // Filter materials for heatmap (materials that have at least 1 usage or top 10)
  const heatmapMaterials = allMaterials.filter(m => m.planCount > 0 || m.exerciseCount > 0);
  const displayMaterials = heatmapMaterials.length > 0 ? heatmapMaterials : allMaterials.slice(0, 8);

  // Calculate layout geometry for 2D Heatmap Matrix
  const themeColWidth = 50;
  const totalColWidth = 18;
  const availMatrixWidth = contentWidth - themeColWidth - totalColWidth - 4;
  const numMatCols = Math.max(displayMaterials.length, 1);
  const matColWidth = Math.max(9, Math.min(16, availMatrixWidth / numMatCols));
  const matrixRowHeight = 7.5;
  const matrixHeaderHeight = 16;
  const totalMatrixHeight = matrixHeaderHeight + activeThemesList.length * matrixRowHeight + 10;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, totalMatrixHeight, 2, 2, 'FD');

  if (activeThemesList.length === 0 || displayMaterials.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.0);
    doc.setTextColor(100, 116, 139);
    doc.text('Keine Matrix-Daten für diese Filterauswahl vorhanden.', margin + 15, currentY + 25);
  } else {
    // Top Heatmap Legend Box
    const hLegendY = currentY + 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Einsatzintensität:', margin + 4, hLegendY + 2.5);

    const legendColors: Array<{ label: string; rgb: [number, number, number]; textColor: [number, number, number] }> = [
      { label: '0x (–)', rgb: [241, 245, 249], textColor: [148, 163, 184] },
      { label: '1x', rgb: [209, 250, 229], textColor: [4, 120, 87] },
      { label: '2-3x', rgb: [52, 211, 153], textColor: [6, 95, 70] },
      { label: `Max (${maxMatCount}x)`, rgb: [16, 185, 129], textColor: [255, 255, 255] }
    ];

    let legBoxX = margin + 32;
    legendColors.forEach(lc => {
      doc.setFillColor(lc.rgb[0], lc.rgb[1], lc.rgb[2]);
      doc.roundedRect(legBoxX, hLegendY, 13, 3.5, 0.5, 0.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.setTextColor(lc.textColor[0], lc.textColor[1], lc.textColor[2]);
      doc.text(lc.label, legBoxX + 6.5, hLegendY + 2.5, { align: 'center' });
      legBoxX += 15;
    });

    let mY = currentY + 9.5;

    // Header Row
    doc.setFillColor(241, 245, 249);
    doc.rect(margin + 2, mY, contentWidth - 4, matrixHeaderHeight - 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text('TRAININGSSCHWERPUNKT', margin + 4, mY + 9);

    // Material Column Headers
    displayMaterials.forEach((mat, idx) => {
      const colX = margin + 2 + themeColWidth + idx * matColWidth;
      const shortMatName = mat.name.length > 14 ? `${mat.name.substring(0, 12)}…` : mat.name;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.setTextColor(30, 41, 59);
      // Rotated text for material headers
      doc.text(shortMatName, colX + matColWidth / 2, mY + 12, { angle: 35 });
    });

    // Row Total Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text('GESAMT TOOLS', pageWidth - margin - 4, mY + 9, { align: 'right' });

    mY += matrixHeaderHeight - 2;

    // Matrix Data Rows
    activeThemesList.forEach((theme, rIdx) => {
      const isEven = rIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin + 2, mY, contentWidth - 4, matrixRowHeight, 'F');

      // Theme Label (Left)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(15, 23, 42);
      const splitTh = doc.splitTextToSize(theme, themeColWidth - 4);
      doc.text(splitTh[0] || theme, margin + 4, mY + 4.8);

      let rowToolsSum = 0;

      // Material Cells
      displayMaterials.forEach((mat, cIdx) => {
        const colX = margin + 2 + themeColWidth + cIdx * matColWidth;
        const count = matrixData[theme]?.[mat.name] || 0;
        rowToolsSum += count;
        const intensity = maxMatCount > 0 ? count / maxMatCount : 0;

        const cellW = matColWidth - 1.2;
        const cellH = matrixRowHeight - 1.5;
        const cellX = colX + 0.6;
        const cellY = mY + 0.75;

        if (count > 0) {
          if (intensity >= 0.7) {
            doc.setFillColor(16, 185, 129); // emerald-500
            doc.setTextColor(255, 255, 255);
          } else if (intensity >= 0.4) {
            doc.setFillColor(52, 211, 153); // emerald-400
            doc.setTextColor(6, 95, 70);
          } else {
            doc.setFillColor(209, 250, 229); // emerald-100
            doc.setTextColor(4, 120, 87);
          }
          doc.roundedRect(cellX, cellY, cellW, cellH, 0.6, 0.6, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.0);
          doc.text(`${count}`, cellX + cellW / 2, cellY + cellH / 2 + 1.8, { align: 'center' });
        } else {
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(cellX, cellY, cellW, cellH, 0.6, 0.6, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.0);
          doc.setTextColor(203, 213, 225);
          doc.text('·', cellX + cellW / 2, cellY + cellH / 2 + 1.5, { align: 'center' });
        }
      });

      // Row Total (Right)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(rowToolsSum > 0 ? 16 : 148, rowToolsSum > 0 ? 185 : 163, rowToolsSum > 0 ? 129 : 184);
      doc.text(rowToolsSum > 0 ? `${rowToolsSum}x` : '–', pageWidth - margin - 4, mY + 4.8, { align: 'right' });

      mY += matrixRowHeight;
    });

    // Column Totals Footer Row
    doc.setFillColor(241, 245, 249);
    doc.rect(margin + 2, mY, contentWidth - 4, matrixRowHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    doc.setTextColor(71, 85, 105);
    doc.text('GESAMT / MATERIAL', margin + 4, mY + 4.8);

    let grandTotalTools = 0;
    displayMaterials.forEach((mat, cIdx) => {
      const colX = margin + 2 + themeColWidth + cIdx * matColWidth;
      const count = mat.exerciseCount;
      grandTotalTools += count;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(count > 0 ? 16 : 148, count > 0 ? 185 : 163, count > 0 ? 129 : 184);
      doc.text(count > 0 ? `${count}x` : '–', colX + matColWidth / 2, mY + 4.8, { align: 'center' });
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${grandTotalTools}x`, pageWidth - margin - 4, mY + 4.8, { align: 'right' });
  }

  currentY += totalMatrixHeight + 5;

  // Draw Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text('NextLevel Goalkeeping Academy — Trainerbezogene Auswertung des Trainings', margin, pageHeight - 5);
    doc.text(`Seite ${i} von ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  const todayIso = new Date().toISOString().substring(0, 10);
  const groupSlug = data.targetGroupFilter === 'all' ? 'Alle-Gruppen' : data.targetGroupFilter.replace(/[/\\:\s]+/g, '-');
  doc.save(`Trainerbezogene_Auswertung_${todayIso}_${groupSlug}.pdf`);
}
