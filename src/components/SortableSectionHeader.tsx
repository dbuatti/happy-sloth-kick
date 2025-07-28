import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderOpen, ChevronDown, Edit, MoreHorizontal, Trash2, Eye, EyeOff, Plus, CheckCircle2 } from 'lucide-react'; // Added CheckCircle2
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SortableSectionHeaderProps {
  id: string;
  name: string;
  taskCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isEditing: boolean;
  editingName: string;
  onNameChange: (newName: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditClick: () => void;
  onDeleteClick: (sectionId: string) => void;
  includeInFocusMode: boolean;
  onToggleIncludeInFocusMode: (include: boolean) => void;
  onAddTaskToSection: (sectionId: string) => void;
  onMarkAllCompleted: (sectionId: string) => void; // New prop
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
  onDeleteClick,
  includeInFocusMode,
  onToggleIncludeInFocusMode,
  onAddTaskToSection,
  onMarkAllCompleted, // Destructure new prop
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
    cursor: isDragging ? 'grabbing' : 'grab', // Apply grab cursor to the whole header
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
      // Apply attributes and listeners to the main div for full-area dragging
      {...attributes}
      {...listeners}
      // Prevent toggle when editing, otherwise allow it
      onClick={!isEditing ? onToggleExpand : undefined}
    >
      {/* Removed the explicit drag handle div */}

      {/* Main header content */}
      <div className="flex items-center justify-between p-1 pl-3"> {/* Reduced padding */}
        {isEditing ? (
          <div className="flex items-center w-full gap-2" data-no-dnd="true">
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
            {/* Edit button is now part of the main header, but still needs data-no-dnd */}
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEditClick(); }} className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-no-dnd="true">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-1" data-no-dnd="true"> {/* Ensure these are not draggable */}
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Label htmlFor={`focus-mode-toggle-${id}`} className="text-xs text-muted-foreground">
              {includeInFocusMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Label>
            <Switch
              id={`focus-mode-toggle-${id}`}
              checked={includeInFocusMode}
              onCheckedChange={onToggleIncludeInFocusMode}
              aria-label={`Include ${name} in Focus Mode`}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
                data-no-dnd="true" // Ensure dropdown trigger is not draggable
              >
                <span className="sr-only">Open section menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddTaskToSection(id); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Task to Section
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkAllCompleted(id); }}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditClick(); }}>
                <Edit className="mr-2 h-4 w-4" /> Rename Section
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteClick(id); }} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
        </div>
      </div>
    </div>
  );
};

export default SortableSectionHeader;