import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DevIdea, UpdateDevIdeaData, SortableCustomCardProps } from '@/types'; // Corrected import for DevIdea
import DevIdeaCard from './DevIdeaCard';

interface SortableDevIdeaCardProps {
  id: string;
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: DevIdea['status']) => void;
  onUpdatePriority: (id: string, priority: DevIdea['priority']) => void;
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
    zIndex: isDragging ? 10 : 0,
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