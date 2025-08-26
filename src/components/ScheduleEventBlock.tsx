"use client";

import React from 'react';
import { format, isValid } from 'date-fns';

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
  className?: string; // Add className prop for Tailwind positioning
}

const ScheduleEventBlock: React.FC<ScheduleEventBlockProps> = ({ event, top, height, className }) => {
  const dummyDate = '2000-01-01T';
  const startDate = new Date(`${dummyDate}${event.start_time}`);
  const endDate = new Date(`${dummyDate}${event.end_time}`);

  const startTime = isValid(startDate) ? format(startDate, 'h:mm a') : 'Invalid Time';
  const endTime = isValid(endDate) ? format(endDate, 'h:mm a') : 'Invalid Time';

  return (
    <div
      className={`absolute rounded-md p-2 text-white text-xs overflow-hidden shadow-md ${className}`} // Apply className here
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