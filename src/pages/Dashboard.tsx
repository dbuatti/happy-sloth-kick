import React, { useState, useCallback, useMemo } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "react-resizable-panels";
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import { useUserSettings } from '@/hooks/useUserSettings';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import StatCard from '@/components/dashboard/StatCard';
import { ListTodo, CalendarDays, Users } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';

import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates, // Imported missing utility
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { userSettings, updateSettings } = useUserSettings({ userId: demoUserId });
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

  const visibleCustomCards = useMemo(() => customCards.filter(card => card.is_visible), [customCards]);

  const builtInCards = useMemo(() => [
    { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
    { key: 'dailyScheduleVisible', component: <DailySchedulePreview /> },
    { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> },
    { key: 'peopleMemoryVisible', component: <PeopleMemoryCard /> },
    { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={dashboardDataLoading} /> },
    { key: 'pomodoroTimerVisible', component: <PomodoroCard /> }, // Assuming this is always visible or managed elsewhere
  ], [isDemo, demoUserId, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, userSettings, updateSettings]);

  const allDashboardItems = useMemo(() => {
    const items = [];
    if (userSettings?.dashboard_layout?.dailyBriefingVisible !== false) items.push({ id: 'daily-briefing', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> });
    if (userSettings?.dashboard_layout?.dailyScheduleVisible !== false) items.push({ id: 'daily-schedule', component: <DailySchedulePreview /> });
    if (userSettings?.dashboard_layout?.weeklyFocusVisible !== false) items.push({ id: 'weekly-focus', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> });
    if (userSettings?.dashboard_layout?.peopleMemoryVisible !== false) items.push({ id: 'people-memory', component: <PeopleMemoryCard /> });
    if (userSettings?.dashboard_layout?.meditationNotesVisible !== false) items.push({ id: 'meditation-notes', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={dashboardDataLoading} /> });
    // Pomodoro card is always visible for now, or can be added to settings if desired
    items.push({ id: 'pomodoro-timer', component: <PomodoroCard /> });

    visibleCustomCards.forEach(card => {
      items.push({ id: card.id, component: <CustomCard card={card} /> });
    });

    return items;
  }, [userSettings, isDemo, demoUserId, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, updateSettings, visibleCustomCards]);

  const orderedDashboardItemIds = useMemo(() => {
    // Combine built-in and custom card IDs, maintaining order for custom cards
    const customCardIds = visibleCustomCards.map(card => card.id);
    const builtInCardKeys = builtInCards.map(card => card.key); // Use keys for built-in cards

    // This logic needs to be more robust if built-in cards also need ordering.
    // For now, we'll just append custom cards after built-in ones.
    return [...builtInCardKeys, ...customCardIds];
  }, [builtInCards, visibleCustomCards]);

  const handleDragStart = (event: any) => {
    const activeCard = customCards.find(card => card.id === event.active.id);
    setActiveCard(activeCard || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = visibleCustomCards.findIndex(card => card.id === active.id);
    const newIndex = visibleCustomCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(visibleCustomCards, oldIndex, newIndex);
    await reorderCustomCards(newOrderedCards.map(card => card.id));
  };

  const handleLayoutChange = useCallback((sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  }, [updateSettings]);

  const panelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tasks Due Today"
          value={statsLoading ? <div className="h-8 w-1/2 bg-muted rounded" /> : tasksDue}
          icon={ListTodo}
          description="Tasks needing your attention today"
          loading={statsLoading}
        />
        <StatCard
          title="Tasks Completed Today"
          value={statsLoading ? <div className="h-8 w-1/2 bg-muted rounded" /> : tasksCompleted}
          icon={ListTodo}
          description="Great job on these!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={statsLoading ? <div className="h-8 w-1/2 bg-muted rounded" /> : appointmentsToday}
          icon={CalendarDays}
          description="Scheduled events for your day"
          loading={statsLoading}
        />
        <StatCard
          title="People in Memory"
          value={statsLoading ? <div className="h-8 w-1/2 bg-muted rounded" /> : 0} // Placeholder, actual count not available from useDashboardStats
          icon={Users}
          description="Connections you're nurturing"
          loading={statsLoading}
        />
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border" onLayout={handleLayoutChange}>
        <ResizablePanel defaultSize={panelSizes[0]}>
          <div className="flex h-full items-center justify-center p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {userSettings?.dashboard_layout?.dailyBriefingVisible !== false && (
                <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />
              )}
              {userSettings?.dashboard_layout?.dailyScheduleVisible !== false && (
                <DailySchedulePreview />
              )}
              {userSettings?.dashboard_layout?.weeklyFocusVisible !== false && (
                <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />
              )}
              {userSettings?.dashboard_layout?.peopleMemoryVisible !== false && (
                <PeopleMemoryCard />
              )}
              {userSettings?.dashboard_layout?.meditationNotesVisible !== false && (
                <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={dashboardDataLoading} />
              )}
              <PomodoroCard /> {/* Always visible for now */}
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={panelSizes[1]}>
          <div className="flex h-full items-center justify-center p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={visibleCustomCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 gap-4 w-full">
                  {visibleCustomCards.map(card => (
                    <SortableCustomCard key={card.id} card={card} />
                  ))}
                </div>
              </SortableContext>
              {createPortal(
                <DragOverlay dropAnimation={null}>
                  {activeCard ? (
                    <CustomCard card={activeCard} isOverlay={true} />
                  ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

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