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
  overlapOffset: number; // New prop
  style?: React.CSSProperties; // Make style prop optional
}

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = (props) => {
  const { appointment, overlapOffset } = props; // Destructure overlapOffset

  const startTime = appointment.start_time ? parseISO(`2000-01-01T${appointment.start_time}`) : null;
  const endTime = appointment.end_time ? parseISO(`2000-01-01T${appointment.end_time}`) : null;
  const duration = startTime && endTime && isValid(startTime) && isValid(endTime) ? differenceInMinutes(endTime, startTime) : 0;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: {
      type: 'appointment',
      appointment,
      duration,
    },
  });

  const draggableStyle: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    ...props.style, // Merge passed style with draggable style
    position: 'relative', // Make this container relative for absolute children
    height: '100%', // Ensure it fills its grid row height
  };

  return (
    <div ref={setNodeRef} style={draggableStyle} {...attributes} {...listeners} className="cursor-grab touch-none select-none">
      <AppointmentCard
        {...props}
        // Pass positioning props to AppointmentCard for absolute positioning within this div
        left={overlapOffset * 10}
        width={`calc(100% - ${overlapOffset * 10}px)`}
      />
    </div>
  );
};

export default DraggableAppointmentCard;