import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, ChevronsDownUp } from 'lucide-react'; // Import ChevronsDownUp
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
  DragOverlay,
  UniqueIdentifier,
  DragOverEvent,
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
import { useAuth } from '@/context/AuthContext';

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
  expandedSections: Record<string, boolean>; // New prop
  toggleSection: (sectionId: string) => void; // New prop
  toggleAllSections: () => void; // New prop
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
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    allCategories,
    onOpenOverview,
    currentDate,
    expandedSections, // Destructure new prop
    toggleSection, // Destructure new prop
    toggleAllSections, // Destructure new prop
  } = props;

  const { user } = useAuth();
  const userId = user?.id || null;

  const [isAddTaskOpenLocal, setIsAddTaskOpenLocal] = useState(false);
  const [preselectedSectionId, setPreselectedSectionId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeItemData, setActiveItemData] = useState<Task | TaskSection | null>(null);

  const sensors = useSensors(
    useSensor(CustomPointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragOver = (_event: DragOverEvent) => {
    // No specific logic needed here for now, but required by DndContext
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

  return (
    <>
      {/* Removed compact section overview bar */}

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
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={[...allSortableSections.map(s => s.id)]} strategy={verticalListSortingStrategy}>
            {/* New: Toggle All Sections Button */}
            <div className="flex justify-end mb-3"> {/* Increased margin-bottom */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllSections} // Use the prop from DailyTasksV3
                aria-label="Toggle all sections"
                className="h-9 px-3" // Increased height
              >
                <ChevronsDownUp className="h-5 w-5 mr-2" /> Toggle All Sections {/* Increased icon size */}
              </Button>
            </div>

            {allSortableSections.map((currentSection: TaskSection, index) => {
              const isExpanded = expandedSections[currentSection.id] !== false;

              // Section-local top-level tasks
              const topLevelTasksInSection = filteredTasks
                .filter(t => t.parent_task_id === null && (t.section_id === currentSection.id || (t.section_id === null && currentSection.id === 'no-section-header')))
                .sort((a, b) => (a.order || 0) - (b.order || 0));

              // Calculate remaining tasks for the badge
              const remainingTasksCount = topLevelTasksInSection.filter(t => t.status === 'to-do').length;

              // DnD items for this section only
              const sectionItemIds = topLevelTasksInSection.map(t => t.id);

              return (
                <div
                  key={currentSection.id}
                  className={cn(
                    "mb-4", // Increased margin-bottom
                    index < allSortableSections.length - 1 && "border-b border-border pb-4" // Increased padding-bottom
                  )}
                >
                  <SortableSectionHeader
                    section={currentSection}
                    sectionTasksCount={remainingTasksCount} // Pass remaining tasks count
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
                    <div className="mt-4 space-y-2"> {/* Increased margin-top and space-y */}
                      <SortableContext items={sectionItemIds} strategy={verticalListSortingStrategy}>
                        <ul className="list-none space-y-2"> {/* Increased space-y */}
                          {topLevelTasksInSection.length === 0 ? (
                            <div className="text-center text-foreground/80 dark:text-foreground/80 py-4 rounded-xl border-dashed border-border bg-muted/30" data-no-dnd="true"> {/* Increased vertical padding */}
                              <div className="flex items-center justify-center gap-2 mb-4"> {/* Increased margin-bottom */}
                                <ListTodo className="h-6 w-6" /> {/* Increased icon size */}
                                <p className="text-lg font-medium">No tasks in this section yet.</p> {/* Increased font size */}
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <Button size="lg" onClick={() => openAddTaskForSection(currentSection.id === 'no-section-header' ? null : currentSection.id)} className="h-10"> {/* Increased height */}
                                  <Plus className="mr-2 h-5 w-5" /> Add Task {/* Increased icon size */}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            topLevelTasksInSection.map(task => (
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
                      filteredTasks.filter(t => t.parent_task_id === null && (t.section_id === activeItemData.id || (t.section_id === null && activeItemData.id === 'no-section-header'))).filter(t => t.status === 'to-do').length // Filter for remaining tasks
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
                  <SortableTaskItem
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
                    level={0}
                    allTasks={tasks}
                    isOverlay={true}
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
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskList;