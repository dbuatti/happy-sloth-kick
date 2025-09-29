import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Category } from '@/hooks/useTasks'; // Import Category
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';
import { Appointment } from '@/hooks/useAppointments';
import { UniqueIdentifier } from '@dnd-kit/core';

interface SortableTaskItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  sections: { id: string; name: string }[];
  allCategories: Category[];
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
  doTodayOffIds: Set<string>; // Added doTodayOffIds to the interface
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
  showDragHandle?: boolean;
  insertionIndicator: { id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null;
  isSelected: boolean;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
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
  doTodayOffIds, // Destructure doTodayOffIds
  scheduledTasksMap,
  isDemo = false,
  showDragHandle = false,
  onDelete,
  onUpdate,
  sections,
  allCategories,
  onOpenOverview,
  currentDate,
  onMoveUp,
  onMoveDown,
  insertionIndicator,
  isSelected,
  onSelectTask,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task }, disabled: isDemo || !!task.parent_task_id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform || null),
    transition,
    opacity: isDragging && !isOverlay ? 0 : 1,
    visibility: isDragging && !isOverlay ? 'hidden' : undefined,
  };

  const directSubtasks = allTasks.filter(t => t.parent_task_id === task.id)
                                 .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

  const isExpanded = expandedTasks[task.id] !== false;

  const showInsertionBefore = insertionIndicator?.id === task.id && insertionIndicator.position === 'before';
  const showInsertionAfter = insertionIndicator?.id === task.id && insertionIndicator.position === 'after';

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
        "flex items-center"
      )}
      {...attributes}
      {...listeners}
    >
      {showInsertionBefore && (
        <div className="absolute -top-1 left-0 right-0 h-1 w-full bg-primary rounded-full z-10 animate-pulse" />
      )}
      <div className={cn(
        "flex-1",
        level > 0 && "relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary/30", // Vertical line adjusted to left-4
        `pl-${level * 8}` // Tailwind's `pl-8`, `pl-16`, etc. for deeper indentation
      )}>
        <TaskItem
          task={task}
          hasSubtasks={directSubtasks.length > 0}
          isExpanded={isExpanded}
          toggleExpand={toggleTask} // Pass toggleTask as toggleExpand
          allTasks={allTasks}
          onDelete={onDelete}
          onUpdate={onUpdate}
          sections={sections}
          allCategories={allCategories}
          onOpenOverview={onOpenOverview}
          currentDate={currentDate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          level={level}
          isOverlay={isOverlay}
          setFocusTask={setFocusTask}
          isDoToday={isDoToday}
          toggleDoToday={toggleDoToday}
          doTodayOffIds={doTodayOffIds} // Pass doTodayOffIds
          scheduledTasksMap={scheduledTasksMap}
          scheduledAppointment={scheduledTasksMap.get(task.id)} // Pass scheduledAppointment
          isDemo={isDemo}
          showDragHandle={showDragHandle}
          isSelected={isSelected}
          onSelectTask={onSelectTask}
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
                allCategories={allCategories}
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
                doTodayOffIds={doTodayOffIds} // Pass doTodayOffIds
                scheduledTasksMap={scheduledTasksMap}
                isDemo={isDemo}
                showDragHandle={showDragHandle}
                insertionIndicator={insertionIndicator}
                isSelected={isSelected}
                onSelectTask={onSelectTask}
              />
            ))}
          </ul>
        )}
      </div>
      {showInsertionAfter && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 w-full bg-primary rounded-full z-10 animate-pulse" />
      )}
    </li>
  );
};

export default SortableTaskItem;