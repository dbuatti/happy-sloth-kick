import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Sparkles, Users, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import CustomCard from '@/components/dashboard/CustomCard'; // Ensure CustomCard is imported for DragOverlay

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const { settings, updateSettings, loading: settingsLoading } = useUserSettings({ userId: demoUserId });
  const {
    weeklyFocus,
    customCards,
    loading: dashboardDataLoading,
    updateWeeklyFocus,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });

  const loading = settingsLoading || dashboardDataLoading;

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  // DND state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeCardData, setActiveCardData] = useState<CustomCardType | null>(null); // Only for custom cards

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

  const builtInCardKeys = useMemo(() => [
    'dailyBriefing',
    'dailySchedule',
    'weeklyFocus',
    'peopleMemory',
    'meditationNotes',
    'pomodoro',
  ], []);

  const getCardVisibility = useCallback((key: string) => {
    // Default to true if settings or layout is not yet loaded/defined
    if (loading || !settings?.dashboard_layout) return true;
    
    // Map built-in keys to their corresponding settings properties
    const layoutKeyMap: { [key: string]: keyof UserSettings['dashboard_layout'] } = {
      'dailyBriefing': 'dailyBriefingVisible',
      'dailySchedule': 'dailyScheduleVisible',
      'weeklyFocus': 'weeklyFocusVisible',
      'peopleMemory': 'peopleMemoryVisible',
      'meditationNotes': 'meditationNotesVisible',
      'pomodoro': 'pomodoroVisible', // Assuming you'll add this to UserSettings
    };

    const settingKey = layoutKeyMap[key];
    return settingKey ? settings.dashboard_layout[settingKey] !== false : true; // Default to visible if setting not found
  }, [settings, loading]);

  const allVisibleCardIds = useMemo(() => {
    const ids: UniqueIdentifier[] = [];

    // Add built-in cards if visible
    if (getCardVisibility('dailyBriefing')) ids.push('dailyBriefing');
    if (getCardVisibility('dailySchedule')) ids.push('dailySchedule');
    if (getCardVisibility('weeklyFocus')) ids.push('weeklyFocus');
    if (getCardVisibility('peopleMemory')) ids.push('peopleMemory');
    if (getCardVisibility('meditationNotes')) ids.push('meditationNotes');
    if (getCardVisibility('pomodoro')) ids.push('pomodoro');

    // Add visible custom cards
    customCards.filter(card => card.is_visible).forEach(card => ids.push(card.id));

    return ids;
  }, [customCards, getCardVisibility]);

  const renderCardComponent = useCallback((id: UniqueIdentifier) => {
    switch (id) {
      case 'dailyBriefing':
        return <DailyBriefingCard key="dailyBriefing" isDemo={isDemo} demoUserId={demoUserId} />;
      case 'dailySchedule':
        return <DailySchedulePreview key="dailySchedule" />;
      case 'weeklyFocus':
        return <WeeklyFocusCard key="weeklyFocus" weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={loading} />;
      case 'peopleMemory':
        return <PeopleMemoryCard key="peopleMemory" />;
      case 'meditationNotes':
        return <MeditationNotesCard key="meditationNotes" settings={settings} updateSettings={updateSettings} loading={loading} />;
      case 'pomodoro':
        return <PomodoroCard key="pomodoro" />;
      default:
        const customCard = customCards.find(card => card.id === id);
        return customCard ? <SortableCustomCard key={customCard.id} card={customCard} /> : null;
    }
  }, [isDemo, demoUserId, weeklyFocus, updateWeeklyFocus, loading, settings, updateSettings, customCards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    const customCard = customCards.find(card => card.id === event.active.id);
    if (customCard) {
      setActiveCardData(customCard);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCardData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = allVisibleCardIds.indexOf(active.id);
    const newIndex = allVisibleCardIds.indexOf(over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedIds = [...allVisibleCardIds];
    const [movedItem] = newOrderedIds.splice(oldIndex, 1);
    newOrderedIds.splice(newIndex, 0, movedItem);

    // Separate built-in cards from custom cards for reordering
    const newCustomCardOrder = newOrderedIds
      .filter(id => !builtInCardKeys.includes(String(id)))
      .map(id => String(id));

    await reorderCustomCards(newCustomCardOrder);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 md:pt-12">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <Card className="flex-1 p-0">
        <CardContent className="p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allVisibleCardIds} strategy={verticalListSortingStrategy}>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allVisibleCardIds.map(id => (
                  <React.Fragment key={id}>
                    {renderCardComponent(id)}
                  </React.Fragment>
                ))}
              </div>
            </SortableContext>
            {createPortal(
              <DragOverlay dropAnimation={null}>
                {activeId && (
                  activeCardData ? (
                    <div className="rotate-2">
                      <CustomCard card={activeCardData} isOverlay={true} />
                    </div>
                  ) : (
                    // Render a placeholder for built-in cards if needed, or nothing
                    <Card className="h-full shadow-xl ring-2 ring-primary bg-card rounded-xl p-4 flex items-center justify-center">
                      <LayoutGrid className="h-8 w-8 text-primary" />
                      <span className="ml-2 text-lg font-semibold">{activeId}</span>
                    </Card>
                  )
                )}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
        </CardContent>
      </Card>

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