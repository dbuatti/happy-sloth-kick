import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DevIdea } from '@/hooks/useDevIdeas';
import DevIdeaCard from './DevIdeaCard';

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

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
    >
        <DevIdeaCard idea={idea} onEdit={onEdit} dragListeners={listeners} />
    </div>
  );
};

export default SortableDevIdeaCard;