import React from 'react';
import { Appointment, Task } from '@/types'; // Corrected imports
import { cn } from '@/lib/utils';
import { Clock, Calendar as CalendarIcon, MapPin, Info, Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  linkedTask?: Task;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onEdit, onDelete, linkedTask }) => {
  const startTime = appointment.start_time ? format(parseISO(`2000-01-01T${appointment.start_time}`), 'h:mm a') : 'N/A';
  const endTime = appointment.end_time ? format(parseISO(`2000-01-01T${appointment.end_time}`), 'h:mm a') : 'N/A';

  return (
    <div
      className={cn(
        "relative flex items-center space-x-3 p-3 rounded-lg shadow-sm border-l-4",
        `border-[${appointment.color}]`
      )}
      style={{ borderColor: appointment.color }}
    >
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{appointment.title}</h3>
        {appointment.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{appointment.description}</p>
        )}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
          <Clock className="h-3 w-3 mr-1" />
          <span>{startTime} - {endTime}</span>
        </div>
        {linkedTask && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
            <Info className="h-3 w-3 mr-1" />
            <span>Linked Task: {linkedTask.description}</span>
          </div>
        )}
      </div>
      <div className="flex space-x-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(appointment)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(appointment.id)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
};

export default AppointmentCard;