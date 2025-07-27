import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/context/AuthContext';
import { showSuccess, showError } from "@/utils/toast";
import { Clock } from 'lucide-react';

interface WorkHour {
  day_of_week: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
  id?: string; // Optional for existing records
}

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
  const { user } = useAuth();
  const userId = user?.id;
  const [workHours, setWorkHours] = useState<WorkHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [allStartTime, setAllStartTime] = useState('09:00');
  const [allEndTime, setAllEndTime] = useState('17:00');

  const defaultTime = {
    start: '09:00',
    end: '17:00',
  };

  const fetchWorkHours = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_work_hours')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const fetchedHoursMap = new Map(data.map(wh => [wh.day_of_week, wh]));
      const initialWorkHours = daysOfWeek.map(day => ({
        day_of_week: day.id,
        start_time: fetchedHoursMap.get(day.id)?.start_time || defaultTime.start,
        end_time: fetchedHoursMap.get(day.id)?.end_time || defaultTime.end,
        enabled: fetchedHoursMap.has(day.id) ? fetchedHoursMap.get(day.id)?.enabled || false : false, // Default to disabled if no record
        id: fetchedHoursMap.get(day.id)?.id,
      }));
      setWorkHours(initialWorkHours);
      console.log('Fetched work hours:', initialWorkHours); // Debug log
    } catch (error: any) {
      showError('Failed to load work hours.');
      console.error('Error fetching work hours:', error.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWorkHours();
  }, [fetchWorkHours]);

  const handleTimeChange = (day: string, field: 'start_time' | 'end_time', value: string) => {
    setWorkHours(prevHours =>
      prevHours.map(wh =>
        wh.day_of_week === day ? { ...wh, [field]: value } : wh
      )
    );
  };

  const handleEnabledChange = (day: string, checked: boolean) => {
    setWorkHours(prevHours =>
      prevHours.map(wh =>
        wh.day_of_week === day ? { ...wh, enabled: checked } : wh
      )
    );
  };

  const handleSetAllHours = () => {
    setWorkHours(prevHours => {
      return prevHours.map(wh => ({
        ...wh,
        start_time: allStartTime,
        end_time: allEndTime,
        enabled: true, // Always enable when "Apply to All" is clicked
      }));
    });
    showSuccess('Hours applied to all days!');
  };

  const handleSaveWorkHours = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    setIsSaving(true);
    try {
      const updates = workHours.map(wh => {
        const updateObject: any = {
          user_id: userId,
          day_of_week: wh.day_of_week,
          start_time: wh.start_time,
          end_time: wh.end_time,
          enabled: wh.enabled,
        };
        if (wh.id) { // Only include id if it exists (for existing records)
          updateObject.id = wh.id;
        }
        return updateObject;
      });

      console.log('Saving work hours updates:', updates); // Debug log

      const { error } = await supabase
        .from('user_work_hours')
        .upsert(updates, { onConflict: 'user_id, day_of_week' }); // Conflict on user_id and day_of_week

      if (error) throw error;
      showSuccess('Work hours saved successfully!');
      fetchWorkHours(); // Re-fetch to ensure IDs are updated for new inserts
    } catch (error: any) {
      showError('Failed to save work hours.');
      console.error('Error saving work hours:', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" /> Work Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Loading work hours...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" /> Work Hours
        </CardTitle>
        <p className="text-sm text-muted-foreground">Set your daily working hours to help manage your productivity.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-700/50">
          <h3 className="text-lg font-semibold mb-3">Apply to All Days</h3>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <Label htmlFor="all-start-time" className="sr-only">Start Time</Label>
              <Input
                id="all-start-time"
                type="time"
                value={allStartTime}
                onChange={(e) => setAllStartTime(e.target.value)}
                className="w-full"
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="flex-1 w-full">
              <Label htmlFor="all-end-time" className="sr-only">End Time</Label>
              <Input
                id="all-end-time"
                type="time"
                value={allEndTime}
                onChange={(e) => setAllEndTime(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={handleSetAllHours} className="w-full sm:w-auto">
              Apply to All
            </Button>
          </div>
        </div>

        {workHours.map(dayHour => (
          <div key={dayHour.day_of_week} className="flex items-center space-x-4 p-2 border rounded-md">
            <Checkbox
              id={`enable-${dayHour.day_of_week}`}
              checked={dayHour.enabled}
              onCheckedChange={(checked) => handleEnabledChange(dayHour.day_of_week, !!checked)}
              disabled={isSaving}
            />
            <Label htmlFor={`enable-${dayHour.day_of_week}`} className="flex-1 font-medium capitalize">
              {daysOfWeek.find(d => d.id === dayHour.day_of_week)?.name}
            </Label>
            <Input
              type="time"
              value={dayHour.start_time}
              onChange={(e) => handleTimeChange(dayHour.day_of_week, 'start_time', e.target.value)}
              className="w-28"
              disabled={!dayHour.enabled || isSaving}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="time"
              value={dayHour.end_time}
              onChange={(e) => handleTimeChange(dayHour.day_of_week, 'end_time', e.target.value)}
              className="w-28"
              disabled={!dayHour.enabled || isSaving}
            />
          </div>
        ))}
        <Button onClick={handleSaveWorkHours} className="w-full mt-4" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Work Hours'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WorkHoursSettings;