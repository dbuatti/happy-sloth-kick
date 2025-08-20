import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { TaskSection } from '@/hooks/tasks/types'; // Updated import path
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { showError } from '@/utils/toast';

interface ManageSectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
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
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [sectionToDeleteId, setSectionToDeleteId] = useState<string | null>(null);
  const [sectionToDeleteName, setSectionToDeleteName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Reset new section form when dialog opens/closes
    if (!isOpen) {
      setNewSectionName('');
      setEditingSectionId(null);
      setEditingSectionName('');
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      showError('Section name is required.');
      return;
    }
    if (sections.some(sec => sec.name.toLowerCase() === newSectionName.trim().toLowerCase())) {
      showError('Section with this name already exists.');
      return;
    }

    setIsSaving(true);
    await createSection(newSectionName.trim());
    setNewSectionName('');
    setIsSaving(false);
  };

  const handleEditClick = (section: TaskSection) => {
    setEditingSectionId(section.id);
    setEditingSectionName(section.name);
  };

  const handleSaveEdit = async () => {
    if (editingSectionId && editingSectionName.trim()) {
      if (sections.some(sec => sec.id !== editingSectionId && sec.name.toLowerCase() === editingSectionName.trim().toLowerCase())) {
        showError('Section with this name already exists.');
        return;
      }
      setIsSaving(true);
      await updateSection(editingSectionId, editingSectionName.trim());
      setEditingSectionId(null);
      setEditingSectionName('');
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (sectionId: string, sectionName: string) => {
    setSectionToDeleteId(sectionId);
    setSectionToDeleteName(sectionName);
    setShowConfirmDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!sectionToDeleteId) {
      setShowConfirmDeleteDialog(false);
      return;
    }
    setIsSaving(true);
    await deleteSection(sectionToDeleteId);
    setSectionToDeleteId(null);
    setSectionToDeleteName(null);
    setShowConfirmDeleteDialog(false);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Sections</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {/* New Section Form */}
          <div className="border-b pb-4 mb-4">
            <h4 className="text-md font-semibold mb-3">Create New Section</h4>
            <div className="flex gap-2">
              <Input
                placeholder="New section name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSection()}
                disabled={isSaving}
                className="flex-1 h-9 text-base"
              />
              <Button onClick={handleCreateSection} disabled={isSaving || !newSectionName.trim()} className="h-9 text-base">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Existing sections list */}
          {sections.length === 0 ? (
            <p className="text-muted-foreground text-center">No sections created yet.</p>
          ) : (
            <ul className="space-y-2">
              {sections.map((section: TaskSection) => (
                <li key={section.id} className="flex items-center justify-between p-2 rounded-md shadow-sm bg-background">
                  {editingSectionId === section.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                        disabled={isSaving}
                        className="h-9 text-base"
                      />
                      <Button size="sm" onClick={handleSaveEdit} disabled={isSaving || !editingSectionName.trim()} className="h-9 text-base">Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSectionId(null)} disabled={isSaving} className="h-9 text-base">Cancel</Button>
                    </div>
                  ) : (
                    <span className="flex-1 font-medium text-base">{section.name}</span>
                  )}
                  <div className="flex items-center space-x-2 ml-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor={`focus-mode-toggle-${section.id}`} className="text-xs text-muted-foreground cursor-pointer">
                          {section.include_in_focus_mode ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        {section.include_in_focus_mode ? 'Included in Focus Mode' : 'Excluded from Focus Mode'}
                      </TooltipContent>
                    </Tooltip>
                    <Switch
                      id={`focus-mode-toggle-${section.id}`}
                      checked={section.include_in_focus_mode}
                      onCheckedChange={(checked) => updateSectionIncludeInFocusMode(section.id, checked)}
                      aria-label={`Include ${section.name} in Focus Mode`}
                      disabled={isSaving}
                    />
                    {!editingSectionId && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(section)} disabled={isSaving}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteClick(section.id, section.name)} disabled={isSaving}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-9 text-base">Close</Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section "{sectionToDeleteName}" and move all its tasks to "No Section".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ManageSectionsDialog;