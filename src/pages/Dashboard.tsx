import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData, CustomCard } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { useUserSettings, UserSettings } from '@/hooks/useUserSettings'; // Import UserSettings type
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = demoUserId || user?.id;

  const {
    loading: dashboardDataLoading,
    weeklyFocus,
    customCards,
    settings: dashboardSettings,
    updateWeeklyFocus,
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: currentUserId });

  const { settings: userSettings, loading: userSettingsLoading, updateSettings } = useUserSettings({ userId: currentUserId });
  const { loading: peopleLoading } = usePeopleMemory({ userId: currentUserId });
  const { loading: statsLoading } = useDashboardStats({ userId: currentUserId });

  const loading = dashboardDataLoading || userSettingsLoading || peopleLoading || statsLoading;

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  const visibleCards = useMemo(() => {
    if (!userSettings || !dashboardSettings) return [];

    const builtInCards = [
      { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
      { key: 'dailyScheduleVisible', component: <DailySchedulePreview /> },
      { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> },
      { key: 'peopleMemoryVisible', component: <PeopleMemoryCard /> },
      { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} /> },
      { key: 'pomodoroTimerVisible', component: <PomodoroCard /> },
    ];

    const activeBuiltInCards = builtInCards
      .filter(card => dashboardSettings.dashboard_layout?.[card.key] !== false)
      .map(card => ({ id: card.key, component: card.component, isCustom: false, order: 0 })); // Assign a temporary order

    const activeCustomCards = customCards
      .filter(card => card.is_visible)
      .map(card => ({ id: card.id, component: <CustomCard card={card} />, isCustom: true, order: card.card_order || 0 }));

    // Combine and sort, custom cards will use their `card_order`
    const combinedCards = [...activeBuiltInCards, ...activeCustomCards];

    // For built-in cards, assign a stable order if custom order is not available
    // This is a simple approach, more complex logic might be needed for specific ordering
    const sortedCards = combinedCards.sort((a, b) => {
      if (a.isCustom && b.isCustom) {
        return a.order - b.order;
      }
      if (a.isCustom) return -1; // Custom cards before built-in
      if (b.isCustom) return 1;
      return 0; // Keep original order for built-in if no custom order
    });

    return sortedCards;
  }, [userSettings, dashboardSettings, customCards, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, updateSettings, userSettingsLoading, isDemo, demoUserId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCustomCards = [...customCards];
    const [movedCard] = newOrderedCustomCards.splice(oldIndex, 1);
    newOrderedCustomCards.splice(newIndex, 0, movedCard);

    const orderedIds = newOrderedCustomCards.map(card => card.id);
    await reorderCustomCards(orderedIds);
  };

  const handlePanelResize = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const panelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  const leftColumnCards = visibleCards.filter((_, index) => index % 2 === 0);
  const rightColumnCards = visibleCards.filter((_, index) => index % 2 !== 0);

  return (
    <div className="flex-1 p-4 overflow-auto">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-48 w-full shadow-lg rounded-xl">
              <CardContent className="flex items-center justify-center h-full">
                <LayoutGrid className="h-12 w-12 text-muted-foreground animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[calc(100vh-180px)] rounded-xl"
          onLayout={handlePanelResize}
        >
          <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
            <div className="grid grid-cols-1 gap-6 p-2">
              {leftColumnCards.map(card => (
                card.isCustom ? (
                  <DndContext key={card.id} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
                    <SortableContext items={customCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      <SortableCustomCard card={customCards.find(c => c.id === card.id)!} />
                    </SortableContext>
                  </DndContext>
                ) : (
                  <React.Fragment key={card.id}>
                    {card.component}
                  </React.Fragment>
                )
              ))}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className="w-3 bg-border/50 hover:bg-border transition-colors duration-200" />
          <ResizablePanel defaultSize={panelSizes[1]} minSize={30}>
            <div className="grid grid-cols-1 gap-6 p-2">
              {rightColumnCards.map(card => (
                card.isCustom ? (
                  <DndContext key={card.id} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
                    <SortableContext items={customCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      <SortableCustomCard card={customCards.find(c => c.id === card.id)!} />
                    </SortableContext>
                  </DndContext>
                ) : (
                  <React.Fragment key={card.id}>
                    {card.component}
                  </React.Fragment>
                )
              ))}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

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