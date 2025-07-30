import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, CheckCircle2, ListTodo, FolderOpen, ChevronDown, Edit, MoreHorizontal, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import TaskItem from './TaskItem';
import BulkActions from './BulkActions';
import AddTaskForm from './AddTaskForm';
import DailyStreak from './DailyStreak';
import SmartSuggestions from './SmartSuggestions';
import { Task, TaskSection } from '@/hooks/useTasks';
import TaskDetailDialog from './TaskDetailDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import TaskFilter from './TaskFilter';
import { Skeleton } from '@/components/ui/skeleton';
import ManageSectionsDialog from './ManageSectionsDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
  setIsAddTaskOpen: (open: boolean) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  onSetAsFocusTask: (taskId: string) => void; // New prop
  manualFocusTaskId: string | null; // New prop
  onClearManualFocus: () => void; // New prop
}

const TaskList: React.FC<TaskListProps> = ({ setIsAddTaskOpen, currentDate, setCurrentDate, onSetAsFocusTask, manualFocusTaskId, onClearManualFocus }) => {
  const {
    tasks,
    filteredTasks,
    loading,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    searchFilter,
    setSearchFilter,
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
    reorderTasksInSameSection,
    moveTaskToNewSection,
    reorderSections,
    moveTask,
    allCategories,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
    focusModeTasksForDailyStreak,
  } = useTasks({ currentDate, setCurrentDate });

  const [isAddTaskFormOpen, setIsAddTaskForm] = useState(false);
  const [sectionToPreselect, setSectionToPreselect] = useState<string | null>(null);
  const [isTaskDetailOpen, setIsTaskDetail] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('taskList_expandedSections');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error loading expanded sections from localStorage:', e);
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

  const tasksBySection = useMemo(() => {
    const grouped: Record<string, Task[]> = { 'no-section': [] };
    
    sections.forEach((currentSection: TaskSection) => {
      grouped[currentSection.id] = [];
    });

    const tasksForGrouping = filteredTasks.filter(task => task.parent_task_id === null);

    tasksForGrouping.forEach(task => {
      const sectionId = task.section_id;
      if (sectionId && grouped[sectionId] !== undefined) {
        grouped[sectionId].push(task);
      } else {
        grouped['no-section'].push(task);
      }
    });

    return grouped;
  }, [filteredTasks, sections]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'task' && overType === 'task') {
      const activeTask = active.data.current?.task as Task;
      const overTask = over.data.current?.task as Task;

      if (activeTask.section_id === overTask.section_id) {
        await reorderTasksInSameSection(activeTask.section_id, active.id as string, over.id as string);
      } else {
        await moveTaskToNewSection(active.id as string, activeTask.section_id, overTask.section_id, over.id as string);
      }
    } else if (activeType === 'task' && overType === 'section') {
      const activeTask = active.data.current?.task as Task;
      const overSection = over.data.current?.section as TaskSection;
      await moveTaskToNewSection(active.id as string, activeTask.section_id, overSection.id, null);
    } else if (activeType === 'task' && over.id === 'no-section-drop-area') {
      const activeTask = active.data.current?.task as Task;
      await moveTaskToNewSection(active.id as string, activeTask.section_id, null, null);
    } else if (activeType === 'section' && overType === 'section') {
      await reorderSections(active.id as string, over.id as string);
    }

    setActiveId(null);
  };

  const handleAddTaskSubmit = async (taskData: any) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsAddTaskForm(false);
      setIsAddTaskOpen(false);
      setSectionToPreselect(null);
    }
    return success;
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetail(true);
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
    await bulkUpdateTasks({ status: 'archived' }, selectedTaskIds);
    clearSelectedTasks();
    setShowConfirmBulkDeleteDialog(false);
    setIsBulkActionInProgress(false);
  };

  const handleStatusChange = useCallback(async (taskId: string, newStatus: "to-do" | "completed" | "skipped" | "archived") => {
    await updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  const handleRenameSection = async () => {
    if (editingSectionId && editingSectionName.trim()) {
      await updateSection(editingSectionId, editingSectionName.trim());
      setEditingSectionId(null);
      setNewEditingSectionName('');
    }
  };

  const handleEditSectionClick = (currentSection: TaskSection) => {
    setEditingSectionId(currentSection.id);
    setNewEditingSectionName(currentSection.name);
  };

  const handleCancelSectionEdit = () => {
    setEditingSectionId(null);
    setNewEditingSectionName('');
  };

  const handleDeleteSectionClick = (sectionId: string) => {
    setSectionToDeleteId(sectionId);
    setShowConfirmDeleteSectionDialog(true);
  };

  const confirmDeleteSection = async () => {
    if (sectionToDeleteId) {
      await deleteSection(sectionToDeleteId);
      setSectionToDeleteId(null);
      setShowConfirmDeleteSectionDialog(false);
    }
  };

  const handleAddSection = async () => {
    if (newSectionName.trim()) {
      await createSection(newSectionName.trim());
      setNewSectionName('');
      setIsAddSectionOpen(false);
    }
  };

  const handleAddTaskToSpecificSection = (sectionId: string | null) => {
    setSectionToPreselect(sectionId);
    setIsAddTaskForm(true);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeSection = activeId ? sections.find(s => s.id === activeId) : null;

  return (
    <>
      <div className="flex-1 flex flex-col">
        <main className="flex-grow">
          <Card className="w-full shadow-lg p-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="h-7 w-7" /> Your Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                />

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <Button onClick={() => handleAddTaskToSpecificSection(null)} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                  </Button>
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
                          <Button onClick={handleAddSection} disabled={!newSectionName.trim()}>Add Section</Button>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <DailyStreak tasks={focusModeTasksForDailyStreak} currentDate={currentDate} />
                <SmartSuggestions tasks={filteredTasks} currentDate={currentDate} setCurrentDate={setCurrentDate} bulkUpdateTasks={bulkUpdateTasks} clearSelectedTasks={clearSelectedTasks} />
              </div>

              <BulkActions
                selectedTaskIds={selectedTaskIds}
                onAction={handleBulkAction}
                onClearSelection={clearSelectedTasks}
              />

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
                  <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {sections.map((currentSection: TaskSection) => {
                      const isExpanded = expandedSections[currentSection.id] !== false;
                      const sectionTasks = tasksBySection[currentSection.id] || [];
                      
                      return (
                        <div key={currentSection.id} className="mb-3">
                          <SortableSectionHeader
                            section={currentSection}
                            sectionTasksCount={sectionTasks.length}
                            isExpanded={isExpanded}
                            toggleSection={toggleSection}
                            editingSectionId={editingSectionId}
                            editingSectionName={editingSectionName}
                            setNewEditingSectionName={setNewEditingSectionName}
                            handleRenameSection={handleRenameSection}
                            handleCancelSectionEdit={handleCancelSectionEdit}
                            handleEditSectionClick={handleEditSectionClick}
                            handleAddTaskToSpecificSection={handleAddTaskToSpecificSection}
                            markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                            handleDeleteSectionClick={handleDeleteSectionClick}
                            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                          />
                          {isExpanded && (
                            <div className="mt-2 space-y-2 pl-2">
                              <SortableContext items={sectionTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <ul className="list-none space-y-2">
                                  {sectionTasks.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4 flex flex-col items-center gap-2" id={`empty-section-${currentSection.id}`} data-no-dnd="true">
                                      <ListTodo className="h-8 w-8 text-muted-foreground" />
                                      <p className="text-lg font-medium">No tasks in this section.</p>
                                      <p className="text-sm">Drag a task here or add one using the menu above!</p>
                                    </div>
                                  ) : (
                                    sectionTasks.map(task => (
                                      <SortableTaskItem
                                        key={`${task.id}-${task.order}`}
                                        task={task}
                                        userId={userId}
                                        onStatusChange={handleStatusChange}
                                        onDelete={deleteTask}
                                        onUpdate={updateTask}
                                        isSelected={selectedTaskIds.includes(task.id)}
                                        onToggleSelect={toggleTaskSelection}
                                        sections={sections}
                                        onEditTask={handleEditTask}
                                        currentDate={currentDate}
                                        onMoveUp={(taskId) => moveTask(taskId, 'up')}
                                        onMoveDown={(taskId) => moveTask(taskId, 'down')}
                                        onSetAsFocusTask={onSetAsFocusTask} // Pass new prop
                                        manualFocusTaskId={manualFocusTaskId} // Pass new prop
                                        onClearManualFocus={onClearManualFocus} // Pass new prop
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

                  {tasksBySection['no-section'].length > 0 && (
                    <div className="mb-3">
                      <div className="rounded-lg bg-muted dark:bg-gray-700 text-foreground shadow-sm">
                        <div className="flex items-center justify-between p-2">
                          <h3 className="text-xl font-semibold flex items-center gap-2">
                            <span>No Section</span> ({tasksBySection['no-section'].length})
                          </h3>
                        </div>
                      </div>
                      <div className="mt-2 space-y-2 pl-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-center gap-2 mb-2"
                          onClick={() => handleAddTaskToSpecificSection(null)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Task to No Section
                        </Button>
                        <SortableContext items={tasksBySection['no-section'].map(t => t.id)} strategy={verticalListSortingStrategy}>
                          <ul className="list-none space-y-2">
                            {tasksBySection['no-section'].map(task => (
                              <SortableTaskItem
                                key={`${task.id}-${task.order}`}
                                task={task}
                                userId={userId}
                                onStatusChange={handleStatusChange}
                                onDelete={deleteTask}
                                onUpdate={updateTask}
                                isSelected={selectedTaskIds.includes(task.id)}
                                onToggleSelect={toggleTaskSelection}
                                sections={sections}
                                onEditTask={handleEditTask}
                                currentDate={currentDate}
                                onMoveUp={(taskId) => moveTask(taskId, 'up')}
                                onMoveDown={(taskId) => moveTask(taskId, 'down')}
                                onSetAsFocusTask={onSetAsFocusTask} // Pass new prop
                                manualFocusTaskId={manualFocusTaskId} // Pass new prop
                                onClearManualFocus={onClearManualFocus} // Pass new prop
                              />
                            ))}
                          </ul>
                        </SortableContext>
                        <div id="no-section-drop-area" className="h-10 border border-dashed border-muted-foreground/50 rounded-md flex items-center justify-center text-sm text-muted-foreground" data-no-dnd="true">
                          Drop tasks here for 'No Section'
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredTasks.length === 0 && !loading && (
                    <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                      <ListTodo className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-xl font-medium mb-2">No tasks found for this day with the current filters.</p>
                      <p className="text-sm">Try adjusting your filters or add a new task!</p>
                      <Button onClick={() => handleAddTaskToSpecificSection(null)} className="mt-4">
                        <Plus className="mr-2 h-4 w-4" /> Add Your First Task
                      </Button>
                    </div>
                  )}

                  {createPortal(
                    <DragOverlay>
                      {activeTask && (
                        <SortableTaskItem
                          key={`${activeTask.id}-${activeTask.order}`}
                          task={activeTask}
                          userId={userId}
                          onStatusChange={handleStatusChange}
                          onDelete={deleteTask}
                          onUpdate={updateTask}
                          isSelected={false}
                          onToggleSelect={() => {}}
                          sections={sections}
                          onEditTask={handleEditTask}
                          currentDate={currentDate}
                          onMoveUp={(taskId) => moveTask(taskId, 'up')}
                          onMoveDown={(taskId) => moveTask(taskId, 'down')}
                          onSetAsFocusTask={onSetAsFocusTask} // Pass new prop
                          manualFocusTaskId={manualFocusTaskId} // Pass new prop
                          onClearManualFocus={onClearManualFocus} // Pass new prop
                        />
                      )}
                      {activeSection && (
                        <SortableSectionHeader
                          section={activeSection}
                          sectionTasksCount={tasksBySection[activeSection.id]?.length || 0}
                          isExpanded={expandedSections[activeSection.id] !== false}
                          toggleSection={toggleSection}
                          editingSectionId={editingSectionId}
                          editingSectionName={editingSectionName}
                          setNewEditingSectionName={setNewEditingSectionName}
                          handleRenameSection={handleRenameSection}
                          handleCancelSectionEdit={handleCancelSectionEdit}
                          handleEditSectionClick={handleEditSectionClick}
                          handleAddTaskToSpecificSection={handleAddTaskToSpecificSection}
                          markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
                          handleDeleteSectionClick={handleDeleteSectionClick}
                          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                        />
                      )}
                    </DragOverlay>,
                    document.body
                  )}
                </DndContext>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={isAddTaskFormOpen} onOpenChange={setIsAddTaskForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm
            onAddTask={handleAddTaskSubmit}
            userId={userId}
            onTaskAdded={() => {
              setIsAddTaskForm(false);
              setIsAddTaskOpen(false);
            }}
            sections={sections}
            allCategories={allCategories}
            preselectedSectionId={sectionToPreselect}
          />
        </DialogContent>
      </Dialog>

      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={userId}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetail(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onSetAsFocusTask={onSetAsFocusTask} // Pass new prop
          onClearManualFocus={onClearManualFocus} // Pass new prop
        />
      )}

      <AlertDialog open={showConfirmBulkDeleteDialog} onOpenChange={setShowConfirmBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} selected tasks` : 'this section'}.
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
            <AlertDialogAction onClick={confirmDeleteSection}>Continue</AlertDialogAction>
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