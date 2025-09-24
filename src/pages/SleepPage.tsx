import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Moon, Sun, Bed, Clock, Info, RefreshCcw } from 'lucide-react';
import { format, parseISO, isValid, isSameDay, addDays, subDays, differenceInMinutes, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useSleepRecords, NewSleepRecordData } from '@/hooks/useSleepRecords';
import { useSleepDiary } from '@/hooks/useSleepDiary';
import { useSleepAnalytics } from '@/hooks/useSleepAnalytics';
import SleepBar from '@/components/SleepBar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';

interface SleepPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepPage: React.FC<SleepPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('record');
  const [analyticsRange, setAnalyticsRange] = useState('30'); // '7', '30', '90', '180', '365'

  const { sleepRecord, loading: recordLoading, isSaving, saveSleepRecord } = useSleepRecords({ selectedDate, userId });
  const { records: diaryRecords, loading: diaryLoading, hasMore, loadMore } = useSleepDiary({ userId });
  const { analyticsData, loading: analyticsLoading } = useSleepAnalytics({
    startDate: subDays(new Date(), parseInt(analyticsRange)),
    endDate: new Date(),
    userId,
  });

  const [bedTime, setBedTime] = useState('');
  const [lightsOffTime, setLightsOffTime] = useState('');
  const [wakeUpTime, setWakeUpTime] = useState('');
  const [getOutOfBedTime, setGetOutOfBedTime] = useState('');
  const [timeToFallAsleepMinutes, setTimeToFallAsleepMinutes] = useState<number | ''>('');
  const [sleepInterruptionsCount, setSleepInterruptionsCount] = useState<number | ''>('');
  const [sleepInterruptionsDurationMinutes, setSleepInterruptionsDurationMinutes] = useState<number | ''>('');
  const [timesLeftBedCount, setTimesLeftBedCount] = useState<number | ''>('');
  const [plannedWakeUpTime, setPlannedWakeUpTime] = useState('');

  const debouncedBedTime = useDebounce(bedTime, 1000);
  const debouncedLightsOffTime = useDebounce(lightsOffTime, 1000);
  const debouncedWakeUpTime = useDebounce(wakeUpTime, 1000);
  const debouncedGetOutOfBedTime = useDebounce(getOutOfBedTime, 1000);
  const debouncedTimeToFallAsleepMinutes = useDebounce(timeToFallAsleepMinutes, 1000);
  const debouncedSleepInterruptionsCount = useDebounce(sleepInterruptionsCount, 1000);
  const debouncedSleepInterruptionsDurationMinutes = useDebounce(sleepInterruptionsDurationMinutes, 1000);
  const debouncedTimesLeftBedCount = useDebounce(timesLeftBedCount, 1000);
  const debouncedPlannedWakeUpTime = useDebounce(plannedWakeUpTime, 1000);

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

  const handleSave = async (field: keyof NewSleepRecordData, value: string | number | null) => {
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
      ...sleepRecord, // Preserve existing fields
      [field]: value,
    };
    await saveSleepRecord(dataToSave);
  };

  useEffect(() => { if (!recordLoading) handleSave('bed_time', debouncedBedTime || null); }, [debouncedBedTime]);
  useEffect(() => { if (!recordLoading) handleSave('lights_off_time', debouncedLightsOffTime || null); }, [debouncedLightsOffTime]);
  useEffect(() => { if (!recordLoading) handleSave('wake_up_time', debouncedWakeUpTime || null); }, [debouncedWakeUpTime]);
  useEffect(() => { if (!recordLoading) handleSave('get_out_of_bed_time', debouncedGetOutOfBedTime || null); }, [debouncedGetOutOfBedTime]);
  useEffect(() => { if (!recordLoading) handleSave('time_to_fall_asleep_minutes', debouncedTimeToFallAsleepMinutes === '' ? null : Number(debouncedTimeToFallAsleepMinutes)); }, [debouncedTimeToFallAsleepMinutes]);
  useEffect(() => { if (!recordLoading) handleSave('sleep_interruptions_count', debouncedSleepInterruptionsCount === '' ? null : Number(debouncedSleepInterruptionsCount)); }, [debouncedSleepInterruptionsCount]);
  useEffect(() => { if (!recordLoading) handleSave('sleep_interruptions_duration_minutes', debouncedSleepInterruptionsDurationMinutes === '' ? null : Number(debouncedSleepInterruptionsDurationMinutes)); }, [debouncedSleepInterruptionsDurationMinutes]);
  useEffect(() => { if (!recordLoading) handleSave('times_left_bed_count', debouncedTimesLeftBedCount === '' ? null : Number(debouncedTimesLeftBedCount)); }, [debouncedTimesLeftBedCount]);
  useEffect(() => { if (!recordLoading) handleSave('planned_wake_up_time', debouncedPlannedWakeUpTime || null); }, [debouncedPlannedWakeUpTime]);

  const isToday = isSameDay(selectedDate, new Date());

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 rounded-md shadow-lg border text-sm">
          <p className="font-semibold">{label}</p>
          <p className="text-muted-foreground">Total Sleep: {Math.floor(data.totalSleepMinutes / 60)}h {data.totalSleepMinutes % 60}m</p>
          <p className="text-muted-foreground">Efficiency: {data.sleepEfficiency}%</p>
          {data.sleepInterruptionsCount > 0 && <p className="text-muted-foreground">Interruptions: {data.sleepInterruptionsCount}</p>}
          {data.wakeUpVarianceMinutes !== 0 && <p className="text-muted-foreground">Wake Up Variance: {data.wakeUpVarianceMinutes} min</p>}
        </div>
      );
    }
    return null;
  };

  const CustomTimeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const formatChartTime = (value: number | null) => {
        if (value === null) return 'N/A';
        const hours = Math.floor(value);
        const minutes = Math.round((value - hours) * 60);
        const date = setMinutes(setHours(new Date(), hours), minutes);
        return format(date, 'h:mm a');
      };

      return (
        <div className="bg-card p-3 rounded-md shadow-lg border text-sm">
          <p className="font-semibold">{label}</p>
          {data.bedTimeValue !== null && <p className="text-blue-500">Bed Time: {formatChartTime(data.bedTimeValue)}</p>}
          {data.lightsOffTimeValue !== null && <p className="text-purple-500">Lights Off: {formatChartTime(data.lightsOffTimeValue)}</p>}
          {data.wakeUpTimeValue !== null && <p className="text-green-500">Wake Up: {formatChartTime(data.wakeUpTimeValue)}</p>}
          {data.getOutOfBedTimeValue !== null && <p className="text-red-500">Out of Bed: {formatChartTime(data.getOutOfBedTimeValue)}</p>}
        </div>
      );
    }
    return null;
  };

  const formatChartHour = (tick: number) => {
    const date = setHours(new Date(), tick);
    return format(date, 'h a');
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Moon className="h-7 w-7 text-primary" /> Sleep Tracker
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="record">
            <Bed className="mr-2 h-4 w-4" /> Record
          </TabsTrigger>
          <TabsTrigger value="diary">
            <CalendarIcon className="mr-2 h-4 w-4" /> Diary
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-4">
          <Card className="shadow-lg rounded-xl">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Bed className="h-5 w-5 text-primary" /> Sleep Record
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(prev => subDays(prev, 1))} className="h-9 w-9 rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal h-9",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
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
                {!isToday && (
                  <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())} className="h-9 px-3">
                    Today
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {recordLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bed-time">Bed Time (when you got into bed)</Label>
                    <Input id="bed-time" type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} disabled={isSaving || isDemo} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="lights-off-time">Lights Off Time (when you tried to sleep)</Label>
                    <Input id="lights-off-time" type="time" value={lightsOffTime} onChange={(e) => setLightsOffTime(e.target.value)} disabled={isSaving || isDemo} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="wake-up-time">Wake Up Time (when you woke up)</Label>
                    <Input id="wake-up-time" type="time" value={wakeUpTime} onChange={(e) => setWakeUpTime(e.target.value)} disabled={isSaving || isDemo} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="get-out-of-bed-time">Get Out of Bed Time (when you left bed)</Label>
                    <Input id="get-out-of-bed-time" type="time" value={getOutOfBedTime} onChange={(e) => setGetOutOfBedTime(e.target.value)} disabled={isSaving || isDemo} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="time-to-fall-asleep">Time to Fall Asleep (minutes)</Label>
                    <Input id="time-to-fall-asleep" type="number" value={timeToFallAsleepMinutes} onChange={(e) => setTimeToFallAsleepMinutes(Number(e.target.value))} min="0" disabled={isSaving || isDemo} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="sleep-interruptions-count">Sleep Interruptions (count)</Label>
                    <Input id="sleep-interruptions-count" type="number" value={sleepInterruptionsCount} onChange={(e) => setSleepInterruptionsCount(Number(e.target.value))} min="0" disabled={isSaving || isDemo} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="sleep-interruptions-duration">Interruptions Duration (minutes)</Label>
                    <Input id="sleep-interruptions-duration" type="number" value={sleepInterruptionsDurationMinutes} onChange={(e) => setSleepInterruptionsDurationMinutes(Number(e.target.value))} min="0" disabled={isSaving || isDemo} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="times-left-bed-count">Times Left Bed (count)</Label>
                    <Input id="times-left-bed-count" type="number" value={timesLeftBedCount} onChange={(e) => setTimesLeftBedCount(Number(e.target.value))} min="0" disabled={isSaving || isDemo} className="h-9" />
                  </div>
                  <div>
                    <Label htmlFor="planned-wake-up-time">Planned Wake Up Time</Label>
                    <Input id="planned-wake-up-time" type="time" value={plannedWakeUpTime} onChange={(e) => setPlannedWakeUpTime(e.target.value)} disabled={isSaving || isDemo} className="h-9" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diary" className="mt-4">
          <Card className="shadow-lg rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" /> Sleep Diary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {diaryLoading && diaryRecords.length === 0 ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : diaryRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No sleep records yet. Start recording your sleep!</p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {diaryRecords.map(record => (
                      <SleepBar key={record.id} record={record} />
                    ))}
                    {hasMore && (
                      <Button onClick={loadMore} disabled={diaryLoading} className="w-full mt-4">
                        {diaryLoading ? 'Loading more...' : 'Load More'}
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="shadow-lg rounded-xl">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Sleep Analytics
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="analytics-range" className="sr-only">Date Range</Label>
                <Select value={analyticsRange} onValueChange={setAnalyticsRange}>
                  <SelectTrigger id="analytics-range" className="w-[120px] h-9">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="180">Last 180 Days</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              {analyticsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : analyticsData.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Not enough data for analytics. Record more sleep!</p>
              ) : (
                <>
                  <div className="h-64 w-full">
                    <h3 className="text-lg font-semibold mb-2">Total Sleep & Efficiency</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Sleep (min)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Efficiency (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line yAxisId="left" type="monotone" dataKey="totalSleepMinutes" stroke="#8884d8" name="Total Sleep" />
                        <Line yAxisId="right" type="monotone" dataKey="sleepEfficiency" stroke="#82ca9d" name="Sleep Efficiency" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-64 w-full">
                    <h3 className="text-lg font-semibold mb-2">Sleep Times (Normalized)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis
                          domain={[-6, 12]} // 6 PM (-6) to 12 PM (12)
                          tickFormatter={formatChartHour}
                          label={{ value: 'Time of Day', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                        />
                        <Tooltip content={<CustomTimeTooltip />} />
                        <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" label={{ value: 'Midnight', position: 'insideTopRight', fill: '#ccc', fontSize: 10 }} />
                        <Line type="monotone" dataKey="bedTimeValue" stroke="#3b82f6" name="Bed Time" dot={false} />
                        <Line type="monotone" dataKey="lightsOffTimeValue" stroke="#a855f7" name="Lights Off" dot={false} />
                        <Line type="monotone" dataKey="wakeUpTimeValue" stroke="#22c55e" name="Wake Up" dot={false} />
                        <Line type="monotone" dataKey="getOutOfBedTimeValue" stroke="#ef4444" name="Out of Bed" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default SleepPage;