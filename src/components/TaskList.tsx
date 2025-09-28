import { useState, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsDownUp } from 'lucide-react';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
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
import TaskItem from './TaskItem';
import QuickAddTask from './QuickAddTask';
import { Appointment } from '@/hooks/useAppointments';
import TaskReorderDialog from './TaskReorderDialog'; // Import the new dialog
import EmptyState from './EmptyState'; // Import EmptyState

interface TaskListProps {
  processedTasks: Task[]; // This is processedTasks from useTaskProcessing
  filteredTasks: Task[];
  loading: boolean;
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  deleteTask: (taskId: string) => void;
  bulkUpdateTasks: (updates: Partial<Task>, ids: string[]) => Promise<void>;
  bulkDeleteTasks: (ids: string[]) => Promise<boolean>; // Added this prop
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
  // setCurrentDate: React.Dispatch<React.SetStateAction<Date>>; // Removed as it's not used directly by TaskList
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  toggleSection: (sectionId: string) => void;
  toggleAllSections: () => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
}

const TaskList = forwardRef<any, TaskListProps>((props, ref) => {
  const {
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
    expandedSections,
    expandedTasks,
    toggleTask,
    toggleSection,
    toggleAllSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    scheduledTasksMap,
    isDemo = false,
  } = props;

  // Removed unused userId variable
  const userId = ''; 

  const [isAddTaskOpenLocal, setIsAddTaskOpenLocal] = useState(false);
  const [preselectedSectionId, setPreselectedSectionId] = useState<string | null>(null);

  const [isTaskReorderDialogOpen, setIsTaskReorderDialogOpen] = useState(false);
  const [sectionToReorderId, setSectionToReorderId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItemData, setActiveItemData] = useState<Task | TaskSection | null>(null);

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
      user_id: userId, // userId is not used here, but keeping for type consistency if it were to be used
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

  const handleOpenReorderTasks = (sectionId: string | null) => {
    if (isDemo) return;
    setSectionToReorderId(sectionId);
    setIsTaskReorderDialogOpen(true);
  };

  const handleSaveReorderTasks = async (_sectionId: string | null, reorderedTasks: Task[]) => { // Removed unused sectionId
    if (isDemo) return;
    // This function will be called from TaskReorderDialog
    // It needs to update the order of tasks in the database
    // We can use updateTaskParentAndOrder for this, iterating through the reorderedTasks
    for (let i = 0; i < reorderedTasks.length; i++) {
      const task = reorderedTasks[i];
      // Only update if the order has actually changed
      if (task.order !== i) {
        await updateTask(task.id, { order: i });
      }
    }
  };

  useEffect(() => {
    allSortableSections.forEach(section => {
      const topLevelTasksInSection = filteredTasks
        .filter(t => t.parent_task_id === null && (t.section_id === section.id || (t.section_id === null && section.id === 'no-section-header')))
        .filter(t => t.status === 'to-do');
      const remainingTasksCount = topLevelTasksInSection.length;

      if (remainingTasksCount === 0 && (expandedSections[section.id] ?? true)) {
        toggleSection(section.id);
      }
    });
  }, [filteredTasks, sections, allSortableSections, expandedSections, toggleSection]);

  useImperativeHandle(ref, () => ({
    toggleAllSections: () => {
      toggleAllSections();
    }
  }));

  const tasksForReorderDialog = useMemo(() => {
    if (!sectionToReorderId) {
      return filteredTasks.filter(t => t.parent_task_id === null && t.section_id === null)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return filteredTasks.filter(t => t.parent_task_id === null && t.section_id === sectionToReorderId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [filteredTasks, sectionToReorderId]);

  const currentSectionToReorder = useMemo(() => {
    if (sectionToReorderId === 'no-section-header') {
      return allSortableSections.find(s => s.id === 'no-section-header');
    }
    return sections.find(s => s.id === sectionToReorderId);
  }, [sectionToReorderId, sections, allSortableSections]);


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

              const isNoSection = currentSection.id === 'no-section-header';

              if (isNoSection && topLevelTasksInSection.length === 0 && !isDemo) {
                return null; // Hide "No Section" header if empty and not in demo mode
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
                    handleDeleteSectionClick={async (sectionId) => { await deleteSection(sectionId); }}
                    updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                    onUpdateSectionName={updateSection}
                    onOpenReorderTasks={handleOpenReorderTasks} // Pass the new handler
                    isOverlay={false}
                    isNoSection={isNoSection} // Pass isNoSection prop
                  />

                  <div className={cn(
                    "mt-3 overflow-hidden transition-all duration-300 ease-in-out",
                    isExpanded ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"
                  )}>
                    {topLevelTasksInSection.length > 0 ? (
                      <ul className="list-none space-y-1.5">
                        {topLevelTasksInSection.map(task => (
                          <SortableTaskItem
                            key={task.id}
                            task={task}
                            onDelete={deleteTask}
                            onUpdate={updateTask}
                            sections={sections}
                            onOpenOverview={onOpenOverview}
                            currentDate={currentDate}
                            onMoveUp={async () => {}}
                            onMoveDown={async () => {}}
                            level={0}
                            allTasks={processedTasks} // Changed from 'tasks' to 'processedTasks'
                            isOverlay={false}
                            expandedTasks={expandedTasks}
                            toggleTask={toggleTask}
                            setFocusTask={setFocusTask}
                            isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                            toggleDoToday={toggleDoToday}
                            doTodayOffIds={doTodayOffIds}
                            scheduledTasksMap={scheduledTasksMap}
                            isDemo={isDemo}
                            showDragHandle={false} // Drag handle not shown in main list
                          />
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        title={isNoSection ? "No tasks without a section" : `No tasks in "${currentSection.name}"`}
                        description={isNoSection ? "Add a new task or move an existing one here." : "Add a new task to this section to get started."}
                        buttonText="Add Task"
                        onButtonClick={() => openAddTaskForSection(currentSection.id === 'no-section-header' ? null : currentSection.id)}
                        className="mt-4"
                      />
                    )}
                    <div className="mt-2 pt-2" data-no-dnd="true">
                      <QuickAddTask
                        sectionId={currentSection.id === 'no-section-header' ? null : currentSection.id}
                        onAddTask={async (data) => { await handleAddTask(data); }}
                        defaultCategoryId={allCategories.find(c => c.name.toLowerCase() === 'general')?.id || allCategories[0]?.id || ''}
                        isDemo={isDemo}
                        allCategories={allCategories}
                        sections={sections}
                        currentDate={currentDate}
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
                    handleDeleteSectionClick={async () => {}}
                    updateSectionIncludeInFocusMode={async () => {}}
                    onUpdateSectionName={async () => {}}
                    onOpenReorderTasks={handleOpenReorderTasks} // Pass the new handler
                    isOverlay={true}
                    isNoSection={activeItemData.id === 'no-section-header'}
                  />
                ) : (
                  <div className="rotate-2">
                    <TaskItem
                      task={activeItemData as Task}
                      allTasks={processedTasks} // Changed from 'tasks' to 'processedTasks'
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
                      showDragHandle={false} // Drag handle not shown in main list overlay
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
            onSave={async (newTaskData) => { // Changed parameter name to newTaskData
              const success = await handleAddTask(newTaskData);
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
            allTasks={processedTasks} // Changed from 'tasks' to 'processedTasks'
          />
        </DialogContent>
      </Dialog>

      {currentSectionToReorder && (
        <TaskReorderDialog
          isOpen={isTaskReorderDialogOpen}
          onClose={() => setIsTaskReorderDialogOpen(false)}
          sectionId={currentSectionToReorder.id === 'no-section-header' ? null : currentSectionToReorder.id}
          sectionName={currentSectionToReorder.name}
          tasks={tasksForReorderDialog}
          allTasks={processedTasks}
          onSaveReorder={handleSaveReorderTasks}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          sections={sections}
          onOpenOverview={onOpenOverview}
          currentDate={currentDate}
          setFocusTask={setFocusTask}
          doTodayOffIds={doTodayOffIds}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
        />
      )}
    </>
  );
});

export default TaskList;