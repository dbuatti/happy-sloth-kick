import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DevIdea } from '@/types'; // Import from centralized types
import DevIdeaCard from './DevIdeaCard';

interface SortableDevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
  onDelete: (id: string) => void;
}

export const SortableDevIdeaCard: React.FC<SortableDevIdeaCardProps> = ({ idea, onEdit, onDelete }) => {
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
    zIndex: isDragging ? 100 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DevIdeaCard idea={idea} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};