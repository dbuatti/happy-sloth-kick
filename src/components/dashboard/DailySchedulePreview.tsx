import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
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
        <CardTitle className="text-sm font-medium">Daily Schedule</CardTitle>
        <Button variant="ghost" size="icon" onClick={onAddAppointment}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-sm text-gray-500">No appointments for today.</p>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: appointment.color || '#000000' }}
                />
                <p className="text-sm font-medium">
                  {format(new Date(`2000-01-01T${appointment.start_time}`), 'HH:mm')} -{' '}
                  {format(new Date(`2000-01-01T${appointment.end_time}`), 'HH:mm')}{' '}
                  {appointment.title}
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