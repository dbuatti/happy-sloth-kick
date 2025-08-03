import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit } from 'lucide-react';
import { DevIdea } from '@/hooks/useDevIdeas';
import { cn } from '@/lib/utils';

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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop the click from bubbling up to the parent div
    onEdit(idea);
  };

  return (
    <Card 
      className={cn("w-full shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4", getPriorityColor(idea.priority))}
    >
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <CardTitle className="text-lg font-semibold">{idea.title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick}>
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