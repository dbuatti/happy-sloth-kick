import React, { useState, useCallback } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { X, Tag } from 'lucide-react';
import { DevIdeaTag } from '@/hooks/useDevIdeas';
import { getRandomTagColor } from '@/lib/tagColors';

interface TagInputProps {
  allTags: DevIdeaTag[];
  selectedTags: DevIdeaTag[];
  setSelectedTags: React.Dispatch<React.SetStateAction<DevIdeaTag[]>>;
  onAddTag: (name: string, color: string) => Promise<DevIdeaTag | null>;
}

const TagInput: React.FC<TagInputProps> = ({ allTags, selectedTags, setSelectedTags, onAddTag }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleSelectTag = (tag: DevIdeaTag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setInputValue('');
    setOpen(false);
  };

  const handleCreateTag = async () => {
    const newTagName = inputValue.trim();
    if (newTagName && !allTags.some(t => t.name.toLowerCase() === newTagName.toLowerCase())) {
      const newTag = await onAddTag(newTagName, getRandomTagColor());
      if (newTag) {
        handleSelectTag(newTag);
      }
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    }
  };

  const filteredTags = allTags.filter(tag => 
    !selectedTags.some(selected => selected.id === tag.id) &&
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="border rounded-md p-2 min-h-[40px]">
        <div className="flex flex-wrap gap-1 mb-1">
          {selectedTags.map(tag => (
            <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
              {tag.name}
              <button
                type="button"
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleRemoveTag(tag.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <PopoverTrigger asChild>
          <input
            placeholder="Add a tag..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search or create tag..." className="h-9" />
          <CommandList>
            <CommandEmpty>
              {inputValue.trim() ? `No tag found. Press Enter to create "${inputValue.trim()}".` : 'No tags found.'}
            </CommandEmpty>
            <CommandGroup>
              {filteredTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => handleSelectTag(tag)}
                >
                  <Tag className="mr-2 h-4 w-4" style={{ color: tag.color }} />
                  {tag.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TagInput;