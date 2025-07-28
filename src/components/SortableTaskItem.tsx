import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskSection } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import * as dateFns from 'date-fns';
import { GripVertical } from 'lucide-react'; // Import GripVertical icon

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
  };

  const currentRefDate = new Date(currentDate);

  // Changed isPast to isBefore
  const isOverdue = task.due_date && task.status !== 'completed' && dateFns.isBefore(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date) && !dateFns.isSameDay(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date);
  const isUpcoming = task.due_date && task.status !== 'completed' && dateFns.isSameDay(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date);

  // Construct className using template literals for maximum compatibility
  let className = "relative border rounded-lg p-1.5 transition-all duration-200 ease-in-out group hover:shadow-md"; // Reduced padding from p-2 to p-1.5
  
  if (task.status === 'completed') {
    className += " border-green-300 dark:border-green-700 bg-green-50/20 dark:bg-green-900/20";
  } else {
    className += " border-border bg-card dark:bg-gray-800";
  }

  if (isOverdue) {
    className += " border-l-4 border-red-500 dark:border-red-700 bg-red-100 dark:bg-red-900/30 pl-2";
  }
  if (isUpcoming) {
    className += " border-l-4 border-orange-400 dark:border-orange-600 bg-orange-50/20 dark:bg-orange-900/20 pl-2";
  }
  if (isDragging) {
    className += " shadow-lg ring-2 ring-primary";
  } else {
    className += " hover:scale-[1.005]"; // Subtle lift on hover
  }
  if (isSelected) {
    className += " ring-2 ring-blue-400 dark:ring-blue-600 shadow-lg";
  }

  return (
    <li
      key={task.id}
      ref={setNodeRef}
      style={style}
      className={className}
    >
      <div className="flex items-center">
        <div 
          className="flex-shrink-0 p-1 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          data-dnd-handle="true" // Mark this as the drag handle
        >
          <GripVertical className="h-4 w-4" />
        </div>
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
          onEditTask={onEditTask} // Pass onEditTask to TaskItem
          currentDate={currentDate}
        />
      </div>
    </li>
  );
};

export default SortableTaskItem;