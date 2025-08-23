import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSettings } from '@/context/SettingsContext';
import { Task, TaskCategory, TaskSection, Appointment, CustomCard, WeeklyFocus, NewTaskData, UpdateTaskData, NewCustomCardData, UpdateCustomCardData, DashboardProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, Save, LayoutDashboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveGridLayout } from '@/components/ui/responsive-grid-layout';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import QuickLinks from '@/components/dashboard/QuickLinks';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotes from '@/components/dashboard/MeditationNotes';
import GratitudeJournal from '@/components/GratitudeJournal';
import WorryJournal from '@/components/WorryJournal';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { toast } from 'react-hot-toast';
import { format, startOfDay } from 'date-fns';

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { settings, updateSettings, loading: settingsLoading } = useSettings();

  const today = startOfDay(new Date());

  const {
    tasks,
    categories: allCategories,
    sections: allSections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    onAddSubtask,
    onToggleFocusMode,
    onLogDoTodayOff,
    createCategory,
    updateCategory,
    deleteCategory,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
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
    updateDashboardLayout,
  } = useDashboardData(isDemo, demoUserId);

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const isLoading = authLoading || tasksLoading || appointmentsLoading || dashboardDataLoading || settingsLoading;
  const error = tasksError || appointmentsError || dashboardDataError;

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) {
      toast.error('Card title cannot be empty.');
      return;
    }
    try {
      const newCard: NewCustomCardData = {
        title: newCardTitle.trim(),
        content: newCardContent.trim() || null,
        emoji: newCardEmoji.trim() || null,
        card_order: customCards ? customCards.length : 0,
        user_id: currentUserId!,
      };
      await addCustomCard(newCard);
      setNewCardTitle('');
      setNewCardContent('');
      setNewCardEmoji('');
      setIsAddCardDialogOpen(false);
    } catch (err) {
      toast.error('Failed to add custom card.');
      console.error(err);
    }
  };

  const handleUpdateCard = async (id: string, updates: UpdateCustomCardData) => {
    try {
      await updateCustomCard({ id, updates });
    } catch (err) {
      toast.error('Failed to update custom card.');
      console.error(err);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom card?')) {
      try {
        await deleteCustomCard(id);
      } catch (err) {
        toast.error('Failed to delete custom card.');
        console.error(err);
      }
    }
  };

  const handleUpdateWeeklyFocus = async () => {
    if (!weeklyFocus) return;
    try {
      await updateWeeklyFocus({
        primary_focus: weeklyFocus.primary_focus,
        secondary_focus: weeklyFocus.secondary_focus,
        tertiary_focus: weeklyFocus.tertiary_focus,
      });
    } catch (err) {
      toast.error('Failed to update weekly focus.');
      console.error(err);
    }
  };

  const renderCardContent = (card: CustomCard) => {
    switch (card.title) {
      case 'Daily Schedule':
        return <DailySchedulePreview appointments={appointments || []} onAddAppointment={() => { /* TODO: open appointment form */ }} />;
      case 'Next Task':
        return <NextTaskCard tasks={tasks || []} onToggleFocusMode={onToggleFocusMode} />;
      case 'Quick Links':
        return <QuickLinks isDemo={isDemo} demoUserId={demoUserId} />;
      case 'People Memory':
        return <PeopleMemoryCard isDemo={isDemo} demoUserId={demoUserId} />;
      case 'Meditation Notes':
        return <MeditationNotes />;
      case 'Gratitude Journal':
        return <GratitudeJournal isDemo={isDemo} demoUserId={demoUserId} />;
      case 'Worry Journal':
        return <WorryJournal isDemo={isDemo} demoUserId={demoUserId} />;
      case 'Weekly Focus':
        return (
          <WeeklyFocusCard
            weeklyFocus={weeklyFocus}
            updateWeeklyFocus={updateWeeklyFocus}
            primaryFocus={weeklyFocus?.primary_focus || ''}
            secondaryFocus={weeklyFocus?.secondary_focus || ''}
            tertiaryFocus={weeklyFocus?.tertiary_focus || ''}
            setPrimaryFocus={(value) => updateWeeklyFocus({ primary_focus: value })}
            setSecondaryFocus={(value) => updateWeeklyFocus({ secondary_focus: value })}
            setTertiaryFocus={(value) => updateWeeklyFocus({ tertiary_focus: value })}
          />
        );
      case 'My Tasks':
        return (
          <TaskList
            tasks={tasks || []}
            categories={allCategories || []}
            sections={allSections || []}
            isLoading={tasksLoading}
            error={tasksError}
            onAddTask={addTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={deleteTask}
            onAddSubtask={onAddSubtask}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            reorderTasks={() => {}} // Not directly reordering from here
            reorderSections={() => {}} // Not directly reordering from here
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            showCompleted={settings?.visible_pages?.show_completed_tasks ?? false}
            toggleShowCompleted={() => updateSettings({ visible_pages: { ...settings?.visible_pages, show_completed_tasks: !(settings?.visible_pages?.show_completed_tasks ?? false) } as Json })}
          />
        );
      default:
        return (
          <CardContent>
            <p className="text-sm text-muted-foreground">{card.content}</p>
          </CardContent>
        );
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    const oldIndex = customCards?.findIndex(card => card.id === active.id);
    const newIndex = customCards?.findIndex(card => card.id === over.id);

    if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== -1 && newIndex !== -1 && customCards) {
      const newOrder = arrayMove(customCards, oldIndex, newIndex);
      const updates = newOrder.map((card, index) => ({
        id: card.id,
        card_order: index,
      }));

      // Optimistic update
      queryClient.setQueryData(['customCards', currentUserId], newOrder);

      try {
        // This would ideally be a single RPC call to update multiple orders
        await Promise.all(updates.map(update => updateCustomCard({ id: update.id, updates: { card_order: update.card_order } })));
      } catch (e) {
        toast.error('Failed to reorder cards.');
        queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] }); // Rollback on error
      }
    }
    setActiveId(null);
  };

  const dragOverlayContent = activeId ? (
    customCards?.find((card) => card.id === activeId) ? (
      <SortableCustomCard
        id={activeId}
        card={customCards.find((card) => card.id === activeId)!}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
      />
    ) : null
  ) : null;

  if (!currentUserId) {
    return <p>Please log in to view your dashboard.</p>;
  }

  if (isLoading) {
    return <p>Loading dashboard...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  const layout = settings?.dashboard_layout as ReactGridLayout.Layout[] || customCards?.map((card, index) => ({
    i: card.id,
    x: (index * 2) % 12, // Simple layout for new cards
    y: Math.floor(index / 6) * 2,
    w: 2,
    h: 2,
  })) || [];

  const handleLayoutChange = (currentLayout: ReactGridLayout.Layout[]) => {
    const newLayout = currentLayout.map(item => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    updateDashboardLayout(newLayout as Json);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex space-x-2">
          <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Card
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Dashboard Card</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="cardTitle" className="text-right">
                    Title
                  </label>
                  <Input
                    id="cardTitle"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="cardContent" className="text-right">
                    Content
                  </label>
                  <Textarea
                    id="cardContent"
                    value={newCardContent}
                    onChange={(e) => setNewCardContent(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="cardEmoji" className="text-right">
                    Emoji
                  </label>
                  <Input
                    id="cardEmoji"
                    value={newCardEmoji}
                    onChange={(e) => setNewCardEmoji(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g. 👋"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddCard}>Add Card</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setIsLayoutSettingsOpen(true)}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Layout Settings
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={customCards?.map(card => card.id) || []} strategy={verticalListSortingStrategy}>
          <ResponsiveGridLayout
            layouts={{ lg: layout }}
            onLayoutChange={(currentLayout, allLayouts) => handleLayoutChange(currentLayout)}
            className="min-h-[500px]"
          >
            {customCards?.map((card) => (
              <div key={card.id} data-grid={{ x: card.x, y: card.y, w: card.w, h: card.h }}>
                <SortableCustomCard
                  id={card.id}
                  card={card}
                  onUpdateCard={handleUpdateCard}
                  onDeleteCard={handleDeleteCard}
                >
                  {renderCardContent(card)}
                </SortableCustomCard>
              </div>
            ))}
          </ResponsiveGridLayout>
        </SortableContext>
        <DragOverlay>
          {dragOverlayContent}
        </DragOverlay>
      </DndContext>

      <DashboardLayoutSettings
        isOpen={isLayoutSettingsOpen}
        onOpenChange={setIsLayoutSettingsOpen}
        customCards={customCards || []}
        updateCustomCard={updateCustomCard}
        deleteCustomCard={deleteCustomCard}
        settings={settings}
        updateSettings={updateSettings}
      />
    </div>
  );
};

export default Dashboard;