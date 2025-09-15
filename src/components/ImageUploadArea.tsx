import React, { useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError } from '@/utils/toast';

interface ImageUploadAreaProps {
  imagePreview: string | null;
  setImagePreview: (url: string | null) => void;
  setImageFile: (file: File | null) => void;
  disabled?: boolean;
}

const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  imagePreview,
  setImagePreview,
  setImageFile,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else if (file) {
      showError('Please upload a valid image file.');
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
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
    if (disabled) return;
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

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-4 text-center transition-colors",
        isDragging ? "border-primary bg-primary/10" : "border-border",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
    >
      {imagePreview ? (
        <>
          <img src={imagePreview} alt="Preview" className="rounded-md max-h-40 mx-auto" />
          {!disabled && (
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 bg-background/50 hover:bg-background/80" onClick={handleRemoveImage}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
          <UploadCloud className="h-8 w-8" />
          <p>Drag & drop, paste, or click to upload an image.</p>
          {!disabled && (
            <>
              <Input type="file" accept="image/*" className="sr-only" id="file-upload-image-area" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
              <Label htmlFor="file-upload-image-area" className="text-primary underline cursor-pointer">
                click to upload
              </Label>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploadArea;