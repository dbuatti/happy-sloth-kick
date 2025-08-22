import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TaskCategory, CategoryColorKey } from '@/types/task';
import { getCategoryColorProps, categoryColors } from '@/utils/categoryColors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManageCategoriesDialogProps } from '@/types/props';

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  isOpen,
  onClose,
  categories,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorKey>('blue');
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState<CategoryColorKey>('blue');

  useEffect(() => {
    if (!isOpen) {
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryColor('blue');
    }
  }, [isOpen]);

  const handleCreateCategory = async () => {
    if (newCategoryName.trim()) {
      await createCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('blue');
    }
  };

  const handleEditCategory = (category: TaskCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color as CategoryColorKey);
  };

  const handleSaveEdit = async () => {
    if (editingCategory && editCategoryName.trim() && editCategoryColor) {
      await updateCategory(editingCategory.id, editCategoryName.trim(), editCategoryColor);
      setEditingCategory(null);
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
              className="flex-grow"
            />
            <Select value={newCategoryColor} onValueChange={(value: CategoryColorKey) => setNewCategoryColor(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryColors).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center">
                      <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: value.bg }} />
                      {value.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreateCategory} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {categories.map((category: TaskCategory) => (
              <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                {editingCategory?.id === category.id ? (
                  <div className="flex items-center flex-grow space-x-2">
                    <Input
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      className="flex-grow"
                    />
                    <Select value={editCategoryColor} onValueChange={(value: CategoryColorKey) => setEditCategoryColor(value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryColors).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center">
                              <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: value.bg }} />
                              {value.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleSaveEdit} size="sm">Save</Button>
                    <Button variant="ghost" onClick={() => setEditingCategory(null)} size="sm">Cancel</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: getCategoryColorProps(category.color as CategoryColorKey).bg }} />
                      <span>{category.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCategory(category.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
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