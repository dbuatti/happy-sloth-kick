import { useEffect } from 'react';

// Define the keyboard shortcut types
type ShortcutHandler = (e: KeyboardEvent) => void;
type ShortcutMap = {
  [key: string]: ShortcutHandler;
};

// Custom hook for handling keyboard shortcuts
const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Check if the pressed key combination matches any registered shortcut
      const key = e.key.toLowerCase();
      const modifiers = [
        e.ctrlKey ? 'ctrl' : null,
        e.shiftKey ? 'shift' : null,
        e.altKey ? 'alt' : null,
      ].filter(Boolean).join('+');

      const shortcut = modifiers ? `${modifiers}+${key}` : key;
      
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