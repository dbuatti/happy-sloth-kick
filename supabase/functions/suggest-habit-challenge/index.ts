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
    const { userId, habitId } = await req.json();

    if (!userId || !habitId) {
      return new Response(JSON.stringify({ error: 'User ID and Habit ID are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      console.error("Suggest Habit Challenge: Missing environment variables.");
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
    const sixtyDaysAgo = subDays(today, 60);

    // Fetch the specific habit details
    const { data: habit, error: habitError } = await supabaseAdmin
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitError) throw habitError;
    if (!habit) {
      return new Response(JSON.stringify({ error: 'Habit not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Fetch habit logs for the last 60 days for this habit
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('habit_logs')
      .select('log_date, is_completed')
      .eq('habit_id', habitId)
      .gte('log_date', format(sixtyDaysAgo, 'yyyy-MM-dd'))
      .lte('log_date', format(today, 'yyyy-MM-dd'));

    if (logsError) throw logsError;

    // Calculate completion rate and streak
    let completedDays = 0;
    let totalDaysTracked = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    let lastLogDate: Date | null = null;

    const sortedLogs = [...logs].sort((a, b) => parseISO(a.log_date).getTime() - parseISO(b.log_date).getTime());

    sortedLogs.forEach(log => {
      const logDate = parseISO(log.log_date);
      if (!log.is_completed) {
        tempStreak = 0; // Reset streak if not completed
      } else {
        if (lastLogDate === null || differenceInDays(logDate, lastLogDate) === 1) {
          tempStreak++;
        } else if (differenceInDays(logDate, lastLogDate) > 1) {
          tempStreak = 1; // Reset if there's a gap
        }
        completedDays++;
      }
      totalDaysTracked++;
      lastLogDate = logDate;
    });
    currentStreak = tempStreak; // The last calculated streak is the current one

    const completionRate = totalDaysTracked > 0 ? (completedDays / totalDaysTracked) * 100 : 0;

    let prompt;
    if (completionRate >= 80 && currentStreak >= 7) { // High consistency and good streak
      prompt = `The user has been consistently completing their habit "${habit.name}" with a ${completionRate.toFixed(0)}% completion rate and a current streak of ${currentStreak} days. The habit is currently set to a target of ${habit.target_value || 'no specific value'} ${habit.unit || ''} ${habit.frequency}. Suggest a small, actionable way to increase the challenge for this habit. Focus on a slight increase in target value (if applicable), duration, or a minor related step. Keep it encouraging and concise.`;
    } else if (completionRate >= 60) { // Moderate consistency
      prompt = `The user has been moderately consistent with their habit "${habit.name}", with a ${completionRate.toFixed(0)}% completion rate. Suggest an encouraging message to focus on strengthening consistency before increasing the challenge.`;
    } else { // Low consistency
      prompt = `The user is struggling with their habit "${habit.name}", with a ${completionRate.toFixed(0)}% completion rate. Suggest a supportive message to simplify the habit or focus on building a stronger foundation before increasing the challenge.`;
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
      console.error("Suggest Habit Challenge: Gemini API request failed:", geminiResponse.status, errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const suggestionText = geminiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ suggestion: suggestionText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in Edge Function 'suggest-habit-challenge':", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});