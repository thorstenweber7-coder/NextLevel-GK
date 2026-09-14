import type { GeneralWeekTemplateDay, MesoWeekItem } from '../types';
import { BUILDING_BLOCK_CONFIGS, DEFAULT_WEEK_SETTINGS } from '../types';

export interface MesoPlanPdfExportData {
  seasonName: string;
  seasonStartYear: number;
  seasonEndYear: number;
  groupName: string;
  groupAgeCategory?: string;
  halfYear: 1 | 2;
  mesoIndex: number;
  mesoName: string;
  startDate: string;
  endDate: string;
  athleticFocus?: string;
  forAdults?: boolean;
  targetDefenseGoals?: string;
  targetDefenseTechnique1?: string;
  targetDefenseTechnique2?: string;
  spaceDefenseGoals?: string;
  spaceDefenseTechnique3?: string;
  spaceDefenseTechnique4?: string;
  generalWeekTemplate?: GeneralWeekTemplateDay[];
  weeks: MesoWeekItem[];
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

// Unified discrete score mapping for Intensity and Volume
function getUnifiedLevelScore(level?: string): number {
  if (!level) return 0.40;
  const l = level.trim().toLowerCase();
  if (l.includes('100') || l.includes('maximal')) return 1.00;
  if (l.includes('95') || l.includes('sehr hoch')) return 0.80;
  if (l.includes('90') || (l.includes('hoch') && !l.includes('sehr'))) return 0.60;
  if (l.includes('80') || l.includes('mittel')) return 0.40;
  if (l.includes('niedrig') && !l.includes('sehr')) return 0.20;
  if (l.includes('sehr niedrig')) return 0.00;
  return 0.40;
}

function getCubicBezierPoint(
  p1: { x: number; y: number },
  cp1: { x: number; y: number },
  cp2: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p1.x + 3 * uu * t * cp1.x + 3 * u * tt * cp2.x + ttt * p2.x,
    y: uuu * p1.y + 3 * uu * t * cp1.y + 3 * u * tt * cp2.y + ttt * p2.y
  };
}

// Function to draw smooth Catmull-Rom cubic Bezier curve in jsPDF
function drawSmoothCurve(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  points: { x: number; y: number }[],
  color: [number, number, number],
  lineWidth: number = 0.7
) {
  if (points.length === 0) return;
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(lineWidth);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.35;
    const cp1 = {
      x: p1.x + (p2.x - p0.x) * tension,
      y: p1.y + (p2.y - p0.y) * tension
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) * tension,
      y: p2.y - (p3.y - p1.y) * tension
    };

    let prevPt = p1;
    const steps = 25;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const curPt = getCubicBezierPoint(p1, cp1, cp2, p2, t);
      doc.line(prevPt.x, prevPt.y, curPt.x, curPt.y);
      prevPt = curPt;
    }
  }
}

/**
 * Generates and downloads a clean, professional PDF export of the Mesoplanung (6-Week Cycle).
 * Includes cycle metadata, general week structure, target & space defense goals & techniques,
 * and the reactive 6-week periodization wave chart (Intensity & Volume).
 */
export async function generateMesoPlanPDF(data: MesoPlanPdfExportData): Promise<void> {
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
  const todayStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatDate = (dStr?: string) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatShortDate = (dStr?: string) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  // --------------------------------------------------------------------------
  // 1. TOP HEADER BAR
  // --------------------------------------------------------------------------
  doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Indigo / Emerald dual accent lines
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(0, 0, pageWidth, 2.5, 'F');
  doc.setFillColor(34, 197, 94); // emerald-500
  doc.rect(0, 25.5, pageWidth, 0.8, 'F');

  // Render Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 4.5, 17, 17);
    } catch (e) {
      console.warn('Could not draw logo on PDF:', e);
    }
  }

  const textLeft = logoBase64 ? margin + 21 : margin;

  // Club / Academy Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.text(data.clubName || 'NEXT LEVEL GOALKEEPING ACADEMY', textLeft, 11);

  // Subtitle / Document Type
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(165, 180, 252); // indigo-300
  doc.text('AUSBILDUNGS-PERIODISIERUNG  •  MESOPLANUNG (6-WOCHEN-ZYKLUS)', textLeft, 16.5);

  // Meta Info on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Stand: ${todayStr}  |  ${data.seasonName} (${data.halfYear}. Halbjahr)`, pageWidth - margin, 16.5, { align: 'right' });

  currentY = 29.5;

  // --------------------------------------------------------------------------
  // 2. STAMMDATEN & MESOPLAN-ZYKLUS (4 KPI CARDS)
  // --------------------------------------------------------------------------
  const kpiGap = 2.5;
  const kpiWidth = (contentWidth - kpiGap * 3) / 4;
  const kpiHeight = 15;

  const startFormatted = formatDate(data.startDate);
  const endFormatted = formatDate(data.endDate);

  const kpis = [
    {
      label: 'TRAININGSGRUPPE',
      sub: data.groupAgeCategory || 'Gruppe',
      val: data.groupName,
      color: [99, 102, 241] // indigo-500
    },
    {
      label: 'MESOPLAN-ZYKLUS',
      sub: `${data.halfYear}. Halbjahr (Woche 1–6)`,
      val: data.mesoName || `Mesoplan ${data.mesoIndex}`,
      color: [147, 51, 234] // purple-600
    },
    {
      label: 'ZEITRAUM (6 WOCHEN)',
      sub: '6 Trainingswochen',
      val: startFormatted && endFormatted ? `${startFormatted} – ${endFormatted}` : '6 Wochen',
      color: [14, 165, 233] // sky-500
    },
    {
      label: 'ATHLETISCHER REIZ',
      sub: data.forAdults ? 'Microdosing in Mikroplanung' : 'Schwerpunkt Zyklus',
      val: data.forAdults ? 'Für Erwachsene' : (data.athleticFocus || 'unspezifisch'),
      color: [16, 185, 129] // emerald-600
    }
  ];

  kpis.forEach((kpi, idx) => {
    const kX = margin + idx * (kpiWidth + kpiGap);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(kX, currentY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(kpi.label, kX + 2.5, currentY + 3.8);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    const maxValW = kpiWidth - 5;
    const splitVal = doc.splitTextToSize(kpi.val, maxValW);
    doc.text(splitVal[0] || '', kX + 2.5, currentY + 8.8);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(kpi.sub, kX + 2.5, currentY + 12.8);
  });

  currentY += kpiHeight + 3.0;

  // --------------------------------------------------------------------------
  // 3. ALLGEMEINE WOCHENSTRUKTUR (STANDARD-ABLAUF DER 7 WOCHENTAGE)
  // --------------------------------------------------------------------------
  const weekStructHeight = 24.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, weekStructHeight, 1.5, 1.5, 'FD');

  // Indigo Left Accent
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(margin, currentY, 2.5, weekStructHeight, 1, 1, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text('ALLGEMEINE WOCHENSTRUKTUR (STANDARD-ABLAUF DER 6 WOCHEN)', margin + 5, currentY + 4.2);

  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const dayColGap = 1.5;
  const dayColWidth = (contentWidth - 8 - dayColGap * 6) / 7;
  const dayColsY = currentY + 6.2;
  const dayColHeight = 16.5;

  dayNames.forEach((dName, dIdx) => {
    const dX = margin + 4.5 + dIdx * (dayColWidth + dayColGap);
    const dayTemplate = data.generalWeekTemplate?.[dIdx];
    const morningKey = dayTemplate?.slots?.morning;
    const afternoonKey = dayTemplate?.slots?.afternoon;

    const morningCfg = morningKey ? BUILDING_BLOCK_CONFIGS[morningKey] : null;
    const afternoonCfg = afternoonKey ? BUILDING_BLOCK_CONFIGS[afternoonKey] : null;

    // Outer Day Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(dX, dayColsY, dayColWidth, dayColHeight, 1.2, 1.2, 'FD');

    // Day Header Pill
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(dX + 0.8, dayColsY + 0.8, dayColWidth - 1.6, 3.4, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(255, 255, 255);
    doc.text(dName, dX + (dayColWidth / 2), dayColsY + 3.2, { align: 'center' });

    // Slot 1: Vormittag
    const s1Y = dayColsY + 4.8;
    const s1H = 5.2;
    if (morningCfg) {
      const rgb = hexToRgb(morningCfg.color);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(dX + 0.8, s1Y, dayColWidth - 1.6, s1H, 0.8, 0.8, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(3.8);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text('VM: ' + (morningCfg.shortLabel || morningCfg.label), dX + (dayColWidth / 2), s1Y + 3.6, { align: 'center' });
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(dX + 0.8, s1Y, dayColWidth - 1.6, s1H, 0.8, 0.8, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(3.8);
      doc.setTextColor(148, 163, 184);
      doc.text('VM: –', dX + (dayColWidth / 2), s1Y + 3.6, { align: 'center' });
    }

    // Slot 2: Nachmittag
    const s2Y = dayColsY + 10.5;
    const s2H = 5.2;
    if (afternoonCfg) {
      const rgb = hexToRgb(afternoonCfg.color);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(dX + 0.8, s2Y, dayColWidth - 1.6, s2H, 0.8, 0.8, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(3.8);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text('NM: ' + (afternoonCfg.shortLabel || afternoonCfg.label), dX + (dayColWidth / 2), s2Y + 3.6, { align: 'center' });
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(dX + 0.8, s2Y, dayColWidth - 1.6, s2H, 0.8, 0.8, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(3.8);
      doc.setTextColor(148, 163, 184);
      doc.text('NM: –', dX + (dayColWidth / 2), s2Y + 3.6, { align: 'center' });
    }
  });

  currentY += weekStructHeight + 3.0;

  // --------------------------------------------------------------------------
  // 4. KONKRETE ENTWICKLUNGSZIELE & TECHNIKFOKUS (ZV & RV)
  // --------------------------------------------------------------------------
  const goalsGap = 3.0;
  const goalsColWidth = (contentWidth - goalsGap) / 2;
  const goalsHeight = 37;

  // --- COLUMN 1: ZIELVERTEIDIGUNG (ZV) ---
  const zvX = margin;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(zvX, currentY, goalsColWidth, goalsHeight, 1.5, 1.5, 'FD');

  // Indigo Accent
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(zvX, currentY, 2.5, goalsHeight, 1, 1, 'F');

  // Header Pill
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254); // indigo-200
  doc.roundedRect(zvX + 5, currentY + 2.5, goalsColWidth - 8, 4.5, 1.0, 1.0, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(67, 56, 202);
  doc.text('ZIELVERTEIDIGUNG (ZV)  •  ENTWICKLUNGSZIELE & TECHNIKFOKUS', zvX + 7, currentY + 5.6);

  // Goals Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Konkrete Entwicklungsziele:', zvX + 5, currentY + 10.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(30, 41, 59); // slate-800
  const zvGoals = data.targetDefenseGoals?.trim() || 'Keine spezifischen Ziele hinterlegt.';
  const zvGoalsLines = doc.splitTextToSize(zvGoals, goalsColWidth - 10);
  doc.text(zvGoalsLines.slice(0, 4), zvX + 5, currentY + 13.5);

  // Technique Focus Badges
  const zvTechY = currentY + goalsHeight - 11.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.0);
  doc.setTextColor(100, 116, 139);
  doc.text('Technikfokus ZV:', zvX + 5, zvTechY);

  // Tech 1
  const zvTech1 = data.targetDefenseTechnique1 || '–';
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(165, 180, 252);
  doc.roundedRect(zvX + 5, zvTechY + 1.5, (goalsColWidth - 12) / 2, 6.2, 1.0, 1.0, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(67, 56, 202);
  doc.text(`1. Fokus: ${zvTech1}`, zvX + 6.5, zvTechY + 5.6, { maxWidth: (goalsColWidth - 15) / 2 });

  // Tech 2
  const zvTech2 = data.targetDefenseTechnique2 || '–';
  const zvTech2X = zvX + 5 + (goalsColWidth - 12) / 2 + 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(zvTech2X, zvTechY + 1.5, (goalsColWidth - 12) / 2, 6.2, 1.0, 1.0, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`2. Fokus: ${zvTech2}`, zvTech2X + 1.5, zvTechY + 5.6, { maxWidth: (goalsColWidth - 15) / 2 });

  // --- COLUMN 2: RAUMVERTEIDIGUNG (RV) ---
  const rvX = margin + goalsColWidth + goalsGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rvX, currentY, goalsColWidth, goalsHeight, 1.5, 1.5, 'FD');

  // Purple Accent
  doc.setFillColor(147, 51, 234);
  doc.roundedRect(rvX, currentY, 2.5, goalsHeight, 1, 1, 'F');

  // Header Pill
  doc.setFillColor(245, 243, 255); // purple-50
  doc.setDrawColor(221, 214, 254); // purple-200
  doc.roundedRect(rvX + 5, currentY + 2.5, goalsColWidth - 8, 4.5, 1.0, 1.0, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(126, 34, 206);
  doc.text('RAUMVERTEIDIGUNG (RV)  •  ENTWICKLUNGSZIELE & TECHNIKFOKUS', rvX + 7, currentY + 5.6);

  // Goals Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Konkrete Entwicklungsziele:', rvX + 5, currentY + 10.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(30, 41, 59);
  const rvGoals = data.spaceDefenseGoals?.trim() || 'Keine spezifischen Ziele hinterlegt.';
  const rvGoalsLines = doc.splitTextToSize(rvGoals, goalsColWidth - 10);
  doc.text(rvGoalsLines.slice(0, 4), rvX + 5, currentY + 13.5);

  // Technique Focus Badges
  const rvTechY = currentY + goalsHeight - 11.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.0);
  doc.setTextColor(100, 116, 139);
  doc.text('Technikfokus RV:', rvX + 5, rvTechY);

  // Tech 1 (RV 1)
  const rvTech1 = data.spaceDefenseTechnique3 || '–';
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(196, 181, 253);
  doc.roundedRect(rvX + 5, rvTechY + 1.5, (goalsColWidth - 12) / 2, 6.2, 1.0, 1.0, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(126, 34, 206);
  doc.text(`1. Fokus: ${rvTech1}`, rvX + 6.5, rvTechY + 5.6, { maxWidth: (goalsColWidth - 15) / 2 });

  // Tech 2 (RV 2)
  const rvTech2 = data.spaceDefenseTechnique4 || '–';
  const rvTech2X = rvX + 5 + (goalsColWidth - 12) / 2 + 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rvTech2X, rvTechY + 1.5, (goalsColWidth - 12) / 2, 6.2, 1.0, 1.0, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`2. Fokus: ${rvTech2}`, rvTech2X + 1.5, rvTechY + 5.6, { maxWidth: (goalsColWidth - 15) / 2 });

  currentY += goalsHeight + 3.0;

  // --------------------------------------------------------------------------
  // 5. WOCHEN-FOKUS: INTENSITÄT & VOLUMEN (PERIODISIERUNGS-VERLAUF DIAGRAMM)
  // --------------------------------------------------------------------------
  const chartCardHeight = 78.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, chartCardHeight, 1.5, 1.5, 'FD');

  // Sky Accent
  doc.setFillColor(14, 165, 233);
  doc.roundedRect(margin, currentY, 2.5, chartCardHeight, 1, 1, 'F');

  // Chart Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(3, 105, 161); // sky-700
  doc.text('WOCHEN-FOKUS: INTENSITÄT & VOLUMEN  •  PERIODISIERUNGS-VERLAUF (6 WOCHEN)', margin + 5, currentY + 4.2);

  // Legend Top Right
  const legX = margin + contentWidth - 62;
  const legY = currentY + 3.2;

  // Intensity Legend
  doc.setFillColor(245, 158, 11); // amber-500
  doc.circle(legX, legY, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(217, 119, 6);
  doc.text('Linie 1: Intensität', legX + 2.5, legY + 0.8);

  // Divider
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('|', legX + 28, legY + 0.8);

  // Volume Legend
  doc.setFillColor(56, 189, 248); // sky-400
  doc.circle(legX + 32, legY, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(2, 132, 199);
  doc.text('Linie 2: Volumen', legX + 34.5, legY + 0.8);

  // Dark Chart Box
  const chartBoxX = margin + 4;
  const chartBoxY = currentY + 6.2;
  const chartBoxW = contentWidth - 8; // 178mm
  const chartBoxH = 49.5; // 49.5mm

  doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
  doc.setDrawColor(51, 65, 85); // slate-700
  doc.setLineWidth(0.4);
  doc.roundedRect(chartBoxX, chartBoxY, chartBoxW, chartBoxH, 1.5, 1.5, 'FD');

  // Chart Geometry
  const padLeft = 28; // mm for Y labels
  const padRight = 10;
  const padTop = 5.5;
  const padBottom = 10.5;

  const plotX = chartBoxX + padLeft;
  const plotY = chartBoxY + padTop;
  const plotW = chartBoxW - padLeft - padRight; // 140mm
  const plotH = chartBoxH - padTop - padBottom; // 33.5mm
  const plotBottom = plotY + plotH;

  // Y-Levels
  const yLevels = [
    { label: 'Maximal (100%)', score: 1.00 },
    { label: 'Sehr hoch (95%)', score: 0.80 },
    { label: 'Hoch (90%)', score: 0.60 },
    { label: 'Mittel (80%)', score: 0.40 },
    { label: 'Niedrig', score: 0.20 },
    { label: 'Sehr niedrig', score: 0.00 }
  ];

  // Draw Horizontal Grid Lines & Y-Axis Labels
  yLevels.forEach(lvl => {
    const yPos = plotY + (1 - lvl.score) * plotH;
    
    // Grid Line
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([1.0, 1.2], 0);
    doc.line(plotX, yPos, plotX + plotW, yPos);
    doc.setLineDashPattern([], 0); // reset

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.6);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(lvl.label, plotX - 2.5, yPos + 1.0, { align: 'right' });
  });

  // Calculate 6 Week Points
  const weekPoints = [1, 2, 3, 4, 5, 6].map((wNum, idx) => {
    const wData = data.weeks?.find(w => w.weekNumber === wNum);
    const intensity = wData?.intensity || DEFAULT_WEEK_SETTINGS[wNum]?.intensity || 'mittel (ca. 80%)';
    const volume = wData?.volume || DEFAULT_WEEK_SETTINGS[wNum]?.volume || 'mittel';

    const intScore = getUnifiedLevelScore(intensity);
    const volScore = getUnifiedLevelScore(volume);

    const x = plotX + idx * (plotW / 5);
    const yInt = plotY + (1 - intScore) * plotH;
    const yVol = plotY + (1 - volScore) * plotH;

    const startD = wData?.days?.[0]?.date ? formatShortDate(wData.days[0].date) : '';
    const endD = wData?.days?.[6]?.date ? formatShortDate(wData.days[6].date) : '';

    return {
      weekNumber: wNum,
      x,
      yInt,
      yVol,
      intensity,
      volume,
      isSamePoint: Math.abs(yInt - yVol) < 0.01,
      dateRange: startD && endD ? `${startD}–${endD}` : ''
    };
  });

  // Draw Vertical Guide Lines
  weekPoints.forEach(p => {
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([0.8, 1.5], 0);
    doc.line(p.x, plotY, p.x, plotBottom);
    doc.setLineDashPattern([], 0);
  });

  // Draw Smooth Curve for Volume (Sky Blue)
  const volPoints = weekPoints.map(p => ({ x: p.x, y: p.yVol }));
  drawSmoothCurve(doc, volPoints, [56, 189, 248], 0.65);

  // Draw Smooth Curve for Intensity (Amber)
  const intPoints = weekPoints.map(p => ({ x: p.x, y: p.yInt }));
  drawSmoothCurve(doc, intPoints, [245, 158, 11], 0.65);

  // Draw Data Points & Concentric Circles
  weekPoints.forEach(p => {
    if (p.isSamePoint) {
      // Concentric point
      doc.setFillColor(15, 23, 42); // slate-900 background inner ring
      doc.setDrawColor(56, 189, 248); // sky-400
      doc.setLineWidth(0.6);
      doc.circle(p.x, p.yVol, 1.6, 'FD');

      doc.setFillColor(245, 158, 11); // amber-500
      doc.circle(p.x, p.yInt, 0.8, 'F');
    } else {
      // Volume Point (Sky)
      doc.setFillColor(15, 23, 42);
      doc.setDrawColor(56, 189, 248);
      doc.setLineWidth(0.5);
      doc.circle(p.x, p.yVol, 1.3, 'FD');

      // Intensity Point (Amber)
      doc.setFillColor(15, 23, 42);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.circle(p.x, p.yInt, 1.3, 'FD');
    }

    // X-Axis Week Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(255, 255, 255);
    doc.text(`Woche ${p.weekNumber}`, p.x, plotBottom + 4.2, { align: 'center' });

    // Date Range under X label
    if (p.dateRange) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.0);
      doc.setTextColor(148, 163, 184);
      doc.text(p.dateRange, p.x, plotBottom + 7.5, { align: 'center' });
    }
  });

  // 6 Week Mini Summary Cards below chart inside the container
  const sumCardsY = chartBoxY + chartBoxH + 2.0;
  const sumCardGap = 1.5;
  const sumCardW = (contentWidth - 8 - sumCardGap * 5) / 6;
  const sumCardH = 17.5;

  weekPoints.forEach((p, idx) => {
    const scX = margin + 4 + idx * (sumCardW + sumCardGap);
    
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(scX, sumCardsY, sumCardW, sumCardH, 1.0, 1.0, 'FD');

    // Week Title
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(scX + 0.8, sumCardsY + 0.8, sumCardW - 1.6, 3.2, 0.6, 0.6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.6);
    doc.setTextColor(15, 23, 42);
    doc.text(`Woche ${p.weekNumber}`, scX + (sumCardW / 2), sumCardsY + 3.0, { align: 'center' });

    // Intensity Pill
    doc.setFillColor(245, 158, 11);
    doc.circle(scX + 2.2, sumCardsY + 6.8, 0.7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3.8);
    doc.setTextColor(180, 83, 9);
    doc.text(p.intensity, scX + 4.0, sumCardsY + 7.8, { maxWidth: sumCardW - 5 });

    // Volume Pill
    doc.setFillColor(56, 189, 248);
    doc.circle(scX + 2.2, sumCardsY + 12.0, 0.7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3.8);
    doc.setTextColor(3, 105, 161);
    doc.text(p.volume, scX + 4.0, sumCardsY + 13.0, { maxWidth: sumCardW - 5 });
  });

  currentY += chartCardHeight + 3.0;

  // --------------------------------------------------------------------------
  // 6. METHODISCHER HINWEIS & UMSETZUNG IN MIKROPLANUNG
  // --------------------------------------------------------------------------
  const infoBoxHeight = 15;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, infoBoxHeight, 1.5, 1.5, 'FD');

  doc.setFillColor(99, 102, 241); // indigo-500 accent
  doc.roundedRect(margin, currentY, 2.5, infoBoxHeight, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(67, 56, 202);
  doc.text('METHODISCHER LEITFADEN FÜR DIE WEITERE PERIODISIERUNG (MIKROPLANUNG)', margin + 5, currentY + 4.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(51, 65, 85);
  const guideLines = [
    '• 1. Mesoplanung: Definiert den 6-wöchigen Ausbildungsblock mit allgemeinen Wochentags-Bausteinen, Reizen & Zielen.',
    '• 2. Periodisierungs-Verlauf: Steuert Intensität & Volumen über die 6 Wochen harmonisch nach dem Wellenprinzip.',
    '• 3. Mikroplanung: Detailausplanung der einzelnen Trainingstage (Slot 1 & Slot 2) inkl. Torwart-Schwerpunkten und Matchday-Steuerung.'
  ];
  guideLines.forEach((gl, i) => {
    doc.text(gl, margin + 5, currentY + 7.5 + (i * 3.0));
  });

  // --------------------------------------------------------------------------
  // 7. FOOTER BAR
  // --------------------------------------------------------------------------
  const footerY = pageHeight - 7.5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(148, 163, 184);
  doc.text('NEXTLEVEL GOALKEEPING ACADEMY  •  PROFESSIONELLE TORWART-TRAININGSPLANUNG & PERIODISIERUNG', margin, footerY + 1.5);
  doc.text(`Dokument generiert am ${todayStr}  |  Seite 1 von 1`, pageWidth - margin, footerY + 1.5, { align: 'right' });

  // --------------------------------------------------------------------------
  // 8. SAVE / DOWNLOAD PDF
  // --------------------------------------------------------------------------
  const cleanSeason = data.seasonName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanGroup = data.groupName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanMeso = (data.mesoName || `Mesoplan_${data.mesoIndex}`).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `Mesoplanung_${cleanSeason}_${cleanGroup}_${cleanMeso}_H${data.halfYear}.pdf`;

  doc.save(filename);
}
