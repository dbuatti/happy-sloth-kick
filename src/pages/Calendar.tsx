import React, { useState } from 'react';
import DailyScheduleView from '@/components/DailyScheduleView';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { Task } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useWorkHours } from '@/hooks/useWorkHours';
import { CalendarPageProps } from '@/types/props';

const CalendarPage: React.FC<CalendarPageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);

  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const {
    tasks,
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
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks({ userId: userId, currentDate: currentViewDate, viewMode: 'all' });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments({ userId });

  const {
    allWorkHours,
    isLoading: workHoursLoading,
    error: workHoursError,
    saveWorkHours,
  } = useWorkHours({ userId });

  const isLoading = tasksLoading || appointmentsLoading || workHoursLoading;
  const error = tasksError || appointmentsError || workHoursError;

  const handleOpenTaskOverview = (task: Task) => {
    setSelectedTask(task);
    setIsOverviewOpen(true);
  };

  const handleOpenTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleOpenFocusView = (task: Task) => {
    setSelectedTask(task);
    setIsFocusViewOpen(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus): Promise<Task | null> => {
    return updateTask(taskId, { status: newStatus });
  };

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold p-4 md:p-6">Calendar</h1>
      <DailyScheduleView
        isDemo={isDemo}
        onOpenTaskOverview={handleOpenTaskOverview}
        currentViewDate={currentViewDate}
        allWorkHours={allWorkHours}
        saveWorkHours={saveWorkHours}
        appointments={appointments}
        tasks={tasks}
        sections={sections}
        categories={allCategories}
        addAppointment={addAppointment}
        updateAppointment={updateAppointment}
        deleteAppointment={deleteAppointment}
        onAddTask={handleAddTask}
        onUpdateTask={updateTask}
        onOpenTaskDetail={handleOpenTaskDetail}
        isLoading={isLoading}
      />

      <TaskOverviewDialog
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        task={selectedTask}
        onOpenDetail={handleOpenTaskDetail}
        onOpenFocusView={handleOpenFocusView}
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

      {isFocusViewOpen && selectedTask && (
        <FullScreenFocusView
          task={selectedTask}
          onClose={() => setIsFocusViewOpen(false)}
          onComplete={() => {
            updateTask(selectedTask.id, { status: 'completed' });
            setIsFocusViewOpen(false);
          }}
          onSkip={() => {
            updateTask(selectedTask.id, { status: 'skipped' });
            setIsFocusViewOpen(false);
          }}
          onOpenDetail={handleOpenTaskDetail}
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
      )}
    </div>
  );
};

export default CalendarPage;