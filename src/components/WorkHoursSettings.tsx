import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useWorkHours } from '@/hooks/useWorkHours';
import { WorkHour, NewWorkHourData, UpdateWorkHourData } from '@/types'; // Corrected imports
import { toast } from 'react-hot-toast';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const WorkHoursSettings: React.FC = () => {
  const { workHours, isLoading, error, addWorkHour, updateWorkHour, deleteWorkHour } = useWorkHours();

  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (editingDay && workHours) {
      const currentWorkHour = workHours.find(wh => wh.day_of_week === editingDay);
      if (currentWorkHour) {
        setStartTime(currentWorkHour.start_time?.substring(0, 5) || '09:00');
        setEndTime(currentWorkHour.end_time?.substring(0, 5) || '17:00');
        setEnabled(currentWorkHour.enabled ?? true);
      } else {
        setStartTime('09:00');
        setEndTime('17:00');
        setEnabled(true);
      }
    }
  }, [editingDay, workHours]);

  const handleSave = async () => {
    if (!editingDay) return;

    const currentWorkHour = workHours?.find(wh => wh.day_of_week === editingDay);
    const updates: NewWorkHourData | UpdateWorkHourData = {
      day_of_week: editingDay,
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      enabled: enabled,
    };

    try {
      if (currentWorkHour) {
        await updateWorkHour({ id: currentWorkHour.id, updates });
        toast.success('Work hours updated!');
      } else {
        await addWorkHour(updates as NewWorkHourData); // Cast to NewWorkHourData for add
        toast.success('Work hours added!');
      }
      setEditingDay(null);
    } catch (err) {
      toast.error(`Failed to save work hours: ${(err as Error).message}`);
      console.error('Error saving work hours:', err);
    }
  };

  const handleToggleEnabled = async (day: string, checked: boolean) => {
    const currentWorkHour = workHours?.find(wh => wh.day_of_week === day);
    if (currentWorkHour) {
      try {
        await updateWorkHour({ id: currentWorkHour.id, updates: { enabled: checked } });
        toast.success('Work hours status updated!');
      } catch (err) {
        toast.error(`Failed to update status: ${(err as Error).message}`);
      }
    } else if (checked) {
      // If enabling for a day with no existing record, create a default one
      try {
        await addWorkHour({ day_of_week: day, start_time: '09:00:00', end_time: '17:00:00', enabled: true });
        toast.success('Default work hours added!');
      } catch (err) {
        toast.error(`Failed to add default work hours: ${(err as Error).message}`);
      }
    }
  };

  if (isLoading) {
    return <Card><CardContent>Loading work hours...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="text-red-500">Error: {error.message}</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Hours Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {daysOfWeek.map(day => {
            const currentWorkHour = workHours?.find(wh => wh.day_of_week === day);
            const isEnabled = currentWorkHour?.enabled ?? false;

            return (
              <div key={day} className="flex items-center justify-between p-2 border rounded-md">
                <span className="capitalize font-medium">{day}</span>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleEnabled(day, checked)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setEditingDay(day)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {editingDay && (
          <div className="mt-6 p-4 border rounded-md space-y-4">
            <h3 className="text-lg font-semibold capitalize">Edit {editingDay} Work Hours</h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editEnabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="editEnabled">Enable Work Hours</Label>
            </div>
            {enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingDay(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkHoursSettings;