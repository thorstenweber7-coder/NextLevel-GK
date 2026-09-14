import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Save, 
  Compass, 
  Info,
  Building2,
  User,
  CheckCircle2,
  Trash2,
  Copy
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { SITUATIVE_SCHWERPUNKTE } from '../../types';
import type { 
  SituativerSchwerpunkt, 
  TacticalPrinciple,
  UserProfile,
  Club
} from '../../types';
import { 
  saveUserTacticalStandard, 
  deleteTacticalPrinciple,
  getAcademyTacticalTemplate 
} from '../../firebase/firestoreService';

export const SITUATIVE_SCHWERPUNKT_META: Record<SituativerSchwerpunkt, { id: string; name: string; group: string; placeholder: string }> = {
  'Ferndistanz': {
    id: 'tact_zv_ferndistanz',
    name: 'Ferndistanz',
    group: 'Zielverteidigung',
    placeholder: '• Grundpositionierung bei Schussabgabe (Set-Position / Abdruckbereitschaft)\n• Distanzverkürzung vs. Reaktionszeit abwägen\n• Ballkontrolle: Fangen vs. gezieltes Abwehren in unkritische Zonen'
  },
  '1vs1': {
    id: 'tact_zv_1vs1',
    name: '1vs1',
    group: 'Zielverteidigung',
    placeholder: '• Wann verkürzen (Raum schließen), wann einfrieren (Blockposition halten)?\n• Hand- & Fußflächen maximal breit machen, Körperschwerpunkt tief halten\n• Kein vorzeitiges Spekulieren; langes Stehenbleiben provoziert Stürmerfehler'
  },
  'Nahdistanz': {
    id: 'tact_zv_nahdistanz',
    name: 'Nahdistanz',
    group: 'Zielverteidigung',
    placeholder: '• Reaktionsposition einnehmen (Kompaktheit vor Reichweite)\n• Blick fixiert auf Ballkontakt des Angreifers\n• Schnelle Reaktionsparaden mit Händen und Füßen'
  },
  'Flanken': {
    id: 'tact_rv_flanken',
    name: 'Flanken',
    group: 'Raumverteidigung',
    placeholder: '• Offene Grundstellung mit Blick zu Ball und Zielraum\n• Entscheidungspunkt vor der Flanke: Bleiben (Torverteidigung) oder Attackieren (Raumverteidigung)\n• Höchster Punkt beim Abfangen / Fausten anvisieren, klares akustisches Kommando'
  },
  'Early Cross': {
    id: 'tact_rv_early_cross',
    name: 'Early Cross',
    group: 'Raumverteidigung',
    placeholder: '• Schnittstelle zwischen Abwehr und Torwart frühzeitig absichern\n• Flugkurve diagonal einschätzen und mutig entgegentreten\n• Ball vor dem einlaufenden Stürmer abfangen oder klären'
  },
  'Querpass': {
    id: 'tact_rv_querpaesse',
    name: 'Querpass',
    group: 'Raumverteidigung',
    placeholder: '• Schnelles horizontales Verschieben bei Querpass des Gegners\n• Schrittfolge explosiv anpassen (Kreuzschritte / Nachstellschritte)\n• Blockstellung im Nahbereich gegen Direktabnahmen'
  },
  'Verteidigen hinter der Abwehrkette': {
    id: 'tact_rv_hinter_kette',
    name: 'Verteidigen hinter der Abwehrkette',
    group: 'Raumverteidigung',
    placeholder: '• Hohe Grundposition als Sweeper-Keeper bei aufgerückter Abwehrkette\n• Flugbälle über die Kette antizipieren und mit dem Fuß/Kopf klären\n• Kontinuierliche Abstimmung und Coaching mit den Innenverteidigern'
  }
};

export function getSchwerpunktHeading(sp: SituativerSchwerpunkt): string {
  switch (sp) {
    case 'Ferndistanz': return 'Taktische Prinzipien für die Ferndistanz';
    case 'Nahdistanz': return 'Taktische Prinzipien für die Nahdistanz';
    case '1vs1': return 'Taktische Prinzipien für das 1vs1';
    case 'Flanken': return 'Taktische Prinzipien für Flanken';
    case 'Early Cross': return 'Taktische Prinzipien für den Early Cross';
    case 'Querpass': return 'Taktische Prinzipien für den Querpass';
    case 'Verteidigen hinter der Abwehrkette': return 'Taktische Prinzipien für das Verteidigen hinter der Abwehrkette';
    default: return `Taktische Prinzipien für ${sp}`;
  }
}

export interface UserTacticalPrinciplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | any;
  tacticalPrinciples: TacticalPrinciple[];
  currentClub?: Club | null;
  initialSelectedSchwerpunkt?: SituativerSchwerpunkt | null;
  onPrinciplesSaved?: (schwerpunkt: SituativerSchwerpunkt, text: string) => void;
}

export const UserTacticalPrinciplesModal: React.FC<UserTacticalPrinciplesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  tacticalPrinciples,
  currentClub,
  initialSelectedSchwerpunkt,
  onPrinciplesSaved
}) => {
  const [activeTab, setActiveTab] = useState<SituativerSchwerpunkt>('Ferndistanz');
  const [referenceTab, setReferenceTab] = useState<'club' | 'academy'>('club');
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const effectiveUserId = currentUser?.uid || currentUser?.id || 'local_user';
  const authorName = currentUser?.displayName || currentUser?.name || currentUser?.email || 'Trainer';
  const email = currentUser?.email || '';

  const isUserPrincipleMatch = (p: TacticalPrinciple, sp: SituativerSchwerpunkt) => {
    if (p.scope !== 'user') return false;
    if (p.userId && p.userId !== effectiveUserId && p.userId !== 'local_user') return false;
    const meta = SITUATIVE_SCHWERPUNKT_META[sp];
    if (meta?.id && p.tacticId === meta.id) return true;
    const cleanSp = sp.toLowerCase();
    const pName = p.tacticName?.toLowerCase().trim();
    if (pName === cleanSp) return true;
    if (p.tacticId?.toLowerCase() === cleanSp) return true;
    if (sp === 'Querpass' && (pName === 'querpass' || pName === 'querpässe')) return true;
    return false;
  };

  // Initialize active tab when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (initialSelectedSchwerpunkt && SITUATIVE_SCHWERPUNKTE.includes(initialSelectedSchwerpunkt)) {
      setActiveTab(initialSelectedSchwerpunkt);
    } else {
      setActiveTab('Ferndistanz');
    }
    setFeedback(null);
  }, [isOpen, initialSelectedSchwerpunkt]);

  // Sync draftTexts from tacticalPrinciples
  useEffect(() => {
    if (!isOpen) return;

    setDraftTexts(prevDrafts => {
      const nextDrafts: Record<string, string> = { ...prevDrafts };
      SITUATIVE_SCHWERPUNKTE.forEach(sp => {
        const userMatch = tacticalPrinciples.find(p => isUserPrincipleMatch(p, sp));
        if (userMatch && userMatch.taktikprinzipien !== undefined) {
          nextDrafts[sp] = userMatch.taktikprinzipien;
        } else if (!(sp in nextDrafts)) {
          nextDrafts[sp] = '';
        }
      });
      return nextDrafts;
    });
  }, [isOpen, tacticalPrinciples, effectiveUserId]);

  if (!isOpen) return null;

  const currentMeta = SITUATIVE_SCHWERPUNKT_META[activeTab];
  const currentText = draftTexts[activeTab] ?? '';

  // Get active templates in hierarchy (user, club, global/seed)
  const getUserTemplateFor = (sp: SituativerSchwerpunkt) => {
    return tacticalPrinciples.find(p => isUserPrincipleMatch(p, sp));
  };

  const getClubTemplateFor = (sp: SituativerSchwerpunkt) => {
    if (!currentClub?.id) return null;
    const meta = SITUATIVE_SCHWERPUNKT_META[sp];
    const cleanSp = sp.toLowerCase();
    return tacticalPrinciples.find(p => 
      p.scope === 'club' && 
      p.clubId === currentClub.id && 
      (p.tacticId === meta.id || p.tacticName?.toLowerCase() === cleanSp || (sp === 'Querpass' && (p.tacticName?.toLowerCase() === 'querpass' || p.tacticName?.toLowerCase() === 'querpässe')))
    );
  };

  const getGlobalTemplateFor = (sp: SituativerSchwerpunkt) => {
    const meta = SITUATIVE_SCHWERPUNKT_META[sp];
    const cleanSp = sp.toLowerCase();
    const globalDoc = tacticalPrinciples.find(p => 
      p.scope === 'global' && 
      (p.tacticId === meta.id || p.tacticName?.toLowerCase() === cleanSp || (sp === 'Querpass' && (p.tacticName?.toLowerCase() === 'querpass' || p.tacticName?.toLowerCase() === 'querpässe')))
    );
    if (globalDoc && globalDoc.taktikprinzipien) {
      return globalDoc.taktikprinzipien;
    }
    return getAcademyTacticalTemplate(sp) || getAcademyTacticalTemplate(meta.id) || '';
  };

  const existingUserPrinciple = getUserTemplateFor(activeTab);
  const existingClubPrinciple = getClubTemplateFor(activeTab);
  const globalTemplateText = getGlobalTemplateFor(activeTab);

  const handleTextChange = (text: string) => {
    setDraftTexts(prev => ({
      ...prev,
      [activeTab]: text
    }));
  };

  const handleSaveActiveTemplate = async () => {
    try {
      setIsSaving(true);
      const textToSave = draftTexts[activeTab] || '';
      const meta = SITUATIVE_SCHWERPUNKT_META[activeTab];

      if (!textToSave.trim()) {
        // If text is empty and user had a doc, delete it
        if (existingUserPrinciple?.id) {
          await deleteTacticalPrinciple(existingUserPrinciple.id);
        }
        setDraftTexts(prev => ({ ...prev, [activeTab]: '' }));
        setFeedback({ type: 'success', message: `Vorlage für "${activeTab}" wurde geleert.` });
        if (onPrinciplesSaved) onPrinciplesSaved(activeTab, '');
      } else {
        await saveUserTacticalStandard(
          effectiveUserId,
          email,
          authorName,
          meta.id,
          meta.name,
          meta.group,
          textToSave.trim(),
          currentClub?.id || null,
          currentClub?.name || null
        );
        setDraftTexts(prev => ({ ...prev, [activeTab]: textToSave.trim() }));
        setFeedback({ type: 'success', message: `Deine Vorlage für "${activeTab}" wurde erfolgreich gespeichert!` });
        if (onPrinciplesSaved) onPrinciplesSaved(activeTab, textToSave.trim());
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error('Failed to save user tactical standard:', err);
      setFeedback({ type: 'error', message: 'Fehler beim Speichern der Vorlage.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdoptReferenceText = (text: string, label: string) => {
    handleTextChange(text);
    setFeedback({ type: 'success', message: `${label} für "${activeTab}" in dein Textfeld übernommen!` });
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-sky-500/30 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-300 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-950/50">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Eigene Vorlagen: Taktische Prinzipien</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Definiere deine persönlichen Standard-Prinzipien für jeden situativen Schwerpunkt.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Tabs in ONE ROW for the 7 Situative Schwerpunkte */}
        <div className="bg-slate-950/90 px-4 pt-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-thin">
            {SITUATIVE_SCHWERPUNKTE.map(sp => {
              const isActive = activeTab === sp;
              const hasUserTpl = Boolean(getUserTemplateFor(sp)?.taktikprinzipien?.trim());
              return (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setActiveTab(sp)}
                  className={cn(
                    "flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer select-none",
                    isActive
                      ? "bg-sky-500/20 border-sky-500 text-sky-200 shadow-md shadow-sky-950/50"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850"
                  )}
                >
                  {hasUserTpl && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 flex-shrink-0" title="Eigene Vorlage hinterlegt" />
                  )}
                  <span className="whitespace-nowrap">{sp}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            
            {/* LEFT COLUMN: User's Editable Template Textarea */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Deine persönliche Vorlage</span>
                  </span>
                  <h4 className="text-sm font-extrabold text-white">
                    {getSchwerpunktHeading(activeTab)}
                  </h4>
                </div>

                <div>
                  {existingUserPrinciple?.taktikprinzipien ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700 flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Vorlage aktiv</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                      Keine Vorlage
                    </span>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <textarea
                  rows={11}
                  value={currentText}
                  onChange={e => handleTextChange(e.target.value)}
                  placeholder={currentMeta.placeholder}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans leading-relaxed transition resize-none min-h-[220px]"
                />
              </div>

              {/* Left Column Bottom Action Bar */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleTextChange('')}
                  disabled={!currentText}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-900 text-slate-400 hover:text-rose-300 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                  title="Leert das Textfeld"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Leeren</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveActiveTemplate}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-black transition shadow-lg shadow-sky-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Wird gespeichert...' : 'Als meine Vorlage speichern'}</span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Reference Templates (Vereinstaktiken & Akademietaktiken) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl flex flex-col min-h-[360px]">
              
              {/* Right Column Sub-Tabs Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReferenceTab('club')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                      referenceTab === 'club'
                        ? "bg-blue-600 text-white shadow-md shadow-blue-950/50"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Vereinstaktiken</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReferenceTab('academy')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                      referenceTab === 'academy'
                        ? "bg-purple-600 text-white shadow-md shadow-purple-950/50"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Akademietaktiken</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-400">{activeTab}</span>
                </div>
              </div>

              {/* Sub-Tab Content: Vereinstaktiken */}
              {referenceTab === 'club' && (
                <div className="space-y-3 flex-1 flex flex-col animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{currentClub?.name || 'Vereins-Leitlinien'}</span>
                    </span>

                    {existingClubPrinciple?.taktikprinzipien && (
                      <span className="text-[10px] font-bold text-slate-500">
                        Zuletzt aktualisiert: {new Date(existingClubPrinciple.updatedAt).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </div>

                  {existingClubPrinciple?.taktikprinzipien ? (
                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <div className="bg-slate-900/90 border border-blue-900/30 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans shadow-inner max-h-[260px] overflow-y-auto">
                        {existingClubPrinciple.taktikprinzipien}
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAdoptReferenceText(existingClubPrinciple.taktikprinzipien, 'Vereins-Taktik')}
                          className="px-3.5 py-2 rounded-xl bg-blue-950/90 hover:bg-blue-900/90 border border-blue-700 text-blue-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-950/60 cursor-pointer active:scale-95"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>In mein Textfeld übernehmen</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                      <Building2 className="w-8 h-8 text-slate-600" />
                      <p className="text-xs font-bold text-slate-300">
                        Keine Vereinstaktiken für "{activeTab}" hinterlegt
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        {currentClub?.name 
                          ? `In der Vereinsverwaltung von "${currentClub.name}" wurden noch keine Prinzipien für diesen Schwerpunkt gespeichert.` 
                          : 'Du bist aktuell keinem Verein zugeordnet oder es sind keine Vereinsprinzipien hinterlegt.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab Content: Akademietaktiken */}
              {referenceTab === 'academy' && (
                <div className="space-y-3 flex-1 flex flex-col animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>NextLevel Akademie-Standard</span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                      Offizieller Standard
                    </span>
                  </div>

                  {globalTemplateText ? (
                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <div className="bg-slate-900/90 border border-purple-900/30 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans shadow-inner max-h-[260px] overflow-y-auto">
                        {globalTemplateText}
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAdoptReferenceText(globalTemplateText, 'Akademie-Standard')}
                          className="px-3.5 py-2 rounded-xl bg-purple-950/90 hover:bg-purple-900/90 border border-purple-700 text-purple-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-950/60 cursor-pointer active:scale-95"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>In mein Textfeld übernehmen</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                      <Sparkles className="w-8 h-8 text-slate-600" />
                      <p className="text-xs font-bold text-slate-300">
                        Keine offiziellen Akademietaktiken für "{activeTab}" definiert
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Im Master Admin wurde für diesen Schwerpunkt noch kein globaler Standard hinterlegt.
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            {feedback && (
              <span className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 animate-in fade-in duration-200",
                feedback.type === 'success' 
                  ? "bg-emerald-950 text-emerald-300 border-emerald-800" 
                  : "bg-rose-950 text-rose-300 border-rose-800"
              )}>
                {feedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                <span>{feedback.message}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
