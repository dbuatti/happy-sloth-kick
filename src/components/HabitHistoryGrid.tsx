import React, { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, isBefore, startOfDay, subWeeks, startOfWeek, isSameDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitLog } from '@/integrations/supabase/habit-api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HabitHistoryGridProps {
  habitLogs: HabitLog[];
  habitStartDate: string; // YYYY-MM-DD
  habitColor: string;
  currentDate: Date;
  weeksToShow?: number; // Default to 30 weeks
  weekStartsOn?: 0 | 1; // 0 for Sunday, 1 for Monday
}

const HabitHistoryGrid: React.FC<HabitHistoryGridProps> = ({
  habitLogs,
  habitStartDate,
  habitColor,
  currentDate,
  weeksToShow = 30,
  weekStartsOn = 1, // Default to Monday
}) => {
  const dayLabels = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (weekStartsOn === 0) { // If week starts on Sunday
      return ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Shorter labels
    }
    return ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Shorter labels
  }, [weekStartsOn]);

  const gridDays = useMemo(() => {
    const today = startOfDay(currentDate);
    const habitStart = startOfDay(parseISO(habitStartDate));

    // Determine the end of the last full week to display (ending on the current week's end)
    const endOfCurrentWeek = addDays(startOfWeek(today, { weekStartsOn }), 6);
    
    // Calculate the start of the first week to display (weeksToShow weeks back)
    const startOfFirstWeek = startOfWeek(subWeeks(endOfCurrentWeek, weeksToShow - 1), { weekStartsOn });

    const allDaysInGrid = eachDayOfInterval({
      start: startOfFirstWeek,
      end: endOfCurrentWeek,
    });

    const logsMap = new Map<string, HabitLog>();
    habitLogs.forEach(log => {
      logsMap.set(log.log_date, log);
    });

    return allDaysInGrid.map(day => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const log = logsMap.get(formattedDay);
      const isCompleted = log?.is_completed === true;
      const isFutureDay = isBefore(today, day) && !isSameDay(today, day);
      const isBeforeHabitStart = isBefore(day, habitStart);

      return {
        date: day,
        isCompleted,
        isFutureDay,
        isBeforeHabitStart,
        log,
      };
    });
  }, [habitLogs, habitStartDate, currentDate, weeksToShow, weekStartsOn]);

  const monthLabels = useMemo(() => {
    const labels: { month: string; span: number }[] = [];
    let currentMonth: string | null = null;
    let currentMonthSpan = 0;

    // Iterate through weeks, not days, for month labels to align with week columns
    for (let i = 0; i < weeksToShow; i++) {
      const weekStartDay = gridDays[i * 7]?.date;
      if (!weekStartDay) continue;

      const month = format(weekStartDay, 'MMM');
      if (month !== currentMonth) {
        if (currentMonth !== null) {
          labels.push({ month: currentMonth, span: currentMonthSpan });
        }
        currentMonth = month;
        currentMonthSpan = 1;
      } else {
        currentMonthSpan++;
      }
      if (i === weeksToShow - 1 && currentMonth !== null) {
        labels.push({ month: currentMonth, span: currentMonthSpan });
      }
    }
    return labels;
  }, [gridDays, weeksToShow]);

  return (
    <div className="flex flex-col w-full">
      {/* Month Labels */}
      <div className="grid gap-0.5 mb-1" style={{ gridTemplateColumns: `repeat(${weeksToShow}, 1fr)` }}>
        {monthLabels.map((label, index) => (
          <div 
            key={index} 
            className="text-xs text-muted-foreground text-center"
            style={{ gridColumn: `span ${label.span}` }} // Span across weeks
          >
            {label.month}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-0.5">
        {/* Empty corner for day labels */}
        <div className="h-4 w-4"></div> 
        {/* Day Labels */}
        {dayLabels.map(label => (
          <div key={label} className="text-xs text-muted-foreground text-center font-medium">
            {label}
          </div>
        ))}

        {/* Week Rows */}
        {Array.from({ length: weeksToShow }).map((_, weekIndex) => {
          const weekStartDayIndex = weekIndex * 7;
          const weekDays = gridDays.slice(weekStartDayIndex, weekStartDayIndex + 7);
          
          // Display week number or a simple indicator
          const weekNumber = format(weekDays[0]?.date || new Date(), 'w');

          return (
            <React.Fragment key={`week-${weekIndex}`}>
              <div className="text-xs text-muted-foreground text-right pr-1 flex items-center justify-end">
                {weekNumber}
              </div>
              {weekDays.map((dayData, dayIndex) => (
                <Tooltip key={dayIndex}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "h-4 w-4 rounded-sm transition-colors duration-100 flex-shrink-0",
                        dayData.isBeforeHabitStart ? "bg-muted/10" :
                        dayData.isFutureDay ? "bg-muted/20" :
                        (dayData.isCompleted ? "" : "bg-muted/40")
                      )}
                      style={{ backgroundColor: dayData.isCompleted ? habitColor : undefined, opacity: dayData.isCompleted ? 0.8 : undefined }}
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
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default HabitHistoryGrid;