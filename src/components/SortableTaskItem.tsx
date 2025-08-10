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
  level: number; // New prop for indentation level
  allTasks: Task[]; // Pass all tasks to filter subtasks
  isOverlay?: boolean; // New prop for drag overlay
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => void;
  doTodayOffIds: Set<string>;
  scheduledTasksMap: Map<string, Appointment>;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  level,
  allTasks,
  isOverlay = false, // Default to false
  setFocusTask,
  isDoToday,
  toggleDoToday,
  doTodayOffIds,
  scheduledTasksMap,
  ...rest
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform || null), // Correctly handle null transform
    transition,
    paddingLeft: `${level * 12}px`,
  };

  const directSubtasks = allTasks.filter(t => t.parent_task_id === task.id)
                                 .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} style={style} className="h-16 bg-muted/50 border-2 border-dashed border-border rounded-lg" />;
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative last:border-b-0 group",
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card rounded-lg" : "",
        level > 0 ? "border-l border-l-primary/50" : "",
        "flex items-center"
      )}
      {...attributes}
    >
      <div className="flex-1"> {/* This div now contains the TaskItem and subtasks */}
        <TaskItem
          task={task}
          allTasks={allTasks}
          {...rest}
          isOverlay={isOverlay}
          dragListeners={listeners}
          setFocusTask={setFocusTask}
          isDoToday={isDoToday}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
        />
        {directSubtasks.length > 0 && (
          <ul className="list-none mt-1.5 space-y-1.5">
            {directSubtasks.map(subtask => (
              <SortableTaskItem
                key={subtask.id}
                task={subtask}
                level={level + 1}
                allTasks={allTasks}
                {...rest}
                isOverlay={isOverlay}
                setFocusTask={setFocusTask}
                isDoToday={!doTodayOffIds.has(subtask.original_task_id || subtask.id)}
                toggleDoToday={toggleDoToday}
                doTodayOffIds={doTodayOffIds}
                scheduledTasksMap={scheduledTasksMap}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
};

export default SortableTaskItem;