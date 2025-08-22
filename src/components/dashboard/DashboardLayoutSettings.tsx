import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useDashboardData, CustomCard } from '@/hooks/useDashboardData';
import { UserSettings } from '@/types'; // Corrected import path
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface DashboardLayoutSettingsProps {
  availableCards: { id: string; title: string; component: React.ReactNode }[];
}

const DashboardLayoutSettings: React.FC<DashboardLayoutSettingsProps> = ({ availableCards }) => {
  const { settings, loading, updateSettings } = useSettings();
  const { customCards, addCustomCard, updateCustomCard, deleteCustomCard } = useDashboardData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [layout, setLayout] = useState<string[]>([]);
  const [cardVisibility, setCardVisibility] = useState<{ [key: string]: boolean }>({});
  const [newCustomCardTitle, setNewCustomCardTitle] = useState('');
  const [newCustomCardEmoji, setNewCustomCardEmoji] = useState('');
  const [editingCustomCard, setEditingCustomCard] = useState<CustomCard | null>(null);

  useEffect(() => {
    if (settings?.dashboard_layout) {
      setLayout(settings.dashboard_layout);
    } else {
      // Default layout if none saved
      setLayout(availableCards.map(card => card.id));
    }

    const initialVisibility: { [key: string]: boolean } = {};
    availableCards.forEach(card => {
      initialVisibility[card.id] = true; // Default to visible
    });
    customCards.forEach(card => {
      initialVisibility[card.id] = card.is_visible ?? true;
    });
    setCardVisibility(initialVisibility);
  }, [settings, availableCards, customCards]);

  const handleSaveLayout = async () => {
    try {
      const updatedLayout = layout.filter(cardId => cardVisibility[cardId]);
      await updateSettings({ dashboard_layout: updatedLayout });
      // Update visibility for custom cards
      for (const card of customCards) {
        await updateCustomCard(card.id, { is_visible: cardVisibility[card.id] ?? true });
      }
      toast.success('Dashboard layout saved!');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
      toast.error('Failed to save layout.');
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const reorderedLayout = Array.from(layout);
    const [removed] = reorderedLayout.splice(result.source.index, 1);
    reorderedLayout.splice(result.destination.index, 0, removed);

    setLayout(reorderedLayout);
  };

  const handleToggleVisibility = (cardId: string, isChecked: boolean) => {
    setCardVisibility(prev => ({ ...prev, [cardId]: isChecked }));
  };

  const handleAddCustomCard = async () => {
    if (!newCustomCardTitle.trim()) {
      toast.error('Custom card title cannot be empty.');
      return;
    }
    try {
      await addCustomCard({
        title: newCustomCardTitle,
        emoji: newCustomCardEmoji || null,
        content: 'New custom card content.', // Default content
        card_order: layout.length, // Add to the end
        is_visible: true,
      });
      setNewCustomCardTitle('');
      setNewCustomCardEmoji('');
      toast.success('Custom card added!');
      // Re-fetch custom cards to update layout state
      // This will be handled by useDashboardData's onSuccess invalidation
    } catch (error) {
      console.error('Failed to add custom card:', error);
      toast.error('Failed to add custom card.');
    }
  };

  const handleEditCustomCard = (card: CustomCard) => {
    setEditingCustomCard(card);
    setNewCustomCardTitle(card.title);
    setNewCustomCardEmoji(card.emoji || '');
  };

  const handleSaveCustomCardEdit = async () => {
    if (!editingCustomCard || !newCustomCardTitle.trim()) {
      toast.error('Custom card title cannot be empty.');
      return;
    }
    try {
      await updateCustomCard(editingCustomCard.id, {
        title: newCustomCardTitle,
        emoji: newCustomCardEmoji || null,
      });
      setEditingCustomCard(null);
      setNewCustomCardTitle('');
      setNewCustomCardEmoji('');
      toast.success('Custom card updated!');
    } catch (error) {
      console.error('Failed to update custom card:', error);
      toast.error('Failed to update custom card.');
    }
  };

  const handleDeleteCustomCard = async (cardId: string) => {
    try {
      await deleteCustomCard(cardId);
      toast.success('Custom card deleted!');
    } catch (error) {
      console.error('Failed to delete custom card:', error);
      toast.error('Failed to delete custom card.');
    }
  };

  const allCardsInOrder = layout
    .map(cardId => {
      const available = availableCards.find(card => card.id === cardId);
      const custom = customCards.find(card => card.id === cardId);
      return available || custom;
    })
    .filter(Boolean) as (typeof availableCards[0] | CustomCard)[];

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Customize Dashboard</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Dashboard Layout</DialogTitle>
          <DialogDescription>
            Drag and drop to reorder cards, toggle visibility, and manage custom cards.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <h3 className="text-md font-semibold">Add Custom Card</h3>
          <div className="flex gap-2">
            <Input
              placeholder="New card title"
              value={newCustomCardTitle}
              onChange={(e) => setNewCustomCardTitle(e.target.value)}
              className="flex-grow"
            />
            <Input
              placeholder="Emoji (e.g., 👋)"
              value={newCustomCardEmoji}
              onChange={(e) => setNewCustomCardEmoji(e.target.value)}
              className="w-24"
            />
            {editingCustomCard ? (
              <Button onClick={handleSaveCustomCardEdit}>Save Edit</Button>
            ) : (
              <Button onClick={handleAddCustomCard}>
                <Plus className="mr-2 h-4 w-4" /> Add Card
              </Button>
            )}
          </div>

          <h3 className="text-md font-semibold mt-4">Card Order & Visibility</h3>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="dashboard-cards">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {allCardsInOrder.map((card, index) => (
                    <Draggable key={card.id} draggableId={card.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center justify-between p-2 border rounded-md bg-background"
                        >
                          <div className="flex items-center">
                            <span {...provided.dragHandleProps} className="mr-2 cursor-grab">
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </span>
                            <span className="font-medium">
                              {card.emoji && <span className="mr-2">{card.emoji}</span>}
                              {card.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={cardVisibility[card.id] ?? true}
                              onCheckedChange={(checked) => handleToggleVisibility(card.id, checked)}
                              id={`visibility-${card.id}`}
                            />
                            {('content' in card) && ( // Check if it's a custom card
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleEditCustomCard(card as CustomCard)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteCustomCard(card.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
        <DialogFooter>
          <Button onClick={handleSaveLayout}>Save Layout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardLayoutSettings;