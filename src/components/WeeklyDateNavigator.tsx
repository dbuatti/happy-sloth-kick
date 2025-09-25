import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { format, startOfWeek, addWeeks, isSameWeek } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface WeeklyDateNavigatorProps {
  currentWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onGoToCurrentWeek: () => void;
  setCurrentWeekStart: React.Dispatch<React.SetStateAction<Date>>;
}

const WeeklyDateNavigator: React.FC<WeeklyDateNavigatorProps> = ({ currentWeekStart, onPreviousWeek, onNextWeek, onGoToCurrentWeek, setCurrentWeekStart }) => {
  const currentCalendarWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday as start of week
  const isCurrentWeek = isSameWeek(currentWeekStart, currentCalendarWeekStart, { weekStartsOn: 1 });

  return (
    <div className="w-full flex items-center justify-between px-0">
      <Button variant="ghost" size="icon" onClick={onPreviousWeek} className="h-9 w-9 rounded-full hover:bg-primary/10 text-primary">
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold text-primary">
          {isCurrentWeek ? 'This Week' : format(currentWeekStart, 'MMM d, yyyy')}
        </h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "justify-start text-left font-medium text-primary hover:bg-primary/10 h-9 px-2",
                !currentWeekStart && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 h-4 w-4" />
              {format(currentWeekStart, "MMM d")} - {format(addWeeks(currentWeekStart, 1), "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={currentWeekStart}
              onSelect={(date) => {
                if (date) {
                  setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {!isCurrentWeek && (
          <Button variant="secondary" size="sm" onClick={onGoToCurrentWeek} className="h-9 px-3">
            This Week
          </Button>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={onNextWeek} className="h-9 w-9 rounded-full hover:bg-primary/10 text-primary">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default WeeklyDateNavigator;