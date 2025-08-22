import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import TimePicker from '@/components/ui/time-picker';
import { format, parseISO } from 'date-fns';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { WorkHour } from '@/types/task';
import { WorkHourState } from '@/types/props';

const WorkHoursSettings: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { allWorkHours, isLoading, error, saveWorkHours } = useWorkHours({ userId });

  const [localWorkHours, setLocalWorkHours] = useState<WorkHourState[]>([]);

  const allDaysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  // Removed unused: const defaultTime = '09:00:00'; // Default start time for new entries

  useEffect(() => {
    if (allWorkHours) {
      const initializedHours: WorkHourState[] = allDaysOfWeek.map(day => {
        const existing = allWorkHours.find(wh => wh.day_of_week === day);
        return {
          id: existing?.id,
          day_of_week: day,
          start_time: existing?.start_time || '09:00:00',
          end_time: existing?.end_time || '17:00:00',
          enabled: existing?.enabled ?? false,
        };
      });
      setLocalWorkHours(initializedHours);
    }
  }, [allWorkHours]);

  const handleWorkHourChange = (day: string, field: 'start_time' | 'end_time' | 'enabled', value: string | boolean) => {
    setLocalWorkHours(prevHours => {
      return prevHours.map(wh => {
        if (wh.day_of_week === day) {
          return { ...wh, [field]: value };
        }
        return wh;
      });
    });
  };

  const handleSaveWorkHours = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const hoursToSave: WorkHour[] = localWorkHours.map(localHour => ({
        id: localHour.id || crypto.randomUUID(),
        user_id: userId,
        day_of_week: localHour.day_of_week,
        start_time: localHour.start_time,
        end_time: localHour.end_time,
        enabled: localHour.enabled,
      }));

      await saveWorkHours(hoursToSave);
      showSuccess('Work hours saved successfully!');
    } catch (error: any) {
      showError('Failed to save work hours.');
      console.error('Error saving work hours:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading work hours...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading work hours.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Hours</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allDaysOfWeek.map(day => {
          const dayWorkHour = localWorkHours.find(wh => wh.day_of_week === day);
          const startTime = dayWorkHour?.start_time ? parseISO(`2000-01-01T${dayWorkHour.start_time}`) : undefined;
          const endTime = dayWorkHour?.end_time ? parseISO(`2000-01-01T${dayWorkHour.end_time}`) : undefined;
          const enabled = dayWorkHour?.enabled ?? false;

          return (
            <div key={day} className="flex items-center justify-between space-x-2">
              <Label className="w-24 capitalize">{day}</Label>
              <Switch
                checked={enabled}
                onCheckedChange={(checked: boolean) => handleWorkHourChange(day, 'enabled', checked)}
              />
              <TimePicker
                date={startTime}
                setDate={(date: Date | undefined) => handleWorkHourChange(day, 'start_time', date ? format(date, 'HH:mm:ss') : '00:00:00')}
                disabled={!enabled}
              />
              <span>-</span>
              <TimePicker
                date={endTime}
                setDate={(date: Date | undefined) => handleWorkHourChange(day, 'end_time', date ? format(date, 'HH:mm:ss') : '00:00:00')}
                disabled={!enabled}
              />
            </div>
          );
        })}
        <Button onClick={handleSaveWorkHours}>Save Work Hours</Button>
      </CardContent>
    </Card>
  );
};

export default WorkHoursSettings;