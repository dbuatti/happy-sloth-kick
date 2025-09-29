import { useState, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import SortableTaskItem from './SortableTaskItem';
import SortableSectionHeader from './SortableSectionHeader';
import TaskForm from './TaskForm';
import { cn } from '@/lib/utils';
import TaskItem from './TaskItem';
import QuickAddTask from './QuickAddTask';
import { Appointment } from '@/hooks/useAppointments';
import TaskReorderDialog from './TaskReorderDialog';
import EmptyState from './EmptyState';
import { DraggableAttributes } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { isPast, parseISO, isSameDay } from 'date-fns';


interface TaskListProps {
  processedTasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  deleteTask: (taskId: string) => void;
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
  selectedTaskIds: Set<string>;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
}

// Helper component to wrap SortableSectionHeader with useSortable
interface SortableSectionHeaderPropsForWrapper {
  section: TaskSection;
  sectionTasksCount: number;
  sectionOverdueCount: number;
  isExpanded: boolean;
  toggleSection: (sectionId: string) => void;
  handleAddTaskToSpecificSection: (sectionId: string | null) => void;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  handleDeleteSectionClick: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  onUpdateSectionName: (sectionId: string, newName: string) => Promise<void>;
  onOpenReorderTasks: (sectionId: string | null) => void;
  isOverlay?: boolean;
  isNoSection?: boolean;
  isDemo?: boolean;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
  setNodeRef?: (element: HTMLElement | null) => void;
  transform?: { x: number; y: number; scaleX: number; scaleY: number } | null;
  transition?: string;
  isDragging?: boolean;
  insertionIndicator: { id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null;
}

interface SortableSectionWrapperProps extends SortableSectionHeaderPropsForWrapper {
  // No additional props needed here, it just extends the base props
}

const SortableSectionWrapper: React.FC<SortableSectionWrapperProps> = ({ section, isDemo, ...rest }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, data: { type: 'section', section }, disabled: isDemo || section.id === 'no-section-header' });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? 'hidden' : undefined,
  };

  if (isDragging && !rest.isOverlay) {
    return <div ref={setNodeRef} style={style} className="h-16 bg-muted/50 border-2 border-dashed border-border rounded-lg" />;
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SortableSectionHeader
        section={section}
        isDemo={isDemo}
        {...rest}
        attributes={attributes}
        listeners={listeners}
        transform={transform}
        transition={transition}
        isDragging={isDragging}
      />
    </div>
  );
};


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
    selectedTaskIds,
    onSelectTask,
  } = props;

  const userId = '';

  const [isAddTaskOpenLocal, setIsAddTaskOpenLocal] = useState(false);
  const [preselectedSectionId, setPreselectedSectionId] = useState<string | null>(null);

  const [isTaskReorderDialogOpen, setIsTaskReorderDialogOpen] = useState(false);
  const [sectionToReorderId, setSectionToReorderId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItemData, setActiveItemData] = useState<Task | TaskSection | null>(null);
  const [insertionIndicator, setInsertionIndicator] = useState<{ id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    if (isSectionHeaderId(event.active.id)) {
      setActiveItemData(allSortableSections.find(s => s.id === event.active.id) || null);
    } else {
      setActiveItemData(processedTasks.find(t => t.id === event.active.id) || null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setInsertionIndicator(null);
      return;
    }

    const activeIsTask = !isSectionHeaderId(active.id);
    const overIsSection = isSectionHeaderId(over.id);
    const overIsTask = !overIsSection;

    if (activeIsTask) {
      if (overIsTask) {
        // Dragging a task over another task
        const overRect = event.over?.rect;
        if (overRect) {
          const mouseY = (event.activatorEvent as PointerEvent).clientY;
          const middleOfOver = overRect.top + overRect.height / 2;
          setInsertionIndicator({ id: over.id, position: mouseY > middleOfOver ? 'after' : 'before' });
        }
      } else if (overIsSection) {
        // Dragging a task over a section header
        const targetSectionTasks = filteredTasks
                .filter(t => t.parent_task_id === null && (t.section_id === over.id || (t.section_id === null && over.id === 'no-section-header')))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        if (targetSectionTasks.length === 0) {
          // If section is empty, indicate dropping *into* the section
          setInsertionIndicator({ id: over.id, position: 'into' });
        } else {
          // If section is not empty, indicate dropping before the first task in that section
          setInsertionIndicator({ id: targetSectionTasks[0].id, position: 'before' });
        }
      }
    } else {
      // Dragging a section (no insertion indicator for sections, just reorder)
      setInsertionIndicator(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveItemData(null);
    setInsertionIndicator(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Handle section reordering
    if (isSectionHeaderId(active.id) && isSectionHeaderId(over.id)) {
      const a = String(active.id);
      const b = String(over.id);
      if (a !== 'no-section-header' && b !== 'no-section-header') {
        await reorderSections(a, b);
      }
      return;
    }

    // Handle task reordering or moving between sections
    const draggedTask = getTaskById(active.id);
    if (!draggedTask) {
      return;
    }

    let newParentId: string | null = null;
    let newSectionId: string | null = null;
    let overTaskId: string | null = null;
    let isDraggingDown = false;

    if (isSectionHeaderId(over.id)) {
      // Dropped onto a section header
      newSectionId = over.id === 'no-section-header' ? null : String(over.id);
      newParentId = null;
      overTaskId = null;
    } else {
      // Dropped onto another task
      const overTask = getTaskById(over.id);
      if (overTask) {
        newParentId = overTask.parent_task_id;
        newSectionId = overTask.section_id;
        overTaskId = overTask.id;
      }
    }
    
    const activeIndex = allVisibleItemIds.indexOf(active.id);
    const overIndex = allVisibleItemIds.indexOf(over.id);
    isDraggingDown = activeIndex < overIndex;

    await updateTaskParentAndOrder(
      String(active.id), 
      newParentId, 
      newSectionId, 
      overTaskId,
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

  const handleSaveReorderTasks = async (_sectionId: string | null, reorderedTasks: Task[]) => {
    if (isDemo) return;
    for (let i = 0; i < reorderedTasks.length; i++) {
      const task = reorderedTasks[i];
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

  const sectionTaskSummaries = useMemo(() => {
    const summaries = new Map<string, { pending: number; overdue: number }>();
    allSortableSections.forEach(section => {
      const tasksInSection = processedTasks.filter(t => 
        t.parent_task_id === null && 
        (t.section_id === section.id || (t.section_id === null && section.id === 'no-section-header'))
      );

      const pending = tasksInSection.filter(t => t.status === 'to-do').length;
      const overdue = tasksInSection.filter(t => 
        t.status === 'to-do' && 
        t.due_date && 
        isPast(parseISO(t.due_date)) && 
        !isSameDay(parseISO(t.due_date), currentDate)
      ).length;
      summaries.set(section.id, { pending, overdue });
    });
    return summaries;
  }, [allSortableSections, processedTasks, currentDate]);


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
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allVisibleItemIds} strategy={verticalListSortingStrategy}>
            {/* The "Toggle All Sections" button was moved to DailyTasksHeader */}

            {allSortableSections.map((currentSection: TaskSection, index) => {
              const isExpanded = expandedSections[currentSection.id] !== false;
              const topLevelTasksInSection = filteredTasks
                .filter(t => t.parent_task_id === null && (t.section_id === currentSection.id || (t.section_id === null && currentSection.id === 'no-section-header')))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
              
              const summary = sectionTaskSummaries.get(currentSection.id) || { pending: 0, overdue: 0 };
              const remainingTasksCount = summary.pending;
              const overdueTasksCount = summary.overdue;

              const isNoSection = currentSection.id === 'no-section-header';

              if (isNoSection && topLevelTasksInSection.length === 0 && !isDemo) {
                return null;
              }

              return (
                <div
                  key={currentSection.id}
                  className={cn("mb-4", index < allSortableSections.length - 1 && "border-b border-border pb-4")}
                >
                  <SortableSectionWrapper
                    section={currentSection}
                    sectionTasksCount={remainingTasksCount}
                    sectionOverdueCount={overdueTasksCount}
                    isExpanded={isExpanded}
                    toggleSection={toggleSection}
                    handleAddTaskToSpecificSection={(sectionId: string | null) => openAddTaskForSection(sectionId)}
                    markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                    handleDeleteSectionClick={async (sectionId: string) => { await deleteSection(sectionId); }}
                    updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                    onUpdateSectionName={updateSection}
                    onOpenReorderTasks={handleOpenReorderTasks}
                    isOverlay={false}
                    isNoSection={isNoSection}
                    isDemo={isDemo}
                    insertionIndicator={insertionIndicator} // Pass insertionIndicator
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
                            allTasks={processedTasks}
                            isOverlay={false}
                            expandedTasks={expandedTasks}
                            toggleTask={toggleTask}
                            setFocusTask={setFocusTask}
                            isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
                            toggleDoToday={toggleDoToday}
                            doTodayOffIds={doTodayOffIds}
                            scheduledTasksMap={scheduledTasksMap}
                            isDemo={isDemo}
                            showDragHandle={true}
                            insertionIndicator={insertionIndicator}
                            isSelected={selectedTaskIds.has(task.id)}
                            onSelectTask={onSelectTask}
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
                      (sectionTaskSummaries.get(activeItemData.id)?.pending || 0)
                    }
                    sectionOverdueCount={
                      (sectionTaskSummaries.get(activeItemData.id)?.overdue || 0)
                    }
                    isExpanded={true}
                    toggleSection={() => {}}
                    handleAddTaskToSpecificSection={() => {}}
                    markAllTasksInSectionCompleted={async () => {}}
                    handleDeleteSectionClick={async () => {}}
                    updateSectionIncludeInFocusMode={async () => {}}
                    onUpdateSectionName={async () => {}}
                    onOpenReorderTasks={handleOpenReorderTasks}
                    isOverlay={true}
                    isNoSection={activeItemData.id === 'no-section-header'}
                    insertionIndicator={null} // No insertion indicator for the overlay itself
                  />
                ) : (
                  <div className="rotate-2">
                    <TaskItem
                      task={activeItemData as Task}
                      allTasks={processedTasks}
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
                      showDragHandle={true}
                      isSelected={false}
                      onSelectTask={() => {}}
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
            onSave={async (newTaskData) => {
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
            allTasks={processedTasks}
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