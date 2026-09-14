import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  ArrowRight, 
  FileDown, 
  Loader2, 
  X 
} from 'lucide-react';
import { cn } from '../utils/cn';
import { 
  PERIODIZATION_TOPICS,
  type PeriodizationTopic,
  type TrainingGroup,
  type PeriodizationSeason,
  type MacroPlan
} from '../types';

interface MacroPlanEditorProps {
  selectedHalfYear: 1 | 2;
  setSelectedHalfYear: (hy: 1 | 2) => void;
  activeSeason: PeriodizationSeason | null;
  activeGroup: TrainingGroup | null;
  activeMacroPlan: MacroPlan | null;
  draftSessionsPerWeek: number;
  setDraftSessionsPerWeek: React.Dispatch<React.SetStateAction<number>>;
  draftTrainingWeeksPerYear: number;
  setDraftTrainingWeeksPerYear: React.Dispatch<React.SetStateAction<number>>;
  totalHalfYearSessions: number;
  allocatedMacroSessions: number;
  remainingMacroSessions: number;
  macroTopicDraft: Record<PeriodizationTopic, number>;
  handleTopicCountChange: (topicId: PeriodizationTopic, delta: number) => void;
  macroValidationError: string | null;
  setMacroValidationError: (err: string | null) => void;
  isMacroSaved: boolean;
  handleSaveMacroPlan: () => void;
  handleSelectMesoStage: () => void;
  handleExportMacroPdf: () => void;
  isExportingPdf: boolean;
  hasSavedMacroPlanHalfYear1: boolean;
  hasSavedMacroPlanHalfYear2: boolean;
  handleExportHalfYearEvaluationPdf: (halfYear: 1 | 2) => void;
  isExportingHalfYearPdf: 1 | 2 | null;
  readOnly?: boolean;
}

export const MacroPlanEditor: React.FC<MacroPlanEditorProps> = ({
  selectedHalfYear,
  setSelectedHalfYear,
  draftSessionsPerWeek,
  setDraftSessionsPerWeek,
  draftTrainingWeeksPerYear,
  setDraftTrainingWeeksPerYear,
  totalHalfYearSessions,
  allocatedMacroSessions,
  remainingMacroSessions,
  macroTopicDraft,
  handleTopicCountChange,
  macroValidationError,
  setMacroValidationError,
  isMacroSaved,
  activeMacroPlan,
  handleSaveMacroPlan,
  handleSelectMesoStage,
  handleExportMacroPdf,
  isExportingPdf,
  hasSavedMacroPlanHalfYear1,
  hasSavedMacroPlanHalfYear2,
  handleExportHalfYearEvaluationPdf,
  isExportingHalfYearPdf,
  readOnly = false
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 animate-in fade-in">
      {/* Half-Year Selector Tabs & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700">
              Stufe 1 • Halbjährliche Makroplanung (ausbildungsorientiert)
            </span>
            {activeMacroPlan && (activeMacroPlan.createdByName || activeMacroPlan.ownerName || activeMacroPlan.ownerEmail) && (
              <span className="text-[10px] text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
                👤 Erstellt von: <strong className="text-slate-200">{activeMacroPlan.createdByName || activeMacroPlan.ownerName || activeMacroPlan.ownerEmail}</strong>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Verteile die Ausbildungseinheiten ({totalHalfYearSessions} TE) auf die 9 zentralen Torwartthemen.
          </p>
        </div>

        {/* Half Year Evaluation Actions & Toggle */}
        <div className="flex flex-col sm:items-end gap-2.5">
          {(hasSavedMacroPlanHalfYear1 || hasSavedMacroPlanHalfYear2) && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {hasSavedMacroPlanHalfYear1 && (
                <button
                  type="button"
                  onClick={() => handleExportHalfYearEvaluationPdf(1)}
                  disabled={isExportingHalfYearPdf !== null}
                  className="px-3.5 py-2 rounded-xl border border-purple-800/70 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-purple-100 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm flex-1 sm:flex-initial"
                  title="Soll/Ist-Vergleich und Reflexionen für das 1. Halbjahr als PDF exportieren"
                >
                  {isExportingHalfYearPdf === 1 ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>1. Halbjahr...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5" />
                      <span>1. Halbjahr auswerten</span>
                    </>
                  )}
                </button>
              )}

              {hasSavedMacroPlanHalfYear2 && (
                <button
                  type="button"
                  onClick={() => handleExportHalfYearEvaluationPdf(2)}
                  disabled={isExportingHalfYearPdf !== null}
                  className="px-3.5 py-2 rounded-xl border border-purple-800/70 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-purple-100 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm flex-1 sm:flex-initial"
                  title="Soll/Ist-Vergleich und Reflexionen für das 2. Halbjahr als PDF exportieren"
                >
                  {isExportingHalfYearPdf === 2 ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>2. Halbjahr...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5" />
                      <span>2. Halbjahr auswerten</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Half Year Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => setSelectedHalfYear(1)}
              className={cn(
                "px-4 py-2 rounded-xl transition cursor-pointer",
                selectedHalfYear === 1
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              1. Halbjahr (Juli – Dez)
            </button>
            <button
              type="button"
              onClick={() => setSelectedHalfYear(2)}
              className={cn(
                "px-4 py-2 rounded-xl transition cursor-pointer",
                selectedHalfYear === 2
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              2. Halbjahr (Jan – Juni)
            </button>
          </div>
        </div>
      </div>

      {/* Parameter Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* TW-Einheiten / Woche */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between shadow-md">
          <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
            TW-Einheiten / Woche
          </label>
          <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setDraftSessionsPerWeek(prev => Math.max(1, prev - 1))}
              disabled={readOnly || draftSessionsPerWeek <= 1}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer transition active:scale-95"
            >
              -
            </button>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-base text-emerald-400">
                {draftSessionsPerWeek}
              </span>
              <span className="text-[10px] font-bold text-slate-400">TE / Wo.</span>
            </div>
            <button
              type="button"
              onClick={() => setDraftSessionsPerWeek(prev => Math.min(14, prev + 1))}
              disabled={readOnly || draftSessionsPerWeek >= 14}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer transition active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Trainingswochen / Jahr */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between shadow-md">
          <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
            Trainingswochen / Jahr
          </label>
          <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setDraftTrainingWeeksPerYear(prev => Math.max(1, prev - 1))}
              disabled={readOnly || draftTrainingWeeksPerYear <= 1}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer transition active:scale-95"
            >
              -
            </button>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-base text-sky-400">
                {draftTrainingWeeksPerYear}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Wochen</span>
            </div>
            <button
              type="button"
              onClick={() => setDraftTrainingWeeksPerYear(prev => Math.min(52, prev + 1))}
              disabled={readOnly || draftTrainingWeeksPerYear >= 52}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer transition active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* TW-Einheiten / Jahr */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/40 border border-emerald-500/40 space-y-1.5 flex flex-col justify-between shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-black text-emerald-300 uppercase tracking-wider">
              TW-Einheiten / Jahr
            </label>
            <span className="text-[10px] text-slate-400 font-bold">
              {draftSessionsPerWeek} × {draftTrainingWeeksPerYear}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                {draftSessionsPerWeek * draftTrainingWeeksPerYear} <span className="text-xs font-bold text-emerald-300/80">TE</span>
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              Saison-Kontingent
            </span>
          </div>
        </div>
      </div>

      {/* Central Question Banner & Budget Status */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/60 via-slate-950 to-slate-900 border border-purple-500/40 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <span className="text-[10.5px] font-black uppercase tracking-wider text-purple-300">
            Planungs-Leitfrage
          </span>
          <h4 className="text-base sm:text-lg font-black text-white">
            „Welches Thema soll wie oft im {selectedHalfYear === 1 ? 'ersten' : 'zweiten'} Halbjahr trainiert werden?“
          </h4>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 px-4 py-3 rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
          <div className="text-left w-full sm:w-auto">
            <span className="text-[10px] text-slate-400 font-bold block whitespace-nowrap">
              TE pro Halbjahr
            </span>
            <span className="text-base sm:text-lg font-black text-sky-400">
              {totalHalfYearSessions} <span className="text-xs font-bold text-sky-300/80">TE</span>
            </span>
          </div>

          <div className="pt-2 sm:pt-0 sm:pl-6 text-left w-full sm:w-auto">
            <span className="text-[10px] text-slate-400 font-bold block whitespace-nowrap">
              verteilte TE
            </span>
            <span className={cn(
              "text-base sm:text-lg font-black",
              allocatedMacroSessions === totalHalfYearSessions 
                ? "text-emerald-400" 
                : allocatedMacroSessions > totalHalfYearSessions 
                ? "text-rose-400" 
                : "text-purple-400"
            )}>
              {allocatedMacroSessions} <span className="text-xs font-bold opacity-80">TE</span>
            </span>
          </div>

          <div className="pt-2 sm:pt-0 sm:pl-6 text-left w-full sm:w-auto">
            <span className="text-[10px] text-slate-400 font-bold block whitespace-nowrap">
              verbleibende TE
            </span>
            <span className={cn(
              "text-base sm:text-lg font-extrabold",
              remainingMacroSessions === 0 ? "text-emerald-400" : remainingMacroSessions < 0 ? "text-rose-400 font-black" : "text-amber-400"
            )}>
              {remainingMacroSessions} <span className="text-xs font-bold opacity-80">TE</span>
            </span>
          </div>
        </div>
      </div>

      {/* Topics Allocation Grid (9 Ausbildungs-Themen) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PERIODIZATION_TOPICS.map(topic => {
          const currentVal = macroTopicDraft[topic.id] || 0;
          const pct = totalHalfYearSessions > 0 ? (currentVal / totalHalfYearSessions) * 100 : 0;

          return (
            <div 
              key={topic.id}
              className="bg-slate-950 p-4 sm:p-5 rounded-3xl border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-3 transition shadow-md group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("px-2.5 py-0.5 rounded-lg text-xs font-black border", topic.badge)}>
                    {topic.label}
                  </span>
                  <span className="text-xs font-black text-slate-400">
                    {pct.toFixed(0)} %
                  </span>
                </div>
              </div>

              {/* Increment/Decrement Controls */}
              <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400">
                  Einheiten:
                </span>
                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-755">
                  <button
                    type="button"
                    onClick={() => handleTopicCountChange(topic.id, -1)}
                    disabled={readOnly || currentVal <= 0}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center disabled:opacity-30 active:scale-95 transition cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-black text-sm text-white px-2 min-w-[28px] text-center">
                    {currentVal}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTopicCountChange(topic.id, 1)}
                    disabled={readOnly || allocatedMacroSessions >= totalHalfYearSessions}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center disabled:opacity-30 active:scale-95 transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Incomplete Allocation Error Banner */}
      {macroValidationError && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in shadow-xl shadow-rose-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-900 border border-rose-600 text-rose-200 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h5 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>Fehlermeldung: Einheiten nicht vollständig verteilt!</span>
              </h5>
              <p className="text-rose-200 font-medium">{macroValidationError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMacroValidationError(null)}
            className="p-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom Controls: Save Macro Plan & Next Step */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <div className="text-xs text-slate-400">
          {isMacroSaved ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Makroplan für das {selectedHalfYear}. Halbjahr ist gespeichert.
            </span>
          ) : activeMacroPlan ? (
            <span className="text-amber-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4" />
              Ungespeicherte Änderungen in der Einheitenverteilung.
            </span>
          ) : (
            <span className="text-amber-400 font-bold">
              Noch nicht gespeichert. Bitte verteile die Einheiten und klicke auf Speichern.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportMacroPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            title="Makroplanung und Einheitenverteilung als PDF herunterladen"
          >
            <FileDown className="w-4 h-4 text-purple-400" />
            <span>{isExportingPdf ? 'PDF wird erstellt...' : 'Als PDF ausgeben'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveMacroPlan}
            disabled={readOnly || isMacroSaved}
            className={cn(
              "px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition",
              readOnly || isMacroSaved
                ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950 active:scale-95 cursor-pointer"
            )}
          >
            <Save className="w-4 h-4" />
            <span>
              {readOnly
                ? 'Nur Lesezugriff (Trainer zugewiesen)'
                : isMacroSaved
                ? 'Makroplanung gespeichert'
                : 'Makroplanung speichern'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSelectMesoStage}
            disabled={!readOnly && !isMacroSaved}
            className={cn(
              "px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition",
              !readOnly && !isMacroSaved
                ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60"
                : "text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-950 cursor-pointer"
            )}
            title={!readOnly && !isMacroSaved ? "Bitte speichere zuerst die Makroplanung" : "Weiter zur Mesoplanung"}
          >
            <span>Weiter zur Mesoplanung</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
