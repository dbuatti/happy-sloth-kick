import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';
import { Appointment } from '@/hooks/useAppointments';

interface SortableTaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<string | null>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  sections: { id: string; name: string }[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  onMoveUp: (taskId: string) => Promise<void>;
  onMoveDown: (taskId: string) => Promise<void>;
  level: number;
  allTasks: Task[];
  isOverlay?: boolean;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => void;
  doTodayOffIds: Set<string>;
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  level,
  allTasks,
  isOverlay = false,
  expandedTasks,
  toggleTask,
  setFocusTask,
  isDoToday,
  toggleDoToday,
  doTodayOffIds,
  scheduledTasksMap,
  isDemo = false,
  ...rest
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task }, disabled: isDemo || !!task.parent_task_id }); // Disable drag for subtasks and in demo mode

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform || null),
    transition,
    opacity: isDragging && !isOverlay ? 0 : 1,
    visibility: isDragging && !isOverlay ? 'hidden' : 'visible',
    marginLeft: `${level * 16}px`, // Use marginLeft for indentation
  };

  const directSubtasks = allTasks.filter(t => t.parent_task_id === task.id)
                                 .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

  const isExpanded = expandedTasks[task.id] !== false;

  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} style={style} className="h-16 bg-muted/50 border-2 border-dashed border-border rounded-lg" />;
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes} // Apply attributes here
      {...listeners}   // Apply listeners here
      className={cn(
        "relative last:border-b-0 group select-none",
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card rounded-lg" : "",
        level > 0 ? "border-l border-l-primary/50" : "",
        "flex items-center"
      )}
    >
      <div className="flex-1">
        <TaskItem
          task={task}
          hasSubtasks={directSubtasks.length > 0}
          isExpanded={isExpanded}
          toggleTask={toggleTask}
          allTasks={allTasks}
          {...rest}
          isOverlay={isOverlay}
          setFocusTask={setFocusTask}
          isDoToday={isDoToday}
          toggleDoToday={toggleDoToday}
          doTodayOffIds={doTodayOffIds}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
          level={level}
          // Removed attributes and listeners from here
        />
        {isExpanded && directSubtasks.length > 0 && (
          <ul className="list-none mt-1.5 space-y-1.5">
            {directSubtasks.map(subtask => (
              <SortableTaskItem
                key={subtask.id}
                task={subtask}
                level={level + 1}
                allTasks={allTasks}
                {...rest}
                expandedTasks={expandedTasks}
                toggleTask={toggleTask}
                isOverlay={isOverlay}
                setFocusTask={setFocusTask}
                isDoToday={!doTodayOffIds.has(subtask.original_task_id || subtask.id)}
                toggleDoToday={toggleDoToday}
                doTodayOffIds={doTodayOffIds}
                scheduledTasksMap={scheduledTasksMap}
                isDemo={isDemo}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
};

export default SortableTaskItem;