import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { DevIdeaTag, NewDevIdeaTagData } from '@/types';
import { getRandomTagColor } from '@/lib/tagColors';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

interface TagInputProps {
  selectedTags: DevIdeaTag[];
  allTags: DevIdeaTag[];
  onAddTag: (tagName: string, tagColor: string) => Promise<DevIdeaTag>;
  onRemoveTag: (tagId: string) => void;
  onSelectExistingTag: (tagId: string) => void;
}

const TagInput: React.FC<TagInputProps> = ({
  selectedTags,
  allTags,
  onAddTag,
  onRemoveTag,
  onSelectExistingTag,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleAddTag = async () => {
    if (inputValue.trim() && !selectedTags.some(tag => tag.name === inputValue.trim())) {
      try {
        await onAddTag(inputValue.trim(), getRandomTagColor());
        setInputValue('');
        setShowNewTagInput(false);
      } catch (error) {
        toast.error('Failed to add tag.');
        console.error(error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const availableTags = allTags.filter(tag => !selectedTags.some(selected => selected.id === tag.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map(tag => (
          <Badge key={tag.id} style={{ backgroundColor: tag.color, color: 'white' }} className="flex items-center">
            {tag.name}
            <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => onRemoveTag(tag.id)} />
          </Badge>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        {showNewTagInput ? (
          <>
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="New tag name"
              className="flex-grow"
              autoFocus
            />
            <Button onClick={handleAddTag} size="sm">Add</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowNewTagInput(false); setInputValue(''); }}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowNewTagInput(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create New Tag
          </Button>
        )}
      </div>
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color, color: 'white' }}
              className="cursor-pointer hover:opacity-80"
              onClick={() => onSelectExistingTag(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;