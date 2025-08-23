import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSleepRecords } from '@/hooks/useSleepRecords';
import { Calendar as CalendarIcon, Moon, Sun, Bed, Clock, RefreshCcw } from 'lucide-react';
import { format, isSameDay, subDays, addDays } from 'date-fns'; // Removed parseISO as it's not used directly here
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Added CardFooter
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { NewSleepRecordData, SleepRecord, SleepPageProps } from '@/types'; // Added SleepPageProps
import { toast } from 'react-hot-toast';

interface SleepTrackerProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepTracker: React.FC<SleepTrackerProps> = ({ currentDate, setCurrentDate, isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const {
    sleepRecord,
    isLoading,
    error,
    addSleepRecord,
    updateSleepRecord,
    deleteSleepRecord,
  } = useSleepRecords(currentDate);

  const [bedTime, setBedTime] = useState<string>('');
  const [lightsOffTime, setLightsOffTime] = useState<string>('');
  const [wakeUpTime, setWakeUpTime] = useState<string>('');
  const [getOutOfBedTime, setGetOutOfBedTime] = useState<string>('');
  const [timeToFallAsleepMinutes, setTimeToFallAsleepMinutes] = useState<number | ''>('');
  const [sleepInterruptionsCount, setSleepInterruptionsCount] = useState<number | ''>('');
  const [sleepInterruptionsDurationMinutes, setSleepInterruptionsDurationMinutes] = useState<number | ''>('');
  const [timesLeftBedCount, setTimesLeftBedCount] = useState<number | ''>('');
  const [plannedWakeUpTime, setPlannedWakeUpTime] = useState<string>('');

  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    if (sleepRecord) {
      setBedTime(sleepRecord.bed_time?.substring(0, 5) || '');
      setLightsOffTime(sleepRecord.lights_off_time?.substring(0, 5) || '');
      setWakeUpTime(sleepRecord.wake_up_time?.substring(0, 5) || '');
      setGetOutOfBedTime(sleepRecord.get_out_of_bed_time?.substring(0, 5) || '');
      setTimeToFallAsleepMinutes(sleepRecord.time_to_fall_asleep_minutes || '');
      setSleepInterruptionsCount(sleepRecord.sleep_interruptions_count || '');
      setSleepInterruptionsDurationMinutes(sleepRecord.sleep_interruptions_duration_minutes || '');
      setTimesLeftBedCount(sleepRecord.times_left_bed_count || '');
      setPlannedWakeUpTime(sleepRecord.planned_wake_up_time?.substring(0, 5) || '');
    } else {
      // Reset form if no record for the selected date
      setBedTime('');
      setLightsOffTime('');
      setWakeUpTime('');
      setGetOutOfBedTime('');
      setTimeToFallAsleepMinutes('');
      setSleepInterruptionsCount('');
      setSleepInterruptionsDurationMinutes('');
      setTimesLeftBedCount('');
      setPlannedWakeUpTime('');
    }
    setIsFormDirty(false);
  }, [sleepRecord, currentDate]);

  const handleSave = async () => {
    if (!userId) {
      toast.error('User not authenticated.');
      return;
    }

    const recordData: NewSleepRecordData = {
      date: format(currentDate, 'yyyy-MM-dd'),
      bed_time: bedTime ? bedTime + ':00' : null,
      lights_off_time: lightsOffTime ? lightsOffTime + ':00' : null,
      wake_up_time: wakeUpTime ? wakeUpTime + ':00' : null,
      get_out_of_bed_time: getOutOfBedTime ? getOutOfBedTime + ':00' : null,
      time_to_fall_asleep_minutes: timeToFallAsleepMinutes === '' ? null : timeToFallAsleepMinutes,
      sleep_interruptions_count: sleepInterruptionsCount === '' ? null : sleepInterruptionsCount,
      sleep_interruptions_duration_minutes: sleepInterruptionsDurationMinutes === '' ? null : sleepInterruptionsDurationMinutes,
      times_left_bed_count: timesLeftBedCount === '' ? null : timesLeftBedCount,
      planned_wake_up_time: plannedWakeUpTime ? plannedWakeUpTime + ':00' : null,
    };

    try {
      if (sleepRecord) {
        await updateSleepRecord({ id: sleepRecord.id, updates: recordData });
        toast.success('Sleep record updated successfully!');
      } else {
        await addSleepRecord(recordData);
        toast.success('Sleep record added successfully!');
      }
      setIsFormDirty(false);
    } catch (err) {
      toast.error(`Failed to save sleep record: ${(err as Error).message}`);
      console.error('Error saving sleep record:', err);
    }
  };

  const handleDelete = async () => {
    if (!sleepRecord) return;
    if (window.confirm('Are you sure you want to delete this sleep record?')) {
      try {
        await deleteSleepRecord(sleepRecord.id);
        toast.success('Sleep record deleted successfully!');
      } catch (err) {
        toast.error(`Failed to delete sleep record: ${(err as Error).message}`);
        console.error('Error deleting sleep record:', err);
      }
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string | number | ''>>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setter(e.target.value);
    setIsFormDirty(true);
  };

  const handleNumberInputChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setter(value === '' ? '' : Number(value));
    setIsFormDirty(true);
  };

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-full">Loading sleep data...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Card className="w-full lg:w-1/3">
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={(date) => date && setCurrentDate(date)}
            initialFocus
          />
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setCurrentDate(subDays(currentDate, 1))}>Previous Day</Button>
            <Button variant="outline" onClick={() => setCurrentDate(addDays(currentDate, 1))}>Next Day</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full lg:w-2/3">
        <CardHeader>
          <CardTitle>Sleep Record for {format(currentDate, 'PPP')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedTime">Bed Time</Label>
              <Input id="bedTime" type="time" value={bedTime} onChange={handleInputChange(setBedTime)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lightsOffTime">Lights Off Time</Label>
              <Input id="lightsOffTime" type="time" value={lightsOffTime} onChange={handleInputChange(setLightsOffTime)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wakeUpTime">Wake Up Time</Label>
              <Input id="wakeUpTime" type="time" value={wakeUpTime} onChange={handleInputChange(setWakeUpTime)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="getOutOfBedTime">Get Out of Bed Time</Label>
              <Input id="getOutOfBedTime" type="time" value={getOutOfBedTime} onChange={handleInputChange(setGetOutOfBedTime)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeToFallAsleepMinutes">Time to Fall Asleep (min)</Label>
              <Input id="timeToFallAsleepMinutes" type="number" value={timeToFallAsleepMinutes} onChange={handleNumberInputChange(setTimeToFallAsleepMinutes)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleepInterruptionsCount">Sleep Interruptions (count)</Label>
              <Input id="sleepInterruptionsCount" type="number" value={sleepInterruptionsCount} onChange={handleNumberInputChange(setSleepInterruptionsCount)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleepInterruptionsDurationMinutes">Interruptions Duration (min)</Label>
              <Input id="sleepInterruptionsDurationMinutes" type="number" value={sleepInterruptionsDurationMinutes} onChange={handleNumberInputChange(setSleepInterruptionsDurationMinutes)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timesLeftBedCount">Times Left Bed (count)</Label>
              <Input id="timesLeftBedCount" type="number" value={timesLeftBedCount} onChange={handleNumberInputChange(setTimesLeftBedCount)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedWakeUpTime">Planned Wake Up Time</Label>
              <Input id="plannedWakeUpTime" type="time" value={plannedWakeUpTime} onChange={handleInputChange(setPlannedWakeUpTime)} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex justify-between">
          <Button variant="destructive" onClick={handleDelete} disabled={!sleepRecord || isLoading}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Record
          </Button>
          <Button onClick={handleSave} disabled={!isFormDirty || isLoading}>
            <Save className="mr-2 h-4 w-4" /> Save Record
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SleepTracker;