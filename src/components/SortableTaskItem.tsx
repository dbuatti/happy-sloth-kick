import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Task, TaskSection } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import * as dateFns from 'date-fns'; // Import all functions from date-fns as dateFns

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
  currentDate: Date;
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
  currentDate,
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
    cursor: isDragging ? 'grabbing' : 'grab', // Add grab cursor to the whole item
  };

  const currentRefDate = new Date(currentDate);

  // Changed isPast to isBefore
  const isOverdue = task.due_date && task.status !== 'completed' && dateFns.isBefore(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date) && !dateFns.isSameDay(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date);
  const isUpcoming = task.due_date && task.status !== 'completed' && dateFns.isSameDay(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date);

  return (
    <li
      key={task.id}
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative border rounded-lg p-3 transition-all duration-200 ease-in-out",
        "group",
        "hover:shadow-md",
        {
          "border-green-300 dark:border-green-700 bg-green-50/20 dark:bg-green-900/20": task.status === 'completed',
          "border-border bg-card dark:bg-gray-800": task.status !== 'completed',
        },
        isOverdue && "border-l-4 border-red-500 dark:border-red-700 bg-red-100 dark:bg-red-900/30 pl-2",
        isUpcoming && "border-l-4 border-orange-400 dark:border-orange-600 bg-orange-50/20 dark:bg-orange-900/20 pl-2",
        isDragging && "shadow-lg ring-2 ring-primary"
      )}
      {...attributes}
      {...listeners} {/* Apply listeners to the whole li */}
    >
      <TaskItem 
        key={task.id}
        task={task} 
        userId={userId}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onUpdate={onUpdate}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        sections={sections}
        onEditTask={onEditTask}
        currentDate={currentDate}
      />
    </li>
  );
};

export default SortableTaskItem;