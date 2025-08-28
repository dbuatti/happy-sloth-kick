import React from 'react';
import { format, getMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeBlock {
  start: Date;
  end: Date;
}

interface ScheduleTimeColumnProps {
  visibleTimeBlocks: TimeBlock[];
  rowHeight: number;
}

const ScheduleTimeColumn: React.FC<ScheduleTimeColumnProps> = ({ visibleTimeBlocks, rowHeight }) => {
  return (
    <>
      {visibleTimeBlocks.map((block, blockIndex) => (
        <div key={`time-label-${blockIndex}`} className={cn(
          "p-2 border-b border-r text-right font-medium text-muted-foreground flex items-center justify-end bg-muted/30",
          getMinutes(block.start) === 0 ? "text-sm" : "text-xs opacity-70"
        )}
          style={{ gridColumn: 1, gridRow: blockIndex + 2, height: `${rowHeight}px` }}
        >
          {getMinutes(block.start) === 0 && format(block.start, 'h a')}
        </div>
      ))}
    </>
  );
};

export default ScheduleTimeColumn;