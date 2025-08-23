import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData, ArchiveProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Archive as ArchiveIcon, RotateCcw } from 'lucide-react';
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
    updateTask,
    deleteTask,
    onAddSubtask,
    createCategory,
    updateCategory,
    deleteCategory,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const [searchTerm, setSearchTerm] = useState('');

  const archivedTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'archived');
  }, [tasks]);

  const filteredArchivedTasks = useMemo(() => {
    return archivedTasks.filter(task =>
      task.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [archivedTasks, searchTerm]);

  const handleRestoreTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'to-do' });
      toast.success('Task restored successfully!');
    } catch (err) {
      toast.error('Failed to restore task.');
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this task?')) {
      try {
        await deleteTask(taskId);
        toast.success('Task permanently deleted!');
      } catch (err) {
        toast.error('Failed to delete task.');
        console.error(err);
      }
    }
  };

  if (isLoading || authLoading) return <p>Loading archive...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Archive</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Archived Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              placeholder="Search archived tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filteredArchivedTasks.length === 0 ? (
            <p className="text-muted-foreground">No archived tasks found.</p>
          ) : (
            <div className="space-y-3">
              {filteredArchivedTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <span className="text-sm">{task.description}</span>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleRestoreTask(task.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Restore
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Archive;