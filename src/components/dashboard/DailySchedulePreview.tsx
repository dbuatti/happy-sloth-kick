import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/context/AuthContext';
import { format, isSameDay, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Appointment } from '@/types/task';

interface DailySchedulePreviewProps {
  userId?: string | null;
}

const DailySchedulePreview: React.FC<DailySchedulePreviewProps> = ({ userId: propUserId }) => {
  const { user } = useAuth();
  const activeUserId = propUserId || user?.id;
  const [today] = useState(new Date());

  const { appointments, isLoading, error } = useAppointments({ userId: activeUserId });

  const todaysAppointments = appointments.filter(app => isSameDay(parseISO(app.date), today));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">Error loading schedule.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {todaysAppointments.length === 0 ? (
          <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>
        ) : (
          todaysAppointments.map((app: Appointment) => (
            <div key={app.id} className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: app.color }}></div>
              <p className="text-sm">
                {format(parseISO(`2000-01-01T${app.start_time}`), 'h:mm a')} - {app.title}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default DailySchedulePreview;