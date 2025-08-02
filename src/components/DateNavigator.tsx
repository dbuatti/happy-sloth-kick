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
    <div className="w-full rounded-lg p-2 bg-card dark:bg-gray-800 shadow-sm flex items-center justify-between">
      <Button variant="ghost" size="icon" onClick={onPreviousDay} className="h-9 w-9 rounded-full hover:bg-primary/10 text-primary">
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold text-primary">
          {isToday ? 'Today' : format(currentDate, 'EEEE')}
        </h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "justify-start text-left font-medium text-primary hover:bg-primary/10 h-9 px-2",
                !currentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 h-4 w-4" />
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
        {!isToday && (
          <Button variant="secondary" size="sm" onClick={onGoToToday} className="h-9 px-3">
            Today
          </Button>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={onNextDay} className="h-9 w-9 rounded-full hover:bg-primary/10 text-primary">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default DateNavigator;