import React, { useState, useCallback, useMemo } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import { ListTodo, CalendarDays, Users, Target } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useUserSettings } from '@/hooks/useUserSettings';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard'; // Import CustomCard for DragOverlay

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { settings: userSettings, updateSettings } = useUserSettings({ userId: demoUserId });
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
  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });
  const { people, loading: peopleLoading } = usePeopleMemory({ userId: demoUserId });

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

    const visibleCustomCards = customCards.filter(card => card.is_visible);
    const oldIndex = visibleCustomCards.findIndex(card => card.id === active.id);
    const newIndex = visibleCustomCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(visibleCustomCards, oldIndex, newIndex);
    await reorderCustomCards(newOrderedCards.map((card: CustomCardType) => card.id));
  };

  const visibleCustomCards = useMemo(() => customCards.filter(card => card.is_visible), [customCards]);

  const dashboardLayout = userSettings?.dashboard_layout || {};
  const dashboardPanelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  const handlePanelLayoutChange = useCallback((sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  }, [updateSettings]);

  const renderBuiltInCard = useCallback((key: string) => {
    if (dashboardLayout[key] === false) return null;

    switch (key) {
      case 'dailyBriefingVisible':
        return <DailyBriefingCard key="daily-briefing" isDemo={isDemo} demoUserId={demoUserId} />;
      case 'dailyScheduleVisible':
        return <DailySchedulePreview key="daily-schedule-preview" />;
      case 'weeklyFocusVisible':
        return <WeeklyFocusCard key="weekly-focus" weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />;
      case 'peopleMemoryVisible':
        return <PeopleMemoryCard key="people-memory" />;
      case 'meditationNotesVisible':
        return <MeditationNotesCard key="meditation-notes" settings={userSettings} updateSettings={updateSettings} loading={dashboardDataLoading} />;
      default:
        return null;
    }
  }, [dashboardLayout, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, userSettings, updateSettings, isDemo, demoUserId]);

  const topRowCards = useMemo(() => {
    const cards = [
      renderBuiltInCard('dailyBriefingVisible'),
      renderBuiltInCard('dailyScheduleVisible'),
      renderBuiltInCard('weeklyFocusVisible'),
    ].filter(Boolean);
    return cards.length > 0 ? cards : null;
  }, [renderBuiltInCard]);

  const bottomRowCards = useMemo(() => {
    const cards = [
      renderBuiltInCard('peopleMemoryVisible'),
      renderBuiltInCard('meditationNotesVisible'),
      <PomodoroCard key="pomodoro-card" />,
    ].filter(Boolean);
    return cards.length > 0 ? cards : null;
  }, [renderBuiltInCard]);

  const customCardIds = useMemo(() => visibleCustomCards.map(card => card.id), [visibleCustomCards]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <DashboardHeader onAddCard={() => setIsAddCardDialogOpen(true)} onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)} isDemo={isDemo} demoUserId={demoUserId} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Tasks Due Today"
          value={tasksDue}
          icon={ListTodo}
          description="Tasks needing attention"
          loading={statsLoading}
        />
        <StatCard
          title="Tasks Completed Today"
          value={tasksCompleted}
          icon={ListTodo}
          description="Great work!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={CalendarDays}
          description="Scheduled events"
          loading={statsLoading}
        />
        <StatCard
          title="People in Memory"
          value={people.length}
          icon={Users}
          description="Connections made"
          loading={peopleLoading || statsLoading}
        />
      </div>

      <PanelGroup direction="vertical" className="h-[calc(100vh-250px)]" onLayout={handlePanelLayoutChange}>
        {topRowCards && (
          <Panel defaultSize={dashboardPanelSizes[0]} minSize={20}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 h-full">
              {topRowCards}
            </div>
          </Panel>
        )}

        {topRowCards && bottomRowCards && <PanelResizeHandle className="h-2 w-full hover:bg-border-primary/50 transition-colors" />}

        {bottomRowCards && (
          <Panel defaultSize={dashboardPanelSizes[1]} minSize={20}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 h-full">
              {bottomRowCards}
            </div>
          </Panel>
        )}
      </PanelGroup>

      {visibleCustomCards.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Your Custom Cards</h2>
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={customCardIds} strategy={verticalListSortingStrategy}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      )}

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