import { supabase } from './client';
import { format } from 'date-fns';

interface CategoryForAI {
  id: string;
  name: string;
}

interface AISuggestionResponse {
  cleanedDescription: string;
  category: string; // Category name
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null; // YYYY-MM-DD
  notes: string | null;
  remindAt: string | null; // ISO string
  section: string | null; // Section name
  link: string | null;
}

/**
 * Invokes the Supabase Edge Function to suggest task details.
 * @param description The raw task description from the user.
 * @param existingCategories A list of the user's existing categories.
 * @param currentDate The current date for context.
 * @returns Suggested task details or null if parsing fails.
 */
export const suggestTaskDetails = async (
  description: string,
  existingCategories: CategoryForAI[],
  currentDate: Date
): Promise<AISuggestionResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest_task_details', {
      body: {
        description,
        existingCategories,
        currentDate: format(currentDate, 'yyyy-MM-dd'),
      },
    });

    if (error) {
      console.error('Error invoking suggest_task_details:', error);
      return null;
    }
    return data as AISuggestionResponse;
  } catch (e) {
    console.error('Exception in suggestTaskDetails:', e);
    return null;
  }
};

/**
 * Invokes the Supabase Edge Function to suggest goal details.
 * @param title The raw goal title from the user.
 * @param existingCategories A list of the user's existing categories.
 * @param currentDate The current date for context.
 * @returns Suggested goal details or null if parsing fails.
 */
export const suggestGoalDetails = async (
  title: string,
  existingCategories: CategoryForAI[],
  currentDate: Date
): Promise<AISuggestionResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest_goal_details', {
      body: {
        title,
        existingCategories,
        currentDate: format(currentDate, 'yyyy-MM-dd'),
      },
    });

    if (error) {
      console.error('Error invoking suggest_goal_details:', error);
      return null;
    }
    return data as AISuggestionResponse;
  } catch (e) {
    console.error('Exception in suggestGoalDetails:', e);
    return null;
  }
};

/**
 * Invokes the Supabase Edge Function to get a daily briefing.
 * @param userId The ID of the current user.
 * @param date The date for which to get the briefing.
 * @returns A string containing the daily briefing or null.
 */
export const getDailyBriefing = async (userId: string, date: Date): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('daily_briefing', {
      body: { userId, date: format(date, 'yyyy-MM-dd') },
    });

    if (error) {
      console.error('Error invoking daily_briefing:', error);
      return null;
    }
    return data.briefing as string;
  } catch (e) {
    console.error('Exception in getDailyBriefing:', e);
    return null;
  }
};

/**
 * Invokes the Supabase Edge Function to parse appointment text.
 * @param text The raw text to parse.
 * @param date The date for context.
 * @returns Parsed appointment details or null.
 */
export const parseAppointmentText = async (text: string, date: Date): Promise<{ title: string; description: string | null; date: string; startTime: string; endTime: string; } | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('parse_appointment_text', {
      body: { text, date: format(date, 'yyyy-MM-dd') },
    });

    if (error) {
      console.error('Error invoking parse_appointment_text:', error);
      return null;
    }
    return data;
  } catch (e) {
    console.error('Exception in parseAppointmentText:', e);
    return null;
  }
};