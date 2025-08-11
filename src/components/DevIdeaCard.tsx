import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Clipboard, Image as ImageIcon, ClipboardCopy, ChevronDown, ChevronUp } from 'lucide-react';
import { DevIdea } from '@/hooks/useDevIdeas';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface DevIdeaCardProps {
  idea: DevIdea;
  onEdit: (idea: DevIdea) => void;
}

const TRUNCATE_LENGTH = 200;

const DevIdeaCard: React.FC<DevIdeaCardProps> = ({ idea, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  const handleCopyTextClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${idea.title}${idea.description ? `\n\n${idea.description}` : ''}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Idea text copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showError('Could not copy idea text to clipboard.');
    }
  };

  const handleCopyPathClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!idea.local_file_path) return;
    try {
      await navigator.clipboard.writeText(idea.local_file_path);
      showSuccess('File path copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy path: ', err);
      showError('Could not copy file path.');
    }
  };

  const handleCopyImageClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!idea.image_url) return;

    try {
      const response = await fetch(idea.image_url);
      const imageBlob = await response.blob();
      const clipboardItem = new ClipboardItem({ [imageBlob.type]: imageBlob });
      await navigator.clipboard.write([clipboardItem]);
      showSuccess('Image copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy image: ', err);
      showError('Could not copy image.');
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(idea);
  };

  const isLongDescription = idea.description && idea.description.length > TRUNCATE_LENGTH;
  const displayedDescription = isLongDescription && !isExpanded
    ? `${idea.description!.substring(0, TRUNCATE_LENGTH)}...`
    : idea.description;

  return (
    <Card 
      className={cn("group w-full shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 cursor-grab", getPriorityColor(idea.priority))}
    >
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <div className="flex items-center gap-1">
            <CardTitle className="text-lg font-semibold">{idea.title}</CardTitle>
        </div>
        <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
          {idea.local_file_path && (
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopyPathClick} title="Copy Local File Path">
              <ClipboardCopy className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopyTextClick} title="Copy Text Only">
            <Clipboard className="h-4 w-4" />
          </Button>
          {idea.image_url && (
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopyImageClick} title="Copy Image Only">
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {idea.image_url && (
          <img src={idea.image_url} alt={idea.title} className="rounded-md mb-2 max-h-48 w-full object-cover" />
        )}
        {idea.description && (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            <p>{displayedDescription}</p>
            {isLongDescription && (
              <Button
                variant="link"
                className="p-0 h-auto text-xs mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {isExpanded ? 'Show Less' : 'Show More'}
                {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
              </Button>
            )}
          </div>
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
        <p className="text-xs text-muted-foreground mt-2">
          Updated {formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
};

export default DevIdeaCard;