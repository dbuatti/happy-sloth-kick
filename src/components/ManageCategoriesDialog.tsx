import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Category } from '@/hooks/useTasks'; // Assuming Category is imported from useTasks
import { getCategoryColorProps, categoryColors } from '@/utils/taskUtils'; // Assuming these exist

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  createCategory: (name: string, color?: string) => Promise<Category | null>;
  updateCategory: (categoryId: string, updates: Partial<Omit<Category, 'id' | 'user_id'>>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
}

const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  isOpen,
  onClose,
  categories,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColors[0].value);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNewCategoryName('');
      setNewCategoryColor(categoryColors[0].value);
      setEditingCategory(null);
      setEditingName('');
      setEditingColor('');
    }
  }, [isOpen]);

  const handleCreateCategory = async () => {
    if (newCategoryName.trim()) {
      await createCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor(categoryColors[0].value);
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setEditingName(category.name);
    setEditingColor(category.color || categoryColors[0].value); // Use existing color or default
  };

  const handleSaveEdit = async () => {
    if (editingCategory && editingName.trim()) {
      await updateCategory(editingCategory.id, { name: editingName.trim(), color: editingColor });
      setEditingCategory(null);
      setEditingName('');
      setEditingColor('');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This cannot be undone.')) {
      await deleteCategory(categoryId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <h4 className="font-semibold">Add New Category</h4>
            <div className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <select
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="p-2 border rounded-md"
                style={{ backgroundColor: getCategoryColorProps(newCategoryColor).bgColor, color: getCategoryColorProps(newCategoryColor).textColor }}
              >
                {categoryColors.map(color => (
                  <option key={color.value} value={color.value} style={{ backgroundColor: color.bgColor, color: color.textColor }}>
                    {color.label}
                  </option>
                ))}
              </select>
              <Button onClick={handleCreateCategory} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <hr className="my-4" />

          <div className="space-y-2">
            <h4 className="font-semibold">Existing Categories</h4>
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">No categories yet.</p>
            ) : (
              <ul className="space-y-2">
                {categories.map(category => {
                  const colorProps = getCategoryColorProps(category.color ?? 'gray'); // Ensure color is handled
                  return (
                    <li key={category.id} className="flex items-center gap-2">
                      {editingCategory?.id === category.id ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            className="flex-grow"
                          />
                          <select
                            value={editingColor}
                            onChange={(e) => setEditingColor(e.target.value)}
                            className="p-2 border rounded-md"
                            style={{ backgroundColor: getCategoryColorProps(editingColor).bgColor, color: getCategoryColorProps(editingColor).textColor }}
                          >
                            {categoryColors.map(color => (
                              <option key={color.value} value={color.value} style={{ backgroundColor: color.bgColor, color: color.textColor }}>
                                {color.label}
                              </option>
                            ))}
                          </select>
                          <Button onClick={handleSaveEdit} size="sm">Save</Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingCategory(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <span className={cn("h-3 w-3 rounded-full flex-shrink-0", colorProps.bgColor)} />
                          <span className="flex-grow">{category.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleStartEdit(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesDialog;