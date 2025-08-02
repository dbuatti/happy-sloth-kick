import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Settings, ListTodo } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskDetailDialog from './TaskDetailDialog';
import TaskOverviewDialog from './TaskOverviewDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
// Removed TaskFilter import
import { Skeleton } from '@/components/ui/skeleton';
import ManageSectionsDialog from './ManageSectionsDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';

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

interface TaskListProps {
  tasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  userId: string | null;
  handleAddTask: (taskData: any) => Promise<any>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  // Removed filter props
  selectedTaskIds: string[];
  toggleTaskSelection: (taskId: string, checked: boolean) => void;
  clearSelectedTasks: () => void;
  bulkUpdateTasks: (updates: Partial<Task>, ids?: string[]) => Promise<void>;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>; // Keep for now, might be used by TaskForm or other internal logic
  updateSection: (sectionId: string, newName: string) => Promise<void>; // Keep for now
  deleteSection: (sectionId: string) => Promise<void>; // Keep for now
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>; // Keep for now
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null) => Promise<void>;
  reorderSections: (activeId: string, overId: string) => Promise<void>;
  moveTask: (taskId: string, direction: 'up' | 'down') => Promise<void>;
  allCategories: Category[];
  setIsAddTaskOpen: (open: boolean) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  searchRef: React.RefObject<HTMLInputElement>;
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
    // Removed filter props
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    markAllTasksInSectionCompleted,
    sections,
    createSection, // Kept
    updateSection, // Kept
    deleteSection, // Kept
    updateSectionIncludeInFocusMode, // Kept
    updateTaskParentAndOrder,
    reorderSections,
    moveTask,
    allCategories,
    setIsAddTaskOpen,
    currentDate,
    setCurrentDate,
    searchRef,
  } = props;

  console.log('[Render] TaskList', {
    filteredCount: filteredTasks.length,
    sections: sections.length,
  });

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

  // Removed state for Add Section and Manage Sections dialogs
  // const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  // const [newSectionName, setNewSectionName] = useState('');
  // const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  // const [editingSectionName, setNewEditingSectionName] = useState('');
  // const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const [isAddTaskOpenLocal, setIsAddTaskOpenLocal] = useState(false);
  const [preselectedSectionId, setPreselectedSectionId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(CustomPointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Removed anyFilterActive check
  // Removed handleResetFilters function

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
    console.log('[DnD] drag start', {
      activeId: event.active.id,
      activeData: event.active.data?.current,
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    console.log('[DnD] drag over', {
      activeId: active.id,
      overId: over.id,
      overData: over.data?.current,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      console.log('[DnD] drag end: no over, abort');
      setActiveId(null);
      return;
    }

    if (active.id === over.id) {
      console.log('[DnD] drag end: same id, abort');
      setActiveId(null);
      return;
    }

    // Section reordering
    if (isSectionHeaderId(active.id) && isSectionHeaderId(over.id)) {
      const a = String(active.id);
      const b = String(over.id);
      if (a !== 'no-section-header' && b !== 'no-section-header') {
        console.log('[DnD] reordering sections', { from: a, to: b });
        await reorderSections(a, b);
      } else {
        console.log('[DnD] ignore reorder with no-section-header');
      }
      setActiveId(null);
      return;
    }

    const draggedTask = getTaskById(active.id);
    if (!draggedTask) {
      console.warn('[DnD] drag end: active task not found', { activeId: active.id });
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
        console.log('[DnD] over not a task or section, abort', over.id);
        setActiveId(null);
        return;
      }
      newParentId = overTask.parent_task_id;
      newSectionId = overTask.parent_task_id ? draggedTask.section_id : overTask.section_id;
      overId = overTask.id;
    }

    console.log('[DnD] drag end resolved', {
      draggedId: draggedTask.id,
      from: { parent: draggedTask.parent_task_id, section: draggedTask.section_id },
      to: { newParentId, newSectionId, overId },
    });

    await updateTaskParentAndOrder(draggedTask.id, newParentId, newSectionId, overId);
    setActiveId(null);
  };

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const openAddTaskForSection = (sectionId: string | null) => {
    setPreselectedSectionId(sectionId);
    setIsAddTaskOpenLocal(true);
  };

  return (
    <>
      <div className="space-y-1.5 mb-2">
        {/* Removed TaskFilter component */}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-1.5">
          <div className="flex gap-1.5 w-full sm:w-auto">
            {/* Removed Add Section Button and Dialog */}
            {/*
            <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Plus className="mr-2 h-4 w-4" /> Add Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Section</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="new-section-name">Section Name</Label>
                    <Input
                      id="new-section-name"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="e.g., Work, Personal, Groceries"
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddSectionOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    if (newSectionName.trim()) {
                      createSection(newSectionName.trim());
                      setNewSectionName('');
                      setIsAddSectionOpen(false);
                    }
                  }} disabled={!newSectionName.trim()}>Add Section</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            */}

            {/* Removed Manage Sections Button and Tooltip */}
            {/*
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="mr-2 h-4 w-4" /> Manage Sections
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Manage, rename, delete, and reorder your task sections.
              </TooltipContent>
            </Tooltip>
            */}
          </div>
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
                <div key={currentSection.id} className="mb-1.5">
                  <SortableSectionHeader
                    section={currentSection}
                    sectionTasksCount={topLevelTasksInSection.length}
                    isExpanded={isExpanded}
                    toggleSection={toggleSection}
                    // Removed editingSectionId, editingSectionName, setNewEditingSectionName, handleRenameSection, handleCancelSectionEdit, handleEditSectionClick props
                    editingSectionId={null} // Pass null as editing is no longer handled here
                    editingSectionName="" // Pass empty string
                    setNewEditingSectionName={() => {}} // No-op
                    handleRenameSection={async () => {}} // No-op
                    handleCancelSectionEdit={() => {}} // No-op
                    handleEditSectionClick={() => {}} // No-op
                    handleAddTaskToSpecificSection={(sectionId) => openAddTaskForSection(sectionId)}
                    markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                    handleDeleteSectionClick={(id) => {
                      // setIsManageSectionsOpen(true); // Removed this
                    }}
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
                                <p className="text-sm font-medium">
                                  {/* Removed anyFilterActive check */}
                                  No tasks in this section yet.
                                </p>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <Button size="sm" onClick={() => openAddTaskForSection(currentSection.id === 'no-section-header' ? null : currentSection.id)}>
                                  <Plus className="mr-2 h-4 w-4" /> Add Task
                                </Button>
                                {/* Removed filter reset button */}
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

      {/* Removed ManageSectionsDialog */}
      {/*
      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />
      */}

      {/* Details & Overview */}
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          userId={userId}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks}
        />
      )}
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={userId}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
        />
      )}
    </>
  );
};

export default TaskList;