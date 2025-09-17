import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHabits, HabitWithLogs } from '@/hooks/useHabits';
import HabitCard from '@/components/HabitCard';
import HabitFormDialog from '@/components/HabitFormDialog';
import DateNavigator from '@/components/DateNavigator';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import HabitSuggestionCard from '@/components/HabitSuggestionCard'; // Import the new component
import { getNewHabitSuggestion } from '@/integrations/supabase/habit-api'; // Import the API call
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface HabitTrackerPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const HabitTrackerPage: React.FC<HabitTrackerPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    habits,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitCompletion,
  } = useHabits({ userId: demoUserId, currentDate });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithLogs | null>(null);
  const [isSavingHabit, setIsSavingHabit] = useState(false);
  const [habitSuggestion, setHabitSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  const activeHabits = useMemo(() => habits.filter((h: HabitWithLogs) => h.is_active), [habits]);

  useEffect(() => {
    const fetchSuggestion = async () => {
      if (!userId || isDemo) {
        setHabitSuggestion(null);
        return;
      }
      setIsLoadingSuggestion(true);
      const suggestion = await getNewHabitSuggestion(userId);
      setHabitSuggestion(suggestion);
      setIsLoadingSuggestion(false);
    };

    // Fetch suggestion when habits change or on page load
    fetchSuggestion();
  }, [userId, isDemo, habits]); // Re-fetch when habits data changes

  const handleOpenForm = (habit: HabitWithLogs | null) => {
    setEditingHabit(habit);
    setIsFormOpen(true);
  };

  const handleSaveHabit = async (data: any) => {
    setIsSavingHabit(true);
    if (editingHabit) {
      await updateHabit({ habitId: editingHabit.id, updates: data });
    } else {
      await addHabit(data);
    }
    setIsSavingHabit(false);
  };

  const handleDeleteHabit = async (habitId: string) => {
    setIsSavingHabit(true);
    await deleteHabit(habitId);
    setIsSavingHabit(false);
  };

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => addDays(prevDate, -1));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => addDays(prevDate, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
    't': handleGoToToday,
  };
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Flame className="h-7 w-7 text-primary" /> Habit Tracker
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Build powerful habits, one day at a time.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <DateNavigator
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onGoToToday={handleGoToToday}
            />

            <div className="flex justify-end mb-4">
              <Button onClick={() => handleOpenForm(null)} disabled={isDemo} className="h-9">
                <Plus className="mr-2 h-4 w-4" /> Add New Habit
              </Button>
            </div>

            <div className="mb-6">
              <HabitSuggestionCard suggestion={habitSuggestion} isLoading={isLoadingSuggestion} isDemo={isDemo} />
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : activeHabits.length === 0 ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <Flame className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No active habits yet!</p>
                <p className="text-sm">Start building your routine by adding your first habit.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeHabits.map((habit: HabitWithLogs) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onToggleCompletion={toggleHabitCompletion}
                    onEdit={handleOpenForm}
                    currentDate={currentDate}
                    isDemo={isDemo}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <HabitFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
        initialData={editingHabit}
        isSaving={isSavingHabit}
      />
    </div>
  );
};

export default HabitTrackerPage;