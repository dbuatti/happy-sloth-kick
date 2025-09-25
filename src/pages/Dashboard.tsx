"use client";

import React, { useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"; // Corrected imports
import { useDashboardData, CustomCard } from '@/hooks/useDashboardData'; // Removed unused WeeklyFocus
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { ListTodo, CalendarDays, CheckCircle2 } from 'lucide-react'; // Removed unused Plus, StickyNote
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import StatCard from '@/components/dashboard/StatCard';
import { useTasks, Task } from '@/hooks/useTasks';
import { useUserSettings } from '@/hooks/useUserSettings'; // Removed unused UserSettings
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog'; // This component needs to be created or imported from shadcn/ui
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, UniqueIdentifier, DragStartEvent } from '@dnd-kit/core'; // Added DragStartEvent
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import { createPortal } from 'react-dom';
import CustomCardComponent from '@/components/dashboard/CustomCard'; // Renamed to avoid conflict
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { settings, updateSettings, loading: settingsLoading } = useUserSettings({ userId: demoUserId });
  const {
    weeklyFocus,
    customCards,
    loading: dashboardDataLoading,
    updateWeeklyFocus,
    addCustomCard,
    // Removed unused deleteCustomCard
    reorderCustomCards,
    updateCustomCard, // Added updateCustomCard as it's used
  } = useDashboardData({ userId: demoUserId });
  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });
  // Removed unused processedTasks, sections, updateTask, deleteTask
  const { appointments: allAppointments } = useAllAppointments(); // Removed unused allAppointments

  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  // Removed unused taskToOverview, setTaskToOverview

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = customCards.findIndex(card => card.id === active.id);
    const newIndex = customCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const orderedCardIds = customCards.map(card => card.id);
    const newOrderedIds = arrayMove(orderedCardIds, oldIndex, newIndex);
    await reorderCustomCards(newOrderedIds);
  };

  const getCardById = useCallback((id: UniqueIdentifier) => {
    return customCards.find(card => card.id === id);
  }, [customCards]);

  const layout = settings?.dashboard_layout;
  const panelSizes = settings?.dashboard_panel_sizes || [66, 34];

  const handlePanelLayoutChange = useCallback(async (sizes: number[]) => {
    await updateSettings({ dashboard_panel_sizes: sizes });
  }, [updateSettings]);

  const visibleCards = customCards.filter(card => card.is_visible);

  // Removed unused leftColumnCards, rightColumnCards
  // const leftColumnCards = visibleCards.filter((_, index) => index % 2 === 0);
  // const rightColumnCards = visibleCards.filter((_, index) => index % 2 !== 0);

  const hasCustomCards = visibleCards.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <DashboardHeader
        onAddCard={() => setIsAddCardOpen(true)}
        onCustomizeLayout={() => setIsCustomizeLayoutOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
          icon={CheckCircle2}
          description="Great job on these!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={CalendarDays}
          description="Events on your schedule"
          loading={statsLoading}
        />
        <PomodoroCard />
      </div>

      <PanelGroup direction="horizontal" className="min-h-[500px] rounded-xl border" onLayout={handlePanelLayoutChange}>
        <Panel defaultSize={panelSizes[0]} minSize={30}>
          <div className="h-full flex flex-col p-4 pr-2">
            <div className="grid gap-4 flex-1">
              {layout?.dailyBriefingVisible !== false && <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} />}
              {layout?.dailyScheduleVisible !== false && <DailySchedulePreview />}
              {layout?.weeklyFocusVisible !== false && <WeeklyFocusCard key="weekly-focus" weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardDataLoading} />}
              {layout?.peopleMemoryVisible !== false && <PeopleMemoryCard />}
              {layout?.meditationNotesVisible !== false && <MeditationNotesCard settings={settings} updateSettings={updateSettings} loading={settingsLoading} />}
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-2 bg-border-2 hover:bg-primary/50 transition-colors duration-200" />
        <Panel defaultSize={panelSizes[1]} minSize={30}>
          <div className="h-full flex flex-col p-4 pl-2">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-4 flex-1">
                  {visibleCards.map(card => (
                    <SortableCustomCard key={card.id} card={card} />
                  ))}
                  {!hasCustomCards && (
                    <div className="text-center text-muted-foreground py-8">
                      No custom cards yet. Click "Add Card" to create one!
                    </div>
                  )}
                </div>
              </SortableContext>
              {createPortal(
                <DragOverlay>
                  {activeId ? (
                    <CustomCardComponent card={getCardById(activeId)!} isOverlay />
                  ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          </div>
        </Panel>
      </PanelGroup>

      <DashboardLayoutSettings
        isOpen={isCustomizeLayoutOpen}
        onClose={() => setIsCustomizeLayoutOpen(false)}
        settings={settings}
        customCards={customCards}
        updateSettings={updateSettings}
        updateCustomCard={updateCustomCard}
      />

      <AddCustomCardDialog
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onSave={addCustomCard}
      />
    </div>
  );
};

export default Dashboard;