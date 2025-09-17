import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Flame, BarChart3, Filter, ArrowUpNarrowWide, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHabits, HabitWithLogs } from '@/hooks/useHabits';
import HabitCard from '@/components/HabitCard';
import HabitFormDialog from '@/components/HabitFormDialog';
import DateNavigator from '@/components/DateNavigator';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, startOfMonth } from 'date-fns';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import { getNewHabitSuggestion } from '@/integrations/supabase/habit-api';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HabitAnalyticsDashboard from '@/components/HabitAnalyticsDashboard';
import { DateRange } from 'react-day-picker';
import { Label } from '@/components/ui/label';
import HabitSuggestionDialog from '@/components/HabitSuggestionDialog'; // Import the new dialog

interface HabitTrackerPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const HabitTrackerPage: React.FC<HabitTrackerPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [analyticsDateRange, setAnalyticsDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfMonth(new Date()),
    to: new Date(),
  }));
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortOption, setSortOption] = useState<'name_asc' | 'created_at_desc'>('created_at_desc');

  const {
    habits,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitCompletion,
  } = useHabits({ userId: demoUserId, currentDate, filterStatus, sortOption });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithLogs | null>(null);
  const [isSavingHabit, setIsSavingHabit] = useState(false);
  
  const [habitSuggestion, setHabitSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false); // New state for dialog

  const handleFetchSuggestion = async () => {
    if (!userId || isDemo) {
      setHabitSuggestion(null);
      setIsSuggestionDialogOpen(true); // Open dialog even if no suggestion in demo
      return;
    }
    setIsLoadingSuggestion(true);
    setIsSuggestionDialogOpen(true); // Open dialog immediately to show loading state
    const suggestion = await getNewHabitSuggestion(userId);
    setHabitSuggestion(suggestion);
    setIsLoadingSuggestion(false);
  };

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
            <Tabs defaultValue="tracker" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tracker">
                  <Flame className="h-4 w-4 mr-2" /> Tracker
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="h-4 w-4 mr-2" /> Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tracker" className="mt-4 space-y-6">
                <DateNavigator
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  onPreviousDay={handlePreviousDay}
                  onNextDay={handleNextDay}
                  onGoToToday={handleGoToToday}
                />

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <Button onClick={() => handleOpenForm(null)} disabled={isDemo} className="h-9 w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add New Habit
                  </Button>
                  <Button onClick={handleFetchSuggestion} disabled={isDemo || isLoadingSuggestion} className="h-9 w-full sm:w-auto">
                    <Sparkles className="mr-2 h-4 w-4" /> Get Habit Suggestion
                  </Button>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Label htmlFor="filter-status" className="sr-only">Filter by status</Label>
                    <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}>
                      <SelectTrigger className="w-full sm:w-[140px] h-9">
                        <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label htmlFor="sort-option" className="sr-only">Sort by</Label>
                    <Select value={sortOption} onValueChange={(value) => setSortOption(value as 'name_asc' | 'created_at_desc')}>
                      <SelectTrigger className="w-full sm:w-[160px] h-9">
                        <ArrowUpNarrowWide className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                        <SelectItem value="created_at_desc">Newest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 gap-4"> {/* Changed to grid-cols-1 */}
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                  </div>
                ) : habits.length === 0 ? (
                  <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                    <Flame className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">No habits found!</p>
                    <p className="text-sm">Click "Add New Habit" to start building your routine.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4"> {/* Changed to grid-cols-1 */}
                    {habits.map((habit: HabitWithLogs) => (
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
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <HabitAnalyticsDashboard dateRange={analyticsDateRange} setDateRange={setAnalyticsDateRange} isDemo={isDemo} demoUserId={demoUserId} />
              </TabsContent>
            </Tabs>
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

      <HabitSuggestionDialog
        isOpen={isSuggestionDialogOpen}
        onClose={() => setIsSuggestionDialogOpen(false)}
        suggestion={habitSuggestion}
        isLoading={isLoadingSuggestion}
      />
    </div>
  );
};

export default HabitTrackerPage;