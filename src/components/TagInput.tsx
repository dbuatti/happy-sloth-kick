import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { DevIdeaTag, NewDevIdeaTagData } from '@/types';
import { getRandomTagColor } from '@/lib/tagColors';
import { toast } from 'react-hot-toast';

interface TagInputProps {
  selectedTags: DevIdeaTag[];
  allTags: DevIdeaTag[];
  onAddTag: (name: string, color: string) => Promise<DevIdeaTag>;
  onRemoveTag: (tagId: string) => void;
  onSelectExistingTag: (tagId: string) => void;
}

const TagInput: React.FC<TagInputProps> = ({ selectedTags, allTags, onAddTag, onRemoveTag, onSelectExistingTag }) => {
  const [inputValue, setInputValue] = useState('');
  const [inputColor, setInputColor] = useState(getRandomTagColor());

  const handleAddTag = async () => {
    if (inputValue.trim() === '') {
      toast.error('Tag name cannot be empty.');
      return;
    }
    if (allTags.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase())) {
      toast.error('Tag with this name already exists.');
      return;
    }
    try {
      await onAddTag(inputValue, inputColor);
      setInputValue('');
      setInputColor(getRandomTagColor());
    } catch (error) {
      toast.error('Failed to add tag.');
      console.error('Error adding tag:', error);
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
      <div className="flex space-x-2">
        <Input
          placeholder="Add new tag or select existing"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow"
        />
        <Input
          type="color"
          value={inputColor}
          onChange={(e) => setInputColor(e.target.value)}
          className="w-12 h-9 p-0"
        />
        <Button onClick={handleAddTag} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2 border p-2 rounded-md">
          {availableTags.map(tag => (
            <Badge
              key={tag.id}
              variant="outline"
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