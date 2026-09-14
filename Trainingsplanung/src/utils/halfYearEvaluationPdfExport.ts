export interface HalfYearTopicComparison {
  id: string;
  topicLabel: string;
  group: string;
  targetSessions: number; // Soll
  conductedSessions: number; // Ist
  completionPercent: number; // Ist / Soll * 100
}

export interface MesoReflectionData {
  mesoIndex: number;
  mesoName: string;
  startDate: string;
  endDate: string;
  athleticFocus?: string;
  athleticStimulusAchieved?: 'ja' | 'in Teilen' | 'nein';
  targetDefenseGoals?: string;
  targetDefenseTechnique1?: string;
  targetDefenseTechnique2?: string;
  targetDefenseReflection?: string;
  spaceDefenseGoals?: string;
  spaceDefenseTechnique3?: string;
  spaceDefenseTechnique4?: string;
  spaceDefenseReflection?: string;
  intensityFocusLearning?: string;
}

export interface HalfYearEvaluationPdfExportData {
  seasonName: string;
  seasonStartYear: number;
  seasonEndYear: number;
  groupName: string;
  groupAgeCategory?: string;
  evaluationType?: 'half_year' | 'full_season';
  halfYear?: 1 | 2;
  halfYearLabel: string;
  totalPlannedSessions: number;
  totalConductedSessions: number;
  sessionsPerWeek: number;
  trainingWeeksPerYear: number;
  topicComparisons: HalfYearTopicComparison[];
  mesoReflections: MesoReflectionData[];
  clubName?: string;
  clubLogoUrl?: string;
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
 * Generates and downloads a clean, multi-page PDF export for the Half-Year Evaluation.
 * Includes:
 * 1. Soll/Ist-Vergleich der Themen (geplant vs. durchgeführt)
 * 2. Ausführliche Reflexionen aller Mesoplanungen (Reiz, ZV, RV, Learnings)
 */
export async function generateHalfYearEvaluationPDF(data: HalfYearEvaluationPdfExportData): Promise<void> {
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

  // Function to draw header on each page
  const drawPageHeader = () => {
    const headerHeight = 23;
    doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Dual accent lines (Emerald & Purple)
    doc.setFillColor(168, 85, 247); // purple-500
    doc.rect(0, 0, pageWidth, 2.2, 'F');
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, headerHeight - 0.7, pageWidth, 0.7, 'F');

    // Render Logo
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, 3.5, 16, 16);
      } catch (e) {
        console.warn('Could not draw logo on PDF:', e);
      }
    }

    // Header Titles
    const textStartX = margin + (logoBase64 ? 19 : 0);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    const mainTitle = data.evaluationType === 'full_season' 
      ? 'AUSBILDUNGS-PERIODISIERUNG • SAISON-GESAMTAUSWERTUNG' 
      : 'AUSBILDUNGS-PERIODISIERUNG • HALBJAHRES-AUSWERTUNG';
    doc.text(mainTitle, textStartX, 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.0);
    doc.setTextColor(148, 163, 184); // slate-400
    const subTitle = data.evaluationType === 'full_season'
      ? `Saison ${data.seasonName} • Gruppe: ${data.groupName}${data.groupAgeCategory ? ` (${data.groupAgeCategory})` : ''} • Zeitraum: 01.07.${data.seasonStartYear} – 30.06.${data.seasonEndYear}`
      : `${data.halfYearLabel} • Saison ${data.seasonName} • Gruppe: ${data.groupName}${data.groupAgeCategory ? ` (${data.groupAgeCategory})` : ''}`;
    doc.text(subTitle, textStartX, 15.5);

    // Right header badge: NextLevel / Club
    const brandLabel = data.clubName || 'NextLevel Goalkeeping';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(216, 180, 254); // purple-300
    doc.text(brandLabel, pageWidth - margin, 10.0, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Erstellt am: ${todayStr}`, pageWidth - margin, 15.5, { align: 'right' });
  };

  // Helper for adding new page with header
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      drawPageHeader();
      currentY = 28;
    }
  };

  // Draw Page 1 Header
  drawPageHeader();
  currentY = 28;

  // --------------------------------------------------------------------------
  // 1. KPI SUMMARY CARDS (4 Columns)
  // --------------------------------------------------------------------------
  const kpiCardWidth = (contentWidth - 9) / 4;
  const kpiCardHeight = 16.5;

  const kpis = [
    {
      title: data.evaluationType === 'full_season' ? 'GESAMTSAISON' : 'HALBJAHR',
      value: data.evaluationType === 'full_season' 
        ? `Saison ${data.seasonStartYear}/${data.seasonEndYear}` 
        : (data.halfYear === 1 ? '1. Halbjahr' : '2. Halbjahr'),
      sub: data.evaluationType === 'full_season' 
        ? '01.07. – 30.06. (Gesamt)' 
        : (data.halfYear === 1 ? 'Juli – Dez' : 'Jan – Juni'),
      color: [147, 51, 234] // purple-600
    },
    {
      title: 'TRAININGSGRUPPE',
      value: data.groupName,
      sub: data.groupAgeCategory || 'Alle TW',
      color: [16, 185, 129] // emerald-600
    },
    {
      title: 'EINHEITEN SOLL / IST',
      value: `${data.totalConductedSessions} / ${data.totalPlannedSessions} TE`,
      sub: data.totalPlannedSessions > 0
        ? `${Math.round((data.totalConductedSessions / data.totalPlannedSessions) * 100)}% Gesamt-Erfüllung`
        : '0% Erfüllung',
      color: [59, 130, 246] // blue-600
    },
    {
      title: 'MESOZYKLEN',
      value: `${data.mesoReflections.length} Zyklen`,
      sub: `${data.mesoReflections.filter(m => m.athleticStimulusAchieved || m.targetDefenseReflection).length} reflektiert`,
      color: [245, 158, 11] // amber-500
    }
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (kpiCardWidth + 3);
    
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, currentY, kpiCardWidth, kpiCardHeight, 2.0, 2.0, 'FD');

    // Color pill on left
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(x + 1.5, currentY + 2.5, 1.5, kpiCardHeight - 5.0, 0.8, 0.8, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(kpi.title, x + 5.0, currentY + 4.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(kpi.value, x + 5.0, currentY + 9.5, { maxWidth: kpiCardWidth - 6 });

    // Sub
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.sub, x + 5.0, currentY + 13.5, { maxWidth: kpiCardWidth - 6 });
  });

  currentY += kpiCardHeight + 5.5;

  // --------------------------------------------------------------------------
  // 2. SOLL / IST-VERGLEICH DER AUSBILDUNGSTHEMEN
  // --------------------------------------------------------------------------
  checkPageBreak(35);

  // Section Header
  doc.setFillColor(147, 51, 234); // purple-600
  doc.roundedRect(margin, currentY, 3.5, 9.0, 1.0, 1.0, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Soll / Ist-Vergleich der Ausbildungsthemen', margin + 6.0, currentY + 4.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Vergleich der geplanten Ausbildungseinheiten (Makroplanung) mit den tatsächlich durchgeführten Trainingseinheiten.', margin + 6.0, currentY + 8.0);

  currentY += 11.5;

  // Table Header
  const colTopicW = 58;
  const colSollW = 24;
  const colIstW = 24;
  const colCompW = contentWidth - colTopicW - colSollW - colIstW; // 80mm

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(255, 255, 255);
  doc.text('AUSBILDUNGSTHEMA', margin + 3.0, currentY + 4.5);
  doc.text('SOLL (GEPLANT)', margin + colTopicW + 2.0, currentY + 4.5);
  doc.text('IST (DURCHGEFÜHRT)', margin + colTopicW + colSollW + 2.0, currentY + 4.5);
  doc.text('AUSWERTUNG & STATUS', margin + colTopicW + colSollW + colIstW + 2.0, currentY + 4.5);

  currentY += 6.5;

  // Render Table Rows
  data.topicComparisons.forEach((item, idx) => {
    checkPageBreak(8.0);

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.rect(margin, currentY, contentWidth, 7.5, 'F');

    // Border bottom
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + 7.5, margin + contentWidth, currentY + 7.5);

    // Topic & Group
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(15, 23, 42);
    doc.text(item.topicLabel, margin + 3.0, currentY + 4.8);

    // Soll Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(71, 85, 105);
    doc.text(`${item.targetSessions} TE`, margin + colTopicW + 2.0, currentY + 4.8);

    // Ist Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(item.conductedSessions >= item.targetSessions && item.targetSessions > 0 ? 16 : 15, item.conductedSessions >= item.targetSessions && item.targetSessions > 0 ? 185 : 23, item.conductedSessions >= item.targetSessions && item.targetSessions > 0 ? 129 : 42);
    doc.text(`${item.conductedSessions} TE`, margin + colTopicW + colSollW + 2.0, currentY + 4.8);

    // Auswertung Text & Visual Progress Bar
    const evalStartX = margin + colTopicW + colSollW + colIstW + 2.0;
    const barWidth = 28;
    const barHeight = 3.2;
    const barY = currentY + 2.2;

    // Background Bar
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(evalStartX, barY, barWidth, barHeight, 0.8, 0.8, 'F');

    // Fill Bar
    const fillPercent = item.targetSessions > 0 ? Math.min(1.0, item.conductedSessions / item.targetSessions) : (item.conductedSessions > 0 ? 1.0 : 0);
    if (fillPercent > 0) {
      if (item.conductedSessions >= item.targetSessions && item.targetSessions > 0) {
        doc.setFillColor(16, 185, 129); // emerald
      } else if (fillPercent >= 0.5) {
        doc.setFillColor(245, 158, 11); // amber
      } else {
        doc.setFillColor(239, 68, 68); // rose
      }
      doc.roundedRect(evalStartX, barY, barWidth * fillPercent, barHeight, 0.8, 0.8, 'F');
    }

    // Status description string
    const statusText = `${item.topicLabel} wurde insgesamt ${item.conductedSessions} mal trainiert (bei geplanten ${item.targetSessions} mal)`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(statusText, evalStartX + barWidth + 3.0, currentY + 4.8, { maxWidth: colCompW - barWidth - 4 });

    currentY += 7.5;
  });

  currentY += 6.0;

  // --------------------------------------------------------------------------
  // 3. MESOPLAN-REFLEXIONEN
  // --------------------------------------------------------------------------
  checkPageBreak(35);

  // Section Header
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(margin, currentY, 3.5, 9.0, 1.0, 1.0, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Mesoplan-Reflexionen & Qualitative Erkenntnisse', margin + 6.0, currentY + 4.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Ergebnisse der periodisierten 6-Wochen-Mesozyklen (Reize, Technikschwerpunkte und Learnings).', margin + 6.0, currentY + 8.0);

  currentY += 12.0;

  if (data.mesoReflections.length === 0) {
    // Empty state card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 16.0, 2.0, 2.0, 'FD');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Für dieses Halbjahr wurden noch keine Mesoplanungen oder Reflexionen erfasst.', margin + 6.0, currentY + 9.5);
    currentY += 20.0;
  } else {
    // Loop over each Meso reflection
    data.mesoReflections.forEach((meso) => {
      // Approximate height needed for this meso card
      const cardEstimatedHeight = 56.0;
      checkPageBreak(cardEstimatedHeight);

      const cardStartY = currentY;

      // Outer Card Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(margin, cardStartY, contentWidth, cardEstimatedHeight, 2.0, 2.0, 'FD');

      // Meso Card Top Header Bar
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(margin, cardStartY, contentWidth, 7.0, 2.0, 2.0, 'F');
      doc.rect(margin, cardStartY + 3.5, contentWidth, 3.5, 'F'); // square bottom corners

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`${meso.mesoName} • ${meso.startDate} bis ${meso.endDate}`, margin + 3.5, cardStartY + 4.8);

      let cardInnerY = cardStartY + 10.5;

      // 1. Athletischer Entwicklungsreiz
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text('1. Athletischer Entwicklungsreiz:', margin + 3.5, cardInnerY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(meso.athleticFocus || 'Nicht definiert', margin + 46.0, cardInnerY);

      // Reiz gesetzt Badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      const stimulus = meso.athleticStimulusAchieved || 'nicht erfasst';
      const stimulusLabel = `Reiz gesetzt: ${stimulus.toUpperCase()}`;
      
      let stimBadgeColor: [number, number, number] = [100, 116, 139];
      if (stimulus === 'ja') stimBadgeColor = [16, 185, 129];
      else if (stimulus === 'in Teilen') stimBadgeColor = [245, 158, 11];
      else if (stimulus === 'nein') stimBadgeColor = [239, 68, 68];

      doc.setFillColor(stimBadgeColor[0], stimBadgeColor[1], stimBadgeColor[2]);
      doc.roundedRect(margin + contentWidth - 42.0, cardInnerY - 3.2, 38.0, 4.8, 1.0, 1.0, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(stimulusLabel, margin + contentWidth - 23.0, cardInnerY + 0.3, { align: 'center' });

      cardInnerY += 6.5;

      // 2. Zielverteidigung (ZV)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text('2. Zielverteidigung (ZV):', margin + 3.5, cardInnerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(71, 85, 105);
      const zvInfo = `Ziele: ${meso.targetDefenseGoals || '–'} | Fokus 1: ${meso.targetDefenseTechnique1 || '–'} | Fokus 2: ${meso.targetDefenseTechnique2 || '–'}`;
      doc.text(zvInfo, margin + 39.0, cardInnerY, { maxWidth: contentWidth - 43 });

      cardInnerY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(15, 23, 42);
      doc.text('Reflexion ZV:', margin + 6.0, cardInnerY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(meso.targetDefenseReflection || 'Keine Reflexion eingetragen', margin + 25.0, cardInnerY, { maxWidth: contentWidth - 29 });

      cardInnerY += 7.0;

      // 3. Raumverteidigung (RV)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(2, 132, 199); // sky-600
      doc.text('3. Raumverteidigung (RV):', margin + 3.5, cardInnerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(71, 85, 105);
      const rvInfo = `Ziele: ${meso.spaceDefenseGoals || '–'} | Fokus 1: ${meso.spaceDefenseTechnique3 || '–'} | Fokus 2: ${meso.spaceDefenseTechnique4 || '–'}`;
      doc.text(rvInfo, margin + 40.0, cardInnerY, { maxWidth: contentWidth - 44 });

      cardInnerY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(15, 23, 42);
      doc.text('Reflexion RV:', margin + 6.0, cardInnerY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(meso.spaceDefenseReflection || 'Keine Reflexion eingetragen', margin + 25.0, cardInnerY, { maxWidth: contentWidth - 29 });

      cardInnerY += 7.0;

      // 4. Learning für Intensität & Fokus
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(147, 51, 234); // purple-600
      doc.text('4. Learning für Intensität & Fokus:', margin + 3.5, cardInnerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(51, 65, 85);
      doc.text(meso.intensityFocusLearning || 'Keine Learnings eingetragen', margin + 50.0, cardInnerY, { maxWidth: contentWidth - 54 });

      currentY += cardEstimatedHeight + 4.5;
    });
  }

  // --------------------------------------------------------------------------
  // FOOTER ON ALL PAGES
  // --------------------------------------------------------------------------
  const totalPages = doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    const footerY = pageHeight - 8.0;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 2.5, pageWidth - margin, footerY - 2.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    // Left
    const footerDocType = data.evaluationType === 'full_season' ? 'Saison-Gesamtauswertung' : 'Halbjahres-Auswertung';
    doc.text(`NextLevel Goalkeeping Academy • ${footerDocType} • ${data.groupName}`, margin, footerY);

    // Center
    doc.text(`Stand: ${todayStr}`, pageWidth / 2, footerY, { align: 'center' });

    // Right
    doc.text(`Seite ${p} von ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Save PDF
  const cleanFileName = data.evaluationType === 'full_season'
    ? `Saison_Gesamtauswertung_${data.groupName.replace(/\s+/g, '_')}_${data.seasonStartYear}_${data.seasonEndYear}.pdf`
    : `Halbjahres_Auswertung_${data.halfYear === 1 ? '1_Halbjahr' : '2_Halbjahr'}_${data.groupName.replace(/\s+/g, '_')}_${data.seasonStartYear}_${data.seasonEndYear}.pdf`;
  doc.save(cleanFileName);
}

export async function generateSeasonEvaluationPDF(data: HalfYearEvaluationPdfExportData): Promise<void> {
  return generateHalfYearEvaluationPDF({
    ...data,
    evaluationType: 'full_season'
  });
}
