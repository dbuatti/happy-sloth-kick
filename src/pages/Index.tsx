import { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import AuthComponent from "@/components/AuthComponent";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from '@/hooks/useTasks';
import TaskList from "@/components/TaskList";
import DateNavigator from '@/components/DateNavigator';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts'; // Import useKeyboardShortcuts and ShortcutMap
import { addDays, startOfDay } from 'date-fns'; // Import addDays and startOfDay

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen }) => {
  const [session, setSession] = useState<any>(null);
  const { setStatusFilter, currentDate, setCurrentDate } = useTasks();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Removed: setCurrentDate(getUTCStartOfDay(new Date())); // This was causing duplicate fetches
    setStatusFilter('all');

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [setStatusFilter]); // Removed setCurrentDate from dependencies as it's no longer set here

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, -1)));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => getUTCStartOfDay(addDays(prevDate, 1)));
  };

  const handleGoToToday = () => {
    setCurrentDate(getUTCStartOfDay(new Date()));
  };

  // Define keyboard shortcuts
  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
  };

  // Apply keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex-1 flex flex-col">
      {session ? (
        <>
          <main className="flex-grow p-6">
            <DateNavigator
              currentDate={currentDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onGoToToday={handleGoToToday}
            />
            <TaskList setIsAddTaskOpen={setIsAddTaskOpen} />
          </main>
          <footer className="p-6">
            <MadeWithDyad />
          </footer>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <AuthComponent />
        </div>
      )}
    </div>
  );
};

export default Index;