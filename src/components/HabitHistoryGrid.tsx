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
  }, [habitLogs, habitStartDate, currentDate, weeksToShow, weekStartsOn]);

  const monthHeaders = useMemo(() => {
    const headers: { month: string; weekIndex: number; span: number }[] = [];
    let currentMonth: string | null = null;
    let currentMonthStartWeekIndex = 0;

    for (let i = 0; i < weeksToShow; i++) {
      const firstDayOfWeek = gridDays[i * 7]?.date;
      if (!firstDayOfWeek) continue;

      const month = format(firstDayOfWeek, 'MMM');
      if (month !== currentMonth) {
        if (currentMonth !== null) {
          headers.push({ month: currentMonth, weekIndex: currentMonthStartWeekIndex, span: i - currentMonthStartWeekIndex });
        }
        currentMonth = month;
        currentMonthStartWeekIndex = i;
      }
    }
    if (currentMonth !== null) {
      headers.push({ month: currentMonth, weekIndex: currentMonthStartWeekIndex, span: weeksToShow - currentMonthStartWeekIndex });
    }
    return headers;
  }, [gridDays, weeksToShow]);

  return (
    <div className="flex flex-col w-full overflow-x-auto">
      {/* Month Labels */}
      <div className="relative h-4 mb-1">
        {monthHeaders.map((header) => (
          <div
            key={header.month + header.weekIndex}
            className="absolute text-xs text-muted-foreground text-center"
            style={{
              left: `calc((100% / ${weeksToShow}) * ${header.weekIndex} + 20px)`, // Offset for day labels column
              width: `calc((100% / ${weeksToShow}) * ${header.span} - 20px)`, // Adjust width to span weeks
              transform: `translateX(-50%)`, // Center text within its span
            }}
          >
            {header.month}
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
          
          const weekNumber = format(weekDays[0]?.date || new Date(), 'w');

          return (
            <React.Fragment key={`week-${weekIndex}`}>
              <div className="text-xs text-muted-foreground text-right pr-0.5 flex items-center justify-end">
                {weekNumber}
              </div>
              {weekDays.map((dayData, dayIndex) => (
                <Tooltip key={dayIndex}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "h-3.5 w-3.5 rounded-sm transition-colors duration-100 flex-shrink-0", // Smaller cells
                        dayData.isBeforeHabitStart ? "bg-muted/10" :
                        dayData.isFutureDay ? "bg-muted/20" :
                        (dayData.isCompleted ? "" : "bg-muted/40"),
                        dayData.isToday && "ring-1 ring-primary ring-offset-1" // Highlight today
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