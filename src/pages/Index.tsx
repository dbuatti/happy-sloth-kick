import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import TaskList from '@/components/TaskList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddTaskForm from '@/components/AddTaskForm';
import { startOfDay } from 'date-fns';
import { Task, UpdateTaskData, IndexProps } from '@/types';
import { toast } from 'react-hot-toast';
import { DialogTrigger } from '@radix-ui/react-dialog';

const Index: React.FC<IndexProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { settings } = useSettings();
  const navigate = useNavigate();

  const {
    tasks,
    categories: fetchedCategories,
    sections: fetchedSections,
    isLoading,
    error,
    addTask,
    updateTask,
    deleteTask,
    onToggleFocusMode,
    onLogDoTodayOff,
    addCategory: createCategory,
    updateCategory,
    deleteCategory,
    addSection: createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    doTodayOffLog,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  const handleAddTask = async (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => {
    try {
      const data = await addTask({
        description,
        section_id: sectionId,
        parent_task_id: parentTaskId,
        due_date: dueDate ? dueDate.toISOString() : null,
        category: categoryId,
        priority: priority as Task['priority'],
        status: 'to-do',
      });
      if (data) {
        toast.success('Task added successfully!');
        setIsAddTaskDialogOpen(false);
      }
      return data;
    } catch (error: any) {
      toast.error('Failed to add task: ' + error.message);
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const handleUpdateTask = async (id: string, updates: UpdateTaskData) => {
    try {
      const data = await updateTask({ id, updates });
      if (data) {
        toast.success('Task updated successfully!');
        return data;
      }
      return data;
    } catch (error: any) {
      toast.error('Failed to update task: ' + error.message);
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
        toast.success('Task deleted successfully!');
      } catch (error: any) {
        toast.error('Failed to delete task: ' + error.message);
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleAddSubtask = async (description: string, parentTaskId: string | null) => {
    try {
      const data = await addTask({
        description,
        parent_task_id: parentTaskId,
        status: 'to-do',
        priority: 'medium',
      });
      if (data) {
        toast.success('Subtask added successfully!');
        return data;
      }
      return data;
    } catch (error: any) {
      toast.error('Failed to add subtask: ' + error.message);
      console.error('Error adding subtask:', error);
      throw error;
    }
  };

  const handleToggleFocusMode = async (taskId: string, isFocused: boolean) => {
    await onToggleFocusMode(taskId, isFocused);
  };

  const handleLogDoTodayOff = async (taskId: string) => {
    await onLogDoTodayOff(taskId);
  };

  const handleNewTaskFormSubmit = async (description: string, sectionId: string | null, parentTaskId: string | null, dueDate: Date | null, categoryId: string | null, priority: string) => {
    await addTask({
      description,
      section_id: sectionId,
      parent_task_id: parentTaskId,
      due_date: dueDate ? dueDate.toISOString() : null,
      category: categoryId,
      priority: priority as Task['priority'],
      status: 'to-do',
    });
    setIsAddTaskDialogOpen(false);
  };

  if (isLoading || settings.isLoading) {
    return <div className="p-4 text-center">Loading tasks...</div>;
  }

  if (error || settings.error) {
    return <div className="p-4 text-red-500">Error loading data: {error?.message || settings.error?.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Tasks</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <AddTaskForm
                onAddTask={handleNewTaskFormSubmit}
                categories={fetchedCategories || []}
                sections={fetchedSections || []}
                currentDate={startOfDay(new Date())}
                createSection={createSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
                updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                showCompleted={false}
                onClose={() => setIsAddTaskDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TaskList
        tasks={tasks || []}
        categories={fetchedCategories || []}
        sections={fetchedSections || []}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onAddTask={handleAddTask}
        onAddSubtask={handleAddSubtask}
        onToggleFocusMode={handleToggleFocusMode}
        onLogDoTodayOff={handleLogDoTodayOff}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        showCompleted={settings?.visible_pages?.show_completed_tasks ?? false}
        doTodayOffLog={doTodayOffLog}
      />
    </div>
  );
};

export default Index;