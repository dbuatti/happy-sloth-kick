"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, XCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("File size exceeds 5MB limit.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  }, [setImageFile, setImagePreview]);

  const handleRemoveImage = useCallback(() => {
    setIsConfirmRemoveOpen(true);
  }, []);

  const confirmRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
    setIsConfirmRemoveOpen(false);
  }, [setImageFile, setImagePreview]);

  return (
    <div className="space-y-2">
      <Label htmlFor="image-upload" className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" /> Image (Optional, max 5MB)
      </Label>
      {imagePreview ? (
        <div className="relative w-full h-48 rounded-md overflow-hidden group">
          <img src={imagePreview} alt="Image preview" className="w-full h-full object-cover" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemoveImage}
            disabled={disabled}
            aria-label="Remove image"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center w-full h-24 border-2 border-dashed rounded-md cursor-pointer bg-muted hover:bg-muted/80 transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
          <span className="text-muted-foreground flex items-center gap-2">
            <Upload className="h-4 w-4" /> Click to upload image
          </span>
        </div>
      )}

      <AlertDialog open={isConfirmRemoveOpen} onOpenChange={setIsConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Image Removal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this image?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveImage} disabled={disabled}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImageUploadArea;