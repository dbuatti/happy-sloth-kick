import React from 'react';
import { CheckCircle2, Archive, Trash2, ChevronDown, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface BulkActionBarProps {
  selectedTaskIds: string[];
  onClearSelection: () => void;
  onMarkComplete: (taskIds: string[]) => void;
  onArchive: (taskIds: string[]) => void;
  onDelete: (taskIds: string[]) => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedTaskIds,
  onClearSelection,
  onMarkComplete,
  onArchive,
  onDelete,
}) => {
  if (selectedTaskIds.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-3 rounded-lg shadow-lg flex items-center space-x-4 z-50">
      <span>{selectedTaskIds.length} tasks selected</span>
      <Button variant="ghost" size="icon" onClick={onClearSelection}>
        <X className="h-5 w-5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-white hover:bg-blue-700">
            Actions <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onMarkComplete(selectedTaskIds)}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onArchive(selectedTaskIds)}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(selectedTaskIds)}>
            <Trash2 className="mr-2 h-4 w-4 text-red-500" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default BulkActionBar;