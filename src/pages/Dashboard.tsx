import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import { useAuth } from '@/context/AuthContext';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard';
import { useSettings } from '@/context/SettingsContext'; // Corrected import

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
    updateWeeklyFocus,
    reorderCustomCards,
    updateCustomCard,
  } = useDashboardData({ userId: userId });

  const { settings: userSettings, updateSettings, loading: settingsLoading } = useSettings(); // Corrected useSettings call

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
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
    setActiveId(String(event.active.id));
    setActiveCardData(customCards.find(card => card.id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCardData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(customCards, oldIndex, newIndex);
    await reorderCustomCards(newOrderedCards.map(card => card.id));
  };

  const visibleCustomCards = useMemo(() => {
    return customCards.filter(card => card.is_visible);
  }, [customCards]);

  const builtInCards = useMemo(() => {
    if (!userSettings) return [];
    return [
      userSettings.dashboard_layout?.dailyBriefingVisible !== false && { id: 'daily-briefing', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
      userSettings.dashboard_layout?.dailyScheduleVisible !== false && { id: 'daily-schedule', component: <DailySchedulePreview /> },
      userSettings.dashboard_layout?.weeklyFocusVisible !== false && { id: 'weekly-focus', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> },
      userSettings.dashboard_layout?.peopleMemoryVisible !== false && { id: 'people-memory', component: <PeopleMemoryCard /> },
      userSettings.dashboard_layout?.meditationNotesVisible !== false && { id: 'meditation-notes', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={settingsLoading} /> },
      { id: 'pomodoro-timer', component: <PomodoroCard /> }, // Always visible, not toggleable via layout settings
    ].filter(Boolean) as { id: string; component: React.ReactNode }[];
  }, [userSettings, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, isDemo, demoUserId, updateSettings, settingsLoading]);

  const allDashboardItems = useMemo(() => {
    return [...builtInCards, ...visibleCustomCards.map(card => ({ id: card.id, component: <SortableCustomCard card={card} /> }))];
  }, [builtInCards, visibleCustomCards]);

  const leftPanelItems = useMemo(() => allDashboardItems.filter((_, index) => index % 2 === 0), [allDashboardItems]);
  const rightPanelItems = useMemo(() => allDashboardItems.filter((_, index) => index % 2 !== 0), [allDashboardItems]);

  const handlePanelResize = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const panelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-6">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      {dashboardDataLoading || settingsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-48 shadow-lg rounded-xl">
              <CardContent className="flex items-center justify-center h-full">
                <div className="animate-pulse flex flex-col space-y-3 w-full">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
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
          <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-200px)]" onLayout={handlePanelResize}>
            <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
              <div className="grid gap-4 pr-2">
                {leftPanelItems.map(item => (
                  item.id.startsWith('custom-') ? (
                    <SortableCustomCard key={item.id} card={visibleCustomCards.find(c => c.id === item.id)!} />
                  ) : (
                    <React.Fragment key={item.id}>{item.component}</React.Fragment>
                  )
                ))}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={panelSizes[1]} minSize={30}>
              <div className="grid gap-4 pl-2">
                {rightPanelItems.map(item => (
                  item.id.startsWith('custom-') ? (
                    <SortableCustomCard key={item.id} card={visibleCustomCards.find(c => c.id === item.id)!} />
                  ) : (
                    <React.Fragment key={item.id}>{item.component}</React.Fragment>
                  )
                ))}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeCardData ? (
                <div className="rotate-2">
                  <CustomCard card={activeCardData} isOverlay={true} />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
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