import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Appointment, Task } from '@/types'; // Corrected imports
import AppointmentCard from './AppointmentCard';

interface DraggableAppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  linkedTask?: Task;
}

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = ({ appointment, onEdit, onDelete, linkedTask }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: appointment.id,
    data: {
      type: 'Appointment',
      appointment,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <AppointmentCard
        appointment={appointment}
        onEdit={onEdit}
        onDelete={onDelete}
        linkedTask={linkedTask}
      />
    </div>
  );
};

export default DraggableAppointmentCard;