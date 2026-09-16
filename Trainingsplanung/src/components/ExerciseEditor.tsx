import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { 
  Exercise, 
  ExerciseCategory, 
  MaterialType, 
  SituativerSchwerpunkt,
  TacticalCanvasData,
  FocusSchwerpunkt,
  MethodischeReiheStufen,
  ToolType,
  AgeGroup,
  MethodicalProgression,
  TacticalPrinciple,
  AthletischerEntwicklungsreiz
} from '../types';
import { SKILL_DEFINITIONS } from '../types';
import { type TacticalCanvasRef } from './TacticalCanvas';
import { 
  saveExerciseToFirestore,
  subscribeMethodicalProgressions,
  getAcademyTemplate,
  saveUserTechniqueStandard,
  subscribeTacticalPrinciples,
  subscribeExercises
} from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';
import { 
  Save, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  Globe,
  Info,
  Copy,
  Building2,
  BookOpen
} from 'lucide-react';
import { cn } from '../utils/cn';
import { ExerciseCanvasStage } from './editor/ExerciseCanvasStage';
import { TacticalPrinciplesModal } from './editor/TacticalPrinciplesModal';
import { UserTacticalPrinciplesModal, SITUATIVE_SCHWERPUNKT_META } from './editor/UserTacticalPrinciplesModal';
import { ExerciseTemplatesModal } from './editor/ExerciseTemplatesModal';
import { ExerciseMetaForm } from './editor/ExerciseMetaForm';

const TOOL_TO_MATERIAL_MAP: Partial<Record<ToolType, MaterialType>> = {
  cone: 'Hütchen',
  dummy: 'Dummies',
  hurdle: 'Hürden',
  pole: 'Stangen',
  blazepod: 'Blazepods',
  board: 'Shield',
  rebounder: 'Rebounder',
  bench: 'Bank',
  plyobox: 'Plyobox',
  medicine_ball: 'Medizinball',
  square: 'Quadrate',
  resistance_band: 'Widerstandsbänder',
  jumping_rope: 'Sprungseile'
};

const MATERIAL_TO_TOOL_MAP: Partial<Record<MaterialType, ToolType>> = {
  Hütchen: 'cone',
  Dummies: 'dummy',
  Hürden: 'hurdle',
  Stangen: 'pole',
  Blazepods: 'blazepod',
  Shield: 'board',
  Rebounder: 'rebounder',
  Bank: 'bench',
  Plyobox: 'plyobox',
  Medizinball: 'medicine_ball',
  Quadrate: 'square',
  Widerstandsbänder: 'resistance_band',
  Sprungseile: 'jumping_rope'
};

interface ExerciseEditorProps {
  initialExercise?: Exercise | null;
  onSaved?: (savedExercise: Exercise) => void;
  onCancel?: () => void;
}

export const ExerciseEditor: React.FC<ExerciseEditorProps> = ({
  initialExercise,
  onSaved,
  onCancel
}) => {
  const { user, isAdmin, isMasterAdmin, isClubAdmin, isClubCoach, clubId, clubName, currentClub, favoriteExerciseIds } = useAuth();
  const canvasRef = useRef<TacticalCanvasRef | null>(null);

  // Template Modal State & Exercises List
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [isLoadedAsTemplate, setIsLoadedAsTemplate] = useState<boolean>(false);

  // Core Form State
  const [title, setTitle] = useState<string>(initialExercise?.title || '');
  const [category, setCategory] = useState<ExerciseCategory>(initialExercise?.category || 'WarmUp');
  const [ablauf, setAblauf] = useState<string>(initialExercise?.ablauf || '');
  const [minKeepers, setMinKeepers] = useState<number>(initialExercise?.minKeepers || 1);
  const [maxKeepers, setMaxKeepers] = useState<number>(initialExercise?.maxKeepers || 4);
  const [minAgeGroup, setMinAgeGroup] = useState<AgeGroup>(initialExercise?.minAgeGroup || 'immer');
  const [durationMinutes, setDurationMinutes] = useState<number>(initialExercise?.durationMinutes || 15);
  const [materials, setMaterials] = useState<MaterialType[]>(initialExercise?.materials || []);
  const [videoUrl, setVideoUrl] = useState<string>(initialExercise?.videoUrl || '');
  const [coachingPoints, setCoachingPoints] = useState<string>(initialExercise?.coachingPoints || '');
  const [isPublished, setIsPublished] = useState<boolean>(initialExercise?.isPublished ?? false);
  const [isClubPublished, setIsClubPublished] = useState<boolean>(initialExercise?.isClubPublished ?? false);

  // Methodical Progressions State (Standards for Analytisch)
  const [progressions, setProgressions] = useState<MethodicalProgression[]>([]);
  const [, setActiveProgressionSource] = useState<'user' | 'club' | 'global' | 'default' | 'custom' | null>(null);
  const [activeTechnikTemplateId, setActiveTechnikTemplateId] = useState<string | null>(null);
  const [isSavingUserTechnique, setIsSavingUserTechnique] = useState<boolean>(false);

  // Tactical Principles State (Standards for Situativ)
  const [tacticalPrinciples, setTacticalPrinciples] = useState<TacticalPrinciple[]>([]);
  const [includeTaktikprinzipienInPdf, setIncludeTaktikprinzipienInPdf] = useState<boolean>(
    initialExercise?.includeTaktikprinzipienInPdf ?? true
  );
  const [isTacticalModalOpen, setIsTacticalModalOpen] = useState<boolean>(false);
  const [isUserTacticsModalOpen, setIsUserTacticsModalOpen] = useState<boolean>(false);

  // Category-specific fields: WarmUp
  const [atSchwerpunkt, setAtSchwerpunkt] = useState<string>(
    (initialExercise?.atSchwerpunkt as string) || 'unspezifisch'
  );
  const [kognition, setKognition] = useState<string>(
    (initialExercise?.kognition as string) || 'nicht enthalten'
  );
  const [koordinativesElement, setKoordinativesElement] = useState<string>(
    (initialExercise?.koordinativesElement as string) || 'nicht enthalten'
  );
  const [visuellesElement, setVisuellesElement] = useState<string>(
    (initialExercise?.visuellesElement as string) || 'nicht enthalten'
  );
  const [warmUpSchwerpunkte, setWarmUpSchwerpunkte] = useState<string[]>(
    initialExercise?.warmUpSchwerpunkte || []
  );

  // Category-specific fields: Torwart-Athletik
  const [athletikSchwerpunkt, setAthletikSchwerpunkt] = useState<FocusSchwerpunkt>(
    (initialExercise?.athletikSchwerpunkt as FocusSchwerpunkt) || 'Explosivität'
  );
  const [athletischerEntwicklungsreiz, setAthletischerEntwicklungsreiz] = useState<AthletischerEntwicklungsreiz | string>(
    initialExercise?.athletischerEntwicklungsreiz || ''
  );

  // Category-specific fields: Analytisch
  const [technik, setTechnik] = useState<string>(initialExercise?.technik || '');
  const [technikprinzipien, setTechnikprinzipien] = useState<string>(initialExercise?.technikprinzipien || '');
  const [methodikStufen, setMethodikStufen] = useState<MethodischeReiheStufen>(
    initialExercise?.methodischeReiheStufen || {
      stufe1: '',
      stufe2: '',
      stufe3: '',
      stufe4: '',
      stufe5: '',
      stufe6: ''
    }
  );

  // Category-specific fields: Situativ & Wettkämpfe
  const [situativeSchwerpunkte, setSituativeSchwerpunkte] = useState<SituativerSchwerpunkt[]>(
    initialExercise?.situativeSchwerpunkte || 
    (initialExercise?.situativerSchwerpunkt ? [initialExercise.situativerSchwerpunkt] : [])
  );
  const [taktikprinzipien, setTaktikprinzipien] = useState<string>(initialExercise?.taktikprinzipien || '');
  const [siegbedingung, setSiegbedingung] = useState<string>(initialExercise?.siegbedingung || '');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe to Methodical Progressions & Tactical Principles
  useEffect(() => {
    const unsubMethodik = subscribeMethodicalProgressions(
      (data) => setProgressions(data),
      console.warn
    );
    const unsubTaktik = subscribeTacticalPrinciples(
      (data) => setTacticalPrinciples(data),
      console.warn
    );
    return () => {
      unsubMethodik();
      unsubTaktik();
    };
  }, []);

  // Subscribe to all exercises for Templates Modal
  useEffect(() => {
    const unsubExercises = subscribeExercises(
      user,
      isAdmin,
      (data) => setAllExercises(data),
      console.warn,
      isClubAdmin,
      clubId
    );
    return () => {
      unsubExercises();
    };
  }, [user, isAdmin, isClubAdmin, clubId]);

  // Handle loading an exercise as a template
  const handleLoadTemplate = (templateExercise: Exercise) => {
    setTitle(templateExercise.title || '');
    setCategory(templateExercise.category || 'WarmUp');
    setAblauf(templateExercise.ablauf || '');
    setMinKeepers(templateExercise.minKeepers ?? 1);
    setMaxKeepers(templateExercise.maxKeepers ?? 4);
    setMinAgeGroup(templateExercise.minAgeGroup || 'immer');
    setDurationMinutes(templateExercise.durationMinutes || 15);
    setMaterials(templateExercise.materials || []);
    setVideoUrl(templateExercise.videoUrl || '');
    setCoachingPoints(templateExercise.coachingPoints || '');
    setIsPublished(false);
    setIsClubPublished(false);

    // WarmUp
    setAtSchwerpunkt((templateExercise.atSchwerpunkt as string) || 'unspezifisch');
    setKognition((templateExercise.kognition as string) || 'nicht enthalten');
    setKoordinativesElement((templateExercise.koordinativesElement as string) || 'nicht enthalten');
    setVisuellesElement((templateExercise.visuellesElement as string) || 'nicht enthalten');
    setWarmUpSchwerpunkte(templateExercise.warmUpSchwerpunkte || []);

    // Torwart-Athletik
    setAthletikSchwerpunkt((templateExercise.athletikSchwerpunkt as FocusSchwerpunkt) || 'Explosivität');
    setAthletischerEntwicklungsreiz(templateExercise.athletischerEntwicklungsreiz || '');

    // Analytisch
    setTechnik(templateExercise.technik || '');
    setTechnikprinzipien(templateExercise.technikprinzipien || '');
    setMethodikStufen(templateExercise.methodischeReiheStufen || {
      stufe1: '',
      stufe2: '',
      stufe3: '',
      stufe4: '',
      stufe5: '',
      stufe6: ''
    });

    // Situativ & Integrativ & Wettkämpfe
    const situative = templateExercise.situativeSchwerpunkte || (templateExercise.situativerSchwerpunkt ? [templateExercise.situativerSchwerpunkt] : []);
    setSituativeSchwerpunkte(situative);
    setTaktikprinzipien(templateExercise.taktikprinzipien || '');
    setIncludeTaktikprinzipienInPdf(templateExercise.includeTaktikprinzipienInPdf ?? true);
    setSiegbedingung(templateExercise.siegbedingung || '');

    // Canvas
    if (templateExercise.canvasData && canvasRef.current) {
      canvasRef.current.loadCanvasData(templateExercise.canvasData);
    } else if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }

    setIsLoadedAsTemplate(true);
    setFeedback({
      type: 'success',
      message: `Vorlage „${templateExercise.title}“ erfolgreich in den Editor geladen. (Wird als neue Übung gespeichert)`
    });
  };

  // Overwrite Permissions Calculation
  const canOverwriteExercise = useMemo(() => {
    if (!initialExercise || !initialExercise.id) return true;

    if (initialExercise.isPublished) {
      return isMasterAdmin;
    }

    if (initialExercise.clubId) {
      if (isMasterAdmin) return true;
      if (isClubAdmin && initialExercise.clubId === clubId) return true;
      if (user && initialExercise.ownerId === user.uid) return true;
      return false;
    }

    if (user && initialExercise.ownerId === user.uid) {
      return true;
    }

    if (isMasterAdmin) return true;

    // Local / unowned / migrated exercises can be edited and saved
    if (!initialExercise.ownerId || initialExercise.ownerId === 'anonymous' || !user) {
      return true;
    }

    return true;
  }, [initialExercise, isMasterAdmin, isClubAdmin, clubId, user]);

  // Methodical Progression Helper
  const getBestProgressionForTechnique = (techName: string) => {
    if (!techName) return null;
    const cleanTech = techName.trim().toLowerCase();

    // Priority 1: User standard
    if (user?.uid) {
      const userMatch = progressions.find(p => 
        p.scope === 'user' && 
        p.userId === user.uid && 
        (p.techniqueName.toLowerCase().trim() === cleanTech || p.techniqueId.toLowerCase() === cleanTech)
      );
      if (userMatch) return { progression: userMatch, source: 'user' as const };
    }

    // Priority 2: Club standard
    const activeClubId = currentClub?.id || clubId;
    if (activeClubId) {
      const clubMatch = progressions.find(p => 
        p.scope === 'club' && 
        p.clubId === activeClubId && 
        (p.techniqueName.toLowerCase().trim() === cleanTech || p.techniqueId.toLowerCase() === cleanTech)
      );
      if (clubMatch) return { progression: clubMatch, source: 'club' as const };
    }

    // Priority 3: Academy / Global standard
    const globalMatch = progressions.find(p => 
      p.scope === 'global' && 
      (p.techniqueName.toLowerCase().trim() === cleanTech || p.techniqueId.toLowerCase() === cleanTech)
    );
    if (globalMatch) return { progression: globalMatch, source: 'global' as const };

    const defaultTemplate = getAcademyTemplate(techName);
    if (defaultTemplate) {
      return { 
        progression: {
          id: `default_${techName}`,
          techniqueId: techName,
          techniqueName: techName,
          stufen: defaultTemplate.stufen,
          technikprinzipien: defaultTemplate.technikprinzipien,
          scope: 'global' as const,
          isStandard: true,
          updatedAt: Date.now(),
          createdAt: Date.now()
        }, 
        source: 'global' as const 
      };
    }

    return null;
  };

  // Available templates list for the currently selected technique
  const availableTechnikTemplates = useMemo(() => {
    if (!technik) return [];
    const cleanTech = technik.trim().toLowerCase();

    const list: Array<{
      id: string;
      name: string;
      scope: 'user' | 'club' | 'global';
      originLabel: string;
      badgeLabel: string;
      text: string;
      stufen?: MethodischeReiheStufen;
    }> = [];

    // 1. User standard
    if (user?.uid) {
      const userMatch = progressions.find(p => 
        p.scope === 'user' && 
        p.userId === user.uid && 
        (p.techniqueName.toLowerCase().trim() === cleanTech || p.techniqueId.toLowerCase() === cleanTech)
      );
      if (userMatch) {
        list.push({
          id: userMatch.id,
          name: 'Eigene Vorlage',
          scope: 'user',
          originLabel: '👤 Eigene Vorlage (Nutzer)',
          badgeLabel: '👤 Nutzer',
          text: userMatch.technikprinzipien || '',
          stufen: userMatch.stufen
        });
      }
    }

    // 2. Club standard
    const activeClubId = currentClub?.id || clubId;
    if (activeClubId) {
      const clubMatch = progressions.find(p => 
        p.scope === 'club' && 
        p.clubId === activeClubId && 
        (p.techniqueName.toLowerCase().trim() === cleanTech || p.techniqueId.toLowerCase() === cleanTech)
      );
      if (clubMatch) {
        list.push({
          id: clubMatch.id,
          name: 'Vereinsvorlage',
          scope: 'club',
          originLabel: `🛡️ Vereinsvorlage (${currentClub?.name || clubName || 'Verein'})`,
          badgeLabel: '🛡️ Verein',
          text: clubMatch.technikprinzipien || '',
          stufen: clubMatch.stufen
        });
      }
    }

    // 3. Academy / Global standard
    const globalMatch = progressions.find(p => 
      p.scope === 'global' && 
      (p.techniqueName.toLowerCase().trim() === cleanTech || p.techniqueId.toLowerCase() === cleanTech)
    );
    if (globalMatch) {
      list.push({
        id: globalMatch.id,
        name: 'Akademie-Standard',
        scope: 'global',
        originLabel: '🌐 Akademie-Standard (Master Admin)',
        badgeLabel: '🌐 Akademie',
        text: globalMatch.technikprinzipien || '',
        stufen: globalMatch.stufen
      });
    } else {
      const academyDef = getAcademyTemplate(technik);
      if (academyDef && (academyDef.technikprinzipien || Object.values(academyDef.stufen || {}).some(Boolean))) {
        list.push({
          id: `default_${technik}`,
          name: 'Akademie-Standard',
          scope: 'global',
          originLabel: '🌐 Akademie-Standard',
          badgeLabel: '🌐 Akademie',
          text: academyDef.technikprinzipien || '',
          stufen: academyDef.stufen
        });
      }
    }

    return list;
  }, [technik, progressions, user, currentClub, clubId, clubName]);

  const applyProgression = (techName: string) => {
    if (!techName) {
      setMethodikStufen({
        stufe1: '', stufe2: '', stufe3: '', stufe4: '', stufe5: '', stufe6: ''
      });
      setTechnikprinzipien('');
      setActiveProgressionSource(null);
      setActiveTechnikTemplateId(null);
      return;
    }
    const match = getBestProgressionForTechnique(techName);
    if (match && match.progression) {
      setMethodikStufen(match.progression.stufen || {
        stufe1: '', stufe2: '', stufe3: '', stufe4: '', stufe5: '', stufe6: ''
      });
      setTechnikprinzipien(match.progression.technikprinzipien || '');
      setActiveProgressionSource(match.source);
      setActiveTechnikTemplateId(match.progression.id);
    } else {
      setMethodikStufen({
        stufe1: '', stufe2: '', stufe3: '', stufe4: '', stufe5: '', stufe6: ''
      });
      setTechnikprinzipien('');
      setActiveProgressionSource(null);
      setActiveTechnikTemplateId(null);
    }
  };

  const handleTechnikChange = (selectedVal: string) => {
    setTechnik(selectedVal);
    setTitle(selectedVal ? `Analytisch: ${selectedVal}` : '');
    if (selectedVal) {
      applyProgression(selectedVal);
    } else {
      setMethodikStufen({
        stufe1: '', stufe2: '', stufe3: '', stufe4: '', stufe5: '', stufe6: ''
      });
      setTechnikprinzipien('');
      setActiveProgressionSource(null);
      setActiveTechnikTemplateId(null);
    }
  };

  const handleSelectTechnikTemplate = (templateId: string) => {
    const tpl = availableTechnikTemplates.find(t => t.id === templateId);
    if (!tpl) return;
    setActiveTechnikTemplateId(tpl.id);
    setTechnikprinzipien(tpl.text || '');
    if (tpl.stufen && Object.values(tpl.stufen).some(Boolean)) {
      setMethodikStufen(tpl.stufen);
    }
    setActiveProgressionSource(tpl.scope);
  };

  const handleSaveAsUserTemplate = async () => {
    if (!technik) {
      setFeedback({ type: 'error', message: 'Bitte wähle zuerst eine Torwarttechnik aus.' });
      return;
    }
    if (!user?.uid) {
      setFeedback({ type: 'error', message: 'Bitte melde dich an, um eigene Vorlagen zu speichern.' });
      return;
    }

    try {
      setIsSavingUserTechnique(true);
      const techDefs = (SKILL_DEFINITIONS as any)?.Technik || [];
      const skillDef = techDefs.find((t: any) => t.name === technik);
      const techId = skillDef?.id || technik.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const group = skillDef?.group || 'Allgemein';
      const authorName = user.displayName || user.email || 'Trainer';

      const savedId = await saveUserTechniqueStandard(
        user.uid,
        user.email || '',
        authorName,
        techId,
        technik,
        group,
        methodikStufen || { stufe1: '', stufe2: '', stufe3: '', stufe4: '', stufe5: '', stufe6: '' },
        technikprinzipien,
        currentClub?.id || clubId || null,
        currentClub?.name || clubName || null
      );

      setActiveTechnikTemplateId(savedId);
      setActiveProgressionSource('user');
      setFeedback({ type: 'success', message: `Deine persönlichen Prinzipien für "${technik}" wurden als Vorlage gespeichert!` });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to save user technique standard:', err);
      setFeedback({ type: 'error', message: 'Fehler beim Speichern der Vorlage.' });
    } finally {
      setIsSavingUserTechnique(false);
    }
  };

  // Sync when initialExercise changes
  useEffect(() => {
    if (initialExercise) {
      setTitle(initialExercise.title);
      setCategory(initialExercise.category);
      setAblauf(initialExercise.ablauf || '');
      setMinKeepers(initialExercise.minKeepers || 1);
      setMaxKeepers(initialExercise.maxKeepers || 4);
      setMinAgeGroup(initialExercise.minAgeGroup || 'immer');
      setDurationMinutes(initialExercise.durationMinutes || 15);
      setMaterials(initialExercise.materials || []);
      setCoachingPoints(initialExercise.coachingPoints || '');

      setIsPublished(initialExercise.isPublished ?? false);
      setIsClubPublished(initialExercise.isClubPublished ?? false);

      setAtSchwerpunkt((initialExercise.atSchwerpunkt as string) || 'unspezifisch');
      setKognition((initialExercise.kognition as string) || 'nicht enthalten');
      setKoordinativesElement((initialExercise.koordinativesElement as string) || 'nicht enthalten');
      setVisuellesElement((initialExercise.visuellesElement as string) || 'nicht enthalten');
      setWarmUpSchwerpunkte(initialExercise.warmUpSchwerpunkte || []);
      setAthletikSchwerpunkt((initialExercise.athletikSchwerpunkt as FocusSchwerpunkt) || 'Explosivität');
      setAthletischerEntwicklungsreiz((initialExercise.athletischerEntwicklungsreiz as AthletischerEntwicklungsreiz) || '');

      setTechnik(initialExercise.technik || '');
      setTechnikprinzipien(initialExercise.technikprinzipien || '');
      setMethodikStufen(initialExercise.methodischeReiheStufen || {
        stufe1: '', stufe2: '', stufe3: '', stufe4: '', stufe5: '', stufe6: ''
      });

      setSituativeSchwerpunkte(
        initialExercise.situativeSchwerpunkte || 
        (initialExercise.situativerSchwerpunkt ? [initialExercise.situativerSchwerpunkt] : [])
      );
      setTaktikprinzipien(initialExercise.taktikprinzipien || '');
      setIncludeTaktikprinzipienInPdf(initialExercise.includeTaktikprinzipienInPdf ?? true);
      setSiegbedingung(initialExercise.siegbedingung || '');

      if (initialExercise.canvasData && canvasRef.current) {
        canvasRef.current.loadCanvasData(initialExercise.canvasData);
      }
    }
  }, [initialExercise]);

  // Material Toggle Handler: checks/unchecks material and places symbol on canvas if not present
  const handleToggleMaterial = (mat: MaterialType) => {
    setMaterials(prev => {
      const isAlreadyIncluded = prev.includes(mat);
      if (isAlreadyIncluded) {
        return prev.filter(m => m !== mat);
      } else {
        // When checked: automatically add the symbol to top right area if mapped to a tool
        const tool = MATERIAL_TO_TOOL_MAP[mat];
        if (tool && canvasRef.current) {
          canvasRef.current.addElement(tool);
        }
        return [...prev, mat];
      }
    });
  };

  // Synchronize Materials with Symbols on Canvas (unions canvas materials without deleting manually checked items)
  const handleCanvasChange = (data: TacticalCanvasData) => {
    const activeBoardMaterials = new Set<MaterialType>();
    (data.elements || []).forEach(el => {
      const mapped = TOOL_TO_MATERIAL_MAP[el.type];
      if (mapped) {
        activeBoardMaterials.add(mapped);
      }
    });

    setMaterials(prev => {
      return Array.from(new Set([...prev, ...Array.from(activeBoardMaterials)]));
    });
  };

  const AUTO_COACHING_TIP = 'Vororientierung - Blick ins Zentrum fordern';
  const TRIGGER_TOPICS_FOR_COACHING_TIP = [
    'Flanken',
    'Early Cross',
    'Querpass',
    'Verteidigen hinter der Abwehrkette'
  ];

  const appendAutoCoachingTip = () => {
    setCoachingPoints(prev => {
      if (prev.includes(AUTO_COACHING_TIP)) return prev;
      return prev.trim() ? `${prev.trim()}\n${AUTO_COACHING_TIP}` : AUTO_COACHING_TIP;
    });
  };

  const removeAutoCoachingTip = () => {
    setCoachingPoints(prev => {
      if (!prev.includes(AUTO_COACHING_TIP)) return prev;
      return prev
        .split('\n')
        .filter(line => line.trim() !== AUTO_COACHING_TIP)
        .join('\n')
        .trim();
    });
  };

  const toggleWarmUpSchwerpunkt = (s: string) => {
    setWarmUpSchwerpunkte(prev => {
      const next = prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s];
      const hasTrigger = next.some(item => TRIGGER_TOPICS_FOR_COACHING_TIP.includes(item));
      if (hasTrigger) appendAutoCoachingTip();
      else removeAutoCoachingTip();
      return next;
    });
  };

  const NO_USER_TACTICAL_PRINCIPLES_MSG = 'Keine Prinzipien erstellt, bitte gehe auf eigene Vorlagen und entwickle dir Prinzipien für das taktische Verhalten!';

  const getUserTacticalPrincipleFor = (tacticName: string): string => {
    if (!tacticName) return '';
    const clean = tacticName.trim().toLowerCase();
    const meta = (SITUATIVE_SCHWERPUNKT_META as any)?.[tacticName];
    const metaId = meta?.id;

    const isMatch = (p: TacticalPrinciple) => {
      if (metaId && p.tacticId === metaId) return true;
      const pName = p.tacticName?.toLowerCase().trim();
      if (pName === clean) return true;
      if (p.tacticId?.toLowerCase() === clean) return true;
      if (clean === 'querpass' && (pName === 'querpass' || pName === 'querpässe')) return true;
      return false;
    };

    const effectiveUid = user?.uid || 'local_user';
    const userMatch = tacticalPrinciples.find(p => p.scope === 'user' && (!p.userId || p.userId === effectiveUid || p.userId === 'local_user') && isMatch(p));
    return userMatch?.taktikprinzipien?.trim() || '';
  };

  const toggleSituativerSchwerpunkt = (s: SituativerSchwerpunkt) => {
    setSituativeSchwerpunkte(prev => {
      const isCurrentlySelected = prev.includes(s);
      const next = isCurrentlySelected ? prev.filter(item => item !== s) : [...prev, s];
      
      const hasTrigger = next.some(item => TRIGGER_TOPICS_FOR_COACHING_TIP.includes(item));
      if (hasTrigger) appendAutoCoachingTip();
      else removeAutoCoachingTip();

      if (category === 'Situativ' || category === 'Integrativ') {
        if (!isCurrentlySelected) {
          // 1. Adding Schwerpunkt s
          const userText = getUserTacticalPrincipleFor(s);
          const blockContent = userText ? `[${s}]\n${userText}` : `[${s}]\n${NO_USER_TACTICAL_PRINCIPLES_MSG}`;

          setTaktikprinzipien(curr => {
            const trimmedCurr = curr.trim();
            if (next.length === 1) {
              return userText ? `[${s}]\n${userText}` : NO_USER_TACTICAL_PRINCIPLES_MSG;
            }

            const blockHeader = `[${s}]`;
            if (trimmedCurr.includes(blockHeader)) {
              return curr;
            }

            // If previous text was single fallback message or unbracketed, wrap previous topic
            let base = trimmedCurr;
            if (prev.length === 1) {
              const prevTopic = prev[0];
              const prevUserText = getUserTacticalPrincipleFor(prevTopic);
              const prevContent = prevUserText ? `[${prevTopic}]\n${prevUserText}` : `[${prevTopic}]\n${NO_USER_TACTICAL_PRINCIPLES_MSG}`;
              if (base === NO_USER_TACTICAL_PRINCIPLES_MSG || !base.startsWith('[')) {
                base = prevContent;
              }
            }

            return `${base}\n\n${blockContent}`;
          });
        } else {
          // 2. Removing Schwerpunkt s
          setTaktikprinzipien(curr => {
            if (next.length === 0) {
              return '';
            }

            if (next.length === 1) {
              const remainingTopic = next[0];
              const remainingUserText = getUserTacticalPrincipleFor(remainingTopic);
              if (!remainingUserText) {
                return NO_USER_TACTICAL_PRINCIPLES_MSG;
              }

              // Preserve any custom edited text inside remaining topic block
              const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const blockRegex = new RegExp(`\\[${escapeRegExp(remainingTopic)}\\]\\s*([\\s\\S]*?)(?=(\\n\\s*\\[[^\\]]+\\])|$)`, 'i');
              const match = curr.match(blockRegex);
              if (match && match[1]?.trim() && match[1].trim() !== NO_USER_TACTICAL_PRINCIPLES_MSG) {
                return `[${remainingTopic}]\n${match[1].trim()}`;
              }
              return `[${remainingTopic}]\n${remainingUserText}`;
            }

            // More than 1 remaining: strip [s] block
            const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const blockRegex = new RegExp(`\\[${escapeRegExp(s)}\\][\\s\\S]*?(?=(\\n\\s*\\[[^\\]]+\\])|$)`, 'gi');
            let updated = curr.replace(blockRegex, '').trim();
            updated = updated.replace(/\n{3,}/g, '\n\n').trim();
            return updated;
          });
        }
      }

      return next;
    });
  };

  const handleSaveExercise = async (e?: React.FormEvent, asNew: boolean = false) => {
    if (e && e.preventDefault) e.preventDefault();

    let effectiveTitle = title.trim();
    if (category === 'Analytisch') {
      const effectiveTech = (technik.trim() || title.replace(/^Analytisch:\s*/i, '').trim() || 'Technikschulung');
      effectiveTitle = `Analytisch: ${effectiveTech}`;
      if (!technik.trim()) {
        setTechnik(effectiveTech);
      }
    } else if (!effectiveTitle) {
      effectiveTitle = initialExercise?.title || 'Torwart-Übung';
      setTitle(effectiveTitle);
    }

    let effectiveAblauf = ablauf.trim();
    if (!effectiveAblauf && initialExercise?.ablauf) {
      effectiveAblauf = initialExercise.ablauf;
      setAblauf(effectiveAblauf);
    }

    if (!effectiveAblauf) {
      setFeedback({ type: 'error', message: 'Bitte beschreibe den Ablauf der Übung im Feld „Ablauf“.' });
      return;
    }

    let finalWarmUpSchwerpunkte = warmUpSchwerpunkte;
    if (category === 'WarmUp' && (!finalWarmUpSchwerpunkte || finalWarmUpSchwerpunkte.length === 0)) {
      if (atSchwerpunkt && atSchwerpunkt !== 'unspezifisch') {
        finalWarmUpSchwerpunkte = [atSchwerpunkt];
      } else {
        finalWarmUpSchwerpunkte = ['Ballgewöhnung'];
      }
    }

    let finalSituativeSchwerpunkte = situativeSchwerpunkte;
    if ((category === 'Situativ' || category === 'Wettkämpfe' || category === 'Integrativ') && (!finalSituativeSchwerpunkte || finalSituativeSchwerpunkte.length === 0)) {
      if (initialExercise?.situativerSchwerpunkt) {
        finalSituativeSchwerpunkte = [initialExercise.situativerSchwerpunkt];
      } else {
        finalSituativeSchwerpunkte = ['1vs1'];
      }
    }

    let effectiveSiegbedingung = siegbedingung.trim();
    if (category === 'Wettkämpfe' && !effectiveSiegbedingung) {
      effectiveSiegbedingung = initialExercise?.siegbedingung || 'Höchste Trefferquote / Meiste gehaltene Bälle gewinnt';
      setSiegbedingung(effectiveSiegbedingung);
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      let imageBase64 = '';
      let imageUrl = initialExercise?.imageUrl || '';
      let canvasData: TacticalCanvasData | undefined;

      if (canvasRef.current) {
        const rawExport = canvasRef.current.exportImage();
        canvasData = canvasRef.current.getCanvasData();
        if (canvasData?.elements && canvasData.elements.length > 0) {
          imageBase64 = rawExport;
        } else if (initialExercise?.imageBase64) {
          imageBase64 = initialExercise.imageBase64;
          if (initialExercise.canvasData) {
            canvasData = initialExercise.canvasData;
          }
        } else if (rawExport) {
          imageBase64 = rawExport;
        }
      } else {
        imageBase64 = initialExercise?.imageBase64 || '';
        canvasData = initialExercise?.canvasData;
      }

      const shouldSaveAsNew = asNew || isLoadedAsTemplate || !initialExercise?.id;

      const exerciseData: any = {
        title: effectiveTitle,
        category,
        materials,
        videoUrl: videoUrl.trim(),
        ablauf: effectiveAblauf,
        minKeepers,
        maxKeepers,
        minAgeGroup,
        durationMinutes,
        coachingPoints: coachingPoints.trim(),
        canvasData,
        imageUrl,
        imageBase64
      };

      if (category === 'WarmUp') {
        exerciseData.atSchwerpunkt = atSchwerpunkt;
        exerciseData.kognition = kognition;
        exerciseData.koordinativesElement = koordinativesElement;
        exerciseData.visuellesElement = visuellesElement;
        exerciseData.warmUpSchwerpunkte = finalWarmUpSchwerpunkte;
      } else if (category === 'Torwart-Athletik') {
        exerciseData.athletikSchwerpunkt = athletikSchwerpunkt;
        exerciseData.athletischerEntwicklungsreiz = athletikSchwerpunkt === 'Explosivität' ? (athletischerEntwicklungsreiz || '') : '';
      } else if (category === 'Analytisch') {
        exerciseData.technik = (technik.trim() || effectiveTitle.replace(/^Analytisch:\s*/i, '').trim());
        exerciseData.technikprinzipien = technikprinzipien;
        exerciseData.methodischeReiheStufen = methodikStufen;
      } else if (category === 'Situativ' || category === 'Integrativ') {
        exerciseData.situativeSchwerpunkte = finalSituativeSchwerpunkte;
        exerciseData.taktikprinzipien = taktikprinzipien;
        exerciseData.includeTaktikprinzipienInPdf = includeTaktikprinzipienInPdf;
      } else if (category === 'Wettkämpfe') {
        exerciseData.situativeSchwerpunkte = finalSituativeSchwerpunkte;
        exerciseData.siegbedingung = effectiveSiegbedingung;
      }

      if (shouldSaveAsNew) {
        exerciseData.id = undefined;
        exerciseData.ownerId = user?.uid || 'anonymous';
        exerciseData.ownerEmail = user?.email || '';
        exerciseData.isPublished = isMasterAdmin ? Boolean(isPublished) : false;
        exerciseData.isClubPublished = isClubAdmin ? Boolean(isClubPublished) : false;
        exerciseData.clubId = (isClubAdmin || isClubCoach) ? (clubId || null) : null;
        exerciseData.clubName = (isClubAdmin || isClubCoach) ? (clubName || null) : null;
        exerciseData.createdAt = Date.now();
        exerciseData.updatedAt = Date.now();
        exerciseData.rejectionReason = '';
      } else {
        exerciseData.id = initialExercise!.id;
        exerciseData.ownerId = initialExercise!.ownerId || user?.uid || 'anonymous';
        exerciseData.ownerEmail = initialExercise!.ownerEmail || user?.email || '';
        exerciseData.isPublished = isMasterAdmin ? Boolean(isPublished) : Boolean(initialExercise!.isPublished);
        exerciseData.isClubPublished = isClubAdmin ? Boolean(isClubPublished) : Boolean(initialExercise!.isClubPublished);
        exerciseData.clubId = initialExercise!.clubId !== undefined ? initialExercise!.clubId : (clubId || null);
        exerciseData.clubName = initialExercise!.clubName !== undefined ? initialExercise!.clubName : (clubName || null);
        exerciseData.createdAt = initialExercise!.createdAt || Date.now();
        exerciseData.updatedAt = Date.now();
        exerciseData.rejectionReason = initialExercise!.rejectionReason || '';
      }
      
      const savedId = await saveExerciseToFirestore(
        exerciseData,
        { uid: user?.uid || 'anonymous', email: user?.email || '' },
        isAdmin,
        { clubId, clubName, isClubAdmin }
      );
      exerciseData.id = savedId;

      const successMsg = shouldSaveAsNew
        ? (initialExercise ? 'Übung erfolgreich als neue, eigene Kopie gespeichert!' : 'Übung erfolgreich erstellt und gespeichert!')
        : 'Änderungen an der Übung erfolgreich gespeichert!';

      setFeedback({ type: 'success', message: successMsg });

      // Smooth transition back
      setTimeout(() => {
        if (onSaved) onSaved(exerciseData);
      }, 400);

      if (!initialExercise) {
        setTitle('');
        setAblauf('');
        setMaterials([]);
        setVideoUrl('');
        setCoachingPoints('');
        setSiegbedingung('');
        if (canvasRef.current) canvasRef.current.clearCanvas();
      }
    } catch (err) {
      console.error('Error saving exercise to Firestore:', err);
      setFeedback({ type: 'error', message: 'Fehler beim Speichern der Übung in Firebase Firestore.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1680px] mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-20 sm:h-24 w-auto flex items-center justify-center flex-shrink-0">
            <img src="/Logo.png" alt="NextLevel Logo" className="h-full w-auto object-contain drop-shadow-[0_6px_16px_rgba(34,197,94,0.3)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>NextLevel Goalkeeping Academy — Übungseditor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {initialExercise ? `Übung bearbeiten: ${initialExercise.title}` : 'Neue Torwart-Übung erstellen'}
            </h1>
          </div>
        </div>

        {/* Top-Right Header Actions: Vorlagen Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-white text-xs sm:text-sm font-bold border border-slate-700 hover:border-emerald-500/50 transition flex items-center gap-2.5 shadow-lg shadow-black/30 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Vorlagen</span>
          </button>
        </div>
      </div>

      {/* Read-only / Template Info Banner */}
      {initialExercise && !canOverwriteExercise && (
        <div className="p-4 rounded-2xl bg-sky-950/70 border border-sky-700/70 text-sky-200 flex items-start gap-3.5 shadow-xl animate-in fade-in duration-200">
          <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-sm text-sky-300">
              {initialExercise.isPublished 
                ? 'NextLevel Academy-Vorlage (Schreibgeschützt für Nicht-Master-Admins)' 
                : initialExercise.clubId 
                  ? `Vereins-Übung ${initialExercise.clubName ? `(${initialExercise.clubName})` : ''} (Schreibgeschützt für Coaches)` 
                  : 'Fremde Vorlage'}
            </span>
            <p className="text-xs text-sky-100/90 leading-relaxed">
              Du kannst alle Übungsinhalte und das Taktikboard anpassen. 
              Deine Änderungen werden beim Klick auf <strong>„Änderungen speichern“</strong> automatisch als deine eigene Übung in deinem Katalog gesichert.
            </p>
          </div>
        </div>
      )}

      {/* Rejection Notice Banner */}
      {initialExercise?.rejectionReason && !initialExercise.isClubPublished && !initialExercise.isPublished && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-500 text-amber-100 flex items-start gap-3.5 shadow-xl animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-sm text-amber-300">
              💬 Hinweis vom Club-Admin zur Überarbeitung:
            </span>
            <p className="text-xs text-amber-100/90 leading-relaxed font-medium bg-amber-950/60 p-2.5 rounded-xl border border-amber-800/80">
              "{initialExercise.rejectionReason}"
            </p>
          </div>
        </div>
      )}

      {/* Top Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            "p-4 rounded-xl flex items-center gap-3 text-sm font-medium border animate-in fade-in duration-200",
            feedback.type === 'success'
              ? "bg-emerald-950/50 text-emerald-300 border-emerald-800"
              : "bg-rose-950/50 text-rose-300 border-rose-800"
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 2-Column Responsive Layout: 60% Taktikboard (Sticky) & 40% Übungs-Details */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        {/* Left Column: Tactical Canvas Board (60% / 6 Cols on LG) */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-4">
          <ExerciseCanvasStage
            canvasRef={canvasRef}
            initialData={initialExercise?.canvasData}
            onChange={handleCanvasChange}
            width={864}
            height={560}
          />
        </div>

        {/* Right Column: Dynamic Form (40% / 4 Cols on LG) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Form Meta Fields */}
          <ExerciseMetaForm
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            minAgeGroup={minAgeGroup}
            setMinAgeGroup={setMinAgeGroup}
            minKeepers={minKeepers}
            setMinKeepers={setMinKeepers}
            maxKeepers={maxKeepers}
            setMaxKeepers={setMaxKeepers}
            durationMinutes={durationMinutes}
            setDurationMinutes={setDurationMinutes}
            materials={materials}
            setMaterials={setMaterials}
            onToggleMaterial={handleToggleMaterial}
            videoUrl={videoUrl}
            setVideoUrl={setVideoUrl}
            ablauf={ablauf}
            setAblauf={setAblauf}
            coachingPoints={coachingPoints}
            setCoachingPoints={setCoachingPoints}
            technik={technik}
            setTechnik={handleTechnikChange}
            technikprinzipien={technikprinzipien}
            setTechnikprinzipien={setTechnikprinzipien}
            methodikStufen={methodikStufen}
            onMethodikStufenChange={setMethodikStufen}
            progressions={progressions}
            onApplyTemplate={(template, src) => {
              setMethodikStufen(template);
              setActiveProgressionSource(src);
            }}
            availableTechnikTemplates={availableTechnikTemplates}
            activeTechnikTemplateId={activeTechnikTemplateId}
            onSelectTechnikTemplate={handleSelectTechnikTemplate}
            onSaveAsUserTemplate={handleSaveAsUserTemplate}
            isSavingUserTechnique={isSavingUserTechnique}
            atSchwerpunkt={atSchwerpunkt}
            setAtSchwerpunkt={setAtSchwerpunkt}
            kognition={kognition}
            setKognition={setKognition}
            koordinativesElement={koordinativesElement}
            setKoordinativesElement={setKoordinativesElement}
            visuellesElement={visuellesElement}
            setVisuellesElement={setVisuellesElement}
            warmUpSchwerpunkte={warmUpSchwerpunkte}
            onToggleWarmUpSchwerpunkt={toggleWarmUpSchwerpunkt}
            athletikSchwerpunkt={athletikSchwerpunkt}
            setAthletikSchwerpunkt={setAthletikSchwerpunkt}
            athletischerEntwicklungsreiz={athletischerEntwicklungsreiz}
            setAthletischerEntwicklungsreiz={setAthletischerEntwicklungsreiz}
            situativeSchwerpunkte={situativeSchwerpunkte}
            onToggleSituativerSchwerpunkt={toggleSituativerSchwerpunkt}
            taktikprinzipien={taktikprinzipien}
            setTaktikprinzipien={setTaktikprinzipien}
            siegbedingung={siegbedingung}
            setSiegbedingung={setSiegbedingung}
            onOpenUserTacticsModal={() => setIsUserTacticsModalOpen(true)}
          />

          {/* Publishing Controls */}
          {isMasterAdmin && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <Globe className={cn("w-4 h-4 flex-shrink-0", isPublished ? "text-purple-400" : "text-slate-500")} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Im Akademie-Katalog veröffentlichen</span>
                  <span className="text-[11px] text-slate-400">
                    {isPublished 
                      ? 'Diese Übung wird im Akademie-Katalog für alle registrierten Trainer sichtbar.' 
                      : 'Privat: Nur du siehst diese Übung in deinem persönlichen Katalog.'}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          )}

          {isClubAdmin && !isMasterAdmin && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <Building2 className={cn("w-4 h-4 flex-shrink-0", isClubPublished ? "text-sky-400" : "text-slate-500")} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Für Verein freigeben {clubName ? `(${clubName})` : ''}</span>
                  <span className="text-[11px] text-slate-400">
                    {isClubPublished 
                      ? 'Diese Übung wird für alle Trainer deines Vereins im Vereinskatalog sichtbar.' 
                      : 'Entwurf: Nur für dich als Vereins-Admin sichtbar.'}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isClubPublished}
                  onChange={e => setIsClubPublished(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="pt-2 space-y-3">
            {feedback && (
              <div className={cn(
                "p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in shadow-lg",
                feedback.type === 'success'
                  ? "bg-emerald-950/90 border-emerald-500/80 text-emerald-200 shadow-emerald-950/60"
                  : "bg-rose-950/90 border-rose-500/80 text-rose-200 shadow-rose-950/60"
              )}>
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {initialExercise ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveExercise(undefined, false)}
                    disabled={isSubmitting}
                    className="py-3.5 px-6 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveExercise(undefined, true)}
                    disabled={isSubmitting}
                    className="py-3.5 px-5 rounded-2xl text-sm font-bold text-sky-300 bg-sky-950/80 hover:bg-sky-900 border border-sky-700/80 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 disabled:opacity-50 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-sky-400" />
                    <span>Als neue Kopie speichern</span>
                  </button>
                </div>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
                  >
                    Bearbeitung abbrechen
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition cursor-pointer"
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveExercise(undefined, false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Wird gespeichert...' : 'Übung erstellen & speichern'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tactical Principles Modal */}
      <TacticalPrinciplesModal
        isOpen={isTacticalModalOpen}
        onClose={() => setIsTacticalModalOpen(false)}
        tacticalPrinciples={tacticalPrinciples}
        selectedPrinciples={situativeSchwerpunkte}
        onTogglePrinciple={(pName) => toggleSituativerSchwerpunkt(pName as SituativerSchwerpunkt)}
        includeInPdf={includeTaktikprinzipienInPdf}
        onToggleIncludeInPdf={() => setIncludeTaktikprinzipienInPdf(prev => !prev)}
      />

      {/* User Custom Tactical Principles Modal */}
      <UserTacticalPrinciplesModal
        isOpen={isUserTacticsModalOpen}
        onClose={() => setIsUserTacticsModalOpen(false)}
        currentUser={user}
        tacticalPrinciples={tacticalPrinciples}
        currentClub={currentClub}
        initialSelectedSchwerpunkt={situativeSchwerpunkte[0] || null}
        onPrinciplesSaved={(schwerpunkt, text) => {
          if ((category === 'Situativ' || category === 'Integrativ') && situativeSchwerpunkte.includes(schwerpunkt)) {
            setTaktikprinzipien(curr => {
              const trimmedCurr = curr.trim();
              const hasCustomText = Boolean(text.trim());

              if (situativeSchwerpunkte.length === 1) {
                return hasCustomText ? `[${schwerpunkt}]\n${text.trim()}` : NO_USER_TACTICAL_PRINCIPLES_MSG;
              }

              const newBlockContent = hasCustomText 
                ? `[${schwerpunkt}]\n${text.trim()}` 
                : `[${schwerpunkt}]\n${NO_USER_TACTICAL_PRINCIPLES_MSG}`;

              const blockHeader = `[${schwerpunkt}]`;
              if (trimmedCurr.includes(blockHeader)) {
                const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\[${escapeRegExp(schwerpunkt)}\\][\\s\\S]*?(?=(\\n\\s*\\[[^\\]]+\\])|$)`, 'gi');
                return trimmedCurr.replace(regex, newBlockContent).trim();
              }
              return `${trimmedCurr}\n\n${newBlockContent}`;
            });
          }
        }}
      />

      {/* Exercise Templates Modal */}
      <ExerciseTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleLoadTemplate}
        allExercises={allExercises}
        favoriteExerciseIds={favoriteExerciseIds || []}
        currentUserId={user?.uid}
      />
    </div>
  );
};
