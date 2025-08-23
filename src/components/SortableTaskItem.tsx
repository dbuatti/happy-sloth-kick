import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import { Task, TaskCategory } from '@/types';

interface SortableTaskItemProps {
  task: Task;
  categories: TaskCategory[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  isFocusedTask: boolean;
  subtasks: Task[];
  renderSubtasks: (parentTaskId: string) => React.ReactNode;
}

export const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  categories,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  isFocusedTask,
  subtasks,
  renderSubtasks,
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
    zIndex: isDragging ? 100 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem
        task={task}
        categories={categories}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
        isFocusedTask={isFocusedTask}
        subtasks={subtasks}
        renderSubtasks={renderSubtasks}
      />
    </div>
  );
};