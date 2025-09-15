"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, CheckCircle2, ChevronDown, MoreHorizontal, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskSection } from '@/hooks/useTasks';

interface SortableSectionHeaderProps {
  section: TaskSection;
  sectionTasksCount: number;
  isExpanded: boolean;
  toggleSection: (sectionId: string) => void;
  handleAddTaskToSpecificSection: (sectionId: string | null) => void;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  handleDeleteSectionClick: (sectionId: string) => void;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  onUpdateSectionName: (sectionId: string, newName: string) => Promise<void>;
  isOverlay?: boolean;
}

const SortableSectionHeader = ({
  section,
  sectionTasksCount,
  isExpanded,
  toggleSection,
  handleAddTaskToSpecificSection,
  markAllTasksInSectionCompleted,
  handleDeleteSectionClick,
  updateSectionIncludeInFocusMode,
  onUpdateSectionName,
  isOverlay = false,
}: SortableSectionHeaderProps) => {
  const sortable = !isOverlay ? useSortable({ id: section.id, data: { type: 'section', section } }) : null;

  const attributes = sortable?.attributes;
  const listeners = sortable?.listeners;
  const setNodeRef = sortable?.setNodeRef || null;
  const transform = sortable?.transform;
  const transition = sortable?.transition;
  const isDragging = sortable?.isDragging || false;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform || null),
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
    e.stopPropagation();
    if (isOverlay) return;
    setIsEditingLocal(true);
    setLocalSectionName(section.name);
  }, [isOverlay, section.name]);

  const handleSaveEdit = useCallback(async () => {
    if (localSectionName.trim() && localSectionName.trim() !== section.name) {
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

  const getTaskCountCircleClasses = () => {
    return "bg-primary/10 text-primary";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group select-none",
        isDragging && !isOverlay ? "" : "rounded-xl",
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card" : "",
      )}
      {...(attributes || {})}
      {...(listeners || {})}
    >
      <div
        className="relative flex items-center p-3 cursor-grab bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200"
        onClick={!isOverlay && !isEditingLocal ? () => toggleSection(section.id) : undefined}
      >
        <div
          className="flex items-center flex-1 min-w-0"
        >
          {isEditingLocal ? (
            <div data-no-dnd="true" className="flex-1">
              <Input
                value={localSectionName}
                onChange={(e) => setLocalSectionName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleInputKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  "!text-xl !font-bold",
                  "border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  "p-0",
                  "text-foreground",
                  "appearance-none",
                  "flex-1 truncate",
                  "!h-auto !min-h-0 !py-0"
                )}
                style={{ lineHeight: '1.5rem' }}
                autoFocus={true}
              />
            </div>
          ) : (
            <>
              <h3
                className="text-xl font-bold truncate cursor-text"
                onClick={handleStartEdit}
                data-no-dnd="true"
              >
                {section.name}
              </h3>
              <div className={cn(
                "ml-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors duration-200",
                getTaskCountCircleClasses()
              )} data-no-dnd="true">
                {sectionTasksCount}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center space-x-1" data-no-dnd="true">
          {!isOverlay && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 hover:bg-primary/10 text-primary"
                    tabIndex={isOverlay ? -1 : 0}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>
                      <span className="sr-only">Open section menu</span>
                      <MoreHorizontal className="h-5 w-5" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleAddTaskToSpecificSection(section.id)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Task to Section
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(section.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Completed
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode)}>
                    {section.include_in_focus_mode ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {section.include_in_focus_mode ? 'Exclude from Focus Mode' : 'Include in Focus Mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleDeleteSectionClick(section.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                className="h-8 w-8 p-0 hover:bg-primary/10 text-primary"
                tabIndex={isOverlay ? -1 : 0}
              >
                <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SortableSectionHeader;