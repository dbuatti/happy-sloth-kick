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
  onUpdateProject: (id: string, updates: UpdateProjectData) => Promise<Project>;
}

const ProjectNotesDialog: React.FC<ProjectNotesDialogProps> = ({ isOpen, onClose, project, onUpdateProject }) => {
  const [notes, setNotes] = useState(project.notes || '');

  useEffect(() => {
    setNotes(project.notes || '');
  }, [project.notes]);

  const handleSaveNotes = async () => {
    try {
      await onUpdateProject(project.id, { notes });
      toast.success('Project notes updated!');
      onClose();
    } catch (error) {
      toast.error('Failed to update notes.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Notes for {project.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for this project..."
            rows={10}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveNotes}>Save Notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectNotesDialog;