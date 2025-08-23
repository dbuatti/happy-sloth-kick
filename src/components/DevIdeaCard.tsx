import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Image as ImageIcon, ClipboardCopy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { DevIdea, DevIdeaTag } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface DevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
  onDelete: (id: string) => void;
}

const DevIdeaCard: React.FC<DevIdeaCardProps> = ({ idea, onEdit, onDelete }) => {
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
          <Button variant="ghost" size="sm" onClick={() => onEdit(idea)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(idea.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {idea.image_url && (
          <div className="mb-2">
            <img src={idea.image_url} alt={idea.title} className="w-full h-32 object-cover rounded-md" />
          </div>
        )}
        {idea.description && (
          <p className={cn("text-sm text-gray-500", { "line-clamp-2": !isExpanded })}>
            {idea.description}
          </p>
        )}
        {idea.description && idea.description.length > 100 && ( // Simple check for expandability
          <Button variant="link" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="px-0">
            {isExpanded ? 'Show Less' : 'Show More'}
            {isExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
          </Button>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {idea.tags.map((tag: DevIdeaTag) => (
            <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
              {tag.name}
            </Badge>
          ))}
        </div>
        <div className="mt-4 flex items-center space-x-2 text-xs text-gray-500">
          <span>Status: {idea.status}</span>
          <span>Priority: {idea.priority}</span>
          {idea.local_file_path && (
            <Button variant="ghost" size="sm" onClick={() => handleCopy(idea.local_file_path!)} className="h-auto p-1">
              <ClipboardCopy className="h-3 w-3 mr-1" /> Copy Path
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DevIdeaCard;