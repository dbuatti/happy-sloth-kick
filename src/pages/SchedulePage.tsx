"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { supabase } from "@/integrations/supabase/client";
import { AddAppointmentDialog } from "@/components/AddAppointmentDialog";
import { toast } from "react-hot-toast";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  user_id: string;
}

interface Task {
  id: string;
  description: string;
  due_date?: string;
  status: string;
  priority?: string;
  section_id?: string;
  user_id: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
  color?: string;
}

const SchedulePage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduleData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please log in to view your schedule.");
      setLoading(false);
      return;
    }

    const userId = user.id;

    // Fetch Appointments
    const { data: appointments, error: apptError } = await supabase
      .from("schedule_appointments")
      .select("*")
      .eq("user_id", userId);

    if (apptError) {
      console.error("Error fetching appointments:", apptError);
      toast.error("Failed to load appointments: " + apptError.message);
      setLoading(false);
      return;
    }

    // Fetch Tasks with due dates
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .not("due_date", "is", null); // Only tasks with a due date

    if (taskError) {
      console.error("Error fetching tasks:", taskError);
      toast.error("Failed to load tasks: " + taskError.message);
      setLoading(false);
      return;
    }

    const calendarEvents: CalendarEvent[] = [];

    // Map appointments to calendar events
    appointments.forEach((appt: Appointment) => {
      const startDate = new Date(`${appt.date}T${appt.start_time}`);
      const endDate = new Date(`${appt.date}T${appt.end_time}`);
      calendarEvents.push({
        id: appt.id,
        title: appt.title,
        start: startDate,
        end: endDate,
        color: appt.color,
        resource: { type: "appointment", description: appt.description },
      });
    });

    // Map tasks to calendar events (as all-day events or specific times if available)
    tasks.forEach((task: Task) => {
      if (task.due_date) {
        const taskDate = new Date(task.due_date);
        // For tasks, we'll make them all-day events on their due date for simplicity
        // You could extend this to parse times from notes or other fields if needed
        calendarEvents.push({
          id: task.id,
          title: `Task: ${task.description} (${task.status})`,
          start: taskDate,
          end: taskDate,
          allDay: true,
          color: task.status === 'completed' ? '#6b7280' : (task.priority === 'urgent' ? '#dc2626' : '#f59e0b'), // Grey for completed, red for urgent, orange for others
          resource: { type: "task", status: task.status, priority: task.priority },
        });
      }
    });

    setEvents(calendarEvents);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color || '#3174ad', // Default blue if no color specified
        borderRadius: '0px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Schedule</h1>
        <AddAppointmentDialog onAppointmentAdded={fetchScheduleData} />
      </div>
      <div className="flex-grow">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          className="bg-white rounded-lg shadow-md p-4"
          eventPropGetter={eventPropGetter}
          views={['month', 'week', 'day', 'agenda']}
          defaultView="week"
          // You can add more props here for custom components, event handlers etc.
        />
      </div>
    </div>
  );
};

export default SchedulePage;