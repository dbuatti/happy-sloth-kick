import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface MealPlannerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ isDemo, demoUserId }) => {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meal Planner</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Meal
        </Button>
      </div>
      <p className="text-muted-foreground">
        Plan your meals and manage your staples here.
      </p>

      {/* The "wasted space meal prep card" has been removed by not including it in this initial setup. */}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today's Meals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No meals planned for today. Click "Add Meal" to get started!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Meal Staples</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage your essential ingredients.</p>
            <Button variant="outline" className="mt-4">View Staples</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">See your meal plan for the week ahead.</p>
            <Button variant="outline" className="mt-4">View Week</Button>
          </CardContent>
        </Card>
      </div>

      {isDemo && (
        <p className="text-sm text-gray-500 mt-8">
          (Currently in demo mode for user: {demoUserId})
        </p>
      )}
    </div>
  );
};

export default MealPlanner;