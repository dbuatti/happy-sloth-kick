"use client";

import React, { useState } from 'react';
import { addDays, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMeals } from '@/hooks/useMeals';
import MealSlot from '@/components/MealSlot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Minus } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast'; // Assuming these exist

const MealPlanner: React.FC = () => {
  const { userId, isLoading: isAuthLoading } = useAuth();
  const [numberOfDays, setNumberOfDays] = useState(3); // Default to 3 days
  const today = new Date();

  const { data: meals, isLoading: isMealsLoading, error: mealsError } = useMeals(userId, today, numberOfDays);

  const handleAddMeal = (date: Date, mealType: string) => {
    showSuccess(`Adding a new ${mealType} for ${format(date, 'PPP')}. (Functionality to be implemented)`);
    // In a real app, this would open a modal or navigate to a form to add a meal
  };

  const handleIncreaseDays = () => {
    setNumberOfDays(prev => Math.min(prev + 1, 7)); // Max 7 days
  };

  const handleDecreaseDays = () => {
    setNumberOfDays(prev => Math.max(prev - 1, 1)); // Min 1 day
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return <p className="p-4 text-center text-red-500">Please log in to view your meal planner.</p>;
  }

  if (mealsError) {
    showError(`Error loading meals: ${mealsError.message}`);
    return <p className="p-4 text-center text-red-500">Error loading meals. Please try again.</p>;
  }

  const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
  const daysToDisplay = Array.from({ length: numberOfDays }, (_, i) => addDays(today, i));

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Meal Planner</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={handleDecreaseDays} disabled={numberOfDays === 1} variant="outline" size="sm">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium">{numberOfDays} Day{numberOfDays !== 1 ? 's' : ''}</span>
          <Button onClick={handleIncreaseDays} disabled={numberOfDays === 7} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isMealsLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {daysToDisplay.map(date => (
            <Card key={format(date, 'yyyy-MM-dd')} className="flex flex-col">
              <CardHeader className="bg-gray-50 dark:bg-gray-800 p-4 rounded-t-lg">
                <CardTitle className="text-lg font-semibold text-center">
                  {format(date, 'EEEE, MMM d')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 flex-grow">
                {mealTypes.map(mealType => {
                  const mealForSlot = meals?.find(
                    m => format(new Date(m.meal_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') && m.meal_type.toLowerCase() === mealType.toLowerCase()
                  );
                  return (
                    <MealSlot
                      key={`${format(date, 'yyyy-MM-dd')}-${mealType}`}
                      meal={mealForSlot}
                      mealType={mealType}
                      date={date}
                      onAddMeal={handleAddMeal}
                    />
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MealPlanner;