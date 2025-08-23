import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskCategory, TaskSection } from '@/types';
import TaskItem from './TaskItem';

interface SortableTaskItemProps {
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<void>;
  onToggleFocusMode: (taskId: string) => void;
  onLogDoTodayOff: (taskId: string) => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  categories,
  sections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
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
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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

export default SortableTaskItem;