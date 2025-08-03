import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DevIdea } from '@/hooks/useDevIdeas';

interface DevIdeaFormProps {
  idea?: DevIdea | null;
  onSave: (ideaData: Omit<DevIdea, 'id' | 'user_id' | 'created_at'>) => Promise<boolean>;
  onCancel: () => void;
}

const DevIdeaForm: React.FC<DevIdeaFormProps> = ({ idea, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<DevIdea['status']>('idea');
  const [priority, setPriority] = useState<DevIdea['priority']>('medium');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description || '');
      setStatus(idea.status);
      setPriority(idea.priority);
    } else {
      setTitle('');
      setDescription('');
      setStatus('idea');
      setPriority('medium');
    }
  }, [idea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    const success = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
    });
    if (success) {
      onCancel();
    }
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="idea-title">Title</Label>
        <Input
          id="idea-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A brilliant new idea..."
          required
          autoFocus
        />
      </div>
      <div>
        <Label htmlFor="idea-description">Description (Optional)</Label>
        <Textarea
          id="idea-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="More details about the idea..."
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="idea-status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as DevIdea['status'])}>
            <SelectTrigger id="idea-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="idea-priority">Priority</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as DevIdea['priority'])}>
            <SelectTrigger id="idea-priority">
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
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving || !title.trim()}>
          {isSaving ? 'Saving...' : 'Save Idea'}
        </Button>
      </div>
    </form>
  );
};

export default DevIdeaForm;