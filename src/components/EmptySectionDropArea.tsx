import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ListTodo } from 'lucide-react';

interface EmptySectionDropAreaProps {
  sectionId: string;
}

const EmptySectionDropArea: React.FC<EmptySectionDropAreaProps> = ({ sectionId }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `empty-section-drop-area-${sectionId}`,
    data: { type: 'empty-section-drop-area', sectionId: sectionId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "text-center text-gray-500 py-4 flex flex-col items-center gap-2 border-2 border-dashed rounded-md",
        isOver ? "border-blue-500 bg-blue-50/20 dark:bg-blue-900/20" : "border-transparent"
      )}
    >
      <ListTodo className="h-8 w-8 text-muted-foreground" />
      <p className="text-lg font-medium">No tasks in this section.</p>
      <p className="text-sm">Drag a task here!</p>
    </div>
  );
};

export default EmptySectionDropArea;