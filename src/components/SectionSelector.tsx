import { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { FolderOpen } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client"; // Keep for fetching initial sections if needed, but will be passed as prop
import { showError } from "@/utils/toast"; // Keep for error handling if fetching internally
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

interface SectionSelectorProps {
  value: string | null;
  onChange: (sectionId: string | null) => void;
  userId: string | null;
  sections: TaskSection[]; // Pass sections as a prop
}

const SectionSelector: React.FC<SectionSelectorProps> = ({ value, onChange, userId, sections }) => {
  // No longer managing sections state internally, relying on prop
  // const [sections, setSections] = useState<TaskSection[]>([]); 

  // Removed useEffect for fetching sections, as they are passed as a prop
  // useEffect(() => {
  //   if (userId) {
  //     fetchSections();
  //   }
  // }, [userId]);

  useEffect(() => {
    // If no section is selected and sections exist, default to the first one
    // Removed this auto-selection to allow explicit 'No Section'
    // if (!value && sections.length > 0) {
    //   onChange(sections[0].id);
    // }
  }, [value, sections, onChange]);

  // Removed fetchSections, createSection, deleteSection functions

  const selectedSection = sections.find(sec => sec.id === value);

  return (
    <div className="space-y-2">
      <Label>Section</Label>
      <div className="flex space-x-2">
        <Select value={value || "no-section-option"} onValueChange={(val) => onChange(val === "no-section-option" ? null : val)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            <SelectItem value="no-section-option">No Section</SelectItem> {/* Explicit 'No Section' option */}
            {sections.length > 0 && (
              sections.map(section => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {/* Removed Dialog for managing sections */}
      </div>
      
      {selectedSection && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <FolderOpen className="h-3 w-3" />
          <span>{selectedSection.name}</span>
        </div>
      )}
    </div>
  );
};

export default SectionSelector;