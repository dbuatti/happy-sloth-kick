import React from 'react';
import { Clock } from 'lucide-react';
import PomodoroTimer from '@/components/PomodoroTimer';

const PomodoroCard: React.FC = () => {
  return (
    <fieldset className="rounded-xl border-2 border-border p-4">
      <legend className="px-2 text-sm text-muted-foreground -ml-1 font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Focus Timer
      </legend>
      <div className="pt-2">
        <PomodoroTimer />
      </div>
    </fieldset>
  );
};

export default PomodoroCard;