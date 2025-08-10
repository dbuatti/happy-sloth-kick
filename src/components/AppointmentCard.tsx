import React from 'react';
import { Appointment } from '@/hooks/useAppointments';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { Info, ListTodo, CheckCircle2, X, MoreHorizontal, Edit } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AppointmentCardProps {
  appointment: Appointment;
  task?: Task;
  onEdit: (appointment: Appointment) => void;
  onUnschedule: (appointmentId: string) => void;
  gridRowStart: number;
  gridRowEnd: number;
  overlapOffset: number;
  rowHeight: number;
  gapHeight: number;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  task,
  onEdit,
  onUnschedule,
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
    zIndex: 10,
  };

  const startTime = appointment.start_time ? parseISO(`2000-01-01T${appointment.start_time}`) : null;
  const endTime = appointment.end_time ? parseISO(`2000-01-01T${appointment.end_time}`) : null;

  const isCompleted = task?.status === 'completed';

  return (
    <div
      style={style}
      className={cn(
        "absolute rounded-lg p-2 shadow-md group text-white",
        "flex flex-col justify-start items-start transition-all duration-200 ease-in-out",
        isCompleted && "opacity-70"
      )}
    >
      <div className="flex-grow w-full">
        <h4 className="font-semibold text-sm truncate flex items-center gap-1.5">
          {task ? (
            isCompleted ? (
              <div className="h-3.5 w-3.5 flex-shrink-0 bg-white rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            ) : (
              <ListTodo className="h-3.5 w-3.5 flex-shrink-0" />
            )
          ) : null}
          {appointment.title}
        </h4>
        <p className="text-xs opacity-90">
          {startTime && endTime && isValid(startTime) && isValid(endTime) ? `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}` : 'Invalid time'}
        </p>
      </div>
      {appointment.description && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-white opacity-0 group-hover:opacity-70 mt-1 transition-opacity" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold">{appointment.title}</p>
            <p className="text-sm">{appointment.description}</p>
          </TooltipContent>
        </Tooltip>
      )}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" data-no-dnd="true">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-black/20 hover:bg-black/40 text-white">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onEdit(appointment)}>
              <Edit className="mr-2 h-4 w-4" /> Edit/Details
            </DropdownMenuItem>
            {task && (
              <DropdownMenuItem onSelect={() => onUnschedule(appointment.id)} className="text-destructive focus:text-destructive">
                <X className="mr-2 h-4 w-4" /> Unschedule Task
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default AppointmentCard;