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
import NextTaskCard from '@/components/NextTaskCard'; // Import NextTaskCard
import TaskDetailDialog from '@/components/TaskDetailDialog'; // Import TaskDetailDialog
import FocusTaskOverlay from '@/components/FocusTaskOverlay'; // Import FocusTaskOverlay
import { Task } from '@/hooks/useTasks'; // Import Task type

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
  currentDate: Date; // New prop
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>; // New prop
}

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen, currentDate, setCurrentDate }) => {
  const { user, loading: authLoading } = useAuth();
  const { tasks, nextAvailableTask, updateTask, deleteTask, userId, loading: tasksLoading } = useTasks({ currentDate, setCurrentDate }); // Get all tasks, nextAvailableTask and other task actions

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null); // Use Task type
  const [isFocusOverlayOpen, setIsFocusOverlayOpen] = useState(false); // State for the focus overlay

  // State for manually set focus task
  const [manualFocusTaskId, setManualFocusTaskId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('manualFocusTaskId');
    }
    return null;
  });

  // Persist manualFocusTaskId to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (manualFocusTaskId) {
        localStorage.setItem('manualFocusTaskId', manualFocusTaskId);
      } else {
        localStorage.removeItem('manualFocusTaskId');
      }
    }
  }, [manualFocusTaskId]);

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
      setManualFocusTaskId(null);
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

  const handleSetAsFocusTask = (taskId: string) => {
    setManualFocusTaskId(taskId);
    setIsFocusOverlayOpen(true); // Open overlay immediately
  };

  const handleClearManualFocus = () => {
    setManualFocusTaskId(null);
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
      {user ? ( // Use user from useAuth
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
              task={taskForOverlay} // Use taskForOverlay
              onMarkComplete={handleMarkNextTaskComplete} 
              onEditTask={handleEditNextTask} 
              currentDate={currentDate}
              loading={tasksLoading} // Pass loading state
              onCardClick={handleOpenFocusOverlay} // Pass the new handler
              onSetAsFocusTask={handleSetAsFocusTask} // Pass new prop
              isManualFocus={!!manualFocusTaskId} // Indicate if it's manually set
            />
            <TaskList 
              setIsAddTaskOpen={setIsAddTaskOpen} 
              currentDate={currentDate} 
              setCurrentDate={setCurrentDate} 
              onSetAsFocusTask={handleSetAsFocusTask} // Pass new prop
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
              onSetAsFocusTask={handleSetAsFocusTask} // Pass new prop
            />
          )}
          <FocusTaskOverlay 
            task={taskForOverlay} // Use taskForOverlay
            isOpen={isFocusOverlayOpen} 
            onClose={handleCloseFocusOverlay} 
            onClearManualFocus={handleClearManualFocus} // Pass new prop
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