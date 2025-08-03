import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit } from 'lucide-react';
import { DevIdea } from '@/hooks/useDevIdeas';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

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

  const handleCardClick = async () => {
    if (idea.image_url) {
      try {
        const response = await fetch(idea.image_url);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        showSuccess('Image copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy image: ', err);
        showError('Could not copy image to clipboard.');
      }
    } else {
      const textToCopy = `${idea.title}${idea.description ? `\n\n${idea.description}` : ''}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showSuccess('Idea copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        showError('Could not copy idea to clipboard.');
      });
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(idea);
  };

  return (
    <Card 
      className={cn("w-full shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 cursor-pointer", getPriorityColor(idea.priority))}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <CardTitle className="text-lg font-semibold">{idea.title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {idea.image_url && (
          <img src={idea.image_url} alt={idea.title} className="rounded-md mb-2 max-h-48 w-full object-cover" />
        )}
        {idea.description && (
          <p className="text-sm text-muted-foreground">{idea.description}</p>
        )}
        {idea.tags && idea.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {idea.tags.map(tag => (
              <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DevIdeaCard;