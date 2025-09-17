import React, { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, subDays, isBefore, startOfDay, isSameMonth, getDay, addDays } from 'date-fns';
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
  daysToShow = 365, // Default to 365 days for a full year view
}) => {
  const historyWeeks = useMemo(() => {
    const today = startOfDay(currentDate);
    const habitStartActualDate = parseISO(habitStartDate);

    // Calculate the start of the display window (e.g., 365 days ending today)
    const displayWindowStart = subDays(today, daysToShow - 1);

    // Determine the earliest date to actually show, considering habit start date
    const actualDisplayStart = isBefore(displayWindowStart, habitStartActualDate) ? displayWindowStart : habitStartActualDate;

    // Generate all days in the interval from actualDisplayStart to today
    let daysInInterval = eachDayOfInterval({
        start: displayWindowStart, // Always start from the beginning of the 365-day window
        end: today,
    });

    // Pad the beginning of the interval to start on a Monday
    // getDay: 0=Sun, 1=Mon, ..., 6=Sat
    let firstDayInInterval = daysInInterval[0];
    let dayOfWeekOfFirstDay = getDay(firstDayInInterval); // 0=Sun, 1=Mon
    let daysToPrepend = (dayOfWeekOfFirstDay === 0) ? 6 : (dayOfWeekOfFirstDay - 1); // If Sunday, need 6 days before. If Monday, 0 days. If Tuesday, 1 day.

    for (let i = 0; i < daysToPrepend; i++) {
        daysInInterval.unshift(subDays(firstDayInInterval, daysToPrepend - i));
    }

    // Pad the end of the interval to end on a Sunday
    let lastDayInInterval = daysInInterval[daysInInterval.length - 1];
    let dayOfWeekOfLastDay = getDay(lastDayInInterval);
    let daysToAppend = (dayOfWeekOfLastDay === 0) ? 0 : (7 - dayOfWeekOfLastDay); // If Sunday, 0 days. If Monday, 6 days.

    for (let i = 0; i < daysToAppend; i++) {
        daysInInterval.push(addDays(lastDayInInterval, i + 1));
    }

    // Now, group these days into weeks
    const weeks: (DayData | null)[][] = [];
    let currentWeek: (DayData | null)[] = [];

    const logsMap = new Map<string, HabitLog>();
    habitLogs.forEach(log => {
      logsMap.set(log.log_date, log);
    });

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

    return weeks.reverse(); // Reverse weeks so most recent week is on the right
  }, [habitLogs, habitStartDate, currentDate, daysToShow]);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-row-reverse gap-0.5 mt-3 overflow-x-auto pb-1">
      {/* Day of Week Labels (Fixed Left) */}
      <div className="flex-shrink-0 w-8 text-xs text-muted-foreground flex flex-col justify-around pr-1">
        {dayLabels.map(label => (
          <div key={label} className="h-3 text-right">{label}</div>
        ))}
      </div>

      {/* Scrollable Grid Container */}
      <div className="flex-1 overflow-x-auto">
        {/* Month Headers */}
        <div className="flex flex-row-reverse gap-0.5 mb-1">
            {historyWeeks.map((week, weekIndex) => {
                const firstDayOfThisWeek = week[0]?.date; // The actual first day of the 7-day block

                let monthLabel = '';
                if (firstDayOfThisWeek) {
                    // Show month label if it's the first day of the month, or the first week in the entire history
                    // Also, ensure it's not a padded day (i.e., the actual habit history starts here)
                    if (firstDayOfThisWeek.getDate() === 1 || weekIndex === historyWeeks.length - 1) {
                        monthLabel = format(firstDayOfThisWeek, 'MMM');
                    }
                }

                return (
                    <div key={weekIndex} className="w-3.5 flex-shrink-0 text-xs text-muted-foreground text-center">
                        {monthLabel}
                    </div>
                );
            })}
        </div>

        {/* Actual Grid of Days */}
        <div className="flex flex-row-reverse gap-0.5"> {/* Each item is a week column */}
            {historyWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-0.5"> {/* A single week column */}
                    {week.map((dayData, dayIndex) => (
                        dayData ? (
                            <Tooltip key={`${weekIndex}-${dayIndex}`}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "h-3 w-3 rounded-sm transition-colors duration-100 flex-shrink-0",
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
                            <div key={`${weekIndex}-${dayIndex}-null`} className="h-3 w-3 rounded-sm bg-transparent" /> // Placeholder for padding
                        )
                    ))}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default HabitHistoryGrid;