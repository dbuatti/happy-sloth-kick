import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/context/SettingsContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Task, TaskCategory, TaskSection, Appointment, CustomCard, WeeklyFocus, NewTaskData, UpdateTaskData, NewCustomCardData, UpdateCustomCardData, DashboardProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, LayoutDashboard, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
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
import TaskList from '@/components/TaskList';
import { format, startOfDay } from 'date-fns';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import { toast } from 'react-hot-toast';

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { settings, updateSettings } = useSettings();

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
    createCategory,
    updateCategory,
    deleteCategory,
    createSection,
    updateSection,
    deleteSection,
    reorderTasks,
    reorderSections,
    updateSectionIncludeInFocusMode,
    dailyProgress,
    onToggleFocusMode,
    onLogDoTodayOff,
  } = useTasks({ userId: currentUserId! });

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

  const { dailyProgress: todayDailyProgress } = useDailyTaskCount(tasks);

  const [layout, setLayout] = useState<any[]>(settings?.dashboard_layout || defaultDashboardLayout.lg);
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [activeDragItem, setActiveDragItem] = useState<CustomCard | null>(null);

  const [primaryFocus, setPrimaryFocus] = useState(weeklyFocus?.primary_focus || '');
  const [secondaryFocus, setSecondaryFocus] = useState(weeklyFocus?.secondary_focus || '');
  const [tertiaryFocus, setTertiaryFocus] = useState(weeklyFocus?.tertiary_focus || '');

  useEffect(() => {
    if (weeklyFocus) {
      setPrimaryFocus(weeklyFocus.primary_focus || '');
      setSecondaryFocus(weeklyFocus.secondary_focus || '');
      setTertiaryFocus(weeklyFocus.tertiary_focus || '');
    }
  }, [weeklyFocus]);

  useEffect(() => {
    if (settings?.dashboard_layout) {
      setLayout(settings.dashboard_layout);
    } else {
      setLayout(defaultDashboardLayout.lg);
    }
  }, [settings?.dashboard_layout]);

  const handleLayoutChange = async (newLayout: any[]) => {
    setLayout(newLayout);
    await updateSettings({ dashboard_layout: newLayout });
  };

  const handleAddCard = async () => {
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
      toast.error(`Failed to add card: ${(err as Error).message}`);
      console.error('Error adding custom card:', err);
    }
  };

  const handleUpdateCard = async (id: string, updates: UpdateCustomCardData) => {
    try {
      await updateCustomCard({ id, updates });
      toast.success('Custom card updated!');
    } catch (err) {
      toast.error(`Failed to update card: ${(err as Error).message}`);
      console.error('Error updating custom card:', err);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom card?')) {
      try {
        await deleteCustomCard(id);
        toast.success('Custom card deleted!');
      } catch (err) {
        toast.error(`Failed to delete card: ${(err as Error).message}`);
        console.error('Error deleting custom card:', err);
      }
    }
  };

  const handleUpdateWeeklyFocus = async () => {
    try {
      await updateWeeklyFocus({
        primary_focus: primaryFocus.trim() || null,
        secondary_focus: secondaryFocus.trim() || null,
        tertiary_focus: tertiaryFocus.trim() || null,
      });
      toast.success('Weekly focus updated!');
    } catch (err) {
      toast.error(`Failed to update weekly focus: ${(err as Error).message}`);
      console.error('Error updating weekly focus:', err);
    }
  };

  const handleAddTaskFormSubmit = async (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => {
    const newTaskData: NewTaskData = {
      description,
      section_id: sectionId,
      parent_task_id: parentTaskId,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      category: categoryId,
      priority: priority as Task['priority'],
      status: 'to-do',
      recurring_type: 'none',
      original_task_id: null,
      link: null,
      image_url: null,
      notes: null,
      remind_at: null,
    };
    return await addTask(newTaskData);
  };

  const handleAddSubtask = async (description: string, parentTaskId: string | null) => {
    const newTaskData: NewTaskData = {
      description,
      section_id: null,
      parent_task_id: parentTaskId,
      due_date: null,
      category: null,
      priority: 'medium',
      status: 'to-do',
      recurring_type: 'none',
      original_task_id: null,
      link: null,
      image_url: null,
      notes: null,
      remind_at: null,
    };
    return await addTask(newTaskData);
  };

  const handleToggleFocusMode = (taskId: string) => {
    // Logic for toggling focus mode for a task
    toast(`Task ${taskId} focus mode toggled (functionality to be implemented).`);
  };

  const handleLogDoTodayOff = (taskId: string) => {
    toast(`Task ${taskId} logged as "Do Today Off" (functionality to be implemented).`);
  };

  const isLoadingData = tasksLoading || appointmentsLoading || dashboardDataLoading || authLoading;
  const hasError = tasksError || appointmentsError || dashboardDataError;

  if (isLoadingData) {
    return <div className="flex justify-center items-center h-full">Loading dashboard...</div>;
  }

  if (hasError) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {hasError.message}</div>;
  }

  const renderCardContent = (card: CustomCard) => {
    switch (card.title) {
      case 'Daily Schedule Preview':
        return <DailySchedulePreview appointments={appointments || []} onAddAppointment={() => toast('Add appointment from schedule preview')} />;
      case 'Next Task':
        return <NextTaskCard tasks={tasks || []} />;
      case 'Quick Links':
        return <QuickLinks isDemo={isDemo} demoUserId={demoUserId} />;
      case 'People Memory':
        return <PeopleMemoryCard />;
      case 'Meditation Notes':
        return <MeditationNotes />;
      case 'Gratitude Journal':
        return <GratitudeJournal />;
      case 'Worry Journal':
        return <WorryJournal />;
      case 'Weekly Focus':
        return (
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Weekly Focus</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleUpdateWeeklyFocus}>
                <Save className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
              <div>
                <Label htmlFor="primaryFocus">Primary Focus</Label>
                <Input id="primaryFocus" value={primaryFocus} onChange={(e) => setPrimaryFocus(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="secondaryFocus">Secondary Focus</Label>
                <Input id="secondaryFocus" value={secondaryFocus} onChange={(e) => setSecondaryFocus(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tertiaryFocus">Tertiary Focus</Label>
                <Input id="tertiaryFocus" value={tertiaryFocus} onChange={(e) => setTertiaryFocus(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        );
      case 'Daily Tasks':
        return (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Daily Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
              <TaskList
                tasks={tasks || []}
                categories={allCategories || []}
                sections={allSections || []}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onAddTask={handleAddTaskFormSubmit}
                onAddSubtask={handleAddSubtask}
                onToggleFocusMode={onToggleFocusMode}
                onLogDoTodayOff={onLogDoTodayOff}
                currentDate={today}
                createCategory={createCategory}
                updateCategory={updateCategory}
                deleteCategory={deleteCategory}
                createSection={createSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
                reorderTasks={reorderTasks}
                reorderSections={reorderSections}
                updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                showFilters={false}
                showSections={true}
                showCompleted={false}
              />
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{card.title}</CardTitle>
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" onClick={() => handleUpdateCard(card.id, { is_visible: false })}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteCard(card.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              {card.emoji && <span className="text-4xl block mb-2">{card.emoji}</span>}
              <p className="text-sm text-gray-500">{card.content}</p>
            </CardContent>
          </Card>
        );
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({ currentCoordinates }) => currentCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const oldIndex = layout.findIndex(item => item.i === activeId);
    const newIndex = layout.findIndex(item => item.i === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newLayout = arrayMove(layout, oldIndex, newIndex);
      handleLayoutChange(newLayout);
    }
    setActiveDragItem(null);
  };

  const handleDragStart = ({ active }: any) => {
    const activeCard = customCards?.find(card => card.id === active.id);
    if (activeCard) {
      setActiveDragItem(activeCard);
    }
  };

  const visibleCustomCards = useMemo(() => {
    return customCards?.filter(card => card.is_visible) || [];
  }, [customCards]);

  const layoutItems = useMemo(() => {
    const defaultCards = [
      { id: 'daily-schedule-preview', title: 'Daily Schedule Preview', emoji: '🗓️', content: 'Your appointments for today.' },
      { id: 'next-task', title: 'Next Task', emoji: '➡️', content: 'Your next upcoming task.' },
      { id: 'quick-links', title: 'Quick Links', emoji: '🔗', content: 'Your frequently used links.' },
      { id: 'people-memory', title: 'People Memory', emoji: '👥', content: 'Important people and notes.' },
      { id: 'meditation-notes', title: 'Meditation Notes', emoji: '🧘', content: 'Your meditation reflections.' },
      { id: 'gratitude-journal', title: 'Gratitude Journal', emoji: '🙏', content: 'What you are grateful for.' },
      { id: 'worry-journal', title: 'Worry Journal', emoji: '😟', content: 'Your worries and thoughts.' },
      { id: 'weekly-focus', title: 'Weekly Focus', emoji: '🎯', content: 'Your main goals for the week.' },
      { id: 'daily-tasks', title: 'Daily Tasks', emoji: '✅', content: 'Your tasks for today.' },
    ];

    const allCards = [...defaultCards, ...visibleCustomCards];

    // Merge with layout to ensure all items have layout properties
    return allCards.map(card => {
      const layoutItem = layout.find(item => item.i === card.id);
      return {
        ...card,
        ...layoutItem,
        i: card.id, // Ensure 'i' property is always the card's id
      };
    });
  }, [visibleCustomCards, layout]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="flex justify-end mb-6 space-x-2">
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
                <Input id="cardEmoji" value={newCardEmoji} onChange={(e) => setNewCardEmoji(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddCard}>Save Card</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <ResponsiveGridLayout
          layouts={{ lg: layout, md: layout }} // Use the same layout for simplicity, or define md separately
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={100}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          measureBeforeMount={true}
          useCSSTransforms={true}
          compactType="vertical"
        >
          {layoutItems.map((card) => (
            <div key={card.id} data-grid={{ x: card.x, y: card.y, w: card.w, h: card.h }}>
              <SortableCustomCard
                card={card as CustomCard} // Cast to CustomCard
                onUpdateCard={handleUpdateCard}
                onDeleteCard={handleDeleteCard}
              >
                {renderCardContent(card as CustomCard)}
              </SortableCustomCard>
            </div>
          ))}
        </ResponsiveGridLayout>
        <DragOverlay>
          {activeDragItem ? (
            <Card className="p-4 shadow-lg">
              <CardTitle>{activeDragItem.title}</CardTitle>
              <CardContent>{activeDragItem.content}</CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Dashboard;