import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard, { TaskCardProps } from './TaskCard'; // Import TaskCardProps as a type

interface SortableTaskCardProps extends TaskCardProps {
  // Any additional props specific to SortableTaskCard if needed
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard {...props} isDragging={isDragging} />
    </div>
  );
};

export default SortableTaskCard;