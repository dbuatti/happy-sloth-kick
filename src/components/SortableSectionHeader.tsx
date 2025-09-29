"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskSection } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, CheckCircle2, Settings, Trash2, ListTodo, ArrowDownUp, Edit } from 'lucide-react'; // Removed Eye, EyeOff, Added Edit
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DraggableAttributes, UniqueIdentifier } from '@dnd-kit/core'; // Added UniqueIdentifier
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface SortableSectionHeaderProps {
  section: TaskSection;
  sectionTasksCount: number;
  sectionOverdueCount: number;
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
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
  transform?: { x: number; y: number; scaleX: number; scaleY: number } | null;
  transition?: string;
  isDragging?: boolean;
  insertionIndicator: { id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null;
}

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({
  section,
  sectionTasksCount,
  sectionOverdueCount,
  isExpanded,
  toggleSection,
  handleAddTaskToSpecificSection,
  markAllTasksInSectionCompleted,
  handleDeleteSectionClick,
  updateSectionIncludeInFocusMode,
  onUpdateSectionName,
  onOpenReorderTasks,
  isNoSection = false,
  isDemo = false,
  attributes,
  listeners,
  isDragging,
  insertionIndicator,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(section.name);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value);
  };

  const handleSaveName = async () => {
    if (newName.trim() && newName.trim() !== section.name) {
      await onUpdateSectionName(section.id, newName.trim());
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setNewName(section.name);
      setIsEditingName(false);
    }
  };

  const handleToggleFocusMode = async (checked: boolean) => {
    if (!isDemo) {
      await updateSectionIncludeInFocusMode(section.id, checked);
    }
  };

  const showInsertionBefore = insertionIndicator?.id === section.id && insertionIndicator.position === 'before';
  const showInsertionAfter = insertionIndicator?.id === section.id && insertionIndicator.position === 'after';

  return (
    <div
      className={cn(
        "relative flex items-center justify-between p-3 rounded-lg bg-secondary/20 text-secondary-foreground font-semibold text-lg transition-all duration-200 ease-in-out",
        "hover:bg-secondary/30",
        isDragging && "opacity-50 ring-2 ring-primary",
        isNoSection && "italic text-muted-foreground",
        "group"
      )}
    >
      {showInsertionBefore && (
        <div className="absolute -top-1 left-0 right-0 h-1 w-full bg-primary rounded-full z-10 animate-pulse" />
      )}
      <div className="flex items-center gap-2 flex-grow min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground cursor-grab",
            isDemo && "cursor-not-allowed opacity-50"
          )}
          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder section"
          disabled={isDemo || isNoSection}
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground",
            isDemo && "cursor-not-allowed opacity-50"
          )}
          onClick={() => toggleSection(section.id)}
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          disabled={isDemo}
        >
          <ArrowDownUp className={cn(
            "h-4 w-4 transition-transform duration-200",
            isExpanded ? "rotate-180" : "rotate-0"
          )} />
        </Button>

        {isEditingName && !isDemo ? (
          <Input
            value={newName}
            onChange={handleNameChange}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-8 text-lg font-semibold p-0 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow min-w-0"
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn("flex-grow min-w-0 truncate cursor-text", isDemo && "cursor-default")}
            onClick={() => !isDemo && setIsEditingName(true)}
          >
            {section.name}
            {sectionTasksCount > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">({sectionTasksCount} pending)</span>
            )}
            {sectionOverdueCount > 0 && (
              <span className="ml-2 text-sm text-red-500">({sectionOverdueCount} overdue)</span>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!isNoSection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Switch
                checked={section.include_in_focus_mode}
                onCheckedChange={handleToggleFocusMode}
                disabled={isDemo}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground"
                aria-label={`Toggle focus mode inclusion for ${section.name}`}
              />
            </TooltipTrigger>
            <TooltipContent>
              {section.include_in_focus_mode ? "Included in Focus Mode" : "Not included in Focus Mode"}
            </TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isDemo}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              aria-label="Section actions"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => handleAddTaskToSpecificSection(isNoSection ? null : section.id)} disabled={isDemo}>
              <Plus className="mr-2 h-4 w-4" /> Add Task
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(isNoSection ? null : section.id)} disabled={isDemo || sectionTasksCount === 0}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Completed
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenReorderTasks(isNoSection ? null : section.id)} disabled={isDemo}>
              <ListTodo className="mr-2 h-4 w-4" /> Reorder Tasks
            </DropdownMenuItem>
            {!isNoSection && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsEditingName(true)} disabled={isDemo}>
                  <Edit className="mr-2 h-4 w-4" /> Rename Section
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} disabled={isDemo} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Section
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the "{section.name}" section and move all its tasks to "No Section".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteSectionClick(section.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {showInsertionAfter && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 w-full bg-primary rounded-full z-10 animate-pulse" />
      )}
    </div>
  );
};

export default SortableSectionHeader;