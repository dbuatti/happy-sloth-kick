import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import NotFound from "./pages/NotFound";
import MyHub from "./pages/MyHub";
import Help from "./pages/Help";
import ProjectBalanceTracker from "./pages/ProjectBalanceTracker";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
import Meditation from "./pages/Meditation";
import SleepTracker from "./pages/SleepTracker";
import MindfulnessTools from "./pages/MindfulnessTools";
import FocusMode from "./pages/FocusMode";
import DailyFlowPrototype from "./pages/DailyFlowPrototype";
import LandingPage from "./pages/LandingPage"; // Import new LandingPage
import DailyTasksPage from "./pages/DailyTasksPage"; // Import new DailyTasksPage
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ReminderProvider } from "@/context/ReminderContext";
import CommandPalette from "./components/CommandPalette";
import { useState, useEffect, useCallback } from 'react';
import Sidebar from "./components/Sidebar";
import { SoundProvider } from "@/context/SoundContext";
import { addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTasks, Task } from '@/hooks/useTasks';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import AuthComponent from "@/components/AuthComponent";
import DateNavigator from '@/components/DateNavigator';
import NextTaskCard from '@/components/NextTaskCard';
import TaskList from "@/components/TaskList";
import { MadeWithDyad } from "@/components/made-with-dyad";
import TaskDetailDialog from "@/components/TaskDetailDialog";

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const queryClient = new QueryClient();

const AppContent = () => {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // These hooks are now conditionally used or passed down
  const { tasks, nextAvailableTask, updateTask, deleteTask, userId, loading: tasksLoading } = useTasks({ currentDate, setCurrentDate });

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

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    't': handleGoToToday,
    'f': () => { /* Focus search input, if implemented */ },
  };

  useKeyboardShortcuts(shortcuts);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated and not on the landing page or auth page, redirect to landing
  if (!user && location.pathname !== '/' && location.pathname !== '/auth') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {user ? (
        <Sidebar>
          <Routes>
            <Route path="/" element={<LandingPage />} /> {/* New root route */}
            <Route path="/daily-tasks" element={<DailyTasksPage />} /> {/* New daily tasks route */}
            <Route path="/my-hub" element={<MyHub />} />
            <Route path="/help" element={<Help />} />
            <Route path="/projects" element={<ProjectBalanceTracker />} />
            <Route path="/schedule" element={<TimeBlockSchedule />} />
            <Route path="/meditation" element={<Meditation />} />
            <Route path="/sleep" element={<SleepTracker />} />
            <Route path="/mindfulness" element={<MindfulnessTools />} />
            <Route path="/focus" element={<FocusMode />} />
            <Route path="/daily-flow-prototype" element={<DailyFlowPrototype />} />
            <Route path="/auth" element={<AuthComponent />} /> {/* Keep auth component for direct access */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CommandPalette
            isAddTaskOpen={isAddTaskOpen}
            setIsAddTaskOpen={setIsAddTaskOpen}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        </Sidebar>
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthComponent />} />
          <Route path="*" element={<NotFound />} /> {/* Catch-all for unauthenticated users */}
        </Routes>
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
          <SoundProvider>
            <ReminderProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </ReminderProvider>
          </SoundProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;