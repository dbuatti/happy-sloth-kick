import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { ListTodo, CalendarDays, Users, Clock, Sparkles } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent, // Import DragStartEvent
  DragOverlay,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
    settings: dashboardSettings,
    updateWeeklyFocus,
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });

  const { settings: userSettings, loading: userSettingsLoading, updateSettings } = useUserSettings({ userId: demoUserId });

  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

  // DND state
  const [activeId, setActiveId] = useState<string | null>(null);
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

  const visibleCards = useMemo(() => {
    const builtIn: CustomCardType[] = [];
    if (userSettings?.dashboard_layout?.dailyBriefingVisible !== false) {
      builtIn.push({ id: 'daily-briefing', title: 'Daily Briefing', content: null, emoji: '✨', card_order: -1, is_visible: true, user_id: 'system' });
    }
    if (userSettings?.dashboard_layout?.dailyScheduleVisible !== false) {
      builtIn.push({ id: 'daily-schedule', title: 'Today\'s Schedule', content: null, emoji: '🗓️', card_order: -1, is_visible: true, user_id: 'system' });
    }
    if (userSettings?.dashboard_layout?.weeklyFocusVisible !== false) {
      builtIn.push({ id: 'weekly-focus', title: 'This Week\'s Focus', content: null, emoji: '🎯', card_order: -1, is_visible: true, user_id: 'system' });
    }
    if (userSettings?.dashboard_layout?.peopleMemoryVisible !== false) {
      builtIn.push({ id: 'people-memory', title: 'People Memory', content: null, emoji: '👥', card_order: -1, is_visible: true, user_id: 'system' });
    }
    if (userSettings?.dashboard_layout?.meditationNotesVisible !== false) {
      builtIn.push({ id: 'meditation-notes', title: 'Meditation Notes', content: null, emoji: '🧘', card_order: -1, is_visible: true, user_id: 'system' });
    }
    builtIn.push({ id: 'pomodoro-timer', title: 'Focus Timer', content: null, emoji: '⏰', card_order: -1, is_visible: true, user_id: 'system' }); // Always visible

    const userCustomCards = customCards.filter(card => card.is_visible);

    // Combine and sort, custom cards will have their order, built-in will be at the end
    const allCards = [...userCustomCards, ...builtIn];
    return allCards.sort((a, b) => (a.card_order ?? Infinity) - (b.card_order ?? Infinity));
  }, [customCards, userSettings?.dashboard_layout]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    const card = visibleCards.find(c => c.id === event.active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCard(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = visibleCards.findIndex(card => card.id === active.id);
    const newIndex = visibleCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(visibleCards, oldIndex, newIndex);
    const customCardIds = newOrderedCards.filter(c => c.user_id !== 'system').map(c => c.id);

    if (customCardIds.length > 0) {
      await reorderCustomCards(customCardIds);
    }
  };

  const handlePanelLayoutChange = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const defaultLayout = userSettings?.dashboard_panel_sizes || [66, 34];

  const renderCardComponent = (card: CustomCardType) => {
    switch (card.id) {
      case 'daily-briefing':
        return <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />;
      case 'daily-schedule':
        return <DailySchedulePreview />;
      case 'weekly-focus':
        return <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />;
      case 'people-memory':
        return <PeopleMemoryCard />;
      case 'meditation-notes':
        return <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} />;
      case 'pomodoro-timer':
        return <PomodoroCard />;
      default:
        return <SortableCustomCard card={card} />;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <DashboardHeader onAddCard={() => setIsAddCardDialogOpen(true)} onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)} isDemo={isDemo} demoUserId={demoUserId} />

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
          description="Great job on these!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={CalendarDays}
          description="Scheduled events for today"
          loading={statsLoading}
        />
        <StatCard
          title="People in Memory"
          value={0} // This stat is not directly available from useDashboardStats
          icon={Users}
          description="Connections to nurture"
          loading={statsLoading}
        />
      </div>

      <PanelGroup direction="horizontal" className="h-[calc(100vh-280px)]" onLayout={handlePanelLayoutChange}>
        <Panel defaultSize={defaultLayout[0]} minSize={30}>
          <Card className="h-full shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Your Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)] overflow-y-auto">
              {dashboardDataLoading || userSettingsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="h-48 w-full">
                      <CardContent className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={visibleCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                    <div className={cn("grid gap-4", visibleCards.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                      {visibleCards.map(card => (
                        <div key={card.id} className="min-h-[150px]">
                          {renderCardComponent(card)}
                        </div>
                      ))}
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
              )}
            </CardContent>
          </Card>
        </Panel>
        <PanelResizeHandle className="w-2 bg-border/50 hover:bg-border transition-colors duration-200" />
        <Panel defaultSize={defaultLayout[1]} minSize={20}>
          <Card className="h-full shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)] overflow-y-auto">
              {/* QuickLinks component is already in DashboardHeader, this is a placeholder for other content */}
              <p className="text-muted-foreground">Additional dashboard content can go here.</p>
            </CardContent>
          </Card>
        </Panel>
      </PanelGroup>

      <AddCustomCardDialog
        isOpen={isAddCardDialogOpen}
        onClose={() => setIsAddCardDialogOpen(false)}
      />

      <DashboardLayoutSettings
        isOpen={isCustomizeLayoutOpen}
        onClose={() => setIsCustomizeLayoutOpen(false)}
        settings={userSettings}
        customCards={customCards}
        updateSettings={updateSettings}
        updateCustomCard={updateCustomCard}
      />
    </div>
  );
};

export default Dashboard;