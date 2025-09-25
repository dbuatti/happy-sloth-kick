import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, UniqueIdentifier, PointerSensor, KeyboardSensor, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from 'react-resizable-panels';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Plus, Settings as SettingsIcon, CheckCircle2, CalendarDays, Users, Leaf, Clock, Sparkles } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import StatCard from '@/components/dashboard/StatCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard'; // Import the component itself
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData'; // Import CustomCardType
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const isMobile = useIsMobile();

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
  } = useDashboardData({ userId });

  const {
    tasksDue,
    tasksCompleted,
    appointmentsToday,
    loading: statsLoading,
  } = useDashboardStats({ userId });

  const { settings: userSettings, updateSettings } = useSettings({ userId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  // DND state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeCard, setActiveCard] = useState<CustomCardType | null>(null); // Use CustomCardType

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    const card = customCards.find(c => c.id === event.active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCard(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(customCards, oldIndex, newIndex).map(card => card.id);
    await reorderCustomCards(newOrder);
  };

  const visibleBuiltInCards = useMemo(() => {
    const layout = userSettings?.dashboard_layout || {};
    const builtInCards = [
      { key: 'dailyBriefingVisible', label: 'Daily Briefing', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />, icon: Sparkles },
      { key: 'dailyScheduleVisible', label: 'Daily Schedule Preview', component: <DailySchedulePreview />, icon: CalendarDays },
      { key: 'weeklyFocusVisible', label: "This Week's Focus", component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />, icon: Sparkles },
      { key: 'peopleMemoryVisible', label: 'People Memory', component: <PeopleMemoryCard />, icon: Users },
      { key: 'meditationNotesVisible', label: 'Meditation Notes', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={dashboardDataLoading} />, icon: Leaf },
      { key: 'pomodoroTimerVisible', label: 'Pomodoro Timer', component: <PomodoroCard />, icon: Clock },
    ];
    return builtInCards.filter(card => layout[card.key] !== false);
  }, [userSettings, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, isDemo, demoUserId, updateSettings]);

  const visibleCustomCards = useMemo(() => {
    return customCards.filter(card => card.is_visible);
  }, [customCards]);

  const allVisibleCardIds = useMemo(() => {
    return [
      ...visibleBuiltInCards.map(card => card.key),
      ...visibleCustomCards.map(card => card.id),
    ];
  }, [visibleBuiltInCards, visibleCustomCards]);

  const handlePanelLayoutChange = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const defaultPanelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

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
          value={tasksDue}
          icon={CalendarDays}
          description="Don't miss your deadlines!"
          loading={statsLoading}
        />
        <StatCard
          title="Tasks Completed Today"
          value={tasksCompleted}
          icon={CheckCircle2}
          description="Great job on your progress!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={CalendarDays}
          description="Stay on top of your schedule."
          loading={statsLoading}
        />
        <StatCard
          title="Daily Focus Score"
          value="85%" // Placeholder for now
          icon={Sparkles}
          description="Keep up the great work!"
          loading={statsLoading}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ResizablePanelGroup
          direction={isMobile ? "vertical" : "horizontal"}
          className="min-h-[500px] rounded-xl border"
          onLayout={handlePanelLayoutChange}
        >
          <ResizablePanel defaultSize={defaultPanelSizes[0]}>
            <div className="flex h-full items-center justify-center p-2">
              <SortableContext items={allVisibleCardIds} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full h-full">
                  {visibleBuiltInCards.map(card => (
                    <div key={card.key} className="h-full">
                      {card.component}
                    </div>
                  ))}
                  {visibleCustomCards.map(card => (
                    <SortableCustomCard key={card.id} card={card} />
                  ))}
                </div>
              </SortableContext>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={defaultPanelSizes[1]}>
            <div className="flex h-full items-center justify-center p-2">
              <Card className="h-full w-full shadow-lg rounded-xl">
                <CardHeader>
                  <CardTitle>Quick Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Your frequently used tools and information.</p>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

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