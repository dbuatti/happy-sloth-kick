import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { cn } from '@/lib/utils';
import { Appointment } from '@/hooks/useAppointments';
import { UniqueIdentifier } from '@dnd-kit/core';

interface SortableTaskItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  sections: { id: string; name: string }[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  level: number;
  allTasks: Task[];
  isOverlay?: boolean;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => Promise<void>;
  doTodayOffIds: Set<string>;
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
  showDragHandle?: boolean;
  insertionIndicator: { id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null;
  isSelected: boolean;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  hasSubtasks?: boolean;
  isExpanded?: boolean;
  getSubtasksForTask: (parentTaskId: string) => Task[];
  // Removed toggleExpand as it was redundant with toggleTask
  scheduledAppointment?: Appointment;
  selectedTaskIds: Set<string>; // Added this prop
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
  showDragHandle = false,
  onDelete,
  onUpdate,
  sections,
  onOpenOverview,
  currentDate,
  insertionIndicator,
  isSelected,
  onSelectTask,
  hasSubtasks,
  isExpanded,
  getSubtasksForTask,
  // Removed toggleExpand from destructuring
  scheduledAppointment,
  selectedTaskIds, // Destructure the new prop
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: isDemo,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform || null),
    transition,
    opacity: isDragging && !isOverlay ? 0 : 1,
  };

  const directSubtasks = getSubtasksForTask(task.id);

  const effectiveIsExpanded = isExpanded !== undefined ? isExpanded : expandedTasks[task.id] !== false;

  const showInsertionBefore = insertionIndicator?.id === task.id && insertionIndicator.position === 'before';
  const showInsertionAfter = insertionIndicator?.id === task.id && insertionIndicator.position === 'after';
  const showInsertionInto = insertionIndicator?.id === task.id && insertionIndicator.position === 'into';

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
        "flex items-center",
        showInsertionInto && "bg-primary/10 border-primary"
      )}
    >
      {showInsertionBefore && (
        <div className="absolute -top-1 left-0 right-0 h-1 w-full bg-primary rounded-full z-10 animate-pulse" />
      )}
      <div className={cn(
        "flex-1",
        level > 0 && "relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary/30",
        `pl-${level * 8}`
      )}>
        <TaskItem
          task={task}
          hasSubtasks={hasSubtasks !== undefined ? hasSubtasks : directSubtasks.length > 0}
          isExpanded={effectiveIsExpanded}
          toggleExpand={toggleTask}
          allTasks={allTasks}
          onDelete={onDelete}
          onUpdate={onUpdate}
          sections={sections}
          onOpenOverview={onOpenOverview}
          currentDate={currentDate}
          level={level}
          isOverlay={isOverlay}
          setFocusTask={setFocusTask}
          isDoToday={isDoToday}
          toggleDoToday={toggleDoToday}
          scheduledAppointment={scheduledAppointment}
          isDemo={isDemo}
          showDragHandle={showDragHandle}
          attributes={attributes}
          listeners={listeners}
          isSelected={isSelected}
          onSelectTask={onSelectTask}
        />
        {effectiveIsExpanded && directSubtasks.length > 0 && (
          <ul className="list-none mt-1.5 space-y-1.5">
            {directSubtasks.map((subtask) => (
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
                expandedTasks={expandedTasks}
                toggleTask={toggleTask} // Corrected: Pass toggleTask
                isOverlay={isOverlay}
                setFocusTask={setFocusTask}
                isDoToday={!doTodayOffIds.has(subtask.original_task_id || subtask.id)}
                toggleDoToday={toggleDoToday}
                doTodayOffIds={doTodayOffIds}
                scheduledTasksMap={scheduledTasksMap}
                isDemo={isDemo}
                showDragHandle={showDragHandle}
                insertionIndicator={insertionIndicator}
                isSelected={isSelected}
                onSelectTask={onSelectTask}
                hasSubtasks={getSubtasksForTask(subtask.id).length > 0}
                isExpanded={expandedTasks[subtask.id] !== false}
                getSubtasksForTask={getSubtasksForTask}
                scheduledAppointment={scheduledTasksMap.get(subtask.id)}
                selectedTaskIds={selectedTaskIds} // Pass down the prop
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