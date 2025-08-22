import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CustomDashboardCardProps } from '@/types/props';
import { CustomDashboardCard as CustomDashboardCardType } from '@/types/task'; // Import the type from task.ts
import { showError, showSuccess } from '@/utils/toast';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const CustomDashboardCard: React.FC<CustomDashboardCardProps> = ({ card, onEdit, onDelete, onReorder }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title);
  const [editedContent, setEditedContent] = useState(card.content || '');
  const [editedEmoji, setEditedEmoji] = useState(card.emoji || '');

  useEffect(() => {
    setEditedTitle(card.title);
    setEditedContent(card.content || '');
    setEditedEmoji(card.emoji || '');
  }, [card]);

  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) {
      showError('Title cannot be empty.');
      return;
    }
    await onEdit({ ...card, title: editedTitle.trim(), content: editedContent, emoji: editedEmoji });
    showSuccess('Card updated successfully!');
    setIsEditDialogOpen(false);
  };

  const handleDelete = async () => {
    await onDelete(card.id);
    showSuccess('Card deleted successfully!');
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { type: 'CustomDashboardCard', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <>
      <Card ref={setNodeRef} style={style} className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="cursor-grab mr-2" {...listeners} {...attributes}>
              <GripVertical className="h-4 w-4 text-gray-400" />
            </Button>
            <CardTitle className="text-lg flex items-center">
              {card.emoji && <span className="mr-2 text-xl">{card.emoji}</span>}
              {card.title}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">{card.content}</p>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Custom Card</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input id="title" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">Content</Label>
              <Textarea id="content" value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emoji" className="text-right">Emoji</Label>
              <Input id="emoji" value={editedEmoji} onChange={(e) => setEditedEmoji(e.target.value)} className="col-span-3" placeholder="e.g., 👋" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
            <Button variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomDashboardCard;