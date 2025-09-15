import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DevIdea, DevIdeaTag } from '@/hooks/useDevIdeas';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { showError } from '@/utils/toast';
import TagInput from './TagInput';
import ImageUploadArea from './ImageUploadArea'; // Import the new component

interface DevIdeaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'tags'> & { tagIds: string[] }) => Promise<any>;
  initialData?: DevIdea | null;
  allTags: DevIdeaTag[];
  onAddTag: (name: string, color: string) => Promise<DevIdeaTag | null>;
}

const DevIdeaForm: React.FC<DevIdeaFormProps> = ({ isOpen, onClose, onSave, initialData, allTags, onAddTag }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idea' | 'in-progress' | 'completed'>('idea');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [localFilePath, setLocalFilePath] = useState('');
  const [selectedTags, setSelectedTags] = useState<DevIdeaTag[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setStatus(initialData.status);
        setPriority(initialData.priority);
        setLocalFilePath(initialData.local_file_path || '');
        setImagePreview(initialData.image_url || null);
        setSelectedTags(initialData.tags || []);
      } else {
        setTitle('');
        setDescription('');
        setStatus('idea');
        setPriority('medium');
        setLocalFilePath('');
        setImagePreview(null);
        setSelectedTags([]);
      }
      setImageFile(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!title.trim() || !user) return;

    setIsSaving(true);
    let imageUrlToSave = initialData?.image_url || null;

    if (imageFile) {
      const filePath = `${user.id}/${uuidv4()}`;
      const { error: uploadError } = await supabase.storage
        .from('devideaimages')
        .upload(filePath, imageFile);

      if (uploadError) {
        showError(`Image upload failed: ${uploadError.message}`);
        setIsSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('devideaimages')
        .getPublicUrl(filePath);
      
      imageUrlToSave = urlData.publicUrl;
    } else if (imagePreview === null && initialData?.image_url) {
      imageUrlToSave = null;
    }

    const success = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      image_url: imageUrlToSave,
      local_file_path: localFilePath.trim() || null,
      tagIds: selectedTags.map(t => t.id),
    });
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[425px]"
      >
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Idea' : 'Add New Idea'}</DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? 'Edit the details of your development idea.' : 'Fill in the details to add a new idea.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <ImageUploadArea
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              setImageFile={setImageFile}
              disabled={isSaving}
            />

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSaving} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSaving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-file-path">Local File Path (Optional)</Label>
              <Input id="local-file-path" value={localFilePath} onChange={(e) => setLocalFilePath(e.target.value)} placeholder="/Users/yourname/path/to/file" disabled={isSaving} />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                allTags={allTags}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
                onAddTag={onAddTag}
              />
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
            <Button type="submit" disabled={isSaving || !title.trim()}>
              {isSaving ? 'Saving...' : 'Save Idea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DevIdeaForm;