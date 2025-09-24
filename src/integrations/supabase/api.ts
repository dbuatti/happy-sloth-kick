import { supabase } from './client';
import { format } from 'date-fns';

// Placeholder for AI goal suggestion
export const suggestGoalDetails = async (description: string, categories: { id: string; name: string }[], currentDate: Date) => {
  // In a real scenario, this would call an Edge Function or external AI API
  // For now, return a dummy suggestion
  console.log("AI Goal Suggestion Request:", { description, categories, currentDate });
  return {
    cleanedDescription: description,
    category: categories[0]?.name || 'General',
    dueDate: null,
    notes: null,
  };
};

export const getDailyBriefing = async (userId: string, localDate: Date) => {
  try {
    // Convert localDate to ISO strings for the start and end of the day in local time
    const localDayStart = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 0, 0, 0);
    const localDayEnd = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 23, 59, 59);

    const localDayStartISO = localDayStart.toISOString();
    const localDayEndISO = localDayEnd.toISOString();

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/daily-briefing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, localDayStartISO, localDayEndISO }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error || 'Failed to fetch daily briefing');
    }

    const data = await response.json();
    return data.briefing;
  } catch (error) {
    console.error('Error fetching daily briefing:', error);
    return null;
  }
};

export const parseAppointmentText = async (text: string, currentDate: Date) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/parse-appointment-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text, currentDate: format(currentDate, 'yyyy-MM-dd') }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error || 'Failed to parse appointment text');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error parsing appointment text:', error);
    return null;
  }
};

export const suggestTaskDetails = async (description: string, categories: { id: string; name: string }[], currentDate: Date) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/suggest-task-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ description, categories, currentDate: format(currentDate, 'yyyy-MM-dd') }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error || 'Failed to get task suggestions');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting task suggestions:', error);
    return null;
  }
};

export const getHabitChallengeSuggestion = async (userId: string, habitId: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/habit-challenge-suggestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, habitId }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error || 'Failed to get habit challenge suggestion');
    }

    const data = await response.json();
    return data.suggestion;
  } catch (error) {
    console.error('Error getting habit challenge suggestion:', error);
    return null;
  }
};