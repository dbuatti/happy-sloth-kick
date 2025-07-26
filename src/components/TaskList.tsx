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
import { FolderOpen, Settings, Plus, Edit, Trash2 } from 'lucide-react';
import QuickAddTask from './QuickAddTask';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
}

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

// Define TaskUpdate type here as it's used in this component
type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

// Define NewTaskData type here as it's used in this component
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

const TaskList: React.FC = () => {
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
    applyFilters,
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
  } = useTasks();

  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [noSectionDisplayName, setNoSectionDisplayName] = useState('No Section'); // New state for 'No Section' display name

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
    setSortKey(key as 'priority' | 'due_date' | 'created_at');
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

    if (sectionId === 'no-section') {
      setNoSectionDisplayName(editingSectionName);
      showSuccess('Section name updated locally!');
      setEditingSectionId(null);
      setEditingSectionName('');
    } else {
      await updateSection(sectionId, editingSectionName);
      setEditingSectionId(null);
      setEditingSectionName('');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (sectionId === 'no-section') {
      showError("The 'No Section' group cannot be deleted.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this section? All tasks in this section will become unassigned.')) {
      await deleteSection(sectionId);
    }
  };

  // Wrapper function for bulk actions to match BulkActions component's expected prop
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
    }
    // Add more actions as needed
    await bulkUpdateTasks(updates);
  };

  // Wrapper function for AddTaskForm and QuickAddTask to match handleAddTask's new signature
  const handleNewTaskSubmit = async (description: string, sectionId: string | null = null) => {
    const newTaskData: NewTaskData = {
      description: description,
      section_id: sectionId,
      // Add other default properties if needed by your AddTaskForm/QuickAddTask
      // e.g., status: 'to-do', recurring_type: 'none', etc.
    };
    await handleAddTask(newTaskData);
  };

  const tasksGroupedBySection = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    const noSectionId = 'no-section';

    // Initialize all sections, including 'no-section'
    grouped[noSectionId] = [];
    sections.forEach(section => {
      grouped[section.id] = [];
    });

    // Distribute tasks into groups
    filteredTasks.forEach(task => {
      if (task.section_id && grouped[task.section_id]) {
        grouped[task.section_id].push(task);
      } else {
        grouped[noSectionId].push(task);
      }
    });

    // Create ordered list of sections for display
    const orderedSections: { id: string; name: string }[] = [];
    
    // Always add 'No Section' first
    orderedSections.push({ id: noSectionId, name: noSectionDisplayName });

    // Add all other sections
    sections.forEach(section => {
      orderedSections.push(section);
    });

    // Map to final structure, including empty sections
    return orderedSections.map(section => ({
      ...section,
      tasks: grouped[section.id],
    }));
  }, [filteredTasks, sections, noSectionDisplayName]); // Add noSectionDisplayName to dependencies

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    'n': (e) => {
      const input = document.getElementById('new-task-description');
      if (input) {
        input.focus();
      }
    },
    'f': (e) => {
      const searchInput = document.querySelector('input[placeholder="Search tasks..."]');
      if (searchInput) {
        (searchInput as HTMLInputElement).focus();
      }
    },
  };
  useKeyboardShortcuts(shortcuts);

  // Consistent loading state rendering
  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Daily Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">Loading tasks...</div>
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

        {/* AddTaskForm and QuickAddTask now correctly pass a task object */}
        <AddTaskForm onAddTask={handleNewTaskSubmit} userId={userId} />

        <TaskFilter onFilterChange={applyFilters} />

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Tasks</h2>
          <div className="flex items-center space-x-2">
            <Select value={`${sortKey}_${sortDirection}`} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
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
                    {sections.length === 0 && tasksGroupedBySection.find(s => s.id === 'no-section')?.tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sections created yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {tasksGroupedBySection.map(sectionGroup => (
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
                                  {sectionGroup.id !== 'no-section' && ( // Prevent deleting 'No Section'
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleDeleteSection(sectionGroup.id)}
                                      aria-label={`Delete section ${sectionGroup.name}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
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
          </div>
        </div>
        
        {filteredTasks.length === 0 && sections.length === 0 && tasksGroupedBySection.find(s => s.id === 'no-section')?.tasks.length === 0 ? (
          <div className="text-center text-gray-500 p-8">
            <p className="text-lg mb-2">No tasks or sections found for this day!</p>
            <p>Start by adding a new task above, or create your first section using the "Manage Sections" button.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {tasksGroupedBySection.map(sectionGroup => (
              <div key={sectionGroup.id} className="space-y-3">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  {sectionGroup.name} ({sectionGroup.tasks.length})
                </h3>
                <ul className="space-y-3">
                  {sectionGroup.tasks.map(task => (
                    <TaskItem
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
              </div>
            ))}

            <BulkActions 
              selectedTaskIds={selectedTaskIds} 
              onAction={handleBulkAction} {/* Use the new wrapper function */}
              onClearSelection={clearSelectedTasks} 
            />
          </div>
        )}
        {/* QuickAddTask now correctly passes a task object */}
        <QuickAddTask onAddTask={handleNewTaskSubmit} userId={userId} />
      </CardContent>
    </Card>
  );
};

export default TaskList;