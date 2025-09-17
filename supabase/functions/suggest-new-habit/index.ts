// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore
import { format, parseISO, differenceInDays, startOfDay, subDays, isAfter } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  console.log("Suggest New Habit: Edge Function started.");
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log("Suggest New Habit: Received request for userId:", userId);

    if (!userId) {
      console.error("Suggest New Habit: User ID is missing.");
      return new Response(JSON.stringify({ error: "User ID is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Retrieve environment variables for Supabase and Gemini API
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    console.log("Suggest New Habit: Environment variables check - SUPABASE_URL:", !!SUPABASE_URL, "SUPABASE_SERVICE_ROLE_KEY:", !!SUPABASE_SERVICE_ROLE_KEY, "GEMINI_API_KEY:", !!GEMINI_API_KEY);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      console.error("Suggest New Habit: Missing Supabase or Gemini API environment variables.");
      return new Response(JSON.stringify({ error: "Missing Supabase or Gemini API environment variables." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.log("Suggest New Habit: Fetching active habits for user:", userId);
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from("habits")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (habitsError) {
      console.error("Suggest New Habit: Error fetching habits:", habitsError);
      throw habitsError;
    }
    console.log("Suggest New Habit: Fetched habits count:", habits.length);

    const activeHabitIds = habits.map((h) => h.id);
    const recentlyAddedHabits = habits.filter((h) => isAfter(parseISO(h.created_at), fourteenDaysAgo));

    // If a habit was added recently, don't suggest another one immediately
    if (recentlyAddedHabits.length > 0) {
      console.log("Suggest New Habit: User recently added habits, returning early.");
      return new Response(JSON.stringify({ suggestion: "You've recently added new habits. Let's focus on building consistency with those before adding more!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch habit logs for the last 30 days for active habits
    console.log("Suggest New Habit: Fetching habit logs for active habits.");
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("habit_logs")
      .select("habit_id, log_date, is_completed")
      .in("habit_id", activeHabitIds)
      .gte("log_date", format(thirtyDaysAgo, "yyyy-MM-dd"))
      .lte("log_date", format(today, "yyyy-MM-dd"));

    if (logsError) {
      console.error("Suggest New Habit: Error fetching logs:", logsError);
      throw logsError;
    }
    console.log("Suggest New Habit: Fetched logs count:", logs.length);

    // Calculate completion rates
    const habitCompletionData: { [habitId: string]: { completedDays: number; totalDays: number } } = {};
    activeHabitIds.forEach((id) => {
      habitCompletionData[id] = { completedDays: 0, totalDays: 0 };
    });

    logs.forEach((log) => {
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
        totalCompletionRate += data.completedDays / data.totalDays;
        totalHabitsWithData++;
      }
    }

    const averageCompletionRate = totalHabitsWithData > 0 ? (totalCompletionRate / totalHabitsWithData) * 100 : 0;
    console.log("Suggest New Habit: Calculated average completion rate:", averageCompletionRate.toFixed(2));

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
    console.log("Suggest New Habit: Generated prompt for Gemini.");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    console.log("Suggest New Habit: Calling Gemini API at:", API_URL);
    const geminiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    console.log("Suggest New Habit: Received response from Gemini API. Status:", geminiResponse.status);

    // Handle non-OK responses from Gemini API
    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Suggest New Habit: Gemini API request failed:", geminiResponse.status, errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    let geminiData;
    try {
      geminiData = await geminiResponse.json();
      console.log("Suggest New Habit: Gemini raw response data:", JSON.stringify(geminiData));
    } catch (jsonError) {
      console.error("Suggest New Habit: Failed to parse Gemini JSON response:", jsonError);
      throw new Error("Failed to parse Gemini API response as JSON.");
    }

    let suggestionText;
    // Safely access the suggestion text, checking for existence of properties
    if (
      geminiData &&
      geminiData.candidates &&
      geminiData.candidates.length > 0 &&
      geminiData.candidates[0].content &&
      geminiData.candidates[0].content.parts &&
      geminiData.candidates[0].content.parts.length > 0 &&
      geminiData.candidates[0].content.parts[0].text
    ) {
      suggestionText = geminiData.candidates[0].content.parts[0].text;
      console.log("Suggest New Habit: Gemini suggestion extracted.");
    } else {
      console.error("Suggest New Habit: Failed to access suggestion text from Gemini data. Data structure unexpected:", JSON.stringify(geminiData));
      throw new Error("Failed to extract suggestion text from Gemini API response due to unexpected data structure.");
    }

    console.log("Suggest New Habit: Final suggestion text:", suggestionText);
    // Return the generated briefing
    return new Response(JSON.stringify({ suggestion: suggestionText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    let errorMessage = 'An unexpected error occurred in the Edge Function.';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.toString();
    } else if (typeof error === 'object' && error !== null) {
      // Attempt to stringify object, handle potential circular references
      try {
        errorMessage = JSON.stringify(error);
        errorDetails = JSON.stringify(error);
      } catch (e) {
        errorMessage = `Non-serializable error object: ${String(error)}`;
        errorDetails = `Non-serializable error object: ${String(error)}`;
      }
    } else {
      errorMessage = String(error);
      errorDetails = String(error);
    }
    
    console.error("Error in Edge Function 'suggest-new-habit' (outer catch):", errorMessage, "Details:", errorDetails);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});