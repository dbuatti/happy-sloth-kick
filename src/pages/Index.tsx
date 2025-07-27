import { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import AuthComponent from "@/components/AuthComponent";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from '@/hooks/useTasks';
import TaskList from "@/components/TaskList";
import DateNavigator from '@/components/DateNavigator'; // Import DateNavigator

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen }) => {
  const [session, setSession] = useState<any>(null);
  const { setStatusFilter, currentDate, setCurrentDate } = useTasks(); // Get currentDate and setCurrentDate

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    setStatusFilter('all');

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [setStatusFilter]);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + 1);
      return newDate;
    });
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex-1 flex flex-col">
      {session ? (
        <>
          <main className="flex-grow p-4">
            <DateNavigator
              currentDate={currentDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onGoToToday={handleGoToToday}
            />
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