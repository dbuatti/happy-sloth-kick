"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, subDays, isSameDay } from 'date-fns'; // Ensure isSameDay is imported
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import DailyScheduleView from '@/components/DailyScheduleView';

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  task_id: string | null;
}

const fetchAppointments = async () => {
  const { data, error } = await supabase
    .from('schedule_appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const Schedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: appointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['schedule_appointments'],
    queryFn: fetchAppointments,
  });

  const filteredAppointments = appointments?.filter(appointment =>
    isSameDay(new Date(appointment.date), selectedDate)
  ) || [];

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Daily Schedule</h1>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <CalendarDays className="h-8 w-8" /> Daily Schedule
      </h1>

      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="icon" onClick={handlePreviousDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h2>
          <Button variant="outline" onClick={handleToday} className="ml-2">
            Today
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={handleNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {filteredAppointments.length > 0 || isSameDay(selectedDate, new Date()) ? (
        <DailyScheduleView appointments={filteredAppointments} selectedDate={selectedDate} />
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No appointments scheduled for this day.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Schedule;