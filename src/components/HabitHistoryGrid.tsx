import React, { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, subDays, isBefore, startOfDay, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitLog } from '@/integrations/supabase/habit-api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HabitHistoryGridProps {
  habitLogs: HabitLog[];
  habitStartDate: string; // YYYY-MM-DD
  habitColor: string;
  currentDate: Date;
  daysToShow?: number; // Default to 90 days
}

const HabitHistoryGrid: React.FC<HabitHistoryGridProps> = ({
  habitLogs,
  habitStartDate,
  habitColor,
  currentDate,
  daysToShow = 90,
}) => {
  const historyDays = useMemo(() => {
    const today = startOfDay(currentDate);
    const habitStartActualDate = parseISO(habitStartDate); // Actual start date of the habit

    // Always calculate the start of the display window (e.g., 365 days ending today)
    const displayStartDate = subDays(today, daysToShow - 1); 
    
    const days = eachDayOfInterval({
      start: displayStartDate, // Use the fixed display start date
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
      const isBeforeHabitStart = isBefore(day, habitStartActualDate); // New flag

      // Determine if this day is a month boundary for display purposes
      const isMonthBoundary = (index === days.length - 1) || 
                              (index < days.length - 1 && !isSameMonth(day, days[index + 1].date));

      return {
        date: day,
        isCompleted,
        isFutureDay,
        log,
        isMonthBoundary,
        isBeforeHabitStart, // Include new flag
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
                dayData.isMonthBoundary && "border-l border-muted-foreground/30" // Subtle border for month start
              )}
              style={{
                backgroundColor: dayData.isBeforeHabitStart
                  ? 'hsl(var(--muted))' // Very muted for days before habit started
                  : dayData.isFutureDay
                  ? 'hsl(var(--muted)/20)' // Lighter muted for future days
                  : dayData.isCompleted
                  ? habitColor // Habit color for completed
                  : 'hsl(var(--muted)/40)', // Muted for incomplete/skipped
                opacity: dayData.isBeforeHabitStart ? 0.5 : (dayData.isCompleted ? 0.8 : 1), // Adjust opacity
              }}
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
            {dayData.isBeforeHabitStart ? (
              <p>Before Habit Start</p>
            ) : dayData.isFutureDay ? (
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