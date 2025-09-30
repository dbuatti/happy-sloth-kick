"use client";

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, XCircle } from 'lucide-react'; // Removed Image as ImageIcon
import { cn } from '@/lib/utils';

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

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, [setImageFile, setImagePreview]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, [setImageFile, setImagePreview, disabled]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
  }, [setImageFile, setImagePreview]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">Task Image (Optional)</label>
      <div
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 transition-colors",
          isDragging ? "border-primary-foreground bg-primary/10" : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && document.getElementById('image-upload-input')?.click()}
      >
        <input
          id="image-upload-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        {imagePreview ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img src={imagePreview} alt="Task preview" className="max-h-full max-w-full object-contain rounded-md" />
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 text-destructive hover:bg-destructive/20"
                onClick={(e) => { e.stopPropagation(); handleClearImage(); }}
                aria-label="Remove image"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploadArea;