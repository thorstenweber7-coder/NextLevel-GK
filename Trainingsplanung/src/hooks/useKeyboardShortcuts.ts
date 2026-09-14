import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onSave?: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSave,
  onExportPdf,
  onPrint,
  onSearch,
  onEscape,
  enabled = true
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Escape always triggers
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (isCmdOrCtrl) {
        const key = e.key.toLowerCase();
        if (key === 's' && onSave) {
          e.preventDefault();
          onSave();
        } else if (key === 'p' && (onPrint || onExportPdf)) {
          e.preventDefault();
          if (onPrint) onPrint();
          else if (onExportPdf) onExportPdf();
        } else if (key === 'k' && onSearch) {
          e.preventDefault();
          onSearch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onSave, onExportPdf, onPrint, onSearch, onEscape]);
}
