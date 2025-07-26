import { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import TaskList from "@/components/TaskList";
import Sidebar from "@/components/Sidebar";
import AuthComponent from "@/components/AuthComponent";
import { supabase } from "@/integrations/supabase/client";

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen }) => {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Get the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {session ? (
        <>
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <main className="flex-grow flex items-center justify-center p-4">
              <TaskList setIsAddTaskOpen={setIsAddTaskOpen} />
            </main>
            <footer className="p-4">
              <MadeWithDyad />
            </footer>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthComponent />
        </div>
      )}
    </div>
  );
};

export default Index;