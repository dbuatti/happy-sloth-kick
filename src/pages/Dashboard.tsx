import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardData, CustomCard as CustomCardType, WeeklyFocus } from '@/hooks/useDashboardData';
import { useAuth } from '@/context/AuthContext';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import { ListTodo, CheckCircle2, CalendarDays, Users, Leaf, Clock } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { useSettings } from '@/context/SettingsContext';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard'; // Corrected import

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
    settings,
    updateWeeklyFocus,
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: userId });

  const {
    tasksDue,
    tasksCompleted,
    appointmentsToday,
    loading: statsLoading,
  } = useDashboardStats({ userId: userId });

  const { loading: peopleLoading } = usePeopleMemory({ userId: userId });
  const { settings: userSettings, updateSettings } = useSettings({ userId: userId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);

  // DND state
  const [activeCard, setActiveCard] = useState<CustomCardType | null>(null); // Use CustomCardType

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
    const builtIn = [
      { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />, defaultOrder: 0 },
      { key: 'dailyScheduleVisible', component: <DailySchedulePreview />, defaultOrder: 1 },
      { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />, defaultOrder: 2 },
      { key: 'peopleMemoryVisible', component: <PeopleMemoryCard />, defaultOrder: 3 },
      { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={dashboardDataLoading} />, defaultOrder: 4 },
      { key: 'pomodoroTimerVisible', component: <PomodoroCard />, defaultOrder: 5 }, // Assuming this is always visible or has its own toggle
    ];

    const allCards: (CustomCardType | { id: string; component: React.ReactNode; card_order: number; is_visible: boolean; })[] = [];

    // Add built-in cards if visible
    builtIn.forEach(card => {
      if (userSettings?.dashboard_layout?.[card.key] !== false) {
        allCards.push({
          id: card.key, // Use key as ID for built-in cards
          component: card.component,
          card_order: card.defaultOrder,
          is_visible: true,
        });
      }
    });

    // Add custom cards if visible
    customCards.forEach(card => {
      if (card.is_visible) {
        allCards.push(card);
      }
    });

    // Sort all cards by their `card_order` property
    return allCards.sort((a, b) => (a.card_order || Infinity) - (b.card_order || Infinity));
  }, [customCards, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, userSettings, updateSettings, isDemo, demoUserId]);

  const cardIds = useMemo(() => visibleCards.map(card => card.id), [visibleCards]);

  const handleDragStart = (event: DragStartEvent) => {
    const activeCard = visibleCards.find(card => card.id === event.active.id);
    setActiveCard(activeCard as CustomCardType || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cardIds.indexOf(String(active.id));
    const newIndex = cardIds.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedIds = arrayMove(cardIds, oldIndex, newIndex);
    await reorderCustomCards(newOrderedIds as string[]);
  };

  const handlePanelResize = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const defaultPanelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard
          title="Tasks Due Today"
          value={statsLoading ? '...' : tasksDue}
          icon={ListTodo}
          description="Tasks needing your attention today"
          loading={statsLoading}
        />
        <StatCard
          title="Tasks Completed Today"
          value={statsLoading ? '...' : tasksCompleted}
          icon={CheckCircle2}
          description="Great job on these tasks!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={statsLoading ? '...' : appointmentsToday}
          icon={CalendarDays}
          description="Scheduled events for your day"
          loading={statsLoading}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[600px] rounded-lg border"
            onLayout={handlePanelResize}
          >
            <ResizablePanel defaultSize={defaultPanelSizes[0]}>
              <div className="grid grid-cols-1 gap-4 p-4 h-full">
                {visibleCards.filter((_, index) => index % 2 === 0).map(card => (
                  card.component ? (
                    <SortableCustomCard key={card.id} card={card as CustomCardType} />
                  ) : (
                    <Card key={card.id} className="h-full shadow-lg rounded-xl flex items-center justify-center text-muted-foreground">
                      <CardContent>Error: Component not found</CardContent>
                    </Card>
                  )
                ))}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={defaultPanelSizes[1]}>
              <div className="grid grid-cols-1 gap-4 p-4 h-full">
                {visibleCards.filter((_, index) => index % 2 !== 0).map(card => (
                  card.component ? (
                    <SortableCustomCard key={card.id} card={card as CustomCardType} />
                  ) : (
                    <Card key={card.id} className="h-full shadow-lg rounded-xl flex items-center justify-center text-muted-foreground">
                      <CardContent>Error: Component not found</CardContent>
                    </Card>
                  )
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