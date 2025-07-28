import { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import AuthComponent from "@/components/AuthComponent";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from '@/hooks/useTasks';
import TaskList from "@/components/TaskList";
import DateNavigator from '@/components/DateNavigator';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import { addDays, startOfDay } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import NextTaskCard from '@/components/NextTaskCard'; // Import NextTaskCard
import TaskDetailDialog from '@/components/TaskDetailDialog'; // Import TaskDetailDialog

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

interface IndexProps {
  setIsAddTaskOpen: (open: boolean) => void;
  currentDate: Date; // New prop
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>; // New prop
}

const Index: React.FC<IndexProps> = ({ setIsAddTaskOpen, currentDate, setCurrentDate }) => {
  const { user, loading: authLoading } = useAuth();
  const { nextAvailableTask, updateTask, deleteTask, userId } = useTasks({ currentDate, setCurrentDate }); // Get nextAvailableTask and other task actions

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null); // Use 'any' for now, or define a more specific type if needed

  useEffect(() => {
    // No longer need to manage session state here, useAuth handles it
  }, []);

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

  const handleMarkNextTaskComplete = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
  };

  const handleEditNextTask = (task: any) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
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
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {user ? ( // Use user from useAuth
        <>
          <main className="flex-grow p-4">
            <DateNavigator
              currentDate={currentDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onGoToToday={handleGoToToday}
              setCurrentDate={setCurrentDate}
            />
            <NextTaskCard 
              task={nextAvailableTask} 
              onMarkComplete={handleMarkNextTaskComplete} 
              onEditTask={handleEditNextTask} 
              currentDate={currentDate}
            />
            <TaskList setIsAddTaskOpen={setIsAddTaskOpen} currentDate={currentDate} setCurrentDate={setCurrentDate} />
          </main>
          <footer className="p-4">
            <MadeWithDyad />
          </footer>
          <div className="fixed bottom-4 right-4 z-50">
            <span className="bg-background text-muted-foreground text-sm px-3 py-2 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity duration-200">
              Press <kbd className="font-mono">Cmd/Ctrl + K</kbd> for commands
            </span>
          </div>
          {taskToEdit && (
            <TaskDetailDialog
              task={taskToEdit}
              userId={userId}
              isOpen={isTaskDetailOpen}
              onClose={() => setIsTaskDetailOpen(false)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
            />
          )}
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