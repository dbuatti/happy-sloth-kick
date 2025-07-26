import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast"; // Assuming you have a toast utility

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  is_daily_recurring: boolean;
}

// This would typically come from your Supabase client
// For demonstration, we'll mock it.
const mockFetchTasks = async (): Promise<Task[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        { id: '1', description: 'Buy groceries', status: 'to-do', is_daily_recurring: true },
        { id: '2', description: 'Go for a run', status: 'completed', is_daily_recurring: true },
        { id: '3', description: 'Call mom', status: 'to-do', is_daily_recurring: false },
        { id: '4', description: 'Read a book', status: 'skipped', is_daily_recurring: true },
      ]);
    }, 500);
  });
};

const mockUpdateTaskStatus = async (taskId: string, newStatus: Task['status']): Promise<Task> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.1) { // Simulate occasional failure
        showSuccess(`Task status updated to ${newStatus}`);
        resolve({ id: taskId, description: 'Updated Task', status: newStatus, is_daily_recurring: true }); // Mock updated task
      } else {
        showError("Failed to update task status.");
        reject(new Error("Failed to update task status"));
      }
    }, 300);
  });
};

const mockAddTask = async (description: string, isDailyRecurring: boolean): Promise<Task> => {
  return new Promise(resolve => {
    setTimeout(() => {
      showSuccess("Task added successfully!");
      resolve({ id: String(Date.now()), description, status: 'to-do', is_daily_recurring: isDailyRecurring });
    }, 300);
  });
};


const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [isNewTaskDailyRecurring, setIsNewTaskDailyRecurring] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // In a real app, this would be `const { data, error } = await supabase.from('tasks').select('*').eq('user_id', currentUserId);`
      const fetchedTasks = await mockFetchTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      showError("Failed to load tasks.");
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId: string, currentStatus: Task['status']) => {
    const newStatus = currentStatus === 'to-do' ? 'completed' : 'to-do';
    try {
      // In a real app: `await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);`
      await mockUpdateTaskStatus(taskId, newStatus);
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
      // In a real app: `await supabase.from('tasks').insert([{ description: newTaskDescription, is_daily_recurring: isNewTaskDailyRecurring, user_id: currentUserId }]);`
      const addedTask = await mockAddTask(newTaskDescription, isNewTaskDailyRecurring);
      setTasks(prevTasks => [...prevTasks, addedTask]);
      setNewTaskDescription('');
      setIsNewTaskDailyRecurring(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
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