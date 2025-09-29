// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { isValid } from 'https://esm.sh/date-fns@2.30.0'; // Standardized to v2.30.0

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define interfaces for fetched data to provide explicit typing and improve readability
interface Task {
  id: string; // Added id
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  priority: string;
  due_date: string | null;
  section_id: string | null;
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  original_task_id: string | null; // Added original_task_id
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

    // Extract today's date string (YYYY-MM-DD) from the client's local day start
    const todayDateString = localDayStartISO.split('T')[0];

    // Fetch all tasks for the user to allow comprehensive filtering
    const { data: allTasksData, error: tasksError } = await supabaseAdmin.from('tasks')
      .select('id, description, status, priority, due_date, section_id, recurring_type, original_task_id, updated_at, created_at')
      .eq('user_id', userId);
    if (tasksError) throw tasksError;
    const allTasks: Task[] = allTasksData || [];

    // Fetch recurring task completions for today
    const { data: recurringCompletionsData, error: recurringCompletionsError } = await supabaseAdmin.from('recurring_task_completion_log')
      .select('original_task_id')
      .eq('user_id', userId)
      .eq('completion_date', todayDateString);
    if (recurringCompletionsError) throw recurringCompletionsError;
    const completedRecurringTaskIds = new Set(recurringCompletionsData?.map((c: RecurringCompletion) => c.original_task_id) || []);


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

    // Handle potential errors from data fetches
    if (appointmentsRes.error) throw appointmentsRes.error;
    if (weeklyFocusRes.error) throw weeklyFocusRes.error;
    if (sleepRecordRes.error) throw sleepRecordRes.error;

    const appointments: Appointment[] = appointmentsRes.data || [];
    const weeklyFocus: WeeklyFocus | null = weeklyFocusRes.data;
    const sleepRecord: SleepRecord | null = sleepRecordRes.data;

    // Filter tasks into categories for the AI prompt
    const pendingTasks: Task[] = [];
    const completedTasks: Task[] = [];
    const overdueTasks: Task[] = [];

    allTasks.forEach(t => {
      // Parse date strings into Date objects, handling potential nulls
      const taskUpdatedAt = t.updated_at ? new Date(t.updated_at) : null;
      const taskCreatedAt = t.created_at ? new Date(t.created_at) : null;
      // Treat due_date as UTC midnight for consistent comparison with todayDateString
      const taskDueDate = t.due_date ? new Date(t.due_date + 'T00:00:00Z') : null;

      // Check if dates are valid and within today's local time boundaries
      const isUpdatedTodayLocal = taskUpdatedAt && isValid(taskUpdatedAt) && taskUpdatedAt.toISOString() >= localDayStartISO && taskUpdatedAt.toISOString() <= localDayEndISO;
      const isCreatedTodayLocal = taskCreatedAt && isValid(taskCreatedAt) && taskCreatedAt.toISOString() >= localDayStartISO && taskCreatedAt.toISOString() <= localDayEndISO;
      // Compare YYYY-MM-DD strings for due date to match today's date
      const isDueTodayLocal = taskDueDate && isValid(taskDueDate) && taskDueDate.toISOString().split('T')[0] === todayDateString;

      const isRecurringTemplate = t.recurring_type !== 'none';
      const isCompletedTodayViaLog = isRecurringTemplate && completedRecurringTaskIds.has(t.id);

      if (t.status === 'completed' || t.status === 'archived') {
        // A non-recurring task is considered 'completed today' if its status was updated today (local time)
        if (!isRecurringTemplate && isUpdatedTodayLocal) {
          completedTasks.push(t);
        }
      } else if (t.status === 'to-do') {
        // If it's a recurring template and completed via log, it's considered completed for the briefing
        if (isCompletedTodayViaLog) {
          completedTasks.push(t);
        } else {
          // A task is overdue if its due date is before today
          if (taskDueDate && isValid(taskDueDate) && taskDueDate.toISOString().split('T')[0] < todayDateString) {
            overdueTasks.push(t);
          }
          // A task is pending for today if it's due today, created today, or updated today
          else if (isDueTodayLocal || isCreatedTodayLocal || isUpdatedTodayLocal) {
            pendingTasks.push(t);
          }
        }
      }
    });

    // Construct the prompt for the Gemini AI
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

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    // Call the Gemini API
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    // Handle non-OK responses from Gemini API
    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Daily Briefing: Gemini API request failed:", geminiResponse.status, errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const briefingText = geminiData.candidates[0].content.parts[0].text;

    // Return the generated briefing
    return new Response(JSON.stringify({ briefing: briefingText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // Catch and log any errors during the function execution
    console.error("Error in Edge Function 'daily-briefing' (outer catch):", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

export {};