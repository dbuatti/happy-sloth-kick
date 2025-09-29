// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { isValid, isWithinInterval, parseISO, isBefore, startOfDay } from 'https://esm.sh/date-fns@2.30.0'; // Added isBefore, startOfDay

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define interfaces for fetched data to provide explicit typing and improve readability
interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  priority: string;
  due_date: string | null;
  section_id: string | null;
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  original_task_id: string | null;
  updated_at: string;
  created_at: string;
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

// Interface for recurring task completion log entries
interface RecurringCompletion {
  original_task_id: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, localDayStartISO, localDayEndISO } = await req.json();
    console.log("Daily Briefing: Received request:", { userId, localDayStartISO, localDayEndISO });

    // Validate required input parameters
    if (!userId || !localDayStartISO || !localDayEndISO) {
      return new Response(JSON.stringify({ error: 'User ID and local day boundaries are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Retrieve environment variables for Supabase and Gemini API
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

    // Initialize Supabase client with service role key for elevated permissions
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const todayDateString = localDayStartISO.split('T')[0]; // YYYY-MM-DD
    const localDayStart = parseISO(localDayStartISO); // Date object for start of local day
    const localDayEnd = parseISO(localDayEndISO);     // Date object for end of local day
    const todayStartOfDay = startOfDay(localDayStart); // Start of today for comparison

    // Fetch all tasks for the user
    const { data: allTasksData, error: tasksError } = await supabaseAdmin.from('tasks')
      .select('id, description, status, priority, due_date, section_id, recurring_type, original_task_id, updated_at, created_at')
      .eq('user_id', userId);
    if (tasksError) throw tasksError;
    const allTasks: Task[] = allTasksData || [];
    console.log("Daily Briefing: Fetched tasks count:", allTasks.length);

    // Fetch recurring task completions for today
    const { data: recurringCompletionsData, error: recurringCompletionsError } = await supabaseAdmin.from('recurring_task_completion_log')
      .select('original_task_id')
      .eq('user_id', userId)
      .eq('completion_date', todayDateString);
    if (recurringCompletionsError) throw recurringCompletionsError;
    const completedRecurringTaskIds = new Set(recurringCompletionsData?.map((c: RecurringCompletion) => c.original_task_id) || []);
    console.log("Daily Briefing: Completed recurring tasks count:", completedRecurringTaskIds.size);

    // Fetch other relevant data concurrently
    const [appointmentsRes, weeklyFocusRes, sleepRecordRes] = await Promise.all([
      supabaseAdmin.from('schedule_appointments')
        .select('title, start_time, end_time')
        .eq('user_id', userId)
        .eq('date', todayDateString)
        .order('start_time', { ascending: true }),
      supabaseAdmin.from('weekly_focus')
        .select('primary_focus, secondary_focus, tertiary_focus')
        .eq('user_id', userId)
        .eq('week_start_date', todayDateString)
        .maybeSingle(),
      supabaseAdmin.from('sleep_records')
        .select('bed_time, wake_up_time, time_to_fall_asleep_minutes, sleep_interruptions_duration_minutes')
        .eq('user_id', userId)
        .eq('date', todayDateString)
        .maybeSingle(),
    ]);

    if (appointmentsRes.error) throw appointmentsRes.error;
    if (weeklyFocusRes.error) throw weeklyFocusRes.error;
    if (sleepRecordRes.error) throw sleepRecordRes.error;

    const appointments: Appointment[] = appointmentsRes.data || [];
    const weeklyFocus: WeeklyFocus | null = weeklyFocusRes.data;
    const sleepRecord: SleepRecord | null = sleepRecordRes.data;
    console.log("Daily Briefing: Fetched appointments count:", appointments.length);
    console.log("Daily Briefing: Fetched weekly focus:", weeklyFocus ? 'yes' : 'no');
    console.log("Daily Briefing: Fetched sleep record:", sleepRecord ? 'yes' : 'no');

    const pendingTasks: Task[] = [];
    const completedTasks: Task[] = [];
    const overdueTasks: Task[] = [];

    allTasks.forEach(t => {
      const taskDueDate = t.due_date ? parseISO(t.due_date) : null;
      const isRecurringTemplate = t.recurring_type !== 'none';
      const effectiveTaskId = t.original_task_id || t.id; // Use original_task_id for recurring tasks

      // Determine if the task is completed for today
      const isCompletedForToday = (t.status === 'completed' && t.updated_at && isValid(parseISO(t.updated_at)) && isWithinInterval(parseISO(t.updated_at), { start: localDayStart, end: localDayEnd })) ||
                                  (isRecurringTemplate && completedRecurringTaskIds.has(effectiveTaskId));

      // Determine if the task is due today
      const isDueToday = taskDueDate && isValid(taskDueDate) && startOfDay(taskDueDate).toISOString().split('T')[0] === todayDateString;

      // Determine if the task is overdue
      const isOverdue = taskDueDate && isValid(taskDueDate) && isBefore(startOfDay(taskDueDate), todayStartOfDay);

      if (isCompletedForToday) {
        completedTasks.push(t);
      } else if (t.status === 'to-do') {
        if (isOverdue) {
          overdueTasks.push(t);
        } else if (isDueToday || isRecurringTemplate) { // Recurring tasks are always "pending" if not completed
          pendingTasks.push(t);
        }
        // Tasks that are not due today, not overdue, not recurring, and not completed are ignored for today's briefing
      }
    });
    console.log("Daily Briefing: Pending tasks count:", pendingTasks.length);
    console.log("Daily Briefing: Completed tasks count:", completedTasks.length);
    console.log("Daily Briefing: Overdue tasks count:", overdueTasks.length);

    const prompt = `Generate a concise, encouraging, and actionable daily briefing for a user based on their productivity data.
    Today's date (client local time): ${todayDateString}

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

    console.log("Daily Briefing: Sending prompt to Gemini API...");
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
    console.log("Daily Briefing: Received Gemini response.");

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