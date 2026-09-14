import { useState, useEffect, useCallback, useRef } from 'react';
import type { CompetitionRound } from '../types';

export interface LiveSessionDraft {
  planId: string;
  currentIndex: number;
  timeLeft: number;
  competitionRounds: CompetitionRound[];
  liveNote?: string;
  quickRpeRatings?: Record<string, number>;
  quickJumpVolume?: 'low' | 'medium' | 'high' | '';
  quickKeeperJumpVolumes?: Record<string, 'low' | 'medium' | 'high' | string>;
  savedAt: number;
}

const STORAGE_PREFIX = '__gk_live_session_draft_';

export function useLiveSessionPersistence(planId: string | undefined) {
  const storageKey = planId ? `${STORAGE_PREFIX}${planId}` : '';
  const [existingDraft, setExistingDraft] = useState<LiveSessionDraft | null>(null);
  const [hasCheckedDraft, setHasCheckedDraft] = useState<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

  // Check on mount if an active draft exists for this plan
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      setHasCheckedDraft(true);
      return;
    }

    try {
      const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
      if (raw) {
        const parsed: LiveSessionDraft = JSON.parse(raw);
        // Only consider draft valid if it's less than 24 hours old
        if (parsed && parsed.planId === planId && Date.now() - (parsed.savedAt || 0) < 24 * 60 * 60 * 1000) {
          setExistingDraft(parsed);
        } else {
          sessionStorage.removeItem(storageKey);
          localStorage.removeItem(storageKey);
        }
      }
    } catch (err) {
      console.warn('Could not read live session draft:', err);
    } finally {
      setHasCheckedDraft(true);
    }
  }, [storageKey, planId]);

  // Debounced auto-save function
  const saveSessionDraft = useCallback((draftData: Omit<LiveSessionDraft, 'planId' | 'savedAt'>) => {
    if (!storageKey || typeof window === 'undefined') return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        const payload: LiveSessionDraft = {
          ...draftData,
          planId: planId || 'unknown',
          savedAt: Date.now()
        };
        const str = JSON.stringify(payload);
        sessionStorage.setItem(storageKey, str);
        localStorage.setItem(storageKey, str);
      } catch (err) {
        console.warn('Error saving live session draft:', err);
      }
    }, 500);
  }, [storageKey, planId]);

  // Clear draft once session is closed or completed
  const clearSessionDraft = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    try {
      sessionStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey);
      setExistingDraft(null);
    } catch (err) {
      console.warn('Error clearing live session draft:', err);
    }
  }, [storageKey]);

  return {
    hasCheckedDraft,
    hasDraft: Boolean(existingDraft),
    existingDraft,
    saveSessionDraft,
    clearSessionDraft
  };
}
