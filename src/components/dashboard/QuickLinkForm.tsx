import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData } from '@/types'; // Imported from centralized types
import { UploadCloud, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

interface QuickLinkFormProps {
  initialData?: QuickLink | null;
  onSubmit: (data: NewQuickLinkData | UpdateQuickLinkData) => Promise<void>;
  onCancel: () => void;
}

const QuickLinkForm: React.FC<QuickLinkFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewQuickLinkData | UpdateQuickLinkData>({
    defaultValues: initialData || {
      title: '',
      url: '',
      image_url: '',
      emoji: '',
      background_color: '',
      avatar_text: '',
    },
  });

  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');

  useEffect(() => {
    if (initialData) {
      reset(initialData);
      setImageUrl(initialData.image_url || '');
    } else {
      reset({
        title: '',
        url: '',
        image_url: '',
        emoji: '',
        background_color: '',
        avatar_text: '',
      });
      setImageUrl('');
    }
  }, [initialData, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        // In a real app, you'd upload this to Supabase Storage and get a public URL
        // For now, we'll just use the base64 string or a placeholder
        toast.success('Image selected (upload functionality not implemented)');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: NewQuickLinkData | UpdateQuickLinkData) => {
    await onSubmit({ ...data, image_url: imageUrl });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 p-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title', { required: 'Title is required' })} />
        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="url">URL</Label>
        <Input id="url" {...register('url', { required: 'URL is required', pattern: { value: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i, message: 'Invalid URL' } })} />
        {errors.url && <p className="text-red-500 text-sm">{errors.url.message}</p>}
      </div>
      <div>
        <Label htmlFor="emoji">Emoji</Label>
        <Input id="emoji" {...register('emoji')} placeholder="e.g., 👋" />
      </div>
      <div>
        <Label htmlFor="backgroundColor">Background Color</Label>
        <Input id="backgroundColor" {...register('background_color')} placeholder="e.g., #FF0000 or blue" />
      </div>
      <div>
        <Label htmlFor="avatarText">Avatar Text (if no image/emoji)</Label>
        <Input id="avatarText" {...register('avatar_text')} placeholder="e.g., AB" />
      </div>
      <div>
        <Label htmlFor="image">Image</Label>
        <div className="flex items-center space-x-2">
          <Input id="image" type="file" accept="image/*" onChange={handleImageUpload} className="flex-1" />
          {imageUrl && (
            <div className="relative w-16 h-16 border rounded-md flex items-center justify-center overflow-hidden">
              <img src={imageUrl} alt="Preview" className="object-cover w-full h-full" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-6 w-6 text-red-500 hover:bg-red-100"
                onClick={() => setImageUrl('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Link</Button>
      </div>
    </form>
  );
};

export default QuickLinkForm;