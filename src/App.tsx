import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TasksPage from './pages/Tasks';
import { supabase } from './integrations/supabase/client';
import LoginPage from './pages/Login';
import { useEffect, useState } from 'react';
import { AuthSession } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading app...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={session ? <TasksPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/tasks"
          element={session ? <TasksPage /> : <Navigate to="/login" replace />}
        />
        {/* Catch-all route: if authenticated, redirect to home; otherwise, redirect to login */}
        <Route
          path="*"
          element={session ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;