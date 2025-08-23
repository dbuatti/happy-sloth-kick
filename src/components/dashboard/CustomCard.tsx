import React, { useState, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import EditableCard from './EditableCard';
import { CustomCard as CustomCardType, UpdateCustomCardData, CustomCardComponentProps } from '@/types';

const CustomCard: React.FC<CustomCardComponentProps> = ({ card, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content || '');
  const [emoji, setEmoji] = useState(card.emoji || '');

  useEffect(() => {
    setTitle(card.title);
    setContent(card.content || '');
    setEmoji(card.emoji || '');
  }, [card]);

  const handleSave = async () => {
    await onUpdate(card.id, { title, content, emoji });
  };

  const handleDelete = async () => {
    await onDelete(card.id);
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
    />
  );
};

export default CustomCard;