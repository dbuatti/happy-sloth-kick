import { PointerSensor } from '@dnd-kit/core';

// Custom PointerSensor to only activate drag on elements with data-dnd-handle="true"
export class CustomPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        // Only activate drag if the pointer down event occurred on an element with data-dnd-handle="true"
        if (event.target instanceof HTMLElement && event.target.closest('[data-dnd-handle="true"]')) {
          return true; // Activate drag
        }
        return false; // Do NOT activate drag otherwise
      },
    },
  ];
}