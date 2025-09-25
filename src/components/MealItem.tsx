"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
} as const;

const DEBOUNCE_DELAY = 500;
const COMPLETION_EFFECT_DURATION = 600;

const MealItem: React.FC<MealItemProps> = ({ meal, onUpdate, isDemo = false, isPlaceholder }) => {
  const { playSound } = useSound();
  
  // Local state
  const [name, setName] = useState(meal.name);
  const [notes, setNotes] = useState(meal.notes || '');
  const [hasIngredients, setHasIngredients] = useState(meal.has_ingredients);
  const [isCompleted, setIsCompleted] = useState(meal.is_completed);
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);

  const lastCommittedMealRef = useRef(meal);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Memoized values
  const mealDateTime = useMemo(() => {
    const mealDate = parseISO(meal.meal_date);
    const mealTime = MEAL_TIMES[meal.meal_type];
    return setMinutes(setHours(mealDate, mealTime.hour), mealTime.minute);
  }, [meal.meal_date, meal.meal_type]);

  const formattedTime = useMemo(() => format(mealDateTime, 'h:mm a'), [mealDateTime]);

  const mealIcon = useMemo(() => {
    const iconProps = { className: "h-3.5 w-3.5 text-muted-foreground" };
    switch (meal.meal_type) {
      case 'breakfast': return <Coffee {...iconProps} />;
      case 'lunch': return <Soup {...iconProps} />;
      case 'dinner': return <UtensilsCrossed {...iconProps} />;
      default: return null;
    }
  }, [meal.meal_type]);

  const ingredientStatusIcon = useMemo(() => {
    const baseProps = { className: "h-3.5 w-3.5" };
    return hasIngredients 
      ? <CheckCircle2 {...baseProps} className="h-3.5 w-3.5 text-green-500" />
      : <ShoppingCart {...baseProps} className="h-3.5 w-3.5 text-red-500" />;
  }, [hasIngredients]);

  const ingredientStatusClasses = useMemo(() => {
    return hasIngredients 
      ? "border-green-500/30 bg-green-500/5"
      : "border-red-500/30 bg-red-500/5";
  }, [hasIngredients]);

  const containerClasses = useMemo(() => {
    return cn(
      "relative flex flex-col gap-0 py-0 px-2 rounded-xl shadow-sm transition-all duration-200 ease-in-out",
      "border-l-4",
      isCompleted 
        ? "opacity-70 bg-muted/30 border-muted-foreground/20" 
        : cn("bg-card border-primary/20 hover:shadow-md", ingredientStatusClasses),
      isPlaceholder && "border-dashed border-muted-foreground/30 bg-muted/10 text-muted-foreground"
    );
  }, [isCompleted, isPlaceholder, ingredientStatusClasses]);

  // Sync local state with props when meal changes
  useEffect(() => {
    const hasChanged = meal.id !== lastCommittedMealRef.current.id ||
                      name !== meal.name ||
                      notes !== (meal.notes || '') ||
                      hasIngredients !== meal.has_ingredients ||
                      isCompleted !== meal.is_completed;

    if (hasChanged) {
      setName(meal.name);
      setNotes(meal.notes || '');
      setHasIngredients(meal.has_ingredients);
      setIsCompleted(meal.is_completed);
      lastCommittedMealRef.current = meal;
    }
  }, [meal, name, notes, hasIngredients, isCompleted]);

  // Debounced update logic
  useEffect(() => {
    if (isDemo) return;

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      const lastMeal = lastCommittedMealRef.current;
      const hasChanges = name !== lastMeal.name ||
                        notes !== (lastMeal.notes || '') ||
                        hasIngredients !== lastMeal.has_ingredients ||
                        isCompleted !== lastMeal.is_completed;

      if (hasChanges) {
        const updates: Partial<Meal> = {
          name,
          notes,
          has_ingredients: hasIngredients,
          is_completed: isCompleted,
        };

        try {
          if (isPlaceholder) {
            await onUpdate(meal.id, { ...meal, ...updates });
          } else {
            await onUpdate(meal.id, updates);
          }
          lastCommittedMealRef.current = { ...lastMeal, ...updates };
        } catch (error) {
          console.error('Failed to update meal:', error);
          // Optionally revert local state on error
          setName(lastMeal.name);
          setNotes(lastMeal.notes || '');
          setHasIngredients(lastMeal.has_ingredients);
          setIsCompleted(lastMeal.is_completed);
        }
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [name, notes, hasIngredients, isCompleted, onUpdate, isDemo, isPlaceholder, meal.id, meal]);

  // Event handlers
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  const handleHasIngredientsToggle = useCallback(() => {
    if (isDemo) return;
    setHasIngredients(prev => !prev);
  }, [isDemo]);

  const handleCompletionToggle = useCallback((checked: boolean) => {
    if (isDemo) return;
    
    setIsCompleted(checked);
    
    if (checked) {
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => setShowCompletionEffect(false), COMPLETION_EFFECT_DURATION);
    } else {
      playSound('reset');
    }
  }, [isDemo, playSound]);

  const capitalizedMealType = useMemo(() => 
    meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1), 
    [meal.meal_type]
  );

  const isDisabled = isDemo || isCompleted;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between py-0.5">
        <div className="flex items-center gap-1">
          {mealIcon}
          <span className={cn(
            "text-xs font-semibold",
            isPlaceholder ? "text-muted-foreground/70" : "text-foreground"
          )}>
            {capitalizedMealType} ({formattedTime})
          </span>
          {name.trim() && (
            <UtensilsCrossed className="h-3 w-3 text-primary/70 ml-0.5" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-5 w-5", isDemo && "cursor-not-allowed")}
                onClick={handleHasIngredientsToggle}
                disabled={isDisabled}
                aria-label={hasIngredients ? 'Mark ingredients as needed' : 'Mark ingredients as ready'}
              >
                {ingredientStatusIcon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasIngredients ? 'Ingredients ready!' : 'Need to shop for ingredients'}
            </TooltipContent>
          </Tooltip>
          
          <Checkbox
            id={`completed-${meal.id}`}
            checked={isCompleted}
            onCheckedChange={handleCompletionToggle}
            disabled={isDemo}
            className="h-3.5 w-3.5"
            aria-label="Mark meal as completed"
          />
        </div>
      </div>

      {/* Meal Name Input */}
      <Input
        value={name}
        onChange={handleNameChange}
        placeholder={`Add ${meal.meal_type} meal name...`}
        className={cn(
          "text-base font-bold border-none bg-transparent shadow-none",
          "focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto leading-tight",
          "hover:border-b hover:border-input focus-visible:border-b focus-visible:border-primary",
          isCompleted && "line-through text-muted-foreground",
          isPlaceholder && "placeholder:text-muted-foreground/50"
        )}
        disabled={isDisabled}
        aria-label={`${capitalizedMealType} meal name`}
      />

      {/* Notes Textarea */}
      <Textarea
        value={notes}
        onChange={handleNotesChange}
        placeholder="Add notes or short description..."
        rows={1}
        className={cn(
          "text-xs border-none bg-transparent shadow-none resize-none leading-tight",
          "focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto",
          "hover:border-b hover:border-input focus-visible:border-b focus-visible:border-primary",
          isCompleted && "line-through text-muted-foreground",
          isPlaceholder && "placeholder:text-muted-foreground/50"
        )}
        disabled={isDisabled}
        aria-label={`${capitalizedMealType} meal notes`}
      />

      {/* Completion Effect */}
      {showCompletionEffect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <CheckCircle2 className="h-16 w-16 text-green-500 animate-task-complete" />
        </div>
      )}
    </div>
  );
};

export default MealItem;