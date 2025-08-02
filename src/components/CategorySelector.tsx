import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { categoryColorMap, CategoryColorKey, getCategoryColorProps } from '@/lib/categoryColors';
import { Category } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import ManageCategoriesDialog from './ManageCategoriesDialog'; // Import the new dialog

interface CategorySelectorProps {
  value: string; // This is the category ID
  onChange: (categoryId: string) => void;
  categories: Category[]; // Now receives categories as a prop
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, categories }) => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id || null; // Get userId from useAuth

  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const selectedCategory = categories.find(cat => cat.id === value);
  const selectedCategoryColorProps = selectedCategory ? getCategoryColorProps(selectedCategory.color) : getCategoryColorProps('gray');

  // These callbacks are now passed to ManageCategoriesDialog
  const handleCategoryCreated = () => {
    // The useTasks hook will automatically refetch categories due to real-time subscription
    // No explicit action needed here other than closing the dialog if desired, but it's managed by ManageCategoriesDialog itself
  };

  const handleCategoryDeleted = (deletedId: string) => {
    // If the currently selected category was deleted, switch to 'general' or first available
    if (value === deletedId) {
      const generalCategory = categories.find(cat => cat.name.toLowerCase() === 'general');
      if (generalCategory) {
        onChange(generalCategory.id);
      } else if (categories.length > 0) {
        onChange(categories[0].id);
      } else {
        onChange(''); // No categories left
      }
    }
    // useTasks hook will handle the actual state update for categories
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
          <Plus className="h-3.5 w-3.5" />
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