"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, CheckCircle2, Trash2, XCircle, ChevronDown, FolderOpen, ChevronsDownUp, XSquare } from 'lucide-react'; // Added XSquare
import { Task, TaskSection } from '@/hooks/useTasks';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onComplete: () => Promise<void>;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onChangePriority: (priority: Task['priority']) => Promise<void>;
  onBulkChangeSection: (sectionId: string | null) => Promise<void>;
  sections: TaskSection[];
  onBulkToggleDoToday: () => Promise<void>;
  onBulkMarkSkipped: () => Promise<void>; // New prop
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onComplete,
  onArchive,
  onDelete,
  onChangePriority,
  onBulkChangeSection,
  sections,
  onBulkToggleDoToday,
  onBulkMarkSkipped, // Destructure new prop
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card p-3 rounded-full shadow-2xl border border-border flex items-center gap-2 z-50">
      <Button variant="ghost" size="sm" onClick={onClearSelection} className="rounded-full px-3">
        <XCircle className="h-4 w-4 mr-1" /> Clear ({selectedCount})
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="rounded-full px-3">
            Actions <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuItem onClick={onComplete}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onBulkToggleDoToday}>
            <ChevronsDownUp className="mr-2 h-4 w-4" /> Toggle Do Today
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onBulkMarkSkipped}> {/* New dropdown item */}
            <XSquare className="mr-2 h-4 w-4" /> Mark Skipped
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderOpen className="mr-2 h-4 w-4" /> Move to Section
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onBulkChangeSection(null)}>
                No Section
              </DropdownMenuItem>
              {sections.map(section => (
                <DropdownMenuItem key={section.id} onClick={() => onBulkChangeSection(section.id)}>
                  {section.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ChevronDown className="mr-2 h-4 w-4" /> Change Priority
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onChangePriority('urgent')}>Urgent</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('high')}>High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('medium')}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('low')}>Low</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default BulkActionBar;