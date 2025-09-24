import React from 'react';
import { format, parseISO, isSameDay, eachDayOfInterval, startOfWeek, addWeeks, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitLog } from '@/types/habit'; // Import HabitLog from types
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HabitHistoryGridProps {
  habitLogs: HabitLog[];
  habitStartDate: string;
  habitColor: string;
  currentDate: Date;
  onToggleCompletionForDay: (date: Date, isCompleted: boolean, valueRecorded?: number | null) => Promise<boolean>;
  isDemo?: boolean;
  weeksToShow?: number;
}

const HabitHistoryGrid: React.FC<HabitHistoryGridProps> = ({
  habitLogs,
  habitStartDate,
  habitColor,
  currentDate,
  onToggleCompletionForDay,
  isDemo = false,
  weeksToShow = 13, // Default to 13 weeks (approx 3 months)
}) => {
  const today = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start week on Monday
  const startDate = parseISO(habitStartDate);

  const weeks = Array.from({ length: weeksToShow }).map((_, i) => {
    return addWeeks(today, -i);
  }).reverse(); // Display oldest week first

  const daysInGrid = weeks.flatMap(weekStart => {
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });
  });

  const logsMap = new Map(habitLogs.map(log => [format(parseISO(log.log_date), 'yyyy-MM-dd'), log]));

  return (
    <div className="grid grid-cols-7 gap-1 w-full">
      {daysInGrid.map((day, index) => {
        const formattedDay = format(day, 'yyyy-MM-dd');
        const log = logsMap.get(formattedDay);
        const isCompleted = log?.is_completed || false;
        const isFutureDay = isBefore(currentDate, day) && !isSameDay(currentDate, day);
        const isBeforeHabitStart = isBefore(day, startDate);
        const isCurrentDay = isSameDay(day, currentDate);

        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full aspect-square rounded-sm transition-colors duration-100",
                  "flex items-center justify-center text-xs font-medium",
                  isBeforeHabitStart && "bg-muted/20 text-muted-foreground/50 cursor-not-allowed",
                  isFutureDay && "bg-muted/50 text-muted-foreground/70 cursor-not-allowed",
                  !isBeforeHabitStart && !isFutureDay && !isCompleted && "bg-muted/70 hover:bg-muted",
                  !isBeforeHabitStart && !isFutureDay && isCompleted && "text-white",
                  isCurrentDay && "ring-2 ring-offset-2 ring-primary",
                  isDemo && "cursor-not-allowed"
                )}
                style={{ backgroundColor: isCompleted && !isFutureDay && !isBeforeHabitStart ? habitColor : undefined }}
                onClick={() => !isDemo && !isFutureDay && !isBeforeHabitStart && onToggleCompletionForDay(day, !isCompleted, log?.value_recorded)}
                disabled={isDemo || isFutureDay || isBeforeHabitStart}
              >
                {isCompleted && !isFutureDay && !isBeforeHabitStart ? '✓' : ''}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{format(day, 'EEE, MMM d')}</p>
              {isBeforeHabitStart && <p>Habit not started yet</p>}
              {isFutureDay && <p>Future day</p>}
              {!isBeforeHabitStart && !isFutureDay && (
                isCompleted ? (
                  <p>Completed {log?.value_recorded ? `(${log.value_recorded})` : ''}</p>
                ) : (
                  <p>Not completed</p>
                )
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default HabitHistoryGrid;