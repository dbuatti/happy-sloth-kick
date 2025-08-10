import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Appointment } from '@/hooks/useAppointments';
import { Task } from '@/hooks/useTasks';
import AppointmentCard from './AppointmentCard';
import { differenceInMinutes, parseISO, isValid } from 'date-fns';

interface DraggableAppointmentCardProps {
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

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = (props) => {
  const { appointment } = props;

  const startTime = parseISO(`2000-01-01T${appointment.start_time}`);
  const endTime = parseISO(`2000-01-01T${appointment.end_time}`);
  const duration = isValid(startTime) && isValid(endTime) ? differenceInMinutes(endTime, startTime) : 0;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: {
      type: 'appointment',
      appointment,
      duration,
    },
  });

  const style = {
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab touch-none">
      <AppointmentCard {...props} />
    </div>
  );
};

export default DraggableAppointmentCard;