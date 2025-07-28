import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Settings, CheckCircle2, Archive, Trash2, ListRestart, ChevronDown, ChevronUp } from 'lucide-react';
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
import { CustomPointerSensor } from '@/lib/CustomPointerSensor';
import TaskFilter from './TaskFilter';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

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
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode, // Destructure new function
    reorderTasksInSameSection,
    moveTaskToNewSection,
    reorderSections,
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
  const [isTaskDetailOpen, setIsTaskDetail] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  // Load expanded state from localStorage, default to an empty object
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

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setNewEditingSectionName] = useState('');
  const [showConfirmDeleteSectionDialog, setShowConfirmDeleteSectionDialog] = useState(false);
  const [sectionToDeleteId, setSectionToDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(CustomPointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
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
      // Save the new state to localStorage
      try {
        localStorage.setItem('taskList_expandedSections', JSON.stringify(newState));
      } catch (e) {
        console.error('Error saving expanded sections to localStorage:', e);
      }
      return newState;
    });
  };

  const handleAddTaskSubmit = async (taskData: any) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsAddTaskForm(false);
      setIsAddTaskOpen(false);
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

  const confirmBulkDelete = () => {
    bulkUpdateTasks({ status: 'archived' }, selectedTaskIds);
    clearSelectedTasks();
    setShowConfirmBulkDeleteDialog(false);
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

  return (
    <>
      <div className="flex-1 flex flex-col">
        <main className="flex-grow">
          <Card className="w-full shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="h-7 w-7" /> Your Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <TaskFilter currentDate={currentDate} setCurrentDate={setCurrentDate} />

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="relative flex-1">
                  {/* Search input is now part of TaskFilter, but keeping this div for layout if needed */}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsAddTaskForm(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                  </Button>
                  <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
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
                </div>
              </div>

              <DailyStreak tasks={filteredTasks} currentDate={currentDate} />
              <SmartSuggestions currentDate={currentDate} setCurrentDate={setCurrentDate} />

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
                <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
                  <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {sections.map((currentSection: TaskSection) => {
                      const isExpanded = expandedSections[currentSection.id] !== false;
                      const sectionTasks = tasksBySection[currentSection.id] || [];
                      
                      return (
                        <div key={currentSection.id} className="mb-4">
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
                            includeInFocusMode={currentSection.include_in_focus_mode} // Pass prop
                            onToggleIncludeInFocusMode={(checked) => updateSectionIncludeInFocusMode(currentSection.id, checked)} // Pass handler
                          />
                          {isExpanded && (
                            <div className="mt-2 space-y-2 pl-2">
                              <SortableContext items={sectionTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <ul className="list-none space-y-2">
                                  {sectionTasks.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4">
                                      No tasks in this section. Add one or drag a task here!
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

                  {/* Tasks with no section */}
                  {tasksBySection['no-section'].length > 0 && (
                    <div className="mb-4">
                      <div className="rounded-lg bg-muted dark:bg-gray-700 text-foreground shadow-sm">
                        <div className="flex items-center justify-between p-2">
                          <h3 className="text-xl font-semibold flex items-center gap-2">
                            <span>No Section</span> ({tasksBySection['no-section'].length})
                          </h3>
                        </div>
                      </div>
                      <div className="mt-2 space-y-2 pl-2">
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
                    <div className="text-center text-gray-500 p-8">
                      <p className="text-lg mb-2">No tasks found for this day with the current filters.</p>
                      <p>Try adjusting your filters or add a new task!</p>
                    </div>
                  )}
                </DndContext>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Add Task Dialog */}
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
          />
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showConfirmBulkDeleteDialog} onOpenChange={setShowConfirmBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} selected tasks` : 'this section'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Section Delete Confirmation Dialog */}
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
    </>
  );
};

export default TaskList;