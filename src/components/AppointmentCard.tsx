"use client";

import React from 'react';
import { Appointment } from '@/hooks/useAppointments';
import { Task } from '@/types/task'; // Corrected import
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Clock, ListTodo } from 'lucide-react'; // Removed unused CalendarIcon

interface AppointmentCardProps {
  appointment: Appointment;
  task?: Task | null;
  onClick?: (appointment: Appointment) => void;
  className?: string;
  isDragging?: boolean;
  isOverlay?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  task,
  onClick,
  className,
  isDragging = false,
  isOverlay = false,
}) => {
  const startTime = appointment.start_time ? format(parseISO(`2000-01-01T${appointment.start_time}`), 'h:mm a') : 'No start time';
  const endTime = appointment.end_time ? format(parseISO(`2000-01-01T${appointment.end_time}`), 'h:mm a') : 'No end time';

  const handleClick = () => {
    if (onClick) {
      onClick(appointment);
    }
  };

  return (
    <div
      className={cn(
        "relative p-2 rounded-lg shadow-sm text-white text-sm cursor-pointer transition-all duration-200 ease-in-out",
        appointment.color || "bg-blue-500", // Default color if none provided
        isDragging && !isOverlay ? "opacity-0" : "opacity-100",
        isOverlay ? "ring-2 ring-primary shadow-lg" : "",
        className
      )}
      style={{ backgroundColor: appointment.color || undefined }}
      onClick={handleClick}
    >
      <h4 className="font-semibold truncate">{appointment.title}</h4>
      <div className="flex items-center text-xs mt-1">
        <Clock className="h-3 w-3 mr-1" />
        <span>{startTime} - {endTime}</span>
      </div>
      {task && (
        <div className="flex items-center text-xs mt-1">
          <ListTodo className="h-3 w-3 mr-1" />
          <span>{task.description}</span>
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;