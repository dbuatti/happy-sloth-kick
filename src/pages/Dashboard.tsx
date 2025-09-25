import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import { ListTodo, CalendarDays, Users, Sparkles } from 'lucide-react';
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import CustomCard from '@/components/dashboard/CustomCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { loading: statsLoading, tasksDue, tasksCompleted, appointmentsToday } = useDashboardStats({ userId: demoUserId });
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

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: DragEndEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (active.id !== over?.id) {
      const oldIndex = customCards.findIndex(card => card.id === active.id);
      const newIndex = customCards.findIndex(card => card.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(customCards, oldIndex, newIndex).map(card => card.id);
        await reorderCustomCards(newOrder);
      }
    }
  };

  const activeCard = activeCardId ? customCards.find(card => card.id === activeCardId) : null;

  const visibleBuiltInCards = useMemo(() => {
    if (!userSettings?.dashboard_layout) return [];
    return [
      { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
      { key: 'dailyScheduleVisible', component: <DailySchedulePreview /> },
      { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> },
      { key: 'peopleMemoryVisible', component: <PeopleMemoryCard /> },
      { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} /> },
      { key: 'pomodoroTimerVisible', component: <PomodoroCard /> },
    ].filter(card => userSettings.dashboard_layout[card.key] !== false);
  }, [userSettings, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, updateSettings, userSettingsLoading, isDemo, demoUserId]);

  const visibleCustomCards = useMemo(() => {
    return customCards.filter(card => card.is_visible);
  }, [customCards]);

  const allVisibleCards = useMemo(() => {
    const cards = [
      ...visibleBuiltInCards.map(card => ({ id: card.key, component: card.component, type: 'built-in' })),
      ...visibleCustomCards.map(card => ({ id: card.id, component: <CustomCard card={card} />, type: 'custom' })),
    ];
    // Sort custom cards by their order
    cards.sort((a, b) => {
      if (a.type === 'custom' && b.type === 'custom') {
        const cardA = customCards.find(c => c.id === a.id);
        const cardB = customCards.find(c => c.id === b.id);
        return (cardA?.card_order || 0) - (cardB?.card_order || 0);
      }
      return 0;
    });
    return cards;
  }, [visibleBuiltInCards, visibleCustomCards, customCards]);

  const handlePanelLayoutChange = useCallback((sizes: number[]) => {
    if (!isDemo) {
      updateSettings({ dashboard_panel_sizes: sizes });
    }
  }, [isDemo, updateSettings]);

  const defaultPanelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          description="Great job on these tasks!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={CalendarDays}
          description="Events and meetings scheduled"
          loading={statsLoading}
        />
      </div>

      <PanelGroup direction="horizontal" className="h-[calc(100vh-350px)]" onLayout={handlePanelLayoutChange}>
        <Panel defaultSize={defaultPanelSizes[0]} minSize={30}>
          <div className="grid gap-4 h-full pr-2">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={allVisibleCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                {allVisibleCards.map(card => {
                  if (card.type === 'custom') {
                    const customCardData = customCards.find(c => c.id === card.id);
                    return customCardData ? <SortableCustomCard key={card.id} card={customCardData} /> : null;
                  }
                  return <React.Fragment key={card.id}>{card.component}</React.Fragment>;
                })}
              </SortableContext>
              {createPortal(
                <DragOverlay>
                  {activeCard ? <CustomCard card={activeCard} isOverlay /> : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          </div>
        </Panel>
        <PanelResizeHandle className="w-2 flex items-center justify-center">
          <div className="w-1 h-16 bg-border rounded-full hover:bg-primary transition-colors cursor-ew-resize" />
        </PanelResizeHandle>
        <Panel defaultSize={defaultPanelSizes[1]} minSize={20}>
          <div className="grid gap-4 h-full pl-2">
            <PomodoroCard />
          </div>
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