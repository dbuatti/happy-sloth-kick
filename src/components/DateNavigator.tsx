import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DateNavigatorProps {
  currentDate: Date;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onGoToToday: () => void; // New prop for "Today" button
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>; // Added setCurrentDate prop
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ currentDate, onPreviousDay, onNextDay, onGoToToday, setCurrentDate }) => {
  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="flex items-center justify-between mb-4">
      <Button variant="outline" size="icon" onClick={onPreviousDay}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center space-x-2">
        <h3 className="text-xl font-semibold">
          {isToday ? 'Today' : format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-auto justify-start text-left font-normal",
                !currentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(currentDate, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (date) {
                  setCurrentDate(date);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
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