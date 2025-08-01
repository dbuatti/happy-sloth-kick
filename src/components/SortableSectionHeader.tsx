"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, Settings, CheckCircle2, ListTodo, FolderOpen, ChevronDown, Edit, MoreHorizontal, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TaskSection } from '@/hooks/useTasks';

interface SortableSectionHeaderProps {
  section: TaskSection;
  sectionTasksCount: number;
  isExpanded: boolean;
  toggleSection: (sectionId: string) => void;
  editingSectionId: string | null;
  editingSectionName: string;
  setNewEditingSectionName: (name: string) => void;
  handleRenameSection: () => Promise<void>;
  handleCancelSectionEdit: () => void;
  handleEditSectionClick: (section: TaskSection) => void;
  handleAddTaskToSpecificSection: (sectionId: string | null) => void;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  handleDeleteSectionClick: (sectionId: string) => void;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
}

const SortableSectionHeader: React.FC<SortableSectionHeaderProps> = ({
  section,
  sectionTasksCount,
  isExpanded,
  toggleSection,
  editingSectionId,
  editingSectionName,
  setNewEditingSectionName,
  handleRenameSection,
  handleCancelSectionEdit,
  handleEditSectionClick,
  handleAddTaskToSpecificSection,
  markAllTasksInSectionCompleted,
  handleDeleteSectionClick,
  updateSectionIncludeInFocusMode,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, data: { type: 'section', section } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto', // Higher z-index for dragging sections
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative rounded-lg bg-muted dark:bg-gray-700 text-foreground shadow-sm hover:shadow-md transition-shadow duration-200 group",
        isDragging ? "ring-2 ring-primary shadow-lg" : "",
        "flex items-center gap-2" // Use flex to align drag handle
      )}
    >
      <button
        className="flex-shrink-0 h-full py-1 px-0.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder section"
        data-no-dnd="true" // Ensure this button is the only drag handle
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 flex items-center justify-between py-1.5 pl-0 pr-1">
        {editingSectionId === section.id ? (
          <div className="flex items-center w-full gap-2" data-no-dnd="true">
            <Input
              value={editingSectionName}
              onChange={(e) => setNewEditingSectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSection()}
              className="text-lg font-semibold h-9"
              autoFocus
            />
            <Button size="sm" onClick={handleRenameSection} disabled={!editingSectionName.trim()} className="h-9">Save</Button>
            <Button variant="ghost" size="sm" onClick={handleCancelSectionEdit} className="h-9">Cancel</Button>
          </div>
        ) : (
          <div 
            className="flex items-center gap-2 flex-1 cursor-pointer" 
            onClick={() => toggleSection(section.id)}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              {section.name} ({sectionTasksCount})
            </h3>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditSectionClick(section); }} className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-no-dnd="true">
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-1" data-no-dnd="true">
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Changed Button to a simple span with styling to ensure single child */}
                <span className="h-6 w-6 flex items-center justify-center p-0 text-muted-foreground hover:text-foreground cursor-pointer">
                  {section.include_in_focus_mode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {section.include_in_focus_mode ? 'Included in Focus Mode' : 'Excluded from Focus Mode'}
              </TooltipContent>
            </Tooltip>
            {/* Label is now a sibling to the Tooltip, correctly associated with the Switch */}
            <Label htmlFor={`focus-mode-toggle-${section.id}`} className="sr-only">
              {section.include_in_focus_mode ? 'Included in Focus Mode' : 'Excluded from Focus Mode'}
            </Label>
            <Switch
              id={`focus-mode-toggle-${section.id}`}
              checked={section.include_in_focus_mode}
              onCheckedChange={(checked) => updateSectionIncludeInFocusMode(section.id, checked)}
              aria-label={`Include ${section.name} in Focus Mode`}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 p-0"
              >
                <span className="sr-only">Open section menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-no-dnd="true">
              <DropdownMenuItem onSelect={() => handleAddTaskToSpecificSection(section.id)}>
                <Plus className="mr-2 h-4 w-4" /> Add Task to Section
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(section.id)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Completed
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleEditSectionClick(section)}>
                <Edit className="mr-2 h-4 w-4" /> Rename Section
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleDeleteSectionClick(section.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={() => toggleSection(section.id)} className="h-6 w-6 p-0">
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortableSectionHeader;