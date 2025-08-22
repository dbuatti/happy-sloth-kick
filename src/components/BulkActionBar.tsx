import React from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle2, Archive, Trash2, ChevronDown, X } from 'lucide-react';
import { Task } from '@/hooks/useTasks';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onComplete: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onChangePriority: (priority: Task['priority']) => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onComplete,
  onArchive,
  onDelete,
  onChangePriority,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-card text-card-foreground rounded-xl shadow-lg p-2 flex items-center justify-between border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearSelection}>
            <X className="h-5 w-5" />
          </Button>
          <span className="font-semibold">{selectedCount} selected</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onComplete} title="Mark as Complete">
            <CheckCircle2 className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                Priority <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onChangePriority('low')}>Low</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onChangePriority('medium')}>Medium</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onChangePriority('high')}>High</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onChangePriority('urgent')}>Urgent</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onArchive} title="Archive">
            <Archive className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Delete">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionBar;