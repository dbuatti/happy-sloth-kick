import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Task, TaskCategory, TaskSection } from '@/types';
import { cn } from '@/lib/utils';
import TaskItem from './TaskItem';

interface DraggableTaskListItemProps {
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<void>;
  onToggleFocusMode: (taskId: string) => void;
  onLogDoTodayOff: (taskId: string) => void;
}

const DraggableTaskListItem: React.FC<DraggableTaskListItemProps> = ({
  task,
  categories,
  sections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskItem
        task={task}
        categories={categories}
        sections={sections}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
      />
    </div>
  );
};

export default DraggableTaskListItem;