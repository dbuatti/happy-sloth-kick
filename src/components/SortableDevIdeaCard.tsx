import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DevIdea, SortableCustomCardProps } from '@/types';
import DevIdeaCard from './DevIdeaCard';

interface SortableDevIdeaCardProps {
  id: string;
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdateStatus: (id: string, status: DevIdea['status']) => Promise<void>;
  onUpdatePriority: (id: string, priority: DevIdea['priority']) => Promise<void>;
  isDragging?: boolean;
}

const SortableDevIdeaCard: React.FC<SortableDevIdeaCardProps> = ({
  id,
  idea,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePriority,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DevIdeaCard
        idea={idea}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdateStatus={onUpdateStatus}
        onUpdatePriority={onUpdatePriority}
      />
    </div>
  );
};

export default SortableDevIdeaCard;