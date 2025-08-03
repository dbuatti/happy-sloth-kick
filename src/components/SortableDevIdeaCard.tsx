import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DevIdea } from '@/hooks/useDevIdeas';
import DevIdeaCard from './DevIdeaCard';
import { showSuccess, showError } from '@/utils/toast';

interface SortableDevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
}

const SortableDevIdeaCard: React.FC<SortableDevIdeaCardProps> = ({ idea, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    const textToCopy = `${idea.title}${idea.description ? `\n\n${idea.description}` : ''}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      showSuccess('Idea copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      showError('Could not copy idea to clipboard.');
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <DevIdeaCard idea={idea} onEdit={onEdit} />
    </div>
  );
};

export default SortableDevIdeaCard;