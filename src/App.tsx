"use client";

import { useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import MyHub from "./pages/MyHub";
import Help from "./pages/Help";
import ProjectBalanceTracker from "./pages/ProjectBalanceTracker";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
// Removed Meditation and MindfulnessTools imports
import FocusMode from "./pages/FocusMode";
import LandingPage from "./pages/LandingPage";
import DailyTasksV3 from "./pages/DailyTasksV3";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ReminderProvider } from "@/context/ReminderContext.tsx";
import { SoundProvider } from "@/context/SoundContext";
import { Sidebar } from "./components/Sidebar";
import AuthPage from "./pages/AuthPage";
import FloatingTimer from "./components/FloatingTimer";
import DevSpace from "./pages/DevSpace";
import { TimerProvider } from "./context/TimerContext";
import TaskCalendar from "./pages/TaskCalendar";
import { SettingsProvider } from "./context/SettingsContext";
import Dashboard from "./pages/Dashboard";

// Removed imports for dedicated mindfulness tool pages

// Import new dedicated pages for MyHub sections
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Archive from "./pages/Archive";
import SleepPage from "./pages/SleepPage";
import CommandPalette from "./components/CommandPalette";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isDemoRoute = location.pathname.startsWith('/demo');
  const demoUserId = import.meta.env.VITE_DEMO_USER_ID;

  if (isDemoRoute && !demoUserId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <p className="text-destructive">Demo mode is not configured. Please set VITE_DEMO_USER_ID.</p>
      </div>
    );
  }

  if (isDemoRoute) {
    return (
      <SettingsProvider userId={demoUserId}>
        <div className="relative h-screen w-screen">
          <Sidebar isDemo={true} demoUserId={demoUserId}>
            <Routes>
              <Route path="/demo" element={<Dashboard isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/dashboard" element={<Dashboard isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/daily-tasks" element={<DailyTasksV3 isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/calendar" element={<TaskCalendar isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/my-hub" element={<MyHub isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/help" element={<Help />} />
              <Route path="/demo/projects" element={<ProjectBalanceTracker isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/schedule" element={<TimeBlockSchedule isDemo={true} demoUserId={demoUserId} />} />
              {/* Removed /demo/meditation route */}
              <Route path="/demo/sleep" element={<SleepPage isDemo={true} demoUserId={demoUserId} />} />
              {/* Removed /demo/mindfulness route and all sub-routes */}
              <Route path="/demo/focus" element={<FocusMode demoUserId={demoUserId} />} />
              <Route path="/demo/dev-space" element={<DevSpace isDemo={true} demoUserId={demoUserId} />} />
              
              <Route path="/demo/settings" element={<Settings isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/analytics" element={<Analytics isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/archive" element={<Archive isDemo={true} demoUserId={demoUserId} />} />

              <Route path="*" element={<Navigate to="/demo" replace />} />
            </Routes>
          </Sidebar>
        </div>
      </SettingsProvider>
    );
  }

  if (!user && location.pathname !== '/' && location.pathname !== '/auth') {
    return <Navigate to="/" replace />;
  }

  return (
    <SettingsProvider>
      <div className="flex-1 flex flex-col">
        {user ? (
          <div className="relative h-screen w-screen">
            <Sidebar>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/daily-tasks" element={<DailyTasksV3 />} />
                <Route path="/calendar" element={<TaskCalendar />} />
                <Route path="/my-hub" element={<MyHub />} />
                <Route path="/help" element={<Help />} />
                <Route path="/projects" element={<ProjectBalanceTracker />} />
                <Route path="/schedule" element={<TimeBlockSchedule />} />
                {/* Removed /meditation route */}
                <Route path="/sleep" element={<SleepPage />} />
                {/* Removed /mindfulness route and all sub-routes */}
                <Route path="/focus" element={<FocusMode />} />
                <Route path="/dev-space" element={<DevSpace />} />
                
                <Route path="/settings" element={<Settings />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/archive" element={<Archive />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Sidebar>
            <FloatingTimer />
            <CommandPalette
              isCommandPaletteOpen={isCommandPaletteOpen}
              setIsCommandPaletteOpen={setIsCommandPaletteOpen}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
            />
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </div>
    </SettingsProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-center" />
        <AuthProvider>
          <SoundProvider>
            <TimerProvider>
              <ReminderProvider>
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </ReminderProvider>
            </TimerProvider>
          </SoundProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;