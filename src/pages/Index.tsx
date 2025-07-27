import { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import AuthComponent from "@/components/AuthComponent";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from '@/hooks/useTasks'; // Import useTasks
import TaskList from "@/components/TaskList"; // Ensure TaskList is imported

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen }) => {
  const [session, setSession] = useState<any>(null);
  const { setStatusFilter } = useTasks(); // Get setStatusFilter from useTasks

  useEffect(() => {
    // Get the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Explicitly set status filter to 'all' when this page loads
    setStatusFilter('all');

    return () => subscription.unsubscribe();
  }, [setStatusFilter]); // Add setStatusFilter to dependencies

  return (
    <div className="flex-1 flex flex-col"> {/* Removed min-h-screen and bg classes */}
      {session ? (
        <>
          <main className="flex-grow p-4"> {/* Removed items-center justify-center */}
            <TaskList setIsAddTaskOpen={setIsAddTaskOpen} />
          </main>
          <footer className="p-4">
            <MadeWithDyad />
          </footer>
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