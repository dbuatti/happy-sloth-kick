import React from 'react';
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
  onEdit: (appointment: Appointment) => void; // This will now be triggered by clicking the card
  onDelete: (id: string) => void; // Still passed, but will be called from the form
  gridRowStart: number;
  gridRowEnd: number;
  overlapOffset: number;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onEdit,
  onDelete, // No longer directly used here for UI, but kept for prop consistency
  gridRowStart,
  gridRowEnd,
  overlapOffset,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: appointment.id, data: { type: 'appointment', appointment } });

  const rowHeight = 48; // Height of a 30-minute block in px (from h-12)
  const gapHeight = 4;  // Gap between blocks in px (from gap-1)

  // Calculate top position: (start_block_index - 1) * (row_height + gap_height)
  const calculatedTop = (gridRowStart - 1) * (rowHeight + gapHeight);
  
  // Calculate height: (number_of_blocks_spanned) * row_height + (number_of_gaps_within_span) * gap_height
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
        "absolute rounded-lg p-2 text-white shadow-md cursor-pointer", // Changed cursor to pointer
        "flex flex-col justify-between transition-all duration-200 ease-in-out",
        "group",
        isDragging ? "ring-2 ring-primary" : ""
      )}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(appointment)} // Make the entire card clickable for edit
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
            <Info className="h-4 w-4 text-white opacity-70 self-end mt-1" /> {/* Removed group-hover opacity */}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold">{appointment.title}</p>
            <p className="text-sm">{appointment.description}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Removed edit/delete buttons from here, they will be in the form */}
    </div>
  );
};

export default AppointmentCard;