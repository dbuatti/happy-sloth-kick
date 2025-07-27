import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderOpen, ChevronDown, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input

interface SortableSectionHeaderProps {
  id: string;
  name: string;
  taskCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // New props for editing
  isEditing: boolean;
  editingName: string;
  onNameChange: (newName: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditClick: () => void; // To trigger editing from the header
}

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({
  id,
  name,
  taskCount,
  isExpanded,
  onToggleExpand,
  isEditing,
  editingName,
  onNameChange,
  onSaveEdit,
  onCancelEdit,
  onEditClick,
}) => {
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
    >
      {/* Subtle drag handle on the left edge */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-4 cursor-grab active:cursor-grabbing",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        )}
        {...attributes}
        {...listeners}
      >
        <span className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full opacity-50"></span>
      </div>

      {/* Main header content */}
      <div className="flex items-center justify-between p-2 pl-6">
        {isEditing ? (
          <div className="flex items-center w-full gap-2">
            <Input
              value={editingName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
              className="text-xl font-semibold"
              autoFocus
            />
            <Button size="sm" onClick={onSaveEdit} disabled={!editingName.trim()}>Save</Button>
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              {name} ({taskCount})
            </h3>
            <Button variant="ghost" size="icon" onClick={onEditClick} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpand}
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