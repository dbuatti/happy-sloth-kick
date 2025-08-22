"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { TaskSection } from '@/types/task'; // Corrected import
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks'; // Import useTasks to get section management functions
import { showError, showSuccess } from '@/utils/toast';

interface ManageSectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageSectionsDialog: React.FC<ManageSectionsDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { sections, createSection, updateSection, deleteSection, updateSectionIncludeInFocusMode } = useTasks({ currentDate: new Date(), userId: user?.id });

  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<TaskSection | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewSectionName('');
      setEditingSection(null);
      setEditSectionName('');
      setSectionToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  }, [isOpen]);

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      showError("Section name cannot be empty.");
      return;
    }
    if (!user?.id) {
      showError("User not authenticated.");
      return;
    }
    await createSection(newSectionName.trim());
    showSuccess("Section created!");
    setNewSectionName('');
  };

  const handleStartEdit = (section: TaskSection) => {
    setEditingSection(section);
    setEditSectionName(section.name);
  };

  const handleSaveEdit = async () => {
    if (!editingSection || !editSectionName.trim()) {
      showError("Section name cannot be empty.");
      return;
    }
    if (!user?.id) {
      showError("User not authenticated.");
      return;
    }
    await updateSection(editingSection.id, editSectionName.trim());
    showSuccess("Section updated!");
    setEditingSection(null);
    setEditSectionName('');
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditSectionName('');
  };

  const handleConfirmDelete = (section: TaskSection) => {
    setSectionToDelete(section);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSection = async () => {
    if (sectionToDelete && user?.id) {
      await deleteSection(sectionToDelete.id);
      showSuccess("Section deleted!");
      setSectionToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleToggleFocusMode = async (section: TaskSection) => {
    if (!user?.id) {
      showError("User not authenticated.");
      return;
    }
    await updateSectionIncludeInFocusMode(section.id, !section.include_in_focus_mode);
    showSuccess(`Section "${section.name}" ${section.include_in_focus_mode ? 'excluded from' : 'included in'} Focus Mode.`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Sections</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your task sections.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="New section name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreateSection} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between p-2 border rounded-md">
                {editingSection?.id === section.id ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <Input
                      value={editSectionName}
                      onChange={(e) => setEditSectionName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSaveEdit} size="sm">Save</Button>
                    <Button onClick={handleCancelEdit} variant="ghost" size="sm">Cancel</Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium">{section.name}</span>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleFocusMode(section)}>
                        {section.include_in_focus_mode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleStartEdit(section)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(section)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section "{sectionToDelete?.name}" and any tasks associated with it will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ManageSectionsDialog;