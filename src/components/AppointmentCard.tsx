import React, { useRef } from 'react';
import { Appointment } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Info, ListTodo, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  gridRowStart: number;
  gridRowEnd: number;
  overlapOffset: number;
  isOverlay?: boolean; // New prop
  rowHeight: number; // New prop
  gapHeight: number; // New prop
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onEdit,
  gridRowStart,
  gridRowEnd,
  overlapOffset,
  isOverlay = false, // Default to false
  rowHeight, // Destructure new prop
  gapHeight, // Destructure new prop
}) => {
  const sortable = !isOverlay ? useSortable({ id: appointment.id, data: { type: 'appointment', appointment } }) : null;

  const attributes = sortable?.attributes;
  const listeners = sortable?.listeners;
  const setNodeRef = sortable?.setNodeRef || useRef(null).current;
  const transform = sortable?.transform;
  const transition = sortable?.transition;
  const isDragging = sortable?.isDragging || false;

  const calculatedTop = (gridRowStart - 1) * (rowHeight + gapHeight);
  const numberOfBlocksSpanned = gridRowEnd - gridRowStart;
  const calculatedHeight = numberOfBlocksSpanned * rowHeight + (numberOfBlocksSpanned > 0 ? (numberOfBlocksSpanned - 1) * gapHeight : 0);

  const calculatedLeft = overlapOffset * 10;
  const calculatedWidth = `calc(100% - ${calculatedLeft}px)`;

  const style = {
    transform: CSS.Transform.toString(transform || null),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
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
      ref={setNodeRef}
      style={style}
      className={cn(
        "absolute rounded-lg p-2 text-white shadow-md",
        "flex flex-row justify-between items-start transition-all duration-200 ease-in-out",
        "group",
        isDragging ? "ring-2 ring-primary shadow-lg" : "hover:scale-[1.01] hover:shadow-lg",
      )}
      {...(attributes || {})}
    >
      <div className="flex-grow cursor-pointer h-full" onClick={() => onEdit(appointment)}>
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
      <div 
        className="cursor-grab p-1 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-white/70" />
      </div>
    </div>
  );
};

export default AppointmentCard;