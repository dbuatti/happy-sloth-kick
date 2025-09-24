import React, { useState } from 'react';
import { useDashboardData, CustomCard } from '@/hooks/useDashboardData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DailySchedulePreview from '@/components/dashboard/DailySchedulePreview';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocus';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import MeditationNotesCard from '@/components/dashboard/MeditationNotes';
import PomodoroCard from '@/components/dashboard/PomodoroCard';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import DashboardLayoutSettings from '@/components/dashboard/DashboardLayoutSettings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useSettings } from '@/context/SettingsContext';
import { DndContext, closestCorners, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCustomCard from '@/components/dashboard/SortableCustomCard';
import { arrayMove } from '@dnd-kit/sortable';
import { showSuccess, showError } from '@/utils/toast';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo = false, demoUserId }) => {
  const {
    weeklyFocus,
    customCards,
    loading,
    updateWeeklyFocus,
    addCustomCard,
    updateCustomCard,
    reorderCustomCards,
  } = useDashboardData({ userId: demoUserId });
  const { settings, updateSettings } = useSettings({ userId: demoUserId });

  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('');
  const [isSavingCard, setIsSavingCard] = useState(false);

  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    setIsSavingCard(true);
    await addCustomCard({
      title: newCardTitle.trim(),
      content: newCardContent.trim() || null,
      emoji: newCardEmoji.trim() || null,
      card_order: customCards.length,
    });
    setIsSavingCard(false);
    setIsAddCardDialogOpen(false);
    setNewCardTitle('');
    setNewCardContent('');
    setNewCardEmoji('');
  };

  const visibleBuiltInCards = [
    { key: 'dailyBriefingVisible', component: <DailyBriefingCard isDemo={isDemo} demoUserId={demoUserId} /> },
    { key: 'dailyScheduleVisible', component: <DailySchedulePreview /> },
    { key: 'weeklyFocusVisible', component: <WeeklyFocusCard weeklyFocus={weeklyFocus} updateWeeklyFocus={updateWeeklyFocus} loading={loading} /> },
    { key: 'peopleMemoryVisible', component: <PeopleMemoryCard /> },
    { key: 'meditationNotesVisible', component: <MeditationNotesCard settings={settings} updateSettings={updateSettings} loading={loading} /> },
  ].filter(card => settings?.dashboard_layout?.[card.key] !== false);

  const visibleCustomCards = customCards.filter(card => card.is_visible);

  const allVisibleCards = [...visibleBuiltInCards, ...visibleCustomCards];

  const sortedCards = allVisibleCards.sort((a, b) => {
    const aOrder = (a as any).card_order !== undefined ? (a as any).card_order : (a as any).key.charCodeAt(0);
    const bOrder = (b as any).card_order !== undefined ? (b as any).card_order : (b as any).key.charCodeAt(0);
    return aOrder - bOrder;
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = allVisibleCards.findIndex(card => (card as any).id === active.id || (card as any).key === active.id);
    const newIndex = allVisibleCards.findIndex(card => (card as any).id === over.id || (card as any).key === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedCards = arrayMove(allVisibleCards, oldIndex, newIndex);

    const customCardUpdates = reorderedCards
      .filter(card => (card as CustomCard).id) // Only custom cards have an 'id' property
      .map((card, index) => ({
        id: (card as CustomCard).id,
        card_order: index,
      }));

    if (customCardUpdates.length > 0) {
      try {
        await reorderCustomCards(customCardUpdates.map(c => c.id));
        showSuccess('Dashboard layout updated!');
      } catch (error) {
        showError('Failed to reorder cards.');
        console.error('Error reordering custom cards:', error);
      }
    }
  };

  const handlePanelResize = (sizes: number[]) => {
    updateSettings({ dashboard_panel_sizes: sizes });
  };

  const defaultLayout = settings?.dashboard_panel_sizes || [66, 34];

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <DashboardHeader
        onAddCard={() => setIsAddCardDialogOpen(true)}
        onCustomizeLayout={() => setIsLayoutSettingsOpen(true)}
        isDemo={isDemo}
        demoUserId={demoUserId}
      />

      <ResizablePanelGroup direction="horizontal" className="w-full min-h-[400px] rounded-xl" onLayout={handlePanelResize}>
        <ResizablePanel defaultSize={defaultLayout[0]} minSize={30}>
          <div className="h-full flex flex-col p-2">
            <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <SortableContext items={allVisibleCards.map(card => (card as any).id || (card as any).key)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 gap-4">
                  {allVisibleCards.map(card => {
                    if ((card as CustomCard).id) {
                      return <SortableCustomCard key={(card as CustomCard).id} card={card as CustomCard} />;
                    } else {
                      return <div key={(card as any).key}>{card.component}</div>;
                    }
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={20}>
          <div className="h-full flex flex-col p-2">
            <PomodoroCard />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Card</DialogTitle>
            <DialogDescription>
              Create a new custom card for your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="e.g., Daily Mantra"
                autoFocus
                disabled={isSavingCard}
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
                disabled={isSavingCard}
              />
            </div>
            <div>
              <Label htmlFor="card-content">Content (Optional)</Label>
              <Textarea
                id="card-content"
                value={newCardContent}
                onChange={(e) => setNewCardContent(e.target.value)}
                placeholder="Your custom content goes here..."
                rows={5}
                disabled={isSavingCard}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardDialogOpen(false)} disabled={isSavingCard}>Cancel</Button>
            <Button onClick={handleAddCard} disabled={isSavingCard || !newCardTitle.trim()}>
              {isSavingCard ? 'Adding...' : 'Add Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DashboardLayoutSettings
        isOpen={isLayoutSettingsOpen}
        onClose={() => setIsLayoutSettingsOpen(false)}
        settings={settings}
        customCards={customCards}
        updateSettings={updateSettings}
        updateCustomCard={updateCustomCard}
      />
    </main>
  );
};

export default Dashboard;