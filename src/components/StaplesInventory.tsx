import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, UtensilsCrossed, Edit, Trash2, Minus, ChevronDown, ShoppingCart } from 'lucide-react'; // Removed GripVertical
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
import { showError } from '@/utils/toast';

import {
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import SortableStapleItem from './SortableStapleItem';
import StapleItemDisplay from './StapleItemDisplay'; // Import the new component

interface StaplesInventoryProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const commonUnits = ['unit', 'g', 'kg', 'ml', 'L', 'cans', 'bags', 'boxes', 'bottles', 'pieces', 'packs'];

const StaplesInventory: React.FC<StaplesInventoryProps> = ({ isDemo = false, demoUserId }) => {
  const { staples, loading, addStaple, updateStaple, deleteStaple, reorderStaples } = useMealStaples({ userId: demoUserId });

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingStaple, setEditingStaple] = useState<MealStaple | null>(null);
  const [stapleName, setStapleName] = useState('');
  const [targetQuantity, setTargetQuantity] = useState<number | ''>(0);
  const [currentQuantity, setCurrentQuantity] = useState<number | ''>(0);
  const [unit, setUnit] = useState('unit');
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [stapleToDelete, setStapleToDelete] = useState<MealStaple | null>(null);

  const [quickAddStapleName, setQuickAddStapleName] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // DND state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeStaple, setActiveStaple] = useState<MealStaple | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: !isDemo,
    })
  );

  const stapleIds = staples.map(s => s.id);

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

  // Wrapper function for onUpdate to match StapleItemDisplay's expected signature
  const handleUpdateStapleWrapper = async (id: string, updates: Partial<MealStaple>) => {
    if (isDemo) return;
    await updateStaple({ id, updates });
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

  // DND Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    const activeStaple = staples.find(s => s.id === event.active.id);
    setActiveStaple(activeStaple || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveStaple(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = stapleIds.indexOf(String(active.id));
    const newIndex = stapleIds.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(stapleIds, oldIndex, newIndex);
    await reorderStaples(newOrder);
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stapleIds} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3">
                {staples.map(staple => (
                  <SortableStapleItem
                    key={staple.id}
                    staple={staple}
                    onUpdate={handleUpdateStapleWrapper}
                    onOpenEditDialog={handleOpenAddEditDialog}
                    onOpenDeleteDialog={handleOpenDeleteDialog}
                    isDemo={isDemo}
                  />
                ))}
              </ul>
            </SortableContext>
            {createPortal(
              <DragOverlay dropAnimation={null}>
                {activeStaple ? (
                  <SortableStapleItem
                    staple={activeStaple}
                    onUpdate={handleUpdateStapleWrapper}
                    onOpenEditDialog={handleOpenAddEditDialog}
                    onOpenDeleteDialog={handleOpenDeleteDialog}
                    isDemo={isDemo}
                    isOverlay={true}
                  />
                ) : null}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
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