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
import Meditation from "./pages/Meditation";
import MindfulnessTools from "./pages/MindfulnessTools";
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

// Import new dedicated mindfulness tool pages
import BodyScanMeditationPage from "./pages/mindfulness/BodyScanMeditationPage";
import MindfulEatingGuidePage from "./pages/mindfulness/MindfulEatingGuidePage";
import ProgressiveMuscleRelaxationPage from "./pages/mindfulness/ProgressiveMuscleRelaxationPage";
import GuidedImageryPage from "./pages/mindfulness/GuidedImageryPage";
import ThoughtDiffusionToolPage from "./pages/mindfulness/ThoughtDiffusionToolPage";
import SensoryToolPage from "./pages/mindfulness/SensoryToolPage";
import BreathingBubblePage from "./pages/mindfulness/BreathingBubblePage";

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
              <Route path="/demo/meditation" element={<Meditation />} />
              <Route path="/demo/sleep" element={<SleepPage isDemo={true} demoUserId={demoUserId} />} />
              <Route path="/demo/mindfulness" element={<MindfulnessTools isDemo={true} />} />
              <Route path="/demo/focus" element={<FocusMode demoUserId={demoUserId} />} />
              <Route path="/demo/dev-space" element={<DevSpace isDemo={true} demoUserId={demoUserId} />} />
              
              <Route path="/demo/mindfulness/body-scan" element={<BodyScanMeditationPage />} />
              <Route path="/demo/mindfulness/mindful-eating" element={<MindfulEatingGuidePage />} />
              <Route path="/demo/mindfulness/pmr" element={<ProgressiveMuscleRelaxationPage />} />
              <Route path="/demo/mindfulness/guided-imagery" element={<GuidedImageryPage />} />
              <Route path="/demo/mindfulness/thought-diffusion" element={<ThoughtDiffusionToolPage />} />
              <Route path="/demo/mindfulness/sensory-tool" element={<SensoryToolPage />} />
              <Route path="/demo/mindfulness/breathing-bubble" element={<BreathingBubblePage />} />

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
                <Route path="/meditation" element={<Meditation />} />
                <Route path="/sleep" element={<SleepPage />} />
                <Route path="/mindfulness" element={<MindfulnessTools />} />
                <Route path="/focus" element={<FocusMode />} />
                <Route path="/dev-space" element={<DevSpace />} />
                
                <Route path="/mindfulness/body-scan" element={<BodyScanMeditationPage />} />
                <Route path="/mindfulness/mindful-eating" element={<MindfulEatingGuidePage />} />
                <Route path="/mindfulness/pmr" element={<ProgressiveMuscleRelaxationPage />} />
                <Route path="/mindfulness/guided-imagery" element={<GuidedImageryPage />} />
                <Route path="/mindfulness/thought-diffusion" element={<ThoughtDiffusionToolPage />} />
                <Route path="/mindfulness/sensory-tool" element={<SensoryToolPage />} />
                <Route path="/mindfulness/breathing-bubble" element={<BreathingBubblePage />} />

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