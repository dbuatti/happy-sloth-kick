import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSleepRecords } from '@/hooks/useSleepRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Trash2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, addDays, isSameDay, parseISO, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { NewSleepRecordData, SleepRecord, UpdateSleepRecordData, SleepTrackerProps } from '@/types';
import { toast } from 'react-hot-toast';

const SleepTracker: React.FC<SleepTrackerProps> = ({ currentDate, setCurrentDate, isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    sleepRecords,
    isLoading,
    error,
    addSleepRecord,
    updateSleepRecord,
    deleteSleepRecord,
  } = useSleepRecords({ userId: currentUserId, date: currentDate });

  const currentRecord = sleepRecords?.[0];

  const [bedTime, setBedTime] = useState('');
  const [lightsOffTime, setLightsOffTime] = useState('');
  const [wakeUpTime, setWakeUpTime] = useState('');
  const [getOutOfBedTime, setGetOutOfBedTime] = useState('');
  const [plannedWakeUpTime, setPlannedWakeUpTime] = useState('');
  const [timeToFallAsleepMinutes, setTimeToFallAsleepMinutes] = useState<number | ''>('');
  const [sleepInterruptionsCount, setSleepInterruptionsCount] = useState<number | ''>('');
  const [sleepInterruptionsDurationMinutes, setSleepInterruptionsDurationMinutes] = useState<number | ''>('');
  const [timesLeftBedCount, setTimesLeftBedCount] = useState<number | ''>('');

  useEffect(() => {
    if (currentRecord) {
      setBedTime(currentRecord.bed_time || '');
      setLightsOffTime(currentRecord.lights_off_time || '');
      setWakeUpTime(currentRecord.wake_up_time || '');
      setGetOutOfBedTime(currentRecord.get_out_of_bed_time || '');
      setPlannedWakeUpTime(currentRecord.planned_wake_up_time || '');
      setTimeToFallAsleepMinutes(currentRecord.time_to_fall_asleep_minutes || '');
      setSleepInterruptionsCount(currentRecord.sleep_interruptions_count || '');
      setSleepInterruptionsDurationMinutes(currentRecord.sleep_interruptions_duration_minutes || '');
      setTimesLeftBedCount(currentRecord.times_left_bed_count || '');
    } else {
      setBedTime('');
      setLightsOffTime('');
      setWakeUpTime('');
      setGetOutOfBedTime('');
      setPlannedWakeUpTime('');
      setTimeToFallAsleepMinutes('');
      setSleepInterruptionsCount('');
      setSleepInterruptionsDurationMinutes('');
      setTimesLeftBedCount('');
    }
  }, [currentRecord]);

  const handleInputChange = useCallback((setter: React.Dispatch<React.SetStateAction<string | number | ''>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.type === 'number') {
      setter(value === '' ? '' : parseInt(value));
    } else {
      setter(value);
    }
  }, []);

  const handleSaveRecord = async () => {
    if (!currentUserId) {
      toast.error('User not authenticated.');
      return;
    }

    const recordData: NewSleepRecordData | UpdateSleepRecordData = {
      date: format(currentDate, 'yyyy-MM-dd'),
      bed_time: bedTime || null,
      lights_off_time: lightsOffTime || null,
      wake_up_time: wakeUpTime || null,
      get_out_of_bed_time: getOutOfBedTime || null,
      planned_wake_up_time: plannedWakeUpTime || null,
      time_to_fall_asleep_minutes: timeToFallAsleepMinutes === '' ? null : timeToFallAsleepMinutes,
      sleep_interruptions_count: sleepInterruptionsCount === '' ? null : sleepInterruptionsCount,
      sleep_interruptions_duration_minutes: sleepInterruptionsDurationMinutes === '' ? null : sleepInterruptionsDurationMinutes,
      times_left_bed_count: timesLeftBedCount === '' ? null : timesLeftBedCount,
    };

    try {
      if (currentRecord) {
        await updateSleepRecord({ id: currentRecord.id, updates: recordData });
      } else {
        await addSleepRecord(recordData as NewSleepRecordData);
      }
      toast.success('Sleep record saved!');
    } catch (err: any) {
      toast.error('Failed to save sleep record: ' + err.message);
      console.error('Error saving sleep record:', err);
    }
  };

  const handleDeleteRecord = async () => {
    if (!currentRecord) return;
    if (window.confirm('Are you sure you want to delete this sleep record?')) {
      try {
        await deleteSleepRecord(currentRecord.id);
        toast.success('Sleep record deleted!');
      } catch (err: any) {
        toast.error('Failed to delete sleep record: ' + err.message);
        console.error('Error deleting sleep record:', err);
      }
    }
  };

  if (authLoading || isLoading) {
    return <div className="p-4 text-center">Loading sleep data...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading sleep data: {error.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sleep Tracker</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" /> Previous Day
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !currentDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {currentDate ? format(currentDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            Next Day <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Sleep Record for {format(currentDate, 'PPP')}</CardTitle>
          <div className="flex space-x-2">
            {currentRecord && (
              <Button variant="destructive" size="sm" onClick={handleDeleteRecord}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
            <Button size="sm" onClick={handleSaveRecord}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="bedTime">Bed Time</Label>
                <Input id="bedTime" type="time" value={bedTime} onChange={handleInputChange(setBedTime)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="lightsOffTime">Lights Off Time</Label>
                <Input id="lightsOffTime" type="time" value={lightsOffTime} onChange={handleInputChange(setLightsOffTime)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="wakeUpTime">Wake Up Time</Label>
                <Input id="wakeUpTime" type="time" value={wakeUpTime} onChange={handleInputChange(setWakeUpTime)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="getOutOfBedTime">Get Out of Bed Time</Label>
                <Input id="getOutOfBedTime" type="time" value={getOutOfBedTime} onChange={handleInputChange(setGetOutOfBedTime)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="plannedWakeUpTime">Planned Wake Up Time</Label>
                <Input id="plannedWakeUpTime" type="time" value={plannedWakeUpTime} onChange={handleInputChange(setPlannedWakeUpTime)} className="col-span-2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="timeToFallAsleepMinutes">Time to Fall Asleep (min)</Label>
                <Input id="timeToFallAsleepMinutes" type="number" value={timeToFallAsleepMinutes} onChange={handleInputChange(setTimeToFallAsleepMinutes)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="sleepInterruptionsCount">Interruptions Count</Label>
                <Input id="sleepInterruptionsCount" type="number" value={sleepInterruptionsCount} onChange={handleInputChange(setSleepInterruptionsCount)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="sleepInterruptionsDurationMinutes">Interruptions Duration (min)</Label>
                <Input id="sleepInterruptionsDurationMinutes" type="number" value={sleepInterruptionsDurationMinutes} onChange={handleInputChange(setSleepInterruptionsDurationMinutes)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="timesLeftBedCount">Times Left Bed Count</Label>
                <Input id="timesLeftBedCount" type="number" value={timesLeftBedCount} onChange={handleInputChange(setTimesLeftBedCount)} className="col-span-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SleepTracker;