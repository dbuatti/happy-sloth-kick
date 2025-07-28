import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface EndOfListDropAreaProps {
  sectionId: string | null; // null for "No Section"
}

const EndOfListDropArea: React.FC<EndOfListDropAreaProps> = ({ sectionId }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `end-of-list-drop-area-${sectionId || 'no-section'}`,
    data: { type: 'end-of-list-drop-area', sectionId: sectionId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-10 border-2 border-dashed rounded-md flex items-center justify-center text-sm text-muted-foreground",
        isOver ? "border-blue-500 bg-blue-50/20 dark:bg-blue-900/20" : "border-transparent",
        "transition-colors duration-200"
      )}
    >
      {isOver ? "Drop here" : "Drag task here to add to end"}
    </div>
  );
};

export default EndOfListDropArea;