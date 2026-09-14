import type { AthleticTestMetrics, BiologicalMaturityMetrics } from '../types';

export interface AthleticTestExportData {
  clubLogoUrl?: string;
  clubName?: string;
  trainerName?: string;
  playerName?: string;
  playerBirthYear?: string | number;
  groupName?: string;
  date?: string;
  metrics?: AthleticTestMetrics;
  biologicalMetrics?: BiologicalMaturityMetrics;
  strengths?: string;
  developmentAreas?: string;
  notes?: string;
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

export async function generateAthleticTestPDF(
  data: AthleticTestExportData
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const logoBase64 = await loadLogoBase64(data.clubLogoUrl);

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
  let pageNumber = 1;

  // Header Bar Generator
  const drawHeaderBar = (isFirstPage: boolean, subTitleText?: string) => {
    const bannerHeight = isFirstPage ? 32 : 14;
    doc.setFillColor(10, 15, 29); // #0a0f1d (Deep Midnight/Charcoal)
    doc.rect(0, 0, pageWidth, bannerHeight, 'F');

    // Accent line (Electric Neon/Lime Green)
    doc.setFillColor(34, 197, 94); // #22c55e
    doc.rect(0, bannerHeight, pageWidth, 1.5, 'F');

    // Render logo
    if (logoBase64) {
      try {
        if (isFirstPage) {
          doc.addImage(logoBase64, 'PNG', margin, 2, 28, 28);
        } else {
          doc.addImage(logoBase64, 'PNG', margin, 1, 12, 12);
        }
      } catch (err) {
        console.warn('Error drawing logo in header:', err);
      }
    }

    const textStartX = logoBase64 ? (isFirstPage ? margin + 32 : margin + 15) : margin;
    const printDate = data.date || new Date().toISOString().substring(0, 10);

    if (isFirstPage) {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('NEXTLEVEL GOALKEEPING ACADEMY', textStartX, 12.5);

      doc.setTextColor(74, 222, 128); // #4ade80
      doc.setFontSize(8.5);
      if (data.clubName) {
        doc.text(`ATHLETIKTEST & LEISTUNGSDIAGNOSTIK • ${data.clubName.toUpperCase()}`, textStartX, 19.5);
      } else {
        doc.text('ATHLETIKTEST & STANDARDISIERTE LEISTUNGSDIAGNOSTIK', textStartX, 19.5);
      }

      doc.setTextColor(203, 213, 225);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Datum: ${printDate}`, pageWidth - margin, 19.5, { align: 'right' });
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const subTitle = data.clubName
        ? `NEXTLEVEL • ${data.clubName.toUpperCase()} | ${subTitleText || 'Athletiktest Standards'}`
        : `NEXTLEVEL ATHLETIKTEST | ${subTitleText || 'Standardisierte Testbatterie'}`;
      doc.text(subTitle, textStartX, 9.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`Seite ${pageNumber} • Datum: ${printDate}`, pageWidth - margin, 9.5, { align: 'right' });
    }
  };

  const checkNewPage = (neededHeight: number, subTitleText?: string) => {
    if (currentY + neededHeight > pageHeight - 14) {
      doc.addPage();
      pageNumber += 1;
      drawHeaderBar(false, subTitleText);
      currentY = 20;
    }
  };

  // Helper to draw clean section badge headers with reduced spacing
  const drawSectionHeader = (title: string, subtitle?: string, minHeightNeeded: number = 18) => {
    checkNewPage(minHeightNeeded);
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.roundedRect(margin, currentY, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setFillColor(34, 197, 94); // #22c55e
    doc.roundedRect(margin, currentY, 2.5, 7, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, margin + 5, currentY + 4.8);

    if (subtitle) {
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(subtitle, pageWidth - margin - 3, currentY + 4.7, { align: 'right' });
    }
    currentY += 9;
  };

  // --------------------------------------------------------------------------
  // PAGE 1: Overview & Matrix Table & Test Standards
  // --------------------------------------------------------------------------
  drawHeaderBar(true);
  currentY = 37;

  // Title Box (compact)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Torwartspezifische Athletik-Testbatterie', margin + 4, currentY + 5.8);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text('Standardisiertes Messprotokoll zur Erfassung von Schnellkraft, Explosivität, Antritt & Agilität im TW-Profil', margin + 4, currentY + 10.5);
  
  if (data.playerName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`Torhüter: ${data.playerName} ${data.playerBirthYear ? `(Jg. ${data.playerBirthYear})` : ''} ${data.groupName ? `• Gruppe: ${data.groupName}` : ''}`, pageWidth - margin - 4, currentY + 5.8, { align: 'right' });
  }

  currentY += 17;

  // 1. Table: 7 Test Exercises (Header + 7 Rows = ~52mm)
  drawSectionHeader('Übersicht der 7 Athletik-Testübungen', 'Messgrößen, Einheiten & Relevanz', 58);

  // Table Header
  const colWidths = [42, 42, 20, contentWidth - 42 - 42 - 20]; // 42, 42, 20, 78 = 182
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text('Testübung', colX[0] + 3, currentY + 4.5);
  doc.text('Messgröße', colX[1] + 3, currentY + 4.5);
  doc.text('Einheit', colX[2] + 3, currentY + 4.5);
  doc.text('Zielrichtung im TW-Profil', colX[3] + 3, currentY + 4.5);
  currentY += 6.5;

  // Table Rows
  const testRows = [
    { name: '1. Griffkraft', metric: 'Isometrische Maximalkraft', unit: 'kg', target: 'Fangsicherheit, Handgelenksstabilität & Symmetrie' },
    { name: '2. CMJ', metric: 'Vertikale Sprunghöhe', unit: 'cm', target: 'Flankensicherung & Lufthoheit' },
    { name: '3. Single-Leg Lateral Push', metric: 'Laterale Abdruckweite (L / R)', unit: 'cm', target: 'Abdruck zielnahes Bein beim Hechten & Dysbalancen' },
    { name: '4. Linearsprint 5 m / 10 m', metric: 'Antritt & Beschleunigung', unit: 's', target: 'Verlassen der Linie, 1vs1-Attacke' },
    { name: '5. Hybrid-Shuttle (5-10-5)', metric: 'Sidestep-to-Sprint Agilität', unit: 's', target: 'Verschieben im Torraum & Nachsetzen' },
    { name: '6. Medizinballwurf', metric: 'Oberkörper-Schnellkraft', unit: 'm', target: 'Abwurfweite & Rumpf-Explosivität' },
    { name: '7. BlazePod Reaktion', metric: 'Reaktionszeit (ms) & Go/No-Go', unit: 'ms / Hits', target: 'Visuelle Reaktionszeit, Auge-Hand & Handlungsinhibition' }
  ];

  testRows.forEach((row, i) => {
    const rowHeight = 6.2;
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(241, 245, 249);
    }
    doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(row.name, colX[0] + 3, currentY + 4.4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(row.metric, colX[1] + 3, currentY + 4.4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(row.unit, colX[2] + 3, currentY + 4.4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(row.target, colX[3] + 3, currentY + 4.4);

    currentY += rowHeight;
  });

  currentY += 5.0;

  // 2. Section: Allgemeine Teststandards & Rahmenbedingungen
  drawSectionHeader('Allgemeine Teststandards & Rahmenbedingungen', undefined, 36);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const standardsBoxHeight = 28;
  doc.roundedRect(margin, currentY, contentWidth, standardsBoxHeight, 2, 2, 'FD');

  const standardsBullets = [
    { title: 'Standardisiertes Warm-up:', text: '15 Minuten RAMP-Protokoll (Raise, Activate, Mobilize, Potentiate) inkl. kurzer submaximaler Sprünge und Antritte.' },
    { title: 'Testreihenfolge:', text: '1. Anthropometrie & Griffkraft (Ruhezustand)  •  2. Sprungtests (CMJ, Lateral Push)  •  3. Sprints (5 m / 10 m)  •  4. Hybrid-Shuttle  •  5. Medizinballwurf  •  6. BlazePod Reaktionstest' },
    { title: 'Pausenzeiten:', text: 'Mindestens 90 bis 120 Sekunden Pause zwischen Maximalversuchen zur vollen Erholung des ZNS & Kreatinphosphatspeichers.' }
  ];

  let bulletY = currentY + 4.5;
  standardsBullets.forEach(b => {
    doc.setFillColor(34, 197, 94);
    doc.circle(margin + 4.5, bulletY - 0.8, 1.0, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text(b.title, margin + 8, bulletY);

    const titleWidth = doc.getTextWidth(b.title) + 2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitText = doc.splitTextToSize(b.text, contentWidth - 12 - titleWidth);
    doc.text(splitText, margin + 8 + titleWidth, bulletY);

    bulletY += (splitText.length * 3.6) + 3.0;
  });

  currentY += standardsBoxHeight + 5.5;

  // Helper for drawing individual test detail cards (guaranteed to be on a SINGLE page without splitting)
  const drawTestCard = (test: {
    num: string;
    title: string;
    targetMetric: string;
    equipment: string;
    protocolName?: string;
    steps: string[];
    standards: string[];
  }) => {
    // 1. Calculate the exact total height required for the entire test block
    doc.setFontSize(7.8);
    const splitSteps = test.steps.map(step => doc.splitTextToSize(step, contentWidth - 12));
    const stepsHeight = splitSteps.reduce((acc, s) => acc + (s.length * 3.6) + 1.0, 0);

    doc.setFontSize(7.5);
    const splitStandards = test.standards.map(std => doc.splitTextToSize(std, contentWidth - 12));
    const standardsHeight = splitStandards.reduce((acc, s) => acc + (s.length * 3.4) + 1.0, 0);

    // Header banner (7.0) + Gap (1.5) + Meta Box (9.5) + Gap (2.5) + Steps Title (4.0) + Steps + Gap (1.5) + Standards Title (4.0) + Standards + Bottom Margin (4.5)
    const totalCardHeight = 7.0 + 1.5 + 9.5 + 2.5 + 4.0 + stepsHeight + 1.5 + 4.0 + standardsHeight + 4.5;

    // 2. Strict Single-Page Rule: Move ENTIRE test block (including heading) to next page if it doesn't fit!
    checkNewPage(totalCardHeight, `${test.num}. ${test.title}`);

    // 3. Card Header Banner
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, contentWidth, 7, 1.5, 1.5, 'FD');
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin, currentY, 2.5, 7, 1, 1, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${test.num}. ${test.title}`, margin + 5, currentY + 4.8);

    currentY += 8.5;

    // 4. Meta box (Zielgröße & Equipment)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 9.5, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    doc.text('• Zielgröße:', margin + 3, currentY + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(test.targetMetric, margin + 20, currentY + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('• Equipment:', margin + 3, currentY + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(test.equipment, margin + 22, currentY + 7.5);

    currentY += 12.0;

    // 5. Ablauf / Steps (all on this page)
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text(test.protocolName ? `Ablauf (${test.protocolName}):` : 'Ablauf & Durchführung:', margin + 2, currentY);
    currentY += 3.8;

    splitSteps.forEach((splitStep, sIdx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(16, 185, 129);
      doc.text(`${sIdx + 1}.`, margin + 3, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(splitStep, margin + 8, currentY);
      currentY += (splitStep.length * 3.6) + 1.0;
    });

    currentY += 1.5;

    // 6. Standardisierung & Wertung (all on this page)
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text('Wichtige Punkte für die Standardisierung & Wertung:', margin + 2, currentY);
    currentY += 3.8;

    splitStandards.forEach(splitStd => {
      doc.setFillColor(71, 85, 105);
      doc.circle(margin + 4.5, currentY - 0.8, 0.8, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(splitStd, margin + 8, currentY);
      currentY += (splitStd.length * 3.4) + 1.0;
    });

    currentY += 4.5;
  };

  // --------------------------------------------------------------------------
  // Tests 1 to 6 Detailed Protocols (Kept intact on individual pages)
  // --------------------------------------------------------------------------

  // Test 1: Griffkraft
  drawTestCard({
    num: '1',
    title: 'Griffkrafttest (Handgrip Strength)',
    targetMetric: 'Isometrische Maximalkraft des Unterarms/Schultergürtels (kg)',
    equipment: 'Digitales oder hydraulisches Hand-Dynamometer (z. B. Jamar oder Camry)',
    protocolName: 'Southampton-Protokoll',
    steps: [
      'Der Torwart sitzt aufrecht auf einem Stuhl oder einer Bank (ohne Armlehnen), die Füße stehen flach auf dem Boden.',
      'Der Ellbogen des Testarms wird im 90°-Winkel gebeugt und eng am Rumpf gehalten. Das Handgelenk befindet sich in neutraler Position (weder überstreckt noch gebeugt).',
      'Auf das Startkommando drückt der Keeper für 3 bis 5 Sekunden mit maximaler Kraft zu.',
      'Es werden 2 Versuche pro Hand im Wechsel (Rechts → Links → Rechts ...) durchgeführt.'
    ],
    standards: [
      'Kein Schwungmuffeln aus dem Rumpf oder Absenken des Ellbogens während des Zudrückens.',
      'Der Griffabstand des Geräts muss an die Handgröße des Keepers angepasst und für Folgetests dokumentiert werden.',
      'Wertung: Der jeweils beste Wert (kg) für Rechts und Links sowie die Seitendifferenz (Δ %) werden erfasst.'
    ]
  });

  // Test 2: CMJ
  drawTestCard({
    num: '2',
    title: 'Countermovement Jump (CMJ)',
    targetMetric: 'Vertikale Sprunghöhe (cm) unter Nutzung des Dehnungs-Verkürzungs-Zyklus',
    equipment: 'Kontaktmatte, Kraftmessplatte oder validierte App (z. B. MyJump 2/3)',
    steps: [
      'Der Keeper steht aufrecht und schulterbreit auf dem Messfeld.',
      'Mit Armeinsatz (Sportartspezifischer CMJ): Aus dem aufrechten Stand erfolgt eine zügige Auftaktbewegung nach unten (Beugung in Hüfte und Knien auf ca. 90°) mit gleichzeitigem Ausholen der Arme nach hinten, gefolgt von einem sofortigen, maximal explosiven Absprung nach oben.',
      'Die Landung erfolgt beidbeinig auf derselben Stelle mit abgebeugten Knien zur Stoßdämpfung.',
      'Jeder Torwart absolviert 3 gültige Versuche mit je 60–90 Sekunden Pause.'
    ],
    standards: [
      'Kein Vortippen oder Zwischenhüpfen vor der Abwärtsbewegung.',
      'In der Flugphase bleiben die Beine gestreckt (kein Anziehen der Knie zur künstlichen Verlängerung der Flugzeit).',
      'Wertung: Die maximale Sprunghöhe (cm) aus 3 Versuchen wird gewertet.'
    ]
  });

  // Test 3: Lateral Push
  drawTestCard({
    num: '3',
    title: 'Torwartspezifischer Single-Leg Lateral Push (Zielnaher Abdruck)',
    targetMetric: 'Horizontale/laterale Explosivkraft des zielnahen Beins (cm) und Seitensymmetrie',
    equipment: 'Am Boden fixiertes Maßband (Nullpunkt an der Startlinie)',
    steps: [
      'Absprung nach Rechts: Der Keeper steht einbeinig auf dem rechten Bein parallel zur Startlinie (Außenkante des rechten Fußes schließt exakt mit der Null-Linie ab).',
      'Durch eine kurze, dynamische Beugung im rechten Knie drückt sich der Torwart explosiv mit dem rechten Bein nach rechts ab (zielnaher Stemmschritt-Mechanismus).',
      'Die Landung erfolgt stabil auf dem linken Bein oder beidbeinig; die Landeposition muss für 2 Sekunden stabil gehalten werden (Stick the Landing).',
      '3 Versuche nach rechts (Absprung Rechts) und 3 Versuche nach links (Absprung Links).'
    ],
    standards: [
      'Ein Nachrutschen oder Nachhüpfen bei der Landung macht den Versuch ungültig.',
      'Gemessen wird vom Nullpunkt bis zur inneren Ferse des hinteren Fußes bei der Landung.',
      'Wertung: Bester Weitenwert (cm) je Seite sowie Berechnung des Symmetrie-Index ((Stark - Schwach) / Stark * 100). Ein Wert >10 % weist auf ein behandlungsbedürftiges Kraftdefizit hin.'
    ]
  });

  // Test 4: Linear Sprints
  drawTestCard({
    num: '4',
    title: 'Lineare Sprints (5 m und 10 m)',
    targetMetric: 'Explosiver Antritt (5 m) und Beschleunigung (10 m) in Sekunden (s)',
    equipment: 'Doppel-Lichtschrankensystem (Start, 5 m, 10 m)',
    steps: [
      'Der Keeper positioniert sich 50 cm hinter der Start-Lichtschranke in frontaler Torwart-Grundstellung (Set-Position: halbtief, Hände vor dem Körper).',
      'Der Start erfolgt eigeninitiativ aus dem statischen Stand (kein Anlauf, kein Wippen/Ausholen nach hinten).',
      'Der Torwart sprintet mit maximaler Beschleunigung linear durch die 5-m- und 10-m-Lichtschranken durch.',
      'Jeder Torwart absolviert 3 Durchgänge mit jeweils mindestens 2 Minuten Pause.'
    ],
    standards: [
      'Der Start darf nicht durch Vor- und Zurückwiegen eingeleitet werden (Fehlauslösung der Lichtschranke).',
      'Lichtschrankenhöhe einheitlich auf Hüfthöhe einstellen (ca. 80–90 cm über dem Boden), um Fehlauslösungen durch Armbewegungen zu vermeiden.',
      'Wertung: Die schnellste Zeit auf 5 m und 10 m (auf 0,01 s genau) wird gewertet.'
    ]
  });

  // Test 5: Hybrid Shuttle
  drawTestCard({
    num: '5',
    title: 'Torwartspezifischer Hybrid-Shuttle (5-10-5 m)',
    targetMetric: 'Richtungswechselschnelligkeit (COD), Transition Speed von Sidestep auf Sprint und Bremskraft (s)',
    equipment: '3 Hütchen/Markierungen im Abstand von je 5 m (Gesamtstrecke: 10 m), Lichtschranke an der Mittellinie oder Handstoppuhr',
    protocolName: 'Beispiel: Start Rechts',
    steps: [
      'Start: Mittig an Hütchen B in frontaler Grundstellung (Set-Position), Blick nach vorne.',
      'Phase 1 (5 m Sidestep Rechts zu Hütchen C): Explosiver Start im seitlichen Nachstellschritt (Shuffling) ohne Überkreuzen der Beine. An Hütchen C berührt die rechte Hand den Boden/das Hütchen.',
      'Phase 2 (10 m Vollsprint Links zu Hütchen A): Richtungswechsel und linearer Vollsprint über 10 m. An Hütchen A berührt die linke Hand den Boden/das Hütchen.',
      'Phase 3 (5 m Sidestep zur Mitte): Erneuter Richtungswechsel und Sidesteps durch die Start-/Ziellinie.',
      'Jeder Keeper absolviert 2 Durchgänge mit Start nach Rechts und 2 Durchgänge mit Start nach Links (Pause: 2–3 Min.).'
    ],
    standards: [
      'In Phase 1 ist das Überkreuzen der Beine strikt untersagt (Ungültiger Versuch).',
      'Der Bodenkontakt der Hand an den Wendepunkten (Hütchen A und C) ist zwingend, um ein vorzeitiges Abdrehen ohne Schwerpunktabsenkung zu verhindern.',
      'Wertung: Die beste Gesamtzeit (s) für Start Rechts und Start Links.'
    ]
  });

  // Test 6: Medizinballwurf
  drawTestCard({
    num: '6',
    title: 'Medizinballwurf über Kopf (Overhead Medicine Ball Throw)',
    targetMetric: 'Dynamische Oberkörper- und Rumpfschnellkraft (m)',
    equipment: 'Medizinball (U12–U14: 1 kg; ab U15: 2 kg), langes Maßband am Boden fixiert',
    steps: [
      'Der Keeper steht mit beiden Füßen parallel und schulterbreit direkt hinter der Abwurflinie (Zehenspitzen an der Linie).',
      'Der Medizinball wird mit beiden Händen gehalten. Der Keeper holt über Kopf oder mit Vorbeuge des Rumpfes dynamisch nach hinten aus und schleudert den Ball explosionsartig beidhändig nach vorne-oben weg.',
      'Nach dem Abwurf darf der Torwart nach vorne abrollen oder austreten, der Abstoß selbst muss jedoch mit Bodenkontakt beider Füße hinter der Linie erfolgen.',
      'Jeder Torwart hat 3 Versuche (Pause: 60 Sek.).'
    ],
    standards: [
      'Kein Anlauf oder Einbeinsprung beim Abwurf erlaubt.',
      'Der Einschlagpunkt des Balls (erste Bodenberührung) wird mit dem Maßband gemessen.',
      'Das Ballgewicht muss im Erfassungsbogen zwingend dokumentiert werden (1 kg vs. 2 kg).',
      'Wertung: Die maximale Wurfweite (m, auf 10 cm genau) aus 3 Versuchen.'
    ]
  });

  // Test 7: BlazePod Tisch-Reaktionstest (Trapez-Setup)
  drawTestCard({
    num: '7',
    title: 'BlazePod Tisch-Reaktionstest (Trapez-Setup)',
    targetMetric: 'Visuelle Reaktionsschnelligkeit, Auge-Hand-Koordination, periphere Wahrnehmung und kognitive Handlungsinhibition (Go/No-Go)',
    equipment: '4 BlazePods, BlazePod-App, Tisch (Höhe ca. 72–76 cm), Kreppband zur Markierung, Protokollbogen',
    protocolName: 'Trapez-Setup: Vorn 70 cm Abstand, hinten 40 cm Abstand, Tiefe 20 cm',
    steps: [
      'Aufbau (Trapezform auf Tisch): 2 Pods vordere Basis im Abstand von 70 cm (je 35 cm von Tischmitte, 5–10 cm von Tischkante). 2 Pods hintere Basis im Abstand von 40 cm (je 20 cm von Tischmitte). Tiefe: 20 cm Abstand vorn zu hinten. Alle 4 Positionen mit Kreppband markieren.',
      'Positionierung: Der Keeper steht in stabiler torwartspezifischer Grundstellung (leichte Kniebeuge, aktiver Oberkörper, Hände schweben über der Tischmitte) vor der Tischkante.',
      'Test 1 (Einfache Reaktion / Single Color): 1 aktive Farbe (z. B. Grün), Zufall, Deaktivierung „Hit“, Zeitlimit 20 Sekunden. Ziel: Maximal viele Treffer in 20s. 2 Durchgänge à 20s (Pause: 45–60s).',
      'Test 2 (Kognitiver Reaktionstest mit Inhibition / Go/No-Go): 2 Farben (Ziel: Blau [Go], Störreiz: Rot [No-Go]), Deaktivierung „Hit“ / Timeout, Zeitlimit 20 Sekunden. Ziel: Nur Zielfarbe berühren, Rot ignorieren. 2 Durchgänge à 20s (Pause: 45–60s).'
    ],
    standards: [
      'Feste Tischmarkierungen garantieren identische Distanzen; Hände schweben zentral vor dem Körper (kein Ablegen auf Pods).',
      'Treffertechnik: Saubere Berührung mit Fingern/Handfläche (kein Schlagen/Wegwischen). Farben für alle Keeper einheitlich halten.',
      'Wertung Test 1: Maximal erzielte Treffer (Hits) und durchschnittliche Reaktionszeit (ms) aus dem besseren Durchgang.',
      'Wertung Test 2: Maximale Trefferanzahl der Zielfarbe (Hits) sowie Anzahl der Inhibitionsfehler (Fehlberührungen des Störreizes).'
    ]
  });

  // --------------------------------------------------------------------------
  // Erfassungsbogen / Protokoll-Tabelle (2 Protokolle auf 1 Blatt bei Blanko-Export)
  // --------------------------------------------------------------------------

  // Helper to draw a single complete protocol card (120mm height)
  const drawBlankProtocolCard = (startY: number) => {
    // 1. Header Banner
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, startY, contentWidth, 5.0, 1.2, 1.2, 'F');
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(margin, startY, 2.2, 5.0, 0.8, 0.8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text('Standard-Erfassungsbogen • Athletik & Anthropometrie', margin + 4.5, startY + 3.6);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('NextLevel Goalkeeping Academy', pageWidth - margin - 3.0, startY + 3.6, { align: 'right' });

    let cardY = startY + 5.8;

    // 2. Top Box (Stammdaten & Anthropometrie)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    const boxH = 21.0;
    doc.roundedRect(margin, cardY, contentWidth, boxH, 1.5, 1.5, 'FD');

    // Line 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text('Torhüter:', margin + 3.0, cardY + 4.0);
    doc.setFont('helvetica', 'normal');
    doc.text('____________________________________', margin + 16.0, cardY + 4.0);

    doc.setFont('helvetica', 'bold');
    doc.text('Jg. / Alter:', margin + 82.0, cardY + 4.0);
    doc.setFont('helvetica', 'normal');
    doc.text('___________', margin + 98.0, cardY + 4.0);

    doc.setFont('helvetica', 'bold');
    doc.text('Team / Gruppe:', margin + 118.0, cardY + 4.0);
    doc.setFont('helvetica', 'normal');
    doc.text('____________________', margin + 140.0, cardY + 4.0);

    // Line 2
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.text('Körperhöhe: ______ cm   |   Sitzhöhe: ______ cm   |   Gewicht: ______ kg   |   Wingspan: ______ cm', margin + 3.0, cardY + 8.8);
    doc.text('Datum / Prüfer: ____________________', margin + 124.0, cardY + 8.8);

    // Line 3 - PHV Checkboxes (positioned safely within the box borders)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(30, 41, 59);
    doc.text('PHV-Reifegrad:', margin + 3.0, cardY + 13.6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('[  ] Pre-PHV (vor dem Schub)       [  ] Circa-PHV (im Wachstumsschub)       [  ] Post-PHV (nach dem Schub)', margin + 26.0, cardY + 13.6);

    // Line 4 - Explanations
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.6);
    doc.setTextColor(100, 116, 139);
    doc.text('* Wingspan: Armspannweite zu Standhöhe (Torraum-Reichweite)  |  * PHV: Biologischer Reifegrad (Wachstumsschub-Offset)', margin + 3.0, cardY + 18.2);

    cardY += boxH + 1.5;

    // 3. Table Header
    const docColX = [margin, margin + 28, margin + 60, margin + 100];

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, cardY, contentWidth, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('Testübung', docColX[0] + 2.0, cardY + 3.2);
    doc.text('Messwert(e)', docColX[1] + 2.0, cardY + 3.2);
    doc.text('Häufigkeit / Wertung', docColX[2] + 2.0, cardY + 3.2);
    doc.text('Grund der Messung (Relevanz im TW-Profil)', docColX[3] + 2.0, cardY + 3.2);
    cardY += 4.5;

    // 4. Table Rows (7 tests)
    const docRows = [
      {
        test: ['1. Griffkraft', '(Isometrie)'],
        val: ['R: _____ kg', 'L: _____ kg'],
        freq: ['2 Versuche je Hand (Wechsel)', 'Bestwert je Seite gewertet'],
        reason: [
          'Fangsicherheit bei harten Schüssen, Handgelenkstabilität',
          '& Aufdecken muskulärer Kraftdysbalancen.'
        ]
      },
      {
        test: ['2. CMJ Jump', '(Vertikalsprung)'],
        val: ['Bestwert:', '_____ cm'],
        freq: ['3 Versuche mit Armeinsatz', 'Bestwert aus 3 Versuchen gewertet'],
        reason: [
          'Flankensicherung, Lufthoheit im Sechzehner & Messung',
          'der reaktiven Vertikal-Explosivkraft (DVZ).'
        ]
      },
      {
        test: ['3. Lateral Push', '(Einbeinig L/R)'],
        val: ['R: _____ cm', 'L: _____ cm'],
        freq: ['3 Versuche je Bein (R & L)', 'Bestwert je Seite gewertet'],
        reason: [
          'Laterale Abdruckdynamik beim Hechten auf zielnahem',
          'Bein & Erkennung einseitiger Kraftdefizite.'
        ]
      },
      {
        test: ['4. Linearsprint', '(5 m / 10 m)'],
        val: ['5m: _____ s', '10m: _____ s'],
        freq: ['3 Durchgänge mit Lichtschranke', 'Schnellste Zeit je Distanz gewertet'],
        reason: [
          'Antrittsschnelligkeit beim Verlassen der Torlinie,',
          'Raumverteidigung & 1-gegen-1-Attacke.'
        ]
      },
      {
        test: ['5. Hybrid-Shuttle', '(5-10-5 m)'],
        val: ['Start R: _____ s', 'Start L: _____ s'],
        freq: ['2x Start Rechts, 2x Start Links', 'Bestzeit je Startrichtung gewertet'],
        reason: [
          'Torraum-Agilität, Transition von Sidesteps auf linearen',
          'Vollsprint & Richtungswechsel-/Bremskraft.'
        ]
      },
      {
        test: ['6. Medizinball', '(Überkopf, 1/2 kg)'],
        val: ['Ball: [ ] 1kg  [ ] 2kg', 'Weite: _____ m'],
        freq: ['3 Versuche aus dem Stand', 'Maximalweite aus 3 Versuchen gewertet'],
        reason: [
          'Dynamische Oberkörper- und Rumpfschnellkraft für',
          'weite Überkopfabwürfe & Torwartabschläge.'
        ]
      },
      {
        test: ['7. BlazePod', '(Trapez-Setup)'],
        val: ['T1: ___ H / ___ ms', 'T2: ___ H / ___ F'],
        freq: ['2x Test 1 (Single) à 20s', '2x Test 2 (Go/No-Go) à 20s'],
        reason: [
          'Visuelle Reaktionsschnelligkeit, Auge-Hand-Koordination,',
          'periphere Wahrnehmung & kognitive Handlungsinhibition.'
        ]
      }
    ];

    docRows.forEach((r, idx) => {
      const rowH = 12.4;
      doc.setFillColor(idx % 2 === 0 ? 248 : 241, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 249);
      doc.rect(margin, cardY, contentWidth, rowH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cardY + rowH, margin + contentWidth, cardY + rowH);

      // Col 0: Testübung (2 Zeilen)
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.text(r.test[0], docColX[0] + 2.0, cardY + 4.4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(r.test[1], docColX[0] + 2.0, cardY + 9.0);

      // Col 1: Messwert(e) (2 Zeilen)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(16, 185, 129);
      doc.text(r.val[0], docColX[1] + 2.0, cardY + 4.4);
      doc.text(r.val[1], docColX[1] + 2.0, cardY + 9.0);

      // Col 2: Häufigkeit (2 Zeilen)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(r.freq[0], docColX[2] + 2.0, cardY + 4.4);
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text(r.freq[1], docColX[2] + 2.0, cardY + 9.0);

      // Col 3: Grund der Messung (2 Zeilen)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(r.reason[0], docColX[3] + 2.0, cardY + 4.4);
      doc.text(r.reason[1], docColX[3] + 2.0, cardY + 9.0);

      cardY += rowH;
    });

    return cardY;
  };

  // Check if player-specific evaluation or 2-in-1 blank protocol
  if (!data.playerName) {
    // Force to a clean new page for the 2-in-1 print protocol
    doc.addPage();
    pageNumber += 1;
    drawHeaderBar(false, 'Standard-Erfassungsbogen');

    // 1. Top Protocol Card
    drawBlankProtocolCard(16.0);

    // Divider line between the 2 protocols
    const cutY = 140.0;
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, cutY, pageWidth - margin, cutY);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text('--- Hier abtrennen (2 Protokolle je Druckseite) ---', pageWidth / 2, cutY - 1.2, { align: 'center' });

    // 2. Bottom Protocol Card
    drawBlankProtocolCard(144.5);
  } else {
    // Single keeper report
    checkNewPage(125, 'Erfassungsbogen & Leistungsdokumentation');
    drawSectionHeader('Leistungsdokumentation / Testergebnisse', `Ergebnisse von ${data.playerName}`, 115);

    const bio = data.biologicalMetrics;
    if (bio && (bio.standingHeightCm || bio.weightKg || bio.sittingHeightCm || bio.wingspanCm)) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text('Anthropometrie & Biologischer Entwicklungsstand (Bio-Banding):', margin + 3, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);
      
      const bioText1 = `Körperhöhe: ${bio.standingHeightCm || '-'} cm  |  Sitzhöhe: ${bio.sittingHeightCm || '-'} cm  |  Körpergewicht: ${bio.weightKg || '-'} kg  |  Armspannweite: ${bio.wingspanCm || '-'} cm`;
      doc.text(bioText1, margin + 3, currentY + 9.0);

      const offsetNum = Number(bio.maturityOffsetYears);
      const offsetStr = bio.maturityOffsetYears !== undefined ? `${offsetNum > 0 ? '+' : ''}${bio.maturityOffsetYears} J.` : '-';
      const classStr = bio.phvClassification || '-';
      const apeStr = bio.apeIndex ? `Ape-Index: ${bio.apeIndex}` : '';
      const bioText2 = `PHV-Reifegrad: ${classStr} (Maturity Offset: ${offsetStr})  ${apeStr ? `|  ${apeStr}` : ''}`;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(bioText2, margin + 3, currentY + 14.0);

      currentY += 22.0;
    }

    // Player results table
    const m = data.metrics || {};
    const docColW = [30, 34, 38, 80];
    const docColX = [margin, margin + docColW[0], margin + docColW[0] + docColW[1], margin + docColW[0] + docColW[1] + docColW[2]];

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, currentY, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Testübung', docColX[0] + 2.5, currentY + 4.5);
    doc.text('Messwert(e)', docColX[1] + 2.5, currentY + 4.5);
    doc.text('Häufigkeit', docColX[2] + 2.5, currentY + 4.5);
    doc.text('Grund der Messung (Relevanz im TW-Profil)', docColX[3] + 2.5, currentY + 4.5);
    currentY += 6.5;

    const playerRows = [
      {
        test: ['1. Griffkraft', '(Isometrie)'],
        val: [`R: ${m.gripRightKg || '-'} kg`, `L: ${m.gripLeftKg || '-'} kg`],
        freq: ['2 Versuche je Hand im Wechsel', 'Bestwert je Seite gewertet'],
        reason: ['Fangsicherheit bei harten Schüssen, Handgelenkstabilität', '& Aufdecken muskulärer Kraftdysbalancen.']
      },
      {
        test: ['2. CMJ Jump', '(Vertikalsprung)'],
        val: [`Bestwert:`, `${m.cmjHeightCm || '-'} cm`],
        freq: ['3 Versuche mit Armeinsatz', 'Bestwert aus 3 Versuchen gewertet'],
        reason: ['Flankensicherung, Lufthoheit im Sechzehner & Messung', 'der reaktiven Vertikal-Explosivkraft (DVZ).']
      },
      {
        test: ['3. Lateral Push', '(Einbeinig L/R)'],
        val: [`R: ${m.lateralPushRightCm || '-'} cm`, `L: ${m.lateralPushLeftCm || '-'} cm`],
        freq: ['3 Versuche je Bein (R & L)', 'Bestwert je Seite gewertet'],
        reason: ['Laterale Abdruckdynamik beim Hechten auf zielnahem', 'Bein & Erkennung einseitiger Kraftdefizite.']
      },
      {
        test: ['4. Linearsprint', '(5 m / 10 m)'],
        val: [`5m: ${m.sprint5mSec || '-'} s`, `10m: ${m.sprint10mSec || '-'} s`],
        freq: ['3 Durchgänge mit Lichtschranke', 'Schnellste Zeit je Distanz gewertet'],
        reason: ['Antrittsschnelligkeit beim Verlassen der Torlinie,', 'Raumverteidigung & 1-gegen-1-Attacke.']
      },
      {
        test: ['5. Hybrid-Shuttle', '(5-10-5 m)'],
        val: [`Start R: ${m.agilityShuttleRightSec || '-'} s`, `Start L: ${m.agilityShuttleLeftSec || '-'} s`],
        freq: ['2x Start Rechts, 2x Start Links', 'Bestzeit je Startrichtung gewertet'],
        reason: ['Torraum-Agilität, Transition von Sidesteps auf linearen', 'Vollsprint & Richtungswechsel-/Bremskraft.']
      },
      {
        test: ['6. Medizinball', '(Überkopf, 1/2 kg)'],
        val: [`Ball: ${m.medBallWeightKg || '2'} kg`, `Weite: ${m.medBallDistanceM || '-'} m`],
        freq: ['3 Versuche aus dem Stand', 'Maximalweite aus 3 Versuchen gewertet'],
        reason: ['Dynamische Oberkörper- und Rumpfschnellkraft für', 'weite Überkopfabwürfe & Torwartabschläge.']
      },
      {
        test: ['7. BlazePod', '(Trapez-Setup)'],
        val: [
          `T1: ${m.blazePodSimpleHits || '-'} Treffer (20s)`,
          `T2: ${m.blazePodGoNoGoHits || '-'} H / ${m.blazePodGoNoGoErrors !== undefined && m.blazePodGoNoGoErrors !== '' ? `${m.blazePodGoNoGoErrors} F` : '-'}`
        ],
        freq: ['2x Test 1 & 2x Test 2 à 20s', 'Bestwert & Fehler gewertet'],
        reason: [
          'Visuelle Reaktionszeit, Auge-Hand-Koordination,',
          'periphere Wahrnehmung & kognitive Impulskontrolle.'
        ]
      }
    ];

    playerRows.forEach((r, idx) => {
      const rowH = 11.5;
      doc.setFillColor(idx % 2 === 0 ? 248 : 241, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 249);
      doc.rect(margin, currentY, contentWidth, rowH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currentY + rowH, margin + contentWidth, currentY + rowH);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(r.test[0], docColX[0] + 2.5, currentY + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(r.test[1], docColX[0] + 2.5, currentY + 8.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(16, 185, 129);
      doc.text(r.val[0], docColX[1] + 2.5, currentY + 4.2);
      doc.text(r.val[1], docColX[1] + 2.5, currentY + 8.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(r.freq[0], docColX[2] + 2.5, currentY + 4.2);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(r.freq[1], docColX[2] + 2.5, currentY + 8.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text(r.reason[0], docColX[3] + 2.5, currentY + 4.2);
      doc.text(r.reason[1], docColX[3] + 2.5, currentY + 8.2);

      currentY += rowH;
    });

    currentY += 4.5;
  }

  // Qualitative Feedback Section if available (kept together)
  if (data.strengths || data.developmentAreas || data.notes) {
    let feedbackHeight = 10;
    if (data.strengths) feedbackHeight += 16;
    if (data.developmentAreas) feedbackHeight += 16;
    if (data.notes) feedbackHeight += 15;

    checkNewPage(feedbackHeight, 'Trainer-Feedback & Entwicklungsplan');
    drawSectionHeader('Trainer-Feedback & Entwicklungsplan', undefined, feedbackHeight);

    if (data.strengths) {
      doc.setFillColor(240, 253, 244); // green-50
      doc.setDrawColor(187, 247, 208); // green-200
      doc.roundedRect(margin, currentY, contentWidth, 13, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(22, 101, 52);
      doc.text('Positive Entwicklungen & Stärken:', margin + 3, currentY + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const splitStr = doc.splitTextToSize(data.strengths, contentWidth - 8);
      doc.text(splitStr, margin + 3, currentY + 8.5);
      currentY += 15.5;
    }

    if (data.developmentAreas) {
      doc.setFillColor(254, 242, 242); // red-50
      doc.setDrawColor(254, 202, 202); // red-200
      doc.roundedRect(margin, currentY, contentWidth, 13, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(153, 27, 27);
      doc.text('Entwicklungsfelder & Trainingsschwerpunkte:', margin + 3, currentY + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const splitDev = doc.splitTextToSize(data.developmentAreas, contentWidth - 8);
      doc.text(splitDev, margin + 3, currentY + 8.5);
      currentY += 15.5;
    }

    if (data.notes) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(30, 41, 59);
      doc.text('Allgemeine Notizen & Beobachtungen:', margin + 3, currentY + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      const splitNotes = doc.splitTextToSize(data.notes, contentWidth - 8);
      doc.text(splitNotes, margin + 3, currentY + 8.0);
      currentY += 14.5;
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('NextLevel Goalkeeping Academy - Standardisierte Leistungsdiagnostik & Athletikprotokoll', margin, pageHeight - 3);
    doc.text(`Seite ${i} von ${totalPages}`, pageWidth - margin, pageHeight - 3, { align: 'right' });
  }

  // Save PDF
  const filename = data.playerName
    ? `Athletiktest_${data.playerName.replace(/\s+/g, '_')}_${data.date || 'NextLevel'}.pdf`
    : `NextLevel_Athletiktest_Standards_${data.date || 'Protokoll'}.pdf`;

  doc.save(filename);
}
