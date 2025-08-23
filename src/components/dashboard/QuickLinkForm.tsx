import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadCloud, X } from 'lucide-react';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData } from '@/types';

interface QuickLinkFormProps {
  initialData?: QuickLink | null;
  onSave: (data: NewQuickLinkData | UpdateQuickLinkData) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
}

const QuickLinkForm: React.FC<QuickLinkFormProps> = ({ initialData, onSave, onCancel, isEditing }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '');
  const [backgroundColor, setBackgroundColor] = useState(initialData?.background_color || '');
  const [avatarText, setAvatarText] = useState(initialData?.avatar_text || '');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setUrl(initialData.url);
      setEmoji(initialData.emoji || '');
      setBackgroundColor(initialData.background_color || '');
      setAvatarText(initialData.avatar_text || '');
    } else {
      setTitle('');
      setUrl('');
      setEmoji('');
      setBackgroundColor('');
      setAvatarText('');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) {
      alert('Title and URL are required.');
      return;
    }

    const dataToSave: NewQuickLinkData | UpdateQuickLinkData = isEditing
      ? { id: initialData?.id, title, url, emoji, background_color: backgroundColor, avatar_text: avatarText } as UpdateQuickLinkData
      : { title, url, emoji, background_color: backgroundColor, avatar_text: avatarText } as NewQuickLinkData;

    await onSave(dataToSave);
    onCancel(); // Close form after saving
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="url">URL</Label>
        <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="emoji">Emoji</Label>
        <Input id="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="e.g., 🚀" />
      </div>
      <div>
        <Label htmlFor="backgroundColor">Background Color (Tailwind class or hex)</Label>
        <Input id="backgroundColor" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} placeholder="e.g., bg-blue-500 or #3b82f6" />
      </div>
      <div>
        <Label htmlFor="avatarText">Avatar Text (e.g., G for Google)</Label>
        <Input id="avatarText" value={avatarText} onChange={(e) => setAvatarText(e.target.value)} placeholder="e.g., G" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{isEditing ? 'Save Changes' : 'Add Link'}</Button>
      </div>
    </form>
  );
};

export default QuickLinkForm;