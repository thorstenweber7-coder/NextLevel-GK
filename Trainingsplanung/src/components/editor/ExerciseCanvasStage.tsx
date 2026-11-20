import React, { useState } from 'react';
import type { TacticalCanvasData } from '../../types';
import { TacticalCanvas, type TacticalCanvasRef } from '../TacticalCanvas';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ExerciseCanvasStageProps {
  canvasRef: React.RefObject<TacticalCanvasRef | null>;
  initialData?: TacticalCanvasData;
  onChange?: (data: TacticalCanvasData, previewUrl: string) => void;
  width?: number;
  height?: number;
  onOpenAnimation?: () => void;
  animationFramesCount?: number;
}

export const ExerciseCanvasStage: React.FC<ExerciseCanvasStageProps> = ({
  canvasRef,
  initialData,
  onChange,
  width = 864,
  height = 560,
  onOpenAnimation,
  animationFramesCount = 0
}) => {
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);

  return (
    <div
      className={cn(
        "bg-slate-900 border border-slate-800 shadow-2xl",
        isMobileFullscreen
          ? "fixed inset-0 z-50 rounded-none p-2 flex flex-col justify-between bg-slate-950 md:static md:z-auto md:rounded-3xl md:p-4 md:bg-slate-900"
          : "rounded-3xl p-3 sm:p-4"
      )}
    >
      {/* Mobile/Touch-only Fullscreen Toggle Bar (strictly hidden on md+ desktop) */}
      <div className="flex items-center justify-between mb-2 md:hidden">
        <span className="text-[11px] font-bold text-slate-400">
          {isMobileFullscreen ? 'Vollbild-Zeichenmodus (Mobil)' : 'Taktikboard'}
        </span>
        <button
          type="button"
          onClick={() => setIsMobileFullscreen(prev => !prev)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          {isMobileFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Fertig</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Vollbild zeichnen</span>
            </>
          )}
        </button>
      </div>

      <div className={cn(
        "relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950",
        isMobileFullscreen && "flex-1 overflow-auto md:flex-none"
      )}>
        <TacticalCanvas
          ref={canvasRef}
          initialData={initialData}
          onChange={onChange}
          width={width}
          height={height}
          onOpenAnimation={onOpenAnimation}
          animationFramesCount={animationFramesCount}
        />
      </div>
    </div>
  );
};
