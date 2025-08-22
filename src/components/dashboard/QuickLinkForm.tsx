import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TwitterPicker } from 'react-color';
import { QuickLink } from '@/types/task';
import { showError } from '@/utils/toast';
import { categoryColors } from '@/utils/categoryColors';

interface QuickLinkFormProps {
  link?: QuickLink | null;
  onSave: (data: Partial<QuickLink>) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}

const QuickLinkForm: React.FC<QuickLinkFormProps> = ({ link, onSave, onCancel, onDelete }) => {
  const [title, setTitle] = useState(link?.title || '');
  const [url, setUrl] = useState(link?.url || '');
  const [emoji, setEmoji] = useState(link?.emoji || '');
  const [backgroundColor, setBackgroundColor] = useState(link?.background_color || '');

  useEffect(() => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setEmoji(link.emoji || '');
      setBackgroundColor(link.background_color || '');
    } else {
      setTitle('');
      setUrl('');
      setEmoji('');
      setBackgroundColor('');
    }
  }, [link]);

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) {
      showError('Title and URL are required.');
      return;
    }

    const linkData: Partial<QuickLink> = {
      title: title.trim(),
      url: url.trim(),
      emoji: emoji || null,
      background_color: backgroundColor || null,
    };

    await onSave(linkData);
  };

  const handleDelete = async () => {
    if (link?.id && onDelete) {
      await onDelete(link.id);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{link ? 'Edit Quick Link' : 'Add New Quick Link'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="url" className="text-right">URL</Label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="emoji" className="text-right">Emoji</Label>
            <Input id="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} className="col-span-3" placeholder="e.g., 🚀" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="background-color" className="text-right">Background</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="col-span-3 justify-start" style={{ backgroundColor: backgroundColor || 'transparent' }}>
                  {backgroundColor || 'Select Color'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <TwitterPicker
                  color={backgroundColor}
                  onChangeComplete={(color: any) => setBackgroundColor(color.hex)}
                  colors={Object.keys(categoryColors).map(key => categoryColors[key].bg)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          {link && onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {link ? 'Save Changes' : 'Add Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickLinkForm;