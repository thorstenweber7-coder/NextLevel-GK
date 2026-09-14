import type { Exercise, ExerciseCategory, TrainingPlan, TrainingGroup, TrainingStructure } from '../types';
import { DEFAULT_TRAINING_STRUCTURE } from '../types';
import { loadImageAsDataUrl } from './imageUtils';

export interface ExportPhaseItem {
  id: string;
  name: string;
  categoryKey?: ExerciseCategory | string;
  color?: string;
  exercises: Exercise[];
}

export interface ExportPlanData {
  title?: string;
  planTitle?: string;
  date?: string;
  planDate?: string;
  trainerName?: string;
  targetGroup?: string;
  totalDuration?: number;
  availableKeepers?: number;
  structureName?: string;
  structure?: TrainingStructure;
  phaseExercises?: Record<string, string[]>;
  customPlanExercises?: Record<string, Exercise>;
  exerciseMap?: Map<string, Exercise> | Record<string, Exercise>;
  phases?: ExportPhaseItem[];
  phaseMap?: Record<string, Exercise[]>;
  pitchSurface?: string;
  notes?: string;
  importantNotes?: string;
  hasVideoAnalysis?: boolean;
  videoAnalysisNotes?: string;
  clubLogoUrl?: string;
  clubName?: string;
}

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
 * Universal helper to resolve structured phases and exercises regardless of how ExportPlanData was passed
 */
export function resolvePlanPhases(data: ExportPlanData): ExportPhaseItem[] {
  // If data.phases is already provided and has items with exercises
  if (data.phases && data.phases.length > 0) {
    const validPhases = data.phases
      .filter(p => p.exercises && p.exercises.length > 0)
      .map(p => ({
        ...p,
        exercises: p.exercises.map(ex => {
          if (data.customPlanExercises && ex.id && data.customPlanExercises[ex.id]) {
            return data.customPlanExercises[ex.id];
          }
          return ex;
        })
      }));
    if (validPhases.length > 0) return validPhases;
  }

  const pe = data.phaseExercises || (data as any).phases || data.phaseMap || {};
  const exerciseMap: Map<string, Exercise> = data.exerciseMap instanceof Map
    ? data.exerciseMap
    : data.exerciseMap && typeof data.exerciseMap === 'object'
      ? new Map(Object.entries(data.exerciseMap))
      : new Map<string, Exercise>();
  const customOverrides = data.customPlanExercises || {};

  // If structured phases are present in data.structure
  if (data.structure && Array.isArray(data.structure.phases) && data.structure.phases.length > 0) {
    const result: ExportPhaseItem[] = [];
    for (const p of data.structure.phases) {
      const rawExIds = (pe as any)[p.id] || (pe as any)[p.name] || (pe as any)[p.categoryKey || ''] || [];
      const exercises: Exercise[] = [];
      if (Array.isArray(rawExIds)) {
        for (const item of rawExIds) {
          if (typeof item === 'string') {
            const ex = customOverrides[item] || exerciseMap.get(item);
            if (ex) exercises.push(ex);
          } else if (item && typeof item === 'object' && (item as Exercise).title) {
            const exId = (item as Exercise).id;
            const ex = (exId && customOverrides[exId]) ? customOverrides[exId] : (item as Exercise);
            exercises.push(ex);
          }
        }
      }
      if (exercises.length > 0) {
        result.push({
          id: p.id,
          name: p.name,
          categoryKey: p.categoryKey || p.name,
          color: p.color,
          exercises
        });
      }
    }
    if (result.length > 0) return result;
  }

  // Fallback: If phaseMap or category-keyed phaseExercises exist
  const result: ExportPhaseItem[] = [];
  const keys = Object.keys(pe);
  for (const key of keys) {
    const rawList = (pe as any)[key];
    if (Array.isArray(rawList) && rawList.length > 0) {
      const exercises: Exercise[] = [];
      for (const item of rawList) {
        if (typeof item === 'string') {
          const ex = customOverrides[item] || exerciseMap.get(item);
          if (ex) exercises.push(ex);
        } else if (item && typeof item === 'object' && (item as Exercise).title) {
          const exId = (item as Exercise).id;
          const ex = (exId && customOverrides[exId]) ? customOverrides[exId] : (item as Exercise);
          exercises.push(ex);
        }
      }
      if (exercises.length > 0) {
        result.push({
          id: key,
          name: key,
          categoryKey: key,
          exercises
        });
      }
    }
  }

  return result;
}

/**
 * Helper to extract specific technique principles for an exercise
 */
export function getTechnikprinzipienText(exercise: Exercise): string | null {
  const parts: string[] = [];
  if (exercise.technikprinzipien && exercise.technikprinzipien.trim()) {
    if (exercise.technik && exercise.technik.trim() && !exercise.technikprinzipien.toLowerCase().includes(exercise.technik.trim().toLowerCase())) {
      parts.push(exercise.technik.trim());
    }
    parts.push(exercise.technikprinzipien.trim());
  } else if (exercise.category === 'Analytisch' && exercise.technik && exercise.technik.trim()) {
    parts.push(exercise.technik.trim());
  }
  return parts.length > 0 ? parts.join(': ') : null;
}

/**
 * Helper to extract specific tactical principles for an exercise
 */
export function getTaktikprinzipienText(exercise: Exercise): string | null {
  if (exercise.includeTaktikprinzipienInPdf === false) return null;
  if (exercise.taktikprinzipien && exercise.taktikprinzipien.trim()) {
    return exercise.taktikprinzipien.trim();
  }
  return null;
}

/**
 * Generates detailed multi-page PDF document for training plan
 */
export async function generateTrainingPlanPDF(
  data: ExportPlanData,
  returnBlobOnly = false
): Promise<{ blob: Blob; filename: string } | void> {
  const { jsPDF } = await import('jspdf');
  const logoBase64 = await loadLogoBase64(data.clubLogoUrl);

  const phaseList = resolvePlanPhases(data);

  // Preload all exercise images to Data URLs so doc.addImage works reliably
  const preloadedImages = new Map<string, string>();
  const allExercises = phaseList.flatMap(p => p.exercises || []);
  for (const ex of allExercises) {
    const rawUrl = ex.imageUrl || ex.imageBase64;
    if (rawUrl) {
      try {
        const dataUrl = await loadImageAsDataUrl(rawUrl);
        if (dataUrl) {
          if (ex.id) preloadedImages.set(ex.id, dataUrl);
          preloadedImages.set(rawUrl, dataUrl);
        }
      } catch (err) {
        console.warn('Error preloading exercise image for PDF:', err);
      }
    }
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // ~182mm

  let currentY = margin;

  const planTitle = data.planTitle || data.title || 'Torwart-Trainingseinheit';
  const printDate = data.planDate || data.date || new Date().toISOString().substring(0, 10);
  const trainer = data.trainerName || 'Torwarttrainer';
  const targetGroup = data.targetGroup || 'Jugend Leistungsbereich';
  const keepersCount = data.availableKeepers || 3;

  // Calculate total duration & exercises count & collect all unique materials
  let totalDuration = 0;
  let totalExercises = 0;
  const allUniqueMaterials = new Set<string>();

  phaseList.forEach(p => {
    const list = p.exercises || [];
    list.forEach(ex => {
      totalDuration += ex.durationMinutes || 15;
      totalExercises += 1;
      if (Array.isArray(ex.materials)) {
        ex.materials.forEach(m => {
          if (m && typeof m === 'string' && m.trim()) {
            allUniqueMaterials.add(m.trim());
          }
        });
      }
    });
  });

  const materialList = Array.from(allUniqueMaterials);

  // Helper for drawing NextLevel Header Bar
  const drawHeaderBar = (isFirstPage: boolean, phaseTitle?: string) => {
    const bannerHeight = isFirstPage ? 32 : 15;
    doc.setFillColor(10, 15, 29); // #0a0f1d
    doc.rect(0, 0, pageWidth, bannerHeight, 'F');

    // Accent line
    doc.setFillColor(34, 197, 94); // #22c55e
    doc.rect(0, bannerHeight, pageWidth, 2.0, 'F');

    // Logo
    if (logoBase64) {
      try {
        if (isFirstPage) {
          doc.addImage(logoBase64, 'PNG', margin, 2, 28, 28);
        } else {
          doc.addImage(logoBase64, 'PNG', margin, 1, 13, 13);
        }
      } catch (err) {
        console.warn('Error drawing logo in header:', err);
      }
    }

    const textStartX = logoBase64 ? (isFirstPage ? margin + 32 : margin + 16) : margin;

    if (isFirstPage) {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('NEXTLEVEL GOALKEEPING ACADEMY', textStartX, 13);

      doc.setTextColor(74, 222, 128);
      doc.setFontSize(9.5);
      if (data.clubName) {
        doc.text(`COACH PRO  •  PARTNER-VEREIN: ${data.clubName.toUpperCase()}`, textStartX, 20);
      } else {
        doc.text('COACH PRO  •  PROFESSIONELLE TORWART-TRAININGSPLANUNG', textStartX, 20);
      }

      doc.setTextColor(203, 213, 225);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(planTitle, textStartX, 26.5);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const subTitle = data.clubName 
        ? `NEXTLEVEL • ${data.clubName.toUpperCase()} | ${phaseTitle || planTitle}`
        : `NEXTLEVEL COACH PRO | ${phaseTitle || planTitle}`;
      doc.text(subTitle, textStartX, 10.0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.0);
      doc.setTextColor(203, 213, 225);
      doc.text(`Datum: ${printDate}`, pageWidth - margin, 10.0, { align: 'right' });
    }
  };

  // Helper to add a new page if needed within a phase
  const checkNewPage = (neededHeight: number, currentPhaseName?: string) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      drawHeaderBar(false, currentPhaseName);
      currentY = 22;
    }
  };

  // 1. Initial Page Header (Page 1)
  drawHeaderBar(true);
  currentY = 40;

  // 2. Erste Zeile: Meta-Leiste mit Datum, Trainingsgruppe, Trainer, Anzahl Keeper, Dauer in min
  const metaBoxHeight = 13.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, metaBoxHeight, 2, 2, 'FD');

  const metaCols = [
    { label: 'DATUM', val: printDate },
    { label: 'TRAININGSGRUPPE', val: targetGroup },
    { label: 'TRAINER', val: trainer },
    { label: 'ANZAHL KEEPER', val: `${keepersCount} TW` },
    { label: 'DAUER IN MIN', val: `${totalDuration} Min.` }
  ];

  const metaColWidth = contentWidth / 5;
  metaCols.forEach((col, idx) => {
    const colX = margin + idx * metaColWidth;
    
    // Vertical divider line between columns
    if (idx > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(colX, currentY + 2, colX, currentY + metaBoxHeight - 2);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(col.label, colX + 3, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    const splitVal = doc.splitTextToSize(col.val, metaColWidth - 5);
    doc.text(splitVal[0] || col.val, colX + 3, currentY + 9.5);
  });

  currentY += metaBoxHeight + 4.5;

  // 3. Zweite Zeile: Benötigtes Gesamtmaterial & Wichtiges zum Training (rechts daneben falls ausgefüllt)
  const orgaParts: string[] = [];
  if (data.hasVideoAnalysis) {
    const vText = data.videoAnalysisNotes && data.videoAnalysisNotes.trim()
      ? `Videoanalyse: ${data.videoAnalysisNotes.trim()}`
      : 'Videoanalyse: Für diese Trainingseinheit angesetzt';
    orgaParts.push(vText);
  }
  if (data.importantNotes && data.importantNotes.trim()) {
    orgaParts.push(data.importantNotes.trim());
  }

  const hasOrgaBox = orgaParts.length > 0;

  if (hasOrgaBox) {
    const colGap = 4;
    const colWidth = (contentWidth - colGap) / 2;
    const padding = 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    const splitMat = materialList.length > 0
      ? doc.splitTextToSize(materialList.join('  •  '), colWidth - padding * 2 - 2)
      : ['Keine spezifischen Trainingsmaterialien erforderlich.'];

    const splitOrga = doc.splitTextToSize(orgaParts.join('\n'), colWidth - padding * 2 - 2);

    const maxLines = Math.max(splitMat.length, splitOrga.length);
    const boxHeight = Math.max(12, 6.0 + maxLines * 3.4);

    // Left Box: Benötigtes Gesamtmaterial
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, colWidth, boxHeight, 1.8, 1.8, 'FD');

    // Accent strip left (grün)
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, currentY, 2.5, boxHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(22, 163, 74);
    doc.text(`BENÖTIGTES GESAMTMATERIAL (${materialList.length}):`, margin + padding + 1.5, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(splitMat, margin + padding + 1.5, currentY + 9.0);

    // Right Box: Wichtiges zum Training (rechts neben den Materialien)
    const rightBoxX = margin + colWidth + colGap;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(rightBoxX, currentY, colWidth, boxHeight, 1.8, 1.8, 'FD');

    // Emerald accent strip left
    doc.setFillColor(16, 185, 129);
    doc.rect(rightBoxX, currentY, 2.5, boxHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 118, 110);
    doc.text('WICHTIGES ZUM TRAINING:', rightBoxX + padding + 1.5, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(splitOrga, rightBoxX + padding + 1.5, currentY + 9.0);

    currentY += boxHeight + 4.5;
  } else {
    // Single full-width material box (wenn nichts zu Wichtiges ausgefüllt wurde)
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    
    const matBoxPadding = 3.5;
    const splitMat = materialList.length > 0
      ? doc.splitTextToSize(materialList.join('  •  '), contentWidth - matBoxPadding * 2 - 4)
      : ['Keine spezifischen Trainingsmaterialien erforderlich.'];
    const matBoxHeight = Math.max(11, 5.5 + splitMat.length * 3.4);

    doc.roundedRect(margin, currentY, contentWidth, matBoxHeight, 1.8, 1.8, 'FD');

    // Accent strip left
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, currentY, 2.5, matBoxHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(22, 163, 74);
    doc.text(`BENÖTIGTES GESAMTMATERIAL (${materialList.length} Positionen):`, margin + matBoxPadding + 2, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(51, 65, 85);
    doc.text(splitMat, margin + matBoxPadding + 2, currentY + 9.0);

    currentY += matBoxHeight + 4.5;
  }

  // 4. Iterate over Phases & Exercises
  const phaseColors: Record<string, number[]> = {
    'WarmUp': [245, 158, 11],
    'Torwart-Athletik': [59, 130, 246],
    'Analytisch': [168, 85, 247],
    'Situativ': [34, 197, 94],
    'Wettkämpfe': [244, 63, 94],
    'Integrativ': [6, 182, 212],
    'CoolDown': [20, 184, 166],
    'amber': [245, 158, 11],
    'blue': [59, 130, 246],
    'purple': [168, 85, 247],
    'emerald': [34, 197, 94],
    'rose': [244, 63, 94],
    'cyan': [6, 182, 212],
    'teal': [20, 184, 166],
    'slate': [100, 116, 139]
  };

  // Helper to calculate full rendered height of an exercise card
  const calculateExerciseCardHeight = (exercise: Exercise): number => {
    const imgHeight = 58;
    const imgWidth = 88;
    const rightWidth = contentWidth - imgWidth - 5;

    const elements = exercise.canvasData?.elements || [];
    const hasPass = elements.some(e => e.type === 'pass_arrow');
    const hasDribble = elements.some(e => e.type === 'dribble_arrow');
    const hasRun = elements.some(e => e.type === 'run_arrow');
    const hasShot = elements.some(e => e.type === 'shot_arrow');

    const usedArrowsCount = (hasPass ? 1 : 0) + (hasDribble ? 1 : 0) + (hasRun ? 1 : 0) + (hasShot ? 1 : 0);
    const legendHeight = usedArrowsCount > 0 ? (usedArrowsCount <= 2 ? 8 : 13) : 0;
    const estLeftHeight = imgHeight + (legendHeight > 0 ? legendHeight + 2 : 0);

    let rightTextH = 10.0; // Title & Badge top margin + free line space after title

    // 1. Material
    if (exercise.materials && exercise.materials.length > 0) {
      const splitMat = doc.splitTextToSize(exercise.materials.join(', '), rightWidth);
      rightTextH += 4.8 + splitMat.length * 3.2;
    }

    // 2. Ablauf
    const ablaufContent = exercise.ablauf && exercise.ablauf.trim() ? exercise.ablauf.trim() : 'Keine Ablaufbeschreibung hinterlegt.';
    const splitAblauf = doc.splitTextToSize(ablaufContent, rightWidth);
    rightTextH += 4.8 + splitAblauf.length * 3.3;

    // 3. Coachingpunkte
    if (exercise.coachingPoints && exercise.coachingPoints.trim()) {
      const splitCoach = doc.splitTextToSize(exercise.coachingPoints.trim(), rightWidth);
      rightTextH += 4.8 + splitCoach.length * 3.2;
    }

    // 4. Technikprinzipien (nur wenn ausgefüllt)
    const techText = getTechnikprinzipienText(exercise);
    if (techText) {
      const splitTech = doc.splitTextToSize(techText, rightWidth);
      rightTextH += 4.8 + splitTech.length * 3.2;
    }

    // 5. Taktikprinzipien (nur wenn ausgefüllt)
    const takText = getTaktikprinzipienText(exercise);
    if (takText) {
      const splitTak = doc.splitTextToSize(takText, rightWidth);
      rightTextH += 4.8 + splitTak.length * 3.2;
    }

    return Math.max(estLeftHeight, rightTextH) + 6;
  };

  phaseList.forEach((phaseItem, phaseIndex) => {
    const exercisesInPhase = phaseItem.exercises || [];
    if (exercisesInPhase.length === 0) return;

    // STRICT GUARANTEE: Phase Header and first exercise must always be on the same page!
    const phaseHeaderHeight = 12;
    const firstExHeight = calculateExerciseCardHeight(exercisesInPhase[0]);
    const neededToStartPhase = phaseHeaderHeight + firstExHeight;

    if (currentY + neededToStartPhase > pageHeight - 16) {
      doc.addPage();
      drawHeaderBar(false, `Phase ${phaseIndex + 1}: ${phaseItem.name}`);
      currentY = 22;
    }

    // Phase Header Box
    doc.setFillColor(15, 23, 42); // deep navy
    doc.roundedRect(margin, currentY, contentWidth, 7.5, 1.2, 1.2, 'F');
    
    const colorKey = phaseItem.categoryKey || phaseItem.color || phaseItem.name;
    const cColor = phaseColors[colorKey] || [34, 197, 94];
    doc.setFillColor(cColor[0], cColor[1], cColor[2]);
    doc.rect(margin, currentY, 3.5, 7.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    doc.text(`PHASE ${phaseIndex + 1}: ${phaseItem.name.toUpperCase()}`, margin + 7, currentY + 5.2);

    const phaseDuration = exercisesInPhase.reduce((acc, curr) => acc + (curr.durationMinutes || 15), 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.0);
    doc.setTextColor(203, 213, 225);
    doc.text(`${exercisesInPhase.length} Übung(en)  |  ${phaseDuration} Min.`, pageWidth - margin - 3.5, currentY + 5.2, { align: 'right' });

    currentY += 10.5;

    // Render Exercises for this Phase
    exercisesInPhase.forEach((exercise, exIndex) => {
      const cardHeight = calculateExerciseCardHeight(exercise);

      // Page break check for subsequent exercises
      if (exIndex > 0) {
        checkNewPage(cardHeight, `Phase ${phaseIndex + 1}: ${phaseItem.name}`);
      }

      // Check arrows used in canvas
      const elements = exercise.canvasData?.elements || [];
      const hasPass = elements.some(e => e.type === 'pass_arrow');
      const hasDribble = elements.some(e => e.type === 'dribble_arrow');
      const hasRun = elements.some(e => e.type === 'run_arrow');
      const hasShot = elements.some(e => e.type === 'shot_arrow');

      const usedArrows: { id: 'pass' | 'dribble' | 'run' | 'shot'; label: string }[] = [];
      if (hasPass) usedArrows.push({ id: 'pass', label: 'Passweg' });
      if (hasDribble) usedArrows.push({ id: 'dribble', label: 'Dribbelweg' });
      if (hasRun) usedArrows.push({ id: 'run', label: 'Laufweg' });
      if (hasShot) usedArrows.push({ id: 'shot', label: 'Schuss' });

      const imgWidth = 88;
      const imgHeight = 58;
      const rightWidth = contentWidth - imgWidth - 5;
      const legendHeight = usedArrows.length > 0 ? (usedArrows.length <= 2 ? 8 : 13) : 0;

      // 1. LEFT COLUMN: Canvas Image + Legend (Unchanged & large)
      const exImgDataUrl = (exercise.id && preloadedImages.get(exercise.id)) ||
        (exercise.imageUrl && preloadedImages.get(exercise.imageUrl)) ||
        (exercise.imageBase64 && preloadedImages.get(exercise.imageBase64)) ||
        (exercise.imageBase64?.startsWith('data:image') ? exercise.imageBase64 : '');

      if (exImgDataUrl && exImgDataUrl.startsWith('data:image')) {
        try {
          doc.addImage(exImgDataUrl, 'PNG', margin, currentY, imgWidth, imgHeight);
          doc.setDrawColor(203, 213, 225);
          doc.rect(margin, currentY, imgWidth, imgHeight, 'S');
        } catch (imgErr) {
          console.warn('Could not render image in PDF:', imgErr);
        }
      } else {
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, currentY, imgWidth, imgHeight, 'F');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Taktikboard', margin + imgWidth / 2, currentY + imgHeight / 2, { align: 'center' });
      }

      // Arrow legend below image if present
      if (usedArrows.length > 0) {
        const isSingleRow = usedArrows.length <= 2;
        const legendY = currentY + imgHeight + 2;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, legendY, imgWidth, legendHeight, 1.2, 1.2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.0);
        doc.setTextColor(100, 116, 139);
        doc.text('PFEIL-LEGENDE:', margin + 2.5, legendY + 3.0);

        usedArrows.forEach((item, idx) => {
          let itemX = margin + 2.5;
          let itemY = legendY + 6.0;

          if (isSingleRow) {
            itemX = margin + 2.5 + idx * (imgWidth / 2);
            itemY = legendY + 6.0;
          } else {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            itemX = margin + 2.5 + col * (imgWidth / 2);
            itemY = legendY + 6.0 + row * 4.0;
          }

          if (item.id === 'pass') {
            doc.setDrawColor(217, 119, 6);
            doc.setLineWidth(0.8);
            doc.line(itemX, itemY, itemX + 6.0, itemY);
            doc.setFillColor(217, 119, 6);
            doc.triangle(itemX + 6.0, itemY - 0.9, itemX + 6.0, itemY + 0.9, itemX + 8.0, itemY, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(51, 65, 85);
            doc.text('Passweg', itemX + 10.0, itemY + 0.8);
          } else if (item.id === 'dribble') {
            doc.setDrawColor(8, 145, 178);
            doc.setLineWidth(0.7);
            doc.line(itemX, itemY, itemX + 1.5, itemY - 0.8);
            doc.line(itemX + 1.5, itemY - 0.8, itemX + 3.0, itemY + 0.8);
            doc.line(itemX + 3.0, itemY + 0.8, itemX + 4.5, itemY - 0.8);
            doc.line(itemX + 4.5, itemY - 0.8, itemX + 6.0, itemY);
            doc.setFillColor(8, 145, 178);
            doc.triangle(itemX + 6.0, itemY - 0.9, itemX + 6.0, itemY + 0.9, itemX + 8.0, itemY, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(51, 65, 85);
            doc.text('Dribbelweg', itemX + 10.0, itemY + 0.8);
          } else if (item.id === 'run') {
            doc.setDrawColor(71, 85, 105);
            doc.setLineWidth(0.7);
            doc.line(itemX, itemY, itemX + 1.5, itemY);
            doc.line(itemX + 2.2, itemY, itemX + 3.7, itemY);
            doc.line(itemX + 4.4, itemY, itemX + 6.0, itemY);
            doc.setFillColor(71, 85, 105);
            doc.triangle(itemX + 6.0, itemY - 0.9, itemX + 6.0, itemY + 0.9, itemX + 8.0, itemY, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(51, 65, 85);
            doc.text('Laufweg', itemX + 10.0, itemY + 0.8);
          } else if (item.id === 'shot') {
            doc.setDrawColor(220, 38, 38);
            doc.setLineWidth(0.9);
            doc.line(itemX, itemY, itemX + 6.0, itemY);
            doc.setFillColor(220, 38, 38);
            doc.triangle(itemX + 6.0, itemY - 0.9, itemX + 6.0, itemY + 0.9, itemX + 8.0, itemY, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(51, 65, 85);
            doc.text('Schuss', itemX + 10.0, itemY + 0.8);
          }
        });
      }

      // 2. RIGHT COLUMN: Duration badge top right + Exercise title + free line + Material + Ablauf + Coachingpunkte + Technikprinzipien + Taktikprinzipien
      const rightX = margin + imgWidth + 5;
      let rightY = currentY;

      // Duration Badge (Top Right of right column)
      const badgeW = 16;
      const badgeH = 5.0;
      const badgeX = pageWidth - margin - badgeW;
      const badgeY = rightY;

      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(22, 163, 74);
      doc.text(`${exercise.durationMinutes || 15} min`, badgeX + badgeW / 2, badgeY + 3.5, { align: 'center' });

      // Title (Left of duration badge)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const titleMaxW = rightWidth - badgeW - 2;
      const splitTitle = doc.splitTextToSize(`${exIndex + 1}. ${exercise.title}`, titleMaxW);
      doc.text(splitTitle[0] || `${exIndex + 1}. ${exercise.title}`, rightX, rightY + 3.8);

      // Freie Zeile unter der Überschrift
      rightY += 10.0;

      // 1. Material
      if (exercise.materials && exercise.materials.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.0);
        doc.setTextColor(30, 41, 59);
        doc.text('Material:', rightX, rightY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const splitMat = doc.splitTextToSize(exercise.materials.join(', '), rightWidth);
        doc.text(splitMat, rightX, rightY + 3.6);
        rightY += 4.8 + splitMat.length * 3.2;
      }

      // 2. Ablauf
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.0);
      doc.setTextColor(30, 41, 59);
      doc.text('Ablauf:', rightX, rightY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      const ablaufContent = exercise.ablauf && exercise.ablauf.trim() ? exercise.ablauf.trim() : 'Keine Ablaufbeschreibung hinterlegt.';
      const splitAblauf = doc.splitTextToSize(ablaufContent, rightWidth);
      doc.text(splitAblauf, rightX, rightY + 3.6);
      rightY += 4.8 + splitAblauf.length * 3.3;

      // 3. Coachingpunkte
      if (exercise.coachingPoints && exercise.coachingPoints.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.0);
        doc.setTextColor(22, 163, 74);
        doc.text('Coachingpunkte:', rightX, rightY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.4);
        doc.setTextColor(71, 85, 105);
        const splitCoach = doc.splitTextToSize(exercise.coachingPoints.trim(), rightWidth);
        doc.text(splitCoach, rightX, rightY + 3.6);
        rightY += 4.8 + splitCoach.length * 3.2;
      }

      // 4. Technikprinzipien (nur wenn ausgefüllt)
      const techText = getTechnikprinzipienText(exercise);
      if (techText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.0);
        doc.setTextColor(30, 41, 59);
        doc.text('Technikprinzipien:', rightX, rightY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.4);
        doc.setTextColor(51, 65, 85);
        const splitTech = doc.splitTextToSize(techText, rightWidth);
        doc.text(splitTech, rightX, rightY + 3.6);
        rightY += 4.8 + splitTech.length * 3.2;
      }

      // 5. Taktikprinzipien (nur wenn ausgefüllt)
      const takText = getTaktikprinzipienText(exercise);
      if (takText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.0);
        doc.setTextColor(30, 41, 59);
        doc.text('Taktikprinzipien:', rightX, rightY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.4);
        doc.setTextColor(51, 65, 85);
        const splitTak = doc.splitTextToSize(takText, rightWidth);
        doc.text(splitTak, rightX, rightY + 3.6);
        rightY += 4.8 + splitTak.length * 3.2;
      }

      const leftBottomY = currentY + imgHeight + (legendHeight > 0 ? legendHeight + 2 : 0);
      currentY = Math.max(leftBottomY, rightY) + 2;

      // Separator line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 5;
    });

    currentY += 2;
  });

  // 5. Add Page Numbers & NextLevel Footer for all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.text('NextLevel Goalkeeping Academy — Coach PRO', margin, pageHeight - 5);
    doc.text(`Seite ${i} von ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  // File Name format: TW-TE_Datum_Trainingsgruppe_Ausführlich.pdf
  const dateStr = (data.planDate || data.date || new Date().toISOString().substring(0, 10)).trim();
  const groupStr = (data.targetGroup || 'nicht-zugeordnet').trim().replace(/[/\\:]+/g, '-').replace(/\s+/g, '-');
  const finalFilename = `TW-TE_${dateStr}_${groupStr}_Ausführlich.pdf`;

  if (returnBlobOnly) {
    const blob = doc.output('blob');
    return { blob, filename: finalFilename };
  }

  doc.save(finalFilename);
}

/**
 * Generates a 1-page compact A4 clipboard summary PDF for on-pitch training.
 * Contains:
 * - Erste Zeile: Datum, Trainingsgruppe, Trainer, Anzahl Keeper, Dauer in min
 * - Zweite Zeile: Benötigtes Gesamtmaterial (hervorgehoben, platzsparend)
 * - Darunter: Trainingsphasen mit allen Übungen in 2 Spalten (Thumbnail links, Dauer oben rechts, Ablauf & Coaching & Prinzipien rechts)
 * - Streng garantiert auf 1 A4-Seite ("Seite 1 von 1")
 */
export async function generateCompactTrainingPlanPDF(
  data: ExportPlanData,
  returnBlobOnly = false
): Promise<{ blob: Blob; filename: string } | void> {
  const { jsPDF } = await import('jspdf');
  const logoBase64 = await loadLogoBase64(data.clubLogoUrl);

  const phaseList = resolvePlanPhases(data);

  // Preload all exercise images to Data URLs
  const preloadedImages = new Map<string, string>();
  const allExercises = phaseList.flatMap(p => p.exercises || []);
  for (const ex of allExercises) {
    const rawUrl = ex.imageUrl || ex.imageBase64;
    if (rawUrl) {
      try {
        const dataUrl = await loadImageAsDataUrl(rawUrl);
        if (dataUrl) {
          if (ex.id) preloadedImages.set(ex.id, dataUrl);
          preloadedImages.set(rawUrl, dataUrl);
        }
      } catch (err) {
        console.warn('Error preloading compact exercise image for PDF:', err);
      }
    }
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 7;
  const contentWidth = pageWidth - margin * 2; // 196mm

  const planTitle = data.planTitle || data.title || 'Torwart-Trainingseinheit';
  const printDate = data.planDate || data.date || new Date().toISOString().substring(0, 10);
  const trainer = data.trainerName || 'Torwarttrainer';
  const targetGroup = data.targetGroup || 'Jugend Leistungsbereich';
  const keepersCount = data.availableKeepers || 3;

  // Calculate total duration & exercises count & collect all unique materials
  let totalDuration = 0;
  let totalExercises = 0;
  const allUniqueMaterials = new Set<string>();

  phaseList.forEach(p => {
    const list = p.exercises || [];
    list.forEach(ex => {
      totalDuration += ex.durationMinutes || 15;
      totalExercises += 1;
      if (Array.isArray(ex.materials)) {
        ex.materials.forEach(m => {
          if (m && typeof m === 'string' && m.trim()) {
            allUniqueMaterials.add(m.trim());
          }
        });
      }
    });
  });

  const materialList = Array.from(allUniqueMaterials);

  // 1. Top Header Banner (13.5mm)
  const headerHeight = 13.5;
  doc.setFillColor(10, 15, 29); // #0a0f1d
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  doc.setFillColor(34, 197, 94); // #22c55e accent line
  doc.rect(0, headerHeight, pageWidth, 1.2, 'F');

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 1.2, 11, 11);
    } catch (e) {
      console.warn('Error drawing logo in compact header:', e);
    }
  }

  const headerTextX = logoBase64 ? margin + 14 : margin;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('NEXTLEVEL GOALKEEPING ACADEMY', headerTextX, 6.0);

  doc.setTextColor(74, 222, 128);
  doc.setFontSize(7.2);
  const clubSub = data.clubName 
    ? `KLEMMBRETT-TRAININGSPLAN  •  PARTNER-VEREIN: ${data.clubName.toUpperCase()}`
    : 'KLEMMBRETT-TRAININGSPLAN  •  1-SEITEN PLATZ-ÜBERSICHT';
  doc.text(clubSub, headerTextX, 10.5);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(planTitle, pageWidth - margin, 10.5, { align: 'right' });

  // 2. Erste Zeile: Meta-Leiste mit Datum, Trainingsgruppe, Trainer, Anzahl Keeper, Dauer in min
  let currentY = 17.0;
  const metaBoxHeight = 7.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, metaBoxHeight, 1.0, 1.0, 'FD');

  const metaCols = [
    { label: 'DATUM', val: printDate },
    { label: 'TRAININGSGRUPPE', val: targetGroup },
    { label: 'TRAINER', val: trainer },
    { label: 'ANZAHL KEEPER', val: `${keepersCount} TW` },
    { label: 'DAUER IN MIN', val: `${totalDuration} Min.` }
  ];

  const metaColWidth = contentWidth / 5;
  metaCols.forEach((col, idx) => {
    const colX = margin + idx * metaColWidth;
    if (idx > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(colX, currentY + 1.2, colX, currentY + metaBoxHeight - 1.2);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(col.label, colX + 2.0, currentY + 2.6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    const splitVal = doc.splitTextToSize(col.val, metaColWidth - 4);
    doc.text(splitVal[0] || col.val, colX + 2.0, currentY + 5.8);
  });

  currentY += metaBoxHeight + 2.0;

  // 3. Zweite Zeile: Benötigtes Gesamtmaterial & Wichtiges zum Training (nebeneinander falls vorhanden)
  const orgaPartsCompact: string[] = [];
  if (data.hasVideoAnalysis) {
    const vText = data.videoAnalysisNotes && data.videoAnalysisNotes.trim()
      ? `Video: ${data.videoAnalysisNotes.trim()}`
      : 'Videoanalyse angesetzt';
    orgaPartsCompact.push(vText);
  }
  if (data.importantNotes && data.importantNotes.trim()) {
    orgaPartsCompact.push(data.importantNotes.trim());
  }

  const hasOrgaCompact = orgaPartsCompact.length > 0;

  if (hasOrgaCompact) {
    const colGap = 2.5;
    const colW = (contentWidth - colGap) / 2;
    const boxH = 5.2;

    // Linke Box: Material
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, colW, boxH, 0.8, 0.8, 'FD');
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, currentY, 1.8, boxH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(22, 163, 74);
    doc.text('MATERIAL:', margin + 3.0, currentY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(51, 65, 85);
    const matListStr = materialList.length > 0 ? materialList.join(' • ') : 'Kein Material';
    const splitMatStr = doc.splitTextToSize(matListStr, colW - 19);
    doc.text(splitMatStr[0] || 'Kein Material', margin + 18, currentY + 3.5);

    // Rechte Box: Wichtiges / Video (rechts daneben!)
    const rightX = margin + colW + colGap;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(rightX, currentY, colW, boxH, 0.8, 0.8, 'FD');
    doc.setFillColor(16, 185, 129);
    doc.rect(rightX, currentY, 1.8, boxH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(15, 118, 110);
    doc.text('WICHTIGES / VIDEO:', rightX + 3.0, currentY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(30, 41, 59);
    const orgaStr = orgaPartsCompact.join(' • ');
    const splitOrgaStr = doc.splitTextToSize(orgaStr, colW - 28);
    doc.text(splitOrgaStr[0] || '', rightX + 27, currentY + 3.5);

    currentY += boxH + 1.8;
  } else {
    // Vollflächige Materialbox (falls kein Wichtiges/Video vorhanden)
    const matBoxH = 5.2;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, contentWidth, matBoxH, 0.8, 0.8, 'FD');
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, currentY, 1.8, matBoxH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    doc.setTextColor(22, 163, 74);
    doc.text(`BENÖTIGTES GESAMTMATERIAL (${materialList.length}):`, margin + 3.0, currentY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(51, 65, 85);
    const matListStr = materialList.length > 0 ? materialList.join('  •  ') : 'Keine spezifischen Materialien erforderlich';
    const splitMatStr = doc.splitTextToSize(matListStr, contentWidth - 48);
    doc.text(splitMatStr[0] || '', margin + 46, currentY + 3.5);

    currentY += matBoxH + 1.8;
  }

  // 4. Calculate dynamic space per exercise to strictly guarantee 1 single page!
  const footerY = pageHeight - 6.5;
  const totalPhaseHeadersHeight = phaseList.length * 4.5;
  const availableContentHeight = footerY - currentY - totalPhaseHeadersHeight - 1.5;
  const maxExHeight = 36; // 20% smaller exercise height
  const rawHeight = (availableContentHeight / Math.max(1, totalExercises)) * 0.8;
  const exerciseHeight = Math.max(20, Math.min(maxExHeight, rawHeight));

  const phaseColors: Record<string, number[]> = {
    'WarmUp': [245, 158, 11],
    'Torwart-Athletik': [59, 130, 246],
    'Analytisch': [168, 85, 247],
    'Situativ': [34, 197, 94],
    'Wettkämpfe': [244, 63, 94],
    'Integrativ': [6, 182, 212],
    'CoolDown': [20, 184, 166],
    'amber': [245, 158, 11],
    'blue': [59, 130, 246],
    'purple': [168, 85, 247],
    'emerald': [34, 197, 94],
    'rose': [244, 63, 94],
    'cyan': [6, 182, 212],
    'teal': [20, 184, 166],
    'slate': [100, 116, 139]
  };

  // Render Phase by Phase
  phaseList.forEach((phase, pIdx) => {
    const colorKey = phase.categoryKey || phase.color || phase.name;
    const cColor = phaseColors[colorKey] || [34, 197, 94];

    // Phase header ribbon
    doc.setFillColor(15, 23, 42); // deep navy
    doc.roundedRect(margin, currentY, contentWidth, 4.0, 0.6, 0.6, 'F');

    doc.setFillColor(cColor[0], cColor[1], cColor[2]);
    doc.rect(margin, currentY, 2.5, 4.0, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(255, 255, 255);
    doc.text(`PHASE ${pIdx + 1}: ${phase.name.toUpperCase()}`, margin + 4.5, currentY + 2.9);

    const phaseDuration = (phase.exercises || []).reduce((sum, e) => sum + (e.durationMinutes || 15), 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`${phaseDuration} Min.  |  ${(phase.exercises || []).length} Übung(en)`, pageWidth - margin - 2.5, currentY + 2.9, { align: 'right' });

    currentY += 4.8;

    // Render Exercises in Phase
    (phase.exercises || []).forEach((ex, exIdx) => {
      const cardHeight = exerciseHeight - 0.8;

      // Row container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, contentWidth, cardHeight, 0.8, 0.8, 'FD');

      // Zone 1: Left Thumbnail spanning full height of the exercise (88 / 58 proportional ratio)
      const renderH = cardHeight - 2.0;
      const renderW = renderH * (88 / 58);
      const imgX = margin + 1.0;
      const imgY = currentY + 1.0;

      const exImgDataUrl = (ex.id && preloadedImages.get(ex.id)) ||
        (ex.imageUrl && preloadedImages.get(ex.imageUrl)) ||
        (ex.imageBase64 && preloadedImages.get(ex.imageBase64)) ||
        (ex.imageBase64?.startsWith('data:image') ? ex.imageBase64 : '');

      if (exImgDataUrl && exImgDataUrl.startsWith('data:image')) {
        try {
          doc.addImage(exImgDataUrl, 'PNG', imgX, imgY, renderW, renderH);
          doc.setDrawColor(226, 232, 240);
          doc.rect(imgX, imgY, renderW, renderH, 'S');
        } catch {
          doc.setFillColor(241, 245, 249);
          doc.rect(imgX, imgY, renderW, renderH, 'F');
        }
      } else {
        doc.setFillColor(241, 245, 249);
        doc.rect(imgX, imgY, renderW, renderH, 'F');
        doc.setFontSize(6.0);
        doc.setTextColor(148, 163, 184);
        doc.text('Taktikboard', imgX + renderW / 2, imgY + renderH / 2, { align: 'center' });
      }

      // Zone 2: Details & Columns (Right of graphic)
      const detailX = margin + renderW + 2.5;
      const detailW = contentWidth - renderW - 3.5;

      // Duration Badge (Top Right of exercise row)
      const badgeW = 13.0;
      const badgeH = 3.6;
      const badgeX = pageWidth - margin - badgeW - 1.0;
      const badgeY = currentY + 1.0;

      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.6, 0.6, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(22, 163, 74);
      doc.text(`${ex.durationMinutes || 15} min`, badgeX + badgeW / 2, badgeY + 2.6, { align: 'center' });

      // Title (Left of duration badge)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      const titleMaxW = detailW - badgeW - 2.0;
      const splitTitle = doc.splitTextToSize(`${exIdx + 1}. ${ex.title}`, titleMaxW);
      doc.text(splitTitle[0] || `${exIdx + 1}. ${ex.title}`, detailX, currentY + 3.2);

      // Subtle divider below title
      doc.setDrawColor(241, 245, 249);
      doc.line(detailX, currentY + 4.5, pageWidth - margin - 1.5, currentY + 4.5);

      // 2 Sub-Columns: Col 1 (Material + Ablauf) & Col 2 (Coaching + Technikprinzipien + Taktikprinzipien)
      const col1W = Math.floor(detailW * 0.48);
      const col2W = detailW - col1W - 2.5;
      const col1X = detailX;
      const col2X = detailX + col1W + 2.5;

      // Vertical separator
      doc.setDrawColor(241, 245, 249);
      doc.line(col2X - 1.2, currentY + 5.0, col2X - 1.2, currentY + cardHeight - 1.0);

      // Col 1: Material & Ablauf
      let col1Y = currentY + 6.8;
      if (ex.materials && ex.materials.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(30, 41, 59);
        doc.text('Material:', col1X, col1Y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(51, 65, 85);
        const matStr = ex.materials.join(', ');
        const splitMat = doc.splitTextToSize(matStr, col1W - 14);
        doc.text(splitMat[0] || matStr, col1X + 13, col1Y);
        col1Y += 3.2;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(30, 41, 59);
      doc.text('Ablauf:', col1X, col1Y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(51, 65, 85);
      const ablaufStr = (ex.ablauf || 'Keine Ablaufbeschreibung.').replace(/\n+/g, ' ');
      const splitAbl = doc.splitTextToSize(ablaufStr, col1W);
      const remainingCol1H = cardHeight - (col1Y - currentY) - 1.5;
      const maxAblLines = Math.max(1, Math.floor(remainingCol1H / 2.3));
      doc.text(splitAbl.slice(0, maxAblLines), col1X, col1Y + 2.3);

      // Col 2: Coachingpunkte & Prinzipien
      let col2Y = currentY + 6.8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(22, 163, 74);
      doc.text('Coaching:', col2X, col2Y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      const coachStr = (ex.coachingPoints || 'Keine Coachingpunkte.').replace(/\n+/g, ' • ');
      const splitCP = doc.splitTextToSize(coachStr, col2W);

      const techText = getTechnikprinzipienText(ex);
      const takText = getTaktikprinzipienText(ex);

      if ((techText || takText) && cardHeight >= 28) {
        doc.text(splitCP.slice(0, 1), col2X, col2Y + 2.3);
        col2Y += 5.2;

        if (techText) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.6);
          doc.setTextColor(30, 41, 59);
          doc.text('Technik:', col2X, col2Y);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.3);
          doc.setTextColor(51, 65, 85);
          const splitTech = doc.splitTextToSize(techText, col2W - 13);
          doc.text(splitTech[0] || techText, col2X + 12, col2Y);
          col2Y += 3.0;
        }

        if (takText) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.6);
          doc.setTextColor(30, 41, 59);
          doc.text('Taktik:', col2X, col2Y);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.3);
          doc.setTextColor(51, 65, 85);
          const splitTak = doc.splitTextToSize(takText, col2W - 11);
          doc.text(splitTak[0] || takText, col2X + 10, col2Y);
        }
      } else {
        const remainingCol2H = cardHeight - (col2Y - currentY) - 1.5;
        const maxCPLines = Math.max(1, Math.floor(remainingCol2H / 2.3));
        doc.text(splitCP.slice(0, maxCPLines), col2X, col2Y + 2.3);
      }

      currentY += exerciseHeight;
    });

    currentY += 0.8;
  });

  // Footer Line
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY - 1, pageWidth - margin, footerY - 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('NextLevel Goalkeeping Academy — Coach PRO  •  Kompaktes Klemmbrett-Blatt', margin, footerY + 3);
  doc.text('Seite 1 von 1', pageWidth - margin, footerY + 3, { align: 'right' });

  const dateStr = (data.planDate || data.date || new Date().toISOString().substring(0, 10)).trim();
  const groupStr = (data.targetGroup || 'nicht-zugeordnet').trim().replace(/[/\\:]+/g, '-').replace(/\s+/g, '-');
  const finalFilename = `TW-TE_${dateStr}_${groupStr}_Kompakt.pdf`;

  if (returnBlobOnly) {
    const blob = doc.output('blob');
    return { blob, filename: finalFilename };
  }

  doc.save(finalFilename);
}

/**
 * Returns PDF Blob for digital sharing / Web Share API
 */
export async function getTrainingPlanPDFBlob(
  data: ExportPlanData,
  isCompact = false
): Promise<{ blob: Blob; filename: string }> {
  if (isCompact) {
    const res = await generateCompactTrainingPlanPDF(data, true);
    return res as { blob: Blob; filename: string };
  } else {
    const res = await generateTrainingPlanPDF(data, true);
    return res as { blob: Blob; filename: string };
  }
}

export interface ExportHistoryData {
  plans: TrainingPlan[];
  exerciseMap?: Map<string, Exercise>;
  structures?: TrainingStructure[];
  groups?: TrainingGroup[];
  clubLogoUrl?: string;
  clubName?: string;
}

/**
 * Generates and downloads a multi-page PDF document representing the entire Training Plan History
 */
export async function generateTrainingPlanHistoryPDF(data: ExportHistoryData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186

  let currentY = margin;

  // 1. Sort plans descending by date (newest sessions first)
  const sortedPlans = [...data.plans].sort((a, b) => {
    const parseDateToTime = (dStr?: string) => {
      if (!dStr) return 0;
      const clean = dStr.trim().replace(/\s*\([AB]\)$/, '');
      const parts = clean.split('.');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
      }
      return new Date(clean).getTime() || 0;
    };
    const timeA = a.createdAt || parseDateToTime(a.date || a.planDate);
    const timeB = b.createdAt || parseDateToTime(b.date || b.planDate);
    if (timeA && timeB && timeA !== timeB) return timeB - timeA;
    return (b.date || b.planDate || '').localeCompare(a.date || a.planDate || '');
  });

  // Calculate statistics
  const totalMinutes = sortedPlans.reduce((sum, p) => sum + (p.totalMinutes || p.totalDuration || 90), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalExercises = sortedPlans.reduce((sum, p) => {
    if (typeof p.exerciseCount === 'number') return sum + p.exerciseCount;
    const pe = p.phaseExercises || p.phases || {};
    return sum + Object.values(pe).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
  }, 0);
  const debriefedCount = sortedPlans.filter(p => p.debriefedAt || (p.keeperInsights && Object.keys(p.keeperInsights).length > 0)).length;

  const logoBase64 = await loadLogoBase64(data.clubLogoUrl);

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

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(52, 211, 153); // emerald-400
      doc.text('GESAMTHISTORIE DER TRAININGSEINHEITEN', textLeft, 18.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      const todayStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.text(`Stand: ${todayStr}  •  ${sortedPlans.length} Einheiten archiviert`, pageWidth - margin, 18.5, { align: 'right' });

      currentY = 32;

      // Stats KPI Bar (4 boxes)
      const kpiGap = 3;
      const kpiWidth = (contentWidth - kpiGap * 3) / 4;
      const kpiHeight = 13.5;

      const kpis = [
        { label: 'EINHEITEN GESAMT', val: `${sortedPlans.length}`, color: [16, 185, 129] },
        { label: 'TRAININGSZEIT', val: `${totalHours} Std.`, color: [14, 165, 233] },
        { label: 'ÜBUNGSEINSÄTZE', val: `${totalExercises}`, color: [245, 158, 11] },
        { label: 'NACHBEREITET', val: `${debriefedCount} von ${sortedPlans.length}`, color: [168, 85, 247] }
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
        doc.setFontSize(9.5);
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
      doc.text(data.clubName || 'NEXT LEVEL GOALKEEPING ACADEMY — TRAININGSPLAN-HISTORIE', margin, 8);

      currentY = 17;
    }
  };

  // Draw header for page 1
  drawHeader(true);

  // Map of exercise ID to Exercise Object for quick lookup
  const exMap = data.exerciseMap || new Map<string, Exercise>();

  // Helper for page break check
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      drawHeader(false);
    }
  };

  // Helper to resolve clean human-readable phase name (filters out internal IDs like p_1787850886704_sdqg)
  const getFriendlyPhaseName = (phaseKey: string): string => {
    if (data.structures) {
      for (const s of data.structures) {
        const found = s.phases?.find(p => p.id === phaseKey);
        if (found && found.name) return found.name;
      }
    }
    const def = DEFAULT_TRAINING_STRUCTURE.phases.find(p => p.id === phaseKey);
    if (def && def.name) return def.name;

    const standardPhases = ['WarmUp', 'Warm-up', 'Analytisch', 'Torwart-Athletik', 'Athletik', 'Situativ', 'Wettkämpfe', 'Integrativ', 'CoolDown', 'Hauptteil', 'Abschluss'];
    const direct = standardPhases.find(n => n.toLowerCase() === phaseKey.toLowerCase());
    if (direct) return direct;

    // Filter out internal generated IDs (e.g. p_..., phase_...)
    if (/^p[_\d]|^phase[_\d]/i.test(phaseKey) || phaseKey.length > 12) {
      return 'Übungen';
    }
    return phaseKey;
  };

  if (sortedPlans.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Noch keine Trainingspläne in der Historie vorhanden.', margin, currentY + 10);
  } else {
    // Iterate over each plan and draw card
    sortedPlans.forEach((plan) => {
      const planTitle = plan.title || plan.planTitle || 'Torwart-Trainingseinheit';
      const planDate = (plan.date || plan.planDate || 'Kein Datum').trim();
      const trainer = plan.trainerName || 'Trainer';
      const targetGroup = plan.targetGroup || 'Gruppe';
      const duration = plan.totalMinutes || plan.totalDuration || 90;
      const keepers = plan.availableKeepers || 3;
      const phasesData = plan.phaseExercises || plan.phases || {};
      const customExMap = plan.customPlanExercises || {};

      // Check if debriefed
      const isDebriefed = Boolean(
        plan.debriefedAt ||
        (plan.keeperInsights && Object.keys(plan.keeperInsights).length > 0) ||
        (plan.playerConversations && Object.keys(plan.playerConversations).length > 0) ||
        plan.debriefedByTrainer
      );
      const debriefer = plan.debriefedByTrainer || trainer;

      // Collect exercises per phase with clean titles (never internal IDs!)
      const phaseEntries: Array<{ phaseName: string; exercises: string[] }> = [];
      Object.entries(phasesData).forEach(([phaseKey, exIds]) => {
        if (Array.isArray(exIds) && exIds.length > 0) {
          const exNames = exIds.map(id => {
            if (customExMap[id]?.title) return customExMap[id].title;
            const found = exMap.get(id);
            if (found?.title) return found.title;
            // Clean up: never return raw internal IDs like p_... or ex_...
            if (/^[a-z0-9_]{10,}$/i.test(id) || /^p_|^ex_/i.test(id)) {
              return 'Übung';
            }
            return id;
          }).filter(Boolean);

          if (exNames.length > 0) {
            phaseEntries.push({
              phaseName: getFriendlyPhaseName(phaseKey),
              exercises: exNames
            });
          }
        }
      });

      // Calculate approximate height needed for this card
      const baseHeaderHeight = 8.5;
      let bodyHeight = 4.0;
      if (phaseEntries.length > 0) {
        bodyHeight += phaseEntries.length * 3.8;
      }
      if (plan.importantNotes || plan.hasVideoAnalysis) {
        bodyHeight += 4.5;
      }

      const cardTotalHeight = Math.max(18, baseHeaderHeight + bodyHeight + 2.5);

      ensureSpace(cardTotalHeight + 3);

      // Draw Card Background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, contentWidth, cardTotalHeight, 2, 2, 'FD');

      // Card Header Ribbon
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, contentWidth, baseHeaderHeight, 2, 2, 'FD');
      doc.rect(margin, currentY + baseHeaderHeight - 2, contentWidth, 2, 'F');

      // 1. Date Badge (Left)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.0);
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text(planDate, margin + 3, currentY + 5.8);

      const dateWidth = doc.getTextWidth(planDate);
      let headerX = margin + dateWidth + 4.5;

      // 2. Thema (Title)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.0);
      doc.setTextColor(15, 23, 42); // slate-900
      const titleText = `•  ${planTitle}`;
      doc.text(titleText, headerX, currentY + 5.8);
      headerX += doc.getTextWidth(titleText) + 3.0;

      // 3. Hinweis "Nachbereitet (Trainer)" DIREKT RECHTS NEBEN DAS THEMA
      if (isDebriefed) {
        const debriefBadge = `Nachbereitet (${debriefer})`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(147, 51, 234); // purple-600
        doc.text(debriefBadge, headerX, currentY + 5.8);
      }

      // 4. Meta (Right aligned): Target Group & Duration & Keepers & Trainer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(71, 85, 105);
      const metaRight = `${targetGroup}  |  ${duration} Min. (${keepers} TW)  |  Trainer: ${trainer}`;
      doc.text(metaRight, pageWidth - margin - 3, currentY + 5.8, { align: 'right' });

      let cardInnerY = currentY + baseHeaderHeight + 3.2;

      // Render Phases and exercises
      if (phaseEntries.length > 0) {
        phaseEntries.forEach(pe => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(15, 118, 110); // teal-700
          const pLabel = `${pe.phaseName}:`;
          doc.text(pLabel, margin + 3.5, cardInnerY);

          const pLabelWidth = doc.getTextWidth(pLabel) + 2;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(51, 65, 85);
          const exText = pe.exercises.join('  •  ');
          const splitEx = doc.splitTextToSize(exText, contentWidth - pLabelWidth - 7);
          doc.text(splitEx[0] || exText, margin + 3.5 + pLabelWidth, cardInnerY);

          cardInnerY += 3.8;
        });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Keine Übungen hinterlegt', margin + 3.5, cardInnerY);
        cardInnerY += 3.8;
      }

      // Render Orga & Video info if present
      if (plan.importantNotes || plan.hasVideoAnalysis) {
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(187, 247, 208);
        const orgaBoxH = 4.0;
        doc.roundedRect(margin + 3, cardInnerY - 2.8, contentWidth - 6, orgaBoxH, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(21, 128, 61);
        doc.text('ORGA / VIDEO:', margin + 5, cardInnerY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(30, 41, 59);
        const orgaParts: string[] = [];
        if (plan.importantNotes) orgaParts.push(plan.importantNotes.trim());
        if (plan.hasVideoAnalysis) {
          orgaParts.push(plan.videoAnalysisNotes ? `Video: ${plan.videoAnalysisNotes.trim()}` : 'Videoanalyse');
        }
        const orgaStr = orgaParts.join('  •  ');
        const splitOrga = doc.splitTextToSize(orgaStr, contentWidth - 45);
        doc.text(splitOrga[0] || orgaStr, margin + 30, cardInnerY);

        cardInnerY += 4.5;
      }

      currentY += cardTotalHeight + 3.0;
    });
  }

  // Draw Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text('NextLevel Goalkeeping Academy — Trainingsplan-Historie Export', margin, pageHeight - 5);
    doc.text(`Seite ${i} von ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  const todayIso = new Date().toISOString().substring(0, 10);
  doc.save(`Trainingsplan_Historie_${todayIso}.pdf`);
}

