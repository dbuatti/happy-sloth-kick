import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import StatCard from '@/components/dashboard/StatCard';
import { ListTodo, CalendarDays, Clock, Users } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';

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
  verticalListSortingStrategy,
  arrayMove, // Import arrayMove
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard'; // For DragOverlay

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const {
    loading: dashboardDataLoading,
    weeklyFocus,
    customCards,
    settings: dashboardSettings, // Renamed to avoid conflict with userSettings
    updateWeeklyFocus,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });

  const { settings: userSettings, loading: userSettingsLoading, updateSettings } = useUserSettings({ userId: demoUserId });
  const { dailyTaskCount, loading: dailyTaskCountLoading } = useDailyTaskCount({ userId: demoUserId });
  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

  // DND state
  const [activeCardData, setActiveCardData] = useState<CustomCardType | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    const activeCard = customCards.find(card => card.id === event.active.id);
    setActiveCardData(activeCard || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCardData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(customCards, oldIndex, newIndex);
    await reorderCustomCards(newOrderedCards.map((card: CustomCardType) => card.id));
  };

  const visibleCustomCards = useMemo(() => customCards.filter(card => card.is_visible), [customCards]);

  const dashboardLayout = userSettings?.dashboard_layout || {};

  const visibleBuiltInCards = useMemo(() => [
    { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
    { key: 'dailyScheduleVisible', component: <DailySchedulePreview /> },
    { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> },
    { key: 'peopleMemoryVisible', component: <PeopleMemoryCard /> },
    { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} /> },
    { key: 'pomodoroTimerVisible', component: <PomodoroCard /> }, // Always visible for now, can be toggled later
  ].filter(card => dashboardLayout[card.key] !== false), [dashboardLayout, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, userSettings, updateSettings, userSettingsLoading, isDemo, demoUserId]);

  const allVisibleCards = useMemo(() => [
    ...visibleBuiltInCards.map(card => ({ id: card.key, component: card.component })),
    ...visibleCustomCards.map(card => ({ id: card.id, component: <CustomCard card={card} /> })),
  ], [visibleBuiltInCards, visibleCustomCards]);

  const orderedCardIds = useMemo(() => {
    // Combine all card IDs (built-in and custom)
    const allIds = new Set([...visibleBuiltInCards.map(c => c.key), ...visibleCustomCards.map(c => c.id)]);
    
    // Get the order from settings, if available
    const savedOrder = userSettings?.dashboard_layout?.order || [];

    // Filter saved order to only include currently visible cards
    const filteredSavedOrder = savedOrder.filter((id: string) => allIds.has(id));

    // Add any new visible cards that are not in the saved order to the end
    const finalOrder = [...filteredSavedOrder];
    allIds.forEach(id => {
      if (!finalOrder.includes(id)) {
        finalOrder.push(id);
      }
    });

    return finalOrder;
  }, [visibleBuiltInCards, visibleCustomCards, userSettings?.dashboard_layout?.order]);

  const orderedCards = useMemo(() => {
    const cardMap = new Map(allVisibleCards.map(card => [card.id, card.component]));
    return orderedCardIds.map(id => ({ id, component: cardMap.get(id) }));
  }, [orderedCardIds, allVisibleCards]);

  const handleLayoutChange = useCallback((sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  }, [updateSettings]);

  const panelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

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
          icon={ListTodo}
          description="Great job on these tasks!"
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
          title="Daily Focus Tasks"
          value={dailyTaskCount}
          icon={Users}
          description="Tasks in focus sections for today"
          loading={dailyTaskCountLoading}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedCardIds} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orderedCards.map(card => (
              <SortableCustomCard key={card.id} card={customCards.find(c => c.id === card.id) || { id: card.id, title: '', content: '', emoji: '', card_order: 0, is_visible: true, user_id: '' }} />
            ))}
          </div>
        </SortableContext>
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeCardData ? (
              <CustomCard card={activeCardData} isOverlay={true} />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

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