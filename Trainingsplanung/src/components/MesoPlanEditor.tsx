import React from 'react';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  BrainCircuit, 
  Zap, 
  Grid, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Settings, 
  Info, 
  Check, 
  Target, 
  Sliders, 
  AlertCircle, 
  FileDown, 
  Save, 
  ArrowRight 
} from 'lucide-react';
import { cn } from '../utils/cn';
import { 
  type MesoPlan, 
  type BuildingBlockType, 
  BUILDING_BLOCK_CONFIGS, 
  type GeneralWeekTemplateDay, 
  type AthleticStimulusOption, 
  DEFAULT_WEEK_SETTINGS, 
  TARGET_DEFENSE_TECHNIQUES, 
  SPACE_DEFENSE_TECHNIQUES 
} from '../types';

interface MesoPlanEditorProps {
  selectedHalfYear: 1 | 2;
  currentMesoPlans: MesoPlan[];
  selectedMesoId: string;
  setSelectedMesoId: (id: string) => void;
  activeMesoPlan: MesoPlan | null;
  activeMesoStatus: string;
  handleDeleteMesoPlan: (plan: MesoPlan) => void;
  isDeletingMesoPlan: boolean;
  executeCreateNewMesoPlan: () => void;
  handleCreateNewMesoPlan: () => void;
  setReflectingMesoPlan: (plan: MesoPlan | null) => void;
  setIsCreatingNextAfterReflection: (val: boolean) => void;
  setIsReflectionModalOpen: (val: boolean) => void;
  isGeneralWeekStructureOpen: boolean;
  setIsGeneralWeekStructureOpen: React.Dispatch<React.SetStateAction<boolean>>;
  generalWeekTemplateDraft: GeneralWeekTemplateDay[];
  handleUpdateGeneralTemplateSlot: (dayIdx: number, slotKey: 'morning' | 'afternoon', block?: BuildingBlockType) => void;
  selectedBlockBrush: BuildingBlockType | null;
  setSelectedBlockBrush: (brush: BuildingBlockType | null) => void;
  draggedBlock: BuildingBlockType | null;
  setDraggedBlock: (block: BuildingBlockType | null) => void;
  athleticStimuli: AthleticStimulusOption[];
  handleUpdateMesoAthleticFocus: (focus: string) => void;
  handleToggleForAdults: (checked: boolean) => void;
  setIsCustomizingStimuli: (val: boolean) => void;
  isMesoSaved: boolean;
  handleUpdateMesoTargetDefenseGoals: (goals: string) => void;
  handleUpdateMesoTargetDefenseTechnique1: (tech: string) => void;
  handleUpdateMesoTargetDefenseTechnique2: (tech: string) => void;
  handleUpdateMesoSpaceDefenseGoals: (goals: string) => void;
  handleUpdateMesoSpaceDefenseTechnique3: (tech: string) => void;
  handleUpdateMesoSpaceDefenseTechnique4: (tech: string) => void;
  intensityLevels: string[];
  volumeLevels: string[];
  setIsCustomizingLevels: (val: boolean) => void;
  activeMesoWeekIndex: number;
  setActiveMesoWeekIndex: (wNum: number) => void;
  handleUpdateWeekIntensity: (wNum: number, intensity: string) => void;
  handleUpdateWeekVolume: (wNum: number, volume: string) => void;
  isPeriodizationWaveOpen: boolean;
  setIsPeriodizationWaveOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mesoValidationError: string | null;
  setMesoValidationError: (err: string | null) => void;
  handleExportMesoPdf: () => void;
  isExportingMesoPdf: boolean;
  handleSaveMesoPlan: () => void;
  handleSelectMicroStage: () => void;
  getMesoPlanStatus: (plan: MesoPlan) => string;
  readOnly?: boolean;
}

const FULL_DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const getUnifiedLevelScore = (level: string): number => {
  if (!level) return 0.40;
  const l = level.trim().toLowerCase();
  if (l.includes('100') || l.includes('maximal')) return 1.00;
  if (l.includes('95') || l.includes('sehr hoch')) return 0.80;
  if (l.includes('90') || (l.includes('hoch') && !l.includes('sehr'))) return 0.60;
  if (l.includes('80') || l.includes('mittel')) return 0.40;
  if (l.includes('niedrig') && !l.includes('sehr')) return 0.20;
  if (l.includes('sehr niedrig')) return 0.00;
  return 0.40;
};

const getSmoothSvgPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.35;
    const cp1x = p1.x + ((p2.x - p0.x) * tension);
    const cp1y = p1.y + ((p2.y - p0.y) * tension);
    const cp2x = p2.x - ((p3.x - p1.x) * tension);
    const cp2y = p2.y - ((p3.y - p1.y) * tension);

    path += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return path;
};

const getSmoothAreaPath = (points: { x: number; y: number }[], bottomY: number): string => {
  const linePath = getSmoothSvgPath(points);
  if (!linePath) return '';
  return `${linePath} L ${points[points.length - 1].x.toFixed(2)},${bottomY.toFixed(2)} L ${points[0].x.toFixed(2)},${bottomY.toFixed(2)} Z`;
};

export const MesoPlanEditor: React.FC<MesoPlanEditorProps> = ({
  selectedHalfYear,
  currentMesoPlans,
  selectedMesoId,
  setSelectedMesoId,
  activeMesoPlan,
  activeMesoStatus,
  handleDeleteMesoPlan,
  isDeletingMesoPlan,
  executeCreateNewMesoPlan,
  handleCreateNewMesoPlan,
  setReflectingMesoPlan,
  setIsCreatingNextAfterReflection,
  setIsReflectionModalOpen,
  isGeneralWeekStructureOpen,
  setIsGeneralWeekStructureOpen,
  generalWeekTemplateDraft,
  handleUpdateGeneralTemplateSlot,
  selectedBlockBrush,
  setSelectedBlockBrush,
  draggedBlock,
  setDraggedBlock,
  athleticStimuli,
  handleUpdateMesoAthleticFocus,
  handleToggleForAdults,
  setIsCustomizingStimuli,
  isMesoSaved,
  handleUpdateMesoTargetDefenseGoals,
  handleUpdateMesoTargetDefenseTechnique1,
  handleUpdateMesoTargetDefenseTechnique2,
  handleUpdateMesoSpaceDefenseGoals,
  handleUpdateMesoSpaceDefenseTechnique3,
  handleUpdateMesoSpaceDefenseTechnique4,
  intensityLevels,
  volumeLevels,
  setIsCustomizingLevels,
  activeMesoWeekIndex,
  setActiveMesoWeekIndex,
  handleUpdateWeekIntensity,
  handleUpdateWeekVolume,
  isPeriodizationWaveOpen,
  setIsPeriodizationWaveOpen,
  mesoValidationError,
  setMesoValidationError,
  handleExportMesoPdf,
  isExportingMesoPdf,
  handleSaveMesoPlan,
  handleSelectMicroStage,
  getMesoPlanStatus,
  readOnly = false
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 animate-in fade-in">
      {/* Header & New Meso Plan Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700">
              Stufe 2 • Mesoplanung
            </span>
            <span className="text-xs text-slate-400 font-bold">
              Zugeordnet zu: {selectedHalfYear}. Halbjahr
            </span>
          </div>
        </div>

        {/* Meso Plan Switcher, Delete & Action Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {currentMesoPlans.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-700">
              <select
                value={selectedMesoId}
                onChange={e => setSelectedMesoId(e.target.value)}
                className="bg-transparent border-0 px-2.5 py-1 text-xs font-extrabold text-white focus:outline-none cursor-pointer"
              >
                {currentMesoPlans.map(m => {
                  const status = getMesoPlanStatus(m);
                  return (
                    <option key={m.id} value={m.id} className="bg-slate-950 text-white">
                      {m.name} ({status})
                    </option>
                  );
                })}
              </select>

              {activeMesoPlan && !readOnly && (
                <button
                  type="button"
                  onClick={() => handleDeleteMesoPlan(activeMesoPlan)}
                  disabled={isDeletingMesoPlan}
                  className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-800 flex items-center justify-center transition cursor-pointer active:scale-95 disabled:opacity-50"
                  title={`Mesoplanung "${activeMesoPlan.name}" unwiderruflich löschen`}
                >
                  {isDeletingMesoPlan ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Dynamic Action Button based on active Meso Plan Status */}
          {!readOnly && (
            <>
              {activeMesoStatus === 'abgeschlossen' ? (
                <button
                  type="button"
                  onClick={executeCreateNewMesoPlan}
                  disabled={currentMesoPlans.length >= 5}
                  className="px-4 py-2 rounded-xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-lg shadow-emerald-950 flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                  title={currentMesoPlans.length >= 5 ? 'Maximal 5 Mesopläne pro Halbjahr zulässig' : 'Neuen 6-Wochen-Mesoplan anlegen'}
                >
                  <Plus className="w-4 h-4" />
                  <span>Neuen Mesoplan anlegen</span>
                </button>
              ) : activeMesoStatus === 'gespeichert' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeMesoPlan) {
                      setReflectingMesoPlan(activeMesoPlan);
                      setIsCreatingNextAfterReflection(false);
                      setIsReflectionModalOpen(true);
                    }
                  }}
                  className="px-4 py-2 rounded-xl font-extrabold text-xs text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition shadow-lg shadow-indigo-950 flex items-center gap-2 cursor-pointer"
                  title={`Reflexion für ${activeMesoPlan?.name} öffnen und Zyklus abschließen`}
                >
                  <BrainCircuit className="w-4 h-4 text-indigo-200" />
                  <span>Zyklus reflektieren und Mesoplan {activeMesoPlan?.mesoIndex || 1} abschließen</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={true}
                  className="px-4 py-2 rounded-xl font-extrabold text-xs text-slate-400 bg-slate-800/80 border border-slate-700/60 transition flex items-center gap-2 cursor-not-allowed opacity-50 shadow-sm"
                  title={`Bitte speichere zuerst ${activeMesoPlan?.name || 'die Mesoplanung'}, bevor du sie reflektieren oder abschließen kannst.`}
                >
                  <BrainCircuit className="w-4 h-4 text-slate-500" />
                  <span>Zyklus reflektieren und Mesoplan {activeMesoPlan?.mesoIndex || 1} abschließen</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!activeMesoPlan ? (
        <div className="p-12 text-center bg-slate-950 rounded-3xl border border-dashed border-slate-800 space-y-3">
          <Zap className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">
            Es ist noch keine Mesoplanung für dieses Halbjahr angelegt.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={handleCreateNewMesoPlan}
              className="px-5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition shadow-lg shadow-indigo-950 inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Jetzt die 1. Mesoplanung (Woche 1–6) anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Allgemeine Wochenstruktur (Standard-Ablauf) */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-md transition-all">
            {/* Collapsible Header */}
            <button
              type="button"
              onClick={() => setIsGeneralWeekStructureOpen(prev => !prev)}
              className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-900/50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white">
                      Allgemeine Wochenstruktur (Standard-Ablauf)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                      {isGeneralWeekStructureOpen ? 'Geöffnet' : 'Zugeklappt (Klicken zum Bearbeiten)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vereinfache die Mikroplanung, indem du hier einen Standard festlegst.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">
                <span className="text-xs font-bold hidden sm:inline">
                  {isGeneralWeekStructureOpen ? 'Zuklappen' : 'Aufklappen'}
                </span>
                {isGeneralWeekStructureOpen ? (
                  <ChevronUp className="w-5 h-5 text-indigo-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Collapsible Content */}
            {isGeneralWeekStructureOpen && (
              <div className="p-5 pt-0 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
                <div className="space-y-4 pt-4">
                  {/* 7 Standard Days Grid (Mo..So) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {generalWeekTemplateDraft.map((dayItem, dIdx) => {
                      const morningConfig = dayItem.slots.morning ? BUILDING_BLOCK_CONFIGS[dayItem.slots.morning] : null;
                      const afternoonConfig = dayItem.slots.afternoon ? BUILDING_BLOCK_CONFIGS[dayItem.slots.afternoon] : null;

                      return (
                        <div
                          key={dayItem.dayOfWeek}
                          className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 flex flex-col justify-between"
                        >
                          {/* Day Header */}
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 text-xs">
                            <span className="font-extrabold text-white">
                              {FULL_DAY_NAMES[dayItem.dayOfWeek] || dayItem.dayName}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              Standard
                            </span>
                          </div>

                          {/* Slot 1: Vormittag */}
                          <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault();
                              if (!readOnly && draggedBlock) {
                                handleUpdateGeneralTemplateSlot(dIdx, 'morning', draggedBlock);
                              }
                            }}
                            onClick={() => {
                              if (!readOnly && selectedBlockBrush) {
                                handleUpdateGeneralTemplateSlot(dIdx, 'morning', selectedBlockBrush);
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
                                  handleUpdateGeneralTemplateSlot(dIdx, 'morning', undefined);
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-black/60 text-rose-300 hover:text-rose-100 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Slot 2: Nachmittag */}
                          <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault();
                              if (!readOnly && draggedBlock) {
                                handleUpdateGeneralTemplateSlot(dIdx, 'afternoon', draggedBlock);
                              }
                            }}
                            onClick={() => {
                              if (!readOnly && selectedBlockBrush) {
                                handleUpdateGeneralTemplateSlot(dIdx, 'afternoon', selectedBlockBrush);
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
                                  handleUpdateGeneralTemplateSlot(dIdx, 'afternoon', undefined);
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-black/60 text-rose-300 hover:text-rose-100 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Fertige Bausteine Panel */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
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
                            draggable
                            onDragStart={() => setDraggedBlock(bKey)}
                            onDragEnd={() => setDraggedBlock(null)}
                            onClick={() => setSelectedBlockBrush(bKey)}
                            className={cn(
                              "p-3 rounded-2xl border text-center transition cursor-grab active:cursor-grabbing select-none shadow-md flex items-center justify-between gap-2",
                              cfg.bgClass, cfg.borderClass, cfg.textClass,
                              isSelected ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-[1.02]" : "hover:opacity-90"
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
                </div>
              </div>
            )}
          </div>

          {/* 2. Meso Info Banner mit Entwicklungszielen & Technikfokus */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-md text-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="font-extrabold text-white text-sm block">
                    {activeMesoPlan.name}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Zeitraum: <strong>{new Date(activeMesoPlan.startDate).toLocaleDateString('de-DE')} – {new Date(activeMesoPlan.endDate).toLocaleDateString('de-DE')}</strong>
                  </span>
                </div>

                {/* Dropdown: Athletischer Entwicklungsreiz & Checkbox für Erwachsene */}
                <div className="flex flex-wrap items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <span>Athletischer Entwicklungsreiz:</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                    <div className="flex items-center gap-1.5">
                    <select
                      value={activeMesoPlan.athleticFocus || 'unspezifisch'}
                      disabled={readOnly || Boolean(activeMesoPlan.forAdults)}
                      onChange={e => handleUpdateMesoAthleticFocus(e.target.value)}
                      className={cn(
                        "bg-slate-950 border rounded-lg px-2.5 py-1 text-xs font-bold transition focus:outline-none",
                        activeMesoPlan.forAdults || readOnly
                          ? "border-slate-800 text-slate-600 bg-slate-950/40 cursor-not-allowed opacity-50"
                          : "border-indigo-500/50 text-indigo-200 hover:border-indigo-400 cursor-pointer"
                      )}
                      title={
                        activeMesoPlan.forAdults
                          ? "Im Erwachsenen-Modus deaktiviert (Microdosing erfolgt tageweise in der Mikroplanung)"
                          : athleticStimuli.find(s => s.name === (activeMesoPlan.athleticFocus || 'unspezifisch'))?.focus
                      }
                    >
                      {athleticStimuli.map(opt => (
                        <option key={opt.id} value={opt.name} title={opt.focus}>
                          {opt.name}
                        </option>
                      ))}
                    </select>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setIsCustomizingStimuli(true)}
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                        title="Athletische Entwicklungsreize individuell anpassen"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Checkbox "für Erwachsene" mit Hover-Tooltip */}
                  <div className="relative group/adults flex items-center">
                    <label 
                      className="flex items-center gap-1.5 cursor-pointer select-none pl-2 border-l border-slate-800"
                      title="Athletischer Entwicklungsreiz wird in jedem Training microdosiert integriert und kann in der Mikroplanung ausgewählt werden."
                    >
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={Boolean(activeMesoPlan.forAdults)}
                        onChange={e => handleToggleForAdults(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 cursor-pointer disabled:opacity-50"
                      />
                      <span className={cn("text-xs font-bold transition", activeMesoPlan.forAdults ? "text-amber-300" : "text-slate-400")}>
                        für Erwachsene
                      </span>
                      <Info className="w-3.5 h-3.5 text-slate-500 group-hover/adults:text-amber-400 transition" />
                    </label>

                    {/* Hover Tooltip Box */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-[11px] leading-snug shadow-2xl opacity-0 group-hover/adults:opacity-100 pointer-events-none transition-all duration-200 z-50 transform translate-y-1 group-hover/adults:translate-y-0">
                      <div className="flex items-start gap-1.5">
                        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>
                          Athletischer Entwicklungsreiz wird in jedem Training microdosiert integriert und kann in der Mikroplanung ausgewählt werden.
                        </span>
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-slate-700" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Zyklus:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-indigo-950 text-indigo-300 border border-indigo-700">
                  Mesoplan {activeMesoPlan.mesoIndex} von max. 5
                </span>
                {isMesoSaved ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Gespeichert
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-700">
                    Entwurf
                  </span>
                )}
              </div>
            </div>

            {/* Konkrete Entwicklungsziele in der Zielverteidigung & Raumverteidigung mit Technikfokus-Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-850">
              {/* Zielverteidigung (ZV) */}
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Konkrete Entwicklungsziele in der Zielverteidigung</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <textarea
                    value={activeMesoPlan.targetDefenseGoals || ''}
                    disabled={readOnly}
                    onChange={e => handleUpdateMesoTargetDefenseGoals(e.target.value)}
                    placeholder="Welche konkreten Ziele möchte ich bei welchem Torwart erreichen?"
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none disabled:opacity-50"
                  />
                </div>

                {/* Zwei Dropdowns nebeneinander: Technikfokus ZV 1 & Technikfokus ZV 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <span>Technikfokus ZV 1</span>
                      <span className="text-rose-400 font-bold">*</span>
                    </label>
                    <select
                      value={activeMesoPlan.targetDefenseTechnique1 || ''}
                      disabled={readOnly}
                      onChange={e => handleUpdateMesoTargetDefenseTechnique1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Technik auswählen --</option>
                      {TARGET_DEFENSE_TECHNIQUES
                        .filter(tech => !activeMesoPlan.targetDefenseTechnique2 || tech !== activeMesoPlan.targetDefenseTechnique2 || tech === activeMesoPlan.targetDefenseTechnique1)
                        .map(tech => (
                          <option key={tech} value={tech}>
                            {tech}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <span>Technikfokus ZV 2</span>
                    </label>
                    <select
                      value={activeMesoPlan.targetDefenseTechnique2 || ''}
                      disabled={readOnly}
                      onChange={e => handleUpdateMesoTargetDefenseTechnique2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Technik auswählen --</option>
                      {TARGET_DEFENSE_TECHNIQUES
                        .filter(tech => !activeMesoPlan.targetDefenseTechnique1 || tech !== activeMesoPlan.targetDefenseTechnique1 || tech === activeMesoPlan.targetDefenseTechnique2)
                        .map(tech => (
                          <option key={tech} value={tech}>
                            {tech}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Raumverteidigung (RV) */}
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Konkrete Entwicklungsziele in der Raumverteidigung</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <textarea
                    value={activeMesoPlan.spaceDefenseGoals || ''}
                    disabled={readOnly}
                    onChange={e => handleUpdateMesoSpaceDefenseGoals(e.target.value)}
                    placeholder="Welche konkreten Ziele möchte ich bei welchem Torwart erreichen?"
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none disabled:opacity-50"
                  />
                </div>

                {/* Zwei Dropdowns nebeneinander: Technikfokus RV 1 & Technikfokus RV 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <span>Technikfokus RV 1</span>
                      <span className="text-rose-400 font-bold">*</span>
                    </label>
                    <select
                      value={activeMesoPlan.spaceDefenseTechnique3 || ''}
                      disabled={readOnly}
                      onChange={e => handleUpdateMesoSpaceDefenseTechnique3(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Technik auswählen --</option>
                      {SPACE_DEFENSE_TECHNIQUES
                        .filter(tech => !activeMesoPlan.spaceDefenseTechnique4 || tech !== activeMesoPlan.spaceDefenseTechnique4 || tech === activeMesoPlan.spaceDefenseTechnique3)
                        .map(tech => (
                          <option key={tech} value={tech}>
                            {tech}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <span>Technikfokus RV 2</span>
                    </label>
                    <select
                      value={activeMesoPlan.spaceDefenseTechnique4 || ''}
                      disabled={readOnly}
                      onChange={e => handleUpdateMesoSpaceDefenseTechnique4(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Technik auswählen --</option>
                      {SPACE_DEFENSE_TECHNIQUES
                        .filter(tech => !activeMesoPlan.spaceDefenseTechnique3 || tech !== activeMesoPlan.spaceDefenseTechnique3 || tech === activeMesoPlan.spaceDefenseTechnique4)
                        .map(tech => (
                          <option key={tech} value={tech}>
                            {tech}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Wochen-Steuerung: Intensität & Volumen (Mit 6 Wochen als Reiter oben) */}
          {(() => {
            const currentWeekData = activeMesoPlan.weeks?.find(w => w.weekNumber === activeMesoWeekIndex);
            const weekIntensity = currentWeekData?.intensity || DEFAULT_WEEK_SETTINGS[activeMesoWeekIndex]?.intensity || intensityLevels[0];
            const weekVolume = currentWeekData?.volume || DEFAULT_WEEK_SETTINGS[activeMesoWeekIndex]?.volume || volumeLevels[0];

            return (
              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-850 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-black text-white">
                      Wochen-Fokus: Intensität & Volumen
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCustomizingLevels(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Intensitäts- und Volumenstufen individuell bearbeiten"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Stufen anpassen</span>
                  </button>
                </div>

                {/* 6 Wochen als Reiter oben */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-850 pb-3">
                  {[1, 2, 3, 4, 5, 6].map(wNum => {
                    const wData = activeMesoPlan.weeks?.find(w => w.weekNumber === wNum);
                    const wStart = wData?.days[0]?.date ? new Date(wData.days[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                    const wEnd = wData?.days[6]?.date ? new Date(wData.days[6].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                    const isSelected = activeMesoWeekIndex === wNum;

                    return (
                      <button
                        key={wNum}
                        type="button"
                        onClick={() => setActiveMesoWeekIndex(wNum)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 border cursor-pointer",
                          isSelected
                            ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-950"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850"
                        )}
                      >
                        <span>Woche {wNum}</span>
                        {wStart && wEnd && (
                          <span className={cn("text-[10px] font-medium", isSelected ? "text-indigo-200" : "text-slate-500")}>
                            ({wStart} – {wEnd})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Einstellungs-Felder für die ausgewählte Woche (Intensität & Volumen nebeneinander) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Dropdown: Intensität */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 block">
                        Intensität
                      </label>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Voreinstellung (Wellenprinzip): {DEFAULT_WEEK_SETTINGS[activeMesoWeekIndex]?.intensity}
                      </span>
                    </div>
                    <select
                      value={weekIntensity}
                      disabled={readOnly}
                      onChange={e => handleUpdateWeekIntensity(activeMesoWeekIndex, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-755 hover:border-slate-650 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none transition cursor-pointer disabled:opacity-50"
                    >
                      {intensityLevels.map(lvl => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown: Volumen */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 block">
                        Volumen
                      </label>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Voreinstellung (Wellenprinzip): {DEFAULT_WEEK_SETTINGS[activeMesoWeekIndex]?.volume}
                      </span>
                    </div>
                    <select
                      value={weekVolume}
                      disabled={readOnly}
                      onChange={e => handleUpdateWeekVolume(activeMesoWeekIndex, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-755 hover:border-slate-650 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none transition cursor-pointer disabled:opacity-50"
                    >
                      {volumeLevels.map(lvl => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Collapsible Card: Periodisierungs-Verlauf */}
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-md transition">
                  <button
                    type="button"
                    onClick={() => setIsPeriodizationWaveOpen(prev => !prev)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-850/80 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-700/50 flex items-center justify-center">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-white uppercase tracking-wider">
                          Periodisierungs-Verlauf
                        </h5>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Kurvenverlauf über alle 6 Wochen für Intensität (Linie 1) und Volumen (Linie 2)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[10.5px] font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                        <span className="text-amber-300">Intensität</span>
                        <span className="text-slate-600">|</span>
                        <span className="w-2 h-2 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50" />
                        <span className="text-sky-300">Volumen</span>
                      </div>

                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span>{isPeriodizationWaveOpen ? 'Zuklappen' : 'Aufklappen'}</span>
                        {isPeriodizationWaveOpen ? (
                          <ChevronUp className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </span>
                    </div>
                  </button>

                  {isPeriodizationWaveOpen && (
                    <div className="p-4 pt-0 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
                      {(() => {
                        const svgW = 740;
                        const svgH = 220;
                        const padL = 110;
                        const padR = 35;
                        const padT = 24;
                        const padB = 40;
                        const chartW = svgW - padL - padR;
                        const chartH = svgH - padT - padB;
                        const bottomY = padT + chartH;

                        const weekPointsData = [1, 2, 3, 4, 5, 6].map((wNum, i) => {
                          const wData = activeMesoPlan.weeks?.find(w => w.weekNumber === wNum);
                          const intensity = wData?.intensity || DEFAULT_WEEK_SETTINGS[wNum]?.intensity || intensityLevels[0] || 'mittel (ca. 80%)';
                          const volume = wData?.volume || DEFAULT_WEEK_SETTINGS[wNum]?.volume || volumeLevels[0] || 'mittel';
                          const intScore = getUnifiedLevelScore(intensity);
                          const volScore = getUnifiedLevelScore(volume);

                          const x = padL + i * (chartW / 5);
                          const yInt = padT + (1 - intScore) * chartH;
                          const yVol = padT + (1 - volScore) * chartH;

                          return {
                            weekNumber: wNum,
                            x,
                            yInt,
                            yVol,
                            intensity,
                            volume,
                            isSamePoint: Math.abs(yInt - yVol) < 0.01
                          };
                        });

                        const intPoints = weekPointsData.map(p => ({ x: p.x, y: p.yInt }));
                        const volPoints = weekPointsData.map(p => ({ x: p.x, y: p.yVol }));

                        const intPath = getSmoothSvgPath(intPoints);
                        const intAreaPath = getSmoothAreaPath(intPoints, bottomY);
                        const volPath = getSmoothSvgPath(volPoints);
                        const volAreaPath = getSmoothAreaPath(volPoints, bottomY);

                        const yLevels = [
                          { label: 'Maximal (100%)', y: padT + (1 - 1.00) * chartH },
                          { label: 'Sehr hoch (95%)', y: padT + (1 - 0.80) * chartH },
                          { label: 'Hoch (90%)', y: padT + (1 - 0.60) * chartH },
                          { label: 'Mittel (80%)', y: padT + (1 - 0.40) * chartH },
                          { label: 'Niedrig', y: padT + (1 - 0.20) * chartH },
                          { label: 'Sehr niedrig', y: padT + (1 - 0.00) * chartH }
                        ];

                        return (
                          <div className="pt-3 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span className="text-[11px] font-bold text-slate-400">
                                Reaktiver 6-Wochen Verlauf (Wellenprinzip)
                              </span>

                              <div className="flex flex-wrap items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50 border border-amber-300" />
                                  <span className="text-amber-300 font-extrabold">Linie 1: Intensität</span>
                                </div>
                                <span className="text-slate-600">|</span>
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50 border border-sky-300" />
                                  <span className="text-sky-300 font-extrabold">Linie 2: Volumen</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner overflow-hidden">
                              <svg 
                                viewBox={`0 0 ${svgW} ${svgH}`} 
                                className="w-full h-auto max-h-[260px] overflow-visible select-none"
                              >
                                <defs>
                                  <linearGradient id="intensityAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                                  </linearGradient>
                                  <linearGradient id="volumeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.20" />
                                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                                  </linearGradient>
                                  <linearGradient id="intensityLineGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#f59e0b" />
                                    <stop offset="50%" stopColor="#fb923c" />
                                    <stop offset="100%" stopColor="#f43f5e" />
                                  </linearGradient>
                                  <linearGradient id="volumeLineGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#38bdf8" />
                                    <stop offset="50%" stopColor="#60a5fa" />
                                    <stop offset="100%" stopColor="#818cf8" />
                                  </linearGradient>
                                  <filter id="glowShadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
                                  </filter>
                                </defs>

                                {(() => {
                                  const activePt = weekPointsData.find(p => p.weekNumber === activeMesoWeekIndex);
                                  if (!activePt) return null;
                                  return (
                                    <rect
                                      x={activePt.x - 46}
                                      y={padT - 6}
                                      width={92}
                                      height={chartH + 12}
                                      rx={12}
                                      fill="#6366f1"
                                      fillOpacity="0.08"
                                      stroke="#6366f1"
                                      strokeOpacity="0.35"
                                      strokeWidth="1.2"
                                      strokeDasharray="3 3"
                                    />
                                  );
                                })()}

                                {yLevels.map((lvl, idx) => (
                                  <g key={idx}>
                                    <line
                                      x1={padL}
                                      y1={lvl.y}
                                      x2={padL + chartW}
                                      y2={lvl.y}
                                      stroke="#334155"
                                      strokeWidth="1"
                                      strokeDasharray="3 3"
                                      strokeOpacity="0.45"
                                    />
                                    <text
                                      x={padL - 10}
                                      y={lvl.y + 3.5}
                                      textAnchor="end"
                                      fill="#94a3b8"
                                      fontSize="9"
                                      fontWeight="600"
                                      fontFamily="sans-serif"
                                    >
                                      {lvl.label}
                                    </text>
                                  </g>
                                ))}

                                {weekPointsData.map(p => (
                                  <line
                                    key={`vline-${p.weekNumber}`}
                                    x1={p.x}
                                    y1={padT}
                                    x2={p.x}
                                    y2={bottomY}
                                    stroke="#334155"
                                    strokeWidth="1"
                                    strokeDasharray="2 4"
                                    strokeOpacity="0.3"
                                  />
                                ))}

                                <path d={volAreaPath} fill="url(#volumeAreaGrad)" />
                                <path d={intAreaPath} fill="url(#intensityAreaGrad)" />

                                <path
                                  d={volPath}
                                  fill="none"
                                  stroke="url(#volumeLineGrad)"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  filter="url(#glowShadow)"
                                />

                                <path
                                  d={intPath}
                                  fill="none"
                                  stroke="url(#intensityLineGrad)"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  filter="url(#glowShadow)"
                                />

                                {weekPointsData.map(p => {
                                  const isActive = p.weekNumber === activeMesoWeekIndex;

                                  return (
                                    <g key={`points-${p.weekNumber}`}>
                                      {p.isSamePoint ? (
                                        <g>
                                          {isActive && (
                                            <circle
                                              cx={p.x}
                                              y={p.yInt}
                                              r={11}
                                              fill="none"
                                              stroke="#c084fc"
                                              strokeWidth="2"
                                              strokeOpacity="0.6"
                                            />
                                          )}
                                          <circle
                                            cx={p.x}
                                            y={p.yVol}
                                            r={isActive ? 7 : 5.8}
                                            fill="#0f172a"
                                            stroke="#38bdf8"
                                            strokeWidth="3"
                                            className="cursor-pointer"
                                            onClick={() => setActiveMesoWeekIndex(p.weekNumber)}
                                          />
                                          <circle
                                            cx={p.x}
                                            y={p.yInt}
                                            r={isActive ? 3.5 : 2.8}
                                            fill="#f59e0b"
                                            className="cursor-pointer"
                                            onClick={() => setActiveMesoWeekIndex(p.weekNumber)}
                                          />
                                        </g>
                                      ) : (
                                        <g>
                                          {isActive && (
                                            <circle
                                              cx={p.x}
                                              y={p.yVol}
                                              r={9.5}
                                              fill="none"
                                              stroke="#38bdf8"
                                              strokeWidth="2"
                                              strokeOpacity="0.5"
                                            />
                                          )}
                                          <circle
                                            cx={p.x}
                                            y={p.yVol}
                                            r={isActive ? 5.5 : 4.5}
                                            fill="#0f172a"
                                            stroke="#38bdf8"
                                            strokeWidth="2.8"
                                            className="cursor-pointer transition"
                                            onClick={() => setActiveMesoWeekIndex(p.weekNumber)}
                                          />

                                          {isActive && (
                                            <circle
                                              cx={p.x}
                                              y={p.yInt}
                                              r={9.5}
                                              fill="none"
                                              stroke="#f59e0b"
                                              strokeWidth="2"
                                              strokeOpacity="0.5"
                                            />
                                          )}
                                          <circle
                                            cx={p.x}
                                            y={p.yInt}
                                            r={isActive ? 5.5 : 4.5}
                                            fill="#0f172a"
                                            stroke="#f59e0b"
                                            strokeWidth="2.8"
                                            className="cursor-pointer transition"
                                            onClick={() => setActiveMesoWeekIndex(p.weekNumber)}
                                          />
                                        </g>
                                      )}

                                      <text
                                        x={p.x}
                                        y={bottomY + 16}
                                        textAnchor="middle"
                                        fill={isActive ? '#ffffff' : '#94a3b8'}
                                        fontSize={isActive ? "10.5" : "9.5"}
                                        fontWeight={isActive ? "900" : "700"}
                                        fontFamily="sans-serif"
                                        className="cursor-pointer"
                                        onClick={() => setActiveMesoWeekIndex(p.weekNumber)}
                                      >
                                        Woche {p.weekNumber}
                                      </text>
                                      {isActive && (
                                        <circle
                                          cx={p.x}
                                          y={bottomY + 23}
                                          r={2.2}
                                          fill="#6366f1"
                                        />
                                      )}
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>

                            {/* 6-Wochen Übersichtskarten */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                              {weekPointsData.map(p => {
                                const isActive = p.weekNumber === activeMesoWeekIndex;
                                return (
                                  <button
                                    key={`card-${p.weekNumber}`}
                                    type="button"
                                    onClick={() => setActiveMesoWeekIndex(p.weekNumber)}
                                    className={cn(
                                      "p-2.5 rounded-xl border text-left transition space-y-1.5 cursor-pointer active:scale-95",
                                      isActive
                                        ? "bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950"
                                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={cn("text-[10px] font-black uppercase tracking-wider", isActive ? "text-indigo-300" : "text-slate-400")}>
                                        Woche {p.weekNumber}
                                      </span>
                                      {isActive && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-[10.5px]">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                        <span className="font-bold text-amber-300 truncate">
                                          {p.intensity}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10.5px]">
                                        <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                                        <span className="font-bold text-sky-300 truncate">
                                          {p.volume}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Incomplete Mandatory Fields Error Banner */}
          {mesoValidationError && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in shadow-xl shadow-rose-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-900 border border-rose-600 text-rose-200 flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-black text-sm text-white flex items-center gap-1.5">
                    <span>Fehlermeldung: Pflichtfelder nicht vollständig ausgefüllt!</span>
                  </h5>
                  <p className="text-rose-200 font-medium">{mesoValidationError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMesoValidationError(null)}
                className="p-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              {!isMesoSaved && (
                <span className="text-amber-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4" />
                  Ungespeicherte Änderungen in der Mesoplanung.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeMesoPlan && (
                <button
                  type="button"
                  onClick={() => {
                    setReflectingMesoPlan(activeMesoPlan);
                    setIsCreatingNextAfterReflection(false);
                    setIsReflectionModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-purple-100 border border-purple-800/70 shadow-md active:scale-95 cursor-pointer"
                  title="Reflexion dieses Mesozyklus ansehen oder bearbeiten"
                >
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  <span>Zyklus reflektieren</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportMesoPdf}
                disabled={isExportingMesoPdf}
                className="px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                title="Mesoplanung als PDF herunterladen"
              >
                <FileDown className="w-4 h-4 text-indigo-400" />
                <span>{isExportingMesoPdf ? 'PDF wird erstellt...' : 'Als PDF ausgeben'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveMesoPlan}
                disabled={readOnly || isMesoSaved}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition",
                  readOnly || isMesoSaved
                    ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950 active:scale-95 cursor-pointer"
                )}
              >
                <Save className="w-4 h-4" />
                <span>
                  {readOnly
                    ? 'Nur Lesezugriff (Trainer zugewiesen)'
                    : isMesoSaved
                    ? 'Mesoplanung gespeichert'
                    : 'Mesoplanung speichern'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSelectMicroStage}
                disabled={!readOnly && !isMesoSaved}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition",
                  !readOnly && !isMesoSaved
                    ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60"
                    : "text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-950 cursor-pointer"
                )}
                title={!readOnly && !isMesoSaved ? "Bitte speichere zuerst die Mesoplanung" : "Weiter zur Mikroplanung"}
              >
                <span>Weiter zur Mikroplanung</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
