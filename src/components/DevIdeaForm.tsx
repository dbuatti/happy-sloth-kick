import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DevIdea } from '@/hooks/useDevIdeas';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { showError } from '@/utils/toast';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DevIdeaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<DevIdea, 'id' | 'user_id' | 'created_at'>) => Promise<any>;
  initialData?: DevIdea | null;
}

const DevIdeaForm: React.FC<DevIdeaFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idea' | 'in-progress' | 'completed'>('idea');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSaving, setIsSaving] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setStatus(initialData.status);
        setPriority(initialData.priority);
        setImagePreview(initialData.image_url || null);
      } else {
        setTitle('');
        setDescription('');
        setStatus('idea');
        setPriority('medium');
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [isOpen, initialData]);

  const handleFile = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      showError('Please upload a valid image file.');
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        handleFile(file);
        break;
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;

    setIsSaving(true);
    let imageUrlToSave = initialData?.image_url || null;

    if (imageFile) {
      const filePath = `${user.id}/${uuidv4()}`;
      const { error: uploadError } = await supabase.storage
        .from('dev_idea_images')
        .upload(filePath, imageFile);

      if (uploadError) {
        showError(`Image upload failed: ${uploadError.message}`);
        setIsSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('dev_idea_images')
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
        onPaste={handlePaste}
      >
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Idea' : 'Add New Idea'}</DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? 'Edit the details of your development idea.' : 'Fill in the details to add a new idea.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div 
            className={cn(
              "relative border-2 border-dashed rounded-lg p-4 text-center transition-colors",
              isDragging ? "border-primary bg-primary/10" : "border-border"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="rounded-md max-h-40 mx-auto" />
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 bg-background/50 hover:bg-background/80" onClick={handleRemoveImage}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                <UploadCloud className="h-8 w-8" />
                <p>Drag & drop an image here, or paste from clipboard.</p>
              </div>
            )}
          </div>

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