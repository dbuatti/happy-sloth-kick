import React, { useState } from 'react';
import DateNavigator from '@/components/DateNavigator';
import NextTaskCard from '@/components/NextTaskCard';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import new overview dialog
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays, startOfDay } from 'date-fns';

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const DailyTasksPage: React.FC = () => {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { user } = useAuth();

  const { tasks, filteredTasks, nextAvailableTask, updateTask, deleteTask, userId, loading: tasksLoading, sections, allCategories } = useTasks({ currentDate, setCurrentDate });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false); // New state for overview dialog
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null); // Task for overview dialog

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => {
      const newDate = getUTCStartOfDay(addDays(prevDate, -1));
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => {
      const newDate = getUTCStartOfDay(addDays(prevDate, 1));
      return newDate;
    });
  };

  const handleGoToToday = () => {
    const today = getUTCStartOfDay(new Date());
    setCurrentDate(today);
  };

  const handleMarkTaskComplete = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
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
    <>
      <main className="flex-grow p-4">
        <DateNavigator
          currentDate={currentDate}
          onPreviousDay={handlePreviousDay}
          onNextDay={handleNextDay}
          onGoToToday={handleGoToToday}
          setCurrentDate={setCurrentDate}
        />
        <NextTaskCard
          task={nextAvailableTask}
          onMarkComplete={handleMarkTaskComplete}
          onEditTask={handleOpenOverview} // NextTaskCard now opens overview
          currentDate={currentDate}
          loading={tasksLoading}
        />
        <TaskList
          setIsAddTaskOpen={setIsAddTaskOpen}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
      <div className="fixed bottom-4 right-4 z-50">
        <span className="bg-background text-muted-foreground text-sm px-3 py-2 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-200">
          <kbd className="font-mono">Cmd/Ctrl + K</kbd> for commands
        </span>
      </div>
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          userId={user?.id || null}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks} // Pass all tasks for subtask filtering
        />
      )}
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={user?.id || null}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
        />
      )}
    </>
  );
};

export default DailyTasksPage;