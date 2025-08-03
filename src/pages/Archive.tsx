import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Archive as ArchiveIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskItem from '@/components/TaskItem';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

const Archive: React.FC = () => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id; // Get userId from useAuth

  const {
    tasks: allTasks, // Need all tasks for subtask filtering in overview
    filteredTasks: archivedTasks, 
    loading: archiveLoading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    setStatusFilter, // To ensure only archived tasks are fetched
  } = useTasks({ viewMode: 'archive' });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  useEffect(() => {
    setStatusFilter('archived');
  }, [setStatusFilter]);

  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false); // Close overview
    setTaskToEdit(task);
    setIsTaskDetailOpen(true); // Open edit dialog
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <ArchiveIcon className="h-7 w-7 text-primary" /> Archived Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {archiveLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : archivedTasks.length === 0 ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No archived tasks found.</p>
                <p className="text-sm">Completed tasks will appear here once you archive them from your daily view.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {archivedTasks.map((task) => (
                  <li key={task.id} className="relative rounded-xl p-2 transition-all duration-200 ease-in-out group hover:shadow-md">
                    <TaskItem
                      task={task}
                      onStatusChange={handleTaskStatusChange}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      isSelected={false}
                      onToggleSelect={() => {}}
                      sections={sections}
                      onOpenOverview={handleOpenOverview}
                      currentDate={new Date()}
                      onMoveUp={async () => {}}
                      onMoveDown={async () => {}}
                    />
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
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => {
            setIsTaskOverviewOpen(false);
            setTaskToOverview(null);
          }}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={allTasks}
        />
      )}
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
        />
      )}
    </div>
  );
};

export default Archive;