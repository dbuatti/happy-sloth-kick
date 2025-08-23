import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Clipboard, Image as ImageIcon, ClipboardCopy, ChevronDown, ChevronUp } from 'lucide-react';
import { DevIdea } from '@/types'; // Import from centralized types
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface DevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
  onDelete: (id: string) => void;
}

const DevIdeaCard: React.FC<DevIdeaCardProps> = ({ idea, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <Card className="relative bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span className="flex-1">{idea.title}</span>
          <div className="flex items-center space-x-1">
            <Badge
              className={cn(
                "text-white",
                idea.status === 'idea' && 'bg-blue-500',
                idea.status === 'in-progress' && 'bg-yellow-500',
                idea.status === 'completed' && 'bg-green-500'
              )}
            >
              {idea.status.replace('-', ' ')}
            </Badge>
            <Badge
              className={cn(
                "text-white",
                idea.priority === 'urgent' && 'bg-red-500',
                idea.priority === 'high' && 'bg-orange-500',
                idea.priority === 'medium' && 'bg-gray-500',
                idea.priority === 'low' && 'bg-blue-300'
              )}
            >
              {idea.priority}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-600">
        {idea.description && (
          <p className={cn("mb-2", !isExpanded && "line-clamp-2")}>
            {idea.description}
          </p>
        )}
        {idea.image_url && (
          <div className="mb-2">
            <img src={idea.image_url} alt="Idea visual" className="max-w-full h-auto rounded-md" />
          </div>
        )}
        {idea.local_file_path && (
          <p className="text-xs text-gray-500 mb-2">
            File: <span className="font-mono">{idea.local_file_path}</span>
          </p>
        )}
        {isExpanded && (
          <div className="mt-2 flex flex-wrap gap-1">
            {idea.tags.map(tag => (
              <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-2">
        <div className="flex space-x-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(idea)}>
            <Edit className="h-4 w-4" />
          </Button>
          {idea.description && (
            <Button variant="ghost" size="sm" onClick={() => handleCopy(idea.description!)}>
              <ClipboardCopy className="h-4 w-4" />
            </Button>
          )}
          {idea.image_url && (
            <Button variant="ghost" size="sm" onClick={() => window.open(idea.image_url!, '_blank')}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onDelete(idea.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DevIdeaCard;