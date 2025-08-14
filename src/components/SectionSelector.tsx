import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ManageSectionsDialog from './ManageSectionsDialog';
import { Section } from '@/hooks/useTasks'; // Changed from TaskSection to Section

interface SectionSelectorProps {
  sections: Section[];
  value: string | undefined | null; // Allow null for no section
  onChange: (sectionId: string | null) => void; // Changed to string | null
  disabled?: boolean;
  createSection: (name: string) => Promise<Section | null>; // Updated return type
  updateSection: (sectionId: string, updates: Partial<Omit<Section, 'id' | 'user_id'>>) => Promise<boolean>; // Updated type
  deleteSection: (sectionId: string) => Promise<boolean>; // Updated type
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<boolean>; // Updated type
}

const SectionSelector: React.FC<SectionSelectorProps> = ({
  sections,
  value,
  onChange,
  disabled,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const selectedSection = sections.find(sec => sec.id === value);

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={value ?? 'no-section'} onValueChange={(val) => onChange(val === 'no-section' ? null : val)} disabled={disabled}>
          <SelectTrigger aria-label="Select section" className="flex-grow h-9 text-base">
            <SelectValue placeholder="Select section">
              {selectedSection ? selectedSection.name : "No Section"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-section">No Section</SelectItem>
            {sections.map(section => (
              <SelectItem key={section.id} value={section.id}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => setIsManageSectionsOpen(true)} disabled={disabled}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />
    </>
  );
};

export default SectionSelector;