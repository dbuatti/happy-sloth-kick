import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from '@/lib/utils';
import { categoryColorMap, CategoryColorKey, getCategoryColorProps } from '@/lib/categoryColors';
import { Category } from '@/hooks/useTasks'; // Import Category type
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTaskCategories } from '@/hooks/useTaskCategories'; // Import useTaskCategories

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[]; // Still passed as prop for initial display
  onCategoryCreated: () => void;
  onCategoryDeleted: (deletedId: string) => void;
}

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoryCreated,
  onCategoryDeleted,
}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { refetch: refetchCategories } = useTaskCategories(); // Use refetch from useTaskCategories

  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColorKey, setSelectedColorKey] = useState<CategoryColorKey>('gray');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);
  const [categoryToDeleteName, setCategoryToDeleteName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewCategoryName('');
      setSelectedColorKey('gray');
      setIsSaving(false);
    }
  }, [isOpen]);

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      showError('Category name is required');
      return;
    }
    if (!userId) {
      showError("User not authenticated. Cannot create category.");
      return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      showError('Category with this name already exists.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('task_categories')
        .insert([
          { name: newCategoryName.trim(), color: selectedColorKey, user_id: userId }
        ]);

      if (error) throw error;
      
      showSuccess('Category created successfully!');
      setNewCategoryName('');
      setSelectedColorKey('gray');
      refetchCategories(); // Trigger refetch in useTaskCategories
      onCategoryCreated();
    } catch (error: any) {
      showError('Failed to create category.');
      console.error('Error creating category:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (categoryId: string, categoryName: string) => {
    setCategoryToDeleteId(categoryId);
    setCategoryToDeleteName(categoryName);
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDeleteId || !userId) {
      setShowConfirmDeleteDialog(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateTasksError } = await supabase
        .from('tasks')
        .update({ category: categories.find(cat => cat.name.toLowerCase() === 'general')?.id || null })
        .eq('category', categoryToDeleteId)
        .eq('user_id', userId);

      if (updateTasksError) throw updateTasksError;

      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', categoryToDeleteId)
        .eq('user_id', userId);

      if (error) throw error;
      
      showSuccess('Category deleted successfully!');
      refetchCategories(); // Trigger refetch in useTaskCategories
      onCategoryDeleted(categoryToDeleteId);
    } catch (error: any) {
      showError('Failed to delete category.');
      console.error('Error deleting category:', error);
    } finally {
      setIsSaving(false);
      setShowConfirmDeleteDialog(false);
      setCategoryToDeleteId(null);
      setCategoryToDeleteName(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {categories.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-md font-semibold">Existing Categories</h4>
              <ul className="space-y-2">
                {categories.map(category => {
                  const colorProps = getCategoryColorProps(category.color);
                  return (
                    <li key={category.id} className="flex items-center justify-between p-2 rounded-md shadow-sm bg-background">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border" style={{ backgroundColor: colorProps.dotColor }}></div>
                        <span>{category.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteClick(category.id, category.name)}
                        aria-label={`Delete ${category.name}`}
                        disabled={category.name.toLowerCase() === 'general' || isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          <div className="border-t pt-4 mt-4">
            <h4 className="text-md font-semibold mb-3">Create New Category</h4>
            <div>
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Work, Personal, Shopping"
                disabled={isSaving}
                className="h-9 text-base"
              />
            </div>
            <div className="mt-4">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.keys(categoryColorMap).map((colorKey) => {
                  const colorProps = getCategoryColorProps(colorKey);
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center",
                        colorProps.backgroundClass,
                        colorProps.dotBorder,
                        selectedColorKey === colorKey ? 'ring-2 ring-offset-2 ring-primary' : ''
                      )}
                      onClick={() => setSelectedColorKey(colorKey as CategoryColorKey)}
                      aria-label={colorProps.name}
                      disabled={isSaving}
                    >
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: colorProps.dotColor }}></div>
                    </button>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={createCategory} className="w-full h-9 text-base" disabled={isSaving || !newCategoryName.trim()}>
                {isSaving ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category "{categoryToDeleteName}" and reassign all tasks in this category to "General" (or no category if "General" doesn't exist).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ManageCategoriesDialog;