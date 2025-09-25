import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import { ListTodo, CalendarDays, Users, Sparkles, Leaf, Clock } from 'lucide-react';
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove, // Import arrayMove
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const {
    loading: dashboardDataLoading,
    weeklyFocus,
    customCards,
    updateWeeklyFocus,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });

  const { settings, loading: settingsLoading, updateSettings } = useUserSettings({ userId: demoUserId });
  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  // DND state
  const [activeCard, setActiveCard] = useState<CustomCardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: !isDemo,
    })
  );

  const allCards = useMemo(() => {
    const builtInCards: CustomCardType[] = [
      { id: 'dailyBriefing', user_id: 'system', title: 'Daily Briefing', content: null, emoji: '✨', card_order: 0, is_visible: settings?.dashboard_layout?.dailyBriefingVisible !== false },
      { id: 'dailySchedule', user_id: 'system', title: 'Today\'s Schedule', content: null, emoji: '🗓️', card_order: 1, is_visible: settings?.dashboard_layout?.dailyScheduleVisible !== false },
      { id: 'weeklyFocus', user_id: 'system', title: 'This Week\'s Focus', content: null, emoji: '🎯', card_order: 2, is_visible: settings?.dashboard_layout?.weeklyFocusVisible !== false },
      { id: 'peopleMemory', user_id: 'system', title: 'People Memory', content: null, emoji: '👥', card_order: 3, is_visible: settings?.dashboard_layout?.peopleMemoryVisible !== false },
      { id: 'meditationNotes', user_id: 'system', title: 'Meditation Notes', content: null, emoji: '🧘', card_order: 4, is_visible: settings?.dashboard_layout?.meditationNotesVisible !== false },
      { id: 'pomodoroTimer', user_id: 'system', title: 'Focus Timer', content: null, emoji: '⏰', card_order: 5, is_visible: true }, // Always visible, not in settings
    ];

    const userCustomCards = customCards.map(card => ({ ...card, user_id: card.user_id }));

    return [...builtInCards, ...userCustomCards]
      .filter(card => card.is_visible)
      .sort((a, b) => (a.card_order || Infinity) - (b.card_order || Infinity));
  }, [customCards, settings?.dashboard_layout]);

  const visibleCardIds = useMemo(() => allCards.map(card => card.id), [allCards]);

  const handleDragStart = (event: DragStartEvent) => {
    const activeCard = allCards.find(card => card.id === event.active.id);
    setActiveCard(activeCard || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = visibleCardIds.indexOf(String(active.id));
    const newIndex = visibleCardIds.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(allCards, oldIndex, newIndex);
    const customCardIds = newOrderedCards.filter((c: CustomCardType) => c.user_id !== 'system').map((c: CustomCardType) => c.id);
    await reorderCustomCards(customCardIds);
  };

  const handlePanelLayoutChange = useCallback((sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  }, [updateSettings]);

  const panelSizes = settings?.dashboard_panel_sizes || [66, 34];

  const isLoading = dashboardDataLoading || settingsLoading || statsLoading;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 overflow-auto">
      <DashboardHeader onAddCard={() => setIsAddCardDialogOpen(true)} onCustomizeLayout={() => setIsLayoutSettingsOpen(true)} isDemo={isDemo} demoUserId={demoUserId} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          icon={Sparkles}
          description="Great work today!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={CalendarDays}
          description="Events and meetings on your schedule"
          loading={statsLoading}
        />
        <StatCard
          title="People in Memory"
          value={0} // This value is not directly available from useDashboardStats, could be fetched from usePeopleMemory
          icon={Users}
          description="Connections you're nurturing"
          loading={statsLoading}
          className="opacity-0" // Hidden for now as value is hardcoded
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-48 w-full">
              <CardHeader><div className="h-6 w-3/4 bg-muted rounded" /></CardHeader>
              <CardContent><div className="h-24 w-full bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[500px] w-full rounded-lg border"
          onLayout={handlePanelLayoutChange}
        >
          <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={visibleCardIds} strategy={rectSortingStrategy}>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 p-4", allCards.length === 0 && "h-full flex items-center justify-center")}>
                  {allCards.map(card => {
                    if (!card.is_visible) return null;

                    switch (card.id) {
                      case 'dailyBriefing':
                        return <DailyBriefingCard key={card.id} isDemo={isDemo} demoUserId={demoUserId} />;
                      case 'dailySchedule':
                        return <DailySchedulePreview key={card.id} />;
                      case 'weeklyFocus':
                        return <WeeklyFocusCard key={card.id} weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />;
                      case 'peopleMemory':
                        return <PeopleMemoryCard key={card.id} />;
                      case 'meditationNotes':
                        return <MeditationNotesCard key={card.id} settings={settings} updateSettings={updateSettings} loading={settingsLoading} />;
                      case 'pomodoroTimer':
                        return <PomodoroCard key={card.id} />;
                      default:
                        return <SortableCustomCard key={card.id} card={card} />;
                    }
                  })}
                </div>
              </SortableContext>
              {createPortal(
                <DragOverlay dropAnimation={null}>
                  {activeCard ? (
                    <div className="rotate-2">
                      <SortableCustomCard card={activeCard} />
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={panelSizes[1]} minSize={20}>
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">Right Panel Content (e.g., Quick Notes, Calendar)</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <AddCustomCardDialog
        isOpen={isAddCardDialogOpen}
        onClose={() => setIsAddCardDialogOpen(false)}
      />

      <DashboardLayoutSettings
        isOpen={isLayoutSettingsOpen}
        onClose={() => setIsLayoutSettingsOpen(false)}
        settings={settings}
        customCards={customCards}
        updateSettings={updateSettings}
        updateCustomCard={updateCustomCard}
      />
    </div>
  );
};

export default Dashboard;