import React, { useState } from 'react';
import { useAppointments } from '@/hooks/useAppointments';
import { CalendarDays, ListTodo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components

const DailySchedulePreview: React.FC = () => {
  const [today] = useState(new Date());
  const { appointments, loading } = useAppointments({ startDate: today, endDate: today });

  return (
    <Card className="h-full shadow-lg rounded-xl"> {/* Changed from fieldset to Card */}
      <CardHeader className="pb-2"> {/* Adjusted padding */}
        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2"> {/* Adjusted font size and alignment */}
          <CalendarDays className="h-5 w-5 text-primary" /> Today's Schedule
        </CardTitle>
        <div className="flex justify-end"> {/* Moved "View Full Schedule" here */}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link to="/schedule">View Full Schedule</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0"> {/* Adjusted padding */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {appointments.map(app => (
              <li key={app.id} className="flex items-center gap-3 p-2 rounded-md" style={{ borderLeft: `4px solid ${app.color}` }}>
                <div className="text-xs text-muted-foreground font-mono">
                  <p>{format(parseISO(`2000-01-01T${app.start_time}`), 'h:mm a')}</p>
                  <p>{format(parseISO(`2000-01-01T${app.end_time}`), 'h:mm a')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-1.5 truncate">
                    {app.task_id && <ListTodo className="h-3.5 w-3.5 flex-shrink-0" />}
                    {app.title}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySchedulePreview;