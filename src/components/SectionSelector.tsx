"use client";

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskSection } from '@/types/task';

interface SectionSelectorProps {
  sections: TaskSection[];
  selectedSectionId: string | null;
  onSectionChange: (sectionId: string | null) => void;
  placeholder?: string;
}

const SectionSelector: React.FC<SectionSelectorProps> = ({
  sections,
  selectedSectionId,
  onSectionChange,
  placeholder = "Select section"
}) => {
  return (
    <Select 
      value={selectedSectionId || undefined} 
      onValueChange={(value) => onSectionChange(value === "null" ? null : value)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="null">No section</SelectItem>
        {sections.map((section) => (
          <SelectItem key={section.id} value={section.id}>
            {section.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SectionSelector;