import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X, Trash2 } from 'lucide-react';
import { CustomDashboardCard as CustomDashboardCardType } from '@/types/task';
import { useCustomDashboardCards } from '@/hooks/useCustomDashboardCards';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CustomDashboardCardProps } from '@/types/props';

const CustomDashboardCard: React.FC<CustomDashboardCardProps> = ({ card }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const { updateCustomDashboardCard, deleteCustomDashboardCard } = useCustomDashboardCards({ userId });

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content || '');
  const [emoji, setEmoji] = useState(card.emoji || '');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setContent(card.content || '');
    setEmoji(card.emoji || '');
  }, [card]);

  const handleSave = async () => {
    if (!title.trim()) return;
    await updateCustomDashboardCard(card.id, { title: title.trim(), content, emoji });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(card.title);
    setContent(card.content || '');
    setEmoji(card.emoji || '');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteCustomDashboardCard(card.id);
    setIsConfirmDeleteOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center">
          {card.emoji && <span className="mr-2 text-xl">{card.emoji}</span>}
          {isEditing ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-bold" />
          ) : (
            <span>{card.title}</span>
          )}
        </CardTitle>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="ghost" size="icon" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsConfirmDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Card content" />
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="Emoji (optional)" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{card.content || 'No content.'}</p>
        )}
      </CardContent>

      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this custom card?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CustomDashboardCard;