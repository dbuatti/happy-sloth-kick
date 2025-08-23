import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, ArchiveProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    tasks,
    isLoading,
    error,
    updateTask,
    deleteTask,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const [searchQuery, setSearchQuery] = useState('');

  const archivedTasks = useMemo(() => {
    return tasks.filter((task: Task) => task.status === 'archived');
  }, [tasks]);

  const filteredArchivedTasks = useMemo(() => {
    if (!searchQuery) return archivedTasks;
    return archivedTasks.filter(task =>
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [archivedTasks, searchQuery]);

  const handleRestoreTask = async (taskId: string) => {
    try {
      await updateTask({ id: taskId, updates: { status: 'to-do' } });
      toast.success('Task restored successfully!');
    } catch (error: any) {
      toast.error('Failed to restore task: ' + error.message);
      console.error('Error restoring task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this task? This action cannot be undone.')) {
      try {
        await deleteTask(taskId);
        toast.success('Task permanently deleted!');
      } catch (error: any) {
        toast.error('Failed to delete task: ' + error.message);
        console.error('Error deleting task:', error);
      }
    }
  };

  if (authLoading || isLoading) {
    return <div className="p-4 text-center">Loading archive...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading data: {error.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Archive</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Archived Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search archived tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
          {filteredArchivedTasks.length === 0 ? (
            <p className="text-muted-foreground">No archived tasks found.</p>
          ) : (
            <div className="space-y-2">
              {filteredArchivedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-md">
                  <span className="text-sm line-through text-muted-foreground">{task.description}</span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleRestoreTask(task.id)}>
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