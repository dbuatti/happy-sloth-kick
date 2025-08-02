import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MadeWithDyad } from "@/components/made-with-dyad";
import DateNavigator from '@/components/DateNavigator';
import { useSleepRecords, NewSleepRecordData } from '@/hooks/useSleepRecords';
import { format, addDays } from 'date-fns';
import { Moon, Bed, AlarmClock, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSound } from '@/context/SoundContext';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

const SleepTracker: React.FC = () => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id; // Get userId from useAuth

  const { playSound } = useSound();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { sleepRecord, loading, saveSleepRecord } = useSleepRecords({ selectedDate: currentDate });

  const [bedTime, setBedTime] = useState<string>('');
  const [lightsOffTime, setLightsOffTime] = useState<string>('');
  const [wakeUpTime, setWakeUpTime] = useState<string>('');
  const [getOutOfBedTime, setGetOutOfBedTime] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setBedTime(sleepRecord?.bed_time ? sleepRecord.bed_time.substring(0, 5) : '');
      setLightsOffTime(sleepRecord?.lights_off_time ? sleepRecord.lights_off_time.substring(0, 5) : '');
      setWakeUpTime(sleepRecord?.wake_up_time ? sleepRecord.wake_up_time.substring(0, 5) : '');
      setGetOutOfBedTime(sleepRecord?.get_out_of_bed_time ? sleepRecord.get_out_of_bed_time.substring(0, 5) : '');
    }
  }, [sleepRecord, loading]);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => addDays(prevDate, -1));
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => addDays(prevDate, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    const dataToSave: NewSleepRecordData = {
      date: format(currentDate, 'yyyy-MM-dd'),
      bed_time: bedTime || null,
      lights_off_time: lightsOffTime || null,
      wake_up_time: wakeUpTime || null,
      get_out_of_bed_time: getOutOfBedTime || null,
    };
    const success = await saveSleepRecord(dataToSave);
    if (success) {
      playSound('success'); // Play success sound on save
    }
    setIsSaving(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-md mx-auto shadow-lg p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Moon className="h-7 w-7 text-primary" /> Sleep Tracker
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">Log your sleep times for better insights.</p>
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
                    disabled={isSaving}
                    className="h-9"
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
                    disabled={isSaving}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wake-up-time" className="flex items-center gap-2">
                    <AlarmClock className="h-4 w-4 text-muted-foreground" /> Wake Up
                  </Label>
                  <Input
                    id="wake-up-time"
                    type="time"
                    value={wakeUpTime}
                    onChange={(e) => setWakeUpTime(e.target.value)}
                    disabled={isSaving}
                    className="h-9"
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
                    disabled={isSaving}
                    className="h-9"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full h-9" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Sleep Record'}
                </Button>
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