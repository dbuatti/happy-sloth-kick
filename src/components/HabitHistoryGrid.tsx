import React, { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, isBefore, startOfDay, startOfWeek, isSameDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitLog } from '@/integrations/supabase/habit-api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HabitHistoryGridProps {
  habitLogs: HabitLog[];
  habitStartDate: string; // YYYY-MM-DD
  habitColor: string;
  currentDate: Date;
  onToggleCompletionForDay: (date: Date, isCompleted: boolean, valueRecorded?: number | null) => Promise<boolean>; // New
  habitId: string; // New
  isDemo?: boolean; // New
  weekStartsOn?: 0 | 1; // 0 for Sunday, 1 for Monday
}

const HabitHistoryGrid: React.FC<HabitHistoryGridProps> = ({
  habitLogs,
  habitStartDate,
  habitColor,
  currentDate,
  onToggleCompletionForDay, // Destructure new prop
  habitId, // Destructure new prop
  isDemo = false, // Destructure new prop
  weekStartsOn = 1, // Default to Monday
}) => {
  const dayLabels = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (weekStartsOn === 0) { // If week starts on Sunday
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
    return labels;
  }, [weekStartsOn]);

  const gridDays = useMemo(() => {
    const today = startOfDay(currentDate);
    const habitStart = startOfDay(parseISO(habitStartDate));

    // Calculate days for the current week only
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn });
    
    const allDaysInWeek = eachDayOfInterval({
      start: startOfCurrentWeek,
      end: addDays(startOfCurrentWeek, 6),
    });

    const logsMap = new Map<string, HabitLog>();
    habitLogs.forEach(log => {
      logsMap.set(log.log_date, log);
    });

    return allDaysInWeek.map(day => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const log = logsMap.get(formattedDay);
      const isCompleted = log?.is_completed === true;
      const isFutureDay = isBefore(today, day) && !isSameDay(today, day);
      const isBeforeHabitStart = isBefore(day, habitStart);
      const isToday = isSameDay(day, today);

      return {
        date: day,
        isCompleted,
        isFutureDay,
        isBeforeHabitStart,
        isToday,
        log,
      };
    });
  }, [habitLogs, habitStartDate, currentDate, weekStartsOn]);

  return (
    <div className="flex flex-col w-full overflow-x-auto">
      <div className="grid grid-cols-7 gap-0.5"> {/* Changed grid-cols to 7 */}
        {/* Day Labels */}
        {dayLabels.map(label => (
          <div key={label} className="text-xs text-muted-foreground text-center font-medium">
            {label}
          </div>
        ))}

        {/* Week Row (only one week now) */}
        {gridDays.map((dayData, dayIndex) => {
          const isDisabled = isDemo || dayData.isFutureDay || dayData.isBeforeHabitStart;
          return (
            <Tooltip key={dayIndex}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded-sm transition-colors duration-100 flex-shrink-0", // Smaller cells
                    "cursor-pointer", // Added cursor-pointer
                    dayData.isBeforeHabitStart ? "bg-muted/10" :
                    dayData.isFutureDay ? "bg-muted/20" :
                    (dayData.isCompleted ? "" : "bg-muted/40"),
                    dayData.isToday && "ring-1 ring-primary ring-offset-1", // Highlight today
                    isDisabled && "cursor-not-allowed opacity-50" // Dim and disable cursor for disabled days
                  )}
                  style={{ backgroundColor: dayData.isCompleted ? habitColor : undefined, opacity: dayData.isCompleted ? 0.8 : undefined }}
                  onClick={() => {
                    if (!isDisabled) {
                      onToggleCompletionForDay(dayData.date, !dayData.isCompleted, dayData.log?.value_recorded);
                    }
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{format(dayData.date, 'EEE, MMM d, yyyy')}</p>
                {dayData.isBeforeHabitStart ? (
                  <p>Habit not started</p>
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
          );
        })}
      </div>
    </div>
  );
};

export default HabitHistoryGrid;