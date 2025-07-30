import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Archive from "./pages/Archive";
import ProductivityTimer from "./pages/ProductivityTimer";
import ProjectBalanceTracker from "./pages/ProjectBalanceTracker";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
import Meditation from "./pages/Meditation";
import SleepTracker from "./pages/SleepTracker";
import { AuthProvider, useAuth } from "@/context/AuthContext"; // Import useAuth
import CommandPalette from "./components/CommandPalette";
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import Sidebar from "./components/Sidebar";
import { UIProvider, useUI } from "@/context/UIContext";
import { SoundProvider } from "@/context/SoundContext";
import { addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTasks, Task } from '@/hooks/useTasks'; // Import useTasks to get necessary props
import { useNavigate, useLocation } from 'react-router-dom'; // Import useNavigate and useLocation
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts'; // Import useKeyboardShortcuts

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const queryClient = new QueryClient();

const AppContent = () => {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { isFocusModeActive, setIsFocusModeActive } = useUI();
  const { user, loading: authLoading } = useAuth(); // Destructure user and authLoading from useAuth

  // Get tasks, nextAvailableTask, updateTask, deleteTask, userId, loading from useTasks
  const { tasks, nextAvailableTask, updateTask, deleteTask, userId, loading: tasksLoading } = useTasks({ currentDate, setCurrentDate });

  const [manualFocusTaskId, setManualFocusTaskId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('manualFocusTaskId');
    }
    return null;
  });

  // NEW STATE: Store the task that is currently being focused in the overlay
  const [activeOverlayTask, setActiveOverlayTask] = useState<Task | null>(null);
  const [isFocusOverlayOpen, setIsFocusOverlayOpen] = useState(false);
  const [initialOverlayDuration, setInitialOverlayDuration] = useState<number | undefined>(undefined); // State for initial duration

  // State for TaskDetailDialog
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

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

  const onSetAsFocusTask = useCallback((taskId: string) => {
    setManualFocusTaskId(taskId);
    // When setting a new focus task, also set it as the activeOverlayTask
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setActiveOverlayTask(task);
    }
  }, [tasks]); // Depend on tasks to find the task object

  const onClearManualFocus = useCallback(() => {
    setManualFocusTaskId(null);
    setActiveOverlayTask(null); // Clear active overlay task as well
  }, []);

  const handleOpenFocusOverlay = useCallback((duration?: number) => {
    // Determine which task should be shown in the overlay
    let taskToShow: Task | null = null;
    if (manualFocusTaskId) {
      taskToShow = tasks.find(t => t.id === manualFocusTaskId) || null;
    } else {
      taskToShow = nextAvailableTask;
    }

    if (taskToShow) {
      setActiveOverlayTask(taskToShow); // Set the task for the overlay
      setInitialOverlayDuration(duration);
      setIsFocusOverlayOpen(true);
    }
  }, [manualFocusTaskId, nextAvailableTask, tasks]); // Add tasks to dependencies

  const handleCloseFocusOverlay = () => {
    setIsFocusOverlayOpen(false);
    setInitialOverlayDuration(undefined); // Clear duration when closing
    // Do NOT clear manualFocusTaskId here, as it might be intended to persist
    // The clear button in the overlay or command palette handles clearing manual focus.
  };

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

  const handleMarkTaskComplete = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
    // If the completed task was the manual focus, clear it
    if (manualFocusTaskId === taskId) {
      onClearManualFocus();
    }
    // If the completed task was the one currently in the overlay, clear it from overlay state
    if (activeOverlayTask?.id === taskId) {
      setActiveOverlayTask(null);
      setIsFocusOverlayOpen(false); // Close overlay if its task is completed
    }
  };

  const handleEditNextTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
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
              task={manualFocusTaskId ? tasks.find(t => t.id === manualFocusTaskId) || nextAvailableTask : nextAvailableTask} // Display manual focus task if set, else next available
              onMarkComplete={handleMarkTaskComplete}
              onEditTask={handleEditNextTask}
              currentDate={currentDate}
              loading={tasksLoading}
              onCardClick={() => handleOpenFocusOverlay()} // Open without specific duration
              onSetAsFocusTask={(taskId) => { onSetAsFocusTask(taskId); handleOpenFocusOverlay(); }} // Trigger overlay here
              isManualFocus={!!manualFocusTaskId}
              onClearManualFocus={onClearManualFocus}
              onOpenFocusOverlay={() => handleOpenFocusOverlay()} // Pass down to NextTaskCard
            />
            <TaskList
              setIsAddTaskOpen={setIsAddTaskOpen}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              onSetAsFocusTask={(taskId) => { onSetAsFocusTask(taskId); handleOpenFocusOverlay(); }} // Trigger overlay here
              manualFocusTaskId={manualFocusTaskId}
              onClearManualFocus={onClearManualFocus}
              onOpenFocusOverlay={() => handleOpenFocusOverlay()} // Pass down to TaskList
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
              onOpenFocusOverlay={() => handleOpenFocusOverlay()} // Pass down to TaskDetailDialog
            />
          )}
          <FocusTaskOverlay
            task={activeOverlayTask} // Use the stable activeOverlayTask
            isOpen={isFocusOverlayOpen}
            onClose={handleCloseFocusOverlay}
            onClearManualFocus={onClearManualFocus}
            onMarkComplete={handleMarkTaskComplete}
            initialTimerDurationMinutes={initialOverlayDuration}
            onSetIsFocusModeActive={setIsFocusModeActive}
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

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-right" />
        <AuthProvider>
          <UIProvider>
            <SoundProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </SoundProvider>
          </UIProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;