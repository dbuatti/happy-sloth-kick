import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData'; // Removed CustomCard type import
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { useUserSettings } from '@/hooks/useUserSettings'; // Removed UserSettings type import
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard'; // Imported CustomCard component

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

interface DashboardCardItem {
  id: UniqueIdentifier;
  component: React.ReactNode;
  isCustom: boolean;
  order: number;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const {
    loading: dashboardDataLoading,
    weeklyFocus,
    customCards,
    settings: dashboardSettings,
    updateWeeklyFocus,
    addCustomCard,
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId });

  const {
    settings: userSettings,
    loading: userSettingsLoading,
    updateSettings,
  } = useUserSettings({ userId });

  const {
    tasksDue,
    tasksCompleted,
    appointmentsToday,
    loading: statsLoading,
  } = useDashboardStats({ userId });

  const { people, loading: peopleLoading } = usePeopleMemory({ userId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const builtInCards = useMemo(() => [
    { key: 'dailyBriefingVisible', label: 'Daily Briefing', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
    { key: 'dailyScheduleVisible', label: 'Daily Schedule Preview', component: <DailySchedulePreview /> },
    { key: 'weeklyFocusVisible', label: "This Week's Focus", component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} /> },
    { key: 'peopleMemoryVisible', label: 'People Memory', component: <PeopleMemoryCard /> },
    { key: 'meditationNotesVisible', label: 'Meditation Notes', component: <MeditationNotesCard settings={userSettings} updateSettings={updateSettings} loading={userSettingsLoading} /> },
    { key: 'pomodoroTimerVisible', label: 'Pomodoro Timer', component: <PomodoroCard /> },
  ], [isDemo, demoUserId, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, userSettings, updateSettings, userSettingsLoading]);

  const allDashboardCards = useMemo(() => {
    const activeBuiltInCards = builtInCards
      .filter(card => dashboardSettings?.dashboard_layout?.[card.key] !== false)
      .map(card => ({ id: card.key, component: card.component, isCustom: false, order: 0 })); // Assign a temporary order

    const activeCustomCards = customCards
      .filter(card => card.is_visible)
      .map(card => ({ id: card.id, component: <CustomCard card={card} />, isCustom: true, order: card.card_order || 0 }));

    return [...activeBuiltInCards, ...activeCustomCards].sort((a, b) => a.order - b.order);
  }, [builtInCards, customCards, dashboardSettings?.dashboard_layout]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = allDashboardCards.findIndex(item => item.id === active.id);
    const newIndex = allDashboardCards.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(allDashboardCards, oldIndex, newIndex);

    // Separate custom cards for reordering
    const customCardOrderUpdates = newOrderedCards
      .filter(item => item.isCustom)
      .map((item, index) => ({
        id: String(item.id),
        card_order: index,
      }));

    if (customCardOrderUpdates.length > 0) {
      await reorderCustomCards(customCardOrderUpdates.map(u => u.id));
    }
  };

  const activeCard = activeId ? allDashboardCards.find(item => item.id === activeId) : null;

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <div className="flex-1 overflow-y-auto">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={allDashboardCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
            <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-180px)]">
              <ResizablePanel defaultSize={userSettings?.dashboard_panel_sizes?.[0] || 66} minSize={30} onResize={(size) => updateSettings({ dashboard_panel_sizes: [size, userSettings?.dashboard_panel_sizes?.[1] || 34] })}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                  {allDashboardCards.map(item => (
                    <SortableCustomCard key={item.id} card={item as any} />
                  ))}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={userSettings?.dashboard_panel_sizes?.[1] || 34} minSize={20} onResize={(size) => updateSettings({ dashboard_panel_sizes: [userSettings?.dashboard_panel_sizes?.[0] || 66, size] })}>
                <div className="grid grid-cols-1 gap-4 p-2">
                  {/* Additional widgets or content for the right panel */}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </SortableContext>
          <DragOverlay>
            {activeCard ? (
              <div className="rotate-2">
                {activeCard.isCustom ? (
                  <CustomCard card={customCards.find(c => c.id === activeCard.id)!} isOverlay />
                ) : (
                  // Render a generic representation for built-in cards if needed
                  <Card className="p-4 shadow-xl ring-2 ring-primary bg-card rounded-xl">
                    <CardContent className="text-center">
                      <p className="font-semibold">{activeCard.id}</p>
                      <p className="text-sm text-muted-foreground">Drag to reorder</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

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