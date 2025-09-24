import { supabase } from './client';
import { format } from 'date-fns';

interface CategoryForAI {
  id: string;
  name: string;
}

interface AISuggestionResponse {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null; // YYYY-MM-DD
  remindAt: string | null; // ISO 8601 UTC
  section: string | null;
  cleanedDescription: string;
  link: string | null;
  notes: string | null;
}

interface AIAppointmentParseResponse {
  title: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export const suggestTaskDetails = async (description: string, categories: CategoryForAI[], currentDate: Date): Promise<AISuggestionResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-task-details', {
      body: { description, categories, currentDate: format(currentDate, 'yyyy-MM-dd') },
    });

    if (error) {
      console.error('Error invoking suggest-task-details:', error);
      return null;
    }
    return data as AISuggestionResponse;
  } catch (error) {
    console.error('Error in suggestTaskDetails:', error);
    return null;
  }
};

export const parseAppointmentText = async (text: string, currentDate: Date): Promise<AIAppointmentParseResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('parse-appointment-text', {
      body: { text, currentDate: format(currentDate, 'yyyy-MM-dd') },
    });

    if (error) {
      console.error('Error invoking parse-appointment-text:', error);
      return null;
    }
    return data as AIAppointmentParseResponse;
  } catch (error) {
    console.error('Error in parseAppointmentText:', error);
    return null;
  }
};

export const getDailyBriefing = async (userId: string, localDate: Date): Promise<string | null> => {
  try {
    const localDayStartISO = format(localDate, "yyyy-MM-dd'T'00:00:00.000XXX");
    const localDayEndISO = format(localDate, "yyyy-MM-dd'T'23:59:59.999XXX");

    const { data, error } = await supabase.functions.invoke('daily-briefing', {
      body: { userId, localDayStartISO, localDayEndISO },
    });

    if (error) {
      console.error('Error invoking daily-briefing:', error);
      return null;
    }
    return data.briefing as string;
  } catch (error) {
    console.error('Error in getDailyBriefing:', error);
    return null;
  }
};

export const getHabitChallengeSuggestion = async (userId: string, habitId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-habit-challenge-suggestion', {
      body: { userId, habitId },
    });

    if (error) {
      console.error('Error invoking get-habit-challenge-suggestion:', error);
      return null;
    }
    return data.suggestion as string;
  } catch (error) {
    console.error('Error in getHabitChallengeSuggestion:', error);
    return null;
  }
};

export const suggestGoalDetails = async (title: string, categories: CategoryForAI[], currentDate: Date): Promise<AISuggestionResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-goal-details', {
      body: { title, categories, currentDate: format(currentDate, 'yyyy-MM-dd') },
    });

    if (error) {
      console.error('Error invoking suggest-goal-details:', error);
      return null;
    }
    return data as AISuggestionResponse;
  } catch (error) {
    console.error('Error in suggestGoalDetails:', error);
    return null;
  }
};