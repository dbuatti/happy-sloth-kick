import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskCategory } from '@/types';
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';

interface CategorySelectorProps {
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  categories: TaskCategory[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategory, onCategoryChange, categories }) => {
  const currentCategory = categories.find(cat => cat.id === selectedCategory);

  return (
    <Select onValueChange={(value) => onCategoryChange(value === "" ? null : value)} value={selectedCategory || ""}>
      <SelectTrigger className="w-[180px]">
        {currentCategory ? (
          <div className="flex items-center">
            <div className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(currentCategory.color as CategoryColorKey).backgroundClass}`} />
            <SelectValue>{currentCategory.name}</SelectValue>
          </div>
        ) : (
          <SelectValue placeholder="Select Category" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">No Category</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center">
              <div className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(category.color as CategoryColorKey).backgroundClass}`} />
              {category.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CategorySelector;