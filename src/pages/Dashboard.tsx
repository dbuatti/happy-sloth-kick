import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import { Sparkles, Leaf, Users } from 'lucide-react';
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import { useSettings } from '@/context/SettingsContext';
import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCorners, // Import closestCorners
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import StatCard from '@/components/dashboard/StatCard';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { ListTodo, CalendarDays } from 'lucide-react'; // Re-added ListTodo and CalendarDays for StatCard icons

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const {
    loading,
    weeklyFocus,
    customCards,
    updateWeeklyFocus,
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });
  const { settings, updateSettings } = useSettings();
  const { tasksDue, tasksCompleted, appointmentsToday, loading: statsLoading } = useDashboardStats({ userId: demoUserId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCardData, setActiveCardData] = useState<CustomCardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    const card = customCards.find(c => c.id === event.active.id);
    if (card) {
      setActiveCardData(card);
    }
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

    const newOrder = arrayMove(customCards, oldIndex, newIndex).map(card => card.id);
    await reorderCustomCards(newOrder);
  };

  const visibleCustomCards = useMemo(() => {
    return customCards.filter(card => card.is_visible);
  }, [customCards]);

  const visibleBuiltInCards = useMemo(() => {
    const cards = [];
    if (settings?.dashboard_layout?.dailyBriefingVisible !== false) {
      cards.push(<DailyBriefingCard key="daily-briefing" isDemo={isDemo} demoUserId={demoUserId} />);
    }
    if (settings?.dashboard_layout?.dailyScheduleVisible !== false) {
      cards.push(<DailySchedulePreview key="daily-schedule-preview" />);
    }
    if (settings?.dashboard_layout?.weeklyFocusVisible !== false) {
      cards.push(<WeeklyFocusCard key="weekly-focus" weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={loading} />);
    }
    if (settings?.dashboard_layout?.peopleMemoryVisible !== false) {
      cards.push(<PeopleMemoryCard key="people-memory" />);
    }
    if (settings?.dashboard_layout?.meditationNotesVisible !== false) {
      cards.push(<MeditationNotesCard key="meditation-notes" settings={settings} updateSettings={updateSettings} loading={loading} />);
    }
    cards.push(<PomodoroCard key="pomodoro-card" />); // Pomodoro is always visible
    return cards;
  }, [settings, weeklyFocus, updateWeeklyFocus, loading, isDemo, demoUserId, updateSettings]);

  const allVisibleCards = useMemo(() => {
    const combined = [...visibleBuiltInCards, ...visibleCustomCards.map(card => <CustomCard key={card.id} card={card} />)];
    // Sort combined cards based on their original order in customCards and a fixed order for built-in cards
    const builtInOrder = [
      'daily-briefing',
      'daily-schedule-preview',
      'weekly-focus',
      'people-memory',
      'meditation-notes',
      'pomodoro-card',
    ];

    return combined.sort((a, b) => {
      const aId = a.key as string;
      const bId = b.key as string;

      const aIsCustom = !builtInOrder.includes(aId);
      const bIsCustom = !builtInOrder.includes(bId);

      if (aIsCustom && bIsCustom) {
        const aCard = customCards.find(c => c.id === aId);
        const bCard = customCards.find(c => c.id === bId);
        return (aCard?.card_order || 0) - (bCard?.card_order || 0);
      } else if (!aIsCustom && !bIsCustom) {
        return builtInOrder.indexOf(aId) - builtInOrder.indexOf(bId);
      } else if (aIsCustom && !bIsCustom) {
        return 1; // Custom cards come after built-in cards by default
      } else {
        return -1; // Built-in cards come before custom cards by default
      }
    });
  }, [visibleBuiltInCards, visibleCustomCards, customCards]);

  const cardIds = useMemo(() => {
    return allVisibleCards.map(card => card.key as string);
  }, [allVisibleCards]);

  const handlePanelGroupChange = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Tasks Due Today"
          value={tasksDue}
          icon={ListTodo}
          description="Pending tasks for today"
          loading={statsLoading}
        />
        <StatCard
          title="Tasks Completed Today"
          value={tasksCompleted}
          icon={Sparkles}
          description="Great job on your progress!"
          loading={statsLoading}
        />
        <StatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={CalendarDays}
          description="Scheduled events"
          loading={statsLoading}
        />
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[600px] rounded-xl border"
        onLayout={handlePanelGroupChange}
      >
        <ResizablePanel defaultSize={settings?.dashboard_panel_sizes?.[0] || 66}>
          <div className="flex h-full items-center justify-center p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {allVisibleCards.map(card => (
                    <SortableCustomCard key={card.key} card={customCards.find(c => c.id === card.key) || { id: card.key as string, title: (card.props as any).title || 'Built-in Card', content: null, emoji: null, card_order: 0, is_visible: true, user_id: '' }} />
                  ))}
                </div>
              </SortableContext>
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
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={settings?.dashboard_panel_sizes?.[1] || 34}>
          <div className="flex h-full items-center justify-center p-6">
            <Card className="w-full h-full shadow-lg rounded-xl flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> People Memory
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center pt-0">
                <PeopleMemoryCard />
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <AddCustomCardDialog
        isOpen={isAddCardDialogOpen}
        onClose={() => setIsAddCardDialogOpen(false)}
      />
      <DashboardLayoutSettings
        isOpen={isLayoutSettingsOpen}
        onClose={() => setIsLayoutSettingsOpen(false)}
        settings={settings}
        customCards={customCards}
        updateSettings={updateSettings}
        updateCustomCard={updateCustomCard}
      />
    </div>
  );
};

export default Dashboard;