import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, ClipboardCopy } from 'lucide-react';
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

  // Helper function to convert a blob to a data URL
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.onabort = () => reject(new Error("Read aborted"));
      reader.readAsDataURL(blob);
    });
  };

  const handleCardClick = async () => {
    if (idea.image_url) {
      try {
        const textToCopy = `${idea.title}${idea.description ? `\n\n${idea.description}` : ''}`;
        const textBlob = new Blob([textToCopy], { type: 'text/plain' });
        const response = await fetch(idea.image_url);
        const imageBlob = await response.blob();
        const dataUrl = await blobToDataURL(imageBlob);
        const htmlToCopy = `
          <div>
            <img src="${dataUrl}" alt="${idea.title}" style="max-width: 100%; height: auto;" />
            <p><strong>${idea.title}</strong></p>
            ${idea.description ? `<p>${idea.description.replace(/\n/g, '<br>')}</p>` : ''}
          </div>
        `;
        const htmlBlob = new Blob([htmlToCopy], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob });
        await navigator.clipboard.write([clipboardItem]);
        showSuccess('Idea (with image) copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy rich text: ', err);
        try {
          const textToCopy = `${idea.title}${idea.description ? `\n\n${idea.description}` : ''}`;
          await navigator.clipboard.writeText(textToCopy);
          showSuccess('Image copy failed, but text was copied!');
        } catch (textErr) {
          console.error('Failed to copy text as fallback: ', textErr);
          showError('Could not copy idea to clipboard.');
        }
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

  const handleCopyImageClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card's click handler from firing
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

  return (
    <Card 
      className={cn("group w-full shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 cursor-pointer", getPriorityColor(idea.priority))}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <CardTitle className="text-lg font-semibold">{idea.title}</CardTitle>
        <div className="flex items-center">
          {idea.image_url && (
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopyImageClick} title="Copy Image Only">
              <ClipboardCopy className="h-4 w-4" />
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