import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { CanvasElement, TacticalCanvasData, ToolType } from '../types';
import { 
  MousePointer, 
  Trash2, 
  RotateCcw, 
  Undo, 
  Redo, 
  Shield, 
  User, 
  Circle, 
  Minus, 
  Goal, 
  Flag, 
  ArrowRight, 
  TrendingUp, 
  Square, 
  RotateCw, 
  Star,
  Magnet
} from 'lucide-react';
import { cn } from '../utils/cn';

export interface TacticalCanvasRef {
  exportImage: () => string;
  getCanvasData: () => TacticalCanvasData;
  loadCanvasData: (data: TacticalCanvasData) => void;
  clearCanvas: () => void;
  addElement: (type: ToolType, customProps?: Partial<CanvasElement>) => void;
}

interface TacticalCanvasProps {
  initialData?: TacticalCanvasData;
  onChange?: (data: TacticalCanvasData, previewUrl: string) => void;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

/**
 * Exports compressed image (WebP with JPEG fallback, scaled to max 1024px)
 * Drastically reduces Firestore document size from ~800kB to ~40kB.
 */
function exportCompressedCanvas(canvas: HTMLCanvasElement, maxWidth = 1024, quality = 0.75): string {
  try {
    let targetCanvas = canvas;
    if (canvas.width > maxWidth) {
      const scale = maxWidth / canvas.width;
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = maxWidth;
      scaledCanvas.height = Math.round(canvas.height * scale);
      const sCtx = scaledCanvas.getContext('2d');
      if (sCtx) {
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        targetCanvas = scaledCanvas;
      }
    }
    const webpUrl = targetCanvas.toDataURL('image/webp', quality);
    if (webpUrl && webpUrl.startsWith('data:image/webp')) {
      return webpUrl;
    }
    return targetCanvas.toDataURL('image/jpeg', quality);
  } catch (_e) {
    return canvas.toDataURL('image/png');
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

// Helper to draw tactical vector arrows (Pass = solid, Run = dashed, Dribble = wavy/sine wave, Shot = solid red)
function drawTacticalArrow(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  type: 'pass_arrow' | 'run_arrow' | 'dribble_arrow' | 'shot_arrow',
  isSelected: boolean = false
) {
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.hypot(dx, dy);
  if (len < 5) return;
  const angle = Math.atan2(dy, dx);
  const headLength = type === 'shot_arrow' ? 15 : 13;

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(angle);

  let color = '#ffffff';
  let lineWidth = 3;

  if (type === 'pass_arrow') {
    // 1. Passweg: Durchgezogener Pfeil (Gelb)
    color = '#facc15';
    lineWidth = isSelected ? 4.5 : 3;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len - 4, 0);
    ctx.stroke();
  } else if (type === 'run_arrow') {
    // 2. Laufweg: Gestrichelter Pfeil (Weiß)
    color = '#ffffff';
    lineWidth = isSelected ? 4.5 : 3;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len - 4, 0);
    ctx.stroke();
  } else if (type === 'dribble_arrow') {
    // 3. Dribbelweg: Schlangenlinien / Wellenlinie (Cyan)
    color = '#06b6d4';
    lineWidth = isSelected ? 4.5 : 3;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);

    const waveAmplitude = 5;
    const waveLength = 20;
    const endWaveX = Math.max(0, len - headLength);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    const steps = Math.max(10, Math.floor(endWaveX / 2));
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * endWaveX;
      const y = Math.sin((x / waveLength) * Math.PI * 2) * waveAmplitude;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(len - 4, 0);
    ctx.stroke();
  } else if (type === 'shot_arrow') {
    // 4. Torschuss: Roter kräftiger Pfeil
    color = '#ef4444';
    lineWidth = isSelected ? 5 : 3.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len - 4, 0);
    ctx.stroke();
  }

  // Arrowhead
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(len - headLength, -headLength * 0.55);
  ctx.lineTo(len - headLength, headLength * 0.55);
  ctx.closePath();
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.arc(len, 0, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Maximum number of undoable actions in the History Stack
const MAX_HISTORY_STEPS = 20;

// Helper to snap coordinates to key pitch guidelines (penalty box, 5m box, center, goal line)
function getPitchSnapPoint(x: number, y: number, width: number, height: number, enabled: boolean, threshold: number = 9): { x: number; y: number } {
  if (!enabled) return { x, y };

  const margin = 16;
  const centerX = width / 2;
  const bottomY = height - margin;

  const penaltyW = width * 0.68;
  const penaltyH = height * 0.52;
  const penaltyLeft = centerX - penaltyW / 2;
  const penaltyRight = centerX + penaltyW / 2;
  const penaltyTop = bottomY - penaltyH;

  const goalAreaW = width * 0.34;
  const goalAreaH = height * 0.22;
  const goalAreaLeft = centerX - goalAreaW / 2;
  const goalAreaRight = centerX + goalAreaW / 2;
  const goalAreaTop = bottomY - goalAreaH;

  const penaltySpotY = bottomY - penaltyH * (11 / 16.5);

  let snappedX = x;
  let snappedY = y;

  // Snap X axis
  const xLines = [margin, penaltyLeft, goalAreaLeft, centerX, goalAreaRight, penaltyRight, width - margin];
  for (const lx of xLines) {
    if (Math.abs(x - lx) <= threshold) {
      snappedX = lx;
      break;
    }
  }

  // Snap Y axis
  const yLines = [margin, penaltyTop, goalAreaTop, penaltySpotY, bottomY];
  for (const ly of yLines) {
    if (Math.abs(y - ly) <= threshold) {
      snappedY = ly;
      break;
    }
  }

  return { x: snappedX, y: snappedY };
}

export const TacticalCanvas = forwardRef<TacticalCanvasRef, TacticalCanvasProps>(({
  initialData,
  onChange,
  width = 864,
  height = 600,
  readOnly = false
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>(initialData?.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeColor, setActiveColor] = useState<string>('#f97316');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  
  // History Stack for Undo / Redo (limited to last 20 actions)
  const [history, setHistory] = useState<CanvasElement[][]>([initialData?.elements || []]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Interaction State
  const [isDrawingArrow, setIsDrawingArrow] = useState<boolean>(false);
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isRotatingId, setIsRotatingId] = useState<string | null>(null);
  const dragStartElementsRef = useRef<CanvasElement[] | null>(null);
  const pendingDragRef = useRef<{ elem: CanvasElement; startX: number; startY: number; moved: boolean } | null>(null);

  // Update history state (caps at MAX_HISTORY_STEPS = 10 actions)
  const pushToHistory = useCallback((newElements: CanvasElement[]) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      const combined = [...sliced, newElements];
      if (combined.length > MAX_HISTORY_STEPS + 1) {
        return combined.slice(combined.length - (MAX_HISTORY_STEPS + 1));
      }
      return combined;
    });
    setHistoryIndex(prev => {
      const next = prev + 1;
      return next > MAX_HISTORY_STEPS ? MAX_HISTORY_STEPS : next;
    });
  }, [historyIndex]);

  // Factory helper for new canvas elements
  const createNewElement = useCallback((type: ToolType, x: number, y: number, customProps?: Partial<CanvasElement>): CanvasElement => {
    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newElem: CanvasElement = {
      id: newId,
      type,
      x,
      y,
      rotation: 0,
      ...customProps
    };

    if (type === 'cone') {
      newElem.color = activeColor;
    } else if (type === 'blazepod') {
      newElem.color = activeColor === '#f97316' ? '#06b6d4' : activeColor;
    } else if (type === 'pole') {
      newElem.color = activeColor === '#f97316' ? '#eab308' : activeColor;
    } else if (type === 'board') {
      newElem.color = '#d4a373';
    } else if (type === 'rebounder') {
      newElem.color = '#6366f1';
    } else if (type === 'bench') {
      newElem.color = '#b45309';
    } else if (type === 'plyobox') {
      newElem.color = '#0284c7';
    } else if (type === 'medicine_ball') {
      newElem.color = '#451a03';
    } else if (type === 'square') {
      newElem.color = activeColor === '#f97316' ? '#eab308' : activeColor;
    } else if (type === 'resistance_band') {
      newElem.color = activeColor === '#f97316' ? '#a855f7' : activeColor;
    } else if (type === 'jumping_rope') {
      newElem.color = activeColor === '#f97316' ? '#10b981' : activeColor;
    } else if (type === 'gk') {
      const currentGkCount = elements.filter(el => el.type === 'gk').length;
      newElem.label = `TW${currentGkCount + 1}`;
    } else if (type === 'player') {
      newElem.label = 'TR';
      newElem.color = activeColor === '#f97316' ? '#3b82f6' : activeColor;
    }

    return newElem;
  }, [activeColor, elements]);

  // Programmatic element insertion (e.g. from material checkbox click)
  const addElement = useCallback((type: ToolType, customProps?: Partial<CanvasElement>) => {
    const existingSameType = elements.filter(el => el.type === type).length;
    const x = width - 50 - (existingSameType % 3) * 32;
    const y = 38 + Math.floor(existingSameType / 3) * 32;
    const newElem = createNewElement(type, x, y, customProps);
    
    setElements(prev => {
      const next = [...prev, newElem];
      pushToHistory(next);
      return next;
    });
    setSelectedId(newElem.id);
  }, [elements, width, createNewElement, pushToHistory]);

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setElements(history[nextIndex]);
      setSelectedId(null);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements(history[nextIndex]);
      setSelectedId(null);
    }
  }, [historyIndex, history]);

  const handleClear = () => {
    setElements([]);
    setSelectedId(null);
    pushToHistory([]);
  };

  // Helper to export compressed image (WebP / JPEG downscaled to max 1024px to prevent Firestore document limit overflows)
  const exportImage = useCallback((): string => {
    if (!canvasRef.current) return '';
    return exportCompressedCanvas(canvasRef.current);
  }, []);

  const getCanvasData = useCallback((): TacticalCanvasData => {
    return {
      width,
      height,
      elements
    };
  }, [width, height, elements]);

  const loadCanvasData = useCallback((data: TacticalCanvasData) => {
    if (data?.elements) {
      setElements(data.elements);
      setSelectedId(null);
      setHistory([data.elements]);
      setHistoryIndex(0);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    exportImage,
    getCanvasData,
    loadCanvasData,
    clearCanvas: handleClear,
    addElement
  }), [exportImage, getCanvasData, loadCanvasData, addElement]);

  useEffect(() => {
    if (initialData?.elements && elements.length === 0) {
      setElements(initialData.elements);
      setHistory([initialData.elements]);
      setHistoryIndex(0);
    }
  }, [initialData]);

  useEffect(() => {
    if (onChange && canvasRef.current) {
      const preview = exportCompressedCanvas(canvasRef.current);
      onChange({ width, height, elements }, preview);
    }
  }, [elements, width, height, onChange]);

  // Draw Pitch without halfway line and Elements
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // STANDARD-TOR: Realistic Goal permanently situated on the goal line in the 5m room
    const goalWidth = width * 0.16;
    const goalDepth = 12;
    const goalLeft = centerX - goalWidth / 2;
    
    ctx.save();
    // Goal Net
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
    // Net back line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(goalLeft, bottomY, goalWidth, goalDepth);
    
    // Torlatte / Pfosten auf der Torlinie
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(goalLeft, bottomY);
    ctx.lineTo(goalLeft + goalWidth, bottomY);
    ctx.stroke();

    // Goal Post markers
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(goalLeft, bottomY, 4, 0, Math.PI * 2);
    ctx.arc(goalLeft + goalWidth, bottomY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Draw User Elements
    elements.forEach(elem => {
      ctx.save();
      const isSelected = elem.id === selectedId;

      if (elem.type === 'pass_arrow' || elem.type === 'run_arrow' || elem.type === 'dribble_arrow' || elem.type === 'shot_arrow') {
        if (elem.endX !== undefined && elem.endY !== undefined) {
          drawTacticalArrow(ctx, elem.x, elem.y, elem.endX, elem.endY, elem.type, isSelected);
        }
      } else {
        ctx.translate(elem.x, elem.y);
        const rotDeg = elem.rotation || 0;
        if (rotDeg) {
          ctx.rotate((rotDeg * Math.PI) / 180);
        }

        // Selection ring & Rotation Handle
        if (isSelected && !readOnly) {
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Rotation Handle Line & Dot
          ctx.beginPath();
          ctx.moveTo(0, -24);
          ctx.lineTo(0, -36);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, -36, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        if (elem.type === 'goal_large') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-38, -6, 76, 12);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.strokeRect(-38, -6, 76, 12);

          ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
          ctx.lineWidth = 1;
          for (let gx = -30; gx <= 30; gx += 10) {
            ctx.beginPath();
            ctx.moveTo(gx, -6);
            ctx.lineTo(gx, 6);
            ctx.stroke();
          }

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
          // VIERECKIGER DUMMY in TW-Größe (28x28px)
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
          // STANGE (Slalomstange mit Sockel)
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
          // BLAZEPOD: Leuchtender Stern
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
          // BOARD: Ovale Form in Hellbraun (Prallbrett)
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
          // REBOUNDER: Viereckiger Rahmen mit Netz-Struktur
          ctx.save();
          ctx.fillStyle = elem.color || '#6366f1';
          ctx.fillRect(-13, -8, 26, 16);
          ctx.strokeStyle = '#312e81';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(-13, -8, 26, 16);

          // Inner net pattern
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          // Diagonals & Grid
          ctx.moveTo(-13, -8); ctx.lineTo(13, 8);
          ctx.moveTo(-13, 8); ctx.lineTo(13, -8);
          ctx.moveTo(0, -8); ctx.lineTo(0, 8);
          ctx.moveTo(-13, 0); ctx.lineTo(13, 0);
          ctx.stroke();

          // Text label
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
          // BANK: Holzbank mit Beinen
          ctx.save();
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-20, -5.5, 40, 11);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-20, -5.5, 40, 11);

          // Wood plank middle line
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(18, 0);
          ctx.stroke();

          // Bench legs
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-17, -5.5, 3.5, 11);
          ctx.fillRect(13.5, -5.5, 3.5, 11);

          // Text label
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 6.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BANK', 0, 0);
          ctx.restore();
        } else if (elem.type === 'plyobox') {
          // PLYOBOX: 3D Sprungkasten / Plyo Box
          ctx.save();
          const boxW = 26;
          const boxH = 18;
          const halfW = boxW / 2;
          const halfH = boxH / 2;

          // Box body (3D shaded bevel)
          ctx.fillStyle = elem.color || '#0284c7';
          ctx.fillRect(-halfW, -halfH, boxW, boxH);
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(-halfW, -halfH, boxW, boxH);

          // Top anti-slip surface grid / bevel lines
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-halfW + 2, -halfH + 2, boxW - 4, boxH - 4);

          // Corner grip markers
          ctx.fillStyle = elem.color || '#38bdf8';
          ctx.fillRect(-halfW + 3, -halfH + 3, 3, 3);
          ctx.fillRect(halfW - 6, -halfH + 3, 3, 3);
          ctx.fillRect(-halfW + 3, halfH - 6, 3, 3);
          ctx.fillRect(halfW - 6, halfH - 6, 3, 3);

          // Label
          ctx.fillStyle = '#f0f9ff';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('PLYO', 0, 0);
          ctx.restore();
        } else if (elem.type === 'medicine_ball') {
          // MEDIZINBALL: Schwerer Trainingsball
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#451a03';
          ctx.fill();
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Leather seam arcs
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

          // Text label
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('MB', 0, 0.5);
          ctx.restore();
        } else if (elem.type === 'square') {
          // QUADRAT: Taktisches Koordinations- / Markierungsquadrat
          ctx.save();
          const sqSize = 24;
          const half = sqSize / 2;

          // Translucent fill
          ctx.fillStyle = elem.color ? `${elem.color}33` : 'rgba(234, 179, 8, 0.2)';
          ctx.fillRect(-half, -half, sqSize, sqSize);

          // Border
          ctx.strokeStyle = elem.color || '#eab308';
          ctx.lineWidth = 2;
          ctx.strokeRect(-half, -half, sqSize, sqSize);

          // Precision Corner Markers
          const corner = 4;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          // Top-Left
          ctx.moveTo(-half + corner, -half); ctx.lineTo(-half, -half); ctx.lineTo(-half, -half + corner);
          // Top-Right
          ctx.moveTo(half - corner, -half); ctx.lineTo(half, -half); ctx.lineTo(half, -half + corner);
          // Bottom-Left
          ctx.moveTo(-half + corner, half); ctx.lineTo(-half, half); ctx.lineTo(-half, half - corner);
          // Bottom-Right
          ctx.moveTo(half - corner, half); ctx.lineTo(half, half); ctx.lineTo(half, half - corner);
          ctx.stroke();

          // Label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('QUAD', 0, 0);
          ctx.restore();
        } else if (elem.type === 'resistance_band') {
          // WIDERSTANDSBAND: Als Ohm-Zeichen (Ω)
          ctx.save();
          const bandColor = elem.color || '#a855f7';

          // Outer glowing base Ω
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

          // Inner highlight line for sleek finish
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Small text underneath
          ctx.fillStyle = '#f3e8ff';
          ctx.font = 'bold 6.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BAND', 0, -2);

          ctx.restore();
        } else if (elem.type === 'jumping_rope') {
          // SPRUNGSEIL: Geschwungenes Seil mit Griffen
          ctx.save();
          const ropeColor = elem.color || '#10b981';

          // Rope curve (U-shape / Catary arc)
          ctx.beginPath();
          ctx.moveTo(-12, -7);
          ctx.bezierCurveTo(-10, 14, 10, 14, 12, -7);
          ctx.strokeStyle = ropeColor;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Inner subtle highlight on rope
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Left Grip Handle
          ctx.save();
          ctx.translate(-12, -7);
          ctx.rotate(-0.35);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-2, -7, 4, 8);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(-2, -7, 4, 8);
          ctx.restore();

          // Right Grip Handle
          ctx.save();
          ctx.translate(12, -7);
          ctx.rotate(0.35);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-2, -7, 4, 8);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(-2, -7, 4, 8);
          ctx.restore();

          // Centered Text Label
          ctx.fillStyle = '#ecfdf5';
          ctx.font = 'bold 6.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SEIL', 0, 1);

          ctx.restore();
        }
      }

      ctx.restore();
    });

    // 3. Draw live arrow preview if dragging
    if (isDrawingArrow && arrowStart && currentMousePos) {
      if (activeTool === 'pass_arrow' || activeTool === 'run_arrow' || activeTool === 'dribble_arrow' || activeTool === 'shot_arrow') {
        drawTacticalArrow(ctx, arrowStart.x, arrowStart.y, currentMousePos.x, currentMousePos.y, activeTool, false);
      }
    }
  }, [elements, width, height, selectedId, isDrawingArrow, arrowStart, currentMousePos, activeTool, readOnly]);

  // Request Animation Frame Rendering Loop with Dirty Flag Tracking for 60/120fps Smoothness
  const rafIdRef = useRef<number | null>(null);
  const isDirtyRef = useRef<boolean>(false);

  const requestDraw = useCallback(() => {
    isDirtyRef.current = true;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (isDirtyRef.current) {
          isDirtyRef.current = false;
          drawCanvas();
        }
      });
    }
  }, [drawCanvas]);

  useEffect(() => {
    requestDraw();
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [requestDraw]);

  // Coordinate helper
  const getCanvasCoords = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Helper: check if click is on rotation handle
  const isClickOnRotationHandle = (x: number, y: number, elem: CanvasElement): boolean => {
    const rotRad = ((elem.rotation || 0) * Math.PI) / 180;
    const handleX = elem.x + Math.sin(rotRad) * 36;
    const handleY = elem.y - Math.cos(rotRad) * 36;
    return Math.hypot(x - handleX, y - handleY) <= 12;
  };

  // Find clicked element
  const findElementAt = (x: number, y: number): CanvasElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const elem = elements[i];
      if (elem.type === 'pass_arrow' || elem.type === 'run_arrow' || elem.type === 'dribble_arrow' || elem.type === 'shot_arrow') {
        if (elem.endX !== undefined && elem.endY !== undefined) {
          const d = distToSegment({ x, y }, { x: elem.x, y: elem.y }, { x: elem.endX, y: elem.endY });
          if (d < 12) return elem;
        }
      } else {
        const radius = elem.type === 'goal_large' ? 38 : (elem.type === 'goal_mini' || elem.type === 'bench' || elem.type === 'square' || elem.type === 'plyobox') ? 22 : 18;
        const dx = elem.x - x;
        const dy = elem.y - y;
        if (Math.hypot(dx, dy) <= radius) {
          return elem;
        }
      }
    }
    return null;
  };

  const distToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
  };

  // Shared Pointer Handlers (Unified for Mouse and Touch on Tablet/Mobile)
  const handlePointerDown = (x: number, y: number) => {
    if (readOnly) return;

    const snap = getPitchSnapPoint(x, y, width, height, snapToGrid);

    // Snapshot before potential drag or rotation
    dragStartElementsRef.current = elements;

    // 1. Check if user clicked on rotation handle of selected element
    if (selectedId) {
      const selectedElem = elements.find(el => el.id === selectedId);
      if (selectedElem && isClickOnRotationHandle(x, y, selectedElem)) {
        setIsRotatingId(selectedId);
        return;
      }
    }

    // 2. Drawing arrows
    if (activeTool === 'pass_arrow' || activeTool === 'run_arrow' || activeTool === 'dribble_arrow' || activeTool === 'shot_arrow') {
      setIsDrawingArrow(true);
      setArrowStart({ x: snap.x, y: snap.y });
      setCurrentMousePos({ x: snap.x, y: snap.y });
      return;
    }

    // 3. Selection & Dragging in 'select' mode
    if (activeTool === 'select') {
      const clicked = findElementAt(x, y);
      if (clicked) {
        setSelectedId(clicked.id);
        setDraggingId(clicked.id);
        setDragOffset({ x: x - clicked.x, y: y - clicked.y });
      } else {
        setSelectedId(null);
      }
      return;
    }

    // 4. In Placement Mode (Tool != select):
    // Check if user clicked on an existing element first:
    const clicked = findElementAt(x, y);
    if (clicked) {
      // Record pending drag: if the user holds and moves > 4px, we drag the existing symbol.
      // If the user quickly releases without moving, we place the next new symbol!
      pendingDragRef.current = { elem: clicked, startX: x, startY: y, moved: false };
      return;
    }

    // 5. Placing New Object on empty space (and allow immediate drag positioning)
    const newElement = createNewElement(activeTool, snap.x, snap.y);
    const updated = [...elements, newElement];
    setElements(updated);
    pushToHistory(updated);
    setSelectedId(newElement.id);
    setDraggingId(newElement.id);
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePointerMove = (x: number, y: number) => {
    // Free 360 degree rotation
    if (isRotatingId) {
      setElements(prev =>
        prev.map(elem => {
          if (elem.id !== isRotatingId) return elem;
          const dx = x - elem.x;
          const dy = y - elem.y;
          let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          return { ...elem, rotation: Math.round(deg) };
        })
      );
      return;
    }

    if (isDrawingArrow) {
      const snap = getPitchSnapPoint(x, y, width, height, snapToGrid);
      setCurrentMousePos({ x: snap.x, y: snap.y });
      return;
    }

    // Check if user is holding & moving over an existing symbol in placement mode
    if (pendingDragRef.current && !pendingDragRef.current.moved) {
      const dist = Math.hypot(x - pendingDragRef.current.startX, y - pendingDragRef.current.startY);
      if (dist > 4) {
        pendingDragRef.current.moved = true;
        const elem = pendingDragRef.current.elem;
        setSelectedId(elem.id);
        setDraggingId(elem.id);
        setDragOffset({ x: x - elem.x, y: y - elem.y });
      }
    }

    if (draggingId) {
      const snap = getPitchSnapPoint(x - dragOffset.x, y - dragOffset.y, width, height, snapToGrid);
      setElements(prev =>
        prev.map(elem => {
          if (elem.id !== draggingId) return elem;
          if (elem.type === 'pass_arrow' || elem.type === 'run_arrow' || elem.type === 'dribble_arrow' || elem.type === 'shot_arrow') {
            if (elem.endX !== undefined && elem.endY !== undefined) {
              const dx = elem.endX - elem.x;
              const dy = elem.endY - elem.y;
              return {
                ...elem,
                x: snap.x,
                y: snap.y,
                endX: snap.x + dx,
                endY: snap.y + dy
              };
            }
          }
          return {
            ...elem,
            x: snap.x,
            y: snap.y
          };
        })
      );
    }
  };

  const handlePointerUp = (x: number, y: number) => {
    if (readOnly) return;

    if (isRotatingId) {
      setIsRotatingId(null);
      setElements(current => {
        if (dragStartElementsRef.current && JSON.stringify(dragStartElementsRef.current) !== JSON.stringify(current)) {
          pushToHistory(current);
        }
        return current;
      });
      dragStartElementsRef.current = null;
      return;
    }

    if (isDrawingArrow && arrowStart) {
      const snap = getPitchSnapPoint(x, y, width, height, snapToGrid);
      const dist = Math.hypot(snap.x - arrowStart.x, snap.y - arrowStart.y);
      if (dist > 15) {
        const newId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
        const newArrow: CanvasElement = {
          id: newId,
          type: activeTool,
          x: arrowStart.x,
          y: arrowStart.y,
          endX: snap.x,
          endY: snap.y
        };
        const updated = [...elements, newArrow];
        setElements(updated);
        pushToHistory(updated);
        setSelectedId(newId);
      }
      setIsDrawingArrow(false);
      setArrowStart(null);
      setCurrentMousePos(null);
      dragStartElementsRef.current = null;
      return;
    }

    // If user clicked and quickly released without moving over an existing symbol -> place new element!
    if (pendingDragRef.current) {
      if (!pendingDragRef.current.moved) {
        const snap = getPitchSnapPoint(x, y, width, height, snapToGrid);
        const newElement = createNewElement(activeTool, snap.x, snap.y);
        const updated = [...elements, newElement];
        setElements(updated);
        pushToHistory(updated);
        setSelectedId(newElement.id);
      }
      pendingDragRef.current = null;
    }

    if (draggingId) {
      setDraggingId(null);
      setElements(current => {
        if (dragStartElementsRef.current && JSON.stringify(dragStartElementsRef.current) !== JSON.stringify(current)) {
          pushToHistory(current);
        }
        return current;
      });
      dragStartElementsRef.current = null;
    }
  };

  // Mouse Event Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    handlePointerDown(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    handlePointerMove(x, y);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    handlePointerUp(x, y);
  };

  // Touch Event Handlers for Tablets / Smartphones
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches && e.touches.length > 0) {
      const { x, y } = getCanvasCoords(e.touches[0]);
      handlePointerDown(x, y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches && e.touches.length > 0) {
      const { x, y } = getCanvasCoords(e.touches[0]);
      handlePointerMove(x, y);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.changedTouches && e.changedTouches.length > 0) {
      const { x, y } = getCanvasCoords(e.changedTouches[0]);
      handlePointerUp(x, y);
    }
  };

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    const updated = elements.filter(el => el.id !== selectedId);
    setElements(updated);
    setSelectedId(null);
    pushToHistory(updated);
  }, [selectedId, elements, pushToHistory]);

  const handleRotateSelected = (deltaAngle: number = 45) => {
    if (!selectedId) return;
    const updated = elements.map(el => {
      if (el.id !== selectedId) return el;
      const current = el.rotation || 0;
      return { ...el, rotation: (current + deltaAngle + 360) % 360 };
    });
    setElements(updated);
    pushToHistory(updated);
  };

  // Keyboard Shortcuts: Undo (Ctrl/Cmd+Z), Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z), Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if (isInput) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleDeleteSelected, handleUndo, handleRedo]);

  return (
    <div className="flex flex-col gap-2 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl">
      {/* Top Single-Line Toolbar */}
      {!readOnly && (
        <div className="flex flex-row items-center justify-between gap-1.5 pb-2 border-b border-slate-800 text-xs overflow-x-auto">
          {/* Selection & Actors (TW, TR) & Vectors (Pfeilsymbole) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              title="Auswählen & Drehen"
              className={cn(
                "p-1.5 rounded transition flex items-center justify-center",
                activeTool === 'select'
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <MousePointer className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

            {/* TW (Torwart) */}
            <button
              type="button"
              onClick={() => setActiveTool('gk')}
              title="Torwart (TW1, TW2...)"
              className={cn(
                "px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1",
                activeTool === 'gk'
                  ? "bg-amber-600 text-white shadow font-black"
                  : "text-amber-400 hover:bg-amber-950/40"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>TW</span>
            </button>

            {/* TR (Trainer / Anspieler) */}
            <button
              type="button"
              onClick={() => setActiveTool('player')}
              title="Trainer / Anspieler (TR / P)"
              className={cn(
                "px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1",
                activeTool === 'player'
                  ? "bg-blue-600 text-white shadow font-black"
                  : "text-blue-400 hover:bg-blue-950/40"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>TR</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

            {/* 1. Passweg: Durchgezogener Pfeil (Gelb) */}
            <button
              type="button"
              onClick={() => setActiveTool('pass_arrow')}
              title="Passweg (Gelb durchgezogen)"
              className={cn(
                "px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1",
                activeTool === 'pass_arrow'
                  ? "bg-amber-500 text-slate-950 shadow font-black"
                  : "text-amber-400 hover:bg-amber-950/40"
              )}
            >
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Pass</span>
            </button>

            {/* 2. Laufweg: Gestrichelter Pfeil (Weiß) */}
            <button
              type="button"
              onClick={() => setActiveTool('run_arrow')}
              title="Laufweg (Weiß gestrichelt)"
              className={cn(
                "px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1",
                activeTool === 'run_arrow'
                  ? "bg-slate-100 text-slate-950 shadow font-black"
                  : "text-slate-300 hover:bg-slate-800"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Lauf</span>
            </button>

            {/* 3. Dribbelweg: Schlangenlinie / Wellenlinie (Cyan) */}
            <button
              type="button"
              onClick={() => setActiveTool('dribble_arrow')}
              title="Dribbelweg (Cyan Schlangenlinie)"
              className={cn(
                "px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1",
                activeTool === 'dribble_arrow'
                  ? "bg-cyan-500 text-slate-950 shadow font-black"
                  : "text-cyan-400 hover:bg-cyan-950/40"
              )}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12c2.5-4 5 4 7.5 0s5 4 7.5 0" />
                <polyline points="16 9 19 12 16 15" />
              </svg>
              <span>Dribbling</span>
            </button>

            {/* 4. Torschuss: Roter Pfeil */}
            <button
              type="button"
              onClick={() => setActiveTool('shot_arrow')}
              title="Torschuss (Rot durchgezogen)"
              className={cn(
                "px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1",
                activeTool === 'shot_arrow'
                  ? "bg-red-600 text-white shadow font-black"
                  : "text-red-400 hover:bg-red-950/40"
              )}
            >
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              <span>Schuss</span>
            </button>
          </div>

          {/* Action Tools directly next to Vector tools */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 flex-shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title={`Rückgängig (Strg+Z / ⌘Z) [${historyIndex} Schritt(e) im Verlauf]`}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title={`Wiederholen (Strg+Y / ⌘⇧Z) [${Math.max(0, history.length - 1 - historyIndex)} Schritt(e) im Verlauf]`}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

            <button
              type="button"
              onClick={() => setSnapToGrid(prev => !prev)}
              title={snapToGrid ? "Magnetische Feldlinien aktiv (Klick zum Deaktivieren)" : "Magnetische Feldlinien inaktiv (Klick zum Aktivieren)"}
              className={cn(
                "p-1.5 rounded transition flex items-center justify-center",
                snapToGrid
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              )}
            >
              <Magnet className="w-3.5 h-3.5" />
            </button>

            {selectedId && (
              <>
                <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
                <button
                  type="button"
                  onClick={() => handleRotateSelected(-45)}
                  title="Gegen Uhrzeigersinn drehen"
                  className="p-1.5 rounded text-sky-400 hover:bg-sky-950/40 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateSelected(45)}
                  title="Im Uhrzeigersinn drehen"
                  className="p-1.5 rounded text-sky-400 hover:bg-sky-950/40 transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  title="Element löschen (Entf)"
                  className="p-1.5 rounded text-rose-400 hover:bg-rose-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
            <button
              type="button"
              onClick={handleClear}
              title="Spielfeld komplett leeren"
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Area: Narrow Left Toolbar (NO 'Symbole' text) + Canvas Pitch */}
      <div className="flex items-start gap-2.5">
        {/* Narrow Vertical Toolbar (Left Side: Materials & Equipment) */}
        {!readOnly && (
          <div className="flex flex-col gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-12 sm:w-14 flex-shrink-0 max-h-[min(540px,70vh)] overflow-y-auto scrollbar-thin">
            <div className="flex flex-col gap-1">
              {/* Ball */}
              <button
                type="button"
                onClick={() => setActiveTool('ball')}
                title="Fußball"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'ball'
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-300 hover:bg-slate-800 bg-slate-900 border border-slate-800"
                )}
              >
                <Circle className="w-3 h-3 fill-white text-slate-900" />
                <span>Ball</span>
              </button>

              {/* Medizinball */}
              <button
                type="button"
                onClick={() => setActiveTool('medicine_ball')}
                title="Medizinball"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'medicine_ball'
                    ? "bg-amber-900 text-white shadow"
                    : "text-amber-500 hover:bg-amber-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <div className="w-3 h-3 rounded-full bg-amber-900 border border-amber-500 flex items-center justify-center text-[6px] text-amber-200 font-bold">M</div>
                <span>MB</span>
              </button>

              {/* Plyobox */}
              <button
                type="button"
                onClick={() => setActiveTool('plyobox')}
                title="Plyobox (Sprungkasten)"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'plyobox'
                    ? "bg-sky-600 text-white shadow"
                    : "text-sky-400 hover:bg-sky-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <div className="w-3.5 h-2 bg-sky-600 border border-sky-300 rounded-[2px] flex items-center justify-center text-[5px] text-white font-black">P</div>
                <span>Plyo</span>
              </button>

              {/* Großes Tor */}
              <button
                type="button"
                onClick={() => setActiveTool('goal_large')}
                title="Großes Tor"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'goal_large'
                    ? "bg-sky-600 text-white shadow"
                    : "text-sky-400 hover:bg-sky-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <Goal className="w-3 h-3" />
                <span>Tor</span>
              </button>

              {/* Minitor */}
              <button
                type="button"
                onClick={() => setActiveTool('goal_mini')}
                title="Minitor"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'goal_mini'
                    ? "bg-sky-700 text-white shadow"
                    : "text-sky-300 hover:bg-sky-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <Square className="w-3 h-3" />
                <span>Mini</span>
              </button>

              {/* Dummy (Square in TW size) */}
              <button
                type="button"
                onClick={() => setActiveTool('dummy')}
                title="Dummy (Viereckig)"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'dummy'
                    ? "bg-slate-600 text-white shadow"
                    : "text-slate-400 hover:bg-slate-800 bg-slate-900 border border-slate-800"
                )}
              >
                <Square className="w-3 h-3 fill-slate-500" />
                <span>Dum</span>
              </button>

              {/* Stange (Pole) */}
              <button
                type="button"
                onClick={() => setActiveTool('pole')}
                title="Trainingsstange"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'pole'
                    ? "bg-amber-600 text-white shadow"
                    : "text-amber-400 hover:bg-amber-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <Minus className="w-3 h-3 rotate-90 stroke-[3]" />
                <span>Stange</span>
              </button>

              {/* Blazepod (Stern) */}
              <button
                type="button"
                onClick={() => setActiveTool('blazepod')}
                title="Blazepod (Stern)"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'blazepod'
                    ? "bg-cyan-600 text-white shadow"
                    : "text-cyan-400 hover:bg-cyan-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <Star className="w-3 h-3 fill-cyan-400" />
                <span>Pod</span>
              </button>

              {/* Shield */}
              <button
                type="button"
                onClick={() => setActiveTool('board')}
                title="Shield"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'board'
                    ? "bg-[#d4a373] text-white shadow"
                    : "text-[#d4a373] hover:bg-slate-800 bg-slate-900 border border-slate-800"
                )}
              >
                <div className="w-3 h-3 rounded-full border border-[#d4a373]" />
                <span>Shield</span>
              </button>

              {/* Rebounder (Reb mit Viereck) */}
              <button
                type="button"
                onClick={() => setActiveTool('rebounder')}
                title="Rebounder"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'rebounder'
                    ? "bg-indigo-600 text-white shadow"
                    : "text-indigo-400 hover:bg-indigo-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <Square className="w-3 h-3 stroke-[2.5]" />
                <span>Reb</span>
              </button>

              {/* Bank */}
              <button
                type="button"
                onClick={() => setActiveTool('bench')}
                title="Bank"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'bench'
                    ? "bg-amber-700 text-white shadow"
                    : "text-amber-400 hover:bg-amber-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <div className="w-3.5 h-1.5 bg-amber-600 border border-amber-400 rounded-xs" />
                <span>Bank</span>
              </button>

              {/* Hütchen */}
              <button
                type="button"
                onClick={() => setActiveTool('cone')}
                title="Hütchen"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'cone'
                    ? "bg-orange-600 text-white shadow"
                    : "text-orange-400 hover:bg-orange-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <Flag className="w-3 h-3" />
                <span>Hütch</span>
              </button>

              {/* Hürde */}
              <button
                type="button"
                onClick={() => setActiveTool('hurdle')}
                title="Hürde"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'hurdle'
                    ? "bg-rose-600 text-white shadow"
                    : "text-rose-400 hover:bg-rose-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <Minus className="w-3 h-3 stroke-[3]" />
                <span>Hürd</span>
              </button>

              {/* Quadrate */}
              <button
                type="button"
                onClick={() => setActiveTool('square')}
                title="Quadrate"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'square'
                    ? "bg-yellow-600 text-white shadow"
                    : "text-yellow-400 hover:bg-yellow-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <Square className="w-3 h-3 stroke-[2.5]" />
                <span>Quad</span>
              </button>

              {/* Widerstandsbänder (Ω) */}
              <button
                type="button"
                onClick={() => setActiveTool('resistance_band')}
                title="Widerstandsbänder (Ω)"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'resistance_band'
                    ? "bg-purple-600 text-white shadow"
                    : "text-purple-400 hover:bg-purple-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <span className="text-xs font-black leading-none">Ω</span>
                <span>Band</span>
              </button>

              {/* Sprungseile */}
              <button
                type="button"
                onClick={() => setActiveTool('jumping_rope')}
                title="Sprungseile"
                className={cn(
                  "py-1 rounded-lg transition flex flex-col items-center gap-0.5 font-extrabold text-[9px]",
                  activeTool === 'jumping_rope'
                    ? "bg-emerald-600 text-white shadow"
                    : "text-emerald-400 hover:bg-emerald-950/30 bg-slate-900 border border-slate-800"
                )}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6c0 9 16 9 16 0" />
                  <line x1="4" y1="3" x2="4" y2="6" strokeWidth="3" />
                  <line x1="20" y1="3" x2="20" y2="6" strokeWidth="3" />
                </svg>
                <span>Seil</span>
              </button>
            </div>

            {/* Quick Color Picker */}
            {(activeTool === 'cone' || activeTool === 'blazepod' || activeTool === 'pole' || activeTool === 'square' || activeTool === 'resistance_band' || activeTool === 'jumping_rope' || activeTool === 'plyobox') && (
              <div className="pt-1.5 border-t border-slate-800 flex flex-col items-center gap-1">
                {[
                  { name: 'Orange', color: '#f97316' },
                  { name: 'Gelb', color: '#eab308' },
                  { name: 'Cyan', color: '#06b6d4' },
                  { name: 'Rot', color: '#ef4444' },
                  { name: 'Lila', color: '#a855f7' },
                  { name: 'Grün', color: '#10b981' }
                ].map(c => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setActiveColor(c.color)}
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border transition-all",
                      activeColor === c.color ? "scale-125 border-white" : "border-transparent opacity-60"
                    )}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Large Focused Canvas Pitch */}
        <div className="flex-1 relative overflow-hidden rounded-xl border border-slate-800 flex justify-center items-center bg-slate-950 select-none">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{ 
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
            className={cn(
              "w-full h-auto max-w-full block aspect-[864/560] shadow-inner select-none touch-none",
              readOnly ? "cursor-default" : isRotatingId ? "cursor-grabbing" : activeTool === 'select' ? "cursor-pointer" : "cursor-crosshair"
            )}
          />
        </div>
      </div>

      {/* Helper text & Keyboard Shortcuts footer */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-3 text-[10.5px] text-slate-400 px-1 pt-1.5 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9.5px]">Tastatur-Kurzbefehle:</span>
            <span className="inline-flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 font-mono text-[10px]" title="Letzte Aktion rückgängig machen">
              <kbd className="text-emerald-400 font-bold">Strg/⌘</kbd>+<kbd className="text-emerald-400 font-bold">Z</kbd>
              <span className="text-slate-500 text-[9.5px] font-sans">Rückgängig</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 font-mono text-[10px]" title="Aktion wiederherstellen">
              <kbd className="text-emerald-400 font-bold">Strg/⌘</kbd>+<kbd className="text-emerald-400 font-bold">Y</kbd>
              <span className="text-slate-500 text-[9.5px] font-sans">Wiederholen</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 font-mono text-[10px]" title="Markiertes Element löschen">
              <kbd className="text-rose-400 font-bold">Entf</kbd>
              <span className="text-slate-500 text-[9.5px] font-sans">Löschen</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[10.5px]">
            <span>💡 Drehen: Blauer Griff oder ↺ / ↻</span>
            <span>•</span>
            <span className="text-slate-400 font-medium">{elements.length} Elemente</span>
          </div>
        </div>
      )}
    </div>
  );
});

TacticalCanvas.displayName = 'TacticalCanvas';
