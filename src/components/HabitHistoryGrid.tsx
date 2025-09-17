import React, { useMemo } from 'react';
import { format, eachDayOfInterval, isSameDay, parseISO, subDays, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { HabitLog } from '@/integrations/supabase/habit-api';

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
    const startDate = parseISO(habitStartDate);
    const oldestDayToShow = subDays(today, daysToShow - 1); // Calculate the oldest day to display

    const intervalStart = isBefore(oldestDayToShow, startDate) ? startDate : oldestDayToShow;
    
    const days = eachDayOfInterval({
      start: intervalStart,
      end: today,
    }).reverse(); // Show most recent days first

    const logsMap = new Map<string, boolean>();
    habitLogs.forEach(log => {
      logsMap.set(log.log_date, log.is_completed);
    });

    return days.map(day => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const isCompleted = logsMap.get(formattedDay) === true;
      const isFutureDay = isBefore(today, day); // Check if the day is in the future relative to currentDate

      return {
        date: day,
        isCompleted,
        isFutureDay,
      };
    });
  }, [habitLogs, habitStartDate, currentDate, daysToShow]);

  return (
    <div className="grid grid-cols-10 gap-1 mt-3"> {/* Adjusted grid columns and gap */}
      {historyDays.map((day, index) => (
        <div
          key={index}
          className={cn(
            "h-3 w-3 rounded-sm transition-colors duration-100", // Smaller squares, rounded corners
            day.isFutureDay ? "bg-muted/20" : (day.isCompleted ? "" : "bg-muted/40") // Lighter for future, muted for incomplete
          )}
          style={{ backgroundColor: day.isCompleted ? habitColor : undefined, opacity: day.isCompleted ? 0.8 : undefined }} // Use habitColor for completed, slightly transparent
        />
      ))}
    </div>
  );
};

export default HabitHistoryGrid;