import { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import AuthComponent from "@/components/AuthComponent";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from '@/hooks/useTasks';
import TaskList from "@/components/TaskList"; // Changed back to default import

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen }) => {
  const [session, setSession] = useState<any>(null);
  const { setStatusFilter } = useTasks();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    setStatusFilter('all');

    return () => subscription.unsubscribe();
  }, [setStatusFilter]);

  return (
    <div className="flex-1 flex flex-col">
      {session ? (
        <>
          <main className="flex-grow p-4">
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