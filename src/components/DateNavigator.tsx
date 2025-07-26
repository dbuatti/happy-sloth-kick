import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

interface DateNavigatorProps {
  currentDate: Date;
  onPreviousDay: () => void;
  onNextDay: () => void;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ currentDate, onPreviousDay, onNextDay }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <Button variant="outline" size="icon" onClick={onPreviousDay}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <h3 className="text-xl font-semibold">
        {isSameDay(currentDate, new Date()) ? 'Today' : format(currentDate, 'EEEE, MMMM d, yyyy')}
      </h3>
      <Button variant="outline" size="icon" onClick={onNextDay}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DateNavigator;