import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Trash2, Edit } from 'lucide-react';
import { DevIdea, DevIdeaTag } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface DevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdateStatus: (id: string, status: DevIdea['status']) => Promise<void>;
  onUpdatePriority: (id: string, priority: DevIdea['priority']) => Promise<void>;
}

const DevIdeaCard: React.FC<DevIdeaCardProps> = ({ idea, onEdit, onDelete, onUpdateStatus, onUpdatePriority }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(idea.description || idea.title);
    toast.success('Copied to clipboard!');
  };

  return (
    <Card className="relative flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{idea.title}</CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(idea)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => onDelete(idea.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {idea.image_url && (
          <img src={idea.image_url} alt={idea.title} className="w-full h-32 object-cover rounded-md mb-3" />
        )}
        {idea.local_file_path && (
          <p className="text-sm text-muted-foreground mb-3">Local Path: {idea.local_file_path}</p>
        )}
        {idea.description && (
          <p className={cn("text-sm text-muted-foreground mb-3", !isExpanded && "line-clamp-3")}>
            {idea.description}
          </p>
        )}
        {idea.description && idea.description.length > 100 && ( // Simple check for expand/collapse
          <Button variant="link" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="self-start p-0 h-auto">
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" /> Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" /> Show More
              </>
            )}
          </Button>
        )}

        <div className="flex flex-wrap gap-1 mt-auto pt-2">
          <Badge variant="secondary">{idea.status}</Badge>
          <Badge variant="outline">{idea.priority}</Badge>
          {idea.tags.map((tag: DevIdeaTag) => (
            <Badge key={tag.id} style={{ backgroundColor: tag.color, color: 'white' }}>
              {tag.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DevIdeaCard;