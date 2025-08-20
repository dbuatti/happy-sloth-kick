import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DailyProgressCardProps {
  dailyProgress: { completed: number; total: number };
  isLoading: boolean;
}

const DailyProgressCard: React.FC<DailyProgressCardProps> = ({ dailyProgress, isLoading }) => {
  const progressValue = dailyProgress.total > 0 ? (dailyProgress.completed / dailyProgress.total) * 100 : 0;

  return (
    <Card className="flex flex-col items-center justify-center text-center p-6 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-center">Daily Progress</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center w-full space-y-4">
        {isLoading ? (
          <div className="h-8 w-full bg-gray-200 rounded animate-pulse"></div>
        ) : (
          <>
            <p className="text-4xl font-bold text-primary">
              {dailyProgress.completed} / {dailyProgress.total}
            </p>
            <Progress value={progressValue} className="w-full" />
            <p className="text-sm text-muted-foreground">Tasks Completed</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyProgressCard;