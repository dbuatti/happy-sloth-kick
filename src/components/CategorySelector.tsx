import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from '@/hooks/useTasks'; // Assuming Category is imported from useTasks
import { cn } from '@/lib/utils';
import { getCategoryColorProps, categoryColors } from '@/utils/taskUtils'; // Assuming these exist

interface CategorySelectorProps {
  categories: Category[];
  value: string | undefined | null; // Allow null for no category
  onChange: (categoryId: string | null) => void; // Changed to string | null
  disabled?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ categories, value, onChange, disabled }) => {
  const selectedCategory = categories.find(cat => cat.id === value);
  const selectedCategoryColorProps = selectedCategory ? getCategoryColorProps(selectedCategory.color ?? 'gray') : getCategoryColorProps('gray');

  return (
    <Select value={value ?? 'no-category'} onValueChange={(val) => onChange(val === 'no-category' ? null : val)} disabled={disabled}>
      <SelectTrigger className="w-full h-9 text-base">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", selectedCategoryColorProps.bgColor)} />
          <SelectValue placeholder="Select category">
            {selectedCategory ? selectedCategory.name : "No Category"}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="no-category">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", getCategoryColorProps('gray').bgColor)} />
            No Category
          </div>
        </SelectItem>
        {categories.map(category => {
          const colorProps = getCategoryColorProps(category.color ?? 'gray');
          return (
            <SelectItem key={category.id} value={category.id}>
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", colorProps.bgColor)} />
                {category.name}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default CategorySelector;