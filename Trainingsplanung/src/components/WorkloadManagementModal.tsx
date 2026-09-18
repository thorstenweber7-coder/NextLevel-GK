import React, { useState, useMemo } from 'react';
import { 
  X, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  User, 
  Shield, 
  Zap, 
  ChevronRight, 
  BarChart3, 
  HelpCircle,
  Flame,
  HeartPulse
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { TrainingPlan, TrainingGroup, Player, PlayerMatchPlaytime, MesoPlan, PlayerAbsence } from '../types';
import { 
  calculateGroupWorkload, 
  calculatePlayerWorkload,
  WORKLOAD_STATUS_CONFIG, 
  type WorkloadStatus,
  type PlayerWorkload,
  type WeeklyLoadData 
} from '../utils/workloadCalculator';

export interface WorkloadManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: TrainingGroup[];
  savedPlans: TrainingPlan[];
  matchPlaytimes?: PlayerMatchPlaytime[];
  mesoPlans?: MesoPlan[];
  absences?: PlayerAbsence[];
  initialGroupId?: string;
  initialPlayerId?: string;
  referenceDate?: Date | string;
}

export const WorkloadManagementModal: React.FC<WorkloadManagementModalProps> = ({
  isOpen,
  onClose,
  groups,
  savedPlans,
  matchPlaytimes,
  mesoPlans,
  absences = [],
  initialGroupId,
  initialPlayerId,
  referenceDate
}) => {
  if (!isOpen) return null;

  // 1. Group Selection
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    if (initialGroupId) {
      const match = groups.find(g => g.id === initialGroupId || g.name.trim().toLowerCase() === initialGroupId.trim().toLowerCase());
      if (match) return match.id;
    }
    return groups[0]?.id || 'all';
  });

  // Sync selectedGroupId if initialGroupId changes
  React.useEffect(() => {
    if (initialGroupId) {
      const match = groups.find(g => g.id === initialGroupId || g.name.trim().toLowerCase() === initialGroupId.trim().toLowerCase());
      if (match) {
        setSelectedGroupId(match.id);
      }
    }
  }, [initialGroupId, groups]);

  // 2. Player selection: null = Entire Group average, string = specific player ID
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(initialPlayerId || null);

  React.useEffect(() => {
    if (initialPlayerId !== undefined) {
      setSelectedPlayerId(initialPlayerId);
    }
  }, [initialPlayerId]);

  // 3. Time window for chart: 4, 6, or 8 weeks
  const [weeksCount, setWeeksCount] = useState<number>(8);

  // 4. Hovered chart point
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);

  // 5. Info accordion
  const [showScienceGuide, setShowScienceGuide] = useState<boolean>(false);

  // Active Group Object
  const currentGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || groups[0] || null;
  }, [groups, selectedGroupId]);

  // Compute Group Workload Data
  const groupWorkload = useMemo(() => {
    return calculateGroupWorkload(currentGroup, groups, savedPlans, referenceDate || new Date(), matchPlaytimes, mesoPlans, absences);
  }, [currentGroup, groups, savedPlans, matchPlaytimes, mesoPlans, referenceDate, absences]);

  // Active Player Data or Team Average Data
  const activePlayerData = useMemo<PlayerWorkload | null>(() => {
    if (!selectedPlayerId) return null;
    const player = groupWorkload.players.find(p => p.playerId === selectedPlayerId);
    if (player) return player;
    // Fallback if keeper from another group
    const allPlayers: Player[] = [];
    groups.forEach(g => (g.players || []).forEach(p => allPlayers.push(p)));
    const found = allPlayers.find(p => p.id === selectedPlayerId);
    return found ? calculatePlayerWorkload(found, savedPlans, referenceDate || new Date(), weeksCount, matchPlaytimes, mesoPlans, absences) : null;
  }, [selectedPlayerId, groupWorkload.players, groups, savedPlans, weeksCount, matchPlaytimes, mesoPlans, referenceDate, absences]);

  // Data to display in chart and metric cards
  const currentHistory: WeeklyLoadData[] = useMemo(() => {
    const raw = activePlayerData ? activePlayerData.weeklyHistory : groupWorkload.teamWeeklyHistory;
    return raw.slice(-weeksCount);
  }, [activePlayerData, groupWorkload.teamWeeklyHistory, weeksCount]);

  // Derived current metrics
  const activeAcute = activePlayerData ? activePlayerData.acuteLoad7d : groupWorkload.teamAvgAcuteLoad;
  const activeChronic = activePlayerData ? activePlayerData.chronicLoad28d : groupWorkload.teamAvgChronicLoad;
  const activeAcwr = activePlayerData ? activePlayerData.acwr : groupWorkload.teamAvgAcwr;
  const activeStatus: WorkloadStatus = activePlayerData ? activePlayerData.status : groupWorkload.teamStatus;
  const activeStatusCfg = WORKLOAD_STATUS_CONFIG[activeStatus];

  // Derived EWMA metrics
  const activeAcuteEwma = activePlayerData ? (activePlayerData.acuteLoadEwma ?? activeAcute) : (groupWorkload.teamAvgAcuteLoadEwma ?? groupWorkload.teamAvgAcuteLoad);
  const activeChronicEwma = activePlayerData ? (activePlayerData.chronicLoadEwma ?? activeChronic) : (groupWorkload.teamAvgChronicLoadEwma ?? groupWorkload.teamAvgChronicLoad);
  const activeAcwrEwma = activePlayerData ? (activePlayerData.acwrEwma ?? activeAcwr) : (groupWorkload.teamAvgAcwrEwma ?? groupWorkload.teamAvgAcwr);
  const activeStatusEwma = activePlayerData ? (activePlayerData.statusEwma ?? activeStatus) : (groupWorkload.teamStatusEwma ?? activeStatus);

  // Derived Jump-weighted joint-load metrics ("Nutzung der Angabe Sprungvolumen")
  const activeJumpAcute = activePlayerData ? (activePlayerData.jumpWeightedAcuteLoad7d ?? activeAcute) : (groupWorkload.teamAvgJumpWeightedAcuteLoad ?? groupWorkload.teamAvgAcuteLoad);
  const activeJumpChronic = activePlayerData ? (activePlayerData.jumpWeightedChronicLoad28d ?? activeChronic) : (groupWorkload.teamAvgJumpWeightedChronicLoad ?? groupWorkload.teamAvgChronicLoad);
  const activeJumpAcwr = activePlayerData ? (activePlayerData.jumpWeightedAcwr ?? activeAcwr) : (groupWorkload.teamAvgJumpWeightedAcwr ?? groupWorkload.teamAvgAcwr);
  const activeJumpStatus = activePlayerData ? (activePlayerData.jumpWeightedStatus ?? activeStatus) : (groupWorkload.teamJumpWeightedStatus ?? activeStatus);
  const activeJumpStatusCfg = WORKLOAD_STATUS_CONFIG[activeJumpStatus];

  const past4Weeks = currentHistory.slice(-4);
  const avg4Weeks = Math.round(past4Weeks.reduce((a, b) => a + b.totalLoad, 0) / Math.max(1, past4Weeks.length));
  const peakLoad = Math.max(0, ...currentHistory.map(w => w.totalLoad));
  const currentMinutes = currentHistory[currentHistory.length - 1]?.totalMinutes || 0;

  const isCurrentColdStart = activePlayerData ? activePlayerData.isColdStart : groupWorkload.isColdStart;
  const currentDocumentedWeeks = activePlayerData ? activePlayerData.documentedWeeksCount : (groupWorkload.players[0]?.documentedWeeksCount ?? 0);
  const currentJumpVolume = activePlayerData ? activePlayerData.jumpVolume7dSummary : groupWorkload.teamJumpVolume7dSummary;

  // Chart Calculations
  const maxLoadVal = Math.max(1500, Math.ceil(Math.max(...currentHistory.map(w => w.totalLoad), 1) * 1.2 / 500) * 500);
  const maxAcwrVal = 2.5; // ACWR scale 0 to 2.5

  const chartWidth = 720;
  const chartHeight = 260;
  const padLeft = 55;
  const padRight = 50;
  const padTop = 30;
  const padBottom = 40;

  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const numPoints = currentHistory.length;
  const colWidth = numPoints > 0 ? plotWidth / numPoints : 0;
  const barWidth = Math.max(16, Math.min(38, colWidth * 0.48));

  // Helper coordinate functions
  const getYLoad = (load: number) => padTop + plotHeight - (Math.min(load, maxLoadVal) / maxLoadVal) * plotHeight;
  const getYAcwr = (acwr: number) => padTop + plotHeight - (Math.min(acwr, maxAcwrVal) / maxAcwrVal) * plotHeight;
  const getXCenter = (index: number) => padLeft + index * colWidth + colWidth / 2;

  // ACWR line points
  const linePoints = currentHistory.map((w, i) => {
    const x = getXCenter(i);
    const y = getYAcwr(w.acwr);
    return `${x},${y}`;
  }).join(' ');

  // Sweet spot band (0.8 - 1.3)
  const sweetSpotTop = getYAcwr(1.3);
  const sweetSpotBottom = getYAcwr(0.8);
  const sweetSpotHeight = sweetSpotBottom - sweetSpotTop;

  // Danger threshold line (1.5)
  const dangerLineY = getYAcwr(1.5);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-800 bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg",
              groupWorkload.hasDangerSpike 
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse" 
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            )}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Belastungssteuerung & ACWR-Monitoring
                </h2>
                {groupWorkload.hasDangerSpike && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-700/80 text-[10px] font-black uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    Belastungsspitze erkannt
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Evidenzbasierte Trainingslast (sRPE) & 7-Tage / 28-Tage-Verhältnis (ACWR)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Group Selector */}
            {groups.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
                <Users className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                <select
                  value={selectedGroupId}
                  onChange={e => {
                    setSelectedGroupId(e.target.value);
                    setSelectedPlayerId(null);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none pr-2 cursor-pointer"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id} className="bg-slate-900 text-slate-200">
                      {g.name} ({g.players?.length || 0} TW)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MODAL BODY (SCROLLABLE)                                           */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* Mobile Group Selector */}
          {groups.length > 1 && (
            <div className="sm:hidden flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <Users className="w-4 h-4 text-slate-400" />
              <select
                value={selectedGroupId}
                onChange={e => {
                  setSelectedGroupId(e.target.value);
                  setSelectedPlayerId(null);
                }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none w-full"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id} className="bg-slate-900 text-slate-200">
                    {g.name} ({g.players?.length || 0} TW)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 1. TEAM-AMPEL-MATRIX (KACHELANSICHT DER TORHÜTER)               */}
          {/* --------------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Team-Ampel-Matrix: {currentGroup?.name || 'Trainingsgruppe'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  ({groupWorkload.players.length} Torhüter)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Klicke auf einen Torwart für die Detailanalyse
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 0: Gesamtes Team (Team-Durchschnitt) */}
              <button
                type="button"
                onClick={() => setSelectedPlayerId(null)}
                className={cn(
                  "p-3.5 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer",
                  selectedPlayerId === null
                    ? "bg-slate-800/95 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">Team-Schnitt</div>
                        <div className="text-[10px] text-slate-400">Alle Torhüter (Ø)</div>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10.5px] font-bold border flex items-center gap-1",
                      WORKLOAD_STATUS_CONFIG[groupWorkload.teamStatus].badge
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", WORKLOAD_STATUS_CONFIG[groupWorkload.teamStatus].dotColor)} />
                      {groupWorkload.teamAvgAcwr.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10.5px] pt-1 border-t border-slate-800/70">
                    <div>
                      <span className="text-slate-500 block text-[9.5px]">Akut (7d):</span>
                      <span className="font-semibold text-slate-200">{groupWorkload.teamAvgAcuteLoad} A.U.</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9.5px]">Chronisch (28d):</span>
                      <span className="font-semibold text-slate-200">{groupWorkload.teamAvgChronicLoad} A.U.</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">{WORKLOAD_STATUS_CONFIG[groupWorkload.teamStatus].label}</span>
                  {selectedPlayerId === null && (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      Aktiv <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </button>

              {/* Cards for each player */}
              {groupWorkload.players.map(p => {
                const isSelected = selectedPlayerId === p.playerId;
                const statusCfg = WORKLOAD_STATUS_CONFIG[p.status];
                return (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => setSelectedPlayerId(p.playerId)}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer",
                      isSelected
                        ? "bg-slate-800/95 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60",
                      p.status === 'danger' && !isSelected && "border-rose-500/50 bg-rose-950/20"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono border",
                            p.status === 'danger' 
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/50" 
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          )}>
                            {p.jerseyNumber ? `#${p.jerseyNumber}` : <User className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white truncate max-w-[110px]" title={p.playerName}>
                              {p.playerName}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {p.jerseyNumber ? `Trikot #${p.jerseyNumber}` : 'Torwart'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {p.jumpVolume7dSummary && p.jumpVolume7dSummary !== 'none' && (
                            <span 
                              title={`Sprungvolumen 7d: ${p.jumpVolume7dSummary === 'high' ? 'Hoch' : p.jumpVolume7dSummary === 'medium' ? 'Mittel' : 'Niedrig'}`}
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase flex items-center gap-0.5 border",
                                p.jumpVolume7dSummary === 'high' ? "bg-rose-950 text-rose-300 border-rose-700" :
                                p.jumpVolume7dSummary === 'medium' ? "bg-amber-950 text-amber-300 border-amber-700" :
                                "bg-emerald-950 text-emerald-300 border-emerald-700"
                              )}
                            >
                              <Zap className="w-2.5 h-2.5" />
                              {p.jumpVolume7dSummary === 'high' ? 'H' : p.jumpVolume7dSummary === 'medium' ? 'M' : 'N'}
                            </span>
                          )}
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10.5px] font-bold border flex items-center gap-1",
                            statusCfg.badge
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dotColor)} />
                            {p.acwr.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[10.5px] pt-1 border-t border-slate-800/70">
                        <div>
                          <span className="text-slate-500 block text-[9.5px]">Akut (7d):</span>
                          <span className="font-semibold text-slate-200">{p.acuteLoad7d} A.U.</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9.5px]">Chronisch:</span>
                          <span className="font-semibold text-slate-200">{p.chronicLoad28d} A.U.</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                      <span className={cn("font-medium truncate", statusCfg.text)}>
                        {statusCfg.label}
                      </span>
                      {isSelected && (
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          Aktiv <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* KALTSTART-HINWEIS (FALLS WENIGER ALS 2 DOKUMENTIERTE VORWOCHEN) */}
          {/* --------------------------------------------------------------- */}
          {isCurrentColdStart && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-600/40 text-xs text-amber-200/90 flex items-start gap-3 shadow-lg shadow-amber-950/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-amber-300 text-sm">
                    Kaltstart-Phase: Belastungsbasis wird aufgebaut
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/60 text-[10px] font-mono font-bold">
                    {currentDocumentedWeeks}/4 Vorwochen dokumentiert
                  </span>
                </div>
                <p className="text-[11.5px] text-amber-200/80 leading-relaxed">
                  Für die ACWR-Berechnung liegen weniger als 2 dokumentierte Vorwochen im 28-Tage-Fenster vor. In den ersten 14 Tagen der Erfassung reagiert der ACWR-Index empfindlich auf einzelne Einheiten, bis eine valide chronische Trainingshistorie (Fitness-Basis) in der Datenbank aufgebaut ist.
                </p>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 2. KENNZAHLEN-KARTEN (SUMMARY METRICS)                           */}
          {/* --------------------------------------------------------------- */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Metric 1: Akute Last (7d) */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Akute Last (7d)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">∑ sRPE</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeAcute.toLocaleString('de-DE')} <span className="text-xs font-normal text-slate-400">A.U.</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>EWMA: {activeAcuteEwma.toLocaleString('de-DE')} A.U.</span>
                <span className="text-slate-500 font-mono">{currentMinutes} Min.</span>
              </div>
            </div>

            {/* Metric 2: Chronische Baseline (28d ø) */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  Chronische Last
                </span>
                <span className="text-[10px] text-slate-500 font-mono">28d ø</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeChronic.toLocaleString('de-DE')} <span className="text-xs font-normal text-slate-400">A.U.</span>
              </div>
              <div className="text-[10px] text-slate-400">
                EWMA-Basis: {activeChronicEwma.toLocaleString('de-DE')} A.U.
              </div>
            </div>

            {/* Metric 3: ACWR Ratio & Ampel */}
            <div className={cn(
              "border rounded-2xl p-3.5 space-y-1 relative overflow-hidden",
              activeStatusCfg.bg,
              activeStatusCfg.border
            )}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                  ACWR-Index
                </span>
                <span className={cn("px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase", activeStatusCfg.badge)}>
                  {activeStatusCfg.label}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeAcwr.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-300">
                EWMA: <span className="font-mono font-bold text-white">{activeAcwrEwma.toFixed(2)}</span> ({WORKLOAD_STATUS_CONFIG[activeStatusEwma].label})
              </div>
            </div>

            {/* Metric 4: Sprung- & Gelenkbelastung (7d) - Nutzung der Angabe Sprungvolumen */}
            <div className={cn(
              "border rounded-2xl p-3.5 space-y-1 relative overflow-hidden bg-slate-950/70",
              currentJumpVolume === 'high' ? "border-rose-500/50 bg-rose-950/20" :
              currentJumpVolume === 'medium' ? "border-amber-500/50 bg-amber-950/20" :
              currentJumpVolume === 'low' ? "border-emerald-500/50 bg-emerald-950/20" :
              "border-slate-800/90"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Gelenkbelastung
                </span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-black uppercase border",
                  activeJumpStatusCfg.badge
                )}>
                  {currentJumpVolume === 'high' ? 'High Impact' : currentJumpVolume === 'medium' ? 'Moderat' : currentJumpVolume === 'low' ? 'Schonend' : 'Standard'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeJumpAcute.toLocaleString('de-DE')} <span className="text-xs font-normal text-slate-400">A.U.</span>
              </div>
              <div 
                className="text-[9.5px] text-amber-300/90 font-medium truncate" 
                title={`Nutzung der Angabe Sprungvolumen: Akut ${activeJumpAcute} A.U. / Chronisch ${activeJumpChronic} A.U. (ACWR: ${activeJumpAcwr.toFixed(2)})`}
              >
                Nutzung der Angabe Sprungvolumen (ACWR: {activeJumpAcwr.toFixed(2)})
              </div>
            </div>

            {/* Metric 5: Monatspeak / 4-Wochen-Schnitt */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Monatspeak / Ø
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Max / Ø</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {peakLoad.toLocaleString('de-DE')} <span className="text-xs font-normal text-slate-400">Peak</span>
              </div>
              <div className="text-[10.5px] text-slate-400">
                Ø 4 Wochen: {avg4Weeks.toLocaleString('de-DE')} A.U.
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* 3. INTERAKTIVES BELASTUNGS-DIAGRAMM (4–8 WOCHEN)                */}
          {/* --------------------------------------------------------------- */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    Belastungsverlauf & ACWR-Entwicklung
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium">
                    {activePlayerData ? activePlayerData.playerName : `${currentGroup?.name || 'Team'} (Durchschnitt)`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Balken: Wöchentliche Gesamtarbeitslast (A.U.) • X-Achse: Letzter Tag der 7-Tage-Woche • Linie: ACWR mit grünem Sweet-Spot (0.8–1.3)
                </p>
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                {[4, 6, 8].map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeeksCount(w)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      weeksCount === w
                        ? "bg-emerald-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    {w} Wochen
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Dual-Axis Chart */}
            <div className="relative overflow-x-auto">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-auto min-w-[580px] select-none"
              >
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="sweetSpotGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {/* Background Grid Lines (sRPE Axis) */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = padTop + plotHeight * (1 - pct);
                  const val = Math.round(maxLoadVal * pct);
                  return (
                    <g key={i}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="3 3"
                        strokeOpacity="0.4"
                      />
                      {/* Left Y-Axis Label (sRPE) */}
                      <text
                        x={padLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="9.5"
                        fill="#94a3b8"
                        fontWeight="500"
                        fontFamily="ui-monospace, monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Right Y-Axis Labels (ACWR) */}
                {[0, 0.8, 1.3, 1.5, 2.0, 2.5].map((val, i) => {
                  const y = getYAcwr(val);
                  return (
                    <text
                      key={i}
                      x={chartWidth - padRight + 8}
                      y={y + 3.5}
                      textAnchor="start"
                      fontSize="9.5"
                      fill={val === 1.5 ? '#f43f5e' : val === 0.8 || val === 1.3 ? '#10b981' : '#94a3b8'}
                      fontWeight={val === 1.5 || val === 0.8 || val === 1.3 ? 'bold' : 'normal'}
                      fontFamily="ui-monospace, monospace"
                    >
                      {val.toFixed(1)}
                    </text>
                  );
                })}

                {/* Sweet Spot Corridor Rect (0.8 - 1.3) */}
                <rect
                  x={padLeft}
                  y={sweetSpotTop}
                  width={plotWidth}
                  height={sweetSpotHeight}
                  fill="url(#sweetSpotGradient)"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.4"
                />
                <text
                  x={padLeft + 8}
                  y={sweetSpotTop + 13}
                  fontSize="9"
                  fill="#34d399"
                  fontWeight="bold"
                  opacity="0.8"
                >
                  SWEET SPOT (0.8 – 1.3)
                </text>

                {/* Danger Line (1.5) */}
                <line
                  x1={padLeft}
                  y1={dangerLineY}
                  x2={chartWidth - padRight}
                  y2={dangerLineY}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeOpacity="0.8"
                />
                <text
                  x={chartWidth - padRight - 8}
                  y={dangerLineY - 5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#f43f5e"
                  fontWeight="bold"
                >
                  GEFAHRENSCHWELLE (≥ 1.5)
                </text>

                {/* Bars: Weekly Load (sRPE) */}
                {currentHistory.map((w, i) => {
                  const xCenter = getXCenter(i);
                  const x = xCenter - barWidth / 2;
                  const y = getYLoad(w.totalLoad);
                  const height = Math.max(2, padTop + plotHeight - y);
                  const isHovered = hoveredWeekIndex === i;

                  return (
                    <g 
                      key={`bar-${i}`}
                      onMouseEnter={() => setHoveredWeekIndex(i)}
                      onMouseLeave={() => setHoveredWeekIndex(null)}
                      className="cursor-pointer"
                    >
                      {/* Interactive Column Hover Hitbox */}
                      <rect
                        x={padLeft + i * colWidth}
                        y={padTop}
                        width={colWidth}
                        height={plotHeight}
                        fill={isHovered ? 'rgba(255, 255, 255, 0.04)' : 'transparent'}
                      />

                      {/* Actual Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        rx="5"
                        ry="5"
                        fill={isHovered ? 'url(#barGradientHover)' : 'url(#barGradient)'}
                        stroke={isHovered ? '#34d399' : '#059669'}
                        strokeWidth={isHovered ? '1.5' : '1'}
                        className="transition-all duration-150"
                      />

                      {/* Value label on top of bar */}
                      {w.totalLoad > 0 && (
                        <text
                          x={xCenter}
                          y={y - 5}
                          textAnchor="middle"
                          fontSize="9.5"
                          fill={isHovered ? '#ffffff' : '#cbd5e1'}
                          fontWeight={isHovered ? 'bold' : '500'}
                          fontFamily="ui-monospace, monospace"
                        >
                          {w.totalLoad}
                        </text>
                      )}

                      {/* X-Axis Label */}
                      <text
                        x={xCenter}
                        y={chartHeight - 14}
                        textAnchor="middle"
                        fontSize="10"
                        fill={w.isCurrentWeek ? '#34d399' : isHovered ? '#ffffff' : '#94a3b8'}
                        fontWeight={w.isCurrentWeek || isHovered ? 'bold' : 'normal'}
                      >
                        {w.weekLabel}
                      </text>
                    </g>
                  );
                })}

                {/* ACWR Trend Line */}
                {currentHistory.length > 1 && (
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-md"
                  />
                )}

                {/* ACWR Data Points & Dots */}
                {currentHistory.map((w, i) => {
                  const cx = getXCenter(i);
                  const cy = getYAcwr(w.acwr);
                  const isHovered = hoveredWeekIndex === i;
                  const dotColor = WORKLOAD_STATUS_CONFIG[w.status].hex;

                  return (
                    <g 
                      key={`dot-${i}`}
                      onMouseEnter={() => setHoveredWeekIndex(i)}
                      onMouseLeave={() => setHoveredWeekIndex(null)}
                      className="cursor-pointer"
                    >
                      {/* Pulse circle if danger */}
                      {w.status === 'danger' && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="10"
                          fill="#f43f5e"
                          opacity="0.3"
                          className="animate-ping origin-center"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered ? '6' : '4.5'}
                        fill={dotColor}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                      {/* ACWR badge above point */}
                      <text
                        x={cx}
                        y={cy - 9}
                        textAnchor="middle"
                        fontSize="9"
                        fill={dotColor}
                        fontWeight="bold"
                        fontFamily="ui-monospace, monospace"
                      >
                        {w.acwr.toFixed(2)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Box (if point hovered) */}
            {hoveredWeekIndex !== null && currentHistory[hoveredWeekIndex] && (
              <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-150">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Woche bis {currentHistory[hoveredWeekIndex].weekLabel} ({(() => {
                        const s = currentHistory[hoveredWeekIndex].weekStart;
                        const e = currentHistory[hoveredWeekIndex].weekEnd;
                        const sD = s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                        const eD = e ? new Date(e).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                        return `${sD} bis ${eD}`;
                      })()})
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      WORKLOAD_STATUS_CONFIG[currentHistory[hoveredWeekIndex].status].badge
                    )}>
                      {WORKLOAD_STATUS_CONFIG[currentHistory[hoveredWeekIndex].status].label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {currentHistory[hoveredWeekIndex].sessionCount} Trainingseinheiten {currentHistory[hoveredWeekIndex].matchCount > 0 ? `• ⚽ ${currentHistory[hoveredWeekIndex].matchCount} Spiel(e)` : ''} • {currentHistory[hoveredWeekIndex].totalMinutes} Min.
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Wochenarbeitslast:</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {currentHistory[hoveredWeekIndex].totalLoad.toLocaleString('de-DE')} A.U.
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ACWR-Wert:</span>
                    <span className={cn(
                      "font-bold text-sm",
                      WORKLOAD_STATUS_CONFIG[currentHistory[hoveredWeekIndex].status].text
                    )}>
                      {currentHistory[hoveredWeekIndex].acwr.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-600/80 border border-emerald-500" />
                  <span>Wochenlast ∑ sRPE (linke Achse, A.U.)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-1 bg-amber-400 rounded-full" />
                  <span>ACWR-Linie (rechte Achse)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/50" />
                  <span>Sweet Spot (0.8–1.3)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 border-t border-dashed border-rose-500" />
                  <span>Gefahrenzone (≥ 1.5)</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500">
                Berechnung: sRPE = TW-Dauer × TW-Intensität + Team-Dauer × Team-Intensität (bzw. Nachbereitung RPE)
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* 4. HANDLUNGSEMPFEHLUNG & TRAINER-TIPP                           */}
          {/* --------------------------------------------------------------- */}
          <div className={cn(
            "p-4 sm:p-5 rounded-2xl border space-y-2",
            activeStatusCfg.bg,
            activeStatusCfg.border
          )}>
            <div className="flex items-center gap-2">
              <Zap className={cn("w-4 h-4", activeStatusCfg.text)} />
              <h4 className={cn("text-xs font-black uppercase tracking-wider", activeStatusCfg.text)}>
                Handlungsempfehlung für {activePlayerData ? activePlayerData.playerName : 'die Trainingsgruppe'}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {activeStatusCfg.recommendation}
            </p>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* 5. WISSENSCHAFTLICHER GUIDE (AKKORDEON)                          */}
          {/* --------------------------------------------------------------- */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowScienceGuide(!showScienceGuide)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-300">
                  Wissenschaftlicher Hintergrund: Wie funktioniert die sRPE- & ACWR-Steuerung inkl. Teamtraining & Spielen?
                </span>
              </div>
              <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", showScienceGuide && "rotate-90")} />
            </button>

            {showScienceGuide && (
              <div className="p-4 border-t border-slate-800/80 space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/80">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-400 block">1. sRPE (Training & Mikroplanung)</span>
                    <p className="text-slate-400 text-[11.5px]">
                      <strong>Individuelle Nachbereitung:</strong> Trainingszeit × RPE (Borg CR-10 Skala, 1–10).<br />
                      <strong>Mikroplanung:</strong> Berücksichtigt exakt <em>(TW-Dauer × TW-Intensität) + (Zeit im Teamtraining × Team-Intensität)</em> für maximale Genauigkeit.
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-amber-400 block">2. Wettkampfintensität & Ersatzbank</span>
                    <p className="text-slate-400 text-[11.5px]">
                      <strong>Start-TW:</strong> Spielminuten × Match-RPE <strong>8.0</strong> (z. B. 90 Min × 8 = 720 A.U.).<br />
                      <strong>Bank-TW:</strong> Erhält automatisch das vollwertige <strong>Match-Warm-up & Standby-Programm (35 Min bei RPE 5.5 = ~193 A.U.)</strong> angerechnet, damit kein künstlicher Formverlust entsteht.
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-bold text-sky-400 block">3. ACWR (Akut : Chronisch)</span>
                    <p className="text-slate-400 text-[11.5px]">
                      Nach Dr. Tim Gabbett: Verhältnis aus akuter Ermüdung (letzte 7 Tage) zu chronischer Fitness (rollierender 28-Tage-Wochenschnitt). Zeigt auf, ob ein Torwart auf Belastungsspitzen vorbereitet ist.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="font-bold text-slate-200 block">Die 4 Belastungs-Zonen im Torwartspiel:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/40">
                      <span className="font-bold text-sky-400 block">🔵 &lt; 0.8: Under-Training</span>
                      <span className="text-slate-400">Geringer Trainingsreiz, Risiko von Form- und Fitnessverlust (Dekonditionierung).</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                      <span className="font-bold text-emerald-400 block">🟢 0.8 – 1.3: Sweet Spot</span>
                      <span className="text-slate-400">Optimaler Anpassungsbereich: Hohe Leistungssteigerung bei minimalem Verletzungsrisiko.</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40">
                      <span className="font-bold text-amber-400 block">🟡 1.3 – 1.49: Warnzone</span>
                      <span className="text-slate-400">Erhöhte Ermüdung: Regenerationsmonitoring und Schlafoptimierung empfohlen.</span>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40">
                      <span className="font-bold text-rose-400 block">🔴 ≥ 1.5: Spike / Gefahr</span>
                      <span className="text-slate-400">Akuter Belastungssprung! 2- bis 4-fach erhöhtes Verletzungsrisiko (Sehnen, Adduktoren, Rücken).</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ================================================================= */}
        {/* FOOTER                                                            */}
        {/* ================================================================= */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-shrink-0">
          <div className="text-[11px] text-slate-500">
            Belastungsdaten basieren auf individueller Nachbereitung, Mikroplanung (TW + Team) & Spielzeiten.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
