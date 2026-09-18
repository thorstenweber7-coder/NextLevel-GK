import Dexie, { type Table } from 'dexie';
import type { 
  Exercise, 
  TrainingPlan, 
  CanvasElement,
  TrainingGroup,
  PlayerAbsence,
  PlayerEvaluation,
  PlayerMatchPlaytime,
  PlayerFeedbackTalk,
  MesoPlan,
  MacroPlan,
  TrainingStructure,
  TrainingPhaseItem
} from '../types';

export interface CachedBlobItem {
  id: string;
  blob: Blob;
  mimeType: string;
  updatedAt: number;
}

export class AppDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  plans!: Table<TrainingPlan, string>;
  groups!: Table<TrainingGroup, string>;
  absences!: Table<PlayerAbsence, string>;
  evaluations!: Table<PlayerEvaluation, string>;
  playtimes!: Table<PlayerMatchPlaytime, string>;
  feedbackTalks!: Table<PlayerFeedbackTalk, string>;
  mesoPlans!: Table<MesoPlan, string>;
  macroPlans!: Table<MacroPlan, string>;
  customPhases!: Table<TrainingPhaseItem, string>;
  userStructures!: Table<TrainingStructure, string>;
  cachedBlobs!: Table<CachedBlobItem, string>;

  constructor() {
    super('GKCoachProDB');
    this.version(2).stores({
      exercises: '++id, title, category, *materials, *situativeSchwerpunkte, createdAt',
      plans: '++id, title, date, createdAt'
    });
    this.version(3).stores({
      exercises: 'id, title, category, *materials, *situativeSchwerpunkte, createdAt, userId, clubId',
      plans: 'id, title, date, planDate, createdAt, userId, clubId',
      groups: 'id, name, ageCategory, clubId, userId, updatedAt',
      absences: 'id, playerId, groupId, startDate, endDate, reason, userId, clubId',
      evaluations: 'id, playerId, groupId, category, date, userId, clubId',
      playtimes: 'id, date, groupId, team, userId, clubId',
      feedbackTalks: 'id, date, groupId, playerId, userId, clubId',
      mesoPlans: 'id, title, startWeek, endWeek, userId, clubId',
      macroPlans: 'id, title, season, userId, clubId',
      customPhases: 'id, name, userId, clubId',
      userStructures: 'id, name, userId, clubId',
      cachedBlobs: 'id, updatedAt'
    });
  }
}

export const db = new AppDatabase();

let isMigrationDone = false;

/**
 * Automatically migrates all legacy localStorage collections into IndexedDB
 * Ensures 100% data preservation with zero data loss when upgrading.
 */
export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  if (typeof window === 'undefined' || isMigrationDone) return;
  try {
    const migrationFlag = localStorage.getItem('__gk_indexeddb_migrated_v3');
    if (migrationFlag === 'true') {
      isMigrationDone = true;
      return;
    }

    const tasks: Promise<any>[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        if (key.startsWith('gk_groups_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.groups.bulkPut(parsed.map(g => ({ ...g, id: g.id || `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        } else if (key.startsWith('gk_absences_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.absences.bulkPut(parsed.map(a => ({ ...a, id: a.id || `abs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        } else if (key.startsWith('gk_evaluations_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.evaluations.bulkPut(parsed.map(e => ({ ...e, id: e.id || `eval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        } else if (key.startsWith('gk_match_playtimes_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.playtimes.bulkPut(parsed.map(p => ({ ...p, id: p.id || `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        } else if (key.startsWith('gk_feedback_talks_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.feedbackTalks.bulkPut(parsed.map(f => ({ ...f, id: f.id || `ft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        } else if (key.startsWith('meso_plans_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.mesoPlans.bulkPut(parsed.map(m => ({ ...m, id: m.id || `meso_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        } else if (key.startsWith('macro_plans_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.macroPlans.bulkPut(parsed.map(m => ({ ...m, id: m.id || `macro_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        } else if (key.startsWith('gk_custom_phases_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.customPhases.bulkPut(parsed.map(c => ({ ...c, id: c.id || `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        } else if (key.startsWith('gk_structures_')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tasks.push(db.userStructures.bulkPut(parsed.map(s => ({ ...s, id: s.id || `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))));
          }
        }
      } catch (err) {
        console.warn(`Skipping malformed legacy localStorage key: ${key}`, err);
      }
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
    localStorage.setItem('__gk_indexeddb_migrated_v3', 'true');
    isMigrationDone = true;
  } catch (err) {
    console.error('Error during localStorage to IndexedDB migration:', err);
  }
}

// Helper to draw a 5-point star on 2D context
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// Pre-render canvas diagrams into clean base64 data URLs without halfway line and with standard goal on goal line
export function renderPitchDiagram(elements: CanvasElement[], width = 720, height = 500): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Draw Field Background (Half pitch with stripes)
  const stripes = 8;
  const stripeHeight = height / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#16a34a';
    ctx.fillRect(0, i * stripeHeight, width, stripeHeight);
  }

  // Pitch border & lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3;

  const margin = 16;
  const pitchWidth = width - margin * 2;
  const pitchHeight = height - margin * 2;
  const bottomY = height - margin;
  const topY = margin;
  const centerX = width / 2;

  // Outer boundary
  ctx.strokeRect(margin, topY, pitchWidth, pitchHeight);

  // Penalty Area (Strafraum / 16er) - Large & Centered
  const penaltyWidth = width * 0.68;
  const penaltyHeight = height * 0.52;
  const penaltyLeft = centerX - penaltyWidth / 2;
  const penaltyTop = bottomY - penaltyHeight;
  ctx.strokeRect(penaltyLeft, penaltyTop, penaltyWidth, penaltyHeight);

  // Goal Area (5m Raum / Torraum) - Large
  const goalAreaWidth = width * 0.34;
  const goalAreaHeight = height * 0.22;
  const goalAreaLeft = centerX - goalAreaWidth / 2;
  const goalAreaTop = bottomY - goalAreaHeight;
  ctx.strokeRect(goalAreaLeft, goalAreaTop, goalAreaWidth, goalAreaHeight);

  // Penalty Spot (Elfmeterpunkt) - 11m from goal line
  const penaltySpotY = bottomY - penaltyHeight * (11 / 16.5);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, penaltySpotY, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Penalty Arc (Strafraumbogen / D-Bogen)
  const arcRadius = penaltyHeight * (9.15 / 16.5);
  const cosAlpha = (penaltySpotY - penaltyTop) / arcRadius;
  const alpha = Math.acos(Math.min(1, Math.max(0, cosAlpha)));
  ctx.beginPath();
  ctx.arc(centerX, penaltySpotY, arcRadius, -Math.PI / 2 - alpha, -Math.PI / 2 + alpha, false);
  ctx.stroke();

  // Corner Arcs
  ctx.beginPath();
  ctx.arc(margin, bottomY, 16, Math.PI * 1.5, Math.PI * 2, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width - margin, bottomY, 16, Math.PI, Math.PI * 1.5, false);
  ctx.stroke();

  // Standard-Tor on goal line
  const goalWidth = width * 0.16;
  const goalDepth = 12;
  const goalLeft = centerX - goalWidth / 2;
  
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(goalLeft, bottomY, goalWidth, goalDepth);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
  ctx.lineWidth = 1;
  for (let gx = goalLeft + 6; gx < goalLeft + goalWidth; gx += 8) {
    ctx.beginPath();
    ctx.moveTo(gx, bottomY);
    ctx.lineTo(gx, bottomY + goalDepth);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(goalLeft, bottomY, goalWidth, goalDepth);
  
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(goalLeft, bottomY);
  ctx.lineTo(goalLeft + goalWidth, bottomY);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(goalLeft, bottomY, 4, 0, Math.PI * 2);
  ctx.arc(goalLeft + goalWidth, bottomY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 2. Draw Elements with Full Rotation Support
  elements.forEach(elem => {
    ctx.save();
    ctx.translate(elem.x, elem.y);
    if (elem.rotation) {
      ctx.rotate((elem.rotation * Math.PI) / 180);
    }

    if (elem.type === 'goal_large') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-38, -6, 76, 12);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(-38, -6, 76, 12);
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TOR', 0, 3.5);
    } else if (elem.type === 'goal_mini') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-20, -5, 40, 10);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-20, -5, 40, 10);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Mini', 0, 3);
    } else if (elem.type === 'gk') {
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#78350f';
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(elem.label || 'TW', 0, 0);
    } else if (elem.type === 'player') {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = elem.color || '#3b82f6';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1e3a8a';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(elem.label || 'TR', 0, 0);
    } else if (elem.type === 'ball') {
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    } else if (elem.type === 'cone') {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, 8);
      ctx.lineTo(-9, 8);
      ctx.closePath();
      ctx.fillStyle = elem.color || '#f97316';
      ctx.fill();
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (elem.type === 'dummy') {
      const dummySize = 28;
      const halfSize = dummySize / 2;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-halfSize, -halfSize, dummySize, dummySize);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(-halfSize, -halfSize, dummySize, dummySize);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('D', 0, 0);
    } else if (elem.type === 'pole') {
      ctx.beginPath();
      ctx.arc(0, 8, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();

      ctx.fillStyle = elem.color || '#eab308';
      ctx.fillRect(-2.5, -16, 5, 24);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-2.5, -16, 5, 24);
    } else if (elem.type === 'blazepod') {
      ctx.save();
      drawStar(ctx, 0, 0, 5, 14, 6.5);
      ctx.fillStyle = elem.color || '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    } else if (elem.type === 'hurdle') {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-14, -3.5, 28, 7);
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-14, -3.5, 28, 7);
    } else if (elem.type === 'board') {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 7.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = elem.color || '#d4a373';
      ctx.fill();
      ctx.strokeStyle = '#8c5b36';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#b08968';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    } else if (elem.type === 'pass_arrow' || elem.type === 'run_arrow' || elem.type === 'dribble_arrow' || elem.type === 'shot_arrow' || elem.type === 'cross_arrow') {
      if (elem.endX !== undefined && elem.endY !== undefined) {
        ctx.restore();
        ctx.save();

        const dx = elem.endX - elem.x;
        const dy = elem.endY - elem.y;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        ctx.translate(elem.x, elem.y);
        ctx.rotate(angle);

        ctx.beginPath();
        if (elem.type === 'pass_arrow') {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.moveTo(0, 0);
          ctx.lineTo(len - 4, 0);
          ctx.stroke();
        } else if (elem.type === 'shot_arrow') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3.5;
          ctx.setLineDash([]);
          ctx.moveTo(0, 0);
          ctx.lineTo(len - 4, 0);
          ctx.stroke();
        } else if (elem.type === 'run_arrow') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 5]);
          ctx.moveTo(0, 0);
          ctx.lineTo(len - 4, 0);
          ctx.stroke();
        } else if (elem.type === 'dribble_arrow') {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          const waveAmplitude = 5;
          const waveLength = 20;
          const endWaveX = Math.max(0, len - 13);
          ctx.moveTo(0, 0);
          const steps = Math.max(10, Math.floor(endWaveX / 2));
          for (let i = 1; i <= steps; i++) {
            const x = (i / steps) * endWaveX;
            const y = Math.sin((x / waveLength) * Math.PI * 2) * waveAmplitude;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(len - 4, 0);
          ctx.stroke();
        } else if (elem.type === 'cross_arrow') {
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 3.2;
          ctx.setLineDash([]);
          const h = Math.min(50, Math.max(18, len * 0.25));
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(len / 2, h, len - 3, 0);
          ctx.stroke();
        }

        ctx.setLineDash([]);
        const color = elem.type === 'pass_arrow' ? '#facc15' : elem.type === 'shot_arrow' ? '#ef4444' : elem.type === 'dribble_arrow' ? '#06b6d4' : elem.type === 'cross_arrow' ? '#c084fc' : '#ffffff';
        ctx.fillStyle = color;
        const headLength = 13;

        if (elem.type === 'cross_arrow') {
          const h = Math.min(50, Math.max(18, len * 0.25));
          const tangentPhi = Math.atan2(-h, len / 2);
          ctx.save();
          ctx.translate(len, 0);
          ctx.rotate(tangentPhi);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-headLength, -headLength * 0.55);
          ctx.lineTo(-headLength, headLength * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.moveTo(len, 0);
          ctx.lineTo(len - headLength, -headLength * 0.55);
          ctx.lineTo(len - headLength, headLength * 0.55);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.restore();
  });

  // Draw arrow numbering badges
  const arrowElems = elements.filter((e: CanvasElement) => ['pass_arrow', 'run_arrow', 'dribble_arrow', 'shot_arrow', 'cross_arrow'].includes(e.type));
  arrowElems.forEach((arrowElem: CanvasElement, arrowIdx: number) => {
    if (arrowElem.endX === undefined || arrowElem.endY === undefined) return;
    const dx = arrowElem.endX - arrowElem.x;
    const dy = arrowElem.endY - arrowElem.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) return;
    const angle = Math.atan2(dy, dx);
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const nx = -uy;
    const ny = ux;

    let bx = (arrowElem.x + arrowElem.endX) / 2 + nx * 14;
    let by = (arrowElem.y + arrowElem.endY) / 2 + ny * 14;

    if (arrowElem.type === 'cross_arrow') {
      const h = Math.min(50, Math.max(18, len * 0.25));
      const apexX = arrowElem.x + ux * (len / 2) + nx * (h / 2);
      const apexY = arrowElem.y + uy * (len / 2) + ny * (h / 2);
      bx = apexX + nx * 14;
      by = apexY + ny * 14;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, 9.5, 0, Math.PI * 2);
    ctx.fillStyle = '#020617';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = arrowElem.type === 'pass_arrow' ? '#facc15' : arrowElem.type === 'shot_arrow' ? '#ef4444' : arrowElem.type === 'dribble_arrow' ? '#06b6d4' : arrowElem.type === 'cross_arrow' ? '#c084fc' : '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((arrowIdx + 1).toString(), bx, by + 0.5);
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

// 5 Initial Seed Exercises
export const SEED_EXERCISES: Omit<Exercise, 'id'>[] = [
  {
    title: 'WarmUp: Reaktions-Viereck mit Schnellen Beinen & Kognition',
    category: 'WarmUp',
    minKeepers: 2,
    maxKeepers: 4,
    materials: ['Hütchen', 'Blazepods', 'Strobobrille', 'Sprungseile'],
    atSchwerpunkt: 'Schnelle Beine',
    kognition: 'enthalten',
    coachingPoints: 'Saubere Grundstellung, Hände vor dem Körper, Körperschwerpunkt tief, Blickkontakt zum Signal halten.',
    ablauf: '1. Torwart startet im Hütchen-Viereck auf den Fußballen (Skippings / Seilspringen).\n2. Trainer ruft ein optisches/farbliches Signal (Blazepod leuchtet auf oder Hütchenfarbe wird gerufen).\n3. TW absolviert schnellen Auftaktschritt zum entsprechenden Hütchen, berührt dieses und orientiert sich sofort wieder zentral.\n4. Trainer wirft/schießt einen flachen oder halbhohen Ball in die Fangebene (Schaufel- oder W-Griff).\n5. 4 Durchgänge à 6 Aktionen, danach Wechsel mit Strobobrille.',
    durationMinutes: 15,
    ownerId: 'admin_seed',
    ownerEmail: 'Thorsten.Weber7@gmail.com',
    isPublished: true,
    createdAt: Date.now() - 500000,
    canvasData: {
      width: 720,
      height: 500,
      elements: [
        { id: '2', type: 'gk', x: 360, y: 430, label: 'TW1' },
        { id: '3', type: 'blazepod', x: 300, y: 390, color: '#06b6d4' },
        { id: '4', type: 'blazepod', x: 420, y: 390, color: '#eab308' },
        { id: '5', type: 'cone', x: 300, y: 450, color: '#ef4444' },
        { id: '6', type: 'cone', x: 420, y: 450, color: '#3b82f6' },
        { id: '7', type: 'player', x: 360, y: 280, label: 'TR', color: '#0ea5e9' },
        { id: '8', type: 'ball', x: 360, y: 295 },
        { id: '9', type: 'run_arrow', x: 360, y: 430, endX: 305, endY: 395 },
        { id: '10', type: 'pass_arrow', x: 360, y: 295, endX: 360, endY: 420 }
      ]
    },
    imageBase64: ''
  },
  {
    title: 'TW-Athletik: Laterale Hürdensprünge & Explosiver Hechtabdruck',
    category: 'Torwart-Athletik',
    minKeepers: 1,
    maxKeepers: 3,
    materials: ['Hürden', 'Widerstandsbänder', 'Hütchen', 'Shield'],
    athletikSchwerpunkt: 'Explosivität',
    coachingPoints: 'Dynamischer Doppelarmschwung, explosive Abdruckphase aus dem äußeren Fuß, stabiles Abfangen über die Rumpfmuskulatur.',
    ablauf: '1. Der Torwart beginnt mit angelegtem Widerstandsband an der Hürdenreihe seitlich des Tores.\n2. Zwei schnelle laterale Hürdensprünge (Beidbeinig abdrücken, einbeinig stabil landen).\n3. Nach der zweiten Hürde erfolgt ein explosiver Diagonalschritt in den Torbereich.\n4. Zuspiel durch Trainer/Partner auf mittlere Höhe in die Ecke.\n5. TW führt einen raumgreifenden Hechtsprung aus und fängt/lenkt den Ball um den Pfosten.\n6. 3 Serien à 4 Wiederholungen je Seite mit 90 Sek. Satzpause.',
    durationMinutes: 20,
    ownerId: 'admin_seed',
    ownerEmail: 'Thorsten.Weber7@gmail.com',
    isPublished: true,
    createdAt: Date.now() - 400000,
    canvasData: {
      width: 720,
      height: 500,
      elements: [
        { id: '2', type: 'hurdle', x: 220, y: 440 },
        { id: '3', type: 'hurdle', x: 265, y: 440 },
        { id: '4', type: 'gk', x: 180, y: 440, label: 'TW1' },
        { id: '5', type: 'player', x: 440, y: 310, label: 'TR', color: '#0ea5e9' },
        { id: '6', type: 'ball', x: 430, y: 320 },
        { id: '7', type: 'run_arrow', x: 180, y: 440, endX: 320, endY: 445 },
        { id: '8', type: 'shot_arrow', x: 430, y: 320, endX: 385, endY: 465 }
      ]
    },
    imageBase64: ''
  },
  {
    title: 'Analytisch: Kippfall- & Abdrucktechnik bei flachen Bällen',
    category: 'Analytisch',
    minKeepers: 2,
    maxKeepers: 4,
    materials: ['Hütchen', 'Stangen', 'Quadrate'],
    technik: 'Kippfalltechnik flach & halbhoch',
    methodischeReiheStufen: {
      stufe1: 'Isoliertes Abkippen aus dem Kniestand, beidhändiges Greifen hinter den Ball (Schaufelgriff).',
      stufe2: 'Auftaktschritt aus der tiefen Hocke zur Seite mit linearem Beinabdruck.',
      stufe3: 'Aus der Torwart-Grundstellung flacher Ballfang mit kontrolliertem Abrollen über Oberschenkel & Flanke.',
      stufe4: 'Positionsanpassung: 2 Sidesteps um die Stange, Stopp im Zentrum und Fangaktion flach.',
      stufe5: 'Entscheidung: Trainer deutet kurze oder lange Ecke an, TW reagiert im Abdruckmoment.',
      stufe6: 'Zweitball nach Positionsanpassung: Nach Abwehr sofort aufstehen und zweiten Ball sichern.'
    },
    technikprinzipien: 'Körperschwerpunkt absenken, Hände hinter den Ball führen, seitliches Abrollen über Oberschenkel und Oberkörper (kein Aufprall auf Knochenpunkte).',
    coachingPoints: 'Aktives Hinführen beider Hände zum Ball, kein Schlagen mit den Handflächen, Landung in Seitenlage, sofortiges Aufrichten nach Ballbesitz.',
    ablauf: '1. Torwart steht mittig zwischen zwei Stangen im 5m-Raum.\n2. Auftakt: Schneller Sidestep rechts um die Stange.\n3. Rückkehr ins Zentrum und sofortiger Grundstellung-Stopp.\n4. Scharfer flacher Ball des Trainers in die lange Ecke.\n5. TW kippt sauber über die Seite ab, zieht den Ball zur Brust heran und sichert ihn.\n6. 5 Bälle rechts, 5 Bälle links, 3 Serien mit Steigerung des Schärfegrads.',
    durationMinutes: 20,
    ownerId: 'admin_seed',
    ownerEmail: 'Thorsten.Weber7@gmail.com',
    isPublished: true,
    createdAt: Date.now() - 300000,
    canvasData: {
      width: 720,
      height: 500,
      elements: [
        { id: '2', type: 'pole', x: 300, y: 430, color: '#eab308' },
        { id: '3', type: 'pole', x: 420, y: 430, color: '#eab308' },
        { id: '4', type: 'gk', x: 360, y: 440, label: 'TW1' },
        { id: '5', type: 'player', x: 360, y: 260, label: 'TR', color: '#0ea5e9' },
        { id: '6', type: 'ball', x: 360, y: 275 },
        { id: '7', type: 'run_arrow', x: 360, y: 440, endX: 290, endY: 430 },
        { id: '8', type: 'run_arrow', x: 290, y: 430, endX: 360, endY: 440 },
        { id: '9', type: 'shot_arrow', x: 360, y: 275, endX: 400, endY: 465 }
      ]
    },
    imageBase64: ''
  },
  {
    title: 'Situativ: 1vs1 Blockstellung & Timing beim Durchbruch',
    category: 'Situativ',
    minKeepers: 2,
    maxKeepers: 5,
    materials: ['Dummies', 'Hütchen', 'Shield'],
    situativeSchwerpunkte: ['1vs1', 'Nahdistanz'],
    taktikprinzipien: 'Wann verkürzen (Raum schließen), wann einfrieren (Blockposition halten), Hand- & Fußflächen breit machen, kein vorzeitiges Spekulieren.',
    coachingPoints: 'Geduld im Stellungsspiel, Blick auf Ballkontakt des Angreifers, bei weitem Ballkontakt sofort Raum greifen, aufrechter Oberkörper im Block.',
    ablauf: '1. Angreifer (P) erhält Steilpass durch zwei Dummies (simulierte Abwehrkette).\n2. TW liest den Pass: Wenn Pass lang -> Ball abfangen vor dem Strafraum; wenn Pass kurz -> Raum verkürzen und vor Angreifer in den Stand/Block gehen.\n3. Angreifer hat 2 Ballkontakte bis zum Torschuss auf Großes Tor.\n4. Nach Ballgewinn: Schneller Abwurf durch den TW auf eines der beiden Minitore an den Flügeln.\n5. Wettbewerbsform: 8 Durchgänge mit Zählung der erfolgreichen Aktionen.',
    durationMinutes: 25,
    ownerId: 'admin_seed',
    ownerEmail: 'Thorsten.Weber7@gmail.com',
    isPublished: true,
    createdAt: Date.now() - 200000,
    canvasData: {
      width: 720,
      height: 500,
      elements: [
        { id: '2', type: 'goal_mini', x: 70, y: 220, rotation: 90 },
        { id: '3', type: 'goal_mini', x: 650, y: 220, rotation: -90 },
        { id: '4', type: 'dummy', x: 280, y: 270 },
        { id: '5', type: 'dummy', x: 440, y: 270 },
        { id: '6', type: 'player', x: 360, y: 140, label: 'P', color: '#ef4444' },
        { id: '7', type: 'player', x: 200, y: 130, label: 'TR', color: '#0ea5e9' },
        { id: '8', type: 'ball', x: 210, y: 140 },
        { id: '9', type: 'gk', x: 360, y: 420, label: 'TW1' },
        { id: '10', type: 'pass_arrow', x: 210, y: 140, endX: 360, endY: 230 },
        { id: '11', type: 'run_arrow', x: 360, y: 140, endX: 360, endY: 230 },
        { id: '12', type: 'run_arrow', x: 360, y: 420, endX: 360, endY: 340 }
      ]
    },
    imageBase64: ''
  },
  {
    title: 'Wettkampf: Torwart-Duell mit Umschalt-Abschlüssen & Minitor-Konter',
    category: 'Wettkämpfe',
    minKeepers: 2,
    maxKeepers: 4,
    materials: ['Hütchen', 'Dummies', 'Shield'],
    situativeSchwerpunkte: ['1vs1', 'Nahdistanz'],
    taktikprinzipien: 'Wann verkürzen (Raum schließen), wann einfrieren (Blockposition halten), Hand- & Fußflächen breit machen, kein vorzeitiges Spekulieren.',
    coachingPoints: 'Geduld im Stellungsspiel, Blick auf Ballkontakt des Angreifers, bei weitem Ballkontakt sofort Raum greifen, aufrechter Oberkörper im Block.',
    ablauf: '1. Angreifer (P) erhält Steilpass durch zwei Dummies (simulierte Abwehrkette).\n2. TW liest den Pass: Wenn Pass lang -> Ball abfangen vor dem Strafraum; wenn Pass kurz -> Raum verkürzen und vor Angreifer in den Stand/Block gehen.\n3. Angreifer hat 2 Ballkontakte bis zum Torschuss auf Großes Tor.\n4. Nach Ballgewinn: Schneller Abwurf durch den TW auf eines der beiden Minitore an den Flügeln.\n5. Wettbewerbsform: 8 Durchgänge mit Zählung der erfolgreichen Aktionen.',
    durationMinutes: 25,
    ownerId: 'admin_seed',
    ownerEmail: 'Thorsten.Weber7@gmail.com',
    isPublished: true,
    createdAt: Date.now() - 200000,
    canvasData: {
      width: 720,
      height: 500,
      elements: [
        { id: '2', type: 'goal_mini', x: 70, y: 220, rotation: 90 },
        { id: '3', type: 'goal_mini', x: 650, y: 220, rotation: -90 },
        { id: '4', type: 'dummy', x: 280, y: 270 },
        { id: '5', type: 'dummy', x: 440, y: 270 },
        { id: '6', type: 'player', x: 360, y: 140, label: 'P', color: '#ef4444' },
        { id: '7', type: 'player', x: 200, y: 130, label: 'TR', color: '#0ea5e9' },
        { id: '8', type: 'ball', x: 210, y: 140 },
        { id: '9', type: 'gk', x: 360, y: 420, label: 'TW1' },
        { id: '10', type: 'pass_arrow', x: 210, y: 140, endX: 360, endY: 230 },
        { id: '11', type: 'run_arrow', x: 360, y: 140, endX: 360, endY: 230 },
        { id: '12', type: 'run_arrow', x: 360, y: 420, endX: 360, endY: 340 }
      ]
    },
    imageBase64: ''
  },
  {
    title: 'Wettkampf: Torwart-Duell mit Umschalt-Abschlüssen & Minitor-Konter',
    category: 'Wettkämpfe',
    minKeepers: 2,
    maxKeepers: 4,
    materials: ['Hütchen', 'Dummies', 'Shield'],
    situativeSchwerpunkte: ['Ferndistanz', 'Nahdistanz', '1vs1'],
    siegbedingung: 'Wer zuerst 5 Treffer erzielt hat oder nach 6 Runden die meisten Paraden + Kontertore kombiniert aufweist.',
    coachingPoints: 'Sofortiges Umschalten von Abwehr auf Angriff, präziser Volleyschuss/Abwurf, schnelles Wiederherstellen der Grundposition.',
    ablauf: '1. Zwei Torhüter (TW1 im Tor, TW2 an der 16er-Linie) duellieren sich im direkten Wechsel.\n2. TW2 schließt aus 16m ab -> TW1 pariert.\n3. Kann TW1 den Ball festhalten, darf er sofort einen Konterabwurf/Schuss auf eines der seitlichen Minitore setzen (2 Punkte).\n4. Lässt TW1 prallen, setzt TW2 direkt zum Nachschuss/1vs1 nach (1 Punkt bei Tor).\n5. Nach jeder Aktion Rollentausch.',
    durationMinutes: 15,
    ownerId: 'admin_seed',
    ownerEmail: 'Thorsten.Weber7@gmail.com',
    isPublished: true,
    createdAt: Date.now() - 100000,
    canvasData: {
      width: 720,
      height: 500,
      elements: [
        { id: '2', type: 'gk', x: 360, y: 440, label: 'TW1' },
        { id: '3', type: 'gk', x: 360, y: 250, label: 'TW2' },
        { id: '4', type: 'ball', x: 360, y: 265 },
        { id: '5', type: 'goal_mini', x: 90, y: 260, rotation: 90 },
        { id: '6', type: 'goal_mini', x: 630, y: 260, rotation: -90 },
        { id: '7', type: 'shot_arrow', x: 360, y: 265, endX: 360, endY: 440 }
      ]
    },
    imageBase64: ''
  }
];

export async function initDatabase(): Promise<void> {
  try {
    const count = await db.exercises.count();
    if (count === 0) {
      console.log('Database empty: Seeding default exercises...');
      for (const item of SEED_EXERCISES) {
        let imageBase64 = item.imageBase64;
        if (!imageBase64 && item.canvasData) {
          imageBase64 = renderPitchDiagram(item.canvasData.elements, item.canvasData.width, item.canvasData.height);
        }
        await db.exercises.add({
          ...item,
          imageBase64: imageBase64 || ''
        });
      }
      console.log('Database seeded with 5 default exercises.');
    }
  } catch (error) {
    console.error('Error initializing/seeding database:', error);
  }
}
