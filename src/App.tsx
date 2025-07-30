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
import ProductivityTimer from "./pages/ProductivityTimer"; // Updated import
import ProjectBalanceTracker from "./pages/ProjectBalanceTracker";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
import Meditation from "./pages/Meditation";
import SleepTracker from "./pages/SleepTracker"; // New import
import { AuthProvider } from "@/context/AuthContext";
import CommandPalette from "./components/CommandPalette";
import { useState } from 'react';
import Sidebar from "./components/Sidebar";
import { UIProvider, useUI } from "@/context/UIContext"; // Import useUI
import { SoundProvider } from "@/context/SoundContext";
import { addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils'; // Import cn
import { useTasks } from '@/hooks/useTasks'; // Import useTasks to get necessary props

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const queryClient = new QueryClient();

const AppContent = () => {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const { isFocusModeActive } = useUI(); // Use the UI context

  // Use useTasks here to get nextAvailableTask, manualFocusTaskId, onSetAsFocusTask, onClearManualFocus
  // Pass currentDate and setCurrentDate to useTasks as well, as it's a dependency for task filtering
  const { nextAvailableTask, manualFocusTaskId, onSetAsFocusTask, onClearManualFocus } = useTasks({ currentDate, setCurrentDate });

  return (
    <BrowserRouter>
      <Sidebar>
        <div className={cn(
          "flex-1 flex flex-col",
          isFocusModeActive && "border-l-4 border-primary-foreground" // Visual cue for focus mode
        )}>
          <Routes>
            <Route path="/" element={<Index setIsAddTaskOpen={setIsAddTaskOpen} currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
            <Route path="/analytics" element={<Analytics currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/archive" element={<Archive currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
            <Route path="/focus" element={<ProductivityTimer currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
            <Route path="/projects" element={<ProjectBalanceTracker />} />
            <Route path="/schedule" element={<TimeBlockSchedule />} />
            <Route path="/meditation" element={<Meditation />} />
            <Route path="/sleep" element={<SleepTracker />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Sidebar>
      <CommandPalette 
        isAddTaskOpen={isAddTaskOpen} 
        setIsAddTaskOpen={setIsAddTaskOpen} 
        currentDate={currentDate} 
        setCurrentDate={setCurrentDate} 
        nextAvailableTask={nextAvailableTask} // Pass nextAvailableTask
        manualFocusTaskId={manualFocusTaskId} // Pass manualFocusTaskId
        onSetAsFocusTask={onSetAsFocusTask} // Pass onSetAsFocusTask
        onClearManualFocus={onClearManualFocus} // Pass onClearManualFocus
      />
    </BrowserRouter>
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
              <AppContent />
            </SoundProvider>
          </UIProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;