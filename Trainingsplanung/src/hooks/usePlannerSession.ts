import { useState, useCallback, useEffect } from 'react';
import type { TrainingPlan, TrainingStructure } from '../types';

export interface UsePlannerSessionProps {
  initialStructure?: TrainingStructure;
  initialPlan?: TrainingPlan | null;
  storageKey?: string;
  onPlanChanged?: (updatedPlan: Partial<TrainingPlan>) => void;
}

export interface UsePlannerSessionReturn {
  // Phase exercises state
  phaseExercises: Record<string, string[]>;
  setPhaseExercises: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  
  // Phase open/collapse states
  openPhases: Record<string, boolean>;
  setOpenPhases: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  togglePhaseOpen: (phaseId: string) => void;
  setAllPhasesOpen: (open: boolean, structurePhases?: { id: string }[]) => void;

  // Immutable Phase Operations
  addExerciseToPhase: (exerciseId: string, phaseId: string) => void;
  removeExerciseFromPhase: (exerciseId: string, phaseId: string, index?: number) => void;
  reorderExerciseInPhase: (phaseId: string, fromIndex: number, toIndex: number) => void;
  moveExerciseBetweenPhases: (exerciseId: string, fromPhaseId: string, toPhaseId: string, targetIndex?: number) => void;
  clearAllPhaseExercises: () => void;

  // Plan Meta & Session Reset
  resetSession: (structure?: TrainingStructure) => void;
}

/**
 * Custom Hook to encapsulate and decouple planner session state management
 * from monolithic view components with immutable updates.
 */
export function usePlannerSession({
  initialStructure,
  initialPlan,
  storageKey,
  onPlanChanged
}: UsePlannerSessionProps = {}): UsePlannerSessionReturn {
  // 1. Initialize Phase Exercises
  const [phaseExercises, setPhaseExercises] = useState<Record<string, string[]>>(() => {
    if (initialPlan?.phaseExercises) {
      return { ...initialPlan.phaseExercises };
    }
    if (initialPlan?.phases) {
      return { ...initialPlan.phases };
    }
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading planner storage in hook:', e);
      }
    }
    const init: Record<string, string[]> = {};
    (initialStructure?.phases || []).forEach(p => {
      init[p.id] = [];
    });
    return init;
  });

  // Sync to localStorage if storageKey is provided
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(phaseExercises));
    } catch (e) {
      console.error('Error syncing planner storage in hook:', e);
    }
  }, [phaseExercises, storageKey]);

  // 2. Initialize Open / Collapsed Phase states
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    (initialStructure?.phases || []).forEach(p => {
      init[p.id] = true;
    });
    return init;
  });

  // Toggle single phase open/collapse
  const togglePhaseOpen = useCallback((phaseId: string) => {
    setOpenPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  }, []);

  // Set all phases open/collapsed
  const setAllPhasesOpen = useCallback((open: boolean, structurePhases?: { id: string }[]) => {
    setOpenPhases(prev => {
      const next: Record<string, boolean> = { ...prev };
      if (structurePhases && structurePhases.length > 0) {
        structurePhases.forEach(p => {
          next[p.id] = open;
        });
      } else {
        Object.keys(next).forEach(k => {
          next[k] = open;
        });
      }
      return next;
    });
  }, []);

  // Immutable Add Exercise to Phase
  const addExerciseToPhase = useCallback((exerciseId: string, phaseId: string) => {
    setPhaseExercises(prev => {
      const currentList = prev[phaseId] || [];
      const updatedList = [...currentList, exerciseId];
      const nextState = {
        ...prev,
        [phaseId]: updatedList
      };
      onPlanChanged?.({ phaseExercises: nextState });
      return nextState;
    });
  }, [onPlanChanged]);

  // Immutable Remove Exercise from Phase
  const removeExerciseFromPhase = useCallback((exerciseId: string, phaseId: string, index?: number) => {
    setPhaseExercises(prev => {
      const currentList = prev[phaseId] || [];
      let updatedList: string[];
      if (typeof index === 'number' && index >= 0 && index < currentList.length) {
        updatedList = currentList.filter((_, idx) => idx !== index);
      } else {
        const foundIdx = currentList.indexOf(exerciseId);
        if (foundIdx === -1) return prev;
        updatedList = currentList.filter((_, idx) => idx !== foundIdx);
      }
      const nextState = {
        ...prev,
        [phaseId]: updatedList
      };
      onPlanChanged?.({ phaseExercises: nextState });
      return nextState;
    });
  }, [onPlanChanged]);

  // Immutable Reorder within a Phase
  const reorderExerciseInPhase = useCallback((phaseId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setPhaseExercises(prev => {
      const currentList = prev[phaseId] || [];
      if (fromIndex < 0 || fromIndex >= currentList.length || toIndex < 0 || toIndex >= currentList.length) {
        return prev;
      }
      const updatedList = [...currentList];
      const [movedItem] = updatedList.splice(fromIndex, 1);
      updatedList.splice(toIndex, 0, movedItem);
      const nextState = {
        ...prev,
        [phaseId]: updatedList
      };
      onPlanChanged?.({ phaseExercises: nextState });
      return nextState;
    });
  }, [onPlanChanged]);

  // Immutable Move between Phases
  const moveExerciseBetweenPhases = useCallback((
    exerciseId: string, 
    fromPhaseId: string, 
    toPhaseId: string, 
    targetIndex?: number
  ) => {
    setPhaseExercises(prev => {
      const sourceList = prev[fromPhaseId] || [];
      const targetList = prev[toPhaseId] || [];
      const fromIdx = sourceList.indexOf(exerciseId);
      if (fromIdx === -1) return prev;

      const newSource = sourceList.filter((_, idx) => idx !== fromIdx);
      const newTarget = [...targetList];
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= newTarget.length) {
        newTarget.splice(targetIndex, 0, exerciseId);
      } else {
        newTarget.push(exerciseId);
      }

      const nextState = {
        ...prev,
        [fromPhaseId]: newSource,
        [toPhaseId]: newTarget
      };
      onPlanChanged?.({ phaseExercises: nextState });
      return nextState;
    });
  }, [onPlanChanged]);

  // Clear all phase exercises
  const clearAllPhaseExercises = useCallback(() => {
    setPhaseExercises(prev => {
      const nextState: Record<string, string[]> = {};
      Object.keys(prev).forEach(k => {
        nextState[k] = [];
      });
      onPlanChanged?.({ phaseExercises: nextState });
      return nextState;
    });
  }, [onPlanChanged]);

  // Reset entire session
  const resetSession = useCallback((structure?: TrainingStructure) => {
    const struct = structure || initialStructure;
    const initPhases: Record<string, string[]> = {};
    const initOpen: Record<string, boolean> = {};
    (struct?.phases || []).forEach(p => {
      initPhases[p.id] = [];
      initOpen[p.id] = true;
    });
    setPhaseExercises(initPhases);
    setOpenPhases(initOpen);
  }, [initialStructure]);

  return {
    phaseExercises,
    setPhaseExercises,
    openPhases,
    setOpenPhases,
    togglePhaseOpen,
    setAllPhasesOpen,
    addExerciseToPhase,
    removeExerciseFromPhase,
    reorderExerciseInPhase,
    moveExerciseBetweenPhases,
    clearAllPhaseExercises,
    resetSession
  };
}
