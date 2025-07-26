import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/Sidebar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks } from '@/hooks/useTasks';
import SortableTaskItem from '@/components/SortableTaskItem';
import { Archive as ArchiveIcon } from 'lucide-react';
import { Task } from '@/hooks/useTasks'; // Import Task interface from useTasks
import TaskDetailDialog from '@/components/TaskDetailDialog'; // Import TaskDetailDialog
import { Button } from '@/components/ui/button'; // Import Button for unarchive

const Archive = () => {
  const {
    tasks,
    loading,
    userId,
    updateTask,
    deleteTask,
    sections,
    setStatusFilter,
  } = useTasks();

  // State for TaskDetailDialog
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Filter tasks to show only archived ones
  const archivedTasks = tasks.filter(task => task.status === 'archived');

  // Set the status filter to 'archived' when this page loads
  useEffect(() => {
    setStatusFilter('archived');
    return () => {
      // Optionally reset filter when leaving the page if needed for other views
      // setStatusFilter('all'); 
    };
  }, [setStatusFilter]);

  // Handler for status changes specifically for SortableTaskItem
  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleUnarchiveTask = async (taskId: string) => {
    await updateTask(taskId, { status: 'to-do' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-grow p-4 flex items-center justify-center">
            <Card className="w-full max-w-4xl mx-auto shadow-lg">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-center">Archived Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          </main>
          <footer className="p-4">
            <MadeWithDyad />
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4">
          <Card className="w-full max-w-4xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <ArchiveIcon className="h-7 w-7" /> Archived Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {archivedTasks.length === 0 ? (
                <div className="text-center text-gray-500 p-8">
                  <p className="text-lg mb-2">No archived tasks found.</p>
                  <p>Completed tasks will appear here once you archive them.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {archivedTasks.map((task) => (
                    <li 
                      key={task.id} 
                      className="relative border rounded-lg p-3 transition-all duration-200 ease-in-out bg-card dark:bg-gray-800 border-border group hover:shadow-md"
                    >
                      <div className="flex items-center justify-between space-x-3 w-full">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium leading-tight line-through text-gray-500 dark:text-gray-400 block truncate">
                            {task.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Archived on: {new Date(task.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleUnarchiveTask(task.id)}
                          >
                            Unarchive
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => { if(window.confirm('Are you sure you want to permanently delete this task?')) deleteTask(task.id); }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </main>
        <footer className="p-4">
          <MadeWithDyad />
        </footer>
      </div>
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={userId}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
};

export default Archive;