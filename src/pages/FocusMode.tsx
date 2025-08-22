import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskSection, TaskCategory } from '@/types/task';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FocusModePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const FocusModePage: React.FC<FocusModePageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [currentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const {
    tasks,
    nextAvailableTask,
    sections,
    allCategories,
    handleAddTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    isLoading,
    error,
  } = useTasks({ userId: userId, currentDate: currentDate, viewMode: 'focus' }); // Fixed prop passing

  useEffect(() => {
    if (!selectedTask && nextAvailableTask) {
      setSelectedTask(nextAvailableTask);
    }
  }, [nextAvailableTask, selectedTask]);

  const handleCompleteTask = async () => {
    if (selectedTask) {
      await updateTask(selectedTask.id, { status: 'completed' });
      setSelectedTask(null); // Clear selected task to pick next available
    }
  };

  const handleSkipTask = async () => {
    if (selectedTask) {
      await updateTask(selectedTask.id, { status: 'skipped' });
      setSelectedTask(null); // Clear selected task to pick next available
    }
  };

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleOpenOverview = (task: Task) => {
    setSelectedTask(task);
    setIsOverviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading tasks: {error.message}</div>;
  }

  if (!selectedTask) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-bold mb-4">No tasks currently in focus mode.</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Add some tasks or mark existing ones for focus mode to get started!
        </p>
        <Button onClick={() => { /* navigate to task list or add task dialog */ }}>
          Add a Task
        </Button>
      </div>
    );
  }

  return (
    <>
      <FullScreenFocusView
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={handleCompleteTask}
        onSkip={handleSkipTask}
        onOpenDetail={handleOpenDetail}
        updateTask={updateTask}
        sections={sections}
        categories={allCategories}
        allTasks={tasks}
        onAddTask={handleAddTask}
        onReorderTasks={reorderTasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />

      <TaskOverviewDialog
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        task={selectedTask}
        onOpenDetail={handleOpenDetail}
        onOpenFocusView={() => {}} // Not applicable from overview within focus mode
        updateTask={updateTask}
        deleteTask={deleteTask}
        sections={sections}
        categories={allCategories}
        allTasks={tasks}
        onAddTask={handleAddTask}
        onReorderTasks={reorderTasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />

      <TaskDetailDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        task={selectedTask}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        categories={allCategories}
        allTasks={tasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />
    </>
  );
};

export default FocusModePage;