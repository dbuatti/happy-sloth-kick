import React, { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, isBefore, startOfDay, getDay, addDays, subWeeks, addWeeks, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitLog } from '@/integrations/supabase/habit-api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HabitHistoryGridProps {
  habitLogs: HabitLog[];
  habitStartDate: string; // YYYY-MM-DD
  habitColor: string;
  currentDate: Date;
}

interface DayData {
  date: Date;
  isCompleted: boolean;
  isFutureDay: boolean;
  log: HabitLog | undefined;
  isBeforeHabitStart: boolean;
}

const HabitHistoryGrid: React.FC<HabitHistoryGridProps> = ({
  habitLogs,
  habitStartDate,
  habitColor,
  currentDate,
}) => {
  const historyWeeks = useMemo(() => {
    const today = startOfDay(currentDate);
    const habitStartActualDate = parseISO(habitStartDate);

    // Calculate the start and end of the 30-week window
    // Start 15 weeks before the Monday of the current week
    const displayWindowStart = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 15);
    // End 14 weeks after the Sunday of the current week (making it 15 weeks before + current week + 14 weeks after = 30 weeks total)
    const displayWindowEnd = addWeeks(endOfWeek(today, { weekStartsOn: 1 }), 14);

    // Generate all days in the interval
    let daysInInterval = eachDayOfInterval({
        start: displayWindowStart,
        end: displayWindowEnd,
    });

    // The padding logic is now mostly handled by startOfWeek/endOfWeek,
    // but we ensure the array is exactly aligned to weeks.
    // (This part of the code is largely kept from previous versions but the date range is now fixed)

    const logsMap = new Map<string, HabitLog>();
    habitLogs.forEach(log => {
      logsMap.set(log.log_date, log);
    });

    const weeks: (DayData | null)[][] = [];
    let currentWeek: (DayData | null)[] = [];

    daysInInterval.forEach((day) => {
        const formattedDay = format(day, 'yyyy-MM-dd');
        const log = logsMap.get(formattedDay);
        const isCompleted = log?.is_completed === true;
        const isFutureDay = isBefore(today, day);
        const isBeforeHabitStart = isBefore(day, habitStartActualDate);

        currentWeek.push({
            date: day,
            isCompleted,
            isFutureDay,
            log,
            isBeforeHabitStart,
        });

        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    return weeks; // Keep weeks in chronological order for display
  }, [habitLogs, habitStartDate, currentDate]);

  // Removed dayLabels

  return (
    <div className="flex flex-col w-full"> {/* Changed to flex-col and w-full */}
      {/* Removed Day of Week Labels */}

      {/* Removed Month Headers */}

      {/* Actual Grid of Days */}
      <div className="flex flex-grow justify-between gap-0.5"> {/* Changed to flex-grow and justify-between */}
          {historyWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col flex-1 gap-0.5"> {/* Each item is a week column, flex-1 to distribute width */}
                  {week.map((dayData, dayIndex) => (
                      dayData ? (
                          <Tooltip key={`${weekIndex}-${dayIndex}`}>
                              <TooltipTrigger asChild>
                                  <div
                                      className={cn(
                                          "h-3 w-full rounded-sm transition-colors duration-100 flex-shrink-0", // w-full to fill column width
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
                                  />
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
                      ) : (
                          <div key={`${weekIndex}-${dayIndex}-null`} className="h-3 w-full rounded-sm bg-transparent" /> // Placeholder for padding
                      )
                  ))}
              </div>
          ))}
      </div>
    </div>
  );
};

export default HabitHistoryGrid;