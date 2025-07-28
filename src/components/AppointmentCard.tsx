import React, { useRef } from 'react'; // Import useRef
import { Appointment } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Edit, Trash2, Info } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
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
  onDelete,
  gridRowStart,
  gridRowEnd,
  overlapOffset,
  isOverlay = false, // Default to false
  rowHeight, // Destructure new prop
  gapHeight, // Destructure new prop
}) => {
  // Conditionally use useSortable
  const sortable = !isOverlay ? useSortable({ id: appointment.id, data: { type: 'appointment', appointment } }) : null;

  const attributes = sortable?.attributes;
  const listeners = sortable?.listeners;
  const setNodeRef = sortable?.setNodeRef || useRef(null).current; // Provide a dummy ref if not sortable
  const transform = sortable?.transform;
  const transition = sortable?.transition;
  const isDragging = sortable?.isDragging || false; // Default to false if not sortable

  const calculatedTop = (gridRowStart - 1) * (rowHeight + gapHeight);
  const numberOfBlocksSpanned = gridRowEnd - gridRowStart;
  const calculatedHeight = numberOfBlocksSpanned * rowHeight + (numberOfBlocksSpanned > 0 ? (numberOfBlocksSpanned - 1) * gapHeight : 0);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    top: `${calculatedTop}px`,
    height: `${calculatedHeight}px`,
    backgroundColor: appointment.color,
    left: `${overlapOffset * 10}px`,
    width: `calc(100% - ${overlapOffset * 10}px)`,
  };

  const startTime = parseISO(`2000-01-01T${appointment.start_time}`);
  const endTime = parseISO(`2000-01-01T${appointment.end_time}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "absolute rounded-lg p-1 text-white shadow-md cursor-pointer", // Reduced p-2 to p-1
        "flex flex-col justify-between transition-all duration-200 ease-in-out",
        "group",
        isDragging ? "ring-2 ring-primary shadow-lg" : "hover:scale-[1.01] hover:shadow-lg"
      )}
      {...(attributes || {})} // Conditionally spread attributes
      {...(listeners || {})} // Conditionally spread listeners
      onClick={() => onEdit(appointment)}
    >
      <div className="flex flex-col">
        <h4 className="font-semibold text-sm truncate">{appointment.title}</h4>
        <p className="text-xs opacity-90">
          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
        </p>
      </div>

      {appointment.description && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-white opacity-70 self-end mt-1" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold">{appointment.title}</p>
            <p className="text-sm">{appointment.description}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default AppointmentCard;