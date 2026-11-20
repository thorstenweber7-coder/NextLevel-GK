import type {
  TrainingGroup,
  TrainingPlan,
  PlayerMatchPlaytime,
  MesoPlan,
  PlayerAbsence
} from '../types';
import {
  calculatePlayerWorkload,
  isPlayerAbsentOnDate,
  normalizeToYMD,
  WORKLOAD_STATUS_CONFIG,
  type PlayerWorkload
} from './workloadCalculator';
import { loadNextLevelLogoBase64, drawNextLevelFooterLogo } from './pdfBranding';

export interface HeadCoachBriefingEntry {
  playerId: string;
  playerName: string;
  jerseyNumber?: number | string;
  trafficLight: 'green' | 'yellow' | 'red';
  statusLabel: string;
  recommendation: string;
  acwr: number;
  acuteLoad7d: number;
  monotony7d?: number;
  jumpVolume7dSummary?: string;
  absenceReason?: string;
  rtpNote?: string;
  workload: PlayerWorkload;
}

export interface HeadCoachBriefingOptions {
  group: TrainingGroup;
  referenceDate: string; // YYYY-MM-DD
  savedPlans: TrainingPlan[];
  matchPlaytimes?: PlayerMatchPlaytime[];
  mesoPlans?: MesoPlan[];
  absences?: PlayerAbsence[];
  trainerName?: string;
  clubName?: string;
  clubLogoUrl?: string;
}

function formatDateDE(ymd: string): string {
  const clean = normalizeToYMD(ymd);
  const [y, m, d] = clean.split('-');
  return d && m && y ? `${d}.${m}.${y}` : ymd;
}

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
    // ignore
  }
  return '';
}

export function buildHeadCoachBriefingEntries(
  options: HeadCoachBriefingOptions
): HeadCoachBriefingEntry[] {
  const { group, referenceDate, savedPlans, matchPlaytimes = [], mesoPlans = [], absences = [] } = options;
  const refYmd = normalizeToYMD(referenceDate);
  const activePlayers = (group.players || []).filter(p => !p.archived);

  return activePlayers.map(player => {
    const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Torwart';
    const workload = calculatePlayerWorkload(
      {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        jerseyNumber: player.jerseyNumber,
        groupId: group.id,
        groupName: group.name
      },
      savedPlans,
      refYmd,
      8,
      matchPlaytimes,
      mesoPlans,
      absences
    );

    const isAbsent = isPlayerAbsentOnDate(player.id, refYmd, absences);
    const matchingAbsence = isAbsent
      ? absences.find(a => a.playerId === player.id && isPlayerAbsentOnDate(player.id, refYmd, [a]))
      : undefined;
    const absenceReason = matchingAbsence
      ? `${matchingAbsence.reason}${matchingAbsence.injuredBodyPart ? ` (${matchingAbsence.injuredBodyPart})` : ''}`
      : undefined;

    const rtpActive = Boolean(player.returnToPlay?.active);
    const rtpNote = rtpActive
      ? `RTP: ${player.returnToPlay?.stage}${player.returnToPlay?.maxRpe ? ` (max. RPE ${player.returnToPlay.maxRpe})` : ''}${player.returnToPlay?.allowedActions ? ` – ${player.returnToPlay.allowedActions}` : ''}`
      : undefined;

    let trafficLight: 'green' | 'yellow' | 'red' = 'green';
    let statusLabel = 'Voll belastbar';
    let recommendation = WORKLOAD_STATUS_CONFIG[workload.status]?.recommendation || 'Normale Trainingsbelastung möglich.';

    if (isAbsent) {
      trafficLight = 'red';
      statusLabel = `Abwesend: ${absenceReason || 'Fehlzeit'}`;
      recommendation = 'Kein Mannschaftstraining (Fehlzeit/Verletzung dokumentiert).';
    } else if (workload.status === 'danger' || (workload.jumpWeightedStatus === 'danger' && workload.jumpVolume7dSummary === 'high')) {
      trafficLight = 'red';
      statusLabel = 'Überlastungs-Spike (Schonung)';
      recommendation = 'Hohe akute Belastung! Sprung-/Hechtvolumen um 30–50% reduzieren oder individuell steuern.';
    } else if (rtpActive) {
      trafficLight = 'yellow';
      statusLabel = `Eingeschränkt (${player.returnToPlay?.stage || 'RTP'})`;
      recommendation = rtpNote || 'Return-to-Play Einschränkungen beachten.';
    } else if (workload.status === 'warning' || workload.jumpVolume7dSummary === 'high' || (workload.monotony7d !== undefined && workload.monotony7d > 2.0)) {
      trafficLight = 'yellow';
      statusLabel = 'Erhöhte Last / Ermüdung';
      recommendation = workload.jumpVolume7dSummary === 'high'
        ? 'Hohes 7-Tage-Sprungvolumen – Hechtsprünge im Teamtraining dosieren.'
        : 'Erhöhte Ermüdung – Belastung steuern & Regeneration priorisieren.';
    } else if (workload.isColdStart) {
      trafficLight = 'green';
      statusLabel = 'Voll belastbar (Aufbauphase)';
      recommendation = 'Belastungsbasis im Aufbau (< 2 dokumentierte Wochen).';
    } else if (workload.status === 'undertraining') {
      trafficLight = 'green';
      statusLabel = 'Voll belastbar (Niedrige Last)';
      recommendation = 'Geringe Vorbelastung – volle Spielformen & Zusatzreize möglich.';
    }

    return {
      playerId: player.id,
      playerName,
      jerseyNumber: player.jerseyNumber,
      trafficLight,
      statusLabel,
      recommendation,
      acwr: workload.acwr,
      acuteLoad7d: workload.acuteLoad7d,
      monotony7d: workload.monotony7d,
      jumpVolume7dSummary: workload.jumpVolume7dSummary,
      absenceReason,
      rtpNote,
      workload
    };
  });
}

export function buildHeadCoachBriefingText(options: HeadCoachBriefingOptions): string {
  const entries = buildHeadCoachBriefingEntries(options);
  const dateStr = formatDateDE(options.referenceDate);
  const header = `📋 Cheftrainer-Briefing Torhüter | ${options.group.name} (${dateStr})`;
  if (entries.length === 0) {
    return `${header}\nKeine aktiven Torhüter in dieser Gruppe hinterlegt.`;
  }
  const lines = entries.map(e => {
    const icon = e.trafficLight === 'red' ? '🔴' : e.trafficLight === 'yellow' ? '🟡' : '🟢';
    const acwrTxt = e.absenceReason ? e.absenceReason : `ACWR ${e.acwr.toFixed(2)}, 7T-Last ${e.acuteLoad7d} A.U.`;
    const jumpTxt = e.jumpVolume7dSummary && e.jumpVolume7dSummary !== 'none'
      ? `, Sprünge: ${e.jumpVolume7dSummary === 'high' ? 'Hoch' : e.jumpVolume7dSummary === 'medium' ? 'Mittel' : 'Niedrig'}`
      : '';
    return `${icon} ${e.playerName} (${acwrTxt}${jumpTxt}) – ${e.statusLabel}`;
  });
  return [header, ...lines].join('\n');
}

export async function exportHeadCoachBriefingPdf(options: HeadCoachBriefingOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const dateStr = formatDateDE(options.referenceDate);
  const entries = buildHeadCoachBriefingEntries(options);

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 28, pageWidth, 1.2, 'F');

  const logoBase64 = await loadLogoBase64(options.clubLogoUrl);
  const nextLevelFooterLogo = options.clubLogoUrl ? await loadNextLevelLogoBase64() : '';
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 4, 18, 18);
    } catch {
      // ignore
    }
  }

  const textStartX = logoBase64 ? margin + 22 : margin;
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text((options.clubName || 'NEXTLEVEL TORWARTAKADEMIE').toUpperCase(), textStartX, 9.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14.5);
  doc.text(`Cheftrainer-Briefing: Belastungsstand`, textStartX, 17);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Gruppe: ${options.group.name}${options.group.ageCategory ? ` (${options.group.ageCategory})` : ''}  |  Stichtag: ${dateStr}  |  Trainer: ${options.trainerName || 'Torwarttrainer'}`,
    textStartX,
    23.5
  );

  let y = 36;

  // Traffic light summary strip
  const greenCount = entries.filter(e => e.trafficLight === 'green').length;
  const yellowCount = entries.filter(e => e.trafficLight === 'yellow').length;
  const redCount = entries.filter(e => e.trafficLight === 'red').length;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ampel-Übersicht (${entries.length} Torhüter):`, margin + 3, y + 6.8);

  doc.setTextColor(21, 128, 61);
  doc.text(`Voll belastbar: ${greenCount}`, margin + 62, y + 6.8);
  doc.setTextColor(180, 83, 9);
  doc.text(`Dosieren / RTP: ${yellowCount}`, margin + 102, y + 6.8);
  doc.setTextColor(185, 28, 28);
  doc.text(`Schonung / Ausfall: ${redCount}`, margin + 142, y + 6.8);

  y += 16;

  if (entries.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Keine aktiven Torhüter in dieser Trainingsgruppe hinterlegt.', margin, y);
  } else {
    entries.forEach(entry => {
      if (y + 26 > pageHeight - 18) {
        doc.addPage();
        y = 16;
      }

      const [r, g, b] =
        entry.trafficLight === 'red' ? [220, 38, 38] :
        entry.trafficLight === 'yellow' ? [217, 119, 6] : [16, 185, 129];

      // Card container
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 23, 2, 2, 'FD');

      // Left traffic-light bar
      doc.setFillColor(r, g, b);
      doc.roundedRect(margin, y, 3, 23, 1, 1, 'F');

      // Name & Status Badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const numPrefix = entry.jerseyNumber ? `#${entry.jerseyNumber} ` : '';
      doc.text(`${numPrefix}${entry.playerName}`, margin + 6, y + 6.5);

      doc.setTextColor(r, g, b);
      doc.setFontSize(9);
      doc.text(entry.statusLabel, pageWidth - margin - 3, y + 6.5, { align: 'right' });

      // KPI line
      const jumpLabel =
        entry.jumpVolume7dSummary === 'high' ? 'Hoch' :
        entry.jumpVolume7dSummary === 'medium' ? 'Mittel' :
        entry.jumpVolume7dSummary === 'low' ? 'Niedrig' : '–';
      const monoTxt = entry.monotony7d !== undefined ? `  |  Monotonie: ${entry.monotony7d.toFixed(2)}` : '';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `ACWR: ${entry.acwr.toFixed(2)}  |  7-Tage-Last: ${entry.acuteLoad7d} A.U.  |  7-Tage-Sprungvolumen: ${jumpLabel}${monoTxt}`,
        margin + 6,
        y + 12.2
      );

      // Recommendation line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(30, 41, 59);
      const recLines = doc.splitTextToSize(`Empfehlung: ${entry.recommendation}`, contentWidth - 10);
      doc.text(recLines.slice(0, 2), margin + 6, y + 17.5);

      y += 26;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const rightX = nextLevelFooterLogo ? pageWidth - margin - 7.5 : pageWidth - margin;
    doc.text(`Cheftrainer-Briefing • ${options.group.name} • Stand ${dateStr}`, margin, pageHeight - 7);
    doc.text(`Seite ${i} / ${totalPages}`, rightX, pageHeight - 7, { align: 'right' });
    if (nextLevelFooterLogo) {
      drawNextLevelFooterLogo(doc, nextLevelFooterLogo, pageWidth, margin, pageHeight - 10.5, 5.5);
    }
  }

  const safeGroup = options.group.name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '_');
  doc.save(`Cheftrainer_Briefing_${safeGroup}_${normalizeToYMD(options.referenceDate)}.pdf`);
}
