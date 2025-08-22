import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Plus } from 'lucide-react'; // Removed unused Eye, EyeOff
import { TaskSection } from '@/types/task';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ManageSectionsDialogProps } from '@/types/props';

const ManageSectionsDialog: React.FC<ManageSectionsDialogProps> = ({
  isOpen,
  onClose,
  sections,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [editSectionName, setEditSectionName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setEditingSection(null);
      setNewSectionName('');
    }
  }, [isOpen]);

  const handleCreateSection = async () => {
    if (newSectionName.trim()) {
      await createSection(newSectionName.trim());
      setNewSectionName('');
    }
  };

  const handleEditSection = (section: TaskSection) => {
    setEditingSection(section);
    setEditSectionName(section.name);
  };

  const handleSaveEdit = async () => {
    if (editingSection && editSectionName.trim()) {
      await updateSection(editingSection.id, editSectionName.trim());
      setEditingSection(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Sections</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="New section name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleCreateSection} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {sections.map((section: TaskSection) => (
              <div key={section.id} className="flex items-center justify-between p-2 border rounded-md">
                {editingSection?.id === section.id ? (
                  <div className="flex items-center flex-grow space-x-2">
                    <Input
                      value={editSectionName}
                      onChange={(e) => setEditSectionName(e.target.value)}
                      className="flex-grow"
                    />
                    <Button onClick={handleSaveEdit} size="sm">Save</Button>
                    <Button variant="ghost" onClick={() => setEditingSection(null)} size="sm">Cancel</Button>
                  </div>
                ) : (
                  <>
                    <span>{section.name}</span>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`focus-mode-switch-${section.id}`}>Focus Mode</Label>
                        <Switch
                          id={`focus-mode-switch-${section.id}`}
                          checked={section.include_in_focus_mode || false}
                          onCheckedChange={(checked: boolean) => updateSectionIncludeInFocusMode(section.id, checked)}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleEditSection(section)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteSection(section.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageSectionsDialog;