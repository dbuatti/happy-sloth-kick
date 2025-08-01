import { useState, useEffect } from 'react';
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

interface CategorySelectorProps {
  value: string; // This is the category ID
  onChange: (categoryId: string) => void;
  userId: string | null;
  categories: Category[]; // Now receives categories as a prop
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, userId, categories }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColorKey, setSelectedColorKey] = useState<CategoryColorKey>('gray'); // Store the key

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      showError('Category name is required');
      return;
    }
    if (!userId) {
      showError("User not authenticated. Cannot create category.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert([
          { name: newCategoryName, color: selectedColorKey, user_id: userId } // Store the color key
        ])
        .select()
        .single();

      if (error) throw error;
      
      showSuccess('Category created successfully');
      setNewCategoryName('');
      setSelectedColorKey('gray'); // Reset to default
      setIsOpen(false); // Close dialog after creation
    } catch (error: any) {
      showError('Failed to create category');
      console.error('Error creating category:', error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!userId) {
      showError("User not authenticated. Cannot delete category.");
      return;
    }
    try {
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);

      if (error) throw error;
      
      // If the deleted category was selected, change to 'general'
      const generalCategory = categories.find(cat => cat.name.toLowerCase() === 'general');
      if (value === categoryId && generalCategory) {
        onChange(generalCategory.id); 
      }
      showSuccess('Category deleted successfully');
    } catch (error: any) {
      showError('Failed to delete category');
      console.error('Error deleting category:', error);
    }
  };

  const selectedCategory = categories.find(cat => cat.id === value);
  const selectedCategoryColorProps = selectedCategory ? getCategoryColorProps(selectedCategory.color) : getCategoryColorProps('gray');

  return (
    <div className="space-y-2">
      <Label>Category</Label>
      <div className="flex space-x-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 min-w-0">
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
                    <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center border", colorProps.backgroundClass, colorProps.dotBorder)}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorProps.dotColor }}></div>
                    </div>
                    {category.name}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="icon" variant="outline">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Existing categories list */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-md font-semibold">Existing Categories</h4>
                  <ul className="space-y-2">
                    {categories.map(category => {
                      const colorProps = getCategoryColorProps(category.color);
                      return (
                        <li key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center border", colorProps.backgroundClass, colorProps.dotBorder)}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorProps.dotColor }}></div>
                            </div>
                            <span>{category.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => deleteCategory(category.id)}
                            aria-label={`Delete ${category.name}`}
                            disabled={category.name.toLowerCase() === 'general'}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {/* New Category Form */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-md font-semibold mb-3">Create New Category</h4>
                <div>
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Work, Personal, Shopping"
                    autoFocus
                  />
                </div>
                <div className="mt-4">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.keys(categoryColorMap).filter(key => key !== 'general').map((colorKey) => {
                      const colorProps = getCategoryColorProps(colorKey);
                      return (
                        <button
                          key={colorKey}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 flex items-center justify-center",
                            colorProps.backgroundClass,
                            colorProps.dotBorder,
                            selectedColorKey === colorKey ? 'ring-2 ring-offset-2 ring-primary' : ''
                          )}
                          onClick={() => setSelectedColorKey(colorKey as CategoryColorKey)}
                          aria-label={colorProps.name}
                        >
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: colorProps.dotColor }}></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button onClick={createCategory} className="w-full" disabled={!newCategoryName.trim()}>Create Category</Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CategorySelector;