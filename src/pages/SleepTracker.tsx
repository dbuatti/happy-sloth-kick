import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSleepRecords } from '@/hooks/useSleepRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Moon, Sun, Bed, Clock, RefreshCcw } from 'lucide-react';
import { format, parseISO, isSameDay, subDays, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { NewSleepRecordData, SleepRecord } from '@/types';
import { toast } from 'react-hot-toast';

const SleepTracker = () => {
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { sleepRecord, isLoading, error, saveSleepRecord } = useSleepRecords(selectedDate);

  const [bedTime, setBedTime] = useState('');
  const [lightsOffTime, setLightsOffTime] = useState('');
  const [wakeUpTime, setWakeUpTime] = useState('');
  const [getOutOfBedTime, setGetOutOfBedTime] = useState('');
  const [timeToFallAsleepMinutes, setTimeToFallAsleepMinutes] = useState<number | ''>('');
  const [sleepInterruptionsCount, setSleepInterruptionsCount] = useState<number | ''>('');
  const [sleepInterruptionsDurationMinutes, setSleepInterruptionsDurationMinutes] = useState<number | ''>('');
  const [timesLeftBedCount, setTimesLeftBedCount] = useState<number | ''>('');
  const [plannedWakeUpTime, setPlannedWakeUpTime] = useState('');
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && sleepRecord !== undefined && isFormInitialized === false) {
      setBedTime(sleepRecord?.bed_time ? sleepRecord.bed_time.substring(0, 5) : '');
      setLightsOffTime(sleepRecord?.lights_off_time ? sleepRecord.lights_off_time.substring(0, 5) : '');
      setWakeUpTime(sleepRecord?.wake_up_time ? sleepRecord.wake_up_time.substring(0, 5) : '');
      setGetOutOfBedTime(sleepRecord?.get_out_of_bed_time ? sleepRecord.get_out_of_bed_time.substring(0, 5) : '');
      setTimeToFallAsleepMinutes(sleepRecord?.time_to_fall_asleep_minutes ?? '');
      setSleepInterruptionsCount(sleepRecord?.sleep_interruptions_count ?? '');
      setSleepInterruptionsDurationMinutes(sleepRecord?.sleep_interruptions_duration_minutes ?? '');
      setTimesLeftBedCount(sleepRecord?.times_left_bed_count ?? '');
      setPlannedWakeUpTime(sleepRecord?.planned_wake_up_time ? sleepRecord.planned_wake_up_time.substring(0, 5) : '');
      setIsFormInitialized(true); // Mark form as initialized after populating
    }
  }, [isLoading, sleepRecord, isFormInitialized]);

  // Reset form initialization when selectedDate changes
  useEffect(() => {
    setIsFormInitialized(false);
  }, [selectedDate]);

  const isFormDirty = useMemo(() => {
    if (!isFormInitialized) return false; // Don't consider dirty until initialized

    const currentRecordAsFormState = {
      bed_time: sleepRecord?.bed_time ? sleepRecord.bed_time.substring(0, 5) : null,
      lights_off_time: sleepRecord?.lights_off_time ? sleepRecord.lights_off_time.substring(0, 5) : null,
      wake_up_time: sleepRecord?.wake_up_time ? sleepRecord.wake_up_time.substring(0, 5) : null,
      get_out_of_bed_time: sleepRecord?.get_out_of_bed_time ? sleepRecord.get_out_of_bed_time.substring(0, 5) : null,
      time_to_fall_asleep_minutes: sleepRecord?.time_to_fall_asleep_minutes ?? null,
      sleep_interruptions_count: sleepRecord?.sleep_interruptions_count ?? null,
      sleep_interruptions_duration_minutes: sleepRecord?.sleep_interruptions_duration_minutes ?? null,
      times_left_bed_count: sleepRecord?.times_left_bed_count ?? null,
      planned_wake_up_time: sleepRecord?.planned_wake_up_time ? sleepRecord.planned_wake_up_time.substring(0, 5) : null,
    };

    const currentFormState = {
      bed_time: bedTime || null,
      lights_off_time: lightsOffTime || null,
      wake_up_time: wakeUpTime || null,
      get_out_of_bed_time: getOutOfBedTime || null,
      time_to_fall_asleep_minutes: timeToFallAsleepMinutes === '' ? null : Number(timeToFallAsleepMinutes),
      sleep_interruptions_count: sleepInterruptionsCount === '' ? null : Number(sleepInterruptionsCount),
      sleep_interruptions_duration_minutes: sleepInterruptionsDurationMinutes === '' ? null : Number(sleepInterruptionsDurationMinutes),
      times_left_bed_count: timesLeftBedCount === '' ? null : Number(timesLeftBedCount),
      planned_wake_up_time: plannedWakeUpTime || null,
    };

    return JSON.stringify(currentRecordAsFormState) !== JSON.stringify(currentFormState);
  }, [
    sleepRecord, bedTime, lightsOffTime, wakeUpTime, getOutOfBedTime,
    timeToFallAsleepMinutes, sleepInterruptionsCount, sleepInterruptionsDurationMinutes,
    timesLeftBedCount, plannedWakeUpTime, isFormInitialized
  ]);

  const handleSave = async () => {
    if (!userId) {
      toast.error('You must be logged in to save sleep records.');
      return;
    }

    const dataToSave: NewSleepRecordData = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      bed_time: bedTime || null,
      lights_off_time: lightsOffTime || null,
      wake_up_time: wakeUpTime || null,
      get_out_of_bed_time: getOutOfBedTime || null,
      time_to_fall_asleep_minutes: timeToFallAsleepMinutes === '' ? null : Number(timeToFallAsleepMinutes),
      sleep_interruptions_count: sleepInterruptionsCount === '' ? null : Number(sleepInterruptionsCount),
      sleep_interruptions_duration_minutes: sleepInterruptionsDurationMinutes === '' ? null : Number(sleepInterruptionsDurationMinutes),
      times_left_bed_count: timesLeftBedCount === '' ? null : Number(timesLeftBedCount),
      planned_wake_up_time: plannedWakeUpTime || null,
    };

    try {
      await saveSleepRecord(dataToSave);
      toast.success('Sleep record saved successfully!');
      setIsFormInitialized(false); // Re-initialize form state after save
    } catch (err: any) {
      toast.error(`Failed to save sleep record: ${err.message}`);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  if (isLoading) return <div className="text-center py-8">Loading sleep record...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Sleep Tracker</h1>

      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={goToPreviousDay}>Previous Day</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" onClick={goToNextDay}>Next Day</Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sleep Details for {format(selectedDate, 'PPP')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bedTime" className="flex items-center"><Bed className="mr-2 h-4 w-4" /> Bed Time</Label>
              <Input id="bedTime" type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lightsOffTime" className="flex items-center"><Moon className="mr-2 h-4 w-4" /> Lights Off Time</Label>
              <Input id="lightsOffTime" type="time" value={lightsOffTime} onChange={(e) => setLightsOffTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wakeUpTime" className="flex items-center"><Sun className="mr-2 h-4 w-4" /> Wake Up Time</Label>
              <Input id="wakeUpTime" type="time" value={wakeUpTime} onChange={(e) => setWakeUpTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="getOutOfBedTime" className="flex items-center"><Clock className="mr-2 h-4 w-4" /> Got Out of Bed Time</Label>
              <Input id="getOutOfBedTime" type="time" value={getOutOfBedTime} onChange={(e) => setGetOutOfBedTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plannedWakeUpTime" className="flex items-center"><RefreshCcw className="mr-2 h-4 w-4" /> Planned Wake Up Time</Label>
              <Input id="plannedWakeUpTime" type="time" value={plannedWakeUpTime} onChange={(e) => setPlannedWakeUpTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="timeToFallAsleepMinutes">Time to Fall Asleep (minutes)</Label>
              <Input id="timeToFallAsleepMinutes" type="number" value={timeToFallAsleepMinutes} onChange={(e) => setTimeToFallAsleepMinutes(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sleepInterruptionsCount">Sleep Interruptions (count)</Label>
              <Input id="sleepInterruptionsCount" type="number" value={sleepInterruptionsCount} onChange={(e) => setSleepInterruptionsCount(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sleepInterruptionsDurationMinutes">Interruptions Duration (minutes)</Label>
              <Input id="sleepInterruptionsDurationMinutes" type="number" value={sleepInterruptionsDurationMinutes} onChange={(e) => setSleepInterruptionsDurationMinutes(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timesLeftBedCount">Times Left Bed (count)</Label>
              <Input id="timesLeftBedCount" type="number" value={timesLeftBedCount} onChange={(e) => setTimesLeftBedCount(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-6">
          <Button onClick={handleSave} disabled={!isFormDirty || isLoading}>
            {isLoading ? 'Saving...' : 'Save Sleep Record'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SleepTracker;