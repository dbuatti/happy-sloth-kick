import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Import Button

interface SortableSectionHeaderProps {
  id: string;
  name: string;
  taskCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({ id, name, taskCount, isExpanded, onToggleExpand }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id, data: { type: 'section-header' } });

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
        isDragging ? "ring-2 ring-primary shadow-lg" : ""
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2 flex-1">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          {name} ({taskCount})
        </h3>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag from starting when clicking the button
          onToggleExpand();
        }}
        className="flex-shrink-0"
        aria-label={isExpanded ? "Collapse section" : "Expand section"}
      >
        <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
      </Button>
    </div>
  );
};

export default SortableSectionHeader;