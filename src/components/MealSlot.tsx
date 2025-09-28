"use client";

import React from 'react';
import { Meal } from '@/types/meals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface MealSlotProps {
  meal: Meal | undefined;
  mealType: string;
  date: Date;
  onAddMeal: (date: Date, mealType: string) => void;
}

const MealSlot: React.FC<MealSlotProps> = ({ meal, mealType, date, onAddMeal }) => {
  const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-semibold">{mealType}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-3 pt-1 flex flex-col justify-between">
        {meal ? (
          <div className="text-sm">
            <p className="font-medium">{meal.name}</p>
            {meal.notes && <p className="text-xs text-gray-500 truncate">{meal.notes}</p>}
            {/* Add more meal details here if needed */}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <p className="mb-2">No meal planned</p>
            <Button variant="outline" size="sm" onClick={() => onAddMeal(date, mealType)}>
              <Plus className="h-4 w-4 mr-1" /> Add Meal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MealSlot;