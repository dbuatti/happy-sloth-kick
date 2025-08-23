import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/types';

interface DailySchedulePreviewProps {
  appointments: Appointment[];
  onAddAppointment: () => void;
}

const DailySchedulePreview: React.FC<DailySchedulePreviewProps> = ({ appointments, onAddAppointment }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Today's Schedule</CardTitle>
        <Button variant="ghost" size="sm" onClick={onAddAppointment}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {(appointments as Appointment[]).length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg">
            <Clock className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-500">No appointments scheduled for today.</p>
            <Button variant="link" onClick={onAddAppointment}>Add one now?</Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {(appointments as Appointment[]).map(app => (
              <li key={app.id} className="flex items-center gap-3 p-2 rounded-md" style={{ borderLeft: `4px solid ${app.color}` }}>
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium text-sm">{app.title}</p>
                  <p className="text-xs text-gray-600">{app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}</p>
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