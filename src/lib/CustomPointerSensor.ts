import { PointerSensor } from '@dnd-kit/core';

// Custom PointerSensor to only activate drag on elements with data-dnd-handle="true"
export class CustomPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }) => {
        // Only activate if the event target (or its closest ancestor) has data-dnd-handle="true"
        if (event.target instanceof HTMLElement && event.target.closest('[data-dnd-handle="true"]')) {
          return true; // Activate drag
        }
        return false; // Do NOT activate drag otherwise
      },
    },
  ];
}