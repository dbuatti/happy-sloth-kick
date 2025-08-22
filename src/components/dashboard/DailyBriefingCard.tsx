import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface DailyBriefingCardProps {
  tasksDue: number;
  appointmentsToday: number;
  tasksCompleted: number;
  isLoading: boolean;
}

const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({
  tasksDue,
  appointmentsToday,
  tasksCompleted,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Daily Briefing</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Daily Briefing</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Tasks Due Today:</p>
          <span className="text-lg font-bold text-blue-600">{tasksDue}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Appointments Today:</p>
          <span className="text-lg font-bold text-purple-600">{appointmentsToday}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Tasks Completed:</p>
          <span className="text-lg font-bold text-green-600">{tasksCompleted}</span>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Stay focused and productive!
        </p>
      </CardContent>
    </Card>
  );
};

export default DailyBriefingCard;