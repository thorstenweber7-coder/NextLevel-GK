import type { 
  Player, 
  TrainingGroup, 
  PlayerEvaluation, 
  PlayerAbsence, 
  TrainingPlan,
  PlayerFeedbackTalk,
  PlayerMatchPlaytime,
  Exercise,
  AbsenceReason,
  BiologicalMaturityMetrics
} from "../types";
import { SKILL_DEFINITIONS } from "../types";
import { evaluateAllAthleticTests } from "./athleticNormEvaluation";
import { getClosestBiologicalEvaluation } from "./biologicalMaturity";
import { calculatePlayerSeasonWorkload, WORKLOAD_STATUS_CONFIG } from "./workloadCalculator";

export interface PlayerPdfExportData {
  player: Player;
  group: TrainingGroup;
  evaluations: PlayerEvaluation[];
  absences: PlayerAbsence[];
  savedPlans?: TrainingPlan[];
  clubLogoUrl?: string;
  clubName?: string;
  feedbackTalks?: PlayerFeedbackTalk[];
  matchPlaytimes?: PlayerMatchPlaytime[];
  exercises?: Exercise[];
}

// Absence Reason colors & helper
const REASON_COLORS: Record<string, [number, number, number]> = {
  "Verletzung": [225, 29, 72],     // Rose/Red
  "Krankheit": [217, 119, 6],      // Amber
  "Schule / Beruf": [2, 132, 199], // Sky/Blue
  "Privat": [124, 58, 237],        // Violet/Purple
  "Sonstiges": [100, 116, 139]     // Slate
};

// Technique Group Color Mapping for Bars
const TECH_GROUP_RGB: Record<string, [number, number, number]> = {
  "Grundstellungen": [2, 132, 199],      // Sky
  "Basistechniken": [16, 185, 129],      // Emerald
  "Nah- und Ferndistanz": [99, 102, 241], // Indigo
  "1vs1": [245, 158, 11],                // Amber
  "Hohe Bälle & Flanken": [168, 85, 247], // Purple
  "Offensivtechniken": [244, 63, 94],    // Rose
  "Allgemein": [20, 184, 166]            // Teal
};

// 9 Athletic Dimensions
const ATHLETIC_RADAR_AXES: Array<{ key: string; label: string; shortLabel: string; group: string }> = [
  { key: "ath_grip", label: "Oberkörperkraft (Griffkraft)", shortLabel: "Oberkörperkraft (Griff)", group: "Oberkörper" },
  { key: "ath_cmj", label: "Vertikale Sprunghöhe (CMJ)", shortLabel: "Vertikale Sprunghöhe", group: "Sprungkraft" },
  { key: "ath_lateral_push", label: "Seitliche Sprungkraft (Lateral Push)", shortLabel: "Seitliche Sprungkraft", group: "Sprungkraft" },
  { key: "ath_sprint_5m", label: "5m Antritt", shortLabel: "5m Antritt", group: "Schnelligkeit" },
  { key: "ath_sprint_10m", label: "10m Geschwindigkeit", shortLabel: "10m Geschwindigkeit", group: "Schnelligkeit" },
  { key: "ath_shuttle", label: "Positionsanpassung (Agility)", shortLabel: "Positionsanpassung", group: "Agilität" },
  { key: "ath_medball", label: "Schnellkraft Oberkörper (Medizinball)", shortLabel: "Schnellkraft Oberkörper", group: "Oberkörper" },
  { key: "ath_blazepod_hits", label: "BlazePod Reaktion", shortLabel: "BlazePod Reaktion", group: "Reaktion" },
  { key: "ath_blazepod_gonogo", label: "Impulskontrolle (Go/No-Go)", shortLabel: "Impulskontrolle", group: "Kognition" },
];

// Helper to split long labels into 2 lines cleanly
function splitLabelIntoLines(text: string, maxLen = 16): string[] {
  if (!text) return [""];
  if (text.length <= maxLen) return [text];

  const customMap: Record<string, [string, string]> = {
    "Indikator Oberkörperkraft (Griffkraft)": ["Indikator Oberkörperkraft", "(Griffkraft)"],
    "Oberkörperkraft (Griff)": ["Oberkörperkraft", "(Griffkraft)"],
    "Schnellkraft (Medizinball)": ["Schnellkraft", "(Medizinball)"],
    "Oberkörper Schnellkraft": ["Oberkörper", "Schnellkraft"],
    "vertikale Sprungkraft": ["vertikale", "Sprungkraft"],
    "horizontale Sprungkraft": ["horizontale", "Sprungkraft"],
    "Antritt (Sprint 5m)": ["Antritt", "(Sprint 5m)"],
    "Geschwindigkeit (10m)": ["Geschwindigkeit", "(Sprint 10m)"],
    "Reaktion (Hits 20s)": ["Reaktion", "(Hits 20s)"],
    "Impulskontrolle (Go/No-Go)": ["Impulskontrolle", "(Go/No-Go)"],
    "Siegeswille & Einsatzbereitschaft": ["Siegeswille &", "Einsatzbereitschaft"],
    "Coachings während des Spiels": ["Coaching während", "des Spiels"],
    "Coaching während des Spiels": ["Coaching während", "des Spiels"],
    "Coaching bei Standards": ["Coaching bei", "Standards"],
    "Spielfähigkeit (das Spiel lesen)": ["Spielfähigkeit", "(Spiel lesen)"],
    "Verteidigen hinter der Abwehrkette": ["Verteidigen hinter", "der Abwehrkette"],
    "Resilienz beim Umgang mit Fehlern": ["Resilienz bei", "Fehlern"],
    "Fokus & Konzentrationsdauer": ["Fokus &", "Konzentration"],
    "Druckresistenz & Mut": ["Druckresistenz", "& Mut"],
    "Präsenz & Körpersprache": ["Präsenz &", "Körpersprache"],
    "Lern- & Entwicklungsbereitschaft (Coachability)": ["Lernbereitschaft", "(Coachability)"],
    "Führung & Teamsteuerung (Leadership)": ["Führung &", "Teamsteuerung"],
    "Rollen- & Konkurrenzverhalten (Teamplay im Torwartteam)": ["Teamplay &", "Rollenverhalten"],
    "Ballerwartungshaltung (Ferndistanz)": ["BEH", "Ferndistanz"],
    "Ballerwartungshaltung (Nahdistanz)": ["BEH", "Nahdistanz"],
    "Ballerwartungshaltung (Flankenzonen)": ["BEH", "Flankenzone"],
    "BEH Ferndistanz": ["BEH", "Ferndistanz"],
    "BEH Nahdistanz": ["BEH", "Nahdistanz"],
    "BEH Flankenzone": ["BEH", "Flankenzone"],
    "Hand-Fuß Reaktion": ["Hand-Fuß", "Reaktion"],
    "HF-Reaktion": ["Hand-Fuß", "Reaktion"],
    "Abtauchen/Entlasten": ["Abtauchen /", "Entlasten"],
    "Abdruck Übergreifen": ["Abdruck", "Übergreifen"],
    "Abdruck hoch": ["Abdruck", "hoch"],
    "Abdruck halbhoch": ["Abdruck", "halbhoch"],
    "Abdruck flach": ["Abdruck", "flach"],
    "Lob-Abwehr": ["Lob-", "Abwehr"],
    "Ballangriff": ["Ball-", "angriff"],
    "Block kurz": ["Block", "kurz"],
    "Block lang": ["Block", "lang"],
    "Fangen hoch": ["Fangen", "hoch"],
    "Fausten einarmig": ["Fausten", "einarmig"],
    "Fausten beidarmig": ["Fausten", "beidarmig"],
    "Kreuzschritt": ["Kreuz-", "schritt"],
    "Erster Kontakt": ["1. Kontakt", ""],
    "Passspiel": ["Pass-", "spiel"],
    "Flugball": ["Flugball", ""],
    "Abkippen halbhoch": ["Abkippen", "halbhoch"],
    "Abkippen flach": ["Abkippen", "flach"],
    "tiefer Korb": ["tiefer", "Korb"],
    "Lauerstellung": ["Lauer-", "stellung"],
    "Grundpositionierung (Breite)": ["Grundposition", "(Breite)"]
  };

  if (customMap[text]) {
    const res = customMap[text];
    return res[1] ? [res[0], res[1]] : [res[0]];
  }

  const words = text.split(" ");
  if (words.length === 1) {
    return [text];
  }

  let line1 = "";
  let line2 = "";
  for (const w of words) {
    if (!line1 || (line1 + " " + w).length <= maxLen) {
      line1 = line1 ? line1 + " " + w : w;
    } else {
      line2 = line2 ? line2 + " " + w : w;
    }
  }
  return line2 ? [line1, line2] : [line1];
}

// Helper to fetch and convert transparent logo to Base64
async function loadLogoBase64(customLogoUrl?: string): Promise<string> {
  if (customLogoUrl && customLogoUrl.startsWith("data:image/")) {
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
          reader.onerror = () => resolve("");
          reader.readAsDataURL(blob);
        });
      }
    }

    const response = await fetch("/logo_pdf.png");
    if (!response.ok) {
      const fallback = await fetch("/Logo.png");
      const blob = await fallback.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
    }
    const blob = await response.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not load logo for PDF:", err);
    return "";
  }
}

// Calculate absence duration in days
function getAbsenceDurationDays(abs: PlayerAbsence): number {
  if (!abs.startDate) return 1;
  const start = new Date(abs.startDate).getTime();
  const end = abs.endDate ? new Date(abs.endDate).getTime() : start;
  if (isNaN(start) || isNaN(end)) return 1;
  const diffDays = Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

// Helper to calculate athletic scores from evaluation
function getAthleticScoresFromEval(
  evaluation: PlayerEvaluation | undefined, 
  birthYear?: number, 
  fallbackBio?: BiologicalMaturityMetrics,
  allEvaluations?: PlayerEvaluation[]
): Record<string, number> {
  if (!evaluation) return {};
  const athDate = evaluation.athleticMetrics?.testDate || evaluation.updatedAt;
  const matchedBio = allEvaluations && evaluation.playerId
    ? getClosestBiologicalEvaluation(allEvaluations, evaluation.playerId, athDate)?.biologicalMetrics
    : undefined;
  const bio = evaluation.biologicalMetrics || matchedBio || fallbackBio;
  const res = evaluateAllAthleticTests(
    evaluation.athleticMetrics,
    bio,
    birthYear
  );
  const scores: Record<string, number> = {};
  res.items.forEach(item => {
    if (item.score > 0) {
      scores[item.id] = item.score;
    }
  });
  if (evaluation.ratings) {
    Object.entries(evaluation.ratings).forEach(([k, v]) => {
      if (
        typeof v === "number" && 
        v > 0 && 
        !k.startsWith("ath_grip_") && 
        !k.startsWith("ath_lat_") && 
        !k.startsWith("ath_sprint_") && 
        !k.startsWith("ath_shuttle_") && 
        !k.startsWith("ath_blazepod_") && 
        !k.startsWith("ath_medball_")
      ) {
        if (!scores[k]) scores[k] = v;
      }
    });
  }
  return scores;
}

/**
 * Generates and downloads the comprehensive Player Evaluation PDF Dossier with all diagrams
 */
export async function generatePlayerEvaluationPDF(
  data: PlayerPdfExportData,
  returnBlobOnly = false
): Promise<{ blob: Blob; filename: string } | void> {
  const { jsPDF } = await import("jspdf");
  const logoBase64 = await loadLogoBase64(data.clubLogoUrl);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // ~182mm
  const footerMargin = 12;

  let currentY = margin;

  // Basic Filtered Datasets for the player
  const playerAbsences = data.absences.filter(a => a.playerId === data.player.id);
  const playerEvaluations = data.evaluations.filter(e => e.playerId === data.player.id);
  const exerciseMap = new Map((data.exercises || []).map(ex => [ex.id, ex]));

  // Group training plans count & attendance
  const groupPlans = (data.savedPlans || []).filter(p => {
    return p.targetGroup === data.group.name || (p as any).groupId === data.group.id;
  });
  const totalGroupPlans = groupPlans.length;

  const normalizeDateToYMD = (dateStr?: string | null): string | null => {
    if (!dateStr) return null;
    const clean = dateStr.trim().replace(/\s*\([AB\d]+\)$/, "").trim().split("T")[0].split(" ")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const deMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (deMatch) {
      return `${deMatch[3]}-${deMatch[2].padStart(2, "0")}-${deMatch[1].padStart(2, "0")}`;
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? clean.slice(0, 10) : d.toISOString().substring(0, 10);
  };

  const isAbsentOnPlan = (plan: any): boolean => {
    const planDateStr = (plan.date || plan.planDate || "").trim();
    if (!planDateStr) return false;
    const pYMD = normalizeDateToYMD(planDateStr);
    if (!pYMD) return false;

    return playerAbsences.some(abs => {
      if (!abs.startDate) return false;
      const startYMD = normalizeDateToYMD(abs.startDate);
      const endYMD = normalizeDateToYMD(abs.endDate || abs.startDate);
      if (!startYMD) return false;
      const effectiveEndYMD = endYMD || startYMD;
      return pYMD >= startYMD && pYMD <= effectiveEndYMD;
    });
  };

  const attendedPlansCount = groupPlans.filter(p => !isAbsentOnPlan(p)).length;
  const missedPlansCount = groupPlans.filter(p => isAbsentOnPlan(p)).length;
  const attendanceRate = totalGroupPlans > 0 
    ? Math.max(0, Math.min(100, (attendedPlansCount / totalGroupPlans) * 100))
    : 100;

  // Match playtime calculation (Spielzeit in Minuten)
  const mainTeam = data.player.mainTeam?.trim();
  const playerMatches = (data.matchPlaytimes || []).filter(m => {
    if (mainTeam) {
      return m.team === mainTeam;
    }
    const inGroup = m.groupId === data.group.id;
    const hasMinutes = m.playerMinutes && m.playerMinutes[data.player.id] !== undefined;
    const hasGrade = m.playerGrades && m.playerGrades[data.player.id] !== undefined;
    return inGroup || hasMinutes || hasGrade;
  });

  let totalPlayedMins = 0;
  let totalPossibleMins = 0;
  playerMatches.forEach(m => {
    const mins = Number(m.playerMinutes?.[data.player.id] ?? 0);
    totalPlayedMins += mins;
    const matchTotalFilledMins = Object.values(m.playerMinutes || {}).reduce((sum, v) => sum + Math.max(0, Number(v) || 0), 0);
    const maxMinsInMatch = matchTotalFilledMins > 0 ? matchTotalFilledMins : mins;
    totalPossibleMins += maxMinsInMatch;
  });

  // Calculate high-level summary scores (using latest evaluation per category, strictly on 1.0 to 5.0 scale)
  const playerBirthYearNum = typeof data.player.birthYear === "number"
    ? data.player.birthYear
    : (data.player.birthYear ? parseInt(String(data.player.birthYear), 10) || undefined : undefined);

  const categoryAverages: number[] = [];

  (["Technik", "Taktik", "Mental", "Athletik"] as const).forEach(cat => {
    const catEvals = playerEvaluations
      .filter(e => e.category === cat)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    const latest = catEvals[0];
    if (!latest) return;

    if (cat === "Athletik") {
      const latestAth = catEvals.find(e => e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean));
      if (!latestAth) return;

      const athDate = latestAth.athleticMetrics?.testDate || latestAth.updatedAt;
      const matchedBio = getClosestBiologicalEvaluation(playerEvaluations, data.player.id, athDate)?.biologicalMetrics;

      const calculatedResult = evaluateAllAthleticTests(
        latestAth.athleticMetrics,
        matchedBio,
        playerBirthYearNum
      );
      const validItemScores = calculatedResult.items
        .map(i => i.score)
        .filter((s): s is number => typeof s === "number" && s > 0);

      if (validItemScores.length > 0) {
        const avg = validItemScores.reduce((a, b) => a + b, 0) / validItemScores.length;
        categoryAverages.push(avg);
      }
    } else {
      const rawRatings = latest.ratings || {};
      const validScores = Object.entries(rawRatings)
        .filter(([k, v]) => !k.startsWith("ath_") && typeof v === "number" && v > 0)
        .map(([_, v]) => Number(v));

      if (validScores.length > 0) {
        const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
        categoryAverages.push(avg);
      }
    }
  });

  const overallAvgScore = categoryAverages.length > 0 
    ? (categoryAverages.reduce((a, b) => a + b, 0) / categoryAverages.length).toFixed(1) 
    : "–";

  // Helper for Header Banner on each page with proportional distortion-free logo embedding
  const drawHeaderBar = (isFirstPage: boolean) => {
    const bannerHeight = isFirstPage ? 28 : 15;
    doc.setFillColor(10, 15, 29); // #0a0f1d
    doc.rect(0, 0, pageWidth, bannerHeight, "F");

    // Accent line (Electric Neon/Lime Green)
    doc.setFillColor(34, 197, 94); // #22c55e
    doc.rect(0, bannerHeight, pageWidth, 1.5, "F");

    const maxLogoW = isFirstPage ? 22 : 12;
    const maxLogoH = isFirstPage ? 22 : 12;

    if (logoBase64) {
      try {
        const props = (doc as any).getImageProperties ? (doc as any).getImageProperties(logoBase64) : null;
        const aspect = (props && props.width && props.height) ? props.width / props.height : 1;
        
        let drawW = maxLogoW;
        let drawH = maxLogoW / aspect;
        if (drawH > maxLogoH) {
          drawH = maxLogoH;
          drawW = maxLogoH * aspect;
        }

        const logoX = margin + (maxLogoW - drawW) / 2;
        const logoY = (bannerHeight - drawH) / 2;
        doc.addImage(logoBase64, "PNG", logoX, logoY, drawW, drawH);
      } catch {
        doc.addImage(logoBase64, "PNG", margin, isFirstPage ? 3 : 1.5, maxLogoW, maxLogoH);
      }
    }

    if (isFirstPage) {
      const textX = logoBase64 ? margin + maxLogoW + 4 : margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("NEXTLEVEL GOALKEEPING ACADEMY", textX, 10.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(34, 197, 94);
      doc.text("SPIELERBEWERTUNG & ENTWICKLUNGSDOSSIER", textX, 16.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Torwart-Leistungsanalyse  •  ${data.player.firstName} ${data.player.lastName}`, textX, 22.0);
    } else {
      const textX = logoBase64 ? margin + maxLogoW + 4 : margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(255, 255, 255);
      doc.text(`SPIELERAUSWERTUNG: ${data.player.firstName} ${data.player.lastName.toUpperCase()} (${data.group.name})`, textX, 9.8);
    }
  };

  // Helper for page break
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - footerMargin) {
      doc.addPage();
      drawHeaderBar(false);
      currentY = 22;
    }
  };

  // Section Header Drawing Helper (Clean single title bar)
  const drawSectionHeader = (title: string) => {
    checkPageBreak(13);
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.roundedRect(margin, currentY, contentWidth, 7.5, 1.8, 1.8, "F");

    // Accent line on left of title bar
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(margin, currentY, 2.8, 7.5, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 5.5, currentY + 5.0);
    currentY += 10.5;
  };

  // Unified Radar Card Drawer: Renders card background, title, and radar chart with generous spacing
  const drawPdfRadarCard = (
    cardX: number,
    cardY: number,
    cardW: number,
    cardH: number,
    radius: number,
    axes: Array<{ key: string; label: string; shortLabel?: string; group?: string }>,
    seriesList: Array<{
      name: string;
      color: [number, number, number];
      data: Record<string, number>;
    }>,
    title: string
  ) => {
    if (axes.length < 3) return;

    // Card Container
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, "FD");

    // Card Title (No subtitle)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(title, cardX + cardW / 2, cardY + 6.0, { align: "center" });

    // Radar Center coordinates
    const cx = cardX + cardW / 2;
    const topMargin = axes.length >= 25 ? 12.0 : 8.5;
    const cy = cardY + 7.5 + topMargin + radius;

    const angleStep = (2 * Math.PI) / axes.length;
    const maxValue = 5;
    const levels = 5;

    // Draw background concentric polygon rings
    for (let lvl = levels; lvl >= 1; lvl--) {
      const rLvl = (lvl / levels) * radius;
      const pts: [number, number][] = [];

      for (let i = 0; i < axes.length; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        const px = cx + rLvl * Math.cos(angle);
        const py = cy + rLvl * Math.sin(angle);
        pts.push([px, py]);
      }

      if (lvl % 2 === 1) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);

      for (let p = 0; p < pts.length; p++) {
        const next = pts[(p + 1) % pts.length];
        doc.line(pts[p][0], pts[p][1], next[0], next[1]);
      }

      // Tick number
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.0);
      doc.setTextColor(148, 163, 184);
      doc.text(`${lvl}`, cx + 0.8, cy - rLvl + 1.8);
    }

    // Draw radial spoke lines
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    for (let i = 0; i < axes.length; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const ex = cx + radius * Math.cos(angle);
      const ey = cy + radius * Math.sin(angle);
      doc.line(cx, cy, ex, ey);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Staggered positioning
      let dist = radius + 3.2;
      let align: "left" | "center" | "right" = "center";

      if (axes.length >= 25) {
        if (i === 0) { // Top Center (-90°)
          dist = radius + 7.5;
          align = "center";
        } else if (i === 1) { // -78°
          dist = radius + 3.0;
          align = "left";
        } else if (i === 2) { // -66°
          dist = radius + 6.8;
          align = "left";
        } else if (i === 29) { // -102° (Top Left)
          dist = radius + 3.0;
          align = "right";
        } else if (i === 28) { // -114°
          dist = radius + 6.8;
          align = "right";
        } else if (i === 13) { // 66°
          dist = radius + 3.0;
          align = "left";
        } else if (i === 14) { // 78°
          dist = radius + 7.5;
          align = "left";
        } else if (i === 15) { // 90° (Bottom Center)
          dist = radius + 3.2;
          align = "center";
        } else if (i === 16) { // 102°
          dist = radius + 7.5;
          align = "right";
        } else if (i === 17) { // 114°
          dist = radius + 3.0;
          align = "right";
        } else {
          if (cos > 0.15) align = "left";
          else if (cos < -0.15) align = "right";
          else align = "center";
        }
      } else {
        if (cos > 0.25) align = "left";
        else if (cos < -0.25) align = "right";
        else align = "center";
      }

      const lx = cx + dist * cos;
      const rawLabel = axes[i].shortLabel || axes[i].label || axes[i].key;
      const maxCharsPerLine = axes.length > 20 ? 14 : (axes.length > 10 ? 17 : 20);
      const lines = splitLabelIntoLines(rawLabel, maxCharsPerLine);

      doc.setFont("helvetica", "bold");
      const fontSize = axes.length > 20 ? 4.6 : (axes.length > 12 ? 5.4 : 6.0);
      doc.setFontSize(fontSize);
      doc.setTextColor(51, 65, 85);

      const lineHeight = axes.length > 20 ? 1.9 : 2.4;

      if (lines.length === 1) {
        let ly = cy + dist * sin;
        if (sin > 0.6) ly += 1.6;
        else if (sin < -0.6) ly -= 0.6;
        else ly += 0.8;
        doc.text(lines[0], lx, ly, { align });
      } else {
        let ly1 = cy + dist * sin;
        if (sin < -0.45) {
          ly1 -= (lineHeight + 0.8);
        } else if (sin > 0.45) {
          ly1 += 1.0;
        } else {
          ly1 -= (lineHeight / 2 - 0.4);
        }
        doc.text(lines[0], lx, ly1, { align });
        doc.text(lines[1], lx, ly1 + lineHeight, { align });
      }
    }

    // Draw Series Polygons
    seriesList.forEach(s => {
      const sPts: [number, number][] = [];
      axes.forEach((axis, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const val = Math.max(0, Math.min(maxValue, s.data[axis.key] || 0));
        const rVal = (val / maxValue) * radius;
        const px = cx + rVal * Math.cos(angle);
        const py = cy + rVal * Math.sin(angle);
        sPts.push([px, py]);
      });

      // Draw stroke lines
      doc.setDrawColor(s.color[0], s.color[1], s.color[2]);
      doc.setLineWidth(0.65);
      for (let p = 0; p < sPts.length; p++) {
        const next = sPts[(p + 1) % sPts.length];
        doc.line(sPts[p][0], sPts[p][1], next[0], next[1]);
      }

      // Draw vertex circles
      sPts.forEach(([px, py], pIdx) => {
        const val = s.data[axes[pIdx].key] || 0;
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.circle(px, py, 0.8, "F");

        if (seriesList.length === 1 && val > 0 && axes.length <= 16) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(4.8);
          doc.setTextColor(s.color[0], s.color[1], s.color[2]);
          doc.text(`${val.toFixed(1)}`, px, py - 1.4, { align: "center" });
        }
      });
    });

    // Legend underneath the chart
    if (seriesList.length > 0) {
      const legY = cardY + cardH - 4.5;
      const legStartX = cx - (seriesList.length * 34) / 2;

      seriesList.forEach((s, sIdx) => {
        const lX = legStartX + sIdx * 36;
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.circle(lX + 1.5, legY - 0.6, 1.2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.0);
        doc.setTextColor(s.color[0], s.color[1], s.color[2]);
        doc.text(s.name, lX + 4.0, legY);
      });
    }
  };

  // --------------------------------------------------------------------------
  // PAGE 1: START & META CARD
  // --------------------------------------------------------------------------
  drawHeaderBar(true);
  currentY = 34;

  // Player Meta Card
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(margin, currentY, contentWidth, 24, 2.5, 2.5, "FD");

  // Player Name & Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  const jerseyStr = data.player.jerseyNumber ? ` #${data.player.jerseyNumber}` : "";
  doc.text(`${data.player.firstName} ${data.player.lastName}${jerseyStr}`, margin + 5, currentY + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Trainingsgruppe: ${data.group.name}`, margin + 5, currentY + 13.5);
  doc.text(`Jahrgang: ${data.player.birthYear || "–"}   •   Erfasst: ${new Date().toLocaleDateString("de-DE")}`, margin + 5, currentY + 19);

  // 4 KPI Summary Pill Cards on the right side
  const playtimeStr = totalPossibleMins > 0
    ? `${totalPlayedMins} min von max. ${totalPossibleMins} min`
    : `${totalPlayedMins} min Spielzeit`;

  const kpiList = [
    { label: "ANWESENHEIT", val: `${attendanceRate.toFixed(0)}%`, color: [16, 185, 129] },
    { label: "FEHLZEITEN", val: `${missedPlansCount > 0 ? missedPlansCount : playerAbsences.length}x`, color: (missedPlansCount > 0 || playerAbsences.length > 0) ? [245, 158, 11] : [100, 116, 139] },
    { label: "SPIELZEIT IN MINUTEN", val: playtimeStr, color: [14, 165, 233] },
    { label: "Ø GESAMTSCORE", val: `${overallAvgScore} / 5`, color: [168, 85, 247] }
  ];

  const kpiBoxWidths = [24, 22, 42, 24]; // Give Spielzeit wider space
  const totalKpiWidth = kpiBoxWidths.reduce((a, b) => a + b, 0) + (kpiBoxWidths.length - 1) * 2;
  const kpiStartX = pageWidth - margin - totalKpiWidth - 4;
  const kpiBoxHeight = 18;

  let currentKpiX = kpiStartX;
  kpiList.forEach((kpi, idx) => {
    const w = kpiBoxWidths[idx];
    const kpiY = currentY + 3;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(currentKpiX, kpiY, w, kpiBoxHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.2);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, currentKpiX + w / 2, kpiY + 5.2, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(idx === 2 ? 6.5 : 9.0);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, currentKpiX + w / 2, kpiY + (idx === 2 ? 12.5 : 13.5), { align: "center" });

    currentKpiX += w + 2;
  });

  currentY += 28;

  // ==========================================================================
  // 1. ÜBERSCHRIFT: "Vergangenes Feedback"
  // ==========================================================================
  checkPageBreak(35);
  drawSectionHeader("1. Vergangenes Feedback");

  const playerFeedbackTalks = (data.feedbackTalks || [])
    .filter(t => t.playerId === data.player.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (playerFeedbackTalks.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 14, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Bisher wurden noch keine Feedbackgespräche für diesen Torhüter in der Dateneingabe dokumentiert.", margin + 4, currentY + 8.5);
    currentY += 18;
  } else {
    playerFeedbackTalks.forEach(talk => {
      checkPageBreak(32);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, contentWidth, 25, 2, 2, "FD");

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, currentY, contentWidth, 6.5, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const dFormatted = new Date(talk.date).toLocaleDateString("de-DE");
      doc.text(`Gesprächsdatum: ${dFormatted}`, margin + 3.5, currentY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      const trainerStr = `Trainer: ${talk.trainer1}${talk.trainer2 ? ` & ${talk.trainer2}` : ""}`;
      doc.text(trainerStr, margin + contentWidth - 3.5, currentY + 4.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(16, 185, 129);
      doc.text("• Zentrale Eckpunkte & Vereinbarungen:", margin + 3.5, currentY + 10.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      const splitText = doc.splitTextToSize(talk.keyPoints || "Keine Notizen", contentWidth - 8);
      doc.text(splitText.slice(0, 3), margin + 3.5, currentY + 14.5);

      currentY += 28;
    });
  }

  // ==========================================================================
  // 2. ÜBERSCHRIFT: "Abwesenheiten"
  // ==========================================================================
  checkPageBreak(46);
  drawSectionHeader("2. Abwesenheiten");

  // 2.1 Diagramm: Risikomatrix & Belastungsschwere (Injury Burden)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 44, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text("Diagramm 1: Risikomatrix & Belastungsschwere (Injury Burden)", margin + 4, currentY + 5.5);

  const injuryGroupMap: Record<string, {
    key: string;
    reason: AbsenceReason;
    bodyPart?: string;
    count: number;
    totalDays: number;
  }> = {};

  playerAbsences.forEach(abs => {
    const key = abs.injuredBodyPart ? `${abs.reason} (${abs.injuredBodyPart})` : abs.reason;
    const days = getAbsenceDurationDays(abs);
    if (!injuryGroupMap[key]) {
      injuryGroupMap[key] = {
        key,
        reason: abs.reason,
        bodyPart: abs.injuredBodyPart,
        count: 0,
        totalDays: 0
      };
    }
    injuryGroupMap[key].count += 1;
    injuryGroupMap[key].totalDays += days;
  });

  const injuryList = Object.values(injuryGroupMap).map(g => ({
    ...g,
    avgDays: g.count > 0 ? g.totalDays / g.count : 0
  })).sort((a, b) => b.totalDays - a.totalDays);

  if (injuryList.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin + 4, currentY + 11, contentWidth - 8, 26, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52);
    doc.text("Hervorragende Belastbarkeit & Präsenz: Keine Fehlzeiten oder Verletzungen dokumentiert (100% Verfügbarkeit).", margin + 8, currentY + 25);
  } else {
    const plotX = margin + 12;
    const plotY = currentY + 11;
    const plotW = 75;
    const plotH = 26;

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
    doc.line(plotX, plotY, plotX, plotY + plotH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Häufigkeit (Vorfälle) →", plotX + plotW - 20, plotY + plotH + 3.5);
    doc.text("↑ Ø Tage", plotX - 9, plotY + 4);

    const maxCount = Math.max(3, ...injuryList.map(i => i.count));
    const maxAvgDays = Math.max(14, ...injuryList.map(i => i.avgDays));

    injuryList.slice(0, 5).forEach(item => {
      const bx = plotX + (item.count / maxCount) * (plotW - 10) + 4;
      const by = plotY + plotH - (item.avgDays / maxAvgDays) * (plotH - 8) - 4;
      const rgb = REASON_COLORS[item.reason] || REASON_COLORS["Sonstiges"];
      const r = Math.min(6, Math.max(2.2, Math.sqrt(item.totalDays) * 1.1));

      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.circle(bx, by, r, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(`${item.totalDays}d`, bx + r + 1, by + 1);
    });

    const listStartX = margin + plotW + 18;
    const listW = contentWidth - plotW - 22;
    let cardY = currentY + 11;

    injuryList.slice(0, 3).forEach(item => {
      const rgb = REASON_COLORS[item.reason] || REASON_COLORS["Sonstiges"];
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(listStartX, cardY, listW, 8.5, 1.5, 1.5, "FD");

      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.circle(listStartX + 3.5, cardY + 4.2, 1.6, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${item.key}: ${item.count}x (${item.avgDays.toFixed(1)} Ø-Tage)`, listStartX + 7, cardY + 4.0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(`${item.totalDays} Tage Ausfall`, listStartX + listW - 3, cardY + 4.0, { align: "right" });

      cardY += 9.5;
    });
  }

  currentY += 48;

  // 2.2 Diagramm: Themen der Trainingseinheiten & 2.3 Diagramm: Techniken (Phase Analytisch)
  checkPageBreak(56);

  const themeMap: Record<string, { groupTotal: number; playerAttended: number }> = {};
  groupPlans.forEach(plan => {
    const isAbsent = isAbsentOnPlan(plan);
    let rawTitle = (plan.title || plan.planTitle || "").trim();
    let cleanTitle = rawTitle.replace(/\s*\([AB\d]+\)$/, "").trim();
    const themeName = (cleanTitle && cleanTitle.toLowerCase() !== "offen" && cleanTitle.toLowerCase() !== "torwart-trainingseinheit")
      ? cleanTitle
      : "Torwart-Spezifisch";

    if (!themeMap[themeName]) {
      themeMap[themeName] = { groupTotal: 0, playerAttended: 0 };
    }
    themeMap[themeName].groupTotal += 1;
    if (!isAbsent) {
      themeMap[themeName].playerAttended += 1;
    }
  });

  const sortedThemes = Object.entries(themeMap).map(([theme, stats]) => ({
    theme,
    groupTotal: stats.groupTotal,
    playerAttended: stats.playerAttended,
    pct: stats.groupTotal > 0 ? (stats.playerAttended / stats.groupTotal) * 100 : 100
  })).sort((a, b) => b.groupTotal - a.groupTotal);

  const techMap: Record<string, { groupTotal: number; playerAttended: number; groupKey: string }> = {};
  groupPlans.forEach(plan => {
    const planPhases = plan.phaseExercises || plan.phases || {};
    const customExercises = plan.customPlanExercises || {};
    const isAbsent = isAbsentOnPlan(plan);
    const planTechs = new Set<string>();

    Object.entries(planPhases).forEach(([_phaseId, exIds]) => {
      (exIds || []).forEach(exId => {
        const ex = customExercises[exId] || exerciseMap.get(exId);
        if (!ex) return;
        const isAnalytic = ex.category === "Analytisch" || Boolean(ex.technik);
        if (isAnalytic) {
          let tName = (ex.technik || "").trim();
          if (!tName && ex.title && ex.title.startsWith("Analytisch: ")) {
            tName = ex.title.replace("Analytisch: ", "").trim();
          }
          if (tName) planTechs.add(tName);
        }
      });
    });

    planTechs.forEach(tName => {
      if (!techMap[tName]) {
        const skillDef = SKILL_DEFINITIONS.Technik.find(s => s.name === tName);
        techMap[tName] = { groupTotal: 0, playerAttended: 0, groupKey: skillDef?.group || "Basistechniken" };
      }
      techMap[tName].groupTotal += 1;
      if (!isAbsent) {
        techMap[tName].playerAttended += 1;
      }
    });
  });

  const sortedTechs = Object.entries(techMap).map(([tech, stats]) => ({
    tech,
    groupKey: stats.groupKey,
    groupTotal: stats.groupTotal,
    playerAttended: stats.playerAttended,
    pct: stats.groupTotal > 0 ? (stats.playerAttended / stats.groupTotal) * 100 : 100
  })).sort((a, b) => b.groupTotal - a.groupTotal);

  const halfWidth = (contentWidth - 5) / 2;

  // Box Left: Themen der Trainingseinheiten
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, halfWidth, 52, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text("Diagramm 2: Themen der Trainingseinheiten", margin + 3.5, currentY + 5.5);

  let barY = currentY + 9.5;
  if (sortedThemes.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text("Noch keine thematischen Trainingseinheiten erfasst.", margin + 3.5, barY + 6);
  } else {
    sortedThemes.slice(0, 5).forEach(th => {
      const maxBarW = halfWidth - 32;
      const fillW = maxBarW * (th.pct / 100);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(51, 65, 85);
      const thLabel = th.theme.length > 20 ? th.theme.substring(0, 19) + "…" : th.theme;
      doc.text(thLabel, margin + 3.5, barY + 3.0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(16, 185, 129);
      doc.text(`${th.playerAttended}/${th.groupTotal}`, margin + halfWidth - 3.5, barY + 3.0, { align: "right" });

      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin + 3.5, barY + 4.2, maxBarW, 3.2, 1, 1, "F");

      doc.setFillColor(16, 185, 129);
      doc.roundedRect(margin + 3.5, barY + 4.2, Math.max(2, fillW), 3.2, 1, 1, "F");

      barY += 8.2;
    });
  }

  // Box Right: Techniken (Phase Analytisch)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + halfWidth + 5, currentY, halfWidth, 52, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text("Diagramm 3: Techniken (Phase Analytisch)", margin + halfWidth + 8.5, currentY + 5.5);

  let techBarY = currentY + 9.5;
  if (sortedTechs.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text("Noch keine analytischen Techniken in Plänen absolviert.", margin + halfWidth + 8.5, techBarY + 6);
  } else {
    sortedTechs.slice(0, 5).forEach(tc => {
      const maxBarW = halfWidth - 32;
      const fillW = maxBarW * (tc.pct / 100);
      const rgb = TECH_GROUP_RGB[tc.groupKey] || [14, 165, 233];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(51, 65, 85);
      const tcLabel = tc.tech.length > 20 ? tc.tech.substring(0, 19) + "…" : tc.tech;
      doc.text(tcLabel, margin + halfWidth + 8.5, techBarY + 3.0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(`${tc.playerAttended}/${tc.groupTotal}`, margin + contentWidth - 3.5, techBarY + 3.0, { align: "right" });

      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin + halfWidth + 8.5, techBarY + 4.2, maxBarW, 3.2, 1, 1, "F");

      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(margin + halfWidth + 8.5, techBarY + 4.2, Math.max(2, fillW), 3.2, 1, 1, "F");

      techBarY += 8.2;
    });
  }

  currentY += 58;

  // ==========================================================================
  // 3. ÜBERSCHRIFT: "Spielzeiten"
  // ==========================================================================
  checkPageBreak(75);
  drawSectionHeader(mainTeam ? `3. Spielzeiten (${mainTeam})` : "3. Spielzeiten");

  const playerMatchList = (data.matchPlaytimes || [])
    .filter(m => {
      if (mainTeam) {
        return m.team === mainTeam;
      }
      const isGroupMatch = m.groupId === data.group.id || (m as any).trainingGroupId === data.group.id;
      const hasMinutes = (m.playerMinutes?.[data.player.id] ?? 0) > 0;
      const onBench = Boolean(m.playerBenchStatus?.[data.player.id]);
      const hasGrade = m.playerGrades?.[data.player.id] !== undefined;
      return isGroupMatch || hasMinutes || onBench || hasGrade;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const matchBreakdowns = playerMatchList.map(m => {
    const playedMins = Math.max(0, m.playerMinutes?.[data.player.id] ?? 0);
    const isExplicitBench = Boolean(m.playerBenchStatus?.[data.player.id]);
    const matchTotalFilledMins = Object.values(m.playerMinutes || {}).reduce((sum, v) => sum + Math.max(0, Number(v) || 0), 0);
    const matchDuration = matchTotalFilledMins > 0 ? matchTotalFilledMins : playedMins;
    const grade = m.playerGrades?.[data.player.id];

    let benchMins = 0;
    let outMins = 0;
    let statusType: 'FULL_PLAY' | 'PARTIAL_PLAY_AND_BENCH' | 'FULL_BENCH' | 'OUT_OF_SQUAD' = 'OUT_OF_SQUAD';

    if (matchDuration > 0) {
      if (playedMins >= matchDuration) {
        statusType = 'FULL_PLAY';
      } else if (playedMins > 0) {
        benchMins = Math.max(0, matchDuration - playedMins);
        statusType = 'PARTIAL_PLAY_AND_BENCH';
      } else if (isExplicitBench) {
        benchMins = matchDuration;
        statusType = 'FULL_BENCH';
      } else {
        outMins = matchDuration;
        statusType = 'OUT_OF_SQUAD';
      }
    } else {
      if (isExplicitBench) {
        statusType = 'FULL_BENCH';
      } else {
        statusType = 'OUT_OF_SQUAD';
      }
    }

    return {
      match: m,
      matchDuration,
      playedMins,
      benchMins,
      outMins,
      statusType,
      grade
    };
  });

  const secPlayedMins = matchBreakdowns.reduce((sum, b) => sum + b.playedMins, 0);
  const secBenchMins = matchBreakdowns.reduce((sum, b) => sum + b.benchMins, 0);
  const secOutOfSquadMins = matchBreakdowns.reduce((sum, b) => sum + b.outMins, 0);
  const secPossibleMins = matchBreakdowns.reduce((sum, b) => sum + b.matchDuration, 0);

  const secPlaytimePct = secPossibleMins > 0 ? (secPlayedMins / secPossibleMins) * 100 : 0;
  const secBenchPct = secPossibleMins > 0 ? (secBenchMins / secPossibleMins) * 100 : 0;
  const secOutPct = secPossibleMins > 0 ? (secOutOfSquadMins / secPossibleMins) * 100 : 0;

  const inSquadMatchesCount = matchBreakdowns.filter(b => b.statusType !== 'OUT_OF_SQUAD').length;
  const gradedMatches = matchBreakdowns.filter(b => b.grade !== undefined);
  const avgGrade = gradedMatches.length > 0
    ? (gradedMatches.reduce((s, b) => s + (b.grade || 0), 0) / gradedMatches.length).toFixed(1)
    : null;

  if (matchBreakdowns.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 14, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Bisher wurden noch keine Spielzeiten oder Einsätze für diesen Torhüter in der Dateneingabe erfasst.", margin + 4, currentY + 8.5);
    currentY += 18;
  } else {
    // 4 KPI Summary Cards (Exakt wie in der UI der spielerbezogenen Auswertung)
    const kpiGap = 3.5;
    const kpiW = (contentWidth - 3 * kpiGap) / 4;
    const kpiH = 15;

    // KPI 1: Einsatzminuten
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, kpiW, kpiH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("EINSATZMINUTEN", margin + 2.5, currentY + 3.8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`${secPlayedMins}' Min.`, margin + 2.5, currentY + 8.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text(secPossibleMins > 0 ? `${secPlaytimePct.toFixed(0)} % der Spielzeit` : "–", margin + 2.5, currentY + 13.0);

    // KPI 2: Bankspielzeit
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin + kpiW + kpiGap, currentY, kpiW, kpiH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("BANKSPIELZEIT", margin + kpiW + kpiGap + 2.5, currentY + 3.8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(245, 158, 11); // Amber
    doc.text(`${secBenchMins}' Min.`, margin + kpiW + kpiGap + 2.5, currentY + 8.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text(`${secBenchPct.toFixed(0)} % (${inSquadMatchesCount}x im Kader)`, margin + kpiW + kpiGap + 2.5, currentY + 13.0);

    // KPI 3: Nicht im Kader / Gesamt möglich
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin + (kpiW + kpiGap) * 2, currentY, kpiW, kpiH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(secOutOfSquadMins > 0 ? "NICHT IM KADER" : "GESAMT MÖGLICH", margin + (kpiW + kpiGap) * 2 + 2.5, currentY + 3.8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(100, 116, 139); // Slate
    doc.text(secOutOfSquadMins > 0 ? `${secOutOfSquadMins}' Min.` : `${secPossibleMins}' Min.`, margin + (kpiW + kpiGap) * 2 + 2.5, currentY + 8.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text(secOutOfSquadMins > 0 ? `${secOutPct.toFixed(0)} % Ausfall/Pause` : `${matchBreakdowns.length} Spiele (100% im Kader)`, margin + (kpiW + kpiGap) * 2 + 2.5, currentY + 13.0);

    // KPI 4: Notenschnitt
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin + (kpiW + kpiGap) * 3, currentY, kpiW, kpiH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("NOTENSCHNITT", margin + (kpiW + kpiGap) * 3 + 2.5, currentY + 3.8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(13, 148, 136); // Teal
    doc.text(avgGrade ? `Note ${avgGrade}` : "–", margin + (kpiW + kpiGap) * 3 + 2.5, currentY + 8.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(71, 85, 105);
    doc.text(`${gradedMatches.length} bewertete Einsätze`, margin + (kpiW + kpiGap) * 3 + 2.5, currentY + 13.0);

    currentY += kpiH + 4;

    // Two side-by-side cards: Donut chart left & Leistungsverlauf right
    const halfW = (contentWidth - 5) / 2;
    const boxH = 58;

    // Box Left: Kreisdiagramm - Spielzeit-Verteilung & Quote (Exakt wie im UI)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, halfW, boxH, 2, 2, "FD");

    // Header Badge: "KREISDIAGRAMM"
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin + 3.5, currentY + 2.8, 18, 3.4, 0.8, 0.8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.2);
    doc.setTextColor(5, 150, 105);
    doc.text("KREISDIAGRAMM", margin + 12.5, currentY + 5.2, { align: "center" });

    // Header Title & Subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text("Spielzeit-Verteilung & Quote", margin + 23.5, currentY + 5.4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.2);
    doc.setTextColor(100, 116, 139);
    doc.text("Verhältnis von aktiver Einsatzzeit, Bankzeit und Nicht im Kader.", margin + 3.5, currentY + 8.4);

    // Subtle header divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 3.5, currentY + 10.0, margin + halfW - 3.5, currentY + 10.0);

    // Draw Vector Donut Chart (Disjunkte Segmente: Einsatz, Bank, Nicht im Kader)
    const donutCx = margin + halfW / 2;
    const donutCy = currentY + 23.5;
    const outerR = 12.0;
    const innerR = 8.0;

    const segments = [
      { key: "played", pct: secPlaytimePct, color: [16, 185, 129] as [number, number, number] },
      { key: "bench", pct: secBenchPct, color: [245, 158, 11] as [number, number, number] },
      { key: "out", pct: secOutPct, color: [100, 116, 139] as [number, number, number] }
    ].filter(s => s.pct > 0.05);

    if (segments.length === 0) {
      doc.setFillColor(226, 232, 240);
      doc.circle(donutCx, donutCy, outerR, "F");
      doc.setFillColor(248, 250, 252);
      doc.circle(donutCx, donutCy, innerR, "F");
    } else {
      let currentAngle = -Math.PI / 2;
      segments.forEach(seg => {
        const sliceAngle = (seg.pct / 100) * 2 * Math.PI;
        const startA = currentAngle;
        const endA = currentAngle + sliceAngle;
        currentAngle = endA;

        const steps = Math.max(6, Math.ceil(sliceAngle / 0.1));
        const pts: [number, number][] = [];
        for (let s = 0; s <= steps; s++) {
          const a = startA + (s / steps) * (endA - startA);
          pts.push([donutCx + outerR * Math.cos(a), donutCy + outerR * Math.sin(a)]);
        }
        for (let s = steps; s >= 0; s--) {
          const a = startA + (s / steps) * (endA - startA);
          pts.push([donutCx + innerR * Math.cos(a), donutCy + innerR * Math.sin(a)]);
        }

        doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
        for (let i = 1; i < pts.length - 1; i++) {
          doc.triangle(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "F");
        }
      });

      // Inner circle hole to ensure crisp donut center
      doc.setFillColor(248, 250, 252);
      doc.circle(donutCx, donutCy, innerR, "F");
    }

    // Center text in Donut (Exakt wie im UI)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(3.8);
    doc.setTextColor(100, 116, 139);
    doc.text("EINSATZQUOTE", donutCx, donutCy - 2.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`${secPlaytimePct.toFixed(0)} %`, donutCx, donutCy + 0.8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(3.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${secPlayedMins}' / ${secPossibleMins}' Min.`, donutCx, donutCy + 3.6, { align: "center" });

    // Donut Legend below in structured UI capsule badges
    const legCapsuleW = halfW - 7;
    const legCapsuleH = 4.4;

    // Row 1: Einsatz
    const legY1 = currentY + 38.0;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin + 3.5, legY1, legCapsuleW, legCapsuleH, 1.0, 1.0, "FD");
    doc.setFillColor(16, 185, 129);
    doc.circle(margin + 6.0, legY1 + 2.2, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.6);
    doc.setTextColor(51, 65, 85);
    doc.text("Einsatz:", margin + 8.5, legY1 + 3.0);
    doc.setTextColor(16, 185, 129);
    doc.text(`${secPlayedMins}' Min. (${secPlaytimePct.toFixed(0)}%)`, margin + halfW - 5.5, legY1 + 3.0, { align: "right" });

    // Row 2: Bank
    const legY2 = currentY + 43.6;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin + 3.5, legY2, legCapsuleW, legCapsuleH, 1.0, 1.0, "FD");
    doc.setFillColor(245, 158, 11);
    doc.circle(margin + 6.0, legY2 + 2.2, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.6);
    doc.setTextColor(51, 65, 85);
    doc.text("Bank:", margin + 8.5, legY2 + 3.0);
    doc.setTextColor(245, 158, 11);
    doc.text(`${secBenchMins}' Min. (${secBenchPct.toFixed(0)}%)`, margin + halfW - 5.5, legY2 + 3.0, { align: "right" });

    // Row 3: Nicht im Kader
    const legY3 = currentY + 49.2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin + 3.5, legY3, legCapsuleW, legCapsuleH, 1.0, 1.0, "FD");
    doc.setFillColor(100, 116, 139);
    doc.circle(margin + 6.0, legY3 + 2.2, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.6);
    doc.setTextColor(51, 65, 85);
    doc.text("Nicht im Kader:", margin + 8.5, legY3 + 3.0);
    doc.setTextColor(100, 116, 139);
    doc.text(`${secOutOfSquadMins}' Min. (${secOutPct.toFixed(0)}%)`, margin + halfW - 5.5, legY3 + 3.0, { align: "right" });

    // Box Right: Diagramm 2: Leistungsverlauf (Notenentwicklung 1–6)
    const rightBoxX = margin + halfW + 5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightBoxX, currentY, halfW, boxH, 2, 2, "FD");

    // Header Badge: "LEISTUNGSVERLAUF"
    doc.setFillColor(204, 251, 241);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(rightBoxX + 3.5, currentY + 2.8, 20, 3.4, 0.8, 0.8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.0);
    doc.setTextColor(13, 148, 136);
    doc.text("LEISTUNGSVERLAUF", rightBoxX + 13.5, currentY + 5.2, { align: "center" });

    // Header Title & Subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text("Notenverlauf der Einsätze", rightBoxX + 25.0, currentY + 5.4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.2);
    doc.setTextColor(100, 116, 139);
    doc.text("Entwicklung der Spieltagsnoten (1 = Sehr gut bis 6 = Ungenügend).", rightBoxX + 3.5, currentY + 8.4);

    if (avgGrade) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(rightBoxX + halfW - 14.5, currentY + 2.8, 11, 3.4, 0.8, 0.8, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.6);
      doc.setTextColor(13, 148, 136);
      doc.text(`Ø ${avgGrade}`, rightBoxX + halfW - 9.0, currentY + 5.2, { align: "center" });
    }

    // Subtle header divider
    doc.setDrawColor(226, 232, 240);
    doc.line(rightBoxX + 3.5, currentY + 10.0, rightBoxX + halfW - 3.5, currentY + 10.0);

    // Always render the Leistungsverlauf Line Chart Grid
    const chartPadL = 9;
    const chartPadR = 7;
    const chartPadT = 13.5;
    const chartPadB = 9.0;
    const cPlotW = halfW - chartPadL - chartPadR;
    const cPlotH = boxH - chartPadT - chartPadB;
    const cPlotX = rightBoxX + chartPadL;
    const cPlotY = currentY + chartPadT;

    // Horizontal grid lines for grades 1 to 6
    [1, 2, 3, 4, 5, 6].forEach(g => {
      const gy = cPlotY + ((g - 1) / 5) * cPlotH;
      doc.setDrawColor(226, 232, 240);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(cPlotX, gy, cPlotX + cPlotW, gy);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.6);
      if (g <= 2) doc.setTextColor(16, 185, 129);
      else if (g <= 4) doc.setTextColor(100, 116, 139);
      else doc.setTextColor(244, 63, 94);
      doc.text(String(g), cPlotX - 1.5, gy + 1.2, { align: "right" });
    });
    doc.setLineDashPattern([], 0);

    if (gradedMatches.length >= 2) {
      const stepX = cPlotW / (gradedMatches.length - 1);
      const points = gradedMatches.map((b, idx) => {
        const px = cPlotX + idx * stepX;
        const py = cPlotY + (((b.grade || 3) - 1) / 5) * cPlotH;
        return { px, py, grade: b.grade || 3, date: b.match.date, opponent: b.match.opponent };
      });

      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.55);
      for (let i = 0; i < points.length - 1; i++) {
        doc.line(points[i].px, points[i].py, points[i + 1].px, points[i + 1].py);
      }
      doc.setLineWidth(0.2);

      points.forEach(p => {
        doc.setFillColor(16, 185, 129);
        doc.circle(p.px, p.py, 1.0, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(4.6);
        doc.setTextColor(16, 185, 129);
        doc.text(String(p.grade), p.px, p.py - 1.6, { align: "center" });

        // Date text below
        const dStr = p.date.substring(5).split("-").reverse().join(".");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.0);
        doc.setTextColor(100, 116, 139);
        doc.text(dStr, p.px, cPlotY + cPlotH + 4.2, { align: "center" });
      });
    } else if (gradedMatches.length === 1) {
      const singleMatch = gradedMatches[0];
      const singleGrade = singleMatch.grade || 3;
      const singlePx = cPlotX + cPlotW / 2;
      const singlePy = cPlotY + ((singleGrade - 1) / 5) * cPlotH;

      doc.setFillColor(16, 185, 129);
      doc.circle(singlePx, singlePy, 1.4, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.circle(singlePx, singlePy, 1.4, "S");
      doc.setLineWidth(0.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.0);
      doc.setTextColor(16, 185, 129);
      doc.text(`Note ${singleGrade}`, singlePx, singlePy - 2.0, { align: "center" });

      const dStr = singleMatch.match.date.split("-").reverse().join(".");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.2);
      doc.setTextColor(100, 116, 139);
      doc.text(`${dStr} (${singleMatch.match.opponent || 'Spiel'})`, singlePx, cPlotY + cPlotH + 4.5, { align: "center" });
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Noch keine bewerteten Spiele mit Schulnoten (1–6) hinterlegt.", cPlotX + cPlotW / 2, cPlotY + cPlotH / 2 + 1.5, { align: "center" });
    }

    currentY += boxH + 8;

    // Check if player has additional match minutes in other teams
    const additionalMatches = (data.matchPlaytimes || []).filter(m => {
      const mins = Number(m.playerMinutes?.[data.player.id] ?? 0);
      if (mins < 1) return false;
      if (mainTeam && m.team === mainTeam) return false;
      return true;
    });

    if (additionalMatches.length > 0) {
      const addTeamsMap: Record<string, number> = {};
      let totalAddMins = 0;
      additionalMatches.forEach(m => {
        const mins = Number(m.playerMinutes?.[data.player.id] ?? 0);
        const t = m.team || 'Anderes Team';
        addTeamsMap[t] = (addTeamsMap[t] || 0) + mins;
        totalAddMins += mins;
      });

      const teamSummaries = Object.entries(addTeamsMap)
        .sort((a, b) => b[1] - a[1])
        .map(([t, m]) => `${t}: ${m}' Min.`)
        .join("  •  ");

      checkPageBreak(16);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(margin, currentY, contentWidth, 11, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(79, 70, 229);
      doc.text(`Zusatzspielzeit in anderen Teams (${totalAddMins}' Min. Gesamt):`, margin + 3.5, currentY + 4.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.2);
      doc.setTextColor(51, 65, 85);
      doc.text(teamSummaries, margin + 3.5, currentY + 8.2);

      currentY += 15;
    }
  }

  // ==========================================================================
  // 4. ÜBERSCHRIFT: "Belastungssteuerung"
  // ==========================================================================
  checkPageBreak(95);
  drawSectionHeader("4. Belastungssteuerung");

  const seasonWorkload = calculatePlayerSeasonWorkload(
    data.player,
    data.savedPlans || [],
    data.matchPlaytimes || [],
    undefined,
    data.absences || []
  );

  const curStatusCfg = WORKLOAD_STATUS_CONFIG[seasonWorkload.currentStatus] || WORKLOAD_STATUS_CONFIG.optimal;

  // 4 KPI Summary Cards in a row
  const kpiGap = 3.5;
  const kpiW = (contentWidth - 3 * kpiGap) / 4;
  const kpiH = 15;

  // KPI 1: ACWR
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, kpiW, kpiH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("AKTUELLES ACWR", margin + 2.5, currentY + 3.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  let statusRgb: [number, number, number] = [16, 185, 129]; // Emerald
  if (seasonWorkload.currentStatus === "warning") statusRgb = [245, 158, 11]; // Amber
  else if (seasonWorkload.currentStatus === "danger") statusRgb = [244, 63, 94]; // Rose
  else if (seasonWorkload.currentStatus === "undertraining") statusRgb = [2, 132, 199]; // Sky
  doc.setTextColor(statusRgb[0], statusRgb[1], statusRgb[2]);
  doc.text(seasonWorkload.currentAcwr.toFixed(2), margin + 2.5, currentY + 8.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text(curStatusCfg.label, margin + 2.5, currentY + 13.0);

  // KPI 2: Ø Tagesbelastung
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + kpiW + kpiGap, currentY, kpiW, kpiH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Ø TAGESBELASTUNG", margin + kpiW + kpiGap + 2.5, currentY + 3.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(2, 132, 199); // Sky blue
  doc.text(`${seasonWorkload.seasonAvgDailyLoad.toLocaleString("de-DE")} A.U.`, margin + kpiW + kpiGap + 2.5, currentY + 8.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Ø ${seasonWorkload.seasonAvgWeeklyLoad.toLocaleString("de-DE")} A.U. / Wo.`, margin + kpiW + kpiGap + 2.5, currentY + 13.0);

  // KPI 3: Spitzenwert
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + (kpiW + kpiGap) * 2, currentY, kpiW, kpiH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SPITZENBELASTUNG", margin + (kpiW + kpiGap) * 2 + 2.5, currentY + 3.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(`${seasonWorkload.seasonPeakDailyAvgLoad.toLocaleString("de-DE")} A.U.`, margin + (kpiW + kpiGap) * 2 + 2.5, currentY + 8.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Peak-Woche: ${seasonWorkload.seasonPeakWeeklyLoad.toLocaleString("de-DE")} A.U.`, margin + (kpiW + kpiGap) * 2 + 2.5, currentY + 13.0);

  // KPI 4: Einsatzzeit
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + (kpiW + kpiGap) * 3, currentY, kpiW, kpiH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SAISON-EINSATZZEIT", margin + (kpiW + kpiGap) * 3 + 2.5, currentY + 3.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(13, 148, 136); // Teal
  doc.text(`${seasonWorkload.totalSeasonMinutes.toLocaleString("de-DE")} Min.`, margin + (kpiW + kpiGap) * 3 + 2.5, currentY + 8.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`${seasonWorkload.totalSeasonSessions} Train. • ${seasonWorkload.totalSeasonMatches} Spiele`, margin + (kpiW + kpiGap) * 3 + 2.5, currentY + 13.0);

  currentY += kpiH + 4;

  // Chart Container
  const chartCardH = 62;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, chartCardH, 2, 2, "FD");

  // Chart Card Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Belastungsverlauf & ACWR-Entwicklung (Saison ${seasonWorkload.seasonLabel})`, margin + 4, currentY + 5.0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Balken: Ø Tagesbelastung (A.U./Tag) • Linie: ACWR-Index • X-Achse: 52 Saisonwochen (Juli–Juni)", margin + 4, currentY + 8.2);

  // Plot Area
  const padL = 11;
  const padR = 10;
  const padT = 11.5;
  const padB = 8.5;
  const plotW = contentWidth - padL - padR; // 182 - 21 = 161 mm
  const plotH = chartCardH - padT - padB; // 62 - 20 = 42 mm
  const plotX = margin + padL;
  const plotY = currentY + padT;

  const colW = plotW / 52;
  const barW = Math.max(1.6, colW - 0.9);
  const monthW = plotW / 12;

  const peakDaily = seasonWorkload.seasonPeakDailyAvgLoad;
  const maxLoadVal = peakDaily > 0 ? Math.ceil((peakDaily * 1.25) / 50) * 50 : 400;
  const maxAcwrVal = 2.5;

  const getYLoad = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxLoadVal));
    return plotY + plotH * (1 - clamped / maxLoadVal);
  };

  const getYAcwr = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxAcwrVal));
    return plotY + plotH * (1 - clamped / maxAcwrVal);
  };

  const MONTH_SHORT = ['Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun'];

  // 12 Month sectors
  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const mLeft = plotX + mIdx * monthW;
    const isEven = mIdx % 2 === 0;

    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(mLeft, plotY, monthW, plotH, "F");
    }

    if (mIdx > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(mLeft, plotY, mLeft, plotY + plotH);
    }

    // Month Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.2);
    doc.setTextColor(100, 116, 139);
    doc.text(MONTH_SHORT[mIdx], mLeft + monthW / 2, plotY + plotH + 5.5, { align: "center" });
  }
  doc.setLineDashPattern([], 0); // reset dash

  // Sweet spot zone (0.8 - 1.3)
  const ssTop = getYAcwr(1.3);
  const ssBottom = getYAcwr(0.8);
  const ssH = ssBottom - ssTop;
  doc.setFillColor(236, 253, 245); // light emerald
  doc.rect(plotX, ssTop, plotW, ssH, "F");

  doc.setDrawColor(16, 185, 129);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(plotX, ssTop, plotX + plotW, ssTop);
  doc.line(plotX, ssBottom, plotX + plotW, ssBottom);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.setTextColor(16, 185, 129);
  doc.text("SWEET SPOT (0.8–1.3)", plotX + 1.5, ssTop + 2.5);

  // Danger line (1.5)
  const dangerY = getYAcwr(1.5);
  doc.setDrawColor(244, 63, 94); // red/rose
  doc.setLineDashPattern([1.5, 1], 0);
  doc.line(plotX, dangerY, plotX + plotW, dangerY);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.setTextColor(244, 63, 94);
  doc.text("DANGER (≥ 1.5)", plotX + 1.5, dangerY - 0.8);

  // Left Y-Axis Grid Lines & Values (Load)
  [0, 0.5, 1].forEach(pct => {
    const y = plotY + plotH * (1 - pct);
    const val = Math.round(maxLoadVal * pct);
    doc.setDrawColor(226, 232, 240);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(plotX, y, plotX + plotW, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(148, 163, 184);
    doc.text(String(val), plotX - 1.5, y + 1.2, { align: "right" });
  });
  doc.setLineDashPattern([], 0);

  // Right Y-Axis Values (ACWR)
  [0.8, 1.3, 1.5, 2.0].forEach(acwrVal => {
    const y = getYAcwr(acwrVal);
    doc.setFont("helvetica", acwrVal === 1.5 || acwrVal === 1.3 || acwrVal === 0.8 ? "bold" : "normal");
    doc.setFontSize(4.8);
    if (acwrVal === 1.5) doc.setTextColor(244, 63, 94);
    else if (acwrVal === 0.8 || acwrVal === 1.3) doc.setTextColor(16, 185, 129);
    else doc.setTextColor(148, 163, 184);
    doc.text(acwrVal.toFixed(1), plotX + plotW + 1.5, y + 1.2);
  });

  // Plot Bars (Weekly avg daily load)
  seasonWorkload.weeks.forEach(w => {
    if (w.isFuture) return;
    const bx = plotX + w.weekIndex * colW + (colW - barW) / 2;
    const by = getYLoad(w.avgDailyLoad);
    const bh = (plotY + plotH) - by;

    if (w.avgDailyLoad > 0) {
      if (w.isCurrentWeek) {
        doc.setFillColor(16, 185, 129); // emerald for current week
      } else {
        doc.setFillColor(14, 165, 233); // sky blue for past weeks
      }
      doc.rect(bx, by, barW, Math.max(0.4, bh), "F");
    }
  });

  // Plot ACWR Line (Connected active weeks)
  const activeWks = seasonWorkload.weeks.filter(w => !w.isFuture);
  if (activeWks.length >= 2) {
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.5);
    for (let i = 0; i < activeWks.length - 1; i++) {
      const w1 = activeWks[i];
      const w2 = activeWks[i + 1];
      const x1 = plotX + w1.weekIndex * colW + colW / 2;
      const y1 = getYAcwr(w1.acwr);
      const x2 = plotX + w2.weekIndex * colW + colW / 2;
      const y2 = getYAcwr(w2.acwr);
      doc.line(x1, y1, x2, y2);
    }
    doc.setLineWidth(0.2); // reset line width
  }

  // Draw ACWR Dots
  activeWks.forEach(w => {
    const cx = plotX + w.weekIndex * colW + colW / 2;
    const cy = getYAcwr(w.acwr);

    let dotColor: [number, number, number] = [16, 185, 129];
    if (w.status === "warning") dotColor = [245, 158, 11];
    else if (w.status === "danger") dotColor = [244, 63, 94];
    else if (w.status === "undertraining") dotColor = [2, 132, 199];

    doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
    doc.circle(cx, cy, w.isCurrentWeek ? 0.9 : 0.6, "F");
    if (w.isCurrentWeek) {
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.circle(cx, cy, 0.9, "S");
      doc.setLineWidth(0.2);
    }
  });

  currentY += chartCardH + 8;

  const rCardWidth = (contentWidth - 6) / 2;

  // ==========================================================================
  // 5. ÜBERSCHRIFT: "Bewertung zur Athletik"
  // ==========================================================================
  checkPageBreak(85);
  drawSectionHeader("5. Bewertung zur Athletik");

  const latestBioMetrics = playerEvaluations
    .filter(e => e.category === "Athletik" && e.biologicalMetrics && (e.biologicalMetrics.standingHeightCm || e.biologicalMetrics.phvClassification || e.biologicalMetrics.weightKg))
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))[0]?.biologicalMetrics;

  const playerAthletikHistory = playerEvaluations
    .filter(e => e.category === "Athletik" && e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean))
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));

  const validAthletikHistory = playerAthletikHistory.filter(hEv => {
    const scores = getAthleticScoresFromEval(hEv, playerBirthYearNum, latestBioMetrics, playerEvaluations);
    const sVals = Object.values(scores).filter(v => v > 0);
    return sVals.length > 0;
  });

  const athLatest = validAthletikHistory[0] || playerAthletikHistory[0];
  const athPrev = validAthletikHistory[1] || validAthletikHistory[0] || playerAthletikHistory[0];

  const dAth1 = athLatest?.athleticMetrics?.testDate
    ? athLatest.athleticMetrics.testDate.split('-').reverse().join('.')
    : (athLatest ? new Date(athLatest.updatedAt).toLocaleDateString("de-DE") : "Neueste");
  const dAth2 = athPrev?.athleticMetrics?.testDate
    ? athPrev.athleticMetrics.testDate.split('-').reverse().join('.')
    : (athPrev ? new Date(athPrev.updatedAt).toLocaleDateString("de-DE") : dAth1);

  // Box Left: Radar 1 (Aktueller Stand mit den 9 neuen Achsen)
  drawPdfRadarCard(
    margin,
    currentY,
    rCardWidth,
    76,
    21,
    ATHLETIC_RADAR_AXES,
    [{ name: `Aktuell (${dAth1})`, color: [245, 158, 11], data: getAthleticScoresFromEval(athLatest, playerBirthYearNum, undefined, playerEvaluations) }],
    "Diagramm 1: Athletik-Matrix (Aktueller Stand)"
  );

  // Box Right: Radar 2 (Entwicklungsvergleich 2 Linien)
  const athComparisonSeries = [
    { name: `Linie 1 (${dAth1})`, color: [245, 158, 11] as [number, number, number], data: getAthleticScoresFromEval(athLatest, playerBirthYearNum, undefined, playerEvaluations) }
  ];
  if (validAthletikHistory.length > 1) {
    athComparisonSeries.push({
      name: `Linie 2 (${dAth2})`,
      color: [6, 182, 212] as [number, number, number],
      data: getAthleticScoresFromEval(athPrev, playerBirthYearNum, undefined, playerEvaluations)
    });
  }

  drawPdfRadarCard(
    margin + rCardWidth + 6,
    currentY,
    rCardWidth,
    76,
    21,
    ATHLETIC_RADAR_AXES,
    athComparisonSeries,
    "Diagramm 2: Entwicklungsvergleich (2 Kurven)"
  );

  currentY += 80;

  // ==========================================================================
  // 6. ÜBERSCHRIFT: "Bewertung zur Technik"
  // ==========================================================================
  checkPageBreak(85);
  drawSectionHeader("6. Bewertung zur Technik");

  const playerTechnikHistory = playerEvaluations
    .filter(e => e.category === "Technik")
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const techLatest = playerTechnikHistory[0];
  const techPrev = playerTechnikHistory[1] || playerTechnikHistory[0];

  const techGroupAxesList = Array.from(new Set(SKILL_DEFINITIONS.Technik.map(s => s.group || "Allgemein")));
  const techGroupAxes = techGroupAxesList.map(grp => ({ key: grp, label: grp, shortLabel: grp }));

  const getTechGroupAverages = (evalObj?: PlayerEvaluation) => {
    const ratings = evalObj?.ratings || {};
    const res: Record<string, number> = {};
    techGroupAxesList.forEach(grp => {
      const skillsInGrp = SKILL_DEFINITIONS.Technik.filter(s => (s.group || "Allgemein") === grp);
      const scores = skillsInGrp.map(s => ratings[s.id]).filter((v): v is number => typeof v === "number" && v > 0);
      res[grp] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });
    return res;
  };

  const tech30Axes = SKILL_DEFINITIONS.Technik.map(s => {
    let short = s.name;
    short = short.replace(/^Ballerwartungshaltung\s*\(Ferndistanz\)/i, "BEH Ferndistanz");
    short = short.replace(/^Ballerwartungshaltung\s*\(Nahdistanz\)/i, "BEH Nahdistanz");
    short = short.replace(/^Ballerwartungshaltung\s*\(Flankenzonen\)/i, "BEH Flankenzone");
    short = short.replace(/^Ballerwartungshaltung\s*/i, "BEH ");
    short = short.replace(/^Abdruck\s*/i, "Abdr. ");
    short = short.replace(/^Hand-Fuß Reaktion/i, "HF-Reaktion");
    short = short.replace(/^Abtauchen\/Entlasten/i, "Abtauch./Entlast.");
    short = short.replace(/^Fausten\s*/i, "Faust. ");
    short = short.replace(/^Erster Kontakt/i, "1. Kontakt");
    return {
      key: s.id,
      label: s.name,
      shortLabel: short
    };
  });

  const getTech30Scores = (evalObj?: PlayerEvaluation) => {
    const ratings = evalObj?.ratings || {};
    const res: Record<string, number> = {};
    SKILL_DEFINITIONS.Technik.forEach(s => {
      res[s.id] = ratings[s.id] || 0;
    });
    return res;
  };

  const dTechStr = techLatest ? new Date(techLatest.updatedAt).toLocaleDateString("de-DE") : "Aktuell";
  const dTech1 = techLatest ? new Date(techLatest.updatedAt).toLocaleDateString("de-DE") : "Neueste";
  const dTech2 = techPrev ? new Date(techPrev.updatedAt).toLocaleDateString("de-DE") : dTech1;

  // Box Left: Radar 1 (Kategorien)
  drawPdfRadarCard(
    margin,
    currentY,
    rCardWidth,
    76,
    21,
    techGroupAxes,
    [{ name: `Aktuell (${dTechStr})`, color: [16, 185, 129], data: getTechGroupAverages(techLatest) }],
    "Diagramm 1: Technik-Kategorien (Aktueller Stand)"
  );

  // Box Right: Radar 2 (Entwicklungsvergleich 2 Kurven mit allen 30 Techniken)
  const techComparisonSeries = [
    { name: `Linie 1: Neueste (${dTech1})`, color: [16, 185, 129] as [number, number, number], data: getTech30Scores(techLatest) }
  ];
  if (playerTechnikHistory.length > 1) {
    techComparisonSeries.push({
      name: `Linie 2: Vorherige (${dTech2})`,
      color: [14, 165, 233] as [number, number, number],
      data: getTech30Scores(techPrev)
    });
  }

  drawPdfRadarCard(
    margin + rCardWidth + 6,
    currentY,
    rCardWidth,
    76,
    21,
    tech30Axes,
    techComparisonSeries,
    "Diagramm 2: Entwicklungsvergleich (2 Kurven)"
  );

  currentY += 80;

  // ==========================================================================
  // 7. ÜBERSCHRIFT: "Bewertung zur Taktik"
  // ==========================================================================
  checkPageBreak(85);
  drawSectionHeader("7. Bewertung zur Taktik");

  const playerTaktikHistory = playerEvaluations
    .filter(e => e.category === "Taktik")
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const tactLatest = playerTaktikHistory[0];
  const tactPrev = playerTaktikHistory[1] || playerTaktikHistory[0];

  const tactGroupAxesList = Array.from(new Set(SKILL_DEFINITIONS.Taktik.map(s => s.group || "Allgemein")));
  const tactGroupAxes = tactGroupAxesList.map(grp => ({ key: grp, label: grp, shortLabel: grp }));

  const getTactGroupAverages = (evalObj?: PlayerEvaluation) => {
    const ratings = evalObj?.ratings || {};
    const res: Record<string, number> = {};
    tactGroupAxesList.forEach(grp => {
      const skillsInGrp = SKILL_DEFINITIONS.Taktik.filter(s => (s.group || "Allgemein") === grp);
      const scores = skillsInGrp.map(s => ratings[s.id]).filter((v): v is number => typeof v === "number" && v > 0);
      res[grp] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });
    return res;
  };

  const tactAllAxes = SKILL_DEFINITIONS.Taktik.map(s => ({
    key: s.id,
    label: s.name,
    shortLabel: s.name
  }));

  const getTactAllScores = (evalObj?: PlayerEvaluation) => {
    const ratings = evalObj?.ratings || {};
    const res: Record<string, number> = {};
    SKILL_DEFINITIONS.Taktik.forEach(s => {
      res[s.id] = ratings[s.id] || 0;
    });
    return res;
  };

  const dTactStr = tactLatest ? new Date(tactLatest.updatedAt).toLocaleDateString("de-DE") : "Aktuell";
  const dTact1 = tactLatest ? new Date(tactLatest.updatedAt).toLocaleDateString("de-DE") : "Neueste";
  const dTact2 = tactPrev ? new Date(tactPrev.updatedAt).toLocaleDateString("de-DE") : dTact1;

  // Box Left: Radar 1 (Kategorien)
  drawPdfRadarCard(
    margin,
    currentY,
    rCardWidth,
    76,
    21,
    tactGroupAxes,
    [{ name: `Aktuell (${dTactStr})`, color: [14, 165, 233], data: getTactGroupAverages(tactLatest) }],
    "Diagramm 1: Taktik-Kategorien (Aktueller Stand)"
  );

  // Box Right: Radar 2 (Entwicklungsvergleich 2 Kurven mit allen 16 Taktiken)
  const tactComparisonSeries = [
    { name: `Linie 1: Neueste (${dTact1})`, color: [14, 165, 233] as [number, number, number], data: getTactAllScores(tactLatest) }
  ];
  if (playerTaktikHistory.length > 1) {
    tactComparisonSeries.push({
      name: `Linie 2: Vorherige (${dTact2})`,
      color: [168, 85, 247] as [number, number, number],
      data: getTactAllScores(tactPrev)
    });
  }

  drawPdfRadarCard(
    margin + rCardWidth + 6,
    currentY,
    rCardWidth,
    76,
    21,
    tactAllAxes,
    tactComparisonSeries,
    "Diagramm 2: Entwicklungsvergleich (2 Kurven)"
  );

  currentY += 80;

  // ==========================================================================
  // 8. ÜBERSCHRIFT: "Bewertung zum Mentalen"
  // ==========================================================================
  checkPageBreak(85);
  drawSectionHeader("8. Bewertung zum Mentalen");

  const playerMentalHistory = playerEvaluations
    .filter(e => e.category === "Mental")
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const menLatest = playerMentalHistory[0];
  const menPrev = playerMentalHistory[1] || playerMentalHistory[0];

  const mentalAxes = SKILL_DEFINITIONS.Mental.map(s => ({
    key: s.id,
    label: s.name,
    shortLabel: s.name
  }));

  const getMentalScores = (evalObj?: PlayerEvaluation) => {
    const ratings = evalObj?.ratings || {};
    const res: Record<string, number> = {};
    SKILL_DEFINITIONS.Mental.forEach(s => {
      res[s.id] = ratings[s.id] || 0;
    });
    return res;
  };

  const dMen1 = menLatest ? new Date(menLatest.updatedAt).toLocaleDateString("de-DE") : "Neueste";
  const dMen2 = menPrev ? new Date(menPrev.updatedAt).toLocaleDateString("de-DE") : dMen1;

  // Box Left: Radar 1 (Aktueller Stand)
  drawPdfRadarCard(
    margin,
    currentY,
    rCardWidth,
    76,
    21,
    mentalAxes,
    [{ name: `Aktuell (${dMen1})`, color: [168, 85, 247], data: getMentalScores(menLatest) }],
    "Diagramm 1: Mental-Matrix (Aktueller Stand)"
  );

  // Box Right: Radar 2 (Entwicklungsvergleich 2 Linien)
  const menComparisonSeries = [
    { name: `Linie 1 (${dMen1})`, color: [168, 85, 247] as [number, number, number], data: getMentalScores(menLatest) }
  ];
  if (playerMentalHistory.length > 1) {
    menComparisonSeries.push({
      name: `Linie 2 (${dMen2})`,
      color: [244, 63, 94] as [number, number, number],
      data: getMentalScores(menPrev)
    });
  }

  drawPdfRadarCard(
    margin + rCardWidth + 6,
    currentY,
    rCardWidth,
    76,
    21,
    mentalAxes,
    menComparisonSeries,
    "Diagramm 2: Entwicklungsvergleich (2 Kurven)"
  );

  currentY += 80;

  // --------------------------------------------------------------------------
  // FOOTER ON ALL PAGES
  // --------------------------------------------------------------------------
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - footerMargin + 4;

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text("NextLevel Goalkeeping Academy — Spielerbezogene Leistungs- & Trainingsauswertung", margin, footerY + 2.5);
    doc.text(`Seite ${i} von ${totalPages}`, pageWidth - margin, footerY + 2.5, { align: "right" });
  }

  const cleanName = `${data.player.firstName}_${data.player.lastName}`.replace(/[/\\:]+/g, "-").replace(/\s+/g, "_");
  const dateStr = new Date().toISOString().substring(0, 10);
  const finalFilename = `Spielerbewertung_${cleanName}_${dateStr}.pdf`;

  if (returnBlobOnly) {
    const blob = doc.output("blob");
    return { blob, filename: finalFilename };
  }

  doc.save(finalFilename);
}
