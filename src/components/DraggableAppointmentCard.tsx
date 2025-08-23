import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Appointment, Task, DraggableAppointmentCardProps } from '@/types';
import AppointmentCard from './AppointmentCard';

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = ({
  id,
  appointment,
  task,
  onEdit,
  onDelete,
  trackIndex,
  totalTracks,
  style: propStyle,
  isDragging: propIsDragging,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    ...propStyle,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group">
      <AppointmentCard appointment={appointment} task={task} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};

export default DraggableAppointmentCard;