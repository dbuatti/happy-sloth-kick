import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DevIdea } from '@/types';
import DevIdeaCard from './DevIdeaCard';

interface SortableDevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
  onDelete: (id: string) => void;
}

const SortableDevIdeaCard: React.FC<SortableDevIdeaCardProps> = ({ idea, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: idea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DevIdeaCard idea={idea} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};

export default SortableDevIdeaCard;