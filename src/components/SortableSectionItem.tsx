"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskSection, Category, NewTaskData, Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Settings, EyeOff, Eye, GripVertical } from 'lucide-react'; // Import GripVertical
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // Removed: DropdownMenuSeparator, // This line was causing the error
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import QuickAddTask from './QuickAddTask';
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
  handleAddTask: (taskData: NewTaskData) => Promise<any>;
  allCategories: Category[];
  currentDate: Date;
  sections: TaskSection[]; // All sections for QuickAddTask
  createSection: (name: string) => Promise<any>;
  updateSection: (id: string, newName: string) => Promise<void>;
  deleteSection: (id: string) => Promise<any>;
  renderTask: (task: Task, level: number) => React.ReactNode;
  insertionIndicator: { id: UniqueIdentifier; position: 'before' | 'after' | 'into' } | null;
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
  onEditSectionNameChange, // Destructure new prop
  markAllTasksInSectionCompleted,
  updateSectionIncludeInFocusMode,
  confirmDeleteSection,
  isDemo,
  handleAddTask,
  allCategories,
  currentDate,
  sections,
  createSection,
  updateSection,
  deleteSection,
  renderTask,
  insertionIndicator,
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

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="h-16 bg-muted/50 border-2 border-dashed border-border rounded-lg" />;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-card shadow-sm relative",
        insertionIndicator?.id === section.id && insertionIndicator.position === 'into' && "bg-primary/10 border-primary"
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
              onChange={(e) => onEditSectionNameChange(e.target.value)} // Use new prop
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
                {section.id === 'no-section' ? "No tasks without a section. Add one above or drag a task here!" : `No tasks in "${section.name}". Add one below!`}
              </p>
            )}
            <QuickAddTask
              sectionId={section.id}
              onAddTask={handleAddTask}
              defaultCategoryId={allCategories[0]?.id || ''}
              isDemo={isDemo}
              allCategories={allCategories}
              currentDate={currentDate}
              sections={sections}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            />
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