import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsDownUp } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/tasks/types'; // Updated import path
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

const TaskList: React.FC<TaskListProps> = (props) => {
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
    reorderSections,
    updateTaskParentAndOrder,
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

  const { user } = useAuth();
  const userId = user?.id || '';

  const [isAddTaskOpenLocal, setIsAddTaskOpenLocal] = useState(false);
  const [preselectedSectionId, setPreselectedSectionId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItemData, setActiveItemData] = useState<Task | TaskSection | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // User must move 8px before a drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: !isDemo,
    })
  );

  const tasksMap = useMemo(() => new Map(processedTasks.map((task: Task) => [task.id, task])), [processedTasks]);
  const getTaskById = useCallback((id: UniqueIdentifier | null) => {
      if (!id) return undefined;
      return tasksMap.get(String(id));
  }, [tasksMap]);

  const defaultCategory = useMemo(() => {
    return allCategories.find((c: Category) => c.name.toLowerCase() === 'general') || allCategories[0];
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
      setActiveItemData(processedTasks.find((t: Task) => t.id === event.active.id) || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActiveItemData(null);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeIsSection = isSectionHeaderId(active.id);
    const overIsSection = isSectionHeaderId(over.id);

    if (activeIsSection && overIsSection) {
      reorderSections(String(active.id), String(over.id));
    } else if (!activeIsSection && !overIsSection) {
      const activeTask = getTaskById(active.id);
      const overTask = getTaskById(over.id);

      if (!activeTask || !overTask) return;

      const newParentId = overTask.parent_task_id;
      const newSectionId = overTask.section_id;

      const isDraggingDown = event.delta.y > 0;

      updateTaskParentAndOrder(String(active.id), newParentId, newSectionId, String(over.id), isDraggingDown);
    } else if (!activeIsSection && overIsSection) {
      const activeTask = getTaskById(active.id);
      const overSection = allSortableSections.find(s => s.id === over.id);

      if (!activeTask || !overSection) return;

      updateTaskParentAndOrder(String(active.id), null, overSection.id === 'no-section-header' ? null : overSection.id, null, false);
    }
  };

  const handleAddTaskToSpecificSection = useCallback((sectionId: string | null) => {
    setPreselectedSectionId(sectionId);
    setIsAddTaskOpenLocal(true);
  }, []);

  const getTasksForSection = useCallback((sectionId: string | null) => {
    return filteredTasks
      .filter(task => task.parent_task_id === null && (task.section_id === sectionId || (task.section_id === null && sectionId === 'no-section-header')))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [filteredTasks]);

  const renderTasksRecursively = useCallback((tasksToRender: Task[], level: number) => {
    return tasksToRender.map((task: Task) => (
      <React.Fragment key={task.id}>
        <SortableTaskItem
          task={task}
          level={level}
          allTasks={tasks} // Pass all tasks for subtask filtering
          onStatusChange={(taskId, newStatus) => updateTask(taskId, { status: newStatus })}
          onDelete={deleteTask}
          onUpdate={updateTask}
          sections={sections}
          onOpenOverview={onOpenOverview}
          currentDate={currentDate}
          onMoveUp={async () => {}}
          onMoveDown={async () => {}}
          expandedTasks={expandedTasks}
          toggleTask={toggleTask}
          setFocusTask={setFocusTask}
          isDoToday={!doTodayOffIds.has(task.original_task_id || task.id)}
          toggleDoToday={toggleDoToday}
          scheduledTasksMap={scheduledTasksMap}
          isDemo={isDemo}
        />
      </React.Fragment>
    ));
  }, [tasks, updateTask, deleteTask, sections, onOpenOverview, currentDate, expandedTasks, toggleTask, setFocusTask, doTodayOffIds, toggleDoToday, scheduledTasksMap, isDemo]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <Button variant="outline" onClick={toggleAllSections} className="w-full">
          <ChevronsDownUp className="mr-2 h-4 w-4" /> Toggle All Sections
        </Button>
        <SortableContext items={allVisibleItemIds} strategy={verticalListSortingStrategy}>
          {allSortableSections.map(section => {
            const topLevelTasksInSection = getTasksForSection(section.id);
            const isSectionExpanded = expandedSections[section.id] !== false;
            return (
              <div key={section.id} className="space-y-2">
                <SortableSectionHeader
                  section={section}
                  sectionTasksCount={topLevelTasksInSection.length}
                  isExpanded={isSectionExpanded}
                  toggleSection={toggleSection}
                  handleAddTaskToSpecificSection={handleAddTaskToSpecificSection}
                  markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                  handleDeleteSectionClick={deleteSection}
                  updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                  onUpdateSectionName={updateSection}
                />
                {isSectionExpanded && (
                  <ul className="list-none space-y-1.5">
                    {topLevelTasksInSection.length === 0 ? (
                      <li className="p-2 text-sm text-muted-foreground text-center bg-card rounded-lg">
                        No tasks in this section.
                      </li>
                    ) : (
                      renderTasksRecursively(topLevelTasksInSection, 0)
                    )}
                    <li>
                      <QuickAddTask
                        sectionId={section.id === 'no-section-header' ? null : section.id}
                        onAddTask={handleAddTask}
                        defaultCategoryId={defaultCategory?.id || ''}
                        isDemo={isDemo}
                      />
                    </li>
                  </ul>
                )}
              </div>
            );
          })}
        </SortableContext>
      </div>

      {createPortal(
        <DragOverlay>
          {activeItemData && (
            isSectionHeaderId(activeId) ? (
              <SortableSectionHeader
                section={activeItemData as TaskSection}
                sectionTasksCount={getTasksForSection((activeItemData as TaskSection).id).length}
                isExpanded={true}
                toggleSection={() => {}}
                handleAddTaskToSpecificSection={() => {}}
                markAllTasksInSectionCompleted={async () => {}}
                handleDeleteSectionClick={() => {}}
                updateSectionIncludeInFocusMode={async () => {}}
                onUpdateSectionName={async () => {}}
                isOverlay
              />
            ) : (
              <SortableTaskItem
                task={activeItemData as Task}
                level={0}
                allTasks={tasks}
                onStatusChange={(taskId, newStatus) => updateTask(taskId, { status: newStatus })}
                onDelete={deleteTask}
                onUpdate={updateTask}
                sections={sections}
                onOpenOverview={onOpenOverview}
                currentDate={currentDate}
                onMoveUp={async () => {}}
                onMoveDown={async () => {}}
                isOverlay
                expandedTasks={expandedTasks}
                toggleTask={toggleTask}
                setFocusTask={setFocusTask}
                isDoToday={!doTodayOffIds.has((activeItemData as Task).original_task_id || (activeItemData as Task).id)}
                toggleDoToday={toggleDoToday}
                doTodayOffIds={doTodayOffIds}
                scheduledTasksMap={scheduledTasksMap}
                isDemo={isDemo}
              />
            )
          )}
        </DragOverlay>,
        document.body
      )}

      <Dialog open={isAddTaskOpenLocal} onOpenChange={setIsAddTaskOpenLocal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the details to add a new task.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSave={async (taskData) => {
              const success = await handleAddTask(taskData);
              if (success) {
                setIsAddTaskOpenLocal(false);
                setPreselectedSectionId(null);
              }
              return success;
            }}
            onCancel={() => {
              setIsAddTaskOpenLocal(false);
              setPreselectedSectionId(null);
            }}
            sections={sections}
            allCategories={allCategories}
            preselectedSectionId={preselectedSectionId}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          />
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};

export default TaskList;