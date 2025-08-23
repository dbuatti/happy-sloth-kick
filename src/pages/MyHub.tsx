import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import Analytics from './Analytics';
import Archive from './Archive';
import SleepDashboard from './SleepDashboard';
import WorryJournal from '@/components/WorryJournal';
import GratitudeJournal from '@/components/GratitudeJournal';
import { DateRange } from 'react-day-picker';

interface MyHubProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const MyHub: React.FC<MyHubProps> = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Hub</h1>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
          <TabsTrigger value="sleep">Sleep</TabsTrigger>
          <TabsTrigger value="worry">Worry Journal</TabsTrigger>
          <TabsTrigger value="gratitude">Gratitude Journal</TabsTrigger>
        </TabsList>

        <div className="mb-6 mt-4 flex items-center space-x-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
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
            <PopoverContent className="w-auto p-0" align="start">
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

        <TabsContent value="analytics" className="mt-4">
          <Analytics />
        </TabsContent>
        <TabsContent value="archive" className="mt-4">
          <Archive />
        </TabsContent>
        <TabsContent value="sleep" className="mt-4">
          <SleepDashboard dateRange={dateRange} setDateRange={setDateRange} />
        </TabsContent>
        <TabsContent value="worry" className="mt-4">
          <WorryJournal />
        </TabsContent>
        <TabsContent value="gratitude" className="mt-4">
          <GratitudeJournal />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyHub;