import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';
import { TaskCategory } from '@/types'; // Corrected import to TaskCategory

interface CategorySelectorProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  categories: TaskCategory[];
  label?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  categories,
  label = 'Category',
}) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectedCategory || ''}
        onValueChange={(value) => onSelectCategory(value === '' ? null : value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <div className="flex items-center">
                <span
                  className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(category.color as CategoryColorKey).bg}`}
                />
                {category.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CategorySelector;