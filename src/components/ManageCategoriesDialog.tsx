import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { categoryColorMap, CategoryColorKey, getCategoryColorProps } from '@/lib/categoryColors';
import { TaskCategory, NewTaskCategoryData, UpdateTaskCategoryData } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TaskCategory[];
  createCategory: (data: NewTaskCategoryData) => Promise<TaskCategory>;
  updateCategory: (data: { id: string; updates: UpdateTaskCategoryData }) => Promise<TaskCategory>;
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
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorKey>('gray');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [editedCategoryColor, setEditedCategoryColor] = useState<CategoryColorKey>('gray');

  useEffect(() => {
    if (!isOpen) {
      setNewCategoryName('');
      setNewCategoryColor('gray');
      setEditingCategoryId(null);
      setEditedCategoryName('');
      setEditedCategoryColor('gray');
    }
  }, [isOpen]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }
    try {
      await createCategory({ name: newCategoryName, color: newCategoryColor });
      toast.success('Category added!');
      setNewCategoryName('');
      setNewCategoryColor('gray');
    } catch (error) {
      toast.error('Failed to add category.');
      console.error('Error adding category:', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryId || !editedCategoryName.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }
    try {
      await updateCategory({ id: editingCategoryId, updates: { name: editedCategoryName, color: editedCategoryColor } });
      toast.success('Category updated!');
      setEditingCategoryId(null);
      setEditedCategoryName('');
      setEditedCategoryColor('gray');
    } catch (error) {
      toast.error('Failed to update category.');
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? All tasks associated with it will become uncategorized.')) {
      try {
        await deleteCategory(id);
        toast.success('Category deleted!');
      } catch (error) {
        toast.error('Failed to delete category.');
        console.error('Error deleting category:', error);
      }
    }
  };

  const startEditing = (category: TaskCategory) => {
    setEditingCategoryId(category.id);
    setEditedCategoryName(category.name);
    setEditedCategoryColor(category.color as CategoryColorKey);
  };

  const cancelEditing = () => {
    setEditingCategoryId(null);
    setEditedCategoryName('');
    setEditedCategoryColor('gray');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
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
            <Select value={newCategoryColor} onValueChange={(value: CategoryColorKey) => setNewCategoryColor(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryColorMap).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${value.dotColor}`} />
                      {value.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddCategory} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                {editingCategoryId === category.id ? (
                  <>
                    <Input
                      value={editedCategoryName}
                      onChange={(e) => setEditedCategoryName(e.target.value)}
                      className="flex-grow"
                    />
                    <Select value={editedCategoryColor} onValueChange={(value: CategoryColorKey) => setEditedCategoryColor(value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryColorMap).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center">
                              <span className={`w-3 h-3 rounded-full mr-2 ${value.dotColor}`} />
                              {value.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleUpdateCategory} size="sm">
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={cancelEditing} size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className={`flex-grow p-2 rounded-md ${getCategoryColorProps(category.color as CategoryColorKey).backgroundClass} ${getCategoryColorProps(category.color as CategoryColorKey).textColor}`}>
                      {category.name}
                    </div>
                    <Button variant="ghost" onClick={() => startEditing(category)} size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleDeleteCategory(category.id)} size="sm" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesDialog;