import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { TaskSection, NewTaskSectionData, UpdateTaskSectionData } from '@/types'; // Corrected import
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'react-hot-toast';

interface ManageSectionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sections: TaskSection[];
  onCreateSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  onUpdateSection: (id: string, updates: UpdateTaskSectionData) => Promise<TaskSection>;
  onDeleteSection: (id: string) => Promise<void>;
  onUpdateSectionIncludeInFocusMode: (id: string, include: boolean) => Promise<void>;
}

const ManageSectionsDialog: React.FC<ManageSectionsDialogProps> = ({
  isOpen,
  onOpenChange,
  sections,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onUpdateSectionIncludeInFocusMode,
}) => {
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newSectionName.trim()) {
      toast.error('Section name cannot be empty.');
      return;
    }
    try {
      await onCreateSection({ name: newSectionName.trim(), order: sections.length, include_in_focus_mode: true });
      toast.success('Section created!');
      setNewSectionName('');
    } catch (err) {
      toast.error(`Failed to create section: ${(err as Error).message}`);
      console.error('Error creating section:', err);
    }
  };

  const handleEdit = (section: TaskSection) => {
    setEditingSection(section);
    setEditSectionName(section.name);
  };

  const handleUpdate = async () => {
    if (!editingSection || !editSectionName.trim()) {
      toast.error('Section name cannot be empty.');
      return;
    }
    try {
      await onUpdateSection(editingSection.id, { name: editSectionName.trim() });
      toast.success('Section updated!');
      setEditingSection(null);
    } catch (err) {
      toast.error(`Failed to update section: ${(err as Error).message}`);
      console.error('Error updating section:', err);
    }
  };

  const confirmDelete = (id: string) => {
    setSectionToDelete(id);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!sectionToDelete) return;
    try {
      await onDeleteSection(sectionToDelete);
      toast.success('Section deleted!');
      setSectionToDelete(null);
      setIsConfirmDeleteDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to delete section: ${(err as Error).message}`);
      console.error('Error deleting section:', err);
    }
  };

  const handleToggleFocusMode = async (section: TaskSection) => {
    try {
      await onUpdateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode);
      toast.success(`Section "${section.name}" ${section.include_in_focus_mode ? 'excluded from' : 'included in'} Focus Mode.`);
    } catch (err) {
      toast.error(`Failed to update Focus Mode setting: ${(err as Error).message}`);
      console.error('Error updating focus mode setting:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
            <Button onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-2">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center space-x-2">
                {editingSection?.id === section.id ? (
                  <>
                    <Input
                      value={editSectionName}
                      onChange={(e) => setEditSectionName(e.target.value)}
                      className="flex-grow"
                    />
                    <Button onClick={handleUpdate} size="sm">Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}><X className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <div className="flex-grow p-2 rounded-md border">
                      {section.name}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleFocusMode(section)}>
                      {section.include_in_focus_mode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(section)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => confirmDelete(section.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section and all tasks within it will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ManageSectionsDialog;