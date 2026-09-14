import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Sparkles, 
  Dumbbell, 
  ShieldCheck, 
  Move, 
  BrainCircuit, 
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import type { MesoPlan } from '../types';
import { cn } from '../utils/cn';

interface MesoReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesoPlan: MesoPlan;
  onSaveReflection: (reflectionData: {
    athleticStimulusAchieved?: 'ja' | 'in Teilen' | 'nein';
    targetDefenseReflection?: string;
    spaceDefenseReflection?: string;
    intensityFocusLearning?: string;
  }) => Promise<void> | void;
}

export const MesoReflectionModal: React.FC<MesoReflectionModalProps> = ({
  isOpen,
  onClose,
  mesoPlan,
  onSaveReflection
}) => {
  const [stimulusAchieved, setStimulusAchieved] = useState<'ja' | 'in Teilen' | 'nein' | undefined>(
    mesoPlan.athleticStimulusAchieved || undefined
  );
  const [targetDefenseReflection, setTargetDefenseReflection] = useState<string>(
    mesoPlan.targetDefenseReflection || ''
  );
  const [spaceDefenseReflection, setSpaceDefenseReflection] = useState<string>(
    mesoPlan.spaceDefenseReflection || ''
  );
  const [intensityFocusLearning, setIntensityFocusLearning] = useState<string>(
    mesoPlan.intensityFocusLearning || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveReflection({
        athleticStimulusAchieved: stimulusAchieved,
        targetDefenseReflection: targetDefenseReflection.trim(),
        spaceDefenseReflection: spaceDefenseReflection.trim(),
        intensityFocusLearning: intensityFocusLearning.trim()
      });
    } catch (err) {
      console.error('Error saving reflection:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-950/60 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Reflexion der Mesoplanung
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950/70 text-purple-300 border border-purple-800 font-mono">
                  {mesoPlan.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">
                Reflektiere den abgeschlossenen Mesozyklus, bevor du die nächste Mesoplanung anlegst.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Zyklus-Info Box */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="font-bold">Zeitraum:</span>
              <span className="text-slate-400 font-mono">
                {mesoPlan.startDate} bis {mesoPlan.endDate}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Zyklus {mesoPlan.mesoIndex} von 5
            </div>
          </div>

          {/* 1. Athletischer Entwicklungsreiz */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-md">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
              <Dumbbell className="w-4 h-4" />
              <span>1. Athletischer Entwicklungsreiz</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                  Verfolgter Reiz im Mesozyklus
                </span>
                <span className="text-sm font-extrabold text-white">
                  {mesoPlan.athleticFocus || 'Nicht definiert / Unspezifisch'}
                </span>
              </div>
            </div>

            {/* Frage: Wurde der Reiz gesetzt? */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-300 block">
                Wurde der Reiz gesetzt?
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStimulusAchieved('ja')}
                  className={cn(
                    "py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer border flex items-center justify-center gap-1.5",
                    stimulusAchieved === 'ja'
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ja</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStimulusAchieved('in Teilen')}
                  className={cn(
                    "py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer border flex items-center justify-center gap-1.5",
                    stimulusAchieved === 'in Teilen'
                      ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>in Teilen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStimulusAchieved('nein')}
                  className={cn(
                    "py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer border flex items-center justify-center gap-1.5",
                    stimulusAchieved === 'nein'
                      ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>nein</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Zielverteidigung (ZV) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-md">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>2. Zielverteidigung (ZV)</span>
            </div>

            {/* Übersicht der definierten Schwerpunkte */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  Konkrete Entwicklungsziele in der Zielverteidigung:
                </span>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">
                  {mesoPlan.targetDefenseGoals || <span className="text-slate-500 italic">Keine Angabe</span>}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] font-bold text-emerald-400 block uppercase">Technikfokus ZV 1</span>
                  <span className="text-xs font-extrabold text-white">
                    {mesoPlan.targetDefenseTechnique1 || <span className="text-slate-500 italic">–</span>}
                  </span>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] font-bold text-emerald-400 block uppercase">Technikfokus ZV 2</span>
                  <span className="text-xs font-extrabold text-white">
                    {mesoPlan.targetDefenseTechnique2 || <span className="text-slate-500 italic">–</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Freitext: Reflexion des Zielverteidigungsziels */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Reflexion des Zielverteidigungsziels
              </label>
              <textarea
                value={targetDefenseReflection}
                onChange={e => setTargetDefenseReflection(e.target.value)}
                placeholder="Wie wurden die Zielverteidigungsziele und Technikfokuspunkte im Zyklus umgesetzt? Fortschritte, Beobachtungen..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* 3. Raumverteidigung (RV) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-md">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-400">
              <Move className="w-4 h-4" />
              <span>3. Raumverteidigung (RV)</span>
            </div>

            {/* Übersicht der definierten Schwerpunkte */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  Konkrete Entwicklungsziele in der Raumverteidigung:
                </span>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">
                  {mesoPlan.spaceDefenseGoals || <span className="text-slate-500 italic">Keine Angabe</span>}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] font-bold text-sky-400 block uppercase">Technikfokus RV 1</span>
                  <span className="text-xs font-extrabold text-white">
                    {mesoPlan.spaceDefenseTechnique3 || <span className="text-slate-500 italic">–</span>}
                  </span>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] font-bold text-sky-400 block uppercase">Technikfokus RV 2</span>
                  <span className="text-xs font-extrabold text-white">
                    {mesoPlan.spaceDefenseTechnique4 || <span className="text-slate-500 italic">–</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Freitext: Reflexion des Raumverteidigungsziels */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Reflexion des Raumverteidigungsziels
              </label>
              <textarea
                value={spaceDefenseReflection}
                onChange={e => setSpaceDefenseReflection(e.target.value)}
                placeholder="Wie wurden die Raumverteidigungsziele und Technikfokuspunkte im Zyklus umgesetzt? Fortschritte, Beobachtungen..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* 4. Learning für Intensität & Fokus */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-md">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>4. Learning für Intensität & Fokus</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Welche Erkenntnisse nimmst du bezüglich Trainingsbelastung, Periodisierungswellen und methodischem Fokus mit?
            </p>
            <textarea
              value={intensityFocusLearning}
              onChange={e => setIntensityFocusLearning(e.target.value)}
              placeholder="z. B. Regenerationsphasen nach hohen Intensitäten einhalten; Fokus auf Ballangriff schärfen..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none leading-relaxed"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-extrabold text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-black text-white shadow-lg shadow-purple-950 flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Wird gespeichert...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Reflexion speichern</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
