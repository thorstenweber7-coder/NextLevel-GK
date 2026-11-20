import React, { useState, useRef, useEffect } from 'react';
import type { CanvasElement } from '../../types';
import type { TacticalCanvasRef } from '../TacticalCanvas';
import { Film, Plus, Play, Square, Download, Trash2, X, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { drawPitchField, drawTacticalSymbol } from '../../utils/tacticalSymbolRenderer';

export interface AnimationFrameItem {
  id: string;
  label: string;
  durationMs: number;
  elements: CanvasElement[];
}

interface ExerciseAnimationPanelProps {
  canvasRef?: React.RefObject<TacticalCanvasRef | null>;
  frames: AnimationFrameItem[];
  onChangeFrames?: (frames: AnimationFrameItem[]) => void;
  readOnly?: boolean;
  exerciseTitle?: string;
  openSignal?: number;
  hideTriggerBar?: boolean;
}

const ARROW_TYPES = new Set(['pass_arrow', 'dribble_arrow', 'run_arrow', 'shot_arrow', 'cross_arrow']);

function stripArrows(elements: CanvasElement[]): CanvasElement[] {
  return elements.filter(
    el => !ARROW_TYPES.has(el.type) && !(el.x2 !== undefined && el.y2 !== undefined) && !(el.endX !== undefined && el.endY !== undefined)
  );
}

function interpolateElements(fromEls: CanvasElement[], toEls: CanvasElement[], t: number): CanvasElement[] {
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const cleanFrom = stripArrows(fromEls);
  const cleanTo = stripArrows(toEls);
  const toMap = new Map(cleanTo.map(e => [e.id, e]));
  const fromIds = new Set(cleanFrom.map(e => e.id));

  const interpolated = cleanFrom.map(fromEl => {
    const target = toMap.get(fromEl.id);
    if (!target) return fromEl;
    return {
      ...fromEl,
      x: fromEl.x + (target.x - fromEl.x) * ease,
      y: fromEl.y + (target.y - fromEl.y) * ease
    };
  });

  if (t >= 0.5) {
    cleanTo.forEach(toEl => {
      if (!fromIds.has(toEl.id)) {
        interpolated.push(toEl);
      }
    });
  }

  return interpolated;
}

export const ExerciseAnimationPanel: React.FC<ExerciseAnimationPanelProps> = ({
  canvasRef,
  frames,
  onChangeFrames,
  readOnly = false,
  exerciseTitle = 'Uebung',
  openSignal = 0,
  hideTriggerBar = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [workingElements, setWorkingElements] = useState<CanvasElement[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const renderFrameElements = (els: CanvasElement[], selectedId: string | null = null) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPitchField(ctx, canvas.width, canvas.height);
    stripArrows(els).forEach(el => drawTacticalSymbol(ctx, el, canvas.width, el.id === selectedId));
  };

  // Render working elements or frame 0 when idle
  useEffect(() => {
    if (isPlaying) return;
    if (readOnly && frames.length > 0) {
      renderFrameElements(frames[0].elements);
    } else if (isModalOpen) {
      renderFrameElements(workingElements, draggingId);
    }
  }, [frames, isPlaying, readOnly, isModalOpen, workingElements, draggingId]);

  useEffect(() => {
    if (openSignal > 0 && !readOnly) {
      handleOpenStudio();
    }
  }, [openSignal]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleOpenStudio = () => {
    setVideoNotice(null);
    const boardRaw = canvasRef?.current?.getCanvasData()?.elements || [];
    const boardClean = stripArrows(JSON.parse(JSON.stringify(boardRaw)));

    if (frames.length > 0) {
      const last = frames[frames.length - 1];
      const lastClean = stripArrows(JSON.parse(JSON.stringify(last.elements || [])));
      const existingIds = new Set(lastClean.map(el => el.id));
      const newlyAddedFromBoard = boardClean.filter(el => !existingIds.has(el.id));

      if (newlyAddedFromBoard.length > 0 && onChangeFrames) {
        // Also add newly placed board symbols to existing frames so they appear in the sequence
        const updatedFrames = frames.map(f => {
          const fIds = new Set((f.elements || []).map(el => el.id));
          const toAdd = newlyAddedFromBoard.filter(el => !fIds.has(el.id));
          return {
            ...f,
            elements: [...stripArrows(f.elements || []), ...JSON.parse(JSON.stringify(toAdd))]
          };
        });
        onChangeFrames(updatedFrames);
      }
      setWorkingElements([...lastClean, ...newlyAddedFromBoard]);
    } else {
      setWorkingElements(boardClean);
      if (boardClean.length > 0 && onChangeFrames) {
        onChangeFrames([
          {
            id: `step_${Date.now()}_1`,
            label: 'Schritt 1',
            durationMs: 1500,
            elements: JSON.parse(JSON.stringify(boardClean))
          }
        ]);
      }
    }
    setIsModalOpen(true);
  };

  const handleSyncFromBoard = () => {
    if (!canvasRef?.current) return;
    const boardRaw = canvasRef.current.getCanvasData()?.elements || [];
    const boardClean = stripArrows(JSON.parse(JSON.stringify(boardRaw)));
    setWorkingElements(boardClean);
    if (onChangeFrames) {
      onChangeFrames([
        {
          id: `step_${Date.now()}_1`,
          label: 'Schritt 1',
          durationMs: 1500,
          elements: JSON.parse(JSON.stringify(boardClean))
        }
      ]);
    }
    setVideoNotice('Symbole vom Haupt-Taktikboard neu übernommen.');
  };

  const handleCaptureStep = () => {
    if (!onChangeFrames) return;
    const cloned = stripArrows(JSON.parse(JSON.stringify(workingElements)));
    const nextStep: AnimationFrameItem = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: `Schritt ${frames.length + 1}`,
      durationMs: 1500,
      elements: cloned
    };
    onChangeFrames([...frames, nextStep]);
    setVideoNotice(null);
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || isPlaying) return;
    const { x, y } = getCanvasCoords(e);
    const hit = [...workingElements].reverse().find(el => Math.hypot(el.x - x, el.y - y) <= 24);
    if (hit) {
      setDraggingId(hit.id);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingId || readOnly || isPlaying) return;
    const { x, y } = getCanvasCoords(e);
    setWorkingElements(prev =>
      prev.map(el =>
        el.id === draggingId
          ? { ...el, x: Math.max(20, Math.min(844, x)), y: Math.max(20, Math.min(540, y)) }
          : el
      )
    );
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  const playSequence = (onComplete?: () => void) => {
    if (frames.length < 2) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setVideoNotice(null);
    setIsPlaying(true);

    renderFrameElements(frames[0].elements);

    let segIdx = 0;
    let segStart = performance.now();

    const tick = (now: number) => {
      const currentFrom = frames[segIdx];
      const currentTo = frames[segIdx + 1];
      if (!currentFrom || !currentTo) {
        renderFrameElements(frames[frames.length - 1].elements);
        setIsPlaying(false);
        rafRef.current = null;
        onComplete?.();
        return;
      }
      const dur = currentFrom.durationMs || 1500;
      const t = Math.min(1, (now - segStart) / dur);
      const interp = interpolateElements(currentFrom.elements, currentTo.elements, t);
      renderFrameElements(interp);

      if (t >= 1) {
        segIdx++;
        segStart = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleStop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleExportVideo = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas || frames.length < 2) return;
    setVideoNotice(null);

    if (typeof (canvas as any).captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setVideoNotice('Video-Export wird von diesem Browser leider nicht unterstützt.');
      return;
    }

    // Prefer MP4 first (supported in Safari & modern Chromium), fallback to WebM
    const candidates = [
      { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
      { mime: 'video/mp4', ext: 'mp4' },
      { mime: 'video/webm;codecs=vp9', ext: 'webm' },
      { mime: 'video/webm;codecs=vp8', ext: 'webm' },
      { mime: 'video/webm', ext: 'webm' }
    ];
    const supported = candidates.find(c => {
      try {
        return MediaRecorder.isTypeSupported(c.mime);
      } catch {
        return false;
      }
    });

    if (!supported) {
      setVideoNotice('Kein unterstütztes Video-Format in diesem Browser gefunden.');
      return;
    }

    try {
      setIsExportingVideo(true);
      renderFrameElements(frames[0].elements);

      const stream = (canvas as any).captureStream(30) as MediaStream;
      const recorder = new MediaRecorder(stream, { mimeType: supported.mime });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => {
        setIsExportingVideo(false);
        setVideoNotice('Fehler bei der Video-Aufzeichnung.');
      };
      recorder.onstop = () => {
        try {
          if (chunks.length === 0) {
            setVideoNotice('Es konnten keine Videodaten aufgezeichnet werden.');
          } else {
            const baseMime = supported.mime.split(';')[0];
            const blob = new Blob(chunks, { type: baseMime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeTitle = (exerciseTitle || 'Uebung').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '_');
            a.download = `${safeTitle}_Sequenz.${supported.ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            if (supported.ext === 'webm') {
              setVideoNotice('Als .webm heruntergeladen (dein Browser unterstützt direktes .mp4-Recording noch nicht).');
            }
          }
        } finally {
          setIsExportingVideo(false);
        }
      };

      recorder.start(100);
      playSequence(() => {
        setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, 250);
      });
    } catch (err) {
      console.error('Video export failed:', err);
      setIsExportingVideo(false);
      setVideoNotice('Video-Export fehlgeschlagen.');
    }
  };

  // Read-only mode (LiveSessionModal)
  if (readOnly) {
    if (frames.length < 2) return null;
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-slate-200 flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-400" />
            <span>Animierte Sequenz ({frames.length} Schritte)</span>
          </span>
          {!isPlaying ? (
            <button
              type="button"
              onClick={() => playSequence()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Sequenz abspielen</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stopp</span>
            </button>
          )}
        </div>
        <canvas
          ref={previewCanvasRef}
          width={864}
          height={560}
          className="w-full aspect-[864/560] rounded-xl border border-slate-800 bg-emerald-900"
        />
      </div>
    );
  }

  return (
    <>
      {!hideTriggerBar && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Film className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-slate-200 block">
                Animierte Zwischensequenzen (Optional{frames.length > 0 ? ` • ${frames.length} Schritte` : ''})
              </span>
              <span className="text-[11px] text-slate-400">
                Separates Animations-Fenster — dein statisches Taktikbild bleibt unverändert.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenStudio}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Animation</span>
          </button>
        </div>
      )}

      {/* Dedicated Animation Studio Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Film className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Animations-Studio (Ohne Pfeile)</h3>
                  <p className="text-[11px] text-slate-400">
                    Ziehe Symbole auf diesem Spielfeld an die nächste Position und klicke „+ Schritt erfassen“. Das Haupt-Taktikbild bleibt unberührt.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleStop();
                  setIsModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isPlaying || isExportingVideo}
                  onClick={handleCaptureStep}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Schritt erfassen</span>
                </button>

                <button
                  type="button"
                  disabled={isPlaying || isExportingVideo}
                  onClick={handleSyncFromBoard}
                  title="Alle Symbole vom Haupt-Taktikboard neu übernehmen (setzt Schritte auf Schritt 1 zurück)"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Vom Board neu laden</span>
                </button>

                {frames.length >= 2 && (
                  <>
                    {!isPlaying ? (
                      <button
                        type="button"
                        onClick={() => playSequence()}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Vorschau abspielen</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStop}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stopp</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isExportingVideo}
                      onClick={handleExportVideo}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isExportingVideo ? 'Exportiere Video...' : 'Video herunterladen'}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleStop();
                    setIsModalOpen(false);
                  }}
                  className="ml-auto px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Fertig</span>
                </button>
              </div>

              {videoNotice && (
                <p className="text-[11px] font-semibold text-amber-300 bg-amber-950/50 border border-amber-700/50 px-3 py-2 rounded-xl">
                  {videoNotice}
                </p>
              )}

              {frames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {frames.map((f, idx) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        if (!isPlaying) {
                          setWorkingElements(stripArrows(JSON.parse(JSON.stringify(f.elements))));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 flex items-center gap-2 text-[11px] cursor-pointer"
                      title="Klicken, um diesen Schritt auf das Animations-Spielfeld zu laden"
                    >
                      <span className="font-bold text-slate-200">{idx + 1}. {f.label}</span>
                      {onChangeFrames && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeFrames(frames.filter(item => item.id !== f.id));
                          }}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Schritt entfernen"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <canvas
                ref={previewCanvasRef}
                width={864}
                height={560}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={cn(
                  "w-full aspect-[864/560] rounded-xl border border-slate-800 bg-emerald-900 touch-none",
                  !isPlaying && !readOnly ? "cursor-grab active:cursor-grabbing" : ""
                )}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
