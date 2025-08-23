import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { TaskSection, NewTaskSectionData, UpdateTaskSectionData } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

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
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editedSectionName, setEditedSectionName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNewSectionName('');
      setEditingSectionId(null);
      setEditedSectionName('');
    }
  }, [isOpen]);

  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      toast.error('Section name cannot be empty.');
      return;
    }
    try {
      await createSection({ name: newSectionName, order: sections.length });
      toast.success('Section added!');
      setNewSectionName('');
    } catch (error) {
      toast.error('Failed to add section.');
      console.error('Error adding section:', error);
    }
  };

  const handleUpdateSection = async () => {
    if (!editingSectionId || !editedSectionName.trim()) {
      toast.error('Section name cannot be empty.');
      return;
    }
    try {
      await updateSection({ id: editingSectionId, updates: { name: editedSectionName } });
      toast.success('Section updated!');
      setEditingSectionId(null);
      setEditedSectionName('');
    } catch (error) {
      toast.error('Failed to update section.');
      console.error('Error updating section:', error);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this section? All tasks in this section will become unassigned.')) {
      try {
        await deleteSection(id);
        toast.success('Section deleted!');
      } catch (error) {
        toast.error('Failed to delete section.');
        console.error('Error deleting section:', error);
      }
    }
  };

  const handleToggleFocusMode = async (sectionId: string, include: boolean) => {
    try {
      await updateSectionIncludeInFocusMode(sectionId, include);
      toast.success(`Section ${include ? 'added to' : 'removed from'} focus mode!`);
    } catch (error) {
      toast.error('Failed to update focus mode setting.');
      console.error('Error toggling focus mode setting:', error);
    }
  };

  const startEditing = (section: TaskSection) => {
    setEditingSectionId(section.id);
    setEditedSectionName(section.name);
  };

  const cancelEditing = () => {
    setEditingSectionId(null);
    setEditedSectionName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
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
            <Button onClick={handleAddSection} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center space-x-2 p-2 border rounded-md">
                {editingSectionId === section.id ? (
                  <>
                    <Input
                      value={editedSectionName}
                      onChange={(e) => setEditedSectionName(e.target.value)}
                      className="flex-grow"
                    />
                    <Button onClick={handleUpdateSection} size="sm">
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={cancelEditing} size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-grow">{section.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleFocusMode(section.id, !(section.include_in_focus_mode ?? true))}>
                      {section.include_in_focus_mode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" onClick={() => startEditing(section)} size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDeleteSection(section.id)} size="sm" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageSectionsDialog;