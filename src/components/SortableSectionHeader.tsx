"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, Settings, CheckCircle2, ListTodo, FolderOpen, ChevronDown, Edit, MoreHorizontal, Trash2, Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { TaskSection } from '@/hooks/useTasks';
import DragHandleIcon from './DragHandleIcon'; // Import the new icon

interface SortableSectionHeaderProps {
  section: TaskSection;
  sectionTasksCount: number;
  isExpanded: boolean;
  toggleSection: (sectionId: string) => void;
  editingSectionId: string | null;
  editingSectionName: string;
  setNewEditingSectionName: (name: string) => void;
  handleEditSectionClick: (section: TaskSection) => void;
  handleAddTaskToSpecificSection: (sectionId: string | null) => void;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  handleDeleteSectionClick: (sectionId: string) => void;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  onUpdateSectionName: (sectionId: string, newName: string) => Promise<void>; // New prop for direct update
  isOverlay?: boolean; // New prop for drag overlay
}

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({
  section,
  sectionTasksCount,
  isExpanded,
  toggleSection,
  editingSectionId,
  editingSectionName,
  setNewEditingSectionName,
  handleEditSectionClick,
  handleAddTaskToSpecificSection,
  markAllTasksInSectionCompleted,
  handleDeleteSectionClick,
  updateSectionIncludeInFocusMode,
  onUpdateSectionName, // Destructure new prop
  isOverlay = false, // Default to false
}) => {
  // Conditionally use useSortable
  const sortable = !isOverlay ? useSortable({ id: section.id, data: { type: 'section', section } }) : null;

  const attributes = sortable?.attributes;
  const setNodeRef = sortable?.setNodeRef || null;
  const transform = sortable?.transform;
  const transition = sortable?.transition;
  const isDragging = sortable?.isDragging || false;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto', // Original item should be behind overlay
    // If it's the original item being dragged, make it invisible
    opacity: isDragging && !isOverlay ? 0 : 1,
    visibility: isDragging && !isOverlay ? 'hidden' : 'visible',
  };

  const handleInputBlur = async () => {
    if (editingSectionId && editingSectionName.trim() !== section.name) {
      await onUpdateSectionName(editingSectionId, editingSectionName.trim());
    }
    handleEditSectionClick(section); // Call to exit editing mode (sets editingSectionId to null)
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Trigger blur to save
    } else if (e.key === 'Escape') {
      setNewEditingSectionName(section.name); // Revert to original name
      handleEditSectionClick(section); // Call to exit editing mode (sets editingSectionId to null)
    }
  };

  const isEditing = editingSectionId === section.id && !isOverlay;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-center py-2 pl-1 pr-2", // Adjusted padding
        "group",
        isDragging && !isOverlay ? "" : "rounded-lg", // Only apply border/rounded-lg if not the invisible original
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card" : "", // Apply distinct styles for the overlay
        isOverlay ? "cursor-grabbing" : "hover:shadow-sm", // Add hover shadow
      )}
      {...(attributes || {})} // Keep attributes here
    >
      <button
        className={cn(
          "flex-shrink-0 h-full py-2 px-1.5 text-muted-foreground opacity-100 group-hover:opacity-100 transition-opacity duration-200",
          isOverlay ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
        )}
        aria-label="Drag to reorder section"
        disabled={isOverlay}
        {...(sortable?.listeners || {})} // ADD listeners here
      >
        <DragHandleIcon className="h-4 w-4" /> {/* Use custom DragHandleIcon */}
      </button>
      <div className="flex-1 flex items-center justify-between pl-1"> {/* Adjusted padding */}
        <div 
          className="relative flex items-center gap-2 flex-1 cursor-pointer" // Added relative positioning
          onClick={() => !isOverlay && handleEditSectionClick(section)} // Direct edit on click
          data-no-dnd="true" // Prevent drag when clicking on text to edit
        >
          <FolderOpen className="h-4 w-4 text-muted-foreground" /> {/* Adjusted icon size */}
          
          {/* Static text - always visible */}
          <h3 className="text-base font-bold flex-1 truncate">
            {section.name} ({sectionTasksCount})
          </h3>

          {/* Editable input, overlaid - only visible when editing */}
          <Input
            value={isEditing ? editingSectionName : section.name} // Show current editing name or static name
            onChange={(e) => setNewEditingSectionName(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className={cn(
              "absolute inset-0 w-full h-full text-base font-bold", // Match h3 styling
              "border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0", // Remove default input styling
              "px-0 py-0", // Remove default input padding
              "text-foreground", // Ensure text color matches
              isEditing ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            style={{ lineHeight: '1.5rem' }} // Explicitly set line-height to match h3
            autoFocus={isEditing} // Auto-focus when editing
            readOnly={!isEditing} // Make it read-only when not editing
          />
        </div>
        <div className="flex items-center space-x-1" data-no-dnd="true"> {/* Reduced space-x */}
          {!isOverlay && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 p-0" // Adjusted button size
                    data-no-dnd="true" 
                    tabIndex={isOverlay ? -1 : 0}
                  >
                    <span>
                      <span className="sr-only">Open section menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" data-no-dnd="true">
                  <DropdownMenuItem onSelect={() => handleAddTaskToSpecificSection(section.id)}>
                    <Plus className="mr-2 h-3.5 w-3.5" /> Add Task to Section
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(section.id)}>
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark All Completed
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode)}>
                    {section.include_in_focus_mode ? <EyeOff className="mr-2 h-3.5 w-3.5" /> : <Eye className="mr-2 h-3.5 w-3.5" />}
                    {section.include_in_focus_mode ? 'Exclude from Focus Mode' : 'Include in Focus Mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleDeleteSectionClick(section.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => toggleSection(section.id)} 
                className="h-7 w-7 p-0" 
                data-no-dnd="true" 
                tabIndex={isOverlay ? -1 : 0}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SortableSectionHeader;