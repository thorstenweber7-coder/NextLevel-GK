import type { MesoDayItem } from '../types';
import { BUILDING_BLOCK_CONFIGS } from '../types';

export interface MicroPlanPdfExportData {
  seasonName: string;
  seasonStartYear: number;
  seasonEndYear: number;
  groupName: string;
  groupAgeCategory?: string;
  halfYear: 1 | 2;
  mesoIndex: number;
  mesoName: string;
  weekNumber: number; // 1 to 6
  weekStartDate?: string;
  weekEndDate?: string;
  weekIntensity?: string;
  weekVolume?: string;
  athleticFocus?: string;
  forAdults?: boolean;
  targetDefenseGoals?: string;
  targetDefenseTechnique1?: string;
  targetDefenseTechnique2?: string;
  spaceDefenseGoals?: string;
  spaceDefenseTechnique3?: string;
  spaceDefenseTechnique4?: string;
  days: MesoDayItem[];
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

/**
 * Generates and downloads a clean, high-standard PDF export of the weekly Micro Plan.
 * Includes week metadata, compact meso context, daily slot breakdown (morning & afternoon)
 * with font size 12 for slot details, light gray date cells with larger text, and updated title.
 */
export async function generateMicroPlanPDF(data: MicroPlanPdfExportData): Promise<void> {
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
  const headerHeight = 23;
  doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Emerald / Indigo dual accent lines
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 2.2, 'F');
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(0, headerHeight - 0.7, pageWidth, 0.7, 'F');

  // Render Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 3.5, 16, 16);
    } catch (e) {
      console.warn('Could not draw logo on PDF:', e);
    }
  }

  const textLeft = logoBase64 ? margin + 19 : margin;

  // Club / Academy Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.0);
  doc.setTextColor(255, 255, 255);
  doc.text(data.clubName || 'NEXT LEVEL GOALKEEPING ACADEMY', textLeft, 9.5);

  // Subtitle / Document Type: Requirement 1 -> "MIKROPLANUNG (WOCHENPLAN WOCHE X)"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(110, 231, 183); // emerald-300
  doc.text(`MIKROPLANUNG (WOCHENPLAN WOCHE ${data.weekNumber})`, textLeft, 15.5);

  // Meta Info on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Stand: ${todayStr}  |  ${data.seasonName} (${data.halfYear}. Halbjahr)`, pageWidth - margin, 15.5, { align: 'right' });

  currentY = 26.0;

  // --------------------------------------------------------------------------
  // 2. STAMMDATEN & WOCHEN-FOKUS (4 KPI CARDS)
  // --------------------------------------------------------------------------
  const kpiGap = 2.5;
  const kpiWidth = (contentWidth - kpiGap * 3) / 4;
  const kpiHeight = 13.0;

  const startFormatted = formatShortDate(data.weekStartDate);
  const endFormatted = formatShortDate(data.weekEndDate);

  const kpis = [
    {
      label: 'TRAININGSGRUPPE',
      sub: data.groupAgeCategory || 'Gruppe',
      val: data.groupName,
      color: [16, 185, 129] // emerald-500
    },
    {
      label: 'MESOPLAN-ZYKLUS',
      sub: `${data.halfYear}. Halbjahr (Woche 1–6)`,
      val: data.mesoName || `Mesoplan ${data.mesoIndex}`,
      color: [99, 102, 241] // indigo-500
    },
    {
      label: `WOCHE ${data.weekNumber} (ZEITRAUM)`,
      sub: startFormatted && endFormatted ? `${startFormatted} – ${endFormatted}` : 'Aktive Woche',
      val: `Woche ${data.weekNumber}`,
      color: [14, 165, 233] // sky-500
    },
    {
      label: 'WOCHEN-FOKUS',
      sub: `Volumen: ${data.weekVolume || 'mittel'}`,
      val: `Intensität: ${data.weekIntensity || 'mittel'}`,
      color: [245, 158, 11] // amber-500
    }
  ];

  kpis.forEach((kpi, idx) => {
    const kX = margin + idx * (kpiWidth + kpiGap);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(kX, currentY, kpiWidth, kpiHeight, 1.2, 1.2, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(kpi.label, kX + 2.2, currentY + 3.4);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    const maxValW = kpiWidth - 4.4;
    const splitVal = doc.splitTextToSize(kpi.val, maxValW);
    doc.text(splitVal[0] || '', kX + 2.2, currentY + 7.8);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(kpi.sub, kX + 2.2, currentY + 11.2);
  });

  currentY += kpiHeight + 2.2;

  // --------------------------------------------------------------------------
  // 3. SCHWERPUNKTE AUS DER MESOPLANUNG (PLATZSPAREND: REIZ, ZV & RV ZIELE + TECHNIKFOKUS)
  // Requirement 4: Informationen zum Mesoplan (athletischer Entwicklungsreiz;
  // Konkrete Entwicklungsziele in der Zielverteidigung, Konkrete Entwicklungsziele in der Raumverteidigung,
  // die ausgefüllten Felder Technikfokus), möglichst platzsparend
  // --------------------------------------------------------------------------
  const mesoBannerH = 17.0;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, mesoBannerH, 1.2, 1.2, 'FD');

  // Indigo Accent stripe
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(margin, currentY, 2.2, mesoBannerH, 0.8, 0.8, 'F');

  // Header Line inside Banner
  const mesoTitle = data.mesoName || `Mesoplan ${data.mesoIndex}`;
  const athleticReiz = data.forAdults ? 'Für Erwachsene (Microdosing)' : (data.athleticFocus || 'unspezifisch');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.4);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text(`SCHWERPUNKTE AUS DER MESOPLANUNG (${mesoTitle.toUpperCase()})`, margin + 4.5, currentY + 3.8);

  // Athletic stimulus badge on top right of the banner
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(pageWidth - margin - 58, currentY + 1.5, 56, 3.8, 0.6, 0.6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.4);
  doc.setTextColor(15, 23, 42);
  doc.text(`Athletischer Reiz: ${athleticReiz}`, pageWidth - margin - 55, currentY + 3.9);

  // 2 Compact Columns: Left = Zielverteidigung (ZV), Right = Raumverteidigung (RV)
  const mesoColW = (contentWidth - 8.0) / 2; // ~89mm
  const zvColX = margin + 4.5;
  const rvColX = margin + 4.5 + mesoColW + 2.5;

  // --- ZIELVERTEIDIGUNG (ZV) ---
  const zvTechs = [data.targetDefenseTechnique1, data.targetDefenseTechnique2].filter(Boolean).join(' • ') || '–';
  const zvGoals = data.targetDefenseGoals?.trim() || 'Keine Ziele hinterlegt.';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(67, 56, 202);
  doc.text('Zielverteidigung (ZV):', zvColX, currentY + 7.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.6);
  doc.setTextColor(30, 41, 59);
  const zvGoalsLines = doc.splitTextToSize(`Ziele: ${zvGoals}`, mesoColW - 2);
  doc.text(zvGoalsLines.slice(0, 1), zvColX, currentY + 11.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.6);
  doc.setTextColor(67, 56, 202);
  doc.text(`Technikfokus: ${zvTechs}`, zvColX, currentY + 15.0, { maxWidth: mesoColW - 2 });

  // --- RAUMVERTEIDIGUNG (RV) ---
  const rvTechs = [data.spaceDefenseTechnique3, data.spaceDefenseTechnique4].filter(Boolean).join(' • ') || '–';
  const rvGoals = data.spaceDefenseGoals?.trim() || 'Keine Ziele hinterlegt.';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(126, 34, 206);
  doc.text('Raumverteidigung (RV):', rvColX, currentY + 7.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.6);
  doc.setTextColor(30, 41, 59);
  const rvGoalsLines = doc.splitTextToSize(`Ziele: ${rvGoals}`, mesoColW - 2);
  doc.text(rvGoalsLines.slice(0, 1), rvColX, currentY + 11.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.6);
  doc.setTextColor(126, 34, 206);
  doc.text(`Technikfokus: ${rvTechs}`, rvColX, currentY + 15.0, { maxWidth: mesoColW - 2 });

  currentY += mesoBannerH + 2.5;

  // --------------------------------------------------------------------------
  // 4. DETAILLIERTER 7-TAGE-WOCHENPLAN (MONTAG BIS SONNTAG)
  // Requirement 2: Linke Spalte hellgrau gefärbt, Wochentag & Datum größer, einheitliche Schriftgröße
  // Requirement 3: Text in Spalte 2 (Mitte) und Spalte 3 (rechts) in Schriftgröße 12
  // --------------------------------------------------------------------------
  const fullDayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const dayRowH = 28.5; // 28.5mm per day row * 7 = 199.5mm
  const dayRowGap = 1.6;

  const dayBadgeW = 32.0; // Left column width
  const slotW = (contentWidth - dayBadgeW - 3.0) / 2; // (186 - 32 - 3) / 2 = 75.5mm

  for (let dIdx = 0; dIdx < 7; dIdx++) {
    const dayItem = data.days?.[dIdx];
    const dayName = dayItem?.dayName || fullDayNames[dIdx];
    const dateFormatted = dayItem?.date ? formatDate(dayItem.date) : '';
    const rowY = currentY + dIdx * (dayRowH + dayRowGap);

    // Outer Day Container Card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, rowY, contentWidth, dayRowH, 1.2, 1.2, 'FD');

    // --- LEFT COLUMN: DATUM & WOCHENTAG (HELLGRAU, GROSSE SCHRIFT, EINHEITLICH) ---
    // Requirement 2: "Die linke Spalte mit dem Dateum soll hellgrau gefärbt sein und der Wochentag
    // und Das Datum größer sein, damit die Zelle ausgefüllt wird (alle Wochentage und Daten sollen aber in der gleichen Schriftgröße sein)."
    const leftCellX = margin + 0.8;
    const leftCellY = rowY + 0.8;
    const leftCellW = dayBadgeW;
    const leftCellH = dayRowH - 1.6;

    doc.setFillColor(241, 245, 249); // slate-100 / Hellgrau
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.25);
    doc.roundedRect(leftCellX, leftCellY, leftCellW, leftCellH, 1.0, 1.0, 'FD');

    // Wochentag (Groß, einheitlich für alle 7 Tage)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(dayName, leftCellX + (leftCellW / 2), leftCellY + 8.5, { align: 'center' });

    // Datum (Groß, einheitlich für alle 7 Tage)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(dateFormatted, leftCellX + (leftCellW / 2), leftCellY + 16.0, { align: 'center' });

    // Microdosing Pill if present in adult mode
    if (dayItem?.athleticMicrodosing) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(251, 191, 36); // amber-400
      doc.setLineWidth(0.2);
      doc.roundedRect(leftCellX + 1.5, leftCellY + 19.5, leftCellW - 3.0, 6.0, 0.6, 0.6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`⚡ ${dayItem.athleticMicrodosing}`, leftCellX + (leftCellW / 2), leftCellY + 23.8, { align: 'center', maxWidth: leftCellW - 4.0 });
    }

    // --- MIDDLE COLUMN: VORMITTAG (SLOT 1) - TEXT IN SCHRIFTGRÖSSE 12 ---
    // Requirement 3: "Der Text in den Spalten zwei (Mitte) und 3 (rechts) soll im Schriftgröße 12 sein;"
    const s1X = margin + dayBadgeW + 2.0;
    const morningKey = dayItem?.slots?.morning;
    const morningCfg = morningKey ? BUILDING_BLOCK_CONFIGS[morningKey] : null;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(s1X, rowY + 0.8, slotW, dayRowH - 1.6, 1.0, 1.0, 'FD');

    // Slot 1 Header Strip
    if (morningCfg) {
      const rgb = hexToRgb(morningCfg.color);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(s1X + 0.8, rowY + 1.2, slotW - 1.6, 4.5, 0.6, 0.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(255, 255, 255);
      doc.text(`VORMITTAG: ${morningCfg.label.toUpperCase()}`, s1X + 2.5, rowY + 4.4);
    } else {
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(s1X + 0.8, rowY + 1.2, slotW - 1.6, 4.5, 0.6, 0.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(100, 116, 139);
      doc.text('VORMITTAG: KEIN BAUSTEIN (FREI)', s1X + 2.5, rowY + 4.4);
    }

    // Slot 1 Content Text in Font Size 12
    if (morningKey === 'tw_and_team' || morningKey === 'tw_only') {
      const topic = dayItem?.morningTopic || 'Kein Thema gewählt';
      const twInt = dayItem?.morningTwIntensity || '–';

      // Line 1: Thema (Font Size 12)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`Thema: ${topic}`, s1X + 2.5, rowY + 12.0, { maxWidth: slotW - 5.0 });

      // Line 2: TW-Intensität (Font Size 12)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`TW-Intensität: ${twInt}/10`, s1X + 2.5, rowY + 18.5);

      // Additional team training fields if tw_and_team
      if (morningKey === 'tw_and_team') {
        const teamFocus = dayItem?.morningTeamFocus || '–';
        const teamInt = dayItem?.morningTeamIntensity || '–';
        const teamDur = dayItem?.morningTeamDurationMinutes ?? 60;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Team: ${teamFocus} (Int: ${teamInt}/10, ${teamDur} Min)`, s1X + 2.5, rowY + 24.5, { maxWidth: slotW - 5.0 });
      }
    } else if (morningKey === 'team_only') {
      const teamFocus = dayItem?.morningTeamFocus || '–';
      const teamInt = dayItem?.morningTeamIntensity || '–';
      const teamDur = dayItem?.morningTeamDurationMinutes ?? 60;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(15, 23, 42);
      doc.text(`Team-Fokus: ${teamFocus}`, s1X + 2.5, rowY + 12.5, { maxWidth: slotW - 5.0 });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(59, 130, 246);
      doc.text(`Team-Intensität: ${teamInt}/10 (${teamDur} Min)`, s1X + 2.5, rowY + 19.5);
    } else if (morningKey === 'matchday') {
      const opp = dayItem?.morningOpponentInfo || 'Gegner-Informationen';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(`Gegner: ${opp}`, s1X + 2.5, rowY + 13.0, { maxWidth: slotW - 5.0 });
    } else if (morningCfg) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(51, 65, 85);
      doc.text(morningCfg.label, s1X + 2.5, rowY + 14.5, { maxWidth: slotW - 5.0 });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12.0);
      doc.setTextColor(148, 163, 184);
      doc.text('Frei / Regeneration', s1X + 2.5, rowY + 14.5);
    }

    // --- RIGHT COLUMN: NACHMITTAG (SLOT 2) - TEXT IN SCHRIFTGRÖSSE 12 ---
    // Requirement 3: "Der Text in den Spalten zwei (Mitte) und 3 (rechts) soll im Schriftgröße 12 sein;"
    const s2X = s1X + slotW + 1.0;
    const afternoonKey = dayItem?.slots?.afternoon;
    const afternoonCfg = afternoonKey ? BUILDING_BLOCK_CONFIGS[afternoonKey] : null;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(s2X, rowY + 0.8, slotW, dayRowH - 1.6, 1.0, 1.0, 'FD');

    // Slot 2 Header Strip
    if (afternoonCfg) {
      const rgb = hexToRgb(afternoonCfg.color);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(s2X + 0.8, rowY + 1.2, slotW - 1.6, 4.5, 0.6, 0.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(255, 255, 255);
      doc.text(`NACHMITTAG: ${afternoonCfg.label.toUpperCase()}`, s2X + 2.5, rowY + 4.4);
    } else {
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(s2X + 0.8, rowY + 1.2, slotW - 1.6, 4.5, 0.6, 0.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(100, 116, 139);
      doc.text('NACHMITTAG: KEIN BAUSTEIN (FREI)', s2X + 2.5, rowY + 4.4);
    }

    // Slot 2 Content Text in Font Size 12
    if (afternoonKey === 'tw_and_team' || afternoonKey === 'tw_only') {
      const topic = dayItem?.afternoonTopic || 'Kein Thema gewählt';
      const twInt = dayItem?.afternoonTwIntensity || '–';

      // Line 1: Thema (Font Size 12)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`Thema: ${topic}`, s2X + 2.5, rowY + 12.0, { maxWidth: slotW - 5.0 });

      // Line 2: TW-Intensität (Font Size 12)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`TW-Intensität: ${twInt}/10`, s2X + 2.5, rowY + 18.5);

      // Additional team training fields if tw_and_team
      if (afternoonKey === 'tw_and_team') {
        const teamFocus = dayItem?.afternoonTeamFocus || '–';
        const teamInt = dayItem?.afternoonTeamIntensity || '–';
        const teamDur = dayItem?.afternoonTeamDurationMinutes ?? 60;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Team: ${teamFocus} (Int: ${teamInt}/10, ${teamDur} Min)`, s2X + 2.5, rowY + 24.5, { maxWidth: slotW - 5.0 });
      }
    } else if (afternoonKey === 'team_only') {
      const teamFocus = dayItem?.afternoonTeamFocus || '–';
      const teamInt = dayItem?.afternoonTeamIntensity || '–';
      const teamDur = dayItem?.afternoonTeamDurationMinutes ?? 60;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(15, 23, 42);
      doc.text(`Team-Fokus: ${teamFocus}`, s2X + 2.5, rowY + 12.5, { maxWidth: slotW - 5.0 });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(59, 130, 246);
      doc.text(`Team-Intensität: ${teamInt}/10 (${teamDur} Min)`, s2X + 2.5, rowY + 19.5);
    } else if (afternoonKey === 'matchday') {
      const opp = dayItem?.afternoonOpponentInfo || 'Gegner-Informationen';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(225, 29, 72);
      doc.text(`Gegner: ${opp}`, s2X + 2.5, rowY + 13.0, { maxWidth: slotW - 5.0 });
    } else if (afternoonCfg) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.0);
      doc.setTextColor(51, 65, 85);
      doc.text(afternoonCfg.label, s2X + 2.5, rowY + 14.5, { maxWidth: slotW - 5.0 });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12.0);
      doc.setTextColor(148, 163, 184);
      doc.text('Frei / Regeneration', s2X + 2.5, rowY + 14.5);
    }
  }

  // --------------------------------------------------------------------------
  // 5. FOOTER BAR
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
  // 7. SAVE / DOWNLOAD PDF
  // --------------------------------------------------------------------------
  const cleanSeason = data.seasonName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanGroup = data.groupName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `Mikroplan_${cleanSeason}_${cleanGroup}_Woche_${data.weekNumber}.pdf`;

  doc.save(filename);
}
