import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Settings } from 'lucide-react';
import { TaskSection, NewTaskSectionData, UpdateTaskSectionData } from '@/types';
import ManageSectionsDialog from './ManageSectionsDialog';

interface SectionSelectorProps {
  selectedSection: string | null;
  onSectionChange: (sectionId: string | null) => void;
  sections: TaskSection[];
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
}

const SectionSelector: React.FC<SectionSelectorProps> = ({
  selectedSection,
  onSectionChange,
  sections,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const handleCreateSection = async (name: string) => {
    return await createSection({ name, order: sections.length });
  };

  const handleUpdateSection = async (id: string, newName: string) => {
    return await updateSection({ id, updates: { name: newName } });
  };

  const handleToggleIncludeInFocusMode = async (sectionId: string, include: boolean) => {
    return await updateSectionIncludeInFocusMode(sectionId, include);
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={selectedSection || ''} onValueChange={onSectionChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a section" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">No Section</SelectItem>
          {sections.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              {section.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={() => setIsManageSectionsOpen(true)}>
        <Settings className="h-4 w-4" />
      </Button>

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={handleCreateSection}
        updateSection={handleUpdateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={handleToggleIncludeInFocusMode}
      />
    </div>
  );
};

export default SectionSelector;