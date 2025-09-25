import React, { useState, useMemo, useCallback } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import { ListTodo, CalendarDays, Sparkles, Leaf, Clock, Users } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import CustomCard from '@/components/dashboard/CustomCard';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const {
    loading: dashboardDataLoading,
    weeklyFocus,
    customCards,
    settings,
    updateWeeklyFocus,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });

  const {
    settings: userSettings,
    loading: userSettingsLoading,
    updateSettings,
  } = useUserSettings({ userId: demoUserId });

  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });
  const { dailyTaskCount, loading: dailyTaskCountLoading } = useDailyTaskCount({ userId: demoUserId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

  // DND state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const activeCard = activeId ? customCards.find(card => card.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(customCards, oldIndex, newIndex);
    await reorderCustomCards(newOrderedCards.map(card => card.id));
  };

  const visibleBuiltInCards = useMemo(() => {
    const layout = userSettings?.dashboard_layout || {};
    return {
      dailyBriefingVisible: layout.dailyBriefingVisible !== false,
      dailyScheduleVisible: layout.dailyScheduleVisible !== false,
      weeklyFocusVisible: layout.weeklyFocusVisible !== false,
      peopleMemoryVisible: layout.peopleMemoryVisible !== false,
      meditationNotesVisible: layout.meditationNotesVisible !== false,
      pomodoroVisible: layout.pomodoroVisible !== false, // Assuming pomodoro is always visible or has a default true
    };
  }, [userSettings?.dashboard_layout]);

  const visibleCustomCards = useMemo(() => {
    return customCards.filter(card => card.is_visible);
  }, [customCards]);

  const allCards = useMemo(() => {
    const cards = [];
    if (visibleBuiltInCards.dailyBriefingVisible) cards.push({ id: 'daily-briefing', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> });
    if (visibleBuiltInCards.dailyScheduleVisible) cards.push({ id: 'daily-schedule', component: <DailySchedulePreview /> });
    if (visibleBuiltInCards.weeklyFocusVisible) cards.push({ id: 'weekly-focus', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> });
    if (visibleBuiltInCards.peopleMemoryVisible) cards.push({ id: 'people-memory', component: <PeopleMemoryCard /> });
    if (visibleBuiltInCards.meditationNotesVisible) cards.push({ id: 'meditation-notes', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} /> });
    if (visibleBuiltInCards.pomodoroVisible) cards.push({ id: 'pomodoro', component: <PomodoroCard /> });

    visibleCustomCards.forEach(card => {
      cards.push({ id: card.id, component: <CustomCard card={card} /> });
    });

    return cards;
  }, [
    visibleBuiltInCards,
    visibleCustomCards,
    weeklyFocus,
    updateWeeklyFocus,
    dashboardDataLoading,
    userSettings,
    updateSettings,
    userSettingsLoading,
    isDemo,
    demoUserId,
  ]);

  const handlePanelGroupChange = useCallback((sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  }, [updateSettings]);

  const panelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  return (
    <div className="flex-1 p-4 overflow-auto">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Tasks Due Today"
          value={tasksDue}
          icon={ListTodo}
          description="Tasks needing attention today"
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
          description="Events and meetings"
          loading={statsLoading}
        />
        <StatCard
          title="Daily Focus Tasks"
          value={dailyTaskCount}
          icon={Leaf}
          description="Tasks in focus mode"
          loading={dailyTaskCountLoading}
        />
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-xl border shadow-lg" onLayout={handlePanelGroupChange}>
        <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
          <div className="h-full p-4">
            <h2 className="text-2xl font-bold mb-4">Your Dashboard</h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={visibleCustomCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {visibleCustomCards.map(card => (
                    <SortableCustomCard key={card.id} card={card} />
                  ))}
                </div>
              </SortableContext>
              {createPortal(
                <DragOverlay dropAnimation={null}>
                  {activeCard ? (
                    <div className="rotate-2">
                      <CustomCard card={activeCard} isOverlay={true} />
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={panelSizes[1]} minSize={20}>
          <div className="h-full p-4 space-y-4">
            {visibleBuiltInCards.dailyBriefingVisible && <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />}
            {visibleBuiltInCards.dailyScheduleVisible && <DailySchedulePreview />}
            {visibleBuiltInCards.weeklyFocusVisible && <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />}
            {visibleBuiltInCards.peopleMemoryVisible && <PeopleMemoryCard />}
            {visibleBuiltInCards.meditationNotesVisible && <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} />}
            {visibleBuiltInCards.pomodoroVisible && <PomodoroCard />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

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