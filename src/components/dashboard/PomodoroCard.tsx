import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from 'lucide-react';
import PomodoroTimer from '@/components/PomodoroTimer';

const PomodoroCard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Focus Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PomodoroTimer />
      </CardContent>
    </Card>
  );
};

export default PomodoroCard;