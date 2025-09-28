"use client";

import React, { useState } from 'react';
import { MealStaple, UpdateMealStapleData } from '@/hooks/useMealStaples';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, Minus, Edit, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StapleItemProps {
  staple: MealStaple;
  onUpdate: (id: string, updates: UpdateMealStapleData) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  isDemo?: boolean;
}

const StapleItem: React.FC<StapleItemProps> = ({ staple, onUpdate, onDelete, isDemo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(staple.name);
  const [editTargetQuantity, setEditTargetQuantity] = useState(staple.target_quantity);
  const [editUnit, setEditUnit] = useState(staple.unit || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: staple.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
  };

  const handleSaveEdit = async () => {
    if (isDemo) return;
    await onUpdate(staple.id, {
      name: editName,
      target_quantity: editTargetQuantity,
      unit: editUnit,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(staple.name);
    setEditTargetQuantity(staple.target_quantity);
    setEditUnit(staple.unit || '');
    setIsEditing(false);
  };

  const handleQuantityChange = async (delta: number) => {
    if (isDemo) return;
    const newQuantity = Math.max(0, staple.current_quantity + delta);
    await onUpdate(staple.id, { current_quantity: newQuantity });
  };

  const isBelowTarget = staple.current_quantity < staple.target_quantity;
  const isAtTarget = staple.current_quantity === staple.target_quantity;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex items-center justify-between p-3 rounded-lg shadow-sm bg-card text-card-foreground border",
        isDragging && "ring-2 ring-primary ring-offset-2",
        isBelowTarget && "border-orange-400 bg-orange-50/50 dark:bg-orange-950/30",
        isAtTarget && "border-green-400 bg-green-50/50 dark:bg-green-950/30",
        isDemo && "opacity-70 cursor-not-allowed"
      )}
    >
      <div className="flex-1 grid grid-cols-3 items-center gap-2 pr-4">
        <span className="font-semibold text-base col-span-1 truncate" {...listeners} {...attributes}>
          {staple.name}
        </span>
        <div className="flex items-center gap-1 col-span-1 justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => handleQuantityChange(-1)}
            disabled={isDemo || staple.current_quantity <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className={cn(
            "font-mono text-sm w-8 text-center",
            isBelowTarget && "text-orange-600 dark:text-orange-400",
            isAtTarget && "text-green-600 dark:text-green-400"
          )}>
            {staple.current_quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => handleQuantityChange(1)}
            disabled={isDemo}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground col-span-1 text-right">
          Target: {staple.target_quantity} {staple.unit}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDemo}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditing(true)} disabled={isDemo}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive" disabled={isDemo}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Staple</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetQuantity" className="text-right">
                Target Qty
              </Label>
              <Input
                id="targetQuantity"
                type="number"
                value={editTargetQuantity}
                onChange={(e) => setEditTargetQuantity(parseInt(e.target.value) || 0)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">
                Unit
              </Label>
              <Input
                id="unit"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Check className="mr-2 h-4 w-4" /> Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{staple.name}"? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              if (!isDemo) onDelete(staple.id);
              setShowDeleteConfirm(false);
            }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StapleItem;