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
import { AuthProvider, useAuth } from "@/context/AuthContext";
import CommandPalette from "./components/CommandPalette";
import { useState, useEffect, useCallback } from 'react';
import Sidebar from "./components/Sidebar"; // Ensure Sidebar is imported
import { UIProvider, useUI } from "@/context/UIContext";
import { SoundProvider } from "@/context/SoundContext";
import { addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTasks, Task } from '@/hooks/useTasks';
import { useNavigate, useLocation } from 'react-router-dom';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import AuthComponent from "@/components/AuthComponent";
import DateNavigator from '@/components/DateNavigator';
import NextTaskCard from '@/components/NextTaskCard';
import TaskList from "@/components/TaskList";
import { MadeWithDyad } from "@/components/made-with-dyad";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import FocusTaskOverlay from "@/components/FocusTaskOverlay";

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const queryClient = new QueryClient();

const AppContent = () => {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { isFocusModeActive, setIsFocusModeActive } = useUI();
  const { user, loading: authLoading } = useAuth();

  const { tasks, nextAvailableTask, updateTask, deleteTask, userId, loading: tasksLoading } = useTasks({ currentDate, setCurrentDate });

  const [manualFocusTaskId, setManualFocusTaskId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('manualFocusTaskId');
    }
    return null;
  });

  const [activeOverlayTask, setActiveOverlayTask] = useState<Task | null>(null);
  const [isFocusOverlayOpen, setIsFocusOverlayOpen] = useState(false);
  const [initialOverlayDuration, setInitialOverlayDuration] = useState<number | undefined>(undefined);

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

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
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setActiveOverlayTask(task);
    }
  }, [tasks]);

  const onClearManualFocus = useCallback(() => {
    setManualFocusTaskId(null);
    setActiveOverlayTask(null);
  }, []);

  const handleOpenFocusOverlay = useCallback((duration?: number) => {
    let taskToShow: Task | null = null;
    if (manualFocusTaskId) {
      taskToShow = tasks.find(t => t.id === manualFocusTaskId) || null;
    } else {
      taskToShow = nextAvailableTask;
    }

    if (taskToShow) {
      setActiveOverlayTask(taskToShow);
      setInitialOverlayDuration(duration);
      setIsFocusOverlayOpen(true);
    }
  }, [manualFocusTaskId, nextAvailableTask, tasks]);

  const handleCloseFocusOverlay = () => {
    setIsFocusOverlayOpen(false);
    setInitialOverlayDuration(undefined);
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
    if (manualFocusTaskId === taskId) {
      onClearManualFocus();
    }
    if (activeOverlayTask?.id === taskId) {
      setActiveOverlayTask(null);
      setIsFocusOverlayOpen(false);
    }
  };

  const handleEditNextTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
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
    <div className="flex-1 flex flex-col">
      {user ? (
        <Sidebar> {/* Wrap content with Sidebar */}
          <Routes>
            <Route path="/" element={
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
                    onCardClick={() => handleOpenFocusOverlay()}
                    onSetAsFocusTask={(taskId) => { onSetAsFocusTask(taskId); handleOpenFocusOverlay(); }}
                    isManualFocus={!!manualFocusTaskId}
                    onClearManualFocus={onClearManualFocus}
                    onOpenFocusOverlay={() => handleOpenFocusOverlay()}
                  />
                  <TaskList
                    setIsAddTaskOpen={setIsAddTaskOpen}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onSetAsFocusTask={(taskId) => { onSetAsFocusTask(taskId); handleOpenFocusOverlay(); }}
                    manualFocusTaskId={manualFocusTaskId}
                    onClearManualFocus={onClearManualFocus}
                    onOpenFocusOverlay={() => handleOpenFocusOverlay()}
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
                    onSetAsFocusTask={(taskId) => { onSetAsFocusTask(taskId); handleOpenFocusOverlay(); }}
                    onClearManualFocus={onClearManualFocus}
                    onOpenFocusOverlay={() => handleOpenFocusOverlay()}
                  />
                )}
                <FocusTaskOverlay
                  task={activeOverlayTask}
                  isOpen={isFocusOverlayOpen}
                  onClose={handleCloseFocusOverlay}
                  onClearManualFocus={onClearManualFocus}
                  onMarkComplete={handleMarkTaskComplete}
                  initialTimerDurationMinutes={initialOverlayDuration}
                  onSetIsFocusModeActive={setIsFocusModeActive}
                />
              </>
            } />
            <Route path="/analytics" element={<Analytics currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/archive" element={<Archive currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
            <Route path="/focus" element={<ProductivityTimer currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
            <Route path="/projects" element={<ProjectBalanceTracker />} />
            <Route path="/schedule" element={<TimeBlockSchedule />} />
            <Route path="/meditation" element={<Meditation />} />
            <Route path="/sleep" element={<SleepTracker />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CommandPalette
            isAddTaskOpen={isAddTaskOpen}
            setIsAddTaskOpen={setIsAddTaskOpen}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            nextAvailableTask={nextAvailableTask}
            manualFocusTaskId={manualFocusTaskId}
            onSetAsFocusTask={onSetAsFocusTask}
            onClearManualFocus={onClearManualFocus}
          />
        </Sidebar>
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