"use client";

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Removed: import { Label } from "@/components/ui/label"; // Unused import
import { Category } from '@/hooks/useTasks';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { HexColorPicker } from 'react-colorful'; // Ensure this is correctly imported
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoryCreated: (name: string, color: string) => Promise<string | null>;
  onCategoryUpdated: (categoryId: string, updates: Partial<Category>) => Promise<boolean>;
  onCategoryDeleted: (categoryId: string) => Promise<boolean>;
}

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6'); // Default blue
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      showError('Category name cannot be empty.');
      return;
    }
    setIsCreating(true);
    const success = await onCategoryCreated(newCategoryName.trim(), newCategoryColor);
    setIsCreating(false);
    if (success) {
      showSuccess('Category created!');
      setNewCategoryName('');
      setNewCategoryColor('#3b82f6');
    }
  }, [newCategoryName, newCategoryColor, onCategoryCreated]);

  const handleStartEdit = useCallback((category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryColor(category.color);
  }, []);

  const handleSaveEdit = useCallback(async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      showError('Category name cannot be empty.');
      return;
    }
    setIsUpdating(true);
    const success = await onCategoryUpdated(categoryId, { name: editingCategoryName.trim(), color: editingCategoryColor });
    setIsUpdating(false);
    if (success) {
      showSuccess('Category updated!');
      setEditingCategoryId(null);
    }
  }, [editingCategoryName, editingCategoryColor, onCategoryUpdated]);

  const handleCancelEdit = useCallback(() => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingCategoryColor('');
  }, []);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    setIsDeleting(true);
    const success = await onCategoryDeleted(categoryId);
    setIsDeleting(false);
    if (success) {
      showSuccess('Category deleted!');
    }
  }, [onCategoryDeleted]);

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
          <div className="flex items-center gap-2">
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              disabled={isCreating}
              className="flex-grow"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 w-9 p-0" style={{ backgroundColor: newCategoryColor }} aria-label="Select color">
                  <span className="sr-only">Select color</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <HexColorPicker color={newCategoryColor} onChange={setNewCategoryColor} />
              </PopoverContent>
            </Popover>
            <Button onClick={handleCreateCategory} disabled={isCreating || !newCategoryName.trim()}>
              {isCreating ? <span className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center">No categories yet. Add one above!</p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                  {editingCategoryId === category.id ? (
                    <>
                      <Input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        disabled={isUpdating}
                        className="flex-grow"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-8 w-8 p-0" style={{ backgroundColor: editingCategoryColor }} aria-label="Select color">
                            <span className="sr-only">Select color</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <HexColorPicker color={editingCategoryColor} onChange={setEditingCategoryColor} />
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(category.id)} disabled={isUpdating || !editingCategoryName.trim()}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isUpdating}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-grow">
                        <span className={cn("h-3 w-3 rounded-full")} style={{ backgroundColor: category.color }} />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleStartEdit(category)} disabled={isUpdating || isDeleting}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)} disabled={isUpdating || isDeleting}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
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