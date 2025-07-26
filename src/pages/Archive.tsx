import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/Sidebar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks } from '@/hooks/useTasks';
import SortableTaskItem from '@/components/SortableTaskItem';
import { Archive as ArchiveIcon } from 'lucide-react';

// Define the task type (re-import or ensure it's available if not already)
interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
  original_task_id: string | null;
}

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

  // Filter tasks to show only archived ones
  const archivedTasks = tasks.filter(task => task.status === 'archived');

  // Set the status filter to 'archived' when this page loads
  // This ensures that the useTasks hook's filteredTasks memo will correctly
  // provide only archived tasks if it's used elsewhere with this filter.
  // However, for this specific page, we are directly filtering the 'tasks' state.
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
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      userId={userId}
                      onStatusChange={handleTaskStatusChange} {/* Updated here */}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      isSelected={false}
                      onToggleSelect={() => {}}
                      sections={sections}
                    />
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
    </div>
  );
};

export default Archive;