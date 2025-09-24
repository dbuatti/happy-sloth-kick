import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';


export const getHabitChallengeSuggestion = async (userId: string, habitId: string): Promise<string | null> => {
  try {
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('name, description, frequency, goal_type, goal_value, unit')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitError) throw habitError;
    if (!habit) {
      showError('Habit not found.');
      return null;
    }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('log_date, is_completed, value_recorded')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(30); // Get recent logs for context

    if (logsError) throw logsError;

    const prompt = `Generate a concise, encouraging, and actionable habit challenge suggestion for the user based on their habit details and recent performance.
    Keep it under 100 words. Focus on a small, achievable step or a slight increase in consistency/intensity.
    
    Habit Name: ${habit.name}
    Description: ${habit.description || 'N/A'}
    Frequency: ${habit.frequency}
    Goal Type: ${habit.goal_type}
    Goal Value: ${habit.goal_value} ${habit.unit || ''}
    Recent Logs (last 30 days, most recent first): ${JSON.stringify(logs)}

    Example: "Great job on your 'Daily Reading' habit! To push a little further, try reading for 5 extra minutes on Tuesdays and Thursdays this week. You've got this!"
    Example: "Your 'Drink Water' habit is looking good! For a new challenge, aim to drink one extra glass of water before noon every day for the next 3 days. Stay hydrated!"
    `;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`;

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
      console.error("Habit Challenge: Gemini API request failed:", geminiResponse.status, errorBody);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}: ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    return geminiData.candidates[0].content.parts[0].text;

  } catch (error: any) {
    console.error("Error generating habit challenge suggestion:", error);
    showError('Failed to generate habit challenge suggestion.');
    return null;
  }
};