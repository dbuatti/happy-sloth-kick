import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { Section } from '@/hooks/useTasks'; // Changed from TaskSection to Section
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ManageSectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  createSection: (name: string) => Promise<Section | null>;
  updateSection: (sectionId: string, updates: Partial<Omit<Section, 'id' | 'user_id'>>) => Promise<boolean>; // Updated type
  deleteSection: (sectionId: string) => Promise<boolean>; // Updated type
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<boolean>; // Updated type
}

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
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewSectionName('');
      setEditingSection(null);
      setEditingName('');
      setIsConfirmDeleteOpen(false);
      setSectionToDelete(null);
    }
  }, [isOpen]);

  const handleCreateSection = async () => {
    if (newSectionName.trim()) {
      await createSection(newSectionName.trim());
      setNewSectionName('');
    }
  };

  const handleStartEdit = (section: Section) => {
    setEditingSection(section);
    setEditingName(section.name);
  };

  const handleSaveEdit = async () => {
    if (editingSection && editingName.trim()) {
      await updateSection(editingSection.id, { name: editingName.trim() });
      setEditingSection(null);
      setEditingName('');
    }
  };

  const handleConfirmDelete = (sectionId: string) => {
    setSectionToDelete(sectionId);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteSection = async () => {
    if (sectionToDelete) {
      await deleteSection(sectionToDelete);
      setIsConfirmDeleteOpen(false);
      setSectionToDelete(null);
    }
  };

  const handleToggleFocusMode = async (sectionId: string, checked: boolean) => {
    await updateSectionIncludeInFocusMode(sectionId, checked);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Sections</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <h4 className="font-semibold">Add New Section</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="New section name"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateSection()}
                />
                <Button onClick={handleCreateSection} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <hr className="my-4" />

            <div className="space-y-2">
              <h4 className="font-semibold">Existing Sections</h4>
              {sections.length === 0 ? (
                <p className="text-muted-foreground text-sm">No sections yet.</p>
              ) : (
                <ul className="space-y-2">
                  {sections.map(section => (
                    <li key={section.id} className="flex items-center gap-2">
                      {editingSection?.id === section.id ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            className="flex-grow"
                          />
                          <Button onClick={handleSaveEdit} size="sm">Save</Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingSection(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-grow">{section.name}</span>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`focus-mode-switch-${section.id}`} className="text-xs text-muted-foreground">Focus Mode</Label>
                            <Switch
                              id={`focus-mode-switch-${section.id}`}
                              checked={section.include_in_focus_mode}
                              onCheckedChange={(checked) => handleToggleFocusMode(section.id, checked)}
                              className="data-[state=checked]:bg-green-500"
                            >
                              {section.include_in_focus_mode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Switch>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleStartEdit(section)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(section.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section and move all associated tasks to "No Section".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ManageSectionsDialog;