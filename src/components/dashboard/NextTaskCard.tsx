import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Removed: import { Button } from "@/components/ui/button";
import { Task } from '@/hooks/useTasks';
import DoTodaySwitch from '@/components/DoTodaySwitch'; // Assuming this path

interface NextTaskCardProps {
  nextAvailableTask: Task | null;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => void;
  isDemo?: boolean;
  // ... other props for NextTaskCard
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({
  nextAvailableTask,
  isDoToday,
  toggleDoToday,
  isDemo,
  // ... other props
}) => {
  const handleToggleDoTodaySwitch = () => {
    if (nextAvailableTask) {
      toggleDoToday(nextAvailableTask);
    }
  };

  if (!nextAvailableTask) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next Task</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No tasks currently in focus.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Task</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p>{nextAvailableTask.description}</p>
        <DoTodaySwitch
          isOn={isDoToday}
          onToggle={handleToggleDoTodaySwitch}
          isDemo={isDemo}
        />
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;