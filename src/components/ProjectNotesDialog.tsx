import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Project, UpdateProjectData } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'react-hot-toast';

interface ProjectNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const ProjectNotesDialog: React.FC<ProjectNotesDialogProps> = ({ isOpen, onClose, project }) => {
  const { updateProject } = useProjects({});
  const [notes, setNotes] = useState(project.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(project.notes || '');
  }, [project]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updateProject({ id: project.id, updates: { notes } });
      toast.success('Project notes saved!');
      onClose();
    } catch (error) {
      toast.error('Failed to save notes.');
      console.error('Error saving project notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Notes for {project.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Add notes for this project..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[200px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveNotes} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectNotesDialog;