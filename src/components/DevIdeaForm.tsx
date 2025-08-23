import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData } from '@/types'; // Corrected imports
import { useAuth } from '@/context/AuthContext';
import TagInput from './TagInput';
import { toast } from 'react-hot-toast';

interface DevIdeaFormProps {
  initialData?: DevIdea | null;
  onSubmit: (data: NewDevIdeaData | UpdateDevIdeaData) => void;
  onCancel: () => void;
  allTags: DevIdeaTag[];
  onCreateTag: (name: string, color: string) => Promise<DevIdeaTag | undefined>;
  onDeleteTag: (id: string) => void;
}

const DevIdeaForm: React.FC<DevIdeaFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  allTags,
  onCreateTag,
  onDeleteTag,
}) => {
  const { user } = useAuth();
  const userId = user?.id;

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<NewDevIdeaData | UpdateDevIdeaData>({
    defaultValues: {
      title: '',
      description: '',
      status: 'idea',
      priority: 'medium',
      image_url: '',
      local_file_path: '',
      tagIds: [],
    }
  });

  const selectedTagIds = watch('tagIds');

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description || '',
        status: initialData.status,
        priority: initialData.priority,
        image_url: initialData.image_url || '',
        local_file_path: initialData.local_file_path || '',
        tagIds: initialData.tags.map(tag => tag.id),
      });
    } else {
      reset();
    }
  }, [initialData, reset]);

  const handleTagAdd = async (tagName: string, color: string) => {
    try {
      const newTag = await onCreateTag(tagName, color);
      if (newTag) {
        setValue('tagIds', [...(selectedTagIds || []), newTag.id]);
        return newTag;
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag.');
    }
    return undefined;
  };

  const handleTagRemove = (tagId: string) => {
    setValue('tagIds', (selectedTagIds || []).filter(id => id !== tagId));
  };

  const handleSelectExistingTag = (tag: DevIdeaTag) => {
    if (!(selectedTagIds || []).includes(tag.id)) {
      setValue('tagIds', [...(selectedTagIds || []), tag.id]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title', { required: 'Title is required' })} />
        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div>
        <Label htmlFor="priority">Priority</Label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div>
        <Label htmlFor="tags">Tags</Label>
        <TagInput
          selectedTags={allTags.filter(tag => (selectedTagIds || []).includes(tag.id))}
          allTags={allTags}
          onAddTag={handleTagAdd}
          onRemoveTag={handleTagRemove}
          onSelectExistingTag={handleSelectExistingTag}
        />
      </div>
      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" {...register('image_url')} />
      </div>
      <div>
        <Label htmlFor="local_file_path">Local File Path</Label>
        <Input id="local_file_path" {...register('local_file_path')} />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? 'Save Changes' : 'Create Idea'}</Button>
      </div>
    </form>
  );
};

export default DevIdeaForm;