import React, { useState, useEffect, useMemo } from 'react';
import { 
  type TrainingStructure, 
  type TrainingPhaseItem, 
  DEFAULT_TRAINING_STRUCTURE,
  PRESET_PHASE_TEMPLATES
} from '../types';
import { 
  subscribeUserStructures, 
  saveStructureToFirestore, 
  setFavoriteStructure, 
  deleteStructureFromFirestore,
  subscribeCustomPhases,
  saveCustomPhaseToFirestore,
  deleteCustomPhaseFromFirestore
} from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';
import { 
  Layers, 
  Plus, 
  Star, 
  Trash2, 
  Edit3, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown,
  Tag, 
  X,
  CalendarDays,
  Sparkles,
  Lock,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { cn } from '../utils/cn';

interface TrainingStructureViewProps {
  onNavigateToPlanner?: () => void;
}

const COLOR_OPTIONS = [
  { key: 'amber', label: 'Amber / Gelb', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
  { key: 'purple', label: 'Lila / Analytisch', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  { key: 'blue', label: 'Blau / Athletik', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  { key: 'emerald', label: 'Grün / Situativ', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' },
  { key: 'rose', label: 'Rot / Wettkampf', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/50' },
  { key: 'cyan', label: 'Cyan / Integrativ', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
  { key: 'teal', label: 'Türkis / CoolDown', bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/50' },
  { key: 'slate', label: 'Grau / Neutral', bg: 'bg-slate-700/30', text: 'text-slate-300', border: 'border-slate-600' }
];

export const TrainingStructureView: React.FC<TrainingStructureViewProps> = ({
  onNavigateToPlanner
}) => {
  const { user } = useAuth();

  const [structures, setStructures] = useState<TrainingStructure[]>([DEFAULT_TRAINING_STRUCTURE]);
  const [customPhases, setCustomPhases] = useState<TrainingPhaseItem[]>(PRESET_PHASE_TEMPLATES);

  // Collapsible Card States (default closed)
  const [isStructuresOpen, setIsStructuresOpen] = useState<boolean>(false);
  const [isPhasesOpen, setIsPhasesOpen] = useState<boolean>(false);

  // Modals & Active Edit States
  const [editingStructure, setEditingStructure] = useState<TrainingStructure | null>(null);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState<boolean>(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState<boolean>(false);

  // Loading & Modal Error States
  const [isSavingStruct, setIsSavingStruct] = useState<boolean>(false);
  const [structModalError, setStructModalError] = useState<string | null>(null);

  const [isSavingPhase, setIsSavingPhase] = useState<boolean>(false);
  const [phaseModalError, setPhaseModalError] = useState<string | null>(null);

  // Phase Filter in Overview
  const [phaseFilter, setPhaseFilter] = useState<'ALL' | 'CUSTOM' | 'PRESET'>('ALL');

  // Custom Phase Form State
  const [phaseName, setPhaseName] = useState<string>('');
  const [phaseCategoryKey, setPhaseCategoryKey] = useState<string>('WarmUp');
  const [phaseColor, setPhaseColor] = useState<string>('emerald');
  const [phaseDuration, setPhaseDuration] = useState<number>(15);
  const [phaseDescription, setPhaseDescription] = useState<string>('');

  // Structure Form State
  const [structName, setStructName] = useState<string>('');
  const [structDescription, setStructDescription] = useState<string>('');
  const [structPhases, setStructPhases] = useState<TrainingPhaseItem[]>([]);
  const [structIsFavorite, setStructIsFavorite] = useState<boolean>(false);

  // Global Page Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscriptions
  useEffect(() => {
    const unsubStructures = subscribeUserStructures(user, (data) => {
      setStructures(data);
    });
    const unsubPhases = subscribeCustomPhases(user, (data) => {
      setCustomPhases(data);
    });
    return () => {
      unsubStructures();
      unsubPhases();
    };
  }, [user]);

  // Active Favorite Structure
  const activeFavoriteStructure = useMemo(() => {
    return structures.find(s => s.isFavorite) || structures[0] || DEFAULT_TRAINING_STRUCTURE;
  }, [structures]);

  // Calculate structure total minutes
  const calculateTotalMinutes = (phases: TrainingPhaseItem[]) => {
    return phases.reduce((acc, p) => acc + (p.defaultDurationMinutes || 15), 0);
  };

  // Filtered Phases for Overview List
  const filteredPhases = useMemo(() => {
    if (phaseFilter === 'CUSTOM') {
      return customPhases.filter(p => p.isCustom);
    }
    if (phaseFilter === 'PRESET') {
      return customPhases.filter(p => !p.isCustom);
    }
    return customPhases;
  }, [customPhases, phaseFilter]);

  // --------------------------------------------------------------------------
  // STRUCTURE HANDLERS
  // --------------------------------------------------------------------------

  const handleOpenNewStructure = () => {
    setEditingStructure(null);
    setStructName('');
    setStructDescription('');
    setStructPhases([]);
    setStructIsFavorite(false);
    setStructModalError(null);
    setIsStructureModalOpen(true);
  };

  const handleOpenEditStructure = (structure: TrainingStructure) => {
    setEditingStructure(structure);
    setStructName(structure.name);
    setStructDescription(structure.description || '');
    setStructPhases([...structure.phases]);
    setStructIsFavorite(structure.isFavorite);
    setStructModalError(null);
    setIsStructureModalOpen(true);
  };

  const handleDuplicateStructure = (structure: TrainingStructure) => {
    setEditingStructure(null);
    setStructName(`${structure.name} (Kopie)`);
    setStructDescription(structure.description || '');
    setStructPhases(structure.phases.map(p => ({ ...p, id: `phase_${Date.now()}_${Math.random().toString(36).substring(2, 5)}` })));
    setStructIsFavorite(false);
    setStructModalError(null);
    setIsStructureModalOpen(true);
  };

  const handleAddAllStandardPhases = () => {
    const standardInstances = DEFAULT_TRAINING_STRUCTURE.phases.map(p => ({
      ...p,
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    }));
    setStructPhases(standardInstances);
    setStructModalError(null);
  };

  const handleClearAllPhases = () => {
    setStructPhases([]);
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setStructModalError(null);

    const nameToSave = structName.trim();
    if (!nameToSave) {
      setStructModalError('Bitte gib einen Namen für die Trainingsstruktur ein.');
      return;
    }
    if (structPhases.length === 0) {
      setStructModalError('Bitte füge mindestens 1 Phase zu deiner Struktur hinzu (klicke oben auf eine Phase).');
      return;
    }

    const payload: Partial<TrainingStructure> & { name: string; phases: TrainingPhaseItem[] } = {
      name: nameToSave,
      description: structDescription.trim(),
      phases: structPhases,
      isFavorite: structIsFavorite,
      createdAt: editingStructure?.createdAt || Date.now()
    };

    if (editingStructure?.id && editingStructure.id !== DEFAULT_TRAINING_STRUCTURE.id) {
      payload.id = editingStructure.id;
    }

    setIsSavingStruct(true);

    try {
      const savedId = await saveStructureToFirestore(payload, { uid: user?.uid || 'guest', email: user?.email || '' });
      
      // Update local state: if marked favorite, remove favorite from all other structures
      setStructures(prev => {
        const copy = prev.map(s => ({
          ...s,
          isFavorite: payload.isFavorite ? (s.id === savedId) : s.isFavorite
        }));
        const existingIdx = copy.findIndex(s => s.id === savedId);
        const newObj: TrainingStructure = { ...(payload as TrainingStructure), id: savedId };
        if (existingIdx >= 0) {
          copy[existingIdx] = newObj;
        } else {
          copy.unshift(newObj);
        }
        return copy.map(s => ({
          ...s,
          isFavorite: payload.isFavorite ? (s.id === savedId) : s.isFavorite
        }));
      });

      // Successfully saved -> close modal & return directly to overview!
      setIsStructureModalOpen(false);
      setEditingStructure(null);
      setStructName('');
      setStructDescription('');
      setStructPhases([]);
      setStructModalError(null);

      // Page feedback
      setFeedback({ type: 'success', message: `Trainingsstruktur "${nameToSave}" erfolgreich gespeichert!` });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error saving structure:', err);
      // Keep modal open so the user sees the error and doesn't lose inputs!
      if (err.message?.includes('permission') || err.code === 'permission-denied') {
        setStructModalError('Berechtigungsfehler in Firestore: Bitte stelle sicher, dass die Firestore-Regeln in der Firebase-Konsole veröffentlicht wurden.');
      } else {
        setStructModalError(`Fehler beim Speichern: ${err.message || 'Unbekannter Fehler. Bitte prüfe deine Internetverbindung.'}`);
      }
    } finally {
      setIsSavingStruct(false);
    }
  };

  const handleSetFavorite = async (structureId: string) => {
    // Optimistically ensure ONLY the clicked structure is marked favorite
    setStructures(prev => prev.map(s => ({
      ...s,
      isFavorite: s.id === structureId
    })));

    try {
      await setFavoriteStructure(structureId, { uid: user?.uid || 'guest', email: user?.email || '' });
      setFeedback({ type: 'success', message: 'Trainingsstruktur als aktiver Favorit für den Planer gesetzt ⭐' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('Error setting favorite:', err);
    }
  };

  const handleDeleteStructure = async (structureId: string, name: string) => {
    if (structureId === DEFAULT_TRAINING_STRUCTURE.id) {
      alert('Die Standard-Trainingsstruktur kann nicht gelöscht werden.');
      return;
    }
    if (window.confirm(`Möchtest du die Trainingsstruktur "${name}" wirklich löschen?`)) {
      try {
        await deleteStructureFromFirestore(structureId, { uid: user?.uid || 'guest' });
        setFeedback({ type: 'success', message: 'Trainingsstruktur gelöscht.' });
        setTimeout(() => setFeedback(null), 3000);
      } catch (err: any) {
        alert(err.message || 'Fehler beim Löschen.');
      }
    }
  };

  const movePhase = (index: number, direction: 'up' | 'down') => {
    const newPhases = [...structPhases];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newPhases.length) return;
    const temp = newPhases[index];
    newPhases[index] = newPhases[targetIdx];
    newPhases[targetIdx] = temp;
    setStructPhases(newPhases);
  };

  const removePhaseFromStructure = (index: number) => {
    setStructPhases(prev => prev.filter((_, i) => i !== index));
  };

  const addPhaseToStructure = (tpl: TrainingPhaseItem) => {
    const newInstance: TrainingPhaseItem = {
      ...tpl,
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    setStructPhases(prev => [...prev, newInstance]);
    setStructModalError(null);
  };

  const updatePhaseDuration = (index: number, minutes: number) => {
    setStructPhases(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], defaultDurationMinutes: Math.max(1, minutes) };
      return copy;
    });
  };

  // --------------------------------------------------------------------------
  // CUSTOM PHASE HANDLERS (Create, Edit, Delete with Confirmation)
  // --------------------------------------------------------------------------

  const handleOpenCreatePhase = () => {
    setEditingPhaseId(null);
    setPhaseName('');
    setPhaseCategoryKey('WarmUp');
    setPhaseColor('emerald');
    setPhaseDuration(15);
    setPhaseDescription('');
    setPhaseModalError(null);
    setIsPhaseModalOpen(true);
  };

  const handleOpenEditPhase = (phase: TrainingPhaseItem) => {
    setEditingPhaseId(phase.id);
    setPhaseName(phase.name);
    setPhaseCategoryKey(phase.categoryKey || 'WarmUp');
    setPhaseColor(phase.color || 'emerald');
    setPhaseDuration(phase.defaultDurationMinutes || 15);
    setPhaseDescription(phase.description || '');
    setPhaseModalError(null);
    setIsPhaseModalOpen(true);
  };

  const handleDeleteCustomPhase = async (phase: TrainingPhaseItem) => {
    if (!phase.isCustom && PRESET_PHASE_TEMPLATES.some(p => p.id === phase.id)) {
      alert('Vordefinierte Akademie-Standardphasen können nicht gelöscht werden.');
      return;
    }
    if (window.confirm(`Möchtest du die Trainingsphase "${phase.name}" wirklich unwiderruflich löschen?`)) {
      try {
        await deleteCustomPhaseFromFirestore(phase.id, { uid: user?.uid || 'guest' });
        setFeedback({ type: 'success', message: `Trainingsphase "${phase.name}" wurde erfolgreich gelöscht.` });
        setTimeout(() => setFeedback(null), 4000);
      } catch (err: any) {
        console.error('Error deleting phase:', err);
        setFeedback({ type: 'error', message: `Fehler beim Löschen: ${err.message || 'Unbekannter Fehler'}` });
      }
    }
  };

  const handleSaveCustomPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhaseModalError(null);

    const nameToSave = phaseName.trim();
    if (!nameToSave) {
      setPhaseModalError('Bitte gib einen Namen für die Trainingsphase ein.');
      return;
    }

    const isEdit = Boolean(editingPhaseId);
    const targetId = editingPhaseId || undefined;

    setIsSavingPhase(true);

    try {
      await saveCustomPhaseToFirestore(
        {
          id: targetId,
          name: nameToSave,
          categoryKey: phaseCategoryKey,
          color: phaseColor,
          defaultDurationMinutes: Number(phaseDuration) || 15,
          description: phaseDescription.trim(),
          isCustom: true
        },
        { uid: user?.uid || 'guest', email: user?.email || '' }
      );

      // Succeeded! Close modal & reset
      setIsPhaseModalOpen(false);
      setEditingPhaseId(null);
      setPhaseName('');
      setPhaseDescription('');
      setPhaseModalError(null);

      // Confirmation notification in overview
      setFeedback({ 
        type: 'success', 
        message: isEdit 
          ? `Trainingsphase "${nameToSave}" wurde erfolgreich aktualisiert!` 
          : `Trainingsphase "${nameToSave}" wurde erfolgreich erstellt!` 
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error saving custom phase:', err);
      if (err.message?.includes('permission') || err.code === 'permission-denied') {
        setPhaseModalError('Berechtigungsfehler in Firestore: Bitte stelle sicher, dass die neuen Sicherheitsregeln in der Firebase-Konsole veröffentlicht wurden.');
      } else {
        setPhaseModalError(`Fehler beim Speichern: ${err.message || 'Unbekannter Fehler. Bitte Internetverbindung prüfen.'}`);
      }
    } finally {
      setIsSavingPhase(false);
    }
  };

  const getColorClass = (colorKey?: string) => {
    const found = COLOR_OPTIONS.find(c => c.key === colorKey);
    if (found) return found;
    return COLOR_OPTIONS[0];
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Feedback Toast Notification */}
      {feedback && (
        <div className={cn(
          "p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-bold shadow-xl animate-in fade-in transition border-2",
          feedback.type === 'success' 
            ? "bg-emerald-950/95 text-emerald-200 border-emerald-500 shadow-emerald-950/80" 
            : "bg-rose-950/95 text-rose-200 border-rose-500 shadow-rose-950/80"
        )}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className="text-sm">{feedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-wider uppercase">
              <Layers className="w-4 h-4" />
              <span>NextLevel Methodik & Struktur</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Individuelle Trainingsstrukturen & Phasen
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Erstelle deine maßgeschneiderten Trainingsstrukturen mit völlig frei wählbaren Trainingsphasen. 
              Die als <strong>Favorit (⭐)</strong> markierte Struktur wird automatisch im Trainingsplaner links für den Ablauf aktiviert.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenCreatePhase}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 flex items-center gap-2 transition active:scale-95 shadow"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Eigene Phase erstellen</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewStructure}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Neue Trainingsstruktur anlegen</span>
            </button>
          </div>
        </div>

        {/* ACTIVE FAVORITE BANNER */}
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-900 border-2 border-emerald-500/60 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <Star className="w-48 h-48 text-emerald-400 fill-emerald-400" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow">
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Aktiver Favorit im Trainingsplaner</span>
                </span>
                <span className="text-xs text-slate-400 font-bold bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gesamtdauer: ~{calculateTotalMinutes(activeFavoriteStructure.phases)} Min.</span>
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-white">
                {activeFavoriteStructure.name}
              </h2>
              {activeFavoriteStructure.description && (
                <p className="text-xs text-slate-300">
                  {activeFavoriteStructure.description}
                </p>
              )}
            </div>

            {onNavigateToPlanner && (
              <button
                type="button"
                onClick={onNavigateToPlanner}
                className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 transition shadow-md self-start lg:self-center"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Direkt zum Trainingsplaner</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Flow of Active Phases */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Phasenablauf dieser Struktur ({activeFavoriteStructure.phases.length} Phasen):
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {activeFavoriteStructure.phases.map((p, idx) => {
                const color = getColorClass(p.color);
                return (
                  <React.Fragment key={p.id || idx}>
                    <div className={cn(
                      "px-3.5 py-2 rounded-xl border flex-shrink-0 flex items-center gap-2.5 text-xs font-bold shadow-sm",
                      color.bg, color.text, color.border
                    )}>
                      <span className="w-5 h-5 rounded-full bg-slate-950 text-[11px] flex items-center justify-center font-black">
                        {idx + 1}
                      </span>
                      <div className="text-left">
                        <span className="block font-extrabold">{p.name}</span>
                        <span className="text-[10px] opacity-80 font-normal">{p.defaultDurationMinutes || 15} Min.</span>
                      </div>
                    </div>
                    {idx < activeFavoriteStructure.phases.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VERFÜGBARE TRAININGSSTRUKTUREN (COLLAPSIBLE CARD)                     */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => setIsStructuresOpen(prev => !prev)}
          className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/50 transition select-none group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Verfügbare Trainingsstrukturen
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                  {structures.length} {structures.length === 1 ? 'Struktur' : 'Strukturen'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Klicke auf das Stern-Symbol ⭐, um eine Struktur als aktiven Favoriten für deinen Planer festzulegen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0 group-hover:text-white transition">
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isStructuresOpen ? "rotate-180 text-emerald-400" : "")} />
            </div>
          </div>
        </div>

        {/* Accordion Content */}
        {isStructuresOpen && (
          <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-950/40 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {structures.map((struct) => {
                const isFav = struct.id === activeFavoriteStructure.id;
                const totalMins = calculateTotalMinutes(struct.phases);
                const isDefault = struct.id === DEFAULT_TRAINING_STRUCTURE.id || struct.isDefault;

                return (
                  <div
                    key={struct.id}
                    className={cn(
                      "bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-lg transition relative group",
                      isFav
                        ? "border-emerald-500/80 bg-slate-900/95 ring-1 ring-emerald-500/40"
                        : "border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-white">
                            {struct.name}
                          </h3>
                          {isDefault && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-950 text-sky-300 border border-sky-800">
                              Akademie-Standard
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>{totalMins} Min.</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {struct.description || 'Individuelle Torwart-Trainingsstruktur mit flexiblen Phasen.'}
                        </p>
                      </div>

                      {/* Favorite Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleSetFavorite(struct.id)}
                        title={isFav ? "Aktiver Favorit" : "Als aktiven Favoriten für den Planer festlegen"}
                        className={cn(
                          "p-2.5 rounded-xl border transition flex items-center justify-center flex-shrink-0",
                          isFav
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/60 font-bold"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-amber-400 hover:border-amber-500/50"
                        )}
                      >
                        <Star className={cn("w-4 h-4", isFav ? "fill-slate-950" : "")} />
                      </button>
                    </div>

                    {/* Phase Sequence Flow Badges */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Phasen ({struct.phases.length}):
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {struct.phases.map((p, pIdx) => {
                          const col = getColorClass(p.color);
                          return (
                            <span
                              key={p.id || pIdx}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5",
                                col.bg, col.text, col.border
                              )}
                            >
                              <span className="text-[9px] opacity-70 font-mono">#{pIdx + 1}</span>
                              <span>{p.name}</span>
                              <span className="text-[10px] opacity-80">({p.defaultDurationMinutes || 15}m)</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditStructure(struct)}
                          className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold flex items-center gap-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Bearbeiten</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateStructure(struct)}
                          className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold flex items-center gap-1.5 transition"
                        >
                          <Copy className="w-3.5 h-3.5 text-purple-400" />
                          <span>Duplizieren</span>
                        </button>
                      </div>

                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStructure(struct.id, struct.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition border border-transparent hover:border-rose-900"
                          title="Struktur löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. VERFÜGBARE TRAININGSPHASEN (COLLAPSIBLE CARD)                          */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => setIsPhasesOpen(prev => !prev)}
          className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/50 transition select-none group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0 shadow-inner">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Verfügbare Trainingsphasen
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                  {customPhases.length} Phasen
                </span>
                {customPhases.some(p => p.isCustom) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    {customPhases.filter(p => p.isCustom).length} Eigene
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Verwalte deine eigenen Phasen oder erstelle neue Bausteine für deine Trainingsstrukturen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0 group-hover:text-white transition">
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isPhasesOpen ? "rotate-180 text-emerald-400" : "")} />
            </div>
          </div>
        </div>

        {/* Accordion Content */}
        {isPhasesOpen && (
          <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-950/40 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPhaseFilter('ALL'); }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition",
                      phaseFilter === 'ALL' ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Alle ({customPhases.length})
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPhaseFilter('CUSTOM'); }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1",
                      phaseFilter === 'CUSTOM' ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Eigene ({customPhases.filter(p => p.isCustom).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPhaseFilter('PRESET'); }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition",
                      phaseFilter === 'PRESET' ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Standard ({customPhases.filter(p => !p.isCustom).length})
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenCreatePhase(); }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow active:scale-95 flex-shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Neue Phase</span>
              </button>
            </div>

            {/* Phase Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPhases.map((phase) => {
                const col = getColorClass(phase.color);
                const isCustom = phase.isCustom === true;

                return (
                  <div
                    key={phase.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 transition shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("px-2.5 py-1 rounded-lg text-xs font-extrabold border", col.bg, col.text, col.border)}>
                            {phase.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>{phase.defaultDurationMinutes || 15} Min.</span>
                          </span>
                        </div>

                        {isCustom ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Eigene Phase
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Standard</span>
                          </span>
                        )}
                      </div>

                      {phase.categoryKey && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <span>Kategorie-Bezug:</span>
                          <span className="text-slate-200 font-bold">{phase.categoryKey}</span>
                        </div>
                      )}

                      {phase.description && (
                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                          {phase.description}
                        </p>
                      )}
                    </div>

                    {/* Actions: Edit & Delete for Custom Phases */}
                    <div className="pt-3 border-t border-slate-900 flex items-center justify-between gap-2 text-xs">
                      {isCustom ? (
                        <div className="flex items-center gap-2 w-full justify-between">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPhase(phase)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold flex items-center gap-1.5 transition hover:border-slate-700"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                            <span>Phase bearbeiten</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCustomPhase(phase)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition border border-transparent hover:border-rose-900"
                            title="Eigene Phase löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">
                          Fester Akademie-Standardbaustein
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT STRUCTURE (100% Flexible) */}
      {/* ========================================================================= */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-extrabold text-white">
                  {editingStructure ? 'Trainingsstruktur bearbeiten' : 'Neue Trainingsstruktur erstellen'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStructureModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="p-6 space-y-6">
              {/* Visible Modal Error Banner */}
              {structModalError && (
                <div className="p-4 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-start gap-3 shadow-lg animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block font-black text-rose-100">Hinweis zum Speichern:</span>
                    <span className="leading-relaxed">{structModalError}</span>
                  </div>
                </div>
              )}

              {/* Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Name der Trainingsstruktur *
                  </label>
                  <input
                    type="text"
                    required
                    value={structName}
                    onChange={e => setStructName(e.target.value)}
                    placeholder="z.B. Spieltag -1 Aktivierung / 90-Minuten-Intensiv"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Beschreibung (Optional)
                  </label>
                  <input
                    type="text"
                    value={structDescription}
                    onChange={e => setStructDescription(e.target.value)}
                    placeholder="z.B. Schnelle Spritzigkeit und Reaktion vor dem Spiel"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Add Phase Toolbar */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Beliebige Phase per Klick hinzufügen:</span>
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddAllStandardPhases}
                      className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition flex items-center gap-1"
                      title="Alle 5 Akademie-Standardphasen einfügen"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Standard-5 einfügen</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPhases}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-400 transition"
                      title="Alle Phasen aus dem Editor entfernen"
                    >
                      Alle leeren
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {customPhases.map((tpl) => {
                    const col = getColorClass(tpl.color);
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => addPhaseToStructure(tpl)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 hover:scale-105 active:scale-95 shadow-sm",
                          col.bg, col.text, col.border
                        )}
                        title={`Klicken, um "${tpl.name}" hinzuzufügen`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{tpl.name}</span>
                        <span className="text-[10px] opacity-80">({tpl.defaultDurationMinutes || 15}m)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phasen-Ablauf Liste (Sortierbar, Dauer konfigurierbar, völlig frei) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Deine ausgewählten Phasen ({structPhases.length} Phasen, Gesamtdauer: ~{calculateTotalMinutes(structPhases)} Min.)
                  </span>
                  <span className="text-[11px] text-slate-500">Beliebig anordnen oder löschen</span>
                </div>

                {structPhases.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs space-y-2">
                    <p className="font-bold text-slate-300">Noch keine Phasen in dieser Struktur ausgewählt.</p>
                    <p className="text-[11px] text-slate-500">
                      Klicke oben auf die gewünschten Phasen-Buttons, um deine individuelle Struktur völlig frei zusammenzustellen.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {structPhases.map((p, idx) => {
                      const col = getColorClass(p.color);
                      return (
                        <div
                          key={p.id || idx}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                        >
                          {/* Order Number & Name */}
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-xs font-black text-slate-300 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={cn("px-2 py-0.5 rounded text-xs font-bold border", col.bg, col.text, col.border)}>
                                  {p.name}
                                </span>
                                {p.isCustom && (
                                  <span className="text-[10px] text-amber-400 font-semibold">(Eigene Phase)</span>
                                )}
                              </div>
                              {p.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{p.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Duration Input & Controls */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <input
                                type="number"
                                min="1"
                                max="180"
                                value={p.defaultDurationMinutes || 15}
                                onChange={e => updatePhaseDuration(idx, Number(e.target.value))}
                                className="w-12 bg-transparent text-xs font-bold text-center text-slate-200 focus:outline-none focus:text-emerald-400"
                              />
                              <span className="text-[10px] text-slate-500 font-bold">Min</span>
                            </div>

                            {/* Move Up/Down Buttons */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => movePhase(idx, 'up')}
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition border border-slate-800"
                                title="Nach oben verschieben"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === structPhases.length - 1}
                                onClick={() => movePhase(idx, 'down')}
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition border border-slate-800"
                                title="Nach unten verschieben"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Remove Phase */}
                            <button
                              type="button"
                              onClick={() => removePhaseFromStructure(idx)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition ml-1"
                              title="Phase entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Set as Favorite Checkbox */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star className={cn("w-4 h-4", structIsFavorite ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Als aktiven Favoriten festlegen</span>
                    <span className="text-[11px] text-slate-500">Diese Struktur wird sofort im Trainingsplaner links angezeigt.</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={structIsFavorite}
                    onChange={e => setStructIsFavorite(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStructureModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSavingStruct}
                  className="px-6 py-2.5 rounded-xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingStruct ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <span>Trainingsstruktur speichern</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT CUSTOM PHASE */}
      {/* ========================================================================= */}
      {isPhaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-extrabold text-white">
                  {editingPhaseId ? 'Eigene Trainingsphase bearbeiten' : 'Neue Trainingsphase erstellen'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPhaseModalOpen(false);
                  setEditingPhaseId(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomPhase} className="p-6 space-y-4 text-xs">
              {/* Visible Modal Error Banner */}
              {phaseModalError && (
                <div className="p-3.5 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-start gap-2.5 shadow-lg animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="block font-black text-rose-100">Hinweis zum Speichern:</span>
                    <span className="leading-relaxed">{phaseModalError}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Name der Phase *
                </label>
                <input
                  type="text"
                  required
                  value={phaseName}
                  onChange={e => setPhaseName(e.target.value)}
                  placeholder="z.B. Passspiel & Ballkontrolle / Video-Analyse / 1vs1 Vertiefung"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Standarddauer (Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={phaseDuration}
                    onChange={e => setPhaseDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-bold text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Kategorie-Bezug
                  </label>
                  <select
                    value={phaseCategoryKey}
                    onChange={e => setPhaseCategoryKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="WarmUp">WarmUp</option>
                    <option value="Analytisch">Analytisch</option>
                    <option value="Torwart-Athletik">Torwart-Athletik</option>
                    <option value="Situativ">Situativ</option>
                    <option value="Wettkämpfe">Wettkämpfe</option>
                    <option value="Integrativ">Integrativ</option>
                    <option value="CoolDown">CoolDown</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Farbschema
                  </label>
                  <select
                    value={phaseColor}
                    onChange={e => setPhaseColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {COLOR_OPTIONS.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Beschreibung / Trainingsfokus
                </label>
                <textarea
                  rows={2}
                  value={phaseDescription}
                  onChange={e => setPhaseDescription(e.target.value)}
                  placeholder="z.B. Schwerpunkt auf beidfüßiges Flachpassspiel und Drucksituationen"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsPhaseModalOpen(false);
                    setEditingPhaseId(null);
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-slate-200"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSavingPhase}
                  className="px-5 py-2 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPhase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <span>{editingPhaseId ? 'Änderungen speichern' : 'Phase erstellen & speichern'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
