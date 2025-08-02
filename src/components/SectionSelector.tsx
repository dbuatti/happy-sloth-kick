import { Label } from "@/components/ui/label";
import { FolderOpen, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ManageSectionsDialog from './ManageSectionsDialog'; // Import the new dialog

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
  include_in_focus_mode: boolean; // Added for consistency
}

interface SectionSelectorProps {
  value: string | null;
  onChange: (sectionId: string | null) => void;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
}

const SectionSelector: React.FC<SectionSelectorProps> = ({
  value,
  onChange,
  sections,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  // Removed userId as it's not directly used in this component's logic
  // const { user } = useAuth(); 
  // const userId = user?.id || null; 

  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const selectedSection = sections.find(sec => sec.id === value);

  return (
    <div className="space-y-2">
      <Label>Section</Label>
      <div className="flex space-x-2">
        <Select value={value || "no-section-option"} onValueChange={(val) => onChange(val === "no-section-option" ? null : val)}>
          <SelectTrigger className="flex-1 h-9">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            <SelectItem value="no-section-option">No Section</SelectItem>
            {sections.length > 0 && (
              sections.map(section => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={() => setIsManageSectionsOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {selectedSection && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" />
          <span>{selectedSection.name}</span>
        </div>
      )}

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