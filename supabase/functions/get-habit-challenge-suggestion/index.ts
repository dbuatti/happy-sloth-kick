// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => { // Explicitly type req as Request
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
      console.error("Habit Challenge: Missing environment variables.");
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

    const { data: habitData, error: habitError } = await supabaseAdmin
      .from('habits')
      .select('name, description, frequency, goal_type, goal_value, unit')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitError) throw habitError;
    if (!habitData) {
      return new Response(JSON.stringify({ error: 'Habit not found or unauthorized.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const prompt = `Generate a short, encouraging, and actionable challenge suggestion for the user based on their habit.
    The habit details are:
    - Name: ${habitData.name}
    - Description: ${habitData.description || 'N/A'}
    - Frequency: ${habitData.frequency}
    - Goal Type: ${habitData.goal_type}
    - Goal Value: ${habitData.goal_value}
    - Unit: ${habitData.unit || 'N/A'}

    The challenge should be a single sentence, focusing on pushing the user slightly beyond their current habit, or adding a new dimension to it.
    Example: "Try to double your daily reading time for the next 3 days!" or "Integrate a 5-minute mindfulness exercise before your morning run."
    Keep it concise and positive.`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestionText = response.text();

    return new Response(JSON.stringify({ suggestion: suggestionText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) { // Changed to any
    console.error("Error in Edge Function 'get-habit-challenge-suggestion':", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});