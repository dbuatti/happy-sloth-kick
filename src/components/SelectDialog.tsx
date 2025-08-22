import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TwitterPicker } from 'react-color';
import { getCategoryColorProps, categoryColors } from '@/utils/categoryColors';

interface SelectDialogItem {
  id: string;
  name: string;
  color?: string; // Optional color for categories
}

interface SelectDialogProps {
  items: SelectDialogItem[];
  selectedItem: SelectDialogItem | null;
  onSelectItem: (item: SelectDialogItem | null) => void;
  createItem: (name: string, color?: string) => Promise<SelectDialogItem | null>;
  updateItem: (id: string, name: string, color?: string) => Promise<SelectDialogItem | null>;
  deleteItem: (id: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  enableColorPicker?: boolean; // For categories
}

const SelectDialog: React.FC<SelectDialogProps> = ({
  items,
  selectedItem,
  onSelectItem,
  createItem,
  updateItem,
  deleteItem,
  placeholder = 'Select item',
  className,
  enableColorPicker = false,
}) => {
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SelectDialogItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name);
      setItemColor(editingItem.color || '');
    } else {
      setItemName('');
      setItemColor('');
    }
  }, [editingItem]);

  const handleOpenAddEditDialog = (item: SelectDialogItem | null = null) => {
    setEditingItem(item);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) return;
    if (editingItem) {
      await updateItem(editingItem.id, itemName.trim(), enableColorPicker ? itemColor : undefined);
    } else {
      await createItem(itemName.trim(), enableColorPicker ? itemColor : undefined);
    }
    setIsAddEditDialogOpen(false);
    setItemName('');
    setItemColor('');
  };

  const handleConfirmDelete = (id: string) => {
    setItemToDelete(id);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteItem = async () => {
    if (itemToDelete) {
      await deleteItem(itemToDelete);
      if (selectedItem?.id === itemToDelete) {
        onSelectItem(null); // Deselect if the deleted item was selected
      }
      setIsConfirmDeleteOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        <Select
          value={selectedItem?.id || ''}
          onValueChange={(value) => onSelectItem(items.find((item) => item.id === value) || null)}
        >
          <SelectTrigger className="flex-grow">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex items-center">
                  {enableColorPicker && item.color && (
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: getCategoryColorProps(item.color).bg }}
                    />
                  )}
                  {item.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => setIsManageDialogOpen(true)}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {placeholder.replace('Select ', '')}s</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center">
                  {enableColorPicker && item.color && (
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: getCategoryColorProps(item.color).bg }}
                    />
                  )}
                  <span>{item.name}</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenAddEditDialog(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => handleOpenAddEditDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add New'} {placeholder.replace('Select ', '')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-name" className="text-right">
                Name
              </Label>
              <Input
                id="item-name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="col-span-3"
              />
            </div>
            {enableColorPicker && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item-color" className="text-right">
                  Color
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="col-span-3 justify-start" style={{ backgroundColor: itemColor || 'transparent' }}>
                      {itemColor || 'Select Color'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <TwitterPicker
                      color={itemColor}
                      onChangeComplete={(color: any) => setItemColor(color.hex)}
                      colors={Object.keys(categoryColors).map(key => categoryColors[key].bg)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItem ? 'Save Changes' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{items.find(item => item.id === itemToDelete)?.name}"?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SelectDialog;