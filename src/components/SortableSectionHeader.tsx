import React from 'react';
import { useSortable }1 from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
        "relative rounded-lg bg-muted dark:bg-gray-700 text-foreground",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        "group",
        isDragging ? "ring-2 ring-primary shadow-lg" : ""
      )}
      {...attributes}
      {...listeners}
    >
      {/* Main header content */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 flex-1">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            {name} ({taskCount})
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpand}
          className="flex-shrink-0"
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
          data-dnd-kit-disabled-draggable="true" {/* Reverted to string "true" */}
        >
          <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
        </Button>
      </div>
    </div>
  );
};

export default SortableSectionHeader;