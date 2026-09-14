import React, { useState } from 'react';
import type { MethodischeReiheStufen, MethodicalProgression } from '../../types';
import { METHODISCHE_REIHE_LABELS } from '../../types';
import { 
  GitFork, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2
} from 'lucide-react';

export interface MethodicalChainDrawerProps {
  methodikStufen: MethodischeReiheStufen;
  onMethodikStufenChange: (stufen: MethodischeReiheStufen) => void;
  technikName?: string;
  progressions?: MethodicalProgression[];
  onApplyTemplate?: (template: MethodischeReiheStufen, source: 'user' | 'club' | 'global') => void;
}

export const MethodicalChainDrawer: React.FC<MethodicalChainDrawerProps> = ({
  methodikStufen,
  onMethodikStufenChange
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleStageChange = (key: keyof MethodischeReiheStufen, value: string) => {
    onMethodikStufenChange({
      ...methodikStufen,
      [key]: value
    });
  };

  const stufenKeys: Array<keyof MethodischeReiheStufen> = ['stufe1', 'stufe2', 'stufe3', 'stufe4', 'stufe5', 'stufe6'];

  const filledCount = stufenKeys.filter(k => Boolean(methodikStufen[k]?.trim())).length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all">
      {/* Drawer Header (Kompakt & platzsparend) */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="px-3.5 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-850/60 transition select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex-shrink-0">
            <GitFork className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-extrabold text-white">
              Methodische Reihe
            </h4>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
              {filledCount} / 6 Stufen
            </span>
          </div>
        </div>

        <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Drawer Content */}
      {isOpen && (
        <div className="px-3.5 pb-4 sm:px-4 sm:pb-5 pt-2 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
          {/* Stufen 1 to 6 Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {stufenKeys.map((key, idx) => {
              const label = METHODISCHE_REIHE_LABELS[key] || `Stufe ${idx + 1}`;
              const val = methodikStufen[key] || '';

              return (
                <div key={key} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-purple-950 text-purple-300 border border-purple-800 flex items-center justify-center font-black text-[9px]">
                        {idx + 1}
                      </span>
                      <span>{label}</span>
                    </span>
                    {val.trim() && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={val}
                    onChange={(e) => handleStageChange(key, e.target.value)}
                    placeholder={`Ablauf und Coaching für ${label}...`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
