import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SoundProvider } from "@/context/SoundContext";
import Sidebar from "./components/Sidebar";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import DailyTasks from "./pages/DailyTasksV3";
import FocusMode from "./pages/FocusMode";
import TaskCalendar from "./pages/TaskCalendar";
import TimeBlockSchedule from "./pages/TimeBlockSchedule";
import Archive from "./pages/Archive";
import Settings from "./pages/Settings";
import { useAuth } from './context/AuthContext';

// Create a simple Profile component since it's missing
const Profile = () => (
  <div className="container mx-auto py-6">
    <h1 className="text-2xl font-bold">Profile</h1>
    <p className="text-muted-foreground">Profile page content would go here</p>
  </div>
);

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <SoundProvider>
      <Router>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/daily" element={<DailyTasks />} />
              <Route path="/focus" element={<FocusMode />} />
              <Route path="/calendar" element={<TaskCalendar />} />
              <Route path="/schedule" element={<TimeBlockSchedule />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <Toaster />
        </div>
      </Router>
    </SoundProvider>
  );
}

export default App;