"use client";

import React from 'react';
import { format } from 'date-fns';

interface ScheduleEventBlockProps {
  event: {
    id: string;
    title: string;
    description?: string | null;
    start_time: string;
    end_time: string;
    color: string;
  };
  top: number; // in pixels
  height: number; // in pixels
}

const ScheduleEventBlock: React.FC<ScheduleEventBlockProps> = ({ event, top, height }) => {
  const startTime = format(new Date(`2000-01-01T${event.start_time}`), 'h:mm a');
  const endTime = format(new Date(`2000-01-01T${event.end_time}`), 'h:mm a');

  return (
    <div
      className="absolute left-0 right-0 rounded-md p-2 text-white text-xs overflow-hidden shadow-md"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: event.color,
      }}
    >
      <p className="font-semibold leading-tight">{event.title}</p>
      <p className="leading-tight">{startTime} - {endTime}</p>
      {event.description && height > 40 && ( // Only show description if there's enough space
        <p className="mt-1 text-xs leading-tight truncate">{event.description}</p>
      )}
    </div>
  );
};

export default ScheduleEventBlock;