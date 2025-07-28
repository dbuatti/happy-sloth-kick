import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  color: string;
}

const colors = [
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Yellow', value: 'bg-yellow-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Gray', value: 'bg-gray-500' },
];

interface CategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
  userId: string | null;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, userId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0].value);

  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId]);

  const fetchCategories = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      showError('Failed to fetch categories');
      console.error('Error fetching categories:', error);
    }
  };

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
          { name: newCategoryName, color: selectedColor, user_id: userId }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setCategories([...categories, data]);
      setNewCategoryName('');
      setSelectedColor(colors[0].value);
      showSuccess('Category created successfully');
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
      
      setCategories(categories.filter(cat => cat.id !== categoryId));
      if (value === categoryId) {
        onChange('general'); // Default to 'general' if the deleted category was selected
      }
      showSuccess('Category deleted successfully');
    } catch (error: any) {
      showError('Failed to delete category');
      console.error('Error deleting category:', error);
    }
  };

  const selectedCategory = categories.find(cat => cat.id === value);

  return (
    <div className="space-y-2">
      <Label>Category</Label>
      <div className="flex space-x-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              {selectedCategory ? (
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCategory.color.replace('bg-', '').replace('-', '') }}></div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              )}
              <SelectValue placeholder="Select category" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                General
              </div>
            </SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color.replace('bg-', '').replace('-', '') }}></div>
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="icon" variant="outline">
              <Plus className="h-4 w-4" />
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
                    {categories.map(category => (
                      <li key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color.replace('bg-', '').replace('-', '') }}></div>
                          <span>{category.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteCategory(category.id)}
                          aria-label={`Delete ${category.name}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
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
                    {colors.map(color => (
                      <button
                        key={color.value}
                        className={`w-8 h-8 rounded-full ${color.value} ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                        onClick={() => setSelectedColor(color.value)}
                        aria-label={color.name}
                      />
                    ))}
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