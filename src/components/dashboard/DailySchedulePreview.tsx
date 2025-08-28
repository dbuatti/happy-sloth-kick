import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, Clock } from 'lucide-react';
import { format, parseISO, setHours, setMinutes, addMinutes, differenceInMinutes, isBefore } from 'date-fns';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { ScheduleEvent } from '@/types/schedule';
import ScheduleItem from '../schedule/ScheduleItem'; // Import the new ScheduleItem

const DailySchedulePreview: React.FC = () => {
  const today = new Date();
  const { appointments, loading: appointmentsLoading } = useAppointments({ startDate: today, endDate: today });
  const { tasks: allTasks, loading: tasksLoading } = useTasks({ currentDate: today }); // Fetch all tasks to link with appointments

  const loading = appointmentsLoading || tasksLoading;

  const scheduledEvents: ScheduleEvent[] = useMemo(() => {
    const events: ScheduleEvent[] = [...appointments];

    // Filter tasks that are explicitly scheduled (have a corresponding appointment)
    const scheduledTaskIds = new Set(appointments.filter(app => app.task_id).map(app => app.task_id));
    
    // Add tasks that are linked to appointments
    allTasks.forEach(task => {
      if (scheduledTaskIds.has(task.id)) {
        // Find the corresponding appointment and merge relevant task data
        const appointment = appointments.find(app => app.task_id === task.id);
        if (appointment) {
          // Create a new object that looks like an appointment but has task details
          events.push({
            ...appointment,
            title: task.description || appointment.title, // Prefer task description
            description: task.notes || appointment.description, // Prefer task notes
            task_id: task.id,
          });
        }
      }
    });

    return events.sort((a, b) => {
      const aTime = parseISO(`2000-01-01T${'start_time' in a ? a.start_time : '00:00:00'}`);
      const bTime = parseISO(`2000-01-01T${'start_time' in b ? b.start_time : '00:00:00'}`);
      return aTime.getTime() - bTime.getTime();
    });
  }, [appointments, allTasks]);

  const getPositionAndHeight = (event: ScheduleEvent) => {
    const startTimeStr = 'start_time' in event ? event.start_time : '';
    const endTimeStr = 'end_time' in event ? event.end_time : '';

    if (!startTimeStr || !endTimeStr) return null;

    let startDateTime = setMinutes(setHours(today, parseInt(startTimeStr.substring(0, 2))), parseInt(startTimeStr.substring(3, 5)));
    let endDateTime = setMinutes(setHours(today, parseInt(endTimeStr.substring(0, 2))), parseInt(endTimeStr.substring(3, 5)));

    if (isBefore(endDateTime, startDateTime)) {
      endDateTime = addMinutes(endDateTime, 24 * 60);
    }

    const midnight = setMinutes(setHours(today, 0), 0);
    const offsetMinutes = differenceInMinutes(startDateTime, midnight);
    const durationMinutes = differenceInMinutes(endDateTime, startDateTime);

    if (offsetMinutes < 0 || durationMinutes <= 0) return null;

    return {
      top: offsetMinutes, // 1px per minute for preview
      height: durationMinutes,
    };
  };

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" /> Daily Schedule
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/schedule">View Full Schedule</Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : scheduledEvents.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p className="text-sm">No appointments or tasks scheduled for today.</p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/schedule"><Plus className="mr-1 h-4 w-4" /> Add to Schedule</Link>
            </Button>
          </div>
        ) : (
          <div className="relative h-[200px] overflow-hidden border rounded-lg bg-background">
            <div className="grid grid-cols-[40px_1fr] h-full">
              {/* Time Axis */}
              <div className="relative border-r">
                {Array.from({ length: 24 }, (_, i) => i).filter(hour => hour % 3 === 0).map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 w-full text-xs text-muted-foreground text-right pr-1 -translate-y-1/2"
                    style={{ top: `${(hour * 60) * (200 / 1440)}px` }} // Scale to 200px height
                  >
                    {format(setHours(today, hour), 'ha')}
                  </div>
                ))}
              </div>

              {/* Schedule Slots */}
              <div className="relative">
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <div
                    key={`slot-${hour}`}
                    className="absolute left-0 right-0 border-b border-dashed border-border"
                    style={{ top: `${(hour * 60) * (200 / 1440)}px`, height: `${60 * (200 / 1440)}px` }}
                  ></div>
                ))}

                {scheduledEvents.map((event) => {
                  const posAndHeight = getPositionAndHeight(event);
                  if (!posAndHeight) return null;

                  return (
                    <ScheduleItem
                      key={event.id}
                      id={event.id} // DND requires an ID
                      event={event}
                      onEdit={() => {}} // Dummy functions for preview
                      onDelete={() => {}} // Dummy functions for preview
                      isScheduledTask={'task_id' in event && !!event.task_id}
                      className="absolute left-0 right-0"
                      style={{
                        top: `${posAndHeight.top * (200 / 1440)}px`,
                        height: `${posAndHeight.height * (200 / 1440)}px`,
                        zIndex: 10, // Ensure events are above grid lines
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySchedulePreview;