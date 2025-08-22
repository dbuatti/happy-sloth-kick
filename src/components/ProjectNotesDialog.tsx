import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Project } from '@/types/task';
import { ProjectNotesDialogProps } from '@/types/props';

const ProjectNotesDialog: React.FC<ProjectNotesDialogProps> = ({ isOpen, onClose, project, onSaveNotes }) => {
  const [notes, setNotes] = useState(project.notes || '');

  useEffect(() => {
    setNotes(project.notes || '');
  }, [project]);

  const handleSave = async () => {
    await onSaveNotes(notes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Notes for {project.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="project-notes">Project Notes</Label>
          <Textarea
            id="project-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectNotesDialog;