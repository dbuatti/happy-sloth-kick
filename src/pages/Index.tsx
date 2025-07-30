import { useState, useEffect, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import AuthComponent from "@/components/AuthComponent";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from '@/hooks/useTasks';
import TaskList from "@/components/TaskList";
import DateNavigator from '@/components/DateNavigator';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import { addDays, startOfDay } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import NextTaskCard from '@/components/NextTaskCard';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import FocusTaskOverlay from '@/components/FocusTaskOverlay';
import { Task } from '@/hooks/useTasks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUI } from '@/context/UIContext';

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

interface IndexPageProps {
  setIsAddTaskOpen: (open: boolean) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  manualFocusTaskId: string | null;
  onSetAsFocusTask: (taskId: string) => void;
  onClearManualFocus: () => void;
  onOpenFocusOverlay: (duration?: number) => void;
}

const Index: React.FC<IndexPageProps> = ({
  setIsAddTaskOpen,
  currentDate,
  setCurrentDate,
  manualFocusTaskId,
  onSetAsFocusTask,
  onClearManualFocus,
  onOpenFocusOverlay,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { tasks, nextAvailableTask, updateTask, deleteTask, userId, loading: tasksLoading } = useTasks({ currentDate, setCurrentDate });

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
    if (manualFocusTaskId === taskId) {
      onClearManualFocus();
    }
  };

  const handleEditNextTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    't': handleGoToToday, // Added shortcut for 'Today'
    'f': () => { /* Focus search input, if implemented */ }, // Placeholder for 'Focus search'
  };

  useKeyboardShortcuts(shortcuts);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          task={manualFocusTaskId ? tasks.find(t => t.id === manualFocusTaskId) || nextAvailableTask : nextAvailableTask}
          onMarkComplete={handleMarkTaskComplete}
          onEditTask={handleEditNextTask}
          currentDate={currentDate}
          loading={tasksLoading}
          onCardClick={() => onOpenFocusOverlay()}
          onSetAsFocusTask={onSetAsFocusTask}
          isManualFocus={!!manualFocusTaskId}
          onClearManualFocus={onClearManualFocus}
          onOpenFocusOverlay={onOpenFocusOverlay}
        />
        <TaskList
          setIsAddTaskOpen={setIsAddTaskOpen}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onSetAsFocusTask={onSetAsFocusTask}
          manualFocusTaskId={manualFocusTaskId}
          onClearManualFocus={onClearManualFocus}
          onOpenFocusOverlay={onOpenFocusOverlay}
        />
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
      <div className="fixed bottom-4 right-4 z-50">
        <span className="bg-background text-muted-foreground text-sm px-3 py-2 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-200">
          Press <kbd className="font-mono">Cmd/Ctrl + K</kbd> for commands
        </span>
      </div>
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={userId}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onSetAsFocusTask={onSetAsFocusTask}
          onClearManualFocus={onClearManualFocus}
          onOpenFocusOverlay={onOpenFocusOverlay}
        />
      )}
    </>
  );
};

export default Index;