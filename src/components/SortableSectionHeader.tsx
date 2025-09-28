"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, CheckCircle, Trash2, MoreHorizontal, ChevronDown, ListOrdered, Settings, GripVertical } from 'lucide-react';
import { cn } from "@/lib/utils";
import { TaskSection } from '@/hooks/useTasks';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { showSuccess } from '@/utils/toast';
import { DraggableAttributes } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface SortableSectionHeaderProps {
  section: TaskSection;
  sectionTasksCount: number;
  isExpanded: boolean;
  toggleSection: (sectionId: string) => void;
  handleAddTaskToSpecificSection: (sectionId: string | null) => void;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  handleDeleteSectionClick: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  onUpdateSectionName: (sectionId: string, newName: string) => Promise<void>;
  onOpenReorderTasks: (sectionId: string | null) => void;
  isOverlay?: boolean;
  isNoSection?: boolean;
  isDemo?: boolean;
  // DND props are optional as they are only passed by SortableSectionWrapper
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
  setNodeRef?: (element: HTMLElement | null) => void;
  transform?: { x: number; y: number; scaleX: number; scaleY: number } | null;
  transition?: string;
  isDragging?: boolean;
}

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({
  section,
  sectionTasksCount,
  isExpanded,
  toggleSection,
  handleAddTaskToSpecificSection,
  markAllTasksInSectionCompleted,
  handleDeleteSectionClick,
  updateSectionIncludeInFocusMode,
  onUpdateSectionName,
  onOpenReorderTasks,
  isOverlay = false,
  isNoSection = false,
  isDemo,
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(section.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(section.name);
  }, [section.name]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    if (editedName.trim() && editedName.trim() !== section.name) {
      await onUpdateSectionName(section.id, editedName.trim());
      showSuccess('Section name updated!');
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(section.name);
    setIsEditingName(false);
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      await handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleToggleFocusMode = async (checked: boolean) => {
    await updateSectionIncludeInFocusMode(section.id, checked);
    showSuccess(`Section ${checked ? 'included in' : 'excluded from'} Focus Mode.`);
  };

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging && !isOverlay ? 0 : 1,
    visibility: isDragging && !isOverlay ? 'hidden' : undefined, // Omit visibility when not hidden
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-200",
        isOverlay ? "bg-primary/10 ring-2 ring-primary shadow-lg rotate-2" : "bg-secondary/20 hover:bg-secondary/40", // Enhanced hover effect
        isNoSection && "bg-muted/30 hover:bg-muted/40 border border-dashed border-muted-foreground/20",
        isDemo && "opacity-70 cursor-not-allowed",
        "group"
      )}
    >
      <div className="flex items-center gap-2 flex-grow min-w-0">
        {!isOverlay && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
              >
                <ChevronDown className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isExpanded ? "rotate-0" : "-rotate-90"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isExpanded ? 'Collapse Section' : 'Expand Section'}
            </TooltipContent>
          </Tooltip>
        )}

        {!isOverlay && ( // Only show drag handle in the main list, not in overlay
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground cursor-grab" // Slightly larger drag handle
                {...listeners} // Apply listeners directly to the Button
                {...attributes} // Apply attributes directly to the Button
                onClick={(e) => e.stopPropagation()} // Prevent click from triggering other actions
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag from starting on click
                aria-label="Reorder section"
              >
                <GripVertical className="h-5 w-5" /> {/* Slightly larger icon */}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Drag to reorder section</TooltipContent>
          </Tooltip>
        )}

        <div className="flex-grow min-w-0" onDoubleClick={() => !isOverlay && !isNoSection && setIsEditingName(true)}>
          {isEditingName ? (
            <Input
              ref={inputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleInputKeyDown}
              className="h-8 text-xl font-semibold p-0 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full" // Increased font size
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <h2 className={cn(
              "text-xl font-semibold flex items-center gap-2 cursor-pointer", // Increased font size
              isNoSection && "text-muted-foreground"
            )} onClick={() => !isOverlay && !isNoSection && toggleSection(section.id)}>
              {section.name}
              {!isNoSection && sectionTasksCount > 0 && (
                <span className="text-base font-medium text-muted-foreground ml-1">({sectionTasksCount})</span> // Adjusted font size and weight
              )}
            </h2>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!isOverlay && !isNoSection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Label htmlFor={`focus-mode-switch-${section.id}`} className="sr-only">Include in Focus Mode</Label>
                <Switch
                  id={`focus-mode-switch-${section.id}`}
                  checked={section.include_in_focus_mode}
                  onCheckedChange={handleToggleFocusMode}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Toggle include in Focus Mode"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {section.include_in_focus_mode ? 'Included in Focus Mode' : 'Excluded from Focus Mode'}
            </TooltipContent>
          </Tooltip>
        )}

        {!isOverlay && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:bg-primary/10"
                  onClick={(e) => { e.stopPropagation(); handleAddTaskToSpecificSection(isNoSection ? null : section.id); }}
                  aria-label="Add task to this section"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Task</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Section actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {sectionTasksCount > 0 && (
                  <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(isNoSection ? null : section.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark All Completed
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => onOpenReorderTasks(isNoSection ? 'no-section-header' : section.id)}>
                  <ListOrdered className="mr-2 h-4 w-4" /> Reorder Tasks
                </DropdownMenuItem>
                {!isNoSection && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setIsEditingName(true)}>
                      <Settings className="mr-2 h-4 w-4" /> Rename Section
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleDeleteSectionClick(section.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Section
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
};

export default SortableSectionHeader;