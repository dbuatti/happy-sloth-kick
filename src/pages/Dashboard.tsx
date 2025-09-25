"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog'; // Imported AddCustomCardDialog
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, UniqueIdentifier, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ListTodo, CalendarDays, Users, Leaf, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';

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
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });

  const { settings: userSettings, loading: userSettingsLoading, updateSettings } = useUserSettings({ userId: demoUserId });

  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });

  const loading = dashboardDataLoading || userSettingsLoading || statsLoading;

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

  // DND state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeCard, setActiveCard] = useState<CustomCard | null>(null);

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
    const layout = dashboardSettings?.dashboard_layout || {};
    return customCards.filter(card => card.is_visible).sort((a, b) => (a.card_order || 0) - (b.card_order || 0));
  }, [customCards, dashboardSettings]);

  const cardIds = useMemo(() => visibleCards.map(card => card.id), [visibleCards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setActiveCard(visibleCards.find(card => card.id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCard(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cardIds.indexOf(String(active.id));
    const newIndex = cardIds.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedIds = [...cardIds];
    const [movedItem] = newOrderedIds.splice(oldIndex, 1);
    newOrderedIds.splice(newIndex, 0, movedItem);

    await reorderCustomCards(newOrderedIds);
  };

  const handlePanelLayout = useCallback((sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  }, [updateSettings]);

  useKeyboardShortcuts({
    'shift+a': () => setIsAddCardDialogOpen(true),
    'shift+c': () => setIsCustomizeLayoutOpen(true),
  });

  const builtInCards = useMemo(() => [
    { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />, icon: Sparkles, title: 'Daily Briefing' },
    { key: 'dailyScheduleVisible', component: <DailySchedulePreview />, icon: CalendarDays, title: 'Today\'s Schedule' },
    { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />, icon: ListTodo, title: 'This Week\'s Focus' },
    { key: 'peopleMemoryVisible', component: <PeopleMemoryCard />, icon: Users, title: 'People Memory' },
    { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} />, icon: Leaf, title: 'Meditation Notes' },
    { key: 'pomodoroTimerVisible', component: <PomodoroCard />, icon: Clock, title: 'Focus Timer' },
  ], [isDemo, demoUserId, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, userSettings, updateSettings, userSettingsLoading]);

  const visibleBuiltInCards = useMemo(() => {
    const layout = dashboardSettings?.dashboard_layout || {};
    return builtInCards.filter(card => layout[card.key] !== false);
  }, [builtInCards, dashboardSettings]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <StatCard key={i} title="Loading..." value="" icon={ListTodo} description="" loading={true} />
          ))}
        </div>
      ) : (
        <PanelGroup direction="horizontal" className="flex-1" onLayout={handlePanelLayout}>
          <Panel defaultSize={userSettings?.dashboard_panel_sizes?.[0] || 66} minSize={30}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full pr-2">
              <StatCard
                title="Tasks Due Today"
                value={tasksDue}
                icon={ListTodo}
                description="Tasks needing your attention today"
                loading={statsLoading}
                className="col-span-1"
              />
              <StatCard
                title="Tasks Completed Today"
                value={tasksCompleted}
                icon={CheckCircle2}
                description="Great job on your progress!"
                loading={statsLoading}
                className="col-span-1"
              />
              <StatCard
                title="Appointments Today"
                value={appointmentsToday}
                icon={CalendarDays}
                description="Events and meetings on your schedule"
                loading={statsLoading}
                className="col-span-1"
              />

              {visibleBuiltInCards.map(card => (
                <div key={card.key} className={cn(
                  "col-span-1",
                  card.key === 'dailyBriefingVisible' && "md:col-span-2 lg:col-span-3",
                )}>
                  {card.component}
                </div>
              ))}
            </div>
          </Panel>
          <PanelResizeHandle className="w-2 bg-border/50 hover:bg-primary/50 transition-colors duration-200 cursor-ew-resize rounded-full mx-2" />
          <Panel defaultSize={userSettings?.dashboard_panel_sizes?.[1] || 34} minSize={20}>
            <div className="h-full pl-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {visibleCards.map(card => (
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
          </Panel>
        </PanelGroup>
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