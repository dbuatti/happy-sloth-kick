import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  is_daily_recurring: boolean;
}

// In-memory store for mock task states per day
// Key: YYYY-MM-DD, Value: Array of tasks for that day
const mockDailyTaskStates = new Map<string, Task[]>();

// Initial set of tasks that define the base for each day
// IMPORTANT: This array will be mutated when new daily recurring tasks are added.
const initialBaseTasks: Task[] = [
  { id: '1', description: 'Buy groceries', status: 'to-do', is_daily_recurring: true },
  { id: '2', description: 'Go for a run', status: 'to-do', is_daily_recurring: true },
  { id: '3', description: 'Call mom', status: 'to-do', is_daily_recurring: false },
  { id: '4', description: 'Read a book', status: 'to-do', is_daily_recurring: true },
];

const getFormattedDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

// Mock function to fetch tasks for a specific date
const mockFetchTasks = async (date: Date): Promise<Task[]> => {
  const dateKey = getFormattedDateKey(date);

  if (!mockDailyTaskStates.has(dateKey)) {
    // If no state for this date, initialize it
    const newDayTasks = initialBaseTasks.map(task => {
      if (task.is_daily_recurring) {
        // Daily recurring tasks reset to 'to-do' for a new day
        return { ...task, status: 'to-do' } as Task;
      }
      // Non-daily recurring tasks retain their initial status (or could be 'archived' if completed on a previous day in a real system)
      return task;
    });
    mockDailyTaskStates.set(dateKey, newDayTasks);
  }
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockDailyTaskStates.get(dateKey)!);
    }, 500);
  });
};

// Mock function to update task status for a specific date
const mockUpdateTaskStatus = async (date: Date, taskId: string, newStatus: Task['status']): Promise<Task> => {
  const dateKey = getFormattedDateKey(date);
  const tasksForDay = mockDailyTaskStates.get(dateKey);

  if (!tasksForDay) {
    throw new Error("Tasks for this day not found in mock store.");
  }

  const updatedTasks = tasksForDay.map(task =>
    task.id === taskId ? { ...task, status: newStatus } : task
  );
  mockDailyTaskStates.set(dateKey, updatedTasks);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.1) { // Simulate occasional failure
        showSuccess(`Task status updated to ${newStatus}`);
        const updatedTask = updatedTasks.find(t => t.id === taskId);
        if (updatedTask) {
          resolve(updatedTask);
        } else {
          reject(new Error("Task not found after update."));
        }
      } else {
        showError("Failed to update task status.");
        reject(new Error("Failed to update task status"));
      }
    }, 300);
  });
};

// Mock function to add a task for a specific date
const mockAddTask = async (description: string, isDailyRecurring: boolean, date: Date): Promise<Task> => {
  const dateKey = getFormattedDateKey(date);
  const newTask: Task = { id: String(Date.now()), description, status: 'to-do', is_daily_recurring: isDailyRecurring };

  // Add to the current day's tasks
  const tasksForDay = mockDailyTaskStates.get(dateKey) || [];
  mockDailyTaskStates.set(dateKey, [...tasksForDay, newTask]);

  // If it's a daily recurring task, add it to the base set for future days
  if (isDailyRecurring) {
    initialBaseTasks.push(newTask);
  }

  return new Promise(resolve => {
    setTimeout(() => {
      showSuccess("Task added successfully!");
      resolve(newTask);
    }, 300);
  });
};


const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [isNewTaskDailyRecurring, setIsNewTaskDailyRecurring] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedTasks = await mockFetchTasks(currentDate);
      setTasks(fetchedTasks);
    } catch (error) {
      showError("Failed to load tasks.");
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]); // Re-fetch tasks when currentDate changes

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, currentStatus: Task['status']) => {
    const newStatus = currentStatus === 'to-do' ? 'completed' : 'to-do';
    try {
      await mockUpdateTaskStatus(currentDate, taskId, newStatus);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) {
      showError("Task description cannot be empty.");
      return;
    }
    try {
      const addedTask = await mockAddTask(newTaskDescription, isNewTaskDailyRecurring, currentDate);
      setTasks(prevTasks => [...prevTasks, addedTask]);
      setNewTaskDescription('');
      setIsNewTaskDailyRecurring(false);
    } catch (error) {
      console.error("Error adding task:", error);
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
                    onCheckedChange={() => handleStatusChange(task.id, task.status)}
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
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Status: <span className="capitalize">{task.status}</span>
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