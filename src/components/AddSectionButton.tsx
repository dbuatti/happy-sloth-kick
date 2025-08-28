"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, X } from 'lucide-react';

interface AddSectionButtonProps {
  onAddSection: (name: string) => void;
}

const AddSectionButton: React.FC<AddSectionButtonProps> = ({ onAddSection }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [sectionName, setSectionName] = useState('');

  const handleAddSection = () => {
    if (sectionName.trim()) {
      onAddSection(sectionName.trim());
      setSectionName('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSection();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setSectionName('');
    }
  };

  if (isAdding) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Input
          type="text"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Section name"
          className="h-8"
          autoFocus
        />
        <Button 
          onClick={handleAddSection}
          size="sm"
          className="h-8"
        >
          Add
        </Button>
        <Button 
          onClick={() => {
            setIsAdding(false);
            setSectionName('');
          }}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setIsAdding(true)}
      variant="outline"
      className="w-full justify-start text-muted-foreground hover:text-foreground"
    >
      <PlusCircle className="mr-2 h-4 w-4" />
      Add Section
    </Button>
  );
};

export default AddSectionButton;