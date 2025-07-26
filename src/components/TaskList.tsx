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
import DailyStreak from './DailyStreak'; // New import for DailyStreak
import SmartSuggestions from './SmartSuggestions'; // Import SmartSuggestions

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
}

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

interface NewTaskData {
  description: string;
  status?: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  category?: string;
  priority?: string;
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
}

interface TaskListProps {
  setIsAddTaskOpen: (open: boolean) => void; // New prop
}

const TaskList: React.FC<TaskListProps> = ({ setIsAddTaskOpen }) => { // Destructure new prop
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

  const sensors = useSensors(
    useSensor(PointerSensor),
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
      if (window.confirm('Are you sure you want to delete this section?')) {
        await deleteSection(sectionId, null);
      }
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
    } else if (action === 'archive') {
      updates = { status: 'archived' };
    } else if (action === 'skip') {
      updates = { status: 'skipped' };
    } else if (action === 'todo') {
      updates = { status: 'to-do' };
    } else if (action.startsWith('priority-')) {
      updates = { priority: action.split('-')[1] };
    } else if (action === 'delete') {
      if (window.confirm(`Are you sure you want to delete ${selectedTaskIds.length} selected tasks?`)) {
        for (const taskId of selectedTaskIds) {
          await deleteTask(taskId);
        }
        clearSelectedTasks();
        return;
      }
    }
    await bulkUpdateTasks(updates);
  };

  const tasksGroupedBySection = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};

    sections.forEach(section => {
      grouped[section.id] = [];
    });

    filteredTasks.forEach(task => {
      if (task.section_id && grouped[task.section_id]) {
        grouped[task.section_id].push(task);
      }
    });

    Object.keys(grouped).forEach(sectionId => {
      grouped[sectionId].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return sections.map(section => ({
      ...section,
      tasks: grouped[section.id] || [],
    }));
  }, [filteredTasks, sections]);

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
      if (!draggedTask) {
        setActiveId(null);
        return;
      }

      let sourceSectionId: string | null = draggedTask.section_id;
      let destinationSectionId: string | null = null;
      let destinationIndex = -1;

      if (over.data.current?.type === 'task') {
        const overTask = tasks.find(task => task.id === overId);
        if (overTask) {
          destinationSectionId = overTask.section_id;
          const overSectionTasks = tasksGroupedBySection.find(sg => sg.id === destinationSectionId)?.tasks || [];
          destinationIndex = overSectionTasks.findIndex(task => task.id === overId);
        }
      }
      else if (over.data.current?.type === 'section-header') {
        destinationSectionId = overId;
        destinationIndex = tasksGroupedBySection.find(sg => sg.id === overId)?.tasks.length || 0;
      } else {
        setActiveId(null);
        return;
      }

      if (sourceSectionId === destinationSectionId) {
        const sourceSectionTasks = tasksGroupedBySection.find(sg => sg.id === sourceSectionId)?.tasks || [];
        const sourceIndex = sourceSectionTasks.findIndex(task => task.id === activeId);

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

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeSection = activeId ? sections.find(s => s.id === activeId) : null;

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
          onClick={() => setIsAddTaskOpen(true)} // Open the Add Task form
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
                      />
                      <Button onClick={handleCreateSection}>
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
                                  onChange={(e) => setEditingSectionName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSection(sectionGroup.id)}
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleRenameSection(sectionGroup.id)}>Save</Button>
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
                      taskCount={sectionGroup.tasks.length}
                    />
                    <SortableContext
                      items={sectionGroup.tasks.map(task => task.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="space-y-3">
                        {sectionGroup.tasks.map((task) => (
                          <SortableTaskItem
                            key={task.id}
                            task={task}
                            userId={userId}
                            onStatusChange={handleTaskStatusChange}
                            onDelete={deleteTask}
                            onUpdate={updateTask}
                            isSelected={selectedTaskIds.includes(task.id)}
                            onToggleSelect={toggleTaskSelection}
                            sections={sections}
                          />
                        ))}
                      </ul>
                    </SortableContext>
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
                />
              ) : activeSection ? (
                <SortableSectionHeader
                  id={activeSection.id}
                  name={activeSection.name}
                  taskCount={tasksGroupedBySection.find(s => s.id === activeSection.id)?.tasks.length || 0}
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
    </Card>
  );
};

export default TaskList;