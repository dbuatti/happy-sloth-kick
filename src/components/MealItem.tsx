import React, { useState, useEffect, useRef } from 'react';
import { Meal, MealType } from '@/hooks/useMeals';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format, parseISO, isSameDay, isPast, setHours, setMinutes, addHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { ShoppingCart, CheckCircle2, XCircle, UtensilsCrossed, Coffee, Soup } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/useDebounce';

interface MealItemProps {
  meal: Meal;
  currentDate: Date;
  onUpdate: (id: string, updates: Partial<Meal>) => Promise<any>;
  isDemo?: boolean;
}

const MEAL_TIMES: Record<MealType, { hour: number; minute: number }> = {
  breakfast: { hour: 7, minute: 0 },
  lunch: { hour: 12, minute: 0 },
  dinner: { hour: 18, minute: 0 },
};

const MealItem: React.FC<MealItemProps> = ({ meal, currentDate, onUpdate, isDemo = false }) => {
  const [name, setName] = useState(meal.name);
  const [notes, setNotes] = useState(meal.notes || '');
  const [hasIngredients, setHasIngredients] = useState(meal.has_ingredients);
  const [isCompleted, setIsCompleted] = useState(meal.is_completed);

  const debouncedName = useDebounce(name, 500);
  const debouncedNotes = useDebounce(notes, 500);

  const isPlaceholder = meal.id.startsWith('placeholder-');

  useEffect(() => {
    setName(meal.name);
    setNotes(meal.notes || '');
    setHasIngredients(meal.has_ingredients);
    setIsCompleted(meal.is_completed);
  }, [meal]);

  // Sync debounced changes to database
  useEffect(() => {
    if (!isDemo && !isPlaceholder) {
      if (debouncedName !== meal.name) {
        onUpdate(meal.id, { name: debouncedName });
      }
    }
  }, [debouncedName, meal.name, onUpdate, isDemo, isPlaceholder]);

  useEffect(() => {
    if (!isDemo && !isPlaceholder) {
      if (debouncedNotes !== (meal.notes || '')) {
        onUpdate(meal.id, { notes: debouncedNotes });
      }
    }
  }, [debouncedNotes, meal.notes, onUpdate, isDemo, isPlaceholder]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleHasIngredientsChange = async (checked: boolean) => {
    if (isDemo) return;
    setHasIngredients(checked);
    if (isPlaceholder) {
      // If it's a placeholder, create a new meal first
      await onUpdate(meal.id, { ...meal, name: name || `${meal.meal_type} meal`, has_ingredients: checked });
    } else {
      await onUpdate(meal.id, { has_ingredients: checked });
    }
  };

  const handleIsCompletedChange = async (checked: boolean) => {
    if (isDemo) return;
    setIsCompleted(checked);
    if (isPlaceholder) {
      // If it's a placeholder, create a new meal first
      await onUpdate(meal.id, { ...meal, name: name || `${meal.meal_type} meal`, is_completed: checked });
    } else {
      await onUpdate(meal.id, { is_completed: checked });
    }
  };

  const mealDate = parseISO(meal.meal_date);
  const isToday = isSameDay(mealDate, currentDate);
  const isTomorrow = isSameDay(mealDate, addDays(currentDate, 1));

  const mealTime = MEAL_TIMES[meal.meal_type];
  const mealDateTime = setMinutes(setHours(mealDate, mealTime.hour), mealTime.minute);
  const formattedTime = format(mealDateTime, 'h:mm a');

  const getMealIcon = (type: MealType) => {
    switch (type) {
      case 'breakfast': return <Coffee className="h-4 w-4 text-muted-foreground" />;
      case 'lunch': return <Soup className="h-4 w-4 text-muted-foreground" />;
      case 'dinner': return <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getIngredientStatusIcon = () => {
    if (hasIngredients) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else {
      return <ShoppingCart className="h-5 w-5 text-red-500" />;
    }
  };

  const getIngredientStatusClasses = () => {
    if (hasIngredients) {
      return "border-green-500/30 bg-green-500/5";
    } else {
      return "border-red-500/30 bg-red-500/5";
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-4 rounded-xl shadow-sm transition-all duration-200 ease-in-out",
        "border-l-4",
        isCompleted ? "opacity-70 bg-muted/30 border-muted-foreground/20" : "bg-card border-primary/20 hover:shadow-md",
        !isCompleted && getIngredientStatusClasses()
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getMealIcon(meal.meal_type)}
          <span className="text-sm font-semibold text-muted-foreground">
            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(mealDate, 'EEE, MMM d')} - {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)} ({formattedTime})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", isDemo && "cursor-not-allowed")}
                onClick={() => handleHasIngredientsChange(!hasIngredients)}
                disabled={isDemo}
              >
                {getIngredientStatusIcon()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasIngredients ? 'Ingredients ready!' : 'Need to shop for ingredients'}
            </TooltipContent>
          </Tooltip>
          <Checkbox
            id={`completed-${meal.id}`}
            checked={isCompleted}
            onCheckedChange={handleIsCompletedChange}
            disabled={isDemo}
            className="h-5 w-5"
          />
          <label htmlFor={`completed-${meal.id}`} className="sr-only">Mark as completed</label>
        </div>
      </div>

      <Input
        value={name}
        onChange={handleNameChange}
        placeholder={`Add ${meal.meal_type} meal name...`}
        className={cn(
          "text-lg font-bold border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto",
          isCompleted && "line-through text-muted-foreground"
        )}
        disabled={isDemo || isCompleted}
      />
      <Textarea
        value={notes}
        onChange={handleNotesChange}
        placeholder="Add notes or short description..."
        rows={2}
        className={cn(
          "text-sm border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto resize-none",
          isCompleted && "line-through text-muted-foreground"
        )}
        disabled={isDemo || isCompleted}
      />
    </div>
  );
};

export default MealItem;