"use client";

import React from 'react';
import { MealStaple } from '@/hooks/useMealStaples';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Edit, Trash2, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSound } from '@/context/SoundContext';

interface StapleItemDisplayProps {
  staple: MealStaple;
  onUpdate: (id: string, updates: Partial<MealStaple>) => Promise<any>;
  onOpenEditDialog: (staple: MealStaple) => void;
  onOpenDeleteDialog: (staple: MealStaple) => void;
  isDemo?: boolean;
  isOverlay?: boolean; // For DND overlay styling
}

const StapleItemDisplay: React.FC<StapleItemDisplayProps> = ({
  staple,
  onUpdate,
  onOpenEditDialog,
  onOpenDeleteDialog,
  isDemo = false,
  isOverlay = false,
}) => {
  const { playSound } = useSound();
  const [currentQuantity, setCurrentQuantity] = React.useState(staple.current_quantity);
  const [isUpdatingQuantity, setIsUpdatingQuantity] = React.useState(false);

  React.useEffect(() => {
    setCurrentQuantity(staple.current_quantity);
  }, [staple.current_quantity]);

  const handleQuantityChange = async (newValue: number) => {
    if (isDemo) return;
    const clampedValue = Math.max(0, newValue);
    setCurrentQuantity(clampedValue);
    setIsUpdatingQuantity(true);
    try {
      await onUpdate(staple.id, { current_quantity: clampedValue });
      if (clampedValue < staple.target_quantity) {
        playSound('negative');
      } else if (clampedValue >= staple.target_quantity && staple.current_quantity < staple.target_quantity) {
        playSound('success');
      }
    } catch (error) {
      console.error('Failed to update staple quantity:', error);
      // Revert on error
      setCurrentQuantity(staple.current_quantity);
    } finally {
      setIsUpdatingQuantity(false);
    }
  };

  const progress = staple.target_quantity > 0
    ? Math.min(100, (currentQuantity / staple.target_quantity) * 100)
    : (currentQuantity > 0 ? 100 : 0);

  const needsShopping = currentQuantity < staple.target_quantity;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-4 rounded-xl shadow-sm border transition-all duration-200 ease-in-out",
        needsShopping ? "border-red-400 bg-red-50/50 dark:bg-red-950/20" : "border-green-400 bg-green-50/50 dark:bg-green-950/20",
        isOverlay && "ring-2 ring-primary ring-offset-2",
        isDemo && "opacity-70 cursor-not-allowed"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {needsShopping ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <ShoppingCart className="h-4 w-4 text-red-600" />
              </TooltipTrigger>
              <TooltipContent>Needs shopping</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </TooltipTrigger>
              <TooltipContent>In stock</TooltipContent>
            </Tooltip>
          )}
          <h4 className="text-lg font-semibold">{staple.name}</h4>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => onOpenEditDialog(staple)}
            disabled={isDemo}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onOpenDeleteDialog(staple)}
            disabled={isDemo}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(currentQuantity - 1)}
          disabled={isUpdatingQuantity || isDemo || currentQuantity <= 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={currentQuantity}
          onChange={(e) => setCurrentQuantity(Number(e.target.value))}
          onBlur={(e) => handleQuantityChange(Number(e.target.value))}
          className="w-20 text-center h-8"
          min="0"
          disabled={isUpdatingQuantity || isDemo}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(currentQuantity + 1)}
          disabled={isUpdatingQuantity || isDemo}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          {staple.unit || 'unit(s)'} (Target: {staple.target_quantity})
        </span>
      </div>

      <Progress
        value={progress}
        className={cn(
          "h-2",
          needsShopping ? "bg-red-200" : "bg-green-200"
        )}
        indicatorClassName={needsShopping ? "bg-red-500" : "bg-green-500"}
      />
    </div>
  );
};

export default StapleItemDisplay;