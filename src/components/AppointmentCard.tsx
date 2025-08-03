import React from 'react';
import { Appointment } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Info, ListTodo } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  gridRowStart: number;
  gridRowEnd: number;
  overlapOffset: number;
  rowHeight: number;
  gapHeight: number;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onEdit,
  gridRowStart,
  gridRowEnd,
  overlapOffset,
  rowHeight,
  gapHeight,
}) => {
  const calculatedTop = (gridRowStart - 1) * (rowHeight + gapHeight);
  const numberOfBlocksSpanned = gridRowEnd - gridRowStart;
  const calculatedHeight = numberOfBlocksSpanned * rowHeight + (numberOfBlocksSpanned > 0 ? (numberOfBlocksSpanned - 1) * gapHeight : 0);

  const calculatedLeft = overlapOffset * 10;
  const calculatedWidth = `calc(100% - ${calculatedLeft}px)`;

  const style = {
    top: `${calculatedTop}px`,
    height: `${calculatedHeight}px`,
    backgroundColor: appointment.color,
    left: `${calculatedLeft}px`,
    width: calculatedWidth,
  };

  const startTime = parseISO(`2000-01-01T${appointment.start_time}`);
  const endTime = parseISO(`2000-01-01T${appointment.end_time}`);

  return (
    <div
      style={style}
      className={cn(
        "absolute rounded-lg p-2 text-white shadow-md",
        "flex flex-row justify-between items-start transition-all duration-200 ease-in-out",
        "cursor-pointer hover:scale-[1.01] hover:shadow-lg"
      )}
      onClick={() => onEdit(appointment)}
    >
      <div className="flex-grow h-full">
        <h4 className="font-semibold text-sm truncate flex items-center gap-1.5">
          {appointment.task_id && <ListTodo className="h-3.5 w-3.5 flex-shrink-0" />}
          {appointment.title}
        </h4>
        <p className="text-xs opacity-90">
          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
        </p>
        {appointment.description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-white opacity-70 mt-1" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">{appointment.title}</p>
              <p className="text-sm">{appointment.description}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;