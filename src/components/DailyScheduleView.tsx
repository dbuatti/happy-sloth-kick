"use client";

import React from 'react';
import { format, setHours, setMinutes, isValid } from 'date-fns';
import ScheduleEventBlock from './ScheduleEventBlock';

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface DailyScheduleViewProps {
  appointments?: Appointment[];
  selectedDate: Date;
}

const HOUR_HEIGHT_PX = 64; // Each hour block is 64px tall (h-16)

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({ appointments = [], selectedDate }) => {
  const timeSlots = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 for hours

  const getMinutesFromMidnight = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const eventsForDisplay = appointments.map(event => {
    const startMinutes = getMinutesFromMidnight(event.start_time);
    const endMinutes = getMinutesFromMidnight(event.end_time);

    const top = (startMinutes / 60) * HOUR_HEIGHT_PX;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT_PX;

    return {
      ...event,
      top,
      height,
    };
  });

  return (
    <div className="flex border rounded-lg overflow-hidden bg-white dark:bg-gray-800"> {/* Removed 'relative' from here */}
      {/* Time Labels Column */}
      <div className="w-20 flex-shrink-0 border-r dark:border-gray-700">
        {timeSlots.map((hour) => (
          <div
            key={hour}
            className="h-16 flex items-start justify-end pr-2 pt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            {isValid(selectedDate) ? format(setMinutes(setHours(selectedDate, hour), 0), 'h a') : ''}
          </div>
        ))}
      </div>

      {/* Schedule Grid Column - this is the positioning context for events */}
      <div className="flex-grow relative bg-red-100 dark:bg-red-900"> {/* Added relative and temporary background for debugging */}
        {/* Hour lines */}
        {timeSlots.map((hour) => (
          <div
            key={`line-${hour}`}
            className="h-16 border-b border-dashed border-gray-200 dark:border-gray-700 last:border-b-0"
          />
        ))}

        {/* Events - now children of the schedule grid column */}
        {eventsForDisplay.map((event) => (
          <ScheduleEventBlock
            key={event.id}
            event={event}
            top={event.top}
            height={event.height}
            // Re-added left-0 right-0 to ScheduleEventBlock's className
            className="left-0 right-0" 
          />
        ))}
      </div>
    </div>
  );
};

export default DailyScheduleView;