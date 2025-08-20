import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Settings, 
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import { TaskSection } from '@/hooks/useTasks';

interface SectionSelectorProps {
  sections: TaskSection[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  createSection: (sectionData: Omit<TaskSection, 'id' | 'user_id' | 'created_at'>) => Promise<TaskSection | null>;
  updateSection: (id: string, updates: Partial<TaskSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (id: string, includeInFocusMode: boolean) => Promise<void>;
}

const SectionSelector: React.FC<SectionSelectorProps> = ({
  sections,
  selectedSectionId,
  onSelectSection,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;
    
    const newSection = await createSection({
      name: newSectionName.trim(),
      order: sections.length,
      include_in_focus_mode: true,
    });
    
    if (newSection) {
      onSelectSection(newSection.id);
      setNewSectionName('');
    }
  };

  const handleUpdateSection = async (id: string, name: string) => {
    if (!name.trim()) return;
    await updateSection(id, { name: name.trim() });
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  const handleDeleteSection = async (id: string) => {
    await deleteSection(id);
    if (selectedSectionId === id) {
      onSelectSection(null);
    }
  };

  const handleToggleFocusMode = async (id: string, includeInFocusMode: boolean) => {
    await updateSectionIncludeInFocusMode(id, includeInFocusMode);
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={selectedSectionId || ''} onValueChange={(value) => onSelectSection(value || null)}>
          <SelectTrigger>
            <SelectValue placeholder="Select section">
              {selectedSection ? selectedSection.name : 'No section'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No section</SelectItem>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsManageSectionsOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isManageSectionsOpen} onOpenChange={setIsManageSectionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Sections</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section name"
              />
              <Button onClick={handleCreateSection} disabled={!newSectionName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center gap-2 p-2 bg-muted rounded-md"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  {editingSectionId === section.id ? (
                    <div className="flex-grow flex gap-2">
                      <Input
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateSection(section.id, editingSectionName);
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateSection(section.id, editingSectionName)}
                        disabled={!editingSectionName.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSectionId(null);
                          setEditingSectionName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-grow truncate">{section.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setEditingSectionName(section.name);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFocusMode(section.id, !section.include_in_focus_mode)}
                      >
                        {section.include_in_focus_mode ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSection(section.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsManageSectionsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { SectionSelector };