import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, link: string) => Promise<void>;
  isSaving: boolean;
}

const AddProjectDialog: React.FC<AddProjectDialogProps> = ({ isOpen, onClose, onSave, isSaving }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectLink, setNewProjectLink] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectLink('');
    }
  }, [isOpen]);

  const handleSaveClick = async () => {
    await onSave(newProjectName.trim(), newProjectDescription.trim(), newProjectLink.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div>
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g., Learn Rust, Garden Design"
              autoFocus
              disabled={isSaving}
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="project-description">Description (Optional)</Label>
            <Textarea
              id="project-description"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              placeholder="Notes about this project..."
              rows={2}
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="project-link">Link (Optional)</Label>
            <Input
              id="project-link"
              type="url"
              value={newProjectLink}
              onChange={(e) => setNewProjectLink(e.target.value)}
              placeholder="e.g., https://github.com/my-project"
              disabled={isSaving}
              className="h-9"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="h-9">Cancel</Button>
          <Button onClick={handleSaveClick} disabled={isSaving || !newProjectName.trim()} className="h-9">
            {isSaving ? 'Adding...' : 'Add Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;