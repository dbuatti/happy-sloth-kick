import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuickLink } from '@/hooks/useQuickLinks';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';

interface QuickLinkFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; url: string; imageFile?: File | null }) => Promise<any>;
  initialData?: QuickLink | null;
}

const QuickLinkForm: React.FC<QuickLinkFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setUrl(initialData?.url || '');
      setImageFile(null);
      setImagePreview(initialData?.image_url || null);
    }
  }, [isOpen, initialData]);

  const handleFile = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else if (file) {
      showError('Please upload a valid image file.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDragEnter = () => setIsDragging(true);
  const handleDragLeave = () => setIsDragging(false);

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) {
      showError('Title and URL are required.');
      return;
    }
    setIsSaving(true);
    await onSave({ title, url, imageFile });
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Quick Link' : 'Add Quick Link'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Google Drive" />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Icon</Label>
            <div
              className={cn(
                "relative mt-1 border-2 border-dashed rounded-lg p-4 text-center transition-colors h-32 flex items-center justify-center",
                isDragging ? "border-primary bg-primary/10" : "border-border"
              )}
              onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="rounded-full h-24 w-24 object-cover" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <UploadCloud className="h-8 w-8" />
                  <p className="text-sm">Drag & drop, or <label htmlFor="file-upload" className="text-primary underline cursor-pointer">click to upload</label>.</p>
                  <Input id="file-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickLinkForm;