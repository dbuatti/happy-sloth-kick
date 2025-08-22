import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/types/task';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import { FocusModeProps } from '@/types/props';

const FocusModePage: React.FC<FocusModeProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const {
    nextAvailableTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
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
  } = useTasks({ userId: userId, currentDate: new Date(), viewMode: 'focus' });

  useEffect(() => {
    if (!selectedTask && nextAvailableTask) {
      setSelectedTask(nextAvailableTask);
    }
  }, [nextAvailableTask, selectedTask]);

  const handleCompleteTask = async () => {
    if (selectedTask) {
      await updateTask(selectedTask.id, { status: 'completed' });
      setSelectedTask(null); // Clear selected task to find next available
    }
  };

  const handleSkipTask = async () => {
    if (selectedTask) {
      await updateTask(selectedTask.id, { status: 'skipped' });
      setSelectedTask(null); // Clear selected task to find next available
    }
  };

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading focus tasks...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading focus tasks: {error.message}</div>;
  }

  if (!selectedTask) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 text-center text-gray-500">
        No tasks currently in focus mode. Add some tasks or mark them for focus!
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
        allTasks={tasks} // Assuming 'tasks' from useTasks is available and includes all tasks
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
    </>
  );
};

export default FocusModePage;