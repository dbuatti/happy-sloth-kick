import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, ShoppingCart } from 'lucide-react'; // Added ShoppingCart icon
import { useMeals, Meal } from '@/hooks/useMeals';
import MealItem from '@/components/MealItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import StaplesInventory from '@/components/StaplesInventory'; // Import new component

interface MealPlannerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ isDemo = false, demoUserId }) => {
  const { upcomingMeals, loading, addMeal, updateMeal, currentDate } = useMeals({ userId: demoUserId });

  const handleUpdateMeal = async (id: string, updates: Partial<Meal>) => {
    if (id.startsWith('placeholder-')) {
      // If it's a placeholder, we need to create a new meal in the DB
      const parts = id.split('-'); // e.g., ["placeholder", "2024", "08", "01", "breakfast"]
      const meal_date = `${parts[1]}-${parts[2]}-${parts[3]}`; // Reconstruct "YYYY-MM-DD"
      const meal_type = parts[4] as Meal['meal_type'];

      const newMealData = {
        meal_date: meal_date,
        meal_type: meal_type,
        name: updates.name || '', // Use name from updates, or default
        notes: updates.notes || null, // Use notes from updates, or default
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
            <Tabs defaultValue="meals" className="w-full">
              <TabsList className="grid w-full grid-cols-2"> {/* Adjusted grid-cols */}
                <TabsTrigger value="meals">
                  <UtensilsCrossed className="h-4 w-4 mr-2" /> Meals
                </TabsTrigger>
                <TabsTrigger value="staples">
                  <ShoppingCart className="h-4 w-4 mr-2" /> Staples
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meals" className="mt-4">
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
              </TabsContent>
              <TabsContent value="staples" className="mt-4">
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