"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Appointment } from '@/hooks/useAppointments';
import { Task } from '@/types/task'; // Corrected import
import AppointmentCard from './AppointmentCard';
import { cn } from '@/lib/utils';

interface DraggableAppointmentCardProps {
  appointment: Appointment;
  task?: Task | null;
  onClick?: (appointment: Appointment) => void;
  className?: string;
}

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = ({
  appointment,
  task,
  onClick,
  className,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: { type: 'appointment', appointment },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 10 : 'auto',
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(isDragging ? "opacity-50" : "", className)}
    >
      <AppointmentCard
        appointment={appointment}
        task={task}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
};

export default DraggableAppointmentCard;