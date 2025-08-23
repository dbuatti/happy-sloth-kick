import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, CalendarIcon, Clock, Bed, TrendingUp, Target, ListX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { useSleepAnalytics } from '@/hooks/useSleepAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SleepDashboardProps {
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepDashboard: React.FC<SleepDashboardProps> = ({ dateRange, setDateRange, demoUserId }) => {
  const { analyticsData, loading } = useSleepAnalytics({
    startDate: dateRange?.from || startOfMonth(new Date()),
    endDate: dateRange?.to || new Date(),
    userId: demoUserId,
  });

  const {
    avgTotalSleep,
    avgTimeInBed,
    avgTimeToFallAsleep,
    avgSleepEfficiency,
    avgInterruptionsCount,
    avgInterruptionsDuration,
  } = useMemo(() => {
    if (analyticsData.length === 0) {
      return {
        avgTotalSleep: 0,
        avgTimeInBed: 0,
        avgTimeToFallAsleep: 0,
        avgSleepEfficiency: 0,
        avgInterruptionsCount: '0.0',
        avgInterruptionsDuration: 0,
      };
    }

    const totalSleepSum = analyticsData.reduce((sum, d) => sum + d.totalSleepMinutes, 0);
    const timeInBedSum = analyticsData.reduce((sum, d) => sum + d.timeInBedMinutes, 0);
    const timeToFallAsleepSum = analyticsData.reduce((sum, d) => sum + d.timeToFallAsleepMinutes, 0);
    const sleepEfficiencySum = analyticsData.reduce((sum, d) => sum + d.sleepEfficiency, 0);
    const interruptionsCountSum = analyticsData.reduce((sum, d) => sum + d.sleepInterruptionsCount, 0);
    const interruptionsDurationSum = analyticsData.reduce((sum, d) => sum + d.sleepInterruptionsDurationMinutes, 0);

    const count = analyticsData.length;

    return {
      avgTotalSleep: Math.round(totalSleepSum / count),
      avgTimeInBed: Math.round(timeInBedSum / count),
      avgTimeToFallAsleep: Math.round(timeToFallAsleepSum / count),
      avgSleepEfficiency: Math.round(sleepEfficiencySum / count),
      avgInterruptionsCount: (interruptionsCountSum / count).toFixed(1),
      avgInterruptionsDuration: Math.round(interruptionsDurationSum / count),
    };
  }, [analyticsData]);

  const formatMinutesToHoursAndMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Formatter for Y-axis and tooltips for time values (e.g., -6 for 6 PM, 0 for midnight, 6 for 6 AM)
  const timeAxisFormatter = (value: number) => {
    let displayHour = value;
    if (value < 0) displayHour += 24; // Convert negative hours back to 24-hour format for formatting
    const date = new Date(2000, 0, 1, displayHour, 0); // Use 0 minutes for axis labels
    return format(date, 'h a');
  };

  const timeTooltipFormatter = (value: number) => {
    let displayHour = Math.floor(value);
    const minute = Math.round((value % 1) * 60);
    if (value < 0) displayHour += 24;
    const date = new Date(2000, 0, 1, displayHour, minute);
    return format(date, 'h:mm a');
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Moon className="h-7 w-7 text-primary" /> Sleep Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-4">
              <h2 className="text-2xl font-bold">Sleep Insights</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[300px] justify-start text-left font-normal h-9",
                        !dateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {loading ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-80 w-full rounded-xl" />
              </div>
            ) : analyticsData.length === 0 ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <Moon className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No complete sleep records found for this period.</p>
                <p className="text-sm">Log your sleep in the Sleep Tracker to see insights here!</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Total Sleep</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatMinutesToHoursAndMinutes(avgTotalSleep)}</div>
                      <p className="text-xs text-muted-foreground">per night</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Time in Bed</CardTitle>
                      <Bed className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatMinutesToHoursAndMinutes(avgTimeInBed)}</div>
                      <p className="text-xs text-muted-foreground">per night</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Sleep Efficiency</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgSleepEfficiency}%</div>
                      <p className="text-xs text-muted-foreground">sleep efficiency</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Time to Fall Asleep</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgTimeToFallAsleep}m</div>
                      <p className="text-xs text-muted-foreground">to fall asleep</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Interruptions</CardTitle>
                      <ListX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgInterruptionsCount}</div>
                      <p className="text-xs text-muted-foreground">times per night</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Interruption Duration</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgInterruptionsDuration}m</div>
                      <p className="text-xs text-muted-foreground">total interruption duration</p>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="times">Times</TabsTrigger>
                    <TabsTrigger value="quality">Quality</TabsTrigger>
                    <TabsTrigger value="consistency">Consistency</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4 space-y-6">
                    <Card className="rounded-xl">
                      <CardHeader>
                        <h3 className="text-lg font-semibold mb-3">Total Sleep Duration Trend</h3>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis tickFormatter={(value) => `${Math.floor(value / 60)}h ${value % 60}m`} />
                              <Tooltip formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Total Sleep']} />
                              <Line type="monotone" dataKey="totalSleepMinutes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader>
                        <h3 className="text-lg font-semibold mb-3">Sleep Interruptions</h3>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" />
                              <Tooltip />
                              <Bar yAxisId="left" dataKey="sleepInterruptionsCount" fill="hsl(var(--primary))" name="Count" />
                              <Bar yAxisId="right" dataKey="sleepInterruptionsDurationMinutes" fill="hsl(var(--accent))" name="Duration (min)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="times" className="mt-4">
                    <Card className="rounded-xl">
                      <CardHeader>
                        <h3 className="text-lg font-semibold mb-3">Sleep Times Trend (6 PM to 12 PM)</h3>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis tickFormatter={timeAxisFormatter} domain={[-6, 12]} /> {/* -6 for 6 PM, 0 for midnight, 12 for 12 PM */}
                              <Tooltip formatter={timeTooltipFormatter} />
                              <Line type="monotone" dataKey="bedTimeValue" name="Bed Time" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="lightsOffTimeValue" name="Lights Off" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="wakeUpTimeValue" name="Wake Time" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="getOutOfBedTimeValue" name="Got Out of Bed" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="quality" className="mt-4 space-y-6">
                    <Card className="rounded-xl">
                      <CardHeader>
                        <h3 className="text-lg font-semibold mb-3">Sleep Efficiency Trend</h3>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Efficiency']} />
                              <Line type="monotone" dataKey="sleepEfficiency" name="Efficiency (%)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader>
                        <h3 className="text-lg font-semibold mb-3">Time to Fall Asleep Trend</h3>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis tickFormatter={(value) => `${value}m`} />
                              <Tooltip formatter={(value: number) => [`${value} minutes`, 'Time to Fall Asleep']} />
                              <Bar dataKey="timeToFallAsleepMinutes" name="Minutes" fill="hsl(var(--accent))" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="consistency" className="mt-4">
                    <Card className="rounded-xl">
                      <CardHeader>
                        <h3 className="text-lg font-semibold mb-3">Wake Up Consistency (vs. Planned)</h3>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis tickFormatter={(value) => `${value}m`} />
                              <Tooltip formatter={(value: number) => [`${value > 0 ? '+' : ''}${value} min ${value > 0 ? 'late' : 'early'}`, 'Variance']} />
                              <Line type="monotone" dataKey="wakeUpVarianceMinutes" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Variance (min)" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SleepDashboard;