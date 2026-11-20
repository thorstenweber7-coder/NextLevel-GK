import {
  SKILL_DEFINITIONS,
  type Player,
  type TrainingGroup,
  type PlayerEvaluation,
  type PlayerAbsence,
  type PlayerMatchPlaytime,
  type PlayerFeedbackTalk,
  type EvaluationCategory
} from '../types';
import { calculateMirwaldMaturityOffset, parseBioNumber } from './biologicalMaturity';
import { loadNextLevelLogoBase64, drawNextLevelFooterLogo } from './pdfBranding';

export interface PlayerDevelopmentReportData {
  player: Player;
  group: TrainingGroup;
  evaluations: PlayerEvaluation[];
  absences: PlayerAbsence[];
  matchPlaytimes: PlayerMatchPlaytime[];
  feedbackTalks: PlayerFeedbackTalk[];
  trainerName?: string;
  clubName?: string;
  clubLogoUrl?: string;
}

const CATEGORY_LABELS: Record<EvaluationCategory, string> = {
  Technik: 'Technik',
  Taktik: 'Taktik',
  Athletik: 'Athletik',
  Mental: 'Mental'
};

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
    if (response.ok) {
      const blob = await response.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // ignore logo fetch failure
  }
  return '';
}

function formatDateDE(raw?: string): string {
  if (!raw) return '–';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-');
    return `${d}.${m}.${y}`;
  }
  return raw;
}

export async function generatePlayerDevelopmentPDF(data: PlayerDevelopmentReportData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const { player, group, evaluations, absences, matchPlaytimes, feedbackTalks, trainerName, clubName, clubLogoUrl } = data;
  const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Torwart';
  const todayStr = new Date().toLocaleDateString('de-DE');

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 14;
    }
  };

  const drawSectionHeader = (title: string, r = 15, g = 23, b = 42) => {
    checkPageBreak(14);
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title, margin + 3, y + 5);
    y += 10.5;
  };

  // --- HEADER ---
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 28, pageWidth, 1.2, 'F');

  const logoBase64 = await loadLogoBase64(clubLogoUrl);
  const nextLevelFooterLogo = clubLogoUrl ? await loadNextLevelLogoBase64() : '';
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 4, 18, 18);
    } catch {
      // ignore invalid image
    }
  }

  const textStartX = logoBase64 ? margin + 22 : margin;
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text((clubName || 'NEXTLEVEL TORWARTAKADEMIE').toUpperCase(), textStartX, 9.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(`Entwicklungsbericht: ${playerName}`, textStartX, 17);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const subParts = [
    `Gruppe: ${group.name}${group.ageCategory ? ` (${group.ageCategory})` : ''}`,
    player.birthYear ? `Jahrgang: ${player.birthYear}` : null,
    player.mainTeam ? `Team: ${player.mainTeam}` : null,
    `Stand: ${todayStr}`
  ].filter(Boolean);
  doc.text(subParts.join('  |  '), textStartX, 23.5);

  y = 35;

  // --- 1. STAMMDATEN ---
  drawSectionHeader('1. Spielerprofil & Stammdaten', 30, 41, 59);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const profileLines = [
    `Name: ${playerName}    |    Trainingsgruppe: ${group.name}${group.ageCategory ? ` (${group.ageCategory})` : ''}`,
    `Jahrgang: ${player.birthYear || '–'}    |    Stammteam: ${player.mainTeam || '–'}    |    Trainer: ${trainerName || 'Torwarttrainer'}`,
    player.notes ? `Notizen: ${player.notes}` : null
  ].filter(Boolean) as string[];
  profileLines.forEach(line => {
    const wrapped = doc.splitTextToSize(line, contentWidth - 4);
    checkPageBreak(wrapped.length * 4.5 + 2);
    doc.text(wrapped, margin + 2, y);
    y += wrapped.length * 4.5;
  });
  y += 3;

  // --- 2. ENTWICKLUNGSPROFIL (TECHNIK / TAKTIK / ATHLETIK / MENTAL) ---
  drawSectionHeader('2. Leistungs- & Entwicklungsprofil (Aktuelle Bewertungen)', 16, 185, 129);
  const playerEvals = evaluations
    .filter(e => e.playerId === player.id)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const categories: EvaluationCategory[] = ['Technik', 'Taktik', 'Athletik', 'Mental'];
  let hasAnyEval = false;

  categories.forEach(cat => {
    const catEvals = (cat === 'Athletik'
      ? playerEvals.filter(e => e.category?.toLowerCase() === 'athletik' && ((e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean)) || (e.ratings && Object.keys(e.ratings).length > 0)))
      : playerEvals.filter(e => e.category?.toLowerCase() === cat.toLowerCase())
    );
    const latest = catEvals[0];
    const baseline = catEvals.length >= 2 ? catEvals[catEvals.length - 1] : null;
    if (!latest) return;
    hasAnyEval = true;

    const rawRatings = latest.ratings || (latest as any).scores || {};
    const baseRatings = baseline ? (baseline.ratings || (baseline as any).scores || {}) : {};
    const catDefs = SKILL_DEFINITIONS[cat] || [];
    const scores = Object.entries(rawRatings).filter(([k, v]) => {
      if (typeof v !== 'number' || v <= 0) return false;
      if (cat === 'Athletik') return catDefs.some(d => d.id === k);
      return true;
    }) as [string, number][];
    const avgNum = scores.length > 0
      ? scores.reduce((acc, [, v]) => acc + v, 0) / scores.length
      : null;
    const avg = avgNum !== null ? avgNum.toFixed(2) : '–';

    const baseScores = baseline
      ? (Object.entries(baseRatings).filter(([k, v]) => {
          if (typeof v !== 'number' || v <= 0) return false;
          if (cat === 'Athletik') return catDefs.some(d => d.id === k);
          return true;
        }) as [string, number][])
      : [];
    const baseAvgNum = baseScores.length > 0
      ? baseScores.reduce((acc, [, v]) => acc + v, 0) / baseScores.length
      : null;
    const avgDelta = avgNum !== null && baseAvgNum !== null ? Math.round((avgNum - baseAvgNum) * 100) / 100 : null;

    const evalDateStr = latest.athleticMetrics?.testDate
      || (latest.updatedAt ? new Date(latest.updatedAt).toISOString().substring(0, 10) : undefined);
    const baseDateStr = baseline
      ? (baseline.athleticMetrics?.testDate || (baseline.updatedAt ? new Date(baseline.updatedAt).toISOString().substring(0, 10) : undefined))
      : undefined;

    checkPageBreak(18);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const deltaHeaderSuffix = avgDelta !== null
      ? `  |  Delta T0->Aktuell: ${avgDelta > 0 ? '+' : ''}${avgDelta.toFixed(2)}`
      : '';
    doc.text(`${CATEGORY_LABELS[cat]} (Ø ${avg} / 5.0${deltaHeaderSuffix})`, margin + 2.5, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    const dateHeaderText = baseline
      ? `T0: ${formatDateDE(baseDateStr)} -> Aktuell: ${formatDateDE(evalDateStr)} (${catEvals.length} Tests)`
      : `Datum: ${formatDateDE(evalDateStr)}`;
    doc.text(dateHeaderText, pageWidth - margin - 2.5, y + 4.5, { align: 'right' });
    y += 8.5;

    if (scores.length > 0) {
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      scores.forEach(([skillId, val]) => {
        const def = catDefs.find(s => s.id === skillId);
        const label = def?.name || skillId;
        const baseVal = typeof baseRatings[skillId] === 'number' && baseRatings[skillId] > 0 ? baseRatings[skillId] : null;
        const dVal = baseVal !== null ? Math.round((val - baseVal) * 10) / 10 : null;
        checkPageBreak(5);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        doc.text(`• ${label}:`, margin + 3, y);
        doc.setFont('helvetica', 'bold');
        doc.text(`${val} / 5`, margin + 95, y);
        if (dVal !== null) {
          if (dVal > 0) doc.setTextColor(21, 128, 61);
          else if (dVal < 0) doc.setTextColor(185, 28, 28);
          else doc.setTextColor(100, 116, 139);
          doc.text(`(${dVal > 0 ? '+' : ''}${dVal.toFixed(1)} vs. T0)`, margin + 114, y);
        }
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        y += 4.3;
      });
    }

    // Athletik-Längsschnitt (T0 -> Aktuell) für Rohmesswerte
    if (cat === 'Athletik' && latest.athleticMetrics && baseline?.athleticMetrics) {
      const mNow = latest.athleticMetrics;
      const mBase = baseline.athleticMetrics;
      const athComparisons: { label: string; base: number; now: number; unit: string; lowerIsBetter?: boolean }[] = [
        { label: 'CMJ Sprunghöhe', base: parseBioNumber(mBase.cmjHeightCm), now: parseBioNumber(mNow.cmjHeightCm), unit: 'cm' },
        { label: '5 m Sprint', base: parseBioNumber(mBase.sprint5mSec), now: parseBioNumber(mNow.sprint5mSec), unit: 's', lowerIsBetter: true },
        { label: '10 m Sprint', base: parseBioNumber(mBase.sprint10mSec), now: parseBioNumber(mNow.sprint10mSec), unit: 's', lowerIsBetter: true },
        { label: 'Griffkraft Rechts', base: parseBioNumber(mBase.gripRightKg), now: parseBioNumber(mNow.gripRightKg), unit: 'kg' },
        { label: 'Griffkraft Links', base: parseBioNumber(mBase.gripLeftKg), now: parseBioNumber(mNow.gripLeftKg), unit: 'kg' },
        { label: 'Lateral Push Rechts', base: parseBioNumber(mBase.lateralPushRightCm), now: parseBioNumber(mNow.lateralPushRightCm), unit: 'cm' },
        { label: 'Lateral Push Links', base: parseBioNumber(mBase.lateralPushLeftCm), now: parseBioNumber(mNow.lateralPushLeftCm), unit: 'cm' },
        { label: 'Medizinballwurf', base: parseBioNumber(mBase.medBallDistanceM), now: parseBioNumber(mNow.medBallDistanceM), unit: 'm' }
      ].filter(c => c.base > 0 && c.now > 0);

      if (athComparisons.length > 0) {
        checkPageBreak(athComparisons.length * 4.3 + 8);
        y += 1.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.3);
        doc.setTextColor(15, 23, 42);
        doc.text(`Athletik-Längsschnittentwicklung (T0 ${formatDateDE(baseDateStr)} -> Aktuell ${formatDateDE(evalDateStr)}):`, margin + 3, y);
        y += 4.3;

        athComparisons.forEach(c => {
          const pct = Math.round(((c.now - c.base) / c.base) * 1000) / 10;
          const improved = c.lowerIsBetter ? pct < 0 : pct > 0;
          const worsened = c.lowerIsBetter ? pct > 0 : pct < 0;
          checkPageBreak(4.5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.1);
          doc.setTextColor(51, 65, 85);
          doc.text(`  - ${c.label}: ${c.base} ${c.unit} -> ${c.now} ${c.unit}`, margin + 3, y);
          doc.setFont('helvetica', 'bold');
          if (improved) doc.setTextColor(21, 128, 61);
          else if (worsened) doc.setTextColor(185, 28, 28);
          else doc.setTextColor(100, 116, 139);
          doc.text(`${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, margin + 108, y);
          y += 4.1;
        });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }
    }

    // Limb Symmetry Index (LSI > 10% R/L Asymmetrie-Check) bei Athletik
    if (cat === 'Athletik' && latest.athleticMetrics) {
      const m = latest.athleticMetrics;
      const calcAsym = (rRaw?: number | string, lRaw?: number | string) => {
        const r = parseBioNumber(rRaw);
        const l = parseBioNumber(lRaw);
        if (r > 0 && l > 0) {
          const max = Math.max(r, l);
          const pct = Math.round((Math.abs(r - l) / max) * 1000) / 10;
          return { r, l, pct, warn: pct > 10 };
        }
        return null;
      };

      const bilateralTests = [
        { name: 'Griffkraft (R/L)', unit: 'kg', res: calcAsym(m.gripRightKg, m.gripLeftKg) },
        { name: 'Single-Leg Lateral Push (R/L)', unit: 'cm', res: calcAsym(m.lateralPushRightCm, m.lateralPushLeftCm) },
        { name: 'Hybrid-Shuttle 5-10-5 (R/L)', unit: 's', res: calcAsym(m.agilityShuttleRightSec, m.agilityShuttleLeftSec) }
      ].filter(t => t.res !== null);

      if (bilateralTests.length > 0) {
        checkPageBreak(bilateralTests.length * 4.5 + 8);
        y += 1.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.3);
        doc.setTextColor(15, 23, 42);
        doc.text('Limb Symmetry Index (LSI – Rechts/Links-Symmetrie & Dysbalance-Prävention):', margin + 3, y);
        y += 4.3;

        bilateralTests.forEach(t => {
          const r = t.res!;
          checkPageBreak(4.5);
          doc.setFont('helvetica', r.warn ? 'bold' : 'normal');
          doc.setFontSize(8.2);
          if (r.warn) {
            doc.setTextColor(180, 83, 9);
          } else {
            doc.setTextColor(21, 128, 61);
          }
          const statusTxt = r.warn
            ? `WARNUNG: ${r.pct}% Dysbalance (>10% Schwelle – Verletzungsprävention!)`
            : `OK: ${r.pct}% Abweichung (Symmetrisch <=10%)`;
          doc.text(`  - ${t.name}: R ${r.r} ${t.unit} / L ${r.l} ${t.unit}  ->  ${statusTxt}`, margin + 3, y);
          y += 4.2;
        });
        doc.setFont('helvetica', 'normal');
      }
    }

    if (latest.strengths) {
      const wrapped = doc.splitTextToSize(`Stärken: ${latest.strengths}`, contentWidth - 6);
      checkPageBreak(wrapped.length * 4 + 2);
      doc.setTextColor(21, 128, 61);
      doc.setFontSize(8.3);
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 4 + 1;
    }
    if (latest.developmentAreas) {
      const wrapped = doc.splitTextToSize(`Entwicklungsfelder: ${latest.developmentAreas}`, contentWidth - 6);
      checkPageBreak(wrapped.length * 4 + 2);
      doc.setTextColor(180, 83, 9);
      doc.setFontSize(8.3);
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 4 + 1;
    }
    const evalNotes = latest.overallNotes || (latest as any).notes;
    if (evalNotes) {
      const wrapped = doc.splitTextToSize(`Notizen: ${evalNotes}`, contentWidth - 6);
      checkPageBreak(wrapped.length * 4 + 2);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.3);
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 4 + 1;
    }
    y += 3;
  });

  if (!hasAnyEval) {
    checkPageBreak(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Noch keine Skill- oder Leistungsbewertungen für diesen Torwart hinterlegt.', margin + 2, y);
    y += 7;
  }

  // --- 3. BIOLOGISCHER ENTWICKLUNGSSTAND (BIO-BANDING) ---
  const latestBioEval = playerEvals.find(e => e.biologicalMetrics && (
    parseBioNumber(e.biologicalMetrics.standingHeightCm) > 0 ||
    parseBioNumber(e.biologicalMetrics.weightKg) > 0
  ));
  if (latestBioEval?.biologicalMetrics) {
    drawSectionHeader('3. Biologischer Entwicklungsstand (Bio-Banding)', 14, 116, 144);
    const bio = latestBioEval.biologicalMetrics;
    const standing = parseBioNumber(bio.standingHeightCm);
    const sitting = parseBioNumber(bio.sittingHeightCm);
    const weight = parseBioNumber(bio.weightKg);
    const age = parseBioNumber(bio.customAge) || (player.birthYear ? new Date().getFullYear() - Number(player.birthYear) : 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const bioLine = `Messdatum: ${formatDateDE(bio.measurementDate || latestBioEval.date)}  |  Größe: ${standing || '–'} cm  |  Sitzhöhe: ${sitting || '–'} cm  |  Gewicht: ${weight || '–'} kg  |  Spannweite: ${bio.wingspanCm || '–'} cm`;
    const wrappedBio = doc.splitTextToSize(bioLine, contentWidth - 4);
    checkPageBreak(wrappedBio.length * 4.5 + 6);
    doc.text(wrappedBio, margin + 2, y);
    y += wrappedBio.length * 4.5;

    if (standing > 0 && sitting > 0 && weight > 0 && age > 0) {
      const mirwald = calculateMirwaldMaturityOffset({
        ageYears: age,
        standingHeightCm: standing,
        sittingHeightCm: sitting,
        weightKg: weight
      });
      if (mirwald) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Mirwald Maturity Offset: ${mirwald.maturityOffset > 0 ? '+' : ''}${mirwald.maturityOffset} Jahre (${mirwald.statusLabel})`, margin + 2, y);
        y += 5;
      }
    }
    y += 3;
  }

  // --- 4. SPIELZEITEN & WETTKAMPFBILANZ ---
  drawSectionHeader('4. Spielzeiten & Wettkampfbilanz', 37, 99, 235);
  const playerMatches = matchPlaytimes
    .filter(m => {
      const hasMin = m.playerMinutes && m.playerMinutes[player.id] !== undefined;
      const onBench = m.playerBenchStatus && m.playerBenchStatus[player.id];
      const hasGrade = m.playerGrades && m.playerGrades[player.id] !== undefined;
      return hasMin || onBench || hasGrade;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalMinutes = playerMatches.reduce((acc, m) => acc + (Number(m.playerMinutes?.[player.id]) || 0), 0);
  const grades = playerMatches
    .map(m => m.playerGrades?.[player.id])
    .filter((g): g is number => typeof g === 'number' && g > 0);
  const avgGrade = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : '–';

  // Saison-Aggregation optionaler Spiel-KPIs
  let totalGoalsConceded = 0;
  let goalsConcededMatches = 0;
  let cleanSheets = 0;
  let totalSaves = 0;
  let hasSaves = false;
  let totalCrosses = 0;
  let hasCrosses = false;
  const distPcts: number[] = [];

  playerMatches.forEach(m => {
    const mins = Number(m.playerMinutes?.[player.id]) || 0;
    const st = m.playerMatchStats?.[player.id];
    if (!st) return;
    if (typeof st.goalsConceded === 'number') {
      totalGoalsConceded += st.goalsConceded;
      goalsConcededMatches += 1;
      if (mins >= 45 && st.goalsConceded === 0) cleanSheets += 1;
    }
    if (typeof st.saves === 'number') {
      totalSaves += st.saves;
      hasSaves = true;
    }
    if (typeof st.crossesClaimed === 'number') {
      totalCrosses += st.crossesClaimed;
      hasCrosses = true;
    }
    if (typeof st.distributionPct === 'number') {
      distPcts.push(st.distributionPct);
    }
  });

  const goalsPer90 = goalsConcededMatches > 0 && totalMinutes > 0
    ? ((totalGoalsConceded / totalMinutes) * 90).toFixed(2)
    : null;
  const cleanSheetPct = goalsConcededMatches > 0
    ? Math.round((cleanSheets / goalsConcededMatches) * 100)
    : null;
  const avgDistPct = distPcts.length > 0
    ? Math.round(distPcts.reduce((a, b) => a + b, 0) / distPcts.length)
    : null;

  checkPageBreak(15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Einsätze / Kader: ${playerMatches.length}   |   Gesamtminuten: ${totalMinutes} Min.   |   Ø Spielnote: ${avgGrade}`, margin + 2, y);
  y += 5;

  const kpiSummaryParts: string[] = [];
  if (goalsConcededMatches > 0) {
    kpiSummaryParts.push(`Gegentore: ${totalGoalsConceded}${goalsPer90 ? ` (${goalsPer90} / 90 Min.)` : ''}`);
    kpiSummaryParts.push(`Zu-Null: ${cleanSheets}/${goalsConcededMatches} (${cleanSheetPct}%)`);
  }
  if (hasSaves) kpiSummaryParts.push(`Paraden/1v1: ${totalSaves}`);
  if (hasCrosses) kpiSummaryParts.push(`Flanken abgef.: ${totalCrosses}`);
  if (avgDistPct !== null) kpiSummaryParts.push(`Ø Spieleröffnung: ${avgDistPct}%`);

  if (kpiSummaryParts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.1);
    doc.setTextColor(37, 99, 235);
    const wrappedKpi = doc.splitTextToSize(`Spiel-KPIs (Saison): ${kpiSummaryParts.join('  |  ')}`, contentWidth - 4);
    checkPageBreak(wrappedKpi.length * 4 + 2);
    doc.text(wrappedKpi, margin + 2, y);
    y += wrappedKpi.length * 4 + 1.5;
  } else {
    y += 1;
  }

  if (playerMatches.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Keine Spielzeiten erfasst.', margin + 2, y);
    y += 6;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);
    playerMatches.slice(0, 12).forEach(m => {
      const mins = m.playerMinutes?.[player.id] ?? 0;
      const grade = m.playerGrades?.[player.id];
      const bench = m.playerBenchStatus?.[player.id] ? ' (Bank)' : '';
      const st = m.playerMatchStats?.[player.id];
      const stParts: string[] = [];
      if (st?.goalsConceded !== undefined) stParts.push(`GT:${st.goalsConceded}`);
      if (st?.saves !== undefined) stParts.push(`P:${st.saves}`);
      if (st?.crossesClaimed !== undefined) stParts.push(`F:${st.crossesClaimed}`);
      if (st?.distributionPct !== undefined) stParts.push(`E:${st.distributionPct}%`);
      const stSuffix = stParts.length > 0 ? ` | KPIs: ${stParts.join(', ')}` : '';
      const line = `• ${formatDateDE(m.date)}: ${m.team} vs. ${m.opponent || 'Gegner'} (${m.matchType}) — ${mins} Min.${bench}${grade ? ` | Note: ${grade}` : ''}${stSuffix}`;
      const wrapped = doc.splitTextToSize(line, contentWidth - 4);
      checkPageBreak(wrapped.length * 4 + 1);
      doc.text(wrapped, margin + 2, y);
      y += wrapped.length * 4 + 0.5;
    });
  }
  y += 3;

  // --- 5. FEHLZEITEN ---
  drawSectionHeader('5. Fehlzeiten & Abwesenheiten', 217, 119, 6);
  const playerAbsences = absences
    .filter(a => a.playerId === player.id)
    .sort((a, b) => (b.startDate || (b as any).date || '').localeCompare(a.startDate || (a as any).date || ''));

  if (playerAbsences.length === 0) {
    checkPageBreak(7);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Keine Fehlzeiten dokumentiert.', margin + 2, y);
    y += 6;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);
    playerAbsences.slice(0, 12).forEach(a => {
      const dStart = formatDateDE(a.startDate || (a as any).date);
      const dEnd = a.endDate && a.endDate !== a.startDate ? ` – ${formatDateDE(a.endDate)}` : '';
      const line = `• ${dStart}${dEnd}: ${a.reason}${a.injuredBodyPart ? ` (${a.injuredBodyPart})` : ''}${a.note ? ` — ${a.note}` : ''}`;
      const wrapped = doc.splitTextToSize(line, contentWidth - 4);
      checkPageBreak(wrapped.length * 4 + 1);
      doc.text(wrapped, margin + 2, y);
      y += wrapped.length * 4 + 0.5;
    });
  }
  y += 3;

  // --- 6. FEEDBACKGESPRÄCHE ---
  drawSectionHeader('6. Dokumentierte Feedbackgespräche', 124, 58, 237);
  const playerTalks = feedbackTalks
    .filter(t => t.playerId === player.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (playerTalks.length === 0) {
    checkPageBreak(7);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Noch keine Feedbackgespräche protokolliert.', margin + 2, y);
    y += 6;
  } else {
    playerTalks.slice(0, 8).forEach(t => {
      const trainers = [t.trainer1, t.trainer2].filter(Boolean).join(' & ');
      const headerLine = `${formatDateDE(t.date)}${trainers ? ` (${trainers})` : ''}`;
      const bodyLines = doc.splitTextToSize(t.keyPoints || '–', contentWidth - 6);
      checkPageBreak(bodyLines.length * 4 + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(headerLine, margin + 2, y);
      y += 4.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      doc.text(bodyLines, margin + 4, y);
      y += bodyLines.length * 4 + 2.5;
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const devRightX = nextLevelFooterLogo ? pageWidth - margin - 7.5 : pageWidth - margin;
    doc.text(`NextLevel Torwarttraining • Entwicklungsbericht ${playerName}`, margin, pageHeight - 7);
    doc.text(`Seite ${i} / ${totalPages}`, devRightX, pageHeight - 7, { align: 'right' });
    if (nextLevelFooterLogo) {
      drawNextLevelFooterLogo(doc, nextLevelFooterLogo, pageWidth, margin, pageHeight - 10.5, 5.5);
    }
  }

  const safeName = playerName.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '_');
  doc.save(`Entwicklungsbericht_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
