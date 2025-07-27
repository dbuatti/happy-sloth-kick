import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
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
        "group", // Added group for hover effects on drag handle
        isDragging ? "ring-2 ring-primary shadow-lg" : ""
      )}
    >
      {/* Subtle drag handle on the left edge */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-4 cursor-grab active:cursor-grabbing",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200" // Make it visible on hover
        )}
        {...attributes}
        {...listeners}
      >
        {/* You can add a very subtle visual cue here if desired, e.g., a few dots */}
        <span className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full opacity-50"></span>
      </div>

      {/* Main header content, now clickable */}
      <div className="flex items-center justify-between p-2 pl-6"> {/* Reduced p-3 to p-2 */}
        <div className="flex items-center gap-2 flex-1">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            {name} ({taskCount})
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpand} // No need for e.stopPropagation here, as listeners are on separate handle
          className="flex-shrink-0"
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
        >
          <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
        </Button>
      </div>
    </div>
  );
};

export default SortableSectionHeader;