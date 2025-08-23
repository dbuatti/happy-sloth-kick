import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categoryColorMap, CategoryColorKey, getCategoryColorProps } from '@/lib/categoryColors';
import { TaskCategory, NewTaskCategoryData, UpdateTaskCategoryData } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'react-hot-toast';

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TaskCategory[];
  createCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  updateCategory: (id: string, updates: UpdateTaskCategoryData) => Promise<TaskCategory>;
  deleteCategory: (id: string) => Promise<void>;
}

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  isOpen,
  onClose,
  categories,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorKey>('gray');
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState<CategoryColorKey>('gray');

  useEffect(() => {
    if (!isOpen) {
      setNewCategoryName('');
      setNewCategoryColor('gray');
      setEditingCategory(null);
      setEditCategoryName('');
      setEditCategoryColor('gray');
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }
    try {
      await createCategory({ name: newCategoryName.trim(), color: newCategoryColor });
      setNewCategoryName('');
      setNewCategoryColor('gray');
    } catch (err) {
      toast.error('Failed to create category.');
      console.error(err);
    }
  };

  const handleEditClick = (category: TaskCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color as CategoryColorKey);
  };

  const handleUpdate = async () => {
    if (!editingCategory) return;
    if (!editCategoryName.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }
    try {
      await updateCategory(editingCategory.id, { name: editCategoryName.trim(), color: editCategoryColor });
      setEditingCategory(null);
    } catch (err) {
      toast.error('Failed to update category.');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? All tasks associated with it will lose their category.')) {
      try {
        await deleteCategory(id);
      } catch (err) {
        toast.error('Failed to delete category.');
        console.error(err);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Select value={newCategoryColor} onValueChange={(value) => setNewCategoryColor(value as CategoryColorKey)}>
              <SelectTrigger className="w-[100px]">
                <div className="flex items-center">
                  <div className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(newCategoryColor).backgroundClass}`} />
                  <SelectValue placeholder="Color" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.keys(categoryColorMap).map((key) => {
                  const colorKey = key as CategoryColorKey;
                  const { backgroundClass } = getCategoryColorProps(colorKey);
                  return (
                    <SelectItem key={colorKey} value={colorKey}>
                      <div className="flex items-center">
                        <div className={`h-4 w-4 rounded-full mr-2 ${backgroundClass}`} />
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
                          <div className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(editCategoryColor).backgroundClass}`} />
                          <SelectValue placeholder="Color" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(categoryColorMap).map((key) => {
                          const colorKey = key as CategoryColorKey;
                          const { backgroundClass } = getCategoryColorProps(colorKey);
                          return (
                            <SelectItem key={colorKey} value={colorKey}>
                              <div className="flex items-center">
                                <div className={`h-4 w-4 rounded-full mr-2 ${backgroundClass}`} />
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
                    <div className={`flex-grow p-2 rounded-md ${getCategoryColorProps(category.color as CategoryColorKey).backgroundClass} ${getCategoryColorProps(category.color as CategoryColorKey).textColor}`}>
                      {category.name}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesDialog;