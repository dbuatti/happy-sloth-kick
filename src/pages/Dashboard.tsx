import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/context/SettingsContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Task, TaskCategory, TaskSection, Appointment, CustomCard, WeeklyFocus, NewCustomCardData, UpdateCustomCardData, UpdateWeeklyFocusData, NewTaskData, UpdateTaskData, DashboardProps } from '@/types'; // Corrected imports
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, Settings as SettingsIcon, Sparkles } from 'lucide-react'; // Removed LayoutDashboard
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'; // Added DialogTrigger
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import QuickLinks from '@/components/dashboard/QuickLinks';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import WorryJournal from '@/components/WorryJournal';
import GratitudeJournal from '@/components/GratitudeJournal';
import MeditationNotes from '@/components/dashboard/MeditationNotes';
import CustomCardComponent from '@/components/dashboard/CustomCard';
import WeeklyFocusComponent from '@/components/dashboard/WeeklyFocus';
import TaskList from '@/components/TaskList';
import { format, startOfDay } from 'date-fns';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { toast } from 'react-hot-toast';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { settings, updateSettings } = useSettings();

  const {
    tasks,
    categories: allCategories,
    sections: allSections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    createCategory,
    updateCategory,
    deleteCategory,
    createSection,
    updateSection,
    deleteSection,
    reorderTasks,
    reorderSections,
    updateSectionIncludeInFocusMode,
    onToggleFocusMode,
    onLogDoTodayOff,
  } = useTasks({ userId: currentUserId! });

  const today = startOfDay(new Date());
  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment: updateSingleAppointment,
    deleteAppointment: deleteSingleAppointment,
    clearAppointmentsForDay,
  } = useAppointments(today);

  const {
    customCards,
    weeklyFocus,
    isLoading: dashboardDataLoading,
    error: dashboardDataError,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    updateWeeklyFocus,
    defaultDashboardLayout,
  } = useDashboardData();

  const { dailyProgress } = useDailyTaskCount(tasks);

  const [layout, setLayout] = useState<any>(settings?.dashboard_layout || defaultDashboardLayout);
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  const [primaryFocus, setPrimaryFocus] = useState(weeklyFocus?.primary_focus || '');
  const [secondaryFocus, setSecondaryFocus] = useState(weeklyFocus?.secondary_focus || '');
  const [tertiaryFocus, setTertiaryFocus] = useState(weeklyFocus?.tertiary_focus || '');

  useEffect(() => {
    setPrimaryFocus(weeklyFocus?.primary_focus || '');
    setSecondaryFocus(weeklyFocus?.secondary_focus || '');
    setTertiaryFocus(weeklyFocus?.tertiary_focus || '');
  }, [weeklyFocus]);

  const handleLayoutChange = (newLayout: any) => {
    setLayout(newLayout);
    updateSettings({ dashboard_layout: newLayout });
  };

  const handleAddCustomCard = async () => {
    if (!newCardTitle.trim()) {
      toast.error('Card title cannot be empty.');
      return;
    }
    try {
      const newCardData: NewCustomCardData = {
        title: newCardTitle.trim(),
        content: newCardContent.trim() || null,
        emoji: newCardEmoji.trim() || null,
        card_order: customCards ? customCards.length : 0,
        is_visible: true,
      };
      await addCustomCard(newCardData);
      toast.success('Custom card added!');
      setNewCardTitle('');
      setNewCardContent('');
      setNewCardEmoji('');
      setIsAddCardDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to add custom card: ${(err as Error).message}`);
      console.error('Error adding custom card:', err);
    }
  };

  const handleUpdateWeeklyFocus = async () => {
    try {
      const updates: UpdateWeeklyFocusData = {
        primary_focus: primaryFocus.trim() || null,
        secondary_focus: secondaryFocus.trim() || null,
        tertiary_focus: tertiaryFocus.trim() || null,
      };
      await updateWeeklyFocus(updates);
      toast.success('Weekly focus updated!');
    } catch (err) {
      toast.error(`Failed to update weekly focus: ${(err as Error).message}`);
      console.error('Error updating weekly focus:', err);
    }
  };

  const isLoadingData = tasksLoading || appointmentsLoading || dashboardDataLoading || authLoading;
  const hasError = tasksError || appointmentsError || dashboardDataError;

  if (isLoadingData) {
    return <div className="flex justify-center items-center h-full">Loading dashboard...</div>;
  }

  if (hasError) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {hasError.message}</div>;
  }

  const allCards = useMemo(() => {
    const staticCards = [
      { id: 'welcome-card', component: <CustomCardComponent card={{ id: 'welcome-card', user_id: currentUserId!, title: 'Welcome!', emoji: '👋', content: 'This is your new dashboard. You can add, edit, and remove these custom cards as you like!', card_order: 0, created_at: '', updated_at: '', is_visible: true }} /> },
      { id: 'weekly-focus', component: <WeeklyFocusComponent weeklyFocus={weeklyFocus} onUpdateWeeklyFocus={handleUpdateWeeklyFocus} setPrimaryFocus={setPrimaryFocus} setSecondaryFocus={setSecondaryFocus} setTertiaryFocus={setTertiaryFocus} primaryFocus={primaryFocus} secondaryFocus={secondaryFocus} tertiaryFocus={tertiaryFocus} /> },
      { id: 'daily-schedule-preview', component: <DailySchedulePreview appointments={appointments || []} onAddAppointment={() => toast('Add appointment functionality to be implemented.')} /> },
      { id: 'next-task', component: <NextTaskCard tasks={tasks || []} onToggleFocusMode={onToggleFocusMode} /> },
      { id: 'quick-links', component: <QuickLinks isDemo={isDemo} demoUserId={demoUserId} /> },
      { id: 'people-memory', component: <PeopleMemoryCard /> },
      { id: 'meditation-notes', component: <MeditationNotes /> },
      { id: 'gratitude-journal', component: <GratitudeJournal /> },
      { id: 'worry-journal', component: <WorryJournal /> },
    ];

    const dynamicCards = (customCards || []).map(card => ({
      id: card.id,
      component: <CustomCardComponent card={card} onUpdate={updateCustomCard} onDelete={deleteCustomCard} />,
    }));

    return [...staticCards, ...dynamicCards];
  }, [customCards, weeklyFocus, appointments, tasks, onToggleFocusMode, isDemo, demoUserId, primaryFocus, secondaryFocus, tertiaryFocus, updateCustomCard, deleteCustomCard, handleUpdateWeeklyFocus, currentUserId]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="flex justify-end space-x-2 mb-4">
        <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Custom Card
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Custom Card</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cardTitle" className="text-right">Title</Label>
                <Input id="cardTitle" value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cardContent" className="text-right">Content</Label>
                <Textarea id="cardContent" value={newCardContent} onChange={(e) => setNewCardContent(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cardEmoji" className="text-right">Emoji</Label>
                <Input id="cardEmoji" value={newCardEmoji} onChange={(e) => setNewCardEmoji(e.target.value)} className="col-span-3" placeholder="e.g., 👋" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddCustomCard}>Save Card</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={() => setIsLayoutSettingsOpen(true)}>
          <SettingsIcon className="mr-2 h-4 w-4" /> Layout Settings
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layout}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
      >
        {allCards.map(card => (
          <div key={card.id} data-grid={{ i: card.id, x: 0, y: Infinity, w: 3, h: 2 }}>
            {card.component}
          </div>
        ))}
      </ResponsiveGridLayout>

      <DashboardLayoutSettings
        isOpen={isLayoutSettingsOpen}
        onOpenChange={setIsLayoutSettingsOpen}
        customCards={customCards || []}
        updateCustomCard={updateCustomCard}
        deleteCustomCard={deleteCustomCard}
        settings={settings}
        updateSettings={updateSettings}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList
            tasks={tasks || []}
            categories={allCategories || []}
            sections={allSections || []}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onCreateCategory={createCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            reorderTasks={reorderTasks}
            reorderSections={reorderSections}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            currentDate={today}
            showCompleted={false}
            showFilters={false}
            showSections={true}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;