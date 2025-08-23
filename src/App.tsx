import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { SettingsProvider } from '@/context/SettingsContext';
import { SoundProvider } from "@/context/SoundContext";
import Sidebar from "./components/Sidebar"; // Corrected import to default
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import DailyTasksV3 from "./pages/DailyTasksV3";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
import FocusMode from "./pages/FocusMode";
import SleepPage from "./pages/SleepPage";
import DevSpace from "./pages/DevSpace";
import PeopleMemory from "./pages/PeopleMemory";
import Archive from "./pages/Archive";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import TaskCalendar from "./pages/TaskCalendar";
import { CommandPalette } from './components/CommandPalette'; // Keep as named import
import {
  DashboardProps,
  DailyTasksV3Props,
  FocusModeProps,
  DevSpaceProps,
  SettingsProps,
  AnalyticsProps,
  ArchiveProps,
  SleepPageProps,
  MyHubProps,
  TaskCalendarProps,
  TimeBlockScheduleProps,
} from './types'; // Import all necessary props interfaces
import { startOfDay } from 'date-fns';

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));

  // Hardcoded demo user ID
  const demoUserId = 'd889323b-350c-4764-9788-6359f85f6142';

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading authentication...</div>;
  }

  // Determine if the current user is the demo user
  const isDemoUser = user?.id === demoUserId;

  return (
    <SettingsProvider> {/* Removed userId prop as it's handled internally by useUserSettings */}
      <div className="relative h-screen w-screen flex overflow-hidden">
        {user && (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            isDemo={isDemoUser}
            demoUserId={demoUserId}
            setIsCommandPaletteOpen={setIsCommandPaletteOpen}
          />
        )}
        <main className={`flex-1 overflow-auto transition-all duration-300 ${user ? (isSidebarCollapsed ? 'ml-16' : 'ml-60') : 'ml-0'}`}>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthPage />} />
            <Route path="/demo" element={<Dashboard isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/dashboard" element={<Dashboard isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/daily-tasks" element={<DailyTasksV3 isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/time-block-schedule" element={<TimeBlockSchedule isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/focus" element={<FocusMode demoUserId={demoUserId} />} />
            <Route path="/demo/sleep-management" element={<SleepPage isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/dev-space" element={<DevSpace isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/people-memory" element={<PeopleMemory isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/archive" element={<Archive isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/settings" element={<Settings isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/analytics" element={<Analytics isDemo={true} demoUserId={demoUserId} />} />
            <Route path="/demo/task-calendar" element={<TaskCalendar isDemo={true} demoUserId={demoUserId} />} />
            {/* Protected Routes */}
            {user ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/daily-tasks" element={<DailyTasksV3 />} />
                <Route path="/time-block-schedule" element={<TimeBlockSchedule />} />
                <Route path="/focus-mode" element={<FocusMode />} />
                <Route path="/sleep-management" element={<SleepPage />} />
                <Route path="/dev-space" element={<DevSpace />} />
                <Route path="/people-memory" element={<PeopleMemory />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/task-calendar" element={<TaskCalendar />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/auth" />} />
            )}
          </Routes>
        </main>

        {user && (
          <CommandPalette
            isCommandPaletteOpen={isCommandPaletteOpen}
            setIsCommandPaletteOpen={setIsCommandPaletteOpen}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        )}
      </div>
    </SettingsProvider>
  );
};

const App: React.FC = () => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SoundProvider>
          <AppContent />
        </SoundProvider>
      </AuthProvider>
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </Router>
);

export default App;