import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from 'lucide-react';
import { useMeals, Meal } from '@/hooks/useMeals';
import MealItem from '@/components/MealItem';
import { Skeleton } from '@/components/ui/skeleton';

interface MealPlannerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ isDemo = false, demoUserId }) => {
  const { upcomingMeals, loading, addMeal, updateMeal, currentDate } = useMeals({ userId: demoUserId });

  const handleUpdateMeal = async (id: string, updates: Partial<Meal>) => {
    if (id.startsWith('placeholder-')) {
      // If it's a placeholder, we need to create a new meal in the DB
      const [_, date, type] = id.split('-');
      const newMealData = {
        meal_date: date,
        meal_type: type as Meal['meal_type'],
        name: updates.name || '',
        notes: updates.notes || null,
        has_ingredients: updates.has_ingredients ?? false,
        is_completed: updates.is_completed ?? false,
      };
      await addMeal(newMealData);
    } else {
      // Otherwise, update the existing meal
      await updateMeal({ id, updates });
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <UtensilsCrossed className="h-7 w-7 text-primary" /> Meal Planner
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">Plan your next 9 meals (3 days) and track ingredients.</p>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-4">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMeals.map(meal => (
                  <MealItem
                    key={meal.id}
                    meal={meal}
                    currentDate={currentDate}
                    onUpdate={handleUpdateMeal}
                    isDemo={isDemo}
                  />
                ))}
              </div>
            )}
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