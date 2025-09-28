"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ChevronDown, Edit, Trash2, AlertTriangle, CircleX } from 'lucide-react'; // Added AlertTriangle and CircleX
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { MealStaple } from '@/hooks/useMealStaples'; // Import MealStaple type


interface StapleItemDisplayProps {
  staple: MealStaple;
  onUpdate: (id: string, updates: Partial<MealStaple>) => Promise<any>;
  onOpenEditDialog: (staple: MealStaple) => void;
  onOpenDeleteDialog: (staple: MealStaple) => void;
  isDemo?: boolean;
}

const StapleItemDisplay: React.FC<StapleItemDisplayProps> = ({
  staple,
  onUpdate,
  onOpenEditDialog,
  onOpenDeleteDialog,
  isDemo = false,
}) => {
  const [localCurrentQuantity, setLocalCurrentQuantity] = useState(staple.current_quantity);
  const debouncedCurrentQuantity = useDebounce(localCurrentQuantity, 500);

  // This ref stores the quantity that was last successfully committed to the server
  // or the initial quantity from props. It helps distinguish internal vs. external updates.
  const lastCommittedQuantityRef = useRef(staple.current_quantity);

  // Effect to update local state when prop changes, but only if it's an external change
  useEffect(() => {
    // If the incoming prop value is different from what we last committed
    // (meaning an external change or initial load), then update local state.
    if (staple.current_quantity !== lastCommittedQuantityRef.current) {
      setLocalCurrentQuantity(staple.current_quantity);
      lastCommittedQuantityRef.current = staple.current_quantity; // Update ref to reflect new server state
    }
  }, [staple.current_quantity]); // Only re-run when the prop changes

  // Effect to send updates to the backend after debounce
  useEffect(() => {
    if (isDemo) return;

    // Only send update if the debounced value is different from the last committed value
    // This prevents sending redundant updates if the debounced value is already what the server has.
    if (debouncedCurrentQuantity !== lastCommittedQuantityRef.current) {
      onUpdate(staple.id, { current_quantity: debouncedCurrentQuantity });
      // Optimistically update ref to prevent re-sync from the first useEffect
      // when the prop eventually updates due to *this* component's action.
      lastCommittedQuantityRef.current = debouncedCurrentQuantity; 
    }
  }, [debouncedCurrentQuantity, staple.id, isDemo, onUpdate]);

  const isLow = localCurrentQuantity < staple.target_quantity;
  const isCritical = localCurrentQuantity === 0 && staple.target_quantity > 0;
  const isOverTarget = localCurrentQuantity > staple.target_quantity;

  const quantityColorClass = cn(
    isCritical && 'text-destructive',
    isLow && !isCritical && 'text-orange-500',
    isOverTarget && 'text-green-500'
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-xl shadow-sm bg-card border-l-4",
        isCritical && "border-destructive bg-destructive/5", // Added bg-destructive/5
        isLow && !isCritical && "border-orange-500 bg-orange-500/5", // Added bg-orange-500/5
        isOverTarget && "border-green-500",
        !isLow && !isCritical && !isOverTarget && "border-primary/20"
      )}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg truncate flex items-center gap-2">
          {staple.name}
          {isCritical && <CircleX className="h-4 w-4 text-destructive" />}
          {isLow && !isCritical && <AlertTriangle className="h-4 w-4 text-orange-500" />}
        </h3>
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
            <DropdownMenuItem onSelect={() => onOpenEditDialog(staple)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenDeleteDialog(staple)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default StapleItemDisplay;