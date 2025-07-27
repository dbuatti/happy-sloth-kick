import { PointerSensor } from '@dnd-kit/core';

// Custom PointerSensor to ignore drag events on elements with data-no-dnd="true"
export class CustomPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }) => {
        // Ignore clicks on interactive elements
        if (event.target instanceof HTMLElement && event.target.closest('[data-no-dnd="true"]')) {
          return false;
        }
        return true;
      },
    },
  ];
}