import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardData } from '@/hooks/useDashboardData';
import { getRandomTagColor } from '@/lib/tagColors'; // Reusing tagColors for card colors

interface AddCustomCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddCustomCardDialog: React.FC<AddCustomCardDialogProps> = ({ isOpen, onClose }) => {
  const { addCustomCard } = useDashboardData();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setEmoji('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    await addCustomCard({
      title: title.trim(),
      content: content.trim() || null,
      emoji: emoji.trim() || null,
      card_order: null, // Will be set by the hook
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Custom Card</DialogTitle>
          <DialogDescription>
            Create a personalized card for your dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="card-title">Title</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Daily Mantra, Important Links"
              autoFocus
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="card-emoji">Emoji (Optional)</Label>
            <Input
              id="card-emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="👋"
              maxLength={2}
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="card-content">Content (Optional)</Label>
            <Textarea
              id="card-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Your notes, reminders, or anything you want to see!"
              rows={5}
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? 'Adding...' : 'Add Card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomCardDialog;