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
import { AuthProvider } from "@/context/AuthContext";
import CommandPalette from "./components/CommandPalette";
import { useState } from 'react';
import Sidebar from "./components/Sidebar";
import { UIProvider } from "@/context/UIContext";
import { SoundProvider } from "@/context/SoundContext";
import { addDays, startOfDay } from 'date-fns';

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const queryClient = new QueryClient();

const App = () => {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-right" />
        <AuthProvider>
          <UIProvider>
            <SoundProvider>
              <BrowserRouter>
                <Sidebar>
                  <Routes>
                    <Route path="/" element={<Index setIsAddTaskOpen={setIsAddTaskOpen} currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
                    <Route path="/analytics" element={<Analytics currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/archive" element={<Archive currentDate={currentDate} setCurrentDate={setCurrentDate} />} />
                    <Route path="/focus" element={<ProductivityTimer currentDate={currentDate} setCurrentDate={setCurrentDate} />} /> {/* Updated route */}
                    <Route path="/projects" element={<ProjectBalanceTracker />} />
                    <Route path="/schedule" element={<TimeBlockSchedule />} />
                    <Route path="/meditation" element={<Meditation />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Sidebar>
                <CommandPalette isAddTaskOpen={isAddTaskOpen} setIsAddTaskOpen={setIsAddTaskOpen} currentDate={currentDate} setCurrentDate={setCurrentDate} />
              </BrowserRouter>
            </SoundProvider>
          </UIProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;