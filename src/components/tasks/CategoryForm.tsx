import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { TaskCategory } from '@/types/task-management';

interface CategoryFormProps {
  initialCategory?: TaskCategory | null;
  onSave: (category: Partial<TaskCategory>) => void;
  onClose: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ initialCategory, onSave, onClose }) => {
  const [name, setName] = useState(initialCategory?.name || '');
  const [color, setColor] = useState(initialCategory?.color || '#000000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }
    onSave({ ...initialCategory, name, color });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Category Name
        </label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="mt-1" />
      </div>
      <div>
        <label htmlFor="color" className="block text-sm font-medium text-gray-700">
          Color
        </label>
        <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 h-10 w-full" />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Category</Button>
      </DialogFooter>
    </form>
  );
};

export default CategoryForm;