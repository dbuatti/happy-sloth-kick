"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2 } from 'lucide-react';
import { categoryColorMap, CategoryColorKey, getCategoryColorProps } from '@/lib/categoryColors';
import { TaskCategory } from '@/types/task'; // Corrected import
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks'; // Import useTasks to get category management functions
import { showError, showSuccess } from '@/utils/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { categories, createCategory, updateCategory, deleteCategory } = useTasks({ currentDate: new Date(), userId: user?.id }); // Get category functions from useTasks

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorKey>('gray');
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState<CategoryColorKey>('gray');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<TaskCategory | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewCategoryName('');
      setNewCategoryColor('gray');
      setEditingCategory(null);
      setEditCategoryName('');
      setEditCategoryColor('gray');
      setCategoryToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  }, [isOpen]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showError("Category name cannot be empty.");
      return;
    }
    if (!user?.id) {
      showError("User not authenticated.");
      return;
    }
    await createCategory(newCategoryName.trim(), newCategoryColor);
    showSuccess("Category created!");
    setNewCategoryName('');
    setNewCategoryColor('gray');
  };

  const handleStartEdit = (category: TaskCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color as CategoryColorKey);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editCategoryName.trim()) {
      showError("Category name cannot be empty.");
      return;
    }
    if (!user?.id) {
      showError("User not authenticated.");
      return;
    }
    await updateCategory(editingCategory.id, editCategoryName.trim(), editCategoryColor);
    showSuccess("Category updated!");
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategoryColor('gray');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategoryColor('gray');
  };

  const handleConfirmDelete = (category: TaskCategory) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete && user?.id) {
      await deleteCategory(categoryToDelete.id);
      showSuccess("Category deleted!");
      setCategoryToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your task categories.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <div className="relative">
              <select
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value as CategoryColorKey)}
                className={cn(
                  "appearance-none border rounded-md py-2 pl-3 pr-8 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-primary",
                  getCategoryColorProps(newCategoryColor).bgColorClass,
                  "text-white"
                )}
              >
                {Object.keys(categoryColorMap).map((colorKey) => (
                  <option key={colorKey} value={colorKey} className={cn(getCategoryColorProps(colorKey as CategoryColorKey).bgColorClass, "text-white")}>
                    {colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <Button onClick={handleCreateCategory} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                {editingCategory?.id === category.id ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <Input
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      className="flex-1"
                    />
                    <div className="relative">
                      <select
                        value={editCategoryColor}
                        onChange={(e) => setEditCategoryColor(e.target.value as CategoryColorKey)}
                        className={cn(
                          "appearance-none border rounded-md py-2 pl-3 pr-8 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-primary",
                          getCategoryColorProps(editCategoryColor).bgColorClass,
                          "text-white"
                        )}
                      >
                        {Object.keys(categoryColorMap).map((colorKey) => (
                          <option key={colorKey} value={colorKey} className={cn(getCategoryColorProps(colorKey as CategoryColorKey).bgColorClass, "text-white")}>
                            {colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                    <Button onClick={handleSaveEdit} size="sm">Save</Button>
                    <Button onClick={handleCancelEdit} variant="ghost" size="sm">Cancel</Button>
                  </div>
                ) : (
                  <>
                    <span className={cn("px-2 py-0.5 rounded-full text-white text-sm", getCategoryColorProps(category.color as CategoryColorKey).bgColorClass)}>
                      {category.name}
                    </span>
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
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category "{categoryToDelete?.name}" and remove it from any tasks.
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

export default ManageCategoriesDialog;