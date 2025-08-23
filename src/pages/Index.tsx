import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { Task, TaskCategory, TaskSection } from '@/types';
import TaskList from '@/components/TaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings as SettingsIcon, LayoutDashboard, Calendar, ListTodo, Brain, Moon, Link, Users, Archive } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePicker } from '@/components/ui/calendar';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import AddTaskForm from '@/components/AddTaskForm';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { userId: currentUserId } = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();

  const {
    tasks: fetchedTasks,
    sections: fetchedSections,
    categories: fetchedCategories,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createCategory,
    updateCategory,
    deleteCategory,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    updateSectionIncludeInFocusMode,
  } = useTasks({ userId: currentUserId! });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskSectionId, setNewTaskSectionId] = useState<string | null>(null);
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | null>(null);
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string | null>(null);
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  useEffect(() => {
    if (fetchedTasks) {
      setTasks(fetchedTasks);
    }
  }, [fetchedTasks]);

  useEffect(() => {
    if (fetchedSections) {
      setSections(fetchedSections);
    }
  }, [fetchedSections]);

  useEffect(() => {
    if (fetchedCategories) {
      setCategories(fetchedCategories);
    }
  }, [fetchedCategories]);

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) {
      toast.error('Task description cannot be empty.');
      return;
    }
    try {
      const data = await addTask(newTaskDescription, newTaskSectionId, null, newTaskDueDate, newTaskCategoryId, newTaskPriority);
      if (data) {
        setTasks((prevTasks) => [...prevTasks, data]);
        setNewTaskDescription("");
        setNewTaskSectionId(null);
        setNewTaskDueDate(null);
        setNewTaskCategoryId(null);
        setNewTaskPriority('medium');
        setIsAddTaskDialogOpen(false);
        toast.success('Task added successfully!');
      }
    } catch (err: any) {
      toast.error(`Failed to add task: ${err.message}`);
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const data = await updateTask(id, updates);
      if (data) {
        setTasks((prevTasks) =>
          prevTasks.map((task) => (task.id === data.id ? data : task))
        );
        toast.success('Task updated successfully!');
      }
      return data;
    } catch (err: any) {
      toast.error(`Failed to update task: ${err.message}`);
      throw err;
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
        toast.success('Task deleted successfully!');
      } catch (err: any) {
        toast.error(`Failed to delete task: ${err.message}`);
      }
    }
  };

  const handleAddSubtask = async (description: string, parentTaskId: string | null) => {
    if (!description.trim() || !parentTaskId) {
      toast.error('Subtask description and parent task are required.');
      return;
    }
    try {
      const data = await addTask(description, null, parentTaskId, null, null, 'medium');
      if (data) {
        setTasks((prevTasks) => [...prevTasks, data]);
        toast.success('Subtask added successfully!');
      }
      return data;
    } catch (err: any) {
      toast.error(`Failed to add subtask: ${err.message}`);
      throw err;
    }
  };

  const handleToggleFocusMode = async (taskId: string, isFocused: boolean) => {
    try {
      await updateSettings({ focused_task_id: isFocused ? taskId : null });
      toast.success(isFocused ? 'Task set as focus!' : 'Focus removed.');
    } catch (err: any) {
      toast.error(`Failed to update focus mode: ${err.message}`);
    }
  };

  const handleLogDoTodayOff = async (taskId: string) => {
    // This functionality is typically handled by a separate hook or context
    // For now, we'll just log it.
    toast.info(`Task ${taskId} logged as "Do Today Off" (functionality to be implemented).`);
  };

  const handleNewTaskFormSubmit = async (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => {
    await addTask(description, sectionId, parentTaskId, dueDate, categoryId, priority);
    setIsAddTaskDialogOpen(false);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Tasks</h1>

      <div className="flex justify-between items-center mb-6">
        <Button onClick={() => setIsAddTaskDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Task
        </Button>
        <Button variant="outline" onClick={() => navigate('/settings')}>
          <SettingsIcon className="mr-2 h-4 w-4" /> Settings
        </Button>
      </div>

      <TaskList
        tasks={tasks}
        categories={categories}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onAddTask={handleNewTaskFormSubmit}
        onAddSubtask={handleAddSubtask}
        onToggleFocusMode={handleToggleFocusMode}
        onLogDoTodayOff={handleLogDoTodayOff}
        sections={sections}
        allCategories={categories}
        currentDate={startOfDay(new Date())}
        createSection={createSection.mutateAsync}
        updateSection={updateSection.mutateAsync}
        deleteSection={deleteSection.mutateAsync}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        showCompleted={false}
        showFilters={true}
      />

      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm
            onAddTask={handleNewTaskFormSubmit}
            onTaskAdded={() => setIsAddTaskDialogOpen(false)}
            sections={sections}
            allCategories={categories}
            currentDate={startOfDay(new Date())}
            createSection={createSection.mutateAsync}
            updateSection={updateSection.mutateAsync}
            deleteSection={deleteSection.mutateAsync}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;