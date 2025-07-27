import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/Sidebar";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkHours } from '@/hooks/useWorkHours';
import { format, addMinutes, parse, isBefore, isSameHour, isSameMinute } from 'date-fns';
import { CalendarDays, Clock } from 'lucide-react';
import DateNavigator from '@/components/DateNavigator'; // Reusing DateNavigator
import { cn } from '@/lib/utils';

const TimeBlockSchedule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { workHours, loading } = useWorkHours(currentDate);

  const handlePreviousDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + 1);
      return newDate;
    });
  };

  const timeBlocks = useMemo(() => {
    console.log('TimeBlockSchedule useMemo: workHours', workHours); // Debug log
    console.log('TimeBlockSchedule useMemo: loading', loading); // Debug log

    if (!workHours || !workHours.enabled) return [];

    const blocks = [];
    const startTime = parse(workHours.start_time, 'HH:mm', currentDate);
    const endTime = parse(workHours.end_time, 'HH:mm', currentDate);

    let currentTime = startTime;
    while (isBefore(currentTime, endTime) || (isSameHour(currentTime, endTime) && isSameMinute(currentTime, endTime))) {
      const blockStart = currentTime;
      const blockEnd = addMinutes(currentTime, 30);

      if (isBefore(blockStart, endTime)) { // Ensure block doesn't start after end time
        blocks.push({
          start: format(blockStart, 'HH:mm'),
          end: format(blockEnd, 'HH:mm'),
          label: format(blockStart, 'h:mm a'),
        });
      }
      currentTime = blockEnd;
    }
    return blocks;
  }, [workHours, currentDate, loading]); // Added loading to dependencies to ensure re-evaluation

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4">
          <Card className="w-full max-w-4xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
                <CalendarDays className="h-7 w-7" /> Dynamic Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DateNavigator
                currentDate={currentDate}
                onPreviousDay={handlePreviousDay}
                onNextDay={handleNextDay}
              />

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : !workHours || !workHours.enabled ? (
                <div className="text-center text-gray-500 p-8">
                  <p className="text-lg mb-2">No work hours set or enabled for this day.</p>
                  <p>Please go to <a href="/settings" className="text-blue-500 hover:underline">Settings</a> to define your work hours.</p>
                </div>
              ) : timeBlocks.length === 0 ? (
                <div className="text-center text-gray-500 p-8">
                  <p className="text-lg mb-2">No time blocks generated.</p>
                  <p>Please check your work hour settings for this day.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {timeBlocks.map((block, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4">
                      <div className="relative flex items-center justify-center h-24 bg-card dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                        <span className="absolute inset-0 flex items-center justify-center text-5xl font-extrabold text-foreground opacity-10 pointer-events-none select-none">
                          {block.label.split(' ')[0]}
                        </span>
                        <span className="relative z-10 text-sm font-medium text-muted-foreground">
                          {block.start} - {block.label.split(' ')[0]}:30
                        </span>
                      </div>
                      <div className="relative flex items-center justify-center h-24 bg-card dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                        <span className="absolute inset-0 flex items-center justify-center text-5xl font-extrabold text-foreground opacity-10 pointer-events-none select-none">
                          {block.label.split(' ')[0]}
                        </span>
                        <span className="relative z-10 text-sm font-medium text-muted-foreground">
                          {block.label.split(' ')[0]}:30 - {block.end}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
        <footer className="p-4">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default TimeBlockSchedule;