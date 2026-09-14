import React from 'react';
import type { TacticalCanvasData } from '../../types';
import { TacticalCanvas, type TacticalCanvasRef } from '../TacticalCanvas';

export interface ExerciseCanvasStageProps {
  canvasRef: React.RefObject<TacticalCanvasRef | null>;
  initialData?: TacticalCanvasData;
  onChange?: (data: TacticalCanvasData, previewUrl: string) => void;
  width?: number;
  height?: number;
}

export const ExerciseCanvasStage: React.FC<ExerciseCanvasStageProps> = ({
  canvasRef,
  initialData,
  onChange,
  width = 864,
  height = 560
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
        <TacticalCanvas
          ref={canvasRef}
          initialData={initialData}
          onChange={onChange}
          width={width}
          height={height}
        />
      </div>
    </div>
  );
};
