import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

interface DateNavigatorProps {
  currentDate: Date;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onGoToToday: () => void; // New prop for "Today" button
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ currentDate, onPreviousDay, onNextDay, onGoToToday }) => {
  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="flex items-center justify-between mb-6">
      <Button variant="outline" size="icon" onClick={onPreviousDay}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center space-x-2">
        <h3 className="text-xl font-semibold">
          {isToday ? 'Today' : format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        {!isToday && ( // Only show "Today" button if not currently on today's date
          <Button variant="outline" size="sm" onClick={onGoToToday} className="ml-2">
            Today
          </Button>
        )}
      </div>
      <Button variant="outline" size="icon" onClick={onNextDay}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DateNavigator;