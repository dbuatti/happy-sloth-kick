import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Archive, Trash2, X } from 'lucide-react';
import { BulkActionBarProps } from '@/types/props';

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedTaskIds,
  onMarkComplete,
  onArchive,
  onDelete,
  onClearSelection,
}) => {
  const selectedCount = selectedTaskIds.size;

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex items-center space-x-4 z-40">
      <span className="font-medium">{selectedCount} tasks selected</span>
      <Button variant="secondary" onClick={onMarkComplete}>
        <Check className="h-4 w-4 mr-2" /> Mark Complete
      </Button>
      <Button variant="secondary" onClick={onArchive}>
        <Archive className="h-4 w-4 mr-2" /> Archive
      </Button>
      <Button variant="destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4 mr-2" /> Delete
      </Button>
      <Button variant="ghost" onClick={onClearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default BulkActionBar;