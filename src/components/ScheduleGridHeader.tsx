import React from 'react';
import { format } from 'date-fns';

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
      {daysInGrid.map((day, index) => (
        <div key={index} className="p-2 border-b text-center font-semibold text-sm flex flex-col items-center justify-center bg-muted/30 h-full"
          style={{ gridColumn: index + 2, gridRow: 1, borderRight: index < daysInGrid.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
        >
          <span>{format(day, 'EEE')}</span>
          <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
        </div>
      ))}
    </>
  );
};

export default ScheduleGridHeader;