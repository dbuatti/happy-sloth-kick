import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskSection, TaskCategory, TaskStatus } from '@/types/task'; // Added missing imports
import TaskItem from './TaskItem';
import { SortableTaskItemProps } from '@/types/props';

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
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
  } = useSortable({ id: task.id });

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
      />
    </div>
  );
};

export default SortableTaskItem;