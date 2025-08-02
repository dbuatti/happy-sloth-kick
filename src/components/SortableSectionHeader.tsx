"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; // Removed DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger
import { Plus, CheckCircle2, ChevronDown, MoreHorizontal, Trash2, Eye, EyeOff } from 'lucide-react'; // Removed FolderOpen
import { cn } from '@/lib/utils';
import { TaskSection } from '@/hooks/useTasks';
// Removed DragHandleIcon import

interface SortableSectionHeaderProps {
  section: TaskSection;
  sectionTasksCount: number; // Now represents remaining tasks
  isExpanded: boolean;
  toggleSection: (sectionId: string) => void; // New prop
  handleAddTaskToSpecificSection: (sectionId: string | null) => void;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  handleDeleteSectionClick: (sectionId: string) => void;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  onUpdateSectionName: (sectionId: string, newName: string) => Promise<void>;
  isOverlay?: boolean;
}

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({
  section,
  sectionTasksCount,
  isExpanded,
  toggleSection, // Destructure new prop
  handleAddTaskToSpecificSection,
  markAllTasksInSectionCompleted,
  handleDeleteSectionClick,
  updateSectionIncludeInFocusMode,
  onUpdateSectionName,
  isOverlay = false,
}) => {
  const sortable = !isOverlay ? useSortable({ id: section.id, data: { type: 'section', section } }) : null;

  const attributes = sortable?.attributes;
  const listeners = sortable?.listeners; // Get listeners here
  const setNodeRef = sortable?.setNodeRef || null;
  const transform = sortable?.transform;
  const transition = sortable?.transition;
  const isDragging = sortable?.isDragging || false;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform || null), // Ensure transform is Transform | null
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging && !isOverlay ? 0 : 1,
    visibility: isDragging && !isOverlay ? 'hidden' : 'visible',
  };

  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [localSectionName, setLocalSectionName] = useState(section.name);

  useEffect(() => {
    if (!isEditingLocal) {
      setLocalSectionName(section.name);
    }
  }, [section.name, isEditingLocal]);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggle from firing when starting edit
    if (isOverlay) return;
    setIsEditingLocal(true);
    setLocalSectionName(section.name);
  }, [isOverlay, section.name]);

  const handleSaveEdit = useCallback(async () => {
    if (localSectionName.trim() !== section.name) {
      await onUpdateSectionName(section.id, localSectionName.trim());
    }
    setIsEditingLocal(false);
  }, [localSectionName, section.name, onUpdateSectionName, section.id]);

  const handleCancelEdit = useCallback(() => {
    setLocalSectionName(section.name);
    setIsEditingLocal(false);
  }, [section.name]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleCancelEdit]);

  const getTaskCountCircleClasses = () => { // Removed unused 'count' parameter
    // Always use primary color for the badge background, and primary-foreground for text
    return "bg-primary text-primary-foreground";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-center py-2 pr-3", // Increased vertical padding
        "group",
        isDragging && !isOverlay ? "" : "rounded-xl", // Added rounded-xl here
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card" : "", // Removed hover effects
        isOverlay ? "cursor-grabbing" : "",
      )}
      {...(attributes || {})}
      {...(listeners || {})} // Apply listeners to the main div for dragging the whole section
      // Removed onClick from here, children will handle all clicks
    >
      {/* Removed Drag Handle */}

      <div className="flex-1 flex items-center justify-between">
        <div 
          className="flex items-center flex-1 min-w-0" // This div still expands
          data-no-dnd="true"
        >
          {isEditingLocal ? (
            <>
              <Input
                value={localSectionName}
                onChange={(e) => setLocalSectionName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleInputKeyDown}
                onMouseDown={(e) => e.stopPropagation()} // Prevent toggle on input click
                className={cn(
                  "!text-xl !font-bold", // Increased font size
                  "border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  "p-0",
                  "text-foreground",
                  "appearance-none",
                  "flex-1 truncate", // Keep flex-1 on input so it expands
                  "!h-auto !min-h-0 !py-0"
                )}
                style={{ lineHeight: '1.5rem' }}
                autoFocus={true}
              />
              {/* Removed the old task count span here */}
            </>
          ) : (
            <>
              <h3 
                className="text-xl font-bold truncate cursor-pointer" // Increased font size
                onClick={handleStartEdit} // This h3 click starts edit and stops propagation
                data-no-dnd="true" // Ensure dnd-kit doesn't interfere
              >
                {section.name}
              </h3>
              {/* NEW: Fun colored circle for task count */}
              <div className={cn(
                "ml-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors duration-200", // Increased size and font
                getTaskCountCircleClasses() // Call without parameter
              )} data-no-dnd="true">
                {sectionTasksCount}
              </div>
            </>
          )}
          {/* NEW: This is the toggle area */}
          <div
            className="flex-1 h-full min-h-[28px] cursor-pointer" // This takes up remaining space, min-h to ensure clickable area
            onClick={!isOverlay && !isEditingLocal ? () => toggleSection(section.id) : undefined} // This toggles
            data-no-dnd="true"
          ></div>
        </div>
        <div className="flex items-center space-x-1" data-no-dnd="true">
          {!isOverlay && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 p-0" // Increased button size
                    data-no-dnd="true" 
                    tabIndex={isOverlay ? -1 : 0}
                    onClick={(e) => e.stopPropagation()} // Prevent toggle on button click
                  >
                    <span>
                      <span className="sr-only">Open section menu</span>
                      <MoreHorizontal className="h-5 w-5" /> {/* Increased icon size */}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" data-no-dnd="true">
                  <DropdownMenuItem onSelect={() => handleAddTaskToSpecificSection(section.id)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Task to Section {/* Increased icon size */}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(section.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Completed {/* Increased icon size */}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode)}>
                    {section.include_in_focus_mode ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />} {/* Increased icon size */}
                    {section.include_in_focus_mode ? 'Exclude from Focus Mode' : 'Include in Focus Mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleDeleteSectionClick(section.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Section {/* Increased icon size */}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }} // Prevent toggle on button click
                className="h-8 w-8 p-0" // Increased button size
                data-no-dnd="true" 
                tabIndex={isOverlay ? -1 : 0}
              >
                <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} /> {/* Increased icon size */}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SortableSectionHeader;