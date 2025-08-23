import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Tag, Plus } from 'lucide-react';
import { DevIdeaTag, NewDevIdeaTagData } from '@/types'; // Corrected import
import { getRandomTagColor } from '@/lib/tagColors';
import { toast } from 'react-hot-toast';

interface TagInputProps {
  selectedTags: DevIdeaTag[];
  allTags: DevIdeaTag[];
  onAddTag: (tagName: string, color: string) => Promise<DevIdeaTag | undefined>;
  onRemoveTag: (tagId: string) => void;
  onSelectExistingTag: (tag: DevIdeaTag) => void;
}

const TagInput: React.FC<TagInputProps> = ({
  selectedTags,
  allTags,
  onAddTag,
  onRemoveTag,
  onSelectExistingTag,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const availableTags = allTags.filter(
    (tag) => !selectedTags.some((selected) => selected.id === tag.id)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleAddTag = useCallback(async () => {
    if (inputValue.trim() === '') return;

    const existingTag = allTags.find(
      (tag) => tag.name.toLowerCase() === inputValue.trim().toLowerCase()
    );

    if (existingTag) {
      onSelectExistingTag(existingTag);
    } else {
      const newColor = getRandomTagColor();
      try {
        await onAddTag(inputValue.trim(), newColor);
        toast.success(`Tag "${inputValue.trim()}" added!`);
      } catch (error) {
        toast.error(`Failed to add tag: ${(error as Error).message}`);
      }
    }
    setInputValue('');
    setShowSuggestions(false);
  }, [inputValue, allTags, onAddTag, onSelectExistingTag]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white flex items-center">
            {tag.name}
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 h-4 w-4 p-0 text-white hover:bg-white/20"
              onClick={() => onRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
      <div className="flex space-x-2">
        <Input
          placeholder="Add new tag or select existing..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // Delay to allow click on suggestions
        />
        <Button onClick={handleAddTag}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showSuggestions && availableTags.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 dark:bg-gray-800 dark:border-gray-700">
          {availableTags.map((tag) => (
            <div
              key={tag.id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              onMouseDown={() => onSelectExistingTag(tag)} // Use onMouseDown to prevent blur from closing before click
            >
              <Badge style={{ backgroundColor: tag.color }} className="text-white mr-2">
                {tag.name}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;