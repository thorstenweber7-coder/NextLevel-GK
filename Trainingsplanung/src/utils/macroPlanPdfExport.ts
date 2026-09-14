import type { PeriodizationTopicDefinition } from '../types';
import { PERIODIZATION_TOPICS } from '../types';

export interface MacroPlanPdfExportData {
  seasonName: string;
  seasonStartYear: number;
  seasonEndYear: number;
  groupName: string;
  groupAgeCategory?: string;
  halfYear: 1 | 2;
  sessionsPerWeek: number;
  trainingWeeksPerYear: number;
  totalSeasonSessions: number;
  totalHalfYearSessions: number;
  allocatedMacroSessions: number;
  remainingMacroSessions: number;
  topicDistribution: Record<string, number>;
  otherHalfYearDistribution?: Record<string, number>;
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
 * Generates and downloads a clean, high-standard PDF export of the Macro Plan
 * containing the full annual session contingent, half-year distribution,
 * and detailed breakdown across the 9 tactical training topics.
 */
export async function generateMacroPlanPDF(data: MacroPlanPdfExportData): Promise<void> {
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

  // --------------------------------------------------------------------------
  // 1. TOP HEADER BAR
  // --------------------------------------------------------------------------
  // Top deep charcoal background banner
  doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Purple / Electric Lime dual accent line
  doc.setFillColor(147, 51, 234); // purple-600
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
  doc.setTextColor(192, 132, 252); // purple-300
  doc.text('AUSBILDUNGS-PERIODISIERUNG  •  MAKROPLANUNG & EINHEITENVERTEILUNG', textLeft, 16.5);

  // Meta Info on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Stand: ${todayStr}  |  ${data.seasonName}`, pageWidth - margin, 16.5, { align: 'right' });

  currentY = 30;

  // --------------------------------------------------------------------------
  // 2. STAMMDATEN & SAISON-KONTINGENT (4 KPI CARDS)
  // --------------------------------------------------------------------------
  const kpiGap = 2.5;
  const kpiWidth = (contentWidth - kpiGap * 3) / 4;
  const kpiHeight = 16;

  const kpis = [
    {
      label: 'TRAININGSGRUPPE',
      sub: data.groupAgeCategory || 'Gruppe',
      val: data.groupName,
      color: [168, 85, 247] // purple-500
    },
    {
      label: 'WOCHEN-FREQUENZ',
      sub: `${data.trainingWeeksPerYear} Trainingswochen/Jahr`,
      val: `${data.sessionsPerWeek} TE / Woche`,
      color: [56, 189, 248] // sky-400
    },
    {
      label: 'TW-EINHEITEN / JAHR',
      sub: 'Gesamtes Saison-Kontingent',
      val: `${data.totalSeasonSessions} TE`,
      color: [34, 197, 94] // emerald-500
    },
    {
      label: `TE ${data.halfYear}. HALBJAHR`,
      sub: data.halfYear === 1 ? 'Juli – Dezember' : 'Januar – Juni',
      val: `${data.totalHalfYearSessions} TE`,
      color: [147, 51, 234] // purple-600
    }
  ];

  kpis.forEach((kpi, idx) => {
    const kX = margin + idx * (kpiWidth + kpiGap);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(kX, currentY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(kpi.label, kX + 2.5, currentY + 4);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, kX + 2.5, currentY + 9.5);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(kpi.sub, kX + 2.5, currentY + 13.5);
  });

  currentY += kpiHeight + 3.5;

  // --------------------------------------------------------------------------
  // 3. PLANUNGS-LEITFRAGE & LIVE-BUDGET STATUS
  // --------------------------------------------------------------------------
  const bannerHeight = 15;
  doc.setFillColor(243, 232, 255); // purple-100 / light purple tint
  doc.setDrawColor(216, 180, 254); // purple-300
  doc.roundedRect(margin, currentY, contentWidth, bannerHeight, 1.5, 1.5, 'FD');

  // Purple Left Accent Stripe
  doc.setFillColor(147, 51, 234);
  doc.roundedRect(margin, currentY, 2.5, bannerHeight, 1, 1, 'F');

  // Leitfrage Heading & Question
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 33, 168); // purple-800
  doc.text('PLANUNGS-LEITFRAGE DER MAKROPLANUNG', margin + 5, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  const halfYearText = data.halfYear === 1 ? 'ersten' : 'zweiten';
  doc.text(`„Welches Thema soll wie oft im ${halfYearText} Halbjahr trainiert werden?“`, margin + 5, currentY + 10.5);

  // Status Metrics Box on the right side of the banner
  const rightBoxWidth = 72;
  const rightBoxX = margin + contentWidth - rightBoxWidth - 2;
  const rightBoxY = currentY + 2;
  const rightBoxHeight = bannerHeight - 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight, 1.2, 1.2, 'FD');

  const subColWidth = rightBoxWidth / 3;

  // Col 1: TE pro Halbjahr
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('TE PRO HALBJAHR', rightBoxX + 2, rightBoxY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(`${data.totalHalfYearSessions} TE`, rightBoxX + 2, rightBoxY + 8.5);

  // Divider 1
  doc.setDrawColor(226, 232, 240);
  doc.line(rightBoxX + subColWidth, rightBoxY + 1.5, rightBoxX + subColWidth, rightBoxY + rightBoxHeight - 1.5);

  // Col 2: Verteilte TE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('VERTEILTE TE', rightBoxX + subColWidth + 2, rightBoxY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  const isComplete = data.allocatedMacroSessions === data.totalHalfYearSessions;
  const isOver = data.allocatedMacroSessions > data.totalHalfYearSessions;
  if (isComplete) {
    doc.setTextColor(22, 163, 74); // emerald-600
  } else if (isOver) {
    doc.setTextColor(225, 29, 72); // rose-600
  } else {
    doc.setTextColor(147, 51, 234); // purple-600
  }
  doc.text(`${data.allocatedMacroSessions} TE`, rightBoxX + subColWidth + 2, rightBoxY + 8.5);

  // Divider 2
  doc.line(rightBoxX + subColWidth * 2, rightBoxY + 1.5, rightBoxX + subColWidth * 2, rightBoxY + rightBoxHeight - 1.5);

  // Col 3: Verbleibende TE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('VERBLEIBEND', rightBoxX + subColWidth * 2 + 2, rightBoxY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  if (data.remainingMacroSessions === 0) {
    doc.setTextColor(22, 163, 74); // emerald-600
  } else if (data.remainingMacroSessions < 0) {
    doc.setTextColor(225, 29, 72); // rose-600
  } else {
    doc.setTextColor(217, 119, 6); // amber-600
  }
  doc.text(`${data.remainingMacroSessions} TE`, rightBoxX + subColWidth * 2 + 2, rightBoxY + 8.5);

  currentY += bannerHeight + 4;

  // --------------------------------------------------------------------------
  // 4. THEMENVERTEILUNG: DIE 9 ZENTRALEN TORWARTTHEMEN (TABLE & PROGRESS)
  // --------------------------------------------------------------------------
  // Section Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`THEMENVERTEILUNG IM ${data.halfYear}. HALBJAHR (${data.totalHalfYearSessions} TE KONTINGENT)`, margin, currentY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Detaillierte Einheiten- und Prozentverteilung auf die 9 Ausbildungsthemen', pageWidth - margin, currentY + 3.5, { align: 'right' });

  currentY += 5.5;

  // Table Columns Setup
  const colX = {
    idx: margin,
    badge: margin + 6,
    topic: margin + 11,
    desc: margin + 55,
    sessions: margin + 125,
    pct: margin + 144,
    bar: margin + 160
  };

  const colWidths = {
    idx: 6,
    badge: 5,
    topic: 44,
    desc: 70,
    sessions: 19,
    pct: 16,
    bar: 26
  };

  const tableHeaderHeight = 6.5;

  // Draw Table Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, currentY, contentWidth, tableHeaderHeight, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(255, 255, 255);

  doc.text('#', colX.idx + 2, currentY + 4.2);
  doc.text('AUSBILDUNGSTHEMA', colX.topic, currentY + 4.2);
  doc.text('METHODISCHER SCHWERPUNKT', colX.desc, currentY + 4.2);
  doc.text('EINHEITEN (TE)', colX.sessions + colWidths.sessions - 2, currentY + 4.2, { align: 'right' });
  doc.text('ANTEIL (%)', colX.pct + colWidths.pct - 2, currentY + 4.2, { align: 'right' });
  doc.text('VERTEILUNGS-GRAFIK', colX.bar, currentY + 4.2);

  currentY += tableHeaderHeight + 1.2;

  // Render Rows for the 9 topics
  const rowHeight = 11.5;

  PERIODIZATION_TOPICS.forEach((topic: PeriodizationTopicDefinition, index: number) => {
    const isEven = index % 2 === 0;
    const currentVal = data.topicDistribution[topic.id] || 0;
    const pct = data.totalHalfYearSessions > 0 ? (currentVal / data.totalHalfYearSessions) * 100 : 0;
    const topicRgb = hexToRgb(topic.color || '#64748b');

    // Row background
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(margin, currentY, contentWidth, rowHeight, 0.8, 0.8, 'FD');

    // Left color indicator dot
    doc.setFillColor(topicRgb[0], topicRgb[1], topicRgb[2]);
    doc.circle(colX.idx + 3.2, currentY + 5.8, 1.6, 'F');

    // Number index
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${index + 1}`, colX.badge, currentY + 6.8);

    // Topic Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(topic.label, colX.topic, currentY + 5.5);

    // Topic Category Tag / Sub
    let category = 'Zielverteidigung';
    if (['Flanken', 'Early Cross', 'Querpass', 'Verteidigen hinter der Abwehrkette'].includes(topic.id)) {
      category = 'Raumverteidigung';
    } else if (['Spiel mit dem Ball', 'Standards'].includes(topic.id)) {
      category = 'Offensiv / Spielaufbau';
    } else if (topic.id === 'Torwart-Athletik') {
      category = 'Athletik / Dynamik';
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.setTextColor(topicRgb[0], topicRgb[1], topicRgb[2]);
    doc.text(category.toUpperCase(), colX.topic, currentY + 9.5);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(topic.description, colWidths.desc - 2);
    doc.text(splitDesc.slice(0, 2), colX.desc, currentY + 4.8);

    // Allocated Sessions (TE)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    if (currentVal > 0) {
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setTextColor(148, 163, 184);
    }
    doc.text(`${currentVal} TE`, colX.sessions + colWidths.sessions - 2, currentY + 6.8, { align: 'right' });

    // Percentage (%)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(topicRgb[0], topicRgb[1], topicRgb[2]);
    doc.text(`${pct.toFixed(1)} %`, colX.pct + colWidths.pct - 2, currentY + 6.8, { align: 'right' });

    // Visual Progress Bar
    const barX = colX.bar;
    const barY = currentY + 4.0;
    const barMaxW = colWidths.bar - 2;
    const barH = 3.8;

    // Track Background
    doc.setFillColor(226, 232, 240); // slate-200
    doc.roundedRect(barX, barY, barMaxW, barH, 1, 1, 'F');

    // Filled bar
    if (pct > 0) {
      const fillW = Math.min(barMaxW, (pct / 100) * barMaxW * 2.5);
      doc.setFillColor(topicRgb[0], topicRgb[1], topicRgb[2]);
      doc.roundedRect(barX, barY, Math.max(1.5, fillW), barH, 1, 1, 'F');
    }

    currentY += rowHeight + 1.2;
  });

  // --------------------------------------------------------------------------
  // 5. SUMMARY ROW
  // --------------------------------------------------------------------------
  const summaryHeight = 8.5;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(margin, currentY, contentWidth, summaryHeight, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('GESAMTSUMME VERTEILTE TRAININGSEINHEITEN (HALBJAHR):', colX.idx + 3, currentY + 5.5);

  const totalPct = data.totalHalfYearSessions > 0 ? (data.allocatedMacroSessions / data.totalHalfYearSessions) * 100 : 0;
  
  // Total TE
  doc.setFontSize(8.5);
  doc.setTextColor(34, 197, 94); // emerald-400
  doc.text(`${data.allocatedMacroSessions} / ${data.totalHalfYearSessions} TE`, colX.sessions + colWidths.sessions - 2, currentY + 5.5, { align: 'right' });

  // Total %
  doc.setFontSize(8.0);
  doc.setTextColor(192, 132, 252); // purple-300
  doc.text(`${totalPct.toFixed(0)} %`, colX.pct + colWidths.pct - 2, currentY + 5.5, { align: 'right' });

  currentY += summaryHeight + 4;

  // --------------------------------------------------------------------------
  // 6. METHODISCHER HINWEIS & UMSETZUNG IN MESOPLANUNG
  // --------------------------------------------------------------------------
  const infoBoxHeight = 19;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, infoBoxHeight, 1.5, 1.5, 'FD');

  doc.setFillColor(56, 189, 248); // sky-400 accent
  doc.roundedRect(margin, currentY, 2.5, infoBoxHeight, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text('METHODISCHER LEITFADEN FÜR DIE WEITERE PERIODISIERUNG', margin + 5, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(51, 65, 85);
  const guideLines = [
    '• 1. Makroplanung: Legt die strategische Gewichtung der 9 Torwartthemen bezogen auf das Halbjahres-Kontingent fest.',
    '• 2. Mesoplanung: Überträgt die Schwerpunkte in 6-wöchige Trainingsblöcke mit allgemeiner Wochenstruktur & athletischem Reiz.',
    '• 3. Mikroplanung: Feinausplanung der einzelnen Trainingstage (Slot 1 & Slot 2) inkl. Torwart-Intensitäten und Matchday-Steuerung.'
  ];
  guideLines.forEach((gl, i) => {
    doc.text(gl, margin + 5, currentY + 8.5 + (i * 3.4));
  });

  // --------------------------------------------------------------------------
  // 7. FOOTER BAR
  // --------------------------------------------------------------------------
  const footerY = pageHeight - 7.5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('NEXTLEVEL GOALKEEPING ACADEMY  •  PROFESSIONELLE TORWART-TRAININGSPLANUNG & PERIODISIERUNG', margin, footerY + 1.5);
  doc.text(`Dokument generiert am ${todayStr}  |  Seite 1 von 1`, pageWidth - margin, footerY + 1.5, { align: 'right' });

  // --------------------------------------------------------------------------
  // 8. SAVE / DOWNLOAD PDF
  // --------------------------------------------------------------------------
  const cleanSeason = data.seasonName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanGroup = data.groupName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `Makroplanung_${cleanSeason}_${cleanGroup}_H${data.halfYear}.pdf`;

  doc.save(filename);
}
