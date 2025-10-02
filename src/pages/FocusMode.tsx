import React, { useState, useCallback } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Target, Plus } from 'lucide-react';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import AddTaskDialog from '@/components/AddTaskDialog';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface FocusModeProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const { settings: userSettings } = useSettings(); // userSettings is used in useTasks hook via context
  const userId = isDemo ? demoUserId : user?.id;

  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(true); // Focus mode starts open
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [preselectedParentTaskId, setPreselectedParentTaskId] = useState<string | null>(null);
  const [preselectedSectionIdForSubtask, setPreselectedSectionIdForSubtask] = useState<string | null>(null);

  const currentDate = new Date(); // Focus mode always uses current date

  const {
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    // loading: tasksLoading, // Removed: declared but never read
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
    toggleAllDoToday,
    markAllTasksAsSkipped,
  } = useTasks({
    currentDate,
    userId,
    viewMode: 'focus',
  });

  const { appointments: allAppointments } = useAllAppointments();

  // const scheduledTasksMap = useMemo(() => { // Removed: declared but never read
  //   const map = new Map<string, Appointment>();
  //   allAppointments.forEach((app: Appointment) => {
  //     if (app.task_id) {
  //       map.set(app.task_id, app);
  //     }
  //   });
  //   return map;
  // }, [allAppointments]);

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const openAddTaskDialog = useCallback((parentTaskId: string | null = null, sectionId: string | null = null) => {
    setPreselectedParentTaskId(parentTaskId);
    setPreselectedSectionIdForSubtask(sectionId);
    setIsAddTaskDialogOpen(true);
  }, []);

  const closeAddTaskDialog = useCallback(() => {
    setIsAddTaskDialogOpen(false);
    setPreselectedParentTaskId(null);
    setPreselectedSectionIdForSubtask(null);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Target className="h-7 w-7 text-primary" /> Focus Mode
      </h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Stay productive by focusing on one task at a time. Your next available task is highlighted.
      </p>

      <Button onClick={() => setIsFocusPanelOpen(true)} className="mb-4">
        <Target className="h-4 w-4 mr-2" /> Open Focus Panel
      </Button>

      <Button variant="outline" onClick={() => openAddTaskDialog()} disabled={isDemo}>
        <Plus className="h-4 w-4 mr-2" /> Add New Task
      </Button>

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        // nextAvailableTask={nextAvailableTask} // Removed: not used in FocusPanelDrawer
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
          onAddSubtask={openAddTaskDialog}
        />
      )}

      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onClose={closeAddTaskDialog}
        onSave={handleAddTask}
        sections={sections}
        allCategories={allCategories}
        currentDate={currentDate}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks}
        preselectedParentTaskId={preselectedParentTaskId}
        preselectedSectionId={preselectedSectionIdForSubtask}
      />
    </div>
  );
};

export default FocusMode;