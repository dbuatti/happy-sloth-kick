import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, ClipboardCopy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { DevIdea, DevIdeaTag } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

interface DevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: DevIdea['status']) => void;
  onUpdatePriority: (id: string, priority: DevIdea['priority']) => void;
}

const DevIdeaCard: React.FC<DevIdeaCardProps> = ({ idea, onEdit, onDelete, onUpdateStatus, onUpdatePriority }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{idea.title}</CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(idea)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(idea.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {idea.image_url && (
          <img src={idea.image_url} alt={idea.title} className="w-full h-48 object-cover rounded-md mb-4" />
        )}
        <p className="text-sm text-muted-foreground mb-2">{idea.description}</p>
        {isExpanded && (
          <div className="space-y-2 mt-4">
            {idea.local_file_path && (
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="font-medium mr-1">Local Path:</span>
                <span className="truncate">{idea.local_file_path}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => handleCopy(idea.local_file_path!)}>
                  <ClipboardCopy className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="font-medium mr-1">Status:</span>
              <Badge
                className={cn(
                  idea.status === 'idea' && 'bg-blue-100 text-blue-800',
                  idea.status === 'in-progress' && 'bg-yellow-100 text-yellow-800',
                  idea.status === 'completed' && 'bg-green-100 text-green-800',
                  idea.status === 'archived' && 'bg-gray-100 text-gray-800',
                )}
              >
                {idea.status}
              </Badge>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="font-medium mr-1">Priority:</span>
              <Badge
                className={cn(
                  idea.priority === 'low' && 'bg-green-100 text-green-800',
                  idea.priority === 'medium' && 'bg-yellow-100 text-yellow-800',
                  idea.priority === 'high' && 'bg-red-100 text-red-800',
                )}
              >
                {idea.priority}
              </Badge>
            </div>
            {idea.tags && idea.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {idea.tags.map(tag => (
                  <Badge key={tag.id} style={{ backgroundColor: tag.color, color: 'white' }}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DevIdeaCard;