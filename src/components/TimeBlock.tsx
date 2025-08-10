import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TimeBlockActionMenu from '@/components/TimeBlockActionMenu';
import { Appointment } from '@/hooks/useAppointments';
import { Task, TaskSection } from '@/hooks/useTasks';
import { format, parse } from 'date-fns';

interface TimeBlockProps {
  block: { start: Date; end: Date };
  index: number;
  appointmentsWithPositions: (Appointment & { gridRowStart: number; gridRowEnd: number; overlapOffset: number; })[];
  isDemo: boolean;
  onAddAppointment: (block: { start: Date; end: Date }) => void;
  onScheduleTask: (taskId: string, blockStart: Date) => void;
  unscheduledTasks: Task[];
  sections: TaskSection[];
  currentDate: Date;
}

const TimeBlock: React.FC<TimeBlockProps> = ({ block, index, appointmentsWithPositions, isDemo, onAddAppointment, onScheduleTask, unscheduledTasks, sections, currentDate }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `block-${format(block.start, 'HH:mm')}`,
    data: { type: 'time-block', time: block.start },
  });

  const isBlockOccupied = appointmentsWithPositions.some(app => {
    if (!app.start_time || !app.end_time) return false;
    const appStart = parse(app.start_time, 'HH:mm:ss', currentDate);
    const appEnd = parse(app.end_time, 'HH:mm:ss', currentDate);
    return block.start.getTime() >= appStart.getTime() && block.start.getTime() < appEnd.getTime();
  });

  return (
    <div
      ref={setNodeRef}
      className="relative h-full w-full border-t border-gray-200/80 dark:border-gray-700/80"
      style={{ gridRow: `${index + 1}`, zIndex: 1 }}
    >
      {isOver && <div className="absolute inset-0 bg-primary/20 rounded-lg" />}
      {!isBlockOccupied && !isDemo && (
        <Popover>
          <PopoverTrigger asChild>
            <div className="absolute inset-0 cursor-pointer rounded-lg hover:bg-muted/50 transition-colors" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1">
            <TimeBlockActionMenu
              block={block}
              onAddAppointment={() => onAddAppointment(block)}
              onScheduleTask={onScheduleTask}
              unscheduledTasks={unscheduledTasks}
              sections={sections}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default TimeBlock;