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
import { MoreHorizontal, Edit3, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

// Fix 1: Correct the import path for TaskSection type
import { TaskSection } from '@/types/task';

interface SectionHeaderProps {
  section: TaskSection;
  taskCount: number;
  onRename: (sectionId: string, newName: string) => void;
  onDelete: (sectionId: string) => void;
  onAddTask: (sectionId: string) => void;
  onToggleVisibility: (sectionId: string) => void;
  isDemo?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  section,
  taskCount,
  onRename,
  onDelete,
  onAddTask,
  onToggleVisibility,
  isDemo = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDemo) return;
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editName.trim() && editName.trim() !== section.name) {
      onRename(section.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(section.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDelete = () => {
    if (taskCount > 0) {
      showError("Cannot delete section with tasks. Move or delete tasks first.");
      return;
    }
    onDelete(section.id);
    showSuccess("Section deleted");
  };

  return (
    <div className="flex items-center justify-between py-3 px-2 group">
      <div className="flex items-center space-x-2 flex-grow min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="bg-transparent border-b border-primary focus:outline-none focus:border-primary text-lg font-semibold w-full"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 
            className="text-lg font-semibold cursor-text flex-grow min-w-0 truncate"
            onClick={handleStartEdit}
          >
            {section.name}
          </h3>
        )}
        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {taskCount}
        </span>
      </div>
      
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddTask(section.id)}
          disabled={isDemo}
          className="h-8 w-8 p-0"
          aria-label="Add task"
        >
          <Plus className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Section options"
              disabled={isDemo}
              // Added onTouchEnd to handle mobile touch events
              onTouchEnd={(e: React.TouchEvent) => {
                e.stopPropagation();
                // Ensure the dropdown opens on touch
                const button = e.currentTarget;
                const event = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                });
                button.dispatchEvent(event);
              }}
              // Keep onClick for desktop
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {/* Fix 2: Correct the event handler type */}
          <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={handleStartEdit}>
              <Edit3 className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggleVisibility(section.id)}>
              {section.include_in_focus_mode ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" /> Hide from Focus
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" /> Show in Focus
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={handleDelete} 
              className="text-destructive focus:text-destructive"
              disabled={taskCount > 0}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default SectionHeader;