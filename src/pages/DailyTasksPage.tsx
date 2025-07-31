import React, { useState, useRef, useEffect } from 'react';
import DateNavigator from '@/components/DateNavigator';
import NextTaskCard from '@/components/NextTaskCard';
import TaskList from '@/components/TaskList';
import { MadeWithDyad } from '@/components/made-with-dyad';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { addDays, startOfDay } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette'; // Import CommandPalette

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const DailyTasksPage: React.FC = () => {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { user } = useAuth();

  const { tasks, filteredTasks, nextAvailableTask, updateTask, deleteTask, userId, loading: tasksLoading, sections, allCategories } = useTasks({ currentDate, setCurrentDate });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null); // Ref for the search input

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
    setIsTaskOverviewOpen(false);
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  // Keyboard shortcuts for DailyTasksPage
  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    't': handleGoToToday,
    'cmd+f': (e) => { e.preventDefault(); searchInputRef.current?.focus(); }, // Cmd+F to focus search
    'ctrl+f': (e) => { e.preventDefault(); searchInputRef.current?.focus(); }, // Ctrl+F to focus search
  };

  useKeyboardShortcuts(shortcuts);

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
          onEditTask={handleOpenOverview}
          currentDate={currentDate}
          loading={tasksLoading}
        />
        <TaskList
          setIsAddTaskOpen={setIsAddTaskOpen}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          searchRef={searchInputRef} // Pass the ref to TaskList
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
          allTasks={tasks}
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
      {/* CommandPalette is now rendered here, receiving props from DailyTasksPage */}
      <CommandPalette
        isAddTaskOpen={isAddTaskOpen}
        setIsAddTaskOpen={setIsAddTaskOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />
    </>
  );
};

export default DailyTasksPage;