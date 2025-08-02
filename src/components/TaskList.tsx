import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ListTodo } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const sensors = useSensors(
    useSensor(CustomPointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Keep a ref per section to scroll/focus
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Compute counts of top-level tasks per section for the overview bar
  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allSortableSections.forEach(s => { counts[s.id] = 0; });
    filteredTasks.forEach(t => {
      if (t.parent_task_id === null) {
        const key = t.section_id ?? 'no-section-header';
        if (counts[key] === undefined) counts[key] = 0;
        counts[key] += 1;
      }
    });
    return counts;
  }, [filteredTasks, allSortableSections]);

  const focusSection = (sectionId: string) => {
    // Ensure section expanded
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
    // Scroll to it
    requestAnimationFrame(() => {
      const el = sectionRefs.current[sectionId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openAddTaskForSection = (sectionId: string | null) => {
    setPreselectedSectionId(sectionId);
    setIsAddTaskOpenLocal(true);
    // Expand and focus section
    const key = sectionId ?? 'no-section-header';
    focusSection(key);
  };

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
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
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
      return;
    }

    const draggedTask = getTaskById(active.id);
    if (!draggedTask) {
      setActiveId(null);
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
        return;
      }
      newParentId = overTask.parent_task_id;
      newSectionId = overTask.parent_task_id ? draggedTask.section_id : overTask.section_id;
      overId = overTask.id;
    }

    await updateTaskParentAndOrder(draggedTask.id, newParentId, newSectionId, overId);
    setActiveId(null);
  };

  return (
    <>
      {/* Compact Section Overview Bar */}
      <div className="mb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {allSortableSections.map((sec) => {
            const count = sectionCounts[sec.id] ?? 0;
            const isNoSection = sec.id === 'no-section-header';
            return (
              <div
                key={sec.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1 bg-card shadow-sm flex-shrink-0",
                )}
              >
                <button
                  className="text-sm font-medium hover:underline"
                  onClick={() => focusSection(sec.id)}
                  aria-label={`Go to ${isNoSection ? 'No Section' : sec.name}`}
                >
                  {isNoSection ? 'No Section' : sec.name}
                </button>
                <span className="text-xs text-muted-foreground">• {count}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onClick={() => openAddTaskForSection(isNoSection ? null : sec.id)}
                  aria-label={`Add task to ${isNoSection ? 'No Section' : sec.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

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
            {allSortableSections.map((currentSection: TaskSection) => {
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
                  className="mb-1.5"
                  ref={(el) => { sectionRefs.current[currentSection.id] = el; }}
                >
                  <SortableSectionHeader
                    section={currentSection}
                    sectionTasksCount={topLevelTasksInSection.length}
                    isExpanded={isExpanded}
                    toggleSection={toggleSection}
                    editingSectionId={null}
                    editingSectionName=""
                    setNewEditingSectionName={() => {}}
                    handleRenameSection={async () => {}}
                    handleCancelSectionEdit={() => {}}
                    handleEditSectionClick={() => {}}
                    handleAddTaskToSpecificSection={(sectionId) => openAddTaskForSection(sectionId)}
                    markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                    handleDeleteSectionClick={() => {}}
                    updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                  />

                  {isExpanded && (
                    <div className="mt-1.5 space-y-1.5 pl-2">
                      <SortableContext items={sectionItemIds} strategy={verticalListSortingStrategy}>
                        <ul className="list-none space-y-1.5">
                          {topLevelTasksInSection.length === 0 ? (
                            <div className="text-center text-foreground/80 dark:text-foreground/80 py-3 rounded-md border border-dashed border-border bg-muted/30" data-no-dnd="true">
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
                                onOpenOverview={(t) => {
                                  setTaskToOverview(t);
                                  setIsTaskOverviewOpen(true);
                                }}
                                currentDate={currentDate}
                                onMoveUp={(taskId) => moveTask(taskId, 'up')}
                                onMoveDown={(taskId) => moveTask(taskId, 'down')}
                                level={0}
                                allTasks={tasks}
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
              {/* Intentionally empty overlay */}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}

      <Dialog open={isAddTaskOpenLocal} onOpenChange={setIsAddTaskOpenLocal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
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