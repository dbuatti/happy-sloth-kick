import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks } from '@/hooks/useTasks';
import SortableTaskItem from '@/components/SortableTaskItem';
import { Archive as ArchiveIcon } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import TaskDetailDialog from '@/components/TaskDetailDialog';

const Archive = () => {
  const {
    // Use filteredTasks directly, as setStatusFilter('archived') will populate it correctly
    filteredTasks, 
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

  // Set the status filter to 'archived' when this page loads
  useEffect(() => {
    setStatusFilter('archived');
    // No need to return a cleanup function to reset, as Index.tsx will set it to 'all'
  }, [setStatusFilter]);

  // Handler for status changes specifically for SortableTaskItem
  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4">
          <Card className="w-full max-w-4xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <ArchiveIcon className="h-7 w-7" /> Archived Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="text-center text-gray-500 p-8">
                  <p className="text-lg mb-2">No archived tasks found.</p>
                  <p>Completed tasks will appear here once you archive them.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredTasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      userId={userId}
                      onStatusChange={handleTaskStatusChange}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      isSelected={false} // Tasks in archive are not selectable for bulk actions
                      onToggleSelect={() => {}} // No selection needed here
                      sections={sections}
                      onEditTask={handleEditTask}
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
    </>
  );
};

export default Archive;