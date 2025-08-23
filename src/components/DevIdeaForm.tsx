import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, MultiSelectOption } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { MultiSelect } from '@/components/ui/multi-select';
import { toast } from 'react-hot-toast';

interface DevIdeaFormProps {
  initialData?: Partial<DevIdea>;
  onSave: (data: NewDevIdeaData | (UpdateDevIdeaData & { tagIds?: string[] })) => Promise<any>;
  onCancel: () => void;
  tags: DevIdeaTag[];
  onCreateTag: (data: { name: string; color: string }) => Promise<DevIdeaTag>;
  onDeleteTag: (id: string) => Promise<void>;
}

const DevIdeaForm: React.FC<DevIdeaFormProps> = ({
  initialData,
  onSave,
  onCancel,
  tags,
  onCreateTag,
  onDeleteTag,
}) => {
  const { user } = useAuth();
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<NewDevIdeaData | (UpdateDevIdeaData & { tagIds?: string[] })>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'idea',
      priority: initialData?.priority || 'medium',
      image_url: initialData?.image_url || '',
      local_file_path: initialData?.local_file_path || '',
      tagIds: initialData?.tags?.map(tag => tag.id) || [],
    },
  });

  const selectedTagIds = watch('tagIds');

  useEffect(() => {
    reset({
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'idea',
      priority: initialData?.priority || 'medium',
      image_url: initialData?.image_url || '',
      local_file_path: initialData?.local_file_path || '',
      tagIds: initialData?.tags?.map(tag => tag.id) || [],
    });
  }, [initialData, reset]);

  const onSubmit = async (data: NewDevIdeaData | (UpdateDevIdeaData & { tagIds?: string[] })) => {
    try {
      await onSave(data);
      toast.success('Idea saved successfully!');
    } catch (error) {
      console.error('Failed to save idea:', error);
      toast.error('Failed to save idea.');
    }
  };

  const handleTagChange = (selected: string[]) => {
    setValue('tagIds', selected);
  };

  const tagOptions: MultiSelectOption[] = tags.map(tag => ({
    label: tag.name,
    value: tag.id,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register('title', { required: 'Title is required' })}
        />
        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} rows={3} />
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
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" {...register('image_url')} placeholder="e.g. https://example.com/image.jpg" />
      </div>

      <div>
        <Label htmlFor="local_file_path">Local File Path</Label>
        <Input id="local_file_path" {...register('local_file_path')} placeholder="e.g. /Users/username/Documents/my-idea.md" />
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <Controller
          name="tagIds"
          control={control}
          render={({ field }) => (
            <MultiSelect
              options={tagOptions}
              value={field.value || []}
              onChange={handleTagChange}
              placeholder="Select tags"
            />
          )}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Idea</Button>
      </div>
    </form>
  );
};

export default DevIdeaForm;