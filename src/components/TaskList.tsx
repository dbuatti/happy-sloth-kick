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
import { DndContext, DragEndEvent, UniqueIdentifier, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableSectionHeader from './SortableSectionHeader';
import { Task, TaskSection } from '@/hooks/useTasks';
import TaskDetailDialog from './TaskDetailDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface TaskListProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

const TaskList: React.FC<TaskListProps> = ({ setIsAddTaskOpen }) => {
  const {
    filteredTasks,
    loading,
    currentDate,
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
    reorderTasksInSameSection,
    moveTaskToNewSection,
    reorderSections,
  } = useTasks();

  const [isAddTaskFormOpen, setIsAddTaskForm] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetail] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setNewEditingSectionName] = useState('');

  // Configure Dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Allow a small drag distance before activating
      },
      // Prevent drag from starting on elements with data-no-dnd="true"
      shouldHandleEvent: ({ event: pointerEvent }) => {
        const target = pointerEvent.target as HTMLElement;
        if (target.closest('[data-no-dnd="true"]')) {
          return false;
        }
        return true;
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event) => {
        return null;
      },
    })
  );

  // Group tasks by section
  const tasksBySection = useMemo(() => {
    const grouped: Record<string, Task[]> = { 'no-section': [] };
    
    // Initialize groups for all sections
    sections.forEach((currentSection: TaskSection) => {
      grouped[currentSection.id] = [];
    });

    // Group tasks
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

  // Handle drag end for tasks
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Handle section reordering
    if (active.data.current?.type === 'section-header' && over.data.current?.type === 'section-header') {
      const oldIndex = sections.findIndex(s => s.id === activeId);
      const newIndex = sections.findIndex(s => s.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderSections(oldIndex, newIndex);
      }
      return;
    }

    // Handle task reordering within the same section
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

    // Handle task moving between sections
    if (activeId.startsWith('task-') && over.data.current?.type === 'section-header') {
      const taskId = activeId;
      const sourceSectionId = active.data.current?.sectionId;
      const destinationSectionId = overId;
      const destinationTasks = tasksBySection[destinationSectionId] || [];
      const destinationIndex = 0; // Place at the top of the destination section
      
      moveTaskToNewSection(taskId, sourceSectionId, destinationSectionId, destinationIndex);
    }
  }, [tasksBySection, sections, reorderSections, reorderTasksInSameSection, moveTaskToNewSection]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
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

  // Create a wrapper function that converts status string to update object
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

  const handleAddSection = async () => {
    if (newSectionName.trim()) {
      await createSection(newSectionName.trim());
      setNewSectionName('');
      setIsAddSectionOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-6 flex justify-center">
          <Card className="w-full shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">Loading Tasks...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setIsAddTaskForm(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Task
                </Button>
              </div>

              <DailyStreak tasks={filteredTasks} currentDate={currentDate} />
              <SmartSuggestions />

              <BulkActions
                selectedTaskIds={selectedTaskIds}
                onAction={handleBulkAction}
                onClearSelection={clearSelectedTasks}
              />

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
                        />
                        {isExpanded && (
                          <div className="mt-2 space-y-2 pl-2">
                            <SortableContext items={sectionTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                              <ul className="list-none space-y-2">
                                {sectionTasks.length === 0 ? (
                                  <div className="text-center text-gray-500 py-4">
                                    No tasks in this section
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
                            />
                          ))}
                        </ul>
                      </SortableContext>
                    </div>
                  </div>
                )}
              </DndContext>
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
    </>
  );
};

export default TaskList;