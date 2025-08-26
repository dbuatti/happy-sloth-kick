"use client";

import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import CalendarEventCard from '@/components/CalendarEventCard';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { data: appointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['schedule_appointments'],
    queryFn: fetchAppointments,
  });

  const groupedAppointments = appointments?.reduce((acc, appointment) => {
    const date = format(new Date(appointment.date), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Schedule</h1>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Schedule</h1>
      {groupedAppointments && Object.keys(groupedAppointments).length > 0 ? (
        Object.keys(groupedAppointments).map((date) => (
          <div key={date} className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
            </h2>
            <div className="space-y-3">
              {groupedAppointments[date].map((appointment) => (
                <CalendarEventCard key={appointment.id} event={appointment} />
              ))}
            </div>
            <Separator className="my-6" />
          </div>
        ))
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No appointments scheduled.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Schedule;