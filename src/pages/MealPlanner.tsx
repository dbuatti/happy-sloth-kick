import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, CalendarDays, ShoppingCart } from 'lucide-react';
import { useMeals, Meal, MealType } from '@/hooks/useMeals';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import MealItem from '@/components/MealItem';
import StaplesInventory from '@/components/StaplesInventory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

interface MealPlannerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ isDemo = false, demoUserId }) => {
  const { upcomingMeals, loading, addMeal, updateMeal, deleteMeal, currentDate } = useMeals({ userId: demoUserId });
  const [activeTab, setActiveTab] = useState('meal-plan');

  const handleUpdateMeal = async (id: string, updates: Partial<Meal>) => {
    // If it's a placeholder, we need to convert it to a real meal
    if (id.startsWith('placeholder-')) {
      const placeholderMeal = upcomingMeals.find(m => m.id === id);
      if (placeholderMeal) {
        const newMealData = {
          meal_date: placeholderMeal.meal_date,
          meal_type: placeholderMeal.meal_type,
          name: updates.name || placeholderMeal.name,
          notes: updates.notes || placeholderMeal.notes,
          has_ingredients: updates.has_ingredients ?? placeholderMeal.has_ingredients,
          is_completed: updates.is_completed ?? placeholderMeal.is_completed,
        };
        await addMeal(newMealData);
      }
    } else {
      await updateMeal({ id, updates });
    }
  };

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];

  const getMealsForDate = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return mealTypes.map(type => {
      const meal = upcomingMeals.find(m => m.meal_date === formattedDate && m.meal_type === type);
      return meal || {
        id: `placeholder-${formattedDate}-${type}`,
        meal_date: formattedDate,
        meal_type: type,
        name: '',
        notes: null,
        has_ingredients: false,
        is_completed: false,
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  };

  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const daysToDisplay = Array.from({ length: 3 }).map((_, i) => addDays(today, i));

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UtensilsCrossed className="h-7 w-7 text-primary" /> Meal Planner
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="meal-plan">
            <CalendarDays className="mr-2 h-4 w-4" /> Meal Plan
          </TabsTrigger>
          <TabsTrigger value="staples">
            <ShoppingCart className="mr-2 h-4 w-4" /> Staples Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meal-plan" className="mt-4">
          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-lg rounded-xl">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {daysToDisplay.map(date => (
                <Card key={format(date, 'yyyy-MM-dd')} className="shadow-lg rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      {isSameDay(date, currentDate) ? 'Today' : format(date, 'EEEE, MMM d')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getMealsForDate(date).map(meal => (
                      <MealItem
                        key={meal.id}
                        meal={meal}
                        onUpdate={handleUpdateMeal}
                        isDemo={isDemo}
                        isPlaceholder={meal.id.startsWith('placeholder-')}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="staples" className="mt-4">
          <Card className="shadow-lg rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Pantry Staples
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <StaplesInventory isDemo={isDemo} demoUserId={demoUserId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default MealPlanner;