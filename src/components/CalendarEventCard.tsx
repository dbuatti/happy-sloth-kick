"use client";

import React from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';

interface CalendarEventCardProps {
  event: {
    id: string;
    title: string;
    description?: string | null;
    date: string; // Assuming ISO date string
    start_time: string; // Assuming HH:MM:SS string
    end_time: string; // Assuming HH:MM:SS string
    color: string;
  };
}

const CalendarEventCard: React.FC<CalendarEventCardProps> = ({ event }) => {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="mb-2 shadow-sm border-l-4" style={{ borderColor: event.color }}>
      <CardContent className="p-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold leading-none">{event.title}</CardTitle>
          <Badge className="text-xs" style={{ backgroundColor: event.color, color: 'white' }}>
            {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
          </Badge>
        </div>
        {event.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
        )}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
          <CalendarDays className="h-4 w-4 mr-1" />
          <span>{formattedDate}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarEventCard;