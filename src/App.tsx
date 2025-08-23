import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { SoundProvider } from './context/SoundContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyTasks from './pages/Index'; // Renamed to Index to avoid conflict with component
import FocusMode from './pages/FocusMode';
import DevSpace from "./pages/DevSpace";
import PeopleMemory from "./pages/PeopleMemory";
import Archive from "./pages/Archive";
import Settings from "./pages/Settings";
import SleepPage from "./pages/SleepPage";
import MyHub from "./pages/MyHub";
import TaskCalendar from "./pages/TaskCalendar";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
import CommandPalette from './components/CommandPalette';

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

const queryClient = new QueryClient();

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // For command palette date context

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route
          path="*"
          element={
            user ? (
              <div className="flex h-screen">
                {/* Sidebar component would go here */}
                <div className="flex-1 overflow-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/daily-tasks" element={<DailyTasks />} />
                    <Route path="/task-calendar" element={<TaskCalendar />} />
                    <Route path="/time-block-schedule" element={<TimeBlockSchedule />} />
                    <Route path="/focus-mode" element={<FocusMode />} />
                    <Route path="/sleep-tracker" element={<SleepPage />} />
                    <Route path="/dev-space" element={<DevSpace />} />
                    <Route path="/people-memory" element={<PeopleMemory />} />
                    <Route path="/archive" element={<Archive />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/my-hub" element={<MyHub />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </div>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
      <CommandPalette
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <SoundProvider>
            <Toaster />
            <AppRoutes />
            <ReactQueryDevtools initialIsOpen={false} />
          </SoundProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;