import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TaskCategory } from '@/types/task'; // Removed CategoryColorKey
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TwitterPicker } from 'react-color';
import { getCategoryColorProps, categoryColors } from '@/utils/categoryColors';
import { ManageCategoriesDialogProps } from '@/types/props';

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  isOpen,
  onClose,
  categories,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (editingCategory) {
      setCategoryName(editingCategory.name);
      setCategoryColor(editingCategory.color);
    } else {
      setCategoryName('');
      setCategoryColor('');
    }
  }, [editingCategory]);

  const handleOpenAddEditDialog = (category: TaskCategory | null = null) => {
    setEditingCategory(category);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    if (editingCategory) {
      await updateCategory(editingCategory.id, categoryName.trim(), categoryColor);
    } else {
      await createCategory(categoryName.trim(), categoryColor || '#cccccc'); // Default color if none selected
    }
    setIsAddEditDialogOpen(false);
    setCategoryName('');
    setCategoryColor('');
  };

  const handleConfirmDelete = (id: string) => {
    setCategoryToDelete(id);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete);
      setIsConfirmDeleteOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center">
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: getCategoryColorProps(category.color).bg }}
                  />
                  <span>{category.name}</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenAddEditDialog(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(category.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => handleOpenAddEditDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-name" className="text-right">
                Name
              </Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-color" className="text-right">
                Color
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-3 justify-start" style={{ backgroundColor: categoryColor || 'transparent' }}>
                    {categoryColor || 'Select Color'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <TwitterPicker
                    color={categoryColor}
                    onChangeComplete={(color: any) => setCategoryColor(color.hex)}
                    colors={Object.keys(categoryColors).map(key => categoryColors[key].bg)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'Save Changes' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{categories.find(cat => cat.id === categoryToDelete)?.name}"?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManageCategoriesDialog;