import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { TaskCategory } from '@/types/task';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import { CategorySelectorProps } from '@/types/props';
import { getCategoryColorProps } from '@/utils/categoryColors';

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = React.useState(false);

  return (
    <div className="flex items-center space-x-2">
      <Select value={selectedCategory || 'all'} onValueChange={onSelectCategory}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <div className="flex items-center">
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: getCategoryColorProps(category.color).bg }}
                />
                {category.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" onClick={() => setIsManageCategoriesOpen(true)}>
        <Settings className="h-4 w-4" />
      </Button>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />
    </div>
  );
};

export default CategorySelector;