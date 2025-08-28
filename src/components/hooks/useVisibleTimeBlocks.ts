import { useMemo } from 'react';
import { format, addMinutes, parse, getHours, setHours, setMinutes } from 'date-fns';
import { WorkHour } from '@/hooks/useWorkHours';

interface UseVisibleTimeBlocksProps {
  daysInGrid: Date[];
  allWorkHours: WorkHour[];
  currentViewDate: Date;
  getWorkHoursForDay: (date: Date) => WorkHour | null;
}

export const useVisibleTimeBlocks = ({
  daysInGrid,
  allWorkHours,
  currentViewDate,
  getWorkHoursForDay,
}: UseVisibleTimeBlocksProps) => {
  const visibleTimeBlocks = useMemo(() => {
    let min = 24;
    let max = 0;
    let hasAnyWorkHours = false;

    daysInGrid.forEach(day => {
        const wh = getWorkHoursForDay(day);
        if (wh) {
            hasAnyWorkHours = true;
            const startHour = getHours(parse(wh.start_time, 'HH:mm:ss', day));
            const endHour = getHours(parse(wh.end_time, 'HH:mm:ss', day));
            if (startHour < min) min = startHour;
            if (endHour > max) max = endHour;
        }
    });

    if (!hasAnyWorkHours) {
        min = 9;
        max = 17; // Default work hours if none are defined
    }

    const blocks = [];
    let currentTime = setHours(setMinutes(currentViewDate, 0), min);
    const endTime = setHours(setMinutes(currentViewDate, 0), max);

    while (currentTime.getTime() < endTime.getTime()) {
        blocks.push({ start: currentTime, end: addMinutes(currentTime, 30) });
        currentTime = addMinutes(currentTime, 30);
    }
    
    return blocks;
  }, [daysInGrid, getWorkHoursForDay, currentViewDate]);

  return { visibleTimeBlocks };
};