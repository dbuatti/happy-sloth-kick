import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, ShoppingCart, Plus, Minus } from 'lucide-react';
import { useMeals } from '@/hooks/useMeals';
import { Meal } from '@/types/meals';
import MealItem from '@/components/MealItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaplesInventory from '@/components/StaplesInventory';
import { format, isSameDay, addDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator'; // Import Separator

interface MealPlannerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ isDemo = false, demoUserId }) => {
  const [visibleMealCount, setVisibleMealCount] = useState(9); // Default to 9 meals (3 days)
  const { upcomingMeals, loading, addMeal, updateMeal, currentDate } = useMeals({ userId: demoUserId, visibleMealCount });

  const handleUpdateMeal = async (id: string, updates: Partial<Meal>) => {
    if (id.startsWith('placeholder-')) {
      const parts = id.split('-');
      const meal_date = `${parts[1]}-${parts[2]}-${parts[3]}`;
      const meal_type = parts[4] as Meal['meal_type'];

      const newMealData = {
        meal_date: meal_date,
        meal_type: meal_type,
        name: updates.name || '',
        notes: updates.notes || null,
        has_ingredients: updates.has_ingredients ?? false,
        is_completed: updates.is_completed ?? false,
      };
      await addMeal(newMealData);
    } else {
      await updateMeal({ id, updates });
    }
  };

  const handleIncreaseVisibleMeals = () => {
    setVisibleMealCount(prev => Math.min(prev + 3, 21)); // Increase by 3 meals (1 day), max 21
  };

  const handleDecreaseVisibleMeals = () => {
    setVisibleMealCount(prev => Math.max(prev - 3, 3)); // Decrease by 3 meals, min 3 (1 day)
  };

  // Group meals by date
  const mealsGroupedByDate = upcomingMeals.reduce((acc, meal) => {
    const dateKey = meal.meal_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>);

  const sortedDates = Object.keys(mealsGroupedByDate).sort();

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-xl mx-auto shadow-lg rounded-xl">
          <CardHeader className="px-6 pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
              <UtensilsCrossed className="h-7 w-7 text-primary" /> Meal Planner
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center line-clamp-2">
              Plan your next {visibleMealCount} meals.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="meals" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="meals">
                  <UtensilsCrossed className="h-4 w-4 mr-2" /> Meals
                </TabsTrigger>
                <TabsTrigger value="staples">
                  <ShoppingCart className="h-4 w-4 mr-2" /> Staples
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meals" className="mt-4 p-6">
                <div className="flex justify-center items-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDecreaseVisibleMeals}
                    disabled={visibleMealCount <= 3} // Minimum 1 day (3 meals)
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    Showing {visibleMealCount} meals ({Math.ceil(visibleMealCount / 3)} days)
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleIncreaseVisibleMeals}
                    disabled={visibleMealCount >= 21} // Maximum 7 days (21 meals)
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[...Array(visibleMealCount)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sortedDates.map((dateKey, index) => {
                      const mealsForDay = mealsGroupedByDate[dateKey];
                      const displayDate = parseISO(dateKey);
                      const isToday = isSameDay(displayDate, currentDate);
                      const isTomorrow = isSameDay(displayDate, addDays(currentDate, 1));

                      // Only render days that have meals within the visibleMealCount limit
                      if (mealsForDay.length === 0) return null;

                      return (
                        <React.Fragment key={dateKey}>
                          {index > 0 && <Separator className="my-4" />}
                          <h3 className="text-xl font-bold mb-3 text-foreground">
                            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(displayDate, 'EEEE, MMM d')}
                          </h3>
                          <div className="space-y-4">
                            {mealsForDay.length > 0 ? (
                              mealsForDay.map(meal => (
                                <MealItem
                                  key={meal.id}
                                  meal={meal}
                                  onUpdate={handleUpdateMeal}
                                  isDemo={isDemo}
                                  isPlaceholder={meal.id.startsWith('placeholder-')}
                                />
                              ))
                            ) : (
                              <p className="text-muted-foreground text-center py-4">No meals planned for this day.</p>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="staples" className="mt-4 p-6">
                <StaplesInventory isDemo={isDemo} demoUserId={demoUserId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MealPlanner;