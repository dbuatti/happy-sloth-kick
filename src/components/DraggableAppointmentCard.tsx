import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Appointment, Task, DraggableAppointmentCardProps } from '@/types';
import AppointmentCard from './AppointmentCard';

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = ({
  appointment,
  task,
  onEdit,
  onUnschedule,
  trackIndex,
  totalTracks,
  style: propStyle,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: {
      type: 'appointment',
      appointment,
      trackIndex,
    },
  });

  const style = {
    ...propStyle,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AppointmentCard
        appointment={appointment}
        task={task}
        onEdit={onEdit}
        onUnschedule={onUnschedule}
      />
    </div>
  );
};

export default DraggableAppointmentCard;