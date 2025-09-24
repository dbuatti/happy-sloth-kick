import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MealStaple } from '@/hooks/useMealStaples';
import MealItem from './MealItem';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface SortableStapleItemProps {
  staple: MealStaple;
  onUpdate: (id: string, updates: Partial<MealStaple>) => Promise<any>;
  isDemo?: boolean;
  isOverlay?: boolean;
}

const SortableStapleItem: React.FC<SortableStapleItemProps> = ({
  staple,
  onUpdate,
  isDemo = false,
  isOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: staple.id, disabled: isDemo });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex items-center",
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card rounded-xl" : ""
      )}
    >
      {!isDemo && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 p-1 cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className={cn("flex-1", !isDemo && "pl-6")}> {/* Add left padding if not in demo mode to make space for handle */}
        <MealItem
          meal={staple}
          onUpdate={onUpdate}
          isDemo={isDemo}
          isPlaceholder={false} // Sortable items are always real items
        />
      </div>
    </li>
  );
};

export default SortableStapleItem;