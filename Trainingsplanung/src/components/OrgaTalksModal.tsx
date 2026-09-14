import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Users, 
  MessageSquareQuote, 
  Video, 
  Check, 
  FileText, 
  Calendar, 
  Trash2, 
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  UserCheck
} from 'lucide-react';
import type { Player, TrainingPlan, TrainingGroup, PlayerFeedbackTalk } from '../types';
import { getLocalFeedbackTalks } from '../firebase/firestoreService';
import { cn } from '../utils/cn';

interface OrgaTalksModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetGroupName: string;
  players: Player[];
  allGroups?: TrainingGroup[];
  savedPlans: TrainingPlan[];
  feedbackTalks?: PlayerFeedbackTalk[];
  userId?: string;
  initialImportantNotes?: string;
  initialHasVideoAnalysis?: boolean;
  initialVideoAnalysisNotes?: string;
  onSaveToTraining: (data: {
    importantNotes: string;
    hasVideoAnalysis: boolean;
    videoAnalysisNotes: string;
  }) => void;
}

interface HistoricalPlayerTalk {
  planId: string;
  planTitle: string;
  planDate: string;
  trainerName?: string;
  text: string;
  createdAt?: number;
}

interface HistoricalKeeperInsight {
  planId: string;
  planTitle: string;
  planDate: string;
  trainerName?: string;
  text: string;
  createdAt?: number;
}

export const OrgaTalksModal: React.FC<OrgaTalksModalProps> = ({
  isOpen,
  onClose,
  targetGroupName,
  players,
  allGroups = [],
  savedPlans,
  feedbackTalks,
  userId,
  initialImportantNotes = '',
  initialHasVideoAnalysis = false,
  initialVideoAnalysisNotes = '',
  onSaveToTraining
}) => {
  const [importantNotes, setImportantNotes] = useState<string>(initialImportantNotes);
  const [hasVideoAnalysis, setHasVideoAnalysis] = useState<boolean>(initialHasVideoAnalysis);
  const [videoAnalysisNotes, setVideoAnalysisNotes] = useState<string>(initialVideoAnalysisNotes);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Collapsible Accordion States (all default to collapsed / zugeklappt)
  const [isSpielergespraecheOpen, setIsSpielergespraecheOpen] = useState<boolean>(false);
  const [isErkenntnisseOpen, setIsErkenntnisseOpen] = useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setImportantNotes(initialImportantNotes);
      setHasVideoAnalysis(initialHasVideoAnalysis);
      setVideoAnalysisNotes(initialVideoAnalysisNotes);
      setSearchTerm('');
      setIsSpielergespraecheOpen(false);
      setIsErkenntnisseOpen(false);
      setIsFeedbackOpen(false);
    }
  }, [isOpen, initialImportantNotes, initialHasVideoAnalysis, initialVideoAnalysisNotes]);

  // Robustly resolve all goalkeepers to display as columns:
  // 1. First, all goalkeepers in active group (Torwart 1, Torwart 2, ...)
  // 2. Second, any other goalkeepers across other groups who have recorded talks or insights
  const allDisplayKeepers = useMemo(() => {
    const list: Player[] = [...players];
    const existingIds = new Set(list.map(p => p.id));

    // Also check all other groups
    allGroups.forEach(g => {
      (g.players || []).forEach(p => {
        if (!existingIds.has(p.id)) {
          // Check if this player has talks or insights in savedPlans
          const hasTalksOrInsights = savedPlans.some(plan => {
            const conv = plan.playerConversations || {};
            const insights = plan.keeperInsights || {};
            const pFullName = `${p.firstName} ${p.lastName}`.toLowerCase().trim();
            const pIdLower = p.id.toLowerCase().trim();

            const hasC = Boolean(
              conv[p.id]?.trim() || 
              Object.keys(conv).some(k => k.toLowerCase().trim() === pIdLower || k.toLowerCase().trim() === pFullName)
            );
            const hasI = Boolean(
              insights[p.id]?.trim() || 
              Object.keys(insights).some(k => k.toLowerCase().trim() === pIdLower || k.toLowerCase().trim() === pFullName)
            );
            return hasC || hasI;
          });
          if (hasTalksOrInsights) {
            list.push(p);
            existingIds.add(p.id);
          }
        }
      });
    });

    return list;
  }, [players, allGroups, savedPlans]);

  // =========================================================================
  // 1. SPIELERGESPRÄCHE MAP (from plan.playerConversations)
  // =========================================================================
  const keeperTalksMap = useMemo(() => {
    const map = new Map<string, HistoricalPlayerTalk[]>();

    allDisplayKeepers.forEach(player => {
      const talks: HistoricalPlayerTalk[] = [];

      savedPlans.forEach(plan => {
        let talkText = '';

        // 1. Direct plan.playerConversations match
        if (plan.playerConversations && typeof plan.playerConversations === 'object') {
          if (plan.playerConversations[player.id]?.trim()) {
            talkText = plan.playerConversations[player.id].trim();
          } else {
            const pIdNorm = (player.id || '').trim().toLowerCase();
            const pFullName = `${player.firstName} ${player.lastName}`.trim().toLowerCase();
            const pReverseName = `${player.lastName} ${player.firstName}`.trim().toLowerCase();
            const pFirstOnly = (player.firstName || '').trim().toLowerCase();

            for (const [k, v] of Object.entries(plan.playerConversations)) {
              if (!v || !v.trim()) continue;
              const normKey = k.trim().toLowerCase();
              if (
                normKey === pIdNorm ||
                normKey === pFullName ||
                normKey === pReverseName ||
                (pFirstOnly.length > 2 && normKey === pFirstOnly)
              ) {
                talkText = v.trim();
                break;
              }
            }
          }
        }

        // 2. Alternative fields check
        if (!talkText) {
          const altFields = [
            (plan as any).playerTalks,
            (plan as any).keeperConversations,
            (plan as any).talks,
            (plan as any).playerNotes
          ];
          for (const field of altFields) {
            if (field && typeof field === 'object') {
              if (field[player.id]?.trim()) {
                talkText = field[player.id].trim();
                break;
              }
              const pFullName = `${player.firstName} ${player.lastName}`.trim().toLowerCase();
              for (const [k, v] of Object.entries(field as Record<string, string>)) {
                if (!v || !v.trim()) continue;
                if (k.toLowerCase().trim() === player.id.toLowerCase().trim() || k.toLowerCase().trim() === pFullName) {
                  talkText = v.trim();
                  break;
                }
              }
            }
          }
        }

        if (talkText) {
          const rawDate = (plan.date || plan.planDate || '').trim();
          talks.push({
            planId: plan.id || `${plan.date}-${plan.title}`,
            planTitle: plan.title || plan.planTitle || 'Trainingseinheit',
            planDate: rawDate || 'Kein Datum',
            trainerName: plan.debriefedByTrainer || plan.trainerName,
            text: talkText,
            createdAt: plan.createdAt
          });
        }
      });

      // Sort talks: NEWEST ON TOP, OLDEST AT BOTTOM
      const sortedTalks = talks.sort((a, b) => {
        const dateToTimestamp = (dStr: string) => {
          if (!dStr) return 0;
          const parts = dStr.split('.');
          if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
          }
          return new Date(dStr).getTime() || 0;
        };

        const timeA = a.createdAt || dateToTimestamp(a.planDate);
        const timeB = b.createdAt || dateToTimestamp(b.planDate);

        if (timeA && timeB && timeA !== timeB) {
          return timeB - timeA; // Newest first
        }
        return b.planDate.localeCompare(a.planDate);
      });

      map.set(player.id, sortedTalks);
    });

    return map;
  }, [allDisplayKeepers, savedPlans]);

  // =========================================================================
  // 2. ERKENNTNISSE AUS VERGANGENEN TRAININGSEINHEITEN MAP (from plan.keeperInsights)
  // =========================================================================
  const keeperInsightsMap = useMemo(() => {
    const map = new Map<string, HistoricalKeeperInsight[]>();

    allDisplayKeepers.forEach(player => {
      const insights: HistoricalKeeperInsight[] = [];

      savedPlans.forEach(plan => {
        let insightText = '';

        // 1. Direct plan.keeperInsights match
        if (plan.keeperInsights && typeof plan.keeperInsights === 'object') {
          if (plan.keeperInsights[player.id]?.trim()) {
            insightText = plan.keeperInsights[player.id].trim();
          } else {
            const pIdNorm = (player.id || '').trim().toLowerCase();
            const pFullName = `${player.firstName} ${player.lastName}`.trim().toLowerCase();
            const pReverseName = `${player.lastName} ${player.firstName}`.trim().toLowerCase();
            const pFirstOnly = (player.firstName || '').trim().toLowerCase();

            for (const [k, v] of Object.entries(plan.keeperInsights)) {
              if (!v || !v.trim()) continue;
              const normKey = k.trim().toLowerCase();
              if (
                normKey === pIdNorm ||
                normKey === pFullName ||
                normKey === pReverseName ||
                (pFirstOnly.length > 2 && normKey === pFirstOnly)
              ) {
                insightText = v.trim();
                break;
              }
            }
          }
        }

        // 2. Alternative fields check
        if (!insightText) {
          const altFields = [
            (plan as any).keeperNotes,
            (plan as any).individualInsights,
            (plan as any).keeperDebriefs
          ];
          for (const field of altFields) {
            if (field && typeof field === 'object') {
              if (field[player.id]?.trim()) {
                insightText = field[player.id].trim();
                break;
              }
              const pFullName = `${player.firstName} ${player.lastName}`.trim().toLowerCase();
              for (const [k, v] of Object.entries(field as Record<string, string>)) {
                if (!v || !v.trim()) continue;
                if (k.toLowerCase().trim() === player.id.toLowerCase().trim() || k.toLowerCase().trim() === pFullName) {
                  insightText = v.trim();
                  break;
                }
              }
            }
          }
        }

        if (insightText) {
          const rawDate = (plan.date || plan.planDate || '').trim();
          insights.push({
            planId: plan.id || `${plan.date}-${plan.title}`,
            planTitle: plan.title || plan.planTitle || 'Trainingseinheit',
            planDate: rawDate || 'Kein Datum',
            trainerName: plan.debriefedByTrainer || plan.trainerName,
            text: insightText,
            createdAt: plan.createdAt
          });
        }
      });

      // Sort insights: NEWEST ON TOP, OLDEST AT BOTTOM
      const sortedInsights = insights.sort((a, b) => {
        const dateToTimestamp = (dStr: string) => {
          if (!dStr) return 0;
          const parts = dStr.split('.');
          if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
          }
          return new Date(dStr).getTime() || 0;
        };

        const timeA = a.createdAt || dateToTimestamp(a.planDate);
        const timeB = b.createdAt || dateToTimestamp(b.planDate);

        if (timeA && timeB && timeA !== timeB) {
          return timeB - timeA; // Newest first
        }
        return b.planDate.localeCompare(a.planDate);
      });

      map.set(player.id, sortedInsights);
    });

    return map;
  }, [allDisplayKeepers, savedPlans]);

  // =========================================================================
  // 3. LETZTES FEEDBACKGESPRÄCH MAP (from PlayerFeedbackTalk)
  // =========================================================================
  const keeperLatestFeedbackMap = useMemo(() => {
    const map = new Map<string, PlayerFeedbackTalk | null>();
    const allTalksList = feedbackTalks && feedbackTalks.length > 0 
      ? feedbackTalks 
      : getLocalFeedbackTalks(userId);

    allDisplayKeepers.forEach(player => {
      const pId = player.id.trim().toLowerCase();
      const pFullName = `${player.firstName} ${player.lastName}`.trim().toLowerCase();
      const pReverseName = `${player.lastName} ${player.firstName}`.trim().toLowerCase();

      const matchingTalks = allTalksList.filter(t => {
        const tPlayerId = (t.playerId || '').trim().toLowerCase();
        const tPlayerName = (t.playerName || '').trim().toLowerCase();
        return (
          tPlayerId === pId ||
          tPlayerName === pFullName ||
          tPlayerName === pReverseName ||
          (tPlayerName && tPlayerName.includes(player.lastName.toLowerCase()))
        );
      });

      if (matchingTalks.length === 0) {
        map.set(player.id, null);
        return;
      }

      // Sort descending by date
      const sorted = matchingTalks.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA && dateB && dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      map.set(player.id, sorted[0] || null);
    });

    return map;
  }, [allDisplayKeepers, feedbackTalks, userId]);

  // Total counts for summary indicators
  const totalTalksCount = useMemo(() => {
    let count = 0;
    keeperTalksMap.forEach(talks => {
      count += talks.length;
    });
    return count;
  }, [keeperTalksMap]);

  const totalInsightsCount = useMemo(() => {
    let count = 0;
    keeperInsightsMap.forEach(insights => {
      count += insights.length;
    });
    return count;
  }, [keeperInsightsMap]);

  const totalLatestFeedbackCount = useMemo(() => {
    let count = 0;
    keeperLatestFeedbackMap.forEach(val => {
      if (val) count++;
    });
    return count;
  }, [keeperLatestFeedbackMap]);

  if (!isOpen) return null;

  const hasExistingOrgaData = Boolean(
    initialImportantNotes?.trim() || 
    initialHasVideoAnalysis || 
    importantNotes?.trim() || 
    hasVideoAnalysis
  );

  const handleApply = () => {
    onSaveToTraining({
      importantNotes: importantNotes.trim(),
      hasVideoAnalysis,
      videoAnalysisNotes: videoAnalysisNotes.trim()
    });
    onClose();
  };

  const handleClearAndRemove = () => {
    setImportantNotes('');
    setHasVideoAnalysis(false);
    setVideoAnalysisNotes('');
    onSaveToTraining({
      importantNotes: '',
      hasVideoAnalysis: false,
      videoAnalysisNotes: ''
    });
    onClose();
  };

  const term = searchTerm.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 flex-shrink-0 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-teal-400 bg-teal-950/60 border border-teal-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <Users className="w-3 h-3" />
                  {targetGroupName || 'Trainingsgruppe'}
                </span>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
                  {allDisplayKeepers.length} Torhüter
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white truncate mt-1">
                Orga & Gespräche
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition flex-shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* ================================================================= */}
          {/* 1. CHECKBOX VIDEOANALYSE                                          */}
          {/* ================================================================= */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-slate-200 hover:text-white transition">
              <input
                type="checkbox"
                checked={hasVideoAnalysis}
                onChange={e => setHasVideoAnalysis(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Video className={cn("w-4 h-4", hasVideoAnalysis ? "text-emerald-400" : "text-slate-400")} />
                <span>Videoanalyse für dieses Training ansetzen</span>
              </span>
            </label>

            <input
              type="text"
              disabled={!hasVideoAnalysis}
              value={videoAnalysisNotes}
              onChange={e => setVideoAnalysisNotes(e.target.value)}
              placeholder="z. B. 15 Min. vor Training / Schwerpunkt 1vs1"
              className={cn(
                "bg-slate-900 border rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition w-full sm:w-72",
                hasVideoAnalysis ? "border-slate-700" : "border-slate-800 opacity-40 cursor-not-allowed"
              )}
            />
          </div>

          {/* ================================================================= */}
          {/* 2. FREITEXTFELD: WICHTIGES ZUM TRAINING                           */}
          {/* ================================================================= */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Wichtiges zum Training</span>
              <span className="text-slate-500 font-normal lowercase">(Erscheint auf dem PDF-Ausdruck)</span>
            </label>
            <textarea
              rows={2}
              value={importantNotes}
              onChange={e => setImportantNotes(e.target.value)}
              placeholder="Wichtige organisatorische Hinweise, Schwerpunkte, Platzaufbau oder Absprachen für dieses Training..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs leading-relaxed transition"
            />
          </div>

          {/* ================================================================= */}
          {/* 3. SUCHFILTER FÜR WÖRTER / STICHWORTE (GILT FÜR ALLE KARTEN)     */}
          {/* ================================================================= */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-teal-400" />
                <span>Suchfilter für Gespräche & Erkenntnisse</span>
              </label>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-[11px] text-teal-400 hover:text-teal-300 underline cursor-pointer"
                >
                  Suche zurücksetzen
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Suchbegriff eingeben (z. B. 1vs1, Mut, Reaktion, Stellungsspiel, Beinarbeit, Flanken)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* 4. KARTE 1: SPIELERGESPRÄCHE (COLLAPSIBLE / ACCORDION)            */}
          {/* ================================================================= */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-lg transition-all">
            <button
              type="button"
              onClick={() => setIsSpielergespraecheOpen(prev => !prev)}
              className="w-full p-4 flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/80 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
                      Spielergespräche
                    </h3>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800/80 font-mono">
                      {totalTalksCount} {totalTalksCount === 1 ? 'Notiz' : 'Notizen'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                    Gesprächsnotizen pro Torwart • Horizontales & vertikales Scrollen
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors">
                <span className="text-[11px] font-bold hidden sm:inline">
                  {isSpielergespraecheOpen ? 'Einklappen' : 'Aufklappen'}
                </span>
                <div className="p-1 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition">
                  {isSpielergespraecheOpen ? (
                    <ChevronUp className="w-4 h-4 text-teal-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  )}
                </div>
              </div>
            </button>

            {isSpielergespraecheOpen && (
              <div className="p-4 animate-in fade-in duration-200">
                {allDisplayKeepers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2 text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="font-bold text-slate-300">Keine Torhüter in dieser Gruppe gefunden</p>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 pt-1 custom-scrollbar items-start">
                    {allDisplayKeepers.map((player, idx) => {
                      const allPlayerTalks = keeperTalksMap.get(player.id) || [];
                      
                      const filteredPlayerTalks = term 
                        ? allPlayerTalks.filter(t => 
                            t.text.toLowerCase().includes(term) ||
                            t.planDate.toLowerCase().includes(term) ||
                            t.planTitle.toLowerCase().includes(term) ||
                            (t.trainerName && t.trainerName.toLowerCase().includes(term))
                          )
                        : allPlayerTalks;

                      return (
                        <div 
                          key={player.id}
                          className="w-[300px] sm:w-[330px] md:w-[340px] flex-shrink-0 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
                        >
                          {/* Column Header */}
                          <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-xs font-black text-teal-300 flex-shrink-0">
                                {player.jerseyNumber ? `#${player.jerseyNumber}` : player.firstName[0]}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-white text-xs block truncate">
                                  {player.firstName} {player.lastName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  Torwart {idx + 1}
                                </span>
                              </div>
                            </div>

                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 font-mono border",
                              allPlayerTalks.length > 0 
                                ? "bg-teal-950 text-teal-300 border-teal-800" 
                                : "bg-slate-900 text-slate-500 border-slate-800"
                            )}>
                              {allPlayerTalks.length} {allPlayerTalks.length === 1 ? 'Eintrag' : 'Einträge'}
                            </span>
                          </div>

                          {/* Column Body: Scrollable per Goalkeeper */}
                          <div className="p-3 space-y-2.5 overflow-y-auto max-h-[220px] custom-scrollbar flex-1">
                            {filteredPlayerTalks.length === 0 ? (
                              <div className="p-4 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs space-y-1">
                                <MessageSquareQuote className="w-4 h-4 mx-auto text-slate-600 opacity-60" />
                                <p className="font-medium text-slate-400 text-[11px]">
                                  {term ? `Kein Treffer für „${searchTerm}“` : `Noch keine Gespräche für ${player.firstName}`}
                                </p>
                              </div>
                            ) : (
                              filteredPlayerTalks.map((talk, tIdx) => (
                                <div 
                                  key={`${talk.planId}-${tIdx}`}
                                  className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5 shadow-sm hover:border-slate-700 transition"
                                >
                                  <div className="flex items-center justify-between gap-1 text-[10.5px] text-slate-400">
                                    <span className="flex items-center gap-1 font-bold text-emerald-400 font-mono">
                                      <Calendar className="w-3 h-3 text-emerald-400" />
                                      <span>{talk.planDate}</span>
                                    </span>
                                    {tIdx === 0 && !term && (
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                                        Neueste
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-slate-100 text-[11.5px] leading-relaxed whitespace-pre-wrap pl-2.5 border-l-2 border-teal-500 bg-slate-950/70 p-2 rounded-r-lg">
                                    {talk.text}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* 5. KARTE 2: ERKENNTNISSE AUS VERGANGENEN TRAININGSEINHEITEN      */}
          {/* ================================================================= */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-lg transition-all">
            <button
              type="button"
              onClick={() => setIsErkenntnisseOpen(prev => !prev)}
              className="w-full p-4 flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/80 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
                      Erkenntnisse aus vergangenen Trainingseinheiten
                    </h3>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-mono">
                      {totalInsightsCount} {totalInsightsCount === 1 ? 'Erkenntnis' : 'Erkenntnisse'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                    Aus Einheit nachbereiten (1. Torhüter) • Max. 2 Einträge sichtbar, scrollbar
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors">
                <span className="text-[11px] font-bold hidden sm:inline">
                  {isErkenntnisseOpen ? 'Einklappen' : 'Aufklappen'}
                </span>
                <div className="p-1 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition">
                  {isErkenntnisseOpen ? (
                    <ChevronUp className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  )}
                </div>
              </div>
            </button>

            {isErkenntnisseOpen && (
              <div className="p-4 animate-in fade-in duration-200">
                {allDisplayKeepers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2 text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="font-bold text-slate-300">Keine Torhüter in dieser Gruppe gefunden</p>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 pt-1 custom-scrollbar items-start">
                    {allDisplayKeepers.map((player, idx) => {
                      const allPlayerInsights = keeperInsightsMap.get(player.id) || [];
                      
                      const filteredPlayerInsights = term 
                        ? allPlayerInsights.filter(i => 
                            i.text.toLowerCase().includes(term) ||
                            i.planDate.toLowerCase().includes(term) ||
                            i.planTitle.toLowerCase().includes(term) ||
                            (i.trainerName && i.trainerName.toLowerCase().includes(term))
                          )
                        : allPlayerInsights;

                      return (
                        <div 
                          key={`insight-${player.id}`}
                          className="w-[300px] sm:w-[330px] md:w-[340px] flex-shrink-0 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
                        >
                          {/* Column Header */}
                          <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xs font-black text-cyan-300 flex-shrink-0">
                                {player.jerseyNumber ? `#${player.jerseyNumber}` : player.firstName[0]}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-white text-xs block truncate">
                                  {player.firstName} {player.lastName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  Torwart {idx + 1}
                                </span>
                              </div>
                            </div>

                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 font-mono border",
                              allPlayerInsights.length > 0 
                                ? "bg-cyan-950 text-cyan-300 border-cyan-800" 
                                : "bg-slate-900 text-slate-500 border-slate-800"
                            )}>
                              {allPlayerInsights.length} {allPlayerInsights.length === 1 ? 'Eintrag' : 'Einträge'}
                            </span>
                          </div>

                          {/* Column Body: Scrollable with max ~2 visible items */}
                          <div className="p-3 space-y-2.5 overflow-y-auto max-h-[185px] custom-scrollbar flex-1">
                            {filteredPlayerInsights.length === 0 ? (
                              <div className="p-4 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs space-y-1">
                                <Sparkles className="w-4 h-4 mx-auto text-slate-600 opacity-60" />
                                <p className="font-medium text-slate-400 text-[11px]">
                                  {term ? `Kein Treffer für „${searchTerm}“` : `Noch keine Erkenntnisse für ${player.firstName}`}
                                </p>
                                {!term && (
                                  <p className="text-[10px] text-slate-600">
                                    Erfassung unter Historie ➔ Einheit nachbereiten ➔ 1. Torhüter.
                                  </p>
                                )}
                              </div>
                            ) : (
                              filteredPlayerInsights.map((insight, iIdx) => (
                                <div 
                                  key={`${insight.planId}-${iIdx}`}
                                  className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5 shadow-sm hover:border-slate-700 transition"
                                >
                                  <div className="flex items-center justify-between gap-1 text-[10.5px] text-slate-400">
                                    <span className="flex items-center gap-1 font-bold text-cyan-400 font-mono">
                                      <Calendar className="w-3 h-3 text-cyan-400" />
                                      <span>{insight.planDate}</span>
                                    </span>
                                    {iIdx === 0 && !term && (
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                                        Neueste
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-slate-100 text-[11.5px] leading-relaxed whitespace-pre-wrap pl-2.5 border-l-2 border-cyan-500 bg-slate-950/70 p-2 rounded-r-lg">
                                    {insight.text}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* 6. KARTE 3: LETZTES FEEDBACKGESPRÄCH                             */}
          {/* ================================================================= */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-lg transition-all">
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(prev => !prev)}
              className="w-full p-4 flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/80 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
                      Letztes Feedbackgespräch
                    </h3>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/80 font-mono">
                      {totalLatestFeedbackCount} {totalLatestFeedbackCount === 1 ? 'Feedback' : 'Feedbacks'} vorhanden
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                    Aktuellster Stand aus Orga ➔ Dateneingabe ➔ Feedbackgespräch
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors">
                <span className="text-[11px] font-bold hidden sm:inline">
                  {isFeedbackOpen ? 'Einklappen' : 'Aufklappen'}
                </span>
                <div className="p-1 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition">
                  {isFeedbackOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  )}
                </div>
              </div>
            </button>

            {isFeedbackOpen && (
              <div className="p-4 animate-in fade-in duration-200">
                {allDisplayKeepers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2 text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="font-bold text-slate-300">Keine Torhüter in dieser Gruppe gefunden</p>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 pt-1 custom-scrollbar items-start">
                    {allDisplayKeepers.map((player, idx) => {
                      const latestTalk = keeperLatestFeedbackMap.get(player.id);
                      
                      // Check search filter for feedback
                      const matchesTerm = !term || (latestTalk && (
                        latestTalk.keyPoints.toLowerCase().includes(term) ||
                        latestTalk.date.toLowerCase().includes(term) ||
                        latestTalk.trainer1.toLowerCase().includes(term) ||
                        (latestTalk.trainer2 && latestTalk.trainer2.toLowerCase().includes(term))
                      ));

                      return (
                        <div 
                          key={`feedback-${player.id}`}
                          className="w-[300px] sm:w-[330px] md:w-[340px] flex-shrink-0 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
                        >
                          {/* Column Header */}
                          <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-300 flex-shrink-0">
                                {player.jerseyNumber ? `#${player.jerseyNumber}` : player.firstName[0]}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-white text-xs block truncate">
                                  {player.firstName} {player.lastName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  Torwart {idx + 1}
                                </span>
                              </div>
                            </div>

                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 font-mono border",
                              latestTalk 
                                ? "bg-amber-950 text-amber-300 border-amber-800" 
                                : "bg-slate-900 text-slate-500 border-slate-800"
                            )}>
                              {latestTalk ? '1 Feedback' : 'Kein Eintrag'}
                            </span>
                          </div>

                          {/* Column Body: Displays only the single latest feedback */}
                          <div className="p-3 space-y-2.5 overflow-y-auto max-h-[185px] custom-scrollbar flex-1">
                            {!latestTalk ? (
                              <div className="p-4 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs space-y-1">
                                <Award className="w-4 h-4 mx-auto text-slate-600 opacity-60" />
                                <p className="font-medium text-slate-400 text-[11px]">
                                  Noch kein Feedbackgespräch für {player.firstName} erfasst
                                </p>
                                <p className="text-[10px] text-slate-600">
                                  Erfassung unter Orga ➔ Dateneingabe ➔ Feedbackgespräch.
                                </p>
                              </div>
                            ) : !matchesTerm ? (
                              <div className="p-4 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs space-y-1">
                                <p className="font-medium text-slate-400 text-[11px]">
                                  Kein Treffer für „{searchTerm}“ im Feedbackgespräch
                                </p>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2 shadow-sm hover:border-slate-700 transition">
                                <div className="flex items-center justify-between gap-1 text-[10.5px] text-slate-400">
                                  <span className="flex items-center gap-1 font-bold text-amber-400 font-mono">
                                    <Calendar className="w-3 h-3 text-amber-400" />
                                    <span>{latestTalk.date}</span>
                                  </span>
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                                    Aktuellstes
                                  </span>
                                </div>

                                <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5">
                                  <UserCheck className="w-3 h-3 text-slate-500" />
                                  <span>Trainer: <strong className="text-slate-200">{latestTalk.trainer1}</strong>{latestTalk.trainer2 ? ` & ${latestTalk.trainer2}` : ''}</span>
                                </div>

                                <div className="text-slate-100 text-[11.5px] leading-relaxed whitespace-pre-wrap pl-2.5 border-l-2 border-amber-500 bg-slate-950/70 p-2 rounded-r-lg">
                                  {latestTalk.keyPoints}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* ================================================================= */}
        {/* FOOTER ACTIONS                                                    */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          <div>
            {hasExistingOrgaData && (
              <button
                type="button"
                onClick={handleClearAndRemove}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-200 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Alle hinterlegten Notizen & Videoanalyse für diesen Trainingsplan entfernen"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vom Plan entfernen</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              Abbrechen
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Zum Training hinzufügen</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

