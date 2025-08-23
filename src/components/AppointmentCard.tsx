import React from 'react';
import { Appointment, Task } from '@/types';
import { cn } from '@/lib/utils';
import { Clock, Info, Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AppointmentCardProps {
  appointment: Appointment;
  task?: Task | null; // Optional task prop
  onEdit: (appointment: Appointment) => void;
  onUnschedule: (appointmentId: string) => Promise<void>;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, task, onEdit, onUnschedule }) => {
  const startTime = parseISO(`2000-01-01T${appointment.start_time}`);
  const endTime = parseISO(`2000-01-01T${appointment.end_time}`);

  return (
    <TooltipProvider>
      <div
        className="relative p-2 rounded-md text-white text-xs cursor-pointer hover:shadow-lg transition-shadow duration-200"
        style={{ backgroundColor: appointment.color || '#3b82f6' }}
        onClick={() => onEdit(appointment)}
      >
        <div className="font-semibold">{appointment.title}</div>
        <div className="flex items-center mt-1">
          <Clock className="h-3 w-3 mr-1" />
          <span>{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</span>
        </div>
        {appointment.description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-1 right-1 p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-40">
                <Info className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{appointment.description}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {task && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute bottom-1 left-1 p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-40">
                <span className="text-xs">🔗</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Linked Task: {task.description}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <div className="absolute bottom-1 right-1 flex space-x-1">
          <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white hover:bg-opacity-20" onClick={(e) => { e.stopPropagation(); onEdit(appointment); }}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white hover:bg-opacity-20" onClick={(e) => { e.stopPropagation(); onUnschedule(appointment.id); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AppointmentCard;