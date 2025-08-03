import React, { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DevIdea } from '@/hooks/useDevIdeas';
import DevIdeaCard from './DevIdeaCard';
import { showSuccess, showError } from '@/utils/toast';

interface SortableDevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
}

const SortableDevIdeaCard: React.FC<SortableDevIdeaCardProps> = ({ idea, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const pointerDownPos = useRef<{x: number, y: number} | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (listeners?.onPointerDown) {
      listeners.onPointerDown(e);
    }
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerDownPos.current) {
      const deltaX = Math.abs(e.clientX - pointerDownPos.current.x);
      const deltaY = Math.abs(e.clientY - pointerDownPos.current.y);
      
      // Tolerance for what is considered a click vs a drag
      const clickTolerance = 5; 

      if (deltaX < clickTolerance && deltaY < clickTolerance) {
        // This is a click, perform the action
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        const textToCopy = `${idea.title}${idea.description ? `\n\n${idea.description}` : ''}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
          showSuccess('Idea copied to clipboard!');
        }).catch(err => {
          console.error('Failed to copy text: ', err);
          showError('Could not copy idea to clipboard.');
        });
      }
    }
    pointerDownPos.current = null;
  };

  const customListeners = {
    ...listeners,
    onPointerDown: handlePointerDown,
  };

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...customListeners}
        onPointerUp={handlePointerUp}
    >
        <DevIdeaCard idea={idea} onEdit={onEdit} />
    </div>
  );
};

export default SortableDevIdeaCard;