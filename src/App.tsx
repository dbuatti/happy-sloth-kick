import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import MainLayout from '@/components/layout/MainLayout';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import AuthPage from '@/features/auth/pages/AuthPage';
import TasksPage from '@/features/tasks/pages/TasksPage';
import HabitsPage from '@/features/habits/pages/HabitsPage';
import SchedulePage from '@/features/schedule/pages/SchedulePage';
import GoalsPage from '@/features/goals/pages/GoalsPage';
import ProjectsPage from '@/features/projects/pages/ProjectsPage';
import QuickLinksPage from '@/features/quick-links/pages/QuickLinksPage';
import PeopleMemoryPage from '@/features/people-memory/pages/PeopleMemoryPage';
import WeeklyFocusPage from '@/features/weekly-focus/pages/WeeklyFocusPage';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import DevIdeasPage from '@/features/dev-ideas/pages/DevIdeasPage';
import MealsPage from '@/features/meals/pages/MealsPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';

function App() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading application...</div>;
  }

  return (
    <Routes>
      <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />
      
      {/* Protected routes wrapped by MainLayout */}
      <Route element={user ? <MainLayout /> : <Navigate to="/auth" replace />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/habits" element={<HabitsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/quick-links" element={<QuickLinksPage />} />
        <Route path="/people-memory" element={<PeopleMemoryPage />} />
        <Route path="/weekly-focus" element={<WeeklyFocusPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/dev-ideas" element={<DevIdeasPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;