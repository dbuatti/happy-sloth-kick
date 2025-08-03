import React, { useState, useEffect } from 'react';
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import EditableCard from './EditableCard';
import { StickyNote, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '../ui/button';

interface CustomCardProps {
  card: CustomCardType;
}

const CustomCard: React.FC<CustomCardProps> = ({ card }) => {
  const { updateCustomCard, deleteCustomCard } = useDashboardData();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setContent(card.content || '');
    setEmoji(card.emoji || '');
  }, [card]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateCustomCard(card.id, {
      title,
      content,
      emoji,
    });
    setIsSaving(false);
  };

  const handleDelete = async () => {
    await deleteCustomCard(card.id);
  };

  const renderEditForm = () => (
    <div className="space-y-2">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>Emoji (Optional)</Label>
        <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
      </div>
      <div>
        <Label>Content</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="relative group">
      <EditableCard title={card.title} icon={StickyNote} onSave={handleSave} renderEditForm={renderEditForm} isSaving={isSaving}>
        <div className="flex items-start gap-4">
          {card.emoji && <span className="text-2xl">{card.emoji}</span>}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
            {card.content || 'No content yet.'}
          </p>
        </div>
      </EditableCard>
      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default CustomCard;