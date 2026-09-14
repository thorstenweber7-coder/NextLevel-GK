import { useEffect, useCallback } from 'react';

export function useDirtyStateTracker(isDirty: boolean, customMessage?: string) {
  const message = customMessage || 'Du hast ungespeicherte Änderungen in deiner Trainingsplanung. Möchtest du die Seite wirklich verlassen?';

  useEffect(() => {
    if (!isDirty || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  const confirmNavigation = useCallback(
    (onConfirmed: () => void) => {
      if (!isDirty) {
        onConfirmed();
        return;
      }
      if (window.confirm(message)) {
        onConfirmed();
      }
    },
    [isDirty, message]
  );

  return { confirmNavigation };
}
