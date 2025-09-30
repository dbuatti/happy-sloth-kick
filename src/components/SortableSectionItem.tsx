"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskSection, Category, NewTaskData, Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Settings, EyeOff, Eye, GripVertical, Plus } from 'lucide-react'; // Import Plus
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
// Removed: import QuickAddTask from './QuickAddTask'; // No longer needed here
import { UniqueIdentifier } from '@dnd-kit/core';

interface SortableSectionItemProps {
  section: TaskSection;
  tasksInThisSection: Task[];
  expandedSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
  editSectionId: string | null;
  editSectionName: string;
  handleUpdateSection: () => Promise<void>;
  handleEditSection: (section: TaskSection) => void;
  onEditSectionNameChange: (name: string) => void; // New prop
  markAllTasksInSectionCompleted: (sectionId: string) => Promise<any>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<any>;
  confirmDeleteSection: (section: TaskSection) => void;
  isDemo?: boolean;
  // Removed: handleAddTask: (taskData: NewTaskData) => Promise<any>; // No longer needed here
  // Removed: allCategories: Category[]; // No longer needed here
  // Removed: currentDate: Date; // No longer needed here
  // Removed: sections: TaskSection[]; // No longer needed here
  // Removed: createSection: (name: string) => Promise<any>; // No longer needed here
  // Removed: updateSection: (id: string, newName: string) => Promise<void>; // No longer needed here
  // Removed: deleteSection: (id: string) => Promise<any>; // No longer needed here
  renderTask: (task: Task, level: number) => React.ReactNode;
  insertionIndicator: { id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null;
  onOpenAddTaskDialog: (parentTaskId: string | null, sectionId: string | null) => void; // New prop
}

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
  section,
  tasksInThisSection,
  expandedSections,
  toggleSection,
  editSectionId,
  editSectionName,
  handleUpdateSection,
  handleEditSection,
  onEditSectionNameChange,
  markAllTasksInSectionCompleted,
  updateSectionIncludeInFocusMode,
  confirmDeleteSection,
  isDemo,
  // Removed: handleAddTask,
  // Removed: allCategories,
  // Removed: currentDate,
  // Removed: sections,
  // Removed: createSection,
  // Removed: updateSection,
  // Removed: deleteSection,
  renderTask,
  insertionIndicator,
  onOpenAddTaskDialog, // Destructure new prop
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: { type: 'section', item: section },
    disabled: isDemo,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform || null),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isExpanded = expandedSections[section.id] !== false;
  const showInsertionBefore = insertionIndicator?.id === section.id && insertionIndicator.position === 'before';
  const showInsertionAfter = insertionIndicator?.id === section.id && insertionIndicator.position === 'after';

  // Always render section header, even if empty, unless in demo mode and explicitly no tasks
  const showSectionContent = tasksInThisSection.length > 0 || isDemo || section.id === 'no-section';

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="h-16 bg-muted/50 border-2 border-dashed border-border rounded-lg" />;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-card shadow-sm relative",
        insertionIndicator?.id === section.id && insertionIndicator.position === 'into' && "bg-primary/10 border-primary",
        !showSectionContent && "hidden" // Keep this for demo mode empty sections
      )}
      data-dnd-type="section"
      data-dnd-id={section.id}
    >
      {showInsertionBefore && (
        <div className="absolute -top-1 left-0 right-0 h-1 w-full bg-primary rounded-full z-10 animate-pulse" />
      )}
      <div
        className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-t-lg border-b border-border"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleSection(section.id)}
            className="h-7 w-7"
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag from collapsing
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          {editSectionId === section.id ? (
            <Input
              value={editSectionName}
              onChange={(e) => onEditSectionNameChange(e.target.value)}
              onBlur={handleUpdateSection}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="h-7 text-sm font-semibold"
              autoFocus
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="text-sm font-semibold text-foreground cursor-pointer" onClick={() => toggleSection(section.id)}>
              {section.name} ({tasksInThisSection.length})
            </h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground cursor-grab"
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            {...listeners}
            {...attributes}
            aria-label="Drag to reorder section"
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenAddTaskDialog(null, section.id)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Add task to ${section.name}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => e.stopPropagation()}>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleEditSection(section)}>Rename Section</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => markAllTasksInSectionCompleted(section.id)}>Mark All Completed</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode)}>
                {section.include_in_focus_mode ? (
                  <span className="flex items-center"><EyeOff className="mr-2 h-4 w-4" /> Exclude from Focus Mode</span>
                ) : (
                  <span className="flex items-center"><Eye className="mr-2 h-4 w-4" /> Include in Focus Mode</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onSelect={() => confirmDeleteSection(section)}>Delete Section</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {isExpanded && (
          <>
            {tasksInThisSection.length > 0 ? (
              <ul className="space-y-2">
                {tasksInThisSection.map((task) => renderTask(task, 0))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                {section.id === 'no-section' ? "No tasks without a section. Click '+' above to add one, or drag a task here!" : `No tasks in "${section.name}". Click '+' above to add one!`}
              </p>
            )}
          </>
        )}
      </div>
      {showInsertionAfter && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 w-full bg-primary rounded-full z-10 animate-pulse" />
      )}
    </div>
  );
};

export default SortableSectionItem;