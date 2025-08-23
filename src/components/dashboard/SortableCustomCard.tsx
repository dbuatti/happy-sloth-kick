import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import CustomCard from './CustomCard';
import { cn } from '@/lib/utils';

interface SortableCustomCardProps {
  card: CustomCardType;
}

const SortableCustomCard: React.FC<SortableCustomCardProps> = ({ card }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners}
        className={cn("select-none", isDragging && "z-10")}
    >
        <CustomCard card={card} />
    </div>
  );
};

export default SortableCustomCard;