import React, { useMemo } from 'react';
import { format, parseISO, setHours, setMinutes, isSameDay, isBefore, isAfter, addMinutes, differenceInMinutes } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ScheduleItem from './ScheduleItem';
import { ScheduleEvent } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleGridProps {
  currentDate: Date;
  appointments: ScheduleEvent[];
  onEditEvent: (event: ScheduleEvent) => void;
  onDeleteEvent: (id: string) => void;
  onDropEvent: (eventId: string, newTime: Date, newDurationMinutes: number) => void;
  loading: boolean;
  isDemo?: boolean;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  currentDate,
  appointments,
  onEditEvent,
  onDeleteEvent,
  onDropEvent,
  loading,
  isDemo,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 for 24 hours

  const gridHeight = 24 * 60; // Total height in minutes (24 hours * 60 minutes)
  const minuteHeight = 1; // 1px per minute

  const getPositionAndHeight = (event: ScheduleEvent) => {
    const eventDate = 'date' in event ? parseISO(event.date) : currentDate; // Use currentDate for tasks
    const startTimeStr = 'start_time' in event ? event.start_time : '';
    const endTimeStr = 'end_time' in event ? event.end_time : '';

    if (!startTimeStr || !endTimeStr) return null;

    let startDateTime = setMinutes(setHours(eventDate, parseInt(startTimeStr.substring(0, 2))), parseInt(startTimeStr.substring(3, 5)));
    let endDateTime = setMinutes(setHours(eventDate, parseInt(endTimeStr.substring(0, 2))), parseInt(endTimeStr.substring(3, 5)));

    // Handle overnight events: if end time is before start time, assume it's the next day
    if (isBefore(endDateTime, startDateTime)) {
      endDateTime = addMinutes(endDateTime, 24 * 60);
    }

    // Calculate offset from midnight (00:00) of the current day
    const midnight = setMinutes(setHours(currentDate, 0), 0);
    const offsetMinutes = differenceInMinutes(startDateTime, midnight);
    const durationMinutes = differenceInMinutes(endDateTime, startDateTime);

    if (offsetMinutes < 0 || durationMinutes <= 0) return null; // Event starts before midnight or has invalid duration

    return {
      top: offsetMinutes * minuteHeight,
      height: durationMinutes * minuteHeight,
      durationMinutes: durationMinutes,
    };
  };

  const droppableHourIds = useMemo(() => hours.map(h => `hour-${h}`), [hours]);

  return (
    <div className="relative border rounded-lg overflow-hidden bg-background">
      <div className="grid grid-cols-[60px_1fr] min-h-[1440px]"> {/* 1440px for 24 hours * 60 minutes */}
        {/* Time Axis */}
        <div className="relative border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 w-full text-xs text-muted-foreground text-right pr-2 -translate-y-1/2"
              style={{ top: `${(hour * 60) * minuteHeight}px` }}
            >
              {format(setHours(currentDate, hour), 'h a')}
            </div>
          ))}
        </div>

        {/* Schedule Slots */}
        <div className="relative">
          {hours.map((hour) => {
            const { setNodeRef } = useDroppable({
              id: `hour-${hour}`,
              data: { hour, type: 'schedule-slot' },
            });
            return (
              <div
                key={`slot-${hour}`}
                ref={setNodeRef}
                className="absolute left-0 right-0 border-b border-dashed border-border"
                style={{ top: `${(hour * 60) * minuteHeight}px`, height: `${60 * minuteHeight}px` }}
              ></div>
            );
          })}

          {loading ? (
            <div className="absolute inset-0 flex flex-col gap-2 p-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <SortableContext items={appointments.map(app => app.id)} strategy={verticalListSortingStrategy}>
              {appointments.map((event) => {
                const posAndHeight = getPositionAndHeight(event);
                if (!posAndHeight) return null;

                return (
                  <ScheduleItem
                    key={event.id}
                    id={event.id}
                    event={event}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                    isScheduledTask={'task_id' in event && !!event.task_id}
                    className="absolute left-0 right-0"
                    style={{
                      top: `${posAndHeight.top}px`,
                      height: `${posAndHeight.height}px`,
                    }}
                  />
                );
              })}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;