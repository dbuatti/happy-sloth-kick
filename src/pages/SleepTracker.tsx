import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MadeWithDyad } from "@/components/made-with-dyad";
import DateNavigator from '@/components/DateNavigator';
import { useSleepRecords, NewSleepRecordData } from '@/hooks/useSleepRecords';
import { format, addDays } from 'date-fns';
import { Moon, Bed, AlarmClock, LogOut, Hourglass, ListX, Clock, Goal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import { useDebounce } from '@/hooks/useDebounce';

interface SleepTrackerProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepTracker: React.FC<SleepTrackerProps> = ({ currentDate, setCurrentDate, isDemo = false, demoUserId }) => {
  useAuth(); 

  const { sleepRecord, loading, isSaving, saveSleepRecord } = useSleepRecords({ selectedDate: currentDate, userId: demoUserId });

  const [bedTime, setBedTime] = useState<string>('');
  const [lightsOffTime, setLightsOffTime] = useState<string>('');
  const [wakeUpTime, setWakeUpTime] = useState<string>('');
  const [getOutOfBedTime, setGetOutOfBedTime] = useState<string>('');
  const [timeToFallAsleepMinutes, setTimeToFallAsleepMinutes] = useState<number | ''>('');
  const [sleepInterruptionsCount, setSleepInterruptionsCount] = useState<number | ''>('');
  const [sleepInterruptionsDurationMinutes, setSleepInterruptionsDurationMinutes] = useState<number | ''>('');
  const [timesLeftBedCount, setTimesLeftBedCount] = useState<number | ''>('');
  const [plannedWakeUpTime, setPlannedWakeUpTime] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!loading) {
      setIsInitialLoad(true);
      setBedTime(sleepRecord?.bed_time ? sleepRecord.bed_time.substring(0, 5) : '');
      setLightsOffTime(sleepRecord?.lights_off_time ? sleepRecord.lights_off_time.substring(0, 5) : '');
      setWakeUpTime(sleepRecord?.wake_up_time ? sleepRecord.wake_up_time.substring(0, 5) : '');
      setGetOutOfBedTime(sleepRecord?.get_out_of_bed_time ? sleepRecord.get_out_of_bed_time.substring(0, 5) : '');
      setTimeToFallAsleepMinutes(sleepRecord?.time_to_fall_asleep_minutes ?? '');
      setSleepInterruptionsCount(sleepRecord?.sleep_interruptions_count ?? '');
      setSleepInterruptionsDurationMinutes(sleepRecord?.sleep_interruptions_duration_minutes ?? '');
      setTimesLeftBedCount(sleepRecord?.times_left_bed_count ?? '');
      setPlannedWakeUpTime(sleepRecord?.planned_wake_up_time ? sleepRecord.planned_wake_up_time.substring(0, 5) : '');
      setTimeout(() => setIsInitialLoad(false), 100);
    }
  }, [sleepRecord, loading]);

  const formState = useMemo(() => ({
    bed_time: bedTime || null,
    lights_off_time: lightsOffTime || null,
    wake_up_time: wakeUpTime || null,
    get_out_of_bed_time: getOutOfBedTime || null,
    time_to_fall_asleep_minutes: timeToFallAsleepMinutes === '' ? null : Number(timeToFallAsleepMinutes),
    sleep_interruptions_count: sleepInterruptionsCount === '' ? null : Number(sleepInterruptionsCount),
    sleep_interruptions_duration_minutes: sleepInterruptionsDurationMinutes === '' ? null : Number(sleepInterruptionsDurationMinutes),
    times_left_bed_count: timesLeftBedCount === '' ? null : Number(timesLeftBedCount),
    planned_wake_up_time: plannedWakeUpTime || null,
  }), [bedTime, lightsOffTime, wakeUpTime, getOutOfBedTime, timeToFallAsleepMinutes, sleepInterruptionsCount, sleepInterruptionsDurationMinutes, timesLeftBedCount, plannedWakeUpTime]);

  const debouncedFormState = useDebounce(formState, 1500);

  useEffect(() => {
    if (isInitialLoad || isDemo) {
      return;
    }
    const dataToSave: NewSleepRecordData = {
      date: format(currentDate, 'yyyy-MM-dd'),
      ...debouncedFormState,
    };
    saveSleepRecord(dataToSave);
  }, [debouncedFormState, isInitialLoad, isDemo, currentDate, saveSleepRecord]);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => addDays(prevDate, -1));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => addDays(prevDate, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const shortcuts: ShortcutMap = {
    'arrowleft': handlePreviousDay,
    'arrowright': handleNextDay,
  };
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow flex justify-center">
        <Card className="w-full max-w-md mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Moon className="h-7 w-7 text-primary" /> Sleep Tracker
              {isSaving && <span className="text-sm font-normal text-muted-foreground animate-pulse">Saving...</span>}
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">Log your sleep times and details for better insights.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <DateNavigator
              currentDate={currentDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onGoToToday={handleGoToToday}
              setCurrentDate={setCurrentDate}
            />

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bed-time" className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-muted-foreground" /> Go to Bed
                  </Label>
                  <Input
                    id="bed-time"
                    type="time"
                    value={bedTime}
                    onChange={(e) => setBedTime(e.target.value)}
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lights-off-time" className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-muted-foreground" /> Lights Off
                  </Label>
                  <Input
                    id="lights-off-time"
                    type="time"
                    value={lightsOffTime}
                    onChange={(e) => setLightsOffTime(e.target.value)}
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-to-fall-asleep" className="flex items-center gap-2">
                    <Hourglass className="h-4 w-4 text-muted-foreground" /> Minutes to Fall Asleep
                  </Label>
                  <Input
                    id="time-to-fall-asleep"
                    type="number"
                    value={timeToFallAsleepMinutes}
                    onChange={(e) => setTimeToFallAsleepMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g., 15"
                    min="0"
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sleep-interruptions-count" className="flex items-center gap-2">
                    <ListX className="h-4 w-4 text-muted-foreground" /> Sleep Interruptions (Count)
                  </Label>
                  <Input
                    id="sleep-interruptions-count"
                    type="number"
                    value={sleepInterruptionsCount}
                    onChange={(e) => setSleepInterruptionsCount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g., 2"
                    min="0"
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sleep-interruptions-duration" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" /> Sleep Interruptions (Minutes)
                  </Label>
                  <Input
                    id="sleep-interruptions-duration"
                    type="number"
                    value={sleepInterruptionsDurationMinutes}
                    onChange={(e) => setSleepInterruptionsDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g., 30"
                    min="0"
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="times-left-bed-count" className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-muted-foreground" /> Times Left Bed
                  </Label>
                  <Input
                    id="times-left-bed-count"
                    type="number"
                    value={timesLeftBedCount}
                    onChange={(e) => setTimesLeftBedCount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g., 1"
                    min="0"
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wake-up-time" className="flex items-center gap-2">
                    <AlarmClock className="h-4 w-4 text-muted-foreground" /> Final Awakening
                  </Label>
                  <Input
                    id="wake-up-time"
                    type="time"
                    value={wakeUpTime}
                    onChange={(e) => setWakeUpTime(e.target.value)}
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planned-wake-up-time" className="flex items-center gap-2">
                    <Goal className="h-4 w-4 text-muted-foreground" /> Planned Wake Up
                  </Label>
                  <Input
                    id="planned-wake-up-time"
                    type="time"
                    value={plannedWakeUpTime}
                    onChange={(e) => setPlannedWakeUpTime(e.target.value)}
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="get-out-of-bed-time" className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-muted-foreground" /> Get Out of Bed
                  </Label>
                  <Input
                    id="get-out-of-bed-time"
                    type="time"
                    value={getOutOfBedTime}
                    onChange={(e) => setGetOutOfBedTime(e.target.value)}
                    disabled={isDemo}
                    className="h-9 text-base"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default SleepTracker;