import React, { useState, useMemo, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useDashboardData } from '@/hooks/useDashboardData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import StatCard from '@/components/dashboard/StatCard';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { ListTodo, CalendarDays, CheckCircle2, Plus, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUserSettings } from '@/hooks/useUserSettings';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog
import { useTasks, Task } from '@/hooks/useTasks'; // Import Task and useTasks

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { userSettings, updateSettings, loading: settingsLoading } = useUserSettings({ userId: demoUserId });
  const {
    loading: dashboardDataLoading,
    weeklyFocus,
    customCards,
    addCustomCard,
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });
  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });
  const { processedTasks, sections, allCategories, updateTask, deleteTask } = useTasks({ currentDate: new Date(), userId: demoUserId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [isSavingCard, setIsSavingCard] = useState(false);

  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((task: Task) => {
    setIsTaskOverviewOpen(false);
    // If you have a separate TaskDetailDialog for editing, open it here.
    // For now, we'll just log and close.
    console.log("Edit task from overview:", task.id);
  }, []);

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    setIsSavingCard(true);
    await addCustomCard({
      title: newCardTitle.trim(),
      content: newCardContent.trim() || null,
      emoji: newCardEmoji.trim() || null,
      card_order: customCards.length,
    });
    setIsSavingCard(false);
    setIsAddCardDialogOpen(false);
    setNewCardTitle('');
    setNewCardContent('');
    setNewCardEmoji('');
  };

  const visibleCards = useMemo(() => {
    const layout = userSettings?.dashboard_layout;
    const cards = [];

    if (layout?.dailyBriefingVisible !== false) {
      cards.push(<DailyBriefingCard key="daily-briefing" isDemo={isDemo} demoUserId={demoUserId} />);
    }
    if (layout?.dailyScheduleVisible !== false) {
      cards.push(<DailySchedulePreview key="daily-schedule-preview" />);
    }
    if (layout?.weeklyFocusVisible !== false) {
      cards.push(<WeeklyFocusCard key="weekly-focus" weeklyFocus={weeklyFocus} updateWeeklyFocus={updateCustomCard} loading={dashboardDataLoading} />);
    }
    if (layout?.peopleMemoryVisible !== false) {
      cards.push(<PeopleMemoryCard key="people-memory" />);
    }
    if (layout?.meditationNotesVisible !== false) {
      cards.push(<MeditationNotesCard key="meditation-notes" settings={userSettings} updateSettings={updateSettings} loading={settingsLoading} />);
    }
    cards.push(<PomodoroCard key="pomodoro-card" />);

    const visibleCustomCards = customCards
      .filter(card => card.is_visible)
      .map(card => <SortableCustomCard key={card.id} card={card} />);

    return [...cards, ...visibleCustomCards];
  }, [userSettings, weeklyFocus, customCards, dashboardDataLoading, isDemo, demoUserId, updateCustomCard, updateSettings, settingsLoading]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const orderedCardIds = customCards.map(card => card.id);
    const newOrderedIds = arrayMove(orderedCardIds, oldIndex, newIndex);

    await reorderCustomCards(newOrderedIds);
  };

  const handlePanelLayoutChange = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const defaultPanelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 bg-muted/40">
      <DashboardHeader onAddCard={() => setIsAddCardDialogOpen(true)} onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)} isDemo={isDemo} demoUserId={demoUserId} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard
          title="Tasks Due Today"
          value={tasksDue}
          icon={ListTodo}
          description="Tasks needing your attention today"
          loading={statsLoading}
        />
        <StatCard
          title="Tasks Completed Today"
          value={tasksCompleted}
          icon={CheckCircle2}
          description="Great job on these tasks!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={CalendarDays}
          description="Scheduled events for today"
          loading={statsLoading}
        />
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-xl border" onLayout={handlePanelLayoutChange}>
        <ResizablePanel defaultSize={defaultPanelSizes[0]} minSize={30}>
          <div className="h-full p-2 overflow-y-auto">
            <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
              <SortableContext items={customCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 gap-4">
                  {visibleCards}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultPanelSizes[1]} minSize={20}>
          <div className="h-full p-2 overflow-y-auto">
            <PomodoroCard />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Card</DialogTitle>
            <DialogDescription>
              Create a new custom card for your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="card-title">Title</Label>
              <Input id="card-title" value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} placeholder="My Custom Note" autoFocus />
            </div>
            <div>
              <Label htmlFor="card-emoji">Emoji (Optional)</Label>
              <Input id="card-emoji" value={newCardEmoji} onChange={(e) => setNewCardEmoji(e.target.value)} placeholder="👋" maxLength={2} />
            </div>
            <div>
              <Label htmlFor="card-content">Content</Label>
              <Textarea id="card-content" value={newCardContent} onChange={(e) => setNewCardContent(e.target.value)} placeholder="Write your notes here..." rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCard} disabled={isSavingCard || !newCardTitle.trim()}>
              {isSavingCard ? 'Adding...' : 'Add Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DashboardLayoutSettings
        isOpen={isCustomizeLayoutOpen}
        onClose={() => setIsCustomizeLayoutOpen(false)}
        settings={userSettings}
        customCards={customCards}
        updateSettings={updateSettings}
        updateCustomCard={updateCustomCard}
      />

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks} // Pass processedTasks
        />
      )}
    </div>
  );
};

export default Dashboard;