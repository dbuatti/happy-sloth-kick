import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, MultiSelectOption } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import { MultiSelect } from '@/components/ui/multi-select';

interface DevIdeaFormProps {
  initialData?: DevIdea | null;
  onSave: (data: NewDevIdeaData | UpdateDevIdeaData) => Promise<void>;
  onCancel: () => void;
  tags: DevIdeaTag[];
}

const DevIdeaForm: React.FC<DevIdeaFormProps> = ({
  initialData,
  onSave,
  onCancel,
  tags,
}) => {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<NewDevIdeaData | (UpdateDevIdeaData & { tagIds?: string[] })>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'idea',
      priority: initialData?.priority || 'medium',
      image_url: initialData?.image_url || '',
      local_file_path: initialData?.local_file_path || '',
      tagIds: initialData?.tags?.map((tag: DevIdeaTag) => tag.id) || [],
    }
  });

  useEffect(() => {
    reset({
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'idea',
      priority: initialData?.priority || 'medium',
      image_url: initialData?.image_url || '',
      local_file_path: initialData?.local_file_path || '',
      tagIds: initialData?.tags?.map((tag: DevIdeaTag) => tag.id) || [],
    });
  }, [initialData, reset]);

  const onSubmit = async (data: NewDevIdeaData | (UpdateDevIdeaData & { tagIds?: string[] })) => {
    await onSave(data);
  };

  const tagOptions: MultiSelectOption[] = tags.map(tag => ({
    value: tag.id,
    label: tag.name,
  }));

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
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input id="imageUrl" {...register('image_url')} />
      </div>

      <div>
        <Label htmlFor="localFilePath">Local File Path</Label>
        <Input id="localFilePath" {...register('local_file_path')} />
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
              onChange={field.onChange}
              placeholder="Select tags"
            />
          )}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Save Changes' : 'Add Idea'}</Button>
      </div>
    </form>
  );
};

export default DevIdeaForm;