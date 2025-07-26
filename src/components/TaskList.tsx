import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

// Define the task type to match the database schema
interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  is_daily_recurring: boolean;
  created_at: string;
  user_id: string;
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
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return data || [];
};

// Function to update a task's status in Supabase
const updateTaskStatus = async (taskId: string, newStatus: Task['status']): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  showSuccess(`Task status updated to ${newStatus}`);
  return data;
};

// Function to add a new task to Supabase
const addTask = async (description: string, isDailyRecurring: boolean): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      { description, status: 'to-do', is_daily_recurring: isDailyRecurring }
    ])
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
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [isNewTaskDailyRecurring, setIsNewTaskDailyRecurring] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedTasks = await fetchTasks(currentDate);
      setTasks(fetchedTasks);
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

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updatedTask = await updateTaskStatus(taskId, newStatus);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      );
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
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
      const addedTask = await addTask(newTaskDescription, isNewTaskDailyRecurring);
      setTasks(prevTasks => [...prevTasks, addedTask]);
      setNewTaskDescription('');
      setIsNewTaskDailyRecurring(false);
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

  if (loading) {
    return <div className="text-center p-8">Loading tasks...</div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
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

        <div className="mb-6 space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Add New Task</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Input
              placeholder="Task description"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow"
            />
            <div className="flex items-center space-x-2">
              <Switch
                id="daily-recurring"
                checked={isNewTaskDailyRecurring}
                onCheckedChange={setIsNewTaskDailyRecurring}
              />
              <Label htmlFor="daily-recurring">Daily Recurring</Label>
            </div>
            <Button onClick={handleAddTask} className="w-full sm:w-auto">Add Task</Button>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Your Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-center text-gray-500">No tasks found. Add one above!</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map(task => (
              <li key={task.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleStatusChange(task.id, task.status === 'completed' ? 'to-do' : 'completed')}
                    id={`task-${task.id}`}
                  />
                  <Label
                    htmlFor={`task-${task.id}`}
                    className={`text-lg ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}
                  >
                    {task.description}
                  </Label>
                  {task.is_daily_recurring && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
                      Daily
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {task.status}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                        Mark as Archived
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskList;