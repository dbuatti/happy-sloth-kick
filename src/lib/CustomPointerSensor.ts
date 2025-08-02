import { PointerSensor } from '@dnd-kit/core';

// Custom PointerSensor to only activate drag on elements with data-dnd-handle="true"
export class CustomPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }) => {
        // Reverted to default behavior: allow drag unless explicitly marked with data-no-dnd="true"
        if (event.target instanceof HTMLElement && event.target.closest('[data-no-dnd="true"]')) {
          return false; // Do NOT activate drag if it's an interactive element
        }
        return true; // Activate drag otherwise
      },
    },
  ];
}