import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ListTodo } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { CustomPointerSensor } from '@/lib/CustomPointerSensor';
import SortableTaskItem from './SortableTaskItem';
import SortableSectionHeader from './SortableSectionHeader';
import TaskForm from './TaskForm';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  userId: string | null;
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
  moveTask: (taskId: string, direction: 'up' | 'down') => Promise<void>;
  allCategories: Category[];
  setIsAddTaskOpen: (open: boolean) => void;
  onOpenOverview: (task: Task) => void; // Added this prop
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const TaskList: React.FC<TaskListProps> = (props) => {
  const {
    tasks,
    filteredTasks,
    loading,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    markAllTasksInSectionCompleted,
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    moveTask,
    allCategories,
    setIsAddTaskOpen,
    onOpenOverview, // Destructure the new prop
    currentDate,
    setCurrentDate,
  } = props;

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('taskList_expandedSections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isAddTaskOpenLocal, setIsAddTaskOpenLocal] = useState(false);
  const [preselectedSectionId, setPreselectedSectionId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItemData, setActiveItemData] = useState<Task | TaskSection | null>(null); // To store data for DragOverlay

  const sensors = useSensors(
    useSensor(CustomPointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [sectionId]: !(prev[sectionId] ?? true) };
      localStorage.setItem('taskList_expandedSections', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const allSortableSections = useMemo(() => {
    const noSection: TaskSection = {
      id: 'no-section-header',
      name: 'No Section',
      user_id: userId || '',
      order: sections.length,
      include_in_focus_mode: true,
    };
    return [...sections, noSection];
  }, [sections, userId]);

  const isSectionHeaderId = (id: UniqueIdentifier | null) => {
    if (!id) return false;
    return id === 'no-section-header' || sections.some(s => s.id === id);
  };

  const getTaskById = (id: UniqueIdentifier | null) => {
    if (!id) return undefined;
    return tasks.find(t => t.id === id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    if (isSectionHeaderId(event.active.id)) {
      setActiveItemData(allSortableSections.find(s => s.id === event.active.id) || null);
    } else {
      setActiveItemData(tasks.find(t => t.id === event.active.id) || null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      setActiveItemData(null);
      return;
    }

    // Section reordering
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

    // Compute new parent/section
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
      newSectionId = overTask.parent_task_id ? draggedTask.section_id : overTask.section_id;
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

  // Removed: editingSectionId, setEditingSectionId, editingSectionName, setNewEditingSectionName

  // Removed: handleEditSectionClickCorrected as it's now internal to SortableSectionHeader

  return (
    <>
      {/* Removed compact section overview bar */}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={[...allSortableSections.map(s => s.id)]} strategy={verticalListSortingStrategy}>
            {allSortableSections.map((currentSection: TaskSection, index) => {
              const isExpanded = expandedSections[currentSection.id] !== false;

              // Section-local top-level tasks
              const topLevelTasksInSection = filteredTasks
                .filter(t => t.parent_task_id === null && (t.section_id === currentSection.id || (t.section_id === null && currentSection.id === 'no-section-header')))
                .sort((a, b) => (a.order || 0) - (b.order || 0));

              // DnD items for this section only
              const sectionItemIds = topLevelTasksInSection.map(t => t.id);

              return (
                <div
                  key={currentSection.id}
                  className={cn(
                    "mb-1.5",
                    index < allSortableSections.length - 1 && "border-b border-border pb-1" // Changed pb-3 to pb-1
                  )}
                >
                  <SortableSectionHeader
                    section={currentSection}
                    sectionTasksCount={topLevelTasksInSection.length}
                    isExpanded={isExpanded}
                    toggleSection={toggleSection}
                    // Removed: editingSectionId={editingSectionId}
                    // Removed: editingSectionName={editingSectionName}
                    // Removed: setNewEditingSectionName={setEditingSectionName}
                    // Removed: handleEditSectionClick={handleEditSectionClickCorrected}
                    handleAddTaskToSpecificSection={(sectionId) => openAddTaskForSection(sectionId)}
                    markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                    handleDeleteSectionClick={deleteSection}
                    updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                    onUpdateSectionName={updateSection} // Pass the update function directly
                    isOverlay={false} // Not an overlay
                  />

                  {isExpanded && (
                    <div className="mt-1.5 space-y-1.5 pl-2">
                      <SortableContext items={sectionItemIds} strategy={verticalListSortingStrategy}>
                        <ul className="list-none space-y-1.5">
                          {topLevelTasksInSection.length === 0 ? (
                            <div className="text-center text-foreground/80 dark:text-foreground/80 py-3 rounded-md border-dashed border-border bg-muted/30" data-no-dnd="true">
                              <div className="flex items-center justify-center gap-2 mb-1.5">
                                <ListTodo className="h-4 w-4" />
                                <p className="text-sm font-medium">No tasks in this section yet.</p>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <Button size="sm" onClick={() => openAddTaskForSection(currentSection.id === 'no-section-header' ? null : currentSection.id)}>
                                  <Plus className="mr-2 h-4 w-4" /> Add Task
                                </Button>
                              </div>
                            </div>
                          ) : (
                            topLevelTasksInSection.map(task => (
                              <SortableTaskItem
                                key={task.id}
                                task={task}
                                userId={userId}
                                onStatusChange={async (taskId, newStatus) => updateTask(taskId, { status: newStatus })}
                                onDelete={deleteTask}
                                onUpdate={updateTask}
                                isSelected={selectedTaskIds.includes(task.id)}
                                onToggleSelect={toggleTaskSelection}
                                sections={sections}
                                onOpenOverview={onOpenOverview} // Pass the prop down
                                currentDate={currentDate}
                                onMoveUp={(taskId) => moveTask(taskId, 'up')}
                                onMoveDown={(taskId) => moveTask(taskId, 'down')}
                                level={0}
                                allTasks={tasks}
                                isOverlay={false} // Not an overlay
                              />
                            ))
                          )}
                        </ul>
                      </SortableContext>
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
                      filteredTasks.filter(t => t.parent_task_id === null && (t.section_id === activeItemData.id || (t.section_id === null && activeItemData.id === 'no-section-header'))).length
                    }
                    isExpanded={true} // Always expanded in overlay
                    toggleSection={() => {}}
                    // Removed: editingSectionId={null}
                    // Removed: editingSectionName=""
                    // Removed: setNewEditingSectionName={() => {}}
                    // Removed: handleEditSectionClick={() => {}}
                    handleAddTaskToSpecificSection={() => {}}
                    markAllTasksInSectionCompleted={async () => {}}
                    handleDeleteSectionClick={() => {}}
                    updateSectionIncludeInFocusMode={async () => {}}
                    onUpdateSectionName={async () => {}} // Dummy for overlay
                    isOverlay={true} // Mark as overlay
                  />
                ) : (
                  <SortableTaskItem
                    task={activeItemData as Task}
                    userId={userId}
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
                    level={0}
                    allTasks={tasks}
                    isOverlay={true} // Mark as overlay
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
            userId={userId}
            sections={sections}
            allCategories={allCategories}
            preselectedSectionId={preselectedSectionId ?? undefined}
            currentDate={currentDate}
            autoFocus
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskList;