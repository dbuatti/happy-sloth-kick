import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DevIdea } from '@/hooks/useDevIdeas';

interface DevIdeaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<DevIdea, 'id' | 'user_id' | 'created_at'>) => Promise<any>;
  initialData?: DevIdea | null;
}

const DevIdeaForm: React.FC<DevIdeaFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idea' | 'in-progress' | 'completed'>('idea');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setStatus(initialData.status);
        setPriority(initialData.priority);
      } else {
        setTitle('');
        setDescription('');
        setStatus('idea');
        setPriority('medium');
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      // You might want to show an error here
      return;
    }
    setIsSaving(true);
    const success = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
    });
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Idea' : 'Add New Idea'}</DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? 'Edit the details of your development idea.' : 'Fill in the details to add a new idea.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSaving} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSaving} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as any)} disabled={isSaving}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as any)} disabled={isSaving}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSaving || !title.trim()}>
            {isSaving ? 'Saving...' : 'Save Idea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DevIdeaForm;