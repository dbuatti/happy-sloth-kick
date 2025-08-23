import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CustomCard as CustomCardType, UpdateCustomCardData, SortableCustomCardProps } from '@/types';
import CustomCard from './CustomCard';

const SortableCustomCard: React.FC<SortableCustomCardProps> = ({ id, card, onUpdateCard, onDeleteCard }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CustomCard
        card={card}
        onUpdate={onUpdateCard}
        onDelete={onDeleteCard}
      />
    </div>
  );
};

export default SortableCustomCard;