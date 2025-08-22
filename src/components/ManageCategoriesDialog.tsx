"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TaskCategory } from '@/types'; // Import TaskCategory from @/types
import { useTasks } from '@/hooks/useTasks'; // Use useTasks for category management
import { categoryColorMap, CategoryColorKey, getCategoryColorProps } from '@/lib/categoryColors';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { categories, addCategory, updateCategory, deleteCategory, tasks } = useTasks({ userId }); // Pass userId

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorKey>('gray');
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState<CategoryColorKey>('gray');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<TaskCategory | null>(null);

  const handleAddCategory = async () => {
    if (newCategoryName.trim() && newCategoryColor) {
      await addCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('gray');
    }
  };

  const handleStartEdit = (category: TaskCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color as CategoryColorKey);
  };

  const handleSaveEdit = async () => {
    if (editingCategory && editCategoryName.trim() && editCategoryColor) {
      await updateCategory(editingCategory.id, { name: editCategoryName.trim(), color: editCategoryColor });
      setEditingCategory(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleConfirmDelete = (category: TaskCategory) => {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete) {
      const categoryTasks = tasks.filter(task => task.category === categoryToDelete.id);
      if (categoryTasks.length > 0) {
        alert("Cannot delete category with associated tasks. Please reassign or delete tasks first.");
        setShowDeleteConfirm(false);
        setCategoryToDelete(null);
        return;
      }
      await deleteCategory(categoryToDelete.id);
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Select value={newCategoryColor} onValueChange={(value) => setNewCategoryColor(value as CategoryColorKey)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryColorMap).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center">
                      <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: value.bg }} />
                      {key}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddCategory} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                {editingCategory?.id === category.id ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <Input
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    />
                    <Select value={editCategoryColor} onValueChange={(value) => setEditCategoryColor(value as CategoryColorKey)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryColorMap).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center">
                              <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: value.bg }} />
                              {key}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleSaveEdit} size="sm">Save</Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">Cancel</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: getCategoryColorProps(category.color as CategoryColorKey).bg }} />
                      <span>{category.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleStartEdit(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(category)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category "{categoryToDelete?.name}" and any tasks associated with it will lose their category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};