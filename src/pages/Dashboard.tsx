import React, { useState, useMemo } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import { useDashboardData, CustomCard } from '@/hooks/useDashboardData';
import { useSettings } from '@/context/SettingsContext';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import CustomCardComponent from '@/components/dashboard/CustomCard'; // Renamed to avoid conflict
import { Plus } from 'lucide-react'; // Removed Plus as it's not directly used here
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { showSuccess, showError } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import { arrayMove } from '@dnd-kit/sortable';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const {
    weeklyFocus,
    customCards,
    loading: dashboardLoading,
    updateWeeklyFocus,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });
  const { settings, loading: settingsLoading, updateSettings } = useSettings({ userId: demoUserId }); // Correct usage of useSettings

  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [isAddCustomCardOpen, setIsAddCustomCardOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCardData, setActiveCardData] = useState<CustomCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) {
      showError('Card title is required.');
      return;
    }
    setIsAddingCard(true);
    await addCustomCard({
      title: newCardTitle.trim(),
      content: newCardContent.trim() || null,
      emoji: newCardEmoji.trim() || null,
      card_order: customCards.length,
    });
    setIsAddingCard(false);
    setIsAddCustomCardOpen(false);
    setNewCardTitle('');
    setNewCardContent('');
    setNewCardEmoji('');
  };

  const handlePanelResize = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const panelSizes = settings?.dashboard_panel_sizes || [66, 34];

  const builtInCards = useMemo(() => [
    { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
    { key: 'dailyScheduleVisible', component: <DailySchedulePreview /> },
    { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={dashboardLoading} /> },
    { key: 'peopleMemoryVisible', component: <PeopleMemoryCard /> },
    { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={settings} updateSettings={updateSettings} loading={settingsLoading} /> },
    { key: 'pomodoroTimerVisible', component: <PomodoroCard /> }, // Always visible for now, can be toggled later
  ], [isDemo, demoUserId, weeklyFocus, updateWeeklyFocus, dashboardLoading, settings, updateSettings, settingsLoading]);

  const allVisibleCards = useMemo(() => {
    const visibleBuiltIn = builtInCards.filter(card => settings?.dashboard_layout?.[card.key] !== false);
    const visibleCustom = customCards.filter(card => card.is_visible);

    const combined = [
      ...visibleBuiltIn.map(card => ({ ...card, id: card.key, card_order: customCards.find(c => c.id === card.key)?.card_order || 0 })), // Assign a temporary ID for sorting
      ...visibleCustom.map(card => ({ ...card, component: <CustomCardComponent card={card} /> })),
    ];

    return combined.sort((a, b) => (a.card_order || 0) - (b.card_order || 0));
  }, [builtInCards, customCards, settings?.dashboard_layout]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const draggedCard = allVisibleCards.find(card => card.id === event.active.id);
    if (draggedCard && 'component' in draggedCard) {
      setActiveCardData(draggedCard as CustomCard);
    } else if (draggedCard) {
      // If it's a built-in card, create a temporary CustomCard structure for the overlay
      setActiveCardData({
        id: draggedCard.id,
        user_id: userId || '',
        title: (draggedCard.component as any)?.props?.title || 'Built-in Card',
        content: null,
        emoji: null,
        card_order: draggedCard.card_order,
        is_visible: true,
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveCardData(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = allVisibleCards.findIndex(card => card.id === active.id);
    const newIndex = allVisibleCards.findIndex(card => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedCards = arrayMove(allVisibleCards, oldIndex, newIndex);
    const orderedCardIds = newOrderedCards.map(card => card.id);

    await reorderCustomCards(orderedCardIds);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <DashboardHeader
          onAddCard={() => setIsAddCustomCardOpen(true)}
          onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
          isDemo={isDemo}
          demoUserId={demoUserId}
        />

        {dashboardLoading || settingsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 w-full rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[calc(100vh-15rem)] rounded-xl border"
            onLayout={handlePanelResize}
          >
            <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
              <div className="flex h-full items-start justify-center p-6 overflow-y-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={allVisibleCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {allVisibleCards.map(card => {
                        if ('component' in card) {
                          return <div key={card.id}>{card.component}</div>;
                        } else {
                          return <SortableCustomCard key={card.id} card={card} />;
                        }
                      })}
                    </div>
                  </SortableContext>

                  {createPortal(
                    <DragOverlay dropAnimation={null}>
                      {activeId && activeCardData && (
                        <div className="rotate-2">
                          <CustomCardComponent card={activeCardData} isOverlay={true} />
                        </div>
                      )}
                    </DragOverlay>,
                    document.body
                  )}
                </DndContext>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={panelSizes[1]} minSize={20}>
              <div className="flex h-full items-start justify-center p-6 overflow-y-auto">
                <PomodoroCard />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      <DashboardLayoutSettings
        isOpen={isLayoutSettingsOpen}
        onClose={() => setIsLayoutSettingsOpen(false)}
        settings={settings}
        customCards={customCards}
        updateSettings={updateSettings}
        updateCustomCard={updateCustomCard}
      />

      <Dialog open={isAddCustomCardOpen} onOpenChange={setIsAddCustomCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Card</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="e.g., Daily Affirmation, Important Links"
                autoFocus
                disabled={isAddingCard}
              />
            </div>
            <div>
              <Label htmlFor="card-emoji">Emoji (Optional)</Label>
              <Input
                id="card-emoji"
                value={newCardEmoji}
                onChange={(e) => setNewCardEmoji(e.target.value)}
                placeholder="👋"
                maxLength={2}
                disabled={isAddingCard}
              />
            </div>
            <div>
              <Label htmlFor="card-content">Content (Optional)</Label>
              <Textarea
                id="card-content"
                value={newCardContent}
                onChange={(e) => setNewCardContent(e.target.value)}
                placeholder="Your custom content here..."
                rows={5}
                disabled={isAddingCard}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCustomCardOpen(false)} disabled={isAddingCard}>Cancel</Button>
            <Button onClick={handleAddCard} disabled={isAddingCard || !newCardTitle.trim()}>
              {isAddingCard ? 'Adding...' : 'Add Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;