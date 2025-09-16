// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { format, parseISO, differenceInDays, startOfDay, subDays, isAfter } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      console.error("Suggest New Habit: Missing environment variables.");
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

    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 30);
    const fourteenDaysAgo = subDays(today, 14);

    // Fetch active habits
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from('habits')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (habitsError) throw habitsError;

    const activeHabitIds = habits.map(h => h.id);
    const recentlyAddedHabits = habits.filter(h => isAfter(parseISO(h.created_at), fourteenDaysAgo));

    // If a habit was added recently, don't suggest another one immediately
    if (recentlyAddedHabits.length > 0) {
      return new Response(JSON.stringify({ suggestion: "You've recently added new habits. Let's focus on building consistency with those before adding more!" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch habit logs for the last 30 days for active habits
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('habit_logs')
      .select('habit_id, log_date, is_completed')
      .in('habit_id', activeHabitIds)
      .gte('log_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
      .lte('log_date', format(today, 'yyyy-MM-dd'));

    if (logsError) throw logsError;

    // Calculate completion rates
    const habitCompletionData: { [habitId: string]: { completedDays: number; totalDays: number } } = {};
    activeHabitIds.forEach(id => {
      habitCompletionData[id] = { completedDays: 0, totalDays: 0 };
    });

    logs.forEach(log => {
      if (habitCompletionData[log.habit_id]) {
        habitCompletionData[log.habit_id].totalDays++;
        if (log.is_completed) {
          habitCompletionData[log.habit_id].completedDays++;
        }
      }
    });

    let totalCompletionRate = 0;
    let totalHabitsWithData = 0;

    for (const habitId in habitCompletionData) {
      const data = habitCompletionData[habitId];
      if (data.totalDays > 0) {
        totalCompletionRate += (data.completedDays / data.totalDays);
        totalHabitsWithData++;
      }
    }

    const averageCompletionRate = totalHabitsWithData > 0 ? (totalCompletionRate / totalHabitsWithData) * 100 : 0;

    let prompt;
    if (activeHabitIds.length === 0) {
      prompt = `The user has no active habits. Suggest an encouraging message to start their first habit.`;
    } else if (averageCompletionRate >= 85) {
      prompt = `The user has ${activeHabitIds.length} active habits with an average completion rate of ${averageCompletionRate.toFixed(0)}% over the last 30 days. Suggest an encouraging message that they are doing great and might be ready to add a new habit, but also remind them to not overload.`;
    } else if (averageCompletionRate >= 60) {
      prompt = `The user has ${activeHabitIds.length} active habits with an average completion rate of ${averageCompletionRate.toFixed(0)}% over the last 30 days. Suggest an encouraging message to keep focusing on their current habits to build more consistency before adding new ones.`;
    } else {
      prompt = `The user has ${activeHabitIds.length} active habits with an average completion rate of ${averageCompletionRate.toFixed(0)}% over the last 30 days. Suggest a supportive message to focus on simplifying and strengthening their current habits.`;
    }

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
      console.error("Suggest New Habit: Gemini API request failed:", geminiResponse.status, errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const suggestionText = geminiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ suggestion: suggestionText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in Edge Function 'suggest-new-habit':", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});