import { Label } from "@/components/ui/label";
import { FolderOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

interface SectionSelectorProps {
  value: string | null;
  onChange: (sectionId: string | null) => void;
  sections: TaskSection[]; // Pass sections as a prop
}

const SectionSelector: React.FC<SectionSelectorProps> = ({ value, onChange, sections }) => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id || null; // Get userId from useAuth

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
        {/* Removed Dialog for managing sections */}
      </div>
      
      {selectedSection && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" />
          <span>{selectedSection.name}</span>
        </div>
      )}
    </div>
  );
};

export default SectionSelector;