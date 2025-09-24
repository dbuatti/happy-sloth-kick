import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, UtensilsCrossed, Edit, Trash2, Minus, ChevronDown, ShoppingCart } from 'lucide-react'; // Added ShoppingCart for quick add icon
import { Skeleton } from '@/components/ui/skeleton';
import { useMealStaples, MealStaple, NewMealStapleData } from '@/hooks/useMealStaples';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { showError } from '@/utils/toast'; // Import showError

interface StaplesInventoryProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const commonUnits = ['unit', 'g', 'kg', 'ml', 'L', 'cans', 'bags', 'boxes', 'bottles', 'pieces', 'packs'];

const StaplesInventory: React.FC<StaplesInventoryProps> = ({ isDemo = false, demoUserId }) => {
  const { staples, loading, addStaple, updateStaple, deleteStaple } = useMealStaples({ userId: demoUserId });

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingStaple, setEditingStaple] = useState<MealStaple | null>(null);
  const [stapleName, setStapleName] = useState('');
  const [targetQuantity, setTargetQuantity] = useState<number | ''>(0);
  const [currentQuantity, setCurrentQuantity] = useState<number | ''>(0);
  const [unit, setUnit] = useState('unit');
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [stapleToDelete, setStapleToDelete] = useState<MealStaple | null>(null);

  const [quickAddStapleName, setQuickAddStapleName] = useState(''); // New state for quick add input
  const [isQuickAdding, setIsQuickAdding] = useState(false); // New state for quick add loading

  useEffect(() => {
    if (isAddEditDialogOpen) {
      if (editingStaple) {
        setStapleName(editingStaple.name);
        setTargetQuantity(editingStaple.target_quantity);
        setCurrentQuantity(editingStaple.current_quantity);
        setUnit(editingStaple.unit || 'unit');
      } else {
        setStapleName('');
        setTargetQuantity(0);
        setCurrentQuantity(0);
        setUnit('unit');
      }
    }
  }, [isAddEditDialogOpen, editingStaple]);

  const handleOpenAddEditDialog = (staple: MealStaple | null) => {
    setEditingStaple(staple);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveStaple = async () => {
    if (!stapleName.trim()) return;
    setIsSaving(true);

    const data: NewMealStapleData = {
      name: stapleName.trim(),
      target_quantity: Number(targetQuantity),
      current_quantity: Number(currentQuantity),
      unit: unit === 'unit' ? null : unit,
    };

    if (editingStaple) {
      await updateStaple({ id: editingStaple.id, updates: data });
    } else {
      await addStaple(data);
    }
    setIsSaving(false);
    setIsAddEditDialogOpen(false);
  };

  const handleOpenDeleteDialog = (staple: MealStaple) => {
    setStapleToDelete(staple);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteStaple = async () => {
    if (stapleToDelete) {
      setIsSaving(true);
      await deleteStaple(stapleToDelete.id);
      setIsSaving(false);
      setIsDeleteDialogOpen(false);
      setStapleToDelete(null);
    }
  };

  const handleQuantityChange = async (stapleId: string, newQuantity: number) => {
    if (isDemo) return;
    await updateStaple({ id: stapleId, updates: { current_quantity: newQuantity } });
  };

  const handleQuickAddStaple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddStapleName.trim()) {
      showError('Staple name cannot be empty.');
      return;
    }
    if (isDemo) return;

    setIsQuickAdding(true);
    try {
      await addStaple({
        name: quickAddStapleName.trim(),
        target_quantity: 0,
        current_quantity: 0,
        unit: null,
      });
      setQuickAddStapleName('');
    } catch (error) {
      console.error('Error quick adding staple:', error);
      showError('Failed to add staple.');
    } finally {
      setIsQuickAdding(false);
    }
  };

  const StapleItem: React.FC<{ staple: MealStaple }> = ({ staple }) => {
    const [localCurrentQuantity, setLocalCurrentQuantity] = useState(staple.current_quantity);
    const debouncedCurrentQuantity = useDebounce(localCurrentQuantity, 500);

    useEffect(() => {
      setLocalCurrentQuantity(staple.current_quantity);
    }, [staple.current_quantity]);

    useEffect(() => {
      if (isDemo || debouncedCurrentQuantity === staple.current_quantity) return;
      handleQuantityChange(staple.id, debouncedCurrentQuantity);
    }, [debouncedCurrentQuantity, staple.current_quantity, staple.id]);

    const isLow = localCurrentQuantity < staple.target_quantity;
    const isCritical = localCurrentQuantity === 0 && staple.target_quantity > 0;
    const isOverTarget = localCurrentQuantity > staple.target_quantity;

    const quantityColorClass = cn(
      isCritical && 'text-destructive',
      isLow && !isCritical && 'text-orange-500',
      isOverTarget && 'text-green-500'
    );

    return (
      <li
        className={cn(
          "flex items-center justify-between p-3 rounded-xl shadow-sm bg-card border-l-4",
          isCritical && "border-destructive",
          isLow && !isCritical && "border-orange-500",
          isOverTarget && "border-green-500",
          !isLow && !isCritical && !isOverTarget && "border-primary/20"
        )}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{staple.name}</h3>
          <p className="text-sm text-muted-foreground">Target: {staple.target_quantity} {staple.unit || 'unit'}</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocalCurrentQuantity(prev => Math.max(0, prev - 1))}
            disabled={isDemo || localCurrentQuantity <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={localCurrentQuantity}
            onChange={(e) => setLocalCurrentQuantity(Number(e.target.value))}
            className={cn("w-16 text-center font-bold h-9", quantityColorClass)}
            min="0"
            disabled={isDemo}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocalCurrentQuantity(prev => prev + 1)}
            disabled={isDemo}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleOpenAddEditDialog(staple)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenDeleteDialog(staple)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <form onSubmit={handleQuickAddStaple} className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Add a staple (e.g., 'Canned Tomatoes') and press Enter..."
            value={quickAddStapleName}
            onChange={(e) => setQuickAddStapleName(e.target.value)}
            className="flex-1 h-9 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            disabled={isQuickAdding || isDemo}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleQuickAddStaple(e as any);
              }
            }}
          />
          <Button type="submit" size="icon" variant="ghost" className="h-8 w-8" disabled={isQuickAdding || isDemo || !quickAddStapleName.trim()}>
            {isQuickAdding ? <span className="animate-spin h-3.5 w-3.5 border-b-2 border-primary rounded-full" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </form>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : staples.length === 0 ? (
          <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No staples added yet!</p>
            <p className="text-sm">Add your essential ingredients to keep track of your pantry.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {staples.map(staple => (
              <StapleItem key={staple.id} staple={staple} />
            ))}
          </ul>
        )}
      </div>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaple ? 'Edit Staple' : 'Add New Staple'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="staple-name">Staple Name</Label>
              <Input
                id="staple-name"
                value={stapleName}
                onChange={(e) => setStapleName(e.target.value)}
                placeholder="e.g., Canned Tomatoes"
                autoFocus
                disabled={isSaving || isDemo}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target-quantity">Target Quantity</Label>
                <Input
                  id="target-quantity"
                  type="number"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                  min="0"
                  disabled={isSaving || isDemo}
                />
              </div>
              <div>
                <Label htmlFor="current-quantity">Current Quantity</Label>
                <Input
                  id="current-quantity"
                  type="number"
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                  min="0"
                  disabled={isSaving || isDemo}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit} disabled={isSaving || isDemo}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {commonUnits.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditDialogOpen(false)} disabled={isSaving || isDemo}>Cancel</Button>
            <Button onClick={handleSaveStaple} disabled={isSaving || isDemo || !stapleName.trim()}>
              {isSaving ? 'Saving...' : 'Save Staple'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete "{stapleToDelete?.name}" from your staples.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving || isDemo}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStaple} disabled={isSaving || isDemo}>
              {isSaving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StaplesInventory;