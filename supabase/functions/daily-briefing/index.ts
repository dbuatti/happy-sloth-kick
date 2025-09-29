// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { isValid, isWithinInterval, parseISO, isBefore, startOfDay } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface RecurringCompletion {
  original_task_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, localDayStartISO, localDayEndISO } = await req.json();
    console.log("Daily Briefing: Received request:", { userId, localDayStartISO, localDayEndISO });

    if (!userId || !localDayStartISO || !localDayEndISO) {
      return new Response(JSON.stringify({ error: 'User ID and local day boundaries are required.' }), {
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
    console.log("Daily Briefing: GEMINI_API_KEY status:", GEMINI_API_KEY ? 'set' : 'NOT SET');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const todayDateString = localDayStartISO.split('T')[0];
    const localDayStart = parseISO(localDayStartISO);
    const localDayEnd = parseISO(localDayEndISO);
    const todayStartOfDay = startOfDay(localDayStart);

    const { data: allTasksData, error: tasksError } = await supabaseAdmin.from('tasks')
      .select('id, description, status, priority, due_date, section_id, recurring_type, original_task_id, updated_at, created_at')
      .eq('user_id', userId);
    if (tasksError) throw tasksError;
    const allTasks: Task[] = allTasksData || [];

    const { data: recurringCompletionsData, error: recurringCompletionsError } = await supabaseAdmin.from('recurring_task_completion_log')
      .select('original_task_id')
      .eq('user_id', userId)
      .eq('completion_date', todayDateString);
    if (recurringCompletionsError) throw recurringCompletionsError;
    const completedRecurringTaskIds = new Set(recurringCompletionsData?.map((c: RecurringCompletion) => c.original_task_id) || []);

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

    const pendingTasks: Task[] = [];
    const completedTasks: Task[] = [];
    const overdueTasks: Task[] = [];

    allTasks.forEach(t => {
      const taskDueDate = t.due_date ? parseISO(t.due_date) : null;
      const isRecurringTemplate = t.recurring_type !== 'none';
      const effectiveTaskId = t.original_task_id || t.id;

      const isCompletedForToday = (t.status === 'completed' && t.updated_at && isValid(parseISO(t.updated_at)) && isWithinInterval(parseISO(t.updated_at), { start: localDayStart, end: localDayEnd })) ||
                                  (isRecurringTemplate && completedRecurringTaskIds.has(effectiveTaskId));

      const isDueToday = taskDueDate && isValid(taskDueDate) && startOfDay(taskDueDate).toISOString().split('T')[0] === todayDateString;
      const isOverdue = taskDueDate && isValid(taskDueDate) && isBefore(startOfDay(taskDueDate), todayStartOfDay);

      if (isCompletedForToday) {
        completedTasks.push(t);
      } else if (t.status === 'to-do') {
        if (isOverdue) {
          overdueTasks.push(t);
        } else if (isDueToday || isRecurringTemplate) {
          pendingTasks.push(t);
        }
      }
    });

    // Summarize data for the prompt more concisely
    const pendingSummary = pendingTasks.length > 0 ? `You have ${pendingTasks.length} pending tasks.` : 'No pending tasks.';
    const completedSummary = completedTasks.length > 0 ? `You've completed ${completedTasks.length} tasks today. Great job!` : 'No tasks completed yet.';
    const overdueSummary = overdueTasks.length > 0 ? `You have ${overdueTasks.length} overdue tasks.` : 'No overdue tasks.';
    const appointmentsSummary = appointments.length > 0 ? `You have ${appointments.length} appointments today.` : 'No appointments today.';
    const weeklyFocusSummary = weeklyFocus?.primary_focus ? `Your primary focus this week is: ${weeklyFocus.primary_focus}.` : 'No specific weekly focus set.';
    const sleepSummary = sleepRecord?.bed_time && sleepRecord?.wake_up_time ? `Last night, you recorded sleep data.` : 'No sleep data recorded for last night.';

    const prompt = `Generate a concise, encouraging, and actionable daily briefing for a user.
    Today's date: ${todayDateString}

    ${pendingSummary}
    ${completedSummary}
    ${overdueSummary}
    ${appointmentsSummary}
    ${weeklyFocusSummary}
    ${sleepSummary}

    Keep the briefing under 100 words. Start with a friendly greeting, summarize key points, and end with an encouraging closing. Use emojis.`;

    console.log("Daily Briefing: Constructed prompt length:", prompt.length);
    console.log("Daily Briefing: Making Gemini API request...");
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    let geminiResponse;
    try {
      geminiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      console.log("Daily Briefing: Received raw Gemini response object.");
    } catch (fetchError: any) {
      console.error("Daily Briefing: Error during Gemini API fetch:", fetchError);
      return new Response(JSON.stringify({ error: `Failed to connect to Gemini API: ${fetchError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Daily Briefing: Gemini API request failed:", geminiResponse.status, errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    if (!geminiData || !geminiData.candidates || geminiData.candidates.length === 0 || !geminiData.candidates[0].content || !geminiData.candidates[0].content.parts || geminiData.candidates[0].content.parts.length === 0) {
      console.error("Daily Briefing: Invalid Gemini API response structure:", JSON.stringify(geminiData));
      throw new Error("Invalid Gemini API response structure.");
    }
    const briefingText = geminiData.candidates[0].content.parts[0].text;
    console.log("Daily Briefing: Received Gemini response.");

    return new Response(JSON.stringify({ briefing: briefingText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in Edge Function 'daily-briefing' (outer catch):", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", error);
    }
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

export {};