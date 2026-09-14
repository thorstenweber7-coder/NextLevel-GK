import React from 'react';
import type { Player } from '../../types';
import { 
  Activity, 
  Mic, 
  MicOff, 
  CheckCircle2, 
  Save, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useSpeechToText } from '../../hooks/useSpeechToText';

export interface LiveDebriefDrawerProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  groupKeepers: Player[];
  quickRpeRatings: Record<string, number>;
  onRpeChange: (keeperId: string, rating: number) => void;
  quickJumpVolume: 'low' | 'medium' | 'high' | '';
  onJumpVolumeChange: (val: 'low' | 'medium' | 'high' | '') => void;
  quickKeeperJumpVolumes?: Record<string, 'low' | 'medium' | 'high' | string>;
  onKeeperJumpVolumeChange?: (keeperId: string, val: 'low' | 'medium' | 'high') => void;
  liveNote: string;
  onLiveNoteChange: (note: string) => void;
  onSaveDebrief: (closeAfter: boolean) => Promise<void>;
  isSavingDebrief: boolean;
}

const RPE_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Sehr leicht (Regeneration)', color: 'text-sky-400' },
  2: { text: 'Leicht', color: 'text-sky-300' },
  3: { text: 'Moderat', color: 'text-emerald-400' },
  4: { text: 'Etwas anstrengend', color: 'text-emerald-300' },
  5: { text: 'Anstrengend (Normal)', color: 'text-emerald-400' },
  6: { text: 'Intensiv', color: 'text-amber-400' },
  7: { text: 'Sehr intensiv', color: 'text-amber-300' },
  8: { text: 'Sehr hart', color: 'text-orange-400' },
  9: { text: 'Extrem fordernd', color: 'text-rose-400' },
  10: { text: 'Maximalbelastung', color: 'text-rose-500' }
};

export const LiveDebriefDrawer: React.FC<LiveDebriefDrawerProps> = ({
  isOpen,
  onToggleOpen,
  groupKeepers,
  quickRpeRatings,
  onRpeChange,
  quickJumpVolume,
  onJumpVolumeChange,
  liveNote,
  onLiveNoteChange,
  onSaveDebrief,
  isSavingDebrief
}) => {
  // Voice to text integration
  const {
    isListening,
    isSupported: isSpeechSupported,
    toggleListening
  } = useSpeechToText({
    onResult: (chunk: string, fullTranscript?: string) => {
      const textToAppend = fullTranscript || chunk;
      onLiveNoteChange(liveNote.trim() ? `${liveNote.trim()}\n${textToAppend}` : textToAppend);
    }
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all">
      {/* Header (Accordion Toggle) */}
      <div
        onClick={onToggleOpen}
        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/60 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Live-Debriefing & Belastungs-Dokumentation</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                sRPE & Sprungvolumen
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Schnelle RPE-Erfassung (1–10), Sprungvolumen und Coaching-Sprachnotizen direkt nach der Einheit
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Accordion Content */}
      {isOpen && (
        <div className="px-4 pb-6 sm:px-6 sm:pb-7 pt-2 border-t border-slate-800/80 space-y-6 animate-in fade-in duration-200">
          {/* 1. KEEPER RPE SLIDERS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                1. Subjektive Belastungsempfindung (sRPE 1–10)
              </span>
              <span className="text-[11px] text-slate-400">{groupKeepers.length} Torhüter</span>
            </div>

            {groupKeepers.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                Keine Torhüter der Trainingsgruppe zugewiesen.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupKeepers.map(keeper => {
                  const rating = quickRpeRatings[keeper.id] || 5;
                  const labelObj = RPE_LABELS[rating] || RPE_LABELS[5];

                  return (
                    <div
                      key={keeper.id}
                      className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-white">
                          {`${keeper.firstName || ''} ${keeper.lastName || ''}`.trim() || 'Torhüter'} {keeper.jerseyNumber ? `(#${keeper.jerseyNumber})` : ''}
                        </span>
                        <span className={cn("text-[11px] font-bold", labelObj.color)}>
                          {rating} - {labelObj.text}
                        </span>
                      </div>

                      {/* Slider 1 to 10 */}
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={rating}
                          onChange={(e) => onRpeChange(keeper.id, parseInt(e.target.value, 10))}
                          className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                        />
                        <span className="w-7 text-center font-mono font-black text-sm text-emerald-400 bg-slate-900 py-0.5 rounded-lg border border-slate-800">
                          {rating}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. JUMP VOLUME ESTIMATION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                2. Mechanische Aufprall- & Sprungbelastung
              </span>
              <span className="text-[11px] text-slate-400">Torwart-Sprungvolumen</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { key: 'low', label: 'Low (< 20 Sprünge)', sub: 'Technik / WarmUp / Regeneration' },
                { key: 'medium', label: 'Medium (20–40 Sprünge)', sub: 'Reguläres Torwarttraining' },
                { key: 'high', label: 'High (> 40 Sprünge)', sub: 'Intensives Flanken- & Sprungkrafttraining' }
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onJumpVolumeChange(opt.key as any)}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition active:scale-95 cursor-pointer space-y-1",
                    quickJumpVolume === opt.key
                      ? "bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  )}
                >
                  <span className="text-xs font-extrabold text-white block">{opt.label}</span>
                  <p className="text-[10.5px] text-slate-400 leading-tight">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. COACH LIVE NOTES & SPEECH TO TEXT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                3. Trainer-Coaching-Notizen
              </span>

              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow min-h-[44px]",
                    isListening
                      ? "bg-rose-600 text-white animate-pulse ring-2 ring-rose-400 shadow-rose-950"
                      : "bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30"
                  )}
                  title={isListening ? "Sprachaufnahme beenden" : "Sprachnotiz per Mikrofon diktieren"}
                >
                  {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  <span>{isListening ? 'Aufnahme aktiv...' : 'Per Sprache diktieren'}</span>
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={liveNote}
              onChange={(e) => onLiveNoteChange(e.target.value)}
              placeholder="Beobachtungen zu Torhütern, individuellen Fortschritten oder Übungsanpassungen..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
            />
          </div>

          {/* 4. SAVE BUTTONS */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSavingDebrief}
              onClick={() => onSaveDebrief(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 active:scale-95 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingDebrief ? 'Speichere...' : 'Zwischenspeichern'}</span>
            </button>

            <button
              type="button"
              disabled={isSavingDebrief}
              onClick={() => onSaveDebrief(true)}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSavingDebrief ? 'Speichere...' : 'Debriefing abschließen'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
