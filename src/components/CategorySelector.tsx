"use client";

import React, { useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react'; // Removed Plus
import { Category } from '@/hooks/useTasks';
import ManageCategoriesDialog from './ManageCategoriesDialog';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  onCategoryCreated: (name: string, color: string) => Promise<string | null>;
  onCategoryUpdated: (categoryId: string, updates: Partial<Category>) => Promise<boolean>;
  onCategoryDeleted: (categoryId: string) => Promise<boolean>;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
}) => {
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const handleCategoryCreated = useCallback(async (name: string, color: string) => {
    const newId = await onCategoryCreated(name, color);
    if (newId) {
      onChange(newId); // Select the newly created category
    }
    return newId;
  }, [onCategoryCreated, onChange]);

  const handleCategoryDeleted = useCallback(async (categoryId: string) => {
    const success = await onCategoryDeleted(categoryId);
    if (success && value === categoryId) {
      // If the currently selected category is deleted, try to select the first available category
      onChange(categories.find(c => c.id !== categoryId)?.id || '');
    }
    return success;
  }, [onCategoryDeleted, value, onChange, categories]);

  return (
    <div>
      <Label htmlFor="category-select">Category</Label>
      <div className="flex gap-1.5">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="category-select" className="h-9 text-base flex-grow">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsManageCategoriesOpen(true)}
          className="h-9 w-9"
          aria-label="Manage categories"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        onCategoryUpdated={onCategoryUpdated}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </div>
  );
};

export default CategorySelector;