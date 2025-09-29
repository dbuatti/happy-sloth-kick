"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { GripVertical, Settings, Plus, Trash2, Edit, ListOrdered, Target, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { TaskSection } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { DraggableAttributes } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { UniqueIdentifier } from '@dnd-kit/core';
import { showSuccess } from '@/utils/toast'; // Removed showError

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
  isOverlay = false,
  isNoSection = false,
  isDemo = false,
  attributes,
  listeners,
  insertionIndicator,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newSectionName, setNewSectionName] = useState(section.name);

  const handleSaveName = async () => {
    if (newSectionName.trim() && newSectionName.trim() !== section.name) {
      await onUpdateSectionName(section.id, newSectionName.trim());
      showSuccess('Section name updated!');
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setNewSectionName(section.name);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const showInsertionBefore = insertionIndicator?.id === section.id && insertionIndicator.position === 'before';
  const showInsertionAfter = insertionIndicator?.id === section.id && insertionIndicator.position === 'after';
  const showInsertionInto = insertionIndicator?.id === section.id && insertionIndicator.position === 'into';

  return (
    <div
      className={cn(
        "relative flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-200",
        isOverlay ? "bg-primary/10 shadow-lg" : "bg-muted/50 hover:bg-muted",
        isNoSection && "bg-gray-100 dark:bg-gray-800",
        showInsertionBefore && "border-t-2 border-primary",
        showInsertionAfter && "border-b-2 border-primary",
        showInsertionInto && "border-2 border-primary bg-primary/10",
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
          className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => toggleSection(section.id)}
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {isEditingName && !isDemo ? (
          <Input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            className="h-8 text-base font-semibold p-0 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow"
            autoFocus
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
          />
        ) : (
          <h2
            className={cn(
              "text-base font-semibold flex-grow truncate cursor-pointer",
              isDemo && "cursor-default"
            )}
            onClick={() => !isDemo && setIsEditingName(true)}
          >
            {section.name}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({sectionTasksCount} pending)
            </span>
            {sectionOverdueCount > 0 && (
              <span className="ml-2 text-sm font-normal text-red-500">
                ({sectionOverdueCount} overdue)
              </span>
            )}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); handleAddTaskToSpecificSection(isNoSection ? null : section.id); }}
          aria-label="Add task to section"
          disabled={isDemo}
        >
          <Plus className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Section settings"
              disabled={isDemo}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => setIsEditingName(true)} disabled={isNoSection}>
              <Edit className="mr-2 h-4 w-4" /> Rename Section
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenReorderTasks(isNoSection ? null : section.id)}>
              <ListOrdered className="mr-2 h-4 w-4" /> Reorder Tasks
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(isNoSection ? null : section.id)}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Completed
            </DropdownMenuItem>
            {!isNoSection && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode)}>
                  <Target className="mr-2 h-4 w-4" /> {section.include_in_focus_mode ? 'Exclude from Focus Mode' : 'Include in Focus Mode'}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                if (window.confirm(`Are you sure you want to delete the section "${section.name}"? All tasks in this section will be moved to 'No Section'.`)) {
                  handleDeleteSectionClick(section.id);
                }
              }}
              className="text-destructive focus:text-destructive"
              disabled={isNoSection}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showInsertionAfter && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 w-full bg-primary rounded-full z-10 animate-pulse" />
      )}
    </div>
  );
};

export default SortableSectionHeader;