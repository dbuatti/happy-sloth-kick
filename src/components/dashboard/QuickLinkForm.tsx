import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuickLink } from '@/hooks/useQuickLinks';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuickLinkFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    title: string; 
    url: string; 
    imageFile?: File | null;
    image_url?: string | null;
    emoji?: string | null;
    backgroundColor?: string | null;
    avatarText?: string | null;
  }) => Promise<any>;
  initialData?: QuickLink | null;
}

const presetColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

const QuickLinkForm: React.FC<QuickLinkFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [avatarType, setAvatarType] = useState<'image' | 'emoji' | 'text'>('image');
  const [emoji, setEmoji] = useState('');
  const [avatarText, setAvatarText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(presetColors[0]);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setUrl(initialData?.url || '');
      setImageFile(null);
      setImagePreview(initialData?.image_url || null);
      setEmoji(initialData?.emoji || '');
      setAvatarText(initialData?.avatar_text || '');
      setBackgroundColor(initialData?.background_color || presetColors[0]);

      if (initialData?.image_url) {
        setAvatarType('image');
      } else if (initialData?.emoji) {
        setAvatarType('emoji');
      } else if (initialData?.avatar_text) {
        setAvatarType('text');
      } else {
        setAvatarType('image');
      }
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

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFile(file);
          setAvatarType('image');
        }
        break;
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) {
      showError('Title and URL are required.');
      return;
    }
    setIsSaving(true);

    const saveData: Parameters<typeof onSave>[0] = { 
      title, 
      url,
    };

    if (avatarType === 'image') {
      saveData.imageFile = imageFile;
      if (!imageFile) {
        saveData.image_url = imagePreview;
      }
      saveData.emoji = null;
      saveData.avatarText = null;
      saveData.backgroundColor = null;
    } else if (avatarType === 'emoji') {
      saveData.image_url = null;
      saveData.emoji = emoji;
      saveData.avatarText = null;
      saveData.backgroundColor = backgroundColor;
    } else if (avatarType === 'text') {
      saveData.image_url = null;
      saveData.emoji = null;
      saveData.avatarText = avatarText;
      saveData.backgroundColor = backgroundColor;
    }

    await onSave(saveData);
    setIsSaving(false);
    onClose();
  };

  const ColorPalette = () => (
    <div className="flex flex-wrap gap-2 mt-2">
      {presetColors.map(color => (
        <button
          key={color}
          type="button"
          className={cn(
            "w-8 h-8 rounded-full border-2 transition-all",
            backgroundColor === color ? 'ring-2 ring-offset-2 ring-primary' : 'border-transparent'
          )}
          style={{ backgroundColor: color }}
          onClick={() => setBackgroundColor(color)}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Quick Link' : 'Add Quick Link'}</DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? 'Edit the details of your quick link.' : 'Fill in the details to add a new quick link.'}
          </DialogDescription>
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
            <Label>Icon Type</Label>
            <Tabs value={avatarType} onValueChange={(value) => setAvatarType(value as any)} className="w-full mt-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="image">Image</TabsTrigger>
                <TabsTrigger value="emoji">Emoji</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
              </TabsList>
              <TabsContent value="image" className="mt-2">
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-lg p-4 text-center transition-colors h-32 flex items-center justify-center",
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
                      <p className="text-sm">Drag, paste, or <label htmlFor="file-upload" className="text-primary underline cursor-pointer">click to upload</label>.</p>
                      <Input id="file-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="emoji" className="mt-2">
                <div className="space-y-2">
                  <Label>Emoji</Label>
                  <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="😊" maxLength={2} />
                  <Label>Background Color</Label>
                  <ColorPalette />
                </div>
              </TabsContent>
              <TabsContent value="text" className="mt-2">
                <div className="space-y-2">
                  <Label>Text (1-2 letters)</Label>
                  <Input value={avatarText} onChange={(e) => setAvatarText(e.target.value)} placeholder="JD" maxLength={2} />
                  <Label>Background Color</Label>
                  <ColorPalette />
                </div>
              </TabsContent>
            </Tabs>
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