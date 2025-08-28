import { useMemo } from 'react';
import { addMinutes, getHours, getMinutes, setHours, setMinutes } from 'date-fns'; // Removed format
import { WorkHour } from '@/hooks/useWorkHours';

interface TimeBlock {
  start: Date;
  end: Date;
}

interface UseVisibleTimeBlocksProps {
  daysInGrid: Date[];
  allWorkHours: WorkHour[];
  currentViewDate: Date;
  getWorkHoursForDay: (date: Date) => WorkHour | null;
}

export const useVisibleTimeBlocks = ({
  daysInGrid,
  allWorkHours, // This is used in the dependency array, so not truly unused.
  currentViewDate,
  getWorkHoursForDay,
}: UseVisibleTimeBlocksProps) => {
  const visibleTimeBlocks = useMemo(() => {
    let minHour = 24;
    let maxHour = 0;

    // Determine the overall min and max work hours across all days in the grid
    daysInGrid.forEach(day => {
      const workHours = getWorkHoursForDay(day);
      if (workHours && workHours.enabled) {
        const start = setMinutes(setHours(day, parseInt(workHours.start_time.substring(0, 2))), parseInt(workHours.start_time.substring(3, 5)));
        const end = setMinutes(setHours(day, parseInt(workHours.end_time.substring(0, 2))), parseInt(workHours.end_time.substring(3, 5)));
        minHour = Math.min(minHour, getHours(start));
        maxHour = Math.max(maxHour, getHours(end));
      }
    });

    // If no work hours are enabled, default to a standard 9-5 day
    if (minHour === 24 || maxHour === 0) {
      minHour = 9;
      maxHour = 17;
    }

    const blocks: TimeBlock[] = [];
    let currentTime = setMinutes(setHours(currentViewDate, minHour), 0); // Use currentViewDate for context

    while (getHours(currentTime) < maxHour || (getHours(currentTime) === maxHour && getMinutes(currentTime) === 0)) {
      blocks.push({
        start: currentTime,
        end: addMinutes(currentTime, 30),
      });
      currentTime = addMinutes(currentTime, 30);
    }

    return blocks;
  }, [daysInGrid, allWorkHours, currentViewDate, getWorkHoursForDay]);

  return { visibleTimeBlocks };
};