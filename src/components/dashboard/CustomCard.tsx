import { StickyNote, Trash2, Link as LinkIcon } from 'lucide-react'; // Added LinkIcon
import { useState, useEffect } from 'react'; // Import useState
import { useDashboardData, CustomCard as CustomCardType } from '@/hooks/useDashboardData';
import EditableCard from './EditableCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip imports
import { Button } from '@/components/ui/button'; // Added Button import

interface CustomCardProps {
  card: CustomCardType;
  isOverlay?: boolean; // New prop for drag overlay
}

const CustomCard: React.FC<CustomCardProps> = ({ card, isOverlay = false }) => {
  const { updateCustomCard, deleteCustomCard } = useDashboardData();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setContent(card.content || '');
    setEmoji(card.emoji || '');
  }, [card]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateCustomCard({ id: card.id, updates: {
      title,
      content,
      emoji,
    }});
    setIsSaving(false);
  };

  const handleDelete = async () => {
    await deleteCustomCard(card.id);
  };

  const renderEditForm = () => (
    <div className="space-y-2">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>Emoji (Optional)</Label>
        <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
      </div>
      <div>
        <Label>Content</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
    </div>
  );

  const renderContentWithLinks = (text: string | null) => {
    if (!text) return 'No content yet.';
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part && part.match(urlRegex)) {
        let displayUrl = part;
        try {
            const urlObj = new URL(part);
            displayUrl = urlObj.hostname;
            if (displayUrl.startsWith('www.')) {
                displayUrl = displayUrl.substring(4);
            }
            if (displayUrl.length > 30) {
                displayUrl = displayUrl.substring(0, 27) + '...';
            }
        } catch (e) {
            // Keep original part if URL parsing fails
        }

        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <a
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{displayUrl}</span>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p className="break-all">{part}</p>
            </TooltipContent>
          </Tooltip>
        );
      }
      return part;
    });
  };

  return (
    <div className={cn("relative group", isOverlay && "shadow-xl ring-2 ring-primary bg-card rounded-xl")}>
      <EditableCard title={card.title} icon={StickyNote} onSave={handleSave} renderEditForm={renderEditForm} isSaving={isSaving}>
        <div className="flex items-start gap-4">
          {card.emoji && <span className="text-2xl">{card.emoji}</span>}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1 break-words">
            {renderContentWithLinks(card.content)}
          </p>
        </div >
      </EditableCard>
      {!isOverlay && (
        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default CustomCard;