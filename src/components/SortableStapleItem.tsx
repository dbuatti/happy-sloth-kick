"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MealStaple } from '@/hooks/useMealStaples';
import StapleItemDisplay from './StapleItemDisplay'; // Import the new display component
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SortableStapleItemProps {
  staple: MealStaple;
  onUpdate: (id: string, updates: Partial<MealStaple>) => Promise<any>;
  onOpenEditDialog: (staple: MealStaple) => void;
  onOpenDeleteDialog: (staple: MealStaple) => void;
  isDemo?: boolean;
  isOverlay?: boolean; // Prop to indicate if it's a drag overlay
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
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "shadow-lg",
        isOverlay && "shadow-xl" // Stronger shadow for overlay
      )}
    >
      <div className="flex items-center gap-2">
        {!isDemo && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 text-muted-foreground cursor-grab",
              isDragging && "cursor-grabbing",
              isOverlay && "hidden" // Hide handle in overlay
            )}
            {...listeners}
            {...attributes}
            aria-label="Drag staple"
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1">
          <StapleItemDisplay
            staple={staple}
            onUpdate={onUpdate}
            onOpenEditDialog={onOpenEditDialog}
            onOpenDeleteDialog={onOpenDeleteDialog}
            isDemo={isDemo}
            isOverlay={isOverlay}
          />
        </div>
      </div>
    </li>
  );
};

export default SortableStapleItem;