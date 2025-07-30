import { useState, useEffect } from 'react';
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

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  manualFocusTaskId: string | null; // New prop
  onSetAsFocusTask: (taskId: string) => void; // New prop
  onClearManualFocus: () => void; // New prop
}

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen, currentDate, setCurrentDate, manualFocusTaskId, onSetAsFocusTask, onClearManualFocus }) => {
  const { user, loading: authLoading } = useAuth();
  // Get tasks, nextAvailableTask, updateTask, deleteTask, userId, loading from useTasks
  const { tasks, nextAvailableTask, updateTask, deleteTask, userId, loading: tasksLoading } = useTasks({ currentDate, setCurrentDate });

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFocusOverlayOpen, setIsFocusOverlayOpen] = useState(false);

  // Determine the task to show in the overlay
  const manualFocusTask = manualFocusTaskId ? tasks.find(t => t.id === manualFocusTaskId) : null;
  const taskForOverlay = manualFocusTask || nextAvailableTask;

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => {
      const newDate = getUTCStartOfDay(addDays(prevDate, -1));
      console.log('Index.tsx: Navigating to previous day. New currentDate:', newDate.toISOString());
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => {
      const newDate = getUTCStartOfDay(addDays(prevDate, 1));
      console.log('Index.tsx: Navigating to next day. New currentDate:', newDate.toISOString());
      return newDate;
    });
  };

  const handleGoToToday = () => {
    const today = getUTCStartOfDay(new Date());
    console.log('Index.tsx: Navigating to today. New currentDate:', today.toISOString());
    setCurrentDate(today);
  };

  const handleMarkNextTaskComplete = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
    // If the completed task was the manual focus, clear it
    if (manualFocusTaskId === taskId) {
      onClearManualFocus();
    }
  };

  const handleEditNextTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleOpenFocusOverlay = () => {
    if (taskForOverlay) {
      setIsFocusOverlayOpen(true);
    }
  };

  const handleCloseFocusOverlay = () => {
    setIsFocusOverlayOpen(false);
  };

  // Define keyboard shortcuts
  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
  };

  // Apply keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {user ? (
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
              task={taskForOverlay}
              onMarkComplete={handleMarkNextTaskComplete} 
              onEditTask={handleEditNextTask} 
              currentDate={currentDate}
              loading={tasksLoading}
              onCardClick={handleOpenFocusOverlay}
              onSetAsFocusTask={(taskId) => { onSetAsFocusTask(taskId); handleOpenFocusOverlay(); }} // Trigger overlay here
              isManualFocus={!!manualFocusTaskId}
              onClearManualFocus={onClearManualFocus}
              onOpenFocusOverlay={handleOpenFocusOverlay}
            />
            <TaskList 
              setIsAddTaskOpen={setIsAddTaskOpen} 
              currentDate={currentDate} 
              setCurrentDate={setCurrentDate} 
              onSetAsFocusTask={(taskId) => { onSetAsFocusTask(taskId); handleOpenFocusOverlay(); }} // Trigger overlay here
              manualFocusTaskId={manualFocusTaskId}
              onClearManualFocus={onClearManualFocus}
              onOpenFocusOverlay={handleOpenFocusOverlay} // Pass down to TaskList
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
              onSetAsFocusTask={(taskId) => { onSetAsFocusTask(taskId); handleOpenFocusOverlay(); }} // Trigger overlay here
              onClearManualFocus={onClearManualFocus}
              onOpenFocusOverlay={handleOpenFocusOverlay} // Pass down to TaskDetailDialog
            />
          )}
          <FocusTaskOverlay 
            task={taskForOverlay}
            isOpen={isFocusOverlayOpen} 
            onClose={handleCloseFocusOverlay} 
            onClearManualFocus={onClearManualFocus}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthComponent />
        </div>
      )}
    </div>
  );
};

export default Index;