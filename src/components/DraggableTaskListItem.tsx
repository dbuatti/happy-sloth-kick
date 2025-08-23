import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskCategory, TaskSection, DraggableScheduleTaskItemProps } from '@/types';
import { cn } from '@/lib/utils';
import TaskItem from './tasks/TaskItem';

const DraggableTaskListItem: React.FC<DraggableScheduleTaskItemProps> = ({
  task,
  categories,
  sections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 rounded-md bg-white shadow-sm border border-gray-200 text-sm cursor-grab",
        isDragging && "ring-2 ring-blue-500"
      )}
      {...attributes}
      {...listeners}
    >
      <TaskItem
        task={task}
        categories={categories}
        sections={sections}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={async () => {}} // Not applicable for this context
      />
    </div>
  );
};

export default DraggableTaskListItem;