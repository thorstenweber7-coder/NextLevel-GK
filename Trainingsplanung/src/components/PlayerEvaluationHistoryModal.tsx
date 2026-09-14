import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Layers, 
  Trash2, 
  Activity, 
  FileText, 
  Sparkles,
  Zap,
  Dna,
  Brain,
  Edit3,
  Save,
  RotateCcw,
  ArrowDownToLine,
  Clock
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { 
  Player, 
  TrainingGroup, 
  PlayerEvaluation, 
  EvaluationCategory, 
  SkillDefinition,
  AthleticTestMetrics,
  BiologicalMaturityMetrics
} from '../types';
import { SKILL_DEFINITIONS } from '../types';
import { calculateMirwaldMaturityOffset, parseBioNumber } from '../utils/biologicalMaturity';

interface PlayerEvaluationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  group: TrainingGroup | null;
  category: EvaluationCategory;
  athleticSubTab?: 'biological' | 'athletic' | 'criteria';
  evaluations: PlayerEvaluation[];
  onDeleteEvaluation?: (evaluationId: string) => Promise<void> | void;
  onSaveEvaluation?: (updatedEval: PlayerEvaluation) => Promise<void> | void;
  onLoadIntoForm?: (evalData: PlayerEvaluation) => void;
}

export const PlayerEvaluationHistoryModal: React.FC<PlayerEvaluationHistoryModalProps> = ({
  isOpen,
  onClose,
  player,
  group,
  category,
  athleticSubTab,
  evaluations,
  onDeleteEvaluation,
  onSaveEvaluation,
  onLoadIntoForm
}) => {
  const [expandedEvalIds, setExpandedEvalIds] = useState<Record<string, boolean>>({});
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);

  // Edit State for in-place editing & backfilling
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [editRatings, setEditRatings] = useState<Record<string, number>>({});
  const [editAthleticMetrics, setEditAthleticMetrics] = useState<AthleticTestMetrics>({});
  const [editBiologicalMetrics, setEditBiologicalMetrics] = useState<BiologicalMaturityMetrics>({});
  const [editStrengths, setEditStrengths] = useState<string>('');
  const [editDevelopmentAreas, setEditDevelopmentAreas] = useState<string>('');
  const [editOverallNotes, setEditOverallNotes] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');

  if (!isOpen || !player) return null;

  // Filter evaluations for this player and this specific category/branch
  const playerEvals = evaluations.filter(e => {
    if (e.playerId !== player.id) return false;
    if (category === 'Athletik') {
      if (e.category !== 'Athletik') return false;
      if (athleticSubTab === 'biological') {
        return Boolean(e.biologicalMetrics && (e.biologicalMetrics.standingHeightCm || e.biologicalMetrics.weightKg));
      }
      if (athleticSubTab === 'athletic') {
        return Boolean(
          (e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean)) ||
          (e.ratings && Object.keys(e.ratings).length > 0)
        );
      }
      return true;
    }
    return e.category === category;
  });

  // Sort newest first
  const sortedEvals = [...playerEvals].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const toggleExpand = (id: string) => {
    setExpandedEvalIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getCategoryTitle = () => {
    if (category === 'Technik') return 'Technik (5-Stufen Bewertungsmatrix)';
    if (category === 'Taktik') return 'Taktik (5-Stufen Bewertungsmatrix)';
    if (category === 'Mental') return 'Mental (5-Stufen Bewertungsmatrix)';
    if (category === 'Athletik') {
      if (athleticSubTab === 'biological') return 'Athletik: Biologischer Entwicklungsstand (PHV)';
      if (athleticSubTab === 'athletic') return 'Athletik: Athletischer Entwicklungsstand (7 Tests Diagnostik)';
      return 'Athletik (5-Stufen Matrix & Diagnostik)';
    }
    return category;
  };

  const getCategoryIcon = () => {
    if (category === 'Technik') return <Sparkles className="w-5 h-5 text-emerald-400" />;
    if (category === 'Taktik') return <Target className="w-5 h-5 text-sky-400" />;
    if (category === 'Mental') return <Brain className="w-5 h-5 text-purple-400" />;
    if (category === 'Athletik') {
      if (athleticSubTab === 'biological') return <Dna className="w-5 h-5 text-teal-400" />;
      return <Activity className="w-5 h-5 text-amber-400" />;
    }
    return <Layers className="w-5 h-5 text-emerald-400" />;
  };

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return { date: '–', time: '' };
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return { date: '–', time: '' };
    return {
      date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'
    };
  };

  const skillDefs: SkillDefinition[] = SKILL_DEFINITIONS[category] || [];

  const startEditing = (ev: PlayerEvaluation) => {
    const d = new Date(ev.updatedAt || Date.now());
    const fallbackDateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    const dateStr = (category === 'Athletik' && athleticSubTab === 'athletic' && ev.athleticMetrics?.testDate)
      ? ev.athleticMetrics.testDate
      : fallbackDateStr;
    const timeStr = !isNaN(d.getTime()) ? d.toTimeString().substring(0, 5) : '';

    setEditingEvalId(ev.id);
    setEditRatings({ ...(ev.ratings || {}) });
    setEditAthleticMetrics({
      ...(ev.athleticMetrics || {}),
      testDate: ev.athleticMetrics?.testDate || dateStr
    });
    setEditBiologicalMetrics({ ...(ev.biologicalMetrics || {}) });
    setEditStrengths(ev.strengths || '');
    setEditDevelopmentAreas(ev.developmentAreas || '');
    setEditOverallNotes(ev.overallNotes || '');
    setEditDate(dateStr);
    setEditTime(timeStr);
    
    // Ensure the edited card is expanded
    setExpandedEvalIds(prev => ({ ...prev, [ev.id]: true }));
  };

  const cancelEditing = () => {
    setEditingEvalId(null);
  };

  const handleSaveEdit = async (ev: PlayerEvaluation) => {
    if (!onSaveEvaluation) return;
    setIsSavingId(ev.id);
    try {
      let finalTimestamp = ev.updatedAt;
      if (editDate) {
        const [year, month, day] = editDate.split('-').map(Number);
        let hours = 12;
        let minutes = 0;
        if (editTime && editTime.includes(':')) {
          const parts = editTime.split(':').map(Number);
          hours = parts[0] || 0;
          minutes = parts[1] || 0;
        }
        const newD = new Date(year, (month || 1) - 1, day || 1, hours, minutes, 0);
        if (!isNaN(newD.getTime())) {
          finalTimestamp = newD.getTime();
        }
      }

      const isBioOnly = category === 'Athletik' && athleticSubTab === 'biological';
      const isAthleticOnly = category === 'Athletik' && athleticSubTab === 'athletic';
      const updatedAthletic = isBioOnly ? undefined : (category === 'Athletik' ? {
        ...editAthleticMetrics,
        testDate: editDate || editAthleticMetrics.testDate
      } : ev.athleticMetrics);

      const updated: PlayerEvaluation = {
        ...ev,
        updatedAt: finalTimestamp,
        ratings: isBioOnly ? {} : editRatings,
        athleticMetrics: updatedAthletic,
        biologicalMetrics: isAthleticOnly ? undefined : (category === 'Athletik' ? editBiologicalMetrics : ev.biologicalMetrics),
        strengths: editStrengths,
        developmentAreas: editDevelopmentAreas,
        overallNotes: editOverallNotes
      };

      await onSaveEvaluation(updated);
      setEditingEvalId(null);
    } finally {
      setIsSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/90 flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              {getCategoryIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Entwicklungs-Historie
                </span>
                <span className="text-xs text-slate-400 font-bold truncate">
                  {group?.name || 'Trainingsgruppe'}
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white truncate mt-0.5">
                Historie für {player.firstName} {player.lastName} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ''}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {getCategoryTitle()} • {sortedEvals.length} {sortedEvals.length === 1 ? 'gespeicherter Eintrag' : 'gespeicherte Einträge'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition shadow-md flex-shrink-0"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE LIST OF CARDS) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 bg-slate-950/40">
          {sortedEvals.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-900/60 rounded-3xl border border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">
                  Noch keine historischen Einträge vorhanden
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Sobald du im Bereich <strong>{getCategoryTitle()}</strong> auf <strong>„Bewertung für {player.firstName} speichern“</strong> klickst, wird hier jedes Mal ein neuer historischer Datensatz mit aktuellem Zeitstempel und allen Kriterien archiviert.
                </p>
              </div>
            </div>
          ) : (
            sortedEvals.map((ev, idx) => {
              const isEditing = editingEvalId === ev.id;
              const isExpanded = isEditing || (expandedEvalIds[ev.id] ?? (idx === 0)); // Expand newest or if editing
              const dt = formatDateTime(ev.updatedAt);
              
              // Calculate Score or Bio metrics for Header readout
              const rawRatings = ev.ratings || {};
              const validScores = Object.entries(rawRatings)
                .filter(([k, v]) => !k.startsWith('ath_') && typeof v === 'number' && v > 0)
                .map(([_, v]) => v);

              const avgScore = validScores.length > 0 
                ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
                : null;

              const hasBioMetrics = Boolean(ev.biologicalMetrics && (parseBioNumber(ev.biologicalMetrics.standingHeightCm) > 50 || parseBioNumber(ev.biologicalMetrics.weightKg) > 15));
              const bio = ev.biologicalMetrics;
              const hasAthleticMetrics = Boolean(ev.athleticMetrics && Object.values(ev.athleticMetrics).some(Boolean));

              const currentYear = new Date().getFullYear();
              const playerBirthYear = player?.birthYear ? parseBioNumber(player.birthYear) : undefined;
              const defaultAge = playerBirthYear && playerBirthYear > 1980 ? (currentYear - playerBirthYear) : 15;
              const calcAge = parseBioNumber(bio?.customAge) || defaultAge;
              const calculatedMirwald = (bio && (parseBioNumber(bio.standingHeightCm) > 50 || parseBioNumber(bio.weightKg) > 15))
                ? calculateMirwaldMaturityOffset({
                    standingHeightCm: bio.standingHeightCm,
                    sittingHeightCm: bio.sittingHeightCm,
                    weightKg: bio.weightKg,
                    chronologicalAge: calcAge,
                    wingspanCm: bio.wingspanCm
                  })
                : null;

              const effectiveBioClass = bio?.phvClassification || calculatedMirwald?.phvClassification;
              const effectiveOffset = (bio?.maturityOffsetYears !== undefined && bio?.maturityOffsetYears !== null && String(bio.maturityOffsetYears).trim() !== '')
                ? parseBioNumber(bio.maturityOffsetYears)
                : calculatedMirwald?.maturityOffsetYears;

              return (
                <div
                  key={ev.id || idx}
                  className={cn(
                    "bg-slate-900 border rounded-3xl shadow-xl transition-all overflow-hidden",
                    isEditing 
                      ? "border-amber-500/70 ring-2 ring-amber-500/40 shadow-amber-950/20" 
                      : isExpanded 
                      ? "border-emerald-500/50 ring-1 ring-emerald-500/30" 
                      : "border-slate-800 hover:border-slate-700"
                  )}
                >
                  {/* CARD HEADER (CLICKABLE TO EXPAND/COLLAPSE) */}
                  <div
                    onClick={() => {
                      if (!isEditing) toggleExpand(ev.id);
                    }}
                    className={cn(
                      "p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition",
                      isEditing ? "bg-amber-950/20 hover:bg-amber-950/30" : "bg-slate-950/60 hover:bg-slate-950/80"
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className={cn(
                        "p-2.5 rounded-2xl border flex-shrink-0",
                        isEditing ? "bg-amber-950 border-amber-600 text-amber-300" : "bg-slate-900 border-slate-800 text-slate-300"
                      )}>
                        {isEditing ? <Edit3 className="w-5 h-5 text-amber-400" /> : <Calendar className="w-5 h-5 text-emerald-400" />}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm text-white">
                            {dt.date}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            • {dt.time}
                          </span>
                          {idx === 0 && !isEditing && (
                            <span className="px-2 py-0.2 rounded-md text-[9.5px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              Aktuellste Version
                            </span>
                          )}
                          {isEditing && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse">
                              Bearbeitungsmodus aktiv
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>Kategorie: <strong className="text-slate-200">{ev.category}</strong></span>
                          {group && <span>• Gruppe: <strong className="text-slate-300">{group.name}</strong></span>}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: SCORE READOUT & CHEVRON */}
                    <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                      {/* Gesamtscore / Reifegrad Badge */}
                      {avgScore && !isEditing && !(category === 'Athletik' && athleticSubTab === 'biological') && (
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                            Gesamtscore:
                          </span>
                          <span className={cn(
                            "text-sm sm:text-base font-black font-mono",
                            parseFloat(avgScore) >= 4 ? "text-emerald-400" :
                            parseFloat(avgScore) >= 3 ? "text-sky-400" :
                            parseFloat(avgScore) >= 2 ? "text-amber-400" : "text-rose-400"
                          )}>
                            {avgScore} / 5.0
                          </span>
                        </div>
                      )}

                      {/* Biological Maturity Badge */}
                      {hasBioMetrics && bio && !isEditing && !(category === 'Athletik' && athleticSubTab === 'athletic') && (
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                            PHV-Status:
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-xs font-black border",
                            effectiveBioClass === 'Pre-PHV' ? "bg-sky-950 text-sky-300 border-sky-600" :
                            effectiveBioClass === 'Circa-PHV' ? "bg-amber-950 text-amber-300 border-amber-600" :
                            effectiveBioClass === 'Post-PHV' ? "bg-emerald-950 text-emerald-300 border-emerald-600" :
                            "bg-slate-800 text-slate-300 border-slate-700"
                          )}>
                            {effectiveBioClass || 'Erfasst'}
                            {effectiveOffset !== undefined ? ` (${effectiveOffset > 0 ? '+' : ''}${effectiveOffset} J.)` : ''}
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* CARD BODY: IN-PLACE EDIT MODE */}
                  {/* ========================================================= */}
                  {isEditing && (
                    <div className="p-5 sm:p-6 border-t border-amber-500/30 space-y-6 bg-slate-950/90 animate-fadeIn">
                      
                      {/* Date and Time Editor */}
                      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Erfassungsdatum & Uhrzeit anpassen</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Erfassungsdatum (Tag.Monat.Jahr)
                            </label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Uhrzeit
                            </label>
                            <input
                              type="time"
                              value={editTime}
                              onChange={e => setEditTime(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 1. ATHLETIK EDIT FORM */}
                      {category === 'Athletik' && (
                        <div className="space-y-6">
                          {/* Anthropometrische Werte */}
                          {athleticSubTab !== 'athletic' && (
                            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-400">
                                <Dna className="w-4 h-4 text-teal-400" />
                                <span>Biometrische Messwerte (Körperbau & Mirwald)</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Körperhöhe (cm)</label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="z. B. 175"
                                    value={editBiologicalMetrics.standingHeightCm || ''}
                                    onChange={e => setEditBiologicalMetrics(prev => ({ ...prev, standingHeightCm: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Sitzhöhe (cm)</label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="z. B. 90 (optional)"
                                    value={editBiologicalMetrics.sittingHeightCm || ''}
                                    onChange={e => setEditBiologicalMetrics(prev => ({ ...prev, sittingHeightCm: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Gewicht (kg)</label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="z. B. 68"
                                    value={editBiologicalMetrics.weightKg || ''}
                                    onChange={e => setEditBiologicalMetrics(prev => ({ ...prev, weightKg: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Armspannweite (cm)</label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="z. B. 180"
                                    value={editBiologicalMetrics.wingspanCm || ''}
                                    onChange={e => setEditBiologicalMetrics(prev => ({ ...prev, wingspanCm: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 7 Testbatterie Eingaben (nur im Reiter Athletischer Entwicklungsstand) */}
                          {athleticSubTab !== 'biological' && (
                            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                              <Zap className="w-4 h-4 text-amber-400" />
                              <span>Messwerte der 7 Athletiktests nachtragen / ändern</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* 1. Griffkraft */}
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                                <span className="text-slate-300 font-bold block">1. Griffkraft (kg)</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    placeholder="Rechts (kg)"
                                    value={editAthleticMetrics.gripRightKg || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, gripRightKg: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Links (kg)"
                                    value={editAthleticMetrics.gripLeftKg || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, gripLeftKg: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 2. CMJ */}
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                                <span className="text-slate-300 font-bold block">2. CMJ Sprunghöhe (cm)</span>
                                <input
                                  type="number"
                                  placeholder="Sprunghöhe (cm)"
                                  value={editAthleticMetrics.cmjHeightCm || ''}
                                  onChange={e => setEditAthleticMetrics(prev => ({ ...prev, cmjHeightCm: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                />
                              </div>

                              {/* 3. Lateral Push */}
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                                <span className="text-slate-300 font-bold block">3. Single-Leg Lateral Push (cm)</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    placeholder="Rechts (cm)"
                                    value={editAthleticMetrics.lateralPushRightCm || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, lateralPushRightCm: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Links (cm)"
                                    value={editAthleticMetrics.lateralPushLeftCm || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, lateralPushLeftCm: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 4. Linearsprints */}
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                                <span className="text-slate-300 font-bold block">4. Linearsprints (s)</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="5m Sprint (s)"
                                    value={editAthleticMetrics.sprint5mSec || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, sprint5mSec: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="10m Sprint (s)"
                                    value={editAthleticMetrics.sprint10mSec || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, sprint10mSec: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 5. Hybrid-Shuttle */}
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                                <span className="text-slate-300 font-bold block">5. Hybrid-Shuttle 5-10-5 (s)</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Start Rechts (s)"
                                    value={editAthleticMetrics.agilityShuttleRightSec || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, agilityShuttleRightSec: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Start Links (s)"
                                    value={editAthleticMetrics.agilityShuttleLeftSec || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, agilityShuttleLeftSec: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 6. Medizinballwurf */}
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                                <span className="text-slate-300 font-bold block">6. Medizinballwurf</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    placeholder="Gewicht (kg, z. B. 2)"
                                    value={editAthleticMetrics.medBallWeightKg || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, medBallWeightKg: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                  <input
                                    type="number"
                                    step="0.1"
                                    placeholder="Weite (m)"
                                    value={editAthleticMetrics.medBallDistanceM || ''}
                                    onChange={e => setEditAthleticMetrics(prev => ({ ...prev, medBallDistanceM: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>

                              {/* 7. BlazePod Test 1 & Test 2 */}
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 sm:col-span-2">
                                <span className="text-slate-300 font-bold block">7. BlazePod Reaktionstest</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">T1: Hits in 20s</label>
                                    <input
                                      type="number"
                                      placeholder="z. B. 34"
                                      value={editAthleticMetrics.blazePodSimpleHits || ''}
                                      onChange={e => setEditAthleticMetrics(prev => ({ ...prev, blazePodSimpleHits: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">T2 Go/No-Go: Hits</label>
                                    <input
                                      type="number"
                                      placeholder="z. B. 28"
                                      value={editAthleticMetrics.blazePodGoNoGoHits || ''}
                                      onChange={e => setEditAthleticMetrics(prev => ({ ...prev, blazePodGoNoGoHits: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">T2: No-Go Fehler</label>
                                    <input
                                      type="number"
                                      placeholder="z. B. 0"
                                      value={editAthleticMetrics.blazePodGoNoGoErrors ?? ''}
                                      onChange={e => setEditAthleticMetrics(prev => ({ ...prev, blazePodGoNoGoErrors: e.target.value }))}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                      {/* 2. TECHNIK / TAKTIK / MENTAL EDIT FORM (5-STUFEN MATRIX) */}
                      {category !== 'Athletik' && skillDefs.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              <span>5-Stufen Bewertungsmatrix ({ev.category}) anpassen</span>
                            </div>
                            <span className="text-xs text-slate-400">
                              Klicke auf eine Note (1 bis 5)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {skillDefs.map(skill => {
                              const scoreVal = editRatings[skill.id];
                              const hasScore = typeof scoreVal === 'number' && scoreVal > 0;

                              return (
                                <div
                                  key={skill.id}
                                  className={cn(
                                    "p-3.5 rounded-2xl border space-y-2.5 transition",
                                    hasScore ? "bg-slate-900 border-slate-700" : "bg-slate-950/60 border-slate-800"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                        {skill.group || ev.category}
                                      </span>
                                      <h6 className="text-xs font-black text-white">
                                        {skill.name}
                                      </h6>
                                    </div>

                                    {hasScore && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditRatings(prev => {
                                            const n = { ...prev };
                                            delete n[skill.id];
                                            return n;
                                          });
                                        }}
                                        className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition"
                                        title="Bewertung entfernen"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reset</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Level Selection Buttons 1 - 5 */}
                                  <div className="grid grid-cols-5 gap-1.5">
                                    {[1, 2, 3, 4, 5].map(lvl => {
                                      const isSelected = scoreVal === lvl;
                                      return (
                                        <button
                                          key={lvl}
                                          type="button"
                                          onClick={() => {
                                            setEditRatings(prev => ({
                                              ...prev,
                                              [skill.id]: lvl
                                            }));
                                          }}
                                          className={cn(
                                            "py-2 rounded-xl text-xs font-black transition active:scale-95 border",
                                            isSelected 
                                              ? (lvl >= 4 ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md" :
                                                 lvl === 3 ? "bg-sky-500 text-slate-950 border-sky-400 shadow-md" :
                                                 lvl === 2 ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md" :
                                                 "bg-rose-600 text-white border-rose-500 shadow-md")
                                              : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
                                          )}
                                        >
                                          Stufe {lvl}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. QUALITATIVES FEEDBACK TEXTAREAS */}
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                          <FileText className="w-4 h-4 text-sky-400" />
                          <span>Trainer-Feedback & Notizen anpassen</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <label className="text-emerald-400 font-bold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Positive Entwicklungen & Stärken:</span>
                            </label>
                            <textarea
                              rows={3}
                              value={editStrengths}
                              onChange={e => setEditStrengths(e.target.value)}
                              placeholder="z. B. Starke Antrittsschnelligkeit, exzellentes Raumgefühl..."
                              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-amber-400 font-bold flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5" />
                              <span>Entwicklungsfelder & Schwierigkeiten:</span>
                            </label>
                            <textarea
                              rows={3}
                              value={editDevelopmentAreas}
                              onChange={e => setEditDevelopmentAreas(e.target.value)}
                              placeholder="z. B. Timing beim Rauslaufen, Stabilität im Stand..."
                              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white"
                            />
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-sky-400 font-bold flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Allgemeine Notizen & Beobachtungen:</span>
                            </label>
                            <textarea
                              rows={2}
                              value={editOverallNotes}
                              onChange={e => setEditOverallNotes(e.target.value)}
                              placeholder="Optionale Bemerkungen zum Testtag..."
                              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl p-3 text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* EDIT MODE ACTION BUTTONS */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition active:scale-95"
                        >
                          Abbrechen
                        </button>

                        <button
                          type="button"
                          disabled={isSavingId === ev.id}
                          onClick={() => handleSaveEdit(ev)}
                          className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition shadow-lg shadow-emerald-950/50 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSavingId === ev.id ? 'Wird gespeichert...' : 'Änderungen speichern'}</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* CARD BODY: READ-ONLY DISPLAY */}
                  {/* ========================================================= */}
                  {isExpanded && !isEditing && (
                    <div className="p-5 sm:p-6 border-t border-slate-800/80 space-y-6 bg-slate-900/90 animate-fadeIn">
                      
                      {/* 1. BIOLOGISCHE ENTWICKLUNG (WENN VORHANDEN & NICHT IM REINEN ATHLETIKTEST-MODUS) */}
                      {hasBioMetrics && bio && !(category === 'Athletik' && athleticSubTab === 'athletic') && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-400">
                            <Dna className="w-4 h-4 text-teal-400" />
                            <span>Biometrische Messwerte & Mirwald-Maturity-Offset</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                              <span className="text-slate-400 text-[10.5px] block font-bold">Körperhöhe</span>
                              <span className="text-base font-black text-white font-mono">{bio.standingHeightCm || '–'} cm</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                              <span className="text-slate-400 text-[10.5px] block font-bold">Sitzhöhe</span>
                              <span className="text-base font-black text-white font-mono">{bio.sittingHeightCm || '–'} cm</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                              <span className="text-slate-400 text-[10.5px] block font-bold">Gewicht</span>
                              <span className="text-base font-black text-white font-mono">{bio.weightKg || '–'} kg</span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                              <span className="text-slate-400 text-[10.5px] block font-bold">Armspannweite (Wingspan)</span>
                              <span className="text-base font-black text-teal-400 font-mono">{bio.wingspanCm || '–'} cm</span>
                            </div>
                          </div>

                          {/* Mirwald Metrics summary */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                            <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
                              <span className="text-slate-500 text-[10px] block font-bold">Maturity Offset</span>
                              <span className="text-sm font-bold text-white font-mono">
                                {effectiveOffset !== undefined ? (effectiveOffset > 0 ? `+${effectiveOffset}` : `${effectiveOffset}`) + ' Jahre' : '–'}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
                              <span className="text-slate-500 text-[10px] block font-bold">Ape-Index</span>
                              <span className="text-sm font-bold text-teal-400 font-mono">{bio.apeIndex || calculatedMirwald?.apeIndex || '–'}</span>
                            </div>
                            <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
                              <span className="text-slate-500 text-[10px] block font-bold">Sitzhöhe-Ratio</span>
                              <span className="text-sm font-bold text-white font-mono">{(bio.sittingHeightRatio || calculatedMirwald?.sittingHeightRatio) ? `${bio.sittingHeightRatio || calculatedMirwald?.sittingHeightRatio} %` : '–'}</span>
                            </div>
                            <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
                              <span className="text-slate-500 text-[10px] block font-bold">Beinlänge</span>
                              <span className="text-sm font-bold text-white font-mono">{(bio.legLengthCm || calculatedMirwald?.legLengthCm) ? `${bio.legLengthCm || calculatedMirwald?.legLengthCm} cm` : '–'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. ATHLETISCHE TESTWERTE (NUR IM REITER ATHLETISCHER ENTWICKLUNGSSTAND) */}
                      {hasAthleticMetrics && ev.athleticMetrics && athleticSubTab !== 'biological' && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span>Messwerte der 7 Athletiktests</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 text-[10px] block font-bold">1. Griffkraft (kg)</span>
                              <span className="text-sm font-bold text-white font-mono">
                                R: {ev.athleticMetrics.gripRightKg || '–'} / L: {ev.athleticMetrics.gripLeftKg || '–'} kg
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 text-[10px] block font-bold">2. CMJ Sprunghöhe</span>
                              <span className="text-sm font-bold text-white font-mono">
                                {ev.athleticMetrics.cmjHeightCm ? `${ev.athleticMetrics.cmjHeightCm} cm` : '–'}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 text-[10px] block font-bold">3. Lateral Push (cm)</span>
                              <span className="text-sm font-bold text-white font-mono">
                                R: {ev.athleticMetrics.lateralPushRightCm || '–'} / L: {ev.athleticMetrics.lateralPushLeftCm || '–'} cm
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 text-[10px] block font-bold">4. Linearsprints</span>
                              <span className="text-sm font-bold text-white font-mono">
                                5m: {ev.athleticMetrics.sprint5mSec || '–'}s • 10m: {ev.athleticMetrics.sprint10mSec || '–'}s
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 text-[10px] block font-bold">5. Hybrid Shuttle</span>
                              <span className="text-sm font-bold text-white font-mono">
                                R: {ev.athleticMetrics.agilityShuttleRightSec || '–'}s / L: {ev.athleticMetrics.agilityShuttleLeftSec || '–'}s
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 text-[10px] block font-bold">6. Medizinballwurf</span>
                              <span className="text-sm font-bold text-white font-mono">
                                {ev.athleticMetrics.medBallDistanceM ? `${ev.athleticMetrics.medBallDistanceM} m (${ev.athleticMetrics.medBallWeightKg || 2}kg)` : '–'}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-0.5 col-span-2">
                              <span className="text-slate-400 text-[10px] block font-bold">7. BlazePod Reaktion & Go/No-Go</span>
                              <span className="text-sm font-bold text-white font-mono">
                                Hits: {ev.athleticMetrics.blazePodSimpleHits || '–'} (20s) • Go/NoGo: {ev.athleticMetrics.blazePodGoNoGoHits || '–'} Hits / {ev.athleticMetrics.blazePodGoNoGoErrors || 0} Fehler
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. 5-STUFEN BEWERTUNGSMATRIX DETAIL-KRITERIEN */}
                      {!(category === 'Athletik' && athleticSubTab === 'biological') && skillDefs.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              <span>5-Stufen Bewertungsmatrix ({ev.category})</span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {validScores.length} von {skillDefs.length} Kriterien bewertet
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {skillDefs.map(skill => {
                              const scoreVal = rawRatings[skill.id];
                              const hasScore = typeof scoreVal === 'number' && scoreVal > 0;
                              const primaryLvl = hasScore ? Math.floor(scoreVal) : null;
                              const matchingLevel = skill.levels?.find(l => l.level === primaryLvl);

                              return (
                                <div
                                  key={skill.id}
                                  className={cn(
                                    "p-3.5 rounded-2xl border space-y-2 transition",
                                    hasScore ? "bg-slate-950 border-slate-800" : "bg-slate-950/40 border-slate-900 opacity-60"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                        {skill.group || ev.category}
                                      </span>
                                      <h6 className="text-xs font-black text-white">
                                        {skill.name}
                                      </h6>
                                    </div>

                                    {hasScore ? (
                                      <div className={cn(
                                        "px-2.5 py-1 rounded-xl text-xs font-black font-mono border flex-shrink-0 shadow-sm",
                                        scoreVal >= 4.5 ? "bg-emerald-500 text-slate-950 border-emerald-400" :
                                        scoreVal >= 3.5 ? "bg-sky-500 text-slate-950 border-sky-400" :
                                        scoreVal >= 2.5 ? "bg-teal-500 text-slate-950 border-teal-400" :
                                        scoreVal >= 1.5 ? "bg-amber-500 text-slate-950 border-amber-400" :
                                        "bg-rose-600 text-white border-rose-500"
                                      )}>
                                        Stufe {scoreVal}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-600 font-mono">
                                        Nicht bewertet
                                      </span>
                                    )}
                                  </div>

                                  {/* Level Definition Description */}
                                  {matchingLevel && (
                                    <div className="text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                                      <strong className="text-emerald-300 block mb-0.5">
                                        {matchingLevel.definition}:
                                      </strong>
                                      {matchingLevel.description}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. QUALITATIVES TRAINER-FEEDBACK */}
                      {(ev.strengths || ev.developmentAreas || ev.overallNotes) && (
                        <div className="space-y-3 pt-2 border-t border-slate-800">
                          <h6 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-sky-400" />
                            <span>Qualitatives Feedback & Trainer-Notizen</span>
                          </h6>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {ev.strengths && (
                              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                                <strong className="text-emerald-400 block font-bold flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Positive Entwicklungen & Stärken:</span>
                                </strong>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{ev.strengths}</p>
                              </div>
                            )}

                            {ev.developmentAreas && (
                              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                                <strong className="text-amber-400 block font-bold flex items-center gap-1.5">
                                  <Target className="w-3.5 h-3.5" />
                                  <span>Entwicklungsfelder & Schwierigkeiten:</span>
                                </strong>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{ev.developmentAreas}</p>
                              </div>
                            )}
                          </div>

                          {ev.overallNotes && (
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
                              <strong className="text-sky-400 block font-bold flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Allgemeine Notizen & Beobachtungen:</span>
                              </strong>
                              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{ev.overallNotes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CARD ACTIONS FOOTER */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                        <div className="text-slate-500 text-[11px]">
                          Eintrags-ID: <code className="font-mono text-slate-400">{ev.id}</code>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Button: Werte bearbeiten & nachtragen */}
                          {onSaveEvaluation && (
                            <button
                              type="button"
                              onClick={() => startEditing(ev)}
                              className="px-3.5 py-1.5 rounded-xl font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                              title="Diesen Eintrag bearbeiten oder fehlende Werte nachtragen"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Werte bearbeiten & nachtragen</span>
                            </button>
                          )}

                          {/* Button: In Eingabemaske laden */}
                          {onLoadIntoForm && (
                            <button
                              type="button"
                              onClick={() => onLoadIntoForm(ev)}
                              className="px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
                              title="Werte dieses Eintrags in die aktuelle Eingabemaske übernehmen"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5 text-sky-400" />
                              <span>In Maske laden</span>
                            </button>
                          )}

                          {/* Button: Löschen */}
                          {onDeleteEvaluation && (
                            <button
                              type="button"
                              disabled={isDeletingId === ev.id}
                              onClick={async () => {
                                if (window.confirm(`Möchtest du diesen Eintrag vom ${dt.date} wirklich unwiderruflich löschen?`)) {
                                  setIsDeletingId(ev.id);
                                  try {
                                    await onDeleteEvaluation(ev.id);
                                  } finally {
                                    setIsDeletingId(null);
                                  }
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                              title="Diesen historischen Datensatz löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Löschen</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-400">
            Klicke auf eine Karte, um Details einzusehen oder Werte direkt im historischen Eintrag zu bearbeiten.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition active:scale-95"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
