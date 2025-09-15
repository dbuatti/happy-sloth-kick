import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { Category } from '@/hooks/useTasks';
import ManageCategoriesDialog from './ManageCategoriesDialog';

interface CategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, categories }) => {
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const selectedCategory = categories.find(cat => cat.id === value);
  const selectedCategoryColorProps = selectedCategory ? getCategoryColorProps(selectedCategory.color) : getCategoryColorProps('gray');

  const handleCategoryCreated = () => {
    // The useTasks hook will automatically refetch categories due to real-time subscription
  };

  const handleCategoryDeleted = (deletedId: string) => {
    if (value === deletedId) {
      const generalCategory = categories.find(cat => cat.name.toLowerCase() === 'general');
      if (generalCategory) {
        onChange(generalCategory.id);
      } else if (categories.length > 0) {
        onChange(categories[0].id);
      } else {
        onChange('');
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>Category</Label>
      <div className="flex space-x-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 min-w-0 h-9 text-base">
            <SelectValue placeholder="Select category">
              <div className="flex items-center gap-2 w-full">
                <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center border", selectedCategoryColorProps.backgroundClass, selectedCategoryColorProps.dotBorder)}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedCategoryColorProps.dotColor }}></div>
                </div>
                <span className="flex-1 min-w-0 truncate">
                  {selectedCategory ? selectedCategory.name : 'Select category'}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            {categories.map(category => {
              const colorProps = getCategoryColorProps(category.color);
              return (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border" style={{ backgroundColor: colorProps.dotColor }}></div>
                    {category.name}
                  </div >
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={() => setIsManageCategoriesOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        </Button>
      </div>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </div>
  );
};

export default CategorySelector;