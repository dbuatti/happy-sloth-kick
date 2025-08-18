import { supabase } from './client';
import { startOfDay, endOfDay } from 'date-fns'; // Corrected import statement

interface CategoryForAI {
  id: string;
  name: string;
}

interface SuggestTaskDetailsResponse {
  category: string;
  priority: string;
  dueDate: string | null;
  remindAt: string | null;
  section: string | null;
  cleanedDescription: string;
  link: string | null;
  notes: string | null;
}

export const suggestTaskDetails = async (
  description: string,
  categories: CategoryForAI[],
  currentDate: Date
): Promise<SuggestTaskDetailsResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-task-details', {
      body: { description, categories, currentDate: currentDate.toISOString().split('T')[0] },
    });

    if (error) {
      console.error('Error invoking Edge Function:', error);
      throw new Error(error.message);
    }

    return data as SuggestTaskDetailsResponse;
  } catch (error: any) {
    console.error('Failed to get AI suggestions:', error.message);
    return null;
  }
};

export const parseAppointmentText = async (
  text: string,
  currentDate: Date
): Promise<{ title: string; description: string | null; date: string; startTime: string; endTime: string } | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('parse-appointment-text', {
      body: { text, currentDate: currentDate.toISOString().split('T')[0] },
    });

    if (error) {
      console.error('Error invoking Edge Function:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error: any) {
    console.error('Failed to parse appointment text:', error.message);
    return null;
  }
};

export const getDailyBriefing = async (
  userId: string,
  currentDate: Date
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('daily-briefing', {
      body: {
        userId,
        localDayStartISO: startOfDay(currentDate).toISOString(), // Send local day start in UTC
        localDayEndISO: endOfDay(currentDate).toISOString(),     // Send local day end in UTC
      },
    });

    if (error) {
      console.error('Error invoking daily-briefing Edge Function:', error);
      throw new Error(error.message);
    }

    return data.briefing;
  } catch (error: any) {
    console.error('Failed to get daily briefing:', error.message);
    return null;
  }
};