import { format } from 'date-fns';
import { supabase } from './client'; // Import supabase client

export interface AICategory {
  id: string;
  name: string;
}

// Define the expected structure of the AI suggestion result
export interface AISuggestionResult {
  cleanedDescription: string;
  category: string; // The name of the suggested category
  priority: 'low' | 'medium' | 'high' | 'urgent'; // Explicit priority types
  dueDate: string | null; // YYYY-MM-DD
  notes: string | null;
  remindAt: string | null; // ISO string
  section: string | null; // The name of the suggested section
  link: string | null;
}

export const suggestTaskDetails = async (
  description: string,
  categories: AICategory[],
  currentDate: Date
): Promise<AISuggestionResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-task-details', {
      body: JSON.stringify({
        description,
        categories,
        currentDate: format(currentDate, 'yyyy-MM-dd'),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error('Error invoking Edge Function:', error.message);
      // Log additional details if available from FunctionsHttpError
      if ((error as any).details) {
        console.error('Edge Function details:', (error as any).details);
      }
      return null;
    }

    // The data returned from the Edge Function is already the AISuggestionResult
    const result = data as AISuggestionResult;
    return result;

  } catch (error) {
    console.error('API: Error in suggestTaskDetails:', error);
    return null;
  }
};

export const getDailyBriefing = async (userId: string, date: Date): Promise<string | null> => {
  try {
    const localDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const localDayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const requestBody = {
      userId,
      localDayStartISO: localDayStart.toISOString(),
      localDayEndISO: localDayEnd.toISOString(),
    };

    const SUPABASE_PROJECT_ID = 'gdmjttmjjhadltaihpgr'; // Your Supabase Project ID
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkbWp0dG1qamhhZGx0YWlocGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTE5MjYsImV4cCI6MjA2OTA4NzkyNn0.5E7CR-pTkz1ri3sW4p289Gjzzm8BUtFNkZWwwvVmfYE'; // Your Supabase Anon Key

    const response = await fetch(`https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/daily-briefing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // Include Authorization header
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching daily-briefing Edge Function:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    return data.briefing;

  } catch (error) {
    console.error('API: Error in getDailyBriefing (outer catch):', error);
    return null;
  }
};

export const getHabitChallengeSuggestion = async () => {
  // This function is currently mocked, no AI API call here.
  return "Try to complete your habit for 7 consecutive days!";
};

export const parseAppointmentText = async (text: string, date: Date) => {
  try {
    const { data, error } = await supabase.functions.invoke('parse-appointment-text', {
      body: JSON.stringify({
        text,
        currentDate: format(date, 'yyyy-MM-dd'),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error('Error invoking parse-appointment-text Edge Function:', error.message);
      if ((error as any).details) {
        console.error('Edge Function details:', (error as any).details);
      }
      return null;
    }

    // The data returned from the Edge Function is expected to match the Appointment structure
    const result = data as {
      title: string;
      description: string | null;
      date: string;
      startTime: string;
      endTime: string;
    };
    return result;

  } catch (error) {
    console.error('API: Error in parseAppointmentText:', error);
    return null;
  }
};