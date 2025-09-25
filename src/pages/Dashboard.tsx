import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData, WeeklyFocus, CustomCard as CustomCardType } from '@/hooks/useDashboardData'; // Import CustomCardType
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSettings } from '@/context/SettingsContext';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, UniqueIdentifier, closestCorners } from '@dnd-kit/core'; // Import closestCorners
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import AddCustomCardDialog from '@/components/dashboard/AddCustomCardDialog';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import StatCard from '@/components/dashboard/StatCard';
import { ListTodo, CalendarDays, Clock, Target, Users, Leaf, Sparkles, CheckCircle2 } from 'lucide-react'; // Import CheckCircle2
import CustomCard from '@/components/dashboard/CustomCard';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { UserSettings } from '@/hooks/useUserSettings'; // Import UserSettings type
import { UseMutateAsyncFunction } from '@tanstack/react-query';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

// Define specific props for built-in cards
interface DailyBriefingCardProps { isDemo?: boolean; demoUserId?: string; }
interface DailySchedulePreviewProps { isDemo?: boolean; demoUserId?: string; }
interface WeeklyFocusCardProps { weeklyFocus: WeeklyFocus | null; updateWeeklyFocus: UseMutateAsyncFunction<WeeklyFocus, Error, Partial<Omit<WeeklyFocus, "id" | "user_id" | "week_start_date">>, unknown>; loading: boolean; }
interface PeopleMemoryCardProps { isDemo?: boolean; demoUserId?: string; }
interface MeditationNotesCardProps { settings: UserSettings | null; updateSettings: (updates: Partial<Omit<UserSettings, "user_id">>) => Promise<boolean>; loading: boolean; }
interface PomodoroCardProps { isDemo?: boolean; demoUserId?: string; }

// Union type for all possible card props
type AnyCardProps = DailyBriefingCardProps | DailySchedulePreviewProps | WeeklyFocusCardProps | PeopleMemoryCardProps | MeditationNotesCardProps | PomodoroCardProps | { card: CustomCardType; isOverlay?: boolean; };

// Type for a renderable dashboard item
interface DashboardRenderItem {
  id: string; // Unique ID for DND
  component: React.ComponentType<AnyCardProps>;
  props: AnyCardProps;
  isCustom: boolean;
  order: number | null; // For sorting
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
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId });

  const { settings: userSettings, loading: userSettingsLoading, updateSettings } = useSettings({ userId });

  const {
    tasksDue,
    tasksCompleted,
    appointmentsToday,
    loading: statsLoading
  } = useDashboardStats({ userId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeCardData, setActiveCardData] = useState<DashboardRenderItem | null>(null);

  const builtInCardConfigs = useMemo(() => [
    { key: 'dailyBriefingVisible', label: 'Daily Briefing', component: DailyBriefingCard, icon: Sparkles, defaultProps: { isDemo, demoUserId } as DailyBriefingCardProps },
    { key: 'dailyScheduleVisible', label: 'Daily Schedule Preview', component: DailySchedulePreview, icon: CalendarDays, defaultProps: { isDemo, demoUserId } as DailySchedulePreviewProps },
    { key: 'weeklyFocusVisible', label: "This Week's Focus", component: WeeklyFocusCard, icon: Target, defaultProps: { weeklyFocus, updateWeeklyFocus, loading: dashboardDataLoading } as WeeklyFocusCardProps },
    { key: 'peopleMemoryVisible', label: 'People Memory', component: PeopleMemoryCard, icon: Users, defaultProps: { isDemo, demoUserId } as PeopleMemoryCardProps },
    { key: 'meditationNotesVisible', label: 'Meditation Notes', component: MeditationNotesCard, icon: Leaf, defaultProps: { settings: userSettings, updateSettings, loading: userSettingsLoading } as MeditationNotesCardProps },
    { key: 'pomodoroTimerVisible', label: 'Pomodoro Timer', component: PomodoroCard, icon: Clock, defaultProps: { isDemo, demoUserId } as PomodoroCardProps },
  ], [isDemo, demoUserId, weeklyFocus, updateWeeklyFocus, dashboardDataLoading, userSettings, updateSettings, userSettingsLoading]);


  const allDashboardCards = useMemo(() => {
    const items: DashboardRenderItem[] = [];

    // Add visible built-in cards
    builtInCardConfigs.forEach(config => {
      if ((dashboardSettings?.dashboard_layout as Record<string, boolean>)?.[config.key] !== false) {
        items.push({
          id: config.key,
          component: config.component,
          props: config.defaultProps,
          isCustom: false,
          order: 0, // Built-in cards don't have a DB order, assign a temporary one
        });
      }
    });

    // Add visible custom cards
    customCards.forEach(card => {
      if (card.is_visible) {
        items.push({
          id: card.id,
          component: CustomCard,
          props: { card, isOverlay: false },
          isCustom: true,
          order: card.card_order,
        });
      }
    });

    // Sort items. Custom cards use their `card_order`. Built-in cards will be at the end.
    // A more robust solution would be to store the full order of all cards in user settings.
    // For now, custom cards will be sorted by their order, then built-in cards will follow in their original `builtInCardConfigs` order.
    return items.sort((a, b) => {
      if (a.isCustom && b.isCustom) {
        return (a.order || 0) - (b.order || 0);
      }
      if (a.isCustom) return -1; // Custom cards come before built-in
      if (b.isCustom) return 1;  // Built-in cards come after custom
      return 0; // Maintain relative order for built-in cards
    });
  }, [builtInCardConfigs, customCards, dashboardSettings?.dashboard_layout]);

  const cardIds = useMemo(() => allDashboardCards.map(card => card.id), [allDashboardCards]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    const activeCard = allDashboardCards.find(card => card.id === event.active.id);
    setActiveCardData(activeCard || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCardData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cardIds.indexOf(String(active.id)); // Convert to string
    const newIndex = cardIds.indexOf(String(over.id)); // Convert to string

    const newOrderedCards = arrayMove(allDashboardCards, oldIndex, newIndex);

    // Separate custom cards and update their order in DB
    const newCustomCardOrder = newOrderedCards
      .filter(card => card.isCustom)
      .map(card => String(card.id));

    if (newCustomCardOrder.length > 0) {
      await reorderCustomCards(newCustomCardOrder);
    }
    // For built-in cards, their order is implicitly handled by the `allDashboardCards` memoization
    // and the `dashboard_layout` settings. No direct DB update needed for them.
  };

  const handlePanelResize = (sizes: number[]) => {
    if (!userSettingsLoading && userSettings) {
      updateSettings({ dashboard_panel_sizes: sizes });
    }
  };

  const panelSizes = userSettings?.dashboard_panel_sizes || [66, 34];

  const loading = dashboardDataLoading || userSettingsLoading || statsLoading;

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="max-w-full mx-auto space-y-6">
        <DashboardHeader
          onAddCard={() => setIsAddCardDialogOpen(true)}
          onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
          isDemo={isDemo}
          demoUserId={demoUserId}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Tasks Due Today"
            value={tasksDue}
            icon={ListTodo}
            description="Tasks needing your attention today"
            loading={loading}
          />
          <StatCard
            title="Tasks Completed Today"
            value={tasksCompleted}
            icon={CheckCircle2}
            description="Great job on these tasks!"
            loading={loading}
          />
          <StatCard
            title="Appointments Today"
            value={appointmentsToday}
            icon={CalendarDays}
            description="Scheduled events for your day"
            loading={loading}
          />
        </div>

        <ResizablePanelGroup
          direction="horizontal"
          className={cn("min-h-[500px] rounded-xl border", loading && "opacity-50")}
          onLayout={handlePanelResize}
        >
          <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
            <div className="flex h-full items-center justify-center p-2">
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 gap-4 w-full h-full">
                    {allDashboardCards.map(card => (
                      card.isCustom ? (
                        <SortableCustomCard key={card.id} card={(card.props as { card: CustomCardType }).card} />
                      ) : (
                        <card.component key={card.id} {...card.props} />
                      )
                    ))}
                  </div>
                </SortableContext>
                {createPortal(
                  <DragOverlay dropAnimation={null}>
                    {activeId && activeCardData && (
                      activeCardData.isCustom ? (
                        <CustomCard card={(activeCardData.props as { card: CustomCardType }).card} isOverlay={true} />
                      ) : (
                        <div className="rotate-2">
                          <activeCardData.component {...activeCardData.props} />
                        </div>
                      )
                    )}
                  </DragOverlay>,
                  document.body
                )}
              </DndContext>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={panelSizes[1]} minSize={20}>
            <div className="flex h-full items-center justify-center p-2">
              {/* Right panel content, e.g., a single large card or another grid */}
              <PomodoroCard isDemo={isDemo} demoUserId={demoUserId} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
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