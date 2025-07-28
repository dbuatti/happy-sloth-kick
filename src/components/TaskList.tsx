import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, CheckCircle2, ListTodo } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import SortableTaskItem from './SortableTaskItem';
import BulkActions from './BulkActions';
import AddTaskForm from './AddTaskForm';
import DailyStreak from './DailyStreak';
import SmartSuggestions from './SmartSuggestions';
import { DndContext, DragEndEvent, UniqueIdentifier, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableSectionHeader from './SortableSectionHeader';
import { Task, TaskSection } from '@/hooks/useTasks';
import TaskDetailDialog from './TaskDetailDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DragHandlePointerSensor } from '@/lib/DragHandlePointerSensor'; // Import the new sensor
import TaskFilter from './TaskFilter';
import { Skeleton } from '@/components/ui/skeleton';
import ManageSectionsDialog from './ManageSectionsDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from "@/components/ui/label"; // Import Label
import { Input } from "@/components/ui/input"; // Import Input

interface TaskListProps {
  setIsAddTaskOpen: (open: boolean) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const TaskList: React.FC<TaskListProps> = ({ setIsAddTaskOpen, currentDate, setCurrentDate }) => {
  const {
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
    allCategories,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
  } = useTasks({ currentDate, setCurrentDate });

  console.log('TaskList: Received filteredTasks:', filteredTasks.map(t => ({
    id: t.id,
    description: t.description,
    status: t.status,
    created_at: t.created_at,
    original_task_id: t.original_task_id,
    recurring_type: t.recurring_type
  })));

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

  const sensors = useSensors(
    useSensor(DragHandlePointerSensor), // Use the new sensor here
    useSensor(KeyboardSensor, {
      coordinateGetter: (event) => {
        return null;
      },
    })
  );

  const tasksBySection = useMemo(() => {
    const grouped: Record<string, Task[]> = { 'no-section': [] };
    
    sections.forEach((currentSection: TaskSection) => {
      grouped[currentSection.id] = [];
    });

    filteredTasks.forEach(task => {
      const sectionId = task.section_id;
      if (sectionId && grouped[sectionId] !== undefined) {
        grouped[sectionId].push(task);
      } else {
        grouped['no-section'].push(task);
      }
    });

    return grouped;
  }, [filteredTasks, sections]);

  // Filter tasks specifically for DailyStreak to only include focus-mode relevant tasks
  const focusModeTasksForDailyStreak = useMemo(() => {
    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
    return filteredTasks.filter(task => 
      task.section_id === null || focusModeSectionIds.has(task.section_id)
    );
  }, [filteredTasks, sections]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (active.data.current?.type === 'section-header' && over.data.current?.type === 'section-header') {
      const oldIndex = sections.findIndex(s => s.id === activeId);
      const newIndex = sections.findIndex(s => s.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderSections(oldIndex, newIndex);
      }
      return;
    }

    if (activeId.startsWith('task-') && overId.startsWith('task-') && active.data.current?.sectionId === over.data.current?.sectionId) {
      const sectionId = active.data.current?.sectionId;
      const tasksInSection = tasksBySection[sectionId || 'no-section'];
      const oldIndex = tasksInSection.findIndex(t => t.id === activeId);
      const newIndex = tasksInSection.findIndex(t => t.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderTasksInSameSection(sectionId, oldIndex, newIndex);
      }
      return;
    }

    if (activeId.startsWith('task-') && over.data.current?.type === 'section-header') {
      const taskId = activeId;
      const sourceSectionId = active.data.current?.sectionId;
      const destinationSectionId = overId;
      const destinationTasks = tasksBySection[destinationSectionId] || [];
      const destinationIndex = 0;
      
      moveTaskToNewSection(taskId, sourceSectionId, destinationSectionId, destinationIndex);
    }
  }, [tasksBySection, sections, reorderSections, reorderTasksInSameSection, moveTaskToNewSection]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newState = {
        ...prev,
        [sectionId]: !prev[sectionId]
      };
      try {
        localStorage.setItem('taskList_expandedSections', JSON.stringify(newState));
      } catch (e) {
        console.error('Error loading expanded sections from localStorage:', e);
      }
      return newState;
    });
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

  return (
    <>
      <div className="flex-1 flex flex-col">
        <main className="flex-grow">
          <Card className="w-full shadow-lg p-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="h-7 w-7" /> Your Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Top Section: Filters and Action Buttons */}
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

              {/* Daily Streak and Smart Suggestions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <DailyStreak tasks={focusModeTasksForDailyStreak} currentDate={currentDate} />
                <SmartSuggestions currentDate={currentDate} setCurrentDate={setCurrentDate} />
              </div>

              {/* Bulk Actions Bar */}
              <BulkActions
                selectedTaskIds={selectedTaskIds}
                onAction={handleBulkAction}
                onClearSelection={clearSelectedTasks}
              />

              {/* Task Sections and List */}
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
                  <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {sections.map((currentSection: TaskSection) => {
                      const isExpanded = expandedSections[currentSection.id] !== false;
                      const sectionTasks = tasksBySection[currentSection.id] || [];
                      
                      return (
                        <div key={currentSection.id} className="mb-3">
                          <SortableSectionHeader
                            id={currentSection.id}
                            name={currentSection.name}
                            taskCount={sectionTasks.length}
                            isExpanded={isExpanded}
                            onToggleExpand={() => toggleSection(currentSection.id)}
                            isEditing={editingSectionId === currentSection.id}
                            editingName={editingSectionName}
                            onNameChange={setNewEditingSectionName}
                            onSaveEdit={() => handleRenameSection()}
                            onCancelEdit={handleCancelSectionEdit}
                            onEditClick={() => handleEditSectionClick(currentSection)}
                            onDeleteClick={handleDeleteSectionClick}
                            includeInFocusMode={currentSection.include_in_focus_mode}
                            onToggleIncludeInFocusMode={(checked) => updateSectionIncludeInFocusMode(currentSection.id, checked)}
                            onAddTaskToSection={handleAddTaskToSpecificSection}
                            onMarkAllCompleted={markAllTasksInSectionCompleted}
                          />
                          {isExpanded && (
                            <div className="mt-1 space-y-1 pl-2">
                              <SortableContext items={sectionTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <ul className="list-none space-y-2">
                                  {sectionTasks.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4 flex flex-col items-center gap-2">
                                      <ListTodo className="h-8 w-8 text-muted-foreground" />
                                      <p className="text-lg font-medium">No tasks in this section.</p>
                                      <p className="text-sm">Add one using the menu above or drag a task here!</p>
                                    </div>
                                  ) : (
                                    sectionTasks.map(task => (
                                      <SortableTaskItem
                                        key={task.id}
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
                                key={task.id}
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
                              />
                            ))}
                          </ul>
                        </SortableContext>
                      </div>
                    </div>
                  )}

                  {filteredTasks.length === 0 && !loading && (
                    <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                      <ListTodo className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-xl font-medium mb-2">No tasks found for this day with the current filters.</p>
                      <p className="text-md">Try adjusting your filters or add a new task!</p>
                      <Button onClick={() => handleAddTaskToSpecificSection(null)} className="mt-4">
                        <Plus className="mr-2 h-4 w-4" /> Add Your First Task
                      </Button>
                    </div>
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
            <AlertDialogCancel disabled={isBulkActionInProgress}>Cancel</AlertDialogCancel>
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

      {/* New Manage Sections Dialog */}
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