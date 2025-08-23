import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useWorkHours } from '@/hooks/useWorkHours';
import { WorkHour } from '@/types';
import { toast } from 'react-hot-toast';

const daysOfWeek = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' },
];

const WorkHoursSettings: React.FC = () => {
  const { workHours: fetchedWorkHours, isLoading, addWorkHour, updateWorkHour } = useWorkHours();
  const [localWorkHours, setLocalWorkHours] = useState<WorkHour[]>([]);

  useEffect(() => {
    // Initialize local state with fetched data, ensuring all days are present with defaults
    const initialWorkHours = daysOfWeek.map(day => {
      const existing = fetchedWorkHours.find(wh => wh.day_of_week === day.id);
      return existing || {
        id: '', // Will be generated on insert
        user_id: '', // Will be filled on insert
        day_of_week: day.id,
        start_time: '09:00:00',
        end_time: '17:00:00',
        enabled: true,
      };
    });
    setLocalWorkHours(initialWorkHours);
  }, [fetchedWorkHours]);

  const handleTimeChange = (dayId: string, field: 'start_time' | 'end_time', value: string) => {
    setLocalWorkHours(prev =>
      prev.map(wh =>
        wh.day_of_week === dayId ? { ...wh, [field]: value + ':00' } : wh
      )
    );
  };

  const handleToggleEnabled = (dayId: string, enabled: boolean) => {
    setLocalWorkHours(prev =>
      prev.map(wh =>
        wh.day_of_week === dayId ? { ...wh, enabled: enabled } : wh
      )
    );
  };

  const handleSave = async (workHour: WorkHour) => {
    try {
      const { id, user_id, ...dataToSave } = workHour;
      if (id && user_id) {
        // Update existing
        await updateWorkHour({ id, updates: dataToSave });
        toast.success(`${workHour.day_of_week} work hours updated.`);
      } else {
        // Add new
        await addWorkHour(dataToSave);
        toast.success(`${workHour.day_of_week} work hours added.`);
      }
    } catch (error: any) {
      toast.error(`Failed to save ${workHour.day_of_week} work hours: ${error.message}`);
    }
  };

  if (isLoading) return <div className="text-center py-4">Loading work hours...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">Set your typical work hours for each day of the week. This helps with scheduling and time blocking.</p>
        <div className="space-y-4">
          {daysOfWeek.map(day => {
            const dayHour = localWorkHours.find(wh => wh.day_of_week === day.id) || {
              id: '', user_id: '', day_of_week: day.id, start_time: '09:00:00', end_time: '17:00:00', enabled: true
            };
            return (
              <div key={day.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center">
                  <Switch
                    id={`enable-${day.id}`}
                    checked={dayHour.enabled ?? true}
                    onCheckedChange={(checked) => handleToggleEnabled(day.id, checked)}
                  />
                  <Label htmlFor={`enable-${day.id}`} className="ml-2 font-medium capitalize text-base">
                    {day.name}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="time"
                    value={dayHour.start_time.substring(0, 5)}
                    onChange={(e) => handleTimeChange(day.id, 'start_time', e.target.value)}
                    disabled={!(dayHour.enabled ?? true)}
                    className="w-28"
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    value={dayHour.end_time.substring(0, 5)}
                    onChange={(e) => handleTimeChange(day.id, 'end_time', e.target.value)}
                    disabled={!(dayHour.enabled ?? true)}
                    className="w-28"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleSave(dayHour)}>Save</Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkHoursSettings;