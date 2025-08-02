import { PointerSensor } from '@dnd-kit/core';

// Custom PointerSensor to activate drag on any part of the draggable element
export class CustomPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: PointerEvent }) => {
        // Activate drag if the pointer down event occurred on any element that is part of a draggable item,
        // but not on interactive elements like buttons, inputs, checkboxes, etc.
        const target = event.target as HTMLElement;
        const isInteractiveElement = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A', 'LABEL'].includes(target.tagName) ||
                                     target.closest('[role="button"], [role="checkbox"], [role="option"]');
        
        // Also, allow dragging if the target has a specific data-dnd-handle attribute (if we ever re-introduce it)
        // For now, we'll allow dragging unless it's an interactive element.
        if (isInteractiveElement) {
          return false; // Do NOT activate drag if it's an interactive element
        }
        
        return true; // Activate drag otherwise
      },
    },
  ];
}