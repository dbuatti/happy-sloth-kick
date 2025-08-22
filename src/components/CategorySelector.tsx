"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategoryColorProps } from '@/lib/categoryColors';
import { TaskCategory } from '@/types/task'; // Corrected import
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  categories: TaskCategory[];
  placeholder?: string;
  className?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  categories,
  placeholder = "Select category",
  className,
}) => {
  const currentCategory = categories.find(cat => cat.id === selectedCategory);
  const currentCategoryProps = currentCategory ? getCategoryColorProps(currentCategory.color) : null;

  return (
    <Select
      value={selectedCategory || ""}
      onValueChange={(value) => onSelectCategory(value === "null" ? null : value)}
    >
      <SelectTrigger className={cn("w-full justify-start", className, currentCategoryProps?.backgroundClass, currentCategoryProps ? "text-white" : "")}>
        <SelectValue placeholder={placeholder}>
          {currentCategory ? (
            <span className="flex items-center">
              <span className={cn("w-2 h-2 rounded-full mr-2", currentCategoryProps?.dotColor)}></span>
              {currentCategory.name}
            </span>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="null" className="text-muted-foreground">
          No Category
        </SelectItem>
        {categories.map((category) => {
          const { dotColor, name } = getCategoryColorProps(category.color);
          return (
            <SelectItem key={category.id} value={category.id}>
              <span className="flex items-center">
                <span className={cn("w-2 h-2 rounded-full mr-2", dotColor)}></span>
                {name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default CategorySelector;