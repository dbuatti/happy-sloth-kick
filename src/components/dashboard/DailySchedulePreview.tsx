import React, { useState } from 'react';
import { useAppointments } from '@/hooks/useAppointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, ListTodo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

const DailySchedulePreview: React.FC = () => {
  const [today] = useState(new Date());
  const { appointments, loading } = useAppointments(today);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Today's Schedule
          </div>
          <Button variant="link" asChild>
            <Link to="/schedule">View Full Schedule</Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No appointments scheduled for today.</p>
        ) : (
          <ul className="space-y-2">
            {appointments.map(app => (
              <li key={app.id} className="flex items-center gap-3 p-2 rounded-md" style={{ borderLeft: `4px solid ${app.color}` }}>
                <div className="text-xs text-muted-foreground font-mono">
                  <p>{format(parseISO(`2000-01-01T${app.start_time}`), 'h:mm a')}</p>
                  <p>{format(parseISO(`2000-01-01T${app.end_time}`), 'h:mm a')}</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm flex items-center gap-1.5">
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