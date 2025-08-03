import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit } from 'lucide-react';
import { DevIdea } from '@/hooks/useDevIdeas';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface DevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
}

const DevIdeaCard: React.FC<DevIdeaCardProps> = ({ idea, onEdit }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger if the edit button was clicked
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    const textToCopy = `${idea.title}${idea.description ? `\n\n${idea.description}` : ''}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      showSuccess('Idea copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      showError('Could not copy idea to clipboard.');
    });

    // Also keep the selection behavior
    const cardElement = event.currentTarget;
    if (cardElement && window.getSelection) {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(cardElement);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  return (
    <Card 
      className={cn("w-full shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4", getPriorityColor(idea.priority))}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <CardTitle className="text-lg font-semibold">{idea.title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(idea)}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {idea.description && (
          <p className="text-sm text-muted-foreground">{idea.description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default DevIdeaCard;