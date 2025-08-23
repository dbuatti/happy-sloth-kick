import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { TaskSection, NewTaskSectionData, UpdateTaskSectionData } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'react-hot-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';

interface ManageSectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sections: TaskSection[];
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection>;
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
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewSectionName('');
      setEditingSection(null);
      setEditSectionName('');
      setSectionToDelete(null);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!newSectionName.trim()) {
      toast.error('Section name cannot be empty.');
      return;
    }
    try {
      await createSection({ name: newSectionName.trim(), order: sections.length, include_in_focus_mode: true });
      setNewSectionName('');
    } catch (err) {
      toast.error('Failed to create section.');
      console.error(err);
    }
  };

  const handleEditClick = (section: TaskSection) => {
    setEditingSection(section);
    setEditSectionName(section.name);
  };

  const handleUpdate = async () => {
    if (!editingSection) return;
    if (!editSectionName.trim()) {
      toast.error('Section name cannot be empty.');
      return;
    }
    try {
      await updateSection({ id: editingSection.id, updates: { name: editSectionName.trim() } });
      setEditingSection(null);
    } catch (err) {
      toast.error('Failed to update section.');
      console.error(err);
    }
  };

  const confirmDelete = (id: string) => {
    setSectionToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (sectionToDelete) {
      try {
        await deleteSection(sectionToDelete);
        toast.success('Section deleted!');
      } catch (err) {
        toast.error('Failed to delete section.');
        console.error(err);
      } finally {
        setIsDeleteDialogOpen(false);
        setSectionToDelete(null);
      }
    }
  };

  const handleToggleFocusMode = async (sectionId: string, include: boolean) => {
    try {
      await updateSectionIncludeInFocusMode(sectionId, include);
    } catch (err) {
      toast.error('Failed to update focus mode for section.');
      console.error(err);
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
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-2">
            {sections.sort((a, b) => (a.order || 0) - (b.order || 0)).map((section) => (
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
                    <div className="flex-grow p-2 rounded-md bg-gray-50 text-gray-800 flex items-center justify-between">
                      <span>{section.name}</span>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`focus-mode-switch-${section.id}`}>Focus Mode</Label>
                        <Switch
                          id={`focus-mode-switch-${section.id}`}
                          checked={section.include_in_focus_mode ?? true}
                          onCheckedChange={(checked) => handleToggleFocusMode(section.id, checked)}
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(section)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => confirmDelete(section.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section and all tasks within it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ManageSectionsDialog;