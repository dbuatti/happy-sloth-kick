import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Project } from '@/hooks/useProjects';

interface ProjectNotesDialogProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectId: string, notes: string) => Promise<void>;
}

const ProjectNotesDialog: React.FC<ProjectNotesDialogProps> = ({ project, isOpen, onClose, onSave }) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setNotes(project.notes || '');
    }
  }, [project]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    await onSave(project.id, notes);
    setIsSaving(false);
    onClose();
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Notes for: {project.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Edit or view notes for the project {project.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Your notes for this project..."
            rows={10}
            className="text-base"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectNotesDialog;