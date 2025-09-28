import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { Category } from '@/hooks/useTasks';
import ManageCategoriesDialog from './ManageCategoriesDialog';

interface CategorySelectorProps {
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  categories: Category[];
  onOpenManageCategories: () => void;
  isManageCategoriesOpen: boolean;
  setIsManageCategoriesOpen: (isOpen: boolean) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  categories,
  onOpenManageCategories,
  isManageCategoriesOpen,
  setIsManageCategoriesOpen,
}) => {
  const handleCategoryCreated = () => {
    // No specific action needed here, as categories are refetched by useTasks
  };

  const handleCategoryDeleted = (deletedId?: string) => { // Adjusted signature
    if (deletedId && selectedCategory === deletedId) {
      onCategoryChange(null); // Clear selected category if it was deleted
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Select value={selectedCategory || "all"} onValueChange={(value) => onCategoryChange(value === "all" ? null : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={onOpenManageCategories}>
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>

      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </>
  );
};

export default CategorySelector;