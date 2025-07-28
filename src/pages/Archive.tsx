import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useTasks } from '@/hooks/useTasks';
import SortableTaskItem from '@/components/SortableTaskItem';
import { Archive as ArchiveIcon } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import TaskDetailDialog from '@/components/TaskDetailDialog';

interface ArchiveProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const Archive: React.FC<ArchiveProps> = ({ currentDate, setCurrentDate }) => {
  // Pass the actual current date to useTasks for recurring task logic,
  // even though the archive view itself is not date-filtered.
  const {
    filteredTasks, 
    loading,
    userId,
    updateTask,
    deleteTask,
    sections,
    setStatusFilter,
    allCategories,
  } = useTasks({ currentDate: new Date(), setCurrentDate: () => {} }); // Still use new Date() for its internal date logic, as Archive is not tied to the main app's date navigator.

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  useEffect(() => {
    setStatusFilter('archived');
  }, [setStatusFilter]);

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
        <main className="flex-grow p-4 flex justify-center">
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
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <ArchiveIcon className="h-7 w-7" /> Archived Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredTasks.length === 0 ? (
                <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                  <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No archived tasks found.</p>
                  <p className="text-sm">Completed tasks will appear here once you archive them.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredTasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      userId={userId}
                      onStatusChange={handleTaskStatusChange}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      isSelected={false}
                      onToggleSelect={() => {}}
                      sections={sections}
                      onEditTask={handleEditTask}
                      currentDate={currentDate}
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
          currentDate={currentDate} // Pass currentDate
          setCurrentDate={setCurrentDate} // Pass setCurrentDate
        />
      )}
    </>
  );
};

export default Archive;