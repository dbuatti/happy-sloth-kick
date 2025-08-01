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
        "relative rounded-none bg-muted dark:bg-gray-700 text-foreground shadow-none hover:shadow-none transition-shadow duration-200 group", // Removed rounded-lg, shadow-sm, hover:shadow-md
        isDragging ? "ring-2 ring-primary shadow-lg" : "",
        "flex items-center border-b border-[#E0E0E0]" // Added 1px border-bottom
      )}
    >
      <button
        className="flex-shrink-0 h-full py-[5px] px-[5px] text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing" // 5px padding
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder section"
        data-no-dnd="true" // Ensure this button is the only drag handle
      >
        <GripVertical className="h-[20px] w-[20px]" /> {/* 20px icon */}
      </button>
      <div className="flex-1 flex items-center justify-between py-[5px] pl-0 pr-[5px]"> {/* 5px padding */}
        {editingSectionId === section.id ? (
          <div className="flex items-center w-full gap-2" data-no-dnd="true">
            <Input
              value={editingSectionName}
              onChange={(e) => setNewEditingSectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSection()}
              className="text-[12px] font-normal h-[20px]" // 12px font, 20px height
              autoFocus
            />
            <Button size="sm" onClick={handleRenameSection} disabled={!editingSectionName.trim()} className="h-[20px] text-[12px]">Save</Button> {/* 20px height, 12px font */}
            <Button variant="ghost" size="sm" onClick={handleCancelSectionEdit} className="h-[20px] text-[12px]">Cancel</Button> {/* 20px height, 12px font */}
          </div>
        ) : (
          <div 
            className="flex items-center gap-2 flex-1 cursor-pointer" 
            onClick={() => toggleSection(section.id)}
          >
            <h3 className="text-[12px] font-bold flex items-center gap-2"> {/* 12px font, bold */}
              <FolderOpen className="h-[20px] w-[20px] text-muted-foreground" /> {/* 20px icon */}
              {section.name} ({sectionTasksCount})
            </h3>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditSectionClick(section); }} className="h-[20px] w-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-no-dnd="true"> {/* 20px button */}
              <Edit className="h-[20px] w-[20px]" /> {/* 20px icon */}
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-[5px]" data-no-dnd="true"> {/* 5px spacing */}
          <div className="flex items-center space-x-[5px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="h-[20px] w-[20px] flex items-center justify-center p-0 text-muted-foreground hover:text-foreground cursor-pointer"> {/* 20px clickable area */}
                  {section.include_in_focus_mode ? <Eye className="h-[20px] w-[20px]" /> : <EyeOff className="h-[20px] w-[20px]" />} {/* 20px icons */}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {section.include_in_focus_mode ? 'Included in Focus Mode' : 'Excluded from Focus Mode'}
              </TooltipContent>
            </Tooltip>
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
                className="h-[20px] w-[20px] p-0" // 20px button
              >
                <span>
                  <span className="sr-only">Open section menu</span>
                  <MoreHorizontal className="h-[20px] w-[20px]" /> {/* 20px icon */}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-no-dnd="true">
              <DropdownMenuItem onSelect={() => handleAddTaskToSpecificSection(section.id)}>
                <Plus className="mr-2 h-[20px] w-[20px]" /> Add Task to Section {/* 20px icon */}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(section.id)}>
                <CheckCircle2 className="mr-2 h-[20px] w-[20px]" /> Mark All Completed {/* 20px icon */}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleEditSectionClick(section)}>
                <Edit className="mr-2 h-[20px] w-[20px]" /> Rename Section {/* 20px icon */}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleDeleteSectionClick(section.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-[20px] w-[20px]" /> Delete Section {/* 20px icon */}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={() => toggleSection(section.id)} className="h-[20px] w-[20px] p-0"> {/* 20px button */}
            <ChevronDown className={cn("h-[20px] w-[20px] transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} /> {/* 20px icon */}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortableSectionHeader;