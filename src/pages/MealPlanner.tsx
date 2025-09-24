import React, { useState } from 'react';
import { useMeals, Meal, MealType } from '@/hooks/useMeals';
import { format, isSameDay, addDays } from 'date-fns'; // Removed parseISO
import { Skeleton } from '@/components/ui/skeleton';
import MealItem from '@/components/MealItem';
import StaplesInventory from '@/components/StaplesInventory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UtensilsCrossed, CalendarDays, ShoppingCart } from 'lucide-react'; // Added ShoppingCart
import { cn } from '@/lib/utils'; // Removed cn as it's not directly used here

interface MealPlannerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ isDemo = false, demoUserId }) => {
  const { upcomingMeals, loading, addMeal, updateMeal, /* deleteMeal, */ currentDate } = useMeals({ userId: demoUserId });
  const [activeTab, setActiveTab] = useState('meal-plan');

  const handleUpdateMeal = async (id: string, updates: Partial<Meal>) => {
    // Check if it's a placeholder meal that needs to be converted to a real meal
    if (id.startsWith('placeholder-')) {
      const placeholderMeal = upcomingMeals.find(m => m.id === id);
      if (placeholderMeal) {
        const newMealData = {
          meal_date: placeholderMeal.meal_date,
          meal_type: placeholderMeal.meal_type,
          name: updates.name || '',
          notes: updates.notes || null,
          has_ingredients: updates.has_ingredients ?? false,
          is_completed: updates.is_completed ?? false,
        };
        await addMeal(newMealData);
      }
    } else {
      await updateMeal({ id, updates });
    }
  };

  const mealsByDate = upcomingMeals.reduce((acc, meal) => {
    const date = meal.meal_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>);

  const sortedDates = Object.keys(mealsByDate).sort();

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <UtensilsCrossed className="inline-block h-10 w-10 mr-3 text-primary" /> Meal Planner
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meal-plan">
              <CalendarDays className="mr-2 h-4 w-4" /> Meal Plan
            </TabsTrigger>
            <TabsTrigger value="staples">
              <ShoppingCart className="mr-2 h-4 w-4" /> Staples
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meal-plan" className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : upcomingMeals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No meals planned yet. Start planning your meals!</p>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(date => (
                  <div key={date}>
                    <h2 className="text-2xl font-bold mb-4 text-foreground">
                      {isSameDay(parseISO(date), currentDate) ? 'Today' : format(parseISO(date), 'EEEE, MMM d')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mealsByDate[date]
                        .sort((a, b) => {
                          const order = { 'breakfast': 1, 'lunch': 2, 'dinner': 3 };
                          return order[a.meal_type] - order[b.meal_type];
                        })
                        .map(meal => (
                          <MealItem
                            key={meal.id}
                            meal={meal}
                            onUpdate={handleUpdateMeal}
                            isDemo={isDemo}
                            isPlaceholder={meal.id.startsWith('placeholder-')}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="staples" className="mt-6">
            <StaplesInventory isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MealPlanner;