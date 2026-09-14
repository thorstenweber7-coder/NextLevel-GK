import React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  Zap, 
  ArrowLeft, 
  Activity, 
  Clock, 
  Target, 
  Shield,
  Layers 
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PeriodizationContextCardProps {
  matchedPeriodization: any;
  isPeriodizationOpen: boolean;
  setIsPeriodizationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  planDate: string;
  onNavigateToOrga?: (subTab?: 'periodization' | 'structure' | 'groups' | 'dataEntry' | 'stats' | 'absences' | 'playtimes' | 'macro' | 'meso' | 'micro') => void;
  setIsWorkloadModalOpen: (open: boolean) => void;
  activeGroupWorkload: { hasDangerSpike: boolean; hasWarning: boolean };
}

export const PeriodizationContextCard: React.FC<PeriodizationContextCardProps> = ({
  matchedPeriodization,
  isPeriodizationOpen,
  setIsPeriodizationOpen,
  planDate,
  onNavigateToOrga,
  setIsWorkloadModalOpen,
  activeGroupWorkload
}) => {
  if (!matchedPeriodization || !matchedPeriodization.hasData) {
    return (
      <div className="bg-slate-950/60 rounded-xl px-4 py-2.5 border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-600" />
          <span>Keine Periodisierungsdaten für das Datum {new Date(planDate).toLocaleDateString('de-DE')} hinterlegt.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWorkloadModalOpen(true)}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition",
              activeGroupWorkload.hasDangerSpike
                ? "bg-rose-600 text-white font-black animate-pulse shadow-md shadow-rose-950"
                : activeGroupWorkload.hasWarning
                ? "bg-amber-950 text-amber-300 border border-amber-800"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            )}
            title="Belastungssteuerung & ACWR-Monitoring öffnen"
          >
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>Belastung{activeGroupWorkload.hasDangerSpike ? ' (!)' : ''}</span>
          </button>

          {onNavigateToOrga && (
            <button
              type="button"
              onClick={() => onNavigateToOrga('macro')}
              className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer"
            >
              Periodisierung anlegen →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Header: Zyklus, Meso-Plan & Woche (Klickbar zum Auf-/Zuklappen) */}
      <div
        onClick={() => setIsPeriodizationOpen(prev => !prev)}
        className={cn(
          "p-3.5 flex items-center justify-between cursor-pointer select-none transition gap-2",
          isPeriodizationOpen ? "border-b border-slate-800/80 bg-slate-900/60" : "hover:bg-slate-900/40"
        )}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button
            type="button"
            className="p-1 rounded text-slate-400 hover:text-white flex-shrink-0"
          >
            {isPeriodizationOpen ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[11px] font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Periodisierungs-Schwerpunkte</span>
          </span>
          <span className="text-xs font-bold text-white truncate">
            {matchedPeriodization.mesoPlan?.name}
          </span>
          {matchedPeriodization.matchedWeekNumber && (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10.5px] font-mono font-semibold">
              Woche {matchedPeriodization.matchedWeekNumber}
            </span>
          )}
          {matchedPeriodization.athleticReizName && matchedPeriodization.athleticReizName !== 'unspezifisch' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/60 text-[10.5px] font-semibold flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>Reiz: {matchedPeriodization.athleticReizName}</span>
            </span>
          )}
          <span className="text-[11px] text-slate-400">
            (Trainingstag: {new Date(planDate).toLocaleDateString('de-DE')})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {onNavigateToOrga && (
            <button
              type="button"
              onClick={() => onNavigateToOrga('macro')}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
              title="Zur Periodisierungs- & Saisonplanung wechseln"
            >
              <span>Periodisierung</span>
              <ArrowLeft className="w-3 h-3 rotate-180" />
            </button>
          )}

          {/* Belastung Button rechts neben Periodisierung */}
          <button
            type="button"
            onClick={() => setIsWorkloadModalOpen(true)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer",
              activeGroupWorkload.hasDangerSpike
                ? "bg-rose-600 text-white border border-rose-400 font-black animate-pulse shadow-rose-900/50 shadow-md ring-2 ring-rose-500/50"
                : activeGroupWorkload.hasWarning
                ? "bg-amber-950/90 text-amber-300 border border-amber-700/70 hover:bg-amber-900/80"
                : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white"
            )}
            title="Belastungssteuerung & ACWR-Monitoring öffnen"
          >
            <Activity className={cn("w-3.5 h-3.5", activeGroupWorkload.hasDangerSpike ? "text-white" : "text-emerald-400")} />
            <span>
              Belastung{activeGroupWorkload.hasDangerSpike ? ' (!)' : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Aufklappbarer Inhalt: 4 Spalten nebeneinander (1. Mikroplanung, 2. Athletik, 3. ZV, 4. RV) */}
      {isPeriodizationOpen && (
        <div className="p-3.5 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* 1. Kachel (ganz links): Mikroplanung (Trainingstag in 2 Spalten) */}
            <div className="bg-slate-900/90 border border-indigo-500/25 rounded-xl p-2.5 sm:p-3 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                  <span className="text-[10.5px] uppercase font-black text-indigo-400 flex items-center gap-1 tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mikroplanung (Tag)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    {matchedPeriodization.day?.dayName || new Date(planDate).toLocaleDateString('de-DE', { weekday: 'short' })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Linke Spalte: TW-Training */}
                  <div className="space-y-1.5 border-r border-slate-800/80 pr-1.5">
                    <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">
                      TW-Training
                    </span>
                    <div>
                      <span className="text-[9.5px] text-slate-400 block font-semibold">Thema:</span>
                      <span className="text-indigo-200 font-bold block text-xs leading-tight" title={matchedPeriodization.microTopic}>
                        {matchedPeriodization.microTopic || '–'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 block font-semibold">Intensität TW:</span>
                      <span className="text-amber-400 font-extrabold text-xs">
                        {matchedPeriodization.microTwIntensity ? `${matchedPeriodization.microTwIntensity} / 10` : '–'}
                      </span>
                    </div>
                  </div>

                  {/* Rechte Spalte: Teamtraining */}
                  <div className="space-y-1.5 pl-0.5">
                    <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider">
                      Teamtraining
                    </span>
                    <div>
                      <span className="text-[9.5px] text-slate-400 block font-semibold">Schwerpunkt:</span>
                      <span className="text-slate-200 font-bold block text-xs leading-tight" title={matchedPeriodization.microTeamFocus}>
                        {matchedPeriodization.microTeamFocus || '–'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 block font-semibold">Spielfeldgröße:</span>
                      <span className="text-slate-200 font-bold text-xs">
                        {matchedPeriodization.microFieldSize || '–'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 block font-semibold">Intensität TW:</span>
                      <span className="text-amber-300 font-bold text-xs">
                        {matchedPeriodization.microTeamIntensity !== '' && matchedPeriodization.microTeamIntensity !== undefined
                          ? `${matchedPeriodization.microTeamIntensity} / 10`
                          : '–'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Kachel (rechts neben Mikro): Athletischer Entwicklungsreiz (Mesoplanung) */}
            <div className="bg-slate-900/90 border border-amber-500/25 rounded-xl p-2.5 sm:p-3 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                  <span className="text-[10.5px] uppercase font-black text-amber-400 flex items-center gap-1 tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Athletischer Reiz</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-500 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    {matchedPeriodization.isAdultMode ? 'Microdosing' : 'Meso'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Reiz / Schwerpunkt:</span>
                    <span className="text-amber-300 font-extrabold text-xs block">
                      {matchedPeriodization.athleticReizName || 'unspezifisch'}
                    </span>
                  </div>
                  {matchedPeriodization.athleticReizDescription && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Erklärung & Fokus:</span>
                      <p className="text-slate-300 text-[11px] leading-relaxed mt-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 whitespace-pre-line max-h-[92px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {matchedPeriodization.athleticReizDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Kachel: Zielverteidigung (Mesoplanung) */}
            <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-2.5 sm:p-3 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                  <span className="text-[10.5px] uppercase font-black text-emerald-400 flex items-center gap-1 tracking-wider">
                    <Target className="w-3.5 h-3.5" />
                    <span>Zielverteidigung (ZV)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-500 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    Meso
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Entwicklungsziel:</span>
                    <span className="text-slate-200 font-bold block text-xs">
                      {matchedPeriodization.targetDefenseGoals || '–'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Technikfokus ZV 1:</span>
                    <span className="text-emerald-300 font-bold block text-xs">
                      {matchedPeriodization.targetDefenseTechnique1 || '–'}
                    </span>
                  </div>
                  {matchedPeriodization.targetDefenseTechnique2 && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Technikfokus ZV 2:</span>
                      <span className="text-emerald-300 font-bold block text-xs">
                        {matchedPeriodization.targetDefenseTechnique2}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Kachel (ganz rechts): Raumverteidigung (Mesoplanung) */}
            <div className="bg-slate-900/90 border border-sky-500/20 rounded-xl p-2.5 sm:p-3 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                  <span className="text-[10.5px] uppercase font-black text-sky-400 flex items-center gap-1 tracking-wider">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Raumverteidigung (RV)</span>
                  </span>
                  <span className="text-[9.5px] font-semibold text-slate-500 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    Meso
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Entwicklungsziel:</span>
                    <span className="text-slate-200 font-bold block text-xs">
                      {matchedPeriodization.spaceDefenseGoals || '–'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Technikfokus RV 1:</span>
                    <span className="text-sky-300 font-bold block text-xs">
                      {matchedPeriodization.spaceDefenseTechnique1 || '–'}
                    </span>
                  </div>
                  {matchedPeriodization.spaceDefenseTechnique2 && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Technikfokus RV 2:</span>
                      <span className="text-sky-300 font-bold block text-xs">
                        {matchedPeriodization.spaceDefenseTechnique2}
                      </span>
                    </div>
                  )}
                  {matchedPeriodization.spaceDefenseTechnique3 && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Technikfokus RV 3:</span>
                      <span className="text-sky-300 font-bold block text-xs">
                        {matchedPeriodization.spaceDefenseTechnique3}
                      </span>
                    </div>
                  )}
                  {matchedPeriodization.spaceDefenseTechnique4 && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Technikfokus RV 4:</span>
                      <span className="text-sky-300 font-bold block text-xs">
                        {matchedPeriodization.spaceDefenseTechnique4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
