import React from 'react';
import type { TrainingPhaseItem, Exercise } from '../../types';
import { createPlaceholderExercise } from '../../types';
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronUp, 
  GripVertical, 
  Eye, 
  Trash2, 
  Package 
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PlannerPhaseCardProps {
  phase: TrainingPhaseItem;
  phaseIndex: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  assignedIds: string[];
  exerciseMap: Map<string, Exercise>;
  customPlanExercises: Record<string, Exercise>;
  availableKeepers?: number;
  isDragOver: boolean;
  activeCatalogTab: string;
  colorStyle: { badge: string; border?: string; bg?: string; text?: string };
  draggedCardInfo: { sourcePhaseId: string; sourceIndex: number; exerciseId?: string } | null;
  dragOverTarget: { phaseId: string; index: number; position: 'above' | 'below' } | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onCardDragStart: (e: React.DragEvent, exIdx: number, exId: string) => void;
  onCardDragEnd: () => void;
  onCardDragOver: (e: React.DragEvent, exIdx: number) => void;
  onCardDragLeave: () => void;
  onCardDrop: (e: React.DragEvent, exIdx: number) => void;
  onMoveExercise: (exIdx: number, direction: 'up' | 'down', e: React.MouseEvent) => void;
  onPreviewExercise: (ex: Exercise) => void;
  onRemoveExercise: (exIdx: number) => void;
}

export const PlannerPhaseCard: React.FC<PlannerPhaseCardProps> = ({
  phase,
  phaseIndex,
  isOpen,
  onToggleOpen,
  assignedIds = [],
  exerciseMap,
  customPlanExercises,
  availableKeepers,
  isDragOver,
  activeCatalogTab,
  colorStyle,
  draggedCardInfo,
  dragOverTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardDragStart,
  onCardDragEnd,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
  onMoveExercise,
  onPreviewExercise,
  onRemoveExercise
}) => {
  // Filter to valid assigned exercises
  const validAssigned = assignedIds
    .map(id => exerciseMap.get(id) || customPlanExercises[id])
    .filter((ex): ex is Exercise => ex !== undefined);

  const exerciseCount = assignedIds.length;
  const phaseDuration = validAssigned.reduce((acc, ex) => acc + (ex.durationMinutes || 0), 0);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-md",
        isDragOver
          ? "border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-950/20"
          : activeCatalogTab === phase.categoryKey
          ? "border-slate-700 ring-1 ring-slate-700/80"
          : "border-slate-800"
      )}
    >
      {/* Folder Accordion Header */}
      <div
        onClick={onToggleOpen}
        className={cn(
          "p-3.5 flex items-center justify-between cursor-pointer select-none transition border-b gap-2",
          isOpen ? "border-slate-800 bg-slate-850" : "border-transparent hover:bg-slate-800/50"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="p-1 rounded text-slate-400 hover:text-white flex-shrink-0"
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          <span className="w-4 h-4 rounded-full bg-slate-950 text-[10px] flex items-center justify-center font-black text-slate-400 flex-shrink-0">
            {phaseIndex + 1}
          </span>

          <span className="font-bold text-xs text-slate-100 truncate">{phase.name}</span>
        </div>

        {/* Counter and Duration */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span 
            className={cn(
              "w-7 h-7 rounded-lg font-extrabold text-xs flex items-center justify-center border shadow-inner transition-colors",
              exerciseCount > 0
                ? cn(colorStyle.badge)
                : "bg-slate-950 text-slate-500 border-slate-800"
            )}
            title={`${exerciseCount} Übungen zugeordnet`}
          >
            {exerciseCount}
          </span>

          <span 
            className={cn(
              "text-xs font-bold whitespace-nowrap min-w-[50px] text-right",
              exerciseCount > 0 ? "text-slate-200" : "text-slate-500"
            )}
          >
            {exerciseCount > 0 ? `${phaseDuration} Min.` : `${phase.defaultDurationMinutes || 0} Min.`}
          </span>
        </div>
      </div>

      {/* Folder Drop Zone & Content */}
      {isOpen && (
        <div className="p-3 space-y-2 bg-slate-950/50">
          {exerciseCount === 0 ? (
            <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center flex flex-col items-center justify-center gap-1 text-slate-500">
              <Package className="w-5 h-5 text-slate-600" />
              <p className="text-[11px] font-medium">0 Übungen zugeordnet</p>
              <span className="text-[10px] text-slate-600">Übung aus Katalog hierher ziehen oder &quot;In Phase ablegen&quot; klicken</span>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedIds.map((exId, exIdx) => {
                const ex = exerciseMap.get(exId) || customPlanExercises[exId] || createPlaceholderExercise(exId);
                const isCustomized = Boolean(ex.id && customPlanExercises[ex.id]);
                const isCurrentlyDragged = draggedCardInfo?.sourcePhaseId === phase.id && draggedCardInfo?.sourceIndex === exIdx;
                const isDropTargetAbove = dragOverTarget?.phaseId === phase.id && dragOverTarget?.index === exIdx && dragOverTarget?.position === 'above';
                const isDropTargetBelow = dragOverTarget?.phaseId === phase.id && dragOverTarget?.index === exIdx && dragOverTarget?.position === 'below';

                return (
                  <React.Fragment key={`${exId}-${exIdx}`}>
                    {isDropTargetAbove && (
                      <div className="h-1.5 bg-emerald-400 rounded-full my-1 shadow-md shadow-emerald-500/50 animate-pulse transition-all" />
                    )}
                    <div
                      draggable={true}
                      onDragStart={(e) => onCardDragStart(e, exIdx, ex.id || exId)}
                      onDragEnd={onCardDragEnd}
                      onDragOver={(e) => onCardDragOver(e, exIdx)}
                      onDragLeave={onCardDragLeave}
                      onDrop={(e) => onCardDrop(e, exIdx)}
                      className={cn(
                        "bg-slate-900 border hover:border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm group transition-all select-none",
                        isCustomized ? "border-amber-500/50 bg-amber-950/20" : "border-slate-800",
                        isCurrentlyDragged ? "opacity-30 border-dashed border-emerald-500 ring-2 ring-emerald-500/40 scale-[0.99]" : ""
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div 
                          title="Übung per Drag & Drop anfassen (innerhalb Phase oder in andere Phase verschieben)"
                          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-800 transition flex-shrink-0"
                        >
                          <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                        </div>
                        {(ex.imageUrl || ex.imageBase64) && (
                          <img
                            src={ex.imageUrl || ex.imageBase64}
                            alt={ex.title}
                            className="w-16 h-12 rounded-lg object-contain bg-slate-950 border border-slate-800 flex-shrink-0 cursor-pointer hover:border-emerald-500/60 hover:scale-105 transition shadow-sm p-0.5"
                            onClick={() => onPreviewExercise(ex)}
                            title="Klicken für Vollansicht"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4
                              onClick={() => onPreviewExercise(ex)}
                              className="text-xs font-bold text-slate-100 truncate hover:text-emerald-400 cursor-pointer"
                              title={ex.title}
                            >
                              {exIdx + 1}. {ex.title}
                            </h4>
                            {isCustomized && (
                              <span 
                                className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/80 flex-shrink-0" 
                                title="Für diesen aktiven Trainingsplan individuell angepasst"
                              >
                                ✏️ Angepasst
                              </span>
                            )}
                          </div>
                          {(() => {
                            const minK = ex.minKeepers || 1;
                            const maxK = ex.maxKeepers || 8;
                            const isKeeperMismatch = availableKeepers !== undefined && (availableKeepers < minK || availableKeepers > maxK);

                            return (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span
                                  onClick={() => onPreviewExercise(ex)}
                                  className="text-emerald-400 font-semibold cursor-pointer hover:underline hover:text-emerald-300"
                                  title="Übungsdauer & Details für dieses Training anpassen"
                                >
                                  {ex.durationMinutes || 15} Min.
                                </span>
                                <span>•</span>
                                <span className={cn("inline-flex items-center gap-1", isKeeperMismatch && "text-rose-400 font-bold")}>
                                  <span>{minK}-{maxK} TW</span>
                                  {isKeeperMismatch && (
                                    <span
                                      title={`Nicht durchführbar: Übung erfordert ${minK}–${maxK} TW (im Trainingsplaner sind aktuell ${availableKeepers} TW vorgegeben)`}
                                      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-rose-600 text-white font-black text-[10px] shadow-sm shadow-rose-950 ring-2 ring-rose-500/60 animate-pulse flex-shrink-0 cursor-help"
                                    >
                                      !
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Reordering buttons */}
                        <button
                          type="button"
                          onClick={(e) => onMoveExercise(exIdx, 'up', e)}
                          disabled={exIdx === 0}
                          title="Übung in der Phase nach oben schieben"
                          className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onMoveExercise(exIdx, 'down', e)}
                          disabled={exIdx === assignedIds.length - 1}
                          title="Übung in der Phase nach unten schieben"
                          className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onPreviewExercise(ex)}
                          title="Vorschau & Anpassen für dieses Training"
                          className={cn(
                            "p-1 rounded transition",
                            isCustomized 
                              ? "text-amber-400 hover:text-amber-300 hover:bg-amber-950/50" 
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          )}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveExercise(exIdx)}
                          title="Entfernen"
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {isDropTargetBelow && (
                      <div className="h-1.5 bg-emerald-400 rounded-full my-1 shadow-md shadow-emerald-500/50 animate-pulse transition-all" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
