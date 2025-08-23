import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import TaskItem from './TaskItem'; // Assuming TaskItem is correctly typed
import { TaskCategory } from '@/types';

interface SortableTaskItemProps {
  task: Task;
  allTasks: Task[];
  categories: TaskCategory[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<string>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string>;
  onAddSubtask: (description: string, parentTaskId: string) => Promise<void>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  isFocusedTask: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  allTasks,
  categories,
  onStatusChange,
  onDelete,
  onUpdate,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  isFocusedTask,
  isDragging,
  onDragStart,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const directSubtasks = allTasks.filter(sub => sub.parent_task_id === task.id);

  const renderSubtasks = (parentTaskId: string) => {
    return allTasks
      .filter(sub => sub.parent_task_id === parentTaskId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(subtask => (
        <SortableTaskItem
          key={subtask.id}
          task={subtask}
          allTasks={allTasks}
          categories={categories}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onAddSubtask={onAddSubtask}
          onToggleFocusMode={onToggleFocusMode}
          onLogDoTodayOff={onLogDoTodayOff}
          isFocusedTask={isFocusedTask} // Subtasks inherit focus status from parent for now
          isDragging={isDragging}
          onDragStart={onDragStart}
        />
      ));
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem
        task={task}
        categories={categories}
        onUpdateTask={onUpdate}
        onDeleteTask={onDelete}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
        isFocusedTask={isFocusedTask}
        subtasks={directSubtasks}
        renderSubtasks={renderSubtasks}
        isDragging={isDragging}
        onDragStart={onDragStart}
      />
    </div>
  );
};

export default SortableTaskItem;