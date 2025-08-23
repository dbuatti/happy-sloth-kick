import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { categoryColorMap, CategoryColorKey, getCategoryColorProps } from '@/lib/categoryColors';
import { TaskCategory, NewTaskCategoryData, UpdateTaskCategoryData } from '@/types'; // Corrected import
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'react-hot-toast';

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TaskCategory[];
  onCreateCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  onUpdateCategory: (id: string, updates: UpdateTaskCategoryData) => Promise<TaskCategory>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  isOpen,
  onOpenChange,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorKey>('blue');
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState<CategoryColorKey>('blue');

  const handleCreate = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }
    try {
      await onCreateCategory({ name: newCategoryName.trim(), color: newCategoryColor });
      toast.success('Category created!');
      setNewCategoryName('');
      setNewCategoryColor('blue');
    } catch (err) {
      toast.error(`Failed to create category: ${(err as Error).message}`);
      console.error('Error creating category:', err);
    }
  };

  const handleEdit = (category: TaskCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color as CategoryColorKey);
  };

  const handleUpdate = async () => {
    if (!editingCategory || !editCategoryName.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }
    try {
      await onUpdateCategory(editingCategory.id, { name: editCategoryName.trim(), color: editCategoryColor });
      toast.success('Category updated!');
      setEditingCategory(null);
    } catch (err) {
      toast.error(`Failed to update category: ${(err as Error).message}`);
      console.error('Error updating category:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? All tasks associated with it will become uncategorized.')) {
      try {
        await onDeleteCategory(id);
        toast.success('Category deleted!');
      } catch (err) {
        toast.error(`Failed to delete category: ${(err as Error).message}`);
        console.error('Error deleting category:', err);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-grow"
            />
            <Select value={newCategoryColor} onValueChange={(value) => setNewCategoryColor(value as CategoryColorKey)}>
              <SelectTrigger className="w-[100px]">
                <div className="flex items-center">
                  <div className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(newCategoryColor).bgColor}`} />
                  <SelectValue placeholder="Color" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.keys(categoryColorMap).map((key) => {
                  const colorKey = key as CategoryColorKey;
                  const { bgColor, textColor } = getCategoryColorProps(colorKey);
                  return (
                    <SelectItem key={colorKey} value={colorKey}>
                      <div className="flex items-center">
                        <div className={`h-4 w-4 rounded-full mr-2 ${bgColor}`} />
                        {colorKey}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                {editingCategory?.id === category.id ? (
                  <>
                    <Input
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      className="flex-grow"
                    />
                    <Select value={editCategoryColor} onValueChange={(value) => setEditCategoryColor(value as CategoryColorKey)}>
                      <SelectTrigger className="w-[100px]">
                        <div className="flex items-center">
                          <div className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(editCategoryColor).bgColor}`} />
                          <SelectValue placeholder="Color" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(categoryColorMap).map((key) => {
                          const colorKey = key as CategoryColorKey;
                          const { bgColor, textColor } = getCategoryColorProps(colorKey);
                          return (
                            <SelectItem key={colorKey} value={colorKey}>
                              <div className="flex items-center">
                                <div className={`h-4 w-4 rounded-full mr-2 ${bgColor}`} />
                                {colorKey}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleUpdate} size="sm">Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingCategory(null)}><X className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <div className={`flex-grow p-2 rounded-md ${getCategoryColorProps(category.color as CategoryColorKey).bgColor} ${getCategoryColorProps(category.color as CategoryColorKey).textColor}`}>
                      {category.name}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesDialog;