import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Task, TaskSection } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { isPast, isToday, parseISO } from 'date-fns';

interface SortableTaskItemProps {
  task: Task;
  userId: string | null;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<void>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
  sections: TaskSection[];
  onEditTask: (task: Task) => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  userId,
  onStatusChange,
  onDelete,
  onUpdate,
  isSelected,
  onToggleSelect,
  sections,
  onEditTask,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', sectionId: task.section_id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const isUpcoming = task.due_date && task.status !== 'completed' && isToday(parseISO(task.due_date));

  return (
    <li
      key={task.id}
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative border rounded-lg p-3 transition-all duration-200 ease-in-out",
        "group",
        "hover:shadow-md",
        task.status === 'completed' ? "border-green-300 dark:border-green-700 bg-green-50/20 dark:bg-green-900/20" : "border-border bg-card dark:bg-gray-800",
        isOverdue && "border-l-4 border-red-500 dark:border-red-700 bg-red-100 dark:bg-red-900/30 pl-2",
        isUpcoming && "border-l-4 border-orange-400 dark:border-orange-600 bg-orange-50/20 dark:bg-orange-900/20 pl-2",
        isDragging ? "shadow-lg ring-2 ring-primary" : ""
      )}
      {...attributes}
      {...(listeners || {})}
    >
      <TaskItem 
        key={task.id} // Explicitly add key to TaskItem
        task={task} 
        userId={userId}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onUpdate={onUpdate}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        sections={sections}
        onEditTask={onEditTask}
      />
    </li>
  );
};

export default SortableTaskItem;