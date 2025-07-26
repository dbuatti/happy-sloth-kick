import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DraggableAttributes } from '@dnd-kit/core'; // Removed SyntheticListenerMap import
import { FolderOpen, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Define a local type for dnd-kit listeners
type DndListeners = Record<string, ((event: any) => void) | undefined>;

interface SortableSectionHeaderProps {
  id: string;
  name: string;
  taskCount: number;
}

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({ id, name, taskCount }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id, data: { type: 'section-header' } }); // Add data.type for identification

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg bg-muted dark:bg-gray-700 text-foreground",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        "cursor-grab active:cursor-grabbing",
        isDragging ? "ring-2 ring-primary" : ""
      )}
      {...attributes}
    >
      <div className="flex items-center gap-2 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing"
          {...listeners as DndListeners} // Cast to our local type
          onClick={(e) => e.stopPropagation()} // Prevent other actions on drag handle click
          aria-label="Drag section"
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          {name} ({taskCount})
        </h3>
      </div>
    </div>
  );
};

export default SortableSectionHeader;