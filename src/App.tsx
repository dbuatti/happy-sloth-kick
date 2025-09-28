import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
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
      <Route
        path="/"
        element={user ? <DashboardPage /> : <Navigate to="/auth" replace />}
      />
      <Route path="/tasks" element={user ? <TasksPage /> : <Navigate to="/auth" replace />} />
      <Route path="/habits" element={user ? <HabitsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/schedule" element={user ? <SchedulePage /> : <Navigate to="/auth" replace />} />
      <Route path="/goals" element={user ? <GoalsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/projects" element={user ? <ProjectsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/quick-links" element={user ? <QuickLinksPage /> : <Navigate to="/auth" replace />} />
      <Route path="/people-memory" element={user ? <PeopleMemoryPage /> : <Navigate to="/auth" replace />} />
      <Route path="/weekly-focus" element={user ? <WeeklyFocusPage /> : <Navigate to="/auth" replace />} />
      <Route path="/notifications" element={user ? <NotificationsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/dev-ideas" element={user ? <DevIdeasPage /> : <Navigate to="/auth" replace />} />
      <Route path="/meals" element={user ? <MealsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/auth" replace />} />
    </Routes>
  );
}

export default App;