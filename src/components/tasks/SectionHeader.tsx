"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Edit3, Trash2, Plus, Eye, EyeOff, MoreHorizontal } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

// Fix 1: Correct the import path for TaskSection
interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
  created_at: string | null;
  include_in_focus_mode: boolean;
}

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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

  // Handle menu toggle for mobile
  const toggleMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isDemo) return;
    setIsMenuOpen(!isMenuOpen);
  };

  // Fix 2: Update handleMenuItemSelect to accept functions that may have parameters
  const handleMenuItemSelect = (action: () => void) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      action();
      setIsMenuOpen(false);
    };
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
        
        {/* Custom mobile-friendly dropdown implementation */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Section options"
            disabled={isDemo}
            onClick={toggleMenu}
            onTouchEnd={(e: React.TouchEvent) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMenu(e);
            }}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {isMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover border border-border z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1" role="menu">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                  role="menuitem"
                  onClick={handleMenuItemSelect(() => handleStartEdit({} as React.MouseEvent))}
                >
                  <Edit3 className="mr-2 h-4 w-4" /> Rename
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                  role="menuitem"
                  onClick={handleMenuItemSelect(() => onToggleVisibility(section.id))}
                >
                  {section.include_in_focus_mode ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" /> Hide from Focus
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" /> Show in Focus
                    </>
                  )}
                </button>
                <div className="border-t border-border my-1"></div>
                <button
                  className={`w-full text-left px-4 py-2 text-sm ${taskCount > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-destructive hover:bg-destructive hover:text-destructive-foreground'} flex items-center`}
                  role="menuitem"
                  onClick={handleMenuItemSelect(handleDelete)}
                  disabled={taskCount > 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionHeader;