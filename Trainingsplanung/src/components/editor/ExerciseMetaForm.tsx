import React, { useState } from 'react';
import type { 
  ExerciseCategory, 
  AgeGroup, 
  MaterialType, 
  FocusSchwerpunkt,
  SituativerSchwerpunkt,
  MethodischeReiheStufen,
  MethodicalProgression,
  AthletischerEntwicklungsreiz
} from '../../types';
import { 
  EXERCISE_CATEGORIES, 
  AGE_GROUPS, 
  ALL_MATERIALS, 
  ELEMENT_STATUS_OPTIONS, 
  WARMUP_HAUPTSCHWERPUNKTE, 
  SITUATIVE_SCHWERPUNKTE,
  SKILL_DEFINITIONS,
  CATEGORY_COLORS,
  ATHLETISCHER_ENTWICKLUNGSREIZ_OPTIONS
} from '../../types';
import { 
  Clock, 
  Users, 
  Package, 
  Video, 
  Trophy,
  Plus,
  Minus,
  Check,
  Info,
  Layers,
  Sparkles,
  FileText,
  ListChecks,
  Activity,
  Brain,
  Eye,
  Footprints,
  ChevronDown,
  BookmarkCheck
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { VideoEmbedPlayer } from '../VideoEmbedPlayer';
import { MethodicalChainDrawer } from './MethodicalChainDrawer';

/**
 * Reusable inline tooltip component with (i) icon for explaining form fields
 */
export const FieldInfoTooltip: React.FC<{ 
  text: string; 
  position?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
}> = ({
  text,
  position = 'top',
  align = 'center'
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShow(prev => !prev);
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="p-0.5 text-slate-400 hover:text-sky-400 rounded-full hover:bg-slate-800 transition focus:outline-none cursor-pointer inline-flex items-center justify-center ml-1"
        aria-label="Erklärung anzeigen"
        title="Erklärung anzeigen"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2.5 text-[11px] leading-snug font-medium text-slate-200 bg-slate-900/98 border border-slate-700/90 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none w-56 sm:w-64 animate-in fade-in zoom-in-95",
            position === 'top' 
              ? "bottom-full mb-2" 
              : "top-full mt-2",
            align === 'right' 
              ? "right-0 translate-x-0" 
              : align === 'left' 
                ? "left-0 translate-x-0" 
                : "left-1/2 -translate-x-1/2"
          )}
        >
          <div className="text-[10px] uppercase font-extrabold text-sky-400 mb-1 tracking-wider flex items-center gap-1">
            <Info className="w-3 h-3 text-sky-400" />
            <span>Erklärung & Didaktik</span>
          </div>
          {text}
          <div
            className={cn(
              "absolute w-2 h-2 bg-slate-900 border-slate-700 rotate-45",
              position === 'top' ? "top-full -mt-1 border-b border-r" : "bottom-full -mb-1 border-t border-l",
              align === 'right' ? "right-2.5 translate-x-0" : align === 'left' ? "left-2.5 translate-x-0" : "left-1/2 -translate-x-1/2"
            )}
          />
        </div>
      )}
    </div>
  );
};

export interface ExerciseMetaFormProps {
  title: string;
  setTitle: (val: string) => void;
  category: ExerciseCategory;
  setCategory: (val: ExerciseCategory) => void;
  minAgeGroup: AgeGroup;
  setMinAgeGroup: (val: AgeGroup) => void;
  minKeepers: number;
  setMinKeepers: (val: number) => void;
  maxKeepers: number;
  setMaxKeepers: (val: number) => void;
  durationMinutes: number;
  setDurationMinutes: (val: number) => void;
  materials: MaterialType[];
  setMaterials: React.Dispatch<React.SetStateAction<MaterialType[]>>;
  onToggleMaterial?: (mat: MaterialType) => void;
  videoUrl: string;
  setVideoUrl: (val: string) => void;
  ablauf: string;
  setAblauf: (val: string) => void;
  coachingPoints: string;
  setCoachingPoints: (val: string) => void;
  
  // Category specific: Analytisch
  technik?: string;
  setTechnik?: (val: string) => void;
  technikprinzipien?: string;
  setTechnikprinzipien?: (val: string) => void;
  methodikStufen?: MethodischeReiheStufen;
  onMethodikStufenChange?: (stufen: MethodischeReiheStufen) => void;
  progressions?: MethodicalProgression[];
  onApplyTemplate?: (template: MethodischeReiheStufen, source: 'user' | 'club' | 'global') => void;
  availableTechnikTemplates?: Array<{
    id: string;
    name: string;
    scope: 'user' | 'club' | 'global';
    originLabel: string;
    badgeLabel: string;
    text: string;
  }>;
  activeTechnikTemplateId?: string | null;
  onSelectTechnikTemplate?: (templateId: string) => void;
  onSaveAsUserTemplate?: () => void;
  isSavingUserTechnique?: boolean;

  // Category specific: WarmUp
  atSchwerpunkt?: string;
  setAtSchwerpunkt?: (val: string) => void;
  kognition?: string;
  setKognition?: (val: string) => void;
  koordinativesElement?: string;
  setKoordinativesElement?: (val: string) => void;
  visuellesElement?: string;
  setVisuellesElement?: (val: string) => void;
  warmUpSchwerpunkte?: string[];
  onToggleWarmUpSchwerpunkt?: (s: string) => void;

  // Category specific: Athletik
  athletikSchwerpunkt?: FocusSchwerpunkt;
  setAthletikSchwerpunkt?: (val: FocusSchwerpunkt) => void;
  athletischerEntwicklungsreiz?: AthletischerEntwicklungsreiz | string;
  setAthletischerEntwicklungsreiz?: (val: AthletischerEntwicklungsreiz | string) => void;

  // Category specific: Situativ / Integrativ / Wettkampf
  situativeSchwerpunkte?: SituativerSchwerpunkt[];
  onToggleSituativerSchwerpunkt?: (s: SituativerSchwerpunkt) => void;
  taktikprinzipien?: string;
  setTaktikprinzipien?: (val: string) => void;
  siegbedingung?: string;
  setSiegbedingung?: (val: string) => void;
  onOpenUserTacticsModal?: () => void;
}

export const ExerciseMetaForm: React.FC<ExerciseMetaFormProps> = ({
  title,
  setTitle,
  category,
  setCategory,
  minAgeGroup,
  setMinAgeGroup,
  minKeepers,
  setMinKeepers,
  maxKeepers,
  setMaxKeepers,
  durationMinutes,
  setDurationMinutes,
  materials,
  setMaterials,
  onToggleMaterial,
  videoUrl,
  setVideoUrl,
  ablauf,
  setAblauf,
  coachingPoints,
  setCoachingPoints,
  technik = '',
  setTechnik,
  technikprinzipien = '',
  setTechnikprinzipien,
  methodikStufen,
  onMethodikStufenChange,
  progressions = [],
  onApplyTemplate,
  availableTechnikTemplates = [],
  activeTechnikTemplateId,
  onSelectTechnikTemplate,
  onSaveAsUserTemplate,
  isSavingUserTechnique = false,
  atSchwerpunkt = 'unspezifisch',
  setAtSchwerpunkt,
  kognition = 'nicht enthalten',
  setKognition,
  koordinativesElement = 'nicht enthalten',
  setKoordinativesElement,
  visuellesElement = 'nicht enthalten',
  setVisuellesElement,
  warmUpSchwerpunkte = [],
  onToggleWarmUpSchwerpunkt,
  athletikSchwerpunkt = 'Explosivität',
  setAthletikSchwerpunkt,
  athletischerEntwicklungsreiz = '',
  setAthletischerEntwicklungsreiz,
  situativeSchwerpunkte = [],
  onToggleSituativerSchwerpunkt,
  taktikprinzipien = '',
  setTaktikprinzipien,
  siegbedingung = '',
  setSiegbedingung,
  onOpenUserTacticsModal
}) => {
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false);

  const toggleMaterial = (mat: MaterialType) => {
    if (onToggleMaterial) {
      onToggleMaterial(mat);
    } else {
      setMaterials(prev => 
        prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
      );
    }
  };

  const techDefs = (SKILL_DEFINITIONS as any)?.Technik || [];

  // Options for athletic focus (WarmUp and Torwart-Athletik)
  const ATHLETIC_FOCUS_OPTIONS: FocusSchwerpunkt[] = [
    'Schnelle Beine',
    'Gleichgewicht',
    'Explosivität',
    'Stabilität',
    'unspezifisch'
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* 1. TITLE & TRAININGSSTAGE TABS */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center">
            <span>Übungstitel</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. 1vs1 Blockstellung mit Zuspiel & Nachschuss"
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
          />
        </div>

        {/* Trainingsphase as interactive Tabs / Reiter (no dropdown, zweizeilig lesbar) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center">
              <Layers className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              <span>Trainingsphase *</span>
              <FieldInfoTooltip text="Wähle die passende Phase im Trainingsaufbau. Jede Phase schaltet spezifische didaktische Schwerpunkte frei." />
            </label>
            <span className="text-[11px] font-bold text-slate-400">
              Aktiv: <span className="text-emerald-300">{category}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-2 bg-slate-950/90 border border-slate-800/90 rounded-2xl">
            {EXERCISE_CATEGORIES.map(cat => {
              const isSelected = category === cat;
              const colStyle = CATEGORY_COLORS[cat] || {
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-400',
                border: 'border-emerald-500/30',
                badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              };

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "min-h-[46px] px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center text-center cursor-pointer border select-none leading-tight relative overflow-hidden",
                    isSelected
                      ? cn(colStyle.badge, "shadow-lg shadow-black/40 scale-[1.02] ring-2 ring-white/30 font-black")
                      : cn("bg-slate-900/90 hover:bg-slate-850", colStyle.border, "border text-slate-300 hover:text-white shadow-sm")
                  )}
                >
                  <span className={cn("leading-snug text-center break-words", isSelected ? "" : colStyle.text)}>
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analytisch Phase: Technik-Spezifikation & Methodische Reihe (direkt nach Trainingsphase) */}
        {category === 'Analytisch' && (
          <div className="space-y-4 pt-1">
            {/* Technik-Spezifikation (Analytisch) */}
            {setTechnik && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/30 space-y-3 shadow-xl">
                <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider block">
                  Technik-Spezifikation (Analytisch)
                </span>
                
                {/* 1. Torwarttechnik Auswahlliste */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 flex items-center">
                    <span>Torwarttechnik *</span>
                    <FieldInfoTooltip text="Die zentrale torwartspezifische Technikform der methodischen Reihe aus dem Ausbildungslehrplan." />
                  </label>
                  <select
                    value={technik}
                    onChange={e => setTechnik(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">– Eigene Technik / Nicht zugeordnet –</option>
                    {Array.from(new Set(techDefs.map((t: any) => t.group || 'Allgemein'))).map((groupName: any) => (
                      <optgroup key={groupName} label={groupName} className="bg-slate-900 text-purple-300 font-bold">
                        {techDefs.filter((t: any) => (t.group || 'Allgemein') === groupName).map((t: any) => (
                          <option key={t.id} value={t.name} className="bg-slate-950 text-slate-100 font-normal">
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* 2. Technikprinzipien mit Vorlagen-Umschalter & Speichern */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs text-slate-400 flex items-center">
                      <span>Technikprinzipien</span>
                      <FieldInfoTooltip text="Detailpunkte zur biomechanischen Ausführung wie Beinstellung, Auftaktschritt, Handhaltung und Körperschwerpunkt." />
                    </label>

                    {/* Template Switcher & Save Button */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {availableTechnikTemplates && availableTechnikTemplates.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">Vorlage:</span>
                          <select
                            value={activeTechnikTemplateId || ''}
                            onChange={e => onSelectTechnikTemplate && onSelectTechnikTemplate(e.target.value)}
                            className="bg-slate-900 border border-purple-800/60 hover:border-purple-600 rounded-lg px-2 py-1 text-[11px] font-bold text-purple-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            {availableTechnikTemplates.map(tpl => (
                              <option key={tpl.id} value={tpl.id} className="bg-slate-950 text-slate-200">
                                {tpl.originLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {onSaveAsUserTemplate && Boolean(technik) && (
                        <button
                          type="button"
                          onClick={onSaveAsUserTemplate}
                          disabled={isSavingUserTechnique}
                          title="Aktuelle Technikprinzipien als deine persönliche Vorlage für diese Torwarttechnik speichern (wird in zukünftigen Übungen automatisch geladen)"
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-700/60 text-purple-200 hover:text-purple-100 transition cursor-pointer disabled:opacity-50"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5 text-purple-400" />
                          <span>{isSavingUserTechnique ? 'Speichert...' : 'Als meine Vorlage speichern'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={technikprinzipien}
                    onChange={e => setTechnikprinzipien && setTechnikprinzipien(e.target.value)}
                    placeholder="z. B. Beinstellung schulterbreit, Auftaktschritt explosiv, Hände hinter dem Ball..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Methodische Reihe Drawer (standardmäßig zugeklappt) */}
            {methodikStufen && onMethodikStufenChange && (
              <MethodicalChainDrawer
                methodikStufen={methodikStufen}
                onMethodikStufenChange={onMethodikStufenChange}
                progressions={progressions}
                onApplyTemplate={onApplyTemplate}
              />
            )}
          </div>
        )}
      </div>

      {/* 2. ABLAUF & COACHINGPUNKTE (Positioned directly after Title/Trainingsphase bzw. Methodische Reihe) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center">
              <FileText className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              <span>Ablauf *</span>
              <FieldInfoTooltip text="Detaillierter organisatorischer Ablauf: Aufbau, Positionen, Bälle, Passfolge, Wiederholungsanzahl und Rotationsprinzip." />
            </label>
          </div>
          <textarea
            rows={3}
            required
            value={ablauf}
            onChange={e => setAblauf(e.target.value)}
            placeholder="Detaillierter Aufbau, Startsignal, Passfolge und Wiederholungsanzahl..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center">
              <ListChecks className="w-3.5 h-3.5 text-sky-400 mr-1.5" />
              <span>Coachingpunkte</span>
              <FieldInfoTooltip text="Zentrale Coaching-Hinweise und Korrekturpunkte für den Torwarttrainer (z. B. Beinstellung, Handfassung, Timing)." />
            </label>
          </div>
          <textarea
            rows={3}
            value={coachingPoints}
            onChange={e => setCoachingPoints(e.target.value)}
            placeholder="z.B. Bereitstellung, Blickkontakt zum Schützen, Explosiver Abdruck, Hände hinter dem Ball..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
          />
        </div>
      </div>

      {/* 3. AGE, DURATION, KEEPER COUNT (+/- STEPPER) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-slate-800/60">
        {/* Eignung (früher Altersstufe) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center">
            <Users className="w-3.5 h-3.5 text-sky-400 mr-1.5" />
            <span>Eignung</span>
            <FieldInfoTooltip text="Mindestalter bzw. empfohlene Altersklasse für diese Übungsform." />
          </label>
          <select
            value={minAgeGroup}
            onChange={e => setMinAgeGroup(e.target.value as AgeGroup)}
            className="w-full h-[42px] bg-slate-950 border border-slate-800 rounded-2xl px-3.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {AGE_GROUPS.map(ag => (
              <option key={ag} value={ag}>{ag === 'immer' ? 'Alle Altersklassen' : `ab ${ag}`}</option>
            ))}
          </select>
        </div>

        {/* Dauer in min (früher Dauer (Minuten)) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center">
            <Clock className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            <span>Dauer in min</span>
            <FieldInfoTooltip text="Empfohlene Netto-Übungsdauer in Minuten inklusive Erklärungen und Pausen." />
          </label>
          <input
            type="number"
            min={5}
            max={60}
            step={5}
            value={durationMinutes}
            onChange={e => setDurationMinutes(parseInt(e.target.value, 10) || 15)}
            className="w-full h-[42px] bg-slate-950 border border-slate-800 rounded-2xl px-3.5 text-xs text-slate-100 font-bold font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* TW-Anzahl (früher Torhüteranzahl (Min - Max)) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center">
            <Users className="w-3.5 h-3.5 text-purple-400 mr-1.5" />
            <span>TW-Anzahl</span>
            <FieldInfoTooltip text="Optimale Mindest- und Maximalanzahl an Torhütern für einen flüssigen Ablauf und ausgewogene Belastungs-Pausen-Verhältnisse." />
          </label>
          <div className="flex items-center gap-2 h-[42px]">
            {/* Min Stepper */}
            <div className="flex-1 h-full bg-slate-950 border border-slate-800 rounded-2xl px-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMinKeepers(Math.max(1, minKeepers - 1))}
                disabled={minKeepers <= 1}
                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center font-bold transition cursor-pointer flex-shrink-0"
                title="Min. Torhüter verringern"
              >
                <Minus className="w-3 h-3" />
              </button>
              <div className="text-center px-1 flex flex-col items-center justify-center">
                <span className="text-[9px] text-slate-500 uppercase font-bold block leading-none">Min</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-100 font-mono leading-none mt-0.5">{minKeepers}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(10, minKeepers + 1);
                  setMinKeepers(next);
                  if (next > maxKeepers) setMaxKeepers(next);
                }}
                disabled={minKeepers >= 10}
                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center font-bold transition cursor-pointer flex-shrink-0"
                title="Min. Torhüter erhöhen"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Max Stepper */}
            <div className="flex-1 h-full bg-slate-950 border border-slate-800 rounded-2xl px-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(1, maxKeepers - 1);
                  setMaxKeepers(next);
                  if (next < minKeepers) setMinKeepers(next);
                }}
                disabled={maxKeepers <= 1}
                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center font-bold transition cursor-pointer flex-shrink-0"
                title="Max. Torhüter verringern"
              >
                <Minus className="w-3 h-3" />
              </button>
              <div className="text-center px-1 flex flex-col items-center justify-center">
                <span className="text-[9px] text-slate-500 uppercase font-bold block leading-none">Max</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-100 font-mono leading-none mt-0.5">{maxKeepers}</span>
              </div>
              <button
                type="button"
                onClick={() => setMaxKeepers(Math.min(10, maxKeepers + 1))}
                disabled={maxKeepers >= 10}
                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center font-bold transition cursor-pointer flex-shrink-0"
                title="Max. Torhüter erhöhen"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CATEGORY SPECIFIC FIELDS */}

      {/* 4a. WarmUp Fields (Modern Styled Container + Checkboxes for Hauptschwerpunkte) */}
      {category === 'WarmUp' && (
        <div className="relative bg-gradient-to-br from-amber-950/25 via-slate-950 to-slate-900 border border-amber-500/35 rounded-3xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                WarmUp Schwerpunkte
              </span>
            </div>
            <span className="text-[11px] text-amber-400/80 font-medium">
              Aktivierung & Vorbereitung
            </span>
          </div>

          {/* WarmUp Schwerpunkte Checkbox Tiles */}
          {onToggleWarmUpSchwerpunkt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center">
                  <span>Hauptschwerpunkte (Mehrfachauswahl per Checkbox)</span>
                  <FieldInfoTooltip text="Wähle einen oder mehrere Hauptschwerpunkte für das Aufwärmprogramm aus." />
                </label>
                <span className="text-[11px] font-bold text-amber-400">
                  {warmUpSchwerpunkte.length} ausgewählt
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WARMUP_HAUPTSCHWERPUNKTE.map(hw => {
                  const isSelected = warmUpSchwerpunkte.includes(hw);
                  return (
                    <button
                      key={hw}
                      type="button"
                      onClick={() => onToggleWarmUpSchwerpunkt(hw)}
                      className={cn(
                        "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer select-none",
                        isSelected
                          ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow-md shadow-amber-950/40"
                          : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/80"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition",
                        isSelected 
                        ? "bg-amber-500 border-amber-400 text-slate-950" 
                        : "border-slate-700 bg-slate-950"
                      )}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{hw}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dropdown Fields with (i) tooltips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center">
                <Brain className="w-3.5 h-3.5 text-amber-400 mr-1" />
                <span>Kognitiv</span>
                <FieldInfoTooltip text="Zusatzreize wie Farbsignale, Zahlenrufe, Signalbälle, akustische Signale oder Reaktionswechsel während der Torwartaktion." />
              </label>
              <select
                value={kognition}
                onChange={e => setKognition && setKognition(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
              >
                {ELEMENT_STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center">
                <Footprints className="w-3.5 h-3.5 text-amber-400 mr-1" />
                <span>Koordinativ</span>
                <FieldInfoTooltip text="Schulung einer koordinativen Fähigkeit (Stichwort DORFKRUG)" />
              </label>
              <select
                value={koordinativesElement}
                onChange={e => setKoordinativesElement && setKoordinativesElement(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
              >
                {ELEMENT_STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center">
                <Eye className="w-3.5 h-3.5 text-amber-400 mr-1" />
                <span>Visuell</span>
                <FieldInfoTooltip align="right" text="Einsatz visueller Signalgeber, Strobobrille, Blickfeldeinschränkung, Erkennen verdeckter Bälle oder peripheres Sehen." />
              </label>
              <select
                value={visuellesElement}
                onChange={e => setVisuellesElement && setVisuellesElement(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
              >
                {ELEMENT_STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center">
                <Activity className="w-3.5 h-3.5 text-amber-400 mr-1" />
                <span>athletisch</span>
                <FieldInfoTooltip 
                  align="right" 
                  text="Physischer Fokus der Übung: Schnelle Beine, Gleichgewicht, Explosivität, Stabilität oder unspezifisch." 
                />
              </label>
              <select
                value={atSchwerpunkt}
                onChange={e => setAtSchwerpunkt && setAtSchwerpunkt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer font-bold"
              >
                {ATHLETIC_FOCUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4c. Situativ / Integrativ Fields */}
      {(category === 'Situativ' || category === 'Integrativ') && onToggleSituativerSchwerpunkt && (
        <div className="p-4 bg-slate-950 rounded-2xl border border-sky-500/30 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-sky-500/20 pb-2.5">
            <span className="text-xs font-extrabold text-sky-300 uppercase tracking-wider flex items-center">
              <span>Situative Schwerpunkte</span>
              <FieldInfoTooltip text="Taktische Spielsituationen wie 1vs1, Flanken, Raumverteidigung oder Torschussverteidigung." />
            </span>
          </div>

          {/* Situative Schwerpunkte Structured Checkbox Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center">
                <span>Situative Schwerpunkte (Mehrfachauswahl per Checkbox)</span>
                <FieldInfoTooltip text="Wähle eine oder mehrere Spielsituationen aus, die in dieser Übung trainiert werden." />
              </label>
              <span className="text-[11px] font-bold text-sky-400">
                {situativeSchwerpunkte.length} ausgewählt
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {SITUATIVE_SCHWERPUNKTE.map(sp => {
                const isSelected = situativeSchwerpunkte.includes(sp);
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => onToggleSituativerSchwerpunkt(sp)}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer select-none min-h-[46px]",
                      isSelected
                        ? "bg-sky-500/20 border-sky-500 text-sky-200 shadow-md shadow-sky-950/40"
                        : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/80"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition",
                      isSelected 
                        ? "bg-sky-500 border-sky-400 text-slate-950" 
                        : "border-slate-700 bg-slate-950"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span 
                      className="line-clamp-2 leading-tight text-xs min-w-0 break-words" 
                      title={sp}
                    >
                      {sp}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {setTaktikprinzipien && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/60">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 flex items-center">
                  <span>taktische Prinzipien</span>
                  <FieldInfoTooltip text="Taktisches Verhalten, Stellungsspiel, Raumabdeckung, Entscheidungsfindung und Absicherungsprinzipien." />
                </label>
                {onOpenUserTacticsModal && (
                  <button
                    type="button"
                    onClick={onOpenUserTacticsModal}
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 bg-sky-950/70 hover:bg-sky-900/80 px-2.5 py-1 rounded-lg border border-sky-800 hover:border-sky-600 transition cursor-pointer shadow-sm"
                    title="Eigene Vorlagen für situative Schwerpunkte erstellen und anpassen"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Eigene Vorlagen</span>
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={taktikprinzipien}
                onChange={e => setTaktikprinzipien(e.target.value)}
                placeholder="z.B. Abdruckwinkel, Absicherung des 2. Pfostens..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans leading-relaxed"
              />
            </div>
          )}
        </div>
      )}

      {/* 4d. Wettkämpfe Fields */}
      {category === 'Wettkämpfe' && (
        <div className="p-4 bg-slate-950 rounded-2xl border border-rose-500/30 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-rose-400" />
              <span>Siegbedingung *</span>
            </span>
            <FieldInfoTooltip text="Regelwerk für Sieger, Verlierer und Belohnungssystem zur Erzeugung von realem Wettkampfdruck und Motivation." />
          </div>
          <input
            type="text"
            required
            value={siegbedingung}
            onChange={e => setSiegbedingung && setSiegbedingung(e.target.value)}
            placeholder="z.B. Best of 5 Runden; 1 Pkt. pro gehaltenem Ball, 2 Pkt. bei Festhalten"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-medium"
          />
        </div>
      )}

      {/* 4e. Athletik Focus */}
      {category === 'Torwart-Athletik' && setAthletikSchwerpunkt && (
        <div className="p-4 bg-slate-950 rounded-2xl border border-blue-500/30 space-y-3 shadow-xl">
          <span className="text-xs font-extrabold text-blue-300 uppercase tracking-wider block">
            Athletik-Schwerpunkt
          </span>
          <div className={cn("grid gap-3", athletikSchwerpunkt === 'Explosivität' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 flex items-center">
                <span>Physischer Schwerpunkt</span>
                <FieldInfoTooltip text="Hauptfokus der Athletikeinheit: Explosivität, Schnelle Beine, Gleichgewicht oder Stabilität." />
              </label>
              <select
                value={athletikSchwerpunkt}
                onChange={e => setAthletikSchwerpunkt(e.target.value as FocusSchwerpunkt)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {ATHLETIC_FOCUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {athletikSchwerpunkt === 'Explosivität' && setAthletischerEntwicklungsreiz && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-xs text-slate-400 flex items-center">
                  <span>Athletischer Entwicklungsreiz</span>
                  <FieldInfoTooltip text="Gezielter physiologischer Reiz: Gewebetoleranz / Exzentrik, Explosivkraft, Reaktivkraft, Agilität oder Reaktion / Wiederholbarkeit." />
                </label>
                <select
                  value={athletischerEntwicklungsreiz || ''}
                  onChange={e => setAthletischerEntwicklungsreiz(e.target.value as AthletischerEntwicklungsreiz)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">– Reiz auswählen –</option>
                  {ATHLETISCHER_ENTWICKLUNGSREIZ_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MATERIALS SELECTOR (Structured Grid with Equal-Sized Tile Boxes & Checkboxes) */}
      <div className="space-y-2.5 pt-1 border-t border-slate-800/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 flex items-center">
            <Package className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
            <span>Benötigte Materialien ({materials.length})</span>
            <FieldInfoTooltip text="Wähle alle benötigten Trainingsmaterialien per Checkbox aus. Auf dem Taktikboard platzierte Gegenstände werden automatisch synchronisiert." />
          </label>
          <span className="text-[11px] font-bold text-amber-400">
            {materials.length} ausgewählt
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {ALL_MATERIALS.map(mat => {
            const isSelected = materials.includes(mat);
            return (
              <button
                key={mat}
                type="button"
                onClick={() => toggleMaterial(mat)}
                className={cn(
                  "min-h-[46px] px-2.5 py-1.5 rounded-2xl text-[11px] sm:text-xs font-bold border transition flex items-center gap-2 cursor-pointer select-none text-left",
                  isSelected
                    ? "bg-amber-500/15 border-amber-500 text-amber-200 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/30"
                    : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition",
                  isSelected 
                    ? "bg-amber-500 border-amber-400 text-slate-950" 
                    : "border-slate-700 bg-slate-900"
                )}>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                {mat === 'Widerstandsbänder' ? (
                  <span className="leading-tight flex-1 min-w-0">
                    <span className="block">Widerstands-</span>
                    <span className="block">bänder</span>
                  </span>
                ) : (
                  <span className="leading-tight break-words flex-1 min-w-0">{mat}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. VIDEO LINK & PREVIEW (COLLAPSIBLE CARD) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition-all">
        <div
          onClick={() => setIsVideoOpen(prev => !prev)}
          className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/60 transition select-none group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex-shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">
                  Video-Link (YouTube / Vimeo / MP4)
                </span>
                {videoUrl && videoUrl.trim() ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    <span>Video hinterlegt</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-500">
                    (Optional)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Externen Videolink für die direkte Vorschau in der Übungskarte hinterlegen.
              </p>
            </div>
          </div>

          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0 group-hover:text-white transition">
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", isVideoOpen ? "rotate-180 text-rose-400" : "")} />
          </div>
        </div>

        {isVideoOpen && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950 space-y-3 animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center">
                  <span>Videolink einfügen</span>
                  <FieldInfoTooltip text="Füge einen externen Video-Link ein, um den genauen Übungsablauf direkt in der Übungskarte abspielen zu können." />
                </label>
                {videoUrl && videoUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setVideoUrl('')}
                    className="text-[10px] text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  >
                    Link entfernen
                  </button>
                )}
              </div>
              <input
                type="url"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {videoUrl && videoUrl.trim() && (
              <div className="pt-1">
                <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Video-Vorschau:</span>
                </div>
                <VideoEmbedPlayer url={videoUrl} title={title || 'Übungsvideo'} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
