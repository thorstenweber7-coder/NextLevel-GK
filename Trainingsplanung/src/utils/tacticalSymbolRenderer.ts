import type { CanvasElement } from '../types';

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

export function drawPitchField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // 1. Grass pitch with alternating stripes
  const stripes = 8;
  const stripeH = height / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#16a34a';
    ctx.fillRect(0, i * stripeH, width, stripeH);
  }

  // Outer Pitch boundary
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3;
  const margin = 16;
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

  const centerX = width / 2;
  const bottomY = height - margin;

  // Penalty Area (Strafraum / 16er)
  const penaltyW = width * 0.68;
  const penaltyH = height * 0.52;
  const penaltyLeft = centerX - penaltyW / 2;
  const penaltyTop = bottomY - penaltyH;
  ctx.strokeRect(penaltyLeft, penaltyTop, penaltyW, penaltyH);

  // Goal Area (5m Raum / Torraum)
  const goalAreaW = width * 0.34;
  const goalAreaH = height * 0.22;
  const goalAreaLeft = centerX - goalAreaW / 2;
  const goalAreaTop = bottomY - goalAreaH;
  ctx.strokeRect(goalAreaLeft, goalAreaTop, goalAreaW, goalAreaH);

  // Penalty Spot (Elfmeterpunkt)
  const penaltySpotY = bottomY - penaltyH * (11 / 16.5);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, penaltySpotY, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Penalty Arc (Strafraumbogen / D-Bogen)
  const arcRadius = penaltyH * (9.15 / 16.5);
  const cosAlpha = (penaltySpotY - penaltyTop) / arcRadius;
  const alpha = Math.acos(Math.min(1, Math.max(0, cosAlpha)));
  ctx.beginPath();
  ctx.arc(centerX, penaltySpotY, arcRadius, -Math.PI / 2 - alpha, -Math.PI / 2 + alpha, false);
  ctx.stroke();

  // Corner arcs
  ctx.beginPath();
  ctx.arc(margin, bottomY, 16, Math.PI * 1.5, Math.PI * 2, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width - margin, bottomY, 16, Math.PI, Math.PI * 1.5, false);
  ctx.stroke();

  // Main Goal on goal line
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
}

export function drawTacticalSymbol(
  ctx: CanvasRenderingContext2D,
  elem: CanvasElement,
  canvasWidth: number,
  isSelected = false
): void {
  ctx.save();
  ctx.translate(elem.x, elem.y);
  const rotDeg = elem.rotation || 0;
  if (rotDeg) {
    ctx.rotate((rotDeg * Math.PI) / 180);
  }

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (elem.type === 'goal_large') {
    const goalWidth = canvasWidth * 0.16;
    const hw = goalWidth / 2;
    const goalDepth = 12;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(-hw, -goalDepth, goalWidth, goalDepth);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.lineWidth = 1;
    for (let gx = -hw + 6; gx < hw; gx += 8) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, -goalDepth);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw, -goalDepth, goalWidth, goalDepth);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-hw, 0);
    ctx.lineTo(hw, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-hw, 0, 4, 0, Math.PI * 2);
    ctx.arc(hw, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
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
  } else if (elem.type === 'rebounder') {
    ctx.save();
    ctx.fillStyle = elem.color || '#6366f1';
    ctx.fillRect(-13, -8, 26, 16);
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-13, -8, 26, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-13, -8); ctx.lineTo(13, 8);
    ctx.moveTo(-13, 8); ctx.lineTo(13, -8);
    ctx.moveTo(0, -8); ctx.lineTo(0, 8);
    ctx.moveTo(-13, 0); ctx.lineTo(13, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('REB', 0, 0);
    ctx.restore();
  } else if (elem.type === 'hurdle') {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-14, -3.5, 28, 7);
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-14, -3.5, 28, 7);
  } else if (elem.type === 'bench') {
    ctx.save();
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-20, -5.5, 40, 11);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-20, -5.5, 40, 11);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-17, -5.5, 3.5, 11);
    ctx.fillRect(13.5, -5.5, 3.5, 11);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 6.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BANK', 0, 0);
    ctx.restore();
  } else if (elem.type === 'plyobox') {
    ctx.save();
    const boxW = 26;
    const boxH = 18;
    const halfW = boxW / 2;
    const halfH = boxH / 2;
    ctx.fillStyle = elem.color || '#0284c7';
    ctx.fillRect(-halfW, -halfH, boxW, boxH);
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-halfW, -halfH, boxW, boxH);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-halfW + 2, -halfH + 2, boxW - 4, boxH - 4);
    ctx.fillStyle = elem.color || '#38bdf8';
    ctx.fillRect(-halfW + 3, -halfH + 3, 3, 3);
    ctx.fillRect(halfW - 6, -halfH + 3, 3, 3);
    ctx.fillRect(-halfW + 3, halfH - 6, 3, 3);
    ctx.fillRect(halfW - 6, halfH - 6, 3, 3);
    ctx.fillStyle = '#f0f9ff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLYO', 0, 0);
    ctx.restore();
  } else if (elem.type === 'medicine_ball') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#451a03';
    ctx.fill();
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 10, -Math.PI / 3, Math.PI / 3);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 10, (2 * Math.PI) / 3, (4 * Math.PI) / 3);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MB', 0, 0.5);
    ctx.restore();
  } else if (elem.type === 'square') {
    ctx.save();
    const sqSize = 24;
    const half = sqSize / 2;
    ctx.fillStyle = elem.color ? `${elem.color}33` : 'rgba(234, 179, 8, 0.2)';
    ctx.fillRect(-half, -half, sqSize, sqSize);
    ctx.strokeStyle = elem.color || '#eab308';
    ctx.lineWidth = 2;
    ctx.strokeRect(-half, -half, sqSize, sqSize);
    const corner = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-half + corner, -half); ctx.lineTo(-half, -half); ctx.lineTo(-half, -half + corner);
    ctx.moveTo(half - corner, -half); ctx.lineTo(half, -half); ctx.lineTo(half, -half + corner);
    ctx.moveTo(-half + corner, half); ctx.lineTo(-half, half); ctx.lineTo(-half, half - corner);
    ctx.moveTo(half - corner, half); ctx.lineTo(half, half); ctx.lineTo(half, half - corner);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUAD', 0, 0);
    ctx.restore();
  } else if (elem.type === 'resistance_band') {
    ctx.save();
    const bandColor = elem.color || '#a855f7';
    ctx.beginPath();
    ctx.moveTo(-11, 6);
    ctx.lineTo(-4.5, 6);
    ctx.arc(0, -2, 8.5, 0.65 * Math.PI, 0.35 * Math.PI, true);
    ctx.lineTo(11, 6);
    ctx.strokeStyle = bandColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 6.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BAND', 0, -2);
    ctx.restore();
  } else if (elem.type === 'jumping_rope') {
    ctx.save();
    const ropeColor = elem.color || '#10b981';
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.bezierCurveTo(-10, 14, 10, 14, 12, -7);
    ctx.strokeStyle = ropeColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.save();
    ctx.translate(-12, -7);
    ctx.rotate(-0.35);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -7, 4, 8);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(-2, -7, 4, 8);
    ctx.restore();
    ctx.save();
    ctx.translate(12, -7);
    ctx.rotate(0.35);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -7, 4, 8);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(-2, -7, 4, 8);
    ctx.restore();
    ctx.fillStyle = '#ecfdf5';
    ctx.font = 'bold 6.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SEIL', 0, 1);
    ctx.restore();
  } else if (elem.type === 'bib') {
    ctx.save();
    const bibColor = elem.color || '#84cc16';
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.quadraticCurveTo(0, -8, 4, -12);
    ctx.lineTo(10, -12);
    ctx.lineTo(12, -7);
    ctx.lineTo(9, -5);
    ctx.quadraticCurveTo(7, 0, 9, 4);
    ctx.lineTo(9, 12);
    ctx.lineTo(-9, 12);
    ctx.lineTo(-9, 4);
    ctx.quadraticCurveTo(-7, 0, -9, -5);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-10, -12);
    ctx.closePath();
    ctx.fillStyle = bibColor;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.quadraticCurveTo(0, -7, 4, -12);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(elem.label || 'HEMD', 0, 3);
    ctx.restore();
  }

  ctx.restore();
}
