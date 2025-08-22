import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { TaskCategory } from '@/types/task';
import ManageCategoriesDialog from './ManageCategoriesDialog';
import { CategorySelectorProps } from '@/types/props';
import { getCategoryColorProps } from '@/utils/categoryColors';

const CategorySelector: React.FC<CategorySelectorProps> = ({
  allCategories, // Renamed from categories to allCategories for consistency
  selectedCategory,
  onSelectCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  sections, // Added from TaskManagementProps
  updateSection, // Added from TaskManagementProps
  deleteSection, // Added from TaskManagementProps
  updateSectionIncludeInFocusMode, // Added from TaskManagementProps
  createSection, // Added from TaskManagementProps
}) => {
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = React.useState(false);

  return (
    <div className="flex items-center space-x-2">
      <Select value={selectedCategory || 'all'} onValueChange={(value: string) => onSelectCategory(value === 'all' ? 'all' : value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {allCategories.map((category) => (
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
        allCategories={allCategories}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        sections={sections}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createSection={createSection}
      />
    </div>
  );
};

export default CategorySelector;