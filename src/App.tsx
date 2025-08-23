import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { SoundProvider } from './context/SoundContext';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Index from './pages/Index';
import FocusMode from './pages/FocusMode';
import DevSpace from "./pages/DevSpace";
import PeopleMemory from "./pages/PeopleMemory";
import Archive from "./pages/Archive";
import Settings from "./pages/Settings";
import SleepPage from "./pages/SleepPage";
import MyHub from "./pages/MyHub";
import TaskCalendar from "./pages/TaskCalendar";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
import Analytics from "./pages/Analytics";
import ProjectBalanceTracker from "./pages/ProjectBalanceTracker";

import {
  DashboardProps,
  FocusModeProps,
  DevSpaceProps,
  SettingsProps,
  ArchiveProps,
  SleepPageProps,
  MyHubProps,
  TaskCalendarProps,
  TimeBlockScheduleProps,
  ProjectBalanceTrackerProps,
  IndexProps,
} from './types'; // Import all necessary props interfaces

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // For CommandPalette date context

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <SoundProvider>
            <Router>
              <Toaster />
              <div className="flex h-screen">
                <Sidebar
                  isCollapsed={isSidebarCollapsed}
                  setIsCollapsed={setIsSidebarCollapsed}
                  setIsCommandPaletteOpen={setIsCommandPaletteOpen}
                />
                <main className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                  <CommandPalette
                    isCommandPaletteOpen={isCommandPaletteOpen}
                    setIsCommandPaletteOpen={setIsCommandPaletteOpen}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                  />
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<PrivateRoute><Index /></PrivateRoute>} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/focus-mode" element={<PrivateRoute><FocusMode /></PrivateRoute>} />
                    <Route path="/dev-space" element={<PrivateRoute><DevSpace /></PrivateRoute>} />
                    <Route path="/people-memory" element={<PrivateRoute><PeopleMemory /></PrivateRoute>} />
                    <Route path="/archive" element={<PrivateRoute><Archive /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                    <Route path="/sleep-tracker" element={<PrivateRoute><SleepPage /></PrivateRoute>} />
                    <Route path="/my-hub" element={<PrivateRoute><MyHub /></PrivateRoute>} />
                    <Route path="/schedule" element={<PrivateRoute><TaskCalendar /></PrivateRoute>} />
                    <Route path="/time-block-schedule" element={<PrivateRoute><TimeBlockSchedule /></PrivateRoute>} />
                    <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
                    <Route path="/project-tracker" element={<PrivateRoute><ProjectBalanceTracker /></PrivateRoute>} />
                  </Routes>
                </main>
              </div>
            </Router>
          </SoundProvider>
        </SettingsProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;