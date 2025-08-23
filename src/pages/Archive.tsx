import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Archive as ArchiveIcon, RotateCcw } from 'lucide-react';
import TaskList from '@/components/TaskList';
import { toast } from 'react-hot-toast';

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    tasks,
    categories,
    sections,
    isLoading,
    error,
    updateTask: updateTaskMutation,
    deleteTask: deleteTaskMutation,
    addTask: addTaskMutation,
    setFilterStatus,
    setFilterCategory,
    setFilterPriority,
    setSearchQuery,
    setFilterDueDate,
    setShowCompleted,
  } = useTasks({ userId: currentUserId! });

  useEffect(() => {
    setFilterStatus('archived');
    setFilterCategory('all');
    setFilterPriority('all');
    setSearchQuery('');
    setFilterDueDate(undefined);
    setShowCompleted(true); // Show completed tasks in archive
  }, [setFilterStatus, setFilterCategory, setFilterPriority, setSearchQuery, setFilterDueDate, setShowCompleted]);

  const archivedTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'archived');
  }, [tasks]);

  const handleRestoreTask = async (taskId: string) => {
    try {
      await updateTaskMutation({ id: taskId, updates: { status: 'to-do' } });
      toast.success('Task restored successfully!');
    } catch (err) {
      toast.error('Failed to restore task.');
      console.error('Error restoring task:', err);
    }
  };

  const onUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await updateTaskMutation({ id, updates });
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const onDeleteTask = async (id: string) => {
    try {
      await deleteTaskMutation(id);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const onAddSubtask = async (description: string, parentTaskId: string | null) => {
    try {
      const newTaskData: NewTaskData = {
        description,
        section_id: null,
        parent_task_id: parentTaskId,
        due_date: null,
        category: null,
        priority: 'medium',
        status: 'to-do',
        recurring_type: 'none',
        original_task_id: null,
        link: null,
        image_url: null,
        notes: null,
        remind_at: null,
      };
      return await addTaskMutation(newTaskData);
    } catch (error) {
      console.error('Error adding subtask:', error);
      throw error;
    }
  };

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-full">Loading archive...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <ArchiveIcon className="mr-3 h-8 w-8" /> Archived Tasks
      </h1>

      {archivedTasks.length === 0 ? (
        <p className="text-center text-gray-500">No archived tasks found.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Archived Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={archivedTasks}
              categories={categories as TaskCategory[]}
              sections={sections as TaskSection[]}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onAddSubtask={onAddSubtask}
              onToggleFocusMode={async () => {}} // No focus mode in archive
              onLogDoTodayOff={async () => {}} // No do today off in archive
              showCompleted={true}
              showFilters={false}
              showSections={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Archive;