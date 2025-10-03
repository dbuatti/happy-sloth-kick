"use client";

import React, { useState, useCallback } from 'react'; // Removed unused useMemo
import { useTasks, Task } from '@/hooks/useTasks';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { PomodoroProvider } from '@/context/PomodoroContext';
// Removed unused useAllAppointments, Appointment
import { Button } from '@/components/ui/button';
import { Target } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface FocusModeProps {
  // Removed unused isDemo
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => { // Removed isDemo from destructuring
  const [currentDate] = useState(new Date());
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(true); // Keep open by default for Focus Mode page
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    processedTasks,
    filteredTasks,
    loading: tasksLoading,
    // Removed unused userId
    handleAddTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    // Removed unused updateTaskParentAndOrder
    archiveAllCompletedTasks,
    // Removed unused markAllTasksInSectionCompleted
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    markAllTasksAsSkipped,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTasks({
    currentDate,
    userId: demoUserId,
    viewMode: 'focus', // Ensure tasks are filtered for focus mode
  });

  // Removed unused scheduledTasksMap
  // Removed unused useAllAppointments and Appointment imports

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  // Removed unused handleSetFocusTaskFromPage

  return (
    <PomodoroProvider>
      <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-4 lg:p-6">
        <h1 className="text-3xl font-bold tracking-tight mb-6 flex items-center gap-2">
          <Target className="h-8 w-8 text-primary" /> Focus Mode
        </h1>
        <p className="text-muted-foreground mb-8">
          Concentrate on your most important tasks without distractions using the Pomodoro technique.
        </p>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Your Focused Workflow</h2>
            <p className="text-muted-foreground mb-4">
              Use the Focus Panel to the right to manage your Pomodoro timer and select a task to concentrate on.
            </p>
            <Button onClick={() => setIsFocusPanelOpen(true)}>
              <Target className="h-4 w-4 mr-2" /> Open Focus Panel
            </Button>
          </div>
        </div>
      </div>

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
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
        toggleAllDoToday={toggleAllDoToday}
        markAllTasksAsSkipped={markAllTasksAsSkipped}
        loading={tasksLoading}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />

      {taskToOverview && (
        <TaskDetailDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onUpdate={updateTask}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          allTasks={processedTasks}
          // Removed unused onAddSubtask
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          // Removed unused onOpenOverview
        />
      )}
    </PomodoroProvider>
  );
};

export default FocusMode;