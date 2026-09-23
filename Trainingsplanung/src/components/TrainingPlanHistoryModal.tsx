import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  History, 
  Calendar, 
  Clock, 
  Users, 
  Trash2, 
  FolderOpen, 
  Search, 
  CheckCircle2, 
  Check,
  AlertCircle,
  FileText,
  User,
  FileEdit,
  FileDown,
  Loader2,
  Archive,
  ArrowLeft,
  PlayCircle
} from 'lucide-react';
import type { TrainingPlan, Exercise, TrainingGroup, TrainingStructure } from '../types';
import { deletePlanFromFirestore } from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';
import { SessionDebriefModal } from './SessionDebriefModal';
import { LiveSessionModal } from './LiveSessionModal';
import { generateTrainingPlanHistoryPDF } from '../utils/pdfExport';
import { cn } from '../utils/cn';

interface TrainingPlanHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPlans: TrainingPlan[];
  exerciseMap: Map<string, Exercise>;
  structures?: TrainingStructure[];
  groups?: TrainingGroup[];
  onLoadPlan: (plan: TrainingPlan) => void;
  onPlanUpdated?: (updatedPlan: TrainingPlan) => void;
}

export const TrainingPlanHistoryModal: React.FC<TrainingPlanHistoryModalProps> = ({
  isOpen,
  onClose,
  savedPlans,
  exerciseMap,
  structures = [],
  groups = [],
  onLoadPlan,
  onPlanUpdated
}) => {
  const { user, currentClub, clubName } = useAuth();
  const [showArchive, setShowArchive] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [debriefingPlan, setDebriefingPlan] = useState<TrainingPlan | null>(null);
  const [liveSessionPlan, setLiveSessionPlan] = useState<TrainingPlan | null>(null);
  const [isExportingHistory, setIsExportingHistory] = useState(false);

  // 150ms debounce for search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sort training groups chronologically (earliest created group is first)
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [groups]);

  // Selected Group Tab State: defaults to the earliest created group (or 'ALL')
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    const sorted = [...groups].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return sorted[0]?.id || 'ALL';
  });

  // Whenever modal opens, preselect the earliest created group
  useEffect(() => {
    if (isOpen) {
      if (sortedGroups.length > 0) {
        setSelectedGroupId(sortedGroups[0].id);
      } else {
        setSelectedGroupId('ALL');
      }
    }
  }, [isOpen, sortedGroups]);

  const activePlans = savedPlans.filter(p => !p.isArchived);
  const archivedPlans = savedPlans.filter(p => Boolean(p.isArchived));
  const currentPool = showArchive ? archivedPlans : activePlans;

  // Extract all distinct trainer names from the pool for Club Admin / multi-trainer filtering
  const distinctTrainers = useMemo(() => {
    const set = new Set<string>();
    currentPool.forEach(p => {
      const t = (p.trainerName || p.authorName || p.createdByName || '').trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [currentPool]);

  const [selectedTrainer, setSelectedTrainer] = useState<string>('ALL');

  const getGroupPlanCount = (groupId: string) => {
    if (groupId === 'ALL') {
      return currentPool.length;
    }
    const grp = sortedGroups.find(g => g.id === groupId);
    if (!grp) return 0;
    return currentPool.filter(p => {
      const pTarget = (p.targetGroup || '').trim().toLowerCase();
      return pTarget === grp.name.trim().toLowerCase() || pTarget === grp.id.toLowerCase();
    }).length;
  };

  const filteredPlans = useMemo(() => {
    return currentPool.filter(p => {
      // 1. Group Filter (Tabs / Reiter)
      if (selectedGroupId !== 'ALL') {
        const selGroup = sortedGroups.find(g => g.id === selectedGroupId);
        if (selGroup) {
          const pTarget = (p.targetGroup || '').trim().toLowerCase();
          const matchesGroup = pTarget === selGroup.name.trim().toLowerCase() || pTarget === selGroup.id.toLowerCase();
          if (!matchesGroup) return false;
        }
      }

      // 2. Trainer Filter
      if (selectedTrainer !== 'ALL') {
        const pTrainer = (p.trainerName || p.authorName || p.createdByName || '').trim().toLowerCase();
        if (pTrainer !== selectedTrainer.toLowerCase()) {
          return false;
        }
      }

      // 3. Search Term Filter
      const term = debouncedSearchTerm.toLowerCase().trim();
      if (!term) return true;
      const title = (p.title || p.planTitle || '').toLowerCase();
      const trainer = (p.trainerName || p.authorName || p.createdByName || '').toLowerCase();
      const date = (p.date || p.planDate || '').toLowerCase();
      const target = (p.targetGroup || '').toLowerCase();
      const struct = (p.structureName || '').toLowerCase();
      return title.includes(term) || trainer.includes(term) || date.includes(term) || target.includes(term) || struct.includes(term);
    });
  }, [currentPool, selectedGroupId, sortedGroups, selectedTrainer, debouncedSearchTerm]);

  // Windowed pagination state (loads in chunks of 24 to prevent DOM lag on 100+ plans)
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedGroupId, showArchive, selectedTrainer, debouncedSearchTerm]);

  const visiblePlans = useMemo(() => {
    return filteredPlans.slice(0, visibleCount);
  }, [filteredPlans, visibleCount]);

  if (!isOpen) return null;

  const handleDelete = async (plan: TrainingPlan) => {
    if (!plan.id) return;
    const planName = plan.title || plan.planTitle || 'diesen Trainingsplan';
    const msg = showArchive 
      ? `Möchtest du "${planName}" wirklich unwiderruflich aus dem Archiv löschen?`
      : `Möchtest du "${planName}" wirklich unwiderruflich aus der Historie löschen?`;
    if (!window.confirm(msg)) {
      return;
    }

    try {
      setDeletingPlanId(plan.id);
      await deletePlanFromFirestore(plan.id, user);
      setFeedbackMsg({
        type: 'success',
        text: `Trainingsplan "${planName}" wurde erfolgreich gelöscht.`
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      setFeedbackMsg({
        type: 'error',
        text: 'Fehler beim Löschen des Plans. Bitte versuche es erneut.'
      });
    } finally {
      setDeletingPlanId(null);
    }
  };

  const handleSelectPlan = (plan: TrainingPlan) => {
    onLoadPlan(plan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-950/60 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0",
              showArchive 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            )}>
              {showArchive ? <Archive className="w-5 h-5" /> : <History className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  {showArchive ? 'Trainingsplan-Archiv' : 'Trainingsplan-Historie'}
                </h2>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold font-mono border",
                  showArchive
                    ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                )}>
                  {filteredPlans.length} {filteredPlans.length === 1 ? 'Einheit' : 'Einheiten'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">
                {showArchive 
                  ? 'Archivierte Trainingseinheiten abgeschlossener Saisons ansehen oder in den Planer laden'
                  : 'Aktive Trainingseinheiten ansehen, nachbereiten, als Vorlage laden oder verwalten'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Button "Historie exportieren" */}
            <button
              type="button"
              disabled={isExportingHistory || currentPool.length === 0}
              onClick={async () => {
                try {
                  setIsExportingHistory(true);
                  await generateTrainingPlanHistoryPDF({
                    plans: currentPool,
                    exerciseMap,
                    structures,
                    groups,
                    clubLogoUrl: currentClub?.logoUrl,
                    clubName: currentClub?.name || clubName
                  });
                  setFeedbackMsg({
                    type: 'success',
                    text: 'Gesamte Trainingsplan-Historie erfolgreich als PDF exportiert!'
                  });
                  setTimeout(() => setFeedbackMsg(null), 3500);
                } catch (e) {
                  console.error('Error exporting history PDF:', e);
                  setFeedbackMsg({
                    type: 'error',
                    text: 'Fehler beim Erstellen der PDF-Historie. Bitte versuche es erneut.'
                  });
                } finally {
                  setIsExportingHistory(false);
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition shadow-md shadow-emerald-950/50 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/30"
              title="Alle archivierten Trainingseinheiten der Historie als strukturierte PDF herunterladen"
            >
              {isExportingHistory ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileDown className="w-4 h-4 text-emerald-100" />
              )}
              <span className="hidden sm:inline">Historie exportieren</span>
              <span className="sm:hidden">Exportieren</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div className={`p-3 text-xs font-bold flex items-center gap-2 border-b ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' 
              : 'bg-rose-950/60 text-rose-300 border-rose-800'
          }`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Trainingsgruppen Reiter (Tabs) */}
        {sortedGroups.length > 0 && (
          <div className="px-4 sm:px-6 pt-3 pb-2.5 bg-slate-950/40 border-b border-slate-800/80">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              {sortedGroups.map((grp, idx) => {
                const isSelected = selectedGroupId === grp.id;
                const count = getGroupPlanCount(grp.id);
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setSelectedGroupId(grp.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 select-none border",
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50"
                        : "bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800"
                    )}
                    title={`Trainingsgruppe: ${grp.name} (${idx === 0 ? 'Zuerst erstellt / Standard' : 'Erstellt am ' + new Date(grp.createdAt).toLocaleDateString('de-DE')})`}
                  >
                    <Users className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-slate-400")} />
                    <span>{grp.name}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* Tab: Alle Gruppen */}
              <button
                type="button"
                onClick={() => setSelectedGroupId('ALL')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 select-none border",
                  selectedGroupId === 'ALL'
                    ? "bg-slate-700 text-white border-slate-600 shadow-md"
                    : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800"
                )}
                title="Alle Einheiten unabhängig von der Trainingsgruppe anzeigen"
              >
                <span>Alle Gruppen</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold",
                  selectedGroupId === 'ALL' ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                )}>
                  {currentPool.length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Search Bar & Trainer Selector */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={showArchive ? "Im Archiv suchen nach Titel, Datum, Trainer, Zielgruppe..." : "In Historie suchen nach Titel, Datum, Trainer, Zielgruppe..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {distinctTrainers.length > 1 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Trainer:</span>
              <select
                value={selectedTrainer}
                onChange={e => setSelectedTrainer(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="ALL">Alle Trainer ({currentPool.length})</option>
                {distinctTrainers.map(t => {
                  const count = currentPool.filter(p => (p.trainerName || p.authorName || p.createdByName || '').trim().toLowerCase() === t.toLowerCase()).length;
                  return (
                    <option key={t} value={t}>
                      {t} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Modal Body / Plans List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                {showArchive ? <Archive className="w-6 h-6 text-amber-400" /> : <FileText className="w-6 h-6" />}
              </div>
              <h3 className="text-sm font-bold text-slate-300">
                {searchTerm 
                  ? 'Keine passenden Einheiten gefunden' 
                  : (showArchive ? 'Das Archiv ist aktuell leer' : 'Noch keine Einheiten in der Historie')
                }
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {searchTerm 
                  ? 'Passe deinen Suchbegriff an, um passende Trainingspläne zu finden.' 
                  : (showArchive 
                      ? 'Sobald eine Saison im Periodisierungsplaner abgeschlossen wird, werden alle Einheiten dieser Saison hier im Archiv abgelegt.'
                      : 'Sobald du im Trainingsplaner auf "Abschluss (PDF herunterladen)" klickst, wird die Einheit automatisch in deiner Historie abgelegt.'
                    )
                }
              </p>
            </div>
          ) : (
            <>
              {visiblePlans.map(plan => {
              const phaseMap = plan.phaseExercises || plan.phases || {};
              const totalExercisesCount = Object.values(phaseMap).reduce(
                (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 
                0
              );

              return (
                <div
                  key={plan.id || plan.createdAt}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 transition shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left Column: Metadata */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border",
                        plan.isArchived
                          ? "text-amber-400 bg-amber-950/60 border-amber-800/60"
                          : "text-emerald-400 bg-emerald-950/60 border-emerald-800/60"
                      )}>
                        <Calendar className="w-3 h-3" />
                        {plan.date || plan.planDate || 'Kein Datum'}
                      </span>

                      {plan.isArchived && (
                        <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-700/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          Archiv
                        </span>
                      )}

                      {plan.structureName && (
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
                          {plan.structureName}
                        </span>
                      )}

                      <span className="text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {plan.totalMinutes || plan.totalDuration || 60} Min.
                      </span>

                      <span className="text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {plan.availableKeepers || 3} TW
                      </span>
                    </div>

                    {/* Plan Title */}
                    <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition truncate">
                      {plan.title || plan.planTitle || 'Torwart-Trainingseinheit'}
                    </h3>

                    {/* Sub-info: Trainer & Target Group & Exercises Count */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                      {(plan.trainerName || plan.authorName || plan.createdByName) && (
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>Trainer: <strong className="text-slate-200">{plan.trainerName || plan.authorName || plan.createdByName}</strong></span>
                          {plan.authorRole === 'club_admin' && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              Club Admin
                            </span>
                          )}
                        </span>
                      )}
                      {plan.targetGroup && (
                        <span>Zielgruppe: <strong className="text-slate-300">{plan.targetGroup}</strong></span>
                      )}
                      <span>Übungen im Plan: <strong className="text-emerald-400">{totalExercisesCount}</strong></span>
                    </div>

                    {/* Assigned Exercises Preview Names */}
                    {totalExercisesCount > 0 && (
                      <div className="pt-1.5 flex flex-wrap gap-1">
                        {Object.entries(phaseMap).flatMap(([phaseId, exerciseIds]) => 
                          (Array.isArray(exerciseIds) ? exerciseIds : []).map(exId => {
                            const ex = plan.customPlanExercises?.[exId] || exerciseMap.get(exId);
                            return ex ? (
                              <span 
                                key={`${phaseId}-${exId}`} 
                                className="text-[10px] bg-slate-900/90 text-slate-300 border border-slate-800 rounded px-1.5 py-0.5 truncate max-w-[180px]"
                                title={ex.title}
                              >
                                {ex.title}
                              </span>
                            ) : null;
                          })
                        ).filter(Boolean).slice(0, 5)}
                        {totalExercisesCount > 5 && (
                          <span className="text-[10px] text-slate-500 self-center">
                            +{totalExercisesCount - 5} weitere
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setLiveSessionPlan(plan)}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 active:scale-95 transition flex items-center gap-2 shadow-lg shadow-emerald-950/60 border border-emerald-400/50 cursor-pointer ring-1 ring-emerald-400/30"
                      title="Live-Modus (Platzmodus mit Riesen-Timer, Taktikboard & Schnellnotizen) starten"
                    >
                      <PlayCircle className="w-4 h-4 text-emerald-100" />
                      <span>Live Modus</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
                      title="Diesen Trainingsplan in den aktuellen Planer laden"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>In Planer laden</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDebriefingPlan(plan)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-sm active:scale-95 cursor-pointer",
                        plan.debriefedAt
                          ? "text-emerald-300 bg-slate-800 border-emerald-500/60 hover:bg-slate-700"
                          : "text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700"
                      )}
                      title={plan.debriefedAt ? "Einheit wurde bereits nachbereitet (Klicken zum Bearbeiten)" : "Erkenntnisse zu Torhütern und Erfahrungen zu Übungen eintragen"}
                    >
                      <FileEdit className="w-4 h-4 text-emerald-400" />
                      <span>Einheit nachbereiten</span>
                      {Boolean(plan.debriefedAt) && (
                        <span title="Einheit bereits nachbereitet" className="flex items-center">
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3] flex-shrink-0" />
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={deletingPlanId === plan.id}
                      onClick={() => handleDelete(plan)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition disabled:opacity-50 cursor-pointer"
                      title={showArchive ? "Aus dem Archiv löschen" : "Aus der Historie löschen"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

              {/* Pagination Load More Button */}
              {visiblePlans.length < filteredPlans.length && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                    className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm hover:shadow active:scale-95 cursor-pointer"
                  >
                    Weitere Einheiten laden ({visiblePlans.length} von {filteredPlans.length} angezeigt)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            {!showArchive ? (
              <button
                type="button"
                onClick={() => setShowArchive(true)}
                className="px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                title="Archivierte Trainingseinheiten aus abgeschlossenen Saisons anzeigen"
              >
                <Archive className="w-4 h-4 text-amber-400" />
                <span>Archiv ({archivedPlans.length})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowArchive(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                title="Zurück zur aktiven Trainingsplan-Historie"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
                <span>Zurück zur Historie ({activePlans.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Gespeicherte Metadaten werden datensparend als ID-Referenzen verwaltet.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition font-bold cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>

      </div>

      {/* Session Debriefing Modal */}
      {debriefingPlan && (
        <SessionDebriefModal
          isOpen={Boolean(debriefingPlan)}
          onClose={() => setDebriefingPlan(null)}
          plan={debriefingPlan}
          groups={groups}
          exerciseMap={exerciseMap}
          onPlanUpdated={(updated) => {
            onPlanUpdated?.(updated);
            setDebriefingPlan(null);
          }}
        />
      )}

      {/* Live Session / Platz-Modus Modal */}
      {liveSessionPlan && (
        <LiveSessionModal
          plan={liveSessionPlan}
          exerciseMap={exerciseMap}
          structures={structures}
          groups={groups}
          onClose={() => setLiveSessionPlan(null)}
          onPlanUpdated={(updated) => {
            onPlanUpdated?.(updated);
          }}
        />
      )}
    </div>
  );
};
