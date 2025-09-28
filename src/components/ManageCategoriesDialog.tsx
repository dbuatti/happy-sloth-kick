"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // Removed unused import
import { Category } from '@/hooks/useTasks';
import { PlusCircle, Trash2, Palette, CheckCircle2 } from 'lucide-react';
// import { cn } from '@/lib/utils'; // Removed unused import
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoryCreated: () => void;
  onCategoryDeleted: (deletedId?: string) => void; // Adjusted prop type to accept optional ID
}

const defaultColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#06B6D4',
  '#0EA5E9', '##3B82F6', '#6366F1', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#78716C',
];

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  isOpen,
  onClose,
  categories: propCategories, // Renamed to avoid conflict with state
  onCategoryCreated,
  onCategoryDeleted,
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const userId = user?.id;

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(defaultColors[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');

  const { createCategory, updateCategory, deleteCategory } = useCategories({ userId: userId || '' });

  // Use a local state for categories, initialized from propCategories
  const [localCategories, setLocalCategories] = useState<Category[]>(propCategories || []);

  useEffect(() => {
    setLocalCategories(propCategories || []);
  }, [propCategories]);

  const handleCreateCategory = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (!newCategoryName.trim()) {
      showError('Category name cannot be empty.');
      return;
    }
    setIsCreating(true);
    try {
      await createCategory({ name: newCategoryName.trim(), color: newCategoryColor });
      showSuccess('Category created!');
      setNewCategoryName('');
      setNewCategoryColor(defaultColors[0]);
      onCategoryCreated();
    } catch (error) {
      console.error('Error creating category:', error);
      showError('Failed to create category.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryColor(category.color);
  };

  const handleSaveEdit = async (categoryId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (!editingCategoryName.trim()) {
      showError('Category name cannot be empty.');
      return;
    }
    try {
      // Corrected call to updateCategory
      await updateCategory({ id: categoryId, updates: { name: editingCategoryName.trim(), color: editingCategoryColor } });
      showSuccess('Category updated!');
      setEditingCategoryId(null);
      setEditingCategoryName('');
      setEditingCategoryColor('');
    } catch (error) {
      console.error('Error updating category:', error);
      showError('Failed to update category.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this category? All tasks associated with it will lose their category.')) {
      try {
        await deleteCategory(categoryId);
        showSuccess('Category deleted!');
        onCategoryDeleted(categoryId); // Pass the deleted ID
      } catch (error) {
        console.error('Error deleting category:', error);
        showError('Failed to delete category.');
      }
    }
  };

  const Content = () => (
    <div className="space-y-6 py-4">
      {/* Add New Category */}
      <div className="border p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Add New Category</h3>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={isCreating}
            className="flex-grow"
          />
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: newCategoryColor }} />
                  {newCategoryColor}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <HexColorPicker color={newCategoryColor} onChange={setNewCategoryColor} />
                <div className="grid grid-cols-6 gap-2 p-2">
                  {defaultColors.map((color) => (
                    <div
                      key={color}
                      className="w-6 h-6 rounded-full cursor-pointer border border-gray-300 dark:border-gray-700"
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCategoryColor(color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleCreateCategory} disabled={isCreating || !newCategoryName.trim()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </div>

      {/* Existing Categories */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Existing Categories</h3>
        {localCategories.length === 0 ? (
          <p className="text-muted-foreground">No categories yet. Add one above!</p>
        ) : (
          <ul className="space-y-2">
            {localCategories.map((category) => (
              <li key={category.id} className="flex items-center justify-between p-3 border rounded-md bg-card shadow-sm">
                {editingCategoryId === category.id ? (
                  <div className="flex-grow flex items-center gap-2">
                    <Input
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="flex-grow"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: editingCategoryColor }} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <HexColorPicker color={editingCategoryColor} onChange={setEditingCategoryColor} />
                        <div className="grid grid-cols-6 gap-2 p-2">
                          {defaultColors.map((color) => (
                            <div
                              key={color}
                              className="w-6 h-6 rounded-full cursor-pointer border border-gray-300 dark:border-gray-700"
                              style={{ backgroundColor: color }}
                              onClick={() => setEditingCategoryColor(color)}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(category.id)}>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                        <Palette className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const Footer = () => (
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Close</Button>
    </DialogFooter>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="h-[90vh] flex flex-col">
            <DrawerHeader className="text-left">
              <DrawerTitle>Manage Categories</DrawerTitle>
              <DrawerDescription>Add, edit, or delete your task categories.</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4">
              <Content />
            </div>
            <DrawerFooter>
              <Footer />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
              <DialogDescription>Add, edit, or delete your task categories.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <Content />
            </div>
            <Footer />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ManageCategoriesDialog;