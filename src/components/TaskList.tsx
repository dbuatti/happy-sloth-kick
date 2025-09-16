import React, { useState, useMemo, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsDownUp } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';

import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
  PointerSensor,
  closestCorners,
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
import { Appointment } from '@/hooks/useAppointments';

interface TaskListProps {
  tasks: Task[];
  processedTasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  handleAddTask: (taskData: any) => Promise<any>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  deleteTask: (taskId: string) => void;
  bulkUpdateTasks: (updates: Partial<Task>, ids: string[]) => Promise<void>;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => Promise<void>;
  reorderSections: (activeId: string, overId: string) => Promise<void>;
  allCategories: Category[];
  setIsAddTaskOpen: (open: boolean) => void;
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
}

const TaskList = forwardRef<any, TaskListProps>((props, ref) => {
  const {
    tasks,
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
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
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    scheduledTasksMap,
    isDemo = false,
  } = props;

  const { user } = useAuth();
  const userId = user?.id || '';

  const [isAddTaskOpenLocal, setIsAddTaskOpenLocal] = useState(false);
  const [preselectedSectionId, setPreselectedSectionId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItemData, setActiveItemData] = useState<Task | TaskSection | null>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('taskList_expandedSections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('taskList_expandedTasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const justToggledAllRef = useRef(false); // New ref to track if toggleAllSections was just called

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: !isDemo,
    })
  );

  const tasksMap = useMemo(() => new Map(processedTasks.map(task => [task.id, task])), [processedTasks]);
  const getTaskById = useCallback((id: UniqueIdentifier | null) => {
      if (!id) return undefined;
      return tasksMap.get(String(id));
  }, [tasksMap]);

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
        const isSectionExpanded = expandedSections[section.id] !== false;
        if (isSectionExpanded) {
            const topLevelTasksInSection = filteredTasks
                .filter(t => t.parent_task_id === null && (t.section_id === section.id || (t.section_id === null && section.id === 'no-section-header')))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            
            const addSubtasksRecursively = (tasksToAdd: Task[]) => {
                tasksToAdd.forEach(task => {
                    ids.push(task.id);
                    const isTaskExpanded = expandedTasks[task.id] !== false;
                    if (isTaskExpanded) {
                        const subtasks = filteredTasks
                            .filter(sub => sub.parent_task_id === task.id)
                            .sort((a, b) => (a.order || 0) - (b.order || 0));
                        if (subtasks.length > 0) {
                            addSubtasksRecursively(subtasks);
                        }
                    }
                });
            };
            addSubtasksRecursively(topLevelTasksInSection);
        }
    });
    return ids;
  }, [allSortableSections, expandedSections, filteredTasks, expandedTasks]);

  const isSectionHeaderId = (id: UniqueIdentifier | null) => {
    if (!id) return false;
    return id === 'no-section-header' || sections.some(s => s.id === id);
  };

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [sectionId]: !(prev[sectionId] ?? true) };
      localStorage.setItem('taskList_expandedSections', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const newState = { ...prev, [taskId]: !(prev[taskId] ?? true) };
      localStorage.setItem('taskList_expandedTasks', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const toggleAllSections = useCallback(() => {
    const allCurrentlyExpanded = allSortableSections.every(section => expandedSections[section.id] !== false);

    const newExpandedState: Record<string, boolean> = {};
    allSortableSections.forEach(section => {
      newExpandedState[section.id] = !allCurrentlyExpanded;
    });

    setExpandedSections(newExpandedState);
    localStorage.setItem('taskList_expandedSections', JSON.stringify(newExpandedState));
    justToggledAllRef.current = true; // Set flag
    setTimeout(() => {
      justToggledAllRef.current = false; // Reset flag after a short delay
    }, 100); // Short delay to allow re-render
  }, [expandedSections, allSortableSections]);

  useImperativeHandle(ref, () => ({
    toggleAllSections: toggleAllSections,
  }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    if (isSectionHeaderId(event.active.id)) {
      setActiveItemData(allSortableSections.find(s => s.id === event.active.id) || null);
    } else {
      setActiveItemData(processedTasks.find(t => t.id === event.active.id) || null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveItemData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    if (isSectionHeaderId(active.id) && isSectionHeaderId(over.id)) {
      const a = String(active.id);
      const b = String(over.id);
      if (a !== 'no-section-header' && b !== 'no-section-header') {
        await reorderSections(a, b);
      }
      return;
    }

    const draggedTask = getTaskById(active.id);
    if (!draggedTask && !active.id.toString().startsWith('virtual-')) {
      return;
    }

    let newParentId: string | null = null;
    let newSectionId: string | null = null;
    let overId: string | null = null;

    if (isSectionHeaderId(over.id)) {
      newSectionId = over.id === 'no-section-header' ? null : String(over.id);
    } else {
      const overTask = getTaskById(over.id) || processedTasks.find(t => t.id === over.id);
      if (overTask) {
        newParentId = overTask.parent_task_id;
        newSectionId = overTask.section_id;
        overId = overTask.id;
      }
    }
    
    const activeIndex = allVisibleItemIds.indexOf(active.id);
    const overIndex = allVisibleItemIds.indexOf(over.id);
    const isDraggingDown = activeIndex < overIndex;

    await updateTaskParentAndOrder(
      String(active.id), 
      newParentId, 
      newSectionId, 
      overId,
      isDraggingDown
    );
  };

  const openAddTaskForSection = (sectionId: string | null) => {
    setPreselectedSectionId(sectionId);
    setIsAddTaskOpenLocal(true);
  };

  // Effect to automatically collapse sections when all tasks are completed
  useEffect(() => {
    if (justToggledAllRef.current) {
      return; // Skip auto-collapse if 'Toggle All' was just clicked
    }
    allSortableSections.forEach(section => {
      const topLevelTasksInSection = filteredTasks
        .filter(t => t.parent_task_id === null && (t.section_id === section.id || (t.section_id === null && section.id === 'no-section-header')))
        .filter(t => t.status === 'to-do'); // Only count 'to-do' tasks
      const remainingTasksCount = topLevelTasksInSection.length;

      if (remainingTasksCount === 0 && (expandedSections[section.id] ?? true)) { // Check if it's currently expanded
        toggleSection(section.id);
      }
    });
  }, [filteredTasks, sections, allSortableSections, expandedSections, toggleSection]);

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
          collisionDetection={closestCorners}
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
                className="h-9 px-3 text-primary hover:bg-primary/10"
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

              if (currentSection.id === 'no-section-header' && topLevelTasksInSection.length === 0) {
                return null;
              }

              return (
                <div
                  key={currentSection.id}
                  className={cn("mb-4", index < allSortableSections.length - 1 && "border-b border-border pb-4")}
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

                  <div className={cn(
                    "mt-3 overflow-hidden transition-all duration-300 ease-in-out",
                    isExpanded ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0" // Changed max-h-[500px] to max-h-[9999px]
                  )}>
                    {topLevelTasksInSection.length > 0 && (
                      <ul className="list-none space-y-1.5">
                        {topLevelTasksInSection.map(task => (
                          <SortableTaskItem
                            key={task.id}
                            task={task}
                            onStatusChange={async (taskId, newStatus) => { return await updateTask(taskId, { status: newStatus }); }}
                            onDelete={deleteTask}
                            onUpdate={updateTask}
                            sections={sections}
                            onOpenOverview={onOpenOverview}
                            currentDate={currentDate}
                            onMoveUp={async () => {}}
                            onMoveDown={async () => {}}
                            level={0}
                            allTasks={tasks}
                            isOverlay={false}
                            expandedTasks={expandedTasks}
                            toggleTask={toggleTask}
                            setFocusTask={setFocusTask}
                            isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                            toggleDoToday={toggleDoToday}
                            doTodayOffIds={doTodayOffIds}
                            scheduledTasksMap={scheduledTasksMap}
                            isDemo={isDemo}
                          />
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 pt-2" data-no-dnd="true">
                      <QuickAddTask
                        sectionId={currentSection.id === 'no-section-header' ? null : currentSection.id}
                        onAddTask={async (data) => { await handleAddTask(data); }}
                        defaultCategoryId={allCategories.find(c => c.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || ''}
                        isDemo={isDemo}
                        allCategories={allCategories} // Pass allCategories
                        sections={sections} // Pass sections
                        currentDate={currentDate} // Pass currentDate
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </SortableContext>

          {createPortal(
            <DragOverlay dropAnimation={null}>
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
                  <div className="rotate-2">
                    <TaskItem
                      task={activeItemData as Task}
                      allTasks={tasks}
                      onStatusChange={async (taskId, newStatus) => { return await updateTask(taskId, { status: newStatus }); }}
                      onDelete={() => {}}
                      onUpdate={async (taskId, updates) => { await updateTask(taskId, updates); return taskId; }}
                      sections={sections}
                      onOpenOverview={() => {}}
                      currentDate={currentDate}
                      onMoveUp={async () => {}}
                      onMoveDown={async () => {}}
                      isOverlay={true}
                      setFocusTask={setFocusTask}
                      isDoToday={!doTodayOffIds.has((activeItemData as Task).original_task_id || (activeItemData as Task).id)}
                      toggleDoToday={toggleDoToday}
                      scheduledTasksMap={scheduledTasksMap}
                      level={0}
                    />
                  </div>
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
            sections={sections} {/* Corrected: Pass sections here */}
            allCategories={allCategories}
            preselectedSectionId={preselectedSectionId ?? undefined}
            currentDate={currentDate}
            autoFocus
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            allTasks={tasks} // Pass allTasks
          />
        </DialogContent>
      </Dialog>
    </>
  );
});

export default TaskList;