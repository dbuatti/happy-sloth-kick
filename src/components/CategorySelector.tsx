"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCategory } from '@/types'; // Import TaskCategory from @/types
import { getCategoryColorProps } from '@/lib/categoryColors';

interface CategorySelectorProps {
  categories: TaskCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  placeholder?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  placeholder = "Select category",
}) => {
  return (
    <Select
      value={selectedCategory || ""}
      onValueChange={(value) => onSelectCategory(value === "" ? null : value)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full mr-2 bg-gray-400" />
            None
          </div>
        </SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center">
              <span
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: getCategoryColorProps(category.color as any).bg }}
              />
              {category.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};