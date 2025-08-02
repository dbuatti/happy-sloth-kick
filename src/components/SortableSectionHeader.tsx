"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
// Removed import for DragHandleIcon

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
  isOverlay = false,
}) => {
  const sortable = !isOverlay ? useSortable({ id: section.id, data: { type: 'section', section } }) : null;

  const attributes = sortable?.attributes;
  const setNodeRef = sortable?.setNodeRef || null;
  const transform = sortable?.transform;
  const transition = sortable?.transition;
  const isDragging = sortable?.isDragging || false;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
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

  const handleStartEdit = useCallback(() => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-center py-2 pl-1 pr-2",
        "group",
        isDragging && !isOverlay ? "" : "rounded-lg",
        isOverlay ? "shadow-xl ring-2 ring-primary bg-card" : "",
        isOverlay ? "cursor-grabbing" : "hover:shadow-sm",
      )}
      {...(attributes || {})}
    >
      {/* Removed DragHandleIcon button */}
      <div className="flex-1 flex items-center justify-between">
        <div 
          className="flex items-center flex-1 cursor-pointer min-w-0"
          onClick={handleStartEdit}
          data-no-dnd="true"
        >
          {isEditingLocal ? (
            <>
              <Input
                value={localSectionName}
                onChange={(e) => setLocalSectionName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleInputKeyDown}
                className={cn(
                  "!text-base !font-bold",
                  "border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  "p-0",
                  "text-foreground",
                  "appearance-none",
                  "flex-1 truncate"
                )}
                style={{ lineHeight: '1.5rem' }}
                autoFocus={true}
              />
              <span className="text-base font-bold text-muted-foreground ml-1 flex-shrink-0">
                ({sectionTasksCount})
              </span>
            </>
          ) : (
            <h3 className="text-base font-bold truncate flex-1">
              {section.name} ({sectionTasksCount})
            </h3>
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
                    className="h-7 w-7 p-0"
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