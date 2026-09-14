import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  FileDown, 
  Save, 
  ArrowRight,
  Activity,
  Plus,
  Minus,
  Lock
} from 'lucide-react';
import { cn } from '../utils/cn';
import { 
  type MesoPlan, 
  type MacroPlan,
  type MesoDayItem,
  type BuildingBlockType, 
  BUILDING_BLOCK_CONFIGS, 
  type AthleticStimulusOption, 
  DEFAULT_WEEK_SETTINGS, 
  PERIODIZATION_TOPICS,
  INTENSITY_SCALE_OPTIONS, 
  FIELD_SIZE_OPTIONS 
} from '../types';
import { type GroupWorkloadSummary, WORKLOAD_STATUS_CONFIG } from '../utils/workloadCalculator';

interface MicroPlanGridProps {
  activeMesoPlan: MesoPlan | null;
  activeMacroPlan?: MacroPlan | null;
  allGroupMesoPlans?: MesoPlan[];
  macroPlans?: MacroPlan[];
  getMesoPlanStatus?: (m: MesoPlan) => 'in Planung' | 'gespeichert' | 'abgeschlossen';
  onSelectMicroWeek?: (mesoId: string, weekIndex: number) => void;
  activeMicroWeekIndex: number;
  setActiveMicroWeekIndex: (wNum: number) => void;
  microValidationError: string | null;
  setMicroValidationError: (err: string | null) => void;
  intensityLevels: string[];
  volumeLevels: string[];
  selectedBlockBrush: BuildingBlockType | null;
  setSelectedBlockBrush: (brush: BuildingBlockType | null) => void;
  draggedBlock: BuildingBlockType | null;
  setDraggedBlock: (block: BuildingBlockType | null) => void;
  handleUpdateMicroSlot: (wNum: number, dIdx: number, slotKey: 'morning' | 'afternoon', block?: BuildingBlockType) => void;
  handleUpdateMicroDayField: (
    wNum: number,
    dIdx: number,
    field:
      | 'morningTopic'
      | 'morningTwIntensity'
      | 'morningTeamFocus'
      | 'morningFieldSize'
      | 'morningTeamIntensity'
      | 'morningTeamDurationMinutes'
      | 'morningOpponentInfo'
      | 'afternoonTopic'
      | 'afternoonTwIntensity'
      | 'afternoonTeamFocus'
      | 'afternoonFieldSize'
      | 'afternoonTeamIntensity'
      | 'afternoonTeamDurationMinutes'
      | 'afternoonOpponentInfo',
    val: string | number
  ) => void;
  handleUpdateMicroDayMicrodosing: (wNum: number, dIdx: number, val: string) => void;
  topicStats: Record<string, { conducted: number; target: number }>;
  athleticStimuli: AthleticStimulusOption[];
  handleExportMicroPdf: () => void;
  isExportingMicroPdf: boolean;
  handleSaveMicroPlan: () => void;
  onNavigateToPlanner?: () => void;
  setActiveStage: (stage: 'macro' | 'meso' | 'micro') => void;
  groupWorkload?: GroupWorkloadSummary;
  onOpenWorkload?: () => void;
  readOnly?: boolean;
}

const parseDateString = (str: string): Date => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Helper to serialize meaningful day data for dirty-state detection per week
const serializeWeekDays = (days?: MesoDayItem[]): string => {
  if (!days) return '';
  return JSON.stringify(days.map(d => ({
    date: d.date,
    slots: {
      morning: d.slots?.morning || null,
      afternoon: d.slots?.afternoon || null,
    },
    athleticMicrodosing: d.athleticMicrodosing || '',
    morningTopic: d.morningTopic || '',
    morningTwIntensity: d.morningTwIntensity ? String(d.morningTwIntensity) : '',
    morningTeamFocus: d.morningTeamFocus || '',
    morningFieldSize: d.morningFieldSize || '',
    morningTeamIntensity: d.morningTeamIntensity ? String(d.morningTeamIntensity) : '',
    morningTeamDurationMinutes: typeof d.morningTeamDurationMinutes === 'number' ? d.morningTeamDurationMinutes : (d.morningTeamDurationMinutes ? parseInt(String(d.morningTeamDurationMinutes), 10) : 60),
    morningOpponentInfo: d.morningOpponentInfo || '',
    afternoonTopic: d.afternoonTopic || '',
    afternoonTwIntensity: d.afternoonTwIntensity ? String(d.afternoonTwIntensity) : '',
    afternoonTeamFocus: d.afternoonTeamFocus || '',
    afternoonFieldSize: d.afternoonFieldSize || '',
    afternoonTeamIntensity: d.afternoonTeamIntensity ? String(d.afternoonTeamIntensity) : '',
    afternoonTeamDurationMinutes: typeof d.afternoonTeamDurationMinutes === 'number' ? d.afternoonTeamDurationMinutes : (d.afternoonTeamDurationMinutes ? parseInt(String(d.afternoonTeamDurationMinutes), 10) : 60),
    afternoonOpponentInfo: d.afternoonOpponentInfo || '',
  })));
};

export const MicroPlanGrid: React.FC<MicroPlanGridProps> = ({
  activeMesoPlan,
  activeMacroPlan,
  allGroupMesoPlans = [],
  macroPlans = [],
  getMesoPlanStatus,
  onSelectMicroWeek,
  activeMicroWeekIndex,
  setActiveMicroWeekIndex,
  microValidationError,
  setMicroValidationError,
  intensityLevels,
  volumeLevels,
  selectedBlockBrush,
  setSelectedBlockBrush,
  draggedBlock,
  setDraggedBlock,
  handleUpdateMicroSlot,
  handleUpdateMicroDayField,
  handleUpdateMicroDayMicrodosing,
  topicStats,
  athleticStimuli,
  handleExportMicroPdf,
  isExportingMicroPdf,
  handleSaveMicroPlan,
  onNavigateToPlanner,
  setActiveStage,
  groupWorkload,
  onOpenWorkload,
  readOnly = false
}) => {
  const [savedWeekSnapshots, setSavedWeekSnapshots] = useState<Record<string, string>>({});

  // Sync snapshot cache for saved weeks
  useEffect(() => {
    if (!activeMesoPlan?.weeks) return;
    setSavedWeekSnapshots(prev => {
      const next = { ...prev };
      let changed = false;
      activeMesoPlan.weeks.forEach(w => {
        const key = `${activeMesoPlan.id}__w${w.weekNumber}`;
        if (w.isSaved && !next[key]) {
          next[key] = serializeWeekDays(w.days);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [activeMesoPlan?.id, activeMesoPlan?.weeks]);

  const onSaveActiveWeek = async () => {
    if (!activeMesoPlan) return;
    const currentWeekData = activeMesoPlan.weeks?.find(w => w.weekNumber === activeMicroWeekIndex);
    if (!currentWeekData) return;

    await handleSaveMicroPlan();

    // Update the snapshot for the active week so button immediately becomes disabled
    const key = `${activeMesoPlan.id}__w${activeMicroWeekIndex}`;
    setSavedWeekSnapshots(prev => ({
      ...prev,
      [key]: serializeWeekDays(currentWeekData.days)
    }));
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 animate-in fade-in">
      {/* Header & Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700">
              Stufe 3 • Wöchentliche Mikroplanung
            </span>

            {/* Belastungsstatus aller Torhüter der aktiven Gruppe */}
            {onOpenWorkload && groupWorkload && (
              <button
                type="button"
                onClick={onOpenWorkload}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-sm",
                  groupWorkload.hasDangerSpike
                    ? "bg-rose-950/90 text-rose-300 border-rose-600/90 animate-pulse ring-2 ring-rose-500/40"
                    : groupWorkload.hasWarning
                    ? "bg-amber-950/80 text-amber-300 border-amber-600/70 hover:bg-amber-900"
                    : "bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                )}
                title={`Belastungssteuerung & ACWR aller Torhüter (Stand: Ende Vorwoche${activeMicroWeekIndex > 1 ? ` / Woche ${activeMicroWeekIndex - 1}` : ''})`}
              >
                <Activity className={cn("w-3.5 h-3.5", groupWorkload.hasDangerSpike ? "text-rose-400" : "text-emerald-400")} />
                <span>TW-Belastung:</span>
                <div className="flex items-center gap-1.5">
                  {groupWorkload.players.map((p, idx) => {
                    const cfg = WORKLOAD_STATUS_CONFIG[p.status];
                    return (
                      <span
                        key={p.playerId || idx}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1",
                          cfg.badge
                        )}
                        title={`${p.playerName}: ACWR ${p.acwr.toFixed(2)} (${cfg.label}) - Stand: Ende Vorwoche${activeMicroWeekIndex > 1 ? ` (Woche ${activeMicroWeekIndex - 1})` : ''}`}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotColor)} />
                        {p.jerseyNumber ? `#${p.jerseyNumber}` : p.playerName.split(' ')[0]}: {p.acwr.toFixed(2)}
                      </span>
                    );
                  })}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Dropdownfeld auf Höhe des Textes Stufe 3 ganz rechts */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
            <span>Mikroplanung:</span>
          </label>
          <div className="relative">
            <select
              value={activeMesoPlan ? `${activeMesoPlan.id}__w${activeMicroWeekIndex}` : ''}
              onChange={e => {
                const val = e.target.value;
                if (!val) return;
                const [mesoId, wStr] = val.split('__w');
                const wNum = parseInt(wStr, 10) || 1;
                if (onSelectMicroWeek) {
                  onSelectMicroWeek(mesoId, wNum);
                } else {
                  setActiveMicroWeekIndex(wNum);
                }
              }}
              className="bg-slate-950 border border-slate-700 hover:border-emerald-500 focus:border-emerald-500 text-slate-100 text-xs font-black rounded-xl px-3.5 py-2 focus:outline-none transition cursor-pointer shadow-lg shadow-black/40"
            >
              {allGroupMesoPlans.length === 0 ? (
                activeMesoPlan ? (
                  [1, 2, 3, 4, 5, 6].map(wNum => (
                    <option key={`single_w${wNum}`} value={`${activeMesoPlan.id}__w${wNum}`}>
                      {activeMesoPlan.name} • Woche {wNum}
                    </option>
                  ))
                ) : (
                  <option value="">Keine Mesoplanung vorhanden</option>
                )
              ) : (
                allGroupMesoPlans.map(meso => {
                  const status = getMesoPlanStatus ? getMesoPlanStatus(meso) : (meso.isCompleted ? 'abgeschlossen' : meso.isSaved ? 'gespeichert' : 'in Planung');
                  const parentMacro = macroPlans?.find(mp => mp.id === meso.macroPlanId);
                  const halfYearLabel = parentMacro ? `${parentMacro.halfYear}. Halbjahr` : '';
                  const statusLabel = status === 'abgeschlossen' ? ' (Abgeschlossen)' : status === 'gespeichert' ? ' (Gespeichert)' : ' (In Planung)';

                  return (
                    <optgroup
                      key={meso.id}
                      label={`${meso.name} [${halfYearLabel ? `${halfYearLabel} • ` : ''}${statusLabel.replace(/^\s*\(/, '').replace(/\)$/, '')}]`}
                      className="bg-slate-900 text-slate-300 font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6].map(wNum => {
                        const wData = meso.weeks?.find(w => w.weekNumber === wNum);
                        const wStart = wData?.days?.[0]?.date
                          ? new Date(wData.days[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                          : '';
                        const wEnd = wData?.days?.[6]?.date
                          ? new Date(wData.days[6].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                          : '';
                        const isSaved = Boolean(wData?.isSaved);
                        const dateRangeStr = wStart && wEnd ? ` (${wStart} – ${wEnd})` : '';

                        return (
                          <option
                            key={`${meso.id}__w${wNum}`}
                            value={`${meso.id}__w${wNum}`}
                            className="bg-slate-950 text-white font-medium"
                          >
                            {meso.name} • Woche {wNum}{dateRangeStr} {isSaved ? '✓ Gespeichert' : '• In Planung'}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })
              )}
            </select>
          </div>
        </div>
      </div>

      {!activeMesoPlan ? (
        <div className="p-12 text-center bg-slate-950 rounded-3xl border border-dashed border-slate-800 space-y-3">
          <Zap className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">
            Bitte erstelle zuerst eine Mesoplanung, um die 6-Wochen-Mikroplanung durchzuführen.
          </p>
          <button
            type="button"
            onClick={() => setActiveStage('meso')}
            className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer"
          >
            → Zur Mesoplanung wechseln
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 6-Wochen Übersicht */}
          <div className="space-y-4">
            {/* Week Selector Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map(wNum => {
                const wData = activeMesoPlan.weeks?.find(w => w.weekNumber === wNum);
                const wStart = wData?.days[0]?.date ? new Date(wData.days[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                const wEnd = wData?.days[6]?.date ? new Date(wData.days[6].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                const wKey = `${activeMesoPlan.id}__w${wNum}`;
                const wSavedSnapshot = savedWeekSnapshots[wKey];
                const wSerialized = serializeWeekDays(wData?.days);
                const wIsCleanSaved = Boolean(wData?.isSaved) && (wSavedSnapshot === undefined || wSerialized === wSavedSnapshot);
                const isActive = activeMicroWeekIndex === wNum;
                const weekIntensity = wData?.intensity || DEFAULT_WEEK_SETTINGS[wNum]?.intensity || intensityLevels[0] || 'mittel (ca. 80%)';
                const weekVolume = wData?.volume || DEFAULT_WEEK_SETTINGS[wNum]?.volume || volumeLevels[0] || 'mittel';

                return (
                  <button
                    key={wNum}
                    type="button"
                    onClick={() => {
                      if (microValidationError) setMicroValidationError(null);
                      setActiveMicroWeekIndex(wNum);
                    }}
                    className={cn(
                      "p-2.5 sm:p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-1.5 shadow-sm active:scale-95 cursor-pointer relative",
                      isActive
                        ? wIsCleanSaved
                          ? "bg-emerald-600 border-emerald-400 text-white font-black shadow-lg shadow-emerald-950"
                          : "bg-amber-600 border-amber-400 text-white font-black shadow-lg shadow-amber-950"
                        : wIsCleanSaved
                          ? "bg-slate-950 border-emerald-500/40 text-emerald-300 hover:bg-slate-850 hover:border-emerald-400"
                          : "bg-slate-950 border-amber-500/50 text-amber-300 hover:bg-slate-850 hover:border-amber-400"
                    )}
                  >
                    <div className="w-full space-y-0.5">
                      <div className="flex items-center justify-center gap-1.5 w-full">
                        <span className="text-xs font-black">Woche {wNum}</span>
                        {wIsCleanSaved && (
                          <div className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                            isActive ? "bg-white text-emerald-700" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          )}>
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        "text-[10px] font-semibold text-center",
                        isActive
                          ? "text-white/80"
                          : wIsCleanSaved ? "text-emerald-400/80" : "text-amber-400/80"
                      )}>
                        {wStart} – {wEnd}
                      </div>
                    </div>

                    {/* Intensität & Volumen aus der Mesoplanung */}
                    <div className={cn(
                      "pt-1.5 border-t w-full space-y-1.5 text-center text-[10px]",
                      isActive ? "border-white/20" : "border-slate-850"
                    )}>
                      <div className="flex flex-col items-center justify-center gap-0.5 w-full">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 shadow-sm shadow-amber-500/50" />
                          <span className={cn("text-[9px] uppercase font-bold tracking-wider", isActive ? "text-white/75" : "text-slate-400")}>
                            Intensität
                          </span>
                        </div>
                        <div className={cn("font-bold text-[10px] text-center leading-tight", isActive ? "text-white font-black" : "text-amber-300")}>
                          {weekIntensity}
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center gap-0.5 w-full">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0 shadow-sm shadow-sky-500/50" />
                          <span className={cn("text-[9px] uppercase font-bold tracking-wider", isActive ? "text-white/75" : "text-slate-400")}>
                            Volumen
                          </span>
                        </div>
                        <div className={cn("font-bold text-[10px] text-center leading-tight", isActive ? "text-white font-black" : "text-sky-300")}>
                          {weekVolume}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fertige Bausteine Panel */}
            <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                    Fertige Bausteine
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    • Ziehe einen Baustein in einen Slot hinein oder klicke darauf
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(Object.keys(BUILDING_BLOCK_CONFIGS) as BuildingBlockType[]).map(bKey => {
                  const cfg = BUILDING_BLOCK_CONFIGS[bKey];
                  const isSelected = selectedBlockBrush === bKey;

                  return (
                    <div
                      key={bKey}
                      draggable={!readOnly}
                      onDragStart={() => !readOnly && setDraggedBlock(bKey)}
                      onDragEnd={() => setDraggedBlock(null)}
                      onClick={() => !readOnly && setSelectedBlockBrush(bKey)}
                      className={cn(
                        "p-3 rounded-2xl border text-center transition select-none shadow-md flex items-center justify-between gap-2",
                        readOnly ? "cursor-default opacity-80" : "cursor-grab active:cursor-grabbing hover:opacity-90",
                        cfg.bgClass, cfg.borderClass, cfg.textClass,
                        isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-[1.02]" : ""
                      )}
                    >
                      <span className="text-xs font-black truncate text-left">
                        {cfg.label}
                      </span>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Week 7-Day Board */}
            {(() => {
              const currentWeekData = activeMesoPlan.weeks?.find(w => w.weekNumber === activeMicroWeekIndex);
              const days = currentWeekData?.days || [];

              return (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
                  {/* 7 Days Grid with calendar dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {days.map((dayItem, dIdx) => {
                      const dObj = parseDateString(dayItem.date);
                      const dFormatted = dObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                      const morningConfig = dayItem.slots?.morning ? BUILDING_BLOCK_CONFIGS[dayItem.slots.morning] : null;
                      const afternoonConfig = dayItem.slots?.afternoon ? BUILDING_BLOCK_CONFIGS[dayItem.slots.afternoon] : null;

                      const hasMorningDetails = Boolean(dayItem.slots?.morning);
                      const hasAfternoonDetails = Boolean(dayItem.slots?.afternoon);
                      const hasMicrodosing = Boolean(activeMesoPlan.forAdults && (hasMorningDetails || hasAfternoonDetails));

                      return (
                        <div
                          key={dayItem.date}
                          className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between"
                        >
                          {/* Day Header with Date */}
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 text-xs">
                            <span className="font-extrabold text-white">
                              {dayItem.dayName}
                            </span>
                            <span className="text-[10.5px] text-slate-400 font-bold">
                              {dFormatted}
                            </span>
                          </div>

                          {/* TOP SLOTS: Vormittag & Nachmittag */}
                          <div className="space-y-1.5">
                            {/* Slot 1: Vormittag Button */}
                            <div
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => {
                                e.preventDefault();
                                if (!readOnly && draggedBlock) {
                                  handleUpdateMicroSlot(activeMicroWeekIndex, dIdx, 'morning', draggedBlock);
                                }
                              }}
                              onClick={() => {
                                if (!readOnly && selectedBlockBrush) {
                                  handleUpdateMicroSlot(activeMicroWeekIndex, dIdx, 'morning', selectedBlockBrush);
                                }
                              }}
                              className={cn(
                                "p-2 rounded-xl border text-center transition flex flex-col items-center justify-center min-h-[46px] group/slot relative",
                                readOnly ? "cursor-default" : "cursor-pointer",
                                morningConfig
                                  ? cn(morningConfig.bgClass, morningConfig.borderClass, morningConfig.textClass)
                                  : "bg-slate-950/60 border-dashed border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                              )}
                            >
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Vormittag</span>
                              <span className="text-[11px] font-black block truncate w-full">
                                {morningConfig ? morningConfig.shortLabel : '+ Baustein'}
                              </span>

                              {morningConfig && !readOnly && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateMicroSlot(activeMicroWeekIndex, dIdx, 'morning', undefined);
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-black/60 text-rose-300 hover:text-rose-100 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Slot 2: Nachmittag Button */}
                            <div
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => {
                                e.preventDefault();
                                if (!readOnly && draggedBlock) {
                                  handleUpdateMicroSlot(activeMicroWeekIndex, dIdx, 'afternoon', draggedBlock);
                                }
                              }}
                              onClick={() => {
                                if (!readOnly && selectedBlockBrush) {
                                  handleUpdateMicroSlot(activeMicroWeekIndex, dIdx, 'afternoon', selectedBlockBrush);
                                }
                              }}
                              className={cn(
                                "p-2 rounded-xl border text-center transition flex flex-col items-center justify-center min-h-[46px] group/slot relative",
                                readOnly ? "cursor-default" : "cursor-pointer",
                                afternoonConfig
                                  ? cn(afternoonConfig.bgClass, afternoonConfig.borderClass, afternoonConfig.textClass)
                                  : "bg-slate-950/60 border-dashed border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                              )}
                            >
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Nachmittag</span>
                              <span className="text-[11px] font-black block truncate w-full">
                                {afternoonConfig ? afternoonConfig.shortLabel : '+ Baustein'}
                              </span>

                              {afternoonConfig && !readOnly && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateMicroSlot(activeMicroWeekIndex, dIdx, 'afternoon', undefined);
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-black/60 text-rose-300 hover:text-rose-100 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* DYNAMISCHE DETAILS */}
                          {(hasMorningDetails || hasAfternoonDetails || hasMicrodosing) && (
                            <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-in fade-in">
                              {/* Vormittag Details */}
                              {hasMorningDetails && (
                                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                                  <div className="flex items-center justify-between pb-0.5 border-b border-slate-850">
                                    <span className="text-[9px] uppercase font-black text-slate-400">
                                      Vormittag: {morningConfig?.shortLabel}
                                    </span>
                                  </div>

                                  {(dayItem.slots.morning === 'tw_and_team' || dayItem.slots.morning === 'tw_only') && (
                                    <>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-indigo-300 flex items-center gap-1">
                                          <span>Thema</span>
                                          <span className="text-rose-400 font-bold">*</span>
                                        </label>
                                        <select
                                          value={dayItem.morningTopic || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTopic', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-indigo-500/60 focus:border-indigo-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Thema wählen --</option>
                                          {PERIODIZATION_TOPICS.map(topic => {
                                            const s = topicStats[topic.id] || topicStats[topic.label];
                                            const targetCount = activeMacroPlan?.topicDistribution?.[topic.id] ?? s?.target ?? 0;
                                            const conductedCount = s?.conducted ?? 0;
                                            const countLabel = targetCount > 0 
                                              ? ` (${conductedCount} von ${targetCount} TE im Halbjahr)` 
                                              : (s ? ` (${conductedCount} TE)` : '');

                                            return (
                                              <option key={topic.id} value={topic.label} className="bg-slate-950 text-white font-medium">
                                                {topic.label}{countLabel}
                                              </option>
                                            );
                                          })}
                                          {/* Fallback for custom or legacy topic string */}
                                          {dayItem.morningTopic && !PERIODIZATION_TOPICS.some(t => t.label === dayItem.morningTopic || t.id === dayItem.morningTopic) && (
                                            <option value={dayItem.morningTopic} className="bg-slate-950 text-amber-300 font-medium">
                                              {dayItem.morningTopic}
                                            </option>
                                          )}
                                        </select>
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-indigo-300 flex items-center gap-1">
                                          <span>Intensität der TW im TW-Training</span>
                                          <span className="text-rose-400 font-bold">*</span>
                                        </label>
                                        <select
                                          value={dayItem.morningTwIntensity || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTwIntensity', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-indigo-500/60 focus:border-indigo-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Intensität (1–10) --</option>
                                          {INTENSITY_SCALE_OPTIONS.map(n => (
                                            <option key={n} value={n}>
                                              {n}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </>
                                  )}

                                  {dayItem.slots.morning === 'tw_and_team' && (
                                    <>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Schwerpunkt Teamtraining
                                        </label>
                                        <input
                                          type="text"
                                          value={dayItem.morningTeamFocus || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamFocus', e.target.value)}
                                          placeholder="z.B. Spielaufbau, Pressing..."
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] text-white placeholder-slate-600 focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500"
                                          )}
                                        />
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Spielfeldgröße
                                        </label>
                                        <select
                                          value={dayItem.morningFieldSize || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningFieldSize', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Größe wählen --</option>
                                          {FIELD_SIZE_OPTIONS.map(size => (
                                            <option key={size} value={size}>
                                              {size}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Intensität der TW im Teamtraining
                                        </label>
                                        <select
                                          value={dayItem.morningTeamIntensity || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamIntensity', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Intensität (1–10) --</option>
                                          {INTENSITY_SCALE_OPTIONS.map(n => (
                                            <option key={n} value={n}>
                                              {n}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Zeit im Teamtraining in Minuten
                                        </label>
                                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                          <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => {
                                              const cur = typeof dayItem.morningTeamDurationMinutes === 'number' ? dayItem.morningTeamDurationMinutes : (dayItem.morningTeamDurationMinutes ? parseInt(String(dayItem.morningTeamDurationMinutes), 10) : 60);
                                              handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamDurationMinutes', Math.max(0, cur - 5));
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center transition",
                                              readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-700 cursor-pointer active:scale-95"
                                            )}
                                            title="-5 Min"
                                          >
                                            <Minus className="w-3 h-3 text-slate-300" />
                                          </button>
                                          <div className="flex-1 flex items-center justify-center">
                                            <input
                                              type="number"
                                              step="5"
                                              min="0"
                                              disabled={readOnly}
                                              value={dayItem.morningTeamDurationMinutes ?? 60}
                                              onChange={e => {
                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamDurationMinutes', isNaN(val) ? 0 : Math.max(0, val));
                                              }}
                                              className={cn(
                                                "w-10 text-center font-mono font-bold text-[11px] text-white bg-transparent border-none focus:outline-none",
                                                readOnly && "opacity-60 cursor-not-allowed"
                                              )}
                                            />
                                            <span className="text-[9.5px] text-slate-400 -ml-1">Min.</span>
                                          </div>
                                          <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => {
                                              const cur = typeof dayItem.morningTeamDurationMinutes === 'number' ? dayItem.morningTeamDurationMinutes : (dayItem.morningTeamDurationMinutes ? parseInt(String(dayItem.morningTeamDurationMinutes), 10) : 60);
                                              handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamDurationMinutes', cur + 5);
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded bg-sky-700 text-white font-bold flex items-center justify-center transition",
                                              readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-sky-600 cursor-pointer active:scale-95"
                                            )}
                                            title="+5 Min"
                                          >
                                            <Plus className="w-3 h-3 text-white" />
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {dayItem.slots.morning === 'team_only' && (
                                    <>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Schwerpunkt Teamtraining
                                        </label>
                                        <input
                                          type="text"
                                          value={dayItem.morningTeamFocus || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamFocus', e.target.value)}
                                          placeholder="z.B. Spielaufbau, Pressing..."
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] text-white placeholder-slate-600 focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500"
                                          )}
                                        />
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Intensität der TW im Teamtraining
                                        </label>
                                        <select
                                          value={dayItem.morningTeamIntensity || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamIntensity', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Intensität (1–10) --</option>
                                          {INTENSITY_SCALE_OPTIONS.map(n => (
                                            <option key={n} value={n}>
                                              {n}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Zeit im Teamtraining in Minuten
                                        </label>
                                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                          <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => {
                                              const cur = typeof dayItem.morningTeamDurationMinutes === 'number' ? dayItem.morningTeamDurationMinutes : (dayItem.morningTeamDurationMinutes ? parseInt(String(dayItem.morningTeamDurationMinutes), 10) : 60);
                                              handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamDurationMinutes', Math.max(0, cur - 5));
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center transition",
                                              readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-700 cursor-pointer active:scale-95"
                                            )}
                                            title="-5 Min"
                                          >
                                            <Minus className="w-3 h-3 text-slate-300" />
                                          </button>
                                          <div className="flex-1 flex items-center justify-center">
                                            <input
                                              type="number"
                                              step="5"
                                              min="0"
                                              disabled={readOnly}
                                              value={dayItem.morningTeamDurationMinutes ?? 60}
                                              onChange={e => {
                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamDurationMinutes', isNaN(val) ? 0 : Math.max(0, val));
                                              }}
                                              className={cn(
                                                "w-10 text-center font-mono font-bold text-[11px] text-white bg-transparent border-none focus:outline-none",
                                                readOnly && "opacity-60 cursor-not-allowed"
                                              )}
                                            />
                                            <span className="text-[9.5px] text-slate-400 -ml-1">Min.</span>
                                          </div>
                                          <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => {
                                              const cur = typeof dayItem.morningTeamDurationMinutes === 'number' ? dayItem.morningTeamDurationMinutes : (dayItem.morningTeamDurationMinutes ? parseInt(String(dayItem.morningTeamDurationMinutes), 10) : 60);
                                              handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningTeamDurationMinutes', cur + 5);
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded bg-sky-700 text-white font-bold flex items-center justify-center transition",
                                              readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-sky-600 cursor-pointer active:scale-95"
                                            )}
                                            title="+5 Min"
                                          >
                                            <Plus className="w-3 h-3 text-white" />
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {dayItem.slots.morning === 'matchday' && (
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] uppercase font-extrabold text-rose-300 block">
                                        Informationen zum Gegner:
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={dayItem.morningOpponentInfo || ''}
                                        disabled={readOnly}
                                        onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'morningOpponentInfo', e.target.value)}
                                        placeholder="z.B. Stark bei Standards, schnelles Umschaltspiel..."
                                        className={cn(
                                          "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] text-white placeholder-slate-600 focus:outline-none transition resize-none",
                                          readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-rose-500/60 focus:border-rose-500"
                                        )}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Nachmittag Details */}
                              {hasAfternoonDetails && (
                                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                                  <div className="flex items-center justify-between pb-0.5 border-b border-slate-855">
                                    <span className="text-[9px] uppercase font-black text-slate-400">
                                      Nachmittag: {afternoonConfig?.shortLabel}
                                    </span>
                                  </div>

                                  {(dayItem.slots.afternoon === 'tw_and_team' || dayItem.slots.afternoon === 'tw_only') && (
                                    <>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-indigo-300 flex items-center gap-1">
                                          <span>Thema</span>
                                          <span className="text-rose-400 font-bold">*</span>
                                        </label>
                                        <select
                                          value={dayItem.afternoonTopic || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTopic', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-indigo-500/60 focus:border-indigo-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Thema wählen --</option>
                                          {PERIODIZATION_TOPICS.map(topic => {
                                            const s = topicStats[topic.id] || topicStats[topic.label];
                                            const targetCount = activeMacroPlan?.topicDistribution?.[topic.id] ?? s?.target ?? 0;
                                            const conductedCount = s?.conducted ?? 0;
                                            const countLabel = targetCount > 0 
                                              ? ` (${conductedCount} von ${targetCount} TE im Halbjahr)` 
                                              : (s ? ` (${conductedCount} TE)` : '');

                                            return (
                                              <option key={topic.id} value={topic.label} className="bg-slate-950 text-white font-medium">
                                                {topic.label}{countLabel}
                                              </option>
                                            );
                                          })}
                                          {/* Fallback for custom or legacy topic string */}
                                          {dayItem.afternoonTopic && !PERIODIZATION_TOPICS.some(t => t.label === dayItem.afternoonTopic || t.id === dayItem.afternoonTopic) && (
                                            <option value={dayItem.afternoonTopic} className="bg-slate-950 text-amber-300 font-medium">
                                              {dayItem.afternoonTopic}
                                            </option>
                                          )}
                                        </select>
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-indigo-300 flex items-center gap-1">
                                          <span>Intensität der TW im TW-Training</span>
                                          <span className="text-rose-400 font-bold">*</span>
                                        </label>
                                        <select
                                          value={dayItem.afternoonTwIntensity || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTwIntensity', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-indigo-500/60 focus:border-indigo-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Intensität (1–10) --</option>
                                          {INTENSITY_SCALE_OPTIONS.map(n => (
                                            <option key={n} value={n}>
                                              {n}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </>
                                  )}

                                  {dayItem.slots.afternoon === 'tw_and_team' && (
                                    <>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Schwerpunkt Teamtraining
                                        </label>
                                        <input
                                          type="text"
                                          value={dayItem.afternoonTeamFocus || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamFocus', e.target.value)}
                                          placeholder="z.B. Spielaufbau, Pressing..."
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] text-white placeholder-slate-600 focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500"
                                          )}
                                        />
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Spielfeldgröße
                                        </label>
                                        <select
                                          value={dayItem.afternoonFieldSize || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonFieldSize', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Größe wählen --</option>
                                          {FIELD_SIZE_OPTIONS.map(size => (
                                            <option key={size} value={size}>
                                              {size}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Intensität der TW im Teamtraining
                                        </label>
                                        <select
                                          value={dayItem.afternoonTeamIntensity || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamIntensity', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Intensität (1–10) --</option>
                                          {INTENSITY_SCALE_OPTIONS.map(n => (
                                            <option key={n} value={n}>
                                              {n}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Zeit im Teamtraining in Minuten
                                        </label>
                                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                          <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => {
                                              const cur = typeof dayItem.afternoonTeamDurationMinutes === 'number' ? dayItem.afternoonTeamDurationMinutes : (dayItem.afternoonTeamDurationMinutes ? parseInt(String(dayItem.afternoonTeamDurationMinutes), 10) : 60);
                                              handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamDurationMinutes', Math.max(0, cur - 5));
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center transition",
                                              readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-700 cursor-pointer active:scale-95"
                                            )}
                                            title="-5 Min"
                                          >
                                            <Minus className="w-3 h-3 text-slate-300" />
                                          </button>
                                          <div className="flex-1 flex items-center justify-center">
                                            <input
                                              type="number"
                                              step="5"
                                              min="0"
                                              disabled={readOnly}
                                              value={dayItem.afternoonTeamDurationMinutes ?? 60}
                                              onChange={e => {
                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamDurationMinutes', isNaN(val) ? 0 : Math.max(0, val));
                                              }}
                                              className={cn(
                                                "w-10 text-center font-mono font-bold text-[11px] text-white bg-transparent border-none focus:outline-none",
                                                readOnly && "opacity-60 cursor-not-allowed"
                                              )}
                                            />
                                            <span className="text-[9.5px] text-slate-400 -ml-1">Min.</span>
                                          </div>
                                          <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => {
                                              const cur = typeof dayItem.afternoonTeamDurationMinutes === 'number' ? dayItem.afternoonTeamDurationMinutes : (dayItem.afternoonTeamDurationMinutes ? parseInt(String(dayItem.afternoonTeamDurationMinutes), 10) : 60);
                                              handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamDurationMinutes', cur + 5);
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded bg-sky-700 text-white font-bold flex items-center justify-center transition",
                                              readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-sky-600 cursor-pointer active:scale-95"
                                            )}
                                            title="+5 Min"
                                          >
                                            <Plus className="w-3 h-3 text-white" />
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {dayItem.slots.afternoon === 'team_only' && (
                                    <>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Schwerpunkt Teamtraining
                                        </label>
                                        <input
                                          type="text"
                                          value={dayItem.afternoonTeamFocus || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamFocus', e.target.value)}
                                          placeholder="z.B. Spielaufbau, Pressing..."
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] text-white placeholder-slate-600 focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500"
                                          )}
                                        />
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Intensität der TW im Teamtraining
                                        </label>
                                        <select
                                          value={dayItem.afternoonTeamIntensity || ''}
                                          disabled={readOnly}
                                          onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamIntensity', e.target.value)}
                                          className={cn(
                                            "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white focus:outline-none transition",
                                            readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-sky-500/60 focus:border-sky-500 cursor-pointer"
                                          )}
                                        >
                                          <option value="">-- Intensität (1–10) --</option>
                                          {INTENSITY_SCALE_OPTIONS.map(n => (
                                            <option key={n} value={n}>
                                              {n}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-0.5">
                                        <label className="text-[9px] uppercase font-extrabold text-sky-300 block">
                                          Zeit im Teamtraining in Minuten
                                        </label>
                                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                          <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => {
                                              const cur = typeof dayItem.afternoonTeamDurationMinutes === 'number' ? dayItem.afternoonTeamDurationMinutes : (dayItem.afternoonTeamDurationMinutes ? parseInt(String(dayItem.afternoonTeamDurationMinutes), 10) : 60);
                                              handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamDurationMinutes', Math.max(0, cur - 5));
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center transition",
                                              readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-700 cursor-pointer active:scale-95"
                                            )}
                                            title="-5 Min"
                                          >
                                            <Minus className="w-3 h-3 text-slate-300" />
                                          </button>
                                          <div className="flex-1 flex items-center justify-center">
                                            <input
                                              type="number"
                                              step="5"
                                              min="0"
                                              disabled={readOnly}
                                              value={dayItem.afternoonTeamDurationMinutes ?? 60}
                                              onChange={e => {
                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamDurationMinutes', isNaN(val) ? 0 : Math.max(0, val));
                                              }}
                                              className={cn(
                                                "w-10 text-center font-mono font-bold text-[11px] text-white bg-transparent border-none focus:outline-none",
                                                readOnly && "opacity-60 cursor-not-allowed"
                                              )}
                                            />
                                            <span className="text-[9.5px] text-slate-400 -ml-1">Min.</span>
                                          </div>
                                          <button
                                            type="button"
                                            disabled={readOnly}
                                            onClick={() => {
                                              const cur = typeof dayItem.afternoonTeamDurationMinutes === 'number' ? dayItem.afternoonTeamDurationMinutes : (dayItem.afternoonTeamDurationMinutes ? parseInt(String(dayItem.afternoonTeamDurationMinutes), 10) : 60);
                                              handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonTeamDurationMinutes', cur + 5);
                                            }}
                                            className={cn(
                                              "w-6 h-6 rounded bg-sky-700 text-white font-bold flex items-center justify-center transition",
                                              readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-sky-600 cursor-pointer active:scale-95"
                                            )}
                                            title="+5 Min"
                                          >
                                            <Plus className="w-3 h-3 text-white" />
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {dayItem.slots.afternoon === 'matchday' && (
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] uppercase font-extrabold text-rose-300 block">
                                        Informationen zum Gegner:
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={dayItem.afternoonOpponentInfo || ''}
                                        disabled={readOnly}
                                        onChange={e => handleUpdateMicroDayField(activeMicroWeekIndex, dIdx, 'afternoonOpponentInfo', e.target.value)}
                                        placeholder="z.B. Stark bei Standards, schnelles Umschaltspiel..."
                                        className={cn(
                                          "w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] text-white placeholder-slate-600 focus:outline-none transition resize-none",
                                          readOnly ? "opacity-60 cursor-not-allowed" : "hover:border-rose-500/60 focus:border-rose-500"
                                        )}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Athletisches Microdosing */}
                              {hasMicrodosing && (
                                <div className="p-2 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] uppercase font-black text-amber-300 flex items-center gap-1">
                                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                                      Athletisches Microdosing
                                    </span>
                                  </div>
                                  <select
                                    value={dayItem.athleticMicrodosing || athleticStimuli[0]?.name || ''}
                                    disabled={readOnly}
                                    onChange={e => handleUpdateMicroDayMicrodosing(activeMicroWeekIndex, dIdx, e.target.value)}
                                    className={cn(
                                      "w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-[10.5px] font-bold text-amber-200 focus:outline-none focus:border-amber-400",
                                      readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                                    )}
                                    title={athleticStimuli.find(s => s.name === (dayItem.athleticMicrodosing || athleticStimuli[0]?.name))?.focus}
                                  >
                                    {athleticStimuli.map(opt => (
                                      <option key={opt.id} value={opt.name} title={opt.focus}>
                                        {opt.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Incomplete Mandatory Fields Error Banner */}
          {microValidationError && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in shadow-xl shadow-rose-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-900 border border-rose-600 text-rose-200 flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-black text-sm text-white flex items-center gap-1.5">
                    <span>Fehlermeldung: Pflichtfelder nicht vollständig ausgefüllt!</span>
                  </h5>
                  <p className="text-rose-200 font-medium">{microValidationError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMicroValidationError(null)}
                className="p-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          {(() => {
            const currentWeekData = activeMesoPlan.weeks?.find(w => w.weekNumber === activeMicroWeekIndex);
            const isWeekMarkedSaved = Boolean(currentWeekData?.isSaved);
            const currentKey = `${activeMesoPlan.id}__w${activeMicroWeekIndex}`;
            const savedSnapshot = savedWeekSnapshots[currentKey];
            const currentSerialized = serializeWeekDays(currentWeekData?.days);

            // hasUnsavedChanges is true if:
            // 1. Week was never saved yet (!isWeekMarkedSaved), OR
            // 2. Week was saved before, but currentSerialized is different from savedSnapshot
            const hasUnsavedChanges = !isWeekMarkedSaved || (savedSnapshot !== undefined && currentSerialized !== savedSnapshot);
            const isSaveDisabled = readOnly || !hasUnsavedChanges;

            return (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  {readOnly ? (
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-slate-400" />
                      Nur Lesezugriff für diese Trainingsgruppe
                    </span>
                  ) : hasUnsavedChanges ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4" />
                      {!isWeekMarkedSaved 
                        ? `Woche ${activeMicroWeekIndex} ist noch nicht gespeichert.` 
                        : `Ungespeicherte Änderungen in Woche ${activeMicroWeekIndex}.`}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      Woche {activeMicroWeekIndex} ist gespeichert.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportMicroPdf}
                    disabled={isExportingMicroPdf}
                    className="px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Mikroplan für diese Woche als PDF herunterladen"
                  >
                    <FileDown className="w-4 h-4 text-emerald-400" />
                    <span>{isExportingMicroPdf ? 'PDF wird erstellt...' : 'Als PDF ausgeben'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onSaveActiveWeek}
                    disabled={isSaveDisabled}
                    className={cn(
                      "px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition shadow-lg",
                      isSaveDisabled
                        ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950 active:scale-95 cursor-pointer"
                    )}
                  >
                    {readOnly ? (
                      <>
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Nur Lesezugriff (Trainer zugewiesen)</span>
                      </>
                    ) : isSaveDisabled ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Mikroplan für Woche {activeMicroWeekIndex} gespeichert</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>
                          {isWeekMarkedSaved
                            ? `Änderungen für Woche ${activeMicroWeekIndex} speichern`
                            : `Mikroplan für Woche ${activeMicroWeekIndex} speichern`}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateToPlanner}
                    disabled={!isWeekMarkedSaved}
                    className={cn(
                      "px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition shadow-lg",
                      !isWeekMarkedSaved
                        ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60 shadow-none"
                        : "text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-emerald-950 cursor-pointer"
                    )}
                    title={!isWeekMarkedSaved ? "Bitte speichere zuerst die Mikroplanung dieser Woche" : "Weiter zum Trainingsplaner"}
                  >
                    <span>Weiter zum Trainingsplaner</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
