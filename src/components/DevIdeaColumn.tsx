import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { DevIdea } from '@/hooks/useDevIdeas';
import SortableDevIdeaCard from './SortableDevIdeaCard';
import { cn } from '@/lib/utils';

interface DevIdeaColumnProps {
  id: string;
  title: string;
  ideas: DevIdea[];
  onEdit: (idea: DevIdea) => void;
}

const DevIdeaColumn: React.FC<DevIdeaColumnProps> = ({ id, title, ideas, onEdit }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 p-4 bg-muted/50 rounded-xl min-h-[200px] transition-colors",
        isOver ? "bg-muted" : ""
      )}
    >
      <h3 className="text-lg font-semibold mb-4 text-center">{title} ({ideas.length})</h3>
      <SortableContext items={ideas.map(idea => idea.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {ideas.map(idea => (
            <SortableDevIdeaCard key={idea.id} idea={idea} onEdit={onEdit} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export default DevIdeaColumn;