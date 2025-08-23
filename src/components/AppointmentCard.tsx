import React from 'react';
import { Appointment, Task } from '@/types';
import { cn } from '@/lib/utils';
import { Clock, Info, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppointmentCardProps {
  appointment: Appointment;
  task?: Task;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => Promise<void>;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, task, onEdit, onDelete }) => {
  return (
    <div
      className={cn(
        "relative p-2 rounded-md text-white text-sm flex flex-col justify-between",
        "hover:shadow-lg transition-shadow duration-200 ease-in-out",
        "min-h-[60px]"
      )}
      style={{ backgroundColor: appointment.color || '#3b82f6' }}
    >
      <div className="flex justify-between items-start">
        <h4 className="font-semibold leading-tight">{appointment.title}</h4>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => onEdit(appointment)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => onDelete(appointment.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex items-center text-xs mt-1">
        <Clock className="h-3 w-3 mr-1" />
        <span>{appointment.start_time} - {appointment.end_time}</span>
      </div>
      {task && (
        <div className="flex items-center text-xs mt-1">
          <Info className="h-3 w-3 mr-1" />
          <span>Task: {task.description}</span>
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;