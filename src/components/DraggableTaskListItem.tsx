import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus } from '@/types/task';
import TaskItem from './TaskItem';
import { DraggableTaskListItemProps } from '@/types/props';

const DraggableTaskListItem: React.FC<DraggableTaskListItemProps> = ({
  task,
  onEdit,
  onDelete,
  onUpdate,
  allTasks,
  onStatusChange,
  onOpenOverview,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem
        task={task}
        allTasks={allTasks}
        sections={[]} // Placeholder, pass actual sections if available
        categories={[]} // Placeholder, pass actual categories if available
        onStatusChange={onStatusChange}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onOpenOverview={onOpenOverview}
        onOpenDetail={onEdit}
        onAddTask={() => Promise.resolve(null)} // Placeholder
        onReorderTasks={() => Promise.resolve()} // Placeholder
      />
    </div>
  );
};

export default DraggableTaskListItem;