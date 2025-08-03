import { useEffect } from 'react';

// Define the keyboard shortcut types
type ShortcutHandler = (e: KeyboardEvent) => void;
export type ShortcutMap = { // Added export
  [key: string]: ShortcutHandler;
};

// Custom hook for handling keyboard shortcuts
const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const modifiers = [
        (e.ctrlKey || e.metaKey) ? 'cmd' : null, // Unify Cmd/Ctrl for easier definition
        e.shiftKey ? 'shift' : null,
        e.altKey ? 'alt' : null,
      ].filter(Boolean).join('+');

      const shortcut = modifiers ? `${modifiers}+${key}` : key;
      
      // Allow shortcuts with Cmd/Ctrl to work even when in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && !(e.metaKey || e.ctrlKey)) {
        return;
      }
      
      if (shortcuts[shortcut]) {
        e.preventDefault();
        shortcuts[shortcut](e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

export default useKeyboardShortcuts;