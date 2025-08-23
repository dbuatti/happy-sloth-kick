import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';
import { TaskCategory } from '@/types'; // Corrected import

interface CategorySelectorProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  categories: TaskCategory[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  categories,
}) => {
  const currentCategory = categories.find(cat => cat.id === selectedCategory);

  return (
    <Select value={selectedCategory || ''} onValueChange={(value) => onSelectCategory(value || null)}>
      <SelectTrigger className="w-[180px]">
        {currentCategory ? (
          <div className="flex items-center">
            <div className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(currentCategory.color as CategoryColorKey).bgColor}`} />
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
              <div className={`h-4 w-4 rounded-full mr-2 ${getCategoryColorProps(category.color as CategoryColorKey).bgColor}`} />
              {category.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CategorySelector;