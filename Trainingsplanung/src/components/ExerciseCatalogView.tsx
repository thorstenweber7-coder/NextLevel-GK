import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  subscribeExercises, 
  deleteExerciseFromFirestore, 
  toggleExercisePublishStatus,
  toggleClubPublishStatus,
  subscribeUserPlans
} from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';
import type { Exercise, ExerciseCategory, MaterialType, TrainingStructure, AgeGroup, TrainingPlan } from '../types';
import { 
  EXERCISE_CATEGORIES, 
  ALL_MATERIALS, 
  AGE_GROUPS, 
  CATEGORY_COLORS,
  METHODISCHE_REIHE_LABELS,
  SKILL_DEFINITIONS,
  PERIODIZATION_TOPICS
} from '../types';
import { ExerciseModal } from './ExerciseModal';
import { ExerciseUsageRankingModal, computeExerciseUsageCounts } from './ExerciseUsageRankingModal';
import { ExerciseExperiencesModal } from './ExerciseExperiencesModal';
import { getAuthorizedExerciseExperiences } from '../utils/exerciseExperiences';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  Layers,
  History,
  Users,
  Trophy,
  Globe,
  User,
  EyeOff,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Maximize2,
  Building2,
  ShieldCheck,
  AlertCircle,
  Tag,
  MessageSquare
} from 'lucide-react';
import { cn } from '../utils/cn';

interface ExerciseCatalogViewProps {
  onNewExercise: () => void;
  onEditExercise: (exercise: Exercise) => void;
  activeStructure?: TrainingStructure;
  onAddToPlan?: (exercise: Exercise, targetPhaseId?: string) => void;
}

export const ExerciseCatalogView: React.FC<ExerciseCatalogViewProps> = ({
  onNewExercise,
  onEditExercise,
  activeStructure,
  onAddToPlan
}) => {
  const { 
    user, 
    isAdmin, 
    isMasterAdmin, 
    isClubAdmin, 
    clubId, 
    clubName, 
    favoriteExerciseIds, 
    toggleFavoriteExercise, 
    isExerciseFavorite 
  } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'ALL'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'FAVORITES' | 'MINE' | 'CLUB' | 'PUBLISHED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // 150ms debounce for search query to avoid laggy re-filtering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType | 'ALL'>('ALL');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | 'ALL'>('ALL');
  const [selectedTechnik, setSelectedTechnik] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [keeperFilter, setKeeperFilter] = useState<number | 'ALL'>('ALL');
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);

  // Accordion Inline Expand State for Catalog Cards
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Record<string, boolean>>({});

  // Quick-Add to Plan Dropdown State
  const [quickAddMenuExerciseId, setQuickAddMenuExerciseId] = useState<string | null>(null);
  const [addedToast, setAddedToast] = useState<{ exerciseId: string; phaseName: string } | null>(null);
  const quickAddRef = useRef<HTMLDivElement | null>(null);

  // Close Quick-Add menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) {
        setQuickAddMenuExerciseId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedExerciseIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddExerciseToPhase = (exercise: Exercise, phaseId: string, phaseName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToPlan?.(exercise, phaseId);
    setQuickAddMenuExerciseId(null);
    setAddedToast({ exerciseId: exercise.id!, phaseName });
    setTimeout(() => setAddedToast(null), 2500);
  };

  // Real-time listener for exercises from Firestore (filtered by role & club)
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [savedPlans, setSavedPlans] = useState<TrainingPlan[]>([]);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState<boolean>(false);
  const [experienceExercise, setExperienceExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeExercises(
      user, 
      isMasterAdmin, 
      (data) => {
        setExercises(data);
      },
      console.error,
      isClubAdmin,
      clubId
    );
    return () => unsubscribe();
  }, [user, isMasterAdmin, isClubAdmin, clubId]);

  useEffect(() => {
    const unsubscribe = subscribeUserPlans(user, isAdmin, (plans) => {
      setSavedPlans(plans);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  // Compute how many times each exercise was executed in history
  const exerciseUsageMap = useMemo(() => {
    return computeExerciseUsageCounts(savedPlans);
  }, [savedPlans]);

  // Filtered exercises
  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      const matchAge = 
        selectedAgeGroup === 'ALL' ||
        (selectedAgeGroup === 'immer' ? (ex.minAgeGroup === 'immer' || !ex.minAgeGroup) : (ex.minAgeGroup === selectedAgeGroup || ex.minAgeGroup === 'immer' || !ex.minAgeGroup));

      const matchCat = selectedCategory === 'ALL' || ex.category === selectedCategory;
      const matchMat = selectedMaterial === 'ALL' || ex.materials?.includes(selectedMaterial);
      const matchKeeper = keeperFilter === 'ALL' || 
        ((ex.minKeepers || 1) <= keeperFilter && (ex.maxKeepers || 7) >= keeperFilter);

      const matchScope = 
        scopeFilter === 'ALL' ||
        (scopeFilter === 'FAVORITES' && Boolean(ex.id && favoriteExerciseIds.includes(ex.id))) ||
        (scopeFilter === 'MINE' && Boolean(user?.uid && ex.ownerId === user.uid)) ||
        (scopeFilter === 'CLUB' && Boolean(clubId && ex.clubId === clubId)) ||
        (scopeFilter === 'PUBLISHED' && ex.isPublished === true);

      let matchTechnikOrTopic = true;
      if (selectedCategory === 'Analytisch') {
        if (selectedTechnik !== 'ALL' && selectedTechnik.trim() !== '') {
          const techQuery = selectedTechnik.toLowerCase().trim();
          matchTechnikOrTopic = Boolean(
            (ex.technik && ex.technik.toLowerCase().includes(techQuery)) ||
            (ex.technikprinzipien && ex.technikprinzipien.toLowerCase().includes(techQuery)) ||
            ex.title.toLowerCase().includes(techQuery)
          );
        }
      } else {
        if (selectedTopic !== 'ALL' && selectedTopic.trim() !== '') {
          const topQuery = selectedTopic.toLowerCase().trim();
          matchTechnikOrTopic = Boolean(
            (ex.situativeSchwerpunkte && ex.situativeSchwerpunkte.some(s => s.toLowerCase() === topQuery || s.toLowerCase().includes(topQuery))) ||
            (ex.situativerSchwerpunkt && ex.situativerSchwerpunkt.toLowerCase().includes(topQuery)) ||
            (ex.athletikSchwerpunkt && ex.athletikSchwerpunkt.toLowerCase().includes(topQuery)) ||
            (ex.atSchwerpunkt && ex.atSchwerpunkt.toLowerCase().includes(topQuery)) ||
            (ex.warmUpSchwerpunkte && ex.warmUpSchwerpunkte.some(w => w.toLowerCase().includes(topQuery))) ||
            ex.category.toLowerCase() === topQuery ||
            ex.title.toLowerCase().includes(topQuery) ||
            ex.ablauf.toLowerCase().includes(topQuery) ||
            (ex.taktikprinzipien && ex.taktikprinzipien.toLowerCase().includes(topQuery))
          );
        }
      }

      const q = debouncedSearchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        ex.title.toLowerCase().includes(q) ||
        ex.ablauf.toLowerCase().includes(q) ||
        (ex.situativeSchwerpunkte && ex.situativeSchwerpunkte.some(s => s.toLowerCase().includes(q))) ||
        (ex.situativerSchwerpunkt && ex.situativerSchwerpunkt.toLowerCase().includes(q)) ||
        (ex.athletikSchwerpunkt && ex.athletikSchwerpunkt.toLowerCase().includes(q)) ||
        (ex.athletischerEntwicklungsreiz && ex.athletischerEntwicklungsreiz.toLowerCase().includes(q)) ||
        (ex.atSchwerpunkt && ex.atSchwerpunkt.toLowerCase().includes(q)) ||
        (ex.technik && ex.technik.toLowerCase().includes(q)) ||
        (ex.siegbedingung && ex.siegbedingung.toLowerCase().includes(q));

      return matchAge && matchCat && matchMat && matchKeeper && matchScope && matchTechnikOrTopic && matchesQuery;
    });
  }, [exercises, selectedCategory, selectedMaterial, selectedAgeGroup, keeperFilter, scopeFilter, debouncedSearchQuery, user, favoriteExerciseIds, selectedTechnik, selectedTopic]);

  // Delete exercise handler with Firestore
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Möchtest du diese Übung wirklich aus der Cloud-Datenbank löschen?')) {
      try {
        await deleteExerciseFromFirestore(id);
      } catch (err) {
        console.error('Error deleting exercise:', err);
        alert('Fehler beim Löschen der Übung aus der Cloud.');
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-20 sm:h-24 w-auto flex items-center justify-center flex-shrink-0">
            <img src="/Logo.png" alt="NextLevel Logo" className="h-full w-auto object-contain drop-shadow-[0_6px_16px_rgba(34,197,94,0.3)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-wider uppercase mb-1">
              <BookOpen className="w-4 h-4" />
              <span>NextLevel Goalkeeping Academy — Übungskatalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Alle Torwart-Übungen
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsRankingModalOpen(true)}
          className="px-4 py-2.5 rounded-xl font-extrabold text-amber-300 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 active:scale-95 transition flex items-center gap-2 shadow-lg shadow-amber-950/50 text-xs sm:text-sm cursor-pointer group"
          title="Rangfolge aller durchgeführten Übungen anzeigen"
        >
          <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Wie häufig wurde welche Übung durchgeführt?</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Übung suchen (Titel, Ablauf...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Age Group Filter */}
          <div>
            <select
              value={selectedAgeGroup}
              onChange={e => setSelectedAgeGroup(e.target.value as AgeGroup | 'ALL')}
              className={cn(
                "w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition",
                selectedAgeGroup !== 'ALL'
                  ? "border-purple-500 text-purple-200 bg-purple-950/40 font-bold"
                  : "border-slate-800 focus:border-emerald-500"
              )}
            >
              <option value="ALL">Alle Altersstufen</option>
              {AGE_GROUPS.map(ag => (
                <option key={ag} value={ag}>
                  {ag === 'immer' ? 'immer (ab jedem Alter)' : `ab ${ag}`}
                </option>
              ))}
            </select>
          </div>

          {/* Technik (Analytisch) / Thema (alle anderen Phasen) Filter */}
          <div>
            {selectedCategory === 'Analytisch' ? (
              <select
                value={selectedTechnik}
                onChange={e => setSelectedTechnik(e.target.value)}
                className={cn(
                  "w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition truncate",
                  selectedTechnik !== 'ALL' && selectedTechnik.trim() !== ''
                    ? "border-purple-500 text-purple-200 bg-purple-950/40 font-bold"
                    : "border-slate-800 focus:border-purple-500"
                )}
                title="Nach Torwarttechnik filtern"
              >
                <option value="ALL">Alle Torwarttechniken</option>
                {Array.from(new Set(SKILL_DEFINITIONS.Technik.map(t => t.group || 'Allgemein'))).map(groupName => (
                  <optgroup key={groupName} label={groupName} className="bg-slate-900 text-purple-300 font-bold">
                    {SKILL_DEFINITIONS.Technik.filter(t => (t.group || 'Allgemein') === groupName).map(t => (
                      <option key={t.id} value={t.name} className="bg-slate-950 text-slate-100 font-normal">
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className={cn(
                  "w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition truncate",
                  selectedTopic !== 'ALL' && selectedTopic.trim() !== ''
                    ? "border-sky-500 text-sky-200 bg-sky-950/40 font-bold"
                    : "border-slate-800 focus:border-emerald-500"
                )}
                title="Nach Thema filtern"
              >
                <option value="ALL">Alle Themen</option>
                {PERIODIZATION_TOPICS.map(topic => (
                  <option key={topic.id} value={topic.label} className="bg-slate-950 text-slate-100">
                    {topic.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Material Filter */}
          <div>
            <select
              value={selectedMaterial}
              onChange={e => setSelectedMaterial(e.target.value as MaterialType | 'ALL')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">Alle Materialien filtern</option>
              {ALL_MATERIALS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Keeper Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1 flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Keeper:</span>
            </span>
            <div className="grid grid-cols-8 gap-1 flex-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setKeeperFilter('ALL')}
                className={cn(
                  "py-1 text-[11px] font-bold rounded-lg transition-all text-center",
                  keeperFilter === 'ALL'
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
                title="Alle Keeper-Anzahlen"
              >
                Alle
              </button>
              {[1, 2, 3, 4, 5, 6, 7].map(kNum => (
                <button
                  key={kNum}
                  type="button"
                  onClick={() => setKeeperFilter(kNum)}
                  className={cn(
                    "py-1 text-[11px] font-bold rounded-lg transition-all text-center",
                    keeperFilter === kNum
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                  title={`${kNum} Torhüter`}
                >
                  {kNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sichtbarkeits-Filter (Eigene vs. Veröffentlichte Übungen vs. Favoriten) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sichtbarkeit / Quelle:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setScopeFilter('ALL')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition border",
                scopeFilter === 'ALL'
                  ? "bg-emerald-600 text-white border-emerald-500 shadow"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
            >
              Alle ({exercises.length})
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('FAVORITES')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1.5",
                scopeFilter === 'FAVORITES'
                  ? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Star className={cn("w-3.5 h-3.5", scopeFilter === 'FAVORITES' ? "fill-slate-950 text-slate-950" : "text-amber-400 fill-amber-400/30")} />
              <span>Favoriten ({exercises.filter(e => e.id && favoriteExerciseIds.includes(e.id)).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('MINE')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1.5",
                scopeFilter === 'MINE'
                  ? "bg-sky-600 text-white border-sky-500 shadow"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
            >
              <User className="w-3 h-3" />
              <span>Nur meine ({exercises.filter(e => Boolean(user?.uid && e.ownerId === user.uid)).length})</span>
            </button>
            {clubId && (
              <button
                type="button"
                onClick={() => setScopeFilter('CLUB')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1.5",
                  scopeFilter === 'CLUB'
                    ? "bg-sky-600 text-white border-sky-500 shadow"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Building2 className="w-3 h-3" />
                <span>{clubName || 'Unser Verein'} ({exercises.filter(e => e.clubId === clubId).length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setScopeFilter('PUBLISHED')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1.5",
                scopeFilter === 'PUBLISHED'
                  ? "bg-purple-600 text-white border-purple-500 shadow"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Globe className="w-3 h-3" />
              <span>Nur Akademie ({exercises.filter(e => e.isPublished).length})</span>
            </button>
          </div>
        </div>

        {/* Phase Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition",
              selectedCategory === 'ALL'
                ? "bg-slate-100 text-slate-950 shadow"
                : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
            )}
          >
            Alle Kategorien ({filtered.length})
          </button>

          {EXERCISE_CATEGORIES.map(cat => {
            const count = exercises.filter(e => {
              const matchMat = selectedMaterial === 'ALL' || e.materials?.includes(selectedMaterial);
              const matchKeeper = keeperFilter === 'ALL' || 
                ((e.minKeepers || 1) <= keeperFilter && (e.maxKeepers || 7) >= keeperFilter);
              const matchScope = 
                scopeFilter === 'ALL' ||
                (scopeFilter === 'FAVORITES' && Boolean(e.id && favoriteExerciseIds.includes(e.id))) ||
                (scopeFilter === 'MINE' && Boolean(user?.uid && e.ownerId === user.uid)) ||
                (scopeFilter === 'PUBLISHED' && e.isPublished === true);
              return e.category === cat && matchMat && matchKeeper && matchScope;
            }).length;

            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition border",
                  isSelected
                    ? cn(CATEGORY_COLORS[cat].bg, CATEGORY_COLORS[cat].text, CATEGORY_COLORS[cat].border, "shadow")
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Exercise Cards */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Layers className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-lg font-bold text-slate-300">Keine Übungen gefunden</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Passe deine Filtereinstellungen an oder lege eine neue Torwart-Übung für deinen Katalog an.
          </p>
          <button
            type="button"
            onClick={onNewExercise}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900/40 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Erste Übung anlegen</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(exercise => {
            const isExpanded = Boolean(exercise.id && expandedExerciseIds[exercise.id]);
            const isQuickAddOpen = Boolean(exercise.id && quickAddMenuExerciseId === exercise.id);

            return (
              <div
                key={exercise.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-xl transition flex flex-col relative group"
              >
                {/* Card Thumbnail Image */}
                <div 
                  onClick={() => setPreviewExercise(exercise)}
                  className="aspect-[720/500] bg-slate-950 relative overflow-hidden border-b border-slate-800 cursor-pointer group/img"
                  title="Klicken für Vollbildansicht mit Legende"
                >
                  {(exercise.imageUrl || exercise.imageBase64) ? (
                    <img
                      src={exercise.imageUrl || exercise.imageBase64}
                      alt={exercise.title}
                      className="w-full h-full object-contain group-hover/img:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                      <Layers className="w-8 h-8" />
                      <span className="text-xs">Keine Grafik</span>
                    </div>
                  )}

                  {/* Badge Overlay Top-Left */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                    <span className={cn("text-[11px] px-2.5 py-0.5 rounded-md font-extrabold border shadow-md backdrop-blur-md", CATEGORY_COLORS[exercise.category].badge)}>
                      {exercise.category}
                    </span>
                    {exercise.isPublished ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-purple-950/90 text-purple-300 border border-purple-700/80 shadow-md backdrop-blur-md flex items-center gap-1">
                        <Globe className="w-3 h-3 text-purple-400" />
                        <span>Akademie</span>
                      </span>
                    ) : exercise.clubId ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-sky-950/90 text-sky-300 border border-sky-700/80 shadow-md backdrop-blur-md flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-sky-400" />
                        <span>{exercise.clubName || 'Verein'}{exercise.isClubPublished ? '' : ' (Entwurf)'}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-900/90 text-slate-300 border border-slate-700/80 shadow-md backdrop-blur-md flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Privat</span>
                      </span>
                    )}
                  </div>

                  {/* Favorite Toggle & Usage Count Badge Top-Right */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    <span 
                      className="bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded-xl text-[11px] font-extrabold text-slate-300 border border-slate-800 shadow-md flex items-center gap-1"
                      title={`${exercise.id ? (exerciseUsageMap[exercise.id] || 0) : 0}x in der Historie der Trainingseinheiten durchgeführt`}
                    >
                      <History className="w-3 h-3 text-sky-400" />
                      <span>{exercise.id ? (exerciseUsageMap[exercise.id] || 0) : 0}x</span>
                    </span>

                    {exercise.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteExercise(exercise.id!);
                        }}
                        className={cn(
                          "p-1.5 rounded-xl backdrop-blur-md border transition shadow-md cursor-pointer",
                          isExerciseFavorite(exercise.id)
                            ? "bg-amber-950/90 border-amber-500 text-amber-400 shadow-amber-950/60"
                            : "bg-slate-950/80 border-slate-700/80 text-slate-400 hover:text-amber-400 hover:bg-slate-900"
                        )}
                        title={isExerciseFavorite(exercise.id) ? "Aus Favoriten entfernen" : "Als Favorit markieren"}
                      >
                        <Star className={cn("w-4 h-4", isExerciseFavorite(exercise.id) ? "fill-amber-400 text-amber-400" : "")} />
                      </button>
                    )}
                  </div>

                  {/* Zoom Hint Bottom-Left */}
                  <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 border border-slate-800 opacity-0 group-hover/img:opacity-100 transition flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-emerald-400" />
                    <span>Großansicht</span>
                  </div>

                  {/* Duration Badge Bottom-Right */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-semibold text-slate-300 border border-slate-800">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>{exercise.durationMinutes || 15} Min.</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 
                        onClick={() => toggleExpand(exercise.id!, {} as any)}
                        className="font-extrabold text-base text-slate-100 hover:text-emerald-400 transition line-clamp-2 cursor-pointer"
                        title="Klicken zum Ein-/Ausklappen der Details"
                      >
                        {exercise.title}
                      </h3>
                    </div>

                    {/* Attributes Badges */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3 text-sky-400" />
                        <span>{exercise.minKeepers || 1}–{exercise.maxKeepers || 4} TW</span>
                      </span>

                      {exercise.minAgeGroup && exercise.minAgeGroup !== 'immer' && (
                        <span className="bg-purple-950/50 text-purple-300 px-2 py-0.5 rounded border border-purple-800/70 font-semibold flex items-center gap-1">
                          <Tag className="w-3 h-3 text-purple-400" />
                          <span>ab {exercise.minAgeGroup}</span>
                        </span>
                      )}

                      {exercise.atSchwerpunkt && (
                        <span className="bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60 font-semibold">
                          {exercise.atSchwerpunkt}
                        </span>
                      )}

                      {exercise.athletikSchwerpunkt && (
                        <span className="bg-blue-950/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/60 font-semibold">
                          {exercise.athletikSchwerpunkt}
                        </span>
                      )}

                      {exercise.athletischerEntwicklungsreiz && (
                        <span className="bg-sky-950/40 text-sky-300 px-2 py-0.5 rounded border border-sky-800/60 font-semibold">
                          Reiz: {exercise.athletischerEntwicklungsreiz}
                        </span>
                      )}

                      {exercise.technik && (
                        <span className="bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 font-semibold truncate max-w-[160px]" title={exercise.technik}>
                          {exercise.technik}
                        </span>
                      )}

                      {exercise.situativeSchwerpunkte && exercise.situativeSchwerpunkte.map(s => (
                        <span key={s} className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold" title={s}>
                          {s}
                        </span>
                      ))}

                      {exercise.siegbedingung && (
                        <span className="bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded border border-rose-800/60 font-semibold flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-rose-400" />
                          <span>Siegbedingung</span>
                        </span>
                      )}
                    </div>

                    {/* Rejection Notice Callout (if rejected by Club-Admin) */}
                    {exercise.rejectionReason && !exercise.isClubPublished && !exercise.isPublished && (
                      <div className="p-2.5 bg-amber-950/70 border border-amber-500/80 rounded-xl text-amber-200 text-xs space-y-1">
                        <span className="font-extrabold text-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Hinweis vom Club-Admin:</span>
                        </span>
                        <p className="text-[11px] text-amber-100 italic bg-amber-950/40 p-1.5 rounded border border-amber-800/60">
                          "{exercise.rejectionReason}"
                        </p>
                      </div>
                    )}

                    {/* Inline Accordion Expand Toggle */}
                    <button
                      type="button"
                      onClick={(e) => toggleExpand(exercise.id!, e)}
                      className="w-full mt-1 py-1.5 px-3 rounded-xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/90 hover:border-slate-700 text-[11px] font-bold text-slate-300 hover:text-emerald-400 flex items-center justify-between gap-2 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isExpanded ? 'Details einklappen' : 'Ablauf & Coaching einblenden'}</span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Inline Expanded Content (Ablauf, Coaching, Methodik, Material) */}
                    {isExpanded ? (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800/90 space-y-3 text-xs animate-in fade-in duration-200">
                        {/* Ablauf */}
                        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                            Ablauf der Übung:
                          </span>
                          <p className="text-slate-200 font-mono text-[11px] whitespace-pre-line leading-relaxed">
                            {exercise.ablauf}
                          </p>
                        </div>

                        {/* Coaching Punkte */}
                        {exercise.coachingPoints && (
                          <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-900/50 space-y-1">
                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Coaching-Punkte / Trainer-Tipps:</span>
                            </span>
                            <p className="text-emerald-200 text-[11.5px] whitespace-pre-line leading-relaxed">
                              {exercise.coachingPoints}
                            </p>
                          </div>
                        )}

                        {/* Methodische Stufen (for Analytisch) */}
                        {exercise.category === 'Analytisch' && exercise.methodischeReiheStufen && (
                          <div className="bg-purple-950/25 p-3 rounded-xl border border-purple-900/40 space-y-2">
                            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider block">
                              Methodische Reihe:
                            </span>
                            <div className="space-y-1.5">
                              {(Object.keys(METHODISCHE_REIHE_LABELS) as (keyof typeof METHODISCHE_REIHE_LABELS)[]).map(k => {
                                const desc = exercise.methodischeReiheStufen?.[k];
                                if (!desc) return null;
                                return (
                                  <div key={k} className="bg-slate-950/90 p-2 rounded-lg border border-purple-900/30">
                                    <span className="text-[10.5px] font-bold text-purple-300 block">{METHODISCHE_REIHE_LABELS[k]}:</span>
                                    <span className="text-[11px] text-slate-200">{desc}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Taktikprinzipien (for Situativ / Integrativ) */}
                        {exercise.taktikprinzipien && (
                          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                              Taktikprinzipien:
                            </span>
                            <p className="text-slate-300 text-[11.5px] leading-relaxed">{exercise.taktikprinzipien}</p>
                          </div>
                        )}

                        {/* Siegbedingung (for Wettkämpfe) */}
                        {exercise.siegbedingung && (
                          <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-900/50 space-y-1">
                            <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider block flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              <span>Siegbedingung:</span>
                            </span>
                            <p className="text-rose-200 text-xs font-semibold">{exercise.siegbedingung}</p>
                          </div>
                        )}

                        {/* Material Liste */}
                        {exercise.materials && exercise.materials.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                              Benötigte Materialien:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {exercise.materials.map(m => (
                                <span key={m} className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-800">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-0.5">
                        {exercise.ablauf}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Materials, Publish Toggle (Admin), Quick Add & Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {exercise.materials && exercise.materials.length > 0 
                          ? `${exercise.materials.length} Mat.` 
                          : 'Ohne Mat.'}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (exercise.id) toggleExercisePublishStatus(exercise.id, !exercise.isPublished);
                          }}
                          title={exercise.isPublished ? "Auf Privat setzen" : "Für alle Trainer veröffentlichen"}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border transition flex items-center gap-1",
                            exercise.isPublished 
                              ? "bg-purple-950 text-purple-300 border-purple-800 hover:bg-purple-900" 
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          {exercise.isPublished ? <Globe className="w-2.5 h-2.5 text-purple-400" /> : <EyeOff className="w-2.5 h-2.5 text-slate-500" />}
                          <span>{exercise.isPublished ? 'Öffentlich' : 'Freigeben'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick-Add to Plan Button & Dropdown */}
                      {onAddToPlan && exercise.id && (
                        <div className="relative" ref={isQuickAddOpen ? quickAddRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickAddMenuExerciseId(prev => prev === exercise.id ? null : exercise.id!);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 transition shadow-sm",
                              addedToast?.exerciseId === exercise.id
                                ? "bg-emerald-500 text-slate-950 shadow-emerald-500/50"
                                : "bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-950/60"
                            )}
                            title="Zu einer Phase im Trainingsplan hinzufügen"
                          >
                            {addedToast?.exerciseId === exercise.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{addedToast.phaseName}!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                <span>In Plan</span>
                              </>
                            )}
                          </button>

                          {/* Quick Add Phase Selector Dropdown */}
                          {isQuickAddOpen && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-full mb-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                            >
                              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-800">
                                In welche Phase ablegen?
                              </div>
                              <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                                {(activeStructure?.phases || []).map((phase, idx) => {
                                  const normalize = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                  const isRecommended = 
                                    (phase.categoryKey && normalize(phase.categoryKey) === normalize(exercise.category)) ||
                                    normalize(phase.name).includes(normalize(exercise.category));

                                  return (
                                    <button
                                      key={phase.id}
                                      type="button"
                                      onClick={(e) => handleAddExerciseToPhase(exercise, phase.id, phase.name, e)}
                                      className={cn(
                                        "w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-1.5 transition",
                                        isRecommended
                                          ? "bg-emerald-950/80 text-emerald-200 border border-emerald-700/80 hover:bg-emerald-900"
                                          : "text-slate-300 hover:bg-slate-800 border border-transparent"
                                      )}
                                    >
                                      <span className="truncate">{idx + 1}. {phase.name}</span>
                                      {isRecommended && (
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                                          Passend
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions: Bearbeiten is available to EVERY user. Toggle / Delete are role-restricted */}
                      <div className="flex items-center gap-1">
                        {/* Club-Admin Quick Toggle */}
                        {((isClubAdmin && exercise.clubId === clubId) || isMasterAdmin) && exercise.clubId && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await toggleClubPublishStatus(exercise.id!, !exercise.isClubPublished);
                              } catch (err) {
                                console.error('Error toggling club publish:', err);
                              }
                            }}
                            title={exercise.isClubPublished ? "Im Verein aktiv (Klicken zum Deaktivieren)" : "Für Verein freigeben"}
                            className={cn(
                              "p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border cursor-pointer",
                              exercise.isClubPublished
                                ? "bg-sky-950/80 text-sky-300 border-sky-700 hover:bg-sky-900"
                                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-sky-300 hover:border-sky-700"
                            )}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Button Erfahrungen */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExperienceExercise(exercise);
                          }}
                          title="Erfahrungen mit der Übung ansehen"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-950/40 transition cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {getAuthorizedExerciseExperiences(exercise.id!, savedPlans, user, isMasterAdmin, isClubAdmin, clubId).length > 0 && (
                            <span className="text-[10px] font-mono font-bold text-amber-400">
                              {getAuthorizedExerciseExperiences(exercise.id!, savedPlans, user, isMasterAdmin, isClubAdmin, clubId).length}
                            </span>
                          )}
                        </button>

                        {/* Bearbeiten für ALLE Nutzer (Master-Admin, Club Admin, Club Coach, Nutzer) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditExercise(exercise);
                          }}
                          title="Übung bearbeiten / anpassen"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-950/40 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Löschen nur für berechtigte Personen */}
                        {(isMasterAdmin || (isClubAdmin && exercise.clubId === clubId) || (user && exercise.ownerId === user.uid)) && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(exercise.id!, e)}
                            title="Löschen"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Exercise Usage History Ranking Modal */}
      <ExerciseUsageRankingModal
        isOpen={isRankingModalOpen}
        onClose={() => setIsRankingModalOpen(false)}
        exercises={exercises}
        savedPlans={savedPlans}
        onPreviewExercise={(ex) => setPreviewExercise(ex)}
      />

      {/* Global Exercise Details Modal */}
      <ExerciseModal
        exercise={previewExercise}
        onClose={() => setPreviewExercise(null)}
        onEdit={onEditExercise}
        savedPlans={savedPlans}
      />

      {/* Exercise Experiences Modal */}
      {experienceExercise && (
        <ExerciseExperiencesModal
          isOpen={Boolean(experienceExercise)}
          onClose={() => setExperienceExercise(null)}
          exercise={experienceExercise}
          savedPlans={savedPlans}
        />
      )}
    </div>
  );
};
