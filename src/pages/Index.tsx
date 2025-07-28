import { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import AuthComponent from "@/components/AuthComponent";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from '@/hooks/useTasks';
import TaskList from "@/components/TaskList";
import DateNavigator from '@/components/DateNavigator';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import { addDays, startOfDay } from 'date-fns';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
}

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen }) => {
  const { user, loading: authLoading } = useAuth(); // Use useAuth hook
  const { setStatusFilter, currentDate, setCurrentDate } = useTasks();

  useEffect(() => {
    // No longer need to manage session state here, useAuth handles it
    setStatusFilter('all');
  }, [setStatusFilter]);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => {
      const newDate = getUTCStartOfDay(addDays(prevDate, -1));
      console.log('Index.tsx: Navigating to previous day. New currentDate:', newDate.toISOString());
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => {
      const newDate = getUTCStartOfDay(addDays(prevDate, 1));
      console.log('Index.tsx: Navigating to next day. New currentDate:', newDate.toISOString());
      return newDate;
    });
  };

  const handleGoToToday = () => {
    const today = getUTCStartOfDay(new Date());
    console.log('Index.tsx: Navigating to today. New currentDate:', today.toISOString());
    setCurrentDate(today);
  };

  // Define keyboard shortcuts
  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
  };

  // Apply keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {user ? ( // Use user from useAuth
        <>
          <main className="flex-grow p-6">
            <DateNavigator
              currentDate={currentDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onGoToToday={handleGoToToday}
            />
            {/* Added key to force remounting of TaskList when currentDate changes */}
            <TaskList key={currentDate.toISOString()} setIsAddTaskOpen={setIsAddTaskOpen} />
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