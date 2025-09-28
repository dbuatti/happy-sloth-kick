import React from 'react';

interface MealPlannerProps {
  isDemo?: boolean;
  demoUserId?: string | null;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ isDemo = false, demoUserId }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h1 className="text-3xl font-bold mb-4">Meal Planner Page</h1>
      <p className="text-muted-foreground">This is a placeholder for the Meal Planner page.</p>
      {isDemo && <p className="text-sm text-muted-foreground mt-2">Demo Mode: User ID - {demoUserId}</p>}
    </div>
  );
};

export default MealPlanner;