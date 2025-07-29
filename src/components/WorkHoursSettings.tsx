import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from '@/context/AuthContext';
import { Clock } from 'lucide-react';
import { useWorkHours } from '@/hooks/useWorkHours'; // Import the refactored hook

interface WorkHourState {
  day_of_week: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
  id?: string;
}

const WorkHoursSettings: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  // Call useWorkHours without a date to get all work hours
  const { workHours: fetchedWorkHours, loading, saveWorkHours, allDaysOfWeek, defaultTime } = useWorkHours();
  
  const [localWorkHours, setLocalWorkHours] = useState<WorkHourState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [allStartTime, setAllStartTime] = useState(defaultTime.start);
  const [allEndTime, setAllEndTime] = useState(defaultTime.end);

  useEffect(() => {
    if (!loading && Array.isArray(fetchedWorkHours)) {
      setLocalWorkHours(fetchedWorkHours);
      // Set initial values for "Apply to All" based on a common default or first day
      if (fetchedWorkHours.length > 0) {
        setAllStartTime(fetchedWorkHours[0].start_time);
        setAllEndTime(fetchedWorkHours[0].end_time);
      }
    }
  }, [fetchedWorkHours, loading]);

  const handleTimeChange = (day: string, field: 'start_time' | 'end_time', value: string) => {
    setLocalWorkHours(prevHours =>
      prevHours.map(wh =>
        wh.day_of_week === day ? { ...wh, [field]: value } : wh
      )
    );
  };

  const handleEnabledChange = (day: string, checked: boolean) => {
    setLocalWorkHours(prevHours =>
      prevHours.map(wh =>
        wh.day_of_week === day ? { ...wh, enabled: checked } : wh
      )
    );
  };

  const handleSaveAllWorkHours = async () => {
    setIsSaving(true);
    const success = await saveWorkHours(localWorkHours);
    setIsSaving(false);
  };

  const handleSetAllHoursAndSave = async () => {
    const updatedHours = localWorkHours.map(wh => ({
      ...wh,
      start_time: allStartTime,
      end_time: allEndTime,
      enabled: true, // Always enable when "Apply to All" is clicked
    }));
    setLocalWorkHours(updatedHours); // Update local state first
    setIsSaving(true);
    const success = await saveWorkHours(updatedHours); // Then pass the updated state to save
    setIsSaving(false);
  };

  if (loading) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" /> Work Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">Loading work hours...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" /> Work Hours
        </CardTitle>
        <p className="text-sm text-muted-foreground">Set your daily working hours to help manage your productivity.</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
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
            <Button onClick={handleSetAllHoursAndSave} className="w-full sm:w-auto" disabled={isSaving}>
              Apply to All
            </Button>
          </div>
        </div>

        {localWorkHours.map(dayHour => (
          <div key={dayHour.day_of_week} className="flex items-center space-x-4 p-2 border rounded-md">
            <Checkbox
              id={`enable-${dayHour.day_of_week}`}
              checked={dayHour.enabled}
              onCheckedChange={(checked) => handleEnabledChange(dayHour.day_of_week, !!checked)}
              disabled={isSaving}
            />
            <Label htmlFor={`enable-${dayHour.day_of_week}`} className="flex-1 font-medium capitalize">
              {allDaysOfWeek.find(d => d.id === dayHour.day_of_week)?.name}
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
        <Button onClick={handleSaveAllWorkHours} className="w-full mt-4" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Work Hours'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WorkHoursSettings;