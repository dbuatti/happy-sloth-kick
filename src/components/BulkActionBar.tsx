import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Archive, Trash2, ChevronDown, X } from 'lucide-react';
import { Task } from '@/types'; // Corrected import
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface BulkActionBarProps {
  selectedTasks: string[];
  onClearSelection: () => void;
  onMarkCompleted: (taskIds: string[]) => void;
  onArchive: (taskIds: string[]) => void;
  onDelete: (taskIds: string[]) => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedTasks,
  onClearSelection,
  onMarkCompleted,
  onArchive,
  onDelete,
}) => {
  if (selectedTasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground p-3 rounded-lg shadow-lg flex items-center space-x-4 z-50">
      <span className="text-sm font-medium">{selectedTasks.length} tasks selected</span>
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        <X className="h-4 w-4 mr-2" /> Clear
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Actions <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onMarkCompleted(selectedTasks)}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onArchive(selectedTasks)}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(selectedTasks)} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default BulkActionBar;