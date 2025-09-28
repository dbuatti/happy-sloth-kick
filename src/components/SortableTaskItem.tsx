import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';
import { Appointment } from '@/hooks/useAppointments';

interface SortableTaskItemProps {
  task: Task;
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
  onDelete,
  onUpdate,
  sections,
  onOpenOverview,
  currentDate,
  onMoveUp,
  onMoveDown,
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
      className={cn(
        "relative last:border-b-0 group select-none",
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card rounded-lg" : "",
        level > 0 ? "border-l border-l-primary/50" : "",
        "flex items-center"
      )}
      {...attributes} // Apply attributes to the whole li for dragging
      {...listeners} // Apply listeners to the whole li for dragging
    >
      <div className="flex-1">
        <TaskItem
          task={task}
          hasSubtasks={directSubtasks.length > 0}
          isExpanded={isExpanded}
          toggleTask={toggleTask}
          allTasks={allTasks}
          onDelete={onDelete}
          onUpdate={onUpdate}
          sections={sections}
          onOpenOverview={onOpenOverview}
          currentDate={currentDate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          isOverlay={isOverlay}
          setFocusTask={setFocusTask}
          isDoToday={isDoToday}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
          level={level}
        />
        {isExpanded && directSubtasks.length > 0 && (
          <ul className="list-none mt-1.5 space-y-1.5">
            {directSubtasks.map(subtask => (
              <SortableTaskItem
                key={subtask.id}
                task={subtask}
                level={level + 1}
                allTasks={allTasks}
                onDelete={onDelete}
                onUpdate={onUpdate}
                sections={sections}
                onOpenOverview={onOpenOverview}
                currentDate={currentDate}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
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