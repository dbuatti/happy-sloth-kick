import React from 'react';
import { format, addMinutes, parse, isBefore, getMinutes, getHours, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TimeBlockActionMenu from '@/components/TimeBlockActionMenu';
import { WorkHour } from '@/hooks/useWorkHours';
import { Task, TaskSection } from '@/hooks/useTasks';

interface TimeBlock {
  start: Date;
  end: Date;
}

interface ScheduleDayGridCellsProps {
  daysInGrid: Date[];
  visibleTimeBlocks: TimeBlock[];
  rowHeight: number;
  getWorkHoursForDay: (date: Date) => WorkHour | null;
  handleOpenAppointmentForm: (block: { start: Date; end: Date }, date: Date) => void;
  handleScheduleTask: (taskId: string, blockStart: Date, targetDate: Date) => Promise<void>;
  unscheduledDoTodayTasks: Task[];
  sections: TaskSection[];
  isDemo: boolean;
}

const ScheduleDayGridCells: React.FC<ScheduleDayGridCellsProps> = ({
  daysInGrid,
  visibleTimeBlocks,
  rowHeight,
  getWorkHoursForDay,
  handleOpenAppointmentForm,
  handleScheduleTask,
  unscheduledDoTodayTasks,
  sections,
  isDemo,
}) => {
  return (
    <>
      {visibleTimeBlocks.map((block, blockIndex) => (
        <React.Fragment key={`row-cells-${blockIndex}`}>
          {daysInGrid.map((day, dayIndex) => {
            const workHoursForDay = getWorkHoursForDay(day);
            const dayStartTime = workHoursForDay ? parse(workHoursForDay.start_time, 'HH:mm:ss', day) : null;
            const dayEndTime = workHoursForDay ? parse(workHoursForDay.end_time, 'HH:mm:ss', day) : null;

            const blockStartWithDate = setHours(setMinutes(day, getMinutes(block.start)), getHours(block.start));
            const blockEndWithDate = addMinutes(blockStartWithDate, 30);

            const isOutsideWorkHours = workHoursForDay && (!workHoursForDay.enabled || isBefore(blockStartWithDate, dayStartTime!) || !isBefore(blockStartWithDate, dayEndTime!));

            return (
              <div
                key={`${format(day, 'yyyy-MM-dd')}-${format(block.start, 'HH:mm')}`}
                className={cn(
                  "relative h-full w-full",
                  "border-b border-gray-200 dark:border-gray-700", // Softer border
                  dayIndex < daysInGrid.length - 1 && "border-r",
                  isOutsideWorkHours ? "bg-muted/10" : "bg-background", // Lighter background for non-work hours
                  "hover:bg-muted/50 transition-colors duration-100"
                )}
                style={{ gridColumn: dayIndex + 2, gridRow: blockIndex + 2, height: `${rowHeight}px`, zIndex: 1 }}
                data-time-block-start={blockStartWithDate.toISOString()}
                data-time-block-end={blockEndWithDate.toISOString()}
                data-time-block-date={day.toISOString()}
                data-time-block-type="time-block"
              >
                {/* Dashed line in the middle of each 30-min block */}
                <div className="absolute top-1/2 w-full border-b border-dashed border-gray-100 dark:border-gray-800" /> {/* More subtle dashed line */}
                
                {!isOutsideWorkHours && !isDemo && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="absolute inset-0 cursor-pointer rounded-lg hover:bg-muted/50 transition-colors" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1">
                      <TimeBlockActionMenu
                        block={{ start: blockStartWithDate, end: blockEndWithDate }}
                        onAddAppointment={(b) => handleOpenAppointmentForm(b, day)}
                        onScheduleTask={(taskId, bStart) => handleScheduleTask(taskId, bStart, day)}
                        unscheduledTasks={unscheduledDoTodayTasks}
                        sections={sections}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
};

export default ScheduleDayGridCells;