import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSettings } from '@/context/SettingsContext';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import StatCard from '@/components/dashboard/StatCard';
import { ListTodo, CalendarDays, Clock, Target, Users, Leaf, Sparkles } from 'lucide-react';
import CustomCard from '@/components/dashboard/CustomCard';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const {
    loading: dashboardDataLoading,
    weeklyFocus,
    customCards,
    settings: dashboardSettings,
    updateWeeklyFocus,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId });

  const { settings: userSettings, loading: userSettingsLoading, updateSettings } = useSettings({ userId });

  const {
    tasksDue,
    tasksCompleted,
    appointmentsToday,
    loading: statsLoading
  } = useDashboardStats({ userId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeCardData, setActiveCardData] = useState<any>(null); // Can be CustomCard or built-in card data

  const builtInCards = useMemo(() => [
    { key: 'dailyBriefingVisible', label: 'Daily Briefing', component: DailyBriefingCard, icon: Sparkles },
    { key: 'dailyScheduleVisible', label: 'Daily Schedule Preview', component: DailySchedulePreview, icon: CalendarDays },
    { key: 'weeklyFocusVisible', label: "This Week's Focus", component: WeeklyFocusCard, icon: Target },
    { key: 'peopleMemoryVisible', label: 'People Memory', component: PeopleMemoryCard, icon: Users },
    { key: 'meditationNotesVisible', label: 'Meditation Notes', component: MeditationNotesCard, icon: Leaf },
    { key: 'pomodoroTimerVisible', label: 'Pomodoro Timer', component: PomodoroCard, icon: Clock },
  ], []);

  const allDashboardCards = useMemo(() => {
    const activeBuiltInCards = builtInCards
      .filter(card => (dashboardSettings?.dashboard_layout as Record<string, boolean>)?.[card.key] !== false)
      .map(card => ({ id: card.key, component: card.component, isCustom: false, order: 0 })); // Assign a temporary order

    const activeCustomCards = customCards
      .filter(card => card.is_visible)
      .map(card => ({ id: card.id, component: CustomCard, isCustom: true, order: card.card_order, data: card }));

    // Combine and sort by order (custom cards have their own order, built-in get temporary)
    return [...activeBuiltInCards, ...activeCustomCards].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [builtInCards, customCards, dashboardSettings?.dashboard_layout]);

  const cardIds = useMemo(() => allDashboardCards.map(card => card.id), [allDashboardCards]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    const activeCard = allDashboardCards.find(card => card.id === event.active.id);
    setActiveCardData(activeCard);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCardData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cardIds.indexOf(active.id);
    const newIndex = cardIds.indexOf(over.id);

    const newOrderedCards = arrayMove(allDashboardCards, oldIndex, newIndex);

    // Separate custom cards and update their order in DB
    const newCustomCardOrder = newOrderedCards
      .filter(card => card.isCustom)
      .map(card => String(card.id));

    if (newCustomCardOrder.length > 0) {
      await reorderCustomCards(newCustomCardOrder);
    }
    // For built-in cards, their order is implicitly handled by the `allDashboardCards` memoization
    // and the `dashboard_layout` settings. No direct DB update needed for them.
  };

  const handlePanelResize = (sizes: number[]) => {
    if (!userSettingsLoading && userSettings) {
      updateSettings({ dashboard_panel_sizes: sizes });
    }
  };

  const panelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  const loading = dashboardDataLoading || userSettingsLoading || statsLoading;

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="max-w-full mx-auto space-y-6">
        <DashboardHeader
          onAddCard={() => setIsAddCardDialogOpen(true)}
          onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
          isDemo={isDemo}
          demoUserId={demoUserId}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Tasks Due Today"
            value={tasksDue}
            icon={ListTodo}
            description="Tasks needing your attention today"
            loading={loading}
          />
          <StatCard
            title="Tasks Completed Today"
            value={tasksCompleted}
            icon={CheckCircle2}
            description="Great job on these tasks!"
            loading={loading}
          />
          <StatCard
            title="Appointments Today"
            value={appointmentsToday}
            icon={CalendarDays}
            description="Scheduled events for your day"
            loading={loading}
          />
        </div>

        <ResizablePanelGroup
          direction="horizontal"
          className={cn("min-h-[500px] rounded-xl border", loading && "opacity-50")}
          onLayout={handlePanelResize}
        >
          <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
            <div className="flex h-full items-center justify-center p-2">
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 gap-4 w-full h-full">
                    {allDashboardCards.map(card => {
                      const Component = card.component;
                      if (card.isCustom) {
                        return <SortableCustomCard key={card.id} card={card.data} />;
                      } else {
                        // Render built-in cards directly
                        if (card.key === 'weeklyFocusVisible') {
                          return <Component key={card.id} weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />;
                        } else if (card.key === 'meditationNotesVisible') {
                          return <Component key={card.id} settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} />;
                        }
                        return <Component key={card.id} isDemo={isDemo} demoUserId={demoUserId} />;
                      }
                    })}
                  </div>
                </SortableContext>
                {createPortal(
                  <DragOverlay dropAnimation={null}>
                    {activeId && activeCardData && (
                      activeCardData.isCustom ? (
                        <CustomCard card={activeCardData.data} isOverlay={true} />
                      ) : (
                        // Render built-in card overlay
                        <div className="rotate-2">
                          {activeCardData.key === 'weeklyFocusVisible' && <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />}
                          {activeCardData.key === 'meditationNotesVisible' && <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} />}
                          {activeCardData.key === 'dailyBriefingVisible' && <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />}
                          {activeCardData.key === 'dailyScheduleVisible' && <DailySchedulePreview />}
                          {activeCardData.key === 'peopleMemoryVisible' && <PeopleMemoryCard />}
                          {activeCardData.key === 'pomodoroTimerVisible' && <PomodoroCard />}
                        </div>
                      )
                    )}
                  </DragOverlay>,
                  document.body
                )}
              </DndContext>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={panelSizes[1]} minSize={20}>
            <div className="flex h-full items-center justify-center p-2">
              {/* Right panel content, e.g., a single large card or another grid */}
              <PomodoroCard />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <AddCustomCardDialog
        isOpen={isAddCardDialogOpen}
        onClose={() => setIsAddCardDialogOpen(false)}
      />

      <DashboardLayoutSettings
        isOpen={isLayoutSettingsOpen}
        onClose={() => setIsLayoutSettingsOpen(false)}
        settings={userSettings}
        customCards={customCards}
        updateSettings={updateSettings}
        updateCustomCard={updateCustomCard}
      />
    </div>
  );
};

export default Dashboard;