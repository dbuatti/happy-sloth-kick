import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, X } from 'lucide-react';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData } from '@/types';

interface QuickLinkFormProps {
  initialData?: Partial<QuickLink>;
  onSave: (data: NewQuickLinkData | UpdateQuickLinkData) => Promise<QuickLink>;
  onCancel: () => void;
}

const QuickLinkForm: React.FC<QuickLinkFormProps> = ({ initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '');
  const [backgroundColor, setBackgroundColor] = useState(initialData?.background_color || '#ffffff');
  const [avatarText, setAvatarText] = useState(initialData?.avatar_text || '');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setUrl(initialData.url || '');
      setEmoji(initialData.emoji || '');
      setBackgroundColor(initialData.background_color || '#ffffff');
      setAvatarText(initialData.avatar_text || '');
    }
  }, [initialData]);

  const handleSubmit = async () => {
    const data: NewQuickLinkData | UpdateQuickLinkData = {
      title,
      url,
      emoji,
      background_color: backgroundColor,
      avatar_text: avatarText,
    };

    if (initialData?.id) {
      await onSave({ ...data, id: initialData.id } as UpdateQuickLinkData);
    } else {
      await onSave(data as NewQuickLinkData);
    }
    onCancel(); // Close form after saving
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="title" className="text-right">
          Title
        </Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="url" className="text-right">
          URL
        </Label>
        <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="emoji" className="text-right">
          Emoji
        </Label>
        <Input id="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} className="col-span-3" placeholder="e.g. 🚀" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="avatarText" className="text-right">
          Avatar Text
        </Label>
        <Input id="avatarText" value={avatarText} onChange={(e) => setAvatarText(e.target.value)} className="col-span-3" placeholder="e.g. G" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="backgroundColor" className="text-right">
          Background Color
        </Label>
        <Input id="backgroundColor" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="col-span-3" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Save</Button>
      </div>
    </div>
  );
};

export default QuickLinkForm;