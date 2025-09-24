import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MealStaple } from '@/hooks/useMealStaples';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import StapleItemDisplay from './StapleItemDisplay'; // Import the new component

interface SortableStapleItemProps {
  staple: MealStaple;
  onUpdate: (id: string, updates: Partial<MealStaple>) => Promise<any>;
  onOpenEditDialog: (staple: MealStaple) => void;
  onOpenDeleteDialog: (staple: MealStaple) => void;
  isDemo?: boolean;
  isOverlay?: boolean;
}

const SortableStapleItem: React.FC<SortableStapleItemProps> = ({
  staple,
  onUpdate,
  onOpenEditDialog,
  onOpenDeleteDialog,
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
      <div className={cn("flex-1", !isDemo && "pl-6")}>
        <StapleItemDisplay
          staple={staple}
          onUpdate={onUpdate}
          onOpenEditDialog={onOpenEditDialog}
          onOpenDeleteDialog={onOpenDeleteDialog}
          isDemo={isDemo}
        />
      </div>
    </li>
  );
};

export default SortableStapleItem;