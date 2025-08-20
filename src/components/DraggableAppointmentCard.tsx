import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import AppointmentCard from '@/components/AppointmentCard';
import { Appointment } from '@/hooks/useAppointments';
import { Task } from '@/hooks/useTasks';

interface DraggableAppointmentCardProps {
  appointment: Appointment & { trackIndex: number; totalTracks: number };
  task?: Task;
  onEdit: (appointment: Appointment) => void;
  onUnschedule: (appointmentId: string) => void;
  trackIndex: number;
  totalTracks: number;
  style?: React.CSSProperties;
}

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = ({
  appointment,
  task,
  onEdit,
  onUnschedule,
  trackIndex,
  totalTracks,
  style,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: {
      type: 'appointment',
      appointment,
      duration: appointment.end_time && appointment.start_time 
        ? (new Date(`2000-01-01T${appointment.end_time}`).getTime() - new Date(`2000-01-01T${appointment.start_time}`).getTime()) / 60000 
        : 30
    },
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    ...style,
  };

  return (
    <div ref={setNodeRef} style={dragStyle} {...listeners} {...attributes} className="relative">
      <AppointmentCard
        appointment={appointment}
        task={task}
        onEdit={onEdit}
        onUnschedule={onUnschedule}
        trackIndex={trackIndex}
        totalTracks={totalTracks}
      />
    </div>
  );
};

export default DraggableAppointmentCard;