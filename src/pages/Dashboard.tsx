import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, UniqueIdentifier, PointerSensor, KeyboardSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import { useUserSettings } from '@/hooks/useUserSettings';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';

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

  const { settings: userSettings, updateSettings } = useUserSettings(); // Fixed: Removed userId argument

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

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

  const visibleCards = useMemo(() => {
    const builtIn = [
      { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
      { key: 'dailyScheduleVisible', component: <DailySchedulePreview /> },
      { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> },
      { key: 'peopleMemoryVisible', component: <PeopleMemoryCard /> },
      { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={dashboardDataLoading} /> },
      { key: 'pomodoroTimerVisible', component: <PomodoroCard /> },
    ];

    const custom = customCards
      .filter(card => card.is_visible)
      .map(card => ({ key: card.id, component: <SortableCustomCard card={card} /> }));

    const allCards = [...builtIn, ...custom];

    return allCards.filter(card => userSettings?.dashboard_layout?.[card.key] !== false);
  }, [customCards, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, userSettings, isDemo, demoUserId, updateSettings]);

  const cardIds = useMemo(() => visibleCards.map(card => card.key), [visibleCards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    const card = customCards.find(c => c.id === event.active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveCard(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cardIds.indexOf(active.id);
    const newIndex = cardIds.indexOf(over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedIds = arrayMove(cardIds, oldIndex, newIndex);
    await reorderCustomCards(newOrderedIds as string[]);
  };

  const handlePanelLayoutChange = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const defaultPanelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <DashboardHeader onAddCard={() => setIsAddCardDialogOpen(true)} onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)} isDemo={isDemo} demoUserId={demoUserId} />

      {dashboardDataLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-48 w-full shadow-lg rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle><div className="h-6 w-3/4 bg-muted rounded" /></CardTitle>
              </CardHeader>
              <CardContent><div className="h-24 w-full bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border" onLayout={handlePanelLayoutChange}>
              <ResizablePanel defaultSize={defaultPanelSizes[0]}>
                <div className="grid gap-4 p-4">
                  {visibleCards.filter(card => card.key === 'dailyBriefingVisible').map(card => (
                    <div key={card.key} className="h-full">
                      {card.component}
                    </div>
                  ))}
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleCards.filter(card => card.key !== 'dailyBriefingVisible' && card.key !== 'pomodoroTimerVisible').map(card => (
                      <div key={card.key} className="h-full">
                        {card.component}
                      </div>
                    ))}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={defaultPanelSizes[1]}>
                <div className="grid gap-4 p-4">
                  {visibleCards.filter(card => card.key === 'pomodoroTimerVisible').map(card => (
                    <div key={card.key} className="h-full">
                      {card.component}
                    </div>
                  ))}
                  {visibleCards.filter(card => card.key.startsWith('custom-')).map(card => (
                    <SortableCustomCard key={card.key} card={customCards.find(c => c.id === card.key)!} />
                  ))}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
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
      )}

      <AddCustomCardDialog isOpen={isAddCardDialogOpen} onClose={() => setIsAddCardDialogOpen(false)} />
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