import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, ChevronsDownUp } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableTaskItem from './SortableTaskItem';
import SortableSectionHeader from './SortableSectionHeader';
import TaskForm from './TaskForm';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import TaskItem from './TaskItem';
import QuickAddTask from './QuickAddTask';

interface TaskListProps {
  tasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  handleAddTask: (taskData: any) => Promise<any>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  selectedTaskIds: string[];
  toggleTaskSelection: (taskId: string, checked: boolean) => void;
  clearSelectedTasks: () => void;
  bulkUpdateTasks: (updates: Partial<Task>, ids?: string[]) => Promise<void>;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null) => Promise<void>;
  reorderSections: (activeId: string, overId: string) => Promise<void>;
  allCategories: Category[];
  setIsAddTaskOpen: (open: boolean) => void;
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  expandedSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
  toggleAllSections: () => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = (props) => {
  const {
    tasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    selectedTaskIds,
    toggleTaskSelection,
    markAllTasksInSectionCompleted,
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    allCategories,
    onOpenOverview,
    currentDate,
    expandedSections,
    toggleSection,
    toggleAllSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = props;

  const { user } = useAuth();
  const userId = user?.id || '';

  const [isAddTaskOpenLocal, setIsAddTaskOpenLocal] = useState(false);
  const [preselectedSectionId, setPreselectedSectionId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItemData, setActiveItemData] = useState<Task | TaskSection | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150, // ms
        tolerance: 5, // px
      },
      onActivation: ({ event }) => {
        const target = event.target as HTMLElement;
        // Prevent drag from starting on any interactive element inside the task item
        if (
          target.closest('button') ||
          target.closest('a') ||
          target.closest('input') ||
          target.closest('[role="button"]') || // This covers the Switch component
          target.closest('[data-no-dnd="true"]')
        ) {
          return false; // Do not start dragging
        }
        return true; // Allow dragging
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tasksMap = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const getTaskById = useCallback((id: UniqueIdentifier | null) => {
      if (!id) return undefined;
      return tasksMap.get(String(id));
  }, [tasksMap]);

  const defaultCategory = useMemo(() => {
    return allCategories.find(c => c.name.toLowerCase() === 'general') || allCategories[0];
  }, [allCategories]);

  const allSortableSections = useMemo(() => {
    const noSection: TaskSection = {
      id: 'no-section-header',
      name: 'No Section',
      user_id: userId,
      order: sections.length,
      include_in_focus_mode: true,
    };
    return [...sections, noSection];
  }, [sections, userId]);

  const allVisibleItemIds = useMemo(() => {
    const ids: UniqueIdentifier[] = [];
    allSortableSections.forEach(section => {
        ids.push(section.id);
        const isExpanded = expandedSections[section.id] !== false;
        if (isExpanded) {
            const topLevelTasksInSection = filteredTasks
                .filter(t => t.parent_task_id === null && (t.section_id === section.id || (t.section_id === null && section.id === 'no-section-header')))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            
            const addSubtasksRecursively = (tasksToAdd: Task[]) => {
                tasksToAdd.forEach(task => {
                    ids.push(task.id);
                    const subtasks = filteredTasks
                        .filter(sub => sub.parent_task_id === task.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    if (subtasks.length > 0) {
                        addSubtasksRecursively(subtasks);
                    }
                });
            };
            addSubtasksRecursively(topLevelTasksInSection);
        }
    });
    return ids;
  }, [allSortableSections, expandedSections, filteredTasks]);

  const isSectionHeaderId = (id: UniqueIdentifier | null) => {
    if (!id) return false;
    return id === 'no-section-header' || sections.some(s => s.id === id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    if (isSectionHeaderId(event.active.id)) {
      setActiveItemData(allSortableSections.find(s => s.id === event.active.id) || null);
    } else {
      setActiveItemData(tasks.find(t => t.id === event.active.id) || null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      setActiveItemData(null);
      return;
    }

    if (isSectionHeaderId(active.id) && isSectionHeaderId(over.id)) {
      const a = String(active.id);
      const b = String(over.id);
      if (a !== 'no-section-header' && b !== 'no-section-header') {
        await reorderSections(a, b);
      }
      setActiveId(null);
      setActiveItemData(null);
      return;
    }

    const draggedTask = getTaskById(active.id);
    if (!draggedTask) {
      setActiveId(null);
      setActiveItemData(null);
      return;
    }

    let newParentId: string | null = null;
    let newSectionId: string | null = null;
    let overId: string | null = null;

    if (isSectionHeaderId(over.id)) {
      const sectionId = over.id === 'no-section-header' ? null : String(over.id);
      newParentId = null;
      newSectionId = sectionId;
      overId = null;
    } else {
      const overTask = getTaskById(over.id);
      if (!overTask) {
        setActiveId(null);
        setActiveItemData(null);
        return;
      }
      newParentId = overTask.parent_task_id;
      newSectionId = overTask.section_id;
      overId = overTask.id;
    }

    await updateTaskParentAndOrder(draggedTask.id, newParentId, newSectionId, overId);
    setActiveId(null);
    setActiveItemData(null);
  };

  const openAddTaskForSection = (sectionId: string | null) => {
    setPreselectedSectionId(sectionId);
    setIsAddTaskOpenLocal(true);
  };

  return (
    <>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allVisibleItemIds} strategy={verticalListSortingStrategy}>
            <div className="flex justify-end mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllSections}
                aria-label="Toggle all sections"
                className="h-9 px-3"
              >
                <ChevronsDownUp className="h-5 w-5 mr-2" /> Toggle All Sections
              </Button>
            </div>

            {allSortableSections.map((currentSection: TaskSection, index) => {
              const isExpanded = expandedSections[currentSection.id] !== false;
              const topLevelTasksInSection = filteredTasks
                .filter(t => t.parent_task_id === null && (t.section_id === currentSection.id || (t.section_id === null && currentSection.id === 'no-section-header')))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
              const remainingTasksCount = topLevelTasksInSection.filter(t => t.status === 'to-do').length;

              return (
                <div
                  key={currentSection.id}
                  className={cn("mb-6", index < allSortableSections.length - 1 && "border-b border-border pb-6")}
                >
                  <SortableSectionHeader
                    section={currentSection}
                    sectionTasksCount={remainingTasksCount}
                    isExpanded={isExpanded}
                    toggleSection={toggleSection}
                    handleAddTaskToSpecificSection={(sectionId) => openAddTaskForSection(sectionId)}
                    markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                    handleDeleteSectionClick={deleteSection}
                    updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                    onUpdateSectionName={updateSection}
                    isOverlay={false}
                  />

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      <ul className="list-none space-y-3">
                        {topLevelTasksInSection.length > 0 && topLevelTasksInSection.map(task => (
                          <SortableTaskItem
                            key={task.id}
                            task={task}
                            onStatusChange={async (taskId, newStatus) => updateTask(taskId, { status: newStatus })}
                            onDelete={deleteTask}
                            onUpdate={updateTask}
                            isSelected={selectedTaskIds.includes(task.id)}
                            onToggleSelect={toggleTaskSelection}
                            sections={sections}
                            onOpenOverview={onOpenOverview}
                            currentDate={currentDate}
                            onMoveUp={async () => {}}
                            onMoveDown={async () => {}}
                            level={0}
                            allTasks={tasks}
                            isOverlay={false}
                            setFocusTask={setFocusTask}
                            isDoToday={!doTodayOffIds.has(task.id)}
                            toggleDoToday={toggleDoToday}
                          />
                        ))}
                      </ul>
                      <div className="mt-2" data-no-dnd="true">
                        <QuickAddTask
                          sectionId={currentSection.id === 'no-section-header' ? null : currentSection.id}
                          onAddTask={async (data) => { await handleAddTask(data); }}
                          defaultCategoryId={defaultCategory?.id || ''}
                        />
                      </div>
                      {topLevelTasksInSection.length === 0 && (
                        <div className="text-center text-foreground/80 dark:text-foreground/80 py-6 rounded-xl border-dashed border-border bg-muted/30" data-no-dnd="true">
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <ListTodo className="h-7 w-7" />
                            <p className="text-xl font-medium">No tasks in this section yet.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </SortableContext>

          {createPortal(
            <DragOverlay>
              {activeId && activeItemData && (
                isSectionHeaderId(activeId) ? (
                  <SortableSectionHeader
                    section={activeItemData as TaskSection}
                    sectionTasksCount={
                      filteredTasks.filter(t => t.parent_task_id === null && (t.section_id === activeItemData.id || (t.section_id === null && activeItemData.id === 'no-section-header'))).filter(t => t.status === 'to-do').length
                    }
                    isExpanded={true}
                    toggleSection={() => {}}
                    handleAddTaskToSpecificSection={() => {}}
                    markAllTasksInSectionCompleted={async () => {}}
                    handleDeleteSectionClick={() => {}}
                    updateSectionIncludeInFocusMode={async () => {}}
                    onUpdateSectionName={async () => {}}
                    isOverlay={true}
                  />
                ) : (
                  <TaskItem
                    task={activeItemData as Task}
                    onStatusChange={async () => {}}
                    onDelete={() => {}}
                    onUpdate={() => {}}
                    isSelected={false}
                    onToggleSelect={() => {}}
                    sections={sections}
                    onOpenOverview={() => {}}
                    currentDate={currentDate}
                    onMoveUp={async () => {}}
                    onMoveDown={async () => {}}
                    isOverlay={true}
                    setFocusTask={setFocusTask}
                    isDoToday={!doTodayOffIds.has((activeItemData as Task).id)}
                    toggleDoToday={toggleDoToday}
                  />
                )
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}

      <Dialog open={isAddTaskOpenLocal} onOpenChange={setIsAddTaskOpenLocal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the details to add a new task.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSave={async (taskData) => {
              const success = await handleAddTask({
                ...taskData,
                section_id: preselectedSectionId ?? null,
              });
              if (success) setIsAddTaskOpenLocal(false);
              return success;
            }}
            onCancel={() => setIsAddTaskOpenLocal(false)}
            sections={sections}
            allCategories={allCategories}
            preselectedSectionId={preselectedSectionId ?? undefined}
            currentDate={currentDate}
            autoFocus
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskList;