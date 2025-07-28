import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderOpen, ChevronDown, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'; // Import DropdownMenu components

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
  onDeleteClick: (sectionId: string) => void; // New prop for delete
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
  onDeleteClick, // Destructure new prop
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
        onClick={(e) => e.stopPropagation()} // Prevent toggle when dragging
      >
        <span className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full opacity-50"></span>
      </div>

      {/* Main header content - now clickable for toggle */}
      <div 
        className="flex items-center justify-between p-3 pl-6 cursor-pointer" // Added cursor-pointer
        onClick={!isEditing ? onToggleExpand : undefined} // Only toggle if not editing
      >
        {isEditing ? (
          <div className="flex items-center w-full gap-2" data-no-dnd="true"> {/* Added data-no-dnd */}
            <Input
              value={editingName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
              className="text-xl font-semibold"
              autoFocus
              onClick={(e) => e.stopPropagation()} // Prevent toggle when clicking input
            />
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onSaveEdit(); }} disabled={!editingName.trim()}>Save</Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              {name} ({taskCount})
            </h3>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEditClick(); }} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-no-dnd="true">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-1" data-no-dnd="true"> {/* Added data-no-dnd */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 p-0" 
                onClick={(e) => e.stopPropagation()} // Prevent toggle when opening dropdown
              >
                <span className="sr-only">Open section menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditClick(); }}>
                <Edit className="mr-2 h-4 w-4" /> Rename Section
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteClick(id); }} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Chevron icon remains to indicate expanded state, but is no longer a separate clickable button for toggle */}
          <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
        </div>
      </div>
    </div>
  );
};

export default SortableSectionHeader;