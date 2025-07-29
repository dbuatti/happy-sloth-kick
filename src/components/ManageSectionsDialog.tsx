import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTasks, TaskSection } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ManageSectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sections: TaskSection[]; // Pass sections from useTasks
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
}

const ManageSectionsDialog: React.FC<ManageSectionsDialogProps> = ({
  isOpen,
  onClose,
  sections,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [sectionToDeleteId, setSectionToDeleteId] = useState<string | null>(null);

  const handleEditClick = (section: TaskSection) => {
    setEditingSectionId(section.id);
    setEditingSectionName(section.name);
  };

  const handleSaveEdit = async () => {
    if (editingSectionId && editingSectionName.trim()) {
      await updateSection(editingSectionId, editingSectionName.trim());
      setEditingSectionId(null);
      setEditingSectionName('');
    }
  };

  const handleDeleteClick = (sectionId: string) => {
    setSectionToDeleteId(sectionId);
    setShowConfirmDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (sectionToDeleteId) {
      await deleteSection(sectionToDeleteId);
      setSectionToDeleteId(null);
      setShowConfirmDeleteDialog(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Sections</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {sections.length === 0 ? (
            <p className="text-muted-foreground text-center">No sections created yet.</p>
          ) : (
            <ul className="space-y-2">
              {sections.map(section => (
                <li key={section.id} className="flex items-center justify-between p-2 border rounded-md">
                  {editingSectionId === section.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus // Auto-focus here
                      />
                      <Button size="sm" onClick={handleSaveEdit} disabled={!editingSectionName.trim()}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSectionId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <span className="flex-1 font-medium">{section.name}</span>
                  )}
                  <div className="flex items-center space-x-2 ml-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor={`focus-mode-toggle-${section.id}`} className="text-xs text-muted-foreground cursor-pointer">
                          {section.include_in_focus_mode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                    />
                    {!editingSectionId && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(section)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteClick(section.id)}>
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
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this section and move all its tasks to "No Section".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ManageSectionsDialog;