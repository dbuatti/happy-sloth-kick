import React, { useMemo, useState, useCallback } from 'react';
import { Task, TaskSection, UpdateTaskData, Category, NewTaskSectionData, UpdateTaskSectionData } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Settings2 } from 'lucide-react'; // Removed PlusCircle
import ManageSectionsDialog from './ManageSectionsDialog';
import { useSound } from '@/context/SoundContext';
// import { useDoToday } from '@/hooks/useDoToday'; // Removed unused import

interface TaskListProps {
  tasks: Task[];
  updateTask: (taskId: string, updates: UpdateTaskData) => Promise<Task | null>;
  onDeleteTask: (taskId: string) => Promise<boolean>;
  onOpenOverview: (task: Task) => void;
  sections: TaskSection[];
  allCategories: Category[];
  createSection: (newSection: NewTaskSectionData) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, updates: UpdateTaskSectionData) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<boolean>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  updateTaskParentAndOrder: (updates: { id: string; order: number | null; parent_task_id: string | null; section_id: string | null }[]) => Promise<void>;
  currentDate: Date;
  doTodayOffIds: string[];
  toggleDoToday: (taskId: string, isOff: boolean) => Promise<boolean>;
}

interface SortableTaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<boolean>;
  onUpdate: (taskId: string, updates: UpdateTaskData) => Promise<Task | null>;
  onOpenOverview: (task: Task) => void;
  sections: TaskSection[];
  allCategories: Category[];
  isSubtask?: boolean;
  doTodayOffIds: string[];
  toggleDoToday: (taskId: string, isOff: boolean) => Promise<boolean>;
}

const SortableTaskItem = React.forwardRef<HTMLDivElement, SortableTaskItemProps>(({
  task,
  onStatusChange,
  onDelete,
  onUpdate,
  onOpenOverview,
  sections,
  allCategories,
  isSubtask,
  doTodayOffIds,
  toggleDoToday,
}, ref) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TaskItem
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandleProps={attributes}
      listeners={listeners}
      task={task}
      onStatusChange={onStatusChange}
      onDelete={onDelete}
      onUpdate={onUpdate}
      onOpenOverview={onOpenOverview}
      sections={sections}
      allCategories={allCategories}
      isSubtask={isSubtask}
      doTodayOffIds={doTodayOffIds}
      toggleDoToday={toggleDoToday}
    />
  );
});

SortableTaskItem.displayName = 'SortableTaskItem';

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  updateTask,
  onDeleteTask,
  onOpenOverview,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  updateTaskParentAndOrder,
  // currentDate, // Removed unused prop
  doTodayOffIds,
  toggleDoToday,
}) => {
  const { playSound } = useSound();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const updatedTask = await updateTask(taskId, { status: newStatus });
    return updatedTask;
  };

  const parentTasks = useMemo(() => tasks.filter(task => !task.parent_task_id).sort((a, b) => (a.order || 0) - (b.order || 0)), [tasks]);

  const getSubtasks = useCallback((parentId: string) => {
    return tasks.filter(task => task.parent_task_id === parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tasks]);

  const getSectionTasks = useCallback((sectionId: string | null) => {
    return parentTasks.filter(task => (task.section_id === sectionId || (!task.section_id && sectionId === null)));
  }, [parentTasks]);

  const allSortableSections = useMemo(() => {
    const sortedSections = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
    const noSection: TaskSection = {
      id: 'no-section-header',
      name: 'No Section',
      user_id: 'virtual', // Dummy user_id
      order: -1,
      created_at: new Date().toISOString(), // Provide a valid date
      include_in_focus_mode: false,
    };
    return [noSection, ...sortedSections];
  }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);

    if (!activeTask) return;

    let newParentId: string | null = activeTask.parent_task_id || null;
    let newSectionId: string | null = activeTask.section_id || null;

    if (overTask) {
      // Dragging onto another task
      if (activeTask.id === overTask.id) return; // Dragged onto itself

      if (overTask.parent_task_id === activeTask.id) {
        // Prevent dropping a task onto its own subtask
        return;
      }

      // Determine if it's a reorder within the same parent/section or a new parent/section
      if (activeTask.parent_task_id === overTask.parent_task_id && activeTask.section_id === overTask.section_id) {
        // Reordering within the same group
        const siblings = tasks.filter(t =>
          t.parent_task_id === activeTask.parent_task_id &&
          t.section_id === activeTask.section_id &&
          t.id !== activeTask.id
        ).sort((a, b) => (a.order || 0) - (b.order || 0));

        const oldIndex = siblings.findIndex(t => t.id === activeTask.id);
        const newIndex = siblings.findIndex(t => t.id === overTask.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const [removed] = siblings.splice(oldIndex, 1);
          siblings.splice(newIndex, 0, removed);

          const updates = siblings.map((task, index) => ({
            id: task.id,
            order: index,
            parent_task_id: task.parent_task_id || null,
            section_id: task.section_id || null,
          }));
          await updateTaskParentAndOrder(updates);
        }
      } else {
        // Moving to a new parent/section
        newParentId = overTask.parent_task_id || null;
        newSectionId = overTask.section_id || null;

        // If dropping onto a task that is not a parent, make it a sibling
        if (!overTask.parent_task_id && !overTask.section_id) {
          // Dropping onto a top-level task, make it a sibling
          newParentId = null;
          newSectionId = null;
        } else if (overTask.parent_task_id) {
          // Dropping onto a subtask, make it a sibling of that subtask
          newParentId = overTask.parent_task_id;
          newSectionId = overTask.section_id || null;
        } else if (overTask.section_id) {
          // Dropping onto a task in a section, keep it in that section
          newParentId = null;
          newSectionId = overTask.section_id;
        }

        // Recalculate order for the new group
        const targetGroupTasks = tasks.filter(t =>
          t.parent_task_id === newParentId &&
          t.section_id === newSectionId &&
          t.id !== activeTask.id
        ).sort((a, b) => (a.order || 0) - (b.order || 0));

        const updates = [
          ...targetGroupTasks.map((task, index) => ({
            id: task.id,
            order: index,
            parent_task_id: task.parent_task_id || null,
            section_id: task.section_id || null,
          })),
          {
            id: activeTask.id,
            order: targetGroupTasks.length, // Place at the end of the new group
            parent_task_id: newParentId,
            section_id: newSectionId,
          }
        ];
        await updateTaskParentAndOrder(updates);
      }
    } else {
      // Dropped into an empty space or outside any specific task/section
      // This means it becomes a top-level task with no section
      newParentId = null;
      newSectionId = null;

      const topLevelTasks = tasks.filter(t => !t.parent_task_id && !t.section_id && t.id !== activeTask.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const updates = [
        ...topLevelTasks.map((task, index) => ({
          id: task.id,
          order: index,
          parent_task_id: null,
          section_id: null,
        })),
        {
          id: activeTask.id,
          order: topLevelTasks.length,
          parent_task_id: null,
          section_id: null,
        }
      ];
      await updateTaskParentAndOrder(updates);
    }
    playSound('move');
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsManageSectionsOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" /> Manage Sections
          </Button>
        </div>
        {allSortableSections.map(section => (
          <div key={section.id} className="border rounded-lg p-4 bg-background">
            <h3 className="text-lg font-semibold mb-3 flex items-center justify-between">
              {section.name}
              {section.id !== 'no-section-header' && (
                <Button variant="ghost" size="sm" onClick={() => updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode)}>
                  {section.include_in_focus_mode ? 'In Focus Mode' : 'Not in Focus Mode'}
                </Button>
              )}
            </h3>
            <SortableContext items={getSectionTasks(section.id === 'no-section-header' ? null : section.id).map(t => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {getSectionTasks(section.id === 'no-section-header' ? null : section.id).map(task => (
                  <React.Fragment key={task.id}>
                    <SortableTaskItem
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={onDeleteTask}
                      onUpdate={updateTask}
                      onOpenOverview={onOpenOverview}
                      sections={sections}
                      allCategories={allCategories}
                      doTodayOffIds={doTodayOffIds}
                      toggleDoToday={toggleDoToday}
                    />
                    {getSubtasks(task.id).map(subtask => (
                      <SortableTaskItem
                        key={subtask.id}
                        task={subtask}
                        onStatusChange={handleStatusChange}
                        onDelete={onDeleteTask}
                        onUpdate={updateTask}
                        onOpenOverview={onOpenOverview}
                        sections={sections}
                        allCategories={allCategories}
                        isSubtask={true}
                        doTodayOffIds={doTodayOffIds}
                        toggleDoToday={toggleDoToday}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </ul>
            </SortableContext>
            {getSectionTasks(section.id === 'no-section-header' ? null : section.id).length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No tasks in this section.</p>
            )}
          </div>
        ))}
      </div>

      {createPortal(
        <DragOverlay>
          {activeTask ? (
            <TaskItem
              task={activeTask}
              onStatusChange={handleStatusChange}
              onDelete={onDeleteTask}
              onUpdate={updateTask}
              onOpenOverview={onOpenOverview}
              sections={sections}
              allCategories={allCategories}
              isDragging={true}
              isDraggable={false} // Prevent nested dragging
              doTodayOffIds={doTodayOffIds}
              toggleDoToday={toggleDoToday}
            />
          ) : null}
        </DragOverlay>,
        document.body
      )}

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={() => Promise.resolve(null)} // Placeholder, as categories are not managed here
        updateCategory={() => Promise.resolve(null)} // Placeholder
        deleteCategory={() => Promise.resolve(false)} // Placeholder
      />
    </DndContext>
  );
};

export default TaskList;