import { PointerSensor } from '@dnd-kit/core';

// Custom PointerSensor that only activates if the event target (or a parent) has data-dnd-handle="true"
export class DragHandlePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }) => {
        // Check if the event target or any of its parents has the data-dnd-handle attribute
        let currentElement: HTMLElement | null = event.target as HTMLElement;
        while (currentElement) {
          if (currentElement.dataset.dndHandle === 'true') {
            return true; // Activate drag if a drag handle is found
          }
          // Also, explicitly prevent drag if a 'no-dnd' element is clicked
          if (currentElement.dataset.noDnd === 'true') {
            return false;
          }
          currentElement = currentElement.parentElement;
        }
        return false; // Do not activate drag if no drag handle is found
      },
    },
  ];
}