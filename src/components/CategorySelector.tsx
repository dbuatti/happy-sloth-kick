import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

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
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0].value);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
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

    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert([
          { name: newCategoryName, color: selectedColor }
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
    try {
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      setCategories(categories.filter(cat => cat.id !== categoryId));
      if (value === categoryId) {
        onChange('general');
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
        <div className="flex-1">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
          >
            <option value="general">General</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Work, Personal, Shopping"
                />
              </div>
              <div>
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
              <Button onClick={createCategory} className="w-full">Create Category</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {selectedCategory && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className={`w-3 h-3 rounded-full ${selectedCategory.color}`}></div>
          <span>{selectedCategory.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => deleteCategory(selectedCategory.id)}
            aria-label="Delete category"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;