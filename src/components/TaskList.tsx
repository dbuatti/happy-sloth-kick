import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Settings, ListTodo } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskDetailDialog from './TaskDetailDialog';
import TaskOverviewDialog from './TaskOverviewDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import TaskFilter from './TaskFilter';
import { Skeleton } from '@/components/ui/skeleton';
import ManageSectionsDialog from './ManageSectionsDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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

interface TaskListProps {
  tasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  userId: string | null;
  handleAddTask: (taskData: any) => Promise<any>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  sectionFilter: string;
  setSectionFilter: (value: string) => void;
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
  searchRef: React.RefObject<HTMLInputElement>;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  filteredTasks,
  loading,
  userId,
  handleAddTask,
  updateTask,
  deleteTask,
  searchFilter,
  setSearchFilter,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
  sectionFilter,
  setSectionFilter,
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
  searchRef,
}) => {
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

  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);
  const [isBulkActionInProgress, setIsBulkActionInProgress] = useState(false);

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setNewEditingSectionName] = useState('');
  const [showConfirmDeleteSectionDialog, setShowConfirmDeleteSectionDialog] = useState(false);
  const [sectionToDeleteId, setSectionToDeleteId] = useState<string | null>(null);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

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

  const allSortableTaskIds = useMemo(() => filteredTasks.map(t => t.id), [filteredTasks]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) {
      setActiveId(null);
      return;
    }

    let newParentId: string | null = null;
    let newSectionId: string | null = null;
    let overTargetId: string | null = null;

    const overTask = tasks.find(t => t.id === over.id);
    const overSectionHeader = allSortableSections.find(s => s.id === over.id);

    if (overTask) {
      newParentId = overTask.id;
      newSectionId = overTask.section_id;
      overTargetId = overTask.id;
    } else if (overSectionHeader) {
      newParentId = null;
      newSectionId = overSectionHeader.id === 'no-section-header' ? null : overSectionHeader.id;
      overTargetId = null;
    } else {
      const targetSectionId = allSortableSections.find(s => s.id === over.id)?.id;
      if (targetSectionId) {
        newParentId = null;
        newSectionId = targetSectionId === 'no-section-header' ? null : targetSectionId;
        overTargetId = null;
      } else {
        setActiveId(null);
        return;
      }
    }

    if (active.data.current?.type === 'section' && over.data.current?.type === 'section') {
      if (active.id !== 'no-section-header' && over.id !== 'no-section-header') {
        await reorderSections(active.id as string, over.id as string);
      }
    } else if (active.data.current?.type === 'task') {
      await updateTaskParentAndOrder(activeTask.id, newParentId, newSectionId, overTargetId);
    }

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

  const handleBulkAction = (action: string) => {
    if (action.startsWith('priority-')) {
      const priority = action.split('-')[1];
      bulkUpdateTasks({ priority });
    } else if (action === 'complete') {
      bulkUpdateTasks({ status: 'completed' });
    } else if (action === 'archive') {
      bulkUpdateTasks({ status: 'archived' });
    } else if (action === 'delete') {
      setShowConfirmBulkDeleteDialog(true);
    }
  };

  const confirmBulkDelete = async () => {
    setIsBulkActionInProgress(true);
    for (const taskId of selectedTaskIds) {
      await deleteTask(taskId);
    }
    clearSelectedTasks();
    setShowConfirmBulkDeleteDialog(false);
    setIsBulkActionInProgress(false);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeSection = activeId ? allSortableSections.find(s => s.id === activeId) : null;

  return (
    <>
      <div className="space-y-4 mb-4">
        <TaskFilter
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          sectionFilter={sectionFilter}
          setSectionFilter={setSectionFilter}
          sections={sections}
          allCategories={allCategories}
          searchRef={searchRef}
        />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="flex-1" onClick={() => setIsManageSectionsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" /> Manage Sections
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Manage, rename, delete, and reorder your task sections.
              </TooltipContent>
            </Tooltip>
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
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={[...allSortableSections.map(s => s.id)]} strategy={verticalListSortingStrategy}>
            {allSortableSections.map((currentSection: TaskSection) => {
              const isExpanded = expandedSections[currentSection.id] !== false;
              const topLevelTasksInSection = filteredTasks.filter(t => 
                t.parent_task_id === null && 
                (t.section_id === currentSection.id || (t.section_id === null && currentSection.id === 'no-section-header'))
              );

              return (
                <div key={currentSection.id} className="mb-3">
                  <SortableSectionHeader
                    section={currentSection}
                    sectionTasksCount={topLevelTasksInSection.length}
                    isExpanded={isExpanded}
                    toggleSection={toggleSection}
                    editingSectionId={editingSectionId}
                    editingSectionName={editingSectionName}
                    setNewEditingSectionName={setNewEditingSectionName}
                    handleRenameSection={async () => {
                      if (editingSectionId && editingSectionName.trim()) {
                        await updateSection(editingSectionId, editingSectionName.trim());
                        setEditingSectionId(null);
                        setNewEditingSectionName('');
                      }
                    }}
                    handleCancelSectionEdit={() => setEditingSectionId(null)}
                    handleEditSectionClick={(s) => {
                      setEditingSectionId(s.id);
                      setNewEditingSectionName(s.name);
                    }}
                    handleAddTaskToSpecificSection={() => setIsAddTaskOpen(true)}
                    markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                    handleDeleteSectionClick={(id) => {
                      setSectionToDeleteId(id);
                      setShowConfirmDeleteSectionDialog(true);
                    }}
                    updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                  />
                  {isExpanded && (
                    <div className="mt-2 space-y-2 pl-2" id={currentSection.id}>
                      <SortableContext items={[...allSortableTaskIds]} strategy={verticalListSortingStrategy}>
                        <ul className="list-none space-y-2">
                          {topLevelTasksInSection.length === 0 ? (
                            <div className="text-center text-muted-foreground py-5 rounded-md border border-dashed border-border/60 bg-muted/30" data-no-dnd="true">
                              <div className="flex items-center justify-center gap-2">
                                <ListTodo className="h-5 w-5" />
                                <p className="text-sm font-medium">No tasks in this section</p>
                              </div>
                              <p className="text-xs mt-1">Drag a task here or use “Add Section” to organize.</p>
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

          {filteredTasks.length === 0 && !loading && (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center gap-2 border border-dashed border-border/60 rounded-md bg-muted/30">
              <ListTodo className="h-8 w-8" />
              <p className="text-base font-medium">No tasks match your filters</p>
              <p className="text-xs">Try clearing filters or add a new task.</p>
            </div>
          )}

          {createPortal(
            <DragOverlay>
              {activeTask && (
                <SortableTaskItem
                  key={activeTask.id}
                  task={activeTask}
                  userId={userId}
                  onStatusChange={async (taskId, newStatus) => updateTask(taskId, { status: newStatus })}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                  isSelected={false}
                  onToggleSelect={() => {}}
                  sections={sections}
                  onOpenOverview={(t) => {
                    setTaskToOverview(t);
                    setIsTaskOverviewOpen(true);
                  }}
                  currentDate={currentDate}
                  onMoveUp={(taskId) => moveTask(taskId, 'up')}
                  onMoveDown={(taskId) => moveTask(taskId, 'down')}
                  level={activeTask.parent_task_id ? 1 : 0}
                  allTasks={tasks}
                />
              )}
              {activeSection && (
                <SortableSectionHeader
                  section={activeSection}
                  sectionTasksCount={filteredTasks.filter(t => t.parent_task_id === null && (t.section_id === activeSection.id || (t.section_id === null && activeSection.id === 'no-section-header'))).length}
                  isExpanded={expandedSections[activeSection.id] !== false}
                  toggleSection={toggleSection}
                  editingSectionId={editingSectionId}
                  editingSectionName={editingSectionName}
                  setNewEditingSectionName={setNewEditingSectionName}
                  handleRenameSection={async () => {
                    if (editingSectionId && editingSectionName.trim()) {
                      await updateSection(editingSectionId, editingSectionName.trim());
                      setEditingSectionId(null);
                      setNewEditingSectionName('');
                    }
                  }}
                  handleCancelSectionEdit={() => setEditingSectionId(null)}
                  handleEditSectionClick={(s) => {
                    setEditingSectionId(s.id);
                    setNewEditingSectionName(s.name);
                  }}
                  handleAddTaskToSpecificSection={() => setIsAddTaskOpen(true)}
                  markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                  handleDeleteSectionClick={(id) => {
                    setSectionToDeleteId(id);
                    setShowConfirmDeleteSectionDialog(true);
                  }}
                  updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                />
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          userId={userId}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={(t) => {
            setIsTaskOverviewOpen(false);
            setTaskToEdit(t);
            setIsTaskDetailOpen(true);
          }}
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

      <AlertDialog open={showConfirmBulkDeleteDialog} onOpenChange={setShowConfirmBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} selected tasks` : 'the selected tasks'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkActionInProgress}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} disabled={isBulkActionInProgress}>
              {isBulkActionInProgress ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDeleteSectionDialog} onOpenChange={setShowConfirmDeleteSectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this section and move all its tasks to "No Section".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (sectionToDeleteId) {
                await deleteSection(sectionToDeleteId);
                setSectionToDeleteId(null);
                setShowConfirmDeleteSectionDialog(false);
              }
            }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />
    </>
  );
};

export default TaskList;