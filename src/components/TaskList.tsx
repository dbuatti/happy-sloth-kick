import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { format, addDays, subDays, isSameDay, parseISO, isAfter, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Edit, Calendar, Clock, StickyNote, Search, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import TaskFilter from "./TaskFilter";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import BulkActions from "./BulkActions";

// Define the task type to match the database schema
interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  is_daily_recurring: boolean;
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
}

// Function to fetch tasks for a specific date from Supabase
const fetchTasks = async (date: Date): Promise<Task[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return data || [];
};

// Function to update a task's status in Supabase
const updateTaskStatus = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  showSuccess(`Task updated successfully`);
  return data;
};

// Function to add a new task to Supabase
const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single();

  if (error) {
    console.error('Error adding task:', error);
    throw error;
  }

  showSuccess("Task added successfully!");
  return data;
};

// Function to delete a task from Supabase
const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }

  showSuccess("Task deleted successfully!");
};

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [isNewTaskDailyRecurring, setIsNewTaskDailyRecurring] = useState<boolean>(false);
  const [newTaskCategory, setNewTaskCategory] = useState<string>('general');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<string>('general');
  const [editingPriority, setEditingPriority] = useState<string>('medium');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedTasks = await fetchTasks(currentDate);
      setTasks(fetchedTasks);
      setFilteredTasks(fetchedTasks);
    } catch (error) {
      showError("Failed to load tasks.");
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    // Apply filters whenever tasks or filter criteria change
    let filtered = [...tasks];

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.notes && task.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, filterStatus, filterCategory, filterPriority]);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updatedTask = await updateTaskStatus(taskId, { status: newStatus });
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      );

      // Remove from selected tasks if it was selected
      if (selectedTaskIds.includes(taskId)) {
        setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      setFilteredTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // Remove from selected tasks if it was selected
      if (selectedTaskIds.includes(taskId)) {
        setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) {
      showError("Task description cannot be empty.");
      return;
    }
    try {
      const taskData = {
        description: newTaskDescription,
        status: 'to-do' as const,
        is_daily_recurring: isNewTaskDailyRecurring,
        category: newTaskCategory,
        priority: newTaskPriority,
        due_date: newTaskDueDate ? newTaskDueDate.toISOString() : null,
        notes: newTaskNotes || null,
      };
      
      const addedTask = await addTask(taskData);
      setTasks(prevTasks => [...prevTasks, addedTask]);
      setNewTaskDescription('');
      setIsNewTaskDailyRecurring(false);
      setNewTaskCategory('general');
      setNewTaskPriority('medium');
      setNewTaskDueDate(undefined);
      setNewTaskNotes('');
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && newTaskDescription.trim()) {
      handleAddTask();
    }
  };

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => subDays(prevDate, 1));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => addDays(prevDate, 1));
  };

  const startEditingTask = (task: Task) => {
    setEditingTask(task);
    setEditingDescription(task.description);
    setEditingNotes(task.notes || '');
    setEditingDueDate(task.due_date ? parseISO(task.due_date) : undefined);
    setEditingCategory(task.category);
    setEditingPriority(task.priority);
  };

  const saveEditedTask = async () => {
    if (!editingTask) return;
    
    try {
      const updatedTask = await updateTaskStatus(editingTask.id, {
        description: editingDescription,
        notes: editingNotes || null,
        due_date: editingDueDate ? editingDueDate.toISOString() : null,
        category: editingCategory,
        priority: editingPriority,
      });
      
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        )
      );
      
      setEditingTask(null);
      setEditingDescription('');
      setEditingNotes('');
      setEditingDueDate(undefined);
      setEditingCategory('general');
      setEditingPriority('medium');
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700';
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = parseISO(dueDate);
    if (isToday(date)) {
      return 'Today';
    } else if (isAfter(date, new Date())) {
      return `Due ${format(date, 'MMM d')}`;
    } else {
      return `Overdue ${format(date, 'MMM d')}`;
    }
  };

  const handleFilterChange = (filters: {
    search: string;
    status: string;
    category: string;
    priority: string;
  }) => {
    setSearchTerm(filters.search);
    setFilterStatus(filters.status);
    setFilterCategory(filters.category);
    setFilterPriority(filters.priority);
  };

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(prev => [...prev, taskId]);
    } else {
      setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedTaskIds.length === 0) return;

    selectedTaskIds.forEach(async (taskId) => {
      try {
        let updates: Partial<Task> = {};

        switch (action) {
          case 'complete':
            updates.status = 'completed';
            break;
          case 'archive':
            updates.status = 'archived';
            break;
          case 'delete':
            await deleteTask(taskId);
            return;
          case 'priority-low':
            updates.priority = 'low';
            break;
          case 'priority-medium':
            updates.priority = 'medium';
            break;
          case 'priority-high':
            updates.priority = 'high';
            break;
          case 'priority-urgent':
            updates.priority = 'urgent';
            break;
        }

        await updateTaskStatus(taskId, updates);
      } catch (error) {
        console.error(`Error applying ${action} to task ${taskId}:`, error);
      }
    });

    // Clear selection after action
    setSelectedTaskIds([]);
  };

  const clearSelection = () => {
    setSelectedTaskIds([]);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    'n': () => {
      const input = document.getElementById('new-task-description');
      if (input) {
        input.focus();
      }
    },
    'f': () => {
      const searchInput = document.querySelector('input[placeholder="Search tasks..."]');
      if (searchInput) {
        (searchInput as HTMLInputElement).focus();
      }
    },
  });

  if (loading) {
    return <div className="text-center p-8">Loading tasks...</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">Daily Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-xl font-semibold">
            {isSameDay(currentDate, new Date()) ? 'Today' : format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <Button variant="outline" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <TaskFilter onFilterChange={handleFilterChange} />

        <div className="mb-8 p-6 bg-gray-50 dark:bg-card rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Add New Task</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-task-description">Task Description</Label>
              <Input
                id="new-task-description"
                placeholder="Task description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CategorySelector value={newTaskCategory} onChange={setNewTaskCategory} />
              <PrioritySelector value={newTaskPriority} onChange={setNewTaskPriority} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newTaskDueDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {newTaskDueDate ? format(newTaskDueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={newTaskDueDate}
                      onSelect={setNewTaskDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="daily-recurring"
                  checked={isNewTaskDailyRecurring}
                  onCheckedChange={setIsNewTaskDailyRecurring}
                />
                <Label htmlFor="daily-recurring">Daily Recurring</Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="new-task-notes">Notes</Label>
              <Textarea
                id="new-task-notes"
                placeholder="Add notes about this task..."
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            <Button onClick={handleAddTask} className="w-full">Add Task</Button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Tasks</h2>
          <div className="text-sm text-gray-500">
            {filteredTasks.length} of {tasks.length} tasks shown
          </div>
        </div>
        
        {filteredTasks.length === 0 ? (
          <p className="text-center text-gray-500">
            {tasks.length === 0 ? "No tasks found. Add one above!" : "No tasks match your filters."}
          </p>
        ) : (
          <div>
            <ul className="space-y-3">
              {filteredTasks.map(task => (
                <li key={task.id} className="border rounded-md bg-white dark:bg-gray-800 p-4">
                  {editingTask?.id === task.id ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`edit-task-${task.id}`}>Task Description</Label>
                        <Input
                          id={`edit-task-${task.id}`}
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          autoFocus
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CategorySelector value={editingCategory} onChange={setEditingCategory} />
                        <PrioritySelector value={editingPriority} onChange={setEditingPriority} />
                      </div>
                      
                      <div>
                        <Label>Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !editingDueDate && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {editingDueDate ? format(editingDueDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={editingDueDate}
                              onSelect={setEditingDueDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label htmlFor={`edit-notes-${task.id}`}>Notes</Label>
                        <Textarea
                          id={`edit-notes-${task.id}`}
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => {
                          setEditingTask(null);
                          setEditingDescription('');
                          setEditingNotes('');
                          setEditingDueDate(undefined);
                          setEditingCategory('general');
                          setEditingPriority('medium');
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={saveEditedTask}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={() => handleStatusChange(task.id, task.status === 'completed' ? 'to-do' : 'completed')}
                            id={`task-${task.id}`}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`task-${task.id}`}
                              className={`text-lg font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}
                            >
                              {task.description}
                            </Label>
                            
                            {task.notes && (
                              <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300 flex items-center">
                                <StickyNote className="h-3 w-3 mr-1" />
                                {task.notes}
                              </div>
                            )}
                            
                            {getDueDateDisplay(task.due_date) && (
                              <div className="mt-1 text-sm text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {getDueDateDisplay(task.due_date)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditingTask(task)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'to-do')}>
                                Mark as To-Do
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')}>
                                Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'skipped')}>
                                Mark as Skipped
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'archived')}>
                                <Archive className="mr-2 h-4 w-4" /> Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <BulkActions 
              selectedTaskIds={selectedTaskIds} 
              onAction={handleBulkAction} 
              onClearSelection={clearSelection} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskList;