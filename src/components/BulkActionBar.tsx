"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, Archive, Trash2, XCircle, ChevronDown, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onComplete: () => Promise<void>;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onChangePriority: (priority: Task['priority']) => Promise<void>;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onComplete,
  onArchive,
  onDelete,
  onChangePriority,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      "bg-background border-t border-border shadow-lg",
      "flex items-center justify-between p-3 sm:p-4"
    )}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-muted-foreground hover:text-foreground">
          <XCircle className="h-4 w-4 mr-2" />
          Clear ({selectedCount})
        </Button>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onComplete}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Complete
        </Button>
        <Button variant="secondary" size="sm" onClick={onArchive}>
          <Archive className="h-4 w-4 mr-2" /> Archive
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              <ChevronDown className="h-4 w-4 mr-2" /> More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onChangePriority('urgent')}>
              <ArrowUp className="mr-2 h-4 w-4 text-priority-urgent" /> Urgent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangePriority('high')}>
              <ArrowUp className="mr-2 h-4 w-4 text-priority-high" /> High
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangePriority('medium')}>
              <ArrowRight className="mr-2 h-4 w-4 text-priority-medium" /> Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangePriority('low')}>
              <ArrowDown className="mr-2 h-4 w-4 text-priority-low" /> Low
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default BulkActionBar;