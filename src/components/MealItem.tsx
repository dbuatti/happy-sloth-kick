"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Meal, MealType } from '@/hooks/useMeals';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format, parseISO, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { ShoppingCart, CheckCircle2, UtensilsCrossed, Coffee, Soup } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSound } from '@/context/SoundContext';

interface MealItemProps {
  meal: Meal;
  onUpdate: (id: string, updates: Partial<Meal>) => Promise<any>;
  isDemo?: boolean;
  isPlaceholder: boolean;
}

const MEAL_TIMES: Record<MealType, { hour: number; minute: number }> = {
  breakfast: { hour: 7, minute: 0 },
  lunch: { hour: 12, minute: 0 },
  dinner: { hour: 18, minute: 0 },
};

const MealItem: React.FC<MealItemProps> = ({ meal, onUpdate, isDemo = false, isPlaceholder }) => {
  const { playSound } = useSound();
  const [name, setName] = useState(meal.name);
  const [notes, setNotes] = useState(meal.notes || '');
  const [hasIngredients, setHasIngredients] = useState(meal.has_ingredients);
  const [isCompleted, setIsCompleted] = useState(meal.is_completed);
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);

  const lastCommittedMealRef = useRef(meal);

  useEffect(() => {
    if (meal.id !== lastCommittedMealRef.current.id ||
        name !== meal.name ||
        notes !== (lastCommittedMealRef.current.notes || '') ||
        hasIngredients !== meal.has_ingredients ||
        isCompleted !== meal.is_completed) {
      setName(meal.name);
      setNotes(meal.notes || '');
      setHasIngredients(meal.has_ingredients);
      setIsCompleted(meal.is_completed);
    }
    lastCommittedMealRef.current = meal;
  }, [meal]);

  useEffect(() => {
    if (isDemo) return;

    const timer = setTimeout(async () => {
      const hasNameChanged = name !== lastCommittedMealRef.current.name;
      const hasNotesChanged = notes !== (lastCommittedMealRef.current.notes || '');
      const hasIngredientsChanged = hasIngredients !== lastCommittedMealRef.current.has_ingredients;
      const hasCompletedChanged = isCompleted !== lastCommittedMealRef.current.is_completed;

      if (hasNameChanged || hasNotesChanged || hasIngredientsChanged || hasCompletedChanged) {
        const updates: Partial<Meal> = {
          name: name,
          notes: notes,
          has_ingredients: hasIngredients,
          is_completed: isCompleted,
        };

        if (isPlaceholder) {
          await onUpdate(meal.id, {
            ...meal,
            ...updates,
          });
        } else {
          await onUpdate(meal.id, updates);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    name, notes, hasIngredients, isCompleted,
    onUpdate, isDemo, isPlaceholder, meal.id
  ]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleHasIngredientsChange = async (checked: boolean) => {
    if (isDemo) return;
    setHasIngredients(checked);
  };

  const handleIsCompletedChange = async (checked: boolean) => {
    if (isDemo) return;
    setIsCompleted(checked);
    if (checked) {
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => setShowCompletionEffect(false), 600);
    } else {
      playSound('reset');
    }
  };

  const mealDate = parseISO(meal.meal_date);

  const mealTime = MEAL_TIMES[meal.meal_type];
  const mealDateTime = setMinutes(setHours(mealDate, mealTime.hour), mealTime.minute);
  const formattedTime = format(mealDateTime, 'h:mm a');

  const getMealIcon = (type: MealType) => {
    switch (type) {
      case 'breakfast': return <Coffee className="h-3.5 w-3.5 text-muted-foreground" />; // Reduced icon size
      case 'lunch': return <Soup className="h-3.5 w-3.5 text-muted-foreground" />; // Reduced icon size
      case 'dinner': return <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />; // Reduced icon size
    }
  };

  const getIngredientStatusIcon = () => {
    if (hasIngredients) {
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />; // Reduced icon size
    } else {
      return <ShoppingCart className="h-3.5 w-3.5 text-red-500" />; // Reduced icon size
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
        "relative flex flex-col gap-0 py-0 px-2 rounded-xl shadow-sm transition-all duration-200 ease-in-out", // Changed py-px to py-0
        "border-l-4",
        isCompleted ? "opacity-70 bg-muted/30 border-muted-foreground/20" : "bg-card border-primary/20 hover:shadow-md",
        !isCompleted && getIngredientStatusClasses(),
        isPlaceholder && "border-dashed border-muted-foreground/30 bg-muted/10 text-muted-foreground"
      )}
    >
      <div className="flex items-center justify-between py-0.5"> {/* Added py-0.5 for minimal top/bottom spacing */}
        <div className="flex items-center gap-1"> {/* Reduced gap */}
          {getMealIcon(meal.meal_type)}
          <span className={cn(
            "text-xs font-semibold", // Reduced font size
            isPlaceholder ? "text-muted-foreground/70" : "text-foreground"
          )}>
            {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)} ({formattedTime})
          </span>
          {name.trim() !== '' && (
            <UtensilsCrossed className="h-3 w-3 text-primary/70 ml-0.5" /> // Reduced icon size and margin
          )}
        </div>
        <div className="flex items-center gap-1"> {/* Reduced gap */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-5 w-5", isDemo && "cursor-not-allowed")} // Reduced button size
                onClick={() => handleHasIngredientsChange(!hasIngredients)}
                disabled={isDemo || isCompleted}
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
            className="h-3.5 w-3.5" // Reduced checkbox size
          />
          <label htmlFor={`completed-${meal.id}`} className="sr-only">Mark as completed</label>
        </div>
      </div>

      <Input
        value={name}
        onChange={handleNameChange}
        placeholder={`Add ${meal.meal_type} meal name...`}
        className={cn(
          "text-base font-bold border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto leading-tight", // Reduced font size, added leading-tight
          "hover:border-b hover:border-input focus-visible:border-b focus-visible:border-primary",
          isCompleted && "line-through text-muted-foreground",
          isPlaceholder && "placeholder:text-muted-foreground/50"
        )}
        disabled={isDemo || isCompleted}
      />
      <Textarea
        value={notes}
        onChange={handleNotesChange}
        placeholder="Add notes or short description..."
        rows={1}
        className={cn(
          "text-xs border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto resize-none leading-tight", // Reduced font size, added leading-tight
          "hover:border-b hover:border-input focus-visible:border-b focus-visible:border-primary",
          isCompleted && "line-through text-muted-foreground",
          isPlaceholder && "placeholder:text-muted-foreground/50"
        )}
        disabled={isDemo || isCompleted}
      />
      {showCompletionEffect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <CheckCircle2 className="h-16 w-16 text-green-500 animate-task-complete" />
        </div>
      )}
    </div>
  );
};

export default MealItem;