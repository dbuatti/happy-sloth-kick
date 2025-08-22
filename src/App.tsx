import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './context/SoundContext';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import MyHubPage from './pages/MyHub';
import CalendarPage from './pages/Calendar';
import ArchivePage from './pages/Archive';
import SettingsPage from './pages/Settings';
import HelpPage from './pages/Help';
import ProjectBalanceTrackerPage from './pages/ProjectBalanceTracker';
import DailyTasksV3Page from './pages/DailyTasksV3';
import TaskCalendarPage from './pages/TaskCalendar';
import TimeBlockSchedulePage from './pages/TimeBlockSchedule';
import FocusModePage from './pages/FocusMode';
import SleepPage from './pages/SleepPage';
import SleepDiaryView from './pages/SleepDiaryView';
import LandingPage from './pages/LandingPage';
import { useIsMobile } from './hooks/useIsMobile';
import { Menu, LayoutDashboard, ListTodo, Calendar, Archive, Settings, HelpCircle, LogOut } from 'lucide-react';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode; isDemo?: boolean; demoUserId?: string }> = ({ children, isDemo, demoUserId }) => {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!user && !isDemo) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const isDemoUser = user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Toaster />
      <Sidebar isDemo={isDemoUser} demoUserId={isDemoUser ? user?.id : undefined} />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 md:pl-0 md:ml-[220px] lg:ml-[280px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs">
                <nav className="grid gap-6 text-lg font-medium">
                  <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
                    <span>My Productivity App</span>
                  </Link>
                  <Link to={isDemoUser ? '/demo/dashboard' : '/dashboard'} className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>
                  <Link to={isDemoUser ? '/demo/my-hub' : '/my-hub'} className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                    <ListTodo className="h-5 w-5" />
                    My Hub
                  </Link>
                  <Link to={isDemoUser ? '/demo/calendar' : '/calendar'} className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                    <Calendar className="h-5 w-5" />
                    Calendar
                  </Link>
                  <Link to={isDemoUser ? '/demo/archive' : '/archive'} className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                    <Archive className="h-5 w-5" />
                    Archive
                  </Link>
                  <Link to="/settings" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                    <Settings className="h-5 w-5" />
                    Settings
                  </Link>
                  <Link to="/help" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-5 w-5" />
                    Help
                  </Link>
                  {user && (
                    <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
                      <LogOut className="h-5 w-5 mr-2" /> Log Out
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          )}
          <CommandPalette />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/my-hub" element={<PrivateRoute><MyHubPage /></PrivateRoute>} />
            <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
            <Route path="/archive" element={<PrivateRoute><ArchivePage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
            <Route path="/help" element={<PrivateRoute><HelpPage /></PrivateRoute>} />
            <Route path="/project-balance-tracker" element={<PrivateRoute><ProjectBalanceTrackerPage /></PrivateRoute>} />
            <Route path="/daily-tasks-v3" element={<PrivateRoute><DailyTasksV3Page /></PrivateRoute>} />
            <Route path="/task-calendar" element={<PrivateRoute><TaskCalendarPage /></PrivateRoute>} />
            <Route path="/time-block-schedule" element={<PrivateRoute><TimeBlockSchedulePage /></PrivateRoute>} />
            <Route path="/focus-mode" element={<PrivateRoute><FocusModePage /></PrivateRoute>} />
            <Route path="/sleep" element={<PrivateRoute><SleepPage /></PrivateRoute>} />
            <Route path="/sleep-diary-view" element={<PrivateRoute><SleepDiaryView /></PrivateRoute>} />

            {/* Demo Routes */}
            <Route path="/demo/dashboard" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><DashboardPage isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/my-hub" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><MyHubPage isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/calendar" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><CalendarPage isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/archive" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><ArchivePage isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/daily-tasks-v3" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><DailyTasksV3Page isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/task-calendar" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><TaskCalendarPage isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/time-block-schedule" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><TimeBlockSchedulePage isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/focus-mode" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><FocusModePage isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/sleep" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><SleepPage isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
            <Route path="/demo/sleep-diary-view" element={<PrivateRoute isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142"><SleepDiaryView isDemo={true} demoUserId="d889323b-350c-4764-9788-6359f85f6142" /></PrivateRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <SoundProvider>
          <Router>
            <AppContent />
          </Router>
        </SoundProvider>
      </AuthProvider>
    </ThemeProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export default App;