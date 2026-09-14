import { useState, useCallback } from 'react';

interface UsePlannerDragDropProps {
  setPhaseExercises: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

export function usePlannerDragDrop({ setPhaseExercises }: UsePlannerDragDropProps) {
  const [draggedExerciseId, setDraggedExerciseId] = useState<string | null>(null);
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, exerciseId: string) => {
    e.dataTransfer.setData('text/plain', exerciseId);
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedExerciseId(exerciseId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, phaseId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverPhaseId !== phaseId) {
      setDragOverPhaseId(phaseId);
    }
  }, [dragOverPhaseId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPhaseId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetPhaseId: string) => {
    e.preventDefault();
    setDragOverPhaseId(null);
    const exerciseId = e.dataTransfer.getData('text/plain') || draggedExerciseId;
    if (!exerciseId) return;

    setPhaseExercises(prev => {
      const currentList = prev[targetPhaseId] || [];
      if (currentList.includes(exerciseId)) {
        return prev;
      }
      return {
        ...prev,
        [targetPhaseId]: [...currentList, exerciseId]
      };
    });
    setDraggedExerciseId(null);
  }, [draggedExerciseId, setPhaseExercises]);

  const handleDragEnd = useCallback(() => {
    setDraggedExerciseId(null);
    setDragOverPhaseId(null);
  }, []);

  const addExerciseToPhase = useCallback((exerciseId: string, phaseId: string) => {
    setPhaseExercises(prev => {
      const currentList = prev[phaseId] || [];
      if (currentList.includes(exerciseId)) return prev;
      return {
        ...prev,
        [phaseId]: [...currentList, exerciseId]
      };
    });
  }, [setPhaseExercises]);

  const removeExerciseFromPhase = useCallback((phaseId: string, exerciseId: string) => {
    setPhaseExercises(prev => ({
      ...prev,
      [phaseId]: (prev[phaseId] || []).filter(id => id !== exerciseId)
    }));
  }, [setPhaseExercises]);

  const moveExerciseInPhase = useCallback((phaseId: string, fromIndex: number, toIndex: number) => {
    setPhaseExercises(prev => {
      const list = [...(prev[phaseId] || [])];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return {
        ...prev,
        [phaseId]: list
      };
    });
  }, [setPhaseExercises]);

  return {
    draggedExerciseId,
    dragOverPhaseId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    addExerciseToPhase,
    removeExerciseFromPhase,
    moveExerciseInPhase
  };
}
