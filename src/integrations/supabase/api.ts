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
  console.log('API: Calling AI Suggestion Edge Function...');
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
      console.error('Error invoking Edge Function:', error);
      return null;
    }

    // The data returned from the Edge Function is already the AISuggestionResult
    const result = data as AISuggestionResult;
    console.log('API: Received AI suggestion result:', result);
    return result;

  } catch (error) {
    console.error('API: Error in suggestTaskDetails:', error);
    return null;
  }
};

export const getDailyBriefing = async (userId: string, date: Date) => {
  console.log('Getting daily briefing for user:', userId, 'on date:', format(date, 'yyyy-MM-dd'));
  return "This is a placeholder daily briefing from AI.";
};

export const getHabitChallengeSuggestion = async (userId: string, habitId: string) => {
  console.log('Getting habit challenge suggestion for user:', userId, 'habit:', habitId);
  return "Try to complete your habit for 7 consecutive days!";
};

export const parseAppointmentText = async (text: string, date: Date) => {
  console.log('Parsing appointment text:', text, 'for date:', format(date, 'yyyy-MM-dd'));
  return {
    title: "Parsed Appointment",
    description: "Details from text",
    date: format(date, 'yyyy-MM-dd'),
    startTime: "09:00",
    endTime: "10:00",
  };
};