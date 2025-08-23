import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, LayoutDashboard, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CustomCard, WeeklyFocus, TaskSection } from '@/types';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import QuickLinks from '@/components/dashboard/QuickLinks';
import TaskList from '@/components/TaskList';
import { format, startOfDay } from 'date-fns';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';

interface SortableCustomCardProps {
  card: CustomCard;
}

const SortableCustomCard: React.FC<SortableCustomCardProps> = ({ card }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CustomDashboardCard card={card} />
    </div>
  );
};

interface CustomDashboardCardProps {
  card: CustomCard;
}

const CustomDashboardCard: React.FC<CustomDashboardCardProps> = ({ card }) => {
  const { updateCustomCard, deleteCustomCard } = useDashboardData();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title);
  const [editedContent, setEditedContent] = useState(card.content || '');
  const [editedEmoji, setEditedEmoji] = useState(card.emoji || '');

  const handleSave = async () => {
    await updateCustomCard({
      id: card.id,
      updates: { title: editedTitle, content: editedContent, emoji: editedEmoji },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      await deleteCustomCard(card.id);
    }
  };

  const handleToggleVisibility = async () => {
    await updateCustomCard({ id: card.id, updates: { is_visible: !card.is_visible } });
  };

  return (
    <Card className="relative h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {card.emoji} {card.title}
        </CardTitle>
        <div className="flex space-x-1">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToggleVisibility}>
            {card.is_visible ? 'Hide' : 'Show'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        <p className="text-sm text-gray-600">{card.content}</p>
      </CardContent>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Custom Card</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input id="title" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emoji" className="text-right">Emoji</Label>
              <Input id="emoji" value={editedEmoji} onChange={(e) => setEditedEmoji(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">Content</Label>
              <Textarea id="content" value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

interface WeeklyFocusCardProps {
  weeklyFocus: WeeklyFocus | null;
  updateWeeklyFocus: (updates: Partial<Omit<WeeklyFocus, 'id' | 'user_id' | 'week_start_date'>>) => Promise<WeeklyFocus>;
}

const WeeklyFocusCard: React.FC<WeeklyFocusCardProps> = ({ weeklyFocus, updateWeeklyFocus }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [primaryFocus, setPrimaryFocus] = useState(weeklyFocus?.primary_focus || '');
  const [secondaryFocus, setSecondaryFocus] = useState(weeklyFocus?.secondary_focus || '');
  const [tertiaryFocus, setTertiaryFocus] = useState(weeklyFocus?.tertiary_focus || '');

  useEffect(() => {
    setPrimaryFocus(weeklyFocus?.primary_focus || '');
    setSecondaryFocus(weeklyFocus?.secondary_focus || '');
    setTertiaryFocus(weeklyFocus?.tertiary_focus || '');
  }, [weeklyFocus]);

  const handleSave = async () => {
    await updateWeeklyFocus({
      primary_focus: primaryFocus,
      secondary_focus: secondaryFocus,
      tertiary_focus: tertiaryFocus,
    });
    setIsEditing(false);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Weekly Focus</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {isEditing ? (
          <div className="space-y-3">
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
            <Button onClick={handleSave} className="w-full">Save Focus</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-700"><strong>Primary:</strong> {weeklyFocus?.primary_focus || 'Not set'}</p>
            <p className="text-sm text-gray-700"><strong>Secondary:</strong> {weeklyFocus?.secondary_focus || 'Not set'}</p>
            <p className="text-sm text-gray-700"><strong>Tertiary:</strong> {weeklyFocus?.tertiary_focus || 'Not set'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { userId: currentUserId } = useAuth();
  const { settings, updateSettings } = useSettings();
  const {
    tasks,
    categories: allCategories,
    sections,
    loading: tasksLoading,
    error: tasksError,
    updateTask,
    deleteTask,
    addTask,
    onToggleFocusMode,
    onLogDoTodayOff,
  } = useTasks({ userId: currentUserId! });

  const { dailyTaskCount } = useDailyTaskCount(tasks);

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
    weeklyFocus,
    customCards,
    isLoading: dashboardDataLoading,
    error: dashboardDataError,
    updateWeeklyFocus,
    addCustomCard,
    reorderCustomCards,
  } = useDashboardData();

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [activeDragItem, setActiveDragItem] = useState<CustomCard | null>(null);

  const handleAddCustomCard = async () => {
    if (newCardTitle.trim()) {
      await addCustomCard({
        title: newCardTitle,
        content: newCardContent,
        emoji: newCardEmoji,
        card_order: (customCards as CustomCard[]).length,
      });
      setNewCardTitle('');
      setNewCardContent('');
      setNewCardEmoji('');
      setIsAddCardDialogOpen(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem((customCards as CustomCard[]).find(card => card.id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over) return;

    if (active.id !== over.id) {
      const oldIndex = (customCards as CustomCard[]).findIndex(card => card.id === active.id);
      const newIndex = (customCards as CustomCard[]).findIndex(card => card.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedCards = arrayMove(customCards as CustomCard[], oldIndex, newIndex);
        await reorderCustomCards(newOrderedCards.map(card => card.id));
      }
    }
    setActiveDragItem(null);
  };

  const loading = tasksLoading || appointmentsLoading || dashboardDataLoading;
  const error = tasksError || appointmentsError || dashboardDataError;

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Welcome Card */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              👋 Welcome back, {currentUserId?.substring(0, 8)}!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-2">You have <span className="font-bold">{dailyTaskCount}</span> tasks to focus on today.</p>
            <p className="text-sm text-blue-100">Let's make it a productive day!</p>
          </CardContent>
        </Card>

        {/* Add Custom Card */}
        <Card className="flex flex-col items-center justify-center p-6 text-center border-dashed border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer" onClick={() => setIsAddCardDialogOpen(true)}>
          <Plus className="h-8 w-8 text-gray-500 mb-2" />
          <p className="text-lg font-semibold text-gray-700">Add Custom Card</p>
          <p className="text-sm text-gray-500">Personalize your dashboard</p>
        </Card>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow">
          {/* Render Custom Cards */}
          {(customCards as CustomCard[]).length > 0 && (
            <SortableContext items={(customCards as CustomCard[]).map(card => card.id)} strategy={verticalListSortingStrategy}>
              {(customCards as CustomCard[]).filter(card => card.is_visible).map(card => (
                <SortableCustomCard key={card.id} card={card} />
              ))}
            </SortableContext>
          )}

          {/* Daily Schedule Preview */}
          <DailySchedulePreview
            appointments={appointments}
            onAddAppointment={() => { /* Open add appointment modal */ }}
          />

          {/* Weekly Focus Card */}
          <WeeklyFocusCard
            weeklyFocus={weeklyFocus}
            updateWeeklyFocus={updateWeeklyFocus}
          />

          {/* People Memory Card */}
          <PeopleMemoryCard />

          {/* Quick Links Card */}
          <QuickLinks />

          {/* Example Task List (can be replaced by a custom card) */}
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader>
              <CardTitle>Today's Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
              <TaskList
                tasks={tasks}
                categories={allCategories}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onAddTask={addTask}
                onAddSubtask={async (description, parentTaskId) => { await addTask(description, null, parentTaskId); }}
                onToggleFocusMode={onToggleFocusMode}
                onLogDoTodayOff={onLogDoTodayOff}
                sections={sections as TaskSection[]}
                allCategories={allCategories}
                currentDate={today}
                createSection={() => {}}
                updateSection={() => {}}
                deleteSection={() => {}}
                updateSectionIncludeInFocusMode={() => {}}
                showCompleted={false}
                showFilters={false}
              />
            </CardContent>
          </Card>
        </div>
      </DndContext>

      {/* Add Custom Card Dialog */}
      <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Custom Card</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCardTitle" className="text-right">Title</Label>
              <Input id="newCardTitle" value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCardEmoji" className="text-right">Emoji</Label>
              <Input id="newCardEmoji" value={newCardEmoji} onChange={(e) => setNewCardEmoji(e.target.value)} className="col-span-3" placeholder="e.g., ✨" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCardContent" className="text-right">Content</Label>
              <Textarea id="newCardContent" value={newCardContent} onChange={(e) => setNewCardContent(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddCustomCard}>Add Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;