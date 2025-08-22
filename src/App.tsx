import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TasksPage from './pages/Tasks';
import { SessionContextProvider } from '@supabase/auth-ui-react';
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
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {session ? (
            <>
              <Route path="/" element={<TasksPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              {/* Add other authenticated routes here */}
            </>
          ) : (
            <Route path="*" element={<LoginPage />} /> {/* Redirect unauthenticated users to login */}
          )}
        </Routes>
      </BrowserRouter>
    </SessionContextProvider>
  );
}

export default App;