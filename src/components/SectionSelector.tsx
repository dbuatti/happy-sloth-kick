import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { TaskSection } from '@/types/task';
import ManageSectionsDialog from './ManageSectionsDialog';
import { SectionSelectorProps } from '@/types/props';

const SectionSelector: React.FC<SectionSelectorProps> = ({
  sections,
  selectedSection,
  onSelectSection,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [isManageSectionsOpen, setIsManageSectionsOpen] = React.useState(false);

  return (
    <div className="flex items-center space-x-2">
      <Select value={selectedSection || 'all'} onValueChange={(value: string) => onSelectSection(value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Section" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sections</SelectItem>
          {sections.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              {section.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" onClick={() => setIsManageSectionsOpen(true)}>
        <Settings className="h-4 w-4" />
      </Button>

      <ManageSectionsDialog
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        sections={sections}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      />
    </div>
  );
};

export default SectionSelector;