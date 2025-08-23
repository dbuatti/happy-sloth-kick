import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard, { TaskCardProps } from './TaskCard'; // Import TaskCardProps

interface SortableTaskCardProps extends TaskCardProps {
  id: string; // The id for dnd-kit
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({ id, ...props }) => {
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
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard {...props} isDragging={isDragging} />
    </div>
  );
};

export default SortableTaskCard;