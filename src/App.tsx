import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { Sidebar } from '@/components/Sidebar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { SoundProvider } from '@/context/SoundContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import Dashboard from '@/pages/Dashboard';
import DailyTasksPage from '@/pages/DailyTasksPage';
import Schedule from '@/pages/Schedule';
import Projects from '@/pages/Projects';
import Analytics from '@/pages/Analytics';
import Archive from '@/pages/Archive';
import Settings from '@/pages/Settings';
import Help from '@/pages/Help';
import Login from '@/pages/Login';
import FocusMode from '@/pages/FocusMode';
import Sleep from '@/pages/Sleep';
import DevSpace from '@/pages/DevSpace';
import MealPlanner from '@/pages/MealPlanner';
import ResonanceGoals from '@/pages/ResonanceGoals';
import { supabase } from '@/integrations/supabase/client';
import FloatingTimer from '@/components/FloatingTimer';
import { TimerProvider } from '@/context/TimerContext';
import CommandPalette from '@/components/CommandPalette';

const queryClient = new QueryClient();

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Demo user logic
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoUserId, setDemoUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkDemoMode = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsDemoMode(true);
        setDemoUserId('demo-user-id'); // A consistent ID for demo mode
      } else {
        setIsDemoMode(false);
        setDemoUserId(null);
      }
    };
    checkDemoMode();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsDemoMode(true);
        setDemoUserId('demo-user-id');
      } else {
        setIsDemoMode(false);
        setDemoUserId(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <Sidebar isDemo={isDemoMode}>
      <Routes>
        {isDemoMode ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/demo/dashboard" element={<Dashboard isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/daily-tasks" element={<DailyTasksPage isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/schedule" element={<Schedule isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/projects" element={<Projects isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/analytics" element={<Analytics isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/archive" element={<Archive isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/settings" element={<Settings isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/help" element={<Help />} />
            <Route path="/demo/focus" element={<FocusMode isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/sleep" element={<Sleep isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/dev-space" element={<DevSpace isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/meal-planner" element={<MealPlanner isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/resonance-goals" element={<ResonanceGoals isDemo={true} demoUserId={demoUserId} />} />
            <Route path="*" element={<Navigate to="/demo/dashboard" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/daily-tasks" element={<DailyTasksPage />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/focus" element={<FocusMode />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/dev-space" element={<DevSpace />} />
            <Route path="/meal-planner" element={<MealPlanner />} />
            <Route path="/resonance-goals" element={<ResonanceGoals />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
      <FloatingTimer />
      <CommandPalette isCommandPaletteOpen={isCommandPaletteOpen} setIsCommandPaletteOpen={setIsCommandPaletteOpen} />
    </Sidebar>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <SoundProvider>
              <TimerProvider>
                <TooltipProvider>
                  <Router>
                    <AppRoutes />
                    <Toaster richColors />
                  </Router>
                </TooltipProvider>
              </TimerProvider>
            </SoundProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;