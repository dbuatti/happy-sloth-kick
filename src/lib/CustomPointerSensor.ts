import { PointerSensor } from '@dnd-kit/core';

// This custom sensor prevents drag from starting on any element
// that has the `data-no-dnd="true"` attribute on itself or any of its parents.
export class CustomPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        // If the event target is an interactive element or is inside one,
        // check if it or its parents have the 'data-no-dnd' attribute.
        const target = event.target as HTMLElement;
        if (target.closest('[data-no-dnd="true"]')) {
          return false; // Do not activate drag
        }
        
        // Allow drag to start on all other elements.
        return true;
      },
    },
  ];
}