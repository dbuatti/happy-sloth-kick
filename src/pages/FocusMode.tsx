import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks, Task } from '@/hooks/useTasks';
// Removed: import { useAllAppointments } from '@/hooks/useAllAppointments'; // Unused import
import FocusPanel from '@/components/FocusPanel';
import TaskDetailDialog from '@/components/TaskDetailDialog';
// Removed: import { Appointment } from '@/hooks/useAppointments'; // Unused import

interface FocusModeProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = isDemo ? demoUserId : user?.id;

  const [currentDate] = useState(new Date()); // Focus mode always uses current date
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    processedTasks,
    filteredTasks,
    loading: tasksLoading,
    handleAddTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    archiveAllCompletedTasks,
    toggleAllDoToday: toggleAllDoTodayFromHook, // Renamed to avoid conflict
    markAllTasksAsSkipped,
    createCategory, // Destructure
    updateCategory, // Destructure
    deleteCategory, // Destructure
  } = useTasks({
    currentDate,
    viewMode: 'focus',
    userId: userId,
  });

  // Removed: const { appointments: allAppointments } = useAllAppointments(); // Unused variable

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  // Wrapper function for toggleAllDoToday to match expected signature
  const handleToggleAllDoToday = useCallback(async () => {
    await toggleAllDoTodayFromHook(); // Call without arguments
  }, [toggleAllDoTodayFromHook]);

  return (
    <div className="flex flex-col h-full w-full">
      <FocusPanel
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
        loading={tasksLoading}
        updateTask={updateTask}
        onOpenDetail={handleOpenOverview}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
        setFocusTask={setFocusTask}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
        archiveAllCompletedTasks={archiveAllCompletedTasks}
        toggleAllDoToday={handleToggleAllDoToday} // Use the wrapper function
        markAllTasksAsSkipped={markAllTasksAsSkipped}
        isDemo={isDemo}
        createCategory={createCategory} // Pass through
        updateCategory={updateCategory} // Pass through
        deleteCategory={deleteCategory} // Pass through
      />

      {taskToOverview && (
        <TaskDetailDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          allTasks={processedTasks}
          onAddSubtask={() => {}} // FocusMode doesn't directly add subtasks from here
          createCategory={createCategory} // Pass through
          updateCategory={updateCategory} // Pass through
          deleteCategory={deleteCategory} // Pass through
        />
      )}
    </div>
  );
};

export default FocusMode;