import React from 'react';
import type { TrainingPlan } from '../../types';
import { 
  FileDown, 
  Save, 
  Smartphone, 
  Printer, 
  Share2, 
  AlertTriangle,
  RefreshCw,
  PlusCircle
} from 'lucide-react';

export interface PlannerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExporting: boolean;
  isTopicValid?: boolean;
  planTitle: string;
  planDate: string;
  targetGroup: string;
  availableKeepers: number;
  stats: { totalMinutes: number; totalCount: number };
  onInitiateExport: (action: 'full' | 'compact' | 'share_compact' | 'share_full' | 'save_only') => void;
  duplicateConflictPlan: TrainingPlan | null;
  onResolveConflict: (mode: 'replace' | 'create_b' | 'skip_history') => void;
  onCancelConflict: () => void;
}

export const PlannerExportModal: React.FC<PlannerExportModalProps> = ({
  isOpen,
  onClose,
  isExporting,
  isTopicValid,
  planTitle,
  planDate,
  targetGroup,
  availableKeepers,
  stats,
  onInitiateExport,
  duplicateConflictPlan,
  onResolveConflict,
  onCancelConflict
}) => {
  const validTopic = isTopicValid !== undefined 
    ? isTopicValid 
    : Boolean(planTitle && planTitle.trim() && planTitle.trim().toLowerCase() !== 'offen');

  if (!isOpen && !duplicateConflictPlan) return null;

  return (
    <>
      {/* 2-in-1 PDF Export & Share Modal */}
      {isOpen && !duplicateConflictPlan && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  <FileDown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    Trainingsplan abschließen & exportieren
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Wähle dein bevorzugtes Format für Smartphone, Druck oder digitale Weitergabe.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isExporting || !validTopic}
                  onClick={() => onInitiateExport('save_only')}
                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 active:scale-95 transition flex items-center gap-1.5 shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title={!validTopic ? "Thema ist ein Pflichtfeld" : "Trainingseinheit direkt ohne PDF-Generierung in die Historie ablegen"}
                >
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>Nur Planung abschließen</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Validation Warning Alert if topic is invalid */}
            {!validTopic && (
              <div className="p-3.5 bg-rose-950/90 border border-rose-500/60 rounded-2xl flex items-center gap-3 text-rose-200 text-xs font-bold shadow-lg animate-in fade-in">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div>
                  <div className="font-extrabold text-rose-100">Thema ist ein Pflichtfeld!</div>
                  <div className="text-[11px] text-rose-300/90 font-normal mt-0.5">
                    Das Thema der Trainingseinheit ist aktuell auf „{planTitle || 'offen'}“ gesetzt. Bitte schließe dieses Fenster und wähle ein gültiges Thema aus.
                  </div>
                </div>
              </div>
            )}

            {/* Session Info Ribbon */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span className={validTopic ? "text-emerald-400" : "text-rose-400 font-bold"}>
                  ⚽ {planTitle || 'offen'} {!validTopic && '(Pflichtfeld!)'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">📅 {planDate}</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-400">
                <span className="text-sky-400">{availableKeepers} TW</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400">{stats.totalMinutes} Min.</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">{stats.totalCount} Übungen</span>
              </div>
            </div>

            {/* 3 Clear Export & Share Action Buttons */}
            <div className="space-y-3 pt-1">
              {/* Button 1: Ausführliches Dokument */}
              <button
                type="button"
                disabled={isExporting || !validTopic}
                onClick={() => onInitiateExport('full')}
                className="w-full p-4.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.99] transition shadow-lg shadow-emerald-950/60 flex items-center justify-between gap-4 border border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-400/40 text-emerald-300 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-sm sm:text-base">
                      Ausführliches Dokument zur digitalen Nutzung (mehrseitig)
                    </div>
                    <div className="text-xs text-emerald-200/80 font-normal mt-0.5">
                      Mehrseitiges PDF mit Großgrafiken, vollständigen Abläufen & Coaching-Punkten
                    </div>
                  </div>
                </div>
                <FileDown className="w-5 h-5 text-emerald-200 flex-shrink-0 group-hover:translate-y-0.5 transition-transform" />
              </button>

              {/* Button 2: Kompaktes Klemmbrett-Blatt */}
              <button
                type="button"
                disabled={isExporting || !validTopic}
                onClick={() => onInitiateExport('compact')}
                className="w-full p-4.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 active:scale-[0.99] transition shadow-lg shadow-sky-950/60 flex items-center justify-between gap-4 border border-sky-500/40 disabled:opacity-40 disabled:cursor-not-allowed group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-sky-950/70 border border-sky-400/40 text-sky-300 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-sm sm:text-base">
                      Kompaktes Klemmbrett-Blatt zum ausdrucken (einseitig)
                    </div>
                    <div className="text-xs text-sky-200/80 font-normal mt-0.5">
                      Kompakte 1-Seiten-Übersicht für den Ausdruck & die Arbeit auf dem Platz
                    </div>
                  </div>
                </div>
                <Printer className="w-5 h-5 text-sky-200 flex-shrink-0 group-hover:scale-105 transition-transform" />
              </button>

              {/* Buttons 3 & 4: Direktes Teilen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={isExporting || !validTopic}
                  onClick={() => onInitiateExport('share_compact')}
                  className="w-full p-4 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 active:scale-[0.99] transition shadow-lg shadow-purple-950/60 flex items-center justify-between gap-3 border border-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-400/40 text-purple-300 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-white text-xs sm:text-sm truncate">
                        Kompakten Plan teilen
                      </div>
                      <div className="text-[11px] text-purple-200/80 font-normal truncate mt-0.5">
                        1-Seiten Klemmbrett-PDF
                      </div>
                    </div>
                  </div>
                  <Share2 className="w-4 h-4 text-purple-200 flex-shrink-0 group-hover:scale-110 transition-transform" />
                </button>

                <button
                  type="button"
                  disabled={isExporting || !validTopic}
                  onClick={() => onInitiateExport('share_full')}
                  className="w-full p-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-700 to-purple-800 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.99] transition shadow-lg shadow-indigo-950/60 flex items-center justify-between gap-3 border border-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-400/40 text-indigo-300 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-white text-xs sm:text-sm truncate">
                        Ausführlichen Plan teilen
                      </div>
                      <div className="text-[11px] text-indigo-200/80 font-normal truncate mt-0.5">
                        Mehrseitiges Detail-PDF
                      </div>
                    </div>
                  </div>
                  <Share2 className="w-4 h-4 text-indigo-200 flex-shrink-0 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Plan Conflict Resolution Modal */}
      {duplicateConflictPlan && (
        <div className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl shadow-amber-950/40 space-y-5 text-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Trainingseinheit bereits vorhanden
                  </h3>
                  <p className="text-xs text-amber-300/80 mt-0.5">
                    Für dieses Datum & diese Gruppe gibt es bereits einen Eintrag
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancelConflict}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Conflict Info Card */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 font-semibold">Datum:</span>
                <span className="font-bold text-white">📅 {planDate}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 font-semibold">Trainingsgruppe:</span>
                <span className="font-bold text-emerald-400">👥 {targetGroup || 'nicht zugeordnet'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-semibold">Bereits in Historie:</span>
                <span className="font-bold text-slate-200">
                  &quot;{duplicateConflictPlan.title || duplicateConflictPlan.planTitle || 'Einheit'}&quot; ({duplicateConflictPlan.totalMinutes || duplicateConflictPlan.totalDuration || 0} Min.)
                </span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2.5 pt-1">
              {/* Option 1: Vorhandene Einheit überschreiben */}
              <button
                type="button"
                onClick={() => onResolveConflict('replace')}
                className="w-full p-3.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-between gap-3 text-left transition active:scale-[0.99] font-bold text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white">Vorhandene Einheit aktualisieren</div>
                    <div className="text-[11px] text-emerald-300/70 font-normal">Überschreibt den gespeicherten Plan für dieses Datum</div>
                  </div>
                </div>
              </button>

              {/* Option 2: Als 2. Einheit (B) anlegen */}
              <button
                type="button"
                onClick={() => onResolveConflict('create_b')}
                className="w-full p-3.5 rounded-2xl bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 hover:text-white flex items-center justify-between gap-3 text-left transition active:scale-[0.99] font-bold text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white">Als 2. Einheit (B) anlegen</div>
                    <div className="text-[11px] text-sky-300/70 font-normal">Speichert diese Einheit als &quot;{planDate} (B)&quot; parallel ab</div>
                  </div>
                </div>
              </button>

              {/* Option 3: Nur exportieren ohne Historie-Eintrag */}
              <button
                type="button"
                onClick={() => onResolveConflict('skip_history')}
                className="w-full p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-between gap-3 text-left transition active:scale-[0.99] font-bold text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-700 text-slate-300 group-hover:scale-105 transition-transform">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white">Nur exportieren / teilen</div>
                    <div className="text-[11px] text-slate-400 font-normal">Lädt PDF herunter ohne die Historie zu verändern</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
