import React, { useState, useEffect } from 'react';
import EditableCard from './EditableCard';
import { CustomCard as CustomCardType, UpdateCustomCardData, CustomCardComponentProps } from '@/types';
import { toast } from 'react-hot-toast';

const CustomCard: React.FC<CustomCardComponentProps> = ({ card, onSave, onDelete }) => {
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content || '');
  const [emoji, setEmoji] = useState(card.emoji || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setContent(card.content || '');
    setEmoji(card.emoji || '');
  }, [card]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(card.id, { title, content, emoji });
      toast.success('Card updated!');
    } catch (error) {
      toast.error('Failed to update card.');
      console.error('Error updating card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await onDelete(card.id);
        toast.success('Card deleted!');
      } catch (error) {
        toast.error('Failed to delete card.');
        console.error('Error deleting card:', error);
      }
    }
  };

  return (
    <EditableCard
      title={title}
      content={content}
      emoji={emoji}
      onTitleChange={setTitle}
      onContentChange={setContent}
      onEmojiChange={setEmoji}
      onSave={handleSave}
      onDelete={handleDelete}
      isSaving={isSaving}
    />
  );
};

export default CustomCard;