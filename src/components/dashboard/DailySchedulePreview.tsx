import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/types';
import { format } from 'date-fns';

interface DailySchedulePreviewProps {
  appointments: Appointment[];
  onAddAppointment: () => void;
}

const DailySchedulePreview: React.FC<DailySchedulePreviewProps> = ({ appointments, onAddAppointment }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Daily Schedule</CardTitle>
        <Button variant="ghost" size="sm" onClick={onAddAppointment}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-sm text-gray-500">No appointments scheduled for today.</p>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: appointment.color }} />
                <p className="text-sm font-medium">{appointment.title}</p>
                <span className="text-xs text-gray-500">
                  {format(new Date(`2000-01-01T${appointment.start_time}`), 'h:mm a')} - {format(new Date(`2000-01-01T${appointment.end_time}`), 'h:mm a')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySchedulePreview;