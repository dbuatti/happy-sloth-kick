import React from 'react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScheduleGridHeaderProps {
  daysInGrid: Date[];
  headerHeight: number;
}

const ScheduleGridHeader: React.FC<ScheduleGridHeaderProps> = ({ daysInGrid, headerHeight }) => {
  return (
    <>
      {/* Top-left empty cell */}
      <div className="p-2 border-b border-r bg-muted/30 h-full" style={{ gridColumn: 1, gridRow: 1 }}></div>

      {/* Day Headers */}
      {daysInGrid.map((day, index) => {
        const isCurrentDay = isSameDay(day, new Date());
        return (
          <div key={index} className={cn(
            "p-2 border-b text-center font-semibold flex flex-col items-center justify-center h-full",
            "bg-muted/30",
            isCurrentDay ? "text-primary border-b-2 border-primary" : "text-foreground",
            index < daysInGrid.length - 1 ? 'border-r' : 'border-r-0'
          )}
            style={{ gridColumn: index + 2, gridRow: 1 }}
          >
            <span className={cn("text-base", isCurrentDay && "font-bold")}>{format(day, 'EEE')}</span>
            <span className={cn("text-sm text-muted-foreground", isCurrentDay && "text-primary/80")}>{format(day, 'MMM d')}</span>
          </div>
        );
      })}
    </>
  );
};

export default ScheduleGridHeader;