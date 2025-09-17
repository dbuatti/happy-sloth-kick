import React, { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, isBefore, startOfDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitLog } from '@/integrations/supabase/habit-api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HabitHistoryGridProps {
  habitLogs: HabitLog[];
  habitStartDate: string; // YYYY-MM-DD
  habitColor: string;
  currentDate: Date;
  daysToShow?: number; // New: Number of days to show in the grid
}

const HabitHistoryGrid: React.FC<HabitHistoryGridProps> = ({
  habitLogs,
  habitStartDate,
  habitColor,
  currentDate,
  daysToShow = 90, // Default to 90 days
}) => {
  const historyDays = useMemo(() => {
    const today = startOfDay(currentDate);
    const startDate = parseISO(habitStartDate);
    const oldestDayToShow = subDays(today, daysToShow - 1);

    const intervalStart = isBefore(oldestDayToShow, startDate) ? startDate : oldestDayToShow;
    
    const days = eachDayOfInterval({
      start: intervalStart,
      end: today,
    }).reverse(); // Show most recent days first

    const logsMap = new Map<string, HabitLog>();
    habitLogs.forEach(log => {
      logsMap.set(log.log_date, log);
    });

    return days.map((day, index) => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const log = logsMap.get(formattedDay);
      const isCompleted = log?.is_completed === true;
      const isFutureDay = isBefore(today, day);
      
      // Determine if this day is a month boundary for display purposes
      // It's a boundary if it's the oldest day in the range, or if the next day (chronologically earlier) is in a different month
      const isMonthBoundary = (index === days.length - 1) || 
                              (index < days.length - 1 && day.getMonth() !== days[index + 1].getMonth());

      return {
        date: day,
        isCompleted,
        isFutureDay,
        log,
        isMonthBoundary,
      };
    });
  }, [habitLogs, habitStartDate, currentDate, daysToShow]);

  return (
    <div className="flex flex-row-reverse gap-0.5 mt-3 overflow-x-auto pb-1">
      {historyDays.map((dayData, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "h-3 w-3 rounded-sm transition-colors duration-100 flex-shrink-0 relative",
                dayData.isFutureDay ? "bg-muted/20" : (dayData.isCompleted ? "" : "bg-muted/40"),
                dayData.isMonthBoundary && "border-l border-muted-foreground/30" // Subtle border for month start
              )}
              style={{ backgroundColor: dayData.isCompleted ? habitColor : undefined, opacity: dayData.isCompleted ? 0.8 : undefined }}
            >
              {dayData.isMonthBoundary && (
                <span className="absolute -top-4 left-0 text-xs text-muted-foreground whitespace-nowrap -translate-x-1/2">
                  {format(dayData.date, 'MMM')}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{format(dayData.date, 'EEE, MMM d, yyyy')}</p>
            {dayData.isFutureDay ? (
              <p>Future</p>
            ) : dayData.log ? (
              <>
                <p>Status: {dayData.isCompleted ? 'Completed' : 'Incomplete'}</p>
                {dayData.log.value_recorded !== null && (
                  <p>Value: {dayData.log.value_recorded}</p>
                )}
              </>
            ) : (
              <p>No log for this day</p>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default HabitHistoryGrid;