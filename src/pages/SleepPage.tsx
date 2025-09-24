import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Moon, Bed, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'; // Removed Sun, Clock, Info, RefreshCcw, added BarChart3, ChevronLeft, ChevronRight
import { format, parseISO, isValid, isSameDay, addDays, subDays, differenceInMinutes, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { useSleepRecords, NewSleepRecordData } from '@/hooks/useSleepRecords';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SleepBar from '@/components/SleepBar';
import { useSleepDiary } from '@/hooks/useSleepDiary';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '@/components/ui/skeleton';
import { useSleepAnalytics } from '@/hooks/useSleepAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SleepPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepPage: React.FC<SleepPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('record');

  const { sleepRecord, loading: recordLoading, isSaving, saveSleepRecord } = useSleepRecords({ selectedDate, userId: demoUserId });
  const { records: diaryRecords, loading: diaryLoading, hasMore, loadMore } = useSleepDiary({ userId: demoUserId });
  const { analyticsData, loading: analyticsLoading } = useSleepAnalytics({ startDate: subDays(new Date(), 30), endDate: new Date(), userId: demoUserId });

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  React.useEffect(() => {
    if (inView && hasMore && !diaryLoading) {
      loadMore();
    }
  }, [inView, hasMore, diaryLoading, loadMore]);

  const [bedTime, setBedTime] = useState('');
  const [lightsOffTime, setLightsOffTime] = useState('');
  const [wakeUpTime, setWakeUpTime] = useState('');
  const [getOutOfBedTime, setGetOutOfBedTime] = useState('');
  const [timeToFallAsleepMinutes, setTimeToFallAsleepMinutes] = useState<number | ''>('');
  const [sleepInterruptionsCount, setSleepInterruptionsCount] = useState<number | ''>('');
  const [sleepInterruptionsDurationMinutes, setSleepInterruptionsDurationMinutes] = useState<number | ''>('');
  const [timesLeftBedCount, setTimesLeftBedCount] = useState<number | ''>('');
  const [plannedWakeUpTime, setPlannedWakeUpTime] = useState('');

  useEffect(() => {
    if (sleepRecord) {
      setBedTime(sleepRecord.bed_time?.substring(0, 5) || '');
      setLightsOffTime(sleepRecord.lights_off_time?.substring(0, 5) || '');
      setWakeUpTime(sleepRecord.wake_up_time?.substring(0, 5) || '');
      setGetOutOfBedTime(sleepRecord.get_out_of_bed_time?.substring(0, 5) || '');
      setTimeToFallAsleepMinutes(sleepRecord.time_to_fall_asleep_minutes ?? '');
      setSleepInterruptionsCount(sleepRecord.sleep_interruptions_count ?? '');
      setSleepInterruptionsDurationMinutes(sleepRecord.sleep_interruptions_duration_minutes ?? '');
      setTimesLeftBedCount(sleepRecord.times_left_bed_count ?? '');
      setPlannedWakeUpTime(sleepRecord.planned_wake_up_time?.substring(0, 5) || '');
    } else {
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
  }, [sleepRecord, selectedDate]);

  const handleSave = async () => {
    if (isDemo) return;
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
    await saveSleepRecord(dataToSave);
  };

  const timeLabels = useMemo(() => {
    const labels = [];
    for (let i = 18; i < 24; i++) labels.push(format(setHours(new Date(), i), 'h a'));
    for (let i = 0; i <= 12; i++) labels.push(format(setHours(new Date(), i), 'h a'));
    return labels;
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <Moon className="inline-block h-10 w-10 mr-3 text-primary" /> Sleep Tracker
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="record">Record</TabsTrigger>
            <TabsTrigger value="diary">Diary</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="mt-6">
            <Card className="shadow-lg rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Bed className="h-5 w-5 text-primary" /> Record Sleep for
                </CardTitle>
                <div className="flex items-center justify-between mt-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(prev => subDays(prev, 1))} className="h-9 w-9 rounded-full">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[180px] justify-start text-left font-normal h-9 text-base",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(prev => addDays(prev, 1))} className="h-9 w-9 rounded-full">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {recordLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bed-time">Bed Time</Label>
                        <Input id="bed-time" type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} disabled={isSaving || isDemo} />
                      </div>
                      <div>
                        <Label htmlFor="lights-off-time">Lights Off Time</Label>
                        <Input id="lights-off-time" type="time" value={lightsOffTime} onChange={(e) => setLightsOffTime(e.target.value)} disabled={isSaving || isDemo} />
                      </div>
                      <div>
                        <Label htmlFor="wake-up-time">Wake Up Time</Label>
                        <Input id="wake-up-time" type="time" value={wakeUpTime} onChange={(e) => setWakeUpTime(e.target.value)} disabled={isSaving || isDemo} />
                      </div>
                      <div>
                        <Label htmlFor="get-out-of-bed-time">Got Out of Bed Time</Label>
                        <Input id="get-out-of-bed-time" type="time" value={getOutOfBedTime} onChange={(e) => setGetOutOfBedTime(e.target.value)} disabled={isSaving || isDemo} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="time-to-fall-asleep">Time to Fall Asleep (min)</Label>
                        <Input id="time-to-fall-asleep" type="number" value={timeToFallAsleepMinutes} onChange={(e) => setTimeToFallAsleepMinutes(Number(e.target.value))} min="0" disabled={isSaving || isDemo} />
                      </div>
                      <div>
                        <Label htmlFor="sleep-interruptions-count">Sleep Interruptions (count)</Label>
                        <Input id="sleep-interruptions-count" type="number" value={sleepInterruptionsCount} onChange={(e) => setSleepInterruptionsCount(Number(e.target.value))} min="0" disabled={isSaving || isDemo} />
                      </div>
                      <div>
                        <Label htmlFor="sleep-interruptions-duration">Interruptions Duration (min)</Label>
                        <Input id="sleep-interruptions-duration" type="number" value={sleepInterruptionsDurationMinutes} onChange={(e) => setSleepInterruptionsDurationMinutes(Number(e.target.value))} min="0" disabled={isSaving || isDemo} />
                      </div>
                      <div>
                        <Label htmlFor="times-left-bed-count">Times Left Bed (count)</Label>
                        <Input id="times-left-bed-count" type="number" value={timesLeftBedCount} onChange={(e) => setTimesLeftBedCount(Number(e.target.value))} min="0" disabled={isSaving || isDemo} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="planned-wake-up-time">Planned Wake Up Time</Label>
                      <Input id="planned-wake-up-time" type="time" value={plannedWakeUpTime} onChange={(e) => setPlannedWakeUpTime(e.target.value)} disabled={isSaving || isDemo} />
                    </div>
                    <Button onClick={handleSave} className="w-full" disabled={isSaving || isDemo}>
                      {isSaving ? 'Saving...' : 'Save Sleep Record'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diary" className="mt-6">
            <Card className="shadow-lg rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Moon className="h-5 w-5 text-primary" /> Sleep Diary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {diaryLoading && diaryRecords.length === 0 ? (
                  <Skeleton className="h-64 w-full" />
                ) : diaryRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sleep records yet. Start recording your sleep!</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-[80px_1fr] gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
                      <div>Time</div>
                      <div className="flex justify-between items-center">
                        {timeLabels.map((label, index) => (
                          <span key={index} className="w-1/6 text-center">{label}</span>
                        ))}
                      </div>
                    </div>
                    {diaryRecords.map((record, index) => (
                      <div key={record.id} className="grid grid-cols-[80px_1fr] gap-2 items-center">
                        <div className="text-sm font-medium text-muted-foreground">{format(parseISO(record.date), 'MMM dd')}</div>
                        <SleepBar record={record} />
                      </div>
                    ))}
                    {hasMore && (
                      <div ref={loadMoreRef} className="text-center py-4">
                        {diaryLoading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        ) : (
                          <Button onClick={loadMore} variant="outline">Load More</Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card className="shadow-lg rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Sleep Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64 pt-0">
                {analyticsLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : analyticsData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Not enough data for analytics. Record more sleep!</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs text-muted-foreground" />
                      <YAxis yAxisId="left" label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))' } }} className="text-xs text-muted-foreground" />
                      <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} label={{ value: 'Efficiency', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))' } }} className="text-xs text-muted-foreground" />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'totalSleepMinutes') return [`${value} min`, 'Total Sleep'];
                          if (name === 'sleepEfficiency') return [`${value}%`, 'Efficiency'];
                          return [value, name];
                        }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="totalSleepMinutes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Sleep" />
                      <Line yAxisId="right" type="monotone" dataKey="sleepEfficiency" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Sleep Efficiency" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SleepPage;