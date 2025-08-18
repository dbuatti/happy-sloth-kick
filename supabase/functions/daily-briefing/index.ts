// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define interfaces for fetched data to provide explicit typing
interface Task {
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  priority: string;
  due_date: string | null;
  section_id: string | null;
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  original_task_id: string | null;
  updated_at: string;
}

interface Appointment {
  title: string;
  start_time: string;
  end_time: string;
}

interface WeeklyFocus {
  primary_focus: string | null;
  secondary_focus: string | null;
  tertiary_focus: string | null;
}

interface SleepRecord {
  bed_time: string | null;
  wake_up_time: string | null;
  time_to_fall_asleep_minutes: number | null;
  sleep_interruptions_duration_minutes: number | null;
}

serve(async (req: Request) => { // Explicitly type 'req'
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, currentDate } = await req.json();
    console.log("Daily Briefing: Received request:", { userId, currentDate });

    if (!userId || !currentDate) {
      return new Response(JSON.stringify({ error: 'User ID and current date are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      console.error("Daily Briefing: Missing environment variables.");
      return new Response(JSON.stringify({ error: 'Missing Supabase or Gemini API environment variables.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const today = new Date(currentDate);
    const todayStart = new Date(today.setUTCHours(0, 0, 0, 0)).toISOString();
    // const todayEnd = new Date(today.setUTCHours(23, 59, 59, 999)).toISOString(); // Removed: value is never read
    const todayDateString = currentDate; // YYYY-MM-DD

    // Fetch data
    const [tasksRes, appointmentsRes, weeklyFocusRes, sleepRecordRes] = await Promise.all([
      supabaseAdmin.from('tasks')
        .select('description, status, priority, due_date, section_id, recurring_type, original_task_id, updated_at') // Added updated_at for completedTasks filter
        .eq('user_id', userId)
        .or(`due_date.eq.${todayDateString},created_at.gte.${todayStart},updated_at.gte.${todayStart}`),
      supabaseAdmin.from('schedule_appointments')
        .select('title, start_time, end_time')
        .eq('user_id', userId)
        .eq('date', todayDateString)
        .order('start_time', { ascending: true }),
      supabaseAdmin.from('weekly_focus')
        .select('primary_focus, secondary_focus, tertiary_focus')
        .eq('user_id', userId)
        .eq('week_start_date', todayDateString.substring(0, 10)) // Assuming week_start_date is YYYY-MM-DD
        .maybeSingle(),
      supabaseAdmin.from('sleep_records')
        .select('bed_time, wake_up_time, time_to_fall_asleep_minutes, sleep_interruptions_duration_minutes')
        .eq('user_id', userId)
        .eq('date', todayDateString)
        .maybeSingle(),
    ]);

    if (tasksRes.error) throw tasksRes.error;
    if (appointmentsRes.error) throw appointmentsRes.error;
    if (weeklyFocusRes.error) throw weeklyFocusRes.error;
    if (sleepRecordRes.error) throw sleepRecordRes.error;

    const tasks: Task[] = tasksRes.data || [];
    const appointments: Appointment[] = appointmentsRes.data || [];
    const weeklyFocus: WeeklyFocus | null = weeklyFocusRes.data;
    const sleepRecord: SleepRecord | null = sleepRecordRes.data;

    // Process tasks for AI prompt
    const pendingTasks = tasks.filter((t: Task) => t.status === 'to-do' && (t.due_date === todayDateString || !t.due_date));
    const completedTasks = tasks.filter((t: Task) => (t.status === 'completed' || t.status === 'archived') && new Date(t.updated_at).toISOString().split('T')[0] === todayDateString);
    const overdueTasks = tasks.filter((t: Task) => t.status === 'to-do' && t.due_date && new Date(t.due_date) < new Date(todayDateString));

    const prompt = `Generate a concise, encouraging, and actionable daily briefing for a user based on their productivity data.
    Today's date: ${currentDate}

    Here's the user's data:
    - Pending tasks for today: ${JSON.stringify(pendingTasks.map((t: Task) => ({ description: t.description, priority: t.priority, due_date: t.due_date })))}
    - Completed tasks today: ${JSON.stringify(completedTasks.map((t: Task) => t.description))}
    - Overdue tasks: ${JSON.stringify(overdueTasks.map((t: Task) => ({ description: t.description, due_date: t.due_date })))}
    - Appointments today: ${JSON.stringify(appointments.map((a: Appointment) => ({ title: a.title, start_time: a.start_time, end_time: a.end_time })))}
    - Weekly focus: ${JSON.stringify(weeklyFocus)}
    - Last night's sleep record: ${JSON.stringify(sleepRecord)}

    Structure the briefing as follows:
    - Start with a friendly greeting.
    - Summarize key tasks (pending, overdue, completed).
    - Mention upcoming appointments.
    - Briefly touch on weekly focus.
    - Provide a very short, positive insight on sleep if data is available.
    - End with an encouraging closing statement.
    Keep it under 200 words. Use emojis where appropriate.`;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Daily Briefing: Gemini API request failed:", geminiResponse.status, errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const briefingText = geminiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ briefing: briefingText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in Edge Function 'daily-briefing' (outer catch):", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

export {};