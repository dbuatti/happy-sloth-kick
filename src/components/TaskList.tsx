import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { useTasks } from "@/hooks/useTasks";
import TaskFilter from "./TaskFilter";
import AddTaskForm from "./AddTaskForm";
import TaskItem from "./TaskItem";
import DateNavigator from "./DateNavigator";
import BulkActions from "./BulkActions";
import useKeyboardShortcuts, { ShortcutMap } from "@/hooks/useKeyboardShortcuts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Settings, Plus, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

// Import the new SortableTaskItem component
import SortableTaskItem from './SortableTaskItem';
import SortableSectionHeader from './SortableSectionHeader';
import DailyStreak from './DailyStreak';
import SmartSuggestions from './SmartSuggestions';
import TaskDetailDialog from './TaskDetailDialog';
import { Task, TaskSection } from '@/hooks/useTasks';

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

interface NewTaskData {
  description: string;
  status?: 'to-do' | 'completed' | 'skipped' | 'archiverd';
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  category?: string;
  priority?: string;
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
}

interface TaskListProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

const TaskList: React.FC<TaskListProps> = ({ setIsAddTaskOpen }) => {
  const {
    tasks,
    filteredTasks,
    loading,
    currentDate,
    setCurrentDate,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    sections,
    createSection,
    updateSection,
    deleteSection,
    reorderTasksInSameSection,
    moveTaskToNewSection,
    reorderSections,
  } = useTasks();

  const isMobile = useIsMobile();

  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [isReassignTasksDialogOpen, setIsReassignTasksDialogOpen] = useState(false);
  const [sectionToDeleteId, setSectionToDeleteId] = useState<string | null>(null);
  const [targetReassignSectionId, setTargetReassignSectionId] = useState<string | null>(null);

  // State for TaskDetailDialog
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // State for expanded/collapsed sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // AlertDialog state for bulk delete
  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);


  // Load expanded sections from local storage on mount
  useEffect(() => {
    try {
      const storedExpandedSections = localStorage.getItem('expandedSections');
      if (storedExpandedSections) {
        setExpandedSections(JSON.parse(storedExpandedSections));
      }
    } catch (error) {
      console.error("Failed to parse expanded sections from local storage:", error);
      // Fallback to default if parsing fails
      setExpandedSections({});
    }
  }, []);

  // Update local storage when expanded sections change
  useEffect(() => {
    localStorage.setItem('expandedSections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  // Ensure new sections are expanded by default
  useEffect(() => {
    if (sections.length > 0) {
      setExpandedSections(prev => {
        const newExpansions = { ...prev };
        sections.forEach(section => {
          if (newExpansions[section.id] === undefined) {
            newExpansions[section.id] = true; // Default new sections to expanded
          }
        });
        return newExpansions;
      });
    }
  }, [sections]);

  const handleToggleSectionExpand = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Added activationConstraint
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)));
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'to-do' | 'completed' | 'skipped' | 'archived') => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleSortChange = (value: string) => {
    const [key, direction] = value.split('_');
    setSortKey(key as 'priority' | 'due_date' | 'created_at' | 'order');
    setSortDirection(direction as 'asc' | 'desc');
  };

  const handleCreateSection = async () => {
    if (newSectionName.trim()) {
      await createSection(newSectionName);
      setNewSectionName('');
    } else {
      showError('Section name cannot be empty.');
    }
  };

  const handleRenameSection = async (sectionId: string) => {
    if (!editingSectionName.trim()) {
      showError('Section name cannot be empty.');
      return;
    }
    await updateSection(sectionId, editingSectionName);
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  const confirmDeleteSection = async (sectionId: string) => {
    if (sections.length === 1 && sections[0].id === sectionId) {
      showError("Cannot delete the last section. Please create another section first or delete all tasks in this section.");
      return;
    }

    const { data: tasksInSection, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('section_id', sectionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking tasks in section:', error);
      showError('Failed to check tasks in section.');
      return;
    }

    if (tasksInSection && tasksInSection.length > 0) {
      setSectionToDeleteId(sectionId);
      const otherSections = sections.filter(s => s.id !== sectionId);
      if (otherSections.length > 0) {
        setTargetReassignSectionId(otherSections[0].id);
      } else {
        setTargetReassignSectionId(null);
      }
      setIsReassignTasksDialogOpen(true);
    } else {
      // If no tasks, directly confirm deletion with AlertDialog
      setSectionToDeleteId(sectionId); // Set for the AlertDialog
      setShowConfirmBulkDeleteDialog(true); // Reuse this dialog for simple section delete
    }
  };

  const handleReassignAndDeleteSection = async () => {
    if (sectionToDeleteId && targetReassignSectionId) {
      await deleteSection(sectionToDeleteId, targetReassignSectionId);
      setIsReassignTasksDialogOpen(false);
      setSectionToDeleteId(null);
      setTargetReassignSectionId(null);
    } else {
      showError('Please select a section to move tasks to.');
    }
  };

  const handleBulkAction = async (action: string) => {
    let updates: TaskUpdate = {};
    if (action === 'complete') {
      updates = { status: 'completed' };
      await bulkUpdateTasks(updates);
    } else if (action === 'archive') {
      updates = { status: 'archived' };
      await bulkUpdateTasks(updates);
    } else if (action === 'skip') {
      updates = { status: 'skipped' };
      await bulkUpdateTasks(updates);
    } else if (action === 'todo') {
      updates = { status: 'to-do' };
      await bulkUpdateTasks(updates);
    } else if (action.startsWith('priority-')) {
      updates = { priority: action.split('-')[1] };
      await bulkUpdateTasks(updates);
    } else if (action === 'delete') {
      setShowConfirmBulkDeleteDialog(true); // Open confirmation dialog
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedTaskIds.length > 0) {
      for (const taskId of selectedTaskIds) {
        await deleteTask(taskId);
      }
      clearSelectedTasks();
    } else if (sectionToDeleteId) { // This path is for deleting an empty section
      await deleteSection(sectionToDeleteId, null);
      setSectionToDeleteId(null);
    }
    setShowConfirmBulkDeleteDialog(false);
  };

  const tasksGroupedBySection = useMemo(() => {
    const grouped: { [key: string]: { parentTasks: Task[]; subtasks: Task[] } } = {};
    const allSectionIds = new Set<string>();

    // Initialize groups for existing sections
    sections.forEach(section => {
      grouped[section.id] = { parentTasks: [], subtasks: [] };
      allSectionIds.add(section.id);
    });

    // Populate groups with filtered tasks
    filteredTasks.forEach(task => {
      const targetSectionId = task.section_id || 'no-section';
      if (!grouped[targetSectionId]) {
        grouped[targetSectionId] = { parentTasks: [], subtasks: [] };
        allSectionIds.add(targetSectionId); // Add 'no-section' if it exists
      }

      if (task.parent_task_id) {
        grouped[targetSectionId].subtasks.push(task);
      } else {
        grouped[targetSectionId].parentTasks.push(task);
      }
    });

    // Sort parent tasks within each group
    Object.keys(grouped).forEach(sectionId => {
      grouped[sectionId].parentTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    // Create the final list of sections to render, including 'no-section' if applicable
    const sectionsToRender: (TaskSection & { parentTasks: Task[]; subtasks: Task[] })[] = [];

    // Add actual sections first, maintaining their order
    sections.forEach(section => {
      // Only include actual sections if they have tasks or were explicitly created
      if (grouped[section.id] && (grouped[section.id].parentTasks.length > 0 || grouped[section.id].subtasks.length > 0)) {
        sectionsToRender.push({
          ...section,
          parentTasks: grouped[section.id].parentTasks,
          subtasks: grouped[section.id].subtasks,
        });
      }
    });

    // Add "No Section" at the end if it contains tasks
    if (grouped['no-section'] && (grouped['no-section'].parentTasks.length > 0 || grouped['no-section'].subtasks.length > 0)) {
      sectionsToRender.push({
        id: 'no-section',
        name: 'No Section',
        user_id: userId || '', // Placeholder, not persisted
        order: Infinity, // Always at the end
        parentTasks: grouped['no-section'].parentTasks,
        subtasks: grouped['no-section'].subtasks,
      });
    }
    return sectionsToRender;
  }, [filteredTasks, sections, userId]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    const isDraggingSection = active.data.current?.type === 'section-header';
    const isDraggingTask = active.data.current?.type === 'task';

    if (isDraggingSection) {
      const oldIndex = sections.findIndex(section => section.id === activeId);
      const newIndex = sections.findIndex(section => section.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        await reorderSections(oldIndex, newIndex);
      }
    } else if (isDraggingTask) {
      const draggedTask = tasks.find(task => task.id === activeId);
      if (!draggedTask || draggedTask.parent_task_id) { // Prevent dragging subtasks for now
        setActiveId(null);
        return;
      }

      let sourceSectionId: string | null = draggedTask.section_id;
      let destinationSectionId: string | null = null;
      let destinationIndex = -1;

      if (over.data.current?.type === 'task') {
        const overTask = tasks.find(task => task.id === overId);
        if (overTask && overTask.parent_task_id === null) { // Only drop onto top-level tasks
          destinationSectionId = overTask.section_id;
          const overSectionParentTasks = tasksGroupedBySection.find(sg => sg.id === destinationSectionId)?.parentTasks || [];
          destinationIndex = overSectionParentTasks.findIndex(task => task.id === overId);
        } else if (overTask && overTask.parent_task_id !== null) { // Dropped onto a subtask, find its parent
          const parentOfOverTask = tasks.find(t => t.id === overTask.parent_task_id);
          if (parentOfOverTask) {
            destinationSectionId = parentOfOverTask.section_id;
            const overSectionParentTasks = tasksGroupedBySection.find(sg => sg.id === destinationSectionId)?.parentTasks || [];
            destinationIndex = overSectionParentTasks.findIndex(task => task.id === parentOfOverTask.id);
            // If dropping onto a subtask, we want to place it after the parent task
            if (destinationIndex !== -1) destinationIndex++;
          }
        }
      }
      else if (over.data.current?.type === 'section-header') {
        destinationSectionId = overId;
        destinationIndex = tasksGroupedBySection.find(sg => sg.id === overId)?.parentTasks.length || 0;
      } else {
        setActiveId(null);
        return;
      }

      if (sourceSectionId === destinationSectionId) {
        const sourceSectionParentTasks = tasksGroupedBySection.find(sg => sg.id === sourceSectionId)?.parentTasks || [];
        const sourceIndex = sourceSectionParentTasks.findIndex(task => task.id === activeId);

        if (sourceIndex !== -1 && destinationIndex !== -1 && sourceIndex !== destinationIndex) {
          await reorderTasksInSameSection(sourceSectionId, sourceIndex, destinationIndex);
        }
      } else {
        if (sourceSectionId !== null && destinationSectionId !== null) {
          await moveTaskToNewSection(activeId, sourceSectionId, destinationSectionId, destinationIndex);
        }
      }
    }
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeSection = activeId ? sections.find(s => s.id === activeId) : null;

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    'f': (e) => {
      const searchInput = document.querySelector('input[placeholder="Search tasks..."]');
      if (searchInput) {
        (searchInput as HTMLInputElement).focus();
      }
    },
  };
  useKeyboardShortcuts(shortcuts);

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Daily Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">Daily Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <DateNavigator
          currentDate={currentDate}
          onPreviousDay={handlePreviousDay}
          onNextDay={handleNextDay}
        />

        {/* Daily Streak Component */}
        <div className="mb-6">
          <DailyStreak tasks={tasks} currentDate={currentDate} />
        </div>

        {/* Smart Suggestions Component */}
        <SmartSuggestions />

        {/* Floating Action Button for Add Task - RE-INTRODUCED */}
        <Button
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50 md:bottom-8 md:right-8"
          aria-label="Add new task"
          onClick={() => setIsAddTaskOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>

        <TaskFilter />

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Tasks</h2>
          <div className="flex items-center space-x-2">
            <Select value={`${sortKey}_${sortDirection}`} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order_asc">Custom Order</SelectItem>
                <SelectItem value="priority_desc">Priority (High to Low)</SelectItem>
                <SelectItem value="priority_asc">Priority (Low to High)</SelectItem>
                <SelectItem value="due_date_asc">Due Date (Soonest)</SelectItem>
                <SelectItem value="due_date_desc">Due Date (Latest)</SelectItem>
                <SelectItem value="created_at_desc">Created At (Newest)</SelectItem>
                <SelectItem value="created_at_asc">Created At (Oldest)</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isManageSectionsOpen} onOpenChange={setIsManageSectionsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Manage Sections">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Task Sections</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="new-section-name">New Section Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="new-section-name"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="e.g., Work, Personal"
                        autoFocus // Added autoFocus
                      />
                      <Button onClick={handleCreateSection} disabled={!newSectionName.trim()}>
                        <Plus className="h-4 w-4 mr-2" /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Existing Sections</h3>
                    {sections.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sections created yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {sections.map(sectionGroup => (
                          <li key={sectionGroup.id} className="flex items-center justify-between p-2 border rounded-md">
                            {editingSectionId === sectionGroup.id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <Input
                                  value={editingSectionName}
                                  onChange={(e) => setNewSectionName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSection(sectionGroup.id)}
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleRenameSection(sectionGroup.id)} disabled={!editingSectionName.trim()}>Save</Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingSectionId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <span className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                {sectionGroup.name}
                              </span>
                            )}

                            <div className="flex space-x-1">
                              {editingSectionId !== sectionGroup.id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setEditingSectionId(sectionGroup.id);
                                      setEditingSectionName(sectionGroup.name);
                                    }}
                                    aria-label={`Rename section ${sectionGroup.name}`}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => confirmDeleteSection(sectionGroup.id)}
                                    aria-label={`Delete section ${sectionGroup.name}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isReassignTasksDialogOpen} onOpenChange={setIsReassignTasksDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reassign Tasks Before Deleting Section</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p>This section contains tasks. To delete it, you must reassign these tasks to another section.</p>
                  <div>
                    <Label htmlFor="reassign-section">Move tasks to:</Label>
                    <Select value={targetReassignSectionId || ''} onValueChange={setTargetReassignSectionId}>
                      <SelectTrigger id="reassign-section">
                        <SelectValue placeholder="Select a section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.filter(s => s.id !== sectionToDeleteId).length === 0 ? (
                          <SelectItem value="" disabled>No other sections available</SelectItem>
                        ) : (
                          sections.filter(s => s.id !== sectionToDeleteId).map(section => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReassignTasksDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleReassignAndDeleteSection} disabled={!targetReassignSectionId}>
                    Move and Delete Section
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {sections.length === 0 && filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 p-8 flex flex-col items-center justify-center">
            <PlusCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg mb-2">No sections or tasks found!</p>
            <p>Start by creating your first section using the "Manage Sections" button above, then add your tasks.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {tasksGroupedBySection.map(sectionGroup => (
                  <div key={sectionGroup.id} className="space-y-3">
                    <SortableSectionHeader
                      id={sectionGroup.id}
                      name={sectionGroup.name}
                      taskCount={sectionGroup.parentTasks.length + sectionGroup.subtasks.length}
                      isExpanded={expandedSections[sectionGroup.id] ?? true}
                      onToggleExpand={() => handleToggleSectionExpand(sectionGroup.id)}
                    />
                    {(expandedSections[sectionGroup.id] ?? true) && (
                      <SortableContext
                        items={sectionGroup.parentTasks.map(task => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <ul className="space-y-3">
                          {sectionGroup.parentTasks.map((task) => (
                            <React.Fragment key={task.id}>
                              <SortableTaskItem
                                task={task}
                                userId={userId}
                                onStatusChange={handleTaskStatusChange}
                                onDelete={deleteTask}
                                onUpdate={updateTask}
                                isSelected={selectedTaskIds.includes(task.id)}
                                onToggleSelect={toggleTaskSelection}
                                sections={sections}
                                onEditTask={handleEditTask}
                              />
                              {/* Render subtasks if they exist for this parent task */}
                              {sectionGroup.subtasks
                                .filter(sub => sub.parent_task_id === task.id)
                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                .map(subtask => (
                                  <li key={subtask.id} className="ml-8 border rounded-lg p-3 bg-card dark:bg-gray-800 shadow-sm flex items-center space-x-3">
                                    <Checkbox
                                      checked={subtask.status === 'completed'}
                                      onCheckedChange={(checked) => {
                                        if (typeof checked === 'boolean') {
                                          updateTask(subtask.id, { status: checked ? 'completed' : 'to-do' });
                                        }
                                      }}
                                      id={`subtask-${subtask.id}`}
                                      className="flex-shrink-0"
                                    />
                                    <label
                                      htmlFor={`subtask-${subtask.id}`}
                                      className={cn(
                                        "flex-1 text-sm font-medium leading-tight",
                                        subtask.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-foreground',
                                        "block truncate"
                                      )}
                                    >
                                      {subtask.description}
                                    </label>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTask(subtask)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </li>
                                ))}
                            </React.Fragment>
                          ))}
                        </ul>
                      </SortableContext>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeTask ? (
                <SortableTaskItem
                  task={activeTask}
                  userId={userId}
                  onStatusChange={handleTaskStatusChange}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                  isSelected={selectedTaskIds.includes(activeTask.id)}
                  onToggleSelect={toggleTaskSelection}
                  sections={sections}
                  onEditTask={handleEditTask}
                />
              ) : activeSection ? (
                <SortableSectionHeader
                  id={activeSection.id}
                  name={activeSection.name}
                  taskCount={tasksGroupedBySection.find(s => s.id === activeSection.id)?.parentTasks.length || 0}
                  isExpanded={expandedSections[activeSection.id] ?? true}
                  onToggleExpand={() => {}}
                />
              ) : null}
            </DragOverlay>

            <BulkActions
              selectedTaskIds={selectedTaskIds}
              onAction={handleBulkAction}
              onClearSelection={clearSelectedTasks}
            />
          </DndContext>
        )}
      </CardContent>
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={userId}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
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
    </Card>
  );
};

export default TaskList;