import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/types';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DailySchedulePreviewProps {
  appointments: Appointment[];
  isLoading: boolean;
  error: Error | null;
}

const DailySchedulePreview: React.FC<DailySchedulePreviewProps> = ({ appointments, isLoading, error }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Daily Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading schedule...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Daily Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading schedule: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const todayAppointments = appointments.filter(app => format(new Date(app.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'));

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Daily Schedule</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/schedule')}>
          View Full Schedule <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {todayAppointments.length === 0 ? (
          <p className="text-muted-foreground">No appointments scheduled for today.</p>
        ) : (
          <div className="space-y-2">
            {todayAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: appointment.color }} />
                <p className="text-sm font-medium">
                  {appointment.title} ({appointment.start_time} - {appointment.end_time})
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySchedulePreview;